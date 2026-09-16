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
const cli = join(root, 'bin', 'tag.js');

// Nothing exercised bin/tag.js before 0.1.0, so the interface a user actually types — the command
// list, the help, and the exit status a caller branches on — was pinned only by habit. The task
// runtime's behaviour is covered in task.test.js; this covers the surface around it.
const tag = async (...args) => {
  try {
    const { stdout, stderr } = await exec(process.execPath, [cli, ...args], { cwd: root, maxBuffer: 4 * 1024 * 1024 });
    return { code: 0, stdout, stderr };
  } catch (error) {
    return { code: error.code, stdout: error.stdout ?? '', stderr: error.stderr ?? '' };
  }
};

test('tag --version reports the package version, and nothing else states it', async () => {
  const { code, stdout } = await tag('--version');
  const { version } = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
  assert.equal(code, 0);
  assert.equal(stdout.trim(), version);
  assert.equal(await tag('-v').then(result => result.stdout.trim()), version);
});

// A help text that has quietly stopped listing a command is worse than none: it is documentation
// that reads as complete. The two lists are derived from the source rather than written twice.
test('help lists every command the CLI dispatches, and dispatches every command it lists', async () => {
  const source = await readFile(cli, 'utf8');
  const dispatched = source.slice(source.indexOf('const [command, ...rest]'));
  const commands = [...dispatched.matchAll(/\bcommand === '([a-z]+)'/g)].map(match => match[1]);
  const subcommands = [...dispatched.matchAll(/\bsubcommand === '([a-z]+)'/g)].map(match => match[1]);
  assert.ok(commands.length >= 7 && subcommands.length === 8, 'the extraction itself is stale, not the help');

  const { code, stdout } = await tag('--help');
  assert.equal(code, 0);
  for (const name of commands.filter(name => name !== 'task')) {
    assert.match(stdout, new RegExp(`^ +tag ${name} `, 'm'), `tag --help does not list the ${name} command.`);
  }
  for (const name of subcommands) {
    assert.match(stdout, new RegExp(`^Usage: tag task ${name} | +tag task ${name} `, 'm'), `tag --help does not list tag task ${name}.`);
  }
  const listed = [...stdout.matchAll(/^(?:Usage: )? +tag (?:task )?([a-z]+) /gm)].map(match => match[1]);
  for (const name of new Set(listed)) {
    assert.ok(commands.includes(name) || subcommands.includes(name), `tag --help lists ${name}, which the CLI does not dispatch.`);
  }
});

test('help states the exit statuses a caller branches on', async () => {
  const { stdout } = await tag('--help');
  assert.match(stdout, /Exit status: 0 succeeded .* 1 failed.* 2 control/s);
});

test('an unknown command, and no command at all, print the usage and fail', async () => {
  for (const args of [[], ['nonsense'], ['task'], ['task', 'nonsense', 'x.json']]) {
    const { code, stderr } = await tag(...args);
    assert.equal(code, 1, `tag ${args.join(' ')} should exit 1.`);
    assert.match(stderr, /^Usage: tag task open/m, `tag ${args.join(' ')} should print the usage.`);
  }
});

test('the usage leads with the task runner and labels the graph commands experimental', async () => {
  const { stderr } = await tag('nonsense');
  assert.ok(stderr.indexOf('tag task open') < stderr.indexOf('tag plan'),
    'The task runner is the 0.1 interface and is listed first.');
  assert.match(stderr, /^Experimental \(the planning and graph research line/m);
});

test('a failing verification exits 1, a passing one exits 0, and asking a human exits 2', async t => {
  const work = await mkdtemp(join(tmpdir(), 'tag-cli-'));
  t.after(() => rm(work, { recursive: true, force: true }));
  const task = join(work, 'task.json');

  assert.equal((await tag('task', 'open', task, 'exit-statuses', 'Pin what a caller sees.', 'Both verifications ran.')).code, 0);
  assert.equal((await tag('task', 'verify', task, 'exit 3')).code, 1, 'a failing command must fail the CLI, not just the record');
  assert.equal((await tag('task', 'verify', task, 'exit 0')).code, 0);

  const asked = await tag('task', 'ask', task, '2', 'Which one?', 'A machine cannot settle it.', 'Whatever is chosen.', 'this', 'that');
  assert.equal(asked.code, 2, 'returning control to a human is not a failure and must be distinguishable from one');
  assert.match(asked.stdout, /^Control returned to a human\./m);

  // A task waiting on a human is not closed behind its back, and that refusal is a failure.
  assert.equal((await tag('task', 'close', task, 'Done anyway.', '2')).code, 1);
  assert.equal((await tag('task', 'answer', task, 'john', 'Go ahead.')).code, 0);
  assert.equal((await tag('task', 'close', task, 'The second verification passed.', '2')).code, 0);
  assert.equal(JSON.parse(await readFile(task, 'utf8')).state, 'complete');
});
