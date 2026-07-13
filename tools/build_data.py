"""Build data/world.json v0.5 — institutions-centric atelier (ADR D-013 / TASK-090).

Institutions dominate the center; Jura/Léman/Lavaux = thin fringes for ambient.
D-008: disjoint footprints, esplanade ≥ 4, gap ≥ 2.

Usage: python proto/state-of-vd/tools/build_data.py
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
OUT = ROOT / "proto" / "state-of-vd" / "data" / "world.json"

# Compact institutions-centric grid (v0.5 + K19 taller/centered)
GRID_W, GRID_H = 38, 24
CITE_ELEV = 40
# TASK-100 K6/K8: minimal décor height — centre institutions dominate (~70%+)
JURA_BAND = 1  # minimal: clouds + curved horizon only
LAKE_BAND = 1  # minimal: boat strip
LAVAUX_W = 2  # eastern fringe x=36..37

NAMED_DEPTS = [
    ("dep-dits", "DITS", "#5C6E8A", False),
    ("dep-deiep", "DEIEP", "#8A6E5C", False),
    ("dep-def", "DEF", "#6E8A6E", False),
    ("dep-dsas", "DSAS", "#7A6A8C", True),
    ("dep-dcirh", "DCIRH", "#5C7A8A", False),
    ("dep-djes", "DJES", "#8A5C6E", False),
    ("dep-dfa", "DFA", "#8A7A5C", True),
]

# TASK-107: NO Rumine — majors expanded into freed upper space (contain-fit + margins)
# jura=1 lake=1 · green y=1..23 · top margin ~1–2 · bot ~2
# Stack: maj9 + gap3 + dept4 = 16 → gy0=2 … gy1=20
PARLEMENT = {"gx": 3, "gy": 2, "fw": 14, "fh": 9}  # ends x=17 y=11; door mid ~10
CHATEAU = {"gx": 21, "gy": 2, "fw": 12, "fh": 9}  # gap esplanade 4 (17→21); door mid ~27
# majors end 11; depts start 14 gap≥2; fh=4 ends 18 → bot (23-18)=5 with lake@23
# lift depts for margin balance: DEPT_Y=16 ends 20 → bot=3; top=2-1=1
# majors end y=11; depts lower to balance margins (top≈1 bot≈2)
DEPT_Y = 16
DEPT_X0 = 2
DEPT_FW, DEPT_FH = 3, 5  # taller depts fill freed vertical band → end 21
DEPT_STEP = 5  # 2..32




def die(msg: str) -> None:
    print(f"FAIL: {msg}")
    raise SystemExit(1)


def load_profile() -> dict:
    if not PROFILE.exists():
        die(f"missing profile {PROFILE}")
    return json.loads(PROFILE.read_text(encoding="utf-8"))


def body_index(profile: dict) -> dict[str, dict]:
    return {b["id"]: b for b in profile["structure"]["bodies"]}


def institution_index(profile: dict) -> dict[str, dict]:
    return {i["id"]: i for i in profile["structure"]["institutions"]}


def room(body: dict, extra: dict | None = None) -> dict:
    r = {
        "id": body["id"],
        "bodyId": body["id"],
        "label": body["label"],
        "institutionId": body["institution"],
        "decor": False,
    }
    if body.get("acronym"):
        r["acronym"] = body["acronym"]
    if extra:
        r.update(extra)
    return r


def decor_room(rid: str, label: str, extra: dict | None = None) -> dict:
    r = {
        "id": rid,
        "bodyId": None,
        "label": label,
        "institutionId": None,
        "decor": True,
    }
    if extra:
        r.update(extra)
    return r


def footprint_cells(gx: int, gy: int, fw: int, fh: int) -> set[tuple[int, int]]:
    return {(gx + dx, gy + dy) for dy in range(fh) for dx in range(fw)}


def rect_gap(a: tuple, b: tuple) -> int:
    ax, ay, aw, ah = a
    bx, by, bw, bh = b
    dx = max(0, bx - (ax + aw), ax - (bx + bw))
    dy = max(0, by - (ay + ah), ay - (by + bh))
    if dx == 0 and dy == 0:
        if ax < bx + bw and ax + aw > bx and ay < by + bh and ay + ah > by:
            return -1
        return 0
    if dx == 0:
        return dy
    if dy == 0:
        return dx
    return min(dx, dy)


def make_tiles(par: dict, cha: dict) -> list[list[str]]:
    """Base grass + décor fringes only (TASK-094: no Esplanade/Rue blocks)."""
    tiles = [["grass" for _ in range(GRID_W)] for _ in range(GRID_H)]
    for y in range(JURA_BAND):
        for x in range(GRID_W):
            tiles[y][x] = "jura"
    for y in range(GRID_H - LAKE_BAND, GRID_H):
        for x in range(GRID_W):
            tiles[y][x] = "water"
    # Lavaux eastern fringe
    for y in range(JURA_BAND, GRID_H - LAKE_BAND):
        for x in range(GRID_W - LAVAUX_W, GRID_W):
            tiles[y][x] = "lavaux"
    # No cite/esplanade/dept rectangle fills — circulation = Graphics paths
    void = (par, cha)  # keep signature used by caller
    return tiles


def build(profile: dict) -> dict:
    bodies = body_index(profile)
    insts = institution_index(profile)

    core = {
        "plenum-gc", "bureau-gc", "commission", "sgc",
        "college-ce", "csg", "chancellerie", "departement", "service",
    }
    named_ids = {d[0] for d in NAMED_DEPTS}
    required = core | named_ids
    missing = sorted(required - set(bodies))
    if missing:
        die(f"profile bodies missing: {missing}")

    for bid, acr, _col, _play in NAMED_DEPTS:
        b = bodies[bid]
        if b.get("acronym") != acr:
            die(f"{bid} acronym {b.get('acronym')!r} != {acr!r}")
        if b.get("legislature") != "2022-2027":
            die(f"{bid} legislature missing/wrong")
        if not b.get("sources"):
            die(f"{bid} sources empty")

    sites: list[dict] = []
    placed: set[str] = set()

    # TASK-107: Rumine removed (not a GC↔CE organ). Publication→Chancellerie; pétitions→SGC/GC.

    parl = {
        "id": "parlement",
        "displayName": "Parlement",
        "kind": "parlement",
        **PARLEMENT,
        "elev": CITE_ELEV,
        "levels": 2,
        "accent": "gc",
        "hostInstitution": "gc",
        "hostBodyId": None,
        "rooms": [
            room(bodies["plenum-gc"], {"role": "hemicycle"}),
            room(bodies["bureau-gc"]),
            room(bodies["commission"]),
            room(bodies["sgc"], {"role": "delays-board"}),
            decor_room("pas-perdus", "Salle des pas perdus"),
        ],
        "entry": {
            "gx": PARLEMENT["gx"] + PARLEMENT["fw"] // 2,
            "gy": PARLEMENT["gy"] + PARLEMENT["fh"],
        },
    }
    for r in parl["rooms"]:
        if r["bodyId"]:
            placed.add(r["bodyId"])
    sites.append(parl)

    chat = {
        "id": "chateau",
        "displayName": "Château Saint-Maire",
        "kind": "chateau",
        **CHATEAU,
        "elev": CITE_ELEV,
        "levels": 4,
        "accent": "ce",
        "hostInstitution": "ce",
        "hostBodyId": None,
        "rooms": [
            room(bodies["college-ce"], {"role": "council-table"}),
            room(bodies["csg"], {"role": "anteroom"}),
            room(bodies["chancellerie"], {"role": "chancellerie"}),
        ],
        "entry": {
            "gx": CHATEAU["gx"] + CHATEAU["fw"] // 2,
            "gy": CHATEAU["gy"] + CHATEAU["fh"],
        },
    }
    for r in chat["rooms"]:
        if r["bodyId"]:
            placed.add(r["bodyId"])
    sites.append(chat)

    svc = bodies["service"]
    for i, (bid, acr, colour, playable) in enumerate(NAMED_DEPTS):
        b = bodies[bid]
        gx = DEPT_X0 + i * DEPT_STEP
        # Structure d'organe HOMOLOGUE ×7 (cabinet + SG + capacité EMPD).
        # v1playable = flag scénario uniquement — ne différencie plus le plan.
        rooms = [
            decor_room(
                f"{bid}-cabinet",
                "Cabinet du chef de département",
                {"role": "cabinet"},
            ),
            decor_room(
                f"{bid}-sg",
                "Secrétariat général",
                {"role": "secretariat"},
            ),
            decor_room(
                f"{bid}-projet",
                "Cellule EMPD",
                {"role": "projet"},
            ),
        ]
        sites.append(
            {
                "id": bid,
                "displayName": f"{acr} — {b['label']}",
                "kind": "department",
                "gx": gx,
                "gy": DEPT_Y,
                "fw": DEPT_FW,
                "fh": DEPT_FH,
                "elev": 8,
                "levels": 2 + (i % 2),
                "accent": "dept",
                "deptIndex": i + 1,
                "deptTint": colour,
                "acronym": acr,
                "v1playable": playable,
                "hostInstitution": "ce",
                "hostBodyId": bid,
                "hostLabel": b["label"],
                "bodyTypeId": "departement",
                "bodyTypeLabel": bodies["departement"]["label"],
                "serviceTypeId": "service",
                "serviceTypeLabel": svc["label"],
                "rooms": rooms,
                # K26: north door — entry cell just above building
                "entry": {"gx": gx + 1, "gy": max(0, DEPT_Y - 1)},
            }
        )
        placed.add(bid)

    placed.add("departement")
    placed.add("service")
    if placed != required:
        die(f"body coverage {sorted(placed)} != {sorted(required)}")

    if any(s["id"] == "chancellerie" for s in sites):
        die("site chancellerie must not exist")
    if any(s["id"] == "rumine" for s in sites):
        die("TASK-107: rumine site must not exist")

    par = next(s for s in sites if s["id"] == "parlement")

    cells: dict[tuple[int, int], str] = {}
    for s in sites:
        for c in footprint_cells(s["gx"], s["gy"], s["fw"], s["fh"]):
            if c[0] < 0 or c[1] < 0 or c[0] >= GRID_W or c[1] >= GRID_H:
                die(f"{s['id']} out of grid at {c}")
            if c in cells:
                die(f"overlap {cells[c]} vs {s['id']} at {c}")
            cells[c] = s["id"]

    for i, a in enumerate(sites):
        for b in sites[i + 1 :]:
            ra = (a["gx"], a["gy"], a["fw"], a["fh"])
            rb = (b["gx"], b["gy"], b["fw"], b["fh"])
            g = rect_gap(ra, rb)
            if g < 0:
                die(f"overlap {a['id']}/{b['id']}")
            # Axis-aligned separation only (diagonal pairs may have min(dx,dy)=1)
            ax, ay, aw, ah = ra
            bx, by, bw, bh = rb
            x_overlap = ax < bx + bw and ax + aw > bx
            y_overlap = ay < by + bh and ay + ah > by
            if x_overlap or y_overlap:
                if g < 2:
                    die(f"gap {a['id']}/{b['id']} = {g} < 2")

    cha = next(s for s in sites if s["id"] == "chateau")
    esp = cha["gx"] - (par["gx"] + par["fw"])
    if esp < 4:
        die(f"esplanade gap={esp} < 4")

    for i in range(6):
        a = next(s for s in sites if s["id"] == NAMED_DEPTS[i][0])
        b = next(s for s in sites if s["id"] == NAMED_DEPTS[i + 1][0])
        gap = b["gx"] - (a["gx"] + a["fw"])
        if gap < 2:
            die(f"dept spacing {a['id']}/{b['id']} gap={gap}")

    tiles = make_tiles(par, cha)
    min_gx = min(s["gx"] for s in sites)
    max_gx = max(s["gx"] + s["fw"] for s in sites)
    min_gy = min(s["gy"] for s in sites)
    max_gy = max(s["gy"] + s["fh"] for s in sites)

    esplanade = {
        "gx0": par["gx"] + par["fw"],
        "gx1": cha["gx"] - 1,
        "gy0": par["gy"],
        "gy1": par["gy"] + par["fh"] - 1,
    }

    waypoints = [
        {"id": "wp-parlement", "gx": parl["entry"]["gx"], "gy": parl["entry"]["gy"]},
        {
            "id": "wp-esplanade",
            "gx": (esplanade["gx0"] + esplanade["gx1"]) // 2,
            "gy": esplanade["gy1"],
        },
        {"id": "wp-chateau", "gx": cha["entry"]["gx"], "gy": cha["entry"]["gy"]},
        {
            "id": "wp-depts",
            "gx": DEPT_X0 + 3 * DEPT_STEP,
            "gy": DEPT_Y + DEPT_FH,
        },
    ]

    qa_fixture = [
        {"at": 60, "tag": "courrier"},
        {"at": 420, "tag": "plenum-ouvre"},
        {"at": 720, "tag": "gazette"},
        {"at": 930, "tag": "fenetre-bordereau"},
        {"at": 1560, "tag": "college-ce"},
        {"at": 3090, "tag": "fenetre-bordereau"},
        {"at": 5460, "tag": "plenum-ouvre"},
    ]

    buildings = []
    for s in sites:
        if s["kind"] not in ("parlement", "chateau"):
            continue
        buildings.append(
            {
                "id": s["id"],
                "label": s["displayName"],
                "institutionLabel": (
                    insts.get(s.get("hostInstitution") or "", {}).get("label")
                    or s.get("hostLabel")
                    or s["displayName"]
                ),
                "bodyId": s.get("hostBodyId") or s["id"],
                "gx": s["gx"],
                "gy": s["gy"],
                "fw": s["fw"],
                "fh": s["fh"],
                "elev": s["elev"],
                "entry": s["entry"],
            }
        )

    world = {
        "schema": "state-of-vd/world/0.5",
        "grid": {"w": GRID_W, "h": GRID_H},
        "citeElev": CITE_ELEV,
        "esplanadeGap": esp,
        "esplanade": esplanade,
        "borders": {"jura": JURA_BAND, "lake": LAKE_BAND, "lavaux": LAVAUX_W},
        "builtBBox": {
            "gx0": min_gx,
            "gy0": min_gy,
            "gx1": max_gx,
            "gy1": max_gy,
        },
        "palette": {
            "molasse": "#C9BCA3",
            "molasseShade": "#A89F8D",
            "brique": "#A4553E",
            "briqueShade": "#7E3F2E",
            "toit": "#B4674F",
            "toitShade": "#8E5843",
            "pave": "#B8B2A6",
            "crepi": "#E8E2D4",
            "herbe": "#C8D9A8",
            "vertGc": "#3E7A52",
            "sableCe": "#C9A45C",
            "encre": "#2F4266",
            "deptTints": [d[2] for d in NAMED_DEPTS],
            "orResponsabilite": "#E8C15A",
        },
        "tiles": tiles,
        "sites": sites,
        "buildings": buildings,
        "waypoints": waypoints,
        # K21: dossierTour + patrol huissiers removed (Mode Parcours 097)
        "dossierTour": [],
        "qaFixture": qa_fixture,
        "qaExpectedOrder": [e["tag"] for e in qa_fixture],
        "huissiers": [],
        "zoneLabels": {
            # TASK-094: no Esplanade / Rue des Départements labels (plan paths instead)
            "lac": "Lac Léman",
            "lavaux": "Terrasses de Lavaux",
        },
        "bodyCoverage": sorted(placed),
        "namedDepartments": [
            {
                "id": bid,
                "acronym": acr,
                "label": bodies[bid]["label"],
                "deptTint": col,
                "v1playable": play,
            }
            for bid, acr, col, play in NAMED_DEPTS
        ],
    }
    return world


def write_world(world: dict) -> Path:
    OUT.parent.mkdir(parents=True, exist_ok=True)
    text = json.dumps(world, ensure_ascii=False, indent=2, sort_keys=True)
    text = text.replace("\r\n", "\n")
    if not text.endswith("\n"):
        text += "\n"
    OUT.write_text(text, encoding="utf-8")
    return OUT


def main() -> int:
    profile = load_profile()
    world = build(profile)
    path = write_world(world)
    print(f"Wrote {path.relative_to(ROOT)} ({path.stat().st_size} bytes)")
    print(f"  schema={world['schema']} grid={world['grid']} borders={world['borders']}")
    print(f"  builtBBox={world['builtBBox']} esplanadeGap={world['esplanadeGap']}")
    depts = [s for s in world["sites"] if s["kind"] == "department"]
    print(f"  depts={len(depts)} rooms each={[len(d['rooms']) for d in depts]}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
