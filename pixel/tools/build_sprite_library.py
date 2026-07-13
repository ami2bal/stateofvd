#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""build_sprite_library.py — Librairie de sprites exhaustive (TASK-117).

Scanne les packs (Sunnyside maître + Sprout appoint), détecte les tuiles non vides,
assigne les familles (régions calibrées par crops labellés — voir assets/packs/_catalog/),
applique le TEMPLATE de kit bâtiment (5 bandes couleur à mise en page identique),
et émet le SSOT machine :

  assets/sprite-library/library.json          (toutes les entrées)
  assets/sprite-library/sheets/*.png          (planches de contact par famille)

Régénérable : python tools/build_sprite_library.py   (depuis proto/state-of-vd-pixel/)
Vérité : les régions/rôles fins proviennent des crops labellés
  _catalog/sunnyside_kit_blue_labeled.png · sunnyside_floors_labeled.png ·
  sunnyside_tileset_grid.png · sunnyside_buildings_zoom.png
"""
import io
import json
import os
import sys
from pathlib import Path

from PIL import Image, ImageDraw

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

ROOT = Path(__file__).resolve().parents[1]
SUN = ROOT / "assets/packs/sunnyside/Sunnyside_World_ASSET_PACK_V2.1/Sunnyside_World_Assets"
SPROUT = ROOT / "assets/packs/sprout-lands/Sprout Lands - Sprites - Basic pack"
OUT = ROOT / "assets/sprite-library"
SHEETS = OUT / "sheets"
T = 16

# --------------------------------------------------------------------------
# RÉGIONS Sunnyside (tileset 64×64) — familles par zones, CALIBRÉES.
# Ordre = priorité (première région qui matche gagne). (c0,r0,c1,r1) inclusifs-exclusifs.
# --------------------------------------------------------------------------
KIT_BANDS = {"blue": 8, "green": 16, "orange": 24, "red": 32, "purple": 40}
REGIONS = [
    # zones spécifiques AVANT les bandes de kits (elles mordent sur cols 12-14)
    ("facade_accents", 12, 8, 15, 16),      # cheminées/volets (bande bleue uniquement)
    ("floor_stone", 0, 15, 16, 17),          # plateau pierre déborde jusqu'à col 15
    ("water_pond", 11, 17, 15, 22),          # étang bleu (cols 12-14, rows 18-21)
    # bandes de kits bâtiment (cols 15-36) — traitées via template plus bas
    *[("building_kit_" + name, 15, r0, 36, r0 + 8) for name, r0 in KIT_BANDS.items()],
    # sols (calibrés floors_labeled)
    ("floor_wood_deck", 0, 8, 12, 15),
    ("floor_stone", 0, 15, 12, 20),
    # terrain / eau / végétal (calibrés grid + crops)
    ("terrain_grass_autotile", 0, 0, 18, 8),
    ("water_edges", 18, 0, 30, 8),
    ("water_fill", 30, 0, 35, 8),
    ("plants_mini", 26, 0, 35, 5),
    ("fences_wood", 34, 0, 42, 8),
    ("stone_rails", 42, 0, 48, 8),
    ("trees_bushes", 48, 0, 64, 8),
    ("snow_ice", 0, 20, 9, 27),
    ("water_pond", 11, 17, 16, 23),
    ("terrain_islands", 0, 27, 15, 36),
    # droite : props / nourriture / rochers / tapis / ui
    ("food_items", 46, 8, 64, 20),
    ("rocks_boulders", 46, 20, 60, 30),
    ("furniture_props", 36, 8, 46, 30),
    ("furniture_carpets", 36, 30, 52, 40),
    ("ui_inline", 36, 40, 52, 52),
    ("misc_right", 52, 30, 64, 52),
    ("misc", 0, 0, 64, 64),  # attrape-tout final
]

# --------------------------------------------------------------------------
# TEMPLATE du kit bâtiment — rôles fins RELATIFS (col ABSOLUE, row RELATIVE à la bande).
# Lu sur le kit BLEU (sunnyside_kit_blue_labeled.png) ; identique pour les 5 couleurs.
# assembly: fill|replace|overlay|pair ; layer: roofs|walls|ground
# --------------------------------------------------------------------------
KIT_TEMPLATE = {
    # colonne de faîtage N-S (bâtiment étroit / annexe)
    (16, 1): dict(role="roof", subtype="ridge_col_N", orientation="N", layer="roofs", assembly="fill"),
    (16, 2): dict(role="roof", subtype="ridge_col_mid", orientation="NS", layer="roofs", assembly="fill"),
    (16, 3): dict(role="roof", subtype="ridge_col_mid", orientation="NS", layer="roofs", assembly="fill"),
    (16, 4): dict(role="roof", subtype="ridge_col_mid", orientation="NS", layer="roofs", assembly="fill"),
    (16, 5): dict(role="roof", subtype="ridge_col_S", orientation="S", layer="roofs", assembly="fill"),
    (17, 1): dict(role="roof", subtype="ridge_col_N_b", orientation="N", layer="roofs", assembly="fill"),
    (17, 2): dict(role="roof", subtype="ridge_col_mid_b", orientation="NS", layer="roofs", assembly="fill"),
    # verrière (le toit plat 18,rel1 n'existe qu'en bande bleue → FACADE_FINE)
    (18, 2): dict(role="roof", subtype="skylight", layer="roofs", assembly="replace"),
    # pignons (gable)
    (20, 1): dict(role="roof", subtype="gable_top_W", orientation="W", layer="roofs", assembly="replace"),
    (21, 1): dict(role="roof", subtype="gable_top_E", orientation="E", layer="roofs", assembly="replace"),
    # rive nord festonnée (bord haut du pan de toit)
    (22, 1): dict(role="roof", subtype="roof_top_edge", orientation="N", layer="roofs", assembly="fill"),
    (23, 1): dict(role="roof", subtype="roof_top_edge", orientation="N", layer="roofs", assembly="fill"),
    (24, 1): dict(role="roof", subtype="roof_top_edge", orientation="N", layer="roofs", assembly="fill"),
    (25, 1): dict(role="roof", subtype="roof_top_edge", orientation="N", layer="roofs", assembly="fill"),
    (26, 1): dict(role="roof", subtype="roof_top_edge", orientation="N", layer="roofs", assembly="fill"),
    (27, 1): dict(role="roof", subtype="roof_top_edge", orientation="N", layer="roofs", assembly="fill"),
    # crête en chevrons (faîtage principal E-W)
    (22, 2): dict(role="roof", subtype="ridge_chevron", orientation="EW", layer="roofs", assembly="fill"),
    (23, 2): dict(role="roof", subtype="ridge_chevron_peak", orientation="EW", layer="roofs", assembly="fill"),
    (24, 2): dict(role="roof", subtype="ridge_chevron", orientation="EW", layer="roofs", assembly="fill"),
    (25, 2): dict(role="roof", subtype="ridge_chevron", orientation="EW", layer="roofs", assembly="fill"),
    (26, 2): dict(role="roof", subtype="ridge_chevron_peak", orientation="EW", layer="roofs", assembly="fill"),
    (27, 2): dict(role="roof", subtype="ridge_chevron", orientation="EW", layer="roofs", assembly="fill"),
    # pan de toit (pente sud) : bords + bardeaux + faces claires
    (21, 3): dict(role="roof", subtype="slope_edge_W", orientation="W", layer="roofs", assembly="replace"),
    (28, 3): dict(role="roof", subtype="slope_edge_E", orientation="E", layer="roofs", assembly="replace"),
    (22, 3): dict(role="roof", subtype="shingles", layer="roofs", assembly="fill"),
    (26, 3): dict(role="roof", subtype="shingles", layer="roofs", assembly="fill"),
    (27, 3): dict(role="roof", subtype="shingles", layer="roofs", assembly="fill"),
    (23, 3): dict(role="roof", subtype="roof_face_light", layer="roofs", assembly="fill"),
    (24, 3): dict(role="roof", subtype="roof_face_light", layer="roofs", assembly="fill"),
    (22, 4): dict(role="roof", subtype="shingles", layer="roofs", assembly="fill"),
    (26, 4): dict(role="roof", subtype="shingles", layer="roofs", assembly="fill"),
    (27, 4): dict(role="roof", subtype="shingles", layer="roofs", assembly="fill"),
    (25, 4): dict(role="roof", subtype="roof_face_light", layer="roofs", assembly="fill"),
    # murs / façade
    (21, 5): dict(role="opening", subtype="wall_door", layer="walls", assembly="replace",
                  note="façade avec porte intégrée"),
    # avant-toits (poutres) + bas de bardeaux
    (23, 5): dict(role="roof", subtype="eaves_beam", orientation="EW", layer="roofs", assembly="fill"),
    (24, 5): dict(role="roof", subtype="eaves_beam", orientation="EW", layer="roofs", assembly="fill"),
    (25, 5): dict(role="roof", subtype="eaves_beam", orientation="EW", layer="roofs", assembly="fill"),
    (22, 6): dict(role="roof", subtype="eaves_shingle_bottom", orientation="S", layer="roofs", assembly="fill"),
    (23, 7): dict(role="roof", subtype="eaves_shingle_bottom", orientation="S", layer="roofs", assembly="fill"),
    (26, 7): dict(role="roof", subtype="eaves_shingle_bottom", orientation="S", layer="roofs", assembly="fill"),
    # TOUR (col 30, + base col 31)
    (30, 1): dict(role="roof", subtype="tower_cap", layer="roofs", assembly="replace"),
    (30, 2): dict(role="roof", subtype="tower_shaft", layer="roofs", assembly="fill"),
    (30, 3): dict(role="roof", subtype="tower_shaft", layer="roofs", assembly="fill"),
    (30, 4): dict(role="roof", subtype="tower_shaft", layer="roofs", assembly="fill"),
    (30, 5): dict(role="opening", subtype="tower_wall_window", layer="walls", assembly="replace"),
    (30, 6): dict(role="wall", subtype="wall_plain", layer="walls", assembly="fill"),
    (30, 7): dict(role="wall", subtype="tower_base", layer="walls", assembly="replace"),
    (31, 7): dict(role="wall", subtype="tower_base_b", layer="walls", assembly="replace"),
    # PIGNON-FRONT étroit (cols 33-34)
    (33, 1): dict(role="roof", subtype="gablefront_cap", layer="roofs", assembly="replace"),
    (33, 2): dict(role="roof", subtype="gablefront_peak", layer="roofs", assembly="replace"),
    (33, 3): dict(role="roof", subtype="gablefront_slope_W", orientation="W", layer="roofs", assembly="replace"),
    (34, 3): dict(role="roof", subtype="gablefront_slope_E", orientation="E", layer="roofs", assembly="replace"),
    (33, 4): dict(role="roof", subtype="gablefront_roofwall", layer="roofs", assembly="fill"),
    (34, 4): dict(role="roof", subtype="gablefront_roofwall_b", layer="roofs", assembly="fill"),
    (33, 5): dict(role="opening", subtype="gablefront_wall_door", layer="walls", assembly="replace"),
}

# Accents façade (bande BLEUE uniquement — coordonnées ABSOLUES, crop kit_blue_labeled)
FACADE_FINE = {
    (12, 9): dict(role="roof", subtype="chimney_a", layer="roofs", assembly="overlay"),
    (13, 9): dict(role="roof", subtype="chimney_b", layer="roofs", assembly="overlay"),
    (12, 11): dict(role="prop", subtype="shutters_red", layer="walls", assembly="overlay"),
    (12, 12): dict(role="prop", subtype="shutters_red", layer="walls", assembly="overlay"),
    (13, 11): dict(role="prop", subtype="shutters_red", layer="walls", assembly="overlay"),
    (13, 13): dict(role="prop", subtype="shutters_red", layer="walls", assembly="overlay"),
    (13, 14): dict(role="opening", subtype="window_dark_panel", layer="walls", assembly="replace"),
    (18, 9): dict(role="roof", subtype="roof_flat_stitch", layer="roofs", assembly="fill",
                  note="toit plat — n'existe qu'en bande bleue"),
}

# Sols — rôles fins (coordonnées ABSOLUES), calibrés sunnyside_floors_labeled.png
FLOOR_FINE = {
    (9, 8): dict(role="floor", subtype="wood_plain", layer="ground", assembly="fill"),
    (10, 8): dict(role="floor", subtype="wood_plain_b", layer="ground", assembly="fill"),
    (1, 9): dict(role="floor", subtype="wood_deck_corner_NW", orientation="NW", layer="ground", assembly="replace"),
    (5, 9): dict(role="floor", subtype="wood_deck_corner_NE", orientation="NE", layer="ground", assembly="replace"),
    (2, 9): dict(role="floor", subtype="wood_deck_edge_N", orientation="N", layer="ground", assembly="fill"),
    (1, 13): dict(role="floor", subtype="wood_deck_corner_SW", orientation="SW", layer="ground", assembly="replace"),
    (5, 13): dict(role="floor", subtype="wood_deck_corner_SE", orientation="SE", layer="ground", assembly="replace"),
    (9, 9): dict(role="floor", subtype="wood_stairs", layer="ground", assembly="replace"),
    (9, 10): dict(role="floor", subtype="wood_stairs_b", layer="ground", assembly="replace"),
    (1, 15): dict(role="floor", subtype="cobble_dark", layer="ground", assembly="fill"),
    (2, 15): dict(role="floor", subtype="stone_edge_N", orientation="N", layer="ground", assembly="fill"),
    (9, 15): dict(role="floor", subtype="stone_plateau", layer="ground", assembly="fill"),
    (10, 15): dict(role="floor", subtype="stone_plateau_b", layer="ground", assembly="fill"),
    (10, 16): dict(role="floor", subtype="stone_pebbles", layer="ground", assembly="fill"),
}

PRIORITY_FAMILIES = {
    "building_kit_blue", "building_kit_green", "building_kit_orange",
    "building_kit_red", "building_kit_purple", "floor_wood_deck", "floor_stone",
}


def region_of(c, r):
    for name, c0, r0, c1, r1 in REGIONS:
        if c0 <= c < c1 and r0 <= r < r1:
            return name
    return "misc"


def tile_nonempty(img, c, r):
    tile = img.crop((c * T, r * T, c * T + T, r * T + T))
    alpha = tile.getchannel("A")
    return sum(1 for a in alpha.getdata() if a > 16) >= 6


def scan_sunnyside(entries):
    path = SUN / "Tileset/spr_tileset_sunnysideworld_16px.png"
    img = Image.open(path).convert("RGBA")
    cols, rows = img.width // T, img.height // T
    src = "sunnyside/tileset16"
    n = 0
    for r in range(rows):
        for c in range(cols):
            if not tile_nonempty(img, c, r):
                continue
            fam = region_of(c, r)
            e = {
                "id": f"sun_c{c}r{r}",
                "source": src,
                "file": str(path.relative_to(ROOT)).replace("\\", "/"),
                "rect": [c, r],
                "family": fam,
                "fine": False,
                "license": "sunnyside:VERIFIER (non incluse dans l archive)",
            }
            # rôles fins : template kit (5 bandes) puis sols
            if fam.startswith("building_kit_"):
                color = fam.rsplit("_", 1)[1]
                band = KIT_BANDS[color]
                rel = (c, r - band)
                if rel in KIT_TEMPLATE:
                    e.update(KIT_TEMPLATE[rel])
                    e["fine"] = True
                    e["kit_color"] = color
            elif (c, r) in FLOOR_FINE:
                e.update(FLOOR_FINE[(c, r)])
                e["fine"] = True
            elif (c, r) in FACADE_FINE:
                e.update(FACADE_FINE[(c, r)])
                e["fine"] = True
            entries.append(e)
            n += 1
    print(f"sunnyside tileset16 : {n} tuiles non vides cataloguees")
    # tileset forêt 32px : catalogué au niveau fichier (grain 32)
    fpath = SUN / "Tileset/spr_tileset_sunnysideworld_forest_32px.png"
    fimg = Image.open(fpath).convert("RGBA")
    entries.append({
        "id": "sun_forest32", "source": "sunnyside/tileset32",
        "file": str(fpath.relative_to(ROOT)).replace("\\", "/"),
        "rect": [0, 0, fimg.width // 32, fimg.height // 32],
        "family": "forest_32px", "fine": False, "role": "terrain",
        "note": "decor foret 32px — grain different, usage ponctuel",
        "license": "sunnyside:VERIFIER (non incluse dans l archive)",
    })


def scan_characters(entries):
    hum = SUN / "Characters/Human"
    for state in sorted(os.listdir(hum)):
        sd = hum / state
        if not sd.is_dir():
            continue
        for f in sorted(os.listdir(sd)):
            if not f.endswith(".png"):
                continue
            variant = f.split("_")[0]
            strip = int(f.rsplit("strip", 1)[1].split(".")[0]) if "strip" in f else 1
            img = Image.open(sd / f)
            fw = img.width // strip
            entries.append({
                "id": f"char_human_{variant}_{state.lower()}",
                "source": "sunnyside/characters",
                "file": str((sd / f).relative_to(ROOT)).replace("\\", "/"),
                "family": "character_human", "fine": True,
                "role": "character", "subtype": state.lower(), "layer": "entities",
                "assembly": "overlay",
                "frames": strip, "frame_size": [fw, img.height],
                "layering": "base + variante cheveux (+tools) superposes frame a frame",
                "variant": variant,
                "game_use": {"idle": "attente", "walking": "circulation",
                             "carry": "PORTE UN DOSSIER (fil conducteur)"}.get(state.lower(), ""),
                "license": "sunnyside:VERIFIER (non incluse dans l archive)",
            })
    for other in ("Goblin/PNG", "Skeleton/PNG"):
        d = SUN / "Characters" / other
        if d.is_dir():
            for f in sorted(os.listdir(d)):
                if f.endswith(".png"):
                    entries.append({
                        "id": f"char_{other.split('/')[0].lower()}_{f[:-4]}",
                        "source": "sunnyside/characters",
                        "file": str((d / f).relative_to(ROOT)).replace("\\", "/"),
                        "family": "character_npc", "fine": False, "role": "character",
                        "layer": "entities", "assembly": "overlay",
                        "license": "sunnyside:VERIFIER (non incluse dans l archive)",
                    })
    print("characters catalogues")


def scan_misc_sunnyside(entries):
    for sub, fam, role in (
        ("Elements/Crops", "crops", "prop"), ("Elements/Animals", "animals", "prop"),
        ("Elements/Plants", "plants", "prop"), ("Elements/Other", "deco_large", "prop"),
        ("Elements/VFX/Chimney Smoke", "vfx_smoke", "vfx"), ("Elements/VFX/Fire", "vfx_fire", "vfx"),
        ("Elements/VFX/Glint", "vfx_glint", "vfx"),
        ("UI", "ui_icons", "ui"), ("UI/9slice_box_white", "ui_9slice", "ui"),
    ):
        d = SUN / sub
        if not d.is_dir():
            continue
        for f in sorted(os.listdir(d)):
            if not f.endswith(".png"):
                continue
            img = Image.open(d / f)
            strip = 1
            if "strip" in f:
                try:
                    strip = int(f.rsplit("strip", 1)[1].split(".")[0].split("_")[0])
                except ValueError:
                    strip = 1
            entries.append({
                "id": f"{fam}_{f[:-4]}",
                "source": "sunnyside/" + sub.split("/")[0].lower(),
                "file": str((d / f).relative_to(ROOT)).replace("\\", "/"),
                "family": fam, "fine": True, "role": role,
                "layer": "entities" if role != "ui" else "ui",
                "assembly": "overlay",
                "frames": strip,
                "frame_size": [img.width // strip, img.height],
                "license": "sunnyside:VERIFIER (non incluse dans l archive)",
            })
    print("elements/ui/vfx catalogues")


def scan_sprout(entries):
    """Sprout Lands en appoint : fichiers utiles, licence non-commerciale marquée."""
    useful = {
        "Tilesets/Grass.png": ("sprout_grass_autotile", "terrain"),
        "Objects/Paths.png": ("sprout_paths_autotile", "path"),
        "Tilesets/Fences.png": ("sprout_fences", "prop"),
        "Tilesets/Water.png": ("sprout_water_anim", "terrain"),
        "Objects/Wood Bridge.png": ("sprout_bridge", "prop"),
        "Tilesets/Doors.png": ("sprout_doors_anim", "opening"),
        "Tilesets/Wooden_House_Walls_Tilset.png": ("sprout_house_walls", "wall"),
        "Tilesets/Wooden_House_Roof_Tilset.png": ("sprout_house_roof", "roof"),
    }
    for rel, (fam, role) in useful.items():
        p = SPROUT / rel
        if not p.is_file():
            continue
        img = Image.open(p)
        entries.append({
            "id": fam, "source": "sprout",
            "file": str(p.relative_to(ROOT)).replace("\\", "/"),
            "family": fam, "fine": True, "role": role, "layer": "ground",
            "assembly": "fill",
            "grid16": [img.width // T, img.height // T],
            "license": "sprout:NON-COMMERCIAL (Cup Nooble — usage interne seulement)",
            "note": "pack d appoint — ne pas melanger les palettes avec Sunnyside sans validation DA",
        })
    print("sprout (appoint) catalogue")


def make_sheets(entries):
    SHEETS.mkdir(parents=True, exist_ok=True)
    tileset = Image.open(SUN / "Tileset/spr_tileset_sunnysideworld_16px.png").convert("RGBA")
    fams = {}
    for e in entries:
        if e["source"] == "sunnyside/tileset16":
            fams.setdefault(e["family"], []).append(e)
    Z, PAD, LBL, PERROW = 4, 4, 12, 16
    for fam, items in sorted(fams.items()):
        tw = T * Z
        rows = (len(items) + PERROW - 1) // PERROW
        W = PAD + PERROW * (tw + PAD)
        H = PAD + rows * (tw + LBL + PAD) + LBL
        cv = Image.new("RGBA", (W, H), (30, 30, 34, 255))
        d = ImageDraw.Draw(cv)
        d.text((PAD, 1), f"{fam} ({len(items)})", fill=(230, 230, 120, 255))
        for i, e in enumerate(items):
            c, r = e["rect"][0], e["rect"][1]
            tile = tileset.crop((c * T, r * T, c * T + T, r * T + T)).resize((tw, tw), Image.NEAREST)
            x = PAD + (i % PERROW) * (tw + PAD)
            y = LBL + PAD + (i // PERROW) * (tw + LBL + PAD)
            cv.alpha_composite(tile, (x, y))
            mark = "*" if e.get("fine") else ""
            d.text((x, y + tw - 2), f"{c},{r}{mark}", fill=(255, 255, 255, 255))
        cv.convert("RGB").save(SHEETS / f"family_{fam}.png")
    print(f"planches : {len(fams)} familles -> {SHEETS.relative_to(ROOT)}")


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    entries = []
    scan_sunnyside(entries)
    scan_characters(entries)
    scan_misc_sunnyside(entries)
    scan_sprout(entries)
    lib = {
        "library": "State of VD — sprite library",
        "version": 1,
        "generated_by": "tools/build_sprite_library.py (regenerable)",
        "master_pack": "sunnyside (RECOMMENDATION.md)",
        "license_flags": {
            "sunnyside": "LICENCE NON INCLUSE dans l archive — VERIFIER avant usage publie",
            "sprout": "NON-COMMERCIAL strict (Cup Nooble)",
        },
        "tile_size": 16,
        "conventions": {
            "rect": "[col,row] dans le tileset 64x64 (16px, sans spacing)",
            "fine": "true = role/subtype/assembly prouves par crop labelle ; false = famille seulement",
            "kit_color_bands": KIT_BANDS,
            "kit_template": "memes colonnes 12-35, rows relatives 0-7 par bande — les 5 kits sont des palette-swaps",
        },
        "proofs": [
            "assets/packs/_catalog/sunnyside_tileset_grid.png",
            "assets/packs/_catalog/sunnyside_buildings_zoom.png",
            "assets/packs/_catalog/sunnyside_kit_blue_labeled.png",
            "assets/packs/_catalog/sunnyside_floors_labeled.png",
        ],
        "counts": {},
        "entries": entries,
    }
    fams = {}
    for e in entries:
        fams[e["family"]] = fams.get(e["family"], 0) + 1
    lib["counts"] = {"total": len(entries), "fine": sum(1 for e in entries if e.get("fine")),
                     "families": dict(sorted(fams.items()))}
    with open(OUT / "library.json", "w", encoding="utf-8") as f:
        json.dump(lib, f, ensure_ascii=False, indent=1)
    print(f"library.json : {len(entries)} entrees ({lib['counts']['fine']} fines), "
          f"{len(fams)} familles")
    make_sheets(entries)


if __name__ == "__main__":
    main()
