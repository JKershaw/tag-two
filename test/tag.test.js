import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, rm, symlink, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { validateGraph, renderGraph } from '../src/graph.js';
import { repositoryTools } from '../src/repository.js';
import { plan } from '../src/plan.js';

const objective = 'Improve the project';
const graph = () => ({
  objective, summary: 'The repository describes an experiment; runtime behaviour remains unverified.',
  nodes: [
    { id: 'investigate', title: 'Investigate usefulness', reason: 'Find evidence of progress.', evidence: ['README.md:1 — project purpose'], dependsOn: [] },
    { id: 'demonstrate', title: 'Demonstrate improvement', reason: 'Show progress against the objective.', evidence: ['README.md:1 — project purpose'], dependsOn: ['investigate'] },
  ],
});

async function fixture(t) {
  const directory = await mkdtemp(join(tmpdir(), 'tag-two-test-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  execFileSync('git', ['init', '-q', directory]);
  await writeFile(join(directory, 'README.md'), 'Project purpose\nA small experiment\n');
  await writeFile(join(directory, '.env'), 'PRIVATE_TEST_VALUE=not-a-real-credential\n');
  await writeFile(join(directory, 'untracked.txt'), 'Untracked content');
  execFileSync('git', ['-C', directory, 'add', 'README.md', '.env']);
  return directory;
}

const json = value => ({ ok: true, json: async () => value });
const catalog = () => json({ data: [{
  id: 'deepseek/deepseek-chat-v3-0324',
  pricing: { prompt: '0.0000003', completion: '0.0000009', request: '0' },
}] });
const answer = content => json({
  choices: [{ finish_reason: 'stop', message: { role: 'assistant', content } }],
  usage: { cost: 0.001 },
});
const toolAnswer = (name = 'read_file', args = { path: 'README.md' }) => json({
  choices: [{ finish_reason: 'tool_calls', message: {
    role: 'assistant', content: null,
    tool_calls: [{ id: 'call-1', type: 'function', function: { name, arguments: JSON.stringify(args) } }],
  } }],
  usage: { cost: 0.001 },
});

test('validates a small evidence-backed dependency graph', () => {
  assert.equal(validateGraph(graph(), objective).nodes.length, 2);
});

test('rejects invalid node fields, objective drift, missing dependencies and cycles', () => {
  const mutations = [
    g => { g.objective = 'Something else'; },
    g => { g.nodes = []; },
    g => { g.nodes = Array.from({ length: 9 }, () => g.nodes[0]); },
    g => { g.nodes[0].id = undefined; },
    g => { g.nodes[0].id = '<script>'; },
    g => { g.nodes[1].id = g.nodes[0].id; },
    g => { g.nodes[0].reason = ''; },
    g => { g.nodes[0].evidence = []; },
    g => { g.nodes[0].dependsOn = ['missing']; },
    g => { g.nodes[0].dependsOn = ['investigate']; },
    g => { g.nodes[0].dependsOn = ['demonstrate']; },
  ];
  for (const mutate of mutations) {
    const value = graph();
    mutate(value);
    assert.throws(() => validateGraph(value, objective));
  }
});

test('HTML shows objective, evidence, readiness and dependency links without active content', () => {
  const value = graph();
  value.nodes[0].title = '<script>alert("x")</script>';
  value.summary = '<img src=x onerror=alert(1)>';
  value.run = { model: 'test', createdAt: 'today', requests: 2, costUsd: null,
    investigation: [{ tool: 'read_file', arguments: { path: 'README.md' }, result: '</pre><script>bad()</script>' }] };
  const html = renderGraph(value);
  assert.ok(html.includes(objective));
  assert.ok(html.includes('README.md:1'));
  assert.ok(html.includes('href="#investigate"'));
  assert.ok(html.includes('1 ready for human selection · 1 dependency-blocked'));
  assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(html.includes('Content-Security-Policy'));
  assert.ok(!html.includes('<script>'));
  assert.ok(!html.includes('<img'));
});

test('repository tools read, search and paginate tracked files, not secrets or untracked files', async t => {
  const directory = await fixture(t);
  const run = await repositoryTools(directory);
  assert.deepEqual(JSON.parse(await run('list_files', {})).files, ['README.md']);
  assert.match(await run('read_file', { path: 'README.md', startLine: 2 }), /^2: A small experiment/);
  assert.match(await run('search', { text: 'purpose' }), /README.md:1:/);
  assert.deepEqual(JSON.parse(await run('list_files', { offset: 100 })).files, []);
  for (const path of ['.env', 'untracked.txt', '../README.md', '/etc/passwd']) {
    await assert.rejects(run('read_file', { path }));
  }
  await assert.rejects(run('read_file', { path: 'README.md', startLine: 0 }));
  await assert.rejects(run('search', { text: '' }));
  await assert.rejects(run('shell', { command: 'echo unsafe' }));
  await assert.rejects(run('history', { path: '--all' }));
});

test('rejects symlink reads, binary content, oversized files and repository subdirectories', async t => {
  const directory = await fixture(t);
  await symlink('README.md', join(directory, 'link.txt'));
  await writeFile(join(directory, 'binary'), Buffer.from([0, 1, 2]));
  await writeFile(join(directory, 'large'), 'x'.repeat(256 * 1024 + 1));
  await mkdir(join(directory, 'subdir'));
  execFileSync('git', ['-C', directory, 'add', 'link.txt', 'binary', 'large']);
  const run = await repositoryTools(directory);
  for (const path of ['link.txt', 'binary', 'large']) await assert.rejects(run('read_file', { path }));
  await assert.rejects(repositoryTools(join(directory, 'subdir')), /root directory/);
});

test('planner investigates, persists graph and HTML, then stops without executing tasks', async t => {
  const directory = await fixture(t);
  let calls = 0;
  const fetchImpl = async (url, options) => {
    calls++;
    if (calls === 1) return catalog();
    const request = JSON.parse(options.body);
    assert.equal(request.model, 'deepseek/deepseek-chat-v3-0324');
    assert.ok(request.max_tokens <= 4096);
    if (calls === 2) return toolAnswer();
    assert.match(request.messages.at(-1).content, /Project purpose/);
    return answer(JSON.stringify(graph()));
  };
  const htmlPath = await plan(objective, directory, { apiKey: 'test-only', fetchImpl });
  const saved = JSON.parse(await readFile(join(directory, '.tag', 'graph.json'), 'utf8'));
  assert.equal(saved.objective, objective);
  assert.equal(saved.run.requests, 2);
  assert.equal(saved.run.costUsd, 0.002);
  assert.equal(saved.run.investigation.length, 1);
  assert.ok((await readFile(htmlPath, 'utf8')).includes('No tasks have been executed'));
  for (const path of ['.tag/graph.json', '.tag/graph.html', '.tag/.gitignore']) {
    execFileSync('git', ['-C', directory, 'check-ignore', '-q', path]);
  }
  assert.equal(calls, 3);
  await assert.rejects(plan(objective, directory, { apiKey: 'test-only', fetchImpl }), /already exists/);
  assert.equal(calls, 3);
});

test('missing credentials, network failure, HTTP errors and excessive prices fail without a graph or retries', async t => {
  const directory = await fixture(t);
  await assert.rejects(plan(objective, directory, { apiKey: '' }), /OPENROUTER_API_KEY/);
  for (const response of [
    () => { throw new TypeError('Network down'); },
    () => ({ ok: false, status: 401 }),
    () => json({ data: [] }),
    () => json({ data: [{ id: 'deepseek/deepseek-chat-v3-0324', pricing: { prompt: '1', completion: '1' } }] }),
  ]) {
    let calls = 0;
    await assert.rejects(plan(objective, directory, {
      apiKey: 'test-only', fetchImpl: async () => { calls++; return response(); },
    }));
    assert.equal(calls, 1);
    await assert.rejects(readFile(join(directory, '.tag', 'graph.json')), { code: 'ENOENT' });
  }
});

test('invalid or unresearched model output is not repaired or retried', async t => {
  const directory = await fixture(t);
  for (const researched of [true, false]) {
    let calls = 0;
    await assert.rejects(plan(objective, directory, {
      apiKey: 'test-only',
      fetchImpl: async () => {
        calls++;
        if (calls === 1) return catalog();
        if (calls === 2 && researched) return toolAnswer();
        return answer(researched ? '```json\n{}\n```' : JSON.stringify(graph()));
      },
    }), researched ? /Invalid planner graph/ : /without reading/);
    assert.equal(calls, researched ? 3 : 2);
    await assert.rejects(readFile(join(directory, '.tag', 'graph.json')), { code: 'ENOENT' });
  }
});

test('tool loop is bounded to ten requests', async t => {
  const directory = await fixture(t);
  let calls = 0;
  await assert.rejects(plan(objective, directory, {
    apiKey: 'test-only',
    fetchImpl: async () => ++calls === 1 ? catalog() : toolAnswer(),
  }), /Investigation limit/);
  assert.equal(calls, 11);
});
