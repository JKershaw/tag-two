# Task selection, recorded before any investigation of the solution

Written 2026-09-16, after reading only: the `/stack?view=digest` ranking, a full
title/state/label listing of the 956 open issues in the Harbour workspace, and nothing
from the LinearViewer repository at all. The repository was cloned but not read.

## What I looked at

`GET /api/proxy/issues` paged to 2000 issues; 956 in a non-terminal state
(Backlog 718, Todo 219, In Progress 19). I filtered TITLES ONLY with a regex for
doc/comment/stale/drift/test words and read the 100 matches' titles, states, priorities
and labels. I did not open a single issue body, and did not grep the repository.

## Chosen: LIN-1856

Title: "Reconcile docs/view-tiers.md's experimental member list with EXPERIMENTAL_VIEWS
(missing liveConsole, will also be missing passage…)". State: Todo. Priority 4.
Labels: front:surfaces.

## Why it looked suitable, from the title alone

- **Externally inspectable completion condition.** The title names two artefacts — a
  documentation list and a code constant — and asserts they disagree. Whether they agree
  is a fact anyone can check by reading both, without trusting the runner.
- **Not manufactured.** It is a real workspace issue, filed by someone else, sitting in
  Todo.
- **Not already-completed work.** Its state is Todo, not Done or Canceled.
- **Low risk.** The named change surface is a markdown doc. No production action, no
  deploy, no migration, no secrets.
- **Not primarily product judgement.** "Does this list match that list" has an answer.
- **Solution not pre-investigated.** I have not opened `docs/view-tiers.md`, not grepped
  for `EXPERIMENTAL_VIEWS`, and not read the issue description. The only thing I know is
  what the title claims, and the title's claim is itself a claim the runner must check.

## Known risk in this choice, recorded now so it cannot be claimed as foresight later

The title asserts `liveConsole` is missing. If the drift was already fixed, this is
already-completed work in a Todo-shaped wrapper, which the brief tells me not to choose.
I cannot rule that out without doing the investigation I am forbidden to do first. If the
runner's first operation discovers the doc is already correct, that is an honest outcome
of the runner, not a rescue — and I will record it as a selection defect, not edit it away.

## Reserved for the human

- Whether a doc-only change of this kind should land in Harbour at all.
- Anything the runner finds that turns out to be a product decision about view tiers.
