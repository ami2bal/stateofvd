#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""extract_sunnyside_room1.py — VÉRITÉ TERRAIN d'assemblage Sunnyside (TASK-117).

Décode Room1.yy (démo officielle GameMaker, 86×48) : couches land/paths/building/
walls/decoration → extrait les PREFABS réels (composantes connexes de `building`
+ leurs walls/déco superposés) en matrices exactes (col,row) du tileset 64×64.

Sorties :
  assets/sprite-library/room1_ground_truth.json   (couches + prefabs matriciels)
  assets/sprite-library/prefabs/prefab_*.png      (rendus recomposés = preuve)
"""
import io
import json
import re
import sys
from pathlib import Path

from PIL import Image, ImageDraw

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
ROOT = Path(__file__).resolve().parents[1]
PACK = ROOT / "assets/packs/sunnyside/Sunnyside_World_ASSET_PACK_V2.1"
OUT = ROOT / "assets/sprite-library"
PRE = OUT / "prefabs"
T, COLS = 16, 64
W, H = 86, 48

SHEET = Image.open(PACK / "Sunnyside_World_Assets/Tileset/spr_tileset_sunnysideworld_16px.png").convert("RGBA")


def decode_rle(data):
    out, i = [], 0
    while i < len(data):
        n = data[i]; i += 1
        if n < 0:
            out.extend([data[i]] * (-n)); i += 1
        else:
            out.extend(data[i:i + n]); i += n
    return out


def tile_index(v):
    """GM tile value -> index tileset (masque flips) ; -1 si vide."""
    if v in (0, 2147483648):
        return -1
    return v & 0x0007FFFF


def load_layers():
    raw = open(PACK / "Sunnyside_World_Gamemaker/rooms/Room1/Room1.yy", encoding="utf-8").read()
    d = json.loads(re.sub(r",\s*([}\]])", r"\1", raw))
    layers = {}
    for l in d["layers"]:
        if l.get("resourceType") != "GMRTileLayer":
            continue
        if l.get("tilesetId", {}).get("name") != "tileset_sunnysideworld":
            continue
        td = l["tiles"]
        if "TileCompressedData" in td:
            g = decode_rle(td["TileCompressedData"])
        elif "TileSerialiseData" in td:
            g = td["TileSerialiseData"]
        else:
            continue
        layers[l["name"]] = g[:W * H]
    return layers


def components(grid):
    occ = {}
    for i, v in enumerate(grid):
        ix = tile_index(v)
        if ix > 0:
            occ[(i % W, i // W)] = ix
    seen, comps = set(), []
    for p in occ:
        if p in seen:
            continue
        stack, comp = [p], []
        while stack:
            q = stack.pop()
            if q in seen or q not in occ:
                continue
            seen.add(q); comp.append(q)
            x, y = q
            for dx in (-1, 0, 1):
                for dy in (-1, 0, 1):
                    stack.append((x + dx, y + dy))
        comps.append(comp)
    comps.sort(key=len, reverse=True)
    return occ, comps


def render(matrix, w, h):
    img = Image.new("RGBA", (w * T, h * T), (0, 0, 0, 0))
    for (x, y), ix in matrix.items():
        c, r = ix % COLS, ix // COLS
        img.alpha_composite(SHEET.crop((c * T, r * T, c * T + T, r * T + T)), (x * T, y * T))
    return img


def main():
    PRE.mkdir(parents=True, exist_ok=True)
    layers = load_layers()
    print("couches:", sorted(layers))
    bocc, bcomps = components(layers["building"])
    # superpose walls + decoration_02/03 (fenêtres/cheminées posées sur les bâtiments)
    overlays = {}
    for name in ("walls", "decoration_02", "decoration_03"):
        if name in layers:
            for i, v in enumerate(layers[name]):
                ix = tile_index(v)
                if ix > 0:
                    overlays.setdefault((i % W, i // W), []).append(ix)

    gt = {"source": "Sunnyside_World_Gamemaker/rooms/Room1/Room1.yy (demo officielle)",
          "grid": [W, H], "tileset_cols": COLS,
          "prefabs": [], "layer_histograms": {}}
    for name, g in layers.items():
        hist = {}
        for v in g:
            ix = tile_index(v)
            if ix > 0:
                hist[ix] = hist.get(ix, 0) + 1
        gt["layer_histograms"][name] = dict(sorted(hist.items(), key=lambda kv: -kv[1])[:40])

    kept = 0
    for comp in bcomps:
        if len(comp) < 6:
            continue
        x0 = min(x for x, _ in comp); x1 = max(x for x, _ in comp)
        y0 = min(y for _, y in comp); y1 = max(y for _, y in comp)
        w, h = x1 - x0 + 1, y1 - y0 + 1
        base, over = {}, {}
        for (x, y) in comp:
            base[(x - x0, y - y0)] = bocc[(x, y)]
        for (x, y), ixs in overlays.items():
            if x0 <= x <= x1 and y0 <= y <= y1:
                over[(x - x0, y - y0)] = ixs
        kept += 1
        name = f"prefab_{kept:02d}_{w}x{h}"
        gt["prefabs"].append({
            "name": name, "bbox_room": [x0, y0, x1, y1], "size": [w, h],
            "base": {f"{x},{y}": ix for (x, y), ix in sorted(base.items())},
            "overlays": {f"{x},{y}": ixs for (x, y), ixs in sorted(over.items())},
        })
        # rendu preuve : base + overlays
        img = render(base, w, h)
        for (x, y), ixs in over.items():
            for ix in ixs:
                c, r = ix % COLS, ix // COLS
                img.alpha_composite(SHEET.crop((c * T, r * T, c * T + T, r * T + T)), (x * T, y * T))
        big = img.resize((img.width * 4, img.height * 4), Image.NEAREST)
        cv = Image.new("RGBA", (big.width, big.height + 16), (30, 30, 34, 255))
        ImageDraw.Draw(cv).text((3, 2), name, fill=(230, 230, 120, 255))
        cv.alpha_composite(big, (0, 16))
        cv.convert("RGB").save(PRE / f"{name}.png")
        print(f"prefab {name} @room({x0},{y0}) taille {w}x{h} tuiles={len(comp)}")

    with open(OUT / "room1_ground_truth.json", "w", encoding="utf-8") as f:
        json.dump(gt, f, ensure_ascii=False, indent=1)
    print(f"room1_ground_truth.json : {kept} prefabs")


if __name__ == "__main__":
    main()
