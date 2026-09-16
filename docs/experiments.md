Dogfood experiment log

Every run of tag-two against its own repository, in order, with what was
observed and what it ruled in or out. Runs are archived unedited in
`examples/`, including the failures. This file exists separately from
`README.md` because it grew until it broke complete reading: at 1,065 lines the
README no longer fitted in one `read_file` call, and a real run investigated a
truncated purpose statement and no source at all. See the twelfth run below.

`README.md` states what the project is for. This file states what actually
happened. Where they disagree, the runs are what happened.

It moved from the repository root to `docs/experiments.md` at 0.1.0, along with
`notes/`, which is now `docs/notes/`. Paths written in prose below are as they
were at the commit being described; markdown links have been repointed so they
still resolve from here. Nothing else in this file was edited in the move.

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
[`examples/first-dogfood/graph.json`](../examples/first-dogfood/graph.json) and
[`examples/first-dogfood/graph.html`](../examples/first-dogfood/graph.html).
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
[`examples/second-dogfood/graph.json`](../examples/second-dogfood/graph.json) and
[`examples/second-dogfood/graph.html`](../examples/second-dogfood/graph.html).

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
[`examples/third-dogfood/failed-run.json`](../examples/third-dogfood/failed-run.json)
shows the content inside the fence parses and passes `validateGraph` unchanged: three
backticks were the only thing between the run and a four-node graph. The planner now
removes a matched fence before parsing.

This run also justified the previous change twice over. Without `failed-run.json`
the cause would again have been invisible, and the record proved the whole-file
change had worked before any graph existed to show it.

**Fourth dogfood run (2026-09-15):** the same objective, run once more, produced a
graph at a reported cost of **$0.006458** — complete research costs roughly 60% more
than the first run's partial reading, and still under a cent. The unedited outputs
are in [`examples/fourth-dogfood/graph.json`](../examples/fourth-dogfood/graph.json)
and [`examples/fourth-dogfood/graph.html`](../examples/fourth-dogfood/graph.html).

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
in [`examples/fifth-dogfood/graph.json`](../examples/fifth-dogfood/graph.json) and
[`examples/fifth-dogfood/graph.html`](../examples/fifth-dogfood/graph.html), at a
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
[`examples/sixth-dogfood/failed-run.json`](../examples/sixth-dogfood/failed-run.json)
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
[`examples/seventh-dogfood/graph.json`](../examples/seventh-dogfood/graph.json) and
[`examples/seventh-dogfood/graph.html`](../examples/seventh-dogfood/graph.html).

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
[`examples/eighth-dogfood/failed-run.json`](../examples/eighth-dogfood/failed-run.json),
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
[`graph/graph.html`](../graph/graph.html). It does not decide anything, schedule
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
[`examples/ninth-dogfood/failed-run.json`](../examples/ninth-dogfood/failed-run.json) at
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
[`examples/eleventh-dogfood/failed-run.json`](../examples/eleventh-dogfood/failed-run.json)
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
[`examples/twelfth-dogfood/graph.json`](../examples/twelfth-dogfood/graph.json) and
[`examples/twelfth-dogfood/graph.html`](../examples/twelfth-dogfood/graph.html) at
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

**Thirteenth dogfood run (2026-09-15):** identical to the twelfth except that the
README now fits in one read. Archived in
[`examples/thirteenth-dogfood/graph.json`](../examples/thirteenth-dogfood/graph.json) at
**$0.00301446**.

**Assessment: the confound is eliminated and the durable graph is the cause.** With a
complete README available the planner still called `list_files`, read `README.md`, and
answered. One file, three requests, seven unused. Its citations — `README.md:259-265`,
`README.md:204-211`, `src/repository.js:96-117`, `test/tag.test.js:106-119` — are
copied out of the graph it was handed; the README line numbers no longer point at that
text since the split, and the two source files were never opened.

So the rule is not about position in the conversation. **Handed an answer, the planner
returns the answer**, whether it arrives before the investigation or after the first
read. This is the mirroring result at its sharpest: the strongest mirror yet built was
the system's own durable state.

The node bodies are the answer-shaped part. The recorded outcomes are the part that
exists nowhere else in the repository, and the part that produced run 11's one causal
effect. So only the outcomes are supplied now — title, timestamp, and what was observed
— with no ids, reasons, evidence strings or unworked nodes.

**Fourteenth dogfood run (2026-09-15):** the first run given recorded outcomes alone,
archived in
[`examples/fourteenth-dogfood/graph.json`](../examples/fourteenth-dogfood/graph.json) at
**$0.0061095**.

**Assessment: research recovered and the durable record visibly did work.** Five
requests instead of three, four files read instead of one, and — for the first time in
fourteen runs — the planner opened `graph/graph.json` of its own accord, having been
told only what had been observed, not what the graph said.

Two of its four nodes are grounded in the durable record rather than in prose. Its
`tool-strategy` node cites *"Instruction to use tools was ignored"* and *"Same
instruction was followed in later run"* — which is precisely the refutation and the
correction recorded against `expand-tools`, the pair that only the graph holds. Its
`outcome-integration` node cites `graph/graph.json:38-46` and observes that a node was
reproposed despite having outcomes, which is a true statement about runs 12 and 13,
made from a file it actually read.

The remaining flaw is attribution, not fabrication. It cites
`examples/eighth-dogfood/failed-run.json` and `examples/ninth-dogfood/failed-run.json`
for claims it learned from the supplied outcomes, and it did not open either file. The
content is correct and the citation is invented — a different and milder failure than
the eleventh run's, where the content was copied too.

**Fifteenth change — `tag adopt`, and the loop closes.** Runs 12, 13 and 14 each
produced a graph and none of them reached the durable one, which was still the seventh
run's output plus two hand-written outcomes. Planning against frozen state is not a
cycle. `tag adopt <new> <durable>` replaces the durable graph wholesale, refuses a
graph answering a different objective, and carries every recorded outcome across;
outcomes whose node no longer exists are kept and shown separately. Run 14's graph was
adopted, retiring both `expand-tools` outcomes while preserving them.

Adopting whole first put the durable graph at 44 KB — past the planner's own
40,000-byte read limit, mechanising the exact failure the README had just been split to
fix. The transcript now stays with the archived run and is referenced by path.

**Fifteenth dogfood run (2026-09-15):** the first run under `tag observe`, archived in
[`examples/fifteenth-dogfood/graph.json`](../examples/fifteenth-dogfood/graph.json) at
**$0.00312324**.

**Assessment: the worst citations yet.** One file read, no other tool called, and seven
of ten evidence citations naming files the run never opened — one of them
`examples/fifteenth-dogfood/graph.json`, its own output, which did not exist. Measured
across every archived graph, invented citations track how much durable state was
supplied: 0 of 44 across runs 1, 2, 4, 5 and 7 before any was; 4 of 8 in runs 12 and 13
handed the whole graph; 2 of 8 in run 14 handed two short outcomes; 7 of 10 here, handed
three outcomes including a long analytical one. **The outcome text names file paths and
the planner mines it for citations.**

Asking for honest citations had not worked, and repairing them would be repair. But a
citation is checkable against the transcript, so it is now checked: every evidence item
must begin with the path of a file the run actually read, the instructions say the
graph is rejected otherwise, and the rejected answer is preserved. The hypothesis was
that the guard would also restore research, because a planner required to cite what it
read has a reason to read.

**Sixteenth run (rejected, $0.00772425):** the hypothesis held immediately. Four files
read and `history` called, against one file and nothing else the run before. Invented
citations fell from seven to three — all three naming archived run files that the
supplied outcome text mentions. The supply message now says outcomes are not repository
evidence and that paths inside them must not be cited unread.

**Seventeenth run (no graph, $0.00066175):** read more than any run ever had —
`README.md`, `EXPERIMENTS.md`, `src/graph.js`, `src/plan.js`, `test/tag.test.js`,
the experiment log for the first time — and died at 116,999 of 120,000 serialized tool
bytes without sending its answer. **The third time this repository has outgrown its own
research budget.** Bytes have been the binding constraint in every run and no run has
ever used more than five of its ten requests, so the budget rose to 160,000 and the
request limit fell to 8, leaving the worst-case cost bound unchanged. A bigger number is
still not a structural answer.

**Eighteenth run (rejected, $0.00921056):** three invented citations again, two of them
copied verbatim from a node in `graph/graph.json` — which it had read as an ordinary
tracked file. **The durable state was reaching the planner twice**: once as curated
outcomes through its own channel, and once as raw node bodies to mirror. Self-hosting
created that, because tag-two's state lives in the repository tag-two investigates. The
durable graph and its rendering are now hidden from `list_files` and `read_file`.

**Nineteenth dogfood run (2026-09-15):** archived in
[`examples/nineteenth-dogfood/graph.json`](../examples/nineteenth-dogfood/graph.json) at
**$0.00790675**. **The first graph since durable state was introduced whose every
citation names a file the run actually read**: 0 invented of 6, four files read. The
sequence across the cycle is 7 of 10, 3, 3, 0.

**Twentieth dogfood run (2026-09-15):** a deliberate test of whether the system
reasons or mirrors. The outcome recorded for the previous cycle was written to be purely
factual and to propose nothing, because the outcome that preceded run 15 had ended with
*"Not yet tried: rejecting or flagging a graph whose evidence cites unread files"* — and
run 15 had duly proposed exactly that. Archived in
[`examples/twentieth-dogfood/graph.json`](../examples/twentieth-dogfood/graph.json) at
**$0.007977**.

**Assessment: given nothing to copy, it proposed work that already existed.** Citations
stayed clean and five files were read. But `enhance-evidence-validation` proposes
building the citation check while citing `src/plan.js:182-199`, the implementation of
the citation check, as its evidence. That is precisely the fifth run's defect — reading
the code, describing it accurately, and proposing it anyway — returning after fourteen
runs and an instruction written specifically against it.

---

## The control: the same repository, twenty runs earlier

The seventh run's assessment named the trap plainly: *"the more carefully a human writes
the assessment here, the better the graph looks, without the agent having done any more
work."* Everything since has been measured on a repository whose input contains a
human's analysis of every previous run. So the planner as it now stands was run against
this repository as it stood at commit `e1e580e` — the exact state the **first** run
planned against, with no experiment log, no durable graph, no `tag observe`, and no
human analysis of any run anywhere in its input.

**Control A, broad objective** (the standing one), archived in
[`examples/control-seed-broad/graph.json`](../examples/control-seed-broad/graph.json) at
**$0.00510025**. All six files read whole, every citation naming a file it read.

| First run, same repository | Control A, twenty runs later |
| --- | --- |
| Investigate README.md for purpose | Investigate current planning behavior |
| Review graph validation and rendering | Improve validation of task graphs |
| Examine the planning module | Enhance HTML rendering |
| Test repository tools | Add detailed cost tracking |
| Analyse the test suite | Increase test coverage |

**Assessment: the decomposition has not improved.** One investigation node and four
per-module nodes hanging off it, in both. The first run's assessment — *"most tasks
repeat inspection the planner already performed, without identifying a demonstrated
weakness or a concrete improvement"* — applies to the control word for word.
`add-cost-tracking` proposes work the seed already implemented, citing the price caps at
`src/plan.js:56-65` as its evidence.

What did improve is real and narrower than it looked: the first run read 200 lines of
one file, and the control read six files whole; the first run's citations were broad
file ranges, and the control's are all files it opened. **Research completeness and
citation honesty improved. Decomposition did not.** The grounded, outcome-aware graphs
produced on tag-two itself were mirroring accumulated context, and the control removes
the context and the appearance together.

**Control B, bounded objective** — *"Reduce the chance that a planning run produces no
usable output."* — archived in
[`examples/control-seed-bounded/graph.json`](../examples/control-seed-bounded/graph.json)
at **$0.004031**.

Three nodes, not five, and none of them a per-module review. `improve-error-handling`
and `add-fallback-mechanism` both land on `src/plan.js:128`, where a run that reaches an
investigation limit stops without saving anything — which is exactly the failure that
really destroyed the seventeenth run's work. The third node proposes the evidence guard
that the seed already had.

**A bounded objective decomposes materially better than the standing broad one, at no
cost and with no code change.** Two of three nodes concrete and correctly located,
against none of five. This is the strongest lead the experiment has, and it required
neither new machinery nor a different model.

---

## Where the experiment stands after twenty-one runs

**tag-two is part of the causal loop of its own development.** The clearest single
instance is the eleventh run: a result observed in run 8 was written into the durable
graph with `tag record`, and the next run dropped the node that outcome concerned and
proposed the follow-on the outcome named — a sentence that existed in no file the
planner read, because it read nothing. Since then a complete cycle has run through the
graph rather than around it: the durable graph's only ready node named evidence quality;
`tag observe` was built to measure it; the measurement showed invented citations were
caused by supplying durable state; the citation guard was built and the rate went 7 of
10, 3, 3, 0; and each result was recorded back and carried across a replanning by
`tag adopt`.

**What tag-two now does that it could not before:** hold durable knowledge of work
actually performed and carry it across replannings; consult that knowledge when
planning; report what any run really did, which tools it called, which files it read
whole or truncated, and which of its citations name files it never opened; and refuse
its own output when the evidence does not check out.

**What it still cannot do:** decide when to run, change any code, form a hypothesis,
judge a result, or write an outcome. Every one of those is still a human's.

**What the controls establish, against the grain of the above:** the decomposition — the
thing this project exists to produce — has not improved in twenty-one runs. The
improvements are to research mechanics and honesty. A graph that cites only what it read
and still proposes finished work is more honest, not more useful.

**The strongest open lead is the cheapest one.** A bounded objective produced two
concrete, correctly located nodes out of three where the standing broad objective
produced none out of five, on the same repository, with no code change. The next
experiment should establish whether bounded objectives drawn from the durable graph's own
ready nodes decompose usefully, before anything is built to execute what they propose.

**A note left deliberately unfixed.** This file passed 40,000 bytes on the commit that
added the section above, so the planner now receives it truncated — the fourth time this
repository has outgrown its own reader, after the request budget at run 6, the README at
run 12, and the request budget again at run 17. The part it loses is the most recent part,
which is the part that matters most. It is recorded rather than patched because raising a
number has three times deferred this and never answered it, and because the honest next
move is to decide what durable knowledge a planner should be given at all — a question the
outcomes-versus-nodes result has already started answering and the next experiment should
finish. `tag observe` will report the truncation on any run it affects.

---

## The bounded-objective trial (runs 22–41)

The strongest open lead after twenty-one runs was a single pair of control runs: a
bounded objective produced two concrete, correctly located nodes out of three where the
standing broad objective produced none out of five. That pair was n=1 per arm, used a
hand-authored objective, and ran at a repository state that has no durable graph. This
trial tests the claim the lead was turned into: **that bounded objectives drawn from the
durable graph's own ready nodes decompose materially better than the standing broad
one.**

Twenty runs, one variable at a time, $0.11857 in total. The design was written down
before any run was made and is archived unedited at
[`examples/bounded-objective-trial/PREREG.md`](../examples/bounded-objective-trial/PREREG.md);
every run, accepted or rejected, is archived beside it under its arm label. No source
file was changed at any point in the trial.

Planner code, model, temperature and budgets were the shipped ones throughout. Every
HEAD run planned against a worktree of commit `f8470d0` and every SEED run against a
worktree of `e1e580e`, so within each state the repository, the accumulated prose and
the supplied outcomes were byte-identical across arms and the objective string was the
only difference. Nothing was committed until all twenty runs had finished.

| Arm | State | Objective | Runs | Graphs |
| --- | --- | --- | --- | --- |
| A broad | HEAD | *Make tag-two better at achieving its purpose.* | 3 | 1 |
| B bounded, drawn from graph | HEAD | *Investigate tool usage patterns.* | 3 | 0 |
| Bp bounded, graph title + reason | HEAD | title and reason of the same node, verbatim | 2 | 0 |
| C bounded, drawn from graph | HEAD | *Enforce evidence validation.* | 2 | 0 |
| D bounded, hand-authored | HEAD | *Reduce the chance that a planning run produces no usable output.* | 2 | 0 |
| E bounded, hand-authored | SEED | the same objective as D | 3 | 3 |
| F broad | SEED | the same objective as A | 3 | 2 |
| G bounded, hand-authored | SEED | *Reduce the number of model requests a planning run needs.* | 2 | 1 |

Arms B and C take the objective from the durable graph mechanically: it is the verbatim
title of a ready node (`dependsOn: []`), with a full stop. Nothing else from the node is
put in the prompt, because handing node bodies to the planner is the known mirroring
failure of runs 12, 13 and 18. Arm Bp adds the node's `reason` verbatim to test whether
the form of the title, rather than its brevity, was the problem. C's node has a recorded
outcome saying its work was done and the code implements it; it is in the trial
deliberately, to test whether a bounded objective stops the planner reproposing finished
work.

A node was scored **useful** only if all four held: it names a concrete locus rather than
a module to review; its citation, resolved against the actual file at that commit, points
at the thing it describes; the work is absent from the code at that commit and not
reported done by a recorded outcome; and doing it would move the objective that run was
given. Every citation in every run was resolved to its real file content before scoring.

### Result 1: a graph node cannot currently be used as an objective at all

**Seven of seven runs given an objective drawn from the graph produced no graph**, and
six of the seven died the same way — the planner rewrote the objective, and the echo
check rejected it.

| Run | Objective given | Objective returned |
| --- | --- | --- |
| B1 | Investigate tool usage patterns. | Investigate tool usage patterns in tag-two to improve decomposition quality. |
| B2 | Investigate tool usage patterns. | Investigate tool usage patterns in tag-two. |
| B3 | Investigate tool usage patterns. | Investigate tool usage patterns in tag-two |
| Bp1 | (title + reason, verbatim) | Investigate tool usage patterns to improve the planner's effectiveness |
| Bp2 | (title + reason, verbatim) | Investigate tool usage patterns to improve the planner's effectiveness |
| C1 | Enforce evidence validation. | **Make tag-two better at achieving its purpose.** |
| C2 | Enforce evidence validation. | **Make tag-two better at achieving its purpose.** |

The hand-authored bounded objective did not drift in any of the five runs that used it
(D, E), and the broad objective never drifted. Adding the node's `reason` did not help:
Bp drifted identically, twice. **A node title is a task label, not an objective, and the
model completes it into one.** Both C runs replaced the given objective with the
repository's own standing objective — the one written across the README, the experiment
log and the durable graph. This is mirroring reaching one level further than it ever has:
not the node bodies, not the evidence, but the objective itself.

That failure is mechanical, so it does not on its own say anything about decomposition
quality. The rejected answers are preserved, and they do.

### Result 2: at HEAD, narrowing the objective changed nothing worth having

Scoring the nodes of every HEAD run — accepted or rejected, guards ignored:

| Arm | Runs | Nodes proposed | Useful nodes |
| --- | --- | --- | --- |
| A broad | 3 | 7 | **0** |
| B + Bp + C bounded from graph | 7 | 28 | **0** |
| D bounded hand-authored | 2 | 4 | **0** |

**Zero useful nodes out of thirty-nine, in every arm.** The bounded arms did read
slightly more: B1 and B2 opened seven files each against the broad arm's three to six.
But what they proposed came from the prose, not the code. Of the evidence citations in
arms B and Bp, twenty-six name `README.md`, `EXPERIMENTS.md` or `notes/steward-log.md`
and ten name a source file; B3 and Bp2 read only the README and cited nothing else.
Two runs proposed *"Test bounded objectives for decomposition"*, citing the control
section of this file — they proposed the experiment they were part of, by reading the
paragraph that announced it. Arm C, whose objective named work the code already
contains, proposed that work again in both runs.

**Narrowing the objective did not make the planner investigate the relevant problem. It
made it paraphrase the part of the accumulated analysis that the narrower objective
pointed at.** That is the same defect as before, aimed more precisely.

### Result 3: at the seed state, the effect is real, replicates, and is not about breadth

Same scoring, at `e1e580e`, where no analysis of any run exists in the planner's input:

| Arm | Runs | Graphs | Nodes | Useful nodes |
| --- | --- | --- | --- | --- |
| F broad (+ the archived control A) | 4 | 3 | 14 | **0** |
| E bounded, names a failure (+ the archived control B) | 4 | 4 | 15 | **6** |
| G bounded, names a quantity | 2 | 1 | 5 | **0** |

The broad arm reproduced itself exactly: F1 and F2 are the same investigate-node-plus-
per-module-reviews shape as the first run and the control, and both propose work the seed
already implements while citing its implementation — F1's `add-validation-tests` cites
`test/tag.test.js:52`, which is the test that validates dependencies, and F2's
`enhance-html` cites the escaping function and the test that covers it.

The bounded arm found real things, three runs out of three:

- E2's `adjust-investigation-limits` cites `src/plan.js:8-11` — `MAX_REQUESTS`,
  `MAX_OUTPUT`, `MAX_CONTEXT_BYTES` — and says the limits may be too restrictive for
  reliable graph production. Runs 6, 17 and 21 later died on exactly those three
  constants.
- E3's `test-fallback-behavior` cites `src/plan.js:130`, the single line
  `if (!saving) await rm(output, { recursive: true });`, and proposes keeping partial
  output when validation fails. That is `failed-run.json`, which this project built ten
  runs later and now calls the highest-value mechanism in the repository.
- E2's `improve-validation-feedback` lands on the exact-match objective check at
  `src/graph.js:3-31`, which was later loosened because it was throwing away valid
  graphs over a full stop.

None of those three facts is stated anywhere in the seed repository's prose. They were
found by reading the code against a question.

**And then arm G refuses the simple reading.** *"Reduce the number of model requests a
planning run needs."* is just as bounded as E's objective, at the same commit, in the
same trial. One of its two runs produced no graph at all — it wrote prose before its
JSON, after eight requests and six files, the most expensive run of the trial. The other
read the README and nothing else, cited the README five times and no source file once,
and proposed *understand current planning*, *analyse usage*, *optimise research*,
*implement batching*, *test changes*: the broad arm's shape under a narrow objective.

So boundedness is not the active ingredient. What E's objective has and G's lacks is a
**failure with a locus in the code**: a planning run producing no usable output is
something the seed's source is full of — throw sites, limits, a validator, a line that
deletes the evidence — and a question about it can be answered by reading them. A
request count is a number with nowhere to look.

### What this trial establishes

1. **The hypothesis as stated is refuted.** Objectives drawn from the durable graph's
   ready nodes did not decompose better than the standing broad objective. They produced
   no valid graph in seven attempts, and their preserved answers contained no useful node
   in twenty-eight.
2. **The parent claim survives only in a narrower form,** and now with n=4 per arm rather
   than n=1: at a repository state carrying no analysis of its own runs, an objective
   naming a failure that can be located in code decomposes materially better than the
   broad objective — 6 useful nodes of 15, against 0 of 14 — and the broad arm's result
   replicates too.
3. **The dominant variable is not the objective. It is the repository state.** Every arm
   at HEAD scored zero. Every useful node in the trial came from the seed state. The
   accumulated prose is not merely something the planner mirrors when the objective is
   broad; it is strong enough to overwrite a narrow objective with the repository's own.

### Contradictory evidence and confounders, kept

- **G refutes "bounded is better" as a general claim.** It is preserved in full and it is
  the reason the surviving claim is narrower than the lead that prompted this trial.
- **A2 is the broad arm's one accepted graph at HEAD**, and one of its three nodes is
  *"Explore bounded objectives"* — the broad objective reaching the same topic the
  bounded arms were pointed at, by reading the same paragraph.
- **HEAD is not a fair comparison for "useful work exists".** Much of the obvious work in
  this repository is now done, so a zero at HEAD is partly the state having fewer easy
  gaps, not only the planner failing. The objective substitution in C1 and C2 and the
  26-to-10 prose-over-code citation ratio are not explained by that.
- **Scoring was not blind.** Citations were resolved mechanically against the real files
  before judgement, but a node's text usually reveals which objective produced it, so the
  useful/not-useful call is a human's and is stated as such.
- **Five runs of twenty produced no graph for reasons unrelated to any arm:** A3, D2 and
  F3 answered without reading anything at all (two requests, `list_files` only), and G1
  wrapped its answer in prose. Failure to produce output is common across every arm and
  every state.
- **The trial was run in parallel worktrees.** Nothing in the planner depends on the
  working directory beyond the repository it reads, but the runs are not serialised and
  provider-side conditions were not held constant across batches.

### Where the experiment stands after forty-one runs

The graph's recorded outcomes remain the one channel of durable state that has ever
caused the planner to say something it could not have read. The graph's **nodes** have
now been tested as a source of objectives and do not work as one: their titles are task
labels, the model rewrites them, and at the state where the graph exists the narrower
objective only aimed the mirroring more precisely.

The thing the trial found instead is about the objective's relationship to the code, not
its width — and it was found at a commit from before any of this machinery existed.

---

## The epistemic/control trial (runs 42–84)

The forty-one runs above improved research completeness, citation honesty, durable
state and observability, and did not improve `objective → useful task decomposition`.
A research note assembled from prior work in planning, agent control and scientific
reasoning proposed an explanation: that useful work may need to be derived from an
evolving epistemic state and an explicit next-operation decision, rather than generated
directly from a broad objective — and that choosing what kind of reasoning happens next
may be a separate problem from the domain objective. It also noted that the external
steward driving this project has in fact worked that way.

This trial tests that, against tag-two's own history, before anything is built. The
design was written down before any run and is archived unedited at
[`examples/epistemic-control-trial/PREREG.md`](../examples/epistemic-control-trial/PREREG.md),
with the per-cell judgements and their supporting quotations in `SCORES.md`, the
mechanical measures in `mechanical.txt`, and every run — including the ones that
produced nothing — beside them under its decision point.

Forty-three runs, $0.12764 in total. No source file was changed during the trial.

### Design

Six historical decision points, each a moment where a run had just produced evidence
and the steward's later response is known. At each one the world state is the
repository at the commit that run actually executed against — never the commit that
records the assessment of it — with that commit's own repository tools and its own
durable-state supply mechanism. The observation is `tag observe`'s mechanical report of
what the run did plus the answer it returned: what was in `.tag/` at that moment, with
no assessment and no later text.

| DP | State | The run | The steward's next step |
| --- | --- | --- | --- |
| DP1 | `1bbcc87` | run 2 | remove the read window: the run had been told, in terms naming the exact next call, that its view was incomplete, and did not paginate |
| DP2 | `216b7d1` | run 5 | instruct the planner to check the code first: it proposed complete research while citing its finished implementation |
| DP3 | `e2e94e5` | run 8 | build `tag record`: a node from tag-two's own graph was worked, refuted, and the result had nowhere to go |
| DP4 | `082883e` | run 13 | supply outcomes, not node bodies: handed the whole graph, the planner read one file and restated it |
| DP5 | `5506972` | run 18 | hide the durable graph from the file tools: the same state was arriving twice |
| DP6 | `b811801` | run 20 | run a control at the seed commit, where no analysis of any run is in the input |

Two primitives, crossed with whether the observation is supplied. **A** is tag-two's
shipped planner instructions, extracted from `src/plan.js` at run time so the arm cannot
drift. **B** keeps every earned constraint in A and replaces only "propose 3–6 tasks"
and the graph format with: state what is established, uncertain, contradicted and worth
investigating, then choose exactly one bounded next operation — investigate, test, act,
validate or stop — and say what uncertainty its result reduces. Model, temperature,
budgets, tools, supply and objective are identical across arms. The objective is the
standing one in every cell.

### Result 1: supplying the observation destroys the investigation, in both arms

Eleven of the twelve runs handed the observation up front answered in one request,
opened no file, and produced citations of which every single one named a file they had
not read. This is runs 11 and 13 again — handed an answer, the planner returns the
answer — with a mechanical report of a run in place of a durable graph. The shipped
planner already withholds durable state until a file has been read; the trial's first
two arms did not, which was a control failure on my part and is recorded as Deviation 1
in the pre-registration. Two further arms, **Ag** and **Bg**, gate the observation
behind a first read exactly as the planner gates durable state.

| Arm | Observation | Runs that read nothing |
| --- | --- | --- |
| A0, B0 | none | 2 of 14 |
| A, B | supplied up front | 11 of 12 |
| Ag, Bg | gated behind a first read | 8 of 17 |

Gating recovers the investigation only partly, and the arms that were given no
observation at all read by far the most: 33 files across six A0 runs, against 10 across
ten Ag runs. **On this evidence, handing a model a report of what just happened costs
more research than it buys**, whenever it arrives.

### Result 2: the primary measure refutes the hypothesis as stated

Each output was scored on whether the operation it chose would have produced what the
steward's actual next step produced. Arm A was scored generously, taking the best of its
three to five nodes against arm B's single operation.

| Arm | Observation | Primary total (max 12) | Target discrepancy named |
| --- | --- | --- | --- |
| A0 | none | 2 | 0 of 6 |
| A | up front | 1 | 0 of 6 |
| Ag | gated | 0 | 0 of 6 |
| B0 | none | 2 | 1 of 6 |
| B | up front | 0 | 0 of 6 |
| Bg | gated | 2 | 1 of 6 |

The pre-registered rule required the epistemic arm to exceed the direct arm by at least
four points and to win at four or more of the six decision points. It exceeds it by two
and wins at one. **Milestone A is not reached and the hypothesis as operationalised is
refuted.** Five of the six decision points produced nothing in any arm.

### Result 3: the one positive signal is mirroring, and the check that found it matters

At DP2 both epistemic runs named the contradiction exactly — *"README.md describes
research completeness as an open problem while code implements it"* — and all three
direct runs committed it, proposing complete research while citing
`src/repository.js:78-95`, its own implementation, as the evidence. That asymmetry is
3–0 against and 2–0 for, and it looked like the result the trial was built to find.

`README.md` at `216b7d1` says it first:

> *"Ensure complete research before decomposition"* proposes work that was already
> finished in the code the agent had just read in full

and thirty lines later names the steward's actual next change as a suggestion:

> whether it needs a different operation — for example asking the agent to reconcile
> written claims against code before proposing work

The epistemic arm read that paragraph and paraphrased it into a `contradicted` field.
The advantage is a better-shaped mirror, not better reasoning. What survives is the
narrower and stranger half: **the direct arm read the same paragraph and proposed the
work it warns against anyway.** Being asked for a list of tasks appears to select the
task list out of the prose and leave the assessment beside it unread; being asked for a
contradiction selects the assessment. Neither is analysis.

### Result 4: the answer was one unopened file away

DP3 was declared in advance as a contaminated positive control, because
`notes/steward-log.md` at that commit already names "nothing reads a graph back" as the
largest gap between the project's purpose and its implementation. **No run in any arm
opened that file.** Six runs listed it and none read it. Every arm instead proposed
expanding tool usage — the work the supplied observation reports as having just been
refuted.

### What this trial establishes

1. **The epistemic/control hypothesis, in the smallest form that could be tested, is
   refuted.** An explicit epistemic state plus a single bounded next-operation decision
   did not out-decide direct decomposition against six real historical moments, on the
   primitive's own pre-registered measure.
2. **Both primitives fail in the same place, and it is not the output shape.** Neither
   noticed five of six discrepancies; both proposed already-completed work; both
   preferred the salient paragraph to the code. Changing what the model is asked to
   produce did not change what it notices.
3. **The observation channel is a liability, not an asset.** Supplying a run's own
   result, in the most mechanical and least interpreted form available, suppressed
   investigation in both arms. This is the third distinct kind of durable state — node
   bodies, recorded outcomes, and now a run report — and the second to suppress research
   when supplied up front.
4. **Objective substitution was never once observed in this trial.** Every one of the 38
   parseable answers, across both primitives and all six states, returned the standing
   objective unchanged. The substitutions seen in the bounded-objective trial were
   caused by the objective being unusual in that repository, not by the planner's
   general habits.

### Contradictory evidence and confounders, kept

- **Deviation 1 was my error, not the model's.** The first twelve observation runs are
  archived and reported, and they are the reason the gated arms exist.
- **Five runs of forty-three ended with an empty provider response** — no tool calls, no
  content, `finish_reason: null` — at the second request, on message sequences identical
  to runs that proceeded normally. Four recovered on a replicate. DP1/Ag failed three
  times running and is reported as a null cell rather than as a zero.
- **A0 scored as well as any epistemic arm.** The shipped primitive, given no
  observation at all, produced the trial's other two points. The treatment never beat
  the control the project already ships.
- **Scoring was not blind**, and could not be: a graph and an epistemic state are
  distinguishable at a glance. Every judged call is quoted in `SCORES.md` so it can be
  overturned.
- **Six decision points is a small sample**, and five of the six scored zero in every
  arm, so the trial discriminates poorly between two primitives that are both failing.
  A larger sample would measure that failure more precisely; it would not change the
  decision, which requires an advantage this data does not contain.

### The strongest remaining explanation

Across sixty-three runs and three trials, every mechanism aimed at the *input* — how much
is read, how completely, how it is cited, what durable state is supplied and in what
form — has improved that mechanism and left decomposition alone. Every mechanism aimed at
the *output shape* — a task graph, now an epistemic state and a control decision — has
also left it alone. The one variable that has ever moved the measure is the objective's
relationship to the code, at a repository state carrying no analysis of itself.

What has not been tested is whether this model, in a single bounded call, can notice a
discrepancy it has not been told about at all. Every "noticing" this project has
recorded — including the best one in this trial — has turned out to be a paraphrase of a
sentence in the input. That is the question the next experiment should isolate, and it
is a question about the model, not about tag-two's architecture.

## The human-directed loop (runs 85–88 and eighteen checks)

The question changed before this trial. Every previous one treated external human
intervention as scaffolding to be progressively removed, and the steward log is written as a
list of things tag-two cannot yet do for itself. The steward was asked to stop assuming that:
keeping human intent in control of execution is part of the point, and what should shrink is
unnecessary human *cognitive labour* — re-explaining context, remembering what happened,
diagnosing mechanical details, carrying conclusions between runs — not human judgement.

So the test became: given meaningful human input, can tag-two turn it into grounded, bounded
progress, preserve what is learned, and make the next interaction easier without the human
reconstructing the problem?

### Failure 1: ingesting a human sentence corrupted the graph

The first input was a real steward observation: *"this keeps proposing work we've already
done."* tag-two had exactly one way to put anything into durable state, `tag record`, and it
demands a node id. Forced through it, the sentence:

1. had to be attached to a node it is not about, because the human must name one;
2. reached the planner as `Work already performed on this objective, recorded by a human
   after observing what each attempt actually did: - Investigate tool usage patterns (…):
   this keeps proposing work we've already done` — an unverified observation relabelled as an
   established completed-work result about a different topic;
3. made the rendering say **"3 tasks · 0 ready · 0 dependency-blocked · 3 worked"**. Nobody
   had worked anything. One human sentence made the durable graph assert something false.

`tag input` was added for that: `{at, from, kind, text}` held on the graph beside the
outcomes, attached to no node, marking nothing worked, carried across `adopt`, rendered in its
own section. `kind` is the author's own label — nothing interprets or checks it.

### Failure 2, and what the planner did with the observation

Stored input that nothing reads changes nothing; that is the failure `record` had already
demonstrated for outcomes, when run 9 reproposed the node whose outcome refuted it. So input
was supplied to the planner on the same gated channel as outcomes — withheld until the run has
really read a file — but labelled as a claim to check or an authoritative human direction
rather than as work already performed.

Two runs were pre-registered before either was made. Same commit, same objective, same
budgets; run 85's durable graph carried no input, run 86's carried the observation. The
durable graph is excluded from the planner's file tools, so the supplied message is the only
difference that reaches the model.

| | run 85 (control) | run 86 (observation supplied) |
|---|---|---|
| requests / files read | 3 / README.md only | 3 / README.md only |
| invented citations | 0 | 0 |
| nodes | 5 | 6 |
| proposed work the outcomes already report | 1 | 4 firm |
| conflict reported | none | none |

The observation reached the answer — run 86's summary says "the planner often proposes work
already done or mirrors accumulated context" and run 85's says nothing of the kind — and made
the output **worse on the exact thing the observation was about**. The control even proposed a
node for it (`implement-outcome-checks`); the treatment proposed none. Neither run named a
single already-implemented thing with a citation to the implementing code; every citation in
both is a README line range.

**Established: the planner cannot answer a claim about its own output.** It is structurally
unable to — the durable graph is hidden from it — and its job is to propose, not to check.

### `tag check`, and what it found

The claim was checkable, so it is checked rather than argued about. `tag check` asks one
bounded question about one graph — for each proposed task, do the recorded outcomes already
report it as done or refuted — with no tools, no proposals and no mutation. A "done" finding
must quote an outcome word for word, and the quote is looked up in the outcomes rather than
trusted, the same discipline as the evidence-citation guard. An unfound quote is reported as
unverified, not repaired and not dropped.

The steward wrote down a judgement of all three graphs *before building it*. Run against the
durable graph, for $0.00084 and one request, it reported all three nodes already done or
refuted, each with a verbatim quote, agreeing with that pre-committed judgement 3 of 3 and
8 of 10 across the three graphs.

**The whole path, for one human sentence:** observation → `tag input` → supplied to run 86 →
measured failure against a control → `tag check` → 3 of 3 nodes stale with quotes, $0.00084 →
`tag input` from the tool → visible in `graph.html`. The steward never read an outcome
paragraph to get that answer.

### Continuity: what carried, and what did not

Run 87 was then planned with the observation and the check's finding in durable state. Its
graph contains this, in the reason for a node:

> The system currently proposes tasks that have already been completed or refuted, **as
> evidenced by the steward's observation and the tag check**.

That run is a stateless OpenRouter call. It has no transcript, no memory of the session and no
access to the durable graph as a file. Everything it knew about either came through
`inputs`. **Established: durable human input and durable tool evidence reach a fresh agent and
shape what it proposes.** That node was also the only one of five the check did not flag.

What did not carry is the correction. Run 87 reproposed `test-bounded-objectives`, which run
86 had proposed and the check had contradicted with a verbatim quote; run 88 reproposed
`reduce-mirroring` and `test-independent-noticing` the same way. **Preserving the evidence did
not stop the repetition it documents.** What works is the checking, not the remembering: the
check re-detects it every time for a tenth of a cent, so the human no longer has to notice.

A human *intent* was then recorded — that human involvement is not scaffolding to eliminate —
and run 88 planned with it. It read `EXPERIMENTS.md` as well as the README, took five requests
and $0.0129, and proposed nothing that would remove the human. But it left no trace of the
intent at all, and it did not report the conflict between that intent and the README's own
standing aim, "the graph should eventually contain the work required to remove humans from the
parts of the graph where they add no value", in a file it had just read whole. **An intent
that is not violated is not the same as an intent that is in control, and a contradiction
sitting in the input was not surfaced.**

### One human question, fourteen grounded operations

The steward then asked one question — has supplying durable state made the planner propose
more work the record already reports? — and did no further work on it. Every archived graph
was checked against only the outcomes that existed when it ran, so nothing is judged against a
result recorded after it.

| arm | graphs | nodes already reported done or refuted |
|---|---|---|
| handed the durable outcomes | 11 | 24 of 47 |
| same era, not handed them | 3 | 4 of 14 |

Total cost $0.00738. **Not established**: the control graphs planned against a different
commit, n=3, the check varies by about one node per graph between identical calls, and runs
that mirror outcome vocabulary are easier to match against outcome sentences — that mechanism
alone could produce the gap. What is firm is the supplied arm's own number: **roughly half of
everything the planner proposes, while holding the record in its input, is work that record
already reports.**

### What the check cannot do, found by a human reading its output

Two of three "done" verdicts on run 88 quote *"ESTABLISHED: twenty runs of work improved
research completeness and citation honesty and did not improve decomposition; the apparent
improvement seen on this repository was mirroring of accumulated context"* — a sentence
reporting that mirroring happens, not that reducing it was done. Run 85's
`implement-outcome-checks` was flagged with the citation-guard outcome, which is a different
check. **A verified quote proves the sentence exists, not that it supports the finding.**

This was not fixed. It is not mechanically fixable — support is semantic, and tuning the
prompt until the examples pass is the thing this project does not do — and printing the quote
makes it a two-second human adjudication instead of a re-reading of seven outcome paragraphs.
It was recorded as a steward correction instead, and it is the reason `tag check` is a report
and not a gate.

### What this trial establishes

1. **A human sentence can travel through durable machinery into grounded, cited, bounded
   work.** One observation produced a measurement of the durable graph's own staleness for
   under a tenth of a cent, and that measurement agreed with the human judgement written down
   before the mechanism existed.
2. **Durable input causally reaches stateless agents.** Run 87 cited the steward's observation
   and the check in a node's reason, with no transcript and no access to the graph.
3. **Preservation is not correction.** Three consecutive runs reproposed work the record — in
   their own input — reports as done. Detecting it afterwards works; preventing it does not.
4. **Intent is preserved but not yet in control.** It was stored, carried and not violated,
   and it left no trace in behaviour and produced no conflict report against the README
   paragraph that contradicts it.
5. **The division of labour that worked is retrieval by machine, adjudication by human.** The
   check finds candidates and their provenance; the human overturns the unsupported ones at a
   glance. Neither half is sufficient alone.

### Contradictory evidence and confounders, kept

- **Two of six planning runs returned an empty provider response** — `answer: null`, no tool
  calls, at the second request, on message sequences identical to runs that proceeded. Both
  were re-run once under the rule the epistemic trial wrote down for apparatus failures, and
  both are archived. Two in six is a much higher rate than the five in forty-three that trial
  saw; nothing in this trial explains it, and the failures happen before any durable state is
  supplied, so the new channel cannot be the cause.
- **The failure message is wrong in that case.** It says "proposed a graph without reading
  repository evidence" when the model proposed nothing at all. Noted, not fixed.
- **`tag check` is not deterministic.** Run 87 scored 4 of 5 and then 3 of 5 on identical
  input; run 88 scored 3 of 5 and then 2 of 5. Every count here is ±1 per graph.
- **Run 88 is one run and an expensive one.** It read `EXPERIMENTS.md` whole, which no other
  run in this trial did, and cost three times any other. Its behaviour may be about what it
  read rather than about the intent it was given.
- **The steward wrote `check.js` and the sweep harness.** The mechanical *investigation* moved
  to the machine; the mechanical *building* did not move anywhere.

### Milestones

**Milestone A — reached.** One human observation travelled through durable state and caused a
grounded, quoted, cited operation whose result the human would otherwise have produced by
reading three nodes against seven outcome paragraphs. The causal path is above and every step
is in `graph/graph.json`.

**Milestone B — reached, narrowly.** Seven turns are held in the durable graph, interleaving
steward and tool. Something preserved demonstrably changed later behaviour in a stateless run,
quotably. The qualification is that the effect is reflection of current human input, not
retention of a correction: the same flagged work came back twice more.

**Milestone C — not reached, and the trial stopped there.** Two of its criteria fail outright.
*Mechanical work does return to the human*: every line of code, the sweep harness, and the
adjudication of every unsupported quote were the steward's. *tag-two never asks for
judgement*: it has no operation for it, and across seven turns it never once said that
something needed a human — including when its own durable graph became exhausted, which the
steward had to notice and act on.

## The task-runner trial (three task episodes, no planner runs)

The question changed again, and further than last time. Every trial above treats tag-two as a
system that turns an objective into a task graph, and measures the graph. This one provisionally
treats it as something narrower: a persistent, human-directed task runner that could sit underneath
a control plane which already owns why and what. The control plane decides what is worth doing and
keeps product judgement and reserved decisions; the runner takes one bounded authorised task and
carries the mechanical episode — investigation, checks, work, validation, evidence, durable state —
returning when judgement is required.

Three real episodes were run against this repository. No planning run was made in this trial and
the planner was not used, because no episode needed it. Every primitive below exists because an
episode stopped without it, and each is named with the failure that earned it.

### What the first episode hit before it could start

The task was supplied as a control plane would supply one: a statement, constraints, a completion
condition, and the decisions reserved for the human. tag-two had nowhere to put it.

- Through `tag input` it became an eighth undifferentiated sentence on the durable graph, whose
  objective is *"Make tag-two better at achieving its purpose."* — a different objective. It
  carried no identity, no completion condition and no state, so nothing could say whether it was
  open, blocked or done.
- Through `tag record` it became an outcome on an unrelated node, and the rendering then reported
  **"3 tasks · 0 ready · 0 dependency-blocked · 3 worked"** for work nobody had performed. This is
  the same corruption one human sentence caused in the previous trial, reappearing one level up.

`tag task open` followed. Then the first bounded operation produced a result, and `tag record`
refused the task outright — *"Expected the original objective, a research summary, and 1–8 nodes"* —
leaving `intent` as the only slot, which files a machine's unverified finding as human direction.
`tag task op` followed. Then `op` accepted `npm test: 9999 passing, 0 failing, exit 0` for a command
that was never run. `tag task verify` followed, and `tag task close` with it, because the episode's
own completion condition said agent self-report does not count.

### The three episodes

| | episode 1 `readme-limits` | episode 2 `adopt-evidence` | episode 3 `tuned-tolerance` |
|---|---|---|---|
| shape | investigation, code change, validation | investigation against doctrine | correction against episode 1's own work |
| operations recorded | 4 | 6 | 10 |
| of those, executed commands | 2 | 5 | 8 |
| failures kept in the record | 0 | 1 | 2 |
| human asked | no | **yes** | no |
| outcome | closed on evidence | closed on evidence after a ruling | closed on evidence |

**Episode 1.** Six numeric limits the README states — request budget, output tokens, serialized
request bytes, the `read_file` bound, the price caps, the file-size exclusion — had never been
compared to the code. `test/documented-limits.test.js` compares each documented number with the
constant as written in source, importing nothing from `src/` because the task forbade changing the
thing under test. All six matched, so nothing was corrected; the check fails with exactly one
failing test when `160,000` is altered to `150,000`. Both halves are recorded as executed commands.

**Episode 2.** The project's stated doctrine is that an outcome is evidence about work that really
happened and must outlive the node that proposed it. `tag adopt` violated it two ways, both
reproduced by scripts using only documented commands on unedited archived planner outputs: with no
evidence on the durable graph the replacement's outcomes and inputs were **deleted while adopt
printed "carried 0 recorded outcomes"**, and with evidence on both the replacement's was dropped
silently. What to do instead was not settleable by investigation — refusing, merging and
documenting a precondition are all defensible and mean different things about what a durable record
is — so tag-two asked, for the first time in its history.

**Episode 3.** A review finding against episode 1's own artifact: its worst-case cost assertion
allowed one cent of difference and passed with **$0.000848 of that cent unused**, so the allowance
had been chosen after seeing the value it had to admit. It is replaced by the precision the README's
own figure claims — half of its last written digit — which nobody chooses. That bound immediately
rejected the documented `$0.68` against a computed `$0.689152`, and the constraint carried from
episode 1 settled the correction without anyone being asked: the text became `$0.69` and no code
constant moved. **Episode 1's tuned tolerance had concealed a real error that episode 1 was
supposed to find.**

### Result 1: durable state alone carried a stateless agent through every episode

Each closed episode's `tag task show` output was handed to a stateless OpenRouter call with no
repository, no tools and no transcript, and asked what was requested, what was established and by
what evidence, which operations failed, what the human was asked and said, what remained unresolved
and where control sat. All three answers were correct on every point, including that episode 2's
operation 4 failed to a shell bug and was superseded by operation 5, and that episode 3 was settled
by a carried constraint rather than by asking. Total cost for the three: **$0.00327**.

### Result 2: the failures the record kept are the evidence that it is a record

Three recorded operations are failures, and none of them was the code under test. Two were the
steward's shell bugs — a `tail` that swallowed an exit status, and broken quoting in a regex — and
one was a mis-specified control that called a true coarser claim drift. In each case `tag verify`
recorded the non-zero exit rather than the account that came with it, and in one case `close`
refused a close that cited a failing operation. **The episode could not be talked to a finish.**

The mis-specified control is worth its own line: perturbing `$0.69` to `$0.7` is *not* caught,
because `$0.7` is a true statement about `$0.689152` at the precision it claims. The check was
right and the control was wrong. The real property — a vaguer figure is a weaker claim and so a
weaker check — is the honest cost of taking a bound from the text rather than picking one, and it
is now written into the test.

### Result 3: what a human was asked, and what came back

One question was asked in three episodes, and it was a real one. The answer was **a delegation, not
a ruling**: *"I don't understand the implementation consequences well enough to choose. Give me your
recommendation and I'll normally accept it."* `tag task answer` stores an answer in the words it
arrived in and does not interpret it, which is the only reason that distinction survived: a
mechanism that recorded answers as decisions would have filed a statement about the human's own
uncertainty as a ruling on `adopt`. The recommendation was made with its consequences, the ruling
came back separately, and both are on the question they answer.

Episode 3 is the control for that. It had a reserved decision of exactly the same shape — whether to
change the documentation or the code — and did not ask, because the constraint carried from episode
1 already supplied it as durable intent. **Intent that was supplied once decided a later episode
without being re-explained.** That is the thing every previous trial failed to demonstrate: in the
human-directed loop a recorded intent was preserved, never violated, and left no trace in behaviour.

### What this trial establishes

1. **A bounded task can be carried end to end in durable state, and a stateless agent can pick it
   up from that state alone.** Three episodes, twenty recorded operations, fifteen executed
   commands, three correct stateless readings for a third of a cent.
2. **Evidence stops being a claim when something runs it.** `verify` records the machine's exit
   status; `close` refuses to complete on anything else; three failures survive in the record
   because nothing could overwrite them with a better story.
3. **tag-two can now reach a human judgement boundary and say so.** It did, once, correctly, and
   did not ask in the two episodes where investigation or supplied intent settled the question.
4. **Supplied intent became causal.** Episode 3's correction was decided by episode 1's constraint
   with no human in the loop and no re-explanation.
5. **A check tuned to pass its own example conceals exactly what it was built to find.** Episode 1's
   one-cent tolerance hid a real documentation error for the length of one episode. The finding came
   from reviewing the artifact, not from the artifact.

### Contradictory evidence and confounders, kept

- **The planner was not used at all.** Nothing here tests, improves or rehabilitates it, and nothing
  here shows that a task runner without it is sufficient for tasks a human did not already scope.
- **Every bounded operation was performed by the steward or by a shell command.** tag-two has no
  operation that investigates anything: it holds state, runs what it is told and refuses bad closes.
  Whether that is the right division or merely the division that was easy is not established.
- **The three episodes were chosen by the steward, from this repository, knowing its code.** A
  control plane choosing a task it does not already understand is the untested case.
- **Two of the three episodes were made possible by defects the steward had already noticed while
  reading the source.** Episode 2's reproduction confirmed mechanically what a reading had
  suggested; the reading was not the machine's.
- **`brought` counts merged evidence by subtraction**, so a duplicate on both graphs reduces it. It
  reports what was added, not what was offered.
- **One question is one observation.** That tag-two asked at the right moment once does not show it
  would not ask at the wrong moment, or fail to ask at another right one.

---

## The Harbour runner trial (two task episodes, no planner runs)

These two episodes were run against a *different* repository, so they are not dogfood runs and are
not written up in the sequence above. They are the last evidence gathered before 0.1.0, and the
reason the task runner rather than the planner is the released interface. The full account is in
[`docs/notes/steward-log.md`](notes/steward-log.md); the durable state is in
[`tasks/lin-1856.json`](../tasks/lin-1856.json) and [`tasks/lin-2562.json`](../tasks/lin-2562.json),
and the harness that drove them — instrumentation, deliberately not a capability tag-two has — is
[`examples/harbour-runner/runner.mjs`](../examples/harbour-runner/runner.mjs).

Two real tickets were selected from their titles, opened as tag-two episodes, and then carried by
repeated stateless model decisions given nothing but `tag task show` and a shell in an isolated
clone. Across the two, the steward chose **none** of the operations — the first time in the project.
Both reached verified completion: 31 recorded operations, 10 of them commands run by `tag verify`,
3 of which failed and stayed in the record.

What the runner did unprompted: investigated before acting every time; discovered that the ticket's
line numbers had drifted and recovered; reproduced a ticket's own premise by mutation before
trusting it; caught its own mutation as unfaithful after reading the route's guard; noticed that
running two test files in one command proves only that one of them failed, and re-ran them
separately; and read a whole-suite failure as pre-existing by comparing it against a recorded
baseline.

What it got wrong, preserved rather than rescued: it fabricated once, reading an empty stdout as
"the array is empty" — the harness had omitted the empty-stdout line, so nothing in state
contradicted it. It re-proposed a command whose syntax error was two operations above it. It re-ran
passing verifications four times. It escalated to the human once with no question attached. And
neither episode ever reached its reserved decisions: both completion conditions were satisfiable
without them.

Two source changes came out of it, each named after the failure that earned it: multi-line questions
and results are now indented under their labels in `showTask`, and a refused close is recorded as an
operation. Both are in [`DESIGN.md`](../DESIGN.md).
