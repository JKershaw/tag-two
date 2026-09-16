# Design

tag-two 0.1.0 is one idea with a short list of consequences. This file states the idea, then names
the failure that earned each consequence. Nothing here was decided in advance; the evidence is in
[`docs/experiments.md`](docs/experiments.md) and [`docs/notes/steward-log.md`](docs/notes/steward-log.md),
and the five episodes are in [`tasks/`](tasks/).

## The idea

**Worker handoffs may be stateless. Durable project understanding cannot be.**

An agent's context ends when its conversation ends. A task usually does not. So the task's
understanding of itself — what was asked, what would count as done, what has been established and by
what evidence, what a human decided — lives in a file, not in a conversation. Any agent, model or
person can be handed that file, contribute one bounded operation, and stop.

That much was the hypothesis for the whole project. What 0.1.0 adds is the part that was measured:
the unit that works is **one authorised task**, not an objective.

## Why a task and not an objective

The project began as a planner: give a model an objective and a repository, get back a small task
graph. Eighty-eight recorded runs later, that is the part that did not work.

- Handed a graph's own recorded outcomes, the planner reproposed work those outcomes report as
  already done — in three consecutive runs. Across eleven archived runs, 24 of 47 proposed tasks
  were work the record already answered.
- A real human observation ("this keeps proposing work we've already done") was stored, supplied to
  the planner, and made the next graph *worse* on exactly the thing it named: four of six proposed
  tasks were already-answered work, against one of five in a pre-registered control that was never
  told.
- A narrower objective did not fix it. An objective's relationship to the code mattered; its width
  did not.
- An explicit epistemic-state-and-next-operation primitive, replayed against six moments in this
  repository's own history, did not out-decide the shipped planner, and its one apparent success
  was a paraphrase of a paragraph in its own input.

Meanwhile the thing nobody had tried worked on the first attempt: hand the system one task somebody
had already decided was worth doing, and let it keep the episode. Five episodes, two of them real
tickets in another repository carried entirely by stateless model decisions, all five closed on
evidence.

So 0.1.0 is the task runner. Deciding what is worth doing is left to whatever already owns it.

## The consequences, and what earned each

**Intent is kept in the words it arrived in.** A human sentence had exactly one durable home —
`tag record` — which demands a node id and files what it is given as work already performed. One
observation pushed through it left the rendering reporting "0 ready · 3 worked" for work nobody had
done, and handed the next run an unverified claim labelled as an established result. `intent` stores
`{at, from, kind, text}` and interprets nothing. `kind` is whatever its author called it.

**An operation is what somebody did, not a taxonomy.** When the first bounded operation produced a
result there was nowhere to put it: `record` refused the task outright, leaving `intent`, which
would have filed a machine's unverified finding as human direction. `op` records who, what bounded
question, what they reported, and what evidence. An operation with no evidence is rendered as *a
claim, not an established result*, because that is what it is.

**Only a machine's exit status establishes anything.** `op` accepted
`npm test: 9999 passing, 0 failing, exit 0` for a command that was never run. `verify` runs the
command and records what came back. A close may cite nothing else.

**A close is checked, not trusted.** Citations are looked up: the operation must exist, must have
really run a command, and must have exited zero. Six recorded operations across the five episodes
are failures — two shell bugs, a mis-specified control, a mutation that disabled the wrong half of
an `||` — and none of them could be talked into being a success.

**A refused close is recorded.** The first refusals happened only in a terminal. A stateless runner,
reading durable state alone, proposed the identical close again, and would have forever. A refusal
is now an operation carrying the attempted statement and its citations; the very next decision cited
only the verifications. This is the clearest evidence in the project that durable state changes
behaviour rather than merely surviving.

**Returning control is an operation, not an exception.** Across the entire previous trial tag-two
never once said that something needed a human, including when its own durable graph was exhausted.
`ask` records the decision, why a machine cannot settle it, the evidence it rests on, at least two
real options, and what continues after the answer, and exits 2 so a caller can tell "a human is
needed" from "this failed".

**An answer is stored as said.** The first real answer was *"I don't understand the implementation
consequences well enough to choose, give me your recommendation"* — a delegation, not a ruling. A
mechanism that recorded answers as decisions would have filed a statement about the human's own
uncertainty as a ruling on the merits.

**`show` is the product.** The durable file is JSON; the thing a human or a fresh agent reads is
text. When a verification's command was a 25-line heredoc rendered inline, a stateless reader looked
for what had been verified, found a wall of Python, concluded nothing had been, and re-ran a passing
check. Multi-line questions and results are indented under their labels, and whether an operation
really ran a command is stated on the operation's own line, because that fact decides whether a
close may cite it.

## What a human still does, and why it is not scaffolding

Human intervention was treated for most of this project as something to remove. It is now treated as
a legitimate source of state. What stays with a person:

- choosing what is worth doing;
- **writing the completion condition** — demonstrably the highest-leverage thing a human does here.
  One episode's condition was written around membership and order; the runner satisfied it exactly,
  including two documentation entries whose prose it invented. The check passed because the check
  was about the list. *A completion condition is a specification of what will not be checked.*
- judging whether a change is fit to propose;
- answering when asked.

## Deliberately absent

No planning, orchestration, model routing, sandboxing, scheduling, concurrency, retries, JSON
repair, prioritisation, plugin system, provider abstraction or task-provider integration. The
project's own history is the argument: several earlier experiments became dominated by debugging
orchestration machinery built before the central loop was shown to be useful.

The one rule that produced this file: **before adding infrastructure, name what happened in a real
run that requires it.** If there is no concrete answer, it is not built yet.
