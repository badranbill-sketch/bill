# Differential oracle only: runs the A2 reference model (read-only import) on fuzz inputs.
import json, sys
sys.path.insert(0, '/home/user/bill/.orchestration/evidence/F02/math')
sys.dont_write_bytecode = True
import workshop_reference as ref
docs = json.load(open(sys.argv[1]))
out = []
for d in docs:
    try:
        out.append(ref.compute(d))
    except Exception as e:
        out.append({'__error__': repr(e)})
json.dump(out, open(sys.argv[2], 'w'))
print('ref computed', len(out))
