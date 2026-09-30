"""A6 adversarial envelope instances (fresh, not in examples/). Each is built from the valid
guide-requested / workshop-completed examples with one mutation. Prints ACCEPTED/REJECTED."""
import json, pathlib, copy
from jsonschema import Draft202012Validator
C = pathlib.Path('/home/user/bill/.orchestration/contracts')
v = Draft202012Validator(json.loads((C/'event-envelope.schema.json').read_text()))
g = json.loads((C/'examples/valid/event-envelope/guide-requested.json').read_text())
w = json.loads((C/'examples/valid/event-envelope/workshop-completed.json').read_text())
def hexpad(s): h = s.encode().hex(); return (h + '0'*64)[:64]
cases = []
def case(name, base, **mut):
    d = copy.deepcopy(base); d.update(mut); cases.append((name, d))
# --- attempts the contract claims are impossible (expect REJECTED) ---
case('ADV-1a email with @ in idempotency_key, correct length', g, idempotency_key='ik1_'+('jane@example.com'+'0'*64)[:64])
case('ADV-1b uppercase-hex key (dedupe split)', g, idempotency_key='ik1_'+'A'*64)
case('ADV-2a amount as extra field nested under allowed name? (resource_id object)', g, resource_id={'amount':850000})
case('ADV-2b currency amount in resource version', g, resource_id='guide.before-you-retire.v850000')
case('ADV-2c amount with $ in subject_id', g, subject_id='con_$850000aaaaaaaaaaaaaaaaaaa')
case('ADV-3a workshop.completed with numeric-digit key', w, resource_id='workshop.gap-850000.v1')
case('ADV-3b consent_reference that is an email', w, consent_reference='cev_jane@example.com')
case('ADV-3c locale carrying data', g, locale='fr-CA-850k')
# --- encodings a schema cannot see (expected ACCEPTED; mitigated only by P02 membership/HMAC rules) ---
case('ADV-4a hex-encoded email as idempotency_key', g, idempotency_key='ik1_'+hexpad('jane@example.com'))
case('ADV-4b decimal amount digits inside idempotency_key', g, idempotency_key='ik1_'+('850000'.rjust(64,'0')))
case('ADV-5a amount spelled in letters in workshop key (workshop.completed)', w, resource_id='workshop.eight-hundred-fifty-thousand.v1')
case('ADV-5b diagnosis in workshop key (workshop.completed)', w, resource_id='workshop.shortfall-large-warning.v1')
case('ADV-5c retirement age in version slot', g, resource_id='guide.before-you-retire.v65')
case('ADV-5d person name as guide key', g, resource_id='guide.jean-tremblay.v1')
case('ADV-6 amount digits inside subject_id (Crockford allows digits)', g, subject_id='con_'+'850000'.rjust(26,'0'))
out=[]
for name, d in cases:
    errs = list(v.iter_errors(d))
    out.append(f"{'REJECTED' if errs else 'ACCEPTED'}  {name}" + (f"  <- {errs[0].validator}: {errs[0].message[:90]}" if errs else ''))
print('\n'.join(out))
