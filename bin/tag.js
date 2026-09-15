#!/usr/bin/env node
import { plan } from '../src/plan.js';
import { record } from '../src/record.js';
import { input } from '../src/input.js';
import { adopt } from '../src/adopt.js';
import { check, report } from '../src/check.js';
import { observe, describe } from '../src/observe.js';
import { openTask, readTask, writeTask, showTask, verifyTask, closeTask } from '../src/task.js';
import { resolve } from 'node:path';

const usage = 'Usage: tag plan "objective" [repository]\n       tag record <graph.json> <node-id> "what happened"\n       tag input <graph.json> <from> <kind> "what was said"\n       tag adopt <new-graph.json> <durable-graph.json>\n       tag check <proposed-graph.json> <durable-graph.json>\n       tag observe <graph.json|failed-run.json>\n       tag task open <task.json> <id> "statement" "verified completion means…" ["reserved decision"…]\n       tag task intent <task.json> <from> <kind> "what was said"\n       tag task op <task.json> <by> <operation> "bounded question" "what it reported" ["evidence"…]\n       tag task verify <task.json> "command"\n       tag task close <task.json> "how the cited evidence establishes completion" <operation number>…\n       tag task show <task.json>';
const [command, ...rest] = process.argv.slice(2);
if (command === '--help' || command === '-h') {
  console.log(`${usage}\nplan requires OPENROUTER_API_KEY, writes .tag/graph.json and .tag/graph.html, then stops.\nrecord appends an outcome to one node of an existing graph and re-renders its HTML.\ninput appends something said from outside the graph — a human or agent objective, observation, belief, question, priority or constraint — in the words it arrived in, attached to no node.\nadopt replaces a durable graph with a newer one for the same objective, carrying every recorded outcome across.\ncheck asks, in one bounded model request, which of a graph's proposed tasks the recorded outcomes already report as done or refuted, and verifies every quote against those outcomes.\nobserve reports what a run actually did, without calling a model.`);
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
      const { htmlPath, nodes, carried, retired } = await adopt(fromPath, ontoPath);
      console.log(`Adopted ${nodes} nodes, carried ${carried} recorded outcomes (${retired} for retired nodes); re-rendered ${htmlPath}`);
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
