"""Miroir Python des flux S1 « petit crédit » + S2 « crédit qui fâche ».

Véracité par construction :
- S1 : 9 actes → promulgue
- S2 : 3 branches (promulgue | rejete | retire), seuil 76, retrait pré-vote

Usage: python proto/state-of-vd/tools/validate_scenario.py
Exit 0 = PASS.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

ROOT = Path(__file__).resolve().parents[3]
PROFILE = ROOT / "proto" / "state-of-vd" / "model" / "profiles" / "vaud.json"

# Golden path S1 — MUST match game/flows/petit-credit.js (TASK-084)
STEPS_S1 = [
    {"id": "step-1-adopte-ce", "from": "en-elaboration", "to": "adopte-ce", "by": "decision", "decisionType": "adopte", "weekdayTag": "ce"},
    {"id": "step-2-saisine", "from": "adopte-ce", "to": "saisine-commission", "by": "handover", "weekdayTag": None},
    {"id": "step-3-rapports", "from": "saisine-commission", "to": "rapports-deposes", "by": "handover", "weekdayTag": None},
    {"id": "step-4-eem", "from": "rapports-deposes", "to": "entree-en-matiere", "by": "decision", "decisionType": "adopte", "weekdayTag": "gc"},
    {"id": "step-5-debats", "from": "entree-en-matiere", "to": "en-debats", "by": "decision", "decisionType": "adopte", "weekdayTag": "gc"},
    {"id": "step-6-vote-final", "from": "en-debats", "to": "vote-final", "by": "decision", "decisionType": "adopte", "weekdayTag": "gc"},
    {"id": "step-7-adopte-gc", "from": "vote-final", "to": "mise-au-point", "by": "decision", "decisionType": "adopte", "weekdayTag": "gc"},
    {"id": "step-8-publication", "from": "mise-au-point", "to": "publie-delai-referendaire", "by": "handover", "weekdayTag": None, "startDeadline": "delai-referendaire"},
    {"id": "step-9-promulgue", "from": "publie-delai-referendaire", "to": "promulgue", "by": "handover", "weekdayTag": None},
]

# S2 base path (matches credit-qui-fache.js) + support model
SUPPORT_BASE = 72
SUPPORT_MINORITY = -8
SUPPORT_AMENDMENT = 12
THRESHOLD = 76

WITHDRAW_OK = {
    "en-elaboration",
    "adopte-ce",
    "saisine-commission",
    "rapports-deposes",
    "entree-en-matiere",
    "en-debats",
}
WITHDRAW_FORBIDDEN = {
    "vote-final",
    "mise-au-point",
    "publie-delai-referendaire",
    "promulgue",
    "rejete",
    "retire",
}

WEEKDAY = ["csg", "gc", "ce", "open", "open", "weekend", "weekend"]
ACTIVE = 720  # minutes 07–19


def fail(msg: str, fails: list[str]) -> None:
    print(f"  FAIL  {msg}")
    fails.append(msg)


def ok(msg: str) -> None:
    print(f"  PASS  {msg}")


def weekday_tag(day: int) -> str:
    return WEEKDAY[(day - 1) % 7]


def find_lifecycle(profile: dict) -> dict:
    for lc in profile["catalogues"]["lifecycles"]:
        if lc["id"] == "cycle-projet-acte":
            return lc
    raise SystemExit("cycle-projet-acte missing from profile")


def transition_ok(lc: dict, step: dict) -> bool:
    for t in lc["transitions"]:
        if t["from"] != step["from"] or t["to"] != step["to"] or t["by"] != step["by"]:
            continue
        if step["by"] == "decision" and t.get("decisionType") != step.get("decisionType"):
            continue
        return True
    return False


def evaluate(step: dict, state: str, day: int, skip_day: bool = False) -> dict:
    if state != step["from"]:
        return {"verdict": "REFUS", "reason": f"state {state} != {step['from']}"}
    tag = weekday_tag(day)
    if not skip_day and step.get("weekdayTag") and tag != step["weekdayTag"]:
        return {
            "verdict": "REFUS",
            "wrongDay": True,
            "reason": f"day tag {tag} != {step['weekdayTag']}",
            "lesson": "mauvais jour",
        }
    return {"verdict": "ACCORDE"}


def seek_day(day: int, tag: str) -> int:
    guard = 0
    while weekday_tag(day) != tag and guard < 21:
        day += 1
        guard += 1
    return day


def validate_s1(lc: dict, profile: dict, fails: list[str]) -> None:
    print("\n=== S1 petit-credit ===")
    for step in STEPS_S1:
        if transition_ok(lc, step):
            ok(f"transition {step['id']}: {step['from']}→{step['to']}")
        else:
            fail(f"missing transition {step['id']}", fails)

    ot = next((o for o in profile["catalogues"]["objectTypes"] if o["id"] == "decret"), None)
    if not ot or ot.get("lifecycle") != "cycle-projet-acte":
        fail("objectType decret / lifecycle mismatch", fails)
    else:
        ok("objectType decret → cycle-projet-acte")

    bodies = {b["id"] for b in profile["structure"]["bodies"]}
    if "dep-dfa" not in bodies:
        fail("dep-dfa missing", fails)
    else:
        ok("pilot dep-dfa present")

    state = next(s["id"] for s in lc["states"] if s.get("initial"))
    day = 1
    for step in STEPS_S1:
        if step.get("weekdayTag"):
            day = seek_day(day, step["weekdayTag"])
        r = evaluate(step, state, day)
        if r["verdict"] != "ACCORDE":
            fail(f"S1 step {step['id']} {r}", fails)
            return
        state = step["to"]
    if state == "promulgue":
        ok("S1 9 acts → promulgue")
    else:
        fail(f"S1 final={state}", fails)


def validate_profile_retire(lc: dict, fails: list[str]) -> None:
    print("\n=== K1 profil retrait (art. 137 al. 4) ===")
    required = [
        ("adopte-ce", "retire", "author-act"),
        ("saisine-commission", "retire", "author-act"),
        ("rapports-deposes", "retire", "author-act"),
        ("entree-en-matiere", "retire", "author-act"),
        ("en-debats", "retire", "author-act"),
    ]
    for fr, to, by in required:
        step = {"from": fr, "to": to, "by": by}
        if transition_ok(lc, step):
            ok(f"retrait {fr}→retire")
        else:
            fail(f"missing retrait {fr}→retire", fails)

    # no retrait from vote-final+
    for fr in ("vote-final", "mise-au-point", "publie-delai-referendaire"):
        if any(
            t["from"] == fr and t["to"] == "retire"
            for t in lc["transitions"]
        ):
            fail(f"illegal retrait from {fr}", fails)
        else:
            ok(f"no retrait from {fr}")

    retire_st = next(s for s in lc["states"] if s["id"] == "retire")
    if retire_st.get("terminal"):
        ok("retire is terminal")
    else:
        fail("retire not terminal", fails)


def replay_branch(
    lc: dict,
    branch: str,
    fails: list[str],
) -> dict:
    """Replay one S2 branch purely against profile transitions."""
    state = next(s["id"] for s in lc["states"] if s.get("initial"))
    support = SUPPORT_BASE
    reading = 0
    minority = False
    amendment = False
    log: list[dict] = []
    day = 1

    def do(step: dict, *, note: str = "") -> bool:
        nonlocal state, day
        if step.get("weekdayTag"):
            day = seek_day(day, step["weekdayTag"])
        if not transition_ok(lc, step):
            fail(f"[{branch}] missing tr {step['from']}→{step['to']} {step.get('decisionType')}", fails)
            return False
        if state != step["from"]:
            fail(f"[{branch}] state {state} != {step['from']}", fails)
            return False
        r = evaluate(step, state, day)
        if r["verdict"] != "ACCORDE":
            fail(f"[{branch}] REFUS {step} {r}", fails)
            return False
        state = step["to"]
        log.append({**step, "note": note, "state": state, "support": support, "reading": reading})
        return True

    # common: CE adopt + saisine + rapports (minority)
    path_common = [
        {"from": "en-elaboration", "to": "adopte-ce", "by": "decision", "decisionType": "adopte", "weekdayTag": "ce"},
        {"from": "adopte-ce", "to": "saisine-commission", "by": "handover"},
        {"from": "saisine-commission", "to": "rapports-deposes", "by": "handover"},
    ]
    for st in path_common:
        if not do(st):
            return {"ok": False, "final": state, "log": log}
    minority = True
    support += SUPPORT_MINORITY

    if branch == "retire":
        # continue to en-debats then withdraw
        for st in [
            {"from": "rapports-deposes", "to": "entree-en-matiere", "by": "decision", "decisionType": "adopte", "weekdayTag": "gc"},
            {"from": "entree-en-matiere", "to": "en-debats", "by": "decision", "decisionType": "adopte", "weekdayTag": "gc"},
        ]:
            if not do(st):
                return {"ok": False, "final": state, "log": log}
        reading = 2
        # withdraw
        w = {"from": "en-debats", "to": "retire", "by": "author-act"}
        if not do(w, note="withdraw"):
            return {"ok": False, "final": state, "log": log}
        return {
            "ok": state == "retire",
            "final": state,
            "log": log,
            "support": support,
            "reading": reading,
            "minority": minority,
            "amendment": amendment,
        }

    # EEM + open debates
    for st in [
        {"from": "rapports-deposes", "to": "entree-en-matiere", "by": "decision", "decisionType": "adopte", "weekdayTag": "gc"},
        {"from": "entree-en-matiere", "to": "en-debats", "by": "decision", "decisionType": "adopte", "weekdayTag": "gc"},
    ]:
        if not do(st):
            return {"ok": False, "final": state, "log": log}
    reading = 2

    if branch == "adopte":
        # 3e débat: stay en-debats (no transition — gameplay counter only)
        amendment = True
        reading += 1
        support += SUPPORT_AMENDMENT
        log.append({
            "from": "en-debats",
            "to": "en-debats",
            "by": "amendment",
            "note": "3e débat / reading+1",
            "state": state,
            "support": support,
            "reading": reading,
        })
        if support < THRESHOLD:
            fail(f"[adopte] support {support} < {THRESHOLD} after amendment", fails)

        for st in [
            {"from": "en-debats", "to": "vote-final", "by": "decision", "decisionType": "adopte", "weekdayTag": "gc"},
            {"from": "vote-final", "to": "mise-au-point", "by": "decision", "decisionType": "adopte", "weekdayTag": "gc"},
            {"from": "mise-au-point", "to": "publie-delai-referendaire", "by": "handover"},
            {"from": "publie-delai-referendaire", "to": "promulgue", "by": "handover"},
        ]:
            if not do(st):
                return {"ok": False, "final": state, "log": log}
        return {
            "ok": state == "promulgue" and support >= THRESHOLD and reading == 3,
            "final": state,
            "log": log,
            "support": support,
            "reading": reading,
            "minority": minority,
            "amendment": amendment,
        }

    if branch == "rejete":
        # no amendment — support stays 64 < 76 → refuse
        if support >= THRESHOLD:
            fail(f"[rejete] support {support} should be < {THRESHOLD}", fails)
        for st in [
            {"from": "en-debats", "to": "vote-final", "by": "decision", "decisionType": "adopte", "weekdayTag": "gc"},
            {"from": "vote-final", "to": "rejete", "by": "decision", "decisionType": "refuse", "weekdayTag": "gc"},
        ]:
            if not do(st):
                return {"ok": False, "final": state, "log": log}
        return {
            "ok": state == "rejete" and support < THRESHOLD,
            "final": state,
            "log": log,
            "support": support,
            "reading": reading,
            "minority": minority,
            "amendment": amendment,
        }

    fail(f"unknown branch {branch}", fails)
    return {"ok": False, "final": state, "log": log}


def validate_s2(lc: dict, profile: dict, fails: list[str]) -> None:
    print("\n=== S2 credit-qui-fache (3 branches) ===")
    bodies = {b["id"] for b in profile["structure"]["bodies"]}
    if "dep-dsas" not in bodies:
        fail("dep-dsas missing", fails)
    else:
        ok("pilot dep-dsas present")

    profile_states = {s["id"] for s in lc["states"]}

    for branch, expected in (
        ("adopte", "promulgue"),
        ("rejete", "rejete"),
        ("retire", "retire"),
    ):
        res = replay_branch(lc, branch, fails)
        if res.get("ok") and res.get("final") == expected:
            ok(
                f"branch {branch} → {expected} "
                f"(support={res.get('support')} reading={res.get('reading')})"
            )
        else:
            fail(
                f"branch {branch} final={res.get('final')} expected={expected} ok={res.get('ok')}",
                fails,
            )
        # no invented states
        used = set()
        for row in res.get("log") or []:
            used.add(row["from"])
            used.add(row["to"])
        if not used <= profile_states:
            fail(f"[{branch}] invented states {used - profile_states}", fails)
        else:
            ok(f"[{branch}] states ⊆ profile")

    # K3 threshold variation
    print("\n=== K3 majorité qualifiée ===")
    if SUPPORT_BASE + SUPPORT_MINORITY < THRESHOLD:
        ok(f"sans amendement: {SUPPORT_BASE + SUPPORT_MINORITY} < {THRESHOLD}")
    else:
        fail("base-minority should be under threshold", fails)
    if SUPPORT_BASE + SUPPORT_MINORITY + SUPPORT_AMENDMENT >= THRESHOLD:
        ok(
            f"avec amendement: {SUPPORT_BASE + SUPPORT_MINORITY + SUPPORT_AMENDMENT} ≥ {THRESHOLD}"
        )
    else:
        fail("with amendment should reach threshold", fails)

    # K5 withdraw bounds
    print("\n=== K5 retrait borné ===")
    for st in WITHDRAW_OK:
        if transition_ok(lc, {"from": st, "to": "retire", "by": "author-act"}):
            ok(f"withdraw OK from {st}")
        else:
            fail(f"withdraw missing from {st}", fails)
    for st in WITHDRAW_FORBIDDEN:
        if any(t["from"] == st and t["to"] == "retire" for t in lc["transitions"]):
            fail(f"withdraw illegally from {st}", fails)
        else:
            ok(f"withdraw forbidden from {st}")


def main() -> int:
    print("validate_scenario — S1 + S2")
    fails: list[str] = []
    profile = json.loads(PROFILE.read_text(encoding="utf-8"))
    lc = find_lifecycle(profile)
    ok("loaded cycle-projet-acte")

    validate_s1(lc, profile, fails)
    validate_profile_retire(lc, fails)
    validate_s2(lc, profile, fails)

    print("=" * 56)
    if fails:
        print(f"RESULT: FAIL ({len(fails)})")
        for f in fails:
            print(f"  - {f}")
        return 1
    print("RESULT: PASS — S1 + S2 (3 branches)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
