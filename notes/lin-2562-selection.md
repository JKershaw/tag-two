# Second task selection, recorded before any investigation of the solution

Written 2026-09-16, after LIN-1856 reached verified completion. Selected from the same
title-only listing of 956 open Harbour issues used for the first task — no new search was
run to find something convenient, and nothing in the LinearViewer repository was read
about this ticket before it was chosen.

## Chosen: LIN-2562

Title: "workspace-api's normalizeIssueWrite/normalizeCommentWrite rejection arm is
unwitnessed — two assertions close it". State: Backlog. Priority: none. Label:
front:providers.

## Why it looked suitable, from the title alone

- **A different shape from the first task.** LIN-1856 was documentation drift closed by a
  text edit. This is test code, closed by running the repository's own suite. The brief
  asked for a somewhat different shape if one was naturally available.
- **Externally inspectable completion condition, and a strong one.** "Unwitnessed" names a
  mutation property: if the rejection arm can be broken without any test failing, the arm
  is unwitnessed. That is checkable by breaking it and watching, not by reading a diff and
  agreeing with it. A test that is added but asserts nothing cannot satisfy it.
- **Not manufactured, not already-completed.** A real Harbour issue in Backlog.
- **Low risk.** The title says two assertions. Test files only, in an isolated clone.
- **Not product judgement.** Whether a mutant survives is a fact.

## What I read before opening the episode, and what I did not

I read the ticket body and its (zero) comments, because the task statement, its constraints
and its acceptance criteria come from there. I have not opened
`routes/workspace-api.js`, `tests/unit/issue-write-routes.test.js`,
`tests/unit/comment-write-route.test.js`, or `lib/proxy-graphql-errors.js`.

## Known risk in this choice, recorded now

The ticket body itself names the fix in some detail — which files, which provider stubs,
which status code. That makes the task easier than it would be from the title alone, and
the runner deserves less credit for the mechanics than it would otherwise. It does not
make the task already-completed, and it does not tell the runner what the current state of
those files is, which is the thing it has to establish. I am recording the concession
rather than pretending the ticket was terser than it is.

## Reserved for the human

- Whether the two assertions should land in Harbour, and by what route.
- Anything the runner finds that turns out to be a production-code defect rather than a
  test gap — the ticket forbids touching `routes/workspace-api.js`, so a real defect there
  is a boundary, not a change to make.
