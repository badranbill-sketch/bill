import sys,re
f='tests/baseline/runner-lib.mjs'
s=open(f).read()
m=sys.argv[1]
if m=='A':  # incomplete no longer affects exit code
    old='exit_code: tally.fail ? EXIT.fail : incomplete ? EXIT.incomplete : EXIT.ok'
    new='exit_code: tally.fail ? EXIT.fail : EXIT.ok'
elif m=='B':  # classifier: blocked if ANY failure has a launch error
    old='if (failed && blocks.length === failed && launch.length === failed)'
    new='if (launch.length > 0)'
elif m=='C':  # installState ignores integrity mismatches and extras
    old='if (!(k in lock)) problems.push(`${k} installed but not in lockfile`);'
    new=''
elif m=='D':  # parseArgs: unknown ids silently dropped
    old='if (unknown.length)\n      errors.push('
    new='if (false)\n      errors.push('
assert old in s, (m, 'pattern not found')
open(f,'w').write(s.replace(old,new,1)); print('mutated',m)
