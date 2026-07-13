"""Validate civic core schema + Vaud profile + invariants I1..I8.

Usage: python ce dossier/tools/validate_model.py
Exit 0 = all checks pass, 1 = failure.
"""
from __future__ import annotations

import json
import re
import sys
from collections import defaultdict, deque
from pathlib import Path
from typing import Any

try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

try:
    from jsonschema import Draft202012Validator
    from jsonschema.exceptions import SchemaError
except ImportError:  # pragma: no cover
    print("FAIL: jsonschema not installed")
    raise SystemExit(1)

ROOT = Path(__file__).resolve().parents[3]
MODEL = ROOT / "proto" / "state-of-vd" / "model"
SCHEMA_PATH = MODEL / "schema" / "civic.core.schema.json"
PROFILE_PATH = MODEL / "profiles" / "vaud.json"
LEGAL_INDEX = ROOT / "data_is" / "legal_index.json"

KEBAB = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")
FORBIDDEN_CORE = re.compile(
    r"vaud|grand conseil|conseil d'etat|conseil d'état|lgc|loce|ledp|lausanne",
    re.I,
)

# Expected v1 coverage (TASK-078 §4) — checked by accept gate too.
EXPECTED_ACTE_STATES = {
    "en-elaboration", "adopte-ce", "saisine-commission", "rapports-deposes",
    "entree-en-matiere", "en-debats", "vote-final", "mise-au-point",
    "publie-delai-referendaire", "promulgue", "rejete", "retire",
}
EXPECTED_MOTION_STATES = {
    "ebauche", "deposee", "recevable", "developpee", "renvoyee-commission",
    "preavisee", "prise-en-consideration", "renvoyee-au-ce", "reponse-deposee",
    "traitee", "non-prise-en-consideration", "transformee-en-postulat", "retiree",
}
EXPECTED_DECISIONS = {
    "adopte", "refuse", "non-entree-en-matiere", "pris-en-consideration",
    "renvoye-commission", "renvoye-ce", "renvoye-manque-de-temps",
    "transforme-en-postulat", "classe", "retire", "pris-acte", "reporte",
}
EXPECTED_BODIES = {
    "plenum-gc", "bureau-gc", "sgc", "commission", "college-ce",
    "chancellerie", "csg", "departement", "service",
}


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def ok(msg: str) -> None:
    print(f"  PASS  {msg}")


def fail(msg: str, failures: list[str]) -> None:
    print(f"  FAIL  {msg}")
    failures.append(msg)


def resolve_legal(legal_index: dict, ref: dict) -> str | None:
    """Return None if OK, else error message."""
    src, art = ref.get("source"), ref.get("art")
    if src not in legal_index.get("sources", {}):
        return f"unknown source '{src}'"
    arts = {a["art"]: a for a in legal_index["sources"][src]["articles"]}
    if art not in arts:
        return f"missing art {src}/{art}"
    if arts[art].get("abroge"):
        return f"abrogated art {src}/{art}"
    return None


def walk_props_need_desc(node: Any, path: str, missing: list[str]) -> None:
    if not isinstance(node, dict):
        return
    if "properties" in node and isinstance(node["properties"], dict):
        for k, v in node["properties"].items():
            p = f"{path}.properties.{k}"
            if isinstance(v, dict) and "description" not in v and "$ref" not in v:
                # $ref-only props may omit description at this level
                missing.append(p)
            elif isinstance(v, dict) and "description" not in v and "$ref" in v:
                pass  # ref target carries description; still prefer description on prop
            walk_props_need_desc(v, p, missing)
    for key in ("items", "if", "then", "else", "not"):
        if key in node:
            walk_props_need_desc(node[key], f"{path}.{key}", missing)
    for key in ("oneOf", "anyOf", "allOf"):
        if key in node and isinstance(node[key], list):
            for i, sub in enumerate(node[key]):
                walk_props_need_desc(sub, f"{path}.{key}[{i}]", missing)


def check_schema_meta(schema: dict, failures: list[str]) -> dict[str, int]:
    print("\n=== Meta schema (JSON Schema 2020-12) ===")
    try:
        Draft202012Validator.check_schema(schema)
        ok("Draft202012Validator.check_schema")
    except SchemaError as e:
        fail(f"schema meta-invalid: {e.message}", failures)

    defs = schema.get("$defs") or {}
    n_entity = n_sat = 0
    missing_def_desc: list[str] = []
    xref_bad: list[str] = []
    for name, d in defs.items():
        if not isinstance(d, dict):
            continue
        if "description" not in d:
            missing_def_desc.append(name)
        kind = d.get("x-kind")
        if kind == "entity":
            n_entity += 1
        elif kind == "satellite":
            n_sat += 1
        # collect x-ref targets
        def _scan(n: Any, p: str) -> None:
            if isinstance(n, dict):
                if "x-ref" in n:
                    target = n["x-ref"]
                    if target not in defs:
                        xref_bad.append(f"{p} -> {target}")
                for k, v in n.items():
                    _scan(v, f"{p}.{k}")
            elif isinstance(n, list):
                for i, v in enumerate(n):
                    _scan(v, f"{p}[{i}]")

        _scan(d, name)

    if n_entity == 12:
        ok(f"x-kind entity = {n_entity}")
    else:
        fail(f"x-kind entity = {n_entity} (expected 12)", failures)
    if n_sat == 2:
        ok(f"x-kind satellite = {n_sat}")
    else:
        fail(f"x-kind satellite = {n_sat} (expected 2)", failures)
    if missing_def_desc:
        fail(f"$defs without description: {missing_def_desc}", failures)
    else:
        ok(f"all {len(defs)} $defs have description")
    if xref_bad:
        fail(f"x-ref unresolved: {xref_bad}", failures)
    else:
        ok("all x-ref targets resolve to $defs")

    # Property descriptions (skip pure $ref leaves without sibling description — still count)
    missing_props: list[str] = []
    walk_props_need_desc(schema, "$", missing_props)
    # Also walk $defs trees
    for name, d in defs.items():
        walk_props_need_desc(d, f"$defs.{name}", missing_props)
    # Filter: allow missing description only when the node is solely a $ref
    # walk_props already skips $ref-only; remaining are real gaps
    if missing_props:
        fail(f"properties missing description ({len(missing_props)}): {missing_props[:8]}", failures)
    else:
        ok("all properties have description")

    return {"entity": n_entity, "satellite": n_sat, "defs": len(defs)}


def check_profile_schema(schema: dict, profile: dict, failures: list[str]) -> None:
    print("\n=== Profile vs schema ===")
    v = Draft202012Validator(schema)
    errors = sorted(v.iter_errors(profile), key=lambda e: list(e.path))
    if errors:
        for e in errors[:12]:
            fail(f"schema: {list(e.path)}: {e.message}", failures)
        if len(errors) > 12:
            fail(f"... +{len(errors) - 12} more schema errors", failures)
    else:
        ok("vaud.json validates against civic.core.schema.json")


def check_i1(profile: dict, failures: list[str]) -> None:
    print("\n=== I1 — kebab-case unique ids ===")
    cat = profile["catalogues"]
    ids: list[tuple[str, str]] = []
    for key in ("objectTypes", "lifecycles", "decisionTypes", "deadlineTypes"):
        for item in cat[key]:
            ids.append((f"cat.{key}", item["id"]))
    for inst in profile["structure"]["institutions"]:
        ids.append(("institution", inst["id"]))
    for body in profile["structure"]["bodies"]:
        ids.append(("body", body["id"]))
    for bucket, items in (profile.get("examples") or {}).items():
        for item in items or []:
            if isinstance(item, dict) and "id" in item:
                ids.append((f"ex.{bucket}", item["id"]))
    # state ids unique across all lifecycles
    for lc in cat["lifecycles"]:
        for st in lc["states"]:
            ids.append((f"state.{lc['id']}", st["id"]))

    bad_kebab = [f"{ns}:{i}" for ns, i in ids if not KEBAB.match(i)]
    if bad_kebab:
        fail(f"non kebab-case: {bad_kebab[:10]}", failures)
    else:
        ok(f"kebab-case OK ({len(ids)} ids)")

    # Uniqueness: catalogue+structure+examples together; states across lifecycles
    primary = [i for ns, i in ids if not ns.startswith("state.")]
    states = [i for ns, i in ids if ns.startswith("state.")]
    for label, seq in (("primary", primary), ("states", states)):
        seen: dict[str, int] = defaultdict(int)
        for i in seq:
            seen[i] += 1
        dups = sorted(k for k, n in seen.items() if n > 1)
        if dups:
            fail(f"I1 duplicate {label} ids: {dups}", failures)
        else:
            ok(f"unique {label} ids ({len(seq)})")


def check_i2_i6_i7(profile: dict, failures: list[str]) -> None:
    print("\n=== I2 / I6 / I7 — lifecycle integrity ===")
    decisions = {d["id"] for d in profile["catalogues"]["decisionTypes"]}
    for lc in profile["catalogues"]["lifecycles"]:
        lid = lc["id"]
        states = {s["id"]: s for s in lc["states"]}
        initials = [s for s in lc["states"] if s.get("initial")]
        terminals = [s for s in lc["states"] if s.get("terminal")]
        if len(initials) != 1:
            fail(f"{lid}: initial count={len(initials)} (need 1)", failures)
        else:
            ok(f"{lid}: 1 initial ({initials[0]['id']})")
        if len(terminals) < 1:
            fail(f"{lid}: no terminal state", failures)
        else:
            ok(f"{lid}: {len(terminals)} terminal(s)")

        graph: dict[str, list[str]] = defaultdict(list)
        for tr in lc["transitions"]:
            if "by" not in tr or not tr["by"]:
                fail(f"{lid}: transition missing by: {tr}", failures)
            if tr["from"] not in states or tr["to"] not in states:
                fail(f"{lid}: transition unknown state {tr['from']}→{tr['to']}", failures)
            else:
                graph[tr["from"]].append(tr["to"])
            if tr.get("by") == "decision":
                dt = tr.get("decisionType")
                if not dt:
                    fail(f"{lid}: by=decision without decisionType ({tr})", failures)
                elif dt not in decisions:
                    fail(f"{lid}: decisionType '{dt}' unknown", failures)
        ok(f"{lid}: transitions reference declared states + by set")

        # Reachability from initial
        if initials:
            start = initials[0]["id"]
            seen = {start}
            q = deque([start])
            while q:
                cur = q.popleft()
                for nxt in graph[cur]:
                    if nxt not in seen:
                        seen.add(nxt)
                        q.append(nxt)
            unreachable = sorted(set(states) - seen)
            if unreachable:
                fail(f"{lid}: unreachable states {unreachable}", failures)
            else:
                ok(f"{lid}: all {len(states)} states reachable from {start}")


def check_i3(profile: dict, legal_index: dict, failures: list[str]) -> int:
    print("\n=== I3 — deadlineTypes legal_ref resolved ===")
    resolved = 0
    for dt in profile["catalogues"]["deadlineTypes"]:
        err = resolve_legal(legal_index, dt["legal_ref"])
        if err:
            fail(f"deadlineType {dt['id']}: {err}", failures)
        else:
            resolved += 1
    ok(f"{resolved}/{len(profile['catalogues']['deadlineTypes'])} deadline legal_ref OK")
    return resolved


def check_i4(profile: dict, failures: list[str]) -> None:
    print("\n=== I4 — bodies → institutions, parent acyclic ===")
    inst = {i["id"] for i in profile["structure"]["institutions"]}
    bodies = {b["id"]: b for b in profile["structure"]["bodies"]}
    for bid, b in bodies.items():
        if b["institution"] not in inst:
            fail(f"body {bid}: unknown institution {b['institution']}", failures)
        parent = b.get("parent")
        if parent and parent not in bodies:
            fail(f"body {bid}: unknown parent {parent}", failures)
    # cycle detection
    def cycle(start: str) -> bool:
        seen: set[str] = set()
        cur = start
        while cur:
            if cur in seen:
                return True
            seen.add(cur)
            cur = bodies.get(cur, {}).get("parent")  # type: ignore[assignment]
        return False

    cyc = [bid for bid in bodies if cycle(bid)]
    if cyc:
        fail(f"parent cycles involving {cyc}", failures)
    else:
        ok(f"{len(bodies)} bodies, institutions OK, no parent cycle")


def check_i5(profile: dict, failures: list[str]) -> None:
    print("\n=== I5 — sources[] non-empty ===")
    gaps: list[str] = []
    cat = profile["catalogues"]
    for key in ("objectTypes", "lifecycles", "decisionTypes", "deadlineTypes"):
        for item in cat[key]:
            if not item.get("sources"):
                gaps.append(f"{key}.{item['id']}")
    for inst in profile["structure"]["institutions"]:
        if not inst.get("sources"):
            gaps.append(f"institution.{inst['id']}")
    for body in profile["structure"]["bodies"]:
        if not body.get("sources"):
            gaps.append(f"body.{body['id']}")
    if gaps:
        fail(f"empty sources: {gaps}", failures)
    else:
        ok("sources[] present on all catalogue items + bodies + institutions")


def check_i8(schema_text: str, failures: list[str]) -> None:
    print("\n=== I8 — core agnosticism ===")
    hits = FORBIDDEN_CORE.findall(schema_text)
    if hits:
        fail(f"forbidden tokens in core schema: {sorted(set(hits))}", failures)
    else:
        ok("no jurisdiction-specific tokens in civic.core.schema.json")


def check_all_legal_sources(profile: dict, legal_index: dict, failures: list[str]) -> int:
    """Resolve every legal source entry found in the profile."""
    print("\n=== Legal refs (all sources[]) ===")
    n_ok = n_bad = 0

    def visit(node: Any) -> None:
        nonlocal n_ok, n_bad
        if isinstance(node, dict):
            if node.get("type") == "legal" and "legal_ref" in node:
                err = resolve_legal(legal_index, node["legal_ref"])
                if err:
                    n_bad += 1
                    fail(f"legal source: {err} ({node['legal_ref']})", failures)
                else:
                    n_ok += 1
            if "legal_ref" in node and "type" not in node:
                # bare legal_ref on deadlineType / objectType
                err = resolve_legal(legal_index, node["legal_ref"])
                if err:
                    n_bad += 1
                    fail(f"legal_ref: {err} ({node['legal_ref']})", failures)
                else:
                    n_ok += 1
            for v in node.values():
                visit(v)
        elif isinstance(node, list):
            for v in node:
                visit(v)

    visit(profile)
    ok(f"resolved legal refs: {n_ok} OK, {n_bad} bad")
    return n_ok


def coverage_counters(profile: dict) -> dict[str, Any]:
    cat = profile["catalogues"]
    lc = {x["id"]: x for x in cat["lifecycles"]}
    return {
        "objectTypes": len(cat["objectTypes"]),
        "decisionTypes": len(cat["decisionTypes"]),
        "deadlineTypes": len(cat["deadlineTypes"]),
        "lifecycles": len(cat["lifecycles"]),
        "acte_states": len(lc.get("cycle-projet-acte", {}).get("states", [])),
        "motion_states": len(lc.get("cycle-motion", {}).get("states", [])),
        "bodies": len(profile["structure"]["bodies"]),
        "institutions": len(profile["structure"]["institutions"]),
    }


def main() -> int:
    print("Civic model validator — schema + vaud profile + I1..I8")
    failures: list[str] = []

    if not SCHEMA_PATH.exists() or not PROFILE_PATH.exists():
        print("FAIL: missing schema or profile")
        return 1
    if not LEGAL_INDEX.exists():
        print("FAIL: missing data_is/legal_index.json (TASK-077)")
        return 1

    schema = load_json(SCHEMA_PATH)
    profile = load_json(PROFILE_PATH)
    legal_index = load_json(LEGAL_INDEX)
    schema_text = SCHEMA_PATH.read_text(encoding="utf-8")

    meta = check_schema_meta(schema, failures)
    check_profile_schema(schema, profile, failures)
    check_i1(profile, failures)
    check_i2_i6_i7(profile, failures)
    n_deadline = check_i3(profile, legal_index, failures)
    check_i4(profile, failures)
    check_i5(profile, failures)
    check_i8(schema_text, failures)
    n_legal = check_all_legal_sources(profile, legal_index, failures)

    ctr = coverage_counters(profile)
    print("\n=== Counters ===")
    print(f"  entities x-kind     : {meta['entity']} entity + {meta['satellite']} satellite")
    print(f"  objectTypes         : {ctr['objectTypes']}")
    print(f"  decisionTypes       : {ctr['decisionTypes']}")
    print(f"  deadlineTypes       : {ctr['deadlineTypes']} (legal_ref OK: {n_deadline})")
    print(f"  lifecycles          : {ctr['lifecycles']} "
          f"(acte states={ctr['acte_states']}, motion states={ctr['motion_states']})")
    print(f"  structure           : {ctr['institutions']} institutions, {ctr['bodies']} bodies")
    print(f"  legal refs resolved : {n_legal}")

    print("\n" + "=" * 56)
    if failures:
        print(f"RESULT: FAIL ({len(failures)} issue(s))")
        for f in failures:
            print(f"  - {f}")
        return 1
    print("RESULT: PASS — I1..I8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
