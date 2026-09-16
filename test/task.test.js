import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openTask, readTask, writeTask, showTask, verifyTask, closeTask, askTask, validateTask } from '../src/task.js';

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
  // Each refusal below is itself recorded as an operation, so the citations walk forward: a close
  // that was refused is a thing that happened to this task, and the numbering says so.
  await assert.rejects(closeTask(path, 'done', []), /a close with no evidence is a claim/);
  await assert.rejects(closeTask(path, 'done', ['9']), /does not exist/);
  assert.deepEqual((await readTask(path)).operations.map(item => item.operation), ['refused close', 'refused close']);

  const task = await readTask(path);
  task.operations = [...task.operations,
    { at: '2026-01-01T00:00:00.000Z', by: 'agent', operation: 'investigate', question: 'q', result: 'r', evidence: ['read a file'] }];
  await writeTask(path, task);
  await assert.rejects(closeTask(path, 'done', ['3']), /ran no command, so it establishes nothing/);

  await verifyTask(path, 'exit 1');
  await assert.rejects(closeTask(path, 'done', ['5']), /exited 1\. A failing check does not close a task/);
  assert.equal((await readTask(path)).state, 'open');

  await verifyTask(path, 'echo checked');
  const closed = await closeTask(path, 'The check ran and passed.', ['7']);
  assert.equal(closed.relied.length, 1);
  assert.match(closed.relied[0], /exit status 0/);
  const complete = await readTask(path);
  assert.equal(complete.state, 'complete');
  assert.match(showTask(complete), /Closed .*The check ran and passed\./);
  await assert.rejects(closeTask(path, 'again', ['7']), /already complete/);
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

const question = {
  decision: 'What should adopt do with evidence carried on the replacement graph?',
  why: 'Refusing, merging and documenting a precondition are all defensible and mean different things about what a durable record is.',
  continues: 'The chosen fix is implemented and the reproduction is re-run.',
  options: ['Refuse the adopt.', 'Merge both sets of evidence.'],
};

test('returning control records what is being asked and why', async t => {
  const path = await fixture(t);
  await verifyTask(path, 'echo reproduced');
  const asked = await askTask(path, { ...question, cited: ['1'] });
  assert.equal(asked.options.length, 2);
  assert.match(asked.evidence[0], /operation 1 \(verify by tag verify\)/);
  const task = await readTask(path);
  assert.equal(task.state, 'needs-human');
  const shown = showTask(task);
  assert.match(shown, /Control returned to a human .* and is still there\./);
  assert.match(shown, /Why a machine cannot settle it/);
  assert.match(shown, /What continues once it is answered/);
});

test('a question needs more than one option and evidence that exists', async t => {
  const path = await fixture(t);
  await verifyTask(path, 'echo reproduced');
  await assert.rejects(askTask(path, { ...question, options: ['Just do it.'], cited: ['1'] }),
    /at least two real options/);
  await assert.rejects(askTask(path, { ...question, cited: ['9'] }), /does not exist/);
  assert.equal((await readTask(path)).state, 'open');
});

test('a task waiting on a human is not closed behind its back', async t => {
  const path = await fixture(t);
  await verifyTask(path, 'echo reproduced');
  await askTask(path, { ...question, cited: ['1'] });
  await assert.rejects(closeTask(path, 'done anyway', ['1']), /waiting on a human decision/);
  await assert.rejects(askTask(path, { ...question, cited: ['1'] }), /already waiting on an answer/);
  assert.equal((await readTask(path)).state, 'needs-human');
});

test('a task needs a human exactly when it records what it is asking', async () => {
  const base = {
    id: 'example-task', statement: 's', completion: 'c', reserved: [], intent: [], operations: [],
    openedAt: '2026-01-01T00:00:00.000Z',
  };
  assert.throws(() => validateTask({ ...base, state: 'needs-human' }),
    /needs a human exactly when it records what it is asking/);
  assert.throws(() => validateTask({ ...base, state: 'needs-human', question: { at: 'x', decision: 'd', why: 'w', continues: 'c', options: ['only one'], evidence: [] } }),
    /at least two options/);
});

test('a task file that is not a task is refused', async t => {
  const path = await fixture(t);
  await writeFile(path, JSON.stringify({ objective: 'a graph, not a task', nodes: [] }));
  await assert.rejects(readTask(path), /needs a slug id, statement, completion condition and openedAt/);
  assert.match(String(await readFile(path, 'utf8')), /a graph, not a task/);
});

// A verification of a heredoc script rendered its own result twenty-five lines below its own
// identity, and a stateless reader re-ran a verification that had already passed because of it.
test('a multi-line question stays under its own label, and a real exit status is on the operation line', async t => {
  const path = await fixture(t);
  await verifyTask(path, 'printf "one\\ntwo\\n"');
  const shown = showTask(await readTask(path));
  const lines = shown.split('\n');
  const header = lines.findIndex(line => /^  1\. verify by tag verify/.test(line));
  assert.ok(header >= 0, 'the operation has a header line');
  assert.match(lines[header], /ran a command, exited 0/);
  // Every line between the header and `reported:` is an indented continuation of `asked:`, so the
  // result cannot be pushed away from the operation it belongs to by the length of the command.
  const reported = lines.findIndex((line, index) => index > header && /^     reported: /.test(line));
  assert.ok(reported > header, 'the result is still rendered');
  for (const line of lines.slice(header + 2, reported)) {
    assert.match(line, /^ {7}/, `continuation line is indented under its label: ${JSON.stringify(line)}`);
  }
});

test('an operation that ran nothing does not claim it ran a command', async t => {
  const path = await fixture(t);
  const task = await readTask(path);
  task.operations = [{ at: new Date().toISOString(), by: 'runner', operation: 'read something',
    question: 'What does it say?', result: 'It says a thing.', evidence: [] }];
  await writeTask(path, task);
  const shown = showTask(await readTask(path));
  assert.doesNotMatch(shown, /ran a command, exited/);
  assert.match(shown, /evidence: none — this is a claim/);
});

// A close refused for what it cites used to leave nothing behind. A stateless runner re-read the
// state, saw no trace of the refusal, and proposed the identical close again — twice, verbatim.
test('a refused close is recorded, so the next reader knows it was refused', async t => {
  const path = await fixture(t);
  const task = await readTask(path);
  task.operations = [{ at: new Date().toISOString(), by: 'runner', operation: 'edit a file',
    question: 'Can the file be edited?', result: 'It was edited.', evidence: ['$ sed -i s/a/b/ f'] }];
  await writeTask(path, task);
  await assert.rejects(closeTask(path, 'The edit is done.', ['1']), /ran no command/);
  const after = await readTask(path);
  assert.equal(after.state, 'open', 'a refused close does not complete the task');
  assert.equal(after.closed, undefined);
  assert.equal(after.operations.length, 2);
  assert.equal(after.operations[1].operation, 'refused close');
  assert.equal(after.operations[1].exit, undefined, 'a refusal ran nothing, so it stamps no exit status');
  assert.match(after.operations[1].result, /refused and nothing was changed/);
  assert.match(showTask(after), /refused close/);
  assert.match(showTask(after), /attempted closing statement: The edit is done\./);
});

test('a close citing nothing is refused and that refusal is recorded too', async t => {
  const path = await fixture(t);
  await verifyTask(path, 'true');
  await assert.rejects(closeTask(path, 'Done.', []), /a close with no evidence is a claim/);
  const after = await readTask(path);
  assert.equal(after.state, 'open');
  assert.equal(after.operations.at(-1).operation, 'refused close');
  assert.match(after.operations.at(-1).evidence[1], /cited: nothing/);
});
