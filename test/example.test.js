import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const exec = promisify(execFile);
const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// The documented example is the one thing a new reader runs before reading any source, so it is
// the one piece of documentation that must not be able to drift. It costs nothing and calls no
// model, so the whole episode can be replayed here and compared line for line. Only the two
// things that cannot be deterministic — the timestamps and the work directory — are replaced.
const normalise = (text, work) => text
  .split(work).join('<workdir>')
  .replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/g, '<at>');

test('the documented zero-cost example produces the transcript it documents', async t => {
  const work = await mkdtemp(join(tmpdir(), 'tag-example-'));
  t.after(() => rm(work, { recursive: true, force: true }));

  const { stdout } = await exec('sh', [join(root, 'examples/zero-cost-episode/run.sh'), work],
    { cwd: root, maxBuffer: 4 * 1024 * 1024 });
  const expected = await readFile(join(root, 'examples/zero-cost-episode/transcript.txt'), 'utf8');

  assert.equal(normalise(stdout, work), expected,
    'The example no longer produces examples/zero-cost-episode/transcript.txt. Either the CLI changed or the transcript is stale.');
});

test('the example leaves a closed task whose close cites a verification that really passed', async t => {
  const work = await mkdtemp(join(tmpdir(), 'tag-example-'));
  t.after(() => rm(work, { recursive: true, force: true }));

  await exec('sh', [join(root, 'examples/zero-cost-episode/run.sh'), work], { cwd: root, maxBuffer: 4 * 1024 * 1024 });
  const task = JSON.parse(await readFile(join(work, 'task.json'), 'utf8'));

  assert.equal(task.state, 'complete');
  assert.equal(task.operations.length, 5);
  // The three things the episode exists to demonstrate, asserted rather than eyeballed: a failure
  // survives in the record, the refused close survives as an operation of its own, and the close
  // rests on a command that really ran and really exited zero.
  assert.equal(task.operations[1].exit, 1, 'the failing check must stay in the record');
  assert.equal(task.operations[2].operation, 'refused close', 'the refused close must stay in the record');
  assert.equal(task.operations[2].exit, undefined, 'a refused close runs nothing, so it stamps no exit status');
  assert.equal(task.operations[4].exit, 0);
  assert.deepEqual(task.closed.relied, ['operation 5: $ sh check.sh → exit status 0']);
  assert.equal(task.question.answered.from, 'john');
});
