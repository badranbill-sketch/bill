#!/bin/bash
# usage: rl.sh <logfile> <cmd...>   ; runs in current dir, appends record
LOG="$1"; shift
{
echo "### command: $*"
echo "### cwd: $(pwd)"
echo "### start: $(date -u +%FT%TZ)"
} >> "$LOG"
S=$(date +%s.%N)
bash -c "$*" >> "$LOG" 2>&1
RC=$?
E=$(date +%s.%N)
{
echo "### exit: $RC"
echo "### wall_s: $(echo "$E - $S" | bc)"
echo
} >> "$LOG"
echo "exit=$RC wall=$(echo "$E - $S" | bc)"
exit $RC
