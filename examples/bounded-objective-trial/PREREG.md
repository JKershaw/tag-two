# Pre-registration: bounded vs broad objective decomposition (runs 22-34)

Written before any run was made. HEAD at time of writing: f8470d0.

## Hypothesis

H1: A bounded objective drawn from the durable graph's own ready nodes produces a
materially better decomposition than the standing broad objective, on the same
repository state, with the same planner and model.

"Materially better" is defined below as a higher proportion of USEFUL nodes, where a
useful node is specific, evidence-supported, not already completed, and advances the
stated objective.

H1a (mechanism, the question that matters most): narrowing the objective causes the
planner to INVESTIGATE the relevant problem rather than paraphrase existing analysis.

## Origin of the hypothesis and its weakness

It rests on exactly one pair of runs (examples/control-seed-broad, 5 nodes 0 useful;
examples/control-seed-bounded, 3 nodes 2 useful) at n=1 per arm, with a HAND-AUTHORED
bounded objective, at a repository state (e1e580e) that has no durable graph. Three
things are therefore unestablished: replication under model variability; whether the
effect survives at a state carrying accumulated analysis prose; and whether an
objective mechanically DRAWN FROM THE GRAPH behaves like a hand-authored one.

## Design (fixed before running; no cell will be topped up or re-run)

Planner code is identical everywhere: the working tree at f8470d0, unmodified.
Model, temperature and budgets are the shipped ones. All HEAD runs are against
worktrees of commit f8470d0 so repository state and accumulated prose are IDENTICAL
across arms; the only variable is the objective string. No commit is made to the
repository until every run is finished.

State H = worktree of f8470d0 (durable graph present; full EXPERIMENTS.md, notes/,
README analysis present; durable outcomes supplied to the planner by plan.js).
State S = worktree of e1e580e (the first run's state; no graph, no experiment log, no
human analysis of any run; no durable outcomes supplied).

| Arm | State | Objective | n |
| --- | --- | --- | --- |
| A broad | H | "Make tag-two better at achieving its purpose." | 3 |
| B bounded-from-graph (unworked ready node) | H | "Investigate tool usage patterns." | 3 |
| C bounded-from-graph (worked ready node) | H | "Enforce evidence validation." | 2 |
| D bounded-hand-authored | H | "Reduce the chance that a planning run produces no usable output." | 2 |
| E bounded-hand-authored (replicates control B) | S | same as D | 2 |
| F broad (replicates control A) | S | same as A | 1 |

Arms B and C objectives are the VERBATIM TITLES of the two ready nodes (dependsOn: [])
of graph/graph.json, with a full stop added. Nothing else from the node — not its
reason, not its evidence — is put in the prompt, because handing node bodies to the
planner is the known mirroring failure of runs 12, 13 and 18. Drawing the objective
from the graph means taking the title.

C's node has a recorded outcome saying the work was done, and the code implements it.
It is included deliberately to test the "not already completed" criterion.
D isolates the confounder that the win belongs to objective quality rather than to the
graph. E tests replication of the single pair the hypothesis rests on. F likewise.

## Scoring rubric (fixed before running)

Per node, judged against the run's own objective:
- SPECIFIC: names a concrete locus (file/line/behaviour), not a module to review.
- LOCATED: its evidence citation, checked against the code at f8470d0, actually points
  at the thing it describes.
- NOT DONE: the work is absent from the code at f8470d0 and not reported complete by a
  recorded outcome. Checked in the code, not in prose.
- ADVANCES: doing it would move the stated objective, not merely touch the same files.
USEFUL = all four. Primary metric: useful nodes per graph, and useful/total.

Run-level, for H1a:
- files read (tag observe), and how many are RELEVANT to the objective;
- invented citations (tag observe);
- MIRROR: does the node's claim restate an analysis sentence already present in
  README.md / EXPERIMENTS.md / notes/steward-log.md, or the supplied outcomes? checked
  by searching those files for the node's substantive claim.
- NOVEL-CODE-CLAIM: does the node state something about the code that is true, checkable
  and NOT stated in any prose file?

A failed run (no graph) is a result and is preserved and reported; the cell is not
re-run to replace it.

Scoring order: node bodies are extracted, pooled, shuffled and scored on the mechanical
criteria (LOCATED, NOT DONE) before arm labels are rejoined. Full blinding is not
possible because a node's text usually reveals its objective; this is stated as a limit,
not claimed as a control.

## Stopping rule

If H1 is clearly supported or clearly refuted, stop and report. Do not implement the
architectural consequence. If a more fundamental confounder appears, establish it and
stop.

## Cost ceiling

$0.25 observed model cost, treated as a ceiling. Expected ~$0.09 at 13 runs.
