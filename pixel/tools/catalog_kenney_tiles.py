#!/usr/bin/env python3
"""
Cartographie sémantique des tuiles Kenney (Tiny Town, RPG Urban, Tiny Dungeon).

Produit :
  assets/kenney/semantic_catalog.json  — ids par rôle
  assets/kenney/semantic_atlas_*.png   — grilles annotées pour revue humaine
  assets/kenney/semantic_report.md     — résumé

Règles : une tuile = un rôle principal ; refus des personnages/props bruyants
dans les rôles structure (sol, mur, toit, route).
"""
from __future__ import annotations

import json
import math
from collections import defaultdict
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
KENNEY = ROOT / "assets" / "kenney"
OUT = KENNEY
TILE = 16

PACKS = {
    "town": KENNEY / "tiny-town" / "Tiles",
    "urban": KENNEY / "rpg-urban-pack" / "Tiles",
    "dungeon": KENNEY / "tiny-dungeon" / "Tiles",
}


def analyze(path: Path) -> dict:
    im = Image.open(path).convert("RGBA")
    px = list(im.getdata())
    solid = [(r, g, b, a) for r, g, b, a in px if a > 200]
    total = len(px)
    n = len(solid) or 1
    fill = len(solid) / total
    rs = [c[0] for c in solid]
    gs = [c[1] for c in solid]
    bs = [c[2] for c in solid]
    r = sum(rs) / n
    g = sum(gs) / n
    b = sum(bs) / n
    # variance luminance
    lum = [(0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) for c in solid]
    mean_l = sum(lum) / n
    var_l = sum((x - mean_l) ** 2 for x in lum) / n
    # unique-ish colors (quantize)
    q = set((c[0] // 32, c[1] // 32, c[2] // 32) for c in solid)
    # edge density: alpha transitions
    edges = 0
    w, h = im.size
    for y in range(h):
        for x in range(w):
            a = px[y * w + x][3]
            if x + 1 < w and (a > 200) != (px[y * w + x + 1][3] > 200):
                edges += 1
            if y + 1 < h and (a > 200) != (px[(y + 1) * w + x][3] > 200):
                edges += 1
    # saturated color ratio
    sat = 0
    for c in solid:
        mx, mn = max(c[0], c[1], c[2]), min(c[0], c[1], c[2])
        if mx - mn > 40:
            sat += 1
    sat_ratio = sat / n
    # skin-ish (characters)
    skin = sum(
        1
        for c in solid
        if c[0] > 140 and c[1] > 90 and c[1] < 180 and c[2] < 140 and c[0] > c[2] + 20
    ) / n
    # grey
    grey = sum(1 for c in solid if abs(c[0] - c[1]) < 18 and abs(c[1] - c[2]) < 18) / n
    # green vegetation
    green = sum(1 for c in solid if c[1] > c[0] + 12 and c[1] > c[2] + 8 and c[1] > 70) / n
    # blue water
    blue = sum(1 for c in solid if c[2] > c[0] + 10 and c[2] > c[1] and c[2] > 80) / n
    # red/brown roof-wall
    red = sum(1 for c in solid if c[0] > c[1] + 15 and c[0] > c[2] + 15 and c[0] > 100) / n
    # yellow/gold crop
    yellow = sum(
        1 for c in solid if c[0] > 160 and c[1] > 120 and c[2] < 120 and c[0] >= c[1]
    ) / n

    return {
        "fill": fill,
        "r": r,
        "g": g,
        "b": b,
        "var_l": var_l,
        "n_colors": len(q),
        "edges": edges,
        "sat_ratio": sat_ratio,
        "skin": skin,
        "grey": grey,
        "green": green,
        "blue": blue,
        "red": red,
        "yellow": yellow,
        "mean_l": mean_l,
    }


def classify(pack: str, idx: int, a: dict) -> list[str]:
    """Return zero or more semantic tags (primary first)."""
    tags = []
    # reject near-empty
    if a["fill"] < 0.15:
        return ["empty_or_deco"]

    # characters: skin + mid fill + high edges or high color count
    if a["skin"] > 0.12 and a["n_colors"] >= 4:
        return ["character"]
    if a["skin"] > 0.08 and a["edges"] > 25 and a["fill"] < 0.85:
        return ["character"]

    # vehicles / busy props: high edge + high variance + not nature
    if a["edges"] > 40 and a["var_l"] > 1800 and a["fill"] < 0.9 and a["green"] < 0.3:
        if a["grey"] < 0.5:
            return ["prop_busy"]

    # water
    if a["blue"] > 0.45 and a["fill"] > 0.7:
        tags.append("water")
        return tags

    # grass / foliage
    if a["green"] > 0.4 and a["fill"] > 0.5:
        if a["edges"] > 30 and a["fill"] < 0.85:
            tags.append("tree_or_bush")
        else:
            tags.append("grass")
        return tags

    # crops / autumn foliage (orange-yellow tall plants)
    if a["yellow"] > 0.25 and a["green"] < 0.35 and pack == "town":
        if a["edges"] > 20:
            tags.append("crop_or_foliage")
            return tags

    # grey roads / sidewalks — urban only preferred
    if a["grey"] > 0.55 and a["fill"] > 0.85 and a["var_l"] < 1200:
        if 100 < a["mean_l"] < 200:
            tags.append("road_or_sidewalk")
            return tags

    # dirt / path (brown-tan full fill)
    if (
        a["fill"] > 0.85
        and a["r"] > 140
        and a["g"] > 110
        and a["b"] < 130
        and a["red"] < 0.5
        and a["var_l"] < 1500
    ):
        tags.append("dirt_path")
        return tags

    # roof red-orange solid-ish
    if a["red"] > 0.35 and a["fill"] > 0.7 and a["r"] > 150:
        if a["var_l"] < 2500:
            tags.append("roof")
            return tags

    # brick / wall red-brown
    if a["red"] > 0.3 and a["fill"] > 0.8 and 80 < a["r"] < 200:
        tags.append("wall_brick")
        return tags

    # stone wall grey-brown mid
    if a["fill"] > 0.75 and 80 < a["mean_l"] < 160 and a["grey"] > 0.25 and a["sat_ratio"] < 0.5:
        if a["var_l"] < 2000:
            tags.append("wall_stone")
            return tags

    # wood brown
    if a["fill"] > 0.5 and a["r"] > 100 and a["g"] < 120 and a["b"] < 100 and a["red"] > 0.2:
        if a["skin"] < 0.08:
            tags.append("wood")
            return tags

    # interior floor (dungeon): medium grey/brown full
    if pack == "dungeon" and a["fill"] > 0.85 and a["var_l"] < 1800:
        tags.append("floor_interior")
        return tags

    # furniture / interior prop — partial fill, dungeon
    if pack == "dungeon" and 0.2 < a["fill"] < 0.85 and a["skin"] < 0.1:
        tags.append("furniture")
        return tags

    # flowers / sparse deco on grass-ish
    if a["fill"] < 0.5 and a["sat_ratio"] > 0.3 and a["green"] > 0.15:
        tags.append("deco_nature")
        return tags

    # remaining full tiles as generic fill
    if a["fill"] > 0.9 and a["var_l"] < 800:
        tags.append("solid_fill")
        return tags

    tags.append("unsorted")
    return tags


def catalog_pack(pack: str, folder: Path) -> dict:
    roles = defaultdict(list)
    details = []
    tiles = sorted(folder.glob("tile_*.png"), key=lambda p: int(p.stem.split("_")[1]))
    for p in tiles:
        idx = int(p.stem.split("_")[1])
        a = analyze(p)
        tags = classify(pack, idx, a)
        primary = tags[0] if tags else "unsorted"
        roles[primary].append(idx)
        details.append({"id": idx, "tags": tags, "metrics": {k: round(v, 2) if isinstance(v, float) else v for k, v in a.items()}})
    return {"roles": dict(roles), "tiles": details}


def draw_atlas(pack: str, folder: Path, roles: dict, path: Path, max_per_role=24):
    """One row per semantic role with tile samples + labels."""
    role_order = [
        "grass",
        "tree_or_bush",
        "crop_or_foliage",
        "dirt_path",
        "road_or_sidewalk",
        "water",
        "roof",
        "wall_brick",
        "wall_stone",
        "wood",
        "floor_interior",
        "furniture",
        "deco_nature",
        "solid_fill",
        "character",
        "prop_busy",
        "unsorted",
        "empty_or_deco",
    ]
    rows = [r for r in role_order if r in roles and roles[r]]
    # also any extra keys
    for r in roles:
        if r not in rows and roles[r]:
            rows.append(r)

    cell = 18
    label_w = 120
    cols = max_per_role
    img = Image.new("RGBA", (label_w + cols * cell, len(rows) * cell + 4), (24, 28, 36, 255))
    draw = ImageDraw.Draw(img)
    try:
        font = ImageFont.load_default()
    except Exception:
        font = None

    for ri, role in enumerate(rows):
        ids = roles[role][:max_per_role]
        y = ri * cell
        draw.text((4, y + 4), f"{role} ({len(roles[role])})", fill=(220, 220, 230), font=font)
        for ci, idx in enumerate(ids):
            tile = Image.open(folder / f"tile_{idx:04d}.png").convert("RGBA")
            img.paste(tile, (label_w + ci * cell + 1, y + 1), tile)
            # tiny id
            draw.text(
                (label_w + ci * cell + 1, y + cell - 8),
                str(idx),
                fill=(255, 255, 0, 180),
                font=font,
            )
    img.save(path)
    print("atlas", path.name, "rows", len(rows))


def main():
    catalog = {
        "version": 1,
        "tile": TILE,
        "packs": {},
        "usage": {
            "ground.grass": {"pack": "town", "role": "grass"},
            "ground.tree": {"pack": "town", "role": "tree_or_bush"},
            "ground.crop": {"pack": "town", "role": "crop_or_foliage"},
            "ground.path": {"pack": "town", "role": "dirt_path"},
            "ground.water": {"pack": "town", "role": "water"},
            "ground.road": {"pack": "urban", "role": "road_or_sidewalk"},
            "building.roof": {"pack": "town", "role": "roof"},
            "building.wall_gc": {"pack": "urban", "role": "wall_brick"},
            "building.wall_ce": {"pack": "urban", "role": "wall_brick"},
            "building.wall_dept": {"pack": "town", "role": "wall_stone"},
            "building.door": {"pack": "urban", "role": "wall_brick"},
            "interior.floor": {"pack": "dungeon", "role": "floor_interior"},
            "interior.prop": {"pack": "dungeon", "role": "furniture"},
            "forbid": ["character", "prop_busy", "unsorted", "empty_or_deco"],
        },
    }

    report = ["# Kenney semantic catalog", ""]
    for pack, folder in PACKS.items():
        if not folder.exists():
            print("missing", folder)
            continue
        data = catalog_pack(pack, folder)
        catalog["packs"][pack] = {
            "roles": {k: v for k, v in sorted(data["roles"].items())},
            "counts": {k: len(v) for k, v in sorted(data["roles"].items())},
        }
        draw_atlas(pack, folder, data["roles"], OUT / f"semantic_atlas_{pack}.png")
        report.append(f"## {pack}")
        for role, ids in sorted(data["roles"].items(), key=lambda x: -len(x[1])):
            sample = ids[:12]
            report.append(f"- **{role}** ({len(ids)}): `{sample}`")
        report.append("")

    # build curated playbook with manual overrides after inspection
    playbook = build_playbook(catalog)
    catalog["playbook"] = playbook

    (OUT / "semantic_catalog.json").write_text(
        json.dumps(catalog, indent=2), encoding="utf-8"
    )
    (OUT / "semantic_report.md").write_text("\n".join(report), encoding="utf-8")
    print("OK", OUT / "semantic_catalog.json")
    for pack, pb in playbook.items():
        print(pack, {k: len(v) for k, v in pb.items()})


def build_playbook(catalog: dict) -> dict:
    """Strict curated lists for compose — only high-confidence structural tiles."""
    pb = {}
    for pack, data in catalog["packs"].items():
        roles = data["roles"]
        def take(role, n=20):
            return list(roles.get(role, []))[:n]

        if pack == "town":
            pb[pack] = {
                "grass": take("grass", 8),
                "tree": take("tree_or_bush", 12),
                "crop": take("crop_or_foliage", 10),
                "path": take("dirt_path", 10),
                "water": take("water", 6),
                "roof": take("roof", 10),
                "wall": take("wall_stone", 8) or take("wood", 8),
                "deco": take("deco_nature", 6),
            }
        elif pack == "urban":
            # only road greys — never characters
            roads = take("road_or_sidewalk", 30)
            bricks = take("wall_brick", 15)
            pb[pack] = {
                "road": roads,
                "wall_brick": bricks,
                # explicit ban list for safety
                "banned": take("character", 50) + take("prop_busy", 50),
            }
        else:  # dungeon
            pb[pack] = {
                "floor": take("floor_interior", 16),
                "furniture": take("furniture", 20),
            }
    return pb


if __name__ == "__main__":
    main()
