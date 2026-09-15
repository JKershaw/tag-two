#!/usr/bin/env node
import { plan } from '../src/plan.js';
import { resolve } from 'node:path';

const [command, objective, repository = process.cwd(), ...extra] = process.argv.slice(2);
if (command === '--help' || command === '-h') {
  console.log('Usage: tag plan "objective" [repository]\nRequires OPENROUTER_API_KEY. Writes .tag/graph.json and .tag/graph.html, then stops.');
} else if (command !== 'plan' || !objective?.trim() || extra.length) {
  console.error('Usage: tag plan "objective" [repository]');
  process.exitCode = 1;
} else {
  try {
    const output = await plan(objective, resolve(repository));
    console.log(`Graph saved to ${output}`);
  } catch (error) {
    console.error(`Planning stopped: ${error.message}`);
    process.exitCode = 1;
  }
}
