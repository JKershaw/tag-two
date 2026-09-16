# Known limitations

What tag-two 0.1.0 does not do, what has not been shown, and where the evidence is thin. Everything
here is either observed or explicitly untested; nothing is a plan.

## It does no work and chooses no work

- **It chooses no operation.** All 51 recorded operations across the five archived episodes were
  chosen by a human or by an experimental harness outside `src/`
  ([`examples/harbour-runner/`](examples/harbour-runner/)). tag-two holds state, runs what it is
  told, and refuses bad closes.
- **It investigates nothing.** There is no operation that reads a repository, searches it, or forms
  a finding. Whether that division of labour is right or merely the one that was easy is not
  established.
- **It decides nothing about priority.** No ranking, no scheduling, no queue, no notion of which of
  two open tasks matters more.
- **One task per file, one file at a time.** No concurrency, no locking. Two processes writing the
  same task file will lose writes.

## What the record can and cannot promise

- **A verified quote is not a verified argument.** `close` establishes that the cited operations
  exist, really ran and really exited zero. Whether they are the *right* checks for this completion
  condition is a human reading, and nothing here checks it.
- **A completion condition written narrowly will be satisfied narrowly.** In one episode the runner
  met the condition exactly and invented prose for two documentation entries along the way; nothing
  mechanical caught it and the runner never mentioned it. It was found by a human reading the diff.
- **`op` records claims as given.** Only `verify` establishes anything. An operation with no
  evidence is *shown* as a claim, but it is still stored.
- **Nothing validates `kind`, `by` or `operation`.** They are the author's words on purpose.
- **`verify` runs whatever it is handed**, with the working directory and permissions of the calling
  process, a 10-minute timeout and a 4 MiB output buffer. There is no sandbox, no allowlist and no
  dry run. This is deliberate at 0.1 — sandboxing would be a substantial new capability with no
  experiment behind its design — and it means TAG executes arbitrary shell in the caller's
  environment.
- **TAG records the command's actual exit status, but does not preserve the complete command
  output.** Only the last 12 lines of stdout and stderr are kept. "Durable evidence" therefore means
  *this command ran and exited N*, which is the machine's own answer and is complete; it does not
  mean *here is everything the command printed*. A failure whose cause is further up its output is
  not in the record, and nothing detects that it was cut.
- **Timestamps come from the machine that ran the command.** There is no clock authority, and
  nothing detects a task file edited by hand.

## What has not been shown

- **That a control plane can choose a task it does not already understand.** All five episodes were
  chosen by a steward who knew the repositories. Two were made possible by defects that steward had
  already noticed while reading the source.
- **That it asks at the right moments.** It asked once, in five episodes, and that once was a real
  boundary. It also escalated once with no question attached at all, and in two episodes never
  reached the reserved decisions because the completion conditions were satisfiable without them. It
  does not ask on its own initiative; it answers the condition it was given.
- **That the record prevents repetition in general.** It demonstrably stopped one repeated refused
  close. It did not stop a stateless decider from re-running passing verifications four times across
  two episodes, or from re-proposing a command whose syntax error was two operations above it.
- **That state alone prevents fabrication.** One decision read an empty stdout as "the array is
  empty" and the next believed it. The harness had omitted the empty-stdout line, so nothing in the
  state contradicted it. What is *not* in the record is not visible as missing.
- **Anything about scale.** The longest episode is 19 operations. No episode has been handed
  between two real agents in different processes. Nothing has been measured on a task lasting days.

## The experimental planner

`plan`, `record`, `input`, `adopt`, `check` and `observe` are kept as research, not as product.

- **The planner reproposes work the record says is done.** Three consecutive runs did; across
  eleven archived runs, 24 of 47 proposed tasks were work the record already answers.
- **Supplying a human observation made the next graph worse** on the very thing the observation
  named.
- **`check` is a report, not a gate.** It verifies that a quoted sentence exists, not that it
  supports the finding. Two of three "done" verdicts on one run quoted a sentence that did not
  support the verdict. Findings are model-generated.
- **The objective comparison is a plain string comparison.** Nothing judges whether two objectives
  mean the same thing.
- **`adopt`'s `brought` count is computed by subtraction**, so a duplicate present on both graphs
  reduces it. It reports what was added, not what was offered.
- **Planning sends repository content to a third party.** See the data boundary in the README. The
  exclusion filters are not a secret detector.
- **The research budget has been raised three times** because this repository outgrew it. Raising
  the number is not a structural answer, and no structural answer exists yet.

## Environment

Node.js 22+ only; no other runtime is tested. POSIX `sh` is assumed by `verify` and by the example.
Nothing is published to npm, and there is no release automation.
