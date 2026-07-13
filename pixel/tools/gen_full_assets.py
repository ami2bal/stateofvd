#!/usr/bin/env python3
"""
M1–M3 asset factory — tileset riche, carte 3 calques (ground/interiors/roofs),
hotspots, dossier spritesheet, atlas meta.
"""
from __future__ import annotations

import json
import math
import struct
import zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TILE = 16
COLS = 16
ROWS = 8
SHEET_W = COLS * TILE
SHEET_H = ROWS * TILE
MAP_W, MAP_H = 30, 23  # tiles

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
    "brique": (0xA4, 0x55, 0x3E),
    "paper": (0xF4, 0xEF, 0xE4),
    "parquet": (0xD4, 0xC4, 0xA0),
}

# name → painter key  (index 0 = empty transparent)
TILE_ORDER = [
    "empty",
    "herbe",
    "herbe_b",
    "herbe_c",
    "herbe_flower",
    "path",
    "path_edge",
    "pave",
    "pave_b",
    "sable",
    "eau",
    "eau_b",
    "eau_c",
    "jura",
    "jura_snow",
    "ciel",
    "wall",
    "wall_b",
    "wall_shadow",
    "floor_int",
    "floor_hemi",
    "desk",
    "chair",
    "window",
    "door",
    "roof",
    "roof_gc",
    "roof_ce",
    "roof_ridge",
    "header_gc",
    "header_ce",
    "vigne",
    "vigne_b",
    "tree",
    "tree_b",
    "statue",
    "boat",
    "deck",
    "spire",
    "flag_gc",
    "flag_ce",
    "bush",
    "cobble",
    "sand_edge",
]


def new_buf(w, h):
    return bytearray([0, 0, 0, 0] * (w * h))


def set_px(buf, w, x, y, rgb, a=255, h=None):
    if x < 0 or y < 0 or x >= w:
        return
    if h is not None and y >= h:
        return
    i = (y * w + x) * 4
    if i + 3 >= len(buf):
        return
    r, g, b = rgb
    buf[i : i + 4] = bytes((r, g, b, a))


def rect(buf, w, x0, y0, rw, rh, rgb, a=255, h=None):
    for y in range(y0, y0 + rh):
        for x in range(x0, x0 + rw):
            set_px(buf, w, x, y, rgb, a, h)


def write_png(path: Path, w: int, h: int, buf: bytearray):
    def chunk(tag: bytes, data: bytes) -> bytes:
        return struct.pack(">I", len(data)) + tag + data + struct.pack(
            ">I", zlib.crc32(tag + data) & 0xFFFFFFFF
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


def paint_kind(buf, sw, col, row, kind):
    x0, y0 = col * TILE, row * TILE
    H = ROWS * TILE

    def px(lx, ly, rgb, a=255):
        set_px(buf, sw, x0 + lx, y0 + ly, rgb, a, H)

    def r(lx, ly, rw, rh, rgb, a=255):
        rect(buf, sw, x0 + lx, y0 + ly, rw, rh, rgb, a, H)

    if kind in (None, "empty"):
        return

    if kind.startswith("herbe"):
        r(0, 0, 16, 16, P["herbe"])
        dots = {
            "herbe": [(2, 3), (8, 9), (13, 4), (5, 13)],
            "herbe_b": [(1, 6), (6, 2), (11, 11), (14, 7), (4, 10)],
            "herbe_c": [(3, 1), (9, 5), (12, 14), (7, 12), (15, 3)],
            "herbe_flower": [(2, 3), (8, 9), (13, 4), (5, 13), (10, 6)],
        }[kind]
        for i, (x, y) in enumerate(dots):
            px(x, y, P["herbe_deep"] if i % 2 == 0 else P["herbe_lite"])
        if kind == "herbe_flower":
            px(10, 6, P["or_ce"])
            px(4, 11, (0xE8, 0x8A, 0xA0))
        return

    if kind == "path":
        r(0, 0, 16, 16, P["path"])
        for x in range(0, 16, 2):
            px(x, 5, P["pave_deep"])
            px((x + 1) % 16, 11, P["pave_deep"])
        return
    if kind == "path_edge":
        r(0, 0, 16, 16, P["herbe"])
        r(4, 0, 8, 16, P["path"])
        for y in range(16):
            px(4, y, P["pave_deep"])
            px(11, y, P["pave_deep"])
        return
    if kind in ("pave", "pave_b", "cobble"):
        r(0, 0, 16, 16, P["pave"])
        step = 4 if kind != "cobble" else 3
        for y in range(0, 16, step):
            for x in range(0, 16, step):
                r(x, y, step - 1, step - 1, P["pave"] if (x + y) % 8 else P["pave_deep"])
                if kind == "pave_b":
                    px(x, y, P["molasse_deep"])
        return
    if kind == "sable":
        r(0, 0, 16, 16, P["sable"])
        for x, y in [(2, 2), (8, 7), (13, 12), (5, 14), (11, 3)]:
            px(x, y, P["path"])
        return
    if kind == "sand_edge":
        r(0, 0, 16, 10, P["herbe"])
        r(0, 10, 16, 6, P["sable"])
        return
    if kind in ("eau", "eau_b", "eau_c"):
        r(0, 0, 16, 16, P["eau"])
        off = {"eau": 0, "eau_b": 2, "eau_c": 4}[kind]
        for y in (2 + off, 7 + off % 3, 12):
            yy = y % 16
            for x in range(16):
                if (x + yy + off) % 4 == 0:
                    px(x, yy, P["eau_lite"])
        for x in range(16):
            px(x, 15, P["eau_deep"])
        return
    if kind == "jura":
        r(0, 0, 16, 16, P["jura_near"])
        r(0, 0, 16, 7, P["jura_far"])
        return
    if kind == "jura_snow":
        r(0, 0, 16, 16, P["jura_far"])
        for x in range(4, 12):
            px(x, 3, P["snow"])
            px(x, 4, P["snow"])
        return
    if kind == "ciel":
        r(0, 0, 16, 16, P["ciel"])
        px(4, 5, P["white"], 160)
        px(11, 8, P["white"], 100)
        return
    if kind in ("wall", "wall_b"):
        r(0, 0, 16, 16, P["molasse"] if kind == "wall" else P["molasse_deep"])
        r(0, 0, 16, 1, P["molasse_deep"])
        r(0, 15, 16, 1, P["shadow"], 80)
        if kind == "wall_b":
            px(3, 8, P["molasse"])
            px(12, 5, P["molasse"])
        return
    if kind == "wall_shadow":
        r(0, 0, 16, 16, P["shadow"], 70)
        return
    if kind == "floor_int":
        r(0, 0, 16, 16, P["crepi"])
        for y in range(0, 16, 4):
            r(0, y, 16, 1, P["parquet"], 100)
        return
    if kind == "floor_hemi":
        r(0, 0, 16, 16, P["parquet"])
        for a in range(3):
            for x in range(2, 14):
                px(x, 12 - a * 2, P["vert_gc"], 180)
        return
    if kind == "desk":
        r(0, 0, 16, 16, P["crepi"])
        r(2, 8, 12, 5, P["bois"])
        r(3, 6, 4, 3, P["paper"])
        return
    if kind == "chair":
        r(0, 0, 16, 16, P["crepi"])
        r(5, 9, 6, 5, P["bois_lite"])
        r(6, 6, 4, 4, P["vert_gc"])
        return
    if kind == "window":
        r(0, 0, 16, 16, P["molasse"])
        r(3, 3, 10, 10, P["vitre"])
        r(7, 3, 1, 10, P["molasse_deep"])
        r(3, 7, 10, 1, P["molasse_deep"])
        return
    if kind == "door":
        r(0, 0, 16, 16, P["molasse"])
        r(4, 3, 8, 13, P["bois"])
        px(10, 10, P["or_ce"])
        return
    if kind == "roof":
        r(0, 0, 16, 16, P["toit"])
        for y in range(0, 16, 3):
            r(0, y, 16, 1, P["toit_deep"])
        return
    if kind == "roof_gc":
        r(0, 0, 16, 16, P["toit"])
        r(0, 0, 16, 5, P["vert_gc"])
        for y in range(6, 16, 3):
            r(0, y, 16, 1, P["toit_deep"])
        return
    if kind == "roof_ce":
        r(0, 0, 16, 16, P["toit"])
        r(0, 0, 16, 5, P["or_deep"])
        for y in range(6, 16, 3):
            r(0, y, 16, 1, P["toit_deep"])
        return
    if kind == "roof_ridge":
        r(0, 0, 16, 16, P["toit_deep"])
        r(0, 6, 16, 4, P["or_ce"])
        return
    if kind == "header_gc":
        r(0, 0, 16, 16, P["vert_gc"])
        r(0, 13, 16, 3, P["molasse"])
        return
    if kind == "header_ce":
        r(0, 0, 16, 16, P["or_deep"])
        r(0, 13, 16, 3, P["molasse"])
        return
    if kind in ("vigne", "vigne_b"):
        r(0, 0, 16, 16, P["herbe"])
        for x in range(1, 16, 4):
            r(x, 1 if kind == "vigne" else 2, 2, 13, P["vigne"])
            r(x, 14, 2, 1, P["herbe_deep"])
        return
    if kind in ("tree", "tree_b"):
        r(0, 0, 16, 16, P["herbe"])
        r(7, 10, 2, 5, P["bois"])
        r(3, 2, 10, 10, P["feuille_deep"] if kind == "tree" else P["feuille"])
        r(5, 4, 6, 6, P["feuille"] if kind == "tree" else P["feuille_deep"])
        return
    if kind == "statue":
        r(0, 0, 16, 16, P["pave"])
        r(6, 5, 4, 9, P["or_ce"])
        r(5, 3, 6, 4, P["or_deep"])
        px(7, 2, P["or_ce"])
        return
    if kind == "boat":
        r(0, 0, 16, 16, P["eau"])
        r(1, 9, 14, 4, P["bois"])
        r(6, 3, 1, 7, P["white"])
        r(7, 3, 6, 5, P["white"])
        return
    if kind == "deck":
        r(0, 0, 16, 16, P["sable"])
        r(0, 5, 16, 7, P["bois"])
        for x in range(0, 16, 3):
            px(x, 8, P["bois_lite"])
        return
    if kind == "spire":
        r(0, 0, 16, 16, P["herbe"])
        r(6, 8, 4, 8, P["molasse_deep"])
        for ly, lw in [(0, 2), (2, 4), (4, 6), (6, 8)]:
            r(8 - lw // 2, ly, lw, 2, P["encre"])
        r(7, 10, 2, 2, P["vitre"])
        return
    if kind == "flag_gc":
        r(0, 0, 16, 16, P["ciel"])
        r(4, 2, 1, 12, P["bois"])
        r(5, 2, 8, 5, P["vert_gc"])
        return
    if kind == "flag_ce":
        r(0, 0, 16, 16, P["ciel"])
        r(4, 2, 1, 12, P["bois"])
        r(5, 2, 8, 5, P["or_ce"])
        return
    if kind == "bush":
        r(0, 0, 16, 16, P["herbe"])
        r(3, 8, 10, 6, P["feuille_deep"])
        r(4, 7, 8, 5, P["feuille"])
        return


def build_tileset():
    buf = new_buf(SHEET_W, SHEET_H)
    names = []
    for idx, name in enumerate(TILE_ORDER):
        if idx >= COLS * ROWS:
            break
        col, row = idx % COLS, idx // COLS
        paint_kind(buf, SHEET_W, col, row, name)
        names.append(name)
    # pad
    while len(names) < COLS * ROWS:
        names.append(f"pad_{len(names)}")
    out = ROOT / "assets" / "tilesets" / "terrain_16.png"
    write_png(out, SHEET_W, SHEET_H, buf)
    meta = {
        "tile": TILE,
        "columns": COLS,
        "rows": ROWS,
        "tiles": names,
        "imagewidth": SHEET_W,
        "imageheight": SHEET_H,
    }
    (ROOT / "assets" / "tilesets" / "terrain_16.json").write_text(
        json.dumps(meta, indent=2), encoding="utf-8"
    )
    return names


def gid(name, names):
    if not name or name == "empty":
        return 0
    return names.index(name) + 1  # firstgid=1


def build_world(names):
    def L(fn):
        return [fn(tx, ty) for ty in range(MAP_H) for tx in range(MAP_W)]

    def ground(tx, ty):
        if ty == 0:
            return gid("ciel", names)
        if ty == 1:
            return gid("jura_snow", names) if tx % 5 == 2 else gid("jura", names)
        if ty == 2:
            return gid("jura", names)
        if ty >= 21:
            return gid("eau_b" if (tx + ty) % 3 == 0 else "eau", names) if (tx + ty) % 2 else gid("eau_c", names)
        if ty == 20:
            return gid("sable", names)
        if ty == 19:
            return gid("sand_edge", names)
        if tx >= 23 and 5 <= ty <= 15:
            return gid("vigne_b" if ty % 2 else "vigne", names)
        if 10 <= tx <= 19 and 8 <= ty <= 12:
            return gid("cobble" if (tx + ty) % 3 == 0 else "pave", names)
        if tx in (14, 15) and 4 <= ty <= 18:
            return gid("path", names)
        if 3 <= tx <= 26 and ty == 17:
            return gid("path", names)
        if (tx <= 2 or tx >= 27) and 3 <= ty <= 16:
            if (tx + ty) % 4 == 0:
                return gid("tree" if ty % 2 else "tree_b", names)
            if (tx + ty) % 5 == 0:
                return gid("bush", names)
        h = (tx * 7 + ty * 3) % 4
        return gid(["herbe", "herbe_b", "herbe_c", "herbe_flower"][h], names)

    def interiors(tx, ty):
        # building interiors (visible when zoomed)
        # GC
        if 6 <= tx <= 12 and 8 <= ty <= 11:
            if ty == 8:
                return gid("header_gc", names)
            if 7 <= tx <= 10 and ty >= 9:
                return gid("floor_hemi", names)
            if tx == 11 and ty == 10:
                return gid("desk", names)
            return gid("floor_int", names) if (tx + ty) % 2 else gid("chair", names)
        # CE
        if 16 <= tx <= 22 and 8 <= ty <= 11:
            if ty == 8:
                return gid("header_ce", names)
            if tx in (18, 19) and ty == 10:
                return gid("desk", names)
            return gid("floor_int", names)
        # rumine
        if 9 <= tx <= 20 and 4 <= ty <= 5:
            return gid("floor_int", names) if ty == 5 else gid("window", names)
        # chancellerie
        if 12 <= tx <= 16 and ty == 13:
            return gid("desk", names) if tx in (13, 14) else gid("floor_int", names)
        # depts
        if 3 <= tx <= 26 and ty == 18:
            return gid("desk", names) if tx % 4 == 1 else gid("floor_int", names)
        # cathedral interior hint
        if 2 <= tx <= 4 and 9 <= ty <= 12:
            return gid("floor_int", names)
        return 0

    def roofs(tx, ty):
        # roofs / exterior massing when zoomed out
        if 9 <= tx <= 20 and ty == 3:
            return gid("roof_ridge" if 13 <= tx <= 15 else "roof", names)
        if 9 <= tx <= 20 and ty == 4:
            return gid("wall", names)
        if 9 <= tx <= 20 and ty == 5:
            return gid("window" if tx % 2 else "wall", names)
        # GC roof block
        if 6 <= tx <= 12 and ty == 7:
            return gid("roof_gc", names)
        if 6 <= tx <= 12 and 8 <= ty <= 10:
            return gid("wall" if ty > 8 else "header_gc", names)
        if 6 <= tx <= 12 and ty == 11:
            return gid("door" if tx in (8, 9) else "wall", names)
        # CE
        if 16 <= tx <= 22 and ty == 7:
            return gid("roof_ce", names)
        if 16 <= tx <= 22 and 8 <= ty <= 10:
            return gid("wall" if ty > 8 else "header_ce", names)
        if 16 <= tx <= 22 and ty == 11:
            return gid("door" if tx in (18, 19) else "wall_b", names)
        # chancellerie
        if 12 <= tx <= 16 and ty == 12:
            return gid("roof", names)
        if 12 <= tx <= 16 and ty == 13:
            return gid("wall", names)
        # depts roofs
        if 3 <= tx <= 26 and ty == 18:
            if tx % 4 == 0:
                return gid("door", names)
            return gid("roof" if (tx // 4) % 2 == 0 else "wall", names)
        # cathedral spire
        if tx == 3 and 8 <= ty <= 12:
            return gid("spire", names)
        if 2 <= tx <= 4 and 11 <= ty <= 12:
            return gid("wall", names)
        # flags / statue / pier (always-ish on roof layer as props)
        if tx == 5 and ty == 6:
            return gid("flag_gc", names)
        if tx == 23 and ty == 6:
            return gid("flag_ce", names)
        if tx == 14 and ty == 10:
            return gid("statue", names)
        if 13 <= tx <= 16 and ty == 19:
            return gid("deck", names)
        if tx == 18 and ty == 21:
            return gid("boat", names)
        return 0

    # walls base layer under roofs for solid mass when both fade — buildings_base
    def base(tx, ty):
        # solid footprints without interior detail
        zones = [
            (9, 3, 20, 5),
            (6, 7, 12, 11),
            (16, 7, 22, 11),
            (12, 12, 16, 13),
            (3, 18, 26, 18),
            (2, 9, 4, 12),
        ]
        for x0, y0, x1, y1 in zones:
            if x0 <= tx <= x1 and y0 <= ty <= y1:
                if ty == y0:
                    return gid("wall_shadow", names)
                return gid("wall", names)
        return 0

    tiled = {
        "compressionlevel": -1,
        "height": MAP_H,
        "width": MAP_W,
        "tilewidth": TILE,
        "tileheight": TILE,
        "infinite": False,
        "orientation": "orthogonal",
        "renderorder": "right-down",
        "type": "map",
        "version": "1.10",
        "tiledversion": "1.10.2",
        "nextlayerid": 6,
        "nextobjectid": 30,
        "tilesets": [
            {
                "firstgid": 1,
                "columns": COLS,
                "image": "../tilesets/terrain_16.png",
                "imageheight": SHEET_H,
                "imagewidth": SHEET_W,
                "margin": 0,
                "spacing": 0,
                "name": "terrain_16",
                "tilecount": COLS * ROWS,
                "tilewidth": TILE,
                "tileheight": TILE,
            }
        ],
        "layers": [
            {
                "id": 1,
                "name": "ground",
                "type": "tilelayer",
                "width": MAP_W,
                "height": MAP_H,
                "visible": True,
                "opacity": 1,
                "data": L(ground),
            },
            {
                "id": 2,
                "name": "buildings_base",
                "type": "tilelayer",
                "width": MAP_W,
                "height": MAP_H,
                "visible": True,
                "opacity": 1,
                "data": L(base),
            },
            {
                "id": 3,
                "name": "interiors",
                "type": "tilelayer",
                "width": MAP_W,
                "height": MAP_H,
                "visible": True,
                "opacity": 1,
                "data": L(interiors),
            },
            {
                "id": 4,
                "name": "roofs",
                "type": "tilelayer",
                "width": MAP_W,
                "height": MAP_H,
                "visible": True,
                "opacity": 1,
                "data": L(roofs),
            },
        ],
    }
    path = ROOT / "assets" / "map" / "world.json"
    path.write_text(json.dumps(tiled), encoding="utf-8")
    return path


def build_hotspots():
    items = [
        ("palais", "Palais de Rumine", "institution", "Frontière nord · musée / place", 9, 3, 12, 3),
        ("gc", "Grand Conseil", "parlement", "Hémicycle · Bureau · Commissions", 6, 7, 7, 5),
        ("ce", "Conseil d'État", "chateau", "Château Saint-Maire · Collège · Chancellerie", 16, 7, 7, 5),
        ("chancellerie", "Chancellerie", "service", "Publication · FAO · coordination", 12, 12, 5, 2),
        ("dep-dsas", "DSAS", "department", "Département · instruction", 3, 18, 3, 1),
        ("dep-dfa", "DFA", "department", "Département · instruction", 7, 18, 3, 1),
        ("dep-dits", "DITS", "department", "Département · instruction", 11, 18, 3, 1),
        ("dep-djes", "DJES", "department", "Département · instruction", 15, 18, 3, 1),
        ("dep-def", "DEF", "department", "Département · instruction", 19, 18, 3, 1),
        ("dep-deiep", "DEIEP", "department", "Département · instruction", 23, 18, 3, 1),
        ("cathedrale", "Cathédrale", "culture", "Repère urbain", 2, 8, 3, 5),
        ("leman", "Lac Léman", "nature", "Frontière sud · CGN", 0, 20, 30, 3),
    ]
    out = []
    for id_, label, kind, sub, tx, ty, tw, th in items:
        x, y, w, h = tx * TILE, ty * TILE, tw * TILE, th * TILE
        out.append(
            {
                "id": id_,
                "label": label,
                "kind": kind,
                "sub": sub,
                "x": x,
                "y": y,
                "w": w,
                "h": h,
                "cx": x + w / 2,
                "cy": y + h / 2,
            }
        )
    path = ROOT / "assets" / "hotspots.json"
    path.write_text(json.dumps({"tile": TILE, "hotspots": out}, indent=2), encoding="utf-8")
    return path


def build_dossier_sheet():
    """4 dirs × 4 frames + 1 idle = 17 frames in a strip, 16×16 each → 272×16."""
    dirs = ["s", "e", "n", "o"]
    frames = 4
    fw, fh = 16, 16
    cols = frames * len(dirs) + 1  # + idle
    w, h = cols * fw, fh
    buf = new_buf(w, h)
    meta_frames = {}

    def draw_dossier(cx, cy, bob, flap):
        # paper body
        rect(buf, w, cx - 5, cy - 7 + bob, 10, 13, P["paper"])
        rect(buf, w, cx - 5, cy - 7 + bob, 10, 1, P["or_ce"])
        rect(buf, w, cx - 4, cy - 4 + bob, 8, 2, P["or_deep"], 200)
        # ribbon
        rect(buf, w, cx - 1, cy - 8 + bob + flap, 2, 4, P["vert_gc"])
        # outline
        for lx in range(-5, 5):
            set_px(buf, w, cx + lx, cy - 7 + bob, P["molasse_deep"], 180)
            set_px(buf, w, cx + lx, cy + 5 + bob, P["molasse_deep"], 180)

    idx = 0
    for d in dirs:
        for f in range(frames):
            bob = (0, 1, 0, -1)[f]
            flap = (0, 1, 0, 1)[f]
            ox = idx * fw + 8
            draw_dossier(ox, 8, bob, flap)
            # direction hint pixel
            if d == "e":
                set_px(buf, w, ox + 6, 8, P["encre"])
            elif d == "o":
                set_px(buf, w, ox - 6, 8, P["encre"])
            elif d == "n":
                set_px(buf, w, ox, 2, P["encre"])
            else:
                set_px(buf, w, ox, 14, P["encre"])
            meta_frames[f"dossier_{d}_{f}"] = {
                "frame": {"x": idx * fw, "y": 0, "w": fw, "h": fh},
            }
            idx += 1
    # idle
    draw_dossier(idx * fw + 8, 8, 0, 0)
    meta_frames["dossier_idle"] = {
        "frame": {"x": idx * fw, "y": 0, "w": fw, "h": fh},
    }
    path = ROOT / "assets" / "characters" / "dossier_16.png"
    write_png(path, w, h, buf)
    atlas = {
        "meta": {"image": "dossier_16.png", "size": {"w": w, "h": h}, "scale": "1"},
        "frames": {
            k: {
                **v,
                "rotated": False,
                "trimmed": False,
                "spriteSourceSize": {"x": 0, "y": 0, "w": fw, "h": fh},
                "sourceSize": {"w": fw, "h": fh},
            }
            for k, v in meta_frames.items()
        },
        "animations": {
            "walk_s": [f"dossier_s_{i}" for i in range(4)],
            "walk_e": [f"dossier_e_{i}" for i in range(4)],
            "walk_n": [f"dossier_n_{i}" for i in range(4)],
            "walk_o": [f"dossier_o_{i}" for i in range(4)],
            "idle": ["dossier_idle"],
        },
    }
    (ROOT / "assets" / "characters" / "dossier_16.json").write_text(
        json.dumps(atlas, indent=2), encoding="utf-8"
    )
    # also copy into atlases/
    (ROOT / "assets" / "atlases" / "dossier.json").write_text(
        json.dumps(atlas, indent=2), encoding="utf-8"
    )
    return path


def build_ui_panel():
    """Simple 48×48 9-slice-ish panel."""
    s = 48
    buf = new_buf(s, s)
    rect(buf, s, 0, 0, s, s, P["paper"])
    rect(buf, s, 0, 0, s, 1, P["encre"], 100)
    rect(buf, s, 0, 0, 1, s, P["encre"], 100)
    rect(buf, s, s - 1, 0, 1, s, P["encre"], 100)
    rect(buf, s, 0, s - 1, s, 1, P["encre"], 100)
    rect(buf, s, 2, 2, s - 4, s - 4, P["crepi"])
    path = ROOT / "assets" / "ui" / "panel_9slice.png"
    write_png(path, s, s, buf)
    return path


def main():
    import subprocess
    import sys

    # Structure + Kenney composition (preferred) + dossier
    aligned = ROOT / "tools" / "build_from_world.py"
    if aligned.exists():
        print(">> build_from_world.py")
        subprocess.check_call([sys.executable, str(aligned)])
    compose = ROOT / "tools" / "compose_roguelike_world.py"
    if compose.exists():
        print(">> compose_roguelike_world.py (Roguelike RPG Pack only)")
        subprocess.check_call([sys.executable, str(compose)])
    elif (ROOT / "tools" / "compose_kenney_world.py").exists():
        print(">> compose_kenney_world.py (fallback mix)")
        subprocess.check_call([sys.executable, str(ROOT / "tools" / "compose_kenney_world.py")])
    build_dossier_sheet()
    build_ui_panel()
    print("OK full assets")


if __name__ == "__main__":
    main()
