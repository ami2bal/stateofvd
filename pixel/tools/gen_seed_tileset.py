#!/usr/bin/env python3
"""Génère le seed tileset 16×16 + carte Tiled minimale (M0)."""
from __future__ import annotations

import json
import struct
import zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TILE = 16
COLS = 8
ROWS = 8
SHEET_W = COLS * TILE
SHEET_H = ROWS * TILE

# ART_BIBLE palette (RGB)
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
    "feuille": (0x3D, 0x7A, 0x3A),
    "feuille_deep": (0x2A, 0x5A, 0x28),
    "vigne": (0x5A, 0x8A, 0x3A),
    "shadow": (0x2A, 0x30, 0x28),
    "white": (0xFF, 0xFF, 0xFF),
    "empty": (0, 0, 0),
}

# tile id → painter name (1-based in Tiled with empty=0)
TILE_DEFS = [
    ("empty", None),  # 0 unused in sheet index 0 we still draw transparent
    ("herbe", "herbe"),
    ("herbe_var", "herbe_var"),
    ("path", "path"),
    ("pave", "pave"),
    ("sable", "sable"),
    ("eau", "eau"),
    ("eau_var", "eau_var"),
    ("jura", "jura"),
    ("ciel", "ciel"),
    ("wall", "wall"),
    ("roof", "roof"),
    ("roof_gc", "roof_gc"),
    ("roof_ce", "roof_ce"),
    ("window", "window"),
    ("door", "door"),
    ("vigne", "vigne"),
    ("tree", "tree"),
    ("header_gc", "header_gc"),
    ("header_ce", "header_ce"),
    ("statue", "statue"),
    ("boat", "boat"),
    ("deck", "deck"),
    ("shadow", "shadow_tile"),
]


def new_rgba(w, h, fill=(0, 0, 0, 0)):
    return [fill[0], fill[1], fill[2], fill[3]] * (w * h)


def set_px(buf, w, x, y, rgba, h=None):
    if x < 0 or y < 0 or x >= w:
        return
    if h is not None and y >= h:
        return
    i = (y * w + x) * 4
    if i < 0 or i + 3 >= len(buf):
        return
    buf[i : i + 4] = rgba


def fill_rect(buf, w, x0, y0, rw, rh, rgb, a=255):
    r, g, b = rgb
    for y in range(y0, y0 + rh):
        for x in range(x0, x0 + rw):
            set_px(buf, w, x, y, [r, g, b, a])


def paint_tile(buf, sheet_w, col, row, kind):
    x0, y0 = col * TILE, row * TILE
    # local helper
    def px(lx, ly, rgb, a=255):
        r, g, b = rgb
        set_px(buf, sheet_w, x0 + lx, y0 + ly, [r, g, b, a], ROWS * TILE)

    def rect(lx, ly, rw, rh, rgb, a=255):
        fill_rect(buf, sheet_w, x0 + lx, y0 + ly, rw, rh, rgb, a)

    if kind is None or kind == "empty":
        return
    if kind == "herbe":
        rect(0, 0, 16, 16, P["herbe"])
        for i, (x, y) in enumerate([(2, 3), (7, 8), (12, 2), (4, 12), (11, 11)]):
            px(x, y, P["herbe_deep"] if i % 2 == 0 else P["herbe_lite"])
    elif kind == "herbe_var":
        rect(0, 0, 16, 16, P["herbe"])
        rect(0, 0, 16, 1, P["herbe_deep"])
        for x, y in [(1, 5), (5, 9), (9, 4), (13, 13), (3, 14), (10, 7)]:
            px(x, y, P["herbe_lite"])
    elif kind == "path":
        rect(0, 0, 16, 16, P["path"])
        for x in range(0, 16, 3):
            px(x, 4, P["pave_deep"])
            px(x + 1, 11, P["pave_deep"])
    elif kind == "pave":
        rect(0, 0, 16, 16, P["pave"])
        for y in range(0, 16, 4):
            for x in range(0, 16, 4):
                rect(x, y, 3, 3, P["pave"])
                px(x + 3, y + 3, P["pave_deep"])
    elif kind == "sable":
        rect(0, 0, 16, 16, P["sable"])
        for x, y in [(2, 2), (8, 6), (12, 12), (5, 13)]:
            px(x, y, P["path"])
    elif kind == "eau":
        rect(0, 0, 16, 16, P["eau"])
        for y in (3, 8, 13):
            for x in range(16):
                if (x + y) % 5 != 0:
                    px(x, y, P["eau_lite"])
        for x in range(16):
            px(x, 15, P["eau_deep"])
    elif kind == "eau_var":
        rect(0, 0, 16, 16, P["eau"])
        for y in (2, 7, 12):
            for x in range(16):
                if (x + y * 2) % 4 == 0:
                    px(x, y, P["eau_lite"])
    elif kind == "jura":
        rect(0, 0, 16, 16, P["jura_near"])
        rect(0, 0, 16, 6, P["jura_far"])
        for x in range(4, 12):
            px(x, 2, P["snow"])
    elif kind == "ciel":
        rect(0, 0, 16, 16, P["ciel"])
        px(3, 4, P["white"], 180)
        px(10, 7, P["white"], 120)
    elif kind == "wall":
        rect(0, 0, 16, 16, P["molasse"])
        rect(0, 0, 16, 1, P["molasse_deep"])
        rect(0, 15, 16, 1, P["molasse_deep"])
    elif kind == "roof":
        rect(0, 0, 16, 16, P["toit"])
        for y in range(0, 16, 3):
            rect(0, y, 16, 1, P["toit_deep"])
    elif kind == "roof_gc":
        rect(0, 0, 16, 16, P["toit"])
        rect(0, 0, 16, 4, P["vert_gc"])
    elif kind == "roof_ce":
        rect(0, 0, 16, 16, P["toit"])
        rect(0, 0, 16, 4, P["or_deep"])
    elif kind == "window":
        rect(0, 0, 16, 16, P["molasse"])
        rect(3, 3, 10, 10, P["vitre"])
        rect(7, 3, 1, 10, P["molasse_deep"])
        rect(3, 7, 10, 1, P["molasse_deep"])
    elif kind == "door":
        rect(0, 0, 16, 16, P["molasse"])
        rect(4, 4, 8, 12, P["bois"])
        px(10, 10, P["or_ce"])
    elif kind == "vigne":
        rect(0, 0, 16, 16, P["herbe"])
        for x in range(1, 16, 4):
            rect(x, 2, 2, 12, P["vigne"])
            rect(x, 13, 2, 1, P["herbe_deep"])
    elif kind == "tree":
        rect(0, 0, 16, 16, P["herbe"])
        rect(7, 10, 2, 5, P["bois"])
        rect(3, 3, 10, 9, P["feuille_deep"])
        rect(4, 4, 7, 6, P["feuille"])
    elif kind == "header_gc":
        rect(0, 0, 16, 16, P["vert_gc"])
        rect(0, 14, 16, 2, P["molasse"])
    elif kind == "header_ce":
        rect(0, 0, 16, 16, P["or_deep"])
        rect(0, 14, 16, 2, P["molasse"])
    elif kind == "statue":
        rect(0, 0, 16, 16, P["pave"])
        rect(6, 6, 4, 8, P["or_ce"])
        rect(5, 4, 6, 4, P["or_deep"])
    elif kind == "boat":
        rect(0, 0, 16, 16, P["eau"])
        rect(2, 8, 12, 4, P["bois"])
        rect(6, 3, 1, 6, P["white"])
        rect(7, 3, 5, 4, P["white"])
    elif kind == "deck":
        rect(0, 0, 16, 16, P["sable"])
        rect(0, 6, 16, 6, P["bois"])
        for x in range(0, 16, 3):
            px(x, 8, P["bois"])
    elif kind == "shadow_tile":
        rect(0, 0, 16, 16, P["shadow"], 60)


def write_png(path: Path, w: int, h: int, rgba: list[int]):
    def chunk(tag: bytes, data: bytes) -> bytes:
        return (
            struct.pack(">I", len(data))
            + tag
            + data
            + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)
        )

    raw = bytearray()
    for y in range(h):
        raw.append(0)  # filter None
        i = y * w * 4
        raw.extend(rgba[i : i + w * 4])
    compressed = zlib.compress(bytes(raw), 9)
    png = bytearray(b"\x89PNG\r\n\x1a\n")
    png += chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 6, 0, 0, 0))
    png += chunk(b"IDAT", compressed)
    png += chunk(b"IEND", b"")
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(png)


def build_sheet():
    buf = new_rgba(SHEET_W, SHEET_H)
    # clear transparent
    for i in range(0, len(buf), 4):
        buf[i : i + 4] = [0, 0, 0, 0]
    names = []
    for idx, (name, kind) in enumerate(TILE_DEFS):
        if idx >= COLS * ROWS:
            break
        col, row = idx % COLS, idx // COLS
        paint_tile(buf, SHEET_W, col, row, kind)
        names.append(name)
    out = ROOT / "assets" / "tilesets" / "terrain_16.png"
    write_png(out, SHEET_W, SHEET_H, buf)
    meta = {
        "tile": TILE,
        "columns": COLS,
        "rows": ROWS,
        "tiles": names,
        "palette": {k: "#%02X%02X%02X" % v for k, v in P.items() if k != "empty"},
    }
    (ROOT / "assets" / "tilesets" / "terrain_16.json").write_text(
        json.dumps(meta, indent=2), encoding="utf-8"
    )
    return out, names


def gid(name: str, names: list[str]) -> int:
    """Tiled gid = index in sheet + 1 (firstgid 1). empty name → 0"""
    if name == "empty" or name is None:
        return 0
    try:
        return names.index(name) + 1  # firstgid=1 → sheet index 0 is empty tile
    except ValueError:
        return 0


def build_world(names: list[str]):
    W, H = 30, 23
    # layer data helpers (Tiled: 0 empty, else gid)
    def layer_fill(fn):
        data = []
        for ty in range(H):
            for tx in range(W):
                data.append(fn(tx, ty))
        return data

    def ground(tx, ty):
        # sky/jura
        if ty <= 2:
            return gid("ciel", names) if ty == 0 else gid("jura", names)
        # lake
        if ty >= 20:
            return gid("eau", names) if (tx + ty) % 2 == 0 else gid("eau_var", names)
        if ty == 19:
            return gid("sable", names)
        # vineyards east
        if tx >= 23 and 5 <= ty <= 14:
            return gid("vigne", names)
        # esplanade center
        if 10 <= tx <= 19 and 8 <= ty <= 12:
            return gid("pave", names)
        # spine path
        if tx in (14, 15) and 4 <= ty <= 18:
            return gid("path", names)
        # horizontal south path
        if 4 <= tx <= 25 and ty == 17:
            return gid("path", names)
        # trees sides
        if (tx <= 2 or tx >= 27) and 3 <= ty <= 16 and (tx + ty) % 3 == 0:
            return gid("tree", names)
        return gid("herbe", names) if (tx * 3 + ty) % 5 else gid("herbe_var", names)

    def buildings(tx, ty):
        # Rumine / palais north
        if 9 <= tx <= 20 and 3 <= ty <= 5:
            if ty == 3:
                return gid("roof", names)
            if ty == 4:
                return gid("wall", names)
            return gid("window", names)
        # GC
        if 6 <= tx <= 12 and 7 <= ty <= 11:
            if ty == 7:
                return gid("roof_gc", names)
            if ty == 8:
                return gid("header_gc", names)
            if ty == 11 and tx in (8, 9, 10):
                return gid("door", names)
            return gid("window", names) if (tx + ty) % 2 == 0 else gid("wall", names)
        # CE
        if 16 <= tx <= 22 and 7 <= ty <= 11:
            if ty == 7:
                return gid("roof_ce", names)
            if ty == 8:
                return gid("header_ce", names)
            if ty == 11 and tx in (18, 19):
                return gid("door", names)
            return gid("window", names) if (tx + ty) % 2 else gid("wall", names)
        # chancellerie
        if 12 <= tx <= 16 and 12 <= ty <= 13:
            return gid("wall", names) if ty == 13 else gid("roof", names)
        # depts row
        if 3 <= tx <= 26 and 17 <= ty <= 18:
            # leave path at 17
            if ty == 17:
                return 0
            return gid("wall", names) if tx % 4 != 0 else gid("door", names)
        # statue
        if tx == 14 and ty == 10:
            return gid("statue", names)
        # pier / boat
        if 13 <= tx <= 16 and ty == 19:
            return gid("deck", names)
        if tx == 18 and ty == 20:
            return gid("boat", names)
        return 0

    ground_data = layer_fill(ground)
    build_data = layer_fill(buildings)

    tiled = {
        "compressionlevel": -1,
        "height": H,
        "width": W,
        "tilewidth": TILE,
        "tileheight": TILE,
        "infinite": false_py(),
        "orientation": "orthogonal",
        "renderorder": "right-down",
        "tiledversion": "1.10.2",
        "type": "map",
        "version": "1.10",
        "nextlayerid": 4,
        "nextobjectid": 20,
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
                "width": W,
                "height": H,
                "visible": True,
                "opacity": 1,
                "x": 0,
                "y": 0,
                "data": ground_data,
            },
            {
                "id": 2,
                "name": "buildings",
                "type": "tilelayer",
                "width": W,
                "height": H,
                "visible": True,
                "opacity": 1,
                "x": 0,
                "y": 0,
                "data": build_data,
            },
            {
                "id": 3,
                "name": "hotspots",
                "type": "objectgroup",
                "visible": True,
                "opacity": 1,
                "x": 0,
                "y": 0,
                "objects": [
                    obj("palais", 9, 3, 12, 3, "institution"),
                    obj("gc", 6, 7, 7, 5, "parlement"),
                    obj("ce", 16, 7, 7, 5, "chateau"),
                    obj("chancellerie", 12, 12, 5, 2, "service"),
                    obj("dep-dsas", 3, 18, 3, 1, "department"),
                    obj("dep-dfa", 7, 18, 3, 1, "department"),
                    obj("dep-dits", 11, 18, 3, 1, "department"),
                    obj("dep-djes", 15, 18, 3, 1, "department"),
                    obj("dep-def", 19, 18, 3, 1, "department"),
                    obj("cathedrale", 2, 8, 3, 5, "culture"),
                ],
            },
        ],
    }
    path = ROOT / "assets" / "map" / "world.json"
    path.write_text(json.dumps(tiled, indent=2), encoding="utf-8")
    return path


def false_py():
    return False


def obj(name, tx, ty, tw, th, kind):
    return {
        "id": hash(name) % 10000,
        "name": name,
        "type": kind,
        "x": tx * TILE,
        "y": ty * TILE,
        "width": tw * TILE,
        "height": th * TILE,
        "visible": True,
        "properties": [
            {"name": "kind", "type": "string", "value": kind},
            {"name": "label", "type": "string", "value": name},
        ],
    }


def build_hotspots():
    """Runtime hotspots (pixel world coords)."""
    items = [
        ("palais", "Palais de Rumine", "institution", "Frontière nord", 9, 3, 12, 3),
        ("gc", "Grand Conseil", "parlement", "Hémicycle · Bureau · Commissions", 6, 7, 7, 5),
        ("ce", "Conseil d'État", "chateau", "Château Saint-Maire · Collège", 16, 7, 7, 5),
        ("chancellerie", "Chancellerie", "service", "Publication · FAO", 12, 12, 5, 2),
        ("dep-dsas", "DSAS", "department", "Département", 3, 18, 3, 1),
        ("dep-dfa", "DFA", "department", "Département", 7, 18, 3, 1),
        ("dep-dits", "DITS", "department", "Département", 11, 18, 3, 1),
        ("dep-djes", "DJES", "department", "Département", 15, 18, 3, 1),
        ("dep-def", "DEF", "department", "Département", 19, 18, 3, 1),
        ("cathedrale", "Cathédrale", "culture", "Repère urbain", 2, 8, 3, 5),
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


def main():
    sheet, names = build_sheet()
    world = build_world(names)
    hs = build_hotspots()
    print("OK", sheet.relative_to(ROOT))
    print("OK", world.relative_to(ROOT))
    print("OK", hs.relative_to(ROOT))
    print("tiles", len(names))


if __name__ == "__main__":
    main()
