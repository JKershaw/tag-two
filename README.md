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
subjects. The model chooses what to investigate; no source excerpts are selected
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
Both outputs stay local and are Git-ignored because they may include repository
content. Existing `.tag` directories are never overwritten: preserve or move a
previous experiment explicitly before starting another.

The seed allows at most ten model requests, 4,096 output tokens per request and
80,000 serialized request bytes. It checks model pricing and caps provider prices
at $0.50/million input tokens and $1.50/million output tokens, with no per-request
fee. At these limits, even conservatively counting each request byte as an input
token leaves the run below $1 (roughly $0.47 before small protocol overhead).
Unavailable models, higher prices, network errors, exhausted limits or invalid
graphs stop the run without automatic retries, JSON repair or fabricated tasks.
An output write failure can leave a partial `.tag` directory; inspect it before
moving it aside.

The first dogfood run should use the objective above exactly once. Inspect its
unedited graph for usefulness rather than rerunning until the answer looks good.

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
