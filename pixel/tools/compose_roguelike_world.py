#!/usr/bin/env python3
"""Compose dual-LOD world from Kenney Roguelike RPG Pack (playbook v5).

Conceptual model (fork of state-of-vd dynamics, textures only change):
  • Zoomed-out  → Sample1 outdoor language (ground + house roofs/facades)
  • Zoomed-in   → Sample2 indoor language (floor plans with wall borders)

Grid is scaled ×2 from world.json so Sample2 rooms have real space
(walls 1 tile thick + furniture + carpet insets).
"""
from __future__ import annotations

import json
import random
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
WORLD = ROOT.parent / "state-of-vd" / "data" / "world.json"
SHEET = (
    ROOT
    / "assets"
    / "kenney"
    / "roguelike-rpg-pack"
    / "Spritesheet"
    / "roguelikeSheet_transparent.png"
)
PLAYBOOK = ROOT / "assets" / "kenney" / "roguelike_playbook.json"
OUT = ROOT / "assets" / "composed"
HOTSPOTS = ROOT / "assets" / "hotspots.json"
TW, SP, COLS = 16, 1, 57
SCALE = 2  # world.json → pixel grid multiplier


# ── sheet helpers ───────────────────────────────────────────────────────────


def load_sheet():
    return Image.open(SHEET).convert("RGBA")


def get_tile(sheet, idx):
    r, c = divmod(int(idx), COLS)
    x, y = c * (TW + SP), r * (TW + SP)
    return sheet.crop((x, y, x + TW, y + TW))


def tint(tile, rgb, strength=0.28):
    if not rgb or strength <= 0:
        return tile
    r, g, b = (int(x) for x in rgb)
    colored = ImageChops.multiply(
        tile.convert("RGB"), Image.new("RGB", tile.size, (r, g, b))
    ).convert("RGBA")
    colored.putalpha(tile.split()[-1])
    return Image.blend(tile, colored, strength)


def paste(canvas, sheet, idx, tx, ty, rgb=None, strength=0.28):
    t = get_tile(sheet, idx)
    if rgb:
        t = tint(t, rgb, strength)
    canvas.paste(t, (tx * TW, ty * TW), t)


def pick(rng, ids):
    return int(rng.choice(ids)) if ids else 0


def first(roles, key):
    return int(roles[key]["ids"][0])


def as_rgb(v):
    if not v:
        return None
    if isinstance(v, str) and v.startswith("#"):
        h = v.lstrip("#")
        return tuple(int(h[i : i + 2], 16) for i in (0, 2, 4))
    return tuple(int(x) for x in v)


def S(v):
    """Scale a world.json coordinate."""
    return int(v) * SCALE


# ── scale world sites ───────────────────────────────────────────────────────


def scale_sites(world):
    sites = []
    for s in world["sites"]:
        ns = dict(s)
        ns["gx"], ns["gy"] = S(s["gx"]), S(s["gy"])
        ns["fw"], ns["fh"] = S(s["fw"]), S(s["fh"])
        e = s.get("entry") or {}
        ns["entry"] = {"gx": S(e.get("gx", s["gx"])), "gy": S(e.get("gy", s["gy"] + s["fh"] - 1))}
        sites.append(ns)
    esp = world.get("esplanade") or {}
    esplanade = {
        "gx0": S(esp.get("gx0", 0)),
        "gx1": S(esp.get("gx1", 0)) + (SCALE - 1),
        "gy0": S(esp.get("gy0", 0)),
        "gy1": S(esp.get("gy1", 0)) + (SCALE - 1),
    }
    return sites, esplanade


# ── room layouts (Sample2-scale, wall-aware) ────────────────────────────────


def room_layouts(site):
    """Inner floor rectangles (inside wall border). Coordinates absolute."""
    gx, gy, fw, fh = site["gx"], site["gy"], site["fw"], site["fh"]
    # leave 1-tile wall shell
    ix, iy, iw, ih = gx + 1, gy + 1, fw - 2, fh - 2
    if iw < 2 or ih < 2:
        return []
    kind = site.get("kind")
    rooms = site.get("rooms") or []
    out = []

    def add(rid, label, rx, ry, rw, rh, floor="wood"):
        if rw < 1 or rh < 1:
            return
        out.append(
            {
                "id": rid,
                "label": label,
                "gx": rx,
                "gy": ry,
                "fw": rw,
                "fh": rh,
                "floor": floor,
            }
        )

    if kind == "parlement" and len(rooms) >= 5:
        # left = plenum (large), right column = offices, bottom = pas-perdus
        col_w = max(4, iw // 3)
        main_w = iw - col_w
        add("plenum-gc", "Hémicycle", ix, iy, main_w, max(4, ih - 3), "wood_carpet")
        add("bureau-gc", "Bureau GC", ix + main_w, iy, col_w, max(3, ih // 3), "stone")
        add(
            "commission",
            "Commissions",
            ix + main_w,
            iy + ih // 3,
            col_w,
            max(3, ih // 3),
            "stone",
        )
        add(
            "sgc",
            "SGC",
            ix + main_w,
            iy + 2 * (ih // 3),
            col_w,
            ih - 2 * (ih // 3),
            "stone",
        )
        add("pas-perdus", "Pas perdus", ix, iy + ih - 3, main_w, 3, "stone")
        return out

    if kind == "chateau" and len(rooms) >= 3:
        col_w = max(4, iw // 3)
        main_w = iw - col_w
        add("college-ce", "Collège CE", ix, iy, main_w, ih, "beige")
        add("csg", "CSG", ix + main_w, iy, col_w, ih // 2, "stone")
        add("chancellerie", "Chancellerie", ix + main_w, iy + ih // 2, col_w, ih - ih // 2, "stone")
        return out

    if kind == "department" and rooms:
        n = max(1, len(rooms))
        rh0 = max(2, ih // n)
        for i, r in enumerate(rooms):
            ry = iy + i * rh0
            rh = rh0 if i < n - 1 else iy + ih - ry
            add(r["id"], r.get("label") or r["id"], ix, ry, iw, rh, "wood")
        return out

    add(site["id"], site.get("displayName") or site["id"], ix, iy, iw, ih, "wood")
    return out


# ── paths ───────────────────────────────────────────────────────────────────


def ortho_corridor(x0, y0, x1, y1):
    cells = []
    x, y = x0, y0
    step = 1 if x1 >= x else -1
    while x != x1:
        cells.append((x, y))
        x += step
    cells.append((x, y))
    step = 1 if y1 >= y else -1
    while y != y1:
        y += step
        cells.append((x, y))
    return cells


def build_path_set(sites, esplanade, W, H, occupied):
    path = set()
    avenue_y = S(15)
    for x in range(S(2), min(S(36), W - 2)):
        path.add((x, avenue_y))
        if SCALE >= 2:
            path.add((x, avenue_y + 1))  # 2-wide avenue

    if esplanade:
        mid_x = (esplanade["gx0"] + esplanade["gx1"]) // 2
        for y in range(esplanade["gy1"], avenue_y + 1):
            path.add((mid_x, y))
            path.add((mid_x + 1, y))

    for s in sites:
        ex, ey = s["entry"]["gx"], s["entry"]["gy"]
        for cell in ortho_corridor(ex, ey, ex, avenue_y):
            if 0 <= cell[0] < W and 0 <= cell[1] < H:
                path.add(cell)
                if SCALE >= 2:
                    path.add((cell[0] + 1, cell[1]))
        # apron south of door
        for dx in range(-1, 2):
            path.add((ex + dx, ey + 1))

    path -= occupied
    return path


# ── trees ───────────────────────────────────────────────────────────────────


def place_trees(ground, sheet, roles, free, W, H, rng):
    canopy = first(roles, "tree_canopy")
    trunk = first(roles, "tree_trunk")

    def try_tree(tx, ty):
        if ty + 1 >= H:
            return False
        if (tx, ty) not in free or (tx, ty + 1) not in free:
            return False
        paste(ground, sheet, canopy, tx, ty)
        paste(ground, sheet, trunk, tx, ty + 1)
        free.discard((tx, ty))
        free.discard((tx, ty + 1))
        return True

    # N forest
    for tx in range(0, W, 1):
        if rng.random() < 0.8:
            try_tree(tx, 0)
    # E woods
    for ty in range(2, H - 6, 2):
        for tx in range(W - 4, W):
            if rng.random() < 0.75:
                try_tree(tx, ty)
    # W edge
    for ty in range(2, S(12), 2):
        for tx in range(0, 3):
            if rng.random() < 0.6:
                try_tree(tx, ty)


# ── Sample1 exterior building (roofs layer) ─────────────────────────────────


def stamp_exterior(roofs, sheet, s, roles, rng, dept_tint=None):
    """Sample1 house: roof-dominant + short beige facade with door/windows."""
    gx, gy, fw, fh = s["gx"], s["gy"], s["fw"], s["fh"]
    # facade height grows slightly with building size but stays short
    wall_rows = 2 if fh <= 10 else 3
    wall_rows = min(wall_rows, fh - 2)
    roof_rows = fh - wall_rows

    peak_l = first(roles, "roof_peak_l")
    peak_r = first(roles, "roof_peak_r")
    ridge = roles["roof_ridge"]["ids"]
    rfill = roles["roof_fill"]["ids"]
    eave_l = roles["roof_eave_l"]["ids"]
    eave_r = roles["roof_eave_r"]["ids"]
    wall = roles["wall_ext"]["ids"]
    wall_top = roles["wall_top"]["ids"]
    door = first(roles, "door")
    windows = roles["window"]["ids"]

    kind = s.get("kind")
    if kind == "parlement":
        tw, tr, st = (70, 130, 95), (50, 110, 80), 0.2
    elif kind == "chateau":
        tw, tr, st = (210, 175, 100), (180, 100, 70), 0.24
    else:
        tw, tr, st = as_rgb(dept_tint), as_rgb(dept_tint), 0.28 if dept_tint else 0.0

    ex, ey = s["entry"]["gx"], s["entry"]["gy"]

    # Multi-gable roof (Sample1 long manors = repeated house peaks every gable_w)
    gable_w = 6 if fw >= 12 else (4 if fw >= 8 else fw)

    for ty in range(gy, gy + fh):
        for tx in range(gx, gx + fw):
            ly, lx = ty - gy, tx - gx
            is_l, is_r = lx == 0, lx == fw - 1
            is_bot = ly == fh - 1

            if ly < roof_rows:
                # position inside current gable segment
                seg = lx % gable_w
                seg_last = min(gable_w - 1, fw - 1 - (lx - seg))
                # clamp last segment width
                remaining = fw - (lx - seg)
                local_last = min(gable_w, remaining) - 1
                if ly == 0:
                    if seg == 0:
                        idx = peak_l
                    elif seg == local_last:
                        idx = peak_r
                    else:
                        idx = pick(rng, ridge)
                elif ly == roof_rows - 1:
                    if seg == 0:
                        idx = pick(rng, eave_l)
                    elif seg == local_last:
                        idx = pick(rng, eave_r)
                    else:
                        idx = pick(rng, rfill)
                else:
                    idx = pick(rng, rfill)
                paste(roofs, sheet, idx, tx, ty, tr, st)
                continue

            # facade
            if is_bot and tx == ex:
                paste(roofs, sheet, door, tx, ty)
                continue
            # windows on upper facade row, spaced (Sample1 house windows)
            if ly == roof_rows and not is_l and not is_r and (lx % 3) == 1:
                paste(roofs, sheet, pick(rng, windows), tx, ty, tw, st * 0.4)
                continue
            idx = pick(rng, wall_top) if ly == roof_rows else pick(rng, wall)
            paste(roofs, sheet, idx, tx, ty, tw if ly == roof_rows else None, st if ly == roof_rows else 0)


# ── Sample2 interior floor plan ─────────────────────────────────────────────


def stamp_interior_sample2(interiors, sheet, s, roles, rng):
    """Sample2: beige wall shell + room dividers + floors + furniture against walls."""
    gx, gy, fw, fh = s["gx"], s["gy"], s["fw"], s["fh"]
    wall_ids = roles["wall_ext"]["ids"]
    door = first(roles, "door")
    windows = roles["window"]["ids"]
    chairs = roles["chair"]["ids"]
    tables = roles["table"]["ids"]
    cabinets = roles["cabinet"]["ids"]
    floors = {
        "wood": roles["floor_wood"]["ids"],
        "stone": roles["floor_stone"]["ids"],
        "beige": roles["floor_beige"]["ids"],
        "wood_carpet": roles["floor_wood"]["ids"],
    }
    carpet = roles["carpet_green"]["ids"]

    # 1) wall shell (full footprint beige first)
    for ty in range(gy, gy + fh):
        for tx in range(gx, gx + fw):
            paste(interiors, sheet, pick(rng, wall_ids), tx, ty)

    rooms = room_layouts(s)
    if not rooms:
        return

    # 2) floor each room (carves interior out of wall shell)
    for rh in rooms:
        fids = floors.get(rh["floor"], floors["wood"])
        fid = pick(rng, fids)
        for ty in range(rh["gy"], rh["gy"] + rh["fh"]):
            for tx in range(rh["gx"], rh["gx"] + rh["fw"]):
                paste(interiors, sheet, fid, tx, ty)

    # 3) internal divider walls where rooms share an edge (Sample2 partitions)
    floor_cells = set()
    for rh in rooms:
        for ty in range(rh["gy"], rh["gy"] + rh["fh"]):
            for tx in range(rh["gx"], rh["gx"] + rh["fw"]):
                floor_cells.add((tx, ty))

    for i, a in enumerate(rooms):
        for b in rooms[i + 1 :]:
            # horizontal neighbors: wall on the shared vertical line (rightmost of left room)
            if a["gx"] + a["fw"] == b["gx"]:
                y0 = max(a["gy"], b["gy"])
                y1 = min(a["gy"] + a["fh"], b["gy"] + b["fh"])
                if y1 > y0:
                    wx = a["gx"] + a["fw"] - 1
                    for ty in range(y0, y1):
                        paste(interiors, sheet, pick(rng, wall_ids), wx, ty)
                        floor_cells.discard((wx, ty))
                    # doorway gap mid-divider
                    mid = (y0 + y1) // 2
                    paste(interiors, sheet, door, wx, mid)
                    floor_cells.add((wx, mid))
            if b["gx"] + b["fw"] == a["gx"]:
                y0 = max(a["gy"], b["gy"])
                y1 = min(a["gy"] + a["fh"], b["gy"] + b["fh"])
                if y1 > y0:
                    wx = b["gx"] + b["fw"] - 1
                    for ty in range(y0, y1):
                        paste(interiors, sheet, pick(rng, wall_ids), wx, ty)
                        floor_cells.discard((wx, ty))
                    mid = (y0 + y1) // 2
                    paste(interiors, sheet, door, wx, mid)
            # vertical neighbors: wall on shared horizontal line
            if a["gy"] + a["fh"] == b["gy"]:
                x0 = max(a["gx"], b["gx"])
                x1 = min(a["gx"] + a["fw"], b["gx"] + b["fw"])
                if x1 > x0:
                    wy = a["gy"] + a["fh"] - 1
                    for tx in range(x0, x1):
                        paste(interiors, sheet, pick(rng, wall_ids), tx, wy)
                        floor_cells.discard((tx, wy))
                    mid = (x0 + x1) // 2
                    paste(interiors, sheet, door, mid, wy)
            if b["gy"] + b["fh"] == a["gy"]:
                x0 = max(a["gx"], b["gx"])
                x1 = min(a["gx"] + a["fw"], b["gx"] + b["fw"])
                if x1 > x0:
                    wy = b["gy"] + b["fh"] - 1
                    for tx in range(x0, x1):
                        paste(interiors, sheet, pick(rng, wall_ids), tx, wy)
                        floor_cells.discard((tx, wy))
                    mid = (x0 + x1) // 2
                    paste(interiors, sheet, door, mid, wy)

    # 4) exterior door on south wall
    ex = s["entry"]["gx"]
    door_x = min(max(ex, gx + 1), gx + fw - 2)
    door_y = gy + fh - 1
    paste(interiors, sheet, door, door_x, door_y)
    paste(interiors, sheet, pick(rng, floors["wood"]), door_x, door_y - 1)

    # 5) windows ONLY on exterior wall shell (never on floor cells)
    for tx in range(gx + 1, gx + fw - 1):
        if (tx - gx) % 3 == 1:
            paste(interiors, sheet, pick(rng, windows), tx, gy)  # north wall
    for ty in range(gy + 2, gy + fh - 2):
        if (ty - gy) % 3 == 1:
            paste(interiors, sheet, pick(rng, windows), gx, ty)
            paste(interiors, sheet, pick(rng, windows), gx + fw - 1, ty)

    # 6) carpet + furniture (Sample2: table center, chairs around, cabinets on wall)
    for rh in rooms:
        if rh["floor"] == "wood_carpet" and rh["fw"] >= 5 and rh["fh"] >= 4:
            # Sample2 center carpet — always paint inset (ignore divider discards)
            for ty in range(rh["gy"] + 2, rh["gy"] + rh["fh"] - 2):
                for tx in range(rh["gx"] + 2, rh["gx"] + rh["fw"] - 2):
                    paste(interiors, sheet, pick(rng, carpet), tx, ty)
            cx = rh["gx"] + rh["fw"] // 2
            cy = rh["gy"] + rh["fh"] // 2
            paste(interiors, sheet, pick(rng, tables), cx, cy)
            for dx, dy in [(-1, 0), (1, 0), (0, -1), (0, 1), (-2, 0), (2, 0)]:
                paste(interiors, sheet, pick(rng, chairs), cx + dx, cy + dy)
            continue

        if rh["fw"] >= 3 and rh["fh"] >= 3:
            cx = rh["gx"] + rh["fw"] // 2
            cy = rh["gy"] + rh["fh"] // 2
            paste(interiors, sheet, pick(rng, tables), cx, cy)
            paste(interiors, sheet, pick(rng, chairs), max(rh["gx"], cx - 1), cy)
            if rh["fw"] >= 4:
                paste(interiors, sheet, pick(rng, chairs), min(rh["gx"] + rh["fw"] - 1, cx + 1), cy)
            # cabinet against north wall of room (on floor just inside, not on exterior wall tile)
            paste(interiors, sheet, pick(rng, cabinets), rh["gx"] + 1, rh["gy"])
        elif rh["fw"] >= 2 and rh["fh"] >= 2:
            paste(interiors, sheet, pick(rng, chairs), rh["gx"] + rh["fw"] // 2, rh["gy"] + rh["fh"] // 2)


# ── hotspots ────────────────────────────────────────────────────────────────


def write_hotspots(sites, world):
    """Hotspots for rooms + sites — pixel coords at scaled grid."""
    hotspots = []
    for s in sites:
        # site-level
        hotspots.append(
            {
                "id": s["id"],
                "label": s.get("displayName") or s.get("label") or s["id"],
                "kind": "site",
                "siteId": s["id"],
                "siteKind": s.get("kind"),
                "gx": s["gx"],
                "gy": s["gy"],
                "fw": s["fw"],
                "fh": s["fh"],
                "x": s["gx"] * TW,
                "y": s["gy"] * TW,
                "w": s["fw"] * TW,
                "h": s["fh"] * TW,
                "cx": (s["gx"] + s["fw"] / 2) * TW,
                "cy": (s["gy"] + s["fh"] / 2) * TW,
            }
        )
        for rh in room_layouts(s):
            hotspots.append(
                {
                    "id": rh["id"],
                    "label": rh["label"],
                    "kind": "room",
                    "siteId": s["id"],
                    "siteKind": s.get("kind"),
                    "sub": s.get("displayName") or s["id"],
                    "gx": rh["gx"],
                    "gy": rh["gy"],
                    "fw": rh["fw"],
                    "fh": rh["fh"],
                    "x": rh["gx"] * TW,
                    "y": rh["gy"] * TW,
                    "w": rh["fw"] * TW,
                    "h": rh["fh"] * TW,
                    "cx": (rh["gx"] + rh["fw"] / 2) * TW,
                    "cy": (rh["gy"] + rh["fh"] / 2) * TW,
                }
            )

    doc = {
        "tile": TW,
        "alignedTo": "state-of-vd/data/world.json",
        "scale": SCALE,
        "grid": {"w": S(world["grid"]["w"]), "h": S(world["grid"]["h"])},
        "hotspots": hotspots,
    }
    HOTSPOTS.write_text(json.dumps(doc, indent=2, ensure_ascii=False), encoding="utf-8")
    return len(hotspots)


# ── main ────────────────────────────────────────────────────────────────────


def build():
    pb = json.loads(PLAYBOOK.read_text(encoding="utf-8"))
    roles = pb["roles"]
    world = json.loads(WORLD.read_text(encoding="utf-8"))
    W, H = S(world["grid"]["w"]), S(world["grid"]["h"])
    sites, esplanade = scale_sites(world)
    rng = random.Random(13)
    sheet = load_sheet()

    print(f"Roguelike v5 — Sample1/2 dual LOD · grid {W}×{H} (scale×{SCALE})")

    occupied = set()
    for s in sites:
        for x in range(s["gx"], s["gx"] + s["fw"]):
            for y in range(s["gy"], s["gy"] + s["fh"]):
                occupied.add((x, y))

    path_cells = build_path_set(sites, esplanade, W, H, occupied)

    ground = Image.new("RGBA", (W * TW, H * TW), (50, 120, 60, 255))
    roofs = Image.new("RGBA", (W * TW, H * TW), (0, 0, 0, 0))
    interiors = Image.new("RGBA", (W * TW, H * TW), (0, 0, 0, 0))

    grass = first(roles, "grass")
    path = first(roles, "path")
    water = first(roles, "water")
    cobble = first(roles, "cobble")

    # Sample1 outdoor base
    for ty in range(H):
        for tx in range(W):
            if ty >= H - S(2):
                paste(ground, sheet, water, tx, ty)
            elif ty == H - S(2) - 1:
                paste(ground, sheet, path, tx, ty)
            else:
                paste(ground, sheet, grass, tx, ty)

    # esplanade cobble
    for ty in range(esplanade["gy0"], esplanade["gy1"] + 1):
        for tx in range(esplanade["gx0"], esplanade["gx1"] + 1):
            if (tx, ty) not in occupied:
                paste(ground, sheet, cobble, tx, ty)

    # mono path tunnels
    for tx, ty in path_cells:
        if 0 <= tx < W and 0 <= ty < H - S(2):
            paste(ground, sheet, path, tx, ty)

    # free for trees
    free = set()
    for ty in range(0, H - S(3)):
        for tx in range(W):
            if (tx, ty) in occupied or (tx, ty) in path_cells:
                continue
            if esplanade["gx0"] <= tx <= esplanade["gx1"] and esplanade["gy0"] <= ty <= esplanade["gy1"]:
                continue
            free.add((tx, ty))

    place_trees(ground, sheet, roles, free, W, H, rng)

    # buildings dual
    dept_tints = {}
    for d in world.get("namedDepartments") or []:
        dept_tints[d["id"]] = d.get("deptTint")

    for s in sites:
        stamp_exterior(roofs, sheet, s, roles, rng, dept_tints.get(s["id"]))
        stamp_interior_sample2(interiors, sheet, s, roles, rng)

    # esplanade arch accent
    sx = (esplanade["gx0"] + esplanade["gx1"]) // 2
    sy = (esplanade["gy0"] + esplanade["gy1"]) // 2
    paste(roofs, sheet, first(roles, "door"), sx, sy, (201, 164, 92), 0.3)

    n_hs = write_hotspots(sites, world)

    OUT.mkdir(parents=True, exist_ok=True)
    ground.save(OUT / "ground.png")
    roofs.save(OUT / "roofs.png")
    interiors.save(OUT / "interiors.png")

    prev = ground.copy()
    prev.alpha_composite(roofs)
    prev.save(OUT / "preview_roofs.png")
    prev2 = ground.copy()
    prev2.alpha_composite(interiors)
    prev2.save(OUT / "preview_interiors.png")

    # side-by-side proof: exterior | interior crop of parlement
    parl = next(s for s in sites if s["kind"] == "parlement")
    crop = (
        parl["gx"] * TW - 16,
        parl["gy"] * TW - 16,
        (parl["gx"] + parl["fw"]) * TW + 16,
        (parl["gy"] + parl["fh"]) * TW + 32,
    )
    a = prev.crop(crop)
    b = prev2.crop(crop)
    proof = Image.new("RGBA", (a.width + b.width + 8, max(a.height, b.height)), (20, 20, 24, 255))
    proof.paste(a, (0, 0))
    proof.paste(b, (a.width + 8, 0))
    proof.save(OUT / "preview_dual_lod.png")

    # role sheet
    pairs = [
        ("grass", [grass]),
        ("path", [path]),
        ("water", [water]),
        ("treeC", [first(roles, "tree_canopy")]),
        ("treeT", [first(roles, "tree_trunk")]),
        ("wall", roles["wall_ext"]["ids"]),
        ("roof", roles["roof_fill"]["ids"][:2]),
        ("door", [first(roles, "door")]),
        ("win", roles["window"]["ids"]),
        ("stone", roles["floor_stone"]["ids"]),
        ("wood", roles["floor_wood"]["ids"]),
        ("carpet", roles["carpet_green"]["ids"][:2]),
        ("chair", roles["chair"]["ids"]),
        ("table", roles["table"]["ids"]),
    ]
    img = Image.new("RGBA", (260, len(pairs) * 22), (18, 20, 26, 255))
    dr = ImageDraw.Draw(img)
    for ri, (name, ids) in enumerate(pairs):
        dr.text((2, ri * 22 + 4), name, fill=(230, 230, 240))
        for ci, idx in enumerate(ids[:8]):
            t = get_tile(sheet, idx)
            img.paste(t, (70 + ci * 18, ri * 22 + 3), t)
    img.save(OUT / "role_usage_sheet.png")

    meta = {
        "tile": TW,
        "width": W * TW,
        "height": H * TW,
        "grid": {"w": W, "h": H},
        "scale": SCALE,
        "source": "roguelike-rpg-pack",
        "playbook": "roguelike_playbook.json v5",
        "packs": ["Roguelike RPG Pack — Kenney CC0 (sole art source)"],
        "credit": "Assets by Kenney (www.kenney.nl) CC0 — Roguelike RPG Pack.",
        "da": {
            "exterior": "Sample1 — outdoor ground + roof-dominant houses",
            "interior": "Sample2 — wall shell + floors + furniture floor plans",
            "lod": "crossfade roofs↔interiors on zoom (fork dynamics preserved)",
            "scale": f"×{SCALE} from world.json for Sample2 room space",
        },
        "layers": {
            "ground": "ground.png",
            "roofs": "roofs.png",
            "interiors": "interiors.png",
        },
        "hotspots": n_hs,
    }
    (OUT / "meta.json").write_text(json.dumps(meta, indent=2), encoding="utf-8")
    (OUT / "CREDITS.txt").write_text(
        "Roguelike RPG Pack by Kenney (www.kenney.nl) — CC0 1.0\n"
        "https://kenney.nl/assets/roguelike-rpg-pack\n"
        "Sample1 exterior + Sample2 interior dual LOD (playbook v5).\n",
        encoding="utf-8",
    )
    print(f"OK v5 {W}×{H}px={W*TW}×{H*TW} hotspots={n_hs} paths={len(path_cells)}")


if __name__ == "__main__":
    build()
