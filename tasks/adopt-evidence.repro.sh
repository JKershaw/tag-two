#!/bin/sh
# Reproduction for the task in tasks/adopt-evidence.json. It uses only commands the README
# documents — `tag record`, `tag input`, `tag adopt` — and two unedited archived planner outputs
# answering the same objective. It exits 0 only when it has actually observed the loss: the
# recorded item present in the graph before the adopt and absent from the durable graph after it.
set -eu
root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT

cp "$root/examples/fifteenth-dogfood/graph.json" "$work/new.json"
cp "$root/examples/fifth-dogfood/graph.json" "$work/durable.json"

node="node $root/bin/tag.js"
first=$(node -e 'process.stdout.write(JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")).nodes[0].id)' "$work/new.json")

$node record "$work/new.json" "$first" "Worked: the hypothesis was tested and refuted." >/dev/null
$node input "$work/new.json" steward correction "The earlier reading of this was wrong." >/dev/null

count() {
  node -e 'const g=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"));process.stdout.write(String((g[process.argv[2]]||[]).length))' "$1" "$2"
}

before_outcomes=$(count "$work/new.json" outcomes)
before_inputs=$(count "$work/new.json" inputs)
durable_before=$(count "$work/durable.json" outcomes)
echo "before adopt: new graph holds $before_outcomes outcome(s) and $before_inputs input(s); durable graph holds $durable_before outcome(s)"

$node adopt "$work/new.json" "$work/durable.json"

after_outcomes=$(count "$work/durable.json" outcomes)
after_inputs=$(count "$work/durable.json" inputs)
echo "after adopt: durable graph holds $after_outcomes outcome(s) and $after_inputs input(s)"

if [ "$before_outcomes" -gt 0 ] && [ "$after_outcomes" -eq 0 ] && [ "$before_inputs" -gt 0 ] && [ "$after_inputs" -eq 0 ]; then
  echo "REPRODUCED: $before_outcomes recorded outcome(s) and $before_inputs recorded input(s) were present before the adopt and are absent after it."
  exit 0
fi
echo "NOT REPRODUCED: evidence survived the adopt."
exit 1
