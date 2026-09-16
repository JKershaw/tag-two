import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { validateTask } from '../src/task.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// The five episodes in tasks/ are the evidence this release rests on, and the README counts them
// in a sentence a reader will take as fact. Two things can rot: the archive can stop being
// readable by the code that wrote it, and the sentence can stop matching the archive. Both are
// checked here, against the files themselves, the same way documented-limits.test.js checks the
// planner's numbers against the constants.
const episodes = async () => {
  const names = (await readdir(join(root, 'tasks'))).filter(name => name.endsWith('.json'));
  return Promise.all(names.sort().map(async name =>
    ({ name, task: JSON.parse(await readFile(join(root, 'tasks', name), 'utf8')) })));
};

test('every archived episode is still a valid task, complete, and closed on evidence', async () => {
  const archived = await episodes();
  assert.ok(archived.length >= 5, 'the archive itself is missing episodes');
  for (const { name, task } of archived) {
    assert.doesNotThrow(() => validateTask(task), `tasks/${name} no longer validates as a task.`);
    assert.equal(task.state, 'complete', `tasks/${name} is not complete.`);
    assert.ok(task.closed.relied.length, `tasks/${name} closed without naming what it relied on.`);
  }
});

test('README’s count of what the episodes contain matches the episodes', async () => {
  const readme = await readFile(join(root, 'README.md'), 'utf8');
  const found = (pattern, what) => {
    const match = readme.match(pattern);
    assert.ok(match, `${what}: nothing in README.md matched ${pattern}. The check itself is stale, not the README.`);
    return match[1];
  };
  const words = { three: 3, four: 4, five: 5, six: 6, seven: 7 };

  const archived = await episodes();
  const operations = archived.flatMap(item => item.task.operations);
  const ran = operations.filter(operation => operation.exit !== undefined);

  assert.equal(words[found(/(\w+) episodes have been carried end to end/, 'episode count').toLowerCase()], archived.length);
  assert.equal(Number(found(/([\d]+) recorded operations/, 'operation count')), operations.length);
  assert.equal(Number(found(/([\d]+) of them commands run\s+by `tag verify`/, 'executed-command count')), ran.length);
  assert.equal(Number(found(/([\d]+) of which failed/, 'failure count')), ran.filter(operation => operation.exit !== 0).length);
  // "one judgement returned to a human" is the sharpest claim in that paragraph, and the one most
  // likely to be repeated without checking. Exactly one of the five episodes asked anything.
  assert.equal(archived.filter(item => item.task.question !== undefined).length, 1,
    'README says one judgement was returned to a human; the archive disagrees.');
});
