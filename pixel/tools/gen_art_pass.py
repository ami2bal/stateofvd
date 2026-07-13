#!/usr/bin/env python3
"""
Passe art agent — L1 terrain + L2 buildings dual LOD + L3 dossier.
Qualité procédurale dense, palette ART_BIBLE, empreintes world.json.
"""
from __future__ import annotations

import json
import math
import random
import struct
import zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PARENT_WORLD = ROOT.parent / "state-of-vd" / "data" / "world.json"
TILE = 16
TS_COLS, TS_ROWS = 16, 10
SHEET_W, SHEET_H = TS_COLS * TILE, TS_ROWS * TILE

# ART_BIBLE
C = {
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
    "molasse_lite": (0xE8, 0xE0, 0xD0),
    "crepi": (0xED, 0xE8, 0xDC),
    "toit": (0xB4, 0x67, 0x4F),
    "toit_deep": (0x8E, 0x48, 0x38),
    "toit_lite": (0xC8, 0x7A, 0x60),
    "vert_gc": (0x3E, 0x7A, 0x52),
    "vert_lite": (0x5A, 0x9A, 0x6E),
    "or_ce": (0xC9, 0xA4, 0x5C),
    "or_deep": (0xA0, 0x80, 0x40),
    "or_lite": (0xE0, 0xC0, 0x78),
    "encre": (0x2F, 0x42, 0x66),
    "vitre": (0x9F, 0xC2, 0xDC),
    "vitre_lite": (0xC8, 0xE0, 0xF0),
    "bois": (0x8B, 0x69, 0x14),
    "bois_lite": (0xB8, 0x89, 0x3A),
    "feuille": (0x3D, 0x7A, 0x3A),
    "feuille_deep": (0x2A, 0x5A, 0x28),
    "vigne": (0x5A, 0x8A, 0x3A),
    "shadow": (0x2A, 0x30, 0x28),
    "white": (0xFF, 0xFF, 0xFF),
    "paper": (0xF4, 0xEF, 0xE4),
    "parquet": (0xD4, 0xC4, 0xA0),
    "parquet_deep": (0xB8, 0xA4, 0x80),
    "brique": (0xA4, 0x55, 0x3E),
}


def new_buf(w, h, fill=None):
    if fill is None:
        return bytearray([0, 0, 0, 0] * (w * h))
    r, g, b = fill[:3]
    a = fill[3] if len(fill) > 3 else 255
    out = bytearray()
    px = bytes((r, g, b, a))
    for _ in range(w * h):
        out.extend(px)
    return out


def set_px(buf, w, x, y, rgb, a=255, h=None):
    if x < 0 or y < 0 or x >= w:
        return
    if h is not None and y >= h:
        return
    i = (y * w + x) * 4
    if i + 3 >= len(buf):
        return
    r, g, b = rgb
    # alpha blend if dest has alpha
    if a < 255 and buf[i + 3] > 0:
        da = buf[i + 3] / 255
        sa = a / 255
        out_a = sa + da * (1 - sa)
        if out_a <= 0:
            return
        buf[i] = int((r * sa + buf[i] * da * (1 - sa)) / out_a)
        buf[i + 1] = int((g * sa + buf[i + 1] * da * (1 - sa)) / out_a)
        buf[i + 2] = int((b * sa + buf[i + 2] * da * (1 - sa)) / out_a)
        buf[i + 3] = int(out_a * 255)
    else:
        buf[i : i + 4] = bytes((r, g, b, a))


def rect(buf, w, x0, y0, rw, rh, rgb, a=255, h=None):
    for y in range(y0, y0 + rh):
        for x in range(x0, x0 + rw):
            set_px(buf, w, x, y, rgb, a, h)


def hline(buf, w, x0, x1, y, rgb, a=255, h=None):
    for x in range(x0, x1 + 1):
        set_px(buf, w, x, y, rgb, a, h)


def vline(buf, w, x, y0, y1, rgb, a=255, h=None):
    for y in range(y0, y1 + 1):
        set_px(buf, w, x, y, rgb, a, h)


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


def dither_fill(buf, w, x0, y0, rw, rh, c1, c2, seed=0, dens=0.18, h=None):
    rng = random.Random(seed)
    rect(buf, w, x0, y0, rw, rh, c1, 255, h)
    for y in range(y0, y0 + rh):
        for x in range(x0, x0 + rw):
            if rng.random() < dens:
                set_px(buf, w, x, y, c2, 255, h)


# ── Tileset ──────────────────────────────────────────────

TILE_NAMES = [
    "empty",
    "herbe",
    "herbe_b",
    "herbe_c",
    "herbe_flower",
    "path",
    "path_v",
    "path_h",
    "pave",
    "pave_b",
    "esplanade",
    "sable",
    "sable_edge",
    "eau",
    "eau_b",
    "eau_c",
    "jura",
    "jura_snow",
    "ciel",
    "ciel_cloud",
    "vigne",
    "vigne_b",
    "tree",
    "tree_b",
    "bush",
    "cobble",
    "shadow",
]


def paint_tile(buf, col, row, name):
    x0, y0 = col * TILE, row * TILE
    H = SHEET_H
    w = SHEET_W
    rng = random.Random(hash(name) & 0xFFFF)

    def px(lx, ly, rgb, a=255):
        set_px(buf, w, x0 + lx, y0 + ly, rgb, a, H)

    def r(lx, ly, rw, rh, rgb, a=255):
        rect(buf, w, x0 + lx, y0 + ly, rw, rh, rgb, a, H)

    if name == "empty":
        return
    if name.startswith("herbe"):
        dither_fill(buf, w, x0, y0, 16, 16, C["herbe"], C["herbe_deep"], seed=col + row * 17, dens=0.12, h=H)
        for _ in range(6):
            px(rng.randint(0, 15), rng.randint(0, 15), C["herbe_lite"])
        if name == "herbe_flower":
            px(5, 6, C["or_ce"])
            px(11, 10, (0xE8, 0x8A, 0xA0))
            px(8, 3, C["white"])
        if name == "herbe_c":
            r(0, 14, 16, 2, C["herbe_deep"], 80)
        return
    if name in ("path", "path_v", "path_h"):
        r(0, 0, 16, 16, C["path"])
        for i in range(0, 16, 2):
            if name != "path_v":
                px(i, 4, C["pave_deep"])
                px(i + 1, 11, C["pave_deep"])
            if name != "path_h":
                px(4, i, C["pave_deep"])
                px(11, i, C["pave_deep"])
        r(0, 0, 16, 1, C["molasse_deep"], 60)
        return
    if name in ("pave", "pave_b", "cobble", "esplanade"):
        base = C["path"] if name == "esplanade" else C["pave"]
        r(0, 0, 16, 16, base)
        step = 4 if name != "cobble" else 3
        for y in range(0, 16, step):
            for x in range(0, 16, step):
                if (x // step + y // step) % 2:
                    r(x, y, step - 1, step - 1, C["pave_deep"], 90)
                hline(buf, w, x0 + x, x0 + x + step - 2, y0 + y, C["molasse_deep"], 70, H)
        return
    if name == "sable":
        dither_fill(buf, w, x0, y0, 16, 16, C["sable"], C["path"], seed=3, dens=0.1, h=H)
        return
    if name == "sable_edge":
        r(0, 0, 16, 9, C["herbe"])
        r(0, 9, 16, 7, C["sable"])
        hline(buf, w, x0, x0 + 15, y0 + 9, C["path"], 200, H)
        return
    if name.startswith("eau"):
        r(0, 0, 16, 16, C["eau"])
        phase = {"eau": 0, "eau_b": 2, "eau_c": 4}.get(name, 0)
        for y in range(16):
            for x in range(16):
                if (x + y * 2 + phase) % 5 == 0:
                    px(x, y, C["eau_lite"])
                if y > 12 and (x + phase) % 3 == 0:
                    px(x, y, C["eau_deep"])
        return
    if name == "jura":
        r(0, 0, 16, 16, C["jura_near"])
        r(0, 0, 16, 7, C["jura_far"])
        for x in range(0, 16, 3):
            px(x, 8 + (x % 4), C["feuille_deep"])
        return
    if name == "jura_snow":
        r(0, 0, 16, 16, C["jura_far"])
        for x in range(3, 13):
            px(x, 2 + abs(x - 8) // 3, C["snow"])
            px(x, 3 + abs(x - 8) // 3, C["snow"])
        return
    if name == "ciel":
        r(0, 0, 16, 16, C["ciel"])
        return
    if name == "ciel_cloud":
        r(0, 0, 16, 16, C["ciel"])
        r(2, 6, 10, 4, C["white"], 180)
        r(5, 4, 7, 4, C["white"], 160)
        return
    if name.startswith("vigne"):
        r(0, 0, 16, 16, C["herbe"])
        off = 0 if name == "vigne" else 1
        for x in range(1 + off, 16, 4):
            r(x, 1, 2, 13, C["vigne"])
            r(x, 3, 2, 1, C["herbe_lite"], 120)
            r(x, 14, 2, 1, C["herbe_deep"])
        return
    if name.startswith("tree"):
        r(0, 0, 16, 16, C["herbe"])
        r(7, 10, 2, 5, C["bois"])
        canopy = C["feuille"] if name == "tree" else C["feuille_deep"]
        r(3, 2, 10, 10, canopy)
        r(5, 4, 6, 6, C["feuille_deep"] if name == "tree" else C["feuille"])
        px(6, 5, C["herbe_lite"])
        return
    if name == "bush":
        r(0, 0, 16, 16, C["herbe"])
        r(3, 8, 10, 6, C["feuille_deep"])
        r(4, 7, 8, 5, C["feuille"])
        return
    if name == "shadow":
        r(0, 0, 16, 16, C["shadow"], 50)
        return


def build_tileset():
    buf = new_buf(SHEET_W, SHEET_H)
    names = []
    for i, name in enumerate(TILE_NAMES):
        paint_tile(buf, i % TS_COLS, i // TS_COLS, name)
        names.append(name)
    while len(names) < TS_COLS * TS_ROWS:
        names.append(f"pad_{len(names)}")
    path = ROOT / "assets" / "tilesets" / "terrain_16.png"
    write_png(path, SHEET_W, SHEET_H, buf)
    (ROOT / "assets" / "tilesets" / "terrain_16.json").write_text(
        json.dumps(
            {
                "tile": TILE,
                "columns": TS_COLS,
                "rows": TS_ROWS,
                "tiles": names,
                "artPass": "agent-v1",
            },
            indent=2,
        ),
        encoding="utf-8",
    )
    return names


def gid(name, names):
    if not name or name == "empty":
        return 0
    return names.index(name) + 1


# ── Buildings ────────────────────────────────────────────


def draw_window(buf, w, x, y, ww=5, hh=6):
    rect(buf, w, x, y, ww, hh, C["vitre"])
    hline(buf, w, x, x + ww - 1, y, C["molasse_deep"])
    vline(buf, w, x + ww // 2, y, y + hh - 1, C["molasse_deep"], 180)
    hline(buf, w, x, x + ww - 1, y + hh // 2, C["molasse_deep"], 180)
    set_px(buf, w, x + 1, y + 1, C["vitre_lite"])


def draw_door(buf, w, x, y, hh=12):
    rect(buf, w, x, y, 8, hh, C["bois"])
    rect(buf, w, x + 1, y + 1, 6, hh - 2, C["bois_lite"], 100)
    set_px(buf, w, x + 6, y + hh // 2, C["or_ce"])


def paint_building_roof(site: dict) -> bytearray:
    fw, fh = site["fw"] * TILE, site["fh"] * TILE
    buf = new_buf(fw, fh)
    kind = site.get("kind")
    rng = random.Random(hash(site["id"]) & 0xFFFF)

    # drop shadow
    rect(buf, fw, 3, fh - 4, fw - 3, 4, C["shadow"], 55)

    # body
    body = C["molasse"]
    rect(buf, fw, 0, 10, fw, fh - 14, body)
    dither_fill(buf, fw, 0, 10, fw, fh - 14, body, C["molasse_deep"], seed=1, dens=0.06)

    # header band
    if kind == "parlement":
        rect(buf, fw, 0, 10, fw, 12, C["vert_gc"])
        rect(buf, fw, 0, 10, fw, 3, C["vert_lite"], 100)
        # cupola
        rect(buf, fw, fw // 2 - 14, 0, 28, 12, C["vert_gc"])
        rect(buf, fw, fw // 2 - 10, 2, 20, 8, C["vert_lite"], 80)
        vline(buf, fw, fw // 2, 0, 8, C["or_ce"])
    elif kind == "chateau":
        rect(buf, fw, 0, 10, fw, 12, C["or_deep"])
        rect(buf, fw, 0, 10, fw, 3, C["or_lite"], 90)
        # turrets
        for tx in (4, fw - 14):
            rect(buf, fw, tx, 4, 10, 18, C["molasse"])
            rect(buf, fw, tx - 1, 2, 12, 6, C["toit"])
            for yy in range(0, 6, 2):
                hline(buf, fw, tx - 1, tx + 10, 2 + yy, C["toit_deep"])
    else:
        tint = site.get("deptTint")
        if tint and tint.startswith("#"):
            rgb = tuple(int(tint[i : i + 2], 16) for i in (1, 3, 5))
        else:
            rgb = C["encre"]
        rect(buf, fw, 0, 8, fw, 8, rgb)
        # awning stripes
        for x in range(2, fw - 2, 4):
            rect(buf, fw, x, 10, 2, 5, C["white"], 40)

    # roof tiles
    roof_h = 10
    rect(buf, fw, -1 if kind != "department" else 0, 2, fw + 2 if kind != "department" else fw, roof_h, C["toit"])
    for y in range(2, 2 + roof_h, 2):
        hline(buf, fw, 0, fw - 1, y, C["toit_deep"], 160)
        for x in range(0, fw, 4):
            set_px(buf, fw, x + (y % 4), y + 1, C["toit_lite"])

    # windows grid
    rows = 2 if kind != "department" else 1
    cols = max(3, fw // 14)
    for row in range(rows):
        for col in range(cols):
            wx = 6 + col * ((fw - 16) // cols)
            wy = 28 + row * 18 if kind != "department" else 22
            if wy + 6 < fh - 10:
                draw_window(buf, fw, wx, wy)

    # main door at entry (bottom center-ish)
    dx = fw // 2 - 4
    draw_door(buf, fw, dx, fh - 16, 14)

    # stone outline
    hline(buf, fw, 0, fw - 1, 10, C["molasse_deep"])
    hline(buf, fw, 0, fw - 1, fh - 5, C["molasse_deep"])
    vline(buf, fw, 0, 10, fh - 5, C["molasse_deep"])
    vline(buf, fw, fw - 1, 10, fh - 5, C["molasse_deep"])

    # ivy for château
    if kind == "chateau":
        for _ in range(40):
            set_px(buf, fw, rng.randint(2, 20), rng.randint(30, fh - 20), C["feuille"], 200)
            set_px(buf, fw, rng.randint(fw - 22, fw - 3), rng.randint(28, fh - 18), C["feuille_deep"], 180)

    # flag
    if kind in ("parlement", "chateau"):
        fx = fw - 18
        vline(buf, fw, fx, 12, 28, C["bois"])
        col = C["vert_gc"] if kind == "parlement" else C["or_ce"]
        rect(buf, fw, fx + 1, 12, 10, 6, col)

    return buf


def paint_building_interior(site: dict, rooms_layout: list[dict]) -> bytearray:
    fw, fh = site["fw"] * TILE, site["fh"] * TILE
    buf = new_buf(fw, fh)
    kind = site.get("kind")

    # floor
    if kind == "parlement":
        dither_fill(buf, fw, 0, 0, fw, fh, C["parquet"], C["parquet_deep"], dens=0.08)
    else:
        dither_fill(buf, fw, 0, 0, fw, fh, C["crepi"], C["molasse_deep"], dens=0.05)

    # header strip interior
    if kind == "parlement":
        rect(buf, fw, 0, 0, fw, 10, C["vert_gc"])
    elif kind == "chateau":
        rect(buf, fw, 0, 0, fw, 10, C["or_deep"])
    else:
        rect(buf, fw, 0, 0, fw, 8, C["encre"])

    # room partitions + furniture
    for rh in rooms_layout:
        # local coords relative to site
        lx = (rh["gx"] - site["gx"]) * TILE
        ly = (rh["gy"] - site["gy"]) * TILE
        lw, lh = rh["fw"] * TILE, rh["fh"] * TILE
        # room border
        hline(buf, fw, lx, lx + lw - 1, ly, C["molasse_deep"], 120)
        vline(buf, fw, lx, ly, ly + lh - 1, C["molasse_deep"], 100)
        rid = rh["id"]
        if rid == "plenum-gc":
            # hemicycle arcs
            cx, cy = lx + lw // 2, ly + lh - 8
            for r in (lw // 3, lw // 4, lw // 5):
                for a in range(180, 360, 4):
                    rad = math.radians(a)
                    x = int(cx + r * math.cos(rad))
                    y = int(cy + r * 0.45 * math.sin(rad))
                    set_px(buf, fw, x, y, C["vert_gc"], 200)
            # speaker desk
            rect(buf, fw, cx - 10, cy - 6, 20, 8, C["bois"])
            rect(buf, fw, cx - 4, cy - 14, 8, 8, C["vert_lite"])
        elif rid == "college-ce":
            # oval table
            rect(buf, fw, lx + lw // 2 - 16, ly + lh // 2 - 8, 32, 16, C["or_ce"], 180)
            rect(buf, fw, lx + lw // 2 - 12, ly + lh // 2 - 5, 24, 10, C["or_lite"], 100)
            for i in range(7):
                ang = i * (2 * math.pi / 7)
                sx = int(lx + lw // 2 + 20 * math.cos(ang))
                sy = int(ly + lh // 2 + 12 * math.sin(ang))
                rect(buf, fw, sx - 2, sy - 2, 4, 4, C["bois_lite"])
        elif "projet" in rid or rid in ("bureau-gc", "chancellerie", "sgc", "csg"):
            # desks
            for i in range(max(1, lw // 20)):
                dx = lx + 4 + i * 18
                dy = ly + lh // 2 - 4
                if dx + 14 < lx + lw:
                    rect(buf, fw, dx, dy, 14, 8, C["bois"])
                    rect(buf, fw, dx + 2, dy - 3, 6, 4, C["paper"])
                    set_px(buf, fw, dx + 10, dy + 2, C["encre"])
        elif rid.endswith("cabinet"):
            rect(buf, fw, lx + 4, ly + 6, lw - 8, 6, C["bois"])
            rect(buf, fw, lx + lw // 2 - 6, ly + lh // 2, 12, 10, C["encre"], 80)
        elif rid == "pas-perdus":
            # pillars
            for i in range(3):
                px = lx + 8 + i * (lw // 3)
                rect(buf, fw, px, ly + 2, 3, lh - 4, C["molasse_deep"], 150)
        elif rid == "commission":
            for row in range(2):
                for col in range(max(1, lw // 16)):
                    rect(buf, fw, lx + 4 + col * 14, ly + 8 + row * 14, 10, 6, C["bois_lite"])

        # tiny label pixel bar
        rect(buf, fw, lx + 2, ly + 2, min(12, lw - 4), 2, C["encre"], 100)

    # windows light on edges
    for x in range(4, fw - 4, 12):
        draw_window(buf, fw, x, 14, 5, 6)

    return buf


def room_layouts(site: dict) -> list[dict]:
    """Same subdivision logic as build_from_world."""
    gx, gy, fw, fh = site["gx"], site["gy"], site["fw"], site["fh"]
    rooms = site.get("rooms") or []
    kind = site.get("kind")
    out = []

    def add(r, rx, ry, rw, rh):
        out.append(
            {
                "id": r["id"],
                "label": r.get("label") or r["id"],
                "gx": gx + rx,
                "gy": gy + ry,
                "fw": rw,
                "fh": rh,
            }
        )

    if kind == "parlement" and len(rooms) >= 5:
        layout = {
            "plenum-gc": (0, 0, max(8, fw - 5), fh - 2),
            "bureau-gc": (fw - 5, 0, 5, 3),
            "commission": (fw - 5, 3, 5, 3),
            "sgc": (fw - 5, 6, 5, fh - 6),
            "pas-perdus": (0, fh - 2, fw - 5, 2),
        }
        for r in rooms:
            if r["id"] in layout:
                add(r, *layout[r["id"]])
        return out
    if kind == "chateau" and len(rooms) >= 3:
        layout = {
            "college-ce": (0, 0, fw - 4, fh - 2),
            "csg": (fw - 4, 0, 4, fh // 2),
            "chancellerie": (fw - 4, fh // 2, 4, fh - fh // 2),
        }
        for r in rooms:
            if r["id"] in layout:
                add(r, *layout[r["id"]])
        return out
    if kind == "department" and rooms:
        n = len(rooms)
        row_h = max(1, fh // n)
        for i, r in enumerate(rooms):
            ry = i * row_h
            rh = row_h if i < n - 1 else fh - ry
            add(r, 0, ry, fw, rh)
        return out
    return out


def build_buildings(world: dict) -> list[dict]:
    manifest = []
    bdir = ROOT / "assets" / "buildings"
    bdir.mkdir(parents=True, exist_ok=True)
    # dept tints
    tints = {d["id"]: d.get("deptTint") for d in world.get("namedDepartments") or []}

    for site in world["sites"]:
        if site["id"] in tints:
            site = {**site, "deptTint": tints[site["id"]]}
        layouts = room_layouts(site)
        roof = paint_building_roof(site)
        interior = paint_building_interior(site, layouts)
        rid = site["id"]
        roof_path = bdir / f"{rid}_roof.png"
        int_path = bdir / f"{rid}_interior.png"
        fw, fh = site["fw"] * TILE, site["fh"] * TILE
        write_png(roof_path, fw, fh, roof)
        write_png(int_path, fw, fh, interior)
        manifest.append(
            {
                "id": rid,
                "kind": site.get("kind"),
                "x": site["gx"] * TILE,
                "y": site["gy"] * TILE,
                "w": fw,
                "h": fh,
                "roof": f"buildings/{rid}_roof.png",
                "interior": f"buildings/{rid}_interior.png",
            }
        )
        print(f"  building {rid} {fw}x{fh}")
    man_path = ROOT / "assets" / "buildings" / "manifest.json"
    man_path.write_text(json.dumps({"buildings": manifest}, indent=2), encoding="utf-8")
    return manifest


# ── Dossier token ────────────────────────────────────────


def build_dossier():
    dirs = ["s", "e", "n", "o"]
    frames = 4
    fw = fh = 16
    cols = frames * len(dirs) + 1
    w, h = cols * fw, fh
    buf = new_buf(w, h)
    meta = {}
    idx = 0

    def draw_at(ox, bob, flap, face):
        # soft shadow
        rect(buf, w, ox - 4, 12 + bob, 10, 3, C["shadow"], 40)
        # body
        rect(buf, w, ox - 5, 3 + bob, 10, 12, C["paper"])
        rect(buf, w, ox - 5, 3 + bob, 10, 2, C["or_ce"])
        rect(buf, w, ox - 4, 6 + bob, 8, 2, C["or_deep"], 180)
        # ribbon
        rect(buf, w, ox - 1, 1 + bob + flap, 2, 5, C["vert_gc"])
        set_px(buf, w, ox, 2 + bob + flap, C["vert_lite"] if "vert_lite" in C else C["vert_gc"])
        # outline
        hline(buf, w, ox - 5, ox + 4, 3 + bob, C["molasse_deep"], 200)
        hline(buf, w, ox - 5, ox + 4, 14 + bob, C["molasse_deep"], 200)
        # face hint
        if face == "e":
            set_px(buf, w, ox + 5, 8 + bob, C["encre"])
        elif face == "o":
            set_px(buf, w, ox - 6, 8 + bob, C["encre"])
        elif face == "n":
            set_px(buf, w, ox, 2 + bob, C["encre"])
        else:
            set_px(buf, w, ox, 15 + bob, C["encre"])

    for d in dirs:
        for f in range(frames):
            bob = (0, 1, 0, -1)[f]
            flap = (0, 1, 0, 1)[f]
            ox = idx * fw + 8
            draw_at(ox, bob, flap, d)
            meta[f"dossier_{d}_{f}"] = {"frame": {"x": idx * fw, "y": 0, "w": fw, "h": fh}}
            idx += 1
    draw_at(idx * fw + 8, 0, 0, "s")
    meta["dossier_idle"] = {"frame": {"x": idx * fw, "y": 0, "w": fw, "h": fh}}
    path = ROOT / "assets" / "characters" / "dossier_16.png"
    write_png(path, w, h, buf)
    atlas = {
        "meta": {"image": "dossier_16.png", "size": {"w": w, "h": h}},
        "frames": {
            k: {
                **v,
                "rotated": False,
                "trimmed": False,
                "spriteSourceSize": {"x": 0, "y": 0, "w": fw, "h": fh},
                "sourceSize": {"w": fw, "h": fh},
            }
            for k, v in meta.items()
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
    (ROOT / "assets" / "atlases" / "dossier.json").write_text(
        json.dumps(atlas, indent=2), encoding="utf-8"
    )
    print("  dossier sheet", w, "x", h)


def enrich_tileset_preserve_gids():
    """Re-paint terrain_16.png slots using names from existing meta (gid-stable)."""
    meta_path = ROOT / "assets" / "tilesets" / "terrain_16.json"
    meta = json.loads(meta_path.read_text(encoding="utf-8"))
    names = meta.get("tiles") or []
    cols = int(meta.get("columns") or TS_COLS)
    rows = int(meta.get("rows") or TS_ROWS)
    sw, sh = cols * TILE, rows * TILE
    buf = new_buf(sw, sh)

    # Names paint_tile understands
    known = set(TILE_NAMES)
    # Map structural tile names (used under sprites only) to terrain-ish fillers
    alias = {
        "wall": "pave",
        "wall_gc": "pave",
        "wall_ce": "pave",
        "wall_dept": "pave",
        "wall_shadow": "shadow",
        "floor_int": "pave_b",
        "floor_hemi": "esplanade",
        "floor_college": "esplanade",
        "desk": "path",
        "chair": "path",
        "window": "pave_b",
        "door": "path",
        "roof": "sable",
        "roof_gc": "herbe_flower",
        "roof_ce": "herbe_c",
        "roof_dept": "herbe_b",
        "roof_ridge": "sable",
        "header_gc": "herbe_flower",
        "header_ce": "herbe_c",
        "statue": "cobble",
        "boat": "eau",
        "deck": "sable",
        "spire": "pave",
        "flag_gc": "ciel",
        "flag_ce": "ciel",
        "path_edge": "path",
        "herbe_c": "herbe_c",
        "herbe_flower": "herbe_flower",
        "eau_c": "eau_c",
        "vigne_b": "vigne_b",
        "tree_b": "tree_b",
        "ciel_cloud": "ciel_cloud",
        "sable_edge": "sable_edge",
        "path_v": "path_v",
        "path_h": "path_h",
    }

    for i, name in enumerate(names):
        if not name or str(name).startswith("pad_"):
            continue
        pn = name if name in known else alias.get(name, "herbe")
        if pn not in known:
            pn = "herbe"
        paint_tile(buf, i % cols, i // cols, pn)

    write_png(ROOT / "assets" / "tilesets" / "terrain_16.png", sw, sh, buf)
    meta["artPass"] = "agent-v1"
    meta["imagewidth"] = sw
    meta["imageheight"] = sh
    meta_path.write_text(json.dumps(meta, indent=2), encoding="utf-8")
    print(f"  tileset enriched {sw}x{sh}, {len(names)} names")


def main():
    import subprocess
    import sys

    print("== Art pass agent v1 ==")
    print("1) structure from world.json…")
    subprocess.check_call([sys.executable, str(ROOT / "tools" / "build_from_world.py")])

    world = json.loads(PARENT_WORLD.read_text(encoding="utf-8"))

    print("2) enrich tileset (gid-stable)…")
    enrich_tileset_preserve_gids()

    print("3) buildings dual LOD…")
    build_buildings(world)

    print("4) dossier token…")
    build_dossier()

    print("OK art pass complete — open /pixel/ and zoom to open roofs")


if __name__ == "__main__":
    main()
