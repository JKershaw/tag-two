#!/usr/bin/env node
import { plan } from '../src/plan.js';
import { record } from '../src/record.js';
import { input } from '../src/input.js';
import { adopt } from '../src/adopt.js';
import { check, report } from '../src/check.js';
import { observe, describe } from '../src/observe.js';
import { openTask, readTask, writeTask, showTask, verifyTask, closeTask, askTask, answerTask } from '../src/task.js';
import { resolve, dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// One version number, read from the package rather than written out a second time here.
const { version } = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'package.json'), 'utf8'));

// The task runner is the interface this release is about, so it is listed first and in full; the
// planning and graph commands are the research line it grew out of and are labelled as such. The
// exit statuses are part of the interface too: 2 means a human is being asked something, which is
// a different outcome from failure and has to be distinguishable by whatever ran the command.
const taskUsage = [
  'Usage: tag task open   <task.json> <id> "statement" "verified completion means\u2026" ["reserved decision"\u2026]',
  '       tag task intent <task.json> <from> <kind> "what was said"',
  '       tag task op     <task.json> <by> <operation> "bounded question" "what it reported" ["evidence"\u2026]',
  '       tag task verify <task.json> "command"',
  '       tag task ask    <task.json> <evidence operation numbers> "decision required" "why a machine cannot settle it" "what continues after the answer" "option"\u2026',
  '       tag task answer <task.json> <from> "what the human said"',
  '       tag task close  <task.json> "how the cited evidence establishes completion" <operation number>\u2026',
  '       tag task show   <task.json>',
].join('\n');
const graphUsage = [
  'Experimental (the planning and graph research line; see docs/experiments.md):',
  '       tag plan "objective" [repository]',
  '       tag record <graph.json> <node-id> "what happened"',
  '       tag input <graph.json> <from> <kind> "what was said"',
  '       tag adopt <new-graph.json> <durable-graph.json>',
  '       tag check <proposed-graph.json> <durable-graph.json>',
  '       tag observe <graph.json|failed-run.json>',
].join('\n');
const usage = `${taskUsage}\n\n${graphUsage}\n\ntag --help for what each one does \u00b7 tag --version`;
const help = [
  taskUsage,
  '',
  'tag task holds one authorised task episode: what was asked, what would count as verified',
  'completion, which decisions stay with the human, what was said from outside, and every bounded',
  'operation somebody performed. It proposes no work, ranks nothing, schedules nothing, calls no',
  'model, and chooses no operation.',
  '',
  '  open    records the task as supplied. It refuses to overwrite an existing task file.',
  '  intent  keeps a constraint, hypothesis or observation in the words it arrived in.',
  '  op      records an operation somebody performed. One with no evidence is shown as a claim.',
  '  verify  runs the command and records the exit status the machine returned. Only a verification',
  '          establishes anything, and only a verification may be cited by a close.',
  '  ask     returns control to a human, recording the decision, why a machine cannot settle it,',
  '          the evidence it rests on, at least two real options, and what continues after the answer.',
  '  answer  keeps the human\u2019s reply on the question it answers, without interpreting it.',
  '  close   completes the task, citing verifications that really ran and really exited 0. A close',
  '          that cites nothing, cites an operation that ran nothing, or cites a failing one is',
  '          refused \u2014 and the refusal is recorded as an operation, so the next reader sees it.',
  '  show    prints the whole episode in text. This is what a fresh agent or a human is handed.',
  '',
  'Exit status: 0 succeeded \u00b7 1 failed, including a verification whose command failed \u00b7 2 control',
  'was returned to a human by tag task ask.',
  '',
  graphUsage,
  '',
  'plan requires OPENROUTER_API_KEY, writes .tag/graph.json and .tag/graph.html, then stops.',
  'record appends an outcome to one node of an existing graph and re-renders its HTML.',
  'input appends something said from outside the graph \u2014 a human or agent objective, observation,',
  'belief, question, priority or constraint \u2014 in the words it arrived in, attached to no node.',
  'adopt replaces a durable graph with a newer one for the same objective, carrying every recorded',
  'outcome and input across.',
  'check asks, in one bounded model request, which of a graph\u2019s proposed tasks the recorded outcomes',
  'already report as done or refuted, and verifies every quote against those outcomes.',
  'observe reports what a run actually did, without calling a model.',
  '',
  'These six are research, kept because they are the evidence the task runner was derived from.',
  'Eighty-eight recorded runs and five task episodes are in docs/experiments.md and',
  'docs/notes/steward-log.md.',
].join('\n');

const [command, ...rest] = process.argv.slice(2);
if (command === '--help' || command === '-h') {
  console.log(help);
} else if (command === '--version' || command === '-v') {
  console.log(version);
} else if (command === 'plan') {
  const [objective, repository = process.cwd(), ...extra] = rest;
  if (!objective?.trim() || extra.length) {
    console.error(usage);
    process.exitCode = 1;
  } else {
    try {
      console.log(`Graph saved to ${await plan(objective, resolve(repository))}`);
    } catch (error) {
      console.error(`Planning stopped: ${error.message}`);
      process.exitCode = 1;
    }
  }
} else if (command === 'record') {
  const [graphPath, nodeId, outcome, ...extra] = rest;
  if (!graphPath?.trim() || !nodeId?.trim() || !outcome?.trim() || extra.length) {
    console.error(usage);
    process.exitCode = 1;
  } else {
    try {
      const { htmlPath, outcomes } = await record(resolve(graphPath), nodeId, outcome);
      console.log(`Recorded outcome ${outcomes} on ${nodeId}; re-rendered ${htmlPath}`);
    } catch (error) {
      console.error(`Recording stopped: ${error.message}`);
      process.exitCode = 1;
    }
  }
} else if (command === 'input') {
  const [graphPath, from, kind, text, ...extra] = rest;
  if (!graphPath?.trim() || !from?.trim() || !kind?.trim() || !text?.trim() || extra.length) {
    console.error(usage);
    process.exitCode = 1;
  } else {
    try {
      const { htmlPath, inputs } = await input(resolve(graphPath), from, kind, text);
      console.log(`Recorded ${kind} from ${from} (${inputs} input(s) held); re-rendered ${htmlPath}`);
    } catch (error) {
      console.error(`Recording input stopped: ${error.message}`);
      process.exitCode = 1;
    }
  }
} else if (command === 'adopt') {
  const [fromPath, ontoPath, ...extra] = rest;
  if (!fromPath?.trim() || !ontoPath?.trim() || extra.length) {
    console.error(usage);
    process.exitCode = 1;
  } else {
    try {
      // Paths are kept as written so the provenance a durable graph records stays repository-relative.
      const { htmlPath, nodes, carried, retired, inputs, brought } = await adopt(fromPath, ontoPath);
      console.log(`Adopted ${nodes} nodes, carried ${carried} recorded outcomes (${retired} for retired nodes) and ${inputs} recorded input(s), ${brought} of them from the adopted graph; re-rendered ${htmlPath}`);
    } catch (error) {
      console.error(`Adopting stopped: ${error.message}`);
      process.exitCode = 1;
    }
  }
} else if (command === 'check') {
  const [proposedPath, durablePath, ...extra] = rest;
  if (!proposedPath?.trim() || !durablePath?.trim() || extra.length) {
    console.error(usage);
    process.exitCode = 1;
  } else {
    try {
      console.log(report(await check(resolve(proposedPath), resolve(durablePath))));
    } catch (error) {
      console.error(`Checking stopped: ${error.message}`);
      process.exitCode = 1;
    }
  }
} else if (command === 'task') {
  const [subcommand, taskPath, ...args] = rest;
  try {
    if (subcommand === 'open') {
      const [id, statement, completion, ...reserved] = args;
      if (!taskPath?.trim() || !id?.trim() || !statement?.trim() || !completion?.trim()) throw new Error(usage);
      console.log(`Task ${id} opened at ${await openTask(resolve(taskPath), { id, statement, completion, reserved })}`);
    } else if (subcommand === 'intent') {
      const [from, kind, text, ...extra] = args;
      if (!taskPath?.trim() || !from?.trim() || !kind?.trim() || !text?.trim() || extra.length) throw new Error(usage);
      const task = await readTask(resolve(taskPath));
      task.intent = [...task.intent, { at: new Date().toISOString(), from: from.trim(), kind: kind.trim(), text: text.trim() }];
      await writeTask(resolve(taskPath), task);
      console.log(`Recorded ${kind} from ${from}; ${task.intent.length} intent item(s) held on ${task.id}.`);
    } else if (subcommand === 'op') {
      const [by, operation, question, result, ...evidence] = args;
      if (!taskPath?.trim() || !by?.trim() || !operation?.trim() || !question?.trim() || !result?.trim()) throw new Error(usage);
      const task = await readTask(resolve(taskPath));
      task.operations = [...task.operations, { at: new Date().toISOString(), by: by.trim(), operation: operation.trim(), question: question.trim(), result: result.trim(), evidence }];
      await writeTask(resolve(taskPath), task);
      console.log(`Recorded operation ${task.operations.length} (${operation} by ${by}) on ${task.id}.`);
    } else if (subcommand === 'verify') {
      const [command, ...extra] = args;
      if (!taskPath?.trim() || !command?.trim() || extra.length) throw new Error(usage);
      const { exit, operations } = await verifyTask(resolve(taskPath), command);
      console.log(`Ran the command; it exited ${exit}. Recorded as operation ${operations}.`);
      if (exit !== 0) process.exitCode = 1;
    } else if (subcommand === 'ask') {
      const [cited, decision, why, continues, ...options] = args;
      if (!taskPath?.trim() || !cited?.trim() || !decision?.trim() || !why?.trim() || !continues?.trim()) throw new Error(usage);
      const question = await askTask(resolve(taskPath), { decision, why, continues, options, cited: cited.split(',').map(item => item.trim()).filter(Boolean) });
      console.log(`Control returned to a human. ${question.decision}`);
      process.exitCode = 2;
    } else if (subcommand === 'answer') {
      const [from, text, ...extra] = args;
      if (!taskPath?.trim() || !from?.trim() || !text?.trim() || extra.length) throw new Error(usage);
      const answered = await answerTask(resolve(taskPath), from, text);
      console.log(`Answer from ${answered.from} recorded; the task is open again.`);
    } else if (subcommand === 'close') {
      const [statement, ...cited] = args;
      if (!taskPath?.trim() || !statement?.trim()) throw new Error(usage);
      const closed = await closeTask(resolve(taskPath), statement, cited);
      console.log(`Closed as complete, relying on:\n${closed.relied.map(line => `  - ${line}`).join('\n')}`);
    } else if (subcommand === 'show') {
      if (!taskPath?.trim() || args.length) throw new Error(usage);
      console.log(showTask(await readTask(resolve(taskPath))));
    } else {
      throw new Error(usage);
    }
  } catch (error) {
    console.error(error.message === usage ? usage : `Task command stopped: ${error.message}`);
    process.exitCode = 1;
  }
} else if (command === 'observe') {
  const [runPath, ...extra] = rest;
  if (!runPath?.trim() || extra.length) {
    console.error(usage);
    process.exitCode = 1;
  } else {
    try {
      console.log(describe(await observe(runPath)));
    } catch (error) {
      console.error(`Observing stopped: ${error.message}`);
      process.exitCode = 1;
    }
  }
} else {
  console.error(usage);
  process.exitCode = 1;
}
