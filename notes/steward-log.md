# Steward log

A record of things an external human/agent steward had to do that tag-two could not
yet do for itself. Kept as experimental evidence, not as a feature backlog. An entry
here is an observation; it becomes a change only when a run makes the need concrete.

Started at the eighth dogfood experiment, after seven runs archived in `examples/`.

## Standing interventions, observed across runs 1–7

1. **Choose the objective and decide when to run.** tag-two has no notion of when a
   run is warranted. Every run was launched by a human.
2. **Move `.tag` aside between runs.** `plan()` refuses to write into an existing
   `.tag` directory, so each experiment needs a manual `mv`/`rm` first.
3. **Copy the run's artifacts into `examples/`.** The only durable record of a run is
   whatever a human copies out of the ignored `.tag` directory by hand. Seven times.
4. **Assess the graph.** Every judgement about whether a run was better or worse than
   the previous one was written by a human into `README.md`. tag-two has never read
   an assessment back, and no assessment exists in any form tag-two can consume.
5. **Choose which proposed node to work.** Four graphs have been produced and, until
   run 8, no node from any of them had ever been worked.
6. **Carry the result back.** There is no code path anywhere in tag-two that reads a
   graph. `graph.json` is written once and never opened again. Continuity — the
   thing the README calls the product — is currently held entirely in a human's head
   and in prose in `README.md`.

Item 6 is the largest gap between the stated purpose and the implementation, and it is
the one that blocks anything downstream of planning. Notably, no graph tag-two has
produced has ever proposed it.

## Run 8 (2026-09-15) — first node worked from tag-two's own graph

Performed externally:
- Read seven runs of README prose to reconstruct the state of the experiment. tag-two
  holds none of that; it was all human-written narrative.
- Chose node `expand-tools` from `examples/seventh-dogfood/graph.json`. tag-two ranks
  nothing and marks nothing; "ready" is a structural fact about dependencies.
- Designed the hypothesis, edited `src/plan.js`, ran `npm test`, ran the planner,
  diagnosed the failure, archived `.tag/failed-run.json`, wrote the assessment.

Still external after this run, unchanged: everything above except item 6 of the
standing list. Item 6 is now partly addressed — `tag record` exists and the outcome of
this run is in `graph/graph.json` rather than only in prose and in my head.

New observations:
- `plan()` refuses to write into an existing `.tag`, so every run needs a manual
  archive-and-remove first. Eight times now. This is the most mechanical of the
  standing interventions and the one least in need of judgement.
- The exact-string objective echo rejected a valid graph over a missing full stop.
  Noted, not fixed: one occurrence against four correct echoes.
- A graph is not currently a thing tag-two can read. `record` is the first code in the
  repository that opens a graph. `plan()` still cannot consult one.

## Runs 9–14 (2026-09-15)

What changed in the division of labour. tag-two now performs, without me:
- consulting durable knowledge of work already performed (runs 11 and 14);
- choosing to open its own graph as evidence (run 14, unprompted);
- carrying outcomes across a replanning (`tag adopt`).

Still external, and the list has barely shrunk:
- deciding when to run, and with what objective;
- clearing `.tag` and copying artifacts into `examples/` — fourteen times now, purely
  mechanical, and the one intervention requiring no judgement whatsoever;
- reading the new graph and deciding whether it is better than the durable one;
- choosing which node to work;
- doing the work — every code change in this repository is still mine;
- observing what the run actually did, and writing the outcome text;
- deciding what the result means and what to try next.

Interventions that turned out to be missing capabilities:
- `record`: the eighth run had a result and nowhere to put it.
- supply outcomes to the planner: the ninth run reproposed a node whose outcome said it
  had just been refuted, because nothing read the graph.
- `adopt`: three consecutive runs produced graphs that never reached durable state.
- stripping the transcript on adoption: I had done it by hand once, and the mechanism
  immediately reintroduced the problem at 44 KB.

Interventions that should probably stay external, on current evidence:
- judging whether a graph is good enough to adopt. Every attempt so far to let the
  system evaluate its own output has produced mirroring rather than judgement.

An honest correction to my own log: after the eighth run I recorded a refutation drawn
from a single run, and the ninth run contradicted it. I was doing exactly what I had
criticised the planner for — generalising from the most recent salient thing. The
durable graph held both claims; my own note would have held only the first.

## Runs 15–21 and the controls (2026-09-15)

What tag-two took over from me in this stretch:
- **Observing a run.** `tag observe` replaced the throwaway script I had written by hand
  after every single run. It is also the only source of the citation measurements that
  drove the next three changes, so the system is now producing the evidence its own
  development is decided on.
- **Selecting the work.** The node I worked in this cycle, `enhance-evidence`, was the
  durable graph's only ready node. I did not choose it; the dependency structure did.
- **Carrying state across a replanning.** `tag adopt` did what I had been doing by hand.

What I still did, every time:
- decided when to run and with what objective;
- cleared `.tag` and copied artifacts into `examples/` — twenty-one times;
- wrote every line of code;
- formed every hypothesis;
- judged every result and wrote the outcome text.

The two interventions that mattered most were not features:
1. **Running the control.** Nothing inside tag-two would ever have told me that twenty
   runs of improvement had not improved decomposition. The system cannot distinguish
   its own mirroring from its own understanding, and on current evidence it cannot be
   made to, because the mirror is built from the record of its own development.
2. **Writing outcomes carefully.** After run 15 I noticed my outcome text had ended with
   a suggestion, and run 15 had proposed exactly that suggestion. I rewrote the next
   outcome to be purely factual, and run 20 then proposed work that already existed.
   That comparison is the sharpest measurement of independent understanding in the whole
   log, and it was produced by me deciding to phrase a note differently. **The quality of
   this loop currently depends on a human's discipline in writing a paragraph.** That is
   a real dependency and it is invisible from inside the system.

Things I deliberately did not build, and why:
- **Agent dispatch / execution.** Milestones beyond a single cycle need tag-two to change
  code. That is the largest piece of machinery the project would have, and the README
  warns hardest against it. The control says the graph's proposals are not yet good
  enough to be worth executing, so building execution now would mechanise bad work.
- **A `tag next` command.** Selection is already represented — "ready" is a fact about
  dependencies and the HTML shows it. A command would have been presentation, not
  capability.
- **Retries, scheduling, model routing.** No run has pointed at any of them. Three of
  the four format failures were fixed by making the check correct rather than by
  retrying.

An honest note on cost of evidence: four of twenty-one runs produced no graph because
they were rejected, and every one of those rejections taught more than the graph would
have. Preserving failed runs remains the highest-value mechanism in the repository.

## The bounded-objective trial, runs 22–41 (2026-09-15)

I wrote the design down before running anything, because the lead I was testing was one
I had produced myself and wanted to be true. The pre-registration is archived with the
runs. Fixed n per cell, no cell topped up, no run re-run to replace a bad one, every
failure kept. Three of the twenty runs produced nothing for reasons that had nothing to
do with any arm; under a "run it again until it works" habit I would have replaced them
and never noticed how common bare failure is.

What I still did, every time, exactly as before: chose the objectives, chose the states,
wrote the rubric, resolved every citation against the real file, and made the
useful/not-useful call. The scoring is mechanical up to the point where it matters and
then it is me.

Two things I got wrong going in.

**I expected the failure to be about quality and it was about protocol.** Seven runs
given a node title as an objective produced no graph at all. A node title is not an
objective; the model completes it into one and the echo check kills it. I had written
"bounded objectives drawn from the graph" in the previous section as though the drawing
were the easy part.

**I expected "bounded" to be the variable and it is not.** Arm G was bounded, at the same
commit, in the same trial, and behaved exactly like the broad arm. The difference between
the objective that worked and the one that did not is whether the failure it names can be
found by reading the code. I would not have run G if I had only been trying to confirm
the lead, and it is the run that made the result worth having.

The sharpest thing in the trial is C1 and C2 replacing the objective I gave them with
this repository's own. I have been recording mirroring of node bodies and evidence
strings for twenty runs. It reaches the objective too. Whatever this repository's prose
says loudly enough, the planner will say back, including what it is for.

I did not change any source file during the trial, and I am not changing one now. The
consequence of this result — that the useful objective is one with a locus in code, and
that the graph's nodes do not supply one — is an architectural claim resting on four
graphs at one commit. It needs its own experiment before it needs an implementation.

## The epistemic/control trial, runs 42–84 (2026-09-15)

This is the first trial in which the thing being tested was my own process rather than
tag-two's. The claim handed to me was that the difference between what tag-two does and
what I do is real and transferable: that an explicit epistemic state and an explicit
next-operation choice would out-decide direct decomposition. I was asked not to assume
it, and it did not survive.

### Operations I performed that tag-two cannot

Kept as architectural evidence, not as a feature list.

- **Chose the historical decision points.** Six moments out of forty-one runs where a
  run had produced evidence, the answer is known, and the answer can be withheld. The
  selection is the experiment; nothing in tag-two could have made it.
- **Separated world state from answer state.** For each point I had to find the commit
  the run executed against rather than the commit that records the assessment of it.
  Every one of those pairs is two adjacent commits an hour apart, and choosing the wrong
  one would have handed the model the answer without my noticing.
- **Declared the contamination before scoring, and then found more of it afterwards.** I
  flagged DP3 and DP6 in advance. I did not flag DP2 — and DP2 produced the trial's only
  positive result, which I then went looking to break, found the sentence it was
  paraphrasing, and reported the finding as mirroring. That sequence — a result I wanted,
  a check I ran anyway, a retraction — is the single operation in this trial that tag-two
  has never performed in any form.
- **Recognised my own control failure.** Eleven of my first twelve observation runs
  answered without reading anything, which is a failure runs 11 and 13 had already
  established and which the shipped planner already guards against. I had built an
  experiment whose treatment reproduced a known artifact. I recorded it as a deviation,
  kept the runs, and added gated arms rather than quietly replacing them.
- **Distinguished an apparatus failure from an answer.** Five runs returned an empty
  provider response. Re-running those is legitimate; re-running a run whose answer I
  disliked is not. I wrote the rule down before using it, applied it to both arms, and
  reported the cell that failed three times as null rather than as a zero.
- **Decided the trial was over.** The pre-registered rule said stop, and the temptation
  to add a seventh decision point or a richer version of the treatment was real and
  specific: the DP2 asymmetry is 3–0 and 2–0 and would have looked like a finding.

### What I got wrong

**I supplied the observation the way I would have wanted it, not the way the evidence
said to.** Runs 11 and 13 had already established that answer-shaped input suppresses
investigation, and I supplied an answer-shaped input up front to both arms. The first
twelve runs of this trial cost $0.05 to rediscover a result the repository already held
— a result I had read that morning.

**I expected the failure to be about output shape.** The hypothesis is about what the
model is asked to produce. The trial's clearest finding is that both shapes fail in the
same place: five of six discrepancies unnoticed, already-completed work proposed in
every arm, the prose preferred to the code in every arm. The output shape changes which
part of the prose gets copied and nothing else.

**The sharpest thing in the trial is a file nobody opened.** DP3's answer is written in
`notes/steward-log.md` — this file — at the commit in question. Six runs listed it.
None read it. I have been writing the standing gaps down for thirty-odd runs on the
assumption that durable prose is what the system is missing, and the one time the answer
was in it, no arm in either primitive went to look.

### What this changes about the division of labour

Nothing was transferred to tag-two. Phase 2 was not entered, because Milestone A was not
reached, and building the smallest durable distinction to preserve an advantage that
does not exist would have been architecture without evidence — the failure mode the
README warns about hardest.

One thing was added, and it is instrumentation rather than capability: the objective a
model returns is now kept beside the objective it was asked, and `tag observe` reports
the difference mechanically. Forty-one runs of objective substitution were found by a
human comparing two strings by hand, including two runs that replaced a supplied
objective with this repository's own. That comparison is now automatic and makes no
judgement about meaning; there is no equivalence check and no model involved in it.

### Still external, unchanged

Deciding when to run and with what objective; designing an experiment; choosing what
evidence discriminates; forming and rejecting a hypothesis; recognising mirroring;
judging a result; writing an outcome; and every line of code in this repository.

The list has not shrunk in twenty-one runs. That is now a result rather than a status
note: three consecutive trials have aimed at the input, the durable state and the output
shape, and none of them moved it.
