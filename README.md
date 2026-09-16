# TAG

**A durable record of one authorised task: what was asked, what would count as done, what was
established, and by what evidence.**

A control plane, or a human, decides that a task is worth doing. An agent — or several agents, or a
person, or all of them in turn — does the work. TAG is the file in between: it holds the episode
so that whoever picks it up next, including a model with no memory of anything before this message,
can read what has already been established and what has not.

The command is `tag`. The repository and package are `tag-two`, the name of the experiment TAG grew
out of; every piece of evidence below is filed under it, so it stays.

This is version 0.1.0 and it is small on purpose. It proposes no work, ranks nothing, schedules
nothing, routes no models, runs nothing concurrently, and chooses no operation. Everything it does
is a consequence of something that went wrong in a real run; the trail is in
[`docs/experiments.md`](docs/experiments.md).

**Needing a human is not a failure, and TAG says so where a caller can act on it.** `tag task ask`
exits **2** — not 0, and not the 1 that means something went wrong. A task that has reached a real
judgement boundary is in a third state, and the exit status is the only place a script can tell the
difference.

## Requirements

Node.js 22 or newer. No dependencies, no build step, no network, no API key — the task runner never
calls a model. (The experimental planner below does, and is the only part that does.)

```sh
git clone https://github.com/JKershaw/tag-two.git
cd tag-two
npm test          # the whole suite: offline, no API key, no network
npm run example   # one complete task episode, start to finish, at zero cost
```

## Five minutes

`npm run example` runs [`examples/zero-cost-episode/run.sh`](examples/zero-cost-episode/run.sh),
which carries a real (tiny) task from "here is what was asked" to "here is the evidence it is done"
in a throwaway work directory. Its subject is a shell script that claims to add and actually
subtracts. Read the script; it is the fastest way to understand the whole interface.

The shape of an episode, which is also the whole workflow (`npm link` in this checkout gets you
`tag`; otherwise it is `node /path/to/tag-two/bin/tag.js`):

```sh
tag task open   task.json fix-the-sum "sum.sh must report 2 + 3 as 5." \
                "sh check.sh, run by tag verify, exits 0." "Whether check.sh is the right check is reserved."
tag task intent task.json control-plane constraint "Change the script, not the check."
tag task op     task.json agent investigate "What does sum.sh compute?" "It subtracts." "sum.sh line 2"
tag task verify task.json "sh check.sh"          # exits 1; the failure is now in the record
tag task op     task.json agent edit "Make it add." "Line 2 now adds." "the diff"
tag task verify task.json "sh check.sh"          # exits 0
tag task close  task.json "The check passes against the changed script." 4
tag task show   task.json                        # the whole episode, in text
```

When a decision turns out not to be a machine's to make:

```sh
tag task ask    task.json 4 "the decision required" "why a machine cannot settle it" \
                "what continues after the answer" "one option" "another option"   # exits 2
tag task answer task.json john "what they actually said"
```

## The interface

Everything is `tag task <command> <task.json> …`. The state is one JSON file; `tag task show`
renders it as text, and that text is what a fresh agent is handed.

| command | what it does |
|---|---|
| `open` | records the task as supplied: id, statement, what would count as **verified** completion, and the decisions reserved for the human. Refuses to overwrite an existing task file. |
| `intent` | keeps something said from outside — a constraint, hypothesis, observation — in the words it arrived in, with the kind its author gave it. Nothing interprets it. |
| `op` | records a bounded operation somebody performed: who, what question, what they reported, what evidence. An operation with no evidence is shown as *a claim, not an established result*. |
| `verify` | runs the command and records the exit status the machine returned. The only command here that establishes anything. |
| `ask` | returns control to a human: the decision, why a machine cannot settle it, the evidence it rests on, at least two real options, and what continues after the answer. |
| `answer` | keeps the human's reply on the question it answers, without interpreting it, and puts control back with the runner. |
| `close` | completes the task, citing verifications. The citations are looked up, not trusted. |
| `show` | prints the whole episode in text. |

Exit status: **0** succeeded · **1** failed, including a verification whose command failed · **2**
control was returned to a human by `tag task ask`. `tag --help` has the long form; `tag --version`
prints the version.

`verify` executes arbitrary shell in the environment that invoked it, with the calling process's
working directory and permissions. There is no sandbox, allowlist or dry run, and there is not meant
to be one at 0.1: this is a local developer tool, and that is part of its contract. It records the
exit status the command returned, and the last 12 lines of its output — not the whole of it.

### The three refusals

Each of these exists because an episode got past its absence, and together they are what stops an
episode being talked to a finish:

1. **A close must cite verifications.** `close` refuses a close that cites nothing, cites an
   operation that ran no command, or cites one that failed. `op` will write down whatever it is
   told — handed `npm test: 9999 passing, 0 failing, exit 0` for a command that was never run, it
   recorded it without complaint — so only the exit status a machine returned can end an episode.
2. **A refused close is itself recorded.** An earlier refusal happened only in the steward's
   terminal; the next stateless decision, reading durable state alone, proposed the identical close
   again and would have forever. A refusal is now an operation with the attempted statement and its
   citations. The next decision cited only the verifications.
3. **A task waiting on a human is not closed behind its back**, and cannot be asked a second
   question until the first is answered.

There are smaller checks too — a task file is never overwritten, a question needs at least two real
options, a command that could not be started at all records nothing — but nothing interprets
content. `kind`, `by` and `operation` are the author's own words, not a taxonomy.

## What it does not do

It does not decide what is worth doing, decompose an objective, choose the next operation, rank or
schedule anything, route models, run anything concurrently, sandbox anything, retry anything, or
investigate a repository. Every one of the 51 operations in the five archived episodes was chosen by
a human or by an experimental harness outside `src/`
([`examples/harbour-runner/`](examples/harbour-runner/)), never by TAG.

Full list, with what is known and unknown about each: [`LIMITATIONS.md`](LIMITATIONS.md).

## Why it is shaped like this

Every primitive above is named after the failure that earned it, and the failures are real runs, not
design review. The short version is in [`DESIGN.md`](DESIGN.md); the evidence is in
[`docs/experiments.md`](docs/experiments.md).

Five episodes have been carried end to end this way: 51 recorded operations, 25 of them commands run
by `tag verify`, 6 of which failed and are still in the record, and one judgement returned to a
human. Two of the five were real tickets in another repository, carried by repeated stateless model
decisions that were given nothing but the episode state and a shell. Handed only a finished
episode's `tag task show` output, a stateless model call said correctly what was asked, what was
established and by what evidence, which operations failed, what the human was asked and said, and
where control sat. That was measured on three finished episodes, at $0.00327 for all three.

The episodes themselves are in [`tasks/`](tasks/), unedited, including the failures.

## The experimental planner

`tag plan`, `record`, `input`, `adopt`, `check` and `observe` are the research line the task runner
came out of: an attempt to turn a broad objective into a useful task graph. They still work, they
are still tested, and they are **not** the 0.1 interface. Eighty-eight recorded runs across four
trials are written up in [`docs/experiments.md`](docs/experiments.md), including the ones that
refuted the idea: handed its own recorded outcomes, the planner reproposed work those outcomes
report as already done in three consecutive runs, and across eleven archived runs 24 of 47 proposed
tasks were work the record already answers.

They are kept because deleting them would delete the evidence the task runner was derived from. If
you only want the task runner, you can ignore this section entirely.

```sh
OPENROUTER_API_KEY=… tag plan "Make tag-two better at achieving its purpose."
```

`plan` uses one OpenRouter model, `deepseek/deepseek-chat-v3-0324`, with read-only tools to
list/read/search tracked text files and inspect recent commit subjects. `read_file` returns a whole
file in one call, bounded at 40,000 characters; anything longer reports the line to resume from. It
writes `.tag/graph.json` and `.tag/graph.html` and then stops. Nothing runs afterwards: "ready"
means a node has no unmet graph dependencies, and a human decides what happens next.

**Data boundary.** The objective and model-requested repository content are sent to OpenRouter and
its model provider. Use only repositories you are authorised to share. Untracked files, common
credential paths, symlinks, binary files and files larger than 256 KiB are excluded; these filters
are not a secret detector. Review tracked content for embedded secrets before planning.

**Cost bounds.** A run allows at most eight model requests, 4,096 output tokens per request and
160,000 serialized request bytes. It refuses to start if the model is priced above
$0.50/million input tokens or above $1.50/million output tokens, or charges a per-request fee.
Counting even every request byte as an input token, the worst case stays under $1 —
roughly $0.69 before small protocol overhead. Observed runs cost well under a cent.
`test/documented-limits.test.js` compares every one of those numbers with the constant in the
source, so this paragraph cannot drift from the code without a test failing.

Unavailable models, higher prices, network errors, exhausted limits or invalid graphs stop the run
without retries, JSON repair or fabricated tasks. A run that fails after investigating anything
writes `.tag/failed-run.json` with its transcript so the failure can be diagnosed.

## Layout

```
bin/tag.js     the CLI
src/task.js    the task runner — the 0.1 interface
src/*.js       the experimental planner and graph commands
test/          the test suite, offline throughout
tasks/         the five real episodes, unedited, including their failures
graph/         this repository's own durable graph, from the planner line
examples/      the runnable example, plus every archived experiment run
docs/          the experiment log, the steward's notes, background research
```

Detail lives in [`DESIGN.md`](DESIGN.md), [`LIMITATIONS.md`](LIMITATIONS.md),
[`CHANGELOG.md`](CHANGELOG.md) and [`docs/experiments.md`](docs/experiments.md).

## Licence

MIT. See [`LICENSE`](LICENSE).
