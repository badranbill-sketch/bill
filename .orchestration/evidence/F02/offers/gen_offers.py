#!/usr/bin/env python3
"""F02 offers lane: generate the offer-matrix, asset-manifest and worker-handoff
contracts (JSON Schema draft 2020-12) and their valid/invalid examples.

Deterministic: running it twice produces byte-identical files. The JSON files it
writes are the authority; this script only exists so that the frozen constants,
the valid instances and the single-rule negative mutations come from one source.

Writes only inside the lane's owned paths:
  .orchestration/contracts/offer-matrix.json
  .orchestration/contracts/asset-manifest.schema.json
  .orchestration/contracts/worker-handoff.schema.json
  .orchestration/contracts/examples/{valid,invalid}/{offer-matrix,asset-manifest,worker-handoff}/
Reads (never writes): .orchestration/handoffs/F00.json (for a real-valued example).
"""
from __future__ import annotations

import copy
import hashlib
import json
import pathlib
import shutil

ROOT = pathlib.Path(__file__).resolve().parents[4]
ORCH = ROOT / ".orchestration"
CONTRACTS = ORCH / "contracts"
EXAMPLES = CONTRACTS / "examples"
BASE = "https://bill.contracts.local"
DRAFT = "https://json-schema.org/draft/2020-12/schema"

# ----------------------------------------------------------------------------
# Shared vocabulary
# ----------------------------------------------------------------------------
GATES = [f"G{i}" for i in range(7)]
HUMAN_ROLES = ["arnaud", "bill", "firm_reviewer", "privacy_owner", "account_owner"]
AGENT_ROLES = ["A0", "A1", "A2", "A3", "A4", "A5", "A6"]
# Worker handoff 1.1 (A0 patch 1, D-074): the 62 planned IDs plus each split task recorded in tasks.json
# (split_from), listed explicitly. Today the only split is F02a (D-072). A further split adds its ID here in a
# new minor version (WH-ID-1); no generic suffix is accepted.
TASK_ID_PATTERN = (
    "^(?:F0[0-3]|F02a|D0[0-2]|P0[0-5]|W0[0-4]|C(?:0[0-9]|1[01])|U0[0-5]"
    "|N(?:0[0-9]|10)|R0[0-2]|H0[01]|L0[0-6]|O0[0-2])$"
)
DATE_PATTERN = "^20[0-9]{2}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12][0-9]|3[01])$"
UTC_PATTERN = (
    "^20[0-9]{2}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12][0-9]|3[01])"
    "T(?:[01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\\.[0-9]{1,6})?Z$"
)
SHA40 = "^[0-9a-f]{40}$"
SHA256 = "^[0-9a-f]{64}$"
# Repo-relative POSIX path: no leading "/" or "~", no ".." segment, no whitespace.
# Parentheses are allowed (Next.js route groups such as app/(entry)/page.tsx).
REPO_PATH = "^(?![/~])(?!.*(?:^|/)\\.\\.(?:/|$))[^\\s]+$"

# Route keys. Existing = lib/routes.ts on origin/main and origin/codex/desktop-iphone-unified
# (identical files). "ask" exists only on origin/claude/bill-centered-homepage.
# Proposed keys come from routes.md (this lane) and do not exist anywhere yet.
EXISTING_ROUTE_KEYS = ["home", "retirement", "investments", "about", "resources",
                       "meeting", "fees", "privacy", "legal"]
BRANCH_ONLY_ROUTE_KEYS = ["ask"]
PROPOSED_ROUTE_KEYS = ["workshop", "crossroads", "crossroadsConfirmed", "crossroadsJoin",
                       "crossroadsReplay", "book", "bookOrderStatus", "bookConsultation",
                       "emailPreferences", "unsubscribe"]
ALL_ROUTE_KEYS = EXISTING_ROUTE_KEYS + BRANCH_ONLY_ROUTE_KEYS + PROPOSED_ROUTE_KEYS

OFFER_IDS = ["guide-pdf", "intro-15", "book-bundle", "continued-work"]


def sha(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def closed(properties: dict, required: list | None = None, **extra) -> dict:
    out = {"type": "object", "additionalProperties": False,
           "required": list(properties) if required is None else required,
           "properties": properties}
    out.update(extra)
    return out


def dump(path: pathlib.Path, obj) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def write_text(path: pathlib.Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text.rstrip("\n") + "\n", encoding="utf-8")


def set_path(doc, pointer: str, value, delete: bool = False):
    parts = [p.replace("~1", "/").replace("~0", "~") for p in pointer.strip("/").split("/")]
    cur = doc
    for p in parts[:-1]:
        cur = cur[int(p)] if isinstance(cur, list) else cur[p]
    last = parts[-1]
    if isinstance(cur, list):
        if delete:
            del cur[int(last)]
        else:
            cur[int(last)] = value
    else:
        if delete:
            del cur[last]
        else:
            cur[last] = value


# ============================================================================
# 1. OFFER MATRIX
# ============================================================================
RECEIVES = {
    "guide-pdf": "The approved digital retirement book (PDF), free.",
    "intro-15": "15 minutes with Bill about one question, at no charge, online or in person.",
    "book-bundle": ("A paid printed copy of the approved book, including one 30-minute "
                    "consultation with Bill, online or in person."),
    "continued-work": "A discussion of scope, fees and next steps, only if the fit is mutual.",
}

GUARDRAILS = {
    "guide-pdf": [
        "Marketing consent is separate from access and fulfilment: the PDF never requires a marketing opt-in.",
        "Access is immediate and needs no email address; an emailed copy is optional.",
        "The approved PDF stays downloadable on the site when email delivery or storage fails.",
        "Only a G3-approved edition (exact sha256) is offered publicly; the review edition stays behind review protection.",
    ],
    "intro-15": [
        "Exactly 15 minutes and one question; never 60 minutes.",
        "Not a complete plan, not onboarding, and not a promise of individualized advice outside the appropriate professional process.",
        "In person is offered only once Bill's location and room are confirmed (G0); online only once the online meeting service is recorded (G0), never Zoom.",
        "A booking-link click is not a booking: only the calendar or provider event, or an audited operator reconciliation, confirms it.",
        "Every relevant page can link straight to this meeting; nothing has to be watched, finished or bought first.",
        "Scheduler links are never prefilled and intake questions ask for no balances, amounts, account numbers or documents.",
    ],
    "book-bundle": [
        "The included consultation is 30 minutes, never 60; there is no one-hour book offer.",
        "Price, currency, tax treatment, shipping, eligibility, booking, cancellation and refund terms are disclosed before payment.",
        "The promise is '30 minutes included', not a separately priced service with an invented value.",
        "A buyer keeps the included consultation even if no ongoing relationship follows; a commercial-fit screen cannot remove it.",
        "One consultation right per verified paid order, issued only after a verified signed payment webhook; never from a redirect, a hidden scheduling URL or a click.",
        "Rescheduling moves the existing right; duplicate webhooks or clicks never create a second right, book or email.",
        "Sales are capped by real calendar and print/dispatch capacity; no price or cap is used before G0 records it.",
    ],
    "continued-work": [
        "Offered only when the fit is mutual; never a condition for the free introduction or the included consultation.",
        "A book buyer still receives the included consultation when no ongoing relationship results.",
        "This matrix states no fee, minimum asset level or engagement term; any such public statement needs G1 and G3.",
    ],
}

GATE_DEPENDENCIES = {
    "guide-pdf": [
        {"gate": "G0", "covers": "which book is canonical and which languages exist (HB-04, HB-18)"},
        {"gate": "G1", "covers": "claims and professional facts in the book and its landing copy (HB-21, HB-25)"},
        {"gate": "G3", "covers": "exact sha256 of each PDF edition and of the landing copy"},
        {"gate": "G5", "covers": "optional email copy: consent wording, processors, retention (HB-27)"},
        {"gate": "G6", "covers": "public activation of the guide path"},
    ],
    "intro-15": [
        {"gate": "G0", "covers": "scheduling owner, weekly capacity, online meeting service, in-person location (HB-14, HB-15, HB-16)"},
        {"gate": "G1", "covers": "approved scope and wording of the 15-minute introduction (HB-24)"},
        {"gate": "G3", "covers": "exact hashes of the meeting page copy, W11, S13, AD04, RT01, E05 and E15"},
        {"gate": "G5", "covers": "scheduler intake questions, booking data processing and retention"},
        {"gate": "G6", "covers": "public activation of the meeting path"},
    ],
    "book-bundle": [
        {"gate": "G0", "covers": "price, currency, tax treatment, shipping, cap, consultation validity and weekly capacity (HB-20, HB-16)"},
        {"gate": "G1", "covers": "offer wording, eligibility and the entitlement unit (HB-20, HB-24)"},
        {"gate": "G2", "covers": "Stripe account, test mode first, then live (HB-06)"},
        {"gate": "G3", "covers": "exact hashes of the offer page, the terms, the print master and E12, E13, E14"},
        {"gate": "G5", "covers": "fulfilment, refund and cancellation process and shipping-address handling (HB-28)"},
        {"gate": "G6", "covers": "checkout_live and the capped book-sales rollout step"},
    ],
    "continued-work": [
        {"gate": "G1", "covers": "any public wording about continued work, scope or fees (HB-24)"},
        {"gate": "G3", "covers": "exact hash of any artifact that mentions continued work"},
    ],
}

SPEC_REFS = {
    "guide-pdf": ["01 §1", "01 §7", "04 §1", "04 §6", "D-001", "D-054"],
    "intro-15": ["01 §1", "01 §11", "01 §17", "05 W11", "D-002", "D-005", "D-008", "D-033"],
    "book-bundle": ["01 §1", "01 §11", "04 §1", "04 §2", "05 AD06", "05 E12", "D-003", "D-007", "D-010", "D-032"],
    "continued-work": ["01 §1", "D-004"],
}

NOT_INCLUDED_INTRO = [
    "a complete financial plan",
    "onboarding",
    "a promise of individualized advice outside the appropriate professional process",
]

BOOKING_TRUTH = ("Confirmed only by the calendar or provider event (provider.booking_sync) or an audited "
                 "operator reconciliation (operator.reconciliation); a booking-link click changes nothing.")

ENTITLEMENT_NEVER_FROM = [
    "a return-page redirect or its query string",
    "a hidden or reusable scheduling URL",
    "a booking-link click",
    "a second webhook delivery or a second checkout session for the same order",
]

CAP_LIMITED_BY = ["real calendar capacity", "print and dispatch capacity"]

DISCLOSURE_GATES = {
    "price": ["G0"],
    "currency": ["G0"],
    "tax_treatment": ["G0"],
    "shipping": ["G0", "G5"],
    "eligibility": ["G1"],
    "booking": ["G0", "G1"],
    "cancellation": ["G1", "G5"],
    "refund": ["G1", "G5"],
}

MUST_LINK_TO_MEETING = ["home", "retirement", "investments", "about", "resources", "fees",
                        "articles", "workshop", "crossroads", "crossroadsConfirmed",
                        "crossroadsReplay", "book"]
EXEMPT_FROM_MEETING_LINK = ["meeting", "privacy", "legal", "emailPreferences", "unsubscribe",
                            "crossroadsJoin", "bookOrderStatus", "bookConsultation"]

FORBIDDEN = [
    "a 60-minute consultation or a one-hour book offer",
    "Zoom for Bill's meetings or events",
    "an invented or estimated price, cap or value",
    "a separately priced value for the included consultation",
    "a mandatory funnel staircase before the 15-minute meeting",
    "a live customer-facing LLM answering visitors",
    "workshop financial figures leaving the browser",
]

CHANGE_CONTROL = ("Offers change only when Arnaud and Bill change them explicitly. A0 records the change in "
                  "decisions.md and issues a new contract version. No agent can change an offer.")

MEETING_TYPES = {
    "intro-15": {"offer_id": "intro-15", "duration_minutes": 15, "requires_consultation_right": False},
    "book-consultation-30": {"offer_id": "book-bundle", "duration_minutes": 30,
                             "requires_consultation_right": True},
}

OM_DEFS = {
    "date": {"type": "string", "pattern": DATE_PATTERN},
    "gate": {"enum": GATES},
    "human_role": {"enum": HUMAN_ROLES,
                   "description": "Human gate owners only (06). Agent roles A0-A6 can never record a gate."},
    "approval_ref": closed({
        "gate": {"$ref": "#/$defs/gate"},
        "record_id": {"type": "string", "pattern": "^gr-[0-9]{2,3}$"},
    }, description="Points at one entry of gate_records. The harness checks that the record exists and names the same gate (OM-REF-1, OM-REF-2)."),
    "gate_record": closed({
        "record_id": {"type": "string", "pattern": "^gr-[0-9]{2,3}$"},
        "gate": {"$ref": "#/$defs/gate"},
        "covers": {"type": "string", "minLength": 3, "maxLength": 200},
        "record_ref": {"type": "string", "minLength": 3, "maxLength": 300},
        "recorded_by_role": {"$ref": "#/$defs/human_role"},
        "recorded_on": {"$ref": "#/$defs/date"},
    }, description="One human gate record. In an authoritative document record_ref must point at decisions.md or an approval packet; in a fixture it must start with 'fixture:' (OM-DOC-1)."),
    "copy_asset_id": {"type": "string", "pattern": "^copy\\.[a-z]+(?:-[a-z]+){0,7}$",
                      "description": "asset-manifest ID of the approved wording (asset-manifest 1.0)."},
    "edition": closed({
        "locale": {"enum": ["fr", "en"]},
        "sha256": {"type": "string", "pattern": SHA256},
        "approvals": {"type": "array", "minItems": 1, "items": {"$ref": "#/$defs/approval_ref"},
                      "contains": {"type": "object", "properties": {"gate": {"const": "G3"}}, "required": ["gate"]}},
    }, description="An approved edition: exact file hash, bound to a G3 record."),
    "modalities_offered": {
        "type": "array", "uniqueItems": True, "maxItems": 2,
        "items": {"enum": ["online", "in_person"]},
        "description": "Modalities that may be presented now. Empty until G0 records them (OM-MOD-1, OM-MOD-3).",
    },
}


def gated(required_gates: list[str], value_schema: dict, extra: dict | None = None,
          description: str = "") -> dict:
    """A field that stays pending until the required human gates record it."""
    extra = extra or {}
    def_name = "approvals_" + "_".join(required_gates)
    OM_DEFS.setdefault(def_name, {
        "type": "array", "minItems": len(required_gates), "uniqueItems": True,
        "items": {"$ref": "#/$defs/approval_ref"},
        "allOf": [{"contains": {"type": "object", "properties": {"gate": {"const": g}}, "required": ["gate"]}}
                  for g in required_gates],
        "description": f"Recorded approvals: at least one approval naming each of {', '.join(required_gates)}.",
    })
    recorded_approvals = {"$ref": f"#/$defs/{def_name}"}
    props = dict(extra)
    props.update({
        "status": {"enum": ["pending", "recorded"]},
        "value": {"anyOf": [{"type": "null"}, value_schema]},
        "approvals": {"type": "array", "items": {"$ref": "#/$defs/approval_ref"}},
    })
    return {
        "type": "object", "additionalProperties": False,
        "required": list(extra) + ["status", "value", "approvals"],
        "properties": props,
        "allOf": [
            {"if": {"properties": {"status": {"const": "pending"}}},
             "then": {"properties": {"value": {"type": "null"}, "approvals": {"maxItems": 0}}}},
            {"if": {"properties": {"status": {"const": "recorded"}}},
             "then": {"properties": {"value": value_schema, "approvals": recorded_approvals}}},
        ],
        "description": (description + " " if description else "")
        + f"Pending: value null, no approvals. Recorded: value set and approvals naming {', '.join(required_gates)}.",
    }


def as_def(name: str, schema: dict) -> dict:
    OM_DEFS[name] = schema
    return {"$ref": f"#/$defs/{name}"}


PRICE_VALUE = closed({
    "amount_minor": {"type": "integer", "minimum": 1,
                     "description": "Integer minor units (cents). Only the G0-recorded amount."},
    "currency": {"type": "string", "pattern": "^[A-Z]{3}$"},
})
LOCATION_VALUE = {"type": "string", "pattern": "^[a-z][a-z0-9_]{2,40}$",
                  "description": "A location key; the address itself lives in lib/business.ts once businessDetails is approved."}
ONLINE_VALUE = {"type": "string", "pattern": "^[a-z][a-z0-9_]{1,40}$", "not": {"pattern": "zoom"},
                "description": "Online meeting service key. Zoom is forbidden (D-008)."}
VALIDITY_VALUE = closed({"unit": {"enum": ["days", "months"]}, "count": {"type": "integer", "minimum": 1}})
CAPACITY_VALUE = {"type": "integer", "minimum": 1, "description": "Slots per week recorded at G0."}
UNIT_VALUE = {"type": "string", "pattern": "^[a-z][a-z_]{2,60}$"}
DISCLOSURE_VALUE = closed({"wording_asset_id": {"$ref": "#/$defs/copy_asset_id"}})
CAP_VALUE = {"type": "integer", "minimum": 1, "description": "Bundles in the first batch, as recorded at G0."}
PRICE_VALUE = as_def("price_value", PRICE_VALUE)
LOCATION_VALUE = as_def("location_value", LOCATION_VALUE)
ONLINE_VALUE = as_def("online_service_value", ONLINE_VALUE)
VALIDITY_VALUE = as_def("validity_value", VALIDITY_VALUE)
CAPACITY_VALUE = as_def("capacity_value", CAPACITY_VALUE)
UNIT_VALUE = as_def("entitlement_unit_value", UNIT_VALUE)
DISCLOSURE_VALUE = as_def("disclosure_value", DISCLOSURE_VALUE)
CAP_VALUE = as_def("cap_value", CAP_VALUE)


def in_person_rules():
    return [
        {"if": {"properties": {"modalities_offered": {"contains": {"const": "in_person"}}},
                "required": ["modalities_offered"]},
         "then": {"properties": {"in_person_location": {"properties": {"status": {"const": "recorded"}}}}}},
        {"if": {"properties": {"modalities_offered": {"contains": {"const": "online"}}},
                "required": ["modalities_offered"]},
         "then": {"properties": {"online_service": {"properties": {"status": {"const": "recorded"}}}}}},
    ]


def meeting_block(meeting_type: str, duration: int, proposal_slots: int, route: dict) -> dict:
    return {
        "meeting_type_id": {"const": meeting_type},
        "duration_minutes": {"const": duration},
        "modalities_permitted": {"const": ["online", "in_person"]},
        "modalities_offered": {"$ref": "#/$defs/modalities_offered"},
        "in_person_location": gated(["G0"], LOCATION_VALUE, description="Bill's confirmed in-person location and room."),
        "online_service": gated(["G0"], ONLINE_VALUE, description="The online meeting service for this meeting type."),
        "capacity_per_week": gated(["G0"], CAPACITY_VALUE, description="Weekly slots Bill confirms."),
        "capacity_proposal": {"const": {"slots_per_week": proposal_slots, "buffer_minutes": 10,
                                        "status_note": "plan proposal pending G0 (D-033, HB-16)"}},
        "booking_route": {"const": route},
    }


intro_props = {
    "offer_id": {"const": "intro-15"},
    "kind": {"const": "meeting"},
    "receives": {"const": RECEIVES["intro-15"]},
    "price": {"const": {"model": "free"}},
    "question_limit": {"const": 1},
}
intro_props.update(meeting_block("intro-15", 15, 6, {"route_key": "meeting", "route_status": "existing"}))
intro_props.update({
    "not_included": {"const": NOT_INCLUDED_INTRO},
    "booking_truth": {"const": BOOKING_TRUTH},
    "primary_route": {"const": {"route_key": "meeting", "route_status": "existing"}},
    "gate_dependencies": {"const": GATE_DEPENDENCIES["intro-15"]},
    "guardrails": {"const": GUARDRAILS["intro-15"]},
    "spec_refs": {"const": SPEC_REFS["intro-15"]},
})
INTRO_SCHEMA = closed(intro_props, allOf=in_person_rules())

consult_props = {"count": {"const": 1}}
consult_props.update(meeting_block("book-consultation-30", 30, 2,
                                   {"route_key": "bookConsultation", "route_status": "proposed"}))
consult_props.update({
    "validity": gated(["G0"], VALIDITY_VALUE, description="How long the included consultation stays valid (HB-20)."),
    "separately_priced": {"const": False},
    "survives_no_fit": {"const": True},
    "removable_by_fit_screen": {"const": False},
    "booking_truth": {"const": BOOKING_TRUTH},
})
CONSULT_SCHEMA = closed(consult_props, allOf=in_person_rules())

ENTITLEMENT_SCHEMA = closed({
    "unit": gated(["G1"], UNIT_VALUE, extra={"proposal": {"const": "one_household_per_bundle"}},
                  description="Who the included consultation serves (D-007, HB-20, HB-24)."),
    "rights_per_verified_paid_order": {"const": 1},
    "issued_only_from": {"const": "book.payment_confirmed from provider.stripe_webhook (verified signature, stored event ID, current status paid)"},
    "never_from": {"const": ENTITLEMENT_NEVER_FROM},
    "reschedule": {"const": "moves the existing right to the new booking; never creates another right"},
    "refund": {"const": "an unused right is voided as the approved refund terms say (HB-20, HB-28)"},
})

DISCLOSURES_SCHEMA = closed({
    k: gated(g, DISCLOSURE_VALUE, description=f"Pre-payment disclosure '{k}'.") for k, g in DISCLOSURE_GATES.items()
}, description="Every key is mandatory: the terms disclosed before payment (01 §1: price, shipping, eligibility, booking, cancellation; 01 §11: currency, tax treatment, refund).")

on_sale_requirements = {
    "properties": {
        "price": {"properties": {"status": {"const": "recorded"}}},
        "cap": {"properties": {"status": {"const": "recorded"}}},
        "approved_print_editions": {"minItems": 1},
        "entitlement": {"properties": {"unit": {"properties": {"status": {"const": "recorded"}}}}},
        "included_consultation": {"properties": {
            "validity": {"properties": {"status": {"const": "recorded"}}},
            "capacity_per_week": {"properties": {"status": {"const": "recorded"}}},
            "modalities_offered": {"minItems": 1},
        }},
        "prepayment_disclosures": {"properties": {
            k: {"properties": {"status": {"const": "recorded"}}} for k in DISCLOSURE_GATES
        }},
    }
}

BOOK_SCHEMA = closed({
    "offer_id": {"const": "book-bundle"},
    "kind": {"const": "printed_book_with_consultation"},
    "receives": {"const": RECEIVES["book-bundle"]},
    "price": gated(["G0"], PRICE_VALUE, extra={"model": {"const": "paid"}},
                   description="Book price. No price exists anywhere today (D-032); none may be invented."),
    "approved_print_editions": {"type": "array", "uniqueItems": True, "maxItems": 2,
                                "items": {"$ref": "#/$defs/edition"}},
    "included_consultation": CONSULT_SCHEMA,
    "entitlement": ENTITLEMENT_SCHEMA,
    "cap": gated(["G0"], CAP_VALUE,
                 extra={"proposal_bundles": {"const": 8}, "limited_by": {"const": CAP_LIMITED_BY}},
                 description="Number of bundles in the first batch (plan proposal 8, D-032)."),
    "prepayment_disclosures": DISCLOSURES_SCHEMA,
    "sale_state": {"enum": ["not_on_sale", "test_mode_only", "on_sale"],
                   "description": "on_sale requires every G0/G1/G5 field recorded (OM-SALE-1). test_mode_only is Stripe test mode behind review protection with a product marked TEST (D-032)."},
    "primary_route": {"const": {"route_key": "book", "route_status": "proposed"}},
    "gate_dependencies": {"const": GATE_DEPENDENCIES["book-bundle"]},
    "guardrails": {"const": GUARDRAILS["book-bundle"]},
    "spec_refs": {"const": SPEC_REFS["book-bundle"]},
}, allOf=[{"if": {"properties": {"sale_state": {"const": "on_sale"}}, "required": ["sale_state"]},
           "then": on_sale_requirements}])

GUIDE_SCHEMA = closed({
    "offer_id": {"const": "guide-pdf"},
    "kind": {"const": "digital_download"},
    "receives": {"const": RECEIVES["guide-pdf"]},
    "price": {"const": {"model": "free"}},
    "duration_minutes": {"const": None},
    "access": {"const": {"requires_marketing_consent": False, "requires_email": False,
                         "download_fallback_when_email_fails": True}},
    "approved_editions": {"type": "array", "uniqueItems": True, "maxItems": 2,
                          "items": {"$ref": "#/$defs/edition"}},
    "primary_route": {"const": {"route_key": "resources", "route_status": "existing"}},
    "gate_dependencies": {"const": GATE_DEPENDENCIES["guide-pdf"]},
    "guardrails": {"const": GUARDRAILS["guide-pdf"]},
    "spec_refs": {"const": SPEC_REFS["guide-pdf"]},
})

CONTINUED_SCHEMA = closed({
    "offer_id": {"const": "continued-work"},
    "kind": {"const": "discussion"},
    "receives": {"const": RECEIVES["continued-work"]},
    "price": {"const": {"model": "not_stated_in_matrix"}},
    "duration_minutes": {"const": None},
    "requires_mutual_fit": {"const": True},
    "prerequisite_for_other_offers": {"const": False},
    "primary_route": {"const": None},
    "gate_dependencies": {"const": GATE_DEPENDENCIES["continued-work"]},
    "guardrails": {"const": GUARDRAILS["continued-work"]},
    "spec_refs": {"const": SPEC_REFS["continued-work"]},
})

MEETING_TYPES_SCHEMA = closed({
    mt: closed({k: {"const": v} for k, v in body.items()}) for mt, body in MEETING_TYPES.items()
}, description="Bookable meeting types. These IDs are the bookings.offer_id values in operational-data-model.md.")

RULES_SCHEMA = closed({
    "no_mandatory_funnel_staircase": closed({
        "direct_meeting_offer_id": {"const": "intro-15"},
        "intro_15_prerequisites": {"type": "array", "maxItems": 0,
                                   "description": "Nothing must be watched, finished or bought before the 15-minute meeting."},
        "must_link_to_meeting": {"const": MUST_LINK_TO_MEETING},
        "exempt_from_meeting_link": {"const": EXEMPT_FROM_MEETING_LINK},
        "workshop_ending_useful_without_email_or_booking": {"const": True},
    }),
    "forbidden": {"const": FORBIDDEN},
    "change_control": {"const": CHANGE_CONTROL},
})

AUTH_RECORD_REF = ("^\\.orchestration/(?:decisions\\.md#D-[0-9]{3}[a-z]?"
                   "|approval-packets/[A-Za-z0-9._-]+(?:/[A-Za-z0-9._-]+)*)$")
FIXTURE_REF = "^fixture:[a-z0-9][a-z0-9-]{2,80}$"

OFFER_MATRIX_SCHEMA = {
    "$schema": DRAFT,
    "$id": f"{BASE}/offer-matrix/1.0",
    "title": "Offer matrix 1.0",
    "description": (
        "The one authoritative offer matrix (03 A0). The frozen offers of 01 §1 are fixed by const: "
        "what is received, durations (15 and 30 minutes; 60 is impossible), guardrails, gate dependencies "
        "and the no-staircase rule. Fields G0/G1/G5 must record (price, cap, entitlement unit, location, "
        "online service, validity, capacity, disclosures) stay 'pending' with null values until a human "
        "gate record exists. Status: proposed, submitted, not accepted. See offer-matrix.md."
    ),
    "type": "object",
    "additionalProperties": False,
    "required": ["contract", "contract_version", "document_kind", "as_of", "gate_records",
                 "offers", "meeting_types", "rules"],
    "properties": {
        "contract": {"const": "offer-matrix"},
        "contract_version": {"const": "1.0"},
        "document_kind": {"enum": ["authoritative", "fixture"],
                          "description": "fixture documents may only cite 'fixture:' records; authoritative documents may never (OM-DOC-1)."},
        "as_of": {"$ref": "#/$defs/date"},
        "gate_records": {"type": "array", "uniqueItems": True, "items": {"$ref": "#/$defs/gate_record"}},
        "offers": closed({
            "guide-pdf": GUIDE_SCHEMA,
            "intro-15": INTRO_SCHEMA,
            "book-bundle": BOOK_SCHEMA,
            "continued-work": CONTINUED_SCHEMA,
        }, description="Exactly the four frozen offers; no other offer can be added in 1.0."),
        "meeting_types": MEETING_TYPES_SCHEMA,
        "rules": RULES_SCHEMA,
    },
    "allOf": [
        {"if": {"properties": {"document_kind": {"const": "authoritative"}}, "required": ["document_kind"]},
         "then": {"properties": {"gate_records": {"items": {"properties": {"record_ref": {"pattern": AUTH_RECORD_REF}}}}}}},
        {"if": {"properties": {"document_kind": {"const": "fixture"}}, "required": ["document_kind"]},
         "then": {"properties": {"gate_records": {"items": {"properties": {"record_ref": {"pattern": FIXTURE_REF}}}}}}},
    ],
    "$defs": OM_DEFS,
}

PENDING = {"status": "pending", "value": None, "approvals": []}


def pending(**extra):
    out = dict(extra)
    out.update(copy.deepcopy(PENDING))
    return out


def meeting_instance(meeting_type, duration, slots, route):
    return {
        "meeting_type_id": meeting_type,
        "duration_minutes": duration,
        "modalities_permitted": ["online", "in_person"],
        "modalities_offered": [],
        "in_person_location": pending(),
        "online_service": pending(),
        "capacity_per_week": pending(),
        "capacity_proposal": {"slots_per_week": slots, "buffer_minutes": 10,
                              "status_note": "plan proposal pending G0 (D-033, HB-16)"},
        "booking_route": route,
    }


def current_offer_matrix():
    intro = {"offer_id": "intro-15", "kind": "meeting", "receives": RECEIVES["intro-15"],
             "price": {"model": "free"}, "question_limit": 1}
    intro.update(meeting_instance("intro-15", 15, 6, {"route_key": "meeting", "route_status": "existing"}))
    intro.update({"not_included": NOT_INCLUDED_INTRO, "booking_truth": BOOKING_TRUTH,
                  "primary_route": {"route_key": "meeting", "route_status": "existing"},
                  "gate_dependencies": GATE_DEPENDENCIES["intro-15"], "guardrails": GUARDRAILS["intro-15"],
                  "spec_refs": SPEC_REFS["intro-15"]})
    consult = {"count": 1}
    consult.update(meeting_instance("book-consultation-30", 30, 2,
                                    {"route_key": "bookConsultation", "route_status": "proposed"}))
    consult.update({"validity": pending(), "separately_priced": False, "survives_no_fit": True,
                    "removable_by_fit_screen": False, "booking_truth": BOOKING_TRUTH})
    return {
        "contract": "offer-matrix",
        "contract_version": "1.0",
        "document_kind": "authoritative",
        "as_of": "2026-09-30",
        "gate_records": [],
        "offers": {
            "guide-pdf": {
                "offer_id": "guide-pdf", "kind": "digital_download", "receives": RECEIVES["guide-pdf"],
                "price": {"model": "free"}, "duration_minutes": None,
                "access": {"requires_marketing_consent": False, "requires_email": False,
                           "download_fallback_when_email_fails": True},
                "approved_editions": [],
                "primary_route": {"route_key": "resources", "route_status": "existing"},
                "gate_dependencies": GATE_DEPENDENCIES["guide-pdf"], "guardrails": GUARDRAILS["guide-pdf"],
                "spec_refs": SPEC_REFS["guide-pdf"],
            },
            "intro-15": intro,
            "book-bundle": {
                "offer_id": "book-bundle", "kind": "printed_book_with_consultation",
                "receives": RECEIVES["book-bundle"],
                "price": pending(model="paid"),
                "approved_print_editions": [],
                "included_consultation": consult,
                "entitlement": {
                    "unit": pending(proposal="one_household_per_bundle"),
                    "rights_per_verified_paid_order": 1,
                    "issued_only_from": "book.payment_confirmed from provider.stripe_webhook (verified signature, stored event ID, current status paid)",
                    "never_from": ENTITLEMENT_NEVER_FROM,
                    "reschedule": "moves the existing right to the new booking; never creates another right",
                    "refund": "an unused right is voided as the approved refund terms say (HB-20, HB-28)",
                },
                "cap": pending(proposal_bundles=8, limited_by=CAP_LIMITED_BY),
                "prepayment_disclosures": {k: pending() for k in DISCLOSURE_GATES},
                "sale_state": "not_on_sale",
                "primary_route": {"route_key": "book", "route_status": "proposed"},
                "gate_dependencies": GATE_DEPENDENCIES["book-bundle"], "guardrails": GUARDRAILS["book-bundle"],
                "spec_refs": SPEC_REFS["book-bundle"],
            },
            "continued-work": {
                "offer_id": "continued-work", "kind": "discussion", "receives": RECEIVES["continued-work"],
                "price": {"model": "not_stated_in_matrix"}, "duration_minutes": None,
                "requires_mutual_fit": True, "prerequisite_for_other_offers": False, "primary_route": None,
                "gate_dependencies": GATE_DEPENDENCIES["continued-work"],
                "guardrails": GUARDRAILS["continued-work"], "spec_refs": SPEC_REFS["continued-work"],
            },
        },
        "meeting_types": copy.deepcopy(MEETING_TYPES),
        "rules": {
            "no_mandatory_funnel_staircase": {
                "direct_meeting_offer_id": "intro-15",
                "intro_15_prerequisites": [],
                "must_link_to_meeting": MUST_LINK_TO_MEETING,
                "exempt_from_meeting_link": EXEMPT_FROM_MEETING_LINK,
                "workshop_ending_useful_without_email_or_booking": True,
            },
            "forbidden": FORBIDDEN,
            "change_control": CHANGE_CONTROL,
        },
    }


def fixture_all_recorded():
    """Fictional document: every gated field recorded with meaningless fixture values.
    Currency XXX is the ISO 4217 'no currency' code; amount 1 is deliberately not a price."""
    doc = current_offer_matrix()
    doc["document_kind"] = "fixture"
    records = []

    def rec(gate, covers):
        rid = f"gr-{len(records) + 1:02d}"
        records.append({"record_id": rid, "gate": gate, "covers": covers,
                        "record_ref": f"fixture:{gate.lower()}-{len(records) + 1:02d}",
                        "recorded_by_role": {"G0": "arnaud", "G1": "firm_reviewer", "G3": "bill",
                                             "G5": "privacy_owner"}[gate],
                        "recorded_on": "2026-09-30"})
        return {"gate": gate, "record_id": rid}

    def recorded(value, gates, **extra):
        out = dict(extra)
        out.update({"status": "recorded", "value": value, "approvals": [rec(g, "fixture") for g in gates]})
        return out

    g = doc["offers"]["guide-pdf"]
    g["approved_editions"] = [{"locale": "en", "sha256": sha("fixture:guide-pdf:en"),
                               "approvals": [rec("G3", "fixture PDF edition")]}]
    i = doc["offers"]["intro-15"]
    i["modalities_offered"] = ["online", "in_person"]
    i["in_person_location"] = recorded("fixture_office", ["G0"])
    i["online_service"] = recorded("fixture_video_service", ["G0"])
    i["capacity_per_week"] = recorded(1, ["G0"])
    b = doc["offers"]["book-bundle"]
    b["price"] = recorded({"amount_minor": 1, "currency": "XXX"}, ["G0"], model="paid")
    b["approved_print_editions"] = [{"locale": "en", "sha256": sha("fixture:book-print:en"),
                                     "approvals": [rec("G3", "fixture print master")]}]
    c = b["included_consultation"]
    c["modalities_offered"] = ["online"]
    c["online_service"] = recorded("fixture_video_service", ["G0"])
    c["capacity_per_week"] = recorded(1, ["G0"])
    c["validity"] = recorded({"unit": "days", "count": 1}, ["G0"])
    b["entitlement"]["unit"] = recorded("fixture_unit", ["G1"], proposal="one_household_per_bundle")
    b["cap"] = recorded(1, ["G0"], proposal_bundles=8, limited_by=CAP_LIMITED_BY)
    b["prepayment_disclosures"] = {
        k: recorded({"wording_asset_id": f"copy.fixture-{k.replace('_', '-')}"}, gates)
        for k, gates in DISCLOSURE_GATES.items()
    }
    b["sale_state"] = "on_sale"
    doc["gate_records"] = records
    return doc


def fixture_test_mode():
    doc = current_offer_matrix()
    doc["document_kind"] = "fixture"
    doc["offers"]["book-bundle"]["sale_state"] = "test_mode_only"
    return doc


OM_INVALID = []  # (name, mutate(doc)->doc, rule, breaks, expect_keyword, expect_path)


def om_case(name, rule, breaks, keyword, path, base="current"):
    def deco(fn):
        OM_INVALID.append((name, fn, rule, breaks, keyword, path, base))
        return fn
    return deco


@om_case("book-consultation-60-minutes", "OM-DUR-2",
         "The consultation included with the book is exactly 30 minutes; 60 minutes is impossible.",
         "const", "/offers/book-bundle/included_consultation/duration_minutes")
def _(d):
    d["offers"]["book-bundle"]["included_consultation"]["duration_minutes"] = 60
    return d


@om_case("intro-60-minutes", "OM-DUR-1",
         "The free introduction is exactly 15 minutes; 60 minutes is impossible.",
         "const", "/offers/intro-15/duration_minutes")
def _(d):
    d["offers"]["intro-15"]["duration_minutes"] = 60
    return d


@om_case("meeting-type-60-minutes", "OM-DUR-3",
         "The bookable meeting type for the book consultation is fixed at 30 minutes.",
         "const", "/meeting_types/book-consultation-30/duration_minutes")
def _(d):
    d["meeting_types"]["book-consultation-30"]["duration_minutes"] = 60
    return d


@om_case("invented-price-while-pending", "OM-PRICE-1",
         "A price value while the price is still pending G0 is an invented price.",
         "type", "/offers/book-bundle/price/value")
def _(d):
    d["offers"]["book-bundle"]["price"]["value"] = {"amount_minor": 2995, "currency": "CAD"}
    return d


@om_case("price-recorded-without-g0-approval", "OM-PRICE-2",
         "A recorded price must cite a G0 gate record; without one it is an invented price.",
         "minItems", "/offers/book-bundle/price/approvals")
def _(d):
    p = d["offers"]["book-bundle"]["price"]
    p["status"] = "recorded"
    p["value"] = {"amount_minor": 2995, "currency": "CAD"}
    return d


@om_case("missing-disclosure-list", "OM-DISC-1",
         "The book offer must carry the pre-payment disclosure list.",
         "required", "/offers/book-bundle")
def _(d):
    del d["offers"]["book-bundle"]["prepayment_disclosures"]
    return d


@om_case("missing-cancellation-disclosure", "OM-DISC-2",
         "Every mandatory pre-payment disclosure is present; cancellation cannot be dropped.",
         "required", "/offers/book-bundle/prepayment_disclosures")
def _(d):
    del d["offers"]["book-bundle"]["prepayment_disclosures"]["cancellation"]
    return d


@om_case("on-sale-with-pending-terms", "OM-SALE-1",
         "The book cannot be on sale while its price, cap and terms are pending.",
         "const", "/offers/book-bundle/price/status")
def _(d):
    d["offers"]["book-bundle"]["sale_state"] = "on_sale"
    return d


@om_case("in-person-without-confirmed-location", "OM-MOD-1",
         "In person may be offered only after G0 records Bill's location and room.",
         "const", "/offers/intro-15/in_person_location/status")
def _(d):
    d["offers"]["intro-15"]["modalities_offered"] = ["in_person"]
    return d


@om_case("online-without-recorded-service", "OM-MOD-3",
         "Online may be offered only after G0 records the online meeting service.",
         "const", "/offers/book-bundle/included_consultation/online_service/status")
def _(d):
    d["offers"]["book-bundle"]["included_consultation"]["modalities_offered"] = ["online"]
    return d


@om_case("zoom-online-service", "OM-MOD-2",
         "Zoom is forbidden as the online meeting service (D-008).",
         "not", "/offers/intro-15/online_service/value", base="fixture")
def _(d):
    d["offers"]["intro-15"]["online_service"]["value"] = "zoom_meetings"
    return d


@om_case("separately-priced-consultation", "OM-BOOK-1",
         "The included consultation has no separate price or invented value.",
         "const", "/offers/book-bundle/included_consultation/separately_priced")
def _(d):
    d["offers"]["book-bundle"]["included_consultation"]["separately_priced"] = True
    return d


@om_case("two-rights-per-order", "OM-BOOK-2",
         "One verified paid order creates exactly one consultation right.",
         "const", "/offers/book-bundle/entitlement/rights_per_verified_paid_order")
def _(d):
    d["offers"]["book-bundle"]["entitlement"]["rights_per_verified_paid_order"] = 2
    return d


@om_case("fit-screen-removes-consultation", "OM-BOOK-3",
         "A commercial-fit screen cannot remove a consultation already sold.",
         "const", "/offers/book-bundle/included_consultation/removable_by_fit_screen")
def _(d):
    d["offers"]["book-bundle"]["included_consultation"]["removable_by_fit_screen"] = True
    return d


@om_case("funnel-prerequisite", "OM-FUNNEL-1",
         "No mandatory funnel staircase: the 15-minute meeting has no prerequisite.",
         "maxItems", "/rules/no_mandatory_funnel_staircase/intro_15_prerequisites")
def _(d):
    d["rules"]["no_mandatory_funnel_staircase"]["intro_15_prerequisites"] = ["workshop_completed"]
    return d


@om_case("guide-requires-consent", "OM-PDF-1",
         "The free PDF never requires marketing consent.",
         "const", "/offers/guide-pdf/access")
def _(d):
    d["offers"]["guide-pdf"]["access"]["requires_marketing_consent"] = True
    return d


@om_case("fixture-ref-in-authoritative", "OM-DOC-1",
         "An authoritative document may cite only decisions.md or approval-packet records, never 'fixture:'.",
         "pattern", "/gate_records/0/record_ref", base="fixture")
def _(d):
    d["document_kind"] = "authoritative"
    return d


@om_case("agent-recorded-gate", "OM-DOC-2",
         "Gate records are written by human gate owners only; an agent role cannot record a gate.",
         "enum", "/gate_records/0/recorded_by_role", base="fixture")
def _(d):
    d["gate_records"][0]["recorded_by_role"] = "A0"
    return d


@om_case("cap-recorded-without-approval", "OM-CAP-1",
         "A recorded cap must cite a G0 gate record.",
         "minItems", "/offers/book-bundle/cap/approvals")
def _(d):
    c = d["offers"]["book-bundle"]["cap"]
    c["status"] = "recorded"
    c["value"] = 8
    return d


@om_case("extra-one-hour-offer", "OM-SHAPE-1",
         "Exactly the four frozen offers exist; a fifth (one-hour) offer cannot be added.",
         "additionalProperties", "/offers")
def _(d):
    d["offers"]["one-hour-session"] = {"offer_id": "one-hour-session", "duration_minutes": 60}
    return d


@om_case("approval-record-missing", "OM-REF-1",
         "Every approvals[].record_id must exist in gate_records (harness rule; schema-valid on its own).",
         "harness:OM-REF-1", "/offers/intro-15/online_service/approvals/0/record_id", base="fixture")
def _(d):
    d["offers"]["intro-15"]["online_service"]["approvals"][0]["record_id"] = "gr-99"
    return d


@om_case("approval-gate-mismatch", "OM-REF-2",
         "The referenced gate record must name the same gate as the approval (harness rule).",
         "harness:OM-REF-2", "/offers/book-bundle/price/approvals/0/record_id", base="fixture")
def _(d):
    # point the price's G0 approval at a G3 record
    g3 = next(r for r in d["gate_records"] if r["gate"] == "G3")
    d["offers"]["book-bundle"]["price"]["approvals"][0]["record_id"] = g3["record_id"]
    return d


# ============================================================================
# 2. ASSET MANIFEST
# ============================================================================
ASSET_ID_PATTERN = (
    "^(?:capsule\\.s(?:0[1-9]|1[0-8])"
    "|companion\\.s(?:0[1-9]|1[0-8])"
    "|clip\\.w(?:0[0-9]|1[01])"
    "|case\\.c(?:0[1-9]|10)"
    "|ink\\.a0[1-8]"
    "|template\\.e(?:0[1-9]|1[0-6])"
    "|ad\\.(?:ad0[1-6]|rt0[1-3])"
    "|(?:article|page|guide|book|event|copy)\\.[a-z]+(?:-[a-z]+){0,7})$"
)
STATUSES = ["brief", "draft", "reviewed", "recorded", "edited", "approved", "published"]
MEDIA = ["video", "audio", "text", "image", "print", "mixed"]
LANG_AVAIL = ["not_recorded", "language_recorded", "captions_only", "text_only", "not_applicable"]
HASH_METHODS = ["file-sha256-v1", "articles-contentFingerprint-v1", "json-canonical-sha256-v1",
                "bundle-sha256-v1", "rendered-text-sha256-v1"]
CTAS = ["intro-15", "guide-pdf", "book-bundle", "workshop", "crossroads", "share-with-partner", "none"]
CHANNELS = ["site", "email", "linkedin", "facebook", "instagram", "meta_ads", "live_event", "workshop", "print"]
AUTH_APPROVAL_REF = ("^(?:content/approvals\\.json#[a-z0-9-]+\\.md"
                     "|content/asset-approvals\\.json#[a-z0-9.-]+@(?:fr|en|zxx)@v[1-9][0-9]{0,2}"
                     "|\\.orchestration/approval-packets/[A-Za-z0-9._-]+(?:/[A-Za-z0-9._-]+)*)$")
AUTH_CONSENT_REF = ("^(?:\\.orchestration/approval-packets/[A-Za-z0-9._-]+(?:/[A-Za-z0-9._-]+)*"
                    "|owner-storage:[A-Za-z0-9._/-]{3,200})$")


def st_in(*values):
    return {"properties": {"status": {"enum": list(values)}}, "required": ["status"]}


ENTRY_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "required": ["asset_id", "locale", "version", "title_internal", "owner_role", "medium", "status",
                 "language_availability", "captions_source_locale", "source_path", "factual_claims",
                 "offer_refs", "credential_claims", "rights", "recording", "review_hash", "approval",
                 "intended_route_key", "cta", "primary_channel", "publication_id", "published_at",
                 "published_content_sha256"],
    "properties": {
        "asset_id": {"type": "string", "pattern": ASSET_ID_PATTERN,
                     "description": "Plan inventory ID (05) or a registry key of letters and hyphens (no digits), compatible with event-envelope resource codes."},
        "locale": {"enum": ["fr", "en", "zxx"],
                   "description": "zxx = no linguistic content (for example an ink drawing without text)."},
        "version": {"type": "integer", "minimum": 1, "maximum": 999},
        "title_internal": {"type": "string", "minLength": 3, "maxLength": 160},
        "owner_role": {"enum": AGENT_ROLES + ["bill", "arnaud", "firm_reviewer"]},
        "medium": {"enum": MEDIA},
        "status": {"enum": STATUSES},
        "language_availability": {"enum": LANG_AVAIL},
        "captions_source_locale": {"enum": ["fr", "en", None]},
        "source_path": {"anyOf": [{"type": "null"}, {"type": "string", "pattern": REPO_PATH}]},
        "factual_claims": closed({
            "present": {"type": "boolean"},
            "sources": {"type": "array", "items": closed({
                "title": {"type": "string", "minLength": 3, "maxLength": 200},
                "url": {"type": "string", "pattern": "^https://[^\\s]+$"},
                "accessed": {"anyOf": [{"type": "null"}, {"type": "string", "pattern": DATE_PATTERN}]},
            })},
        }),
        "offer_refs": {"type": "array", "uniqueItems": True, "items": {"enum": OFFER_IDS}},
        "credential_claims": {"type": "boolean"},
        "rights": closed({
            "status": {"enum": ["pending", "owned_by_bill", "licensed", "created_for_project", "not_applicable"]},
            "holder": {"anyOf": [{"type": "null"}, {"type": "string", "minLength": 2, "maxLength": 120}]},
            "evidence_ref": {"anyOf": [{"type": "null"}, {"type": "string", "minLength": 3, "maxLength": 300}]},
            "synthetic_bill_likeness": {"const": False,
                                        "description": "No voice clone, avatar or synthetic face of Bill in 1.0 (D-016)."},
        }),
        "recording": {"anyOf": [{"type": "null"}, closed({
            "master_ref": {"type": "string", "minLength": 3, "maxLength": 300,
                           "description": "Owner-controlled storage location of the master (never git)."},
            "master_sha256": {"type": "string", "pattern": SHA256},
            "duration_seconds": {"type": "number", "exclusiveMinimum": 0,
                                 "description": "Actual measured duration, not the script target."},
            "recorded_on": {"type": "string", "pattern": DATE_PATTERN},
            "consent_ref": {"type": "string", "minLength": 3, "maxLength": 300},
            "captions_sha256": {"anyOf": [{"type": "null"}, {"type": "string", "pattern": SHA256}]},
            "transcript_sha256": {"anyOf": [{"type": "null"}, {"type": "string", "pattern": SHA256}]},
        })]},
        "review_hash": {"anyOf": [{"type": "null"}, closed({
            "method": {"enum": HASH_METHODS},
            "sha256": {"type": "string", "pattern": SHA256},
        })]},
        "approval": {"anyOf": [{"type": "null"}, closed({
            "gates": {"type": "array", "minItems": 1, "uniqueItems": True, "items": {"enum": GATES}},
            "approved_by_roles": {"type": "array", "minItems": 1, "uniqueItems": True,
                                  "items": {"enum": HUMAN_ROLES}},
            "approved_on": {"type": "string", "pattern": DATE_PATTERN},
            "record_ref": {"type": "string", "minLength": 3, "maxLength": 300},
        })]},
        "intended_route_key": {"enum": ALL_ROUTE_KEYS + [None]},
        "cta": {"enum": CTAS},
        "primary_channel": {"enum": CHANNELS},
        "publication_id": {"anyOf": [{"type": "null"}, {"type": "string", "minLength": 1, "maxLength": 300}]},
        "published_at": {"anyOf": [{"type": "null"}, {"type": "string", "pattern": UTC_PATTERN}]},
        "published_content_sha256": {"anyOf": [{"type": "null"}, {"type": "string", "pattern": SHA256}]},
    },
    "allOf": [
        # AM-PUB-1: published => publication fields present
        {"if": st_in("published"),
         "then": {"properties": {"publication_id": {"type": "string"}, "published_at": {"type": "string"},
                                 "published_content_sha256": {"type": "string"}}}},
        # AM-PUB-2: not published => no publication fields
        {"if": st_in("brief", "draft", "reviewed", "recorded", "edited", "approved"),
         "then": {"properties": {"publication_id": {"type": "null"}, "published_at": {"type": "null"},
                                 "published_content_sha256": {"type": "null"}}}},
        # AM-HASH-1 / AM-APPR-0: approved or published => review hash and approval
        {"if": st_in("approved", "published"),
         "then": {"properties": {
             "review_hash": {"type": "object"},
             "approval": {"type": "object", "properties": {
                 "gates": {"contains": {"const": "G3"}}}},
             "rights": {"properties": {"status": {"not": {"const": "pending"}}}},
         }}},
        # AM-APPR-5: earlier statuses carry no approval
        {"if": st_in("brief", "draft", "reviewed", "recorded", "edited"),
         "then": {"properties": {"approval": {"type": "null"}}}},
        # AM-APPR-3: offer or credential content => G1 in the approval
        {"if": {"anyOf": [{"properties": {"offer_refs": {"minItems": 1}}, "required": ["offer_refs"]},
                          {"properties": {"credential_claims": {"const": True}}, "required": ["credential_claims"]}],
                "properties": {"approval": {"type": "object"}}, "required": ["approval"]},
         "then": {"properties": {"approval": {"properties": {"gates": {"contains": {"const": "G1"}}}}}}},
        # AM-APPR-4: an approved Bill recording => G4 in the approval
        {"if": {"properties": {"language_availability": {"const": "language_recorded"},
                               "approval": {"type": "object"}},
                "required": ["language_availability", "approval"]},
         "then": {"properties": {"approval": {"properties": {"gates": {"contains": {"const": "G4"}}}}}}},
        # AM-LANG-1: captions only is never a recording
        {"if": {"properties": {"language_availability": {"const": "captions_only"}},
                "required": ["language_availability"]},
         "then": {"properties": {"status": {"not": {"enum": ["recorded", "edited"]}},
                                 "recording": {"type": "null"},
                                 "captions_source_locale": {"enum": ["fr", "en"]},
                                 "medium": {"enum": ["video", "audio"]}}}},
        {"if": {"properties": {"language_availability": {"const": "captions_only"}, "locale": {"const": "fr"}},
                "required": ["language_availability", "locale"]},
         "then": {"properties": {"captions_source_locale": {"const": "en"}}}},
        {"if": {"properties": {"language_availability": {"const": "captions_only"}, "locale": {"const": "en"}},
                "required": ["language_availability", "locale"]},
         "then": {"properties": {"captions_source_locale": {"const": "fr"}}}},
        {"if": {"properties": {"language_availability": {"not": {"const": "captions_only"}}},
                "required": ["language_availability"]},
         "then": {"properties": {"captions_source_locale": {"type": "null"}}}},
        # AM-LANG-2: recorded/edited only for audio/video actually recorded in this language
        {"if": st_in("recorded", "edited"),
         "then": {"properties": {"medium": {"enum": ["video", "audio"]},
                                 "language_availability": {"const": "language_recorded"},
                                 "recording": {"type": "object"}}}},
        # AM-LANG-3: medium/availability coherence
        {"if": {"properties": {"medium": {"enum": ["video", "audio"]}}, "required": ["medium"]},
         "then": {"properties": {"language_availability": {"enum": ["not_recorded", "language_recorded", "captions_only"]}}},
         "else": {"properties": {"language_availability": {"enum": ["text_only", "not_applicable"]}}}},
        # AM-LANG-4: an approved or published audio/video entry is a real recording or captions of one
        {"if": {"allOf": [st_in("approved", "published"),
                          {"properties": {"medium": {"enum": ["video", "audio"]}}, "required": ["medium"]}]},
         "then": {"properties": {"language_availability": {"enum": ["language_recorded", "captions_only"]}}}},
        # AM-REC-2: language_recorded at approved/published needs the recording evidence
        {"if": {"allOf": [st_in("approved", "published"),
                          {"properties": {"language_availability": {"const": "language_recorded"}},
                           "required": ["language_availability"]}]},
         "then": {"properties": {"recording": {"type": "object"}}}},
        # AM-REC-0: not_recorded => no recording object
        {"if": {"properties": {"language_availability": {"enum": ["not_recorded", "text_only", "not_applicable"]}},
                "required": ["language_availability"]},
         "then": {"properties": {"recording": {"type": "null"}}}},
        # AM-CLAIM-1: factual claims need sources
        {"if": {"properties": {"factual_claims": {"properties": {"present": {"const": True}}}}},
         "then": {"properties": {"factual_claims": {"properties": {"sources": {"minItems": 1}}}}}},
        # AM-CLAIM-2: reviewed+ claims carry access dates
        {"if": {"allOf": [st_in("reviewed", "recorded", "edited", "approved", "published"),
                          {"properties": {"factual_claims": {"properties": {"present": {"const": True}}}}}]},
         "then": {"properties": {"factual_claims": {"properties": {"sources": {"items": {"properties": {
             "accessed": {"type": "string"}}}}}}}}},
        # AM-CTA-1: a CTA to an offer means the asset states that offer
        *[{"if": {"properties": {"cta": {"const": c}}, "required": ["cta"]},
           "then": {"properties": {"offer_refs": {"contains": {"const": c}}}}}
          for c in ("guide-pdf", "intro-15", "book-bundle")],
        # AM-PATH-1: beyond brief, a source file exists in the repo
        {"if": st_in("draft", "reviewed", "recorded", "edited", "approved", "published"),
         "then": {"properties": {"source_path": {"type": "string"}}}},
    ],
}

ASSET_MANIFEST_SCHEMA = {
    "$schema": DRAFT,
    "$id": f"{BASE}/asset-manifest/1.0",
    "title": "Asset manifest 1.0",
    "description": (
        "One entry per (asset_id, locale, version) for every final content, media and art asset (05 §1). "
        "A file's existence never means it is published: status 'published' needs a publication_id, and "
        "approval needs an exact review hash bound to a human gate record. Proposed document location: "
        "content/marketing/asset-manifest.json (C08 deliverable, does not exist yet). Status: proposed, "
        "submitted, not accepted. See asset-manifest.md."
    ),
    "type": "object",
    "additionalProperties": False,
    "required": ["contract", "contract_version", "manifest_kind", "generated_at", "assets"],
    "properties": {
        "contract": {"const": "asset-manifest"},
        "contract_version": {"const": "1.0"},
        "manifest_kind": {"enum": ["authoritative", "fixture"]},
        "generated_at": {"type": "string", "pattern": UTC_PATTERN},
        "assets": {"type": "array", "items": {"$ref": "#/$defs/entry"}},
    },
    "allOf": [
        # AM-KIND-1 / AM-KIND-2: fixture references never mix with real records
        {"if": {"properties": {"manifest_kind": {"const": "authoritative"}}, "required": ["manifest_kind"]},
         "then": {"properties": {"assets": {"items": {"properties": {
             "approval": {"anyOf": [{"type": "null"}, {"properties": {"record_ref": {"pattern": AUTH_APPROVAL_REF}}}]},
             "recording": {"anyOf": [{"type": "null"}, {"properties": {
                 "consent_ref": {"pattern": AUTH_CONSENT_REF},
                 "master_ref": {"not": {"pattern": "^fixture:"}}}}]},
             "rights": {"properties": {"evidence_ref": {"anyOf": [{"type": "null"}, {"not": {"pattern": "^fixture:"}}]}}},
             "publication_id": {"anyOf": [{"type": "null"}, {"not": {"pattern": "^fixture:"}}]},
         }}}}}},
        {"if": {"properties": {"manifest_kind": {"const": "fixture"}}, "required": ["manifest_kind"]},
         "then": {"properties": {"assets": {"items": {"properties": {
             "approval": {"anyOf": [{"type": "null"}, {"properties": {"record_ref": {"pattern": FIXTURE_REF}}}]},
             "recording": {"anyOf": [{"type": "null"}, {"properties": {
                 "consent_ref": {"pattern": FIXTURE_REF}, "master_ref": {"pattern": FIXTURE_REF}}}]},
             "rights": {"properties": {"evidence_ref": {"anyOf": [{"type": "null"}, {"pattern": FIXTURE_REF}]}}},
             "publication_id": {"anyOf": [{"type": "null"}, {"pattern": FIXTURE_REF}]},
         }}}}}},
    ],
    "$defs": {"entry": ENTRY_SCHEMA},
}

FCAC = {"title": "FCAC — Retirement planning",
        "url": "https://www.canada.ca/en/financial-consumer-agency/services/retirement-planning.html"}
RQ = {"title": "Retraite Québec — Outils de planification",
      "url": "https://www.retraitequebec.gouv.qc.ca/fr/services-ligne-et-outils/seances-information-et-outils-planification"}


def entry(**kw):
    base = {
        "asset_id": None, "locale": "en", "version": 1, "title_internal": None, "owner_role": "A5",
        "medium": "text", "status": "brief", "language_availability": "text_only",
        "captions_source_locale": None, "source_path": None,
        "factual_claims": {"present": False, "sources": []}, "offer_refs": [], "credential_claims": False,
        "rights": {"status": "created_for_project", "holder": None, "evidence_ref": None,
                   "synthetic_bill_likeness": False},
        "recording": None, "review_hash": None, "approval": None, "intended_route_key": None,
        "cta": "none", "primary_channel": "site", "publication_id": None, "published_at": None,
        "published_content_sha256": None,
    }
    base.update(kw)
    return base


def fixture_manifest():
    w00_hash = sha("fixture:clip.w00.en.v1.master")
    art_hash = sha("fixture:article.fixture-sample.en.v2")
    return {
        "contract": "asset-manifest",
        "contract_version": "1.0",
        "manifest_kind": "fixture",
        "generated_at": "2026-09-30T12:00:00Z",
        "assets": [
            entry(asset_id="capsule.s01", locale="en", title_internal="S01 one number on a notebook (fixture)",
                  medium="video", status="brief", language_availability="not_recorded",
                  rights={"status": "pending", "holder": None, "evidence_ref": None, "synthetic_bill_likeness": False},
                  offer_refs=["guide-pdf"], intended_route_key="resources", cta="guide-pdf", primary_channel="linkedin"),
            entry(asset_id="capsule.s01", locale="fr", title_internal="S01 version française (fixture)",
                  medium="video", status="draft", language_availability="not_recorded",
                  source_path="content/marketing/capsules/s01.fr.md",
                  rights={"status": "pending", "holder": None, "evidence_ref": None, "synthetic_bill_likeness": False},
                  offer_refs=["guide-pdf"], intended_route_key="resources", cta="guide-pdf", primary_channel="facebook"),
            entry(asset_id="article.fixture-draft", locale="en", title_internal="Reviewed article draft (fixture)",
                  status="reviewed", source_path="content/fixture-draft.md",
                  factual_claims={"present": True, "sources": [dict(FCAC, accessed="2026-09-28"),
                                                                dict(RQ, accessed="2026-09-28")]},
                  offer_refs=["intro-15"], intended_route_key="resources", cta="intro-15"),
            entry(asset_id="clip.w00", locale="en", title_internal="W00 welcome, English recording (fixture)",
                  owner_role="bill", medium="video", status="recorded", language_availability="language_recorded",
                  source_path="content/marketing/workshop/w00.en.md",
                  rights={"status": "owned_by_bill", "holder": "Bill Badran", "evidence_ref": "fixture:rights-w00",
                          "synthetic_bill_likeness": False},
                  recording={"master_ref": "fixture:master-w00-en", "master_sha256": w00_hash,
                             "duration_seconds": 74.2, "recorded_on": "2026-09-30",
                             "consent_ref": "fixture:consent-w00-en", "captions_sha256": None,
                             "transcript_sha256": None},
                  intended_route_key="workshop", cta="none", primary_channel="workshop"),
            entry(asset_id="clip.w00", locale="fr", title_internal="W00 French captions over the English recording (fixture)",
                  medium="video", status="draft", language_availability="captions_only", captions_source_locale="en",
                  source_path="content/marketing/workshop/w00.fr.vtt",
                  rights={"status": "owned_by_bill", "holder": "Bill Badran", "evidence_ref": "fixture:rights-w00",
                          "synthetic_bill_likeness": False},
                  intended_route_key="workshop", cta="none", primary_channel="workshop"),
            entry(asset_id="capsule.s13", locale="en", title_internal="S13 what we would talk about first, edited (fixture)",
                  owner_role="A5", medium="video", status="edited", language_availability="language_recorded",
                  source_path="content/marketing/capsules/s13.en.md", offer_refs=["intro-15"],
                  rights={"status": "owned_by_bill", "holder": "Bill Badran", "evidence_ref": "fixture:rights-s13",
                          "synthetic_bill_likeness": False},
                  recording={"master_ref": "fixture:master-s13-en", "master_sha256": sha("fixture:s13.en.master"),
                             "duration_seconds": 61.0, "recorded_on": "2026-09-30",
                             "consent_ref": "fixture:consent-s13-en",
                             "captions_sha256": sha("fixture:s13.en.vtt"),
                             "transcript_sha256": sha("fixture:s13.en.txt")},
                  intended_route_key="meeting", cta="intro-15", primary_channel="instagram"),
            entry(asset_id="ink.a01", locale="zxx", title_internal="A01 notebook, glasses and cup (fixture)",
                  owner_role="A1", medium="image", status="approved", language_availability="not_applicable",
                  source_path="public/assets/ink/fixture-a01.svg",
                  rights={"status": "created_for_project", "holder": None, "evidence_ref": "fixture:provenance-a01",
                          "synthetic_bill_likeness": False},
                  review_hash={"method": "file-sha256-v1", "sha256": sha("fixture:ink.a01.svg")},
                  approval={"gates": ["G3"], "approved_by_roles": ["bill", "arnaud"], "approved_on": "2026-09-30",
                            "record_ref": "fixture:packet-ink-a01"},
                  intended_route_key="workshop", cta="none", primary_channel="workshop"),
            entry(asset_id="template.e05", locale="en", title_internal="E05 exact 15-minute meeting explanation (fixture)",
                  status="approved", source_path="content/marketing/emails/e05.en.json",
                  offer_refs=["intro-15"],
                  review_hash={"method": "json-canonical-sha256-v1", "sha256": sha("fixture:template.e05.en.v1")},
                  approval={"gates": ["G1", "G3"], "approved_by_roles": ["bill", "firm_reviewer"],
                            "approved_on": "2026-09-30", "record_ref": "fixture:packet-e05"},
                  intended_route_key="meeting", cta="intro-15", primary_channel="email"),
            entry(asset_id="clip.w11", locale="en", title_internal="W11 invitation, approved recording (fixture)",
                  owner_role="bill", medium="video", status="approved", language_availability="language_recorded",
                  source_path="content/marketing/workshop/w11.en.md", offer_refs=["intro-15"],
                  rights={"status": "owned_by_bill", "holder": "Bill Badran", "evidence_ref": "fixture:rights-w11",
                          "synthetic_bill_likeness": False},
                  recording={"master_ref": "fixture:master-w11-en", "master_sha256": sha("fixture:w11.en.master"),
                             "duration_seconds": 38.5, "recorded_on": "2026-09-30",
                             "consent_ref": "fixture:consent-w11-en",
                             "captions_sha256": sha("fixture:w11.en.vtt"),
                             "transcript_sha256": sha("fixture:w11.en.txt")},
                  review_hash={"method": "bundle-sha256-v1", "sha256": sha("fixture:w11.en.bundle")},
                  approval={"gates": ["G1", "G3", "G4"], "approved_by_roles": ["bill", "firm_reviewer"],
                            "approved_on": "2026-09-30", "record_ref": "fixture:packet-w11"},
                  intended_route_key="workshop", cta="intro-15", primary_channel="workshop"),
            entry(asset_id="article.fixture-sample", locale="en", version=2,
                  title_internal="Published article (fixture)", status="published",
                  source_path="content/fixture-sample.md",
                  factual_claims={"present": True, "sources": [dict(FCAC, accessed="2026-09-28")]},
                  review_hash={"method": "articles-contentFingerprint-v1", "sha256": art_hash},
                  offer_refs=["intro-15"],
                  approval={"gates": ["G1", "G3"], "approved_by_roles": ["bill", "firm_reviewer"],
                            "approved_on": "2026-09-30", "record_ref": "fixture:approvals-article-sample"},
                  intended_route_key="resources", cta="intro-15",
                  publication_id="fixture:site-deploy-0001",
                  published_at="2026-09-30T15:00:00Z", published_content_sha256=art_hash),
        ],
    }


def authoritative_empty_manifest():
    return {"contract": "asset-manifest", "contract_version": "1.0", "manifest_kind": "authoritative",
            "generated_at": "2026-09-30T00:00:00Z", "assets": []}


def idx(doc, asset_id, locale):
    for n, e in enumerate(doc["assets"]):
        if e["asset_id"] == asset_id and e["locale"] == locale:
            return n
    raise KeyError((asset_id, locale))


AM_INVALID = []


def am_case(name, rule, breaks, keyword, path_fn):
    def deco(fn):
        AM_INVALID.append((name, fn, rule, breaks, keyword, path_fn))
        return fn
    return deco


@am_case("published-without-publication-id", "AM-PUB-1",
         "An asset with status 'published' must carry its actual publication_id.",
         "type", lambda d: f"/assets/{idx(d, 'article.fixture-sample', 'en')}/publication_id")
def _(d):
    d["assets"][idx(d, "article.fixture-sample", "en")]["publication_id"] = None
    return d


@am_case("publication-id-on-draft", "AM-PUB-2",
         "publication_id exists only when the status is 'published'.",
         "type", lambda d: f"/assets/{idx(d, 'capsule.s01', 'fr')}/publication_id")
def _(d):
    d["assets"][idx(d, "capsule.s01", "fr")]["publication_id"] = "fixture:not-really-published"
    return d


@am_case("approved-without-review-hash", "AM-HASH-1",
         "An approved asset must carry the exact review hash its approval binds to.",
         "type", lambda d: f"/assets/{idx(d, 'template.e05', 'en')}/review_hash")
def _(d):
    d["assets"][idx(d, "template.e05", "en")]["review_hash"] = None
    return d


@am_case("captions-only-marked-recorded", "AM-LANG-1",
         "Captions in another language are not a recording in that language; captions_only can never be 'recorded'.",
         "not", lambda d: f"/assets/{idx(d, 'clip.w00', 'fr')}/status")
def _(d):
    d["assets"][idx(d, "clip.w00", "fr")]["status"] = "recorded"
    return d


@am_case("text-asset-marked-recorded", "AM-LANG-2",
         "Only audio or video actually recorded in that language can be 'recorded' or 'edited'.",
         "enum", lambda d: f"/assets/{idx(d, 'article.fixture-draft', 'en')}/medium")
def _(d):
    d["assets"][idx(d, "article.fixture-draft", "en")]["status"] = "recorded"
    return d


@am_case("recorded-without-consent", "AM-REC-1",
         "A recording must cite the recording consent (G4) record.",
         "required", lambda d: f"/assets/{idx(d, 'clip.w00', 'en')}/recording")
def _(d):
    del d["assets"][idx(d, "clip.w00", "en")]["recording"]["consent_ref"]
    return d


@am_case("factual-claims-without-sources", "AM-CLAIM-1",
         "An asset with factual claims must list at least one source.",
         "minItems", lambda d: f"/assets/{idx(d, 'article.fixture-draft', 'en')}/factual_claims/sources")
def _(d):
    d["assets"][idx(d, "article.fixture-draft", "en")]["factual_claims"]["sources"] = []
    return d


@am_case("reviewed-claim-without-access-date", "AM-CLAIM-2",
         "From 'reviewed' on, every source carries the date it was checked.",
         "type", lambda d: f"/assets/{idx(d, 'article.fixture-draft', 'en')}/factual_claims/sources/0/accessed")
def _(d):
    d["assets"][idx(d, "article.fixture-draft", "en")]["factual_claims"]["sources"][0]["accessed"] = None
    return d


@am_case("synthetic-bill-likeness", "AM-RIGHTS-2",
         "No synthetic voice, avatar or face of Bill in contract 1.0.",
         "const", lambda d: f"/assets/{idx(d, 'clip.w00', 'en')}/rights/synthetic_bill_likeness")
def _(d):
    d["assets"][idx(d, "clip.w00", "en")]["rights"]["synthetic_bill_likeness"] = True
    return d


@am_case("approved-with-pending-rights", "AM-RIGHTS-1",
         "An approved or published asset cannot have pending rights.",
         "not", lambda d: f"/assets/{idx(d, 'ink.a01', 'zxx')}/rights/status")
def _(d):
    d["assets"][idx(d, "ink.a01", "zxx")]["rights"]["status"] = "pending"
    return d


@am_case("agent-role-approval", "AM-APPR-2",
         "Approvals are recorded by human gate owners only; an agent role cannot approve.",
         "enum", lambda d: f"/assets/{idx(d, 'template.e05', 'en')}/approval/approved_by_roles/1")
def _(d):
    d["assets"][idx(d, "template.e05", "en")]["approval"]["approved_by_roles"] = ["bill", "A5"]
    return d


@am_case("approval-without-g3", "AM-APPR-1",
         "Every approval of an asset names G3 (exact-hash approval).",
         "contains", lambda d: f"/assets/{idx(d, 'ink.a01', 'zxx')}/approval/gates")
def _(d):
    d["assets"][idx(d, "ink.a01", "zxx")]["approval"]["gates"] = ["G0"]
    return d


@am_case("offer-copy-approved-without-g1", "AM-APPR-3",
         "An asset that states an offer (or credentials) needs G1 in its approval.",
         "contains", lambda d: f"/assets/{idx(d, 'template.e05', 'en')}/approval/gates")
def _(d):
    d["assets"][idx(d, "template.e05", "en")]["approval"]["gates"] = ["G3"]
    return d


@am_case("recording-approved-without-g4", "AM-APPR-4",
         "An approved Bill recording needs G4 (recording approval and rights) in its approval.",
         "contains", lambda d: f"/assets/{idx(d, 'clip.w11', 'en')}/approval/gates")
def _(d):
    d["assets"][idx(d, "clip.w11", "en")]["approval"]["gates"] = ["G1", "G3"]
    return d


@am_case("approval-on-draft", "AM-APPR-5",
         "A draft carries no approval; approvals bind a finished version.",
         "type", lambda d: f"/assets/{idx(d, 'capsule.s01', 'fr')}/approval")
def _(d):
    d["assets"][idx(d, "capsule.s01", "fr")]["approval"] = {
        "gates": ["G3"], "approved_by_roles": ["bill"], "approved_on": "2026-09-30",
        "record_ref": "fixture:premature"}
    return d


@am_case("cta-offer-not-referenced", "AM-CTA-1",
         "An asset whose CTA is an offer states that offer, so offer_refs must list it (and its approval then needs G1).",
         "contains", lambda d: f"/assets/{idx(d, 'article.fixture-draft', 'en')}/offer_refs")
def _(d):
    d["assets"][idx(d, "article.fixture-draft", "en")]["offer_refs"] = []
    return d


@am_case("unknown-status-ready", "AM-ST-1",
         "status is one of brief, draft, reviewed, recorded, edited, approved, published.",
         "enum", lambda d: f"/assets/{idx(d, 'capsule.s01', 'en')}/status")
def _(d):
    d["assets"][idx(d, "capsule.s01", "en")]["status"] = "ready"
    return d


@am_case("capsule-s19-id", "AM-ID-1",
         "There are exactly 18 capsules (S01-S18); asset IDs follow the plan inventory.",
         "pattern", lambda d: f"/assets/{idx(d, 'capsule.s01', 'en')}/asset_id")
def _(d):
    d["assets"][idx(d, "capsule.s01", "en")]["asset_id"] = "capsule.s19"
    return d


@am_case("fixture-ref-in-authoritative", "AM-KIND-1",
         "An authoritative manifest cites only real approval ledgers or packets, never 'fixture:'.",
         "pattern", lambda d: f"/assets/{idx(d, 'ink.a01', 'zxx')}/approval/record_ref")
def _(d):
    d["manifest_kind"] = "authoritative"
    # keep only one approved entry so the failure is about the ref, not other rules
    d["assets"] = [e for e in d["assets"] if e["asset_id"] == "ink.a01"]
    d["assets"][0]["rights"]["evidence_ref"] = None
    return d


@am_case("fixture-publication-id-in-authoritative", "AM-KIND-2",
         "In an authoritative manifest, publication IDs, master and rights references are real, never 'fixture:'.",
         "not", lambda d: "/assets/0/publication_id")
def _(d):
    d["manifest_kind"] = "authoritative"
    d["assets"] = [e for e in d["assets"] if e["asset_id"] == "article.fixture-sample"]
    d["assets"][0]["approval"]["record_ref"] = "content/approvals.json#fixture-sample.md"
    return d


@am_case("publication-hash-mismatch", "AM-HARN-1",
         "published_content_sha256 must equal review_hash.sha256 (harness rule; schema-valid on its own).",
         "harness:AM-HARN-1", lambda d: f"/assets/{idx(d, 'article.fixture-sample', 'en')}/published_content_sha256")
def _(d):
    d["assets"][idx(d, "article.fixture-sample", "en")]["published_content_sha256"] = sha("fixture:other-bytes")
    return d


@am_case("duplicate-entry", "AM-HARN-2",
         "(asset_id, locale, version) is unique within a manifest (harness rule).",
         "harness:AM-HARN-2", lambda d: f"/assets/{len(d['assets'])}")
def _(d):
    d["assets"].append(copy.deepcopy(d["assets"][idx(d, "template.e05", "en")]))
    return d


# ============================================================================
# 3. WORKER HANDOFF
# ============================================================================
PLACEHOLDERS = ["actual-sha", "actual-sha-or-null", "actual-hash", "actual command", "actual path",
                "actual/path", "TODO", "TBD", "todo", "tbd", "placeholder", "PLACEHOLDER", "n/a", "N/A"]
NO_PLACEHOLDER = {"not": {"anyOf": [
    {"enum": PLACEHOLDERS},
    {"pattern": "^[Aa][Cc][Tt][Uu][Aa][Ll][ /_-]"},
    {"pattern": "^(?:[Xx]{3,}|\\.\\.\\.|<[^>]*>)$"},
]}, "description": "Placeholders from the 03 example (and TODO/TBD/xxx/<...>) are not completion evidence (03)."}


def text(min_len=1, max_len=4000):
    return {"allOf": [{"type": "string", "minLength": min_len, "maxLength": max_len}, {"$ref": "#/$defs/no_placeholder"}]}


WORKER_HANDOFF_SCHEMA = {
    "$schema": DRAFT,
    "$id": f"{BASE}/worker-handoff/1.1",
    "title": "Worker handoff 1.1",
    "description": (
        "The worker handoff of 03 ('Worker handoff schema'), closed. A worker submits it and stops; "
        "status can only be 'submitted' because A0 writes acceptance separately after A6 verification. "
        "Placeholders are rejected: commits are 40 lowercase hex, artifact hashes 64 lowercase hex, and "
        "the 03 example strings are refused. exit_code null means the exit status was not captured (say so "
        "in assumptions). blocked_checks use the evidence vocabulary blocked | not_run (D-038). A side "
        "effect needs a gate authorization. metered_cost never carries an estimate. Semantics: "
        "approval-scopes.md §8. Status: proposed, submitted, not accepted."
    ),
    "type": "object",
    "additionalProperties": False,
    "required": ["task_id", "base_commit", "result_commit", "contract_version", "changed_paths",
                 "artifacts", "tests", "assumptions", "blocked_checks", "human_approvals_required",
                 "external_actions_taken", "metered_cost", "status"],
    "properties": {
        "task_id": {"type": "string", "pattern": TASK_ID_PATTERN,
                    "description": "One of the 63 task IDs in .orchestration/tasks.json: the 62 planned IDs and the split task F02a (D-072), listed explicitly, not as a generic suffix. A further split task needs a new contract minor version (WH-ID-1)."},
        "base_commit": {"type": "string", "pattern": SHA40},
        "result_commit": {"anyOf": [{"type": "string", "pattern": SHA40}, {"type": "null"}],
                          "description": "null when the work is uncommitted (workers do not commit unless the packet says so)."},
        "contract_version": {"type": "string", "pattern": "^[1-9][0-9]*\\.[0-9]+$",
                             "description": "The contract version named in the dispatch packet."},
        "changed_paths": {"type": "array", "uniqueItems": True, "items": {"$ref": "#/$defs/repo_path"},
                          "description": "Machine-readable repo-relative paths only (directories end with '/'). Notes go in assumptions."},
        "artifacts": {"type": "array", "minItems": 1, "items": closed({
            "path": {"$ref": "#/$defs/repo_path"},
            "sha256": {"type": "string", "pattern": SHA256},
        })},
        "tests": {"type": "array", "items": closed({
            "id": {"type": "string", "pattern": "^[A-Z][A-Z0-9]{1,15}(?:-[A-Za-z0-9]{1,24})*$"},
            "command": text(1, 4000),
            "exit_code": {"anyOf": [{"type": "integer", "minimum": 0, "maximum": 255}, {"type": "null"}]},
            "evidence": {"$ref": "#/$defs/repo_path"},
            "environment": {"allOf": [
                {"type": "string", "pattern": "^(?:local|ci|staging|provider-sandbox|production)(?:[ :].{1,200})?$"},
                {"$ref": "#/$defs/no_placeholder"}],
                "description": "Where it ran. Fixture evidence runs in local or ci; sandbox evidence in staging or provider-sandbox; live evidence in production (03 A-roles, D-038)."},
        })},
        "assumptions": {"type": "array", "items": text(3, 4000)},
        "blocked_checks": {"type": "array", "items": closed({
            "check": text(3, 500),
            "status": {"enum": ["blocked", "not_run"]},
            "reason": text(3, 1000),
            "owner": {"type": "string", "minLength": 2, "maxLength": 120},
        }, required=["check", "status", "reason"])},
        "human_approvals_required": {"type": "array", "items": {"allOf": [
            {"type": "string", "pattern": "^G[0-6](?:/G[0-6])*: \\S", "maxLength": 1000},
            {"$ref": "#/$defs/no_placeholder"}]}},
        "external_actions_taken": {"type": "array", "items": {
            "type": "object", "additionalProperties": False,
            "required": ["actor", "type", "target"],
            "properties": {
                "actor": text(2, 120),
                "type": text(3, 200),
                "target": text(3, 2000),
                "effect": {"enum": ["read_only", "side_effect"]},
                "authorization": {"type": "string",
                                  "pattern": "^G[0-6]:\\.orchestration/(?:decisions\\.md#D-[0-9]{3}[a-z]?|approval-packets/[^\\s]+)$"},
            },
            "allOf": [{"if": {"properties": {"effect": {"const": "side_effect"}}, "required": ["effect"]},
                       "then": {"required": ["authorization"]}}],
        }},
        "metered_cost": {
            "type": "object", "additionalProperties": False,
            "required": ["amount", "currency", "status"],
            "properties": {
                "amount": {"anyOf": [{"type": "number", "minimum": 0}, {"type": "null"}]},
                "currency": {"anyOf": [{"type": "string", "pattern": "^[A-Z]{3}$"}, {"type": "null"}]},
                "status": {"enum": ["unavailable-not-estimated", "provider-metered"]},
                "source": {"$ref": "#/$defs/repo_path"},
            },
            "allOf": [
                {"if": {"properties": {"status": {"const": "unavailable-not-estimated"}}},
                 "then": {"properties": {"amount": {"type": "null"}, "currency": {"type": "null"}}}},
                {"if": {"properties": {"status": {"const": "provider-metered"}}},
                 "then": {"properties": {"amount": {"type": "number"}, "currency": {"type": "string"}},
                          "required": ["source"]}},
            ],
        },
        "status": {"const": "submitted"},
    },
    "$defs": {
        "no_placeholder": NO_PLACEHOLDER,
        "repo_path": {"allOf": [{"type": "string", "minLength": 1, "maxLength": 500, "pattern": REPO_PATH},
                                {"$ref": "#/$defs/no_placeholder"}]},
    },
}

EXAMPLE_03 = {
    "task_id": "W03",
    "base_commit": "actual-sha",
    "result_commit": "actual-sha-or-null",
    "contract_version": "1.0",
    "changed_paths": [],
    "artifacts": [{"path": "actual/path", "sha256": "actual-hash"}],
    "tests": [{"id": "WK01", "command": "actual command", "exit_code": 0, "evidence": "actual path",
               "environment": "local"}],
    "assumptions": [],
    "blocked_checks": [],
    "human_approvals_required": [],
    "external_actions_taken": [],
    "metered_cost": {"amount": None, "currency": None, "status": "unavailable-not-estimated"},
    "status": "submitted",
}

HEAD = "5cbbf9b5d21dbf03d2cb44e524a6fcdc10d5515b"


def file_sha(rel: str) -> str:
    return hashlib.sha256((ROOT / rel).read_bytes()).hexdigest()


def normalized_f00_subset():
    """Real values taken from handoffs/F00.json (read-only), reshaped to conform:
    changed_paths without prose notes, a subset of artifacts/tests, blocked checks limited to
    the evidence vocabulary. Shape example only; it is not a replacement for F00.json."""
    f00 = json.loads((ORCH / "handoffs" / "F00.json").read_text(encoding="utf-8"))
    return {
        "task_id": "F00",
        "base_commit": f00["base_commit"],
        "result_commit": None,
        "contract_version": "1.0",
        "changed_paths": [".orchestration/inventory.md", ".orchestration/handoffs/F00.json",
                          ".orchestration/evidence/F00/"],
        "artifacts": f00["artifacts"][:3],
        "tests": [t for t in f00["tests"] if t["exit_code"] is not None][:3],
        "assumptions": f00["assumptions"][:2] + [
            "Shape example built from real F00 values by the F02 offers lane; the submitted F00.json is unchanged."],
        "blocked_checks": [b for b in f00["blocked_checks"] if b["status"] in ("blocked", "not_run")][:3],
        "human_approvals_required": f00["human_approvals_required"][:2],
        "external_actions_taken": [dict(e, effect="read_only") for e in f00["external_actions_taken"][:1]],
        "metered_cost": f00["metered_cost"],
        "status": "submitted",
    }


def fixture_side_effect_handoff():
    """Fictional N10 handoff showing a scoped side effect and a provider-metered cost.
    Hashes are real sha256 values of files in this repository, not placeholders."""
    return {
        "task_id": "N10",
        "base_commit": HEAD,
        "result_commit": None,
        "contract_version": "1.0",
        "changed_paths": ["automations/smoke/"],
        "artifacts": [{"path": ".orchestration/source/03_AGENT_PROMPTS.md",
                       "sha256": file_sha(".orchestration/source/03_AGENT_PROMPTS.md")}],
        "tests": [{"id": "AUTO03", "command": "fixture: import disabled SM01 into the pinned staging n8n",
                   "exit_code": 0, "evidence": ".orchestration/provider-evidence/fixture-sm01-import.log",
                   "environment": "staging (fixture example)"}],
        "assumptions": ["Fictional example: no N10 work, import or delivery has happened."],
        "blocked_checks": [{"check": "SM02 delivery to the approved Telegram chat", "status": "blocked",
                            "reason": "no approved chat recorded (HB-09b)", "owner": "arnaud"}],
        "human_approvals_required": ["G2: allowlisted smoke targets and the Telegram bot owner (HB-09b)"],
        "external_actions_taken": [{"actor": "A4 (fixture)", "type": "allowlisted test send",
                                    "target": "one allowlisted staging inbox (fixture)",
                                    "effect": "side_effect",
                                    "authorization": "G2:.orchestration/approval-packets/fixture-g2-smoke.md"}],
        "metered_cost": {"amount": 0, "currency": "XXX", "status": "provider-metered",
                         "source": ".orchestration/runs/fixture-run.json"},
        "status": "submitted",
    }


WH_INVALID = [
    # (name, base, mutate, rule, breaks, keyword, path)
    ("verbatim-03-example", "03", lambda d: d, "WH-PH-1",
     "The 03 example is a template: its placeholder values ('actual-sha', 'actual-hash', 'actual command', 'actual path') are not completion evidence.",
     "pattern", "/base_commit"),
    ("status-accepted", "min", lambda d: dict(d, status="accepted"), "WH-ST-1",
     "A worker can only submit; acceptance is written separately by A0 after A6 verification.",
     "const", "/status"),
    ("short-result-commit", "min", lambda d: dict(d, result_commit="5cbbf9b"), "WH-SHA-1",
     "result_commit is a full 40-hex commit SHA or null; abbreviations are refused.",
     "anyOf", "/result_commit"),
    ("placeholder-artifact-hash", "min",
     lambda d: dict(d, artifacts=[{"path": ".orchestration/inventory.md", "sha256": "actual-hash"}]), "WH-SHA-2",
     "Artifact hashes are 64 lowercase hex characters.",
     "pattern", "/artifacts/0/sha256"),
    ("placeholder-command", "min",
     lambda d: dict(d, tests=[dict(d["tests"][0], command="actual command")]), "WH-PH-2",
     "A test command must be the command actually run, not the 03 placeholder.",
     "not", "/tests/0/command"),
    ("estimated-cost", "min",
     lambda d: dict(d, metered_cost={"amount": 12.5, "currency": "CAD", "status": "unavailable-not-estimated"}),
     "WH-COST-1", "When the cost is unavailable no amount or currency may be written; estimates are forbidden.",
     "type", "/metered_cost/amount"),
    ("metered-cost-without-source", "min",
     lambda d: dict(d, metered_cost={"amount": 1.0, "currency": "CAD", "status": "provider-metered"}),
     "WH-COST-2", "A provider-metered amount must cite its run record.",
     "required", "/metered_cost"),
    ("blocked-check-not-visible", "min",
     lambda d: dict(d, blocked_checks=[{"check": "n8n version / Cloud tier", "status": "not_visible",
                                        "reason": "no tool exposes it"}]), "WH-BLK-1",
     "blocked_checks use the evidence vocabulary: blocked or not_run (D-038).",
     "enum", "/blocked_checks/0/status"),
    ("side-effect-without-authorization", "min",
     lambda d: dict(d, external_actions_taken=[{"actor": "A4", "type": "test send", "target": "an inbox",
                                                "effect": "side_effect"}]), "WH-EXT-1",
     "A side effect must name the gate authorization that allowed it.",
     "required", "/external_actions_taken/0"),
    ("absolute-changed-path", "min",
     lambda d: dict(d, changed_paths=["/home/user/bill/.orchestration/inventory.md"]), "WH-PATH-1",
     "changed_paths are repo-relative.",
     "pattern", "/changed_paths/0"),
    ("annotated-changed-path", "min",
     lambda d: dict(d, changed_paths=[".orchestration/evidence/F00/ (untracked; written by three lanes)"]),
     "WH-PATH-2", "changed_paths hold paths only; prose notes belong in assumptions.",
     "pattern", "/changed_paths/0"),
    ("unknown-task-id", "min", lambda d: dict(d, task_id="W99"), "WH-ID-1",
     "task_id is one of the 63 task IDs in tasks.json (the 62 planned IDs and the split task F02a).",
     "pattern", "/task_id"),
    ("exit-code-string", "min",
     lambda d: dict(d, tests=[dict(d["tests"][0], exit_code="0")]), "WH-TEST-1",
     "exit_code is an integer 0-255, or null when not captured.",
     "anyOf", "/tests/0/exit_code"),
    ("missing-metered-cost", "min",
     lambda d: {k: v for k, v in d.items() if k != "metered_cost"}, "WH-REQ-1",
     "All 13 fields of the 03 handoff are required.",
     "required", ""),
    ("extra-accepted-by-field", "min", lambda d: dict(d, accepted_by="A0"), "WH-SHAPE-1",
     "The handoff is closed; a worker cannot add acceptance or other fields.",
     "additionalProperties", ""),
    ("empty-artifacts", "min", lambda d: dict(d, artifacts=[]), "WH-ART-1",
     "A handoff lists at least one artifact with its hash.",
     "minItems", "/artifacts"),
    ("environment-unlabelled", "min",
     lambda d: dict(d, tests=[dict(d["tests"][0], environment="my laptop")]), "WH-ENV-1",
     "environment starts with local, ci, staging, provider-sandbox or production so fixture, sandbox and live evidence stay distinct.",
     "pattern", "/tests/0/environment"),
]


# ============================================================================
# Write everything
# ============================================================================
def write_case(folder: pathlib.Path, name: str, doc, rule, breaks, keyword, path):
    dump(folder / f"{name}.json", doc)
    write_text(folder / f"{name}.why.txt",
               f"rule: {rule}\nbreaks: {breaks}\nexpect_keyword: {keyword}\nexpect_path: {path}\n")


def main():
    dump(CONTRACTS / "offer-matrix.json", OFFER_MATRIX_SCHEMA)
    dump(CONTRACTS / "asset-manifest.schema.json", ASSET_MANIFEST_SCHEMA)
    dump(CONTRACTS / "worker-handoff.schema.json", WORKER_HANDOFF_SCHEMA)

    for c in ("offer-matrix", "asset-manifest", "worker-handoff"):
        for kind in ("valid", "invalid"):
            d = EXAMPLES / kind / c
            if d.exists():
                shutil.rmtree(d)
            d.mkdir(parents=True)

    # offer matrix
    v = EXAMPLES / "valid" / "offer-matrix"
    dump(v / "authoritative-2026-09-30.json", current_offer_matrix())
    dump(v / "fixture-all-gates-recorded-fictional.json", fixture_all_recorded())
    dump(v / "fixture-test-mode-only.json", fixture_test_mode())
    inv = EXAMPLES / "invalid" / "offer-matrix"
    for name, fn, rule, breaks, kw, path, base in OM_INVALID:
        doc = fn(copy.deepcopy(current_offer_matrix() if base == "current" else fixture_all_recorded()))
        write_case(inv, name, doc, rule, breaks, kw, path)

    # asset manifest
    v = EXAMPLES / "valid" / "asset-manifest"
    dump(v / "fixture-lifecycle.json", fixture_manifest())
    dump(v / "authoritative-empty-2026-09-30.json", authoritative_empty_manifest())
    inv = EXAMPLES / "invalid" / "asset-manifest"
    for name, fn, rule, breaks, kw, path_fn in AM_INVALID:
        base = fixture_manifest()
        path = path_fn(base)
        doc = fn(copy.deepcopy(base))
        if rule == "AM-KIND-1":
            path = "/assets/0/approval/record_ref"
        write_case(inv, name, doc, rule, breaks, kw, path)

    # worker handoff
    v = EXAMPLES / "valid" / "worker-handoff"
    minimal = normalized_f00_subset()
    dump(v / "normalized-f00-subset.json", minimal)
    dump(v / "fixture-side-effect-metered.json", fixture_side_effect_handoff())
    inv = EXAMPLES / "invalid" / "worker-handoff"
    for name, base, fn, rule, breaks, kw, path in WH_INVALID:
        doc = fn(copy.deepcopy(EXAMPLE_03 if base == "03" else minimal))
        write_case(inv, name, doc, rule, breaks, kw, path)

    print("generated:",
          len(OM_INVALID), "offer-matrix invalid,",
          len(AM_INVALID), "asset-manifest invalid,",
          len(WH_INVALID), "worker-handoff invalid")


if __name__ == "__main__":
    main()
