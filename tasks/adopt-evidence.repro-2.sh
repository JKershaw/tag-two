#!/bin/sh
# Second reachable case for tasks/adopt-evidence.json: both graphs carry recorded evidence. Exits 0
# only when the replacement's recorded outcome is observed present before the adopt and absent after.
set -eu
root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT

cp "$root/examples/fifteenth-dogfood/graph.json" "$work/new.json"
cp "$root/examples/fifth-dogfood/graph.json" "$work/durable.json"
node="node $root/bin/tag.js"
id() { node -e 'process.stdout.write(JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")).nodes[0].id)' "$1"; }

$node record "$work/new.json" "$(id "$work/new.json")" "NEW GRAPH OUTCOME: measured on the replacement." >/dev/null
$node record "$work/durable.json" "$(id "$work/durable.json")" "DURABLE GRAPH OUTCOME: measured earlier." >/dev/null

$node adopt "$work/new.json" "$work/durable.json"

text=$(cat "$work/durable.json")
case "$text" in
  *"DURABLE GRAPH OUTCOME"*) kept_durable=yes ;; *) kept_durable=no ;;
esac
case "$text" in
  *"NEW GRAPH OUTCOME"*) kept_new=yes ;; *) kept_new=no ;;
esac
echo "after adopt: durable graph's own outcome kept=$kept_durable, replacement's outcome kept=$kept_new"

if [ "$kept_durable" = yes ] && [ "$kept_new" = no ]; then
  echo "REPRODUCED: when both graphs carry evidence, the durable graph's is kept and the replacement's is dropped."
  exit 0
fi
echo "NOT REPRODUCED."
exit 1
