#!/usr/bin/env python3
"""
Compose world map using semantic_playbook.json (visual tile mapping).

Rules:
  - Never BAN / character tiles
  - Buildings = coherent modules (one wall id + one roof id per site)
  - Ground uses only grass/path/water/road/tree from playbook
"""
from __future__ import annotations

import json
import random
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
WORLD = ROOT.parent / "state-of-vd" / "data" / "world.json"
KENNEY = ROOT / "assets" / "kenney"
PLAYBOOK = KENNEY / "semantic_playbook.json"
OUT = ROOT / "assets" / "composed"
TILE = 16
SHOTS = ROOT / "assets" / "composed" / "shots"

FOLDERS = {
    "town": KENNEY / "tiny-town" / "Tiles",
    "urban": KENNEY / "rpg-urban-pack" / "Tiles",
    "dungeon": KENNEY / "tiny-dungeon" / "Tiles",
}


def load_pb():
    return json.loads(PLAYBOOK.read_text(encoding="utf-8"))


def resolve(pb, pack, keys):
    ids = []
    for k in keys:
        ids.extend(pb[pack].get(k, []))
    # filter existing
    out = []
    for i in ids:
        if (FOLDERS[pack] / f"tile_{i:04d}.png").exists():
            # ban check
            ban = set(pb[pack].get("BAN", []) + pb[pack].get("BAN_character", []) + pb[pack].get("BAN_busy", []))
            if i not in ban:
                out.append(i)
    return out


def load_tile(pack, idx):
    p = FOLDERS[pack] / f"tile_{idx:04d}.png"
    return Image.open(p).convert("RGBA")


def tint_tile(tile, rgb, strength=0.35):
    if not rgb or strength <= 0:
        return tile
    r, g, b = rgb
    colored = ImageChops.multiply(
        tile.convert("RGB"), Image.new("RGB", tile.size, (r, g, b))
    ).convert("RGBA")
    colored.putalpha(tile.split()[-1])
    return Image.blend(tile, colored, strength)


def paste(canvas, pack, idx, tx, ty, tint=None, strength=0.35):
    tile = load_tile(pack, idx)
    if tint:
        tile = tint_tile(tile, tint, strength)
    canvas.paste(tile, (tx * TILE, ty * TILE), tile)


def pick(rng, ids):
    return rng.choice(ids) if ids else None


def room_layouts(site):
    gx, gy, fw, fh = site["gx"], site["gy"], site["fw"], site["fh"]
    rooms = site.get("rooms") or []
    kind = site.get("kind")
    out = []

    def add(r, rx, ry, rw, rh):
        out.append({"id": r["id"], "gx": gx + rx, "gy": gy + ry, "fw": rw, "fh": rh})

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


def stamp_building(roofs_img, s, pb, rng, wall_ids, roof_ids, door_ids, pack_wall, pack_roof, tint):
    """Modular building: roof band + wall body + door on entry. Same tile ids across body."""
    gx, gy, fw, fh = s["gx"], s["gy"], s["fw"], s["fh"]
    wall_id = pick(rng, wall_ids)
    roof_id = pick(rng, roof_ids)
    door_id = pick(rng, door_ids) or wall_id
    if wall_id is None or roof_id is None:
        return

    # Majors: 2 roof rows; departments (fh~5): 1 roof row only
    kind = s.get("kind")
    roof_rows = 1 if kind == "department" or fh <= 5 else 2
    for ty in range(gy, gy + fh):
        for tx in range(gx, gx + fw):
            ly = ty - gy
            if ly < roof_rows:
                paste(roofs_img, pack_roof, roof_id, tx, ty, tint=tint, strength=0.38)
            elif tx == s["entry"]["gx"] and ty == s["entry"]["gy"]:
                paste(roofs_img, "town", door_id, tx, ty)
            else:
                strength = 0.28 if ly == roof_rows else 0.0
                paste(
                    roofs_img,
                    pack_wall,
                    wall_id,
                    tx,
                    ty,
                    tint=tint if strength else None,
                    strength=strength,
                )

    # outline for readability
    draw = ImageDraw.Draw(roofs_img)
    x0, y0 = gx * TILE, gy * TILE
    x1, y1 = (gx + fw) * TILE - 1, (gy + fh) * TILE - 1
    col = (tint[0], tint[1], tint[2], 230) if tint else (30, 40, 55, 200)
    draw.rectangle([x0, y0, x1, y1], outline=col)


def build():
    pb = load_pb()
    world = json.loads(WORLD.read_text(encoding="utf-8"))
    W, H = world["grid"]["w"], world["grid"]["h"]
    sites = world["sites"]
    esplanade = world.get("esplanade") or {}
    rng = random.Random(11)

    grass = resolve(pb, "town", ["grass_fill"])
    tree = resolve(pb, "town", ["tree"])
    path = resolve(pb, "town", ["path_fill"])
    water = resolve(pb, "town", ["water"])
    road = [i for i in resolve(pb, "urban", ["sidewalk"]) if i in range(8, 16)]
    wall_brick = resolve(pb, "urban", ["brick_wall"])
    wall_house = resolve(pb, "town", ["house_wall"])
    # Flat roof = urban red roof tiles 43-49 only
    roof_flat = [i for i in resolve(pb, "urban", ["brick_roof"]) if i in range(43, 50)]
    door_house = resolve(pb, "town", ["house_door"])
    floor = resolve(pb, "dungeon", ["floor_dark"])
    furniture = resolve(pb, "dungeon", ["furniture_ok"])
    path = [i for i in path if i in (12, 13, 14, 24, 36, 37, 38)]
    tree = [i for i in tree if i in (4, 5, 6, 7, 8, 16, 17, 19, 30, 31, 32)]

    assert grass and path and water and road and wall_brick and roof_flat, (
        f"missing roles grass={grass} path={path} water={water} road={road} "
        f"brick={wall_brick} roof={roof_flat}"
    )

    print("SEMANTIC PLAYBOOK v2 (curated)")
    print("  grass", grass)
    print("  path", path)
    print("  water", water)
    print("  road", road)
    print("  brick", wall_brick)
    print("  house_wall", wall_house)
    print("  roof_flat", roof_flat)
    print("  door", door_house)
    print("  floor", floor)
    print("  furniture", furniture)
    roof_house = roof_flat  # used below

    occupied = set()
    for s in sites:
        for x in range(s["gx"], s["gx"] + s["fw"]):
            for y in range(s["gy"], s["gy"] + s["fh"]):
                occupied.add((x, y))

    ground = Image.new("RGBA", (W * TILE, H * TILE), (20, 40, 30, 255))
    roofs_img = Image.new("RGBA", (W * TILE, H * TILE), (0, 0, 0, 0))
    interiors = Image.new("RGBA", (W * TILE, H * TILE), (0, 0, 0, 0))

    # ── Ground (semantic only) ──
    for ty in range(H):
        for tx in range(W):
            if ty <= 1:
                paste(ground, "town", pick(rng, tree if ty == 1 and rng.random() < 0.7 else grass), tx, ty)
                continue
            if ty >= H - 2:
                paste(ground, "town", pick(rng, water), tx, ty)
                continue
            if ty == H - 3:
                paste(ground, "town", pick(rng, path), tx, ty)
                continue
            # east foliage strip
            if tx >= W - 3 and 3 <= ty <= H - 5:
                paste(ground, "town", pick(rng, tree), tx, ty)
                continue
            # esplanade = urban sidewalk
            if (
                esplanade
                and esplanade.get("gx0", 0) <= tx <= esplanade.get("gx1", 0)
                and esplanade.get("gy0", 0) <= ty <= esplanade.get("gy1", 0)
            ):
                paste(ground, "urban", pick(rng, road), tx, ty)
                continue
            # avenue
            if ty in (14, 15) and 2 <= tx <= 36:
                paste(ground, "urban", pick(rng, road), tx, ty)
                continue
            # entry approach
            near = any(
                abs(tx - s["entry"]["gx"]) + abs(ty - s["entry"]["gy"]) <= 1 for s in sites
            )
            if near or (tx, ty) in occupied:
                paste(ground, "town", pick(rng, path), tx, ty)
            elif (tx <= 1 or tx >= W - 4) and 2 <= ty <= 13 and rng.random() < 0.55:
                paste(ground, "town", pick(rng, tree), tx, ty)
            else:
                paste(ground, "town", pick(rng, grass), tx, ty)

    # ── Buildings ──
    tints = {"parlement": (70, 140, 95), "chateau": (220, 180, 95)}
    dept_tints = {}
    for d in world.get("namedDepartments") or []:
        if str(d.get("deptTint", "")).startswith("#"):
            h = d["deptTint"].lstrip("#")
            dept_tints[d["id"]] = tuple(int(h[i : i + 2], 16) for i in (0, 2, 4))

    for s in sites:
        kind = s.get("kind")
        tint = tints.get(kind) or dept_tints.get(s["id"])
        if kind == "parlement":
            stamp_building(
                roofs_img, s, pb, rng, wall_brick, roof_flat, door_house, "urban", "urban", tint
            )
        elif kind == "chateau":
            stamp_building(
                roofs_img, s, pb, rng, wall_brick, roof_flat, door_house, "urban", "urban", tint
            )
        else:
            stamp_building(
                roofs_img,
                s,
                pb,
                rng,
                wall_house or wall_brick,
                roof_flat,
                door_house,
                "town" if wall_house else "urban",
                "urban",
                tint,
            )

        # interiors: uniform floor + 2 furniture per room max
        floor_id = pick(rng, floor)
        for rh in room_layouts(s):
            for ty in range(rh["gy"], rh["gy"] + rh["fh"]):
                for tx in range(rh["gx"], rh["gx"] + rh["fw"]):
                    paste(interiors, "dungeon", floor_id, tx, ty)
            if furniture and rh["fw"] >= 2 and rh["fh"] >= 2:
                paste(interiors, "dungeon", pick(rng, furniture), rh["gx"] + 1, rh["gy"] + 1)
                if rh["fw"] > 3:
                    paste(
                        interiors,
                        "dungeon",
                        pick(rng, furniture),
                        rh["gx"] + rh["fw"] - 2,
                        rh["gy"] + rh["fh"] - 2,
                    )

    # landmark on esplanade
    if esplanade and door_house:
        sx = (esplanade["gx0"] + esplanade["gx1"]) // 2
        sy = (esplanade["gy0"] + esplanade["gy1"]) // 2
        paste(roofs_img, "town", pick(rng, door_house), sx, sy, tint=(201, 164, 92), strength=0.45)

    OUT.mkdir(parents=True, exist_ok=True)
    ground.save(OUT / "ground.png")
    roofs_img.save(OUT / "roofs.png")
    interiors.save(OUT / "interiors.png")

    prev = ground.copy()
    prev.alpha_composite(roofs_img)
    prev.save(OUT / "preview_roofs.png")
    prev2 = ground.copy()
    prev2.alpha_composite(interiors)
    prev2.save(OUT / "preview_interiors.png")

    # semantic verification sheet: one example per role
    make_role_sheet(pb, grass, tree, path, water, road, wall_brick, roof_house, door_house, floor, furniture)

    meta = {
        "tile": TILE,
        "width": W * TILE,
        "height": H * TILE,
        "grid": {"w": W, "h": H},
        "source": "kenney-semantic-v2",
        "playbook": "semantic_playbook.json",
        "packs": [
            "Tiny Town (Kenney CC0)",
            "RPG Urban Pack (Kenney CC0) — sidewalk + brick only",
            "Tiny Dungeon (Kenney CC0) — floors/furniture",
        ],
        "credit": "Assets by Kenney (www.kenney.nl) CC0. Semantic composition State of VD.",
        "layers": {
            "ground": "ground.png",
            "roofs": "roofs.png",
            "interiors": "interiors.png",
        },
        "ids": {
            "grass": grass,
            "path": path,
            "water": water,
            "road": road,
            "brick": wall_brick,
            "roof": roof_house,
            "door": door_house,
            "floor": floor,
        },
    }
    (OUT / "meta.json").write_text(json.dumps(meta, indent=2), encoding="utf-8")
    (OUT / "CREDITS.txt").write_text(
        "Assets by Kenney (www.kenney.nl) — CC0\n"
        "Packs: RPG Urban Pack, Tiny Town, Tiny Dungeon\n"
        "Map layout: state-of-vd world.json\n"
        "Tile roles: assets/kenney/semantic_playbook.json\n",
        encoding="utf-8",
    )
    print("OK semantic compose", W, "x", H)


def make_role_sheet(pb, grass, tree, path, water, road, brick, roof, door, floor, furniture):
    """Export a single strip proving which tiles we use for each role."""
    roles = [
        ("grass", "town", grass),
        ("tree", "town", tree),
        ("path", "town", path),
        ("water", "town", water),
        ("road", "urban", road),
        ("brick", "urban", brick),
        ("roof", "urban", roof),  # flat urban roofs
        ("door", "town", door),
        ("floor", "dungeon", floor),
        ("furn", "dungeon", furniture),
    ]
    cell = 20
    img = Image.new("RGBA", (max(len(ids) for _, _, ids in roles) * cell + 80, len(roles) * cell), (16, 18, 24, 255))
    draw = ImageDraw.Draw(img)
    for ri, (name, pack, ids) in enumerate(roles):
        draw.text((2, ri * cell + 4), name, fill=(230, 230, 240))
        for ci, idx in enumerate(ids[:16]):
            t = load_tile(pack, idx)
            img.paste(t, (80 + ci * cell + 2, ri * cell + 2), t)
    OUT.mkdir(parents=True, exist_ok=True)
    img.save(OUT / "role_usage_sheet.png")
    print("OK role_usage_sheet.png")


if __name__ == "__main__":
    build()
