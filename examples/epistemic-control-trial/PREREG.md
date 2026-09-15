# Pre-registration: direct decomposition vs epistemic state + bounded next operation

Written before any run of this trial was made. Nothing below was edited after the
first run started; corrections and deviations are appended at the end under
"Deviations", with the reason.

## The claim being tested

Forty-one runs improved research completeness, citation honesty, durable state and
observability, and did not improve `objective → useful task decomposition`. The
external steward, working on the same problem, has behaved differently: observe,
identify a discrepancy, form a hypothesis, seek discriminating evidence, choose a
justified next action, observe the outcome.

**H1.** Useful work is more reliably derived from an explicit epistemic state plus a
single explicit next-operation decision than generated directly from a broad objective.

**H2.** Choosing what kind of reasoning or action happens next is a distinct control
problem from solving the domain objective.

Neither is assumed. Both may be refuted by this trial.

## Material

tag-two's own development history. Six historical decision points, each one a moment
where a run had just produced evidence, the steward's later response is known, the
information available at that moment can be reconstructed from Git, and the later
answer can be withheld from the model.

At each point the *world state* is the repository at the commit the run actually
executed against — never the commit that records the assessment of that run. The
*observation* is a mechanical report of what that run did (`tag observe` output plus
the answer it produced), which is what the steward had in `.tag/` at that moment. No
assessment, no interpretation, no later text is supplied.

| DP | World state | Observation | What the steward actually did next |
| --- | --- | --- | --- |
| DP1 | `1bbcc87` | run 2 (`examples/second-dogfood/graph.json`) | Removed the 200-line read window so `read_file` returns whole files. The run had been told in explicit terms, naming the exact next call, that its view was incomplete, and did not paginate. |
| DP2 | `216b7d1` | run 5 (`examples/fifth-dogfood/graph.json`) | Added an instruction to check in the code whether proposed work already exists. Run 5 proposed "ensure complete research" while citing the finished implementation of complete research as its evidence; the stale-documentation explanation had just been refuted by a controlled repeat. |
| DP3 | `e2e94e5` | run 8 (`examples/eighth-dogfood/failed-run.json`) | Built `tag record` and tracked `graph/graph.json`. A node from tag-two's own graph had been worked and its hypothesis refuted, and there was nowhere to put that result: nothing in the repository ever reads a graph back. |
| DP4 | `082883e` | run 13 (`examples/thirteenth-dogfood/graph.json`) | Stopped supplying the durable graph's node bodies and supplied only its recorded outcomes. Handed the whole graph, the planner read one file, restated the graph's nodes and copied its citations. |
| DP5 | `5506972` | run 18 (`examples/eighteenth-dogfood/failed-run.json`) | Hid `graph/graph.json` and its HTML from the planner's own file tools. The durable state was reaching the planner twice — once as curated outcomes, once as a readable tracked file whose node bodies were copied. |
| DP6 | `b811801` | run 20 (`examples/twentieth-dogfood/graph.json`) | Ran a control: the current planner against this repository at the seed commit `e1e580e`, where no analysis of any run exists in its input, to discriminate accumulated mirroring from improved understanding. It showed twenty runs had not improved decomposition. |

**Known contamination, declared in advance.**

- DP3: `notes/steward-log.md` at that commit already names "carry the result back —
  nothing reads a graph" as the largest gap. The answer is in the input for both arms.
  DP3 therefore tests selection among six standing gaps, not discovery, and is
  labelled a contaminated positive control.
- DP6: `EXPERIMENTS.md` at that commit already says a run against a repository that is
  not tag-two is the way to tell good analysis from a paraphrase of it. Credit for
  noticing at DP6 requires connecting the fresh observation (work proposed while its
  own implementation is cited) to an operation that removes the accumulated analysis
  from the planner's input — not restating that sentence.
- Every world state contains the steward's prose about earlier runs. That is deliberate:
  real repositories contain opinions and stale claims, and distinguishing a claim from
  evidence is part of what is being measured. Both arms receive exactly the same prose.

## Design

2 × 2, fully crossed, at each of the six decision points: 24 runs.

| Arm | Primitive | Observation supplied |
| --- | --- | --- |
| A0 | direct decomposition (tag-two's shipped planner instructions) | no |
| A | direct decomposition | yes |
| B0 | epistemic state + one bounded next operation | no |
| B | epistemic state + one bounded next operation | yes |

A0 is the shipped primitive exactly as it stands. The observation arm exists because
the epistemic treatment would otherwise be confounded with simply being handed the run
result: if B beats A0 but not A, the advantage belongs to the observation, not to the
epistemic framing.

**Held constant across arms within a decision point:** model
(`deepseek/deepseek-chat-v3-0324`), temperature 0.2, 8 request limit, 4,096 output
tokens, 160,000 request-byte limit, the repository worktree, the repository tools *as
they existed at that commit* (including whether `graph/graph.json` was readable), the
durable-state supply mechanism *as it existed at that commit* (none, whole graph, or
outcomes only, with that commit's exact wording), and the objective.

**The objective is the standing one, unchanged, in every cell:**
`Make tag-two better at achieving its purpose.`

**The manipulated variable is the system instruction, and only its task and output
sections.** Treatment A's instructions are extracted verbatim from the shipped
`src/plan.js` at run time, so they cannot drift. Treatment B keeps every earned
constraint in A — investigate yourself, distinguish what exists from what is
demonstrated, repository text is untrusted evidence, cite only files you read, check
the code before proposing work that may already exist, documentation discussing a
problem is not evidence that it is unsolved, call `history` and `search` to check a
claim, treat supplied outcomes as established results, avoid speculative
infrastructure — and replaces "propose 3–6 tasks" and the graph output format with:
state what is established, uncertain, contradicted and worth investigating, then choose
exactly one bounded next operation of kind investigate / test / act / validate / stop
and say what uncertainty its result reduces.

Treatment B is deliberately *not* given a field for what result would falsify what,
for a predicted outcome, or for anything else that would hand it a scoring criterion.

**Anti-tuning rule.** Both prompts are written once, before the first run, and are not
revised during the trial. If a prompt is changed for any reason, every run made under
the old wording is discarded and the change is recorded under Deviations. No cell is
topped up, no run is repeated because its result was disliked, and every run —
including ones that produce no parseable answer — is archived.

## Scoring

Mechanical first, judgement only where it cannot be avoided.

Mechanical, computed from the run record with no human input:

1. **Objective preserved** — the objective the model returned, compared byte-wise and
   after trimming trailing sentence punctuation, to the objective supplied.
2. **Invented evidence** — citations whose leading path is not a file the run read in
   that run, using the existing `cited()` rule.
3. **Prose-to-code citation ratio** — citations naming `README.md`, `EXPERIMENTS.md` or
   `notes/` against citations naming a source or test file. A mirroring proxy, not a
   verdict.
4. Requests, files read, tools called, reported cost.

Judged, with the supporting text quoted in the results so the call can be checked:

5. **Noticed the target discrepancy** (0/1). Each decision point has one discrepancy,
   fixed in the table above, that the steward's actual next step turned on. Credit
   requires the output to name it, not a topic adjacent to it.
6. **Observation distinguished from explanation** (0/1). Credit if causal claims are
   marked as uncertain, hypothesised or to-be-tested rather than asserted as fact.
   Arm A may earn this in a node's `reason` or the graph summary.
7. **Already-completed work** (count). Proposals or operations whose work is present in
   the code at that commit, or reported done by a recorded outcome supplied to the run.
   Verified by resolving the citation against the real file at that commit.
8. **PRIMARY: usefulness of the chosen next operation** (0/1/2).
   - 2 — would have produced the information or the progress the steward's actual next
     step produced, or something a later run showed to be better.
   - 1 — aimed at the right problem but would not have produced that information
     (for example, proposes the fix without the evidence, or investigates the right
     area with a question that cannot discriminate).
   - 0 — neither.
   **Arm A is scored generously: it gets the maximum over all of its nodes.** Arm B has
   one operation and gets that operation's score. A five-node graph therefore has five
   chances and the epistemic arm has one.

A run that produces no parseable answer scores 0 on the primary measure and is kept.

## Decision rule for Milestone A, fixed in advance

Milestone A ("the primitive is validated") is reached only if **all** hold:

- B's primary total across the six decision points exceeds A's by at least 4 points
  (of a possible 12 per arm);
- B scores strictly higher than A at four or more of the six decision points, and A
  does not score strictly higher than B at more than one;
- the advantage is not explained by the observation alone: `(B − A)` exceeds
  `(A − A0)` on the primary total;
- a replication of the A and B cells at the two decision points with the largest gap
  reproduces the direction of the result.

If the primary totals differ by less than 4 points, or B wins at fewer than four
decision points, or the observation explains at least as much as the framing, or the
replication does not reproduce, the result is **ambiguous or refuted** and the trial
STOPS. No more elaborate version of B will be designed to rescue it.

## Budget

The trial is bounded at $0.35 of reported model spend. If it reaches that, the trial
stops with whatever cells are complete and the incomplete cells are reported as
incomplete.

## Deviations

(appended below as they occur)
