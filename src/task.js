import { readFile, writeFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const exec = promisify(execFile);

// Harbour-shaped work arrives as a bounded task, not as a broad objective. tag-two had nowhere to
// put one. Pushed through `tag input` it became an eighth undifferentiated sentence on a graph
// answering a different objective — "Make tag-two better at achieving its purpose." — with no
// identity, no completion condition and no state, so nothing could say whether it was done.
// Pushed through `tag record` it became an outcome on an unrelated node and the rendering then
// reported "0 ready · 3 worked" for work nobody had performed. This holds the task as supplied:
// what was asked, the intent and constraints that came with it, what would count as verified
// completion, and which decisions stay with the human. It decides nothing and runs nothing.
const nonempty = value => typeof value === 'string' && value.trim().length > 0;

export function validateTask(task) {
  if (!task || !nonempty(task.id) || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(task.id)
    || !nonempty(task.statement) || !nonempty(task.completion) || !nonempty(task.openedAt)) {
    throw new Error('A task needs a slug id, statement, completion condition and openedAt.');
  }
  // Intent is kept in the words it arrived in, with the kind its author gave it, exactly as
  // `tag input` keeps it: a constraint, a hypothesis and an observation are not the same thing,
  // and nothing here interprets or checks which is which.
  if (!Array.isArray(task.intent) || !task.intent.every(item => item && nonempty(item.at)
    && nonempty(item.from) && nonempty(item.kind) && nonempty(item.text))) {
    throw new Error('Intent must be a list of {at, from, kind, text}.');
  }
  if (!Array.isArray(task.reserved) || !task.reserved.every(nonempty)) {
    throw new Error('Reserved decisions must be a list of sentences.');
  }
  // A bounded operation happened and its result had nowhere to go. `tag record` refuses a task
  // outright — "Expected the original objective, a research summary, and 1-8 nodes" — and the only
  // remaining slot was `intent`, which files a machine's unverified finding as human direction
  // supplied from outside. That is the confusion `tag input` was built to stop, one level up. An
  // operation is kept as what it is: who performed it, what bounded question it was given, and
  // what it reported. `operation` is the performer's own word for it, not a taxonomy.
  if (!Array.isArray(task.operations) || !task.operations.every(item => item && nonempty(item.at)
    && nonempty(item.by) && nonempty(item.operation) && nonempty(item.question) && nonempty(item.result)
    && Array.isArray(item.evidence) && item.evidence.every(nonempty))) {
    throw new Error('Operations must be a list of {at, by, operation, question, result, evidence}.');
  }
  // Only a verification carries an exit status, and only because it really ran something.
  if (!task.operations.every(item => item.exit === undefined || Number.isInteger(item.exit))) {
    throw new Error('An operation\u2019s exit status must be an integer when present.');
  }
  if (!['open', 'needs-human', 'complete'].includes(task.state)) {
    throw new Error('A task is open, needs-human or complete.');
  }
  if (task.closed !== undefined && (!nonempty(task.closed.at) || !nonempty(task.closed.statement)
    || !Array.isArray(task.closed.relied) || !task.closed.relied.length || !task.closed.relied.every(nonempty))) {
    throw new Error('A close must record {at, statement, relied} naming the evidence it relied on.');
  }
  if ((task.state === 'complete') !== (task.closed !== undefined)) {
    throw new Error('A task is complete exactly when it records what closed it.');
  }
  if (task.question !== undefined && (!nonempty(task.question.at) || !nonempty(task.question.decision)
    || !nonempty(task.question.why) || !nonempty(task.question.continues)
    || !Array.isArray(task.question.options) || task.question.options.length < 2 || !task.question.options.every(nonempty)
    || !Array.isArray(task.question.evidence) || !task.question.evidence.every(nonempty))) {
    throw new Error('A question must record {at, decision, why, continues, options, evidence} with at least two options.');
  }
  if (task.state === 'needs-human' && task.question === undefined) {
    throw new Error('A task needs a human exactly when it records what it is asking.');
  }
  return task;
}

export async function readTask(path) {
  let task;
  try {
    task = JSON.parse(await readFile(path, 'utf8'));
  } catch (error) {
    throw new Error(`Could not read a task from ${path}: ${error.message}`);
  }
  return validateTask(task);
}

export async function writeTask(path, task) {
  validateTask(task);
  await writeFile(path, JSON.stringify(task, null, 2) + '\n');
  return path;
}

export async function openTask(path, { id, statement, completion, reserved = [] },
  { now = () => new Date().toISOString() } = {}) {
  if (!path.endsWith('.json')) throw new Error('Point at a task.json file.');
  try {
    await readFile(path, 'utf8');
    throw new Error(`${path} already holds a task. Tasks are not overwritten.`);
  } catch (error) {
    if (!error.message.startsWith('ENOENT') && !error.message.includes('no such file')) throw error;
  }
  return writeTask(path, validateTask({
    id, statement, completion, reserved, intent: [], operations: [], state: 'open', openedAt: now(),
  }));
}

// The point of durable task state is that a stateless agent or a human can read it and continue.
// So the state has one rendering, in text, that says what was asked, what is established, what
// happened, what evidence exists and why control is where it is.
export function showTask(task) {
  const operations = task.operations.map((item, index) => [
    `  ${index + 1}. ${item.operation} by ${item.by} (${item.at})`,
    `     asked: ${item.question}`,
    `     reported: ${item.result}`,
    item.evidence.length
      ? item.evidence.map(line => `     evidence: ${line.replace(/\n/g, '\n       ')}`).join('\n')
      : '     evidence: none — this is a claim, not an established result',
  ].join('\n'));
  return [
    `Task ${task.id} · ${task.state} · opened ${task.openedAt}`,
    `Asked: ${task.statement}`,
    `Verified completion means: ${task.completion}`,
    task.intent.length
      ? `Intent and constraints supplied from outside (in the words they arrived in):\n${task.intent.map(item => `  - ${item.kind} from ${item.from} (${item.at}): ${item.text}`).join('\n')}`
      : 'No intent or constraints have been supplied.',
    task.reserved.length
      ? `Reserved for the human:\n${task.reserved.map(item => `  - ${item}`).join('\n')}`
      : 'No decisions are recorded as reserved.',
    operations.length
      ? `Operations performed (${operations.length}):\n${operations.join('\n')}`
      : 'No operations have been performed.',
    task.question
      ? [`Control returned to a human ${task.question.at}${task.state === 'needs-human' ? ' and is still there.' : '.'}`,
        `  Decision required: ${task.question.decision}`,
        `  Why a machine cannot settle it: ${task.question.why}`,
        `  Resting on:\n${task.question.evidence.map(line => `    - ${line}`).join('\n')}`,
        `  Options:\n${task.question.options.map(option => `    - ${option}`).join('\n')}`,
        `  What continues once it is answered: ${task.question.continues}`].join('\n')
      : '',
    task.closed
      ? `Closed ${task.closed.at}: ${task.closed.statement}\nRelied on:\n${task.closed.relied.map(line => `  - ${line}`).join('\n')}`
      : `Not closed. Control sits with whoever is reading this; the task is ${task.state}.`,
  ].filter(Boolean).join('\n');
}

// `tag task op` will write down whatever it is told. Handed "npm test: 9999 passing, 0 failing,
// exit 0" for a command that was never run, it recorded it without complaint, because an operation
// result is the performer's own account of itself. The task that exposed this said in its own
// completion condition that agent self-report does not count. So a verification runs the command
// and records what actually came back: the exit status is the machine's, not the author's.
export async function verifyTask(path, command, { now = () => new Date().toISOString(), run = exec } = {}) {
  if (typeof command !== 'string' || !command.trim()) throw new Error('A command is required.');
  const task = await readTask(path);
  let stdout = '';
  let stderr = '';
  let exitCode = 0;
  try {
    ({ stdout, stderr } = await run('sh', ['-c', command], { cwd: process.cwd(), maxBuffer: 4 * 1024 * 1024, timeout: 600_000 }));
  } catch (error) {
    // A command that could not be started at all produced no evidence about anything, so nothing
    // is recorded: an unrunnable check must not leave a row that reads like a failed one.
    if (typeof error.code !== 'number') throw new Error(`Could not run that command: ${error.message}. Nothing was recorded.`);
    ({ stdout = '', stderr = '' } = error);
    exitCode = error.code;
  }
  const tail = text => text.trimEnd().split('\n').slice(-12).join('\n');
  task.operations = [...task.operations, {
    at: now(), by: 'tag verify', operation: 'verify',
    question: `Does \`${command}\` succeed?`,
    result: exitCode === 0 ? `It exited 0. The command ran and reported success.` : `It exited ${exitCode}. The command ran and reported failure.`,
    evidence: [`$ ${command}`, `exit status ${exitCode}`, ...(stdout.trim() ? [`stdout (last lines):\n${tail(stdout)}`] : []), ...(stderr.trim() ? [`stderr (last lines):\n${tail(stderr)}`] : [])],
    exit: exitCode,
  }];
  await writeTask(path, task);
  return { exit: exitCode, operations: task.operations.length };
}

// Closing by editing `state` to "complete" is the self-report the completion condition rules out,
// one level further up: the evidence is real now, but nothing connects it to the thing that was
// asked. A close names the verifications it relies on, and those citations are looked up rather
// than trusted — the same discipline the evidence-citation guard and `tag check` already use.
// What a machine can establish is that the cited operations exist, really ran, and really exited
// zero. Whether they are the right checks for this completion condition is a human reading.
// Citations are the same in a close and in a question: the point of naming an operation is that
// somebody can look it up, so it is looked up here rather than taken on trust.
function relyOn(task, cited, { ran = true } = {}) {
  const relied = [];
  for (const reference of cited) {
    const index = Number(reference);
    const operation = Number.isInteger(index) && index >= 1 ? task.operations[index - 1] : undefined;
    if (!operation) throw new Error(`Operation ${reference} does not exist on ${task.id}. Nothing was changed.`);
    if (ran && operation.exit === undefined) throw new Error(`Operation ${reference} (${operation.operation} by ${operation.by}) ran no command, so it establishes nothing. Nothing was changed.`);
    if (ran && operation.exit !== 0) throw new Error(`Operation ${reference} exited ${operation.exit}. A failing check does not close a task. Nothing was changed.`);
    relied.push(ran ? `operation ${index}: ${operation.evidence[0]} \u2192 ${operation.evidence[1]}`
      : `operation ${index} (${operation.operation} by ${operation.by}): ${operation.result}`);
  }
  return relied;
}

// Across the whole previous trial tag-two never once said that something needed a human, including
// when its own durable graph became exhausted; the steward found that out by running a check and
// reading the output. This episode reached the same wall from the other side: two reachable losses
// of recorded evidence were established mechanically, and what `adopt` should do instead is not
// settleable by investigation — refusing, merging and documenting a precondition are all defensible
// and mean different things about what a durable record is. Returning control is an operation, so
// it is recorded like one: the decision, why a machine cannot settle it, the evidence it rests on,
// the options as they really are, and what will continue once the answer arrives.
export async function askTask(path, { decision, why, continues, options, cited },
  { now = () => new Date().toISOString() } = {}) {
  for (const [name, value] of [['decision', decision], ['why', why], ['what continues after the answer', continues]]) {
    if (typeof value !== 'string' || !value.trim()) throw new Error(`A ${name} is required.`);
  }
  if (!Array.isArray(options) || options.length < 2) throw new Error('Give at least two real options; one option is a decision already taken.');
  const task = await readTask(path);
  if (task.state === 'complete') throw new Error(`${task.id} is already complete.`);
  if (task.question) throw new Error(`${task.id} is already waiting on an answer. Answer it before asking again.`);
  task.state = 'needs-human';
  task.question = {
    at: now(), decision: decision.trim(), why: why.trim(), continues: continues.trim(),
    options: options.map(option => option.trim()), evidence: relyOn(task, cited, { ran: false }),
  };
  await writeTask(path, task);
  return task.question;
}

export async function closeTask(path, statement, cited, { now = () => new Date().toISOString() } = {}) {
  if (typeof statement !== 'string' || !statement.trim()) throw new Error('A closing statement is required.');
  const task = await readTask(path);
  if (task.state === 'complete') throw new Error(`${task.id} is already complete.`);
  if (!cited.length) throw new Error('Name the verification(s) that establish completion; a close with no evidence is a claim.');
  if (task.state === 'needs-human') throw new Error(`${task.id} is waiting on a human decision. Answer it before closing.`);
  const relied = relyOn(task, cited);
  task.state = 'complete';
  task.closed = { at: now(), statement: statement.trim(), relied };
  await writeTask(path, task);
  return task.closed;
}
