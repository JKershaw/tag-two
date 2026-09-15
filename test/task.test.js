import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openTask, readTask, writeTask, showTask, verifyTask, closeTask, validateTask } from '../src/task.js';

async function fixture(t) {
  const directory = await mkdtemp(join(tmpdir(), 'tag-task-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const path = join(directory, 'task.json');
  await openTask(path, {
    id: 'example-task',
    statement: 'Establish whether the documented limit matches the code.',
    completion: 'A command that exits zero establishes it.',
    reserved: ['Whether a disagreement is a documentation defect or a code defect.'],
  });
  return path;
}

test('an opened task holds what was asked, not a graph', async t => {
  const path = await fixture(t);
  const task = await readTask(path);
  assert.equal(task.state, 'open');
  assert.equal(task.statement, 'Establish whether the documented limit matches the code.');
  assert.deepEqual(task.intent, []);
  assert.deepEqual(task.operations, []);
  assert.equal(task.closed, undefined);
  assert.match(showTask(task), /Reserved for the human/);
  assert.match(showTask(task), /No operations have been performed/);
});

test('a task is never silently overwritten', async t => {
  const path = await fixture(t);
  await assert.rejects(openTask(path, { id: 'other', statement: 'x', completion: 'y' }),
    /already holds a task/);
  assert.equal((await readTask(path)).id, 'example-task');
});

test('intent keeps the words and the kind its author gave it', async t => {
  const path = await fixture(t);
  const task = await readTask(path);
  task.intent = [{ at: '2026-01-01T00:00:00.000Z', from: 'harbour', kind: 'constraint', text: 'Do not change the code.' }];
  await writeTask(path, task);
  assert.match(showTask(await readTask(path)), /constraint from harbour .* Do not change the code\./);
});

test('an operation with no evidence is shown as a claim rather than a result', async t => {
  const path = await fixture(t);
  const task = await readTask(path);
  task.operations = [{ at: '2026-01-01T00:00:00.000Z', by: 'agent', operation: 'investigate', question: 'What is documented?', result: 'Six numbers.', evidence: [] }];
  await writeTask(path, task);
  assert.match(showTask(await readTask(path)), /evidence: none — this is a claim, not an established result/);
});

test('verify records the exit status the command really returned', async t => {
  const path = await fixture(t);
  const { exit } = await verifyTask(path, 'printf hello; exit 3');
  assert.equal(exit, 3);
  const [operation] = (await readTask(path)).operations;
  assert.equal(operation.by, 'tag verify');
  assert.equal(operation.exit, 3);
  assert.match(operation.result, /exited 3/);
  assert.ok(operation.evidence.includes('exit status 3'));
  assert.ok(operation.evidence.some(line => line.includes('hello')));
});

test('a command that could not be started records nothing at all', async t => {
  const path = await fixture(t);
  await assert.rejects(verifyTask(path, 'true', {
    run: async () => { throw Object.assign(new Error('spawn failed'), { code: 'ENOENT' }); },
  }), /Nothing was recorded/);
  assert.deepEqual((await readTask(path)).operations, []);
});

test('a close must cite evidence, and the citation is looked up rather than trusted', async t => {
  const path = await fixture(t);
  await assert.rejects(closeTask(path, 'done', []), /a close with no evidence is a claim/);
  await assert.rejects(closeTask(path, 'done', ['1']), /does not exist/);

  const task = await readTask(path);
  task.operations = [{ at: '2026-01-01T00:00:00.000Z', by: 'agent', operation: 'investigate', question: 'q', result: 'r', evidence: ['read a file'] }];
  await writeTask(path, task);
  await assert.rejects(closeTask(path, 'done', ['1']), /ran no command, so it establishes nothing/);

  await verifyTask(path, 'exit 1');
  await assert.rejects(closeTask(path, 'done', ['2']), /exited 1\. A failing check does not close a task/);
  assert.equal((await readTask(path)).state, 'open');

  await verifyTask(path, 'echo checked');
  const closed = await closeTask(path, 'The check ran and passed.', ['3']);
  assert.equal(closed.relied.length, 1);
  assert.match(closed.relied[0], /exit status 0/);
  const complete = await readTask(path);
  assert.equal(complete.state, 'complete');
  assert.match(showTask(complete), /Closed .*The check ran and passed\./);
  await assert.rejects(closeTask(path, 'again', ['3']), /already complete/);
});

test('a task cannot claim completion without recording what closed it', async () => {
  const base = {
    id: 'example-task', statement: 's', completion: 'c', reserved: [], intent: [], operations: [],
    openedAt: '2026-01-01T00:00:00.000Z',
  };
  assert.throws(() => validateTask({ ...base, state: 'complete' }),
    /complete exactly when it records what closed it/);
  assert.throws(() => validateTask({ ...base, state: 'open', closed: { at: 'x', statement: 'y', relied: ['z'] } }),
    /complete exactly when it records what closed it/);
  assert.throws(() => validateTask({ ...base, state: 'shipped' }), /open, needs-human or complete/);
});

test('a task file that is not a task is refused', async t => {
  const path = await fixture(t);
  await writeFile(path, JSON.stringify({ objective: 'a graph, not a task', nodes: [] }));
  await assert.rejects(readTask(path), /needs a slug id, statement, completion condition and openedAt/);
  assert.match(String(await readFile(path, 'utf8')), /a graph, not a task/);
});
