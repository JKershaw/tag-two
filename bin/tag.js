#!/usr/bin/env node
import { plan } from '../src/plan.js';
import { record } from '../src/record.js';
import { resolve } from 'node:path';

const usage = 'Usage: tag plan "objective" [repository]\n       tag record <graph.json> <node-id> "what happened"';
const [command, ...rest] = process.argv.slice(2);
if (command === '--help' || command === '-h') {
  console.log(`${usage}\nplan requires OPENROUTER_API_KEY, writes .tag/graph.json and .tag/graph.html, then stops.\nrecord appends an outcome to one node of an existing graph and re-renders its HTML.`);
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
} else {
  console.error(usage);
  process.exitCode = 1;
}
