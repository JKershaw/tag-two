#!/bin/sh
# One complete task episode, start to finish, with no model, no network and no cost.
#
# Everything happens in a work directory (given as $1, or a fresh temporary one). The episode is
# about a two-line shell script with a real bug in it: a human — or an agent — does the work, and
# tag-two holds what was asked, what was established, what failed, and what a human decided.
#
# Run it as: sh examples/zero-cost-episode/run.sh
set -eu

root=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)
tag_js="$root/bin/tag.js"
work=${1:-$(mktemp -d)}
mkdir -p "$work"
cd "$work"

# Echo each command as a reader would type it, then run it.
tag() {
  printf '\n$ tag'
  for argument in "$@"; do
    case $argument in
      *' '*|*'	'*|'') printf " '%s'" "$argument" ;;
      *) printf ' %s' "$argument" ;;
    esac
  done
  printf '\n'
  # Errors are part of the story here — a refused close explains itself on stderr — so both
  # streams go to the same place, in order, the way they would in a terminal.
  node "$tag_js" "$@" 2>&1
}

# The subject of the episode: a script that claims to add and does not, and the check that decides.
cat > sum.sh <<'EOF'
#!/bin/sh
echo $(( $1 - $2 ))
EOF
cat > check.sh <<'EOF'
#!/bin/sh
got=$(sh sum.sh 2 3)
if [ "$got" = "5" ]; then echo "sum.sh 2 3 -> $got (correct)"; exit 0; fi
echo "sum.sh 2 3 -> $got, expected 5"
exit 1
EOF
echo "Working in $work on sum.sh and check.sh."

# 1. A control plane supplies the task: what was asked, what would count as done, what stays human.
tag task open task.json sum-reports-the-sum \
  'sum.sh must report 2 + 3 as 5.' \
  'sh check.sh, run by tag verify, exits 0.' \
  'Whether check.sh is the right check at all is reserved for the human.'

# 2. Intent arrives in the words it came in, with the kind its author gave it.
tag task intent task.json control-plane constraint 'Change the script, not the check.'

# 3. An investigation. It carries evidence, so it is shown as a result rather than a claim.
tag task op task.json steward investigate \
  'What does sum.sh actually compute?' \
  'It subtracts its second argument from its first.' \
  'sum.sh line 2: echo $(( $1 - $2 ))'

# 4. A verification. Only this establishes anything: the exit status is the machine's, not the author's.
tag task verify task.json 'sh check.sh' || echo "(tag exited $?, and the failure is now in the record)"

# 5. A close that cites the failing check is refused — and the refusal is itself recorded, so the
#    next reader, who may be a stateless agent, does not propose the identical close again.
tag task close task.json 'The check ran, so the task is done.' 2 || echo "(tag exited $?)"

# 6. The work itself. tag-two does not do it; it records that somebody did.
sed -i 's/\$1 - \$2/$1 + $2/' sum.sh
tag task op task.json steward edit \
  'Make sum.sh add its arguments.' \
  'Line 2 now reads: echo $(( $1 + $2 ))' \
  'sed -i "s/\$1 - \$2/\$1 + \$2/" sum.sh'

# 7. The same check again, now against the changed script.
tag task verify task.json 'sh check.sh'

# 8. A decision a machine cannot settle: control goes back to a human, with the evidence it rests on.
tag task ask task.json 5 \
  'Should the episode close here, or also cover negative arguments?' \
  'The completion condition names one case; whether it is the right case is a judgement about scope.' \
  'Either close on the passing check, or reopen with a wider condition.' \
  'Close now: the stated condition is met.' \
  'Widen the condition first, then verify again.' || echo "(tag exited $?, and control is with a human)"

# 9. The answer is kept on the question it answers, in the words it arrived in.
tag task answer task.json john 'Close it. A wider condition is a new task, not this one.'

# 10. A close that cites a verification that really ran and really passed.
tag task close task.json \
  'sh check.sh exits 0 against the changed script, which is what the completion condition asked for.' 5

# 11. The whole episode in text. This is what a fresh agent or a human is handed.
tag task show task.json
