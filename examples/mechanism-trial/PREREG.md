# Pre-registration: is the active ingredient a locatable failure? (runs 42-47)

Written before any run of this trial was made. Repository HEAD: 336c8a9. No source file
is changed by this trial. Every run is at commit `e1e580e`.

## Question

Not "do bounded objectives work" — that was refuted in runs 22-41. The question is:

**Does an objective naming a concrete observed failure whose mechanism is discoverable
in the repository reliably cause the planner to investigate and identify useful work,
where similarly bounded target-shaped objectives do not?**

## Why this and not something else

The previous trial produced one contrast that explains both its positive and its negative
result: at `e1e580e`, "Reduce the chance that a planning run produces no usable output."
scored 6 useful nodes of 15 across four graphs, and "Reduce the number of model requests
a planning run needs." scored 0 of 5 and read only the README. Both were bounded. One
named a failure with throw sites, limits and a delete-on-failure line behind it; the other
named a number with nowhere to look. That contrast is n=1 objective per shape. This trial
puts three fresh objectives on each side.

## Design

Six runs, one per objective, all at `e1e580e` in separate worktrees, planner and model
and budgets as shipped. Six objectives, each one sentence, each about "a planning run",
chosen and written down before any was run.

**Arm M — names a concrete observed failure with a mechanism in the seed source:**
- M1 "A planning run sometimes proposes work this repository has already implemented."
  (observed in runs 1 and 5; mechanism: the instructions at `src/plan.js:12-27` never ask
  the model to check, and nothing else does)
- M2 "A planning run sometimes discards a complete answer the model has already produced."
  (observed when a valid graph arrived inside a markdown fence; mechanism:
  `src/plan.js:117` parses the raw content, and `src/plan.js:130` deletes the output)
- M3 "A planning run sometimes exhausts its research budget before the model answers."
  (observed in run 6; mechanism: the constants at `src/plan.js:8-11` and the byte check at
  `src/plan.js:79-81`)

**Arm T — equally bounded, names a measurable target, names no failure:**
- T1 "Reduce the number of tracked files a planning run needs to read."
- T2 "Increase the proportion of proposed tasks that carry a line-level citation."
- T3 "Shorten the time between starting a planning run and having a graph to read."

Pairing by subsystem so the arms are not aimed at different parts of the code:
M3↔T1 (research volume and budget), M2↔T3 (the run loop and its output),
M1↔T2 (proposal quality and evidence).

Three different objectives per arm rather than three repeats of one, deliberately: the
claim under test is that a *class* of objective behaves a certain way, and with six runs
a claim about a class is better served by varying the member than by repeating one.
The cost is that within-objective variance is not measured here at all; runs 22-41 showed
that variance is large, so a single run's failure to produce a graph is weak evidence
about its objective. This is a limit of the trial, stated in advance, not a control.

## Scoring

Identical rubric to runs 22-41. A node is USEFUL only if all four hold: it names a
concrete locus rather than a module to review; its citation, resolved against the real
file at `e1e580e`, points at what it describes; the work is absent from the code at that
commit; and doing it would move the objective that run was given. Citations are resolved
mechanically before judging. Rejected runs are scored from their preserved answers, since
the guards test protocol and honesty rather than decomposition.

Secondary, recorded for every run: source files read; source-file citations vs README
citations; and, for arm M only, whether any node cites the line that actually produces the
named failure ("mechanism located").

## Pre-registered outcome conditions

- **Supported** if every arm-M run yields at least one useful node and arm T yields at
  most one useful node in total.
- **Refuted** if arm T yields useful nodes at a comparable rate, or if arm M does not —
  one arm-M run at zero useful nodes already defeats "reliably".
- Anything between is reported as the narrowest explanation the six runs support.

## Rules

Fixed n of one run per objective. No cell is topped up. No run is repeated or replaced.
No source file is changed. Every run is archived, accepted or rejected.
