#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""make_library_proofs.py — preuves d'assemblage TASK-117 (v2, prefabs vérité terrain).

Source d'assemblage AUTORITATIVE : room1_ground_truth.json (démo officielle décodée).
Règle de transposition couleur : pour les tuiles des bandes de kit (cols 15-36,
rows 8-48), shift de bande = row + (band_dst - band_src). Les tuiles hors bandes
(bois/communs) restent inchangées.

Sorties : assets/sprite-library/proofs/proof_*.png
"""
import io
import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
ROOT = Path(__file__).resolve().parents[1]
LIB = ROOT / "assets/sprite-library"
PROOFS = LIB / "proofs"
T, COLS = 16, 64
Z = 4

SHEET = Image.open(ROOT / "assets/packs/sunnyside/Sunnyside_World_ASSET_PACK_V2.1/"
                          "Sunnyside_World_Assets/Tileset/spr_tileset_sunnysideworld_16px.png").convert("RGBA")
GT = json.load(open(LIB / "room1_ground_truth.json", encoding="utf-8"))
LIBJ = json.load(open(LIB / "library.json", encoding="utf-8"))
IDX = {(e["family"], e.get("subtype")): tuple(e["rect"]) for e in LIBJ["entries"]
       if e["source"] == "sunnyside/tileset16" and e.get("fine")}

BANDS = {"blue": 8, "green": 16, "orange": 24, "red": 32, "purple": 40}
KIT_C0, KIT_C1 = 15, 36
GRASS = (28, 8)
WATER = (31, 8)


def prefab(name_part):
    for p in GT["prefabs"]:
        if name_part in p["name"]:
            return p
    raise KeyError(name_part)


def band_of(row):
    for name, r0 in BANDS.items():
        if r0 <= row < r0 + 8:
            return name
    return None


def transpose_ix(ix, dst_color):
    """Transposition couleur d'un index tileset (uniquement tuiles de kit)."""
    c, r = ix % COLS, ix // COLS
    src = band_of(r)
    if src and KIT_C0 <= c < KIT_C1 and src != dst_color:
        r2 = r - BANDS[src] + BANDS[dst_color]
        return r2 * COLS + c
    return ix


def tile_by_ix(ix):
    c, r = ix % COLS, ix // COLS
    return SHEET.crop((c * T, r * T, c * T + T, r * T + T))


def tile_empty(ix):
    t = tile_by_ix(ix)
    a = t.getchannel("A")
    return sum(1 for v in a.getdata() if v > 16) < 6


class Canvas:
    def __init__(self, w, h, title):
        self.w, self.h, self.title = w, h, title
        self.img = Image.new("RGBA", (w * T, h * T), (0, 0, 0, 0))

    def put_ix(self, ix, x, y):
        self.img.alpha_composite(tile_by_ix(ix), (x * T, y * T))

    def put_cr(self, cr, x, y):
        self.put_ix(cr[1] * COLS + cr[0], x, y)

    def fill_cr(self, cr, x0, y0, x1, y1):
        for y in range(y0, y1):
            for x in range(x0, x1):
                self.put_cr(cr, x, y)

    def stamp(self, pf, ox, oy, color=None, report=None):
        """Tamponne un prefab (base + overlays), transposé vers `color` si donné."""
        for k, ix in pf["base"].items():
            x, y = map(int, k.split(","))
            ix2 = transpose_ix(ix, color) if color else ix
            if color and tile_empty(ix2):
                if report is not None:
                    report.append((ix, ix2))
                ix2 = ix  # repli : tuile source si le slot cible est vide
            self.put_ix(ix2, ox + x, oy + y)
        for k, ixs in pf.get("overlays", {}).items():
            x, y = map(int, k.split(","))
            for ix in ixs:
                ix2 = transpose_ix(ix, color) if color else ix
                if color and tile_empty(ix2):
                    ix2 = ix
                self.put_ix(ix2, ox + x, oy + y)

    def save(self, name):
        big = self.img.resize((self.w * T * Z, self.h * T * Z), Image.NEAREST)
        out = Image.new("RGBA", (big.width, big.height + 18), (30, 30, 34, 255))
        ImageDraw.Draw(out).text((4, 3), self.title, fill=(230, 230, 120, 255))
        out.alpha_composite(big, (0, 18))
        out.convert("RGB").save(PROOFS / name)
        print("proof:", name)


def flo(subtype):
    for fam in ("floor_wood_deck", "floor_stone"):
        if (fam, subtype) in IDX:
            return IDX[(fam, subtype)]
    raise KeyError(subtype)


def proof1():
    pf = prefab("_05_")  # maison toit bleu (démo, exacte)
    w, h = pf["size"][0] + 4, pf["size"][1] + 4
    cv = Canvas(w, h, "P1 — Prefab demo EXACT (maison toit bleu, room1) sur herbe")
    cv.fill_cr(GRASS, 0, 0, w, h)
    cv.stamp(pf, 2, 2)
    cv.save("proof_1_prefab_exact.png")


def proof2():
    pf = prefab("_01_")  # intérieur meublé (vue ouverte DA)
    w, h = pf["size"][0] + 2, pf["size"][1] + 2
    cv = Canvas(w, h, "P2 — INTERIEUR meuble demo (room1) = la vue ouverte de la DA")
    cv.fill_cr(GRASS, 0, 0, w, h)
    cv.stamp(pf, 1, 1)
    cv.save("proof_2_interieur_ouvert.png")


def proof3():
    pf = prefab("_05_")
    rep_g, rep_r = [], []
    w = (pf["size"][0] + 2) * 3 + 2
    h = pf["size"][1] + 4
    cv = Canvas(w, h, "P3 — TRANSPOSITION couleur du prefab : bleu (source) -> GREEN (GC) -> RED (CE)")
    cv.fill_cr(GRASS, 0, 0, w, h)
    cv.stamp(pf, 1, 2)
    cv.stamp(pf, pf["size"][0] + 3, 2, color="green", report=rep_g)
    cv.stamp(pf, (pf["size"][0] + 2) * 2 + 3, 2, color="red", report=rep_r)
    cv.save("proof_3_transposition_gc_ce.png")
    if rep_g or rep_r:
        print(f"  note transposition: {len(rep_g)} replis green, {len(rep_r)} replis red (slots vides)")


def proof4():
    w, h = 14, 8
    cv = Canvas(w, h, "P4 — Exterieur : herbe + allee pierre + quai bois + eau")
    cv.fill_cr(GRASS, 0, 0, w, h)
    cv.fill_cr(flo("stone_plateau"), 0, 3, 10, 4)
    cv.fill_cr(flo("wood_plain"), 10, 2, 13, 6)
    cv.put_cr(flo("wood_deck_corner_NW"), 10, 2)
    cv.put_cr(flo("wood_deck_corner_NE"), 12, 2)
    cv.fill_cr(WATER, 13, 0, 14, 8)
    cv.fill_cr(WATER, 10, 6, 14, 8)
    cv.save("proof_4_exterieur_quai.png")


def proof5():
    world = json.load(open("C:/Users/vav6wy/Workspace/SIEL/proto/state-of-vd/data/world.json",
                           encoding="utf-8"))
    sites = {s["id"]: s for s in world["sites"]}
    pf = prefab("_09_")  # petite maison verte 7x5 -> gabarit institution
    parl, chat = sites["parlement"], sites["chateau"]
    x_off, y_off = parl["gx"] - 1, parl["gy"] - 1
    w = (chat["gx"] + chat["fw"]) - x_off + 2
    h = max(parl["fh"], chat["fh"]) + 6
    cv = Canvas(w, h, "P5 — Mini plan de masse world.json : parlement=GREEN, chateau=RED (prefabs transposes)")
    cv.fill_cr(GRASS, 0, 0, w, h)
    mid_y = max(parl["fh"], chat["fh"]) + 2
    cv.fill_cr(flo("stone_plateau"), 1, mid_y, w - 1, mid_y + 2)
    for sid, color in (("parlement", "green"), ("chateau", "red")):
        s = sites[sid]
        bx, by = s["gx"] - x_off, s["gy"] - y_off
        cv.stamp(pf, bx, by, color=color)
        door_x = bx + pf["size"][0] // 2
        for y in range(by + pf["size"][1], mid_y):
            cv.put_cr(flo("stone_plateau"), door_x, y)
    cv.save("proof_5_mini_plan_de_masse.png")


def main():
    PROOFS.mkdir(parents=True, exist_ok=True)
    proof1(); proof2(); proof3(); proof4(); proof5()
    print("5 preuves composees (prefabs verite terrain + transposition)")


if __name__ == "__main__":
    main()
