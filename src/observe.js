import { readFile } from 'node:fs/promises';

// Fourteen runs were assessed by hand, every one of them with a throwaway script asking the same
// questions: what did it actually call, what did it actually read, and does its evidence point at
// anything it opened? The last question is the durable graph's own top-ready node — real runs cite
// files they never read. Nothing here calls a model; it only reports what a run's record contains.
export const cited = item => String(item).trim().split(/[\s:]/, 1)[0];

// The objective a run returned, read out of its own answer without repairing anything. A
// rejected run keeps its raw answer and nothing else records what objective it claimed.
function returnedObjective(record, graph) {
  if (graph) return graph.objectiveReturned ?? graph.objective;
  const answer = record.run?.answer;
  if (typeof answer !== 'string') return null;
  const fenced = answer.trim().match(/^```[a-z]*\s*\n([\s\S]*?)\n?```$/i);
  try {
    const parsed = JSON.parse(fenced ? fenced[1] : answer);
    return typeof parsed?.objective === 'string' ? parsed.objective : null;
  } catch {
    return null;
  }
}

export async function observe(runPath) {
  let record;
  try {
    record = JSON.parse(await readFile(runPath, 'utf8'));
  } catch (error) {
    throw new Error(`Could not read a run from ${runPath}: ${error.message}`);
  }
  // A saved graph and a failed run both carry a `run`; only a graph carries nodes.
  const run = record.run ?? record;
  const graph = Array.isArray(record.nodes) ? record : null;
  if (!Array.isArray(run?.investigation)) throw new Error('That file is not a graph or a failed run.');

  const read = new Map();
  const calls = new Map();
  for (const item of run.investigation) {
    calls.set(item.tool, (calls.get(item.tool) ?? 0) + 1);
    if (item.tool === 'read_file' && /^\d+: /.test(item.result)) {
      // Only the trailing notice counts. src/repository.js contains the literal words that
      // build that notice, so every run that read it was reported as having read it partially.
      const notice = item.result.trimEnd().split('\n').at(-1);
      read.set(item.arguments.path, notice.startsWith('[PARTIAL READ:') ? 'partial' : 'complete');
    }
  }
  const unused = ['list_files', 'read_file', 'search', 'history'].filter(name => !calls.has(name));
  const unread = [];
  for (const node of graph?.nodes ?? []) {
    for (const item of node.evidence) {
      if (!read.has(cited(item))) unread.push({ node: node.id, evidence: item });
    }
  }
  const asked = record.objective ?? graph?.objective ?? null;
  const returned = returnedObjective(record, graph);
  return {
    outcome: graph ? 'graph' : 'failed', failure: record.failure ?? null,
    objectiveAsked: asked, objectiveReturned: returned,
    // A plain string comparison, deliberately. No model judges whether two objectives mean
    // the same thing; the point is to make the difference visible, not to rule on it.
    objectiveSubstituted: returned !== null && asked !== null && returned.trim() !== asked.trim(),
    answerPreserved: graph ? null : typeof run.answer === 'string',
    model: run.model, requests: run.requests, costUsd: run.costUsd,
    priorGraph: run.priorGraph ?? null,
    calls: Object.fromEntries(calls), unusedTools: unused,
    filesRead: Object.fromEntries(read),
    nodes: graph?.nodes.map(node => node.id) ?? null,
    evidenceCitingUnreadFiles: unread,
  };
}

export function describe(report) {
  const lines = [
    report.outcome === 'graph'
      ? `Produced a graph of ${report.nodes.length} nodes: ${report.nodes.join(', ')}.`
      : `Produced no graph. Failure: ${report.failure} Answer preserved: ${report.answerPreserved ? 'yes' : 'no'}.`,
    `${report.model} · ${report.requests} requests · cost ${report.costUsd === null ? 'unavailable' : `$${report.costUsd}`}`
      + ` · durable outcomes supplied: ${report.priorGraph ? `yes (${report.priorGraph})` : 'no'}`,
    `Tool calls: ${Object.entries(report.calls).map(([name, count]) => `${name}×${count}`).join(', ') || 'none'}`
      + `${report.unusedTools.length ? ` · never called: ${report.unusedTools.join(', ')}` : ''}`,
    `Files read: ${Object.entries(report.filesRead).map(([path, how]) => `${path} (${how})`).join(', ') || 'none'}`,
    report.objectiveReturned === null
      ? `Objective asked: ${report.objectiveAsked} · the run returned no readable objective.`
      : report.objectiveSubstituted
        ? `OBJECTIVE SUBSTITUTED.\n  asked:    ${report.objectiveAsked}\n  returned: ${report.objectiveReturned}`
        : `Objective returned unchanged: ${report.objectiveAsked}`,
  ];
  if (report.outcome === 'graph') {
    lines.push(report.evidenceCitingUnreadFiles.length
      ? `Evidence citing files this run never read (${report.evidenceCitingUnreadFiles.length}):\n`
        + report.evidenceCitingUnreadFiles.map(item => `  ${item.node}: ${item.evidence}`).join('\n')
      : 'Every evidence citation names a file this run read.');
  }
  return lines.join('\n');
}
