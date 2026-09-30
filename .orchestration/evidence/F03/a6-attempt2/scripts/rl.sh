#!/usr/bin/env bash
# usage: rl.sh <logfile> <cwd> <command...>   records command, cwd, start, exit, wall
log="$1"; shift; cwd="$1"; shift
start=$(date -u +%Y-%m-%dT%H:%M:%SZ); t0=$(date +%s.%N)
{
  echo "### command: $*"
  echo "### cwd: $cwd"
  echo "### start: $start"
  echo "--- output ---"
} >> "$log"
( cd "$cwd" && bash -c "$*" ) >> "$log" 2>&1
ec=$?
t1=$(date +%s.%N)
wall=$(python3 -c "print(round($t1-$t0,2))")
{
  echo "--- end ---"
  echo "### exit: $ec"
  echo "### wall_s: $wall"
  echo
} >> "$log"
echo "exit=$ec wall=$wall"
exit $ec
