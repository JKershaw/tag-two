# Changelog

## 0.1.0 — 2026-09-16

The first release. It consolidates what five real task episodes and eighty-eight recorded runs
actually established, and names the rest as research. No behaviour was added.

### The public interface

`tag task open · intent · op · verify · ask · answer · close · show`, plus `tag --help` and
`tag --version`. State is one JSON file per task; `tag task show` renders it as text.
Exit status: **0** succeeded, **1** failed (including a verification whose command failed), **2**
control was returned to a human by `tag task ask`.

Nothing in the task runner calls a model, opens a network connection or needs an API key.

### Added

- `tag --version`, reading the version from `package.json` rather than repeating it.
- `examples/zero-cost-episode/` — one complete episode, start to finish, with no model and no cost.
  `npm run example` runs it; `test/example.test.js` compares its output line for line against
  [`examples/zero-cost-episode/transcript.txt`](examples/zero-cost-episode/transcript.txt), so the
  documented example cannot drift from the code.
- `test/cli.test.js` — the first tests of `bin/tag.js` itself: the exit statuses a caller branches
  on, the usage on a bad command, and a drift guard asserting that `tag --help` lists every command
  the CLI dispatches and dispatches every command it lists.
- `test/episodes.test.js` — the five archived episodes still validate as tasks, are complete, and
  closed on evidence; and the README's count of what they contain is checked against the files.
- Tests for `tag task answer`, which had none: an answer is kept in the words it arrived in, on the
  question it answers, and control returns to the runner; a complete task is not asked a question
  after the fact.
- `DESIGN.md`, `LIMITATIONS.md` and this changelog.

### Changed

- **The README was rewritten.** It now describes the task runner as the product, in about 180 lines
  instead of 926. The design narrative, the "what not to build yet" list and the running commentary
  on where the experiment stood are gone from it; their content is in `DESIGN.md`,
  `LIMITATIONS.md` and `docs/experiments.md`.
- **`tag --help` leads with the task runner.** The planning and graph commands are listed under an
  "Experimental" heading, and the help now states what each command does and what the exit statuses
  mean.
- `package.json`'s description now says what the project is rather than what it was trying to be,
  and `npm run example` was added.
- Three argument-validation messages now read as English: "A answer is required" became "An answer
  is required", and `tag task ask`'s messages name what is missing ("A reason why a machine cannot
  settle it is required") instead of interpolating a field name. No behaviour changed.

### Moved

Nothing was deleted. The research history is the evidence the interface was derived from.

- `EXPERIMENTS.md` → `docs/experiments.md` (markdown links repointed; no other edit).
- `notes/` → `docs/notes/`.

`tasks/`, `graph/` and `examples/` stayed where they are: the archived episodes and repro scripts
record commands by path, and moving them would make recorded evidence wrong.

### Explicitly not done

No planning, orchestration, model routing, sandboxing, scheduling, concurrency, Harbour integration
or new agent intelligence was added. `src/` was not restructured: the planner modules are marked
experimental in documentation and in `tag --help`, which is where the distinction was missing —
not in the file layout, which was already clear.
