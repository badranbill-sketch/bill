#!/usr/bin/env python3
"""F02 data lane: generate three schema contracts and their example instances.

Writes (contract version 1.0):
  contracts/event-envelope.schema.json
  contracts/delivery-job.schema.json
  contracts/feature-flags.json            (a JSON Schema for a flag/readiness document)
  contracts/examples/{valid,invalid}/{event-envelope,delivery-job,feature-flags}/
  evidence/F02/data/fixture-resource-registry.json   (fictional stand-in for the proposed resource registry, PB-ID-5)

Repair attempt 2 (design review F02-design.md, A6D-01/03/06/07) changed: closed guide/workshop keys and hash-only
versions for contact-subject resource codes; content codes = asset-manifest 1.0 asset IDs; marketing_dispatch controls
workshop_followup; new examples appended with label-derived (sha256) values so earlier examples keep their bytes
except where a resource code had to change.

Repair attempt 3 (design review F02-design-attempt2.md, A6D2-01) changed: a suppressed job may not carry send_started_at
or sent_at (JS-SUPP-1), so a withdrawal cannot produce a valid "suppressed" record for a job whose provider call started.
One valid example (a T5 stop at the pre-send check after an earlier known failure) and one invalid example (the
reviewer's reproduction) are appended with label-derived values; every earlier file keeps its bytes.

The JSON files are the authoritative contracts. This script is provenance: it
reproduces them deterministically (fixed seed, fictional fixture IDs only).
All example data is fictional. No real person, address, order or amount appears.
"""
import copy
import hashlib
import json
import os
import random

ROOT = "/home/user/bill/.orchestration/contracts"
EX = os.path.join(ROOT, "examples")
BASE = "https://bill.contracts.local"

# ---------------------------------------------------------------- patterns
CROCK = "0123456789abcdefghjkmnpqrstvwxyz"  # Crockford base32, lowercase, no i l o u
ID26 = "[0-9a-hjkmnp-tv-z]{26}"
UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[47][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}"
TS = ("^[0-9]{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12][0-9]|3[01])"
      "T(?:[01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\\.[0-9]{1,6})?Z$")
SLUG = "[a-z]+(?:-[a-z]+){0,7}"          # letters and hyphens only: no digits, no '.', no '@'
VER = "(?:v[1-9][0-9]{0,2}|h[0-9a-f]{12,64})"
HASHVER = "h[0-9a-f]{12,64}"
TEMPLATES = ["e%02d" % i for i in range(1, 17)]
TEMPLATE_RE = "e(?:0[1-9]|1[0-6])"
# Repair attempt 2 (A6D-03): registry codes on contact-subject events use a CLOSED key set and the hash version only.
# Proposed keys, anchored to existing or proposed route slugs (not invented topics):
GUIDE_KEYS = ["retirement-guide"]        # EN slug of the existing `resources` route (lib/routes.ts, codex 66cce52)
WORKSHOP_KEYS = ["retirement-workshop"]  # EN slug of the proposed `workshop` route (routes.md, offers lane)
CONSENT_PURPOSES = ["nurture", "workshop-followup"]  # proposed, pending G5
# Repair attempt 2 (A6D-06): content events accept every asset_id that asset-manifest 1.0 defines. This is a copy of the
# asset-manifest asset_id alternation; validate_f02_data.py checks that it stays byte-identical to asset-manifest.schema.json.
ASSET_ID_CORE = ("capsule\\.s(?:0[1-9]|1[0-8])|companion\\.s(?:0[1-9]|1[0-8])|clip\\.w(?:0[0-9]|1[01])|case\\.c(?:0[1-9]|10)"
                 "|ink\\.a0[1-8]|template\\.e(?:0[1-9]|1[0-6])|ad\\.(?:ad0[1-6]|rt0[1-3])"
                 "|(?:article|page|guide|book|event|copy)\\.%s") % SLUG

rnd = random.Random(20260930)


def rid(prefix):
    return prefix + "_" + "".join(rnd.choice(CROCK) for _ in range(26))


def ruuid():
    h = "".join(rnd.choice("0123456789abcdef") for _ in range(32))
    return "%s-%s-4%s-%s%s-%s" % (h[0:8], h[8:12], h[13:16], rnd.choice("89ab"), h[17:20], h[20:32])


def rhash(n=64):
    return "".join(rnd.choice("0123456789abcdef") for _ in range(n))


def ikey(*parts):
    return "ik1_" + hashlib.sha256(("fixture|" + "|".join(parts)).encode()).hexdigest()


# Deterministic helpers added in repair attempt 2. They derive values from a label with sha256 and do not draw from
# `rnd`, so every example that existed before keeps its random IDs.
def dhash(label, n=12):
    return hashlib.sha256(("fixture-hash|" + label).encode()).hexdigest()[:n]


def did(prefix, label):
    d = hashlib.sha256(("fixture-id|" + label).encode()).digest()
    return prefix + "_" + "".join(CROCK[b % 32] for b in d[:26])


def duuid(label):
    h = hashlib.sha256(("fixture-uuid|" + label).encode()).hexdigest()
    return "%s-%s-4%s-%s%s-%s" % (h[0:8], h[8:12], h[13:16], "89ab"[int(h[16], 16) % 4], h[17:20], h[20:32])


def dump(path, obj):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, indent=2, ensure_ascii=False)
        f.write("\n")


def why(path, rule, expect_path, expect_keyword, text):
    with open(path, "w", encoding="utf-8") as f:
        f.write("rule: %s\nexpect_path: %s\nexpect_keyword: %s\n\n%s\n" % (rule, expect_path, expect_keyword, text.strip()))


def ts_def():
    return {"type": "string", "pattern": TS, "maxLength": 32,
            "description": "RFC 3339 timestamp in UTC with a literal 'Z' suffix. Offsets such as -04:00 are rejected; America/Toronto is a display concern only (D-044)."}


# ================================================================ EVENT ENVELOPE
EVENT_TYPES = [
    "guide.requested", "marketing.opted_in", "marketing.withdrawn", "webinar.registered",
    "webinar.cancelled", "webinar.join_clicked", "webinar.attendance_verified",
    "workshop.access_requested", "workshop.completed", "book.payment_confirmed", "book.refunded",
    "book.dispatched", "consultation.redeemed", "meeting.confirmed", "meeting.cancelled",
    "meeting.held", "content.draft_created", "content.approved", "content.published", "delivery.failed",
]
SOURCES = [
    "site.guide_request", "site.consent_capture", "site.optin_confirmation", "site.preferences",
    "site.unsubscribe", "site.webinar_registration", "site.join_redirect", "site.workshop_access",
    "site.workshop_completion", "provider.stripe_webhook", "provider.brevo_webhook",
    "provider.booking_sync", "provider.meet_attendance", "operator.reconciliation",
    "operator.fulfilment", "operator.suppression", "editorial.draft_job",
    "editorial.approval_ledger", "editorial.publication_handoff", "system.dispatcher",
]
SUBJECTS = {"contact": "con", "content_item": "cnt", "job": "job"}
RESOURCES = {
    "guide_version": "^guide\\.(?:%s)\\.%s$" % ("|".join(GUIDE_KEYS), HASHVER),
    "consent_wording": "^consent\\.(?:%s)\\.%s$" % ("|".join(CONSENT_PURPOSES), HASHVER),
    "webinar_event": "^wev_%s$" % ID26,
    "workshop_version": "^workshop\\.(?:%s)\\.%s$" % ("|".join(WORKSHOP_KEYS), HASHVER),
    "book_order": "^ord_%s$" % ID26,
    "consultation_right": "^rgt_%s$" % ID26,
    "booking": "^bkg_%s$" % ID26,
    "content_version": "^(?:%s)\\.%s$" % (ASSET_ID_CORE, VER),
    "template_version": "^template\\.%s\\.%s$" % (TEMPLATE_RE, VER),
}
RESOURCE_DESC = {
    "guide_version": "Contact-subject registry code (PB-ID-3): the key is one of the closed guide keys and the version is h + sha256 prefix of the approved edition. No free word and no readable number can be written here. Membership in the approved resource registry is a runtime check (PB-ID-5, EV-REG-1).",
    "consent_wording": "Contact-subject registry code (PB-ID-3): consent purpose (closed, pending G5) plus h + sha256 prefix of the exact wording shown.",
    "webinar_event": "Internal webinar event ID.",
    "workshop_version": "Contact-subject registry code (PB-ID-3): the key is one of the closed workshop keys and the version is h + sha256 prefix of the deployed workshop build. No free word and no readable number can be written here.",
    "book_order": "Internal order ID.",
    "consultation_right": "Internal consultation right ID.",
    "booking": "Internal booking ID.",
    "content_version": "Content-item registry code: any asset_id that asset-manifest 1.0 defines, plus v1-v999 or h + sha256 prefix. Used only with a cnt_ subject, so it is about an editorial item, never about a visitor.",
    "template_version": "Email template code on delivery.failed (job subject).",
}
C, F, R = "contact", "forbidden", "required"
TYPE_MAP = {
    "guide.requested": (C, "guide_version", ["site.guide_request"], F),
    "marketing.opted_in": (C, "consent_wording", ["site.consent_capture", "site.optin_confirmation", "site.preferences"], R),
    "marketing.withdrawn": (C, "consent_wording", ["site.unsubscribe", "site.preferences", "provider.brevo_webhook", "operator.suppression"], R),
    "webinar.registered": (C, "webinar_event", ["site.webinar_registration", "operator.reconciliation"], F),
    "webinar.cancelled": (C, "webinar_event", ["site.webinar_registration", "site.preferences", "operator.reconciliation"], F),
    "webinar.join_clicked": (C, "webinar_event", ["site.join_redirect"], F),
    "webinar.attendance_verified": (C, "webinar_event", ["provider.meet_attendance", "operator.reconciliation"], F),
    "workshop.access_requested": (C, "workshop_version", ["site.workshop_access"], F),
    "workshop.completed": (C, "workshop_version", ["site.workshop_completion"], R),
    "book.payment_confirmed": (C, "book_order", ["provider.stripe_webhook"], F),
    "book.refunded": (C, "book_order", ["provider.stripe_webhook"], F),
    "book.dispatched": (C, "book_order", ["operator.fulfilment"], F),
    "consultation.redeemed": (C, "consultation_right", ["provider.booking_sync", "operator.reconciliation"], F),
    "meeting.confirmed": (C, "booking", ["provider.booking_sync", "operator.reconciliation"], F),
    "meeting.cancelled": (C, "booking", ["provider.booking_sync", "operator.reconciliation"], F),
    "meeting.held": (C, "booking", ["operator.reconciliation"], F),
    "content.draft_created": ("content_item", "content_version", ["editorial.draft_job"], F),
    "content.approved": ("content_item", "content_version", ["editorial.approval_ledger"], F),
    "content.published": ("content_item", "content_version", ["editorial.publication_handoff"], F),
    "delivery.failed": ("job", "template_version", ["system.dispatcher", "provider.brevo_webhook"], F),
}
assert list(TYPE_MAP) == EVENT_TYPES


def envelope_schema():
    defs = {
        "uuid": {"type": "string", "pattern": "^%s$" % UUID, "maxLength": 36,
                 "description": "Server-generated UUID (version 4 or 7), lowercase hex."},
        "utc_timestamp": ts_def(),
        "event_type": {"enum": EVENT_TYPES, "description": "The 20 event types of 04 §3, closed. Anything else is rejected."},
        "source": {"enum": SOURCES, "description": "Approved source codes (closed). Each type narrows this list; see allOf."},
        "consent_event_id": {"type": "string", "pattern": "^cev_%s$" % ID26, "maxLength": 30,
                             "description": "ID of a real consent_events row (operational-data-model.md)."},
        "idempotency_key": {"type": "string", "pattern": "^ik1_[0-9a-f]{64}$", "maxLength": 68,
                            "description": "ik1_ + HMAC-SHA256 (lowercase hex) over the per-type canonical tuple of internal IDs and provider event IDs (event-envelope.md). Never an email, name, amount, age, answer or form body."},
    }
    for k, p in SUBJECTS.items():
        defs["subject_" + k] = {"type": "string", "pattern": "^%s_%s$" % (p, ID26), "maxLength": 30}
    for k, pat in RESOURCES.items():
        defs["resource_" + k] = {"type": "string", "pattern": pat, "maxLength": 120, "description": RESOURCE_DESC[k]}
    props = {
        "schema_version": {"const": "1.0"},
        "event_id": {"$ref": "#/$defs/uuid"},
        "type": {"$ref": "#/$defs/event_type"},
        "occurred_at": {"$ref": "#/$defs/utc_timestamp"},
        "subject_id": {"anyOf": [{"$ref": "#/$defs/subject_" + k} for k in SUBJECTS],
                       "description": "Internal random ID of the entity the event is about (con_ contact, cnt_ content item, job_ delivery job). Never an email or name."},
        "locale": {"enum": ["fr", "en"]},
        "source": {"$ref": "#/$defs/source"},
        "resource_id": {"anyOf": [{"$ref": "#/$defs/resource_" + k} for k in RESOURCES],
                        "description": "Approved resource reference: an internal entity ID, or a versioned registry code. On contact-subject events a registry code has a closed key and a hash version (PB-ID-3); content-item codes are asset-manifest 1.0 asset IDs. Every registry code must also be a member of the approved resource registry, which the schema cannot see (runtime rule PB-ID-5 / EV-REG-1, event-envelope.md §4.2)."},
        "consent_reference": {"$ref": "#/$defs/consent_event_id"},
        "idempotency_key": {"$ref": "#/$defs/idempotency_key"},
    }
    branches = []
    for t, (subj, res, srcs, consent) in TYPE_MAP.items():
        then = {"properties": {
            "subject_id": {"$ref": "#/$defs/subject_" + subj},
            "resource_id": {"$ref": "#/$defs/resource_" + res},
            "source": {"enum": srcs},
        }}
        if consent == R:
            then["required"] = ["consent_reference"]
        else:
            then["properties"]["consent_reference"] = {"not": {}, "description": "Forbidden for this type: consent is never carried by, or inferred from, a non-consent event."}
        branches.append({"if": {"properties": {"type": {"const": t}}, "required": ["type"]}, "then": then})
    return {
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "$id": BASE + "/event-envelope/1.0",
        "title": "Operational event envelope 1.0",
        "description": "Exactly the 04 §3 envelope. Closed shape: no payload, no form body, no financial field. Per-type rules (subject kind, resource kind, allowed sources, consent_reference required/forbidden) are in allOf. Semantics: event-envelope.md. Status: proposed (F02), not accepted.",
        "type": "object",
        "additionalProperties": False,
        "required": ["schema_version", "event_id", "type", "occurred_at", "subject_id", "locale", "source", "resource_id", "idempotency_key"],
        "properties": props,
        "allOf": branches,
        "$defs": defs,
    }


# ================================================================ DELIVERY JOB
STATUSES = ["pending", "leased", "sent", "complete", "retry_due", "suppressed", "expired", "reconcile_required", "dead_letter"]
ERROR_CODES = ["input_rejected", "auth_expired", "provider_outage", "rate_limited", "quota_exhausted",
               "uncertain_outcome", "timeout", "lease_expired", "application_defect"]
SUPPRESSIONS = ["consent_missing", "consent_withdrawn", "provider_blocklist", "contact_suppressed", "already_booked",
                "client_flag", "human_reply", "registration_cancelled", "event_cancelled", "event_remade",
                "entitlement_inactive", "order_refunded", "booking_cancelled", "already_rebooked", "not_allowlisted"]
DEFERS = ["daily_budget", "frequency_cap", "reminder_collision", "capability_disabled"]
PROMO_ONLY = ["e03", "e04", "e05", "e11"]
EITHER = ["e09"]
OPERATIONAL_ONLY = [t for t in TEMPLATES if t not in PROMO_ONLY + EITHER]
RESOURCE_REF = {"wev": ["e06", "e07", "e08", "e09"], "ord": ["e12", "e14"], "rgt": ["e13"], "bkg": ["e15", "e16"]}
NO_RESOURCE_REF = ["e01", "e02", "e03", "e04", "e05", "e10", "e11"]


def absent(desc=None):
    d = {"not": {}}
    if desc:
        d["description"] = desc
    return d


def job_schema():
    ts = {"$ref": "#/$defs/utc_timestamp"}
    props = {
        "schema_version": {"const": "1.0"},
        "job_id": {"type": "string", "pattern": "^job_%s$" % ID26, "maxLength": 30},
        "purpose_key": {"type": "string",
                        "pattern": "^pk1:con_%s:%s:%s:%s$" % (ID26, UUID, TEMPLATE_RE, HASHVER), "maxLength": 140,
                        "description": "pk1:<contact_id>:<trigger_event_id>:<template_id>:<template_version>. IDs only, no PII. Equality with the component fields is a runtime check (job-state-machine.md, rule JS-KEY-1)."},
        "contact_id": {"type": "string", "pattern": "^con_%s$" % ID26, "maxLength": 30,
                       "description": "The recipient is resolved from contacts at send time by a scoped server operation. The job never stores an address."},
        "trigger_event_id": {"$ref": "#/$defs/uuid"},
        "resource_ref": {"type": "string", "pattern": "^(?:wev|ord|rgt|bkg)_%s$" % ID26, "maxLength": 30,
                         "description": "Webinar event, order, consultation right or booking the message is about."},
        "template_id": {"enum": TEMPLATES, "description": "E01-E16 (email-eligibility.json). A closed enum: n8n can never pass a template name that becomes arbitrary work."},
        "template_version": {"type": "string", "pattern": "^%s$" % HASHVER, "maxLength": 65,
                             "description": "h + sha256 prefix (12-64 hex) of the approved template version (G3 binds hashes)."},
        "locale": {"enum": ["fr", "en"]},
        "channel": {"const": "email"},
        "provider": {"const": "brevo"},
        "message_class": {"enum": ["operational", "promotional"],
                          "description": "Proposed class, pending G5 (email-eligibility.json classification_status)."},
        "consent_reference": {"type": "string", "pattern": "^cev_%s$" % ID26, "maxLength": 30,
                              "description": "Consent evidence captured at job creation. It is re-checked after lease, before send."},
        "priority": {"type": "integer", "minimum": 0, "maximum": 9, "description": "0 = first. Operational 0-3, promotional 5-9."},
        "status": {"enum": STATUSES},
        "due_at": ts, "expires_at": ts, "next_attempt_at": ts, "send_started_at": ts, "sent_at": ts, "completed_at": ts,
        "attempt_count": {"type": "integer", "minimum": 0, "maximum": 8,
                          "description": "Number of provider calls started (incremented when send_started_at is recorded, not at lease)."},
        "max_attempts": {"type": "integer", "minimum": 1, "maximum": 8, "description": "Proposed default 5; hard ceiling 8."},
        "lease": {"type": "object", "additionalProperties": False,
                  "required": ["worker_id", "lease_token", "leased_at", "leased_until"],
                  "properties": {
                      "worker_id": {"type": "string", "pattern": "^wkr_[a-z0-9]+(?:-[a-z0-9]+){0,4}$", "maxLength": 48},
                      "lease_token": {"$ref": "#/$defs/uuid"},
                      "leased_at": ts, "leased_until": ts}},
        "provider_message_id": {"type": "string",
                                "pattern": "^(?:<[A-Za-z0-9._%+-]{1,128}@[A-Za-z0-9.-]{1,128}>|[A-Za-z0-9._:-]{1,128})$",
                                "maxLength": 260,
                                "description": "As returned by the provider on acceptance. Exact Brevo format unverified until P05. Acceptance is not inbox delivery."},
        "delivery_status": {"enum": ["unknown", "delivered", "bounced", "blocked_by_provider"],
                            "description": "Post-send reconciliation result; 'unknown' is honest when no provider signal exists."},
        "last_error": {"type": "object", "additionalProperties": False, "required": ["code", "at"],
                       "properties": {"code": {"enum": ERROR_CODES},
                                      "http_status": {"type": ["integer", "null"], "minimum": 100, "maximum": 599},
                                      "at": ts},
                       "description": "Sanitized: a code and an HTTP status only. No provider body, no free text, no address."},
        "defer_reason": {"enum": DEFERS},
        "suppression_reason": {"enum": SUPPRESSIONS},
        "created_at": ts, "updated_at": ts,
    }
    rules = []
    # class <-> priority, consent
    rules.append({"if": {"properties": {"message_class": {"const": "operational"}}},
                  "then": {"properties": {"priority": {"maximum": 3}, "consent_reference": absent("Operational jobs carry no consent reference; consent is not inferred from them.")}}})
    rules.append({"if": {"properties": {"message_class": {"const": "promotional"}}},
                  "then": {"required": ["consent_reference"], "properties": {"priority": {"minimum": 5}}}})
    # template -> class
    rules.append({"if": {"properties": {"template_id": {"enum": PROMO_ONLY}}},
                  "then": {"properties": {"message_class": {"const": "promotional"}}}})
    rules.append({"if": {"properties": {"template_id": {"enum": OPERATIONAL_ONLY}}},
                  "then": {"properties": {"message_class": {"const": "operational"}}}})
    # template -> resource_ref
    for prefix, tpls in RESOURCE_REF.items():
        rules.append({"if": {"properties": {"template_id": {"enum": tpls}}},
                      "then": {"required": ["resource_ref"],
                               "properties": {"resource_ref": {"pattern": "^%s_%s$" % (prefix, ID26)}}}})
    rules.append({"if": {"properties": {"template_id": {"enum": NO_RESOURCE_REF}}},
                  "then": {"properties": {"resource_ref": absent()}}})
    # per status
    NO_LEASE = {"lease": absent("Only a leased job holds a lease.")}
    NO_PMID = {"provider_message_id": absent("A provider message ID exists only after provider acceptance (sent/complete).")}
    per = {
        "pending": {"properties": {**NO_LEASE, **NO_PMID, "send_started_at": absent(), "sent_at": absent(), "suppression_reason": absent()}},
        "leased": {"required": ["lease"], "properties": {**NO_PMID, "sent_at": absent(), "suppression_reason": absent()}},
        "sent": {"required": ["provider_message_id", "sent_at", "send_started_at"],
                 "properties": {**NO_LEASE, "attempt_count": {"minimum": 1}, "completed_at": absent()}},
        "complete": {"required": ["provider_message_id", "sent_at", "send_started_at", "completed_at", "delivery_status"],
                     "properties": {**NO_LEASE, "attempt_count": {"minimum": 1}}},
        "retry_due": {"required": ["next_attempt_at"],
                      "anyOf": [{"required": ["last_error"]}, {"required": ["defer_reason"]}],
                      "properties": {**NO_LEASE, **NO_PMID, "send_started_at": absent()}},
        # repair attempt 3 (A6D2-01): suppression happens only before a provider call starts (T3, T5) or after evidence of
        # non-acceptance (T16, which clears the marker), so a suppressed job never carries the send marker or a send time
        "suppressed": {"required": ["suppression_reason"],
                       "properties": {**NO_LEASE, **NO_PMID,
                                      "send_started_at": absent("JS-SUPP-1: a suppressed job has no send marker. Suppression stops a job only before its provider call starts (T3, T5) or after evidence of non-acceptance (T16 clears the marker). A started call ends in sent or reconcile_required (T9, T11)."),
                                      "sent_at": absent()}},
        "expired": {"properties": {**NO_LEASE, **NO_PMID}},
        "reconcile_required": {"required": ["send_started_at", "last_error"],
                               "properties": {**NO_LEASE, **NO_PMID,
                                              "last_error": {"properties": {"code": {"enum": ["uncertain_outcome", "timeout", "lease_expired"]}}}}},
        "dead_letter": {"required": ["last_error"], "properties": {**NO_LEASE, **NO_PMID}},
    }
    for st, then in per.items():
        rules.append({"if": {"properties": {"status": {"const": st}}, "required": ["status"]}, "then": then})
    return {
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "$id": BASE + "/delivery-job/1.0",
        "title": "Delivery job 1.0",
        "description": "One durable email job (proposed delivery_jobs row). No recipient address, no message body, no free-text error, no financial field. State semantics and transitions: job-state-machine.md. Status: proposed (F02), not accepted.",
        "type": "object",
        "additionalProperties": False,
        "required": ["schema_version", "job_id", "purpose_key", "contact_id", "trigger_event_id", "template_id",
                     "template_version", "locale", "channel", "provider", "message_class", "priority", "status",
                     "due_at", "expires_at", "attempt_count", "max_attempts", "created_at", "updated_at"],
        "properties": props,
        "allOf": rules,
        "$defs": {"uuid": {"type": "string", "pattern": "^%s$" % UUID, "maxLength": 36}, "utc_timestamp": ts_def()},
    }


# ================================================================ FEATURE FLAGS
FLAGS = {
    # name: (env var, controls (primary capabilities that must be ready), enable gates, existing repo mapping)
    "public_launch": ("PUBLIC_LAUNCH", ["public_site", "preferences_unsubscribe"], ["G1", "G3", "G5", "G6"]),
    "checkout_live": ("CHECKOUT_LIVE", ["book_checkout", "book_fulfilment_messages", "consultation_redemption"], ["G0", "G1", "G2", "G3", "G5", "G6"]),
    # repair attempt 2 (A6D-07): workshop_followup added, so FF-INV-3 checks its readiness before the kill switch can be turned on
    "marketing_dispatch": ("MARKETING_DISPATCH", ["marketing_nurture", "workshop_followup", "preferences_unsubscribe"], ["G2", "G3", "G5", "G6"]),
    "automatic_publication": ("AUTOMATIC_PUBLICATION", ["publication_handoff"], ["G2", "G3", "G6"]),
    "paid_ads": ("PAID_ADS", ["ad_campaigns"], ["G2", "G3", "G5", "G6"]),
    "third_party_tracking": ("THIRD_PARTY_TRACKING", ["third_party_measurement"], ["G5", "G6"]),
}
NONPROD_FORCED_OFF = ["public_launch", "checkout_live", "paid_ads", "third_party_tracking"]
NONPROD_WAIVED = ["public_launch", "checkout_live"]  # staging runs behind protection + allowlist; Stripe test mode
CAPS = {
    # name: (controlling flags, templates, provider_required, enable gates)
    "public_site": (["public_launch"], [], False, ["G1", "G3", "G5", "G6"]),
    "preferences_unsubscribe": ([], [], True, ["G3", "G5"]),
    "guide_request_delivery": (["public_launch"], ["e01"], True, ["G1", "G3", "G5", "G6"]),
    "workshop_access": (["public_launch"], ["e10"], True, ["G3", "G5", "G6"]),
    "workshop_completion_signal": (["public_launch"], [], False, ["G3", "G5", "G6"]),
    "event_lifecycle": (["public_launch"], ["e06", "e07", "e08", "e09"], True, ["G0", "G3", "G4", "G5", "G6"]),
    "booking_reconciliation": (["public_launch"], [], True, ["G0", "G2", "G5", "G6"]),
    "meeting_messages": (["public_launch"], ["e15", "e16"], True, ["G3", "G5", "G6"]),
    "book_checkout": (["public_launch", "checkout_live"], [], True, ["G0", "G1", "G2", "G3", "G5", "G6"]),
    "book_fulfilment_messages": (["public_launch", "checkout_live"], ["e12", "e13", "e14"], True, ["G3", "G5", "G6"]),
    "consultation_redemption": (["public_launch", "checkout_live"], [], True, ["G1", "G5", "G6"]),
    "marketing_nurture": (["public_launch", "marketing_dispatch"], ["e02", "e03", "e04", "e05"], True, ["G2", "G3", "G5", "G6"]),
    "workshop_followup": (["public_launch", "marketing_dispatch"], ["e11"], True, ["G3", "G5", "G6"]),
    "publication_handoff": (["automatic_publication"], [], True, ["G2", "G3", "G6"]),
    "ad_campaigns": (["public_launch", "paid_ads"], [], True, ["G2", "G3", "G5", "G6"]),
    "third_party_measurement": (["public_launch", "third_party_tracking"], [], True, ["G5", "G6"]),
    "editorial_draft_job": ([], [], True, ["G2"]),
}
STATES = ["code_ready", "provider_tested", "approved", "enabled", "live_verified"]
ROLES_ALL = ["A0", "A1", "A2", "A3", "A4", "A5", "A6", "operator", "arnaud", "bill", "firm_reviewer", "privacy_owner", "account_owner"]
ROLES_HUMAN = ["bill", "firm_reviewer", "arnaud", "privacy_owner", "account_owner"]
EVID = "^(?:\\.orchestration/|docs/|fixture:)[A-Za-z0-9._/#:-]{1,200}$"
VTRUE = {"$ref": "#/$defs/value_true"}
VFALSE = {"$ref": "#/$defs/value_false"}


def flags_schema():
    ts = {"type": ["string", "null"], "pattern": TS, "maxLength": 32}
    defs = {
        "utc_timestamp": ts_def(),
        "value_true": {"properties": {"value": {"const": True}}},
        "value_false": {"properties": {"value": {"const": False}}},
        "state": {
            "type": "object", "additionalProperties": False,
            "required": ["value", "evidence_ref", "recorded_at", "recorded_by"],
            "properties": {"value": {"type": "boolean"},
                           "evidence_ref": {"type": ["string", "null"], "pattern": EVID, "maxLength": 210},
                           "recorded_at": ts,
                           "recorded_by": {"enum": ROLES_ALL + [None]}},
            "if": VTRUE,
            "then": {"properties": {"evidence_ref": {"type": "string"}, "recorded_at": {"type": "string"}, "recorded_by": {"type": "string"}}},
            "description": "One readiness state. true needs an evidence reference, a time and who recorded it.",
        },
        "approved_state": {
            "type": "object", "additionalProperties": False,
            "required": ["value", "evidence_ref", "recorded_at", "recorded_by", "gate_refs", "scope_hashes"],
            "properties": {"value": {"type": "boolean"},
                           "evidence_ref": {"type": ["string", "null"], "pattern": EVID, "maxLength": 210},
                           "recorded_at": ts,
                           "recorded_by": {"enum": ROLES_HUMAN + [None], "description": "Human gate owners only. An agent role can never record an approval."},
                           "gate_refs": {"type": "array", "uniqueItems": True, "items": {"enum": ["G0", "G1", "G2", "G3", "G4", "G5", "G6"]}},
                           "scope_hashes": {"type": "array", "uniqueItems": True, "items": {"type": "string", "pattern": "^[0-9a-f]{64}$"},
                                            "description": "sha256 of the exact assets/config the approval covers. A changed hash invalidates this approval only."}},
            "if": VTRUE,
            "then": {"properties": {"evidence_ref": {"type": "string"}, "recorded_at": {"type": "string"}, "recorded_by": {"type": "string"},
                                    "gate_refs": {"minItems": 1}, "scope_hashes": {"minItems": 1}}},
        },
        "flag": {
            "type": "object", "additionalProperties": False,
            "required": ["value", "default", "env_var", "controls", "enable_gates", "enable_evidence_ref"],
            "properties": {"value": {"type": "boolean"},
                           "default": {"const": False, "description": "Every flag defaults off (04 §7, D-035)."},
                           "env_var": {"type": "string"},
                           "controls": {"type": "array"},
                           "enable_gates": {"type": "array"},
                           "enable_evidence_ref": {"type": ["string", "null"], "pattern": EVID, "maxLength": 210}},
            "if": VTRUE,
            "then": {"properties": {"enable_evidence_ref": {"type": "string"}}},
        },
        "capability": {
            "type": "object", "additionalProperties": False,
            "required": ["controlling_flags", "templates", "provider_required", "enable_gates"] + STATES,
            "properties": {"controlling_flags": {"type": "array"}, "templates": {"type": "array"},
                           "provider_required": {"type": "boolean"}, "enable_gates": {"type": "array"},
                           "code_ready": {"$ref": "#/$defs/state"}, "provider_tested": {"$ref": "#/$defs/state"},
                           "approved": {"$ref": "#/$defs/approved_state"}, "enabled": {"$ref": "#/$defs/state"},
                           "live_verified": {"$ref": "#/$defs/state"}},
        },
    }
    flag_props = {}
    for name, (env, controls, gates) in FLAGS.items():
        flag_props[name] = {"$ref": "#/$defs/flag", "properties": {
            "env_var": {"const": env}, "controls": {"const": controls}, "enable_gates": {"const": gates}}}
    cap_props = {}
    for name, (cflags, tpls, prov, gates) in CAPS.items():
        p = {"controlling_flags": {"const": cflags}, "templates": {"const": tpls},
             "provider_required": {"const": prov}, "enable_gates": {"const": gates}}
        if not prov:
            p["provider_tested"] = {"properties": {"value": {"const": False, "description": "No external provider: not applicable, stays false."}}}
        cap_props[name] = {"$ref": "#/$defs/capability", "properties": p}

    def caps(d):
        return {"properties": {"capabilities": {"properties": d}}}

    def flags(d):
        return {"properties": {"flags": {"properties": d}}}

    def ready(cap):
        d = {"code_ready": VTRUE, "approved": VTRUE}
        if CAPS[cap][2]:
            d["provider_tested"] = VTRUE
        return d

    PROD = {"properties": {"environment": {"const": "production"}}, "required": ["environment"]}
    NONPROD = {"properties": {"environment": {"enum": ["development", "staging"]}}, "required": ["environment"]}

    def cap_is_true(cap, state):
        # non-vacuous condition: the keys must exist and the value must be true
        return {"properties": {"capabilities": {"properties": {cap: {"properties": {state: {
            "properties": {"value": {"const": True}}, "required": ["value"]}}, "required": [state]}},
            "required": [cap]}}, "required": ["capabilities"]}

    def flag_is_true(f):
        return {"properties": {"flags": {"properties": {f: {"properties": {"value": {"const": True}},
                "required": ["value"]}}, "required": [f]}}, "required": ["flags"]}
    inv = []
    # environment
    inv.append({"if": NONPROD, "then": {"allOf": [
        flags({f: VFALSE for f in NONPROD_FORCED_OFF}),
        caps({c: {"properties": {"live_verified": VFALSE}} for c in CAPS})]}})
    # capability invariants
    for cap, (cflags, tpls, prov, gates) in CAPS.items():
        then = {"allOf": [caps({cap: {"properties": ready(cap)}})]}
        if cflags:
            then["allOf"].append({"if": PROD, "then": flags({f: VTRUE for f in cflags})})
            nonprod_flags = [f for f in cflags if f not in NONPROD_WAIVED]
            if nonprod_flags:
                then["allOf"].append({"if": NONPROD, "then": flags({f: VTRUE for f in nonprod_flags})})
        inv.append({"if": cap_is_true(cap, "enabled"), "then": then})
        inv.append({"if": cap_is_true(cap, "live_verified"),
                    "then": caps({cap: {"properties": {"enabled": VTRUE}}})})
    # flag invariants
    for f, (env, controls, gates) in FLAGS.items():
        then_caps = {c: {"properties": ready(c)} for c in controls}
        if f in ("public_launch", "marketing_dispatch"):
            then_caps["preferences_unsubscribe"] = {"properties": {**ready("preferences_unsubscribe"), "enabled": VTRUE}}
        inv.append({"if": flag_is_true(f), "then": caps(then_caps)})
    return {
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "$id": BASE + "/feature-flags/1.0",
        "title": "Feature flags and capability readiness 1.0",
        "description": "Schema for one environment's flag/readiness document. Six switches, all default false. Seventeen capabilities, each with five separate readiness states (code_ready, provider_tested, approved, enabled, live_verified); no single boolean stands for all five. Gate mapping is frozen by const. The runtime gate that downstream code applies to this document (FF-RUN-1: the same non-production substitute for public_launch and checkout_live that FF-INV-1 applies here; FF-RUN-2: every promotional job also needs marketing_dispatch) is in feature-flags.md section 5.1 and email-eligibility.json runtime_gate. Semantics: feature-flags.md. Status: proposed (F02), not accepted.",
        "type": "object",
        "additionalProperties": False,
        "required": ["schema_version", "environment", "recorded_at", "flags", "capabilities"],
        "properties": {
            "schema_version": {"const": "1.0"},
            "environment": {"enum": ["development", "staging", "production"]},
            "recorded_at": {"$ref": "#/$defs/utc_timestamp"},
            "flags": {"type": "object", "additionalProperties": False, "required": list(FLAGS), "properties": flag_props},
            "capabilities": {"type": "object", "additionalProperties": False, "required": list(CAPS), "properties": cap_props},
        },
        "allOf": inv,
        "$defs": defs,
    }


# ================================================================ EXAMPLES
def T(day, hh, mm=0, ss=0):
    return "2026-10-%02dT%02d:%02d:%02dZ" % (day, hh, mm, ss)


def event_examples():
    con = rid("con")
    cnt = rid("cnt")
    job = rid("job")
    wev, ordr, rgt, bkg = rid("wev"), rid("ord"), rid("rgt"), rid("bkg")
    cev_grant, cev_revoke, cev_wf = rid("cev"), rid("cev"), rid("cev")
    guide = "guide.%s.h" % GUIDE_KEYS[0] + rhash(12)
    workshop = "workshop.%s.h" % WORKSHOP_KEYS[0] + rhash(12)
    article = "article.five-years-before-retirement.h" + rhash(12)
    tpl = "template.e07.h" + rhash(12)
    consent = "consent.nurture.h" + dhash("consent.nurture.wording")
    res = {"guide_version": guide, "consent_wording": consent, "webinar_event": wev,
           "workshop_version": workshop, "book_order": ordr, "consultation_right": rgt, "booking": bkg,
           "content_version": article, "template_version": tpl}
    subj = {"contact": con, "content_item": cnt, "job": job}
    out = {}
    for i, (t, (s, r, srcs, consent)) in enumerate(TYPE_MAP.items()):
        e = {"schema_version": "1.0", "event_id": ruuid(), "type": t, "occurred_at": T(2 + i // 8, 13 + i % 8, 5 * (i % 12)),
             "subject_id": subj[s], "locale": "fr" if i % 2 else "en",
             "source": "operator.reconciliation" if t == "webinar.attendance_verified" else srcs[0],
             "resource_id": res[r]}
        if t == "workshop.completed":
            e["resource_id"] = workshop
            e["consent_reference"] = cev_wf
        elif t == "marketing.opted_in":
            e["consent_reference"] = cev_grant
        elif t == "marketing.withdrawn":
            e["consent_reference"] = cev_revoke
        e["idempotency_key"] = ikey(t, e["subject_id"], e["resource_id"], str(i))
        out[t] = e
    return out, dict(con=con, wev=wev, ordr=ordr, bkg=bkg, cev=cev_grant, workshop=workshop, guide=guide, consent=consent)


# Repair attempt 2 (A6D-06): one valid content event for each asset kind that 1.0 could not express before.
# Keys for non-inventory kinds are fixture-prefixed, because no book, event-kit or copy key is frozen anywhere.
CONTENT_KIND_EXAMPLES = [
    ("content-draft_created-companion", "content.draft_created", "companion.s03", "editorial.draft_job"),
    ("content-approved-ink", "content.approved", "ink.a01", "editorial.approval_ledger"),
    ("content-approved-book", "content.approved", "book.fixture-book", "editorial.approval_ledger"),
    ("content-published-event", "content.published", "event.fixture-kit", "editorial.publication_handoff"),
    ("content-approved-copy", "content.approved", "copy.fixture-disclosure", "editorial.approval_ledger"),
]


def content_kind_examples():
    out = {}
    for i, (name, t, asset, src) in enumerate(CONTENT_KIND_EXAMPLES):
        cnt = did("cnt", asset)
        res = "%s.h%s" % (asset, dhash(asset + ".approved-version"))
        e = {"schema_version": "1.0", "event_id": duuid(name), "type": t, "occurred_at": T(6, 9 + i, 15),
             "subject_id": cnt, "locale": "fr" if i % 2 else "en", "source": src, "resource_id": res,
             "idempotency_key": ikey(t, cnt, res, "content-kind")}
        out[name] = e
    return out


def write_events():
    vdir, idir = os.path.join(EX, "valid", "event-envelope"), os.path.join(EX, "invalid", "event-envelope")
    ex, ids = event_examples()
    for t, e in ex.items():
        dump(os.path.join(vdir, t.replace(".", "-") + ".json"), e)
    # one extra valid: a second allowed source for a type (operator reconciliation of a booking)
    extra = copy.deepcopy(ex["meeting.confirmed"])
    extra.update(event_id=ruuid(), source="operator.reconciliation", idempotency_key=ikey("meeting.confirmed", "operator", ids["bkg"]))
    dump(os.path.join(vdir, "meeting-confirmed-operator-reconciliation.json"), extra)
    for name, e in content_kind_examples().items():
        dump(os.path.join(vdir, name + ".json"), e)
    inv = []

    def bad(name, base, mutate, rule, path, kw, text):
        e = copy.deepcopy(ex[base])
        mutate(e)
        inv.append((name, e, rule, path, kw, text))

    bad("email-in-idempotency-key", "guide.requested", lambda e: e.update(idempotency_key="ik1_jane.fixture@example.com"),
        "EV-ID-3 idempotency_key is ik1_ + 64 lowercase hex; an email address (or any '@') is impossible", "idempotency_key", "pattern",
        "The key embeds a (fictional) email address. Keys are HMACs over internal IDs, never raw personal data (04 §3).")
    bad("financial-amount-field", "guide.requested", lambda e: e.update(monthly_spending=4817),
        "EV-SHAPE-1 closed envelope: additionalProperties false; no financial field can be added", "/", "additionalProperties",
        "A workshop figure (fictional canary 4817) attached to an event. Financial inputs never leave the browser (PB-FIN-1).")
    bad("unknown-type", "guide.requested", lambda e: e.update(type="workshop.gap_calculated"),
        "EV-TYPE-1 type is one of the 20 types of 04 §3", "type", "enum",
        "An invented type. Unknown types are rejected, not stored.")
    bad("extra-property-form-body", "webinar.registered",
        lambda e: e.update(form={"name": "Fixture Person", "question": "Can I retire at 62?"}),
        "EV-SHAPE-1 closed envelope: never attach arbitrary form bodies (04 §3)", "/", "additionalProperties",
        "A raw form body (name and free-text question) attached to the envelope.")
    bad("non-utc-timestamp", "meeting.confirmed", lambda e: e.update(occurred_at="2026-10-02T10:00:00-04:00"),
        "EV-TIME-1 occurred_at is RFC 3339 UTC with a 'Z' suffix", "occurred_at", "pattern",
        "An America/Toronto offset timestamp. Storage is UTC; Toronto time is display only (D-044).")
    bad("workshop-completed-with-gap", "workshop.completed", lambda e: e.update(gap=12000),
        "EV-WS-1 workshop.completed carries no answers, gap or clip (04 §3); closed envelope", "/", "additionalProperties",
        "A derived funding gap (fictional) attached to the completion signal.")
    bad("workshop-completed-with-selected-clip", "workshop.completed", lambda e: e.update(selected_clip="w07"),
        "EV-WS-1 workshop.completed carries no selected financial-warning clip (04 §3); closed envelope", "/", "additionalProperties",
        "The branch clip chosen from the participant's answers would reveal a derived financial profile.")
    bad("workshop-completed-without-consent", "workshop.completed", lambda e: e.pop("consent_reference"),
        "EV-CONSENT-2 workshop.completed is a consented signal: consent_reference required", "/", "required",
        "A completion signal with no consent evidence may not be recorded (01 §9).")
    bad("consent-on-guide-request", "guide.requested", lambda e: e.update(consent_reference=ids["cev"]),
        "EV-CONSENT-1 consent_reference is forbidden on non-consent events; consent is never inferred from a download", "consent_reference", "not",
        "A guide request tries to carry marketing consent. Opt-in is a separate marketing.opted_in event (AM-CONSENT-1).")
    bad("payment-confirmed-by-operator", "book.payment_confirmed", lambda e: e.update(source="operator.reconciliation"),
        "EV-AUTH-PAY book.payment_confirmed only from provider.stripe_webhook (verified signature)", "source", "enum",
        "An operator (for example reading an email) cannot declare payment. Only the verified Stripe webhook can (AM-PAY-1).")
    bad("meeting-confirmed-from-click", "meeting.confirmed", lambda e: e.update(source="site.join_redirect"),
        "EV-AUTH-BOOK meeting.confirmed only from provider.booking_sync or operator.reconciliation; a click is not a booking", "source", "enum",
        "A booking-link click presented as a confirmed meeting (AM-BOOK-1).")
    bad("attendance-from-join-click", "webinar.attendance_verified", lambda e: e.update(source="site.join_redirect"),
        "EV-AUTH-ATT attendance only from provider attendance evidence or operator record; a Join click is not attendance", "source", "enum",
        "A Join click presented as verified attendance (AM-ATT-1, EV04).")
    bad("email-as-subject-id", "guide.requested", lambda e: e.update(subject_id="jane.fixture@example.com"),
        "EV-ID-1 subject_id is an internal random ID (con_/cnt_/job_ + 26 Crockford base32)", "subject_id", "pattern",
        "A (fictional) email used as the subject. Recipients live only in contacts.")
    bad("age-in-resource-id", "workshop.access_requested", lambda e: e.update(resource_id="workshop.retire-at-62.v1"),
        "EV-ID-2 contact-subject registry codes use a closed key and a hash version: no free word, no digits, no v-number", "resource_id", "pattern",
        "A resource code carrying an age (62) in an invented key, with a mutable v-number.")
    # repair attempt 2 (A6D-03): the four encodings the design review showed the 1.0 draft accepted (ADV-5a to ADV-5d),
    # plus a consent wording cited by a mutable number instead of its hash
    bad("amount-words-in-workshop-key", "workshop.completed",
        lambda e: e.update(resource_id="workshop.eight-hundred-fifty-thousand.h" + dhash("adv-5a")),
        "EV-ID-2 contact-subject registry codes use a closed key and a hash version: an amount spelled in words is not a workshop key", "resource_id", "pattern",
        "A completion signal whose workshop key spells an amount (review ADV-5a). Only the closed workshop keys are accepted.")
    bad("diagnosis-in-workshop-key", "workshop.completed",
        lambda e: e.update(resource_id="workshop.shortfall-large-warning.h" + dhash("adv-5b")),
        "EV-ID-2 contact-subject registry codes use a closed key and a hash version: a diagnosis is not a workshop key", "resource_id", "pattern",
        "A completion signal whose workshop key carries a derived diagnosis (review ADV-5b), which PB-FIN-7 forbids.")
    bad("age-in-guide-version", "guide.requested", lambda e: e.update(resource_id="guide.%s.v65" % GUIDE_KEYS[0]),
        "EV-ID-2 contact-subject registry codes use a closed key and a hash version: the version slot cannot hold a readable number", "resource_id", "pattern",
        "A retirement age (65) written in the version slot (review ADV-5c). Guide, workshop and consent codes accept only h + sha256 prefix.")
    bad("name-as-guide-key", "guide.requested", lambda e: e.update(resource_id="guide.jane-fixture.h" + dhash("adv-5d")),
        "EV-ID-2 contact-subject registry codes use a closed key and a hash version: a person's name is not a guide key", "resource_id", "pattern",
        "A (fictional) person's name used as the guide key (review ADV-5d).")
    bad("consent-wording-mutable-version", "marketing.opted_in", lambda e: e.update(resource_id="consent.nurture.v1"),
        "EV-ID-2 contact-subject registry codes use a closed key and a hash version: a consent wording is cited by the hash of the exact text shown", "resource_id", "pattern",
        "A consent wording cited by a mutable number. The hash proves which words the person saw (AM-CONSENT, G5).")
    bad("wrong-subject-kind", "delivery.failed", lambda e: e.update(subject_id=ids["con"]),
        "EV-TYPE-2 delivery.failed is about a job: subject_id must be job_", "subject_id", "pattern",
        "A contact ID as the subject of a delivery failure; the job row holds the contact link.")
    bad("locale-es", "guide.requested", lambda e: e.update(locale="es"),
        "EV-LOC-1 locale is fr or en", "locale", "enum", "Unsupported locale.")
    bad("schema-version-2", "guide.requested", lambda e: e.update(schema_version="2.0"),
        "EV-VER-1 schema_version is exactly 1.0; consumers reject other versions", "schema_version", "const", "Unknown contract version.")
    bad("missing-idempotency-key", "book.refunded", lambda e: e.pop("idempotency_key"),
        "EV-ID-3 idempotency_key is required on every accepted action", "/", "required", "No stable key: replay could duplicate side effects.")
    bad("unknown-source", "book.payment_confirmed", lambda e: e.update(source="site.checkout_return"),
        "EV-SRC-1 source is a closed enum; a return page is not a source of payment truth", "source", "enum",
        "A Stripe success-page redirect presented as a source (AM-PAY-1).")
    for name, e, rule, path, kw, text in inv:
        dump(os.path.join(idir, name + ".json"), e)
        why(os.path.join(idir, name + ".why.txt"), rule, path, kw, text)
    return ids


def job_base(ids, template, cls, status, priority, resource=None, consent=None):
    trig = ruuid()
    ver = "h" + rhash(16)
    j = {"schema_version": "1.0", "job_id": rid("job"),
         "purpose_key": "pk1:%s:%s:%s:%s" % (ids["con"], trig, template, ver),
         "contact_id": ids["con"], "trigger_event_id": trig, "template_id": template, "template_version": ver,
         "locale": "fr", "channel": "email", "provider": "brevo", "message_class": cls, "priority": priority,
         "status": status, "due_at": T(2, 14), "expires_at": T(5, 14), "attempt_count": 0, "max_attempts": 5,
         "created_at": T(2, 13, 59), "updated_at": T(2, 14)}
    if resource:
        j["resource_ref"] = resource
    if consent:
        j["consent_reference"] = consent
    return j


def write_jobs(ids):
    vdir, idir = os.path.join(EX, "valid", "delivery-job"), os.path.join(EX, "invalid", "delivery-job")
    cev = ids["cev"]
    V = {}
    V["pending-e01-guide-delivery"] = job_base(ids, "e01", "operational", "pending", 1)
    j = job_base(ids, "e07", "operational", "leased", 1, resource=ids["wev"])
    j.update(due_at=T(8, 22), expires_at=T(9, 20), updated_at=T(8, 22, 0, 5),
             lease={"worker_id": "wkr_wf02-dispatcher", "lease_token": ruuid(), "leased_at": T(8, 22, 0, 5), "leased_until": T(8, 22, 2, 5)})
    V["leased-e07-reminder"] = j
    j = job_base(ids, "e12", "operational", "sent", 2, resource=ids["ordr"])
    j.update(attempt_count=1, send_started_at=T(2, 14, 0, 7), sent_at=T(2, 14, 0, 8), provider_message_id="fixture-msg-7f3a9c", updated_at=T(2, 14, 0, 8))
    V["sent-e12-purchase-confirmation"] = j
    j = job_base(ids, "e03", "promotional", "complete", 7, consent=cev)
    j.update(attempt_count=1, send_started_at=T(4, 15, 0, 3), sent_at=T(4, 15, 0, 4), completed_at=T(5, 15),
             provider_message_id="<fixture.20261004150004@relay.example.invalid>", delivery_status="unknown",
             due_at=T(4, 15), expires_at=T(9, 15), updated_at=T(5, 15))
    V["complete-e03-nurture-delivery-unknown"] = j
    j = job_base(ids, "e10", "operational", "retry_due", 2)
    j.update(attempt_count=1, next_attempt_at=T(2, 14, 2), last_error={"code": "rate_limited", "http_status": 429, "at": T(2, 14, 0, 9)}, updated_at=T(2, 14, 0, 9))
    V["retry-due-e10-rate-limited"] = j
    j = job_base(ids, "e04", "promotional", "retry_due", 7, consent=cev)
    j.update(next_attempt_at=T(3, 4), defer_reason="daily_budget", due_at=T(2, 20), expires_at=T(7, 20), updated_at=T(2, 20, 0, 3))
    V["retry-due-e04-deferred-daily-budget"] = j
    j = job_base(ids, "e05", "promotional", "suppressed", 6, consent=cev)
    j.update(suppression_reason="already_booked", updated_at=T(2, 14, 0, 4))
    V["suppressed-e05-already-booked"] = j
    j = job_base(ids, "e08", "operational", "expired", 0, resource=ids["wev"])
    j.update(due_at=T(9, 13), expires_at=T(9, 13, 45), updated_at=T(9, 13, 45))
    V["expired-e08-reminder-past-event"] = j
    j = job_base(ids, "e13", "operational", "reconcile_required", 3, resource=rid("rgt"))
    j.update(attempt_count=1, send_started_at=T(2, 14, 10), last_error={"code": "timeout", "http_status": None, "at": T(2, 14, 10, 8)}, updated_at=T(2, 14, 10, 8))
    V["reconcile-required-e13-timeout-after-send"] = j
    j = job_base(ids, "e14", "operational", "dead_letter", 3, resource=ids["ordr"])
    j.update(attempt_count=1, last_error={"code": "input_rejected", "http_status": 400, "at": T(2, 14, 0, 6)}, updated_at=T(2, 14, 0, 6))
    V["dead-letter-e14-input-rejected"] = j
    j = job_base(ids, "e09", "promotional", "pending", 8, resource=ids["wev"], consent=cev)
    j.update(due_at=T(10, 1), expires_at=T(24, 1))
    V["pending-e09-replay-promotional-variant"] = j
    for n, j in V.items():
        dump(os.path.join(vdir, n + ".json"), j)
    inv = []

    def bad(name, base, mutate, rule, path, kw, text):
        j = copy.deepcopy(V[base])
        mutate(j)
        inv.append((name, j, rule, path, kw, text))

    bad("recipient-email-field", "pending-e01-guide-delivery", lambda j: j.update(recipient_email="jane.fixture@example.com"),
        "JS-SHAPE-1 closed job: no recipient address; it is resolved from contacts at send time", "/", "additionalProperties",
        "The job copies the recipient address. Addresses live only in contacts (PB-SINK-SUPA-2).")
    bad("email-in-purpose-key", "pending-e01-guide-delivery",
        lambda j: j.update(purpose_key="pk1:jane.fixture@example.com:guide:e01:v1"),
        "JS-KEY-1 purpose_key = pk1:contact_id:trigger_event_id:template_id:template_version (IDs only)", "purpose_key", "pattern",
        "A purpose key built from an email address.")
    bad("leased-without-lease", "leased-e07-reminder", lambda j: j.pop("lease"),
        "JS-LEASE-1 a leased job holds a lease (worker, token, leased_at, leased_until)", "/", "required",
        "A job marked leased with no bounded lease cannot be recovered safely.")
    bad("sent-without-provider-id", "sent-e12-purchase-confirmation", lambda j: j.pop("provider_message_id"),
        "JS-SENT-1 sent requires the provider's acceptance ID", "/", "required",
        "'Sent' without provider evidence is a fabricated result.")
    bad("promotional-without-consent", "complete-e03-nurture-delivery-unknown", lambda j: j.pop("consent_reference"),
        "JS-CLASS-2 promotional jobs require consent_reference (AM-CONSENT-1)", "/", "required",
        "A nurture message with no recorded consent.")
    bad("nurture-template-as-operational", "suppressed-e05-already-booked",
        lambda j: (j.update(message_class="operational", priority=3), j.pop("consent_reference")),
        "JS-CLASS-3 E03/E04/E05/E11 are promotional (email-eligibility.json); relabelling does not change the purpose", "message_class", "const",
        "E05 (15-minute meeting nurture) relabelled operational to dodge consent (04 §6: a transactional API does not make promotion non-promotional).")
    bad("free-text-error", "retry-due-e10-rate-limited",
        lambda j: j["last_error"].update(message="Brevo said: invalid recipient jane.fixture@example.com"),
        "JS-ERR-1 last_error is sanitized: code + http_status + at only", "last_error", "additionalProperties",
        "A raw provider error with an address copied into the job (04 §4: redact provider errors).")
    bad("unknown-status-delivered", "sent-e12-purchase-confirmation", lambda j: j.update(status="delivered"),
        "JS-STATE-1 status is one of the nine states; HTTP acceptance is not inbox delivery", "status", "enum",
        "An invented 'delivered' state. Delivery evidence is delivery_status on a complete job.")
    bad("non-utc-expiry", "pending-e01-guide-delivery", lambda j: j.update(expires_at="2026-10-05T10:00:00-04:00"),
        "JS-TIME-1 all timestamps are UTC with 'Z'", "expires_at", "pattern", "Offset timestamp.")
    bad("attempt-count-over-ceiling", "dead-letter-e14-input-rejected", lambda j: j.update(attempt_count=9),
        "JS-RETRY-1 attempt_count never exceeds the hard ceiling of 8", "attempt_count", "maximum", "Unbounded retries.")
    bad("promotional-high-priority", "complete-e03-nurture-delivery-unknown", lambda j: j.update(priority=1),
        "JS-PRIO-1 promotional priority is 5-9; operational messages go first", "priority", "minimum",
        "A nurture message placed ahead of operational reminders.")
    bad("unhashed-template-version", "pending-e01-guide-delivery", lambda j: j.update(template_version="v2"),
        "JS-VER-1 template_version is h + sha256 prefix (approval binds exact hashes, G3)", "template_version", "pattern",
        "A mutable version label instead of the approved hash.")
    bad("reconcile-without-send-started", "reconcile-required-e13-timeout-after-send", lambda j: j.pop("send_started_at"),
        "JS-RECON-1 reconcile_required only after a provider call may have started (send_started_at recorded)", "/", "required",
        "Without send_started_at the job was never sent and must return to retry_due instead.")
    bad("leased-with-provider-id", "leased-e07-reminder", lambda j: j.update(provider_message_id="fixture-msg-1"),
        "JS-SENT-2 a provider message ID exists only on sent/complete", "provider_message_id", "not",
        "A leased job that already has an acceptance ID is really sent; it must not be sent again.")
    bad("financial-field-in-job", "complete-e03-nurture-delivery-unknown", lambda j: j.update(gap_amount=12000),
        "JS-SHAPE-1 closed job; no financial field (PB-FIN-1)", "/", "additionalProperties",
        "A derived gap copied into a follow-up job for personalisation.")
    bad("purpose-key-mismatch", "pending-e01-guide-delivery",
        lambda j: j.update(purpose_key="pk1:%s:%s:e02:%s" % (j["contact_id"], j["trigger_event_id"], j["template_version"])),
        "JS-KEY-1 purpose_key components must equal contact_id, trigger_event_id, template_id, template_version", "/", "semantic:purpose_key",
        "Well-formed key naming a different template (e02) than the job (e01). JSON Schema cannot compare fields; the runtime check (and this harness) must.")
    bad("expiry-before-due", "pending-e01-guide-delivery", lambda j: j.update(expires_at=T(2, 13)),
        "JS-TIME-2 expires_at is later than due_at", "/", "semantic:due_before_expiry",
        "A job that expires before it is due could never be sent; creating it is a defect.")
    bad("retry-after-expiry", "retry-due-e10-rate-limited", lambda j: j.update(next_attempt_at=T(6, 0)),
        "JS-TIME-3 next_attempt_at is earlier than expires_at; otherwise the job moves to expired", "/", "semantic:retry_before_expiry",
        "A retry scheduled after expiry would send a stale message.")
    # repair attempt 3 (A6D2-01): appended with label-derived values only (no draw from rnd), so every earlier example
    # and every flag example keep their bytes.
    lbl = "r3-suppressed-e11-consent-withdrawn-at-presend"
    trig, ver = duuid(lbl + "|trigger"), "h" + dhash(lbl + "|version", 16)
    j = {"schema_version": "1.0", "job_id": did("job", lbl),
         "purpose_key": "pk1:%s:%s:e11:%s" % (ids["con"], trig, ver),
         "contact_id": ids["con"], "trigger_event_id": trig, "template_id": "e11", "template_version": ver,
         "locale": "en", "channel": "email", "provider": "brevo", "message_class": "promotional", "priority": 5,
         "consent_reference": cev, "status": "suppressed", "due_at": T(5, 14), "expires_at": T(12, 14),
         "attempt_count": 1, "max_attempts": 5, "suppression_reason": "consent_withdrawn",
         "last_error": {"code": "provider_outage", "http_status": None, "at": T(5, 14, 0, 6)},
         "created_at": T(3, 14), "updated_at": T(5, 16, 0, 2)}
    dump(os.path.join(vdir, "suppressed-e11-consent-withdrawn-at-presend.json"), j)
    V["suppressed-e11-consent-withdrawn-at-presend"] = j

    def race(j):
        # the reviewer's reproduction (evidence/F02/a6-design-attempt2/withdrawal_leased_race.py): a withdrawal that
        # marks an in-flight job suppressed after its provider call started
        for k in ("next_attempt_at", "defer_reason"):
            j.pop(k)
        j.update(status="suppressed", suppression_reason="consent_withdrawn", send_started_at=j["updated_at"], attempt_count=1)

    bad("suppressed-after-send-started", "retry-due-e04-deferred-daily-budget", race,
        "JS-SUPP-1 a suppressed job has no send_started_at: a withdrawal or other sweep suppresses only pending and retry_due jobs (T3), a leased job is stopped by its own pre-send check before the send marker (T5), and a started call ends in sent or reconcile_required (T9, T11)",
        "send_started_at", "not",
        "A promotional job marked suppressed (consent_withdrawn) although its provider call had started. The worker's result would then be fenced out, and the record would say the withdrawal stopped a message that may have been sent (review A6D2-01).")
    for name, j, rule, path, kw, text in inv:
        dump(os.path.join(idir, name + ".json"), j)
        why(os.path.join(idir, name + ".why.txt"), rule, path, kw, text)


def empty_state(approved=False):
    s = {"value": False, "evidence_ref": None, "recorded_at": None, "recorded_by": None}
    if approved:
        s.update(gate_refs=[], scope_hashes=[])
    return s


def flag_doc(env, recorded=T(1, 12)):
    d = {"schema_version": "1.0", "environment": env, "recorded_at": recorded, "flags": {}, "capabilities": {}}
    for f, (envv, controls, gates) in FLAGS.items():
        d["flags"][f] = {"value": False, "default": False, "env_var": envv, "controls": controls,
                         "enable_gates": gates, "enable_evidence_ref": None}
    for c, (cflags, tpls, prov, gates) in CAPS.items():
        d["capabilities"][c] = {"controlling_flags": cflags, "templates": tpls, "provider_required": prov,
                                "enable_gates": gates, "code_ready": empty_state(), "provider_tested": empty_state(),
                                "approved": empty_state(True), "enabled": empty_state(), "live_verified": empty_state()}
    return d


def set_state(d, cap, state, by, ref, gates=None):
    s = d["capabilities"][cap][state]
    s.update(value=True, evidence_ref=ref, recorded_at=T(1, 12), recorded_by=by)
    if state == "approved":
        s.update(gate_refs=gates, scope_hashes=[rhash(64)])


def make_ready(d, cap, gates, enabled=True, live=False):
    set_state(d, cap, "code_ready", "A0", "fixture:reviews/%s-code.md" % cap)
    if CAPS[cap][2]:
        set_state(d, cap, "provider_tested", "A6", "fixture:provider-evidence/%s.md" % cap)
    set_state(d, cap, "approved", "arnaud", "fixture:approval-packets/%s.md" % cap, gates)
    if enabled:
        set_state(d, cap, "enabled", "operator", "fixture:release.json#%s" % cap)
    if live:
        set_state(d, cap, "live_verified", "A6", "fixture:reviews/%s-live.md" % cap)


def write_flags():
    vdir, idir = os.path.join(EX, "valid", "feature-flags"), os.path.join(EX, "invalid", "feature-flags")
    V = {}
    V["defaults-production"] = flag_doc("production")
    V["defaults-staging"] = flag_doc("staging")
    d = flag_doc("staging")
    make_ready(d, "preferences_unsubscribe", ["G2"])
    make_ready(d, "guide_request_delivery", ["G2"])
    set_state(d, "book_checkout", "code_ready", "A0", "fixture:reviews/book_checkout-code.md")
    V["staging-guide-delivery-allowlist-test"] = d
    d = flag_doc("production")
    for cap in ("public_site", "preferences_unsubscribe"):
        make_ready(d, cap, ["G1", "G3", "G5", "G6"] if cap == "public_site" else ["G3", "G5"], live=True)
    make_ready(d, "guide_request_delivery", ["G1", "G3", "G5", "G6"], live=True)
    d["flags"]["public_launch"].update(value=True, enable_evidence_ref="fixture:release.json#flags/public_launch")
    V["production-public-guide-step-fictional"] = d
    for n, doc in V.items():
        dump(os.path.join(vdir, n + ".json"), doc)
    inv = []

    def bad(name, base, mutate, rule, path, kw, text):
        doc = copy.deepcopy(V[base])
        mutate(doc)
        inv.append((name, doc, rule, path, kw, text))

    def checkout_on(doc):
        doc["flags"]["checkout_live"].update(value=True, enable_evidence_ref="fixture:release.json#flags/checkout_live")
        for c in ("book_checkout", "book_fulfilment_messages", "consultation_redemption"):
            make_ready(doc, c, ["G0", "G1", "G2", "G3", "G5", "G6"])
        doc["capabilities"]["book_checkout"]["approved"] = empty_state(True)
        doc["capabilities"]["book_checkout"]["enabled"] = empty_state()

    bad("flag-on-without-approval", "production-public-guide-step-fictional", checkout_on,
        "FF-INV-3 a flag can be true only when every capability it controls is code_ready, provider_tested and approved",
        "capabilities/book_checkout/approved/value", "const",
        "checkout_live switched on while book_checkout has no recorded approval (G0 price, G1 wording, G5 process...).")
    bad("single-boolean-capability", "defaults-production", lambda d: d["capabilities"].update(guide_request_delivery=True),
        "FF-STATE-1 each capability has five separate readiness states; one boolean cannot stand for all five (04 §7)",
        "capabilities/guide_request_delivery", "type", "A capability collapsed to a single true.")
    bad("missing-readiness-state", "defaults-production", lambda d: d["capabilities"]["event_lifecycle"].pop("live_verified"),
        "FF-STATE-1 all five states are required on every capability", "capabilities/event_lifecycle", "required",
        "live_verified omitted: absence would be read as 'not needed'.")
    bad("state-true-without-evidence", "defaults-staging",
        lambda d: d["capabilities"]["workshop_access"]["code_ready"].update(value=True, recorded_at=T(1, 12), recorded_by="A2"),
        "FF-STATE-2 a true state needs an evidence reference", "capabilities/workshop_access/code_ready/evidence_ref", "type",
        "code_ready claimed with no evidence (self-report).")
    bad("live-verified-in-staging", "staging-guide-delivery-allowlist-test",
        lambda d: set_state(d, "guide_request_delivery", "live_verified", "A6", "fixture:reviews/x.md"),
        "FF-ENV-2 live_verified is a production fact; it is false outside production",
        "capabilities/guide_request_delivery/live_verified/value", "const", "A staging test presented as live verification.")
    bad("flag-default-true", "defaults-production", lambda d: d["flags"]["third_party_tracking"].update(default=True),
        "FF-DEF-1 every flag defaults to false", "flags/third_party_tracking/default", "const", "Tracking on by default.")
    bad("unknown-flag", "defaults-production",
        lambda d: d["flags"].update(newsletter={"value": False, "default": False, "env_var": "NEWSLETTER", "controls": [], "enable_gates": [], "enable_evidence_ref": None}),
        "FF-SHAPE-1 the six flags are closed; new switches need a contract version", "flags", "additionalProperties",
        "An ad-hoc flag outside the contract.")
    bad("agent-recorded-approval", "staging-guide-delivery-allowlist-test",
        lambda d: d["capabilities"]["guide_request_delivery"]["approved"].update(recorded_by="A0"),
        "FF-APPR-1 only human gate owners record approved (D-043)", "capabilities/guide_request_delivery/approved/recorded_by", "enum",
        "An agent recorded an approval.")
    bad("public-launch-in-staging", "staging-guide-delivery-allowlist-test",
        lambda d: d["flags"]["public_launch"].update(value=True, enable_evidence_ref="fixture:release.json#x"),
        "FF-ENV-1 public_launch, checkout_live, paid_ads and third_party_tracking are false outside production",
        "flags/public_launch/value", "const", "Staging opened to the public.")
    bad("enabled-without-controlling-flag", "production-public-guide-step-fictional",
        lambda d: make_ready(d, "marketing_nurture", ["G2", "G3", "G5", "G6"]),
        "FF-INV-1 in production a capability is enabled only when all its controlling flags are true",
        "flags/marketing_dispatch/value", "const", "Nurture enabled while marketing_dispatch is off.")
    bad("gate-mapping-altered", "defaults-production", lambda d: d["flags"]["paid_ads"].update(enable_gates=["G2"]),
        "FF-GATE-1 the flag-to-gate mapping is frozen by const (feature-flags.md)", "flags/paid_ads/enable_gates", "const",
        "Ads made enableable with G2 alone, skipping G3/G5/G6.")
    bad("approval-without-scope-hash", "staging-guide-delivery-allowlist-test",
        lambda d: d["capabilities"]["guide_request_delivery"]["approved"].update(scope_hashes=[]),
        "FF-APPR-2 an approval names the exact asset/config hashes it covers", "capabilities/guide_request_delivery/approved/scope_hashes", "minItems",
        "An approval not bound to any version.")
    bad("live-verified-without-enabled", "production-public-guide-step-fictional",
        lambda d: set_state(d, "workshop_access", "live_verified", "A6", "fixture:reviews/y.md"),
        "FF-INV-2 live_verified requires enabled", "capabilities/workshop_access/enabled/value", "const",
        "Live verification of a capability that is not switched on.")
    for name, doc, rule, path, kw, text in inv:
        dump(os.path.join(idir, name + ".json"), doc)
        why(os.path.join(idir, name + ".why.txt"), rule, path, kw, text)
    # repair attempt 2 (A6D-07), appended last so the earlier examples keep their random values:
    # the kill switch can be turned on only when workshop_followup is ready too (FF-INV-3 now covers it).
    d = copy.deepcopy(V["production-public-guide-step-fictional"])
    make_ready(d, "marketing_nurture", ["G2", "G3", "G5", "G6"], live=True)
    make_ready(d, "workshop_followup", ["G3", "G5", "G6"], live=True)
    d["flags"]["marketing_dispatch"].update(value=True, enable_evidence_ref="fixture:release.json#flags/marketing_dispatch")
    dump(os.path.join(vdir, "production-marketing-dispatch-fictional.json"), d)
    bad_doc = copy.deepcopy(d)
    bad_doc["capabilities"]["workshop_followup"]["approved"] = empty_state(True)
    bad_doc["capabilities"]["workshop_followup"]["enabled"] = empty_state()
    bad_doc["capabilities"]["workshop_followup"]["live_verified"] = empty_state()
    dump(os.path.join(idir, "marketing-dispatch-without-workshop-followup-ready.json"), bad_doc)
    why(os.path.join(idir, "marketing-dispatch-without-workshop-followup-ready.why.txt"),
        "FF-INV-3 a flag can be true only when every capability it controls is code_ready, provider_tested and approved; marketing_dispatch controls workshop_followup",
        "capabilities/workshop_followup/approved/value", "const",
        "marketing_dispatch switched on while the workshop follow-up (E11) has no recorded approval. Before repair attempt 2 this document was accepted, because marketing_dispatch did not list workshop_followup (review A6D-07).")


def write_resource_registry_fixture():
    """Fictional stand-in for the proposed approved resource registry (PB-ID-5, EV-REG-1): every registry code used by a
    valid event example, with the approval it would come from. Evidence only; the real registry belongs to P02."""
    entries = []
    for f in sorted(os.listdir(os.path.join(EX, "valid", "event-envelope"))):
        e = json.load(open(os.path.join(EX, "valid", "event-envelope", f), encoding="utf-8"))
        rid_ = e["resource_id"]
        if "." not in rid_:
            continue  # internal entity IDs (wev_, ord_, rgt_, bkg_) are rows, not registry codes
        kind, rest = rid_.split(".", 1)
        key, ver = rest.rsplit(".", 1)
        if any(x["resource_id"] == rid_ for x in entries):
            continue
        gate = "G5" if kind == "consent" else "G3"
        entries.append({"resource_id": rid_, "kind": kind, "key": key, "version": ver, "locales": ["en", "fr"],
                        "approval_ref": "fixture:approval-packets/%s.md#%s" % (kind, gate), "gate": gate})
    reg = {"fixture": True,
           "note": "Fictional. Shape proposed for P02 (event-envelope.md section 4.2). A code absent from this list is rejected whole even when it matches the schema pattern (PB-ID-5).",
           "entries": entries}
    dump(os.path.join(os.path.dirname(os.path.abspath(__file__)), "fixture-resource-registry.json"), reg)


if __name__ == "__main__":
    dump(os.path.join(ROOT, "event-envelope.schema.json"), envelope_schema())
    dump(os.path.join(ROOT, "delivery-job.schema.json"), job_schema())
    dump(os.path.join(ROOT, "feature-flags.json"), flags_schema())
    ids = write_events()
    write_jobs(ids)
    write_flags()
    write_resource_registry_fixture()
    print("generated")
