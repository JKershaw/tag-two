import { readFile } from 'node:fs/promises';
import { validateGraph } from './graph.js';
import { MODEL, request, affordable } from './model.js';

// The steward said "this keeps proposing work we've already done". Handing that observation to the
// planner did not help: run 86, with the observation in its input, proposed three tasks of six that
// recorded outcomes report as already done or already refuted — one more than the control run that
// was never told. The claim is checkable, so it is checked rather than argued about. This asks one
// bounded question about one graph, proposes nothing, changes nothing, and calls no tools. Its
// answer is grounded the way evidence citations are: a finding must quote an outcome word for word,
// and the quote is looked up in the outcomes here, not trusted.
const instructions = `You are checking one thing, not planning. For each proposed task below, decide
whether the recorded outcomes already report that work as done, or as refuted, or say nothing about it.
The outcomes are the only evidence you may use. Do not use anything else you believe about the project.
Answer "done" only if you can quote, word for word, a sentence from one outcome reporting that work as
already performed or already refuted. Quotes are checked against the outcomes mechanically, and a quote
that does not appear in them is reported as unverified rather than accepted.
Return ONLY a JSON object (no markdown fences):
{"findings":[{"node":"the task id","status":"done" or "open","quote":"a verbatim sentence from an
outcome, or empty when status is open","why":"one sentence"}]}
Include exactly one finding for every task id you are given, and no others.`;

const readGraph = async path => {
  let graph;
  try {
    graph = JSON.parse(await readFile(path, 'utf8'));
  } catch (error) {
    throw new Error(`Could not read a graph from ${path}: ${error.message}`);
  }
  return validateGraph(graph, graph?.objective);
};

export async function check(proposedPath, durablePath, {
  apiKey = process.env.OPENROUTER_API_KEY, fetchImpl = fetch,
} = {}) {
  if (!apiKey) throw new Error('Set OPENROUTER_API_KEY before checking.');
  const proposed = await readGraph(proposedPath);
  const outcomes = (await readGraph(durablePath)).outcomes ?? [];
  if (!outcomes.length) throw new Error(`${durablePath} records no outcomes; there is nothing to check against.`);
  await affordable(fetchImpl);
  const body = {
    model: MODEL, max_tokens: 2048, temperature: 0.2,
    provider: { max_price: { prompt: 0.5, completion: 1.5 } },
    messages: [
      { role: 'system', content: instructions },
      { role: 'user', content: `Recorded outcomes:\n${outcomes.map(item => `- ${item.title} (${item.at}): ${item.outcome}`).join('\n')}` },
      { role: 'user', content: `Proposed tasks:\n${proposed.nodes.map(node => `- ${node.id}: ${node.title} — ${node.reason}`).join('\n')}` },
    ],
  };
  const response = await request('/chat/completions', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }, fetchImpl);
  const cost = response.usage?.cost;
  const costUsd = typeof cost === 'number' && Number.isFinite(cost) && cost >= 0 ? cost : null;
  const message = response.choices?.[0]?.message;
  if (!message?.content || response.choices[0].finish_reason === 'length' || response.error) {
    throw new Error('The model returned an error or incomplete answer. No retry was made.');
  }
  const fenced = message.content.trim().match(/^```[a-z]*\s*\n([\s\S]*?)\n?```$/i);
  let answered;
  try {
    answered = JSON.parse(fenced ? fenced[1] : message.content);
  } catch (error) {
    throw new Error(`Invalid check answer: ${error.message}. No repair or retry was made.`);
  }
  if (!Array.isArray(answered?.findings)) throw new Error('Expected a findings array. No repair or retry was made.');
  const ids = new Set(proposed.nodes.map(node => node.id));
  const findings = answered.findings
    .filter(item => item && ids.has(item.node))
    .map(item => {
      const quote = typeof item.quote === 'string' ? item.quote.trim() : '';
      // The same trick as the citation guard: a claim is only worth as much as the part of it a
      // machine can look up. Nothing here judges whether the quote supports the finding.
      const found = quote.length > 20 && outcomes.some(outcome => outcome.outcome.includes(quote));
      return {
        node: item.node,
        status: item.status === 'done' ? (found ? 'done' : 'unverified') : 'open',
        why: typeof item.why === 'string' ? item.why : '',
        quote: found ? quote : '',
      };
    });
  const missing = [...ids].filter(id => !findings.some(item => item.node === id));
  return { model: MODEL, costUsd, findings, missing, nodes: proposed.nodes.length };
}

export function report({ model, costUsd, findings, missing, nodes }) {
  const of = status => findings.filter(item => item.status === status);
  return [
    `Checked ${nodes} proposed task(s) against recorded outcomes · ${model} · 1 request · cost ${costUsd === null ? 'unavailable' : `$${costUsd}`}`,
    `${of('done').length} already done or refuted · ${of('open').length} not reported by any outcome · ${of('unverified').length} claimed done without a quote that appears in the outcomes`,
    ...findings.map(item => `[${item.status}] ${item.node}: ${item.why}${item.quote ? `\n    quoted outcome: “${item.quote}”` : ''}`),
    ...(missing.length ? [`No finding was returned for: ${missing.join(', ')}.`] : []),
    'Findings are model-generated. Only the quotes are verified, and only that they appear verbatim in an outcome.',
  ].join('\n');
}
