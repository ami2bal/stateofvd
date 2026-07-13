#!/usr/bin/env python3
"""
Aligne la carte pixel sur state-of-vd/data/world.json (SSOT structure).

- Grille = world.grid (38×24)
- Sites = parlement, chateau, 7 dépts (PAS Rumine / cathédrale)
- Hotspots = 1 par site + 1 par room (ids canoniques)
- Tiled multi-calques ground / buildings_base / interiors / roofs
- Blueprint PNG pour brief artiste
"""
from __future__ import annotations

import json
import struct
import zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PARENT_WORLD = ROOT.parent / "state-of-vd" / "data" / "world.json"
TILE = 16
COLS_TS = 16
ROWS_TS = 8
SHEET_W = COLS_TS * TILE
SHEET_H = ROWS_TS * TILE

P = {
    "ciel": (0xD6, 0xE8, 0xF4),
    "jura_far": (0x9D, 0xB3, 0xBC),
    "jura_near": (0x6E, 0x8A, 0x6E),
    "snow": (0xF3, 0xF6, 0xF4),
    "herbe": (0x8F, 0xBC, 0x6A),
    "herbe_deep": (0x6A, 0x9A, 0x4A),
    "herbe_lite": (0xA8, 0xD0, 0x7A),
    "path": (0xC9, 0xB8, 0x96),
    "pave": (0xB8, 0xB0, 0xA0),
    "pave_deep": (0x96, 0x8E, 0x80),
    "sable": (0xD4, 0xC4, 0xA0),
    "eau": (0x4C, 0x83, 0xAB),
    "eau_lite": (0x6B, 0xA4, 0xC8),
    "eau_deep": (0x2E, 0x5A, 0x7A),
    "molasse": (0xD4, 0xC8, 0xB0),
    "molasse_deep": (0xB0, 0xA4, 0x8C),
    "crepi": (0xED, 0xE8, 0xDC),
    "toit": (0xB4, 0x67, 0x4F),
    "toit_deep": (0x8E, 0x48, 0x38),
    "vert_gc": (0x3E, 0x7A, 0x52),
    "or_ce": (0xC9, 0xA4, 0x5C),
    "or_deep": (0xA0, 0x80, 0x40),
    "encre": (0x2F, 0x42, 0x66),
    "vitre": (0x9F, 0xC2, 0xDC),
    "bois": (0x8B, 0x69, 0x14),
    "bois_lite": (0xB8, 0x89, 0x3A),
    "feuille": (0x3D, 0x7A, 0x3A),
    "feuille_deep": (0x2A, 0x5A, 0x28),
    "vigne": (0x5A, 0x8A, 0x3A),
    "shadow": (0x2A, 0x30, 0x28),
    "white": (0xFF, 0xFF, 0xFF),
    "paper": (0xF4, 0xEF, 0xE4),
    "parquet": (0xD4, 0xC4, 0xA0),
}

# Minimal tileset names used by this builder (index = sheet slot)
TILE_ORDER = [
    "empty",
    "herbe",
    "herbe_b",
    "path",
    "pave",
    "sable",
    "eau",
    "eau_b",
    "jura",
    "jura_snow",
    "ciel",
    "wall",
    "wall_gc",
    "wall_ce",
    "wall_dept",
    "floor_int",
    "floor_hemi",
    "floor_college",
    "desk",
    "window",
    "door",
    "roof",
    "roof_gc",
    "roof_ce",
    "roof_dept",
    "header_gc",
    "header_ce",
    "vigne",
    "tree",
    "bush",
    "cobble",
    "esplanade",
]


def load_world() -> dict:
    if not PARENT_WORLD.exists():
        raise SystemExit(f"world.json introuvable: {PARENT_WORLD}")
    return json.loads(PARENT_WORLD.read_text(encoding="utf-8"))


def new_buf(w, h):
    return bytearray([0, 0, 0, 0] * (w * h))


def set_px(buf, w, x, y, rgb, a=255, hlim=None):
    if x < 0 or y < 0 or x >= w:
        return
    if hlim is not None and y >= hlim:
        return
    i = (y * w + x) * 4
    if i + 3 >= len(buf):
        return
    r, g, b = rgb
    buf[i : i + 4] = bytes((r, g, b, a))


def rect(buf, w, x0, y0, rw, rh, rgb, a=255, hlim=None):
    for y in range(y0, y0 + rh):
        for x in range(x0, x0 + rw):
            set_px(buf, w, x, y, rgb, a, hlim)


def write_png(path: Path, w: int, h: int, buf: bytearray):
    def chunk(tag: bytes, data: bytes) -> bytes:
        return (
            struct.pack(">I", len(data))
            + tag
            + data
            + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)
        )

    raw = bytearray()
    for y in range(h):
        raw.append(0)
        raw.extend(buf[y * w * 4 : (y + 1) * w * 4])
    png = bytearray(b"\x89PNG\r\n\x1a\n")
    png += chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 6, 0, 0, 0))
    png += chunk(b"IDAT", zlib.compress(bytes(raw), 9))
    png += chunk(b"IEND", b"")
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(png)


def paint_tile(buf, sw, col, row, kind):
    x0, y0 = col * TILE, row * TILE
    H = ROWS_TS * TILE

    def px(lx, ly, rgb, a=255):
        set_px(buf, sw, x0 + lx, y0 + ly, rgb, a, H)

    def r(lx, ly, rw, rh, rgb, a=255):
        rect(buf, sw, x0 + lx, y0 + ly, rw, rh, rgb, a, H)

    if kind in (None, "empty"):
        return
    if kind in ("herbe", "herbe_b"):
        r(0, 0, 16, 16, P["herbe"])
        for i, (x, y) in enumerate([(2, 3), (8, 9), (13, 4), (5, 13), (11, 6)]):
            px(x, y, P["herbe_deep"] if (i + (kind == "herbe_b")) % 2 else P["herbe_lite"])
        return
    if kind == "path":
        r(0, 0, 16, 16, P["path"])
        for x in range(0, 16, 2):
            px(x, 5, P["pave_deep"])
        return
    if kind in ("pave", "cobble", "esplanade"):
        r(0, 0, 16, 16, P["pave"] if kind != "esplanade" else P["path"])
        for y in range(0, 16, 4):
            for x in range(0, 16, 4):
                px(x + 3, y + 3, P["pave_deep"])
        return
    if kind == "sable":
        r(0, 0, 16, 16, P["sable"])
        return
    if kind in ("eau", "eau_b"):
        r(0, 0, 16, 16, P["eau"])
        off = 0 if kind == "eau" else 2
        for y in (3 + off, 9):
            for x in range(16):
                if (x + y) % 4 == 0:
                    px(x, y % 16, P["eau_lite"])
        return
    if kind == "jura":
        r(0, 0, 16, 16, P["jura_near"])
        r(0, 0, 16, 6, P["jura_far"])
        return
    if kind == "jura_snow":
        r(0, 0, 16, 16, P["jura_far"])
        for x in range(4, 12):
            px(x, 3, P["snow"])
        return
    if kind == "ciel":
        r(0, 0, 16, 16, P["ciel"])
        return
    if kind == "wall":
        r(0, 0, 16, 16, P["molasse"])
        r(0, 0, 16, 1, P["molasse_deep"])
        return
    if kind == "wall_gc":
        r(0, 0, 16, 16, P["molasse"])
        r(0, 0, 16, 3, P["vert_gc"])
        return
    if kind == "wall_ce":
        r(0, 0, 16, 16, P["molasse"])
        r(0, 0, 16, 3, P["or_deep"])
        return
    if kind == "wall_dept":
        r(0, 0, 16, 16, P["molasse"])
        r(0, 0, 16, 2, P["encre"])
        return
    if kind == "floor_int":
        r(0, 0, 16, 16, P["crepi"])
        return
    if kind == "floor_hemi":
        r(0, 0, 16, 16, P["parquet"])
        for x in range(3, 13):
            px(x, 12, P["vert_gc"])
            px(x, 10, P["vert_gc"], 160)
        return
    if kind == "floor_college":
        r(0, 0, 16, 16, P["crepi"])
        r(4, 5, 8, 6, P["or_ce"], 120)
        return
    if kind == "desk":
        r(0, 0, 16, 16, P["crepi"])
        r(2, 8, 12, 5, P["bois"])
        r(3, 6, 5, 3, P["paper"])
        return
    if kind == "window":
        r(0, 0, 16, 16, P["molasse"])
        r(3, 3, 10, 10, P["vitre"])
        return
    if kind == "door":
        r(0, 0, 16, 16, P["molasse"])
        r(4, 3, 8, 13, P["bois"])
        return
    if kind == "roof":
        r(0, 0, 16, 16, P["toit"])
        for y in range(0, 16, 3):
            r(0, y, 16, 1, P["toit_deep"])
        return
    if kind == "roof_gc":
        r(0, 0, 16, 16, P["toit"])
        r(0, 0, 16, 5, P["vert_gc"])
        return
    if kind == "roof_ce":
        r(0, 0, 16, 16, P["toit"])
        r(0, 0, 16, 5, P["or_deep"])
        return
    if kind == "roof_dept":
        r(0, 0, 16, 16, P["toit"])
        r(0, 0, 16, 3, P["encre"])
        return
    if kind == "header_gc":
        r(0, 0, 16, 16, P["vert_gc"])
        return
    if kind == "header_ce":
        r(0, 0, 16, 16, P["or_deep"])
        return
    if kind == "vigne":
        r(0, 0, 16, 16, P["herbe"])
        for x in range(1, 16, 4):
            r(x, 2, 2, 12, P["vigne"])
        return
    if kind == "tree":
        r(0, 0, 16, 16, P["herbe"])
        r(7, 10, 2, 5, P["bois"])
        r(3, 3, 10, 9, P["feuille"])
        return
    if kind == "bush":
        r(0, 0, 16, 16, P["herbe"])
        r(4, 8, 8, 6, P["feuille_deep"])
        return


def build_tileset() -> list[str]:
    buf = new_buf(SHEET_W, SHEET_H)
    names = []
    for idx, name in enumerate(TILE_ORDER):
        col, row = idx % COLS_TS, idx // COLS_TS
        paint_tile(buf, SHEET_W, col, row, name)
        names.append(name)
    while len(names) < COLS_TS * ROWS_TS:
        names.append(f"pad_{len(names)}")
    out = ROOT / "assets" / "tilesets" / "terrain_16.png"
    write_png(out, SHEET_W, SHEET_H, buf)
    (ROOT / "assets" / "tilesets" / "terrain_16.json").write_text(
        json.dumps(
            {
                "tile": TILE,
                "columns": COLS_TS,
                "rows": ROWS_TS,
                "tiles": names,
                "source": "build_from_world.py",
                "alignedTo": "state-of-vd/data/world.json",
            },
            indent=2,
        ),
        encoding="utf-8",
    )
    return names


def gid(name: str, names: list[str]) -> int:
    if not name or name == "empty":
        return 0
    return names.index(name) + 1


def room_rects_for_site(site: dict) -> list[dict]:
    """Subdivide site footprint into room rects (grid cells)."""
    gx, gy, fw, fh = site["gx"], site["gy"], site["fw"], site["fh"]
    rooms = site.get("rooms") or []
    kind = site.get("kind")
    out = []

    if kind == "parlement" and len(rooms) >= 5:
        # layout inspired by main plan: hemicycle left-large, offices right, pas perdus south
        layout = {
            "plenum-gc": (0, 0, max(8, fw - 5), fh - 2),
            "bureau-gc": (fw - 5, 0, 5, 3),
            "commission": (fw - 5, 3, 5, 3),
            "sgc": (fw - 5, 6, 5, fh - 6),
            "pas-perdus": (0, fh - 2, fw - 5, 2),
        }
        for r in rooms:
            box = layout.get(r["id"])
            if not box:
                continue
            rx, ry, rw, rh = box
            out.append(_room_hot(site, r, gx + rx, gy + ry, rw, rh))
        return out

    if kind == "chateau" and len(rooms) >= 3:
        layout = {
            "college-ce": (0, 0, fw - 4, fh - 2),
            "csg": (fw - 4, 0, 4, fh // 2),
            "chancellerie": (fw - 4, fh // 2, 4, fh - fh // 2),
        }
        # entry strip south
        for r in rooms:
            box = layout.get(r["id"])
            if not box:
                continue
            rx, ry, rw, rh = box
            out.append(_room_hot(site, r, gx + rx, gy + ry, rw, rh))
        return out

    if kind == "department" and rooms:
        # 3 rows stacked in 3×5
        n = len(rooms)
        row_h = max(1, fh // n)
        for i, r in enumerate(rooms):
            ry = i * row_h
            rh = row_h if i < n - 1 else fh - ry
            out.append(_room_hot(site, r, gx, gy + ry, fw, rh))
        return out

    # fallback: equal split
    n = max(1, len(rooms))
    for i, r in enumerate(rooms):
        rw = max(1, fw // n)
        rx = min(i * rw, fw - 1)
        out.append(_room_hot(site, r, gx + rx, gy, max(1, min(rw, fw - rx)), fh))
    return out


def _room_hot(site, room, gx, gy, fw, fh):
    return {
        "id": room["id"],
        "label": room.get("label") or room["id"],
        "kind": "room",
        "siteId": site["id"],
        "siteKind": site.get("kind"),
        "sub": site.get("displayName") or site["id"],
        "gx": gx,
        "gy": gy,
        "fw": fw,
        "fh": fh,
        "x": gx * TILE,
        "y": gy * TILE,
        "w": fw * TILE,
        "h": fh * TILE,
        "cx": (gx + fw / 2) * TILE,
        "cy": (gy + fh / 2) * TILE,
    }


def site_hot(site: dict) -> dict:
    gx, gy, fw, fh = site["gx"], site["gy"], site["fw"], site["fh"]
    kind = site.get("kind") or "site"
    label = site.get("displayName") or site["id"]
    if kind == "parlement":
        sub = "Grand Conseil — Hémicycle, Bureau, Commissions, SGC"
    elif kind == "chateau":
        sub = "Conseil d'État — Collège, CSG, Chancellerie"
    elif kind == "department":
        sub = "Département — Cabinet, SG, cellule EMPD"
    else:
        sub = kind
    return {
        "id": site["id"],
        "label": label,
        "kind": kind,
        "siteId": site["id"],
        "sub": sub,
        "gx": gx,
        "gy": gy,
        "fw": fw,
        "fh": fh,
        "x": gx * TILE,
        "y": gy * TILE,
        "w": fw * TILE,
        "h": fh * TILE,
        "cx": (gx + fw / 2) * TILE,
        "cy": (gy + fh / 2) * TILE,
    }


def build_layers(world: dict, names: list[str]):
    W = world["grid"]["w"]
    H = world["grid"]["h"]
    sites = world["sites"]
    esplanade = world.get("esplanade") or {}

    def L(fn):
        return [fn(tx, ty) for ty in range(H) for tx in range(W)]

    occupied = {}
    for s in sites:
        for x in range(s["gx"], s["gx"] + s["fw"]):
            for y in range(s["gy"], s["gy"] + s["fh"]):
                occupied[(x, y)] = s

    room_cell = {}
    for s in sites:
        for rh in room_rects_for_site(s):
            for x in range(rh["gx"], rh["gx"] + rh["fw"]):
                for y in range(rh["gy"], rh["gy"] + rh["fh"]):
                    room_cell[(x, y)] = rh

    def ground(tx, ty):
        # borders: north jura, south lake, east lavaux-ish
        if ty == 0:
            return gid("ciel", names)
        if ty == 1:
            return gid("jura_snow" if tx % 6 == 2 else "jura", names)
        if ty >= H - 2:
            return gid("eau_b" if (tx + ty) % 2 else "eau", names)
        if ty == H - 3:
            return gid("sable", names)
        if tx >= W - 4 and 4 <= ty <= H - 6:
            return gid("vigne", names)
        # esplanade
        if esplanade:
            if esplanade.get("gx0", 0) <= tx <= esplanade.get("gx1", 0) and esplanade.get(
                "gy0", 0
            ) <= ty <= esplanade.get("gy1", 0):
                return gid("esplanade", names)
        # spine path between majors and depts
        if (tx, ty) in occupied:
            return gid("path", names)  # under building replaced later
        # paths near entries
        for s in sites:
            ex, ey = s["entry"]["gx"], s["entry"]["gy"]
            if abs(tx - ex) + abs(ty - ey) <= 1:
                return gid("path", names)
        # horizontal path above depts
        if ty == 15 and 2 <= tx <= 35:
            return gid("path", names)
        if (tx + ty) % 7 == 0 and ty > 2:
            return gid("bush" if tx % 2 else "tree", names)
        return gid("herbe_b" if (tx * 3 + ty) % 5 == 0 else "herbe", names)

    def base(tx, ty):
        s = occupied.get((tx, ty))
        if not s:
            return 0
        k = s.get("kind")
        if k == "parlement":
            return gid("wall_gc", names)
        if k == "chateau":
            return gid("wall_ce", names)
        return gid("wall_dept", names)

    def interiors(tx, ty):
        rh = room_cell.get((tx, ty))
        if not rh:
            return 0
        rid = rh["id"]
        if rid == "plenum-gc":
            return gid("floor_hemi", names)
        if rid == "college-ce":
            return gid("floor_college", names)
        if "projet" in rid or rid in ("bureau-gc", "chancellerie", "sgc"):
            return gid("desk", names) if (tx + ty) % 3 == 0 else gid("floor_int", names)
        if rid.endswith("-cabinet") or rid.endswith("-sg"):
            return gid("desk", names) if ty % 2 == 0 else gid("floor_int", names)
        return gid("floor_int", names)

    def roofs(tx, ty):
        s = occupied.get((tx, ty))
        if not s:
            return 0
        k = s.get("kind")
        # door on entry cell
        if tx == s["entry"]["gx"] and ty == s["entry"]["gy"]:
            return gid("door", names)
        # top row = roof header
        if ty == s["gy"]:
            if k == "parlement":
                return gid("roof_gc", names)
            if k == "chateau":
                return gid("roof_ce", names)
            return gid("roof_dept", names)
        # windows pattern on exterior shell
        if (
            tx in (s["gx"], s["gx"] + s["fw"] - 1)
            or ty in (s["gy"] + 1, s["gy"] + s["fh"] - 1)
        ):
            return gid("window", names) if (tx + ty) % 2 == 0 else gid(
                "wall_gc"
                if k == "parlement"
                else "wall_ce"
                if k == "chateau"
                else "wall_dept",
                names,
            )
        return gid(
            "roof_gc" if k == "parlement" else "roof_ce" if k == "chateau" else "roof_dept",
            names,
        )

    # clear ground under buildings for cleaner look (path only at doors)
    gdata = L(ground)
    for (tx, ty), s in occupied.items():
        if not (tx == s["entry"]["gx"] and ty == s["entry"]["gy"]):
            # leave grass edge feel — actually zero then base paints
            pass

    return {
        "W": W,
        "H": H,
        "ground": L(ground),
        "base": L(base),
        "interiors": L(interiors),
        "roofs": L(roofs),
        "sites": sites,
        "room_hots": [h for s in sites for h in room_rects_for_site(s)],
        "site_hots": [site_hot(s) for s in sites],
    }


def write_tiled(names, built):
    W, H = built["W"], built["H"]
    tiled = {
        "compressionlevel": -1,
        "height": H,
        "width": W,
        "tilewidth": TILE,
        "tileheight": TILE,
        "infinite": False,
        "orientation": "orthogonal",
        "renderorder": "right-down",
        "type": "map",
        "version": "1.10",
        "tilesets": [
            {
                "firstgid": 1,
                "columns": COLS_TS,
                "image": "../tilesets/terrain_16.png",
                "imageheight": SHEET_H,
                "imagewidth": SHEET_W,
                "margin": 0,
                "spacing": 0,
                "name": "terrain_16",
                "tilecount": COLS_TS * ROWS_TS,
                "tilewidth": TILE,
                "tileheight": TILE,
            }
        ],
        "layers": [
            {
                "id": 1,
                "name": "ground",
                "type": "tilelayer",
                "width": W,
                "height": H,
                "visible": True,
                "opacity": 1,
                "data": built["ground"],
            },
            {
                "id": 2,
                "name": "buildings_base",
                "type": "tilelayer",
                "width": W,
                "height": H,
                "visible": True,
                "opacity": 1,
                "data": built["base"],
            },
            {
                "id": 3,
                "name": "interiors",
                "type": "tilelayer",
                "width": W,
                "height": H,
                "visible": True,
                "opacity": 1,
                "data": built["interiors"],
            },
            {
                "id": 4,
                "name": "roofs",
                "type": "tilelayer",
                "width": W,
                "height": H,
                "visible": True,
                "opacity": 1,
                "data": built["roofs"],
            },
        ],
        "properties": [
            {"name": "alignedTo", "type": "string", "value": "state-of-vd/data/world.json"},
            {"name": "noRumine", "type": "bool", "value": True},
        ],
    }
    path = ROOT / "assets" / "map" / "world.json"
    path.write_text(json.dumps(tiled), encoding="utf-8")
    return path


def write_hotspots(built, world):
    # rooms first (more specific), then sites
    hots = built["room_hots"] + built["site_hots"]
    # zone labels as non-building hotspots optional
    zl = world.get("zoneLabels") or {}
    W, H = built["W"], built["H"]
    if zl.get("lac"):
        hots.append(
            {
                "id": "zone-leman",
                "label": zl["lac"],
                "kind": "nature",
                "sub": "Frontière sud (décor)",
                "x": 0,
                "y": (H - 2) * TILE,
                "w": W * TILE,
                "h": 2 * TILE,
                "cx": W * TILE / 2,
                "cy": (H - 1) * TILE,
            }
        )
    path = ROOT / "assets" / "hotspots.json"
    doc = {
        "tile": TILE,
        "alignedTo": "state-of-vd/data/world.json",
        "grid": {"w": W, "h": H},
        "hotspots": hots,
    }
    path.write_text(json.dumps(doc, indent=2, ensure_ascii=False), encoding="utf-8")
    # also cache world snapshot for runtime
    (ROOT / "assets" / "map" / "world_src.json").write_text(
        json.dumps(
            {
                "grid": world["grid"],
                "sites": [
                    {
                        "id": s["id"],
                        "kind": s.get("kind"),
                        "displayName": s.get("displayName"),
                        "gx": s["gx"],
                        "gy": s["gy"],
                        "fw": s["fw"],
                        "fh": s["fh"],
                        "entry": s.get("entry"),
                        "rooms": [
                            {"id": r["id"], "label": r.get("label"), "role": r.get("role")}
                            for r in s.get("rooms") or []
                        ],
                    }
                    for s in world["sites"]
                ],
                "namedDepartments": world.get("namedDepartments"),
                "esplanade": world.get("esplanade"),
                "zoneLabels": world.get("zoneLabels"),
            },
            indent=2,
            ensure_ascii=False,
        ),
        encoding="utf-8",
    )
    return path


def write_blueprint(built):
    """Wireframe for artists — site boxes + room ids."""
    W, H = built["W"], built["H"]
    pw, ph = W * TILE, H * TILE
    buf = new_buf(pw, ph)
    # bg
    rect(buf, pw, 0, 0, pw, ph, P["herbe"])
    rect(buf, pw, 0, 0, pw, 2 * TILE, P["jura_far"])
    rect(buf, pw, 0, (H - 2) * TILE, pw, 2 * TILE, P["eau"])
    colors = {
        "parlement": P["vert_gc"],
        "chateau": P["or_deep"],
        "department": P["encre"],
    }
    for s in built["sites"]:
        c = colors.get(s.get("kind"), P["molasse_deep"])
        x, y = s["gx"] * TILE, s["gy"] * TILE
        w, h = s["fw"] * TILE, s["fh"] * TILE
        rect(buf, pw, x, y, w, h, P["molasse"])
        # border
        for i in range(w):
            set_px(buf, pw, x + i, y, c)
            set_px(buf, pw, x + i, y + h - 1, c)
        for j in range(h):
            set_px(buf, pw, x, y + j, c)
            set_px(buf, pw, x + w - 1, y + j, c)
    for rh in built["room_hots"]:
        x, y, w, h = rh["x"], rh["y"], rh["w"], rh["h"]
        for i in range(0, w, 2):
            set_px(buf, pw, x + i, y, P["white"], 200)
            set_px(buf, pw, x + i, y + h - 1, P["white"], 200)
    path = ROOT / "assets" / "refs" / "blueprint_world.png"
    write_png(path, pw, ph, buf)
    # room list for artists
    lines = [
        "# Blueprint rooms (world.json aligned)",
        "",
        f"Grid {W}×{H} tiles @ {TILE}px → {pw}×{ph}px",
        "",
    ]
    for s in built["sites"]:
        lines.append(f"## {s['id']} ({s.get('kind')}) {s['fw']}×{s['fh']} @ ({s['gx']},{s['gy']})")
        lines.append(f"   px: {s['fw']*TILE}×{s['fh']*TILE}")
        for rh in built["room_hots"]:
            if rh.get("siteId") == s["id"]:
                lines.append(
                    f"   - `{rh['id']}` {rh['fw']}×{rh['fh']} tiles → {rh['w']}×{rh['h']}px — {rh['label']}"
                )
        lines.append("")
    (ROOT / "assets" / "refs" / "blueprint_rooms.md").write_text(
        "\n".join(lines), encoding="utf-8"
    )
    return path


def main():
    world = load_world()
    # filter: only playable institutional sites from world (already correct)
    forbidden = {"palais", "rumine", "cathedrale", "cathedral"}
    world["sites"] = [s for s in world["sites"] if s["id"] not in forbidden]
    names = build_tileset()
    built = build_layers(world, names)
    write_tiled(names, built)
    hs = write_hotspots(built, world)
    bp = write_blueprint(built)
    print("OK tileset", len(TILE_ORDER), "tiles")
    print("OK map", built["W"], "x", built["H"])
    print("OK sites", len(built["sites"]), [s["id"] for s in built["sites"]])
    print("OK room hotspots", len(built["room_hots"]))
    print("OK", hs.relative_to(ROOT))
    print("OK", bp.relative_to(ROOT))
    assert not any(h["id"] in forbidden for h in built["site_hots"])
    print("OK no Rumine/cathédrale in sites")


if __name__ == "__main__":
    main()
