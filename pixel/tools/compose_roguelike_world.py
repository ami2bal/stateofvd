#!/usr/bin/env python3
"""Compose world using ONLY Kenney Roguelike RPG Pack — Sample1/2 language.

DA rules (playbook v3):
  - Structure tiles only for walls/roofs (beige 872/873, brown roof kit).
  - Furniture is props only (sparse, never flood-fill).
  - Terrain from sample_map frequencies (grass 62, dirt 408/465, water 60, trees 586/643).
  - Buildings stamped as modular kits (peak + roof body + walls + door/window).
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


def stamp_building(roofs, sheet, s, recipe, roles, rng, dept_tint=None):
    """Modular Kenney house: roof peaks + brown body + beige walls + door/window."""
    gx, gy, fw, fh = s["gx"], s["gy"], s["fw"], s["fh"]
    rr = int(recipe.get("roof_rows", 2))
    if s.get("kind") == "department":
        rr = 1
    rr = max(1, min(rr, fh - 1))

    wall_ids = roles[recipe["wall"]]["ids"]
    roof_fill_ids = roles[recipe["roof_fill"]]["ids"]
    peak_l = first(roles, "roof_peak_l")
    peak_r = first(roles, "roof_peak_r")
    eave_l = pick(rng, roles["roof_eave_l"]["ids"])
    eave_r = pick(rng, roles["roof_eave_r"]["ids"])
    mid_ids = roles["roof_mid"]["ids"]
    door = first(roles, recipe.get("door", "door"))
    win_ids = roles[recipe.get("window", "window")]["ids"]
    win_every = int(recipe.get("window_every", 3))
    strength = float(recipe.get("tint_strength", 0.28))

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

            # --- roof ---
            if ly < rr:
                if rr == 1:
                    if is_left:
                        idx = peak_l
                    elif is_right:
                        idx = peak_r
                    else:
                        idx = pick(rng, roof_fill_ids)
                else:
                    # row 0 = peaks / ridge, row 1 = eaves / body
                    if ly == 0:
                        if is_left:
                            idx = peak_l
                        elif is_right:
                            idx = peak_r
                        else:
                            idx = pick(rng, mid_ids or roof_fill_ids)
                    else:
                        if is_left:
                            idx = eave_l
                        elif is_right:
                            idx = eave_r
                        else:
                            idx = pick(rng, roof_fill_ids)
                paste(roofs, sheet, idx, tx, ty, tr, strength)
                continue

            # --- door on entry tile ---
            if ex is not None and ey is not None and tx == ex and ty == ey:
                paste(roofs, sheet, door, tx, ty)
                continue

            # --- windows on first wall row under roof (not corners of small depts) ---
            if ly == rr and win_every > 0 and not is_left and not is_right:
                if (lx % win_every) == (win_every // 2):
                    paste(roofs, sheet, pick(rng, win_ids), tx, ty, tw, strength * 0.5)
                    continue

            # --- solid wall ---
            wall = pick(rng, wall_ids)
            paste(roofs, sheet, wall, tx, ty, tw if ly == rr else None, strength if ly == rr else 0.0)

    # subtle outline so buildings read as blocks at zoom-out
    d = ImageDraw.Draw(roofs)
    base = tw or (90, 78, 60)
    d.rectangle(
        [gx * TW, gy * TW, (gx + fw) * TW - 1, (gy + fh) * TW - 1],
        outline=(base[0], base[1], base[2], 180),
    )


def stamp_interior(interiors, sheet, s, roles, rng):
    kind = s.get("kind")
    rooms = room_layouts(s)
    if not rooms:
        # fallback: whole footprint as one room
        rooms = [
            {
                "id": s["id"],
                "gx": s["gx"],
                "gy": s["gy"],
                "fw": s["fw"],
                "fh": s["fh"],
            }
        ]

    chairs = roles["furniture_chair"]["ids"]
    tables = roles["furniture_table"]["ids"]
    cabinets = roles.get("furniture_cabinet", {}).get("ids") or []

    for rh in rooms:
        rid = rh["id"]
        if rid == "plenum-gc":
            floor_ids = roles["floor_wood"]["ids"]
            carpet = True
        elif kind == "chateau":
            floor_ids = roles["floor_beige"]["ids"]
            carpet = False
        elif kind == "parlement":
            floor_ids = roles["floor_stone"]["ids"]
            carpet = False
        else:
            floor_ids = roles["floor_stone"]["ids"]
            carpet = False

        floor_id = pick(rng, floor_ids)
        for ty in range(rh["gy"], rh["gy"] + rh["fh"]):
            for tx in range(rh["gx"], rh["gx"] + rh["fw"]):
                paste(interiors, sheet, floor_id, tx, ty)

        # green carpet inset for plenum (Sample2 board-room language)
        if carpet and rh["fw"] >= 4 and rh["fh"] >= 4:
            cg = first(roles, "carpet_green")
            for ty in range(rh["gy"] + 1, rh["gy"] + rh["fh"] - 1):
                for tx in range(rh["gx"] + 1, rh["gx"] + rh["fw"] - 1):
                    paste(interiors, sheet, cg, tx, ty)
            cx = rh["gx"] + rh["fw"] // 2
            cy = rh["gy"] + rh["fh"] // 2
            paste(interiors, sheet, pick(rng, tables), cx, cy)
            if rh["fw"] >= 5 and chairs:
                paste(interiors, sheet, pick(rng, chairs), cx - 1, cy)
                paste(interiors, sheet, pick(rng, chairs), cx + 1, cy)
                if rh["fh"] >= 5:
                    paste(interiors, sheet, pick(rng, chairs), cx, cy - 1)
                    paste(interiors, sheet, pick(rng, chairs), cx, cy + 1)
            continue

        # sparse props only — max 3 per room, never flood
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
        if cabinets and rh["fw"] >= 3 and rh["fh"] >= 2 and rng.random() < 0.55:
            paste(
                interiors,
                sheet,
                pick(rng, cabinets),
                rh["gx"] + rh["fw"] - 2,
                rh["gy"] + 1,
            )


def build():
    pb = json.loads(PLAYBOOK.read_text(encoding="utf-8"))
    roles = pb["roles"]
    recipes = pb["building_recipes"]
    world = json.loads(WORLD.read_text(encoding="utf-8"))
    W, H = world["grid"]["w"], world["grid"]["h"]
    sites = world["sites"]
    esplanade = world.get("esplanade") or {}
    rng = random.Random(7)
    sheet = load_sheet()

    grass = roles["grass"]["ids"]
    dirt = roles["dirt_path"]["ids"]
    dirt_soft = roles["dirt_soft"]["ids"]
    water = roles["water_fill"]["ids"]
    tree = roles["tree"]["ids"]
    cobble = roles["cobble"]["ids"]

    print("Roguelike v3 — Sample1/2 language")
    for k in (
        "grass",
        "dirt_path",
        "water_fill",
        "tree",
        "wall_beige",
        "roof_fill",
        "door",
        "window",
    ):
        print(f"  {k}: {roles[k]['ids']}")

    occupied = set()
    for s in sites:
        for x in range(s["gx"], s["gx"] + s["fw"]):
            for y in range(s["gy"], s["gy"] + s["fh"]):
                occupied.add((x, y))

    ground = Image.new("RGBA", (W * TW, H * TW), (50, 120, 60, 255))
    roofs = Image.new("RGBA", (W * TW, H * TW), (0, 0, 0, 0))
    interiors = Image.new("RGBA", (W * TW, H * TW), (0, 0, 0, 0))

    # ---- terrain (Sample1 outdoor) ----
    for ty in range(H):
        for tx in range(W):
            # north forest band
            if ty <= 1:
                if ty == 1 and rng.random() < 0.55:
                    paste(ground, sheet, pick(rng, tree), tx, ty)
                else:
                    paste(ground, sheet, pick(rng, grass), tx, ty)
                continue
            # south lake
            if ty >= H - 2:
                paste(ground, sheet, pick(rng, water), tx, ty)
                continue
            # shore
            if ty == H - 3:
                paste(ground, sheet, pick(rng, dirt_soft if rng.random() < 0.4 else dirt), tx, ty)
                continue
            # east woods
            if tx >= W - 3 and 3 <= ty <= H - 5:
                if rng.random() < 0.65:
                    paste(ground, sheet, pick(rng, tree), tx, ty)
                else:
                    paste(ground, sheet, pick(rng, grass), tx, ty)
                continue
            # esplanade cobble
            if (
                esplanade
                and esplanade.get("gx0", 0) <= tx <= esplanade.get("gx1", 0)
                and esplanade.get("gy0", 0) <= ty <= esplanade.get("gy1", 0)
            ):
                paste(ground, sheet, pick(rng, cobble), tx, ty)
                continue
            # east-west path in front of depts
            if ty in (14, 15) and 2 <= tx <= 36:
                paste(ground, sheet, pick(rng, dirt), tx, ty)
                continue
            # under / around buildings + entries → dirt
            near = any(
                abs(tx - s["entry"]["gx"]) + abs(ty - s["entry"]["gy"]) <= 1 for s in sites
            )
            if near or (tx, ty) in occupied:
                paste(ground, sheet, pick(rng, dirt), tx, ty)
            elif (tx <= 1 or tx >= W - 4) and 2 <= ty <= 13 and rng.random() < 0.45:
                paste(ground, sheet, pick(rng, tree), tx, ty)
            else:
                paste(ground, sheet, pick(rng, grass), tx, ty)

    # ---- buildings ----
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

    # esplanade fountain / marker (door-like accent, not furniture flood)
    if esplanade:
        sx = (esplanade["gx0"] + esplanade["gx1"]) // 2
        sy = (esplanade["gy0"] + esplanade["gy1"]) // 2
        paste(roofs, sheet, first(roles, "door"), sx, sy, (201, 164, 92), 0.35)

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

    # role proof sheet
    pairs = [
        ("grass", roles["grass"]["ids"]),
        ("dirt", roles["dirt_path"]["ids"]),
        ("water", roles["water_fill"]["ids"]),
        ("tree", roles["tree"]["ids"]),
        ("wall", roles["wall_beige"]["ids"]),
        ("roofF", roles["roof_fill"]["ids"]),
        ("roofP", roles["roof_peak_l"]["ids"] + roles["roof_peak_r"]["ids"]),
        ("door", roles["door"]["ids"]),
        ("win", roles["window"]["ids"]),
        ("floor", roles["floor_stone"]["ids"]),
        ("chair", roles["furniture_chair"]["ids"]),
        ("table", roles["furniture_table"]["ids"]),
    ]
    img = Image.new("RGBA", (240, len(pairs) * 22), (18, 20, 26, 255))
    dr = ImageDraw.Draw(img)
    for ri, (name, ids) in enumerate(pairs):
        dr.text((2, ri * 22 + 4), name, fill=(230, 230, 240))
        for ci, idx in enumerate(ids[:10]):
            t = get_tile(sheet, idx)
            img.paste(t, (70 + ci * 18, ri * 22 + 3), t)
    img.save(OUT / "role_usage_sheet.png")

    meta = {
        "tile": TW,
        "width": W * TW,
        "height": H * TW,
        "grid": {"w": W, "h": H},
        "source": "roguelike-rpg-pack",
        "playbook": "roguelike_playbook.json v3",
        "packs": ["Roguelike RPG Pack — Kenney CC0 (sole art source)"],
        "credit": "Assets by Kenney (www.kenney.nl) CC0 — Roguelike RPG Pack only.",
        "da": "Sample1 outdoor + Sample2 indoor modular kit; furniture = props only",
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
        "Sole art pack for state-of-vd-pixel composed world (playbook v3).\n",
        encoding="utf-8",
    )
    print("OK roguelike v3", W, "x", H, "→", OUT)


if __name__ == "__main__":
    build()
