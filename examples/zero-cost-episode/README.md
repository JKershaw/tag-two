# A complete task episode, at zero cost

`run.sh` carries one task from "here is what was asked" to "here is the evidence it is done",
using only `tag task` commands. It calls no model, makes no network request, costs nothing, and
writes only inside a work directory of its own.

```sh
sh examples/zero-cost-episode/run.sh
```

The subject is a two-line shell script that claims to add and actually subtracts, plus the check
that decides whether it is fixed. A human — or an agent — does the work; tag-two holds the state.

What the run demonstrates, in order:

| step | what it shows |
|---|---|
| `task open` | what was asked, what would count as verified completion, what stays with the human |
| `task intent` | a constraint from outside, kept in the words it arrived in |
| `task op` | a bounded operation somebody performed, with its evidence |
| `task verify` | the check fails, and the machine's exit status goes into the record — exit 1 |
| `task close` (refused) | a close citing a failing check is refused, and the refusal is itself recorded as operation 3 |
| `task op` | the fix, recorded as work somebody did |
| `task verify` | the same check passes — exit 0 |
| `task ask` | a scope judgement goes back to a human — exit 2 |
| `task answer` | the reply is kept on the question it answers, and control returns |
| `task close` | the close cites operation 5, which really ran and really passed |
| `task show` | the whole episode in text, which is what a fresh agent is handed |

[`transcript.txt`](transcript.txt) is the expected output with timestamps and the work directory
replaced by placeholders. `test/example.test.js` runs the script and compares against it, so the
example cannot drift from the code without a test failing.
