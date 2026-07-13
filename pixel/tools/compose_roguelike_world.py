#!/usr/bin/env python3
"""Compose world — Roguelike RPG Pack only, Sample1 texture discipline (playbook v4).

Hard rules:
  1. Trees = 2-high pairs (canopy 586 over trunk 643). Never orphan either.
  2. Paths = mono tile 408, orthogonal corridors end-to-end (no tetris mix).
  3. Buildings = roof-dominant; only bottom wall_rows are facade (walls+door+windows).
  4. Windows only on south facade — never mid-footprint, never on interiors.
  5. Indoor floors = wood/beige; never cobble/path/outdoor paving for rooms.
  6. Furniture = sparse interior props only.
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
TW, SP, COLS = 16, 1, 57


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
    return tuple(int(x) for x in v)


# ── path network (orthogonal tunnels) ──────────────────────────────────────


def ortho_corridor(x0, y0, x1, y1):
    """L-shaped path cells from (x0,y0) to (x1,y1): horizontal then vertical."""
    cells = []
    x, y = x0, y0
    # horizontal first
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


def build_path_set(sites, esplanade, W, H):
    """Directional tunnels between buildings — not a flooded tetris grid."""
    path = set()
    # Main E–W avenue in front of departments (row 15)
    avenue_y = 15
    for x in range(2, min(36, W - 2)):
        path.add((x, avenue_y))

    # Esplanade spine (cobble drawn separately; dirt link into avenue)
    if esplanade:
        ex0 = esplanade["gx0"]
        ex1 = esplanade["gx1"]
        ey0 = esplanade["gy0"]
        ey1 = esplanade["gy1"]
        mid_x = (ex0 + ex1) // 2
        # vertical link esplanade bottom → avenue
        for y in range(ey1, avenue_y + 1):
            path.add((mid_x, y))
            if mid_x + 1 <= ex1:
                path.add((mid_x + 1, y))

    for s in sites:
        entry = s.get("entry") or {}
        ex, ey = entry.get("gx"), entry.get("gy")
        if ex is None:
            continue
        # short approach from entry to avenue (vertical then join)
        for cell in ortho_corridor(ex, ey, ex, avenue_y):
            if 0 <= cell[0] < W and 0 <= cell[1] < H:
                path.add(cell)
        # one step in front of door (south) if free
        if ey + 1 < H:
            path.add((ex, ey + 1))

    # N–S connector under parlement/chateau gap → avenue already via esplanade
    return path


# ── trees (always complete pairs) ───────────────────────────────────────────


def place_trees(ground, sheet, roles, free, W, H, rng):
    """Place full trees only: canopy over trunk. Never orphan."""
    canopy = first(roles, "tree_canopy")
    trunk = first(roles, "tree_trunk")
    canopy_alt = first(roles, "tree_canopy_alt")
    trunk_alt = first(roles, "tree_trunk_alt")

    def try_tree(tx, ty, autumn=False):
        if ty + 1 >= H:
            return False
        if (tx, ty) not in free or (tx, ty + 1) not in free:
            return False
        c, t = (canopy_alt, trunk_alt) if autumn else (canopy, trunk)
        paste(ground, sheet, c, tx, ty)
        paste(ground, sheet, t, tx, ty + 1)
        free.discard((tx, ty))
        free.discard((tx, ty + 1))
        return True

    # North forest band (rows 0–1 need height 2 → place canopy at 0, trunk at 1)
    for tx in range(0, W):
        if rng.random() < 0.75:
            try_tree(tx, 0, autumn=rng.random() < 0.12)

    # East woods
    for ty in range(2, H - 5, 2):
        for tx in range(W - 3, W):
            if rng.random() < 0.7:
                try_tree(tx, ty, autumn=rng.random() < 0.1)

    # West edge
    for ty in range(2, 12, 2):
        for tx in range(0, 2):
            if rng.random() < 0.55:
                try_tree(tx, ty)

    # No sparse park trees in the campus core — keeps path corridors clean.
    # Only edge forests (N / E / W) above.


# ── buildings ───────────────────────────────────────────────────────────────


def stamp_building(roofs, sheet, s, recipe, roles, rng, dept_tint=None):
    """Sample1 house: roof-dominant mass + short south facade (walls/door/windows)."""
    gx, gy, fw, fh = s["gx"], s["gy"], s["fw"], s["fh"]
    wall_rows = int(recipe.get("wall_rows", 2))
    wall_rows = max(1, min(wall_rows, fh - 1))
    roof_rows = fh - wall_rows
    win_every = int(recipe.get("window_every", 3))
    strength = float(recipe.get("tint_strength", 0.25))

    peak_l = first(roles, "roof_peak_l")
    peak_r = first(roles, "roof_peak_r")
    ridge = roles["roof_ridge"]["ids"]
    roof_fill = roles["roof_fill"]["ids"]
    eave_l = roles["roof_eave_l"]["ids"]
    eave_r = roles["roof_eave_r"]["ids"]
    wall_fill = roles["wall_fill"]["ids"]
    wall_top = roles["wall_top"]["ids"]
    door = first(roles, "door")
    windows = roles["window"]["ids"]

    tw = as_rgb(recipe.get("tint_wall") or dept_tint)
    tr = as_rgb(recipe.get("tint_roof") or dept_tint)

    entry = s.get("entry") or {}
    ex, ey = entry.get("gx"), entry.get("gy")

    for ty in range(gy, gy + fh):
        for tx in range(gx, gx + fw):
            ly = ty - gy
            lx = tx - gx
            is_left = lx == 0
            is_right = lx == fw - 1
            is_bottom = ly == fh - 1

            # ── roof (dominates footprint) ──
            if ly < roof_rows:
                if roof_rows == 1:
                    if is_left:
                        idx = peak_l
                    elif is_right:
                        idx = peak_r
                    else:
                        idx = pick(rng, roof_fill)
                else:
                    # top row = peaks / ridge; lower roof rows = body / eaves
                    if ly == 0:
                        if is_left:
                            idx = peak_l
                        elif is_right:
                            idx = peak_r
                        else:
                            idx = pick(rng, ridge)
                    elif ly == roof_rows - 1:
                        if is_left:
                            idx = pick(rng, eave_l)
                        elif is_right:
                            idx = pick(rng, eave_r)
                        else:
                            idx = pick(rng, roof_fill)
                    else:
                        idx = pick(rng, roof_fill)
                paste(roofs, sheet, idx, tx, ty, tr, strength)
                continue

            # ── facade wall rows only ──
            # Door: prefer world entry tile if on facade; else south-center
            if ex is not None and tx == ex and ty == ey:
                paste(roofs, sheet, door, tx, ty)
                continue
            if is_bottom and ex is None and lx == fw // 2:
                paste(roofs, sheet, door, tx, ty)
                continue
            # If entry is on this building but not on bottom row, still door on bottom under entry x
            if is_bottom and ex is not None and tx == ex:
                paste(roofs, sheet, door, tx, ty)
                continue

            # Windows: SOUTH facade only (bottom wall row), not corners, spaced
            on_south_facade = is_bottom or ly == fh - 2
            if (
                on_south_facade
                and not is_left
                and not is_right
                and not (is_bottom and ex is not None and tx == ex)
                and win_every > 0
                and (lx % win_every) == (win_every // 2)
            ):
                # only one window row: the upper facade row (under roof) looks best
                if ly == roof_rows:
                    paste(roofs, sheet, pick(rng, windows), tx, ty, tw, strength * 0.45)
                    continue

            # Wall tiles
            if ly == roof_rows:
                idx = pick(rng, wall_top)
            else:
                idx = pick(rng, wall_fill)
            paste(roofs, sheet, idx, tx, ty, tw if ly == roof_rows else None, strength if ly == roof_rows else 0.0)

    # Soft outline
    d = ImageDraw.Draw(roofs)
    base = tw or (100, 88, 70)
    d.rectangle(
        [gx * TW, gy * TW, (gx + fw) * TW - 1, (gy + fh) * TW - 1],
        outline=(base[0], base[1], base[2], 160),
    )


def room_layouts(site):
    gx, gy, fw, fh = site["gx"], site["gy"], site["fw"], site["fh"]
    rooms = site.get("rooms") or []
    kind = site.get("kind")
    out = []

    def add(r, rx, ry, rw, rh):
        out.append(
            {
                "id": r["id"],
                "gx": gx + rx,
                "gy": gy + ry,
                "fw": max(1, rw),
                "fh": max(1, rh),
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
        rh0 = max(1, fh // n)
        for i, r in enumerate(rooms):
            ry = i * rh0
            rh = rh0 if i < n - 1 else fh - ry
            add(r, 0, ry, fw, rh)
        return out
    return out


def stamp_interior(interiors, sheet, s, roles, rng):
    """Indoor floors + sparse props. No windows. No outdoor paving."""
    kind = s.get("kind")
    rooms = room_layouts(s) or [
        {"id": s["id"], "gx": s["gx"], "gy": s["gy"], "fw": s["fw"], "fh": s["fh"]}
    ]
    chairs = roles["chair"]["ids"]
    tables = roles["table"]["ids"]
    cabinets = roles["cabinet"]["ids"]

    for rh in rooms:
        rid = rh["id"]
        # Floor choice by room type — NEVER cobble/path
        if rid == "plenum-gc":
            floor_ids = roles["floor_wood"]["ids"]
            use_carpet = True
        elif kind == "department":
            floor_ids = roles["floor_wood"]["ids"]  # wood only for depts
            use_carpet = False
        elif kind == "chateau":
            floor_ids = roles["floor_beige"]["ids"]
            use_carpet = False
        elif rid in ("pas-perdus",):
            floor_ids = roles["floor_stone_indoor"]["ids"]
            use_carpet = False
        else:
            floor_ids = roles["floor_wood"]["ids"]
            use_carpet = False

        floor_id = pick(rng, floor_ids)
        for ty in range(rh["gy"], rh["gy"] + rh["fh"]):
            for tx in range(rh["gx"], rh["gx"] + rh["fw"]):
                paste(interiors, sheet, floor_id, tx, ty)

        if use_carpet and rh["fw"] >= 4 and rh["fh"] >= 4:
            cg = first(roles, "carpet_green")
            for ty in range(rh["gy"] + 1, rh["gy"] + rh["fh"] - 1):
                for tx in range(rh["gx"] + 1, rh["gx"] + rh["fw"] - 1):
                    paste(interiors, sheet, cg, tx, ty)
            cx = rh["gx"] + rh["fw"] // 2
            cy = rh["gy"] + rh["fh"] // 2
            paste(interiors, sheet, pick(rng, tables), cx, cy)
            if chairs and rh["fw"] >= 5:
                paste(interiors, sheet, pick(rng, chairs), cx - 1, cy)
                paste(interiors, sheet, pick(rng, chairs), cx + 1, cy)
            continue

        # Sparse props — max 2–3, never flood, never windows
        if rh["fw"] >= 2 and rh["fh"] >= 2 and chairs:
            paste(interiors, sheet, pick(rng, chairs), rh["gx"] + 1, rh["gy"] + 1)
        if rh["fw"] >= 3 and rh["fh"] >= 3 and tables:
            paste(
                interiors,
                sheet,
                pick(rng, tables),
                rh["gx"] + rh["fw"] // 2,
                rh["gy"] + rh["fh"] // 2,
            )
        # cabinets only if room large enough and not a 1-tile-wide corridor room
        if (
            cabinets
            and rh["fw"] >= 3
            and rh["fh"] >= 3
            and kind != "department"
            and rng.random() < 0.45
        ):
            paste(
                interiors,
                sheet,
                pick(rng, cabinets),
                rh["gx"] + rh["fw"] - 2,
                rh["gy"] + 1,
            )


# ── main ────────────────────────────────────────────────────────────────────


def build():
    pb = json.loads(PLAYBOOK.read_text(encoding="utf-8"))
    roles = pb["roles"]
    recipes = pb["building_recipes"]
    world = json.loads(WORLD.read_text(encoding="utf-8"))
    W, H = world["grid"]["w"], world["grid"]["h"]
    sites = world["sites"]
    esplanade = world.get("esplanade") or {}
    rng = random.Random(11)
    sheet = load_sheet()

    grass = first(roles, "grass")
    path_body = first(roles, "path_body")
    water = first(roles, "water_fill")
    cobble = first(roles, "cobble")

    print("Roguelike v4 — texture discipline")
    print("  tree pair:", first(roles, "tree_canopy"), "+", first(roles, "tree_trunk"))
    print("  path mono:", path_body)
    print("  wall facade:", roles["wall_fill"]["ids"], roles["wall_top"]["ids"])
    print("  indoor dept floor:", roles["floor_wood"]["ids"])

    occupied = set()
    for s in sites:
        for x in range(s["gx"], s["gx"] + s["fw"]):
            for y in range(s["gy"], s["gy"] + s["fh"]):
                occupied.add((x, y))

    path_cells = build_path_set(sites, esplanade, W, H)
    # paths do not run under building interiors (stop at facade)
    path_cells -= occupied

    ground = Image.new("RGBA", (W * TW, H * TW), (50, 120, 60, 255))
    roofs = Image.new("RGBA", (W * TW, H * TW), (0, 0, 0, 0))
    interiors = Image.new("RGBA", (W * TW, H * TW), (0, 0, 0, 0))

    # 1) base terrain
    for ty in range(H):
        for tx in range(W):
            if ty >= H - 2:
                paste(ground, sheet, water, tx, ty)
            elif ty == H - 3:
                paste(ground, sheet, path_body, tx, ty)  # shore as dirt band
            else:
                paste(ground, sheet, grass, tx, ty)

    # 2) esplanade cobble (outdoor plaza only)
    if esplanade:
        for ty in range(esplanade["gy0"], esplanade["gy1"] + 1):
            for tx in range(esplanade["gx0"], esplanade["gx1"] + 1):
                if (tx, ty) not in occupied:
                    paste(ground, sheet, cobble, tx, ty)

    # 3) mono-tile path tunnels
    for tx, ty in path_cells:
        if 0 <= tx < W and 0 <= ty < H and ty < H - 2:
            paste(ground, sheet, path_body, tx, ty)

    # 4) dirt apron only 1 cell under building footprint edge (not full fill)
    for s in sites:
        for tx in range(s["gx"], s["gx"] + s["fw"]):
            ty = s["gy"] + s["fh"]  # just south of building
            if ty < H - 2 and (tx, ty) not in occupied:
                paste(ground, sheet, path_body, tx, ty)
                path_cells.add((tx, ty))

    # free cells for trees = grass, not path, not occupied, not water/shore
    free = set()
    for ty in range(0, H - 3):
        for tx in range(W):
            if (tx, ty) in occupied:
                continue
            if (tx, ty) in path_cells:
                continue
            if esplanade and (
                esplanade["gx0"] <= tx <= esplanade["gx1"]
                and esplanade["gy0"] <= ty <= esplanade["gy1"]
            ):
                continue
            free.add((tx, ty))

    # 5) trees as complete pairs only
    place_trees(ground, sheet, roles, free, W, H, rng)

    # 6) buildings
    dept_tints = {}
    for d in world.get("namedDepartments") or []:
        if str(d.get("deptTint", "")).startswith("#"):
            h = d["deptTint"].lstrip("#")
            dept_tints[d["id"]] = tuple(int(h[i : i + 2], 16) for i in (0, 2, 4))

    for s in sites:
        kind = s.get("kind")
        recipe = recipes.get(kind) or recipes["department"]
        stamp_building(roofs, sheet, s, recipe, roles, rng, dept_tints.get(s["id"]))
        stamp_interior(interiors, sheet, s, roles, rng)

    # esplanade marker (door tile as archway accent — outdoor)
    if esplanade:
        sx = (esplanade["gx0"] + esplanade["gx1"]) // 2
        sy = (esplanade["gy0"] + esplanade["gy1"]) // 2
        if (sx, sy) not in occupied:
            paste(roofs, sheet, first(roles, "door"), sx, sy, (201, 164, 92), 0.3)

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

    # proof sheet
    pairs = [
        ("grass", [grass]),
        ("path", [path_body]),
        ("water", [water]),
        ("cobble", [cobble]),
        ("treeC", [first(roles, "tree_canopy")]),
        ("treeT", [first(roles, "tree_trunk")]),
        ("wall", roles["wall_fill"]["ids"]),
        ("wallT", roles["wall_top"]["ids"]),
        ("roof", roles["roof_fill"]["ids"][:3]),
        ("door", [first(roles, "door")]),
        ("win", roles["window"]["ids"]),
        ("wood", roles["floor_wood"]["ids"]),
        ("chair", roles["chair"]["ids"][:4]),
        ("table", roles["table"]["ids"][:4]),
    ]
    img = Image.new("RGBA", (260, len(pairs) * 22), (18, 20, 26, 255))
    dr = ImageDraw.Draw(img)
    for ri, (name, ids) in enumerate(pairs):
        dr.text((2, ri * 22 + 4), name, fill=(230, 230, 240))
        for ci, idx in enumerate(ids[:8]):
            t = get_tile(sheet, idx)
            img.paste(t, (70 + ci * 18, ri * 22 + 3), t)
    # tree pair visual
    img.paste(get_tile(sheet, first(roles, "tree_canopy")), (200, 4 * 22 + 3), get_tile(sheet, first(roles, "tree_canopy")))
    img.paste(get_tile(sheet, first(roles, "tree_trunk")), (200, 5 * 22 + 3), get_tile(sheet, first(roles, "tree_trunk")))
    img.save(OUT / "role_usage_sheet.png")

    meta = {
        "tile": TW,
        "width": W * TW,
        "height": H * TW,
        "grid": {"w": W, "h": H},
        "source": "roguelike-rpg-pack",
        "playbook": "roguelike_playbook.json v4",
        "packs": ["Roguelike RPG Pack — Kenney CC0 (sole art source)"],
        "credit": "Assets by Kenney (www.kenney.nl) CC0 — Roguelike RPG Pack only.",
        "da": {
            "trees": "pair canopy+trunk only",
            "paths": "mono 408 orthogonal tunnels",
            "buildings": "roof-dominant + 2-row facade walls",
            "windows": "south facade only",
            "interiors": "wood/beige floors; no paving",
        },
        "layers": {
            "ground": "ground.png",
            "roofs": "roofs.png",
            "interiors": "interiors.png",
        },
    }
    (OUT / "meta.json").write_text(json.dumps(meta, indent=2), encoding="utf-8")
    (OUT / "CREDITS.txt").write_text(
        "Roguelike RPG Pack by Kenney (www.kenney.nl)\n"
        "License: CC0 1.0 Universal\n"
        "https://kenney.nl/assets/roguelike-rpg-pack\n"
        "Playbook v4 — Sample1 texture discipline.\n",
        encoding="utf-8",
    )
    print("OK roguelike v4", W, "x", H, "paths", len(path_cells))


if __name__ == "__main__":
    build()
