import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// The README states the seed's limits as numbers and a reader takes them as fact. Nothing checked
// them against the code, so the only thing standing between a stale sentence and a wrong belief
// about what a run can cost was somebody remembering to edit two files at once. This compares the
// documented numbers with the constants as written in source. It imports nothing from src/ on
// purpose: the task that asked for it forbade changing the planner's behaviour or its constants,
// and exporting them to make them testable would have been a change to the thing under test.
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const sources = {};
const source = async name => (sources[name] ??= await readFile(join(root, name), 'utf8'));

const words = { eight: 8, ten: 10, twelve: 12 };

// A drift check whose own extraction has silently stopped matching is worse than no check: it
// passes forever. Every read of a number asserts that the number was found where it was expected.
async function found(name, pattern, what) {
  const match = (await source(name)).match(pattern);
  assert.ok(match, `${what}: nothing in ${name} matched ${pattern}. The check itself is stale, not the documentation.`);
  return match[1];
}

const number = text => Number(String(text).replace(/[,_]/g, ''));

test('README states the planner request, output and context limits the code enforces', async () => {
  const readme = 'README.md';
  const documentedRequests = words[await found(readme, /at most (\w+) model requests/, 'documented request limit')];
  const documentedOutput = number(await found(readme, /([\d,]+) output tokens per request/, 'documented output limit'));
  const documentedBytes = number(await found(readme, /([\d,]+) serialized request bytes/, 'documented context limit'));

  assert.equal(documentedRequests, number(await found('src/plan.js', /const MAX_REQUESTS = ([\d_]+);/, 'MAX_REQUESTS')),
    'README’s "at most N model requests" and src/plan.js MAX_REQUESTS disagree.');
  assert.equal(documentedOutput, number(await found('src/plan.js', /const MAX_OUTPUT = ([\d_]+);/, 'MAX_OUTPUT')),
    'README’s output-token figure and src/plan.js MAX_OUTPUT disagree.');
  assert.equal(documentedBytes, number(await found('src/plan.js', /const MAX_CONTEXT_BYTES = ([\d_]+);/, 'MAX_CONTEXT_BYTES')),
    'README’s serialized-request-bytes figure and src/plan.js MAX_CONTEXT_BYTES disagree.');
});

test('README states the file-reading limits the repository tools enforce', async () => {
  const readme = 'README.md';
  // The README wraps mid-sentence, so the whitespace between the number and its unit may be a newline.
  const documentedRead = number(await found(readme, /bounded at ([\d,]+)\s+characters/, 'documented read_file bound'));
  const documentedFile = number(await found(readme, /larger than ([\d,]+) KiB are excluded/, 'documented file-size exclusion'));

  assert.equal(documentedRead, number(await found('src/repository.js', /const READ_BYTES = ([\d_]+);/, 'READ_BYTES')),
    'README’s read_file bound and src/repository.js READ_BYTES disagree.');
  assert.equal(documentedFile, number(await found('src/repository.js', /stat\.size > ([\d_]+) \* 1024/, 'file-size guard')),
    'README’s KiB exclusion and the size guard in src/repository.js disagree.');
});

test('README states the price caps the model check enforces', async () => {
  const readme = 'README.md';
  const documentedPrompt = Number(await found(readme, /\$([\d.]+)\/million input tokens/, 'documented input price cap'));
  const documentedCompletion = Number(await found(readme, /\$([\d.]+)\/million output tokens/, 'documented output price cap'));

  assert.equal(documentedPrompt, Number(await found('src/model.js', /promptPrice > ([\d.]+) \/ 1e6/, 'prompt price cap')),
    'README’s input price cap and the cap in src/model.js disagree.');
  assert.equal(documentedCompletion, Number(await found('src/model.js', /completionPrice > ([\d.]+) \/ 1e6/, 'completion price cap')),
    'README’s output price cap and the cap in src/model.js disagree.');
});

test('README’s worst-case cost bound follows from the limits the code enforces', async () => {
  const requests = number(await found('src/plan.js', /const MAX_REQUESTS = ([\d_]+);/, 'MAX_REQUESTS'));
  const output = number(await found('src/plan.js', /const MAX_OUTPUT = ([\d_]+);/, 'MAX_OUTPUT'));
  const bytes = number(await found('src/plan.js', /const MAX_CONTEXT_BYTES = ([\d_]+);/, 'MAX_CONTEXT_BYTES'));
  const prompt = Number(await found('src/model.js', /promptPrice > ([\d.]+) \/ 1e6/, 'prompt price cap'));
  const completion = Number(await found('src/model.js', /completionPrice > ([\d.]+) \/ 1e6/, 'completion price cap'));
  // The README's own conservative arithmetic: every request sends the whole byte budget and each
  // request byte is counted as an input token, and every reply spends the whole output budget.
  const worstCase = (requests * bytes * prompt + requests * output * completion) / 1e6;

  const written = await found('README.md', /roughly \$([\d.]+) before small protocol overhead/, 'documented worst-case cost');
  const documented = Number(written);
  assert.ok(documented < 1,
    `README claims a worst-case run below $1 but states $${documented}.`);
  assert.ok(worstCase < 1,
    `The limits in the code allow a worst-case run of $${worstCase.toFixed(4)}, which is not below the $1 the README claims.`);
  // This assertion first allowed a cent of difference, and passed with $0.000848 of that cent
  // unused: the allowance had been chosen after computing the value it had to admit, which is
  // tuning a check until the example passes. The bound now comes from the documentation instead.
  // A figure written to N decimal places claims the value to within half of its last digit, so
  // "$0.68" claimed $0.005 and was wrong by $0.0092; the text became $0.69 and the code's limits
  // did not move. Nothing here is chosen: change a limit and the bound tightens or loosens with
  // however precisely the README chooses to state the result. That cuts both ways, and a
  // perturbation run found it: writing "$0.7" instead of "$0.69" widens the bound to $0.05 and
  // passes. It should pass, because $0.7 is a true statement about $0.689152, but it means a
  // vaguer figure is a weaker claim and so a weaker check. That is the honest cost of taking the
  // bound from the text rather than picking one, and it is the reason the perturbation set in
  // tasks/tuned-tolerance.json uses $0.8, which is false at its own precision.
  const precision = 0.5 * 10 ** -((written.split('.')[1] ?? '').length);
  assert.ok(Math.abs(worstCase - documented) <= precision,
    `README states a worst-case of $${written}, which claims the figure to within $${precision}, but the limits in the code give $${worstCase.toFixed(6)}.`);
});
