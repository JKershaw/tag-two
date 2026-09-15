# Scoring, with the text each call rests on

Scored against the rubric fixed in `PREREG.md` before any run. The mechanical columns
are in `mechanical.txt`, computed by `score.mjs` with no human input. This file holds
the judged criteria, with the quoted output each judgement rests on so the call can be
checked or overturned.

Where a cell has replicates, the scored run is named. Replicate 1 is scored unless it
returned no answer, in which case the first replicate that answered is scored, per
Deviation 2.

Primary score: 0 / 1 / 2 for the usefulness of the chosen next operation. Arm A is
scored as the maximum over all of its nodes; arm B has one operation.

## DP1 — run 2 was told in explicit terms to paginate, naming the exact next call, and did not

Steward's next step: remove the read window so `read_file` returns whole files.

| Cell | Discrepancy named | Primary | Quoted basis |
| --- | --- | --- | --- |
| A0 | no | 1 | `improve-research — "ensure it reads critical sections of the README"`. Right problem, no mechanism, no evidence that asking had already failed. |
| A | no | 1 | `improve-research — "ensures the agent reads the entire README"`, citing `README.md:1-200` it did not read. Same as A0 and arrived at without reading anything. |
| Ag | — | 0 | No answer in three attempts; the observation never reached the model. Reported as a null cell, not as evidence about the treatment. |
| B0 | — | 0 | No answer (replicate 1); replicate 2 answered — see below. |
| B0-r2 | no | 0 | Next operation: read `src/plan.js`. Generic. |
| B | no | 0 | Next operation: *"Investigate the current state of runtime behavior verification in the test suite."* Wrong problem. |
| Bg | no | 0 | Next operation: *"Read README.md to understand tag-two's purpose"*, after one `list_files`. A bounded operation that starts the investigation rather than advancing it. |

## DP2 — run 5 proposed complete research while citing its finished implementation

Steward's next step: instruct the planner to check in the code whether proposed work
already exists.

| Cell | Discrepancy named | Primary | Quoted basis |
| --- | --- | --- | --- |
| A0 | no | 0 | Proposed `improve-research` citing `src/repository.js:80-94 — Whole-file read implementation`. It committed the defect it was supposed to notice. |
| A | no | 0 | Proposed `ensure-complete-research` citing `src/repository.js:78-95 — Implementation of whole-file reads`. The defect, reproduced verbatim from the supplied observation. |
| Ag-r2 | no | 0 | Identical to A: `ensure-complete-research` citing the implementation. |
| B0 | **yes** | 2 | `contradicted: "Agent proposes 'Ensure complete research' task while having just read code that implements complete research"`. Next operation: examine run 4's transcript for *"whether specific documentation sections disproportionately influence task proposals"*. |
| B | no | 0 | Next operation: investigate whether complete research improves decomposition — a question runs 4 and 5 had already answered, in prose this run did not read. |
| Bg-r2 | **yes** | 2 | `contradicted: "README.md describes research completeness as an open problem while code implements it"`. Next operation: examine `src/plan.js` to see whether the planning logic produces already-completed proposals. |

**Contamination found after scoring, and it matters.** `README.md` at `216b7d1`, which
both scoring runs read, contains the discrepancy in the prose:

> *"Ensure complete research before decomposition"* proposes work that was already
> finished in the code the agent had just read in full

and, thirty lines later, the steward's actual next change, as a suggestion:

> whether it needs a different operation — for example asking the agent to reconcile
> written claims against code before proposing work

So the only positive signal in the trial is a paraphrase of a paragraph in its own
input. Under a contamination-adjusted scoring the two epistemic cells score 1 rather
than 2. Both scorings are reported; neither changes the decision.

The direct arms read the same paragraph, in all three cells, and proposed the work it
warns about anyway. That asymmetry is real and is the one finding worth keeping.

## DP3 — run 8 worked a node from tag-two's own graph, refuted it, and had nowhere to put the result

Steward's next step: build `tag record` and track `graph/graph.json`.
Declared in advance as a contaminated positive control: `notes/steward-log.md` at that
commit already names this as the largest gap.

| Cell | Discrepancy named | Primary | Quoted basis |
| --- | --- | --- | --- |
| A0 | no | 0 | Four nodes; `verify-gaps` is already implemented in the instructions at that commit. |
| A | no | 0 | Same four nodes. Proposed `expand-tool-usage` although the supplied observation is the record of that exact work being refuted. |
| Ag-r2 | no | 0 | Same four nodes again, after reading six files. |
| B0 | — | 0 | No answer (replicate 1). |
| B0-r2 | no | 0 | — |
| B | no | 0 | Next operation: *"Investigate the impact of using `search` and `history` tools"* — the work the supplied observation reports as just refuted. |
| Bg | no | 0 | `contradicted` names DP2's discrepancy, drawn from prose, not this run's. |

**No run in any arm opened `notes/steward-log.md`.** The answer was one file away, in a
file listed by `list_files`, and nothing read it.

## DP4 — run 13, handed the whole durable graph, read one file and restated the graph

Steward's next step: supply only the recorded outcomes, not the node bodies.

| Cell | Discrepancy named | Primary | Quoted basis |
| --- | --- | --- | --- |
| A0 | no | 1 | `verify-mirroring — "Need concrete evidence whether planner proposes tasks based on actual repository gaps versus just mirroring discussed topics"`. Aimed at mirroring, silent on the supply mechanism that caused it. |
| A | no | 0 | Returned run 13's own four node ids back. |
| Ag | no | 0 | Same four nodes; `verify-gaps` already implemented. |
| B0 | no | 0 | Next operation: examine run 9's history call. |
| B | no | 0 | Next operation: read the `search`/`history` implementations. |
| Bg | no | 0 | Next operation: examine run 9's transcript. |

## DP5 — run 18's invented citations were copied out of `graph/graph.json`, which it read as an ordinary tracked file

Steward's next step: hide the durable graph and its HTML from the planner's file tools.

| Cell | Discrepancy named | Primary | Quoted basis |
| --- | --- | --- | --- |
| A0 | no | 0 | Read `graph/graph.json` itself and cited it, without noticing that the same state also arrives as supplied outcomes. |
| A | no | 0 | Four nodes identical to A0's. |
| Ag | no | 0 | Same four nodes. |
| B0 | no | 0 | Next operation: *"Read graph/graph.json to understand the system's current model"* — proposing the reading that causes the defect. |
| B | no | 0 | — |
| Bg | no | 0 | Next operation: ensure the planner verifies implementation status — already implemented at that commit. |

## DP6 — run 20 produced clean citations and proposed work the repository already contained

Steward's next step: run the planner against the seed commit, where no analysis of any
run exists in its input, to tell mirroring from understanding.
Declared in advance as contaminated: the prose already suggests a control on another
repository.

| Cell | Discrepancy named | Primary | Quoted basis |
| --- | --- | --- | --- |
| A0 | no | 0 | Five nodes, three of them already implemented, including `ensure-complete-research` citing `src/repository.js:78-95` — the run-5 defect, twenty runs later. |
| A | no | 0 | Returned run 20's own three node ids back. |
| Ag | no | 0 | Four nodes; `enhance-graph-validation` proposes the citation check that exists. |
| B0 | no | 0 | Next operation: read `EXPERIMENTS.md`. |
| B | no | 0 | Next operation: investigate why tool usage is inconsistent. |
| Bg | no | 0 | Next operation: read `README.md`, after one `list_files`. |

## Totals

| Arm | Observation | Primary total (max 12) | Discrepancy named | Runs that read nothing |
| --- | --- | --- | --- | --- |
| A0 | none | **2** (DP1 1, DP4 1) | 0 / 6 | 0 of 6 |
| A | ungated | **1** (DP1 1) | 0 / 6 | 5 of 6 |
| Ag | gated | **0** | 0 / 6 | 5 of 10 |
| B0 | none | **2** (DP2 2) | 1 / 6 | 2 of 8 |
| B | ungated | **0** | 0 / 6 | 6 of 6 |
| Bg | gated | **2** (DP2 2) | 1 / 6 | 3 of 7 |

Under the contamination-adjusted scoring of DP2, B0 and Bg score 1 rather than 2.

## Against the pre-registered decision rule

The primary comparison is Ag vs Bg.

- Bg (2) exceeds Ag (0) by 2 points. **The rule requires at least 4.** Fails.
- Bg scores strictly higher than Ag at **1** of 6 decision points. **The rule requires
  four or more.** Fails.
- `(Bg − Ag) = 2` against `(Ag − A0) = −2`: the observation's contribution is negative,
  so the third clause is met, but it is met because supplying the observation made the
  direct arm worse, not because the framing made the epistemic arm better.
- The one decision point with a gap replicates within the data — B0 and Bg both named
  the DP2 contradiction, A0, A and Ag all missed it and committed it — but the
  contamination check shows the contradiction was written in the prose both arms read.

**Milestone A is not reached.**
