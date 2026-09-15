#!/usr/bin/env node
import { plan } from '../src/plan.js';
import { record } from '../src/record.js';
import { input } from '../src/input.js';
import { adopt } from '../src/adopt.js';
import { check, report } from '../src/check.js';
import { observe, describe } from '../src/observe.js';
import { resolve } from 'node:path';

const usage = 'Usage: tag plan "objective" [repository]\n       tag record <graph.json> <node-id> "what happened"\n       tag input <graph.json> <from> <kind> "what was said"\n       tag adopt <new-graph.json> <durable-graph.json>\n       tag check <proposed-graph.json> <durable-graph.json>\n       tag observe <graph.json|failed-run.json>';
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
