#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""validate_sprite_library.py — gate de véracité de la librairie (TASK-117).

Vérifie :
  K1  library.json charge ; chaque entrée tileset a un rect DANS les bornes de l'image source
  K2  vocabulaire fermé (role/layer/assembly) ; fichiers sources existants
  K3  les 5 kits couleur exposent le MÊME jeu de subtypes fins (template appliqué partout)
  K4  combinatorics.json : chaque subtype de recette résout dans les 5 kits (ou en absolu)
  K5  mapping.json : kits couleur valides ; sols des room_programs résolus ; sources DA/world présentes
  K6  planches de contact présentes pour chaque famille du tileset
Sortie non-zéro si échec (discipline validate_model).
"""
import io
import json
import sys
from pathlib import Path

from PIL import Image

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
ROOT = Path(__file__).resolve().parents[1]
LIB = ROOT / "assets/sprite-library"
T = 16

ROLES = {"terrain", "path", "wall", "floor", "opening", "furniture", "roof",
         "prop", "character", "vfx", "ui", "junk"}
LAYERS = {"ground", "paths", "walls", "furniture", "entities", "roofs", "vfx", "ui"}
ASSEMBLY = {"fill", "replace", "overlay", "pair"}
KIT_FAMS = [f"building_kit_{c}" for c in ("blue", "green", "orange", "red", "purple")]

fails = []


def check(ok, label):
    print(("  PASS  " if ok else "  FAIL  ") + label)
    if not ok:
        fails.append(label)


def main():
    lib = json.load(open(LIB / "library.json", encoding="utf-8"))
    entries = lib["entries"]
    check(len(entries) > 1500, f"K1 volume ({len(entries)} entrees)")

    # K1/K2 : rects en bornes, fichiers existants, vocabulaire
    imgs = {}
    bad_rect = bad_file = bad_vocab = 0
    for e in entries:
        p = ROOT / e["file"]
        if not p.is_file():
            bad_file += 1
            continue
        if e["source"] == "sunnyside/tileset16":
            if p not in imgs:
                imgs[p] = Image.open(p).size
            W, H = imgs[p]
            c, r = e["rect"][0], e["rect"][1]
            if not (0 <= c < W // T and 0 <= r < H // T):
                bad_rect += 1
        if e.get("role") and e["role"] not in ROLES:
            bad_vocab += 1
        if e.get("layer") and e["layer"] not in LAYERS:
            bad_vocab += 1
        if e.get("assembly") and e["assembly"] not in ASSEMBLY:
            bad_vocab += 1
    check(bad_file == 0, f"K2 fichiers sources ({bad_file} manquants)")
    check(bad_rect == 0, f"K1 rects en bornes ({bad_rect} hors bornes)")
    check(bad_vocab == 0, f"K2 vocabulaire ferme ({bad_vocab} invalides)")

    # K3 : symétrie des 5 kits (mêmes subtypes fins)
    kit_subs = {}
    for fam in KIT_FAMS:
        kit_subs[fam] = {e.get("subtype") for e in entries
                         if e["family"] == fam and e.get("fine")}
    ref = kit_subs[KIT_FAMS[0]]
    sym = all(kit_subs[f] == ref for f in KIT_FAMS)
    check(sym and len(ref) >= 25,
          f"K3 template kit symetrique sur 5 couleurs ({len(ref)} subtypes fins)")

    # K4 : subtypes des recettes -> résolus
    need_kit = ["roof_top_edge", "ridge_chevron", "ridge_chevron_peak", "slope_edge_W",
                "slope_edge_E", "shingles", "roof_face_light", "eaves_beam",
                "eaves_shingle_bottom", "wall_door", "wall_plain", "tower_cap",
                "tower_shaft", "tower_wall_window", "tower_base", "gablefront_cap",
                "gablefront_peak", "gablefront_slope_W", "gablefront_slope_E",
                "gablefront_wall_door", "ridge_col_N", "ridge_col_mid", "ridge_col_S"]
    missing = [s for s in need_kit if s not in ref]
    check(not missing, f"K4 recettes kit resolues (manquants: {missing})")
    abs_need = ["chimney_a", "chimney_b", "shutters_red", "window_dark_panel",
                "wood_plain", "stone_plateau", "cobble_dark"]
    all_subs = {e.get("subtype") for e in entries if e.get("fine")}
    missing2 = [s for s in abs_need if s not in all_subs]
    check(not missing2, f"K4 pieces absolues resolues (manquants: {missing2})")

    # K5 : mapping
    mp = json.load(open(LIB / "mapping.json", encoding="utf-8"))
    kits_ok = all(v.get("kit_color") in ("blue", "green", "orange", "red", "purple")
                  for k, v in mp["sites"].items() if not k.startswith("_"))
    check(kits_ok, "K5 mapping: kits couleur valides")
    floors_ok = all(v["floor"] in ("wood_plain", "stone_plateau")
                    for v in mp["room_programs"].values())
    check(floors_ok, "K5 mapping: sols des programmes resolus")
    srcs_ok = all((Path("C:/Users/vav6wy/Workspace/SIEL") / p).is_file() for p in [
        "proto/state-of-vd/data/world.json",
        "proto/state-of-vd/design/da_cible_toits.jpg",
        "proto/state-of-vd/design/da_cible_ouvert.jpg"])
    check(srcs_ok, "K5 mapping: sources DA + world.json presentes")

    # K6 : planches par famille tileset
    fams = {e["family"] for e in entries if e["source"] == "sunnyside/tileset16"}
    missing_sheets = [f for f in fams if not (LIB / "sheets" / f"family_{f}.png").is_file()]
    check(not missing_sheets, f"K6 planches presentes ({len(fams)} familles)")

    # K7 : vérité terrain Room1 (prefabs autoritatifs)
    gtp = LIB / "room1_ground_truth.json"
    check(gtp.is_file(), "K7 room1_ground_truth.json present")
    if gtp.is_file():
        gt = json.load(open(gtp, encoding="utf-8"))
        pf = gt.get("prefabs", [])
        check(len(pf) >= 20, f"K7 prefabs extraits ({len(pf)} >= 20)")
        bad_ix = 0
        for p in pf:
            for ix in p["base"].values():
                if not (0 <= ix < 4096):
                    bad_ix += 1
        check(bad_ix == 0, f"K7 indices prefabs en bornes ({bad_ix} hors bornes)")
        needed = ["prefab_01_", "prefab_05_", "prefab_09_"]
        have = [n for n in needed if any(n in p["name"] for p in pf)]
        check(len(have) == len(needed), "K7 prefabs cles presents (interieur + maison + gabarit)")
        proofs_dir = LIB / "proofs"
        pr = sorted(proofs_dir.glob("proof_*.png")) if proofs_dir.is_dir() else []
        check(len(pr) >= 5, f"K7 preuves d assemblage ({len(pr)} >= 5)")

    print("=" * 50)
    if fails:
        print(f"RESULT: FAIL ({len(fails)})")
        sys.exit(1)
    print("RESULT: PASS — librairie coherente")


if __name__ == "__main__":
    main()
