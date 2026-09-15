Dogfood experiment log

Every run of tag-two against its own repository, in order, with what was
observed and what it ruled in or out. Runs are archived unedited in
`examples/`, including the failures. This file exists separately from
`README.md` because it grew until it broke complete reading: at 1,065 lines the
README no longer fitted in one `read_file` call, and a real run investigated a
truncated purpose statement and no source at all. See the twelfth run below.

`README.md` states what the project is for. This file states what actually
happened. Where they disagree, the runs are what happened.

---

**First attempt (2026-09-15):** the command above stopped at the model-catalog
request because `openrouter.ai` could not be resolved (`ENOTFOUND`) in the build
environment. No model inference request was made and no graph was generated.

**First completed dogfood run (2026-09-15):** after the domain allowlist was
updated, one run of the unchanged planner succeeded. DeepSeek V3 0324 made three
model requests at a reported total cost of **$0.00399975**. It listed files and
read the first 200 lines of the README, all three implementation modules, and
the test file. It did not paginate the README, inspect history, or run tests.

The unedited outputs are preserved in
[`examples/first-dogfood/graph.json`](examples/first-dogfood/graph.json) and
[`examples/first-dogfood/graph.html`](examples/first-dogfood/graph.html).
Download/open the HTML locally to inspect it. These are explicitly archived
experiment artifacts, including the original repository investigation transcript;
normal `.tag` output remains ignored.

The graph proposed five tasks:

1. Investigate README.md for project purpose and principles.
2. Review graph validation and rendering logic (depends on 1).
3. Examine the planning module for constraints and behavior (depends on 1).
4. Test repository tools for file handling and security (depends on 1).
5. Analyze the test suite for coverage and gaps (depends on 2, 3, and 4).

**Assessment: the mechanics work, but this is not yet a useful decomposition.**
Most tasks repeat inspection the planner already performed, without identifying
a demonstrated weakness or a concrete improvement to the central experiment.
The dependencies mostly express review order rather than necessary task results.
The summary does not clearly distinguish inspected tests from verified runtime
behaviour, or identify the remaining uncertainties. Its evidence citations are
broad file ranges rather than observations that justify specific work.

This run exposes a research-quality problem, not a need for more orchestration:
the agent stopped reading the README before reaching the lessons, scope limits
and first-success criteria, despite having requests left. It then largely
mirrored the files it inspected. The next experiment should address that observed
gap in research and decomposition, not automatically execute this graph or add
scheduling machinery. No tasks were executed and no extra run was made to obtain
a more appealing answer.

**Second dogfood attempt (2026-09-15, no graph):** after `read_file` was changed
to report partial reads, one run of the planner reached the model, investigated the
repository, and returned an answer that failed graph validation. The planner then
deleted `.tag`, so the only surviving information was the error string
(`Expected the original objective, a research summary, and 1–8 nodes.`). The
transcript and the rejected answer were gone, and a real paid run taught us nothing
about why it failed.

That is the observed need behind the next change: a failed run now writes
`.tag/failed-run.json` with the objective, failure message, request count, reported
cost, full investigation transcript and raw model answer, and keeps the directory.
No repair, retry or fallback was added — only the ability to see what happened.

**Second completed dogfood run (2026-09-15):** the same objective was run once more,
because the previous attempt produced no graph to assess. DeepSeek V3 0324 made three
requests at a reported total cost of **$0.004499**, reading `package.json` and all
four implementation and test files, plus the first 200 lines of the README. The
unedited outputs are preserved in
[`examples/second-dogfood/graph.json`](examples/second-dogfood/graph.json) and
[`examples/second-dogfood/graph.html`](examples/second-dogfood/graph.html).

The graph proposed five tasks:

1. Improve research depth and completeness.
2. Enforce stricter validation of evidence citations (depends on 1).
3. Clarify the research summary (depends on 1).
4. Expand test coverage for runtime behaviour (depends on 2).
5. Document lessons from the first dogfood run (depends on 1).

**Assessment: the change failed its purpose, and the better-looking graph is
misleading.** The tool change worked exactly as designed — the model was told
`PARTIAL READ: lines 1-200 of 739. The remaining 539 lines of README.md have NOT
been shown. Call read_file with path "README.md" and startLine 201 to read them.`
and an equivalent notice for `test/tag.test.js`. It paginated neither, with seven
of ten requests unused. **Telling the model its view is incomplete, in explicit
terms that name the exact next call, did not make it finish reading.** The
research gap identified after the first run is therefore still open, and the
obvious cheap fix for it is now ruled out by evidence rather than by opinion.

The proposed tasks read as improvements rather than as one review task per source
file, and two of them cite specific line ranges instead of whole files. But this is
not better research. The five tasks correspond almost one-to-one to sentences in the
human assessment of the first run written at `README.md:83-97`, which had moved into
the first 200 lines the agent did read: premature reading, broad evidence citations,
an unclear summary, unverified runtime behaviour, undocumented lessons. The agent is
still mirroring the most salient text in its context. In the first run that text was
a file listing; in the second it was a human's critique. The apparent improvement
came from a human writing the analysis into the input, not from the agent producing
it.

The sharpest single observation: the agent proposed *"Improve research depth and
completeness — ensures the agent reads the entire README and other key files"* in the
same request in which it declined to read the rest of the README. It can name the
weakness it is exhibiting without that changing its behaviour.

What this rules out, and what remains open:

- Ruled out: passive truncation notes, and explicit directive ones, as a way to get
  complete research. Both were tried against a real run and both failed.
- Still open: whether the system should guarantee complete reading itself rather than
  asking the model to, and whether complete research actually improves decomposition
  or merely changes which text gets mirrored. These are separate questions and the
  second cannot be answered until the first is.
- Not evidenced: any need for scheduling, execution, retries, model routing or
  multi-generation machinery. Nothing in either run pointed at those.

Both runs used the objective exactly once each. No run was repeated to obtain a more
appealing graph, no proposed task was executed, and the archived artifacts are
unedited.

**Third dogfood run (2026-09-15, no graph):** with whole-file reads in place, the
planner achieved complete research for the first time — all 809 README lines and
every implementation and test file, each confirmed complete in the transcript. It
then returned its graph wrapped in ` ```json ` fences and the planner discarded it.
The preserved record in
[`examples/third-dogfood/failed-run.json`](examples/third-dogfood/failed-run.json)
shows the content inside the fence parses and passes `validateGraph` unchanged: three
backticks were the only thing between the run and a four-node graph. The planner now
removes a matched fence before parsing.

This run also justified the previous change twice over. Without `failed-run.json`
the cause would again have been invisible, and the record proved the whole-file
change had worked before any graph existed to show it.

**Fourth dogfood run (2026-09-15):** the same objective, run once more, produced a
graph at a reported cost of **$0.006458** — complete research costs roughly 60% more
than the first run's partial reading, and still under a cent. The unedited outputs
are in [`examples/fourth-dogfood/graph.json`](examples/fourth-dogfood/graph.json)
and [`examples/fourth-dogfood/graph.html`](examples/fourth-dogfood/graph.html).

The graph proposed five tasks:

1. Ensure complete research before decomposition.
2. Improve evidence citations in task proposals (depends on 1).
3. Clarify the research summary in the graph (depends on 1).
4. Expand test coverage for runtime behaviour (depends on 2).
5. Document lessons from the first dogfood run (depends on 1).

**Assessment: complete research was achieved and decomposition did not improve.**
This answers the question left open after the second run, and the answer is the
unwelcome one. The transcript shows every file read to its end, so the research gap
identified after the first run is closed as a mechanical matter. The tasks are
nonetheless the same shape as before: six of the graph's ten evidence citations point
into this README's own assessment prose rather than at code, and the proposals restate
the human critique written here. Guaranteeing complete research changed which text got
mirrored. It did not produce independent analysis.

The clearest evidence is the first task. *"Ensure complete research before
decomposition"* proposes work that was already finished in the code the agent had just
read in full — `src/repository.js` returns whole files, and `test/tag.test.js` contains
a test named for that behaviour. At the time of the run this README still described
that gap as open, so the obvious inference was that stale prose had outranked code
state. **The fifth run tested that inference directly and refuted it — see below.**
The proposal survives accurate documentation, so staleness was not the cause.

What is now established:

- Complete research is a solved mechanical problem, and the system must guarantee it
  rather than ask: passive notes, explicit directives naming the next call, and finally
  removing the window were tried in that order, and only the last worked.
- Complete research is not sufficient for useful decomposition. The mirroring behaviour
  survived it intact.
- Preserving failed runs earned its place immediately: two of the five answers so far
  failed on output format, and the one attempt whose evidence was deleted is the only
  failure still unexplained.
- Still open: whether the mirroring is reachable at all through instructions and
  context, or whether it needs a different operation — for example asking the agent to
  reconcile written claims against code before proposing work. Nothing yet justifies
  execution, scheduling, routing or multi-generation machinery; no run has pointed at
  them.

Each objective was run exactly once per change. No run was repeated to obtain a more
appealing graph, no proposed task was executed, and every archived artifact is
unedited, including the two failures.

**Fifth dogfood run (2026-09-15):** a controlled repeat. No source file changed
between the fourth run and this one — only this README, which was corrected so that
it no longer described complete research as an open problem. The unedited outputs are
in [`examples/fifth-dogfood/graph.json`](examples/fifth-dogfood/graph.json) and
[`examples/fifth-dogfood/graph.html`](examples/fifth-dogfood/graph.html), at a
reported cost of **$0.006593**.

**Assessment: the stale-documentation explanation is refuted, and the result is worse
than that explanation would have been.** The graph's five node ids and every
dependency between them are identical to the fourth run's, and the split of evidence
citations is unchanged at six into this README and four into code. Correcting the
documentation changed nothing.

*"Ensure complete research before decomposition"* is still proposed first, and its
own evidence now reads:

> `src/repository.js:78-95 — Implementation of whole-file reads to avoid partial research.`

The agent cited the finished implementation of the work as the reason to do the work.
It is not failing to notice that the code contradicts the task; it read the code,
described it accurately, and proposed the task anyway. So the mirroring is not caused
by incomplete research, and not by stale prose either. Both plausible causes have now
been tested against real runs and eliminated. What remains is that the agent is
selecting the most discussed topics in its context and restating them as tasks,
without checking whether the work already exists.

Two smaller observations from the same evidence:

- Across five runs the agent has never once used `search` or `history`. Every run is
  the same shape: list the files, read them, answer. Half the investigation tools it
  is offered have never been exercised.
- Runs four and five produced the same graph structure from a materially different
  README, so at this temperature the planner is stable enough that differences between
  runs can be attributed to input changes rather than sampling noise. That is what
  makes these comparisons meaningful, and it is the reason no run needed repeating.

This is the current edge of the experiment. The next change should address the one
behaviour now isolated by elimination — that proposed work is never checked against
what already exists — rather than research depth, documentation accuracy, output
format or any orchestration machinery, all of which have now been ruled out by runs
rather than by argument.

**Sixth dogfood run (2026-09-15, no graph):** the run testing the new instruction read
every file and then failed at the request-byte guard before sending. The preserved
record in
[`examples/sixth-dogfood/failed-run.json`](examples/sixth-dogfood/failed-run.json)
shows this repository's own experiment log had reached 38,322 of 78,755 serialized
tool bytes — 49% of the research payload — after growing from 696 to 921 README lines
across six experiments.

**Complete reading and an append-only log are in direct tension, and every experiment
makes the next one harder to run.** This is a self-hosting problem found by running
rather than by design: the document that tells the agent what the project is for is
also the document crowding out its capacity to investigate. The budget was raised to
120,000 bytes, which the cost cap comfortably allows, and that defers the problem
rather than solving it. Separating the log from the statement of purpose is the
structural fix and is deliberately not taken yet, because what the agent would then
choose to read is an untested assumption.

**Seventh dogfood run (2026-09-15):** the same objective at a reported cost of
**$0.006827**, archived unedited in
[`examples/seventh-dogfood/graph.json`](examples/seventh-dogfood/graph.json) and
[`examples/seventh-dogfood/graph.html`](examples/seventh-dogfood/graph.html).

The graph proposed four tasks:

1. Enhance research quality to avoid mirroring.
2. Verify gaps before proposing tasks (depends on 1).
3. Expand tool usage beyond file reading (depends on 1).
4. Clarify the research summary in the graph (depends on 2).

**Assessment: the first real improvement, and a smaller one than it looks.** Against
the identical fourth and fifth runs, four things changed. *"Ensure complete research
before decomposition"* — the already-completed task proposed twice while citing its own
finished implementation — is gone, which is exactly what the instruction targeted. The
graph shrank from five tasks to four. Evidence citations moved from six-to-four in
favour of this README to an even four-and-four. And the agent read `bin/tag.js`, a file
neither previous run opened.

The third task is the most interesting thing any run has produced. *"Expand tool usage
beyond file reading"* observes that `search` and `history` have never been used, and
pairs that with `src/repository.js:96-117`, where both are implemented. It is a real
gap, correctly located in code, and it is about the agent's own behaviour.

But the mirroring is not solved. The remaining README citations point at this
assessment section, and the first two tasks restate its analysis. There is now a trap
worth naming plainly: **the more carefully a human writes the assessment here, the
better the graph looks, without the agent having done any more work.** A paraphrase of
good analysis is hard to distinguish from good analysis. This is the strongest reason
to run the planner against a repository that is not tag-two, where no one has written
the answer into the input, before concluding that decomposition has improved.

What changed in this cycle: instructions can remove a specific, nameable defect —
proposing work that already exists — where notes and warnings could not remove a
general one. That is a narrower and more useful result than "prompting works".

**Eighth dogfood run (2026-09-15, no graph):** the first run whose subject was chosen
by tag-two rather than by a human. Node `expand-tools` of the seventh graph —
*"Expand tool usage beyond file reading"*, evidenced at `src/repository.js:96-117` —
was worked directly: the planner's system instructions gained one sentence telling it
to call `history` to see what had recently changed and `search` to check a claim,
before treating a document's description of an open problem as current. The preserved
record is
[`examples/eighth-dogfood/failed-run.json`](examples/eighth-dogfood/failed-run.json),
at a reported cost of **$0.00699275**.

**Assessment: the hypothesis is refuted, and the run also failed on a punctuation
mark.** Two separate results came out of it.

First, the change did what it was told not to do nothing about. The run made six tool
calls and every one was `list_files` or `read_file`. `search` and `history` were not
called once, in a run whose system prompt named both by tool name, gave a reason to
call them, and placed that sentence directly before the output format. Run 2
established that a directive inside a *tool result* does not produce a tool call; this
establishes the same for a directive in the *system instructions*, which was the
untested half. **Instructions can remove a behaviour the model is already performing,
but they have not once caused this model to perform a tool call it was not already
going to make.** If the planner is to see history, the system will have to supply it,
exactly as whole-file reads had to be supplied rather than requested — and there is
still no evidence that seeing history would improve decomposition, so that change is
not yet justified.

Second, the graph was rejected because the model echoed the objective as
`Make tag-two better at achieving its purpose` and the objective was
`Make tag-two better at achieving its purpose.` — a missing full stop. The graph
inside the answer is otherwise a valid four-node graph. Three of eight runs have now
failed on output format and none on substance. The exact-string echo is a poor drift
detector: it is insensitive to a graph that has genuinely wandered off-objective and
hypersensitive to a full stop. This is noted rather than fixed, because one occurrence
across four successful echoes is not yet a pattern, and preserving the failure is more
useful than a guard loosened on a single data point.

**The eighth run is where the bootstrap problem became concrete.** A node from
tag-two's own graph was selected, worked, and refuted — and there was nowhere to put
that result except this paragraph. `graph.json` is written once by `plan()` and no
code anywhere in the repository ever opens it again. The continuity the project calls
its product has, until now, been held entirely in a human's head and in this prose.
That is the observed need behind the next change, and it is the step this README has
described from the beginning: *"then we determine the smallest mechanism necessary to
feed the result back into the graph."*

**Ninth change — `tag record`, and a tracked working graph.** `graph/graph.json` is
the seventh run's graph, unedited except by `tag record`, promoted out of the ignored
`.tag` directory so that tag-two's own understanding of its own problem is durable and
inspectable. `tag record <graph> <node> "<outcome>"` appends a timestamped outcome to
one node, revalidates the graph and re-renders
[`graph/graph.html`](graph/graph.html). It does not decide anything, schedule
anything or execute anything; a human still chooses the node and does the work. The
first thing recorded through it was the refutation above, against the very node that
caused it.

Committing a graph is a deliberate exception for this repository, which is its own
experimental subject. `plan()` still ignores `.tag` by default, because graphs of
other people's repositories may contain their content.

Note what this makes true, and what it does not. tag-two is now part of the causal
loop of its own development: the choice of what to work came out of its graph, and the
result of that work went back into its graph rather than only into a human's notes. It
is not autonomous, it did not judge anything, and `plan()` still cannot read a graph
back — it can only write a new one. The next question is what happens when the
planner investigates a repository that contains a graph with a refuted node in it.

**Ninth dogfood run (2026-09-15, no graph):** the first run against a repository that
tracked its own durable graph, preserved in
[`examples/ninth-dogfood/failed-run.json`](examples/ninth-dogfood/failed-run.json) at
a reported cost of **$0.00582425**.

Three results, one of which overturned a conclusion recorded an hour earlier.

The planner **called `history`, for the first time in nine runs**, with exactly the
instruction the eighth run had declared refuted. So a system-instruction directive can
produce a tool call from this model; it does so unreliably, and one run is not enough
to refute a behavioural hypothesis. The correction was appended to the outcome list of
the node that carried the premature refutation, rather than replacing it — which is
the first thing the durable graph did that prose could not: it holds a claim and its
correction side by side, attached to the work that produced both.

It **never opened `graph/graph.json`**, and proposed `expand-tools` again — the very
node whose recorded outcome said it had just been worked and refuted. Recording an
outcome and consulting one are different problems, and only the first had been solved.

It also failed on the objective echo again, missing the same full stop. Two consecutive
blocking failures with the cause fully understood, so `validateGraph` now ignores
surrounding whitespace and trailing sentence punctuation when comparing the echo to the
objective, and stores the objective that was asked. Four of nine runs had failed on
output format and none on substance.

**Tenth dogfood run (2026-09-15, evidence lost):** the planner was handed its durable
graph alongside the objective. It answered immediately, having read nothing, and was
correctly rejected — but `attempt.answer` was assigned *after* that check, so the
preservation path saw an empty run and rethrew. **The answer was lost.** This is the
precise failure `failed-run.json` was built to prevent, reappearing on a code path
added later, and it is the second run in twelve whose evidence was destroyed by the
tool meant to keep it. The assignment moved above every check that can reject.

**Eleventh dogfood run (2026-09-15, no graph):** the same configuration, re-run so the
answer could be seen. Preserved in
[`examples/eleventh-dogfood/failed-run.json`](examples/eleventh-dogfood/failed-run.json)
at **$0.00125275** — a fifth of a normal run, because it did no work.

**Assessment: the durable graph was demonstrably causal, and it replaced research
entirely.** Both halves matter.

The planner made zero tool calls. It restated three of the four durable nodes verbatim
— same ids, same titles, same reasons, same evidence strings — and cited
`examples/ninth-dogfood/failed-run.json`, a file it had never opened, in direct breach
of an instruction not to claim inspection it had not performed. Handed an answer, it
returned the answer.

But look at what it changed. It **dropped `expand-tools`**, the one node carrying
recorded outcomes, and replaced it with a new node, `system-supply-history`:
*"Supplying history data directly in the system context may ensure the planner
considers recent changes."* That is the follow-on the recorded outcome itself named —
*"if the planner is to see history the system must supply it"* — written by a human
into the graph through `tag record` and nowhere else. No file in the repository
contained that sentence in a form the planner read, because it read nothing.

**This is the point at which tag-two entered the causal loop of its own development.**
A result observed in a run was written into the durable graph; the durable graph
changed what the system proposed next. The reasoning was thin and the research was
absent, but the path ran through the graph rather than around it.

The graph is real input, so it was moved: pushed as a user message on the first turn
after a file has actually been read, so that it can inform decomposition without
standing in for it.

**Twelfth dogfood run (2026-09-15):** the first graph produced since the durable graph
existed, archived in
[`examples/twelfth-dogfood/graph.json`](examples/twelfth-dogfood/graph.json) and
[`examples/twelfth-dogfood/graph.html`](examples/twelfth-dogfood/graph.html) at
**$0.00385476**.

**Assessment: research collapsed, the causal benefit did not reproduce, and the run is
confounded.** The planner called `list_files` and then read exactly one file. It opened
no source file, no test and no graph. It proposed four nodes, three of them the durable
graph's own, including `diversify-tools` — the outcome-bearing node's subject, back
again, so the effect seen in run 11 did not survive the move. Its citations point at
`src/repository.js:78-95` and `test/tag.test.js:106-119`, neither of which it read in
this run; they are copied out of the durable graph. Its fourth node asserts that
"no code reads" recorded outcomes, which `src/plan.js` had done to produce that very
request.

The confound is the more important finding. **The one file it read came back
truncated.** `README.md` had reached 1,065 lines and 41,528 bytes, past the 40,000-byte
whole-file limit, so the planner received `[PARTIAL READ: lines 1-816 of 1065...]` and,
as established in runs 1 and 2, did not paginate. It investigated a truncated statement
of purpose and nothing else.

This is the sixth run's problem returned in a worse form. Then the log crowded the
*request* budget; now it has broken *complete reading of the purpose document itself*,
which every run depends on. The structural fix that was deliberately deferred — "what
the agent would then choose to read is an untested assumption" — is no longer optional,
because the alternative is that no run can read the README at all. This file is that
split. `README.md` is 732 lines and states what the project is for; this log states
what happened.

The next run isolates the confound by changing only that: same planner, same durable
graph, a README that fits in one read.
