// Experimental harness. NOT part of tag-two's src/ — it measures whether durable TAG state plus a
// repeated stateless decision can carry a task forward. It is instrumentation, like the stateless
// continuation harness of the previous trial, and it is deliberately not a capability tag-two has.
//
// Two commands, on purpose:
//   decide   — one fresh model call, sees ONLY `tag task show` + the substrate's capabilities.
//              Writes pending.json. Executes nothing.
//   execute  — runs the pending decision through a mechanical safety gate and records the real
//              result into the TAG task.
// The split exists so a human can read a chosen command before it runs without being able to
// change it. Refusing one is a recorded steward intervention, not a silent substitution.
import { readFile, writeFile, appendFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { resolve, dirname } from 'node:path';

const exec = promisify(execFile);
const HERE = dirname(new URL(import.meta.url).pathname);
const PENDING = resolve(HERE, process.env.RUNNER_PENDING ?? 'pending.json');
const LEDGER = resolve(HERE, 'cost-ledger.jsonl');
const WORKDIR = process.env.RUNNER_WORKDIR ?? '/home/user/jkershaw/linearviewer';
const TAG = '/home/user/tag-two/bin/tag.js';
const MODEL = process.env.RUNNER_MODEL ?? 'deepseek/deepseek-chat-v3-0324';

const CAPABILITIES = `The substrate that carries out your choice can do exactly these things:

  shell     Run ONE shell command, non-interactively, with the working directory set to
            ${WORKDIR} — a private, disposable clone of the repository this task concerns.
            Its exit status, stdout and stderr are captured verbatim and recorded as evidence.
            Reads, searches, diffs and local file edits are all just shell commands.
            It is a real shell: it can read files, search them, run the repository's own
            tooling, and write files in that directory.
  verify    Run ONE shell command in ${WORKDIR} AS THE TASK'S VERIFICATION. Identical
            execution to 'shell', but it is recorded through the task runtime's own
            verification path, which stamps the real exit status onto the operation and is
            the only kind of operation a close is allowed to cite. Use this when the command
            you are running is the check that decides whether the completion condition holds.
            If no such check exists in the repository yet, writing one is an ordinary 'shell'
            operation; running it is a 'verify' operation.
  ask-human Stop and put a decision to the human who authorised this task.
  close     Declare the task complete, citing operations that really ran and really passed.
  stop      Say that no further operation is justified, and why.

Refused by the substrate, without exception: anything that deletes recursively, anything
run as another user, any network write (POST/PUT/PATCH/DELETE), any git push or remote
mutation, and anything outside ${WORKDIR}.`;

const SYSTEM = `You are the next-operation decider for a task runner.

You are stateless. You have no memory of anything before this message. Everything you are
allowed to rely on is in the task state below, which is durable and was written by earlier
operations — some of them yours, though you cannot remember performing them.

Your entire job is to choose EXACTLY ONE bounded next operation.

Not a plan. Not a decomposition. Not a list of steps. One operation, which the substrate
will carry out, whose result will be recorded, after which this conversation is destroyed
and a fresh decider reads the updated state.

Rules you must follow:
- Justify the operation from what the durable state ALREADY says. Quote or name the part
  of the state that makes it the right next move.
- Do not repeat an investigation whose answer is already recorded as evidence. If the state
  already contains the fact, use it.
- Respect the recorded intent and constraints, and never decide anything listed as reserved
  for the human.
- Distinguish what has been executed from what has merely been claimed. An operation with
  no evidence is a claim. A claim recorded months ago on an external issue is not a
  measurement of the repository as it is now.
- Prefer the smallest operation that produces new evidence.
- Only close when the task's stated completion condition has actually been met by evidence
  in the state, on that condition's own terms.

${CAPABILITIES}

Reply with ONE JSON object and nothing else. No markdown fence, no prose around it.

{
  "operation": "your own short name for this operation, two or three words",
  "question": "the bounded question this operation answers",
  "justification": "why this operation is the justified next one, referring to what the durable state already establishes",
  "kind": "shell" | "verify" | "ask-human" | "close" | "stop",
  "command": "the single shell command, when kind is shell or verify",
  "ask": { "decision": "...", "why": "why a machine cannot settle it", "continues": "what continues once it is answered", "options": ["at least two real options"], "cited": "comma-separated operation numbers this rests on" },
  "close": { "statement": "how the cited evidence establishes completion", "cited": "comma-separated operation numbers, each of which really ran a command and really exited 0" },
  "stop": { "reason": "why no further operation is justified" }
}

Include only the sub-object matching your chosen kind.`;

async function taskState(taskPath) {
  const { stdout } = await exec('node', [TAG, 'task', 'show', taskPath]);
  return stdout;
}

async function callModel(messages) {
  const body = {
    model: MODEL,
    messages,
    temperature: 0,
    max_tokens: 3000,
    usage: { include: true },
  };
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(180_000),
  });
  if (!response.ok) throw new Error(`OpenRouter HTTP ${response.status}: ${(await response.text()).slice(0, 400)}`);
  const json = await response.json();
  const usage = json.usage ?? {};
  await appendFile(LEDGER, JSON.stringify({
    at: new Date().toISOString(), model: json.model ?? MODEL, purpose: messages.__purpose ?? undefined,
    prompt_tokens: usage.prompt_tokens, completion_tokens: usage.completion_tokens, cost: usage.cost,
  }) + '\n');
  return { text: json.choices?.[0]?.message?.content ?? '', usage, model: json.model ?? MODEL };
}

function parseDecision(text) {
  const trimmed = text.trim().replace(/^```(?:json)?/, '').replace(/```$/, '').trim();
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start < 0 || end < start) throw new Error(`No JSON object in the decider's reply:\n${text.slice(0, 600)}`);
  return JSON.parse(trimmed.slice(start, end + 1));
}

// A mechanical gate, not a sandbox. The previous trial established that tag-two's command
// execution is not sandboxed; this refuses the shapes the brief rules out so a bad decision
// is recorded as refused rather than run.
const FORBIDDEN = [
  [/\brm\s+(-[a-zA-Z]*[rf]|--recursive|--force)/, 'a recursive or forced delete'],
  [/\bsudo\b|\bsu\s/, 'running as another user'],
  [/\bgit\s+(push|remote\s+(add|set-url)|fetch\s+.*--unshallow)/, 'a git remote mutation or push'],
  [/curl[^\n]*\s-X\s*(POST|PUT|PATCH|DELETE)/i, 'a network write'],
  [/\b(mkfs|dd\s+if=|shutdown|reboot|halt|chown\s+-R\s+\/|chmod\s+-R\s+777\s+\/)/, 'a destructive system command'],
  [/>\s*\/(?!home\/user\/jkershaw\/linearviewer|tmp\/)/, 'a write outside the working copy'],
  [/\bnpm\s+(publish|version)|\bgh\s+pr\s+create|\bgit\s+tag\s+-/, 'a publishing or release action'],
  [/OPENROUTER_API_KEY|\.env\b|~\/\.ssh|id_rsa|\.netrc|\.git-credentials/, 'reading a secret it has no need for'],
];
function gate(command) {
  for (const [pattern, why] of FORBIDDEN) if (pattern.test(command)) return why;
  return null;
}

const tail = (text, lines = 120, chars = 6000) => {
  const cut = text.trimEnd().split('\n').slice(-lines).join('\n');
  return cut.length > chars ? `…(truncated)…\n${cut.slice(-chars)}` : cut;
};

async function decide(taskPath) {
  const state = await taskState(taskPath);
  const messages = [
    { role: 'system', content: SYSTEM },
    { role: 'user', content: `Durable task state:\n\n${state}\n\nChoose exactly one bounded next operation.` },
  ];
  const { text, usage, model } = await callModel(messages);
  const decision = parseDecision(text);
  decision.__meta = { model, at: new Date().toISOString(), usage, taskPath, promptChars: state.length };
  await writeFile(PENDING, JSON.stringify(decision, null, 2) + '\n');
  console.log(JSON.stringify(decision, null, 2));
}

async function execute(taskPath) {
  const decision = JSON.parse(await readFile(PENDING, 'utf8'));
  const by = `runner/${decision.__meta.model}`;
  const run = (...args) => exec('node', [TAG, ...args], { maxBuffer: 8 * 1024 * 1024 });

  if (decision.kind === 'verify') {
    const refusal = gate(decision.command);
    if (refusal) { console.log(`REFUSED: ${refusal}`); return; }
    const { stdout, stderr } = await exec('node', [TAG, 'task', 'verify', taskPath, decision.command],
      { cwd: WORKDIR, maxBuffer: 8 * 1024 * 1024 }).catch(e => ({ stdout: e.stdout ?? '', stderr: e.stderr ?? e.message }));
    console.log(stdout || stderr);
    return;
  }
  if (decision.kind === 'shell') {
    const refusal = gate(decision.command);
    if (refusal) {
      await run('task', 'op', taskPath, by, decision.operation, decision.question,
        `The substrate refused to run this command: it is ${refusal}. Nothing was executed and nothing changed.`,
        `$ ${decision.command}`, `refused by the safety gate: ${refusal}`);
      console.log(`REFUSED: ${refusal}`);
      return;
    }
    let stdout = '', stderr = '', code = 0;
    try {
      ({ stdout, stderr } = await exec('sh', ['-c', decision.command], { cwd: WORKDIR, maxBuffer: 8 * 1024 * 1024, timeout: 600_000 }));
    } catch (error) {
      if (typeof error.code !== 'number') { console.error(`Could not run it: ${error.message}`); process.exitCode = 1; return; }
      ({ stdout = '', stderr = '' } = error); code = error.code;
    }
    // What the operation REPORTS is a fresh model's reading of bytes that really came back; what it
    // records as EVIDENCE is those bytes. The two are kept apart on purpose, because the previous
    // trial's sharpest failure was an operation result that was nobody's measurement.
    const reading = await callModel([
      { role: 'system', content: 'You are given a shell command that really ran and the output it really produced. In at most three sentences, state plainly what this establishes about the repository. State only what the output shows. Do not recommend a next step. Do not speculate beyond the bytes. If the output establishes nothing, say so. An empty stdout establishes only that the command printed nothing: it never establishes that the thing being searched for is absent, empty, or missing, because a pattern that did not match and a target that does not exist produce the same silence. In a pipeline the exit status is the LAST command\u2019s, so a zero exit says nothing about whether an earlier grep matched.' },
      { role: 'user', content: `Bounded question the command was run to answer: ${decision.question}\n\n$ ${decision.command}\nexit status ${code}\n\nstdout:\n${stdout.trim() ? tail(stdout) : '(nothing)'}\n\nstderr:\n${stderr.trim() ? tail(stderr, 40, 2000) : '(nothing)'}` },
    ]);
    await run('task', 'op', taskPath, by, decision.operation, decision.question, reading.text.trim(),
      `$ ${decision.command}`, `exit status ${code}`,
      `stdout:\n${stdout.trim() ? tail(stdout) : '(the command printed nothing on stdout)'}`,
      `stderr:\n${stderr.trim() ? tail(stderr, 40, 2000) : '(the command printed nothing on stderr)'}`);
    console.log(`ran (exit ${code}); reading: ${reading.text.trim()}`);
  } else if (decision.kind === 'ask-human') {
    const a = decision.ask;
    const { stdout } = await run('task', 'ask', taskPath, a.cited, a.decision, a.why, a.continues, ...a.options)
      .catch(error => ({ stdout: error.stdout ?? error.message }));
    console.log(stdout);
  } else if (decision.kind === 'close') {
    const c = decision.close;
    const { stdout } = await run('task', 'close', taskPath, c.statement, ...String(c.cited).split(',').map(s => s.trim()).filter(Boolean))
      .catch(error => ({ stdout: (error.stdout ?? '') + (error.stderr ?? '') }));
    console.log(stdout);
  } else if (decision.kind === 'stop') {
    await run('task', 'op', taskPath, by, decision.operation, decision.question,
      `The runner declared that no further operation is justified: ${decision.stop?.reason ?? decision.justification}`);
    console.log('stopped');
  } else {
    throw new Error(`Unknown kind ${decision.kind}`);
  }
}

const [command, taskPath] = process.argv.slice(2);
if (command === 'decide') await decide(resolve(taskPath));
else if (command === 'execute') await execute(resolve(taskPath));
else { console.error('Usage: runner.mjs decide|execute <task.json>'); process.exitCode = 1; }
