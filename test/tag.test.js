import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, rm, symlink, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { validateGraph, renderGraph } from '../src/graph.js';
import { repositoryTools } from '../src/repository.js';
import { plan } from '../src/plan.js';
import { record } from '../src/record.js';
import { adopt } from '../src/adopt.js';
import { observe, describe } from '../src/observe.js';

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

test('read_file returns a whole file in one call rather than a fixed line window', async t => {
  const directory = await fixture(t);
  // The size of the README the first two dogfood runs each stopped reading at line 200.
  await writeFile(join(directory, 'long.md'), Array.from({ length: 739 }, (_, i) => `line ${i + 1}`).join('\n') + '\n');
  execFileSync('git', ['-C', directory, 'add', 'long.md']);
  const run = await repositoryTools(directory);
  const whole = await run('read_file', { path: 'long.md' });
  assert.match(whole, /^1: line 1$/m);
  assert.match(whole, /^739: line 739$/m);
  assert.match(whole, /End of long\.md; the whole file from line 1 has been shown\./);
  assert.doesNotMatch(whole, /PARTIAL READ/);
  assert.match(await run('read_file', { path: 'README.md' }), /End of README\.md/);
  assert.match(await run('read_file', { path: 'long.md', startLine: 900 }), /No lines read: long\.md has 740 lines/);
});

test('a file too large for one read is still bounded and reports an accurate resume point', async t => {
  const directory = await fixture(t);
  await writeFile(join(directory, 'huge.txt'), Array.from({ length: 2000 }, () => 'y'.repeat(100)).join('\n') + '\n');
  execFileSync('git', ['-C', directory, 'add', 'huge.txt']);
  const run = await repositoryTools(directory);
  const first = await run('read_file', { path: 'huge.txt' });
  assert.ok(first.length < 41_000, `expected a bounded read, got ${first.length} characters`);
  const [, last, total] = first.match(/PARTIAL READ: lines 1-(\d+) of (\d+)\./).map(Number);
  assert.ok(last > 200, `expected more than the old 200-line window, got ${last}`);
  // The named resume point must be exact: the next read starts on the first unread line.
  const resume = Number(first.match(/startLine (\d+) to read them/)[1]);
  assert.equal(resume, last + 1);
  const second = await run('read_file', { path: 'huge.txt', startLine: resume });
  assert.match(second, new RegExp(`^${resume}: y{100}$`, 'm'));
  assert.match(second, new RegExp(`of ${total}\\.`));
});

test('read_file stays bounded on long lines and reports the line it stopped at', async t => {
  const directory = await fixture(t);
  await writeFile(join(directory, 'wide.txt'), ['a'.repeat(60_000), 'b'.repeat(60_000), 'c'].join('\n') + '\n');
  execFileSync('git', ['-C', directory, 'add', 'wide.txt']);
  const run = await repositoryTools(directory);
  const result = await run('read_file', { path: 'wide.txt' });
  assert.ok(result.length < 45_000, `expected a bounded read, got ${result.length} characters`);
  // Stopping mid-file must be reported as partial with an accurate resume point, never silently.
  assert.match(result, /PARTIAL READ: lines 1-1 of 4\./);
  assert.match(result, /startLine 2 to read them/);
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

test('a graph wrapped in a markdown fence is unwrapped, but broken JSON is still not repaired', async t => {
  // A complete-research run produced a valid four-node graph and lost it to three backticks.
  for (const [content, expected] of [
    ['```json\n' + JSON.stringify(graph()) + '\n```', null],
    ['```\n' + JSON.stringify(graph()) + '```', null],
    [JSON.stringify(graph()), null],
    ['```json\n{"objective": "Improve the project", nodes: [\n```', /Invalid planner graph/],
    ['Here is the graph: ' + JSON.stringify(graph()), /Invalid planner graph/],
  ]) {
    const directory = await fixture(t);
    let calls = 0;
    const fetchImpl = async () => {
      calls++;
      if (calls === 1) return catalog();
      if (calls === 2) return toolAnswer();
      return answer(content);
    };
    if (expected) {
      await assert.rejects(plan(objective, directory, { apiKey: 'test-only', fetchImpl }), expected);
      await assert.rejects(readFile(join(directory, '.tag', 'graph.json')), { code: 'ENOENT' });
    } else {
      await plan(objective, directory, { apiKey: 'test-only', fetchImpl });
      const saved = JSON.parse(await readFile(join(directory, '.tag', 'graph.json'), 'utf8'));
      assert.equal(saved.nodes.length, 2);
      // The unedited model answer is recorded as returned, fence included.
      assert.equal(saved.run.investigation.length, 1);
    }
  }
});

test('invalid or unresearched model output is not repaired or retried', async t => {
  for (const researched of [true, false]) {
    const directory = await fixture(t);
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

test('a failed run keeps its transcript and rejected answer instead of deleting the evidence', async t => {
  const directory = await fixture(t);
  let calls = 0;
  // The second dogfood run failed validation and left nothing behind to diagnose.
  await assert.rejects(plan(objective, directory, {
    apiKey: 'test-only',
    fetchImpl: async () => {
      calls++;
      if (calls === 1) return catalog();
      if (calls === 2) return toolAnswer();
      return answer('{"objective":"drifted","summary":"s","nodes":[]}');
    },
  }), /failed-run\.json/);
  const failed = JSON.parse(await readFile(join(directory, '.tag', 'failed-run.json'), 'utf8'));
  assert.equal(failed.objective, objective);
  assert.match(failed.failure, /Invalid planner graph/);
  assert.equal(failed.run.requests, 2);
  assert.equal(failed.run.costUsd, 0.002);
  assert.match(failed.run.answer, /drifted/);
  assert.equal(failed.run.investigation[0].tool, 'read_file');
  assert.match(failed.run.investigation[0].result, /Project purpose/);
  await assert.rejects(readFile(join(directory, '.tag', 'graph.json')), { code: 'ENOENT' });
  // Preserved evidence is still repository content, so it must stay ignored.
  execFileSync('git', ['-C', directory, 'check-ignore', '-q', '.tag/failed-run.json']);
  // A preserved failure must be inspected and moved aside rather than silently overwritten.
  await assert.rejects(plan(objective, directory, { apiKey: 'test-only', fetchImpl: async () => catalog() }), /already exists/);
});

test('a run that fails before investigating leaves no directory behind', async t => {
  const directory = await fixture(t);
  await assert.rejects(plan(objective, directory, {
    apiKey: 'test-only', fetchImpl: async () => ({ ok: false, status: 500 }),
  }), /HTTP 500/);
  await assert.rejects(readFile(join(directory, '.tag', 'failed-run.json')), { code: 'ENOENT' });
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

const planned = () => ({
  ...graph(),
  run: { model: 'test-model', createdAt: '2026-09-15T00:00:00.000Z', requests: 2, costUsd: 0.001, investigation: [] },
});

async function graphFile(t, value = planned()) {
  const directory = await mkdtemp(join(tmpdir(), 'tag-two-record-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const path = join(directory, 'graph.json');
  await writeFile(path, JSON.stringify(value, null, 2) + '\n');
  return path;
}

test('record appends an outcome to one node and re-renders the HTML', async t => {
  const path = await graphFile(t);
  const first = await record(path, 'investigate', '  Worked it; the hypothesis was refuted.  ', { now: () => '2026-09-16T00:00:00.000Z' });
  assert.equal(first.outcomes, 1);
  assert.equal(first.htmlPath, path.replace(/json$/, 'html'));
  const after = JSON.parse(await readFile(path, 'utf8'));
  assert.deepEqual(after.outcomes, [{
    node: 'investigate', title: 'Investigate usefulness',
    at: '2026-09-16T00:00:00.000Z', outcome: 'Worked it; the hypothesis was refuted.',
  }]);
  assert.deepEqual(after.nodes, graph().nodes, 'the nodes themselves are untouched');
  assert.equal(after.objective, objective, 'the rest of the graph is preserved verbatim');

  const second = await record(path, 'investigate', 'And again later.', { now: () => '2026-09-17T00:00:00.000Z' });
  assert.equal(second.outcomes, 2, 'outcomes accumulate rather than replace');

  const html = await readFile(first.htmlPath, 'utf8');
  assert.match(html, /Recorded outcomes/);
  assert.match(html, /the hypothesis was refuted/);
  assert.match(html, /1 worked/);
});

test('record refuses an unknown node, an empty outcome, a missing graph and an invalid graph', async t => {
  const path = await graphFile(t);
  await assert.rejects(record(path, 'no-such-node', 'anything'), /No node "no-such-node"/);
  await assert.rejects(record(path, 'investigate', '   '), /An outcome is required/);
  await assert.rejects(record(join(path, 'missing.json'), 'investigate', 'x'), /Could not read a graph/);
  await assert.rejects(record(path.replace(/json$/, 'txt'), 'investigate', 'x'), /graph\.json/);

  const broken = await graphFile(t, { ...planned(), summary: '' });
  await assert.rejects(record(broken, 'investigate', 'x'), /research summary/);
  const unplanned = await graphFile(t, graph());
  await assert.rejects(record(unplanned, 'investigate', 'x'), /run provenance/);
  const unchanged = JSON.parse(await readFile(path, 'utf8'));
  assert.equal(unchanged.outcomes, undefined, 'a rejected recording leaves the graph alone');
});

test('validation accepts recorded outcomes and rejects malformed ones', () => {
  const entry = { node: 'investigate', title: 'Investigate usefulness', at: '2026-09-16T00:00:00.000Z', outcome: 'Refuted.' };
  assert.equal(validateGraph({ ...graph(), outcomes: [entry] }, objective).outcomes.length, 1);
  // An outcome for a node this graph no longer has is evidence, not an error: ids do not survive replanning.
  assert.equal(validateGraph({ ...graph(), outcomes: [{ ...entry, node: 'long-gone' }] }, objective).outcomes.length, 1);
  assert.equal(validateGraph({ ...graph(), outcomes: [] }, objective).outcomes.length, 0);
  for (const bad of [[{ ...entry, at: '' }], [{ ...entry, outcome: ' ' }], [{ at: 'now', outcome: 'x' }], 'outcome']) {
    assert.throws(() => validateGraph({ ...graph(), outcomes: bad }, objective), /Recorded outcomes/);
  }
});

test('an objective echoed without its trailing full stop is accepted, a different one is not', () => {
  // Two consecutive real runs lost a valid graph to a missing '.'.
  const drifted = { ...graph(), objective: `${objective}.` };
  assert.equal(validateGraph(drifted, objective).objective, objective, 'the asked objective wins');
  assert.equal(validateGraph({ ...graph(), objective: `  ${objective}  ` }, objective).objective, objective);
  assert.throws(() => validateGraph({ ...graph(), objective: 'Improve something else' }, objective), /original objective/);
  assert.throws(() => validateGraph({ ...graph(), objective: 'Improve the' }, objective), /original objective/);
  assert.throws(() => validateGraph({ ...graph(), objective: '' }, objective), /original objective/);
});

test('the planner is handed the recorded outcomes, and nothing else from the durable graph', async t => {
  const directory = await fixture(t);
  await mkdir(join(directory, 'graph'));
  const durable = planned();
  durable.outcomes = [{ node: 'investigate', title: 'Investigate usefulness', at: '2026-09-16T00:00:00.000Z', outcome: 'Worked and refuted.' }];
  await writeFile(join(directory, 'graph', 'graph.json'), JSON.stringify(durable, null, 2) + '\n');

  let sent;
  let calls = 0;
  const fetchImpl = async (url, options) => {
    if (++calls === 1) return catalog();
    const messages = JSON.parse(options.body).messages;
    if (calls === 2) {
      assert.equal(messages.length, 2, 'the graph is withheld until the repository is investigated');
      assert.equal(messages[1].content, objective);
      return toolAnswer();
    }
    sent = messages.at(-1);
    return answer(JSON.stringify(graph()));
  };
  await plan(objective, directory, { apiKey: 'test-only', fetchImpl });
  assert.equal(sent.role, 'user');
  assert.match(sent.content, /^Work already performed on this objective/);
  assert.match(sent.content, /- Investigate usefulness \(recorded 2026-09-16T00:00:00\.000Z\): Worked and refuted\./);
  assert.doesNotMatch(sent.content, /Find evidence of progress/, 'node reasons are not resent');
  assert.doesNotMatch(sent.content, /README\.md:1/, 'node evidence strings are not resent');
  assert.doesNotMatch(sent.content, /Demonstrate improvement/, 'nodes without outcomes are not resent');
  const written = JSON.parse(await readFile(join(directory, '.tag', 'graph.json'), 'utf8'));
  assert.equal(written.run.priorGraph, join(directory, 'graph', 'graph.json'));
});

test('a repository with no durable graph is planned exactly as before, and a corrupt one stops the run', async t => {
  const directory = await fixture(t);
  let prompt;
  let calls = 0;
  const fetchImpl = async (url, options) => {
    if (++calls === 1) return catalog();
    if (calls === 2) return toolAnswer();
    prompt = JSON.parse(options.body).messages[1].content;
    return answer(JSON.stringify(graph()));
  };
  await plan(objective, directory, { apiKey: 'test-only', fetchImpl });
  assert.equal(prompt, objective);
  assert.equal(JSON.parse(await readFile(join(directory, '.tag', 'graph.json'), 'utf8')).run.priorGraph, null);

  // A tracked graph nobody has recorded anything against carries no durable knowledge yet.
  const empty = await fixture(t);
  await mkdir(join(empty, 'graph'));
  await writeFile(join(empty, 'graph', 'graph.json'), JSON.stringify(planned(), null, 2) + '\n');
  let turns = 0;
  await plan(objective, empty, {
    apiKey: 'test-only',
    fetchImpl: async (url, options) => {
      if (++turns === 1) return catalog();
      const messages = JSON.parse(options.body).messages;
      if (turns === 2) return toolAnswer();
      assert.deepEqual(messages.map(item => item.role), ['system', 'user', 'assistant', 'tool']);
      return answer(JSON.stringify(graph()));
    },
  });

  const broken = await fixture(t);
  await mkdir(join(broken, 'graph'));
  await writeFile(join(broken, 'graph', 'graph.json'), '{"objective":"x"}');
  await assert.rejects(plan(objective, broken, { apiKey: 'test-only', fetchImpl }), /research summary/);
  await assert.rejects(readFile(join(broken, '.tag', 'graph.json')), { code: 'ENOENT' });
});

test('an answer rejected for skipping investigation is still preserved', async t => {
  // A real run answered from its supplied durable graph without reading anything, was
  // correctly rejected, and its answer vanished: the run cost money and taught nothing.
  const directory = await fixture(t);
  let calls = 0;
  await assert.rejects(plan(objective, directory, {
    apiKey: 'test-only',
    fetchImpl: async () => (++calls === 1 ? catalog() : answer(JSON.stringify(graph()))),
  }), /without reading repository evidence/);
  const failed = JSON.parse(await readFile(join(directory, '.tag', 'failed-run.json'), 'utf8'));
  assert.match(failed.failure, /without reading repository evidence/);
  assert.equal(JSON.parse(failed.run.answer).nodes.length, 2);
  assert.deepEqual(failed.run.investigation, []);
});

test('adopt replaces a durable graph and carries every recorded outcome across', async t => {
  const durablePath = await graphFile(t);
  await record(durablePath, 'investigate', 'Worked and refuted.', { now: () => '2026-09-16T00:00:00.000Z' });
  await record(durablePath, 'demonstrate', 'Still open.', { now: () => '2026-09-17T00:00:00.000Z' });

  // A replanned graph shares no node ids with the old one, which is why outcomes live on the graph.
  const replanned = { ...planned(), summary: 'A later run learned more.', nodes: [
    { id: 'something-else', title: 'Do something else', reason: 'Later evidence.', evidence: ['src/plan.js:1 — later'], dependsOn: [] },
  ] };
  const result = await adopt(await graphFile(t, replanned), durablePath);
  assert.deepEqual(result, { htmlPath: durablePath.replace(/json$/, 'html'), nodes: 1, carried: 2, retired: 2 });

  const after = JSON.parse(await readFile(durablePath, 'utf8'));
  assert.deepEqual(after.nodes.map(node => node.id), ['something-else']);
  // A durable graph too large for one read_file call cannot be read by the planner it informs.
  assert.deepEqual(after.run.investigation, [], 'the transcript stays with the archived run');
  assert.match(after.run.transcript, /graph\.json$/);
  assert.equal(after.summary, 'A later run learned more.');
  assert.deepEqual(after.outcomes.map(item => item.outcome), ['Worked and refuted.', 'Still open.']);

  const html = await readFile(result.htmlPath, 'utf8');
  assert.match(html, /no longer contains/, 'outcomes outlive the nodes that proposed them');
  assert.match(html, /Worked and refuted\./);
});

test('adopt refuses a different objective, a bad path and an invalid graph, and changes nothing', async t => {
  const durablePath = await graphFile(t);
  await record(durablePath, 'investigate', 'Worked and refuted.', { now: () => '2026-09-16T00:00:00.000Z' });
  const before = await readFile(durablePath, 'utf8');

  const elsewhere = await graphFile(t, { ...planned(), objective: 'A different objective' });
  await assert.rejects(adopt(elsewhere, durablePath), /different objective/);
  await assert.rejects(adopt(await graphFile(t, { ...planned(), summary: '' }), durablePath), /research summary/);
  await assert.rejects(adopt(join(durablePath, 'missing.json'), durablePath), /Could not read a graph/);
  await assert.rejects(adopt(durablePath, durablePath.replace(/json$/, 'txt')), /graph\.json/);
  assert.equal(await readFile(durablePath, 'utf8'), before, 'a refused adoption leaves the durable graph alone');
});

test('adopt into a repository with no durable graph yet just writes one', async t => {
  const source = await graphFile(t);
  const target = join(source, '..', 'fresh.json');
  const result = await adopt(source, target);
  assert.deepEqual(result, { htmlPath: join(source, '..', 'fresh.html'), nodes: 2, carried: 0, retired: 0 });
  assert.equal(JSON.parse(await readFile(target, 'utf8')).outcomes, undefined);
});

const investigated = (path, result) => ({ tool: 'read_file', arguments: { path }, result });

test('observe reports what a run did and which evidence names files it never read', async t => {
  const run = {
    ...planned(),
    nodes: [
      { id: 'a', title: 'A', reason: 'r', evidence: ['src/plan.js:1 — read it'], dependsOn: [] },
      { id: 'b', title: 'B', reason: 'r', evidence: ['examples/old.json — never opened', 'README.md:2 — read it'], dependsOn: [] },
    ],
  };
  run.run.priorGraph = 'graph/graph.json';
  run.run.investigation = [
    { tool: 'list_files', arguments: {}, result: '{"files":[]}' },
    investigated('README.md', '1: hello\n[Lines 1-1 of 1. End of README.md; the whole file from line 1 has been shown.]'),
    investigated('src/plan.js', '1: code\n[PARTIAL READ: lines 1-1 of 9. The remaining 8 lines of src/plan.js have NOT been shown.]'),
    investigated('secrets', 'Tool unavailable or invalid arguments.'),
  ];
  const report = await observe(await graphFile(t, run));
  assert.equal(report.outcome, 'graph');
  assert.deepEqual(report.calls, { list_files: 1, read_file: 3 });
  assert.deepEqual(report.unusedTools, ['search', 'history']);
  assert.deepEqual(report.filesRead, { 'README.md': 'complete', 'src/plan.js': 'partial' });
  assert.deepEqual(report.evidenceCitingUnreadFiles, [{ node: 'b', evidence: 'examples/old.json — never opened' }]);
  assert.equal(report.priorGraph, 'graph/graph.json');
  const text = describe(report);
  assert.match(text, /Produced a graph of 2 nodes/);
  assert.match(text, /never called: search, history/);
  assert.match(text, /examples\/old\.json/);
});

test('observe reads a failed run, and a file that is neither is refused', async t => {
  const failed = {
    objective, failure: 'Invalid planner graph.',
    run: { model: 'test-model', requests: 2, costUsd: 0.001, answer: '{}', investigation: [
      investigated('README.md', '1: hello\n[Lines 1-1 of 1. End of README.md; the whole file from line 1 has been shown.]'),
    ] },
  };
  const report = await observe(await graphFile(t, failed));
  assert.equal(report.outcome, 'failed');
  assert.equal(report.answerPreserved, true);
  assert.equal(report.evidenceCitingUnreadFiles.length, 0);
  assert.match(describe(report), /Produced no graph\. Failure: Invalid planner graph\. Answer preserved: yes/);

  await assert.rejects(observe(await graphFile(t, { anything: true })), /not a graph or a failed run/);
  await assert.rejects(observe('no-such-run.json'), /Could not read a run/);
});

test('a file containing the words of a partial-read notice is still reported as read whole', async t => {
  // src/repository.js builds that notice, so every run that read it looked like a partial read.
  const run = { ...planned(), run: { ...planned().run, investigation: [
    investigated('src/repository.js', '1: `[PARTIAL READ: lines ${start}`\n[Lines 1-1 of 1. End of src/repository.js; the whole file from line 1 has been shown.]'),
  ] } };
  assert.deepEqual((await observe(await graphFile(t, run))).filesRead, { 'src/repository.js': 'complete' });
});

test('a graph citing a file the run never read is rejected and preserved', async t => {
  const directory = await fixture(t);
  const invented = { ...graph(), nodes: [
    { id: 'real', title: 'Grounded', reason: 'r', evidence: ['README.md:1 — actually read'], dependsOn: [] },
    { id: 'made-up', title: 'Ungrounded', reason: 'r', evidence: ['examples/never-existed.json — invented'], dependsOn: [] },
  ] };
  let calls = 0;
  await assert.rejects(plan(objective, directory, {
    apiKey: 'test-only',
    fetchImpl: async () => (++calls === 1 ? catalog() : calls === 2 ? toolAnswer() : answer(JSON.stringify(invented))),
  }), /cites 1 file\(s\) this run never read[\s\S]*made-up: examples\/never-existed\.json/);
  const failed = JSON.parse(await readFile(join(directory, '.tag', 'failed-run.json'), 'utf8'));
  assert.match(failed.failure, /never read/);
  assert.ok(failed.run.answer.includes('never-existed'), 'the rejected answer is kept');
  await assert.rejects(readFile(join(directory, '.tag', 'graph.json')), { code: 'ENOENT' });
});

test('a graph citing only files the run read is accepted', async t => {
  const directory = await fixture(t);
  const grounded = { ...graph(), nodes: [
    { id: 'real', title: 'Grounded', reason: 'r', evidence: ['README.md:1 — actually read', 'README.md — no line number'], dependsOn: [] },
  ] };
  let calls = 0;
  await plan(objective, directory, {
    apiKey: 'test-only',
    fetchImpl: async () => (++calls === 1 ? catalog() : calls === 2 ? toolAnswer() : answer(JSON.stringify(grounded))),
  });
  assert.equal(JSON.parse(await readFile(join(directory, '.tag', 'graph.json'), 'utf8')).nodes.length, 1);
});
