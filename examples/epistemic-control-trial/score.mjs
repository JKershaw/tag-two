// Mechanical measures over the trial's saved runs. No model is called and no judgement
// is made here: objective preservation, invented citations, prose-vs-code citations,
// tool use and cost, computed identically for both primitives.
import { readFile, readdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const cited = item => String(item).trim().split(/[\s:]/, 1)[0];
const norm = s => String(s ?? '').trim().replace(/[.!?\s]+$/, '');
const PROSE = /^(README\.md|EXPERIMENTS\.md|notes\/|examples\/)/;

function parse(answer) {
  if (typeof answer !== 'string') return null;
  const fenced = answer.trim().match(/^```[a-z]*\s*\n([\s\S]*?)\n?```$/i);
  try { return JSON.parse(fenced ? fenced[1] : answer); } catch { return null; }
}

function claims(parsed) {
  if (!parsed) return [];
  if (Array.isArray(parsed.nodes)) {
    return parsed.nodes.map(n => ({ id: n.id, text: `${n.title} — ${n.reason}`, evidence: n.evidence ?? [] }));
  }
  const op = parsed.nextOperation ?? {};
  return [{ id: op.kind, text: `${op.statement} — ${op.why}`, evidence: op.evidence ?? [] }];
}

const rows = [];
for (const dp of (await readdir(HERE, { withFileTypes: true })).filter(e => e.isDirectory()).map(e => e.name).sort()) {
  for (const file of (await readdir(join(HERE, dp))).sort()) {
    const run = JSON.parse(await readFile(join(HERE, dp, file), 'utf8'));
    const read = new Set(run.investigation.filter(i => i.tool === 'read_file' && /^\d+: /.test(i.result)).map(i => i.arguments.path));
    const parsed = parse(run.answer);
    const items = claims(parsed);
    const evidence = items.flatMap(i => i.evidence);
    const invented = evidence.filter(e => !read.has(cited(e)));
    const prose = evidence.filter(e => PROSE.test(cited(e)));
    rows.push({
      dp, arm: file.replace('.json', ''),
      parsed: parsed ? 'yes' : 'no',
      objectiveKept: parsed ? (norm(parsed.objective) === norm(run.objective) ? 'yes' : `NO: ${parsed.objective}`) : 'n/a',
      requests: run.requests,
      filesRead: read.size,
      tools: [...new Set(run.investigation.map(i => i.tool))].join('+') || 'none',
      items: items.length,
      evidence: evidence.length,
      invented: invented.length,
      prose: prose.length,
      code: evidence.length - prose.length,
      costUsd: run.costUsd,
      failure: run.failure ?? '',
    });
  }
}
const total = rows.reduce((sum, r) => sum + (r.costUsd ?? 0), 0);
console.log(rows.map(r => [r.dp, r.arm.padEnd(4), `parsed=${r.parsed}`, `obj=${r.objectiveKept}`.slice(0, 40),
  `req=${r.requests}`, `read=${r.filesRead}`, `tools=${r.tools}`, `items=${r.items}`,
  `cites=${r.evidence}`, `invented=${r.invented}`, `prose/code=${r.prose}/${r.code}`, r.failure].join('  ')).join('\n'));
console.log(`\nRuns: ${rows.length}  Reported spend: $${total.toFixed(5)}`);
