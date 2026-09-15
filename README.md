tag-two

«A tiny experiment in persistent, agent-assisted problem solving.»

## Run the seed

Requires Node.js 22+ and Git. There are no package dependencies or build step.
From a Git repository's root, set `OPENROUTER_API_KEY` in your environment (never
in a tracked file), then run:

```sh
node /absolute/path/to/tag-two/bin/tag.js plan "Make tag-two better at achieving its purpose."
```

An optional final argument selects another repository root. To use the shorter
`tag plan "objective"` command, run `npm link` in the tag-two checkout first.
Run the offline tests with `npm test` in that checkout.

The planner uses one OpenRouter model, `deepseek/deepseek-chat-v3-0324`, with
read-only tools to list/read/search tracked text files and inspect recent commit
subjects. `read_file` returns a whole file in one call, bounded at 40,000
characters; anything longer reports the exact line to resume from. The model chooses what to investigate; no source excerpts are selected
in advance. Add new source files to Git before planning. It cannot execute shell
commands, run tests, modify source, or work on the proposed tasks. Its claims about
what works are therefore explicitly unverified unless repository evidence supports them.

**Data boundary:** the objective and model-requested repository content are sent to
OpenRouter and its model provider. Use only repositories you are authorized to
share. Untracked files, common credential paths, symlinks, binary files and files
larger than 256 KiB are excluded; these filters are not a secret detector. Review
tracked content for embedded secrets before using the planner.

After investigation, open `.tag/graph.html` directly in a browser. It shows the
objective, research summary, task reasons and evidence, linked dependencies,
ready/blocked tasks, and the tool results behind the plan. `.tag/graph.json` is the
durable, provider-independent graph; its `run` field records model provenance,
reported cost (or null when unavailable), and investigation history.

The graph is a proposal, not an execution queue: “ready” means no graph dependencies,
and a human decides what happens next. Nothing runs automatically afterward.
Both outputs stay local and are Git-ignored via a generated `.tag/.gitignore`,
including when planning in another repository, because they may include repository
content. Existing `.tag` directories are never overwritten: preserve or move a
previous experiment explicitly before starting another.

The seed allows at most ten model requests, 4,096 output tokens per request and
80,000 serialized request bytes. It checks model pricing and caps provider prices
at $0.50/million input tokens and $1.50/million output tokens, with no per-request
fee. At these limits, even conservatively counting each request byte as an input
token leaves the run below $1 (roughly $0.47 before small protocol overhead).
Unavailable models, higher prices, network errors, exhausted limits or invalid
graphs stop the run without automatic retries, JSON repair or fabricated tasks.
A matched markdown fence around the answer is removed before parsing, which is an
envelope, not repair: malformed JSON, prose around the JSON, a drifted objective and
any invalid graph are still rejected. A run that fails after investigating anything
writes `.tag/failed-run.json` with the transcript, the raw answer, the request count
and the reported cost, and keeps the directory so the failure can be diagnosed.
An output write failure can leave a partial `.tag` directory; inspect it before
moving it aside.

The first dogfood run should use the objective above exactly once. Inspect its
unedited graph for usefulness rather than rerunning until the answer looks good.

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
a test named for that behaviour. The agent proposed it because this README still
described the gap as open at the time of the run. **Prose state outranked code state.**
For a system meant to improve itself, that is the sharpest finding so far: the graph's
usefulness is bounded by how current the project's written state is, and stale
documentation reliably produces already-completed tasks.

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

---

Why this exists

Modern coding agents are remarkably capable when given a well-defined task.

The harder problem is deciding what should be done next.

Real projects are rarely a queue of perfectly specified independent tickets. An objective may require research before implementation. Research may reveal new work. Tasks may depend on other tasks. Some questions require humans. Some approaches fail. Priorities change as evidence accumulates.

"tag-two" explores a simple idea:

Represent that evolving understanding as a persistent graph, and let agents help investigate and evolve it.

The graph is not primarily a backlog.

It is the system's current model of the problem.

---

The core idea

Start with an objective:

«Improve tag-two.»

An agent investigates the relevant repository and problem using its normal tools.

It then constructs a small graph representing useful next work:

Improve tag-two
│
├── Understand current behaviour
│
├── Investigate an important uncertainty
│
├── Improve a demonstrated weakness
│   └── depends on investigation
│
└── Demonstrate the improvement

The graph persists independently of any model conversation.

Later, a node can be investigated or worked on by another agent. Its result changes the graph.

Over time:

objective
    ↓
investigate
    ↓
graph
    ↓
choose useful work
    ↓
agent works
    ↓
observe result
    ↓
update graph
    ↓
repeat

Initially, humans may perform some of those transitions manually.

That is intentional.

The experiment is to gradually discover which parts are useful to automate rather than designing the complete autonomous system in advance.

---

The hypothesis

A useful agent system does not necessarily need one enormous autonomous context.

Instead, it can maintain durable external state describing:

- what we are trying to achieve;
- what we currently believe;
- what has been discovered;
- what remains uncertain;
- what work is available;
- what depends on what;
- what has already happened;
- where a human is required.

Agents can then operate on bounded pieces of that state.

This potentially allows different agents, models, tools and humans to collaborate without requiring a single continuous conversation.

The persistent graph is the continuity.

---

The most important principle

The graph is the product.

Internal state is only useful if a human can understand it.

At every meaningful stage we should be able to inspect the graph and answer:

- What is the objective?
- What does the system currently think needs doing?
- Why?
- What has it learned?
- What is runnable now?
- What is blocked?
- What depends on something else?
- Where is human input required?
- What changed recently?

A JSON representation may be the durable format.

It must not be the primary human interface.

Even a crude HTML representation is preferable if it makes the system understandable at a glance.

---

What a node represents

A node represents a meaningful part of the system's understanding of the problem.

A node may eventually represent things such as:

- work;
- investigation;
- a question;
- evidence;
- a decision;
- an outcome.

Do not build an elaborate type system until the implementation needs one.

For the first version, a node can be extremely small.

For example:

{
  "id": "research-current-behaviour",
  "title": "Understand current planning behaviour",
  "reason": "We need evidence about the current behaviour before changing it.",
  "dependsOn": []
}

Add fields only when a demonstrated use case requires them.

---

Research before decomposition

One of the strongest lessons from the original TAG experiment is that decomposition quality depends on research quality.

A model shown a handful of arbitrary source excerpts will tend to generate work related to those excerpts.

That is not necessarily the same as work important to the objective.

For example, an objective such as:

«Improve TAG»

previously produced locally plausible tasks involving protocol fields, validation edge cases and CLI parsing.

Those tasks were not necessarily wrong.

The problem was that the system had insufficient understanding to know whether they mattered.

Therefore:

Do not confuse code inspection with understanding the objective.

Before decomposing a broad objective, an agent should be able to investigate enough context to understand:

1. what the project is trying to achieve;
2. what currently exists;
3. what currently works;
4. what has already been attempted;
5. what important uncertainties remain;
6. what would constitute meaningful progress.

The agent should use normal repository tools where possible:

- read files;
- search;
- inspect documentation;
- inspect tests;
- inspect relevant history;
- run safe/read-only commands where appropriate.

Do not recreate a coding agent's repository exploration abilities by manually assembling arbitrary source excerpts unless there is a demonstrated reason to do so.

---

Agents are capabilities, not the state

An agent may be:

- a hosted coding agent;
- a model accessed through an API;
- a local model;
- a human;
- another orchestration system.

The graph should not depend on the conversational memory of any particular agent.

A fresh agent should be able to understand the relevant work from durable project state plus whatever repository/environment access it is given.

This means:

«Worker handoffs may be stateless. Durable project understanding cannot be.»

The graph owns continuity.

Agents temporarily contribute reasoning or work.

---

Human involvement is normal

Human intervention is not a failure mode.

Especially during bootstrap, a human may:

- choose which node to work next;
- reject a poor decomposition;
- answer a question;
- approve a risky action;
- select an agent or model;
- inspect an outcome;
- decide whether evidence is sufficient.

If an agent lacks a permission or capability, surface that boundary.

Do not silently invent workarounds merely to preserve the appearance of autonomy.

The goal is useful orchestration, not maximum autonomy.

---

Bounded agent work

Agents should usually receive bounded work.

A useful pattern is:

inspect
→ perform one meaningful action
→ report what happened
→ update durable state
→ stop

Avoid agents implicitly continuing through an unlimited chain of work merely because more work is available.

This makes behaviour easier to understand, review and recover.

The appropriate boundaries should emerge through experimentation rather than being specified completely now.

---

Model choice

Different graph nodes may eventually benefit from different models.

For example:

- decomposition may favour concise instruction-following;
- difficult implementation may favour a strong coding model;
- summarisation may use a cheap model;
- research may require stronger reasoning or larger context.

Do not build model routing yet.

Start with one model/agent that works.

Model selection becomes part of the system only when there is evidence that it provides meaningful value.

One lesson from the original TAG experiment was that stronger reasoning is not automatically better for every operation.

A reasoning-heavy model repeatedly exhausted a structured planning output budget before producing valid JSON. Disabling reasoning for that bounded structured-planning call produced a valid graph using substantially fewer output tokens.

The broader lesson is:

Use model capability appropriate to the operation rather than simply maximising reasoning effort.

---

Cost

Cost matters, particularly if graphs eventually create many agent calls.

But cost optimisation is not the first experiment.

First establish that the system produces useful work.

Then measure.

Then optimise.

Cheap and free models are interesting because sufficiently bounded graph nodes may allow smaller models to perform useful work.

That is a hypothesis worth testing later.

Do not compromise the initial demonstration merely to make it free.

---

What we learned from the original TAG

An earlier implementation explored many of these ideas.

It included concepts such as:

- persistent graph state;
- graph revisions;
- generations;
- structured graph mutations;
- strict proposal validation;
- controller/worker separation;
- execution limits;
- token and cost accounting;
- model allowlists;
- provider routing;
- research-context construction;
- worker packages;
- acceptance gates;
- persistent history;
- HTML graph rendering.

Many of those ideas may eventually be useful.

They are not requirements for tag-two.

The original experiment taught us that it is easy to build sophisticated orchestration machinery before proving that the central loop is useful.

Several experiments became dominated by debugging the orchestration infrastructure itself:

- model availability;
- provider routing;
- reasoning-token behaviour;
- output-token ceilings;
- strict JSON proposal validation;
- research-context selection;
- controller-state transport;
- protocol/status compatibility.

Meanwhile the question we actually cared about was much simpler:

«Can the system investigate an objective and produce a useful graph that we can see?»

"tag-two" starts again from that question.

---

Things we deliberately do not know yet

We do not yet know the correct:

- graph schema;
- node taxonomy;
- scheduling algorithm;
- mutation protocol;
- execution protocol;
- generation semantics;
- agent transport;
- model-routing policy;
- retry policy;
- prioritisation algorithm;
- context-building strategy;
- concurrency model;
- cost-control system;
- controller architecture;
- long-term storage architecture.

These are research questions.

Do not turn them into architecture until actual usage provides evidence.

---

What not to build yet

Unless required to make the current demonstration work, do not add:

- autonomous multi-generation execution;
- controller/worker protocols;
- generic mutation languages;
- complex lifecycle state machines;
- provider abstraction layers;
- model allowlists;
- model routing;
- retries;
- JSON repair;
- elaborate cost reservation;
- concurrency;
- scheduling;
- prioritisation engines;
- background workers;
- remote services;
- authentication;
- web applications;
- plugin systems;
- speculative extensibility.

A small amount of ugly glue is acceptable.

Premature infrastructure is not.

---

Bootstrap rule

Every iteration should make the next useful iteration less manual.

That is the path toward self-hosting.

For example:

Iteration 0
human → objective → agent → graph → human

Iteration 1
human → graph node → agent → result → human updates graph

Iteration 2
human → graph node → agent → result → system updates graph

Iteration 3
system suggests next node → human approves → agent works

Iteration 4
system handles bounded low-risk work itself

This sequence is illustrative, not a roadmap.

Do not implement later iterations until the previous behaviour exists and teaches us something.

---

Self-hosting

"tag-two" should eventually help improve "tag-two".

This is not merely a novelty.

Self-hosting provides a useful feedback loop because weaknesses in the orchestration system become real problems represented inside the system itself.

The desired pattern is:

tag-two identifies useful work
        ↓
one of those tasks improves tag-two
        ↓
the improved tag-two handles the next iteration

A useful guiding phrase is:

«The graph should eventually contain the work required to remove humans from the parts of the graph where they add no value.»

Humans should remain where judgement, preference, authority or approval genuinely matters.

---

Relationship to larger systems

This experiment is deliberately tiny.

A larger orchestration system such as Harbour may eventually provide interfaces, task-provider integration, richer agent dispatch, chat interaction, prioritisation and operational views around concepts like these.

Do not design tag-two around Harbour.

If the primitive is genuinely useful, integration opportunities will become obvious later.

tag-two should remain understandable and runnable independently.

---

Portability

The underlying idea should not depend on a particular coding-agent vendor.

A future graph node might be worked by:

- Claude Code;
- Codex;
- Copilot;
- an OpenRouter model;
- a local model;
- Harbour;
- a human.

Do not implement all of these.

But avoid making the graph itself synonymous with one provider's conversation format.

---

The first implementation

The first version has one job:

objective + repository
        ↓
agent investigates repository
        ↓
small task graph
        ↓
graph.json
        ↓
graph.html

Then stop.

No graph tasks are executed.

The planner should produce a small graph — roughly a handful of nodes, not an exhaustive backlog.

Each proposed task should answer:

Why is this useful for the objective?

Dependencies should exist only when they carry real meaning.

The agent should investigate the repository itself rather than receiving a manually curated approximation of it.

---

First dogfood objective

Once the minimum implementation exists, run it against its own repository with:

«Make tag-two better at achieving its purpose.»

This is the first meaningful experiment.

Do not manually design the answer.

Do not repeatedly rerun the planner until it produces something we like.

Generate a real graph and inspect what it actually thought.

The important question is:

«Would an experienced developer consider this decomposition useful?»

Not perfect.

Useful.

---

First success criterion

We should be able to run something conceptually similar to:

tag plan "Make tag-two better at achieving its purpose."

and receive:

.tag/
  graph.json
  graph.html

Opening "graph.html" should make the system's reasoning inspectable.

We should be able to see:

- the objective;
- the proposed tasks;
- why they matter;
- dependencies;
- enough evidence/context to understand why the agent proposed them.

The exact command and storage format are implementation details.

Choose the smallest thing that works.

---

What happens after that

Nothing automatically.

We inspect the graph.

If it is poor, that is evidence.

We improve the part of tag-two responsible for the weakness.

If it is useful, we choose one node from the graph tag-two itself produced.

An agent works that node.

Then we determine the smallest mechanism necessary to feed the result back into the graph.

That becomes the next implementation step.

Not before.

---

Development philosophy

Prefer:

- vanilla JavaScript;
- small modules;
- few dependencies;
- files over services where practical;
- explicit behaviour;
- inspectable state;
- simple commands;
- boring data structures;
- changes justified by observed needs.

Avoid cleverness whose value has not yet been demonstrated.

The project should remain small enough that one developer can understand the complete system.

---

A test for every proposed feature

Before adding infrastructure, ask:

«What happened in a real tag-two run that makes us need this?»

If there is no concrete answer, don't build it yet.

---

Current mission

Build the smallest seed capable of producing its first useful self-directed graph.

Then let that graph help determine what comes next.

Do not build the final system.

Build the thing that lets us run the next experiment.
