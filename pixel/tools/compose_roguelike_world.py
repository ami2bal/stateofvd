#!/usr/bin/env python3
"""Compose dual-LOD world from Kenney Roguelike RPG Pack (playbook v10).

Orientation-first DA + spatial invariants:
  • Paths: V=408 H=465 + oriented corners (406/407/636/464…)
  • Roofs: Sample1 multi-gable kit on roof band only
  • Openings: REPLACE on wall cells only — never float outside footprint
  • Room doors: trouée (floor gap), not decor 168
  • Windows: body 215 (+ cap 158 only if cell above is wall)
  • Furniture: overlay on floor_cells only
  • Trees: canopy above trunk (vertical pair)

Dual LOD: zoom-out = ground+roofs · zoom-in = ground+interiors
Grid ×2 from world.json for room space.
"""
from __future__ import annotations

import json
import math
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

# ── Orientation kits (visual + sample_map.tmx) ──────────────────────────────
# Cardinal bits (do NOT use S — that name is the scale helper)
CN, CE, CS, CW = 1, 2, 4, 8  # North East South West

# Paths: grain follows open edges (edge-brown analysis of sheet).
# Corners / T must use tiles whose OPEN edges match the neighbor mask —
# a pure H tile (465) at a T-from-north leaves a visual gap (stem never merges).
PATH_V = 408  # open N–S
PATH_H = 465  # open E–W
PATH_BY_MASK = {
    0: PATH_V,
    CN: PATH_V,
    CS: PATH_V,
    CN | CS: PATH_V,
    CE: PATH_H,
    CW: PATH_H,
    CE | CW: PATH_H,
    # corners (open edges = named bits)
    CN | CE: 463,  # NE
    CE | CS: 406,  # SE
    CS | CW: 407,  # SW
    CN | CW: 464,  # NW (636 alt)
    # T-junctions: stem direction = the single arm, bar = the other two
    CN | CE | CW: 462,  # stem N  (GC/CE → avenue) — NOT 465!
    CE | CS | CW: 404,  # stem S  (depts → avenue)
    CN | CE | CS: 461,  # stem E
    CN | CS | CW: 405,  # stem W
    # cross
    CN | CE | CS | CW: 400,
}

# Roof kit from sample_map house templates (3×3 module, Sample1 isometric slopes)
# Row0: TL · TOP · TR | Row1: ML · MID · MR | Row2: BL · BOT · BR
# Paint WALL mass first, then roof — transparency reveals beige gable (Sample1).
ROOF_KIT = [
    [1217, 1222, 1218],  # top peaks + ridge
    [1274, 1279, 1275],  # mid slopes + fill
    [1331, 1276, 1332],  # eaves L/R + bottom fill
]
# ── Architect-plan dictionary (playbook v10 Claude — proven IDs) ───────────
WALL_FILL = 873
WALL_INNER = 868
WALL_L, WALL_R = 872, 874
# Building entrance: solid dark door panel (Sample1 house openings).
# 331 = glazed French-door panel (NOT a solid door) — kept only as window-like alt.
# Room passage: TROUEE only — 168 is decor curtains, not a door.
DOOR_BUILDING = 150  # solid closed door (ground level only)
DOOR_BUILDING_ALT = 151  # framed doorway (open)
# Classic façade window (not French-door): sits ABOVE a wall sill / allège
WINDOW_BODY = 215  # rectangular multi-pane (upper façade band)
WINDOW_CAP = 158  # arched cap — interior stacks only
WALL_SILL = 873  # allège / base under window (= wall fill — prolongement du mur)
FLOOR_OFFICE = 120  # grey stone depts/offices
FLOOR_HALL = 698  # wood hall (hemicycle/college/meeting)
FLOOR_CARPET = 980  # green carpet fill (council)
CHAIR = (190, 191)
TABLE = (192, 193, 311)
DESK = 311
CABINET = (196, 29)
PLANT = 29  # small prop reuse only if looks ok — prefer cabinet variants
FLOOR_OFFICE_B = 120
FLOOR_HALL_B = 756
FLOOR_STONE, FLOOR_STONE_B = FLOOR_OFFICE, FLOOR_OFFICE
FLOOR_WOOD, FLOOR_WOOD_B = FLOOR_HALL, FLOOR_HALL_B
# Aliases for role sheet / legacy call sites
WINDOW_NS = WINDOW_BODY
WINDOW_EW = WINDOW_BODY  # no separate "lateral" tile (158 is CAP, not EW)



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


def door_facade(site):
    """Where the exterior door sits + which side it faces.

    world.json entry is the approach tile *outside* the footprint:
      - depts: entry north of building → door on NORTH wall
      - GC/CE: entry south of building → door on SOUTH wall
    Returns (door_x, door_y, face) face in {'N','S','E','W'}.
    """
    gx, gy, fw, fh = site["gx"], site["gy"], site["fw"], site["fh"]
    ex = site["entry"]["gx"]
    ey = site["entry"]["gy"]
    dx = min(max(ex, gx + 1), gx + fw - 2)
    if ey <= gy:
        # approach from north
        return dx, gy, "N"
    if ey >= gy + fh - 1:
        return dx, gy + fh - 1, "S"
    # side approaches
    if ex <= gx:
        return gx, min(max(ey, gy + 1), gy + fh - 2), "W"
    if ex >= gx + fw - 1:
        return gx + fw - 1, min(max(ey, gy + 1), gy + fh - 2), "E"
    # fallback: nearest of N/S
    if ey - gy < (gy + fh - 1) - ey:
        return dx, gy, "N"
    return dx, gy + fh - 1, "S"


def outside_of_door(door_x, door_y, face):
    """Cell just outside the door (path apron)."""
    if face == "N":
        return door_x, door_y - 1
    if face == "S":
        return door_x, door_y + 1
    if face == "W":
        return door_x - 1, door_y
    return door_x + 1, door_y


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
        # Architect plan: 1-tile partition BETWEEN every adjacent room (trouée later).
        # Layout:
        #   [ Hémicycle          | Bureau   ]
        #   [                    | Commissions ]
        #   [                    | SGC      ]
        #   [ Pas perdus         |          ]
        col_w = max(3, min(5, iw // 3))
        main_w = iw - col_w - 1  # 1-col vertical partition
        if main_w < 4:
            main_w = max(3, iw - 4)
            col_w = iw - main_w - 1
        ox = ix + main_w + 1  # offices column (gap at ix+main_w)
        # 3 stacked offices + 2 horizontal partitions
        n_off = 3
        usable_h = ih - (n_off - 1)  # gaps between offices
        oh = max(2, usable_h // n_off)
        # Pas perdus strip at bottom of main column (with partition above it)
        corr_h = max(2, min(3, ih // 5))
        main_body_h = ih - corr_h - 1  # 1-row partition before corridor
        if main_body_h < 3:
            corr_h = 2
            main_body_h = ih - corr_h - 1
        add(
            "plenum-gc",
            "Hémicycle du Grand Conseil",
            ix,
            iy,
            main_w,
            max(3, main_body_h),
            "hemicycle",
        )
        add(
            "pas-perdus",
            "Salle des pas perdus",
            ix,
            iy + main_body_h + 1,
            main_w,
            corr_h,
            "corridor",
        )
        oy = iy
        office_defs = [
            ("bureau-gc", "Bureau du Grand Conseil"),
            ("commission", "Commissions parlementaires"),
            ("sgc", "SGC — Secrétariat général du Grand Conseil"),
        ]
        for i, (oid, olabel) in enumerate(office_defs):
            if i == n_off - 1:
                oh_i = iy + ih - oy  # absorb remainder
            else:
                oh_i = oh
            add(oid, olabel, ox, oy, col_w, max(2, oh_i), "office")
            oy += oh_i + 1  # +1 partition gap
        return out

    if kind == "chateau" and len(rooms) >= 3:
        # [ Collège CE (hall) | CSG ]
        # [                   | Chancellerie ]
        col_w = max(3, min(5, iw // 3))
        main_w = iw - col_w - 1
        if main_w < 4:
            main_w = max(3, iw - 4)
            col_w = iw - main_w - 1
        ox = ix + main_w + 1
        add(
            "college-ce",
            "Collège du Conseil d'État",
            ix,
            iy,
            main_w,
            ih,
            "college",
        )
        # 2 stacked side rooms + 1 horizontal partition
        top_h = max(2, (ih - 1) // 2)
        bot_h = ih - top_h - 1
        add(
            "csg",
            "CSG — Conférence des secrétaires généraux",
            ox,
            iy,
            col_w,
            top_h,
            "office",
        )
        add(
            "chancellerie",
            "Chancellerie d'État",
            ox,
            iy + top_h + 1,
            col_w,
            max(2, bot_h),
            "office",
        )
        return out

    if kind == "department" and rooms:
        n = max(1, len(rooms))
        # leave 1-row wall between stacked rooms (architect partitions)
        usable = ih - (n - 1)
        rh0 = max(2, usable // n)
        ry = iy
        for i, r in enumerate(rooms):
            rh = rh0 if i < n - 1 else (iy + ih - ry)
            # last room = small meeting (wood); others = grey offices
            prog = "meeting" if i == n - 1 and n >= 2 else "dept"
            add(r["id"], r.get("label") or r["id"], ix, ry, iw, max(2, rh), prog)
            ry += rh + 1  # +1 wall gap
        return out

    add(site["id"], site.get("displayName") or site["id"], ix, iy, iw, ih, "dept")
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
    """Single-width roads; each path meets the door apron (correct façade).

    Network:
      - E–W avenue (campus spine)
      - N–S spurs from each building door to the avenue
    No orphan mid-map axis (esplanade is the Place itself — reachable via GC/CE spurs + cobble).
    """
    path = set()
    avenue_y = S(15)
    # Avenue spans full campus width (not cut short before CE)
    for x in range(S(2), W - 2):
        path.add((x, avenue_y))

    # (deliberately no mid-esplanade dead-end spur — user feedback)

    for s in sites:
        door_x, door_y, face = door_facade(s)
        ox, oy = outside_of_door(door_x, door_y, face)
        # apron + corridor from apron to avenue (may go north or south)
        if 0 <= ox < W and 0 <= oy < H and (ox, oy) not in occupied:
            path.add((ox, oy))
        # also keep world entry tile on path if outside footprint
        ex, ey = s["entry"]["gx"], s["entry"]["gy"]
        if (ex, ey) not in occupied:
            path.add((ex, ey))
        # connect apron to avenue (must include avenue cell for T-junction)
        for cell in ortho_corridor(ox, oy, ox, avenue_y):
            if 0 <= cell[0] < W and 0 <= cell[1] < H and cell not in occupied:
                path.add(cell)
        # if apron x differs from entry, link them
        for cell in ortho_corridor(ex, ey, ox, oy):
            if 0 <= cell[0] < W and 0 <= cell[1] < H and cell not in occupied:
                path.add(cell)
        # ensure the avenue cell under the spur exists (T-junction anchor)
        if 0 <= ox < W:
            path.add((ox, avenue_y))

    path -= occupied
    return path


def path_neighbor_mask(x, y, path_cells):
    """CN=1 CE=2 CS=4 CW=8 — which cardinal neighbors are also path."""
    m = 0
    if (x, y - 1) in path_cells:
        m |= CN
    if (x + 1, y) in path_cells:
        m |= CE
    if (x, y + 1) in path_cells:
        m |= CS
    if (x - 1, y) in path_cells:
        m |= CW
    return m


def path_tile_for(x, y, path_cells):
    """Orientation-aware path tile from neighbor mask."""
    return PATH_BY_MASK.get(path_neighbor_mask(x, y, path_cells), PATH_V)


def paint_oriented_paths(ground, sheet, path_cells, W, H):
    for tx, ty in path_cells:
        if 0 <= tx < W and 0 <= ty < H:
            paste(ground, sheet, path_tile_for(tx, ty, path_cells), tx, ty)


def roof_tile_for(lx, fw, ly, roof_rows):
    """Sample1 roof module — corner tiles ONLY on true outer edges of the footprint.

    Multi-gable must NOT reuse L/R corner tiles mid-roof: those sprites have
    transparency / gable-wall halves meant for the building perimeter over grass
    (or over façade eaves), not for internal segment joints.
    """
    if lx == 0:
        kx = 0
    elif lx == fw - 1:
        kx = 2
    else:
        kx = 1  # solid fill / ridge
    if roof_rows <= 1:
        ky = 0
    elif roof_rows == 2:
        ky = 0 if ly == 0 else 2
    else:
        if ly == 0:
            ky = 0
        elif ly == roof_rows - 1:
            ky = 2
        else:
            ky = 1
    return ROOF_KIT[ky][kx]


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


# ── Architect composition rules (openings) ──────────────────────────────────


def window_span_positions(length, *, door_pos=None, spacing=4, clear_door=2, clear_end=1, max_n=None):
    """Place windows along a 1D wall span [0, length).

    Architect rules:
      - no window on corner piers (clear_end)
      - no window within clear_door tiles of the door
      - regular rhythm at `spacing` (not jammed every 2–3 tiles)
      - optional hard cap max_n (small façades stay sober)
    """
    if length < 3:
        return []
    lo = clear_end
    hi = length - 1 - clear_end
    if hi < lo:
        return []

    # Seed rhythm from center of free span (more classical than origin-aligned % N)
    span = hi - lo + 1
    # First candidate: center the grid so leftover piers are balanced
    n_fit = max(1, (span + spacing - 1) // spacing)
    if max_n is not None:
        n_fit = min(n_fit, max_n)
    # Ideal first offset so windows are centered in [lo, hi]
    used = (n_fit - 1) * spacing if n_fit > 1 else 0
    start = lo + max(0, (span - used) // 2)

    out = []
    for i in range(n_fit):
        p = start + i * spacing
        if p > hi:
            break
        if door_pos is not None and abs(p - door_pos) < clear_door:
            continue
        out.append(p)

    # If door ate the only candidates, try one window far from door on each side
    if not out and door_pos is not None and max_n != 0:
        for p in (lo, hi):
            if abs(p - door_pos) >= clear_door and lo <= p <= hi:
                out.append(p)
                if max_n and len(out) >= max_n:
                    break
    return out


def facade_window_budget(kind, length):
    """How dense should a façade be? (spacing, clear_door, clear_end, max_n)."""
    if kind == "department" or length <= 8:
        # Small pavilion: 1–2 windows, generous piers, door breathing room
        return dict(spacing=3, clear_door=2, clear_end=1, max_n=2)
    if kind in ("parlement", "chateau") or length >= 16:
        # Institutional long façade: steady rhythm, never next to door
        return dict(spacing=4, clear_door=2, clear_end=2, max_n=None)
    return dict(spacing=4, clear_door=2, clear_end=1, max_n=None)


def side_window_budget(kind, length):
    """E/W sides: fewer openings than main façade (serious-game readability)."""
    if kind == "department" or length <= 8:
        return dict(spacing=4, clear_door=2, clear_end=1, max_n=1)
    if length >= 14:
        return dict(spacing=5, clear_door=2, clear_end=2, max_n=4)
    return dict(spacing=4, clear_door=2, clear_end=1, max_n=2)


# ── Sample1 exterior building (roofs layer) ─────────────────────────────────


def stamp_exterior(roofs, sheet, s, roles, rng, dept_tint=None):
    """Sample1 house: roof bulk + classic elevation openings.

    Facade grammar (2 rows) — not French-doors at door level:
      ground row = door + wall allege (sill / wall base under the bay)
      upper row  = classic multi-pane windows on wall
    face=S (GC/CE): roof north, facade south.
    face=N (depts): roof bulk; 2-row north elevation overwrites north edge.
    """
    gx, gy, fw, fh = s["gx"], s["gy"], s["fw"], s["fh"]
    door_x, door_y, face = door_facade(s)
    kind = s.get("kind")

    # Always >=2 facade rows so allege + fenetre can stack
    wall_rows = 2 if fh >= 6 else 1
    wall_rows = min(max(wall_rows, 2 if fh >= 6 else 1), max(1, fh - 4))

    if face == "N":
        facade_y0, facade_y1 = 0, wall_rows
        roof_y0, roof_y1 = 0, fh  # full roof first; elevation overwrites N rows
        ground_ly = 0
        upper_ly = 1 if wall_rows >= 2 else 0
        eave_ly = None
    elif face == "S":
        roof_y0, roof_y1 = 0, fh - wall_rows
        facade_y0, facade_y1 = fh - wall_rows, fh
        ground_ly = facade_y1 - 1
        upper_ly = facade_y0 if wall_rows >= 2 else ground_ly
        eave_ly = roof_y1 - 1 if roof_y1 > roof_y0 else None
    else:
        facade_y0, facade_y1 = 0, 0
        roof_y0, roof_y1 = 0, fh
        ground_ly = upper_ly = None
        eave_ly = None
    roof_h = max(1, roof_y1 - roof_y0)

    if kind == "parlement":
        tw, tr, st = (70, 130, 95), (50, 110, 80), 0.16
    elif kind == "chateau":
        tw, tr, st = (210, 175, 100), (180, 100, 70), 0.2
    else:
        tw, tr, st = as_rgb(dept_tint), as_rgb(dept_tint), 0.24 if dept_tint else 0.0

    def paint_wall_cell_ext(tx, ty, lx, strength=None):
        s_ = st * 0.5 if strength is None else strength
        if lx == 0:
            paste(roofs, sheet, WALL_L, tx, ty, tw, s_)
        elif lx == fw - 1:
            paste(roofs, sheet, WALL_R, tx, ty, tw, s_)
        else:
            paste(roofs, sheet, WALL_FILL, tx, ty, tw, s_)

    # 1) Roof first (corners transparent -> grass)
    gable_w = fw if fw <= 6 else (5 if fw % 5 == 0 else 6)
    if fw > 6 and fw % gable_w == 1:
        gable_w = 5
    for ly in range(roof_y0, roof_y1):
        for lx in range(fw):
            local_ly = ly - roof_y0
            idx = roof_tile_for(lx, fw, local_ly, roof_h)
            if (
                0 < lx < fw - 1
                and local_ly == 0
                and roof_h >= 3
                and (lx % gable_w) == gable_w // 2
            ):
                idx = ROOF_KIT[0][1]
            paste(roofs, sheet, idx, gx + lx, gy + ly, tr, st)

    # 2) Wall under south eave (Sample1 reveal)
    if eave_ly is not None and roof_y0 <= eave_ly < roof_y1:
        for lx in range(fw):
            paint_wall_cell_ext(gx + lx, gy + eave_ly, lx)

    # 3) Full facade wall band (allege continuum)
    for ly in range(facade_y0, facade_y1):
        for lx in range(fw):
            paint_wall_cell_ext(gx + lx, gy + ly, lx, strength=st * 0.4)

    # 4) Classic openings: door on ground · windows on upper · never co-planar
    door_lx = door_x - gx
    budget = facade_window_budget(kind, fw)
    win_lxs = set(window_span_positions(fw, door_pos=door_lx, **budget))

    if ground_ly is not None:
        for lx in range(fw):
            tx, ty = gx + lx, gy + ground_ly
            if tx == door_x and ty == door_y:
                paste(roofs, sheet, DOOR_BUILDING, tx, ty)
            elif lx in win_lxs:
                # allege = mur bas sous la baie (prolongement de mur)
                paste(roofs, sheet, WALL_SILL, tx, ty, tw, st * 0.4)

    if upper_ly is not None and upper_ly != ground_ly:
        for lx in win_lxs:
            if lx == door_lx:
                continue
            tx, ty = gx + lx, gy + upper_ly
            paste(roofs, sheet, WINDOW_BODY, tx, ty)

    # 5) Side-entry door (E/W)
    if face in ("E", "W") or facade_y0 == facade_y1:
        if gx <= door_x < gx + fw and gy <= door_y < gy + fh:
            paste(roofs, sheet, WALL_FILL, door_x, door_y, tw, st * 0.4)
            paste(roofs, sheet, DOOR_BUILDING, door_x, door_y)


# ── Sample2 interior floor plan ─────────────────────────────────────────────


def floor_tile_for(kind, rng):
    """Architect-plan floors from dictionary room_programs."""
    if kind in ("hemicycle", "college", "meeting"):
        return FLOOR_HALL if rng.random() < 0.7 else FLOOR_HALL_B
    if kind in ("office", "dept", "corridor"):
        return FLOOR_OFFICE  # pure grey stone only (119 is brownish)
    return FLOOR_OFFICE


def paint_wall_cell(interiors, sheet, tx, ty, gx, fw):
    lx = tx - gx
    if lx == 0:
        paste(interiors, sheet, WALL_L, tx, ty)
    elif lx == fw - 1:
        paste(interiors, sheet, WALL_R, tx, ty)
    else:
        paste(interiors, sheet, WALL_INNER, tx, ty)


def place_window_on_wall(canvas, sheet, tx, ty, wall_cells, *, stack_cap=False):
    """Replace a wall cell with window BODY. Never paint outside wall_cells.

    stack_cap: only for N/S façades with a wall cell *north* of the body
    (thick shell). E/W sides stay body-only — a north-of-body cap on a
    vertical wall is not a real window stack and reads as clutter.
    """
    if (tx, ty) not in wall_cells:
        return
    paste(canvas, sheet, WINDOW_BODY, tx, ty)
    if stack_cap and (tx, ty - 1) in wall_cells:
        paste(canvas, sheet, WINDOW_CAP, tx, ty - 1)


def carve_opening(canvas, sheet, tx, ty, floor_id, floor_cells, wall_cells):
    """Trouée: floor through wall (room door / entrance gap)."""
    if not (0 <= tx and 0 <= ty):
        return
    paste(canvas, sheet, floor_id, tx, ty)
    floor_cells.add((tx, ty))
    wall_cells.discard((tx, ty))


def _partition_and_door(interiors, sheet, wx0, wy0, wx1, wy1, axis, gx, fw, floor_cells, wall_cells):
    """Paint partition strip [inclusive range] and carve mid trouée. axis='x' or 'y'."""
    if axis == "x":
        # vertical wall at wx0, y from wy0..wy1-1
        if wy1 <= wy0:
            return
        for ty in range(wy0, wy1):
            paint_wall_cell(interiors, sheet, wx0, ty, gx, fw)
            wall_cells.add((wx0, ty))
            floor_cells.discard((wx0, ty))
        mid = (wy0 + wy1) // 2
        carve_opening(interiors, sheet, wx0, mid, FLOOR_OFFICE, floor_cells, wall_cells)
    else:
        if wx1 <= wx0:
            return
        for tx in range(wx0, wx1):
            paint_wall_cell(interiors, sheet, tx, wy0, gx, fw)
            wall_cells.add((tx, wy0))
            floor_cells.discard((tx, wy0))
        mid = (wx0 + wx1) // 2
        carve_opening(interiors, sheet, mid, wy0, FLOOR_OFFICE, floor_cells, wall_cells)


def stamp_interior_sample2(interiors, sheet, s, roles, rng):
    """Architect floor-plan v10: mass → floors → partitions+trouées → windows on walls → furniture on floor."""
    gx, gy, fw, fh = s["gx"], s["gy"], s["fw"], s["fh"]

    # ── 1. Wall mass ───────────────────────────────────────────────────────
    wall_cells = set()
    for ty in range(gy, gy + fh):
        for tx in range(gx, gx + fw):
            paint_wall_cell(interiors, sheet, tx, ty, gx, fw)
            wall_cells.add((tx, ty))

    rooms = room_layouts(s)
    if not rooms:
        return

    # ── 2. Carve room floors ───────────────────────────────────────────────
    floor_cells = set()
    for rh in rooms:
        fid = floor_tile_for(rh["floor"], rng)
        for ty in range(rh["gy"], rh["gy"] + rh["fh"]):
            for tx in range(rh["gx"], rh["gx"] + rh["fw"]):
                paste(interiors, sheet, fid, tx, ty)
                floor_cells.add((tx, ty))
                wall_cells.discard((tx, ty))

    # ── 3. Partitions + TROUEE (no 168 curtain-as-door) ─────────────────────
    for i, a in enumerate(rooms):
        for b in rooms[i + 1 :]:
            # a left of b (vertical partition)
            if a["gx"] + a["fw"] + 1 == b["gx"]:
                wx = a["gx"] + a["fw"]
                y0 = max(a["gy"], b["gy"])
                y1 = min(a["gy"] + a["fh"], b["gy"] + b["fh"])
                if gx <= wx < gx + fw:
                    _partition_and_door(
                        interiors, sheet, wx, y0, wx, y1, "x", gx, fw, floor_cells, wall_cells
                    )
            elif b["gx"] + b["fw"] + 1 == a["gx"]:
                wx = b["gx"] + b["fw"]
                y0 = max(a["gy"], b["gy"])
                y1 = min(a["gy"] + a["fh"], b["gy"] + b["fh"])
                if gx <= wx < gx + fw:
                    _partition_and_door(
                        interiors, sheet, wx, y0, wx, y1, "x", gx, fw, floor_cells, wall_cells
                    )
            # a above b (horizontal partition)
            if a["gy"] + a["fh"] + 1 == b["gy"]:
                wy = a["gy"] + a["fh"]
                x0 = max(a["gx"], b["gx"])
                x1 = min(a["gx"] + a["fw"], b["gx"] + b["fw"])
                if gy <= wy < gy + fh:
                    _partition_and_door(
                        interiors, sheet, x0, wy, x1, wy, "y", gx, fw, floor_cells, wall_cells
                    )
            elif b["gy"] + b["fh"] + 1 == a["gy"]:
                wy = b["gy"] + b["fh"]
                x0 = max(a["gx"], b["gx"])
                x1 = min(a["gx"] + a["fw"], b["gx"] + b["fw"])
                if gy <= wy < gy + fh:
                    _partition_and_door(
                        interiors, sheet, x0, wy, x1, wy, "y", gx, fw, floor_cells, wall_cells
                    )

    # ── 4. Openings — shell only, architect rhythm + door clearance ────────
    kind = s.get("kind")
    door_x, door_y, face = door_facade(s)
    if gx <= door_x < gx + fw and gy <= door_y < gy + fh:
        carve_opening(
            interiors, sheet, door_x, door_y, FLOOR_HALL, floor_cells, wall_cells
        )

    # Main N/S façades: same budget as exterior (coherent dual-LOD)
    ns_budget = facade_window_budget(kind, fw)
    door_lx = door_x - gx if door_y in (gy, gy + fh - 1) else None
    for lx in window_span_positions(fw, door_pos=door_lx, **ns_budget):
        tx = gx + lx
        # North shell
        if not (tx == door_x and door_y == gy):
            place_window_on_wall(interiors, sheet, tx, gy, wall_cells, stack_cap=False)
        # South shell
        if not (tx == door_x and door_y == gy + fh - 1):
            place_window_on_wall(
                interiors, sheet, tx, gy + fh - 1, wall_cells, stack_cap=False
            )

    # E/W sides: sparser (institutional flanks, not greenhouse)
    ew_budget = side_window_budget(kind, fh)
    door_ly = door_y - gy if door_x in (gx, gx + fw - 1) else None
    for ly in window_span_positions(fh, door_pos=door_ly, **ew_budget):
        ty = gy + ly
        for tx in (gx, gx + fw - 1):
            if tx == door_x and ty == door_y:
                continue
            place_window_on_wall(interiors, sheet, tx, ty, wall_cells, stack_cap=False)

    # ── 5. Furniture ONLY on floor_cells, inset from walls ─────────────────
    def put_furn(idx, tx, ty):
        if (tx, ty) in floor_cells:
            paste(interiors, sheet, idx, tx, ty)

    def inset_xy(rh, prefer="center"):
        """Keep furniture off the wall ring inside the room."""
        pad = 0 if rh["fw"] <= 2 or rh["fh"] <= 2 else 0
        # soft inset: prefer one tile in from room edge when room is wide enough
        ix0 = rh["gx"] + (1 if rh["fw"] >= 3 else 0)
        iy0 = rh["gy"] + (1 if rh["fh"] >= 3 else 0)
        ix1 = rh["gx"] + rh["fw"] - 1 - (1 if rh["fw"] >= 3 else 0)
        iy1 = rh["gy"] + rh["fh"] - 1 - (1 if rh["fh"] >= 3 else 0)
        if prefer == "center":
            return (rh["gx"] + rh["fw"] // 2, rh["gy"] + rh["fh"] // 2)
        if prefer == "nw":
            return ix0, iy0
        if prefer == "se":
            return ix1, iy1
        if prefer == "sw":
            return ix0, iy1
        if prefer == "ne":
            return ix1, iy0
        return ix0, iy0

    for rh in rooms:
        prog = rh["floor"]
        cx, cy = inset_xy(rh, "center")
        if prog == "hemicycle" and rh["fw"] >= 5 and rh["fh"] >= 4:
            # Carpet inset: leave a stone border (circulation) around the green
            for ty in range(rh["gy"] + 1, rh["gy"] + rh["fh"] - 1):
                for tx in range(rh["gx"] + 1, rh["gx"] + rh["fw"] - 1):
                    if (tx, ty) in floor_cells:
                        paste(interiors, sheet, FLOOR_CARPET, tx, ty)
            put_furn(DESK, cx, cy)
            for dx, dy in [(-1, 0), (1, 0), (0, -1), (0, 1), (-2, 0), (2, 0)]:
                put_furn(CHAIR[abs(dx + dy) % 2], cx + dx, cy + dy)
        elif prog in ("college", "meeting") and rh["fw"] >= 3 and rh["fh"] >= 3:
            put_furn(pick(rng, list(TABLE)), cx, cy)
            for dx, dy in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
                if rh["fw"] > 2 or dx == 0:
                    put_furn(CHAIR[0], cx + dx, cy + dy)
        elif prog in ("office", "dept") and rh["fw"] >= 2 and rh["fh"] >= 2:
            # One clear workstation: desk + chair, not glued to the north wall
            desk_x, desk_y = inset_xy(rh, "nw")
            # Prefer slightly off-center if room is wide
            if rh["fw"] >= 3:
                desk_x = rh["gx"] + max(1, rh["fw"] // 2 - 1)
            put_furn(DESK, desk_x, desk_y)
            if rh["fh"] >= 2:
                chair_y = min(desk_y + 1, rh["gy"] + rh["fh"] - 1)
                put_furn(CHAIR[0], desk_x, chair_y)
            cab_x, cab_y = inset_xy(rh, "se")
            if (cab_x, cab_y) in ((desk_x, desk_y), (desk_x, desk_y + 1)):
                cab_x, cab_y = inset_xy(rh, "sw")
            put_furn(CABINET[0], cab_x, cab_y)
            # Second desk only in truly generous offices (not every 3×2 cell)
            if rh["fw"] >= 5 and rh["fh"] >= 4:
                d2x, d2y = inset_xy(rh, "ne")
                put_furn(DESK, d2x, d2y)
                put_furn(CHAIR[1], max(rh["gx"], d2x - 1), d2y)


# ── hotspots ────────────────────────────────────────────────────────────────


def write_hotspots(sites, world):
    """Hotspots for rooms + sites — pixel coords at scaled grid."""
    hotspots = []
    for s in sites:
        # site-level — prefer full institutional display name
        site_label = s.get("displayName") or s.get("label") or s["id"]
        if s.get("kind") == "parlement":
            site_label = "Grand Conseil"
        elif s.get("kind") == "chateau":
            site_label = "Conseil d'État — Château Saint-Maire"
        hotspots.append(
            {
                "id": s["id"],
                "label": site_label,
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

    print(f"Roguelike v10 — architect plan · grid {W}×{H}")

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
    water = first(roles, "water")
    cobble = first(roles, "cobble")
    # Shore materials (dirt beach + soft water edge — not a straight road strip)
    DIRT_SHORE = 63
    WATER_EDGE_N = 1  # water with north-ish variation (sheet family)
    WATER_VAR = (60, 0, 57, 58)  # open water variants

    # ── Natural lake shore (Léman) ──────────────────────────────────────────
    # Waterline y varies gently along x (no perfect straight edge).
    # Band: grass → sparse dirt → irregular water edge → deep water.
    water_base = H - S(2)
    shore_ys = []  # per-column waterline (first water tile y)
    for tx in range(W):
        # low-frequency wobble + small noise (seeded)
        wobble = int(1.2 * math.sin(tx * 0.35 + 0.7))
        noise = 1 if rng.random() < 0.18 else ( -1 if rng.random() < 0.12 else 0)
        shore_ys.append(max(water_base - 2, min(water_base + 1, water_base + wobble + noise)))

    for ty in range(H):
        for tx in range(W):
            wl = shore_ys[tx]
            if ty > wl + 1:
                paste(ground, sheet, pick(rng, list(WATER_VAR)) or water, tx, ty)
            elif ty == wl + 1:
                paste(ground, sheet, water, tx, ty)
            elif ty == wl:
                # water edge — slightly varied
                paste(
                    ground,
                    sheet,
                    WATER_EDGE_N if rng.random() < 0.55 else water,
                    tx,
                    ty,
                )
            elif ty == wl - 1:
                # beach / mud line — intermittent, not a continuous path
                if rng.random() < 0.72:
                    paste(ground, sheet, DIRT_SHORE, tx, ty)
                elif rng.random() < 0.35:
                    paste(ground, sheet, PATH_H, tx, ty)  # sandy grit
                else:
                    paste(ground, sheet, grass, tx, ty)
            elif ty == wl - 2 and rng.random() < 0.22:
                # sparse dirt flecks inland
                paste(ground, sheet, DIRT_SHORE, tx, ty)
            else:
                paste(ground, sheet, grass, tx, ty)

    # esplanade cobble
    for ty in range(esplanade["gy0"], esplanade["gy1"] + 1):
        for tx in range(esplanade["gx0"], esplanade["gx1"] + 1):
            if (tx, ty) not in occupied:
                paste(ground, sheet, cobble, tx, ty)

    # Do NOT add the lake shore to the road path set (was making a straight dirt "road")

    # orientation-aware path tunnels (H/V grain + corners)
    paint_oriented_paths(ground, sheet, path_cells, W, H)

    # free for trees (keep clear of water)
    free = set()
    for ty in range(0, H - S(3)):
        for tx in range(W):
            if (tx, ty) in occupied or (tx, ty) in path_cells:
                continue
            if esplanade["gx0"] <= tx <= esplanade["gx1"] and esplanade["gy0"] <= ty <= esplanade["gy1"]:
                continue
            if ty >= shore_ys[tx] - 1:
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

    # No free-floating props on the esplanade (was DOOR_BUILDING orphan mid-cobble).

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

    # role + orientation proof sheet
    pairs = [
        ("grass", [grass]),
        ("pathV", [PATH_V]),
        ("pathH", [PATH_H]),
        ("pNE", [407]),
        ("pES", [406]),
        ("pSW", [464]),
        ("pNW", [636]),
        ("water", [water]),
        ("treeC", [first(roles, "tree_canopy")]),
        ("treeT", [first(roles, "tree_trunk")]),
        ("rTL", [ROOF_KIT[0][0]]),
        ("rTOP", [ROOF_KIT[0][1]]),
        ("rTR", [ROOF_KIT[0][2]]),
        ("rBL", [ROOF_KIT[2][0]]),
        ("rBR", [ROOF_KIT[2][2]]),
        ("wall", [WALL_FILL, WALL_L, WALL_R]),
        ("doorB", [DOOR_BUILDING]),
        ("doorR", []),  # trouée — no sprite
        ("winBody", [WINDOW_BODY]),
        ("winCap", [WINDOW_CAP]),
        ("office", [FLOOR_OFFICE, FLOOR_OFFICE_B]),
        ("hall", [FLOOR_HALL, FLOOR_HALL_B]),
        ("carpet", [FLOOR_CARPET]),
        ("chair", list(CHAIR)),
        ("desk", [DESK]),
    ]
    img = Image.new("RGBA", (260, len(pairs) * 22), (18, 20, 26, 255))
    dr = ImageDraw.Draw(img)
    for ri, (name, ids) in enumerate(pairs):
        dr.text((2, ri * 22 + 4), name, fill=(230, 230, 240))
        for ci, idx in enumerate(ids[:8]):
            if idx is None:
                continue
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
        "playbook": "roguelike_playbook.json v10",
        "packs": ["Roguelike RPG Pack — Kenney CC0 (sole art source)"],
        "credit": "Assets by Kenney (www.kenney.nl) CC0 — Roguelike RPG Pack.",
        "da": {
            "goal": "serious-game architect floor-plan",
            "walls": "mass→carve→partition→openings replace",
            "openings": "door=150 / room=trouée / window=215; architect rhythm (spacing 4–5, clear_door≥2, clear corners, max 2 on depts)",
            "floors": "office=120 hall=698 carpet=980",
            "furniture": "desk+chair+cabinet on floor, inset from walls",
            "roof": "Sample1 bulk roof + thin façade; corners transparent over grass",
            "spatial_invariants": [
                "no opening outside wall_cells",
                "no furniture outside floor_cells",
                "no free-floating props on esplanade",
                "roof covers bulk; façade ≤2 rows",
                "windows never adjacent to door; E/W sparser than main façade",
            ],
        },
        "layers": {
            "ground": "ground.png",
            "roofs": "roofs.png",
            "interiors": "interiors.png",
        },
        "hotspots": n_hs,
    }
    (OUT / "meta.json").write_text(json.dumps(meta, indent=2), encoding="utf-8")

    # Path graph for dossier routing (Mode Parcours)
    doors = {}
    for s in sites:
        dx, dy, face = door_facade(s)
        ox, oy = outside_of_door(dx, dy, face)
        doors[s["id"]] = {
            "door": [dx, dy],
            "apron": [ox, oy],
            "face": face,
            "kind": s.get("kind"),
        }
    path_graph = {
        "tile": TW,
        "grid": {"w": W, "h": H},
        "cells": [[x, y] for x, y in sorted(path_cells)],
        "doors": doors,
    }
    (OUT / "path_graph.json").write_text(
        json.dumps(path_graph, indent=2, ensure_ascii=False), encoding="utf-8"
    )
    (OUT / "CREDITS.txt").write_text(
        "Roguelike RPG Pack by Kenney (www.kenney.nl) — CC0 1.0\n"
        "https://kenney.nl/assets/roguelike-rpg-pack\n"
        "Architect plan dual LOD — playbook v10 semantic dictionary.\n",
        encoding="utf-8",
    )
    print(f"OK v10 {W}×{H}px={W*TW}×{H*TW} hotspots={n_hs} paths={len(path_cells)}")


if __name__ == "__main__":
    build()
