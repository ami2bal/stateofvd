/**
 * Vector smooth shapes — DA v6 / ADR D-012 (plan de masse lisse).
 * Pixi Graphics only, anti-aliased. No bitmaps, no NEAREST.
 */
/* global PIXI */
import { createRoomIcon } from "./room-icons.js";
import {
  roomLabelShort,
  roomLabelFull,
} from "./room-nomenclature.js";

export const TILE = 24;
export const USHER_W = 14;
export const USHER_H = 20;

/** GDD material ramps — palette plan de masse (D-012). */
export const RAMPS = {
  molasse: { light: "#DCD2BE", base: "#C9BCA3", shadow: "#A89F8D" },
  brique: { light: "#BE7057", base: "#A4553E", shadow: "#7E3F2E" },
  toit: { light: "#B4674F", base: "#B4674F", shadow: "#8E5843" },
  eau: { light: "#6BA4C8", base: "#4C83AB", shadow: "#2E4E66" },
  crepi: { light: "#F2ECE0", base: "#EDE8DC", shadow: "#C8C2B4" },
  pave: { light: "#C8C2B6", base: "#B8B2A6", shadow: "#9A958A" },
  herbe: { light: "#C8D9A8", base: "#C8D9A8", shadow: "#A8BE84" },
  vitre: { light: "#B8D4EA", base: "#9FC2DC", shadow: "#6A8FAA" },
  encre: { light: "#4A5F8A", base: "#2F4266", shadow: "#1E2C44" },
  vertGc: { light: "#5A9A6E", base: "#3E7A52", shadow: "#2A5638" },
  sableCe: { light: "#D4B87A", base: "#C9A45C", shadow: "#A08040" },
  parquet: { light: "#E0D0A8", base: "#D4C4A0", shadow: "#B8A888" },
  peau: { light: "#F0D0B0", base: "#E0B890", shadow: "#C49870" },
  juraFar: { light: "#9DB3BC", base: "#9DB3BC", shadow: "#7A949E" },
  juraNear: { light: "#6E8A6E", base: "#6E8A6E", shadow: "#4F5E3C" },
  ciel: { light: "#DCEAF3", base: "#DCEAF3", shadow: "#C5D8E8" },
  salle: { light: "#EDE8DC", base: "#EDE8DC", shadow: "#B8AE98" },
};

export const RESP_GOLD = "#E8C15A";

export function hexToNum(hex) {
  return parseInt(String(hex).replace("#", ""), 16);
}

/** Smooth (linear) scale — anti-aliased edges. */
export function applySmoothGlobal() {
  if (typeof PIXI === "undefined") return;
  PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.LINEAR;
  if (PIXI.BaseTexture?.defaultOptions) {
    PIXI.BaseTexture.defaultOptions.scaleMode = PIXI.SCALE_MODES.LINEAR;
  }
}

/** @deprecated use applySmoothGlobal */
export function applyNearestGlobal() {
  applySmoothGlobal();
}

function wallFill(kind) {
  // Plan body = molasse light (maquette) ; château keeps brique accent via stroke/turrets
  if (kind === "chateau") return RAMPS.molasse.light;
  if (kind === "rumine") return RAMPS.molasse.light;
  return RAMPS.molasse.light; // #DCD2BE
}

function wallStroke(kind) {
  // K18: CE without red brick stroke — same molasse as others
  if (kind === "rumine") return RAMPS.molasse.shadow;
  return RAMPS.molasse.shadow;
}

function headerFill(kind, site) {
  if (kind === "parlement") return RAMPS.vertGc.base;
  // K23: CE header darker orange for white icon/text contrast
  if (kind === "chateau") return "#8F5A18";
  if (kind === "rumine") return RAMPS.encre.base;
  if (kind === "department" && site.deptTint) return site.deptTint;
  return RAMPS.molasse.shadow;
}

/**
 * Plan-style building (rounded rect + rooms + flag). LOD roofs via alpha layers.
 */
export function makeBuildingSprite(site) {
  const fw = site.fw;
  const fh = site.fh;
  const w = fw * TILE;
  const h = fh * TILE;
  const kind = site.kind;
  const cont = new PIXI.Container();

  // soft contact shadow
  const sh = new PIXI.Graphics();
  sh.beginFill(hexToNum(RAMPS.encre.base), 0.12);
  sh.drawEllipse(w / 2, h - 2, w * 0.42, 6);
  sh.endFill();
  cont.addChild(sh);

  // interior slot (labels / extra furniture)
  const interiorSlot = new PIXI.Container();
  cont.addChild(interiorSlot);
  cont.__interiorSlot = interiorSlot;

  // body fill (perimeter stroke drawn later with door gap — no border across door)
  const body = new PIXI.Graphics();
  const strokeW = 2;
  const wallCol = hexToNum(wallStroke(kind));
  const fillCol = hexToNum(wallFill(kind));
  body.beginFill(fillCol);
  body.drawRoundedRect(0, 0, w, h, 4);
  body.endFill();
  cont.addChild(body);
  cont.__body = body;

  // header band — K32: departments have header at BOTTOM (north door free)
  const headerH = Math.max(20, Math.min(28, Math.round(h * 0.28)));
  const headerAtBottom = kind === "department";
  const headerY = headerAtBottom ? h - headerH : 0;
  const header = new PIXI.Graphics();
  header.beginFill(hexToNum(headerFill(kind, site)));
  header.drawRoundedRect(0, headerY, w, headerH, 4);
  header.endFill();
  // square off the inner edge so rooms sit flush
  header.beginFill(hexToNum(headerFill(kind, site)));
  if (headerAtBottom) {
    header.drawRect(0, headerY, w, 6);
  } else {
    header.drawRect(0, headerH - 6, w, 6);
  }
  header.endFill();
  cont.addChild(header);
  cont.__header = header;
  cont.__headerY = headerY;
  cont.__headerAtBottom = headerAtBottom;

  // Header icon (left) — fixed left margin, reserved width for labels (K13/K28)
  const iconPad = 5;
  const iconR = Math.min(9, headerH * 0.36);
  const icon = drawHeaderIcon(kind, site, headerH);
  const iconSlotW = iconPad + iconR * 2 + 6; // reserved for text offset
  if (icon) {
    icon.x = iconPad + iconR;
    icon.y = headerY + headerH / 2;
    const iconMask = new PIXI.Graphics();
    iconMask.beginFill(0xffffff);
    iconMask.drawRect(2, headerY + 2, iconSlotW + 2, headerH - 4);
    iconMask.endFill();
    cont.addChild(iconMask);
    icon.mask = iconMask;
    cont.addChild(icon);
    cont.__headerIcon = icon;
    cont.__headerIconMask = iconMask;
  }
  cont.__iconSlotW = iconSlotW;

  // Meta for screenLabels only — NO world-space PIXI.Text (TASK-094 K9)
  const titleShort =
    kind === "parlement"
      ? "Grand Conseil"
      : kind === "chateau"
        ? "Conseil d'État"
        : kind === "rumine"
          ? "Rumine"
          : site.acronym || (site.displayName || site.id).split("—")[0].trim();
  const titleLong =
    kind === "parlement"
      ? "Grand Conseil"
      : kind === "chateau"
        ? "Conseil d'État"
        : kind === "rumine"
          ? "Palais de Rumine"
          : site.displayName || site.acronym || site.id;
  cont.__title = null; // screenLabels only
  cont.__titleMask = null;
  cont.__titleShort = titleShort;
  cont.__titleLong = titleLong;
  cont.__headerH = headerH;
  cont.__siteId = site.id;
  cont.__kind = kind;
  // K23: CE uses white labels (like others)
  cont.__titleFill = 0xffffff;

  // rooms plan — flush under/above header (no useless pad band)
  const doorNorth = kind === "department";
  const roomsLayer = new PIXI.Container();
  roomsLayer.y = headerAtBottom ? 0 : headerH;
  cont.addChild(roomsLayer);
  cont.__roomsLayer = roomsLayer;
  const roomLabels = [];
  cont.__roomLabels = roomLabels;
  const roomDoors = [];
  const planH = h - headerH;
  // building door half-width for foyer + perimeter gap
  const doorW = Math.max(8, Math.min(14, w * 0.09));
  drawRooms(roomsLayer, site, w, planH, roomLabels, roomDoors, {
    doorNorth,
    doorW,
  });
  cont.__roomDoors = roomDoors;
  cont.__roomIcons = roomsLayer.__roomIcons || {};

  // TASK-108 K6: paths follow central distribution corridor (doors open onto it)
  const buildDoor = doorNorth
    ? { x: w / 2, y: 0 }
    : { x: w / 2, y: planH };
  const pathsIn = new PIXI.Graphics();
  const grey = hexToNum(RAMPS.pave.shadow);
  const greyEdge = hexToNum(RAMPS.encre.base);
  function strokeHV(x0, y0, x1, y1) {
    pathsIn.lineStyle(3.5, greyEdge, 0.14);
    pathsIn.moveTo(x0, y0);
    pathsIn.lineTo(x1, y1);
    pathsIn.lineStyle(2.2, grey, 0.88);
    pathsIn.moveTo(x0, y0);
    pathsIn.lineTo(x1, y1);
  }
  let pathMeta = null;
  const corridor = roomsLayer.__corridor;
  if (roomDoors.length && corridor) {
    const gutterX = Math.round(corridor.gutterX ?? w / 2);
    const corridorY = corridor.y;
    if (corridor.vertical) {
      // vertical spine: rooms L|R open onto center aisle → building door
      const ys = roomDoors.map((d) => d.y).concat([buildDoor.y]);
      strokeHV(gutterX, Math.min(...ys), gutterX, Math.max(...ys));
      for (const rd of roomDoors) {
        strokeHV(rd.x, rd.y, gutterX, rd.y);
      }
      if (Math.abs(buildDoor.x - gutterX) > 0.5) {
        strokeHV(gutterX, buildDoor.y, buildDoor.x, buildDoor.y);
      }
      // one rail per door y so connections.js stubs stay Manhattan
      pathMeta = {
        gutterX,
        rails: roomDoors.map((d) => ({
          y: d.y,
          doors: [
            {
              roomId: d.roomId,
              x: d.x,
              y: d.y,
              side: d.side,
              rect: d.rect,
            },
          ],
        })),
        buildDoor: { x: buildDoor.x, y: buildDoor.y },
        doorNorth,
        corridorY,
        vertical: true,
      };
    } else {
      // horizontal spine of the distribution corridor
      const xs = roomDoors.map((d) => d.x);
      const xMin = Math.min(...xs, gutterX, buildDoor.x);
      const xMax = Math.max(...xs, gutterX, buildDoor.x);
      strokeHV(xMin, corridorY, xMax, corridorY);
      for (const rd of roomDoors) {
        if (Math.abs(rd.y - corridorY) > 0.5) {
          strokeHV(rd.x, rd.y, rd.x, corridorY);
        }
      }
      strokeHV(gutterX, corridorY, gutterX, buildDoor.y);
      if (Math.abs(buildDoor.x - gutterX) > 0.5) {
        strokeHV(gutterX, buildDoor.y, buildDoor.x, buildDoor.y);
      }
      pathMeta = {
        gutterX,
        rails: [
          {
            y: corridorY,
            doors: roomDoors.map((d) => ({
              roomId: d.roomId,
              x: d.x,
              y: d.y,
              side: d.side,
              rect: d.rect,
            })),
          },
        ],
        buildDoor: { x: buildDoor.x, y: buildDoor.y },
        doorNorth,
        corridorY,
      };
    }
  } else if (roomDoors.length) {
    // fallback (no corridor meta): short Manhattan as before
    const gutterX = Math.round(w / 2);
    const byRow = new Map();
    for (const rd of roomDoors) {
      const key = rd.rect ? Math.round(rd.rect.y) : 0;
      if (!byRow.has(key)) byRow.set(key, []);
      byRow.get(key).push(rd);
    }
    const rails = [];
    for (const key of [...byRow.keys()].sort((a, b) => a - b)) {
      const doors = byRow.get(key);
      const bottoms = doors.map((d) => (d.rect ? d.rect.y + d.rect.h : d.y));
      const corridorY = Math.round(Math.max(...bottoms) + 1.5);
      rails.push({
        y: corridorY,
        doors: doors.map((d) => ({
          roomId: d.roomId,
          x: d.x,
          y: d.y,
          side: d.side || "s",
          rect: d.rect,
        })),
      });
      for (const rd of doors) {
        strokeHV(rd.x, rd.y, rd.x, corridorY);
        strokeHV(rd.x, corridorY, gutterX, corridorY);
      }
    }
    if (rails.length) {
      const ys = rails.map((r) => r.y).concat([buildDoor.y]);
      strokeHV(gutterX, Math.min(...ys), gutterX, Math.max(...ys));
      strokeHV(gutterX, buildDoor.y, buildDoor.x, buildDoor.y);
    }
    pathMeta = {
      gutterX,
      rails,
      buildDoor: { x: buildDoor.x, y: buildDoor.y },
      doorNorth,
    };
  }
  roomsLayer.addChildAt(pathsIn, 0);
  cont.__interiorPaths = pathsIn;
  cont.__pathMeta = pathMeta;
  cont.__roomRects = roomDoors.map((d) => d.rect).filter(Boolean);

  // Building perimeter — stroke with GAP at door (no border across opening)
  const peri = new PIXI.Graphics();
  peri.lineStyle(strokeW, wallCol, 1);
  drawPerimeterWithDoorGap(peri, w, h, doorNorth, doorW, 4);
  cont.addChild(peri);
  cont.__perimeter = peri;

  // Building door — TASK-108 K5: 2 montants only (NO bridge across posts)
  const postLen = 5;
  const door = new PIXI.Graphics();
  door.lineStyle(1.35, hexToNum(RAMPS.encre.base), 0.55);
  if (doorNorth) {
    const dy = 0;
    door.moveTo(w / 2 - doorW / 2, dy);
    door.lineTo(w / 2 - doorW / 2, dy + postLen);
    door.moveTo(w / 2 + doorW / 2, dy);
    door.lineTo(w / 2 + doorW / 2, dy + postLen);
    cont.__buildingDoor = { x: w / 2, y: 0, w: doorW, side: "n" };
  } else {
    door.moveTo(w / 2 - doorW / 2, h);
    door.lineTo(w / 2 - doorW / 2, h - postLen);
    door.moveTo(w / 2 + doorW / 2, h);
    door.lineTo(w / 2 + doorW / 2, h - postLen);
    cont.__buildingDoor = { x: w / 2, y: h, w: doorW, side: "s" };
  }
  door.__doorGlyph = "two-posts";
  cont.addChild(door);
  cont.__hasBuildingDoor = true;

  // Roof / mass overlay at dézoom (body area excluding header band)
  const roof = new PIXI.Graphics();
  roof.beginFill(hexToNum(RAMPS.toit.base), 1);
  if (headerAtBottom) {
    roof.drawRoundedRect(1, 1, w - 2, h - headerH - 2, 3);
  } else {
    roof.drawRoundedRect(1, headerH + 2, w - 2, h - headerH - 4, 3);
  }
  roof.endFill();
  roof.lineStyle(1.5, hexToNum(RAMPS.toit.shadow), 0.55);
  const midY = headerAtBottom
    ? (h - headerH) * 0.45
    : headerH + (h - headerH) * 0.45;
  roof.moveTo(8, midY);
  roof.lineTo(w - 8, midY);
  roof.alpha = 1;
  cont.addChild(roof);
  cont.__roof = roof;
  cont.__roofByLod = null;
  cont.__planRooms = true;
  // TASK-094 #13: no flags, no GC lantern

  cont.__w = w;
  cont.__h = h;
  cont.__wallH = headerH;
  cont.__roofH = 8;
  cont.__footH = h;
  cont.__facTop = 0;
  cont.__isVector = true;
  return cont;
}

/** Small monochrome pictogram for header left — size ∝ headerH, never overflows. */
function drawHeaderIcon(kind, site, headerH) {
  const g = new PIXI.Graphics();
  const s = Math.min(9, headerH * 0.36); // K13: tighter than header
  // K23: CE icon white like others
  const col = 0xffffff;
  g.lineStyle(1.2, col, 0.9);
  if (kind === "parlement") {
    g.arc(0, s * 0.25, s * 0.55, Math.PI, 0, false);
    g.arc(0, s * 0.25, s * 0.35, Math.PI, 0, false);
  } else if (kind === "chateau") {
    g.drawEllipse(0, 0, s * 0.45, s * 0.28);
  } else if (kind === "rumine") {
    g.drawRoundedRect(-s * 0.38, -s * 0.12, s * 0.76, s * 0.42, 1.5);
    g.moveTo(-s * 0.22, -s * 0.12);
    g.quadraticCurveTo(0, -s * 0.4, s * 0.22, -s * 0.12);
  } else if (kind === "department") {
    g.drawRect(-s * 0.32, -s * 0.28, s * 0.64, s * 0.55);
    g.moveTo(-s * 0.32, -s * 0.05);
    g.lineTo(s * 0.32, -s * 0.05);
  } else {
    g.drawCircle(0, 0, s * 0.28);
  }
  g.__isHeaderIcon = true;
  return g;
}

/**
 * Building outer stroke with a gap at the exterior door (no border across opening).
 */
function drawPerimeterWithDoorGap(g, w, h, doorNorth, doorW, radius = 4) {
  const r = Math.min(radius, w / 4, h / 4);
  const cx = w / 2;
  const half = doorW / 2;
  const left = cx - half;
  const right = cx + half;

  // Top edge (N)
  if (doorNorth) {
    g.moveTo(r, 0);
    g.lineTo(left, 0);
    // gap for door
    g.moveTo(right, 0);
    g.lineTo(w - r, 0);
  } else {
    g.moveTo(r, 0);
    g.lineTo(w - r, 0);
  }
  // top-right corner + right side
  g.arc(w - r, r, r, -Math.PI / 2, 0, false);
  g.lineTo(w, h - r);
  // bottom-right corner
  g.arc(w - r, h - r, r, 0, Math.PI / 2, false);
  // Bottom edge (S)
  if (!doorNorth) {
    g.lineTo(right, h);
    g.moveTo(left, h);
    g.lineTo(r, h);
  } else {
    g.lineTo(r, h);
  }
  // bottom-left + left side + top-left
  g.arc(r, h - r, r, Math.PI / 2, Math.PI, false);
  g.lineTo(0, r);
  g.arc(r, r, r, Math.PI, (Math.PI * 3) / 2, false);
}

/**
 * Horizontal wall with optional door gap (no stroke across opening).
 */
function strokeHGap(g, x0, x1, y, gapCenter, gapW) {
  if (gapCenter == null || gapW <= 0) {
    g.moveTo(x0, y);
    g.lineTo(x1, y);
    return;
  }
  const gl = gapCenter - gapW / 2;
  const gr = gapCenter + gapW / 2;
  if (gl > x0) {
    g.moveTo(x0, y);
    g.lineTo(Math.min(gl, x1), y);
  }
  if (gr < x1) {
    g.moveTo(Math.max(gr, x0), y);
    g.lineTo(x1, y);
  }
}

/**
 * Vertical wall (shared partition) — full segment, no gap.
 */
function strokeV(g, x, y0, y1) {
  g.moveTo(x, y0);
  g.lineTo(x, y1);
}

/**
 * TASK-108 K6: room weight for natural (non-uniform) sizes, still balanced.
 * Max/min ratio kept ≤ ~1.5 so no microscopic rooms.
 */
function roomLayoutWeight(room, i) {
  // mild variation only — keep max/min area ≤ ~1.6 after foyer split
  if (room.role === "hemicycle" || room.id === "plenum-gc") return 1.18;
  if (room.role === "council-table" || room.id === "college-ce") return 1.12;
  const wobble = [1.05, 0.97, 1.08, 0.95, 1.0, 1.03][i % 6];
  return wobble;
}

/** Split widths across a bank (gap=0 → rooms share walls, no void). */
function splitBankWidths(count, innerW, gap, weights) {
  if (count <= 0) return [];
  const tw = weights.reduce((a, b) => a + b, 0) || count;
  const usable = innerW - gap * Math.max(0, count - 1);
  return weights.map((wt) => (usable * wt) / tw);
}

/**
 * Layout rects for a bank. If foyerW>0, leave a central stem so the
 * building door is never obstructed by a room.
 * @returns {{ room, x, y, w, h, doorSide }[]}
 */
function layoutBankRects(bankList, bankY, bankH, doorSide, indexOffset, innerW, x0, foyerW) {
  if (!bankList.length || bankH < 8) return [];
  const weights = bankList.map((r, i) => roomLayoutWeight(r, indexOffset + i));
  const n = bankList.length;
  const out = [];

  const packFull = () => {
    const widths = splitBankWidths(n, innerW, 0, weights);
    let x = x0;
    bankList.forEach((room, i) => {
      out.push({ room, x, y: bankY, w: widths[i], h: bankH, doorSide });
      x += widths[i];
    });
    return out;
  };

  if (!(foyerW > 0 && n >= 1)) return packFull();

  const foyerX = x0 + (innerW - foyerW) / 2;
  const leftW = Math.max(0, foyerX - x0);
  const rightW = Math.max(0, x0 + innerW - (foyerX + foyerW));
  // tiny wing (dept fw=3): foyer would crush rooms → pack full, path still free via corridor
  if (leftW < 10 && rightW < 10) return packFull();

  let leftRooms;
  let rightRooms;
  let leftWeights;
  let rightWeights;
  if (n === 1) {
    // single room: put on the wider side of the foyer (vestibule on the other)
    if (leftW >= rightW) {
      leftRooms = bankList.slice();
      leftWeights = weights.slice();
      rightRooms = [];
      rightWeights = [];
    } else {
      leftRooms = [];
      leftWeights = [];
      rightRooms = bankList.slice();
      rightWeights = weights.slice();
    }
  } else {
    // greedy: assign each room to the side with lower projected area (balance)
    leftRooms = [];
    rightRooms = [];
    leftWeights = [];
    rightWeights = [];
    let leftLoad = 0;
    let rightLoad = 0;
    bankList.forEach((room, i) => {
      const wt = weights[i];
      // projected area ∝ weight / side capacity — prefer emptier side
      const leftScore = leftLoad / Math.max(1, leftW);
      const rightScore = rightLoad / Math.max(1, rightW);
      if (leftScore <= rightScore && leftW >= 10) {
        leftRooms.push(room);
        leftWeights.push(wt);
        leftLoad += wt;
      } else if (rightW >= 10) {
        rightRooms.push(room);
        rightWeights.push(wt);
        rightLoad += wt;
      } else {
        leftRooms.push(room);
        leftWeights.push(wt);
        leftLoad += wt;
      }
    });
  }

  if (leftRooms.length && leftW >= 10) {
    const widths = splitBankWidths(leftRooms.length, leftW, 0, leftWeights);
    let x = x0;
    leftRooms.forEach((room, i) => {
      out.push({ room, x, y: bankY, w: widths[i], h: bankH, doorSide });
      x += widths[i];
    });
  } else if (leftRooms.length) {
    // merge left rooms into right side
    rightRooms = leftRooms.concat(rightRooms);
    rightWeights = leftWeights.concat(rightWeights);
  }

  if (rightRooms.length && rightW >= 10) {
    const widths = splitBankWidths(rightRooms.length, rightW, 0, rightWeights);
    let x = foyerX + foyerW;
    rightRooms.forEach((room, i) => {
      out.push({ room, x, y: bankY, w: widths[i], h: bankH, doorSide });
      x += widths[i];
    });
  }

  return out.length ? out : packFull();
}

/**
 * TASK-108: plan plein-cadre + corridor central + bordures fusionnées.
 * - gap 0 entre salles d'une même aile (cloison partagée unique)
 * - pas de double trait mur bâtiment / mur salle (salles = fill only)
 * - ouvertures nettes aux portes (corridor + foyer vers porte bâtiment)
 * @param {{ doorNorth?: boolean, doorW?: number }} [opts]
 */
function drawRooms(layer, site, w, availH, roomLabels, roomDoors, opts = {}) {
  const rooms = site.rooms || [];
  const kind = site.kind;
  if (!rooms.length && kind !== "rumine" && kind !== "department") {
    return;
  }
  const list =
    rooms.length > 0
      ? rooms
      : (site.zones || []).map((z) => ({
          id: z.id,
          label: z.label,
          role: z.role,
        }));
  if (!list.length) return;
  const n = list.length;
  layer.__roomIcons = layer.__roomIcons || {};
  const pad = 0; // flush — outer walls = building perimeter
  const doorNorth = !!opts.doorNorth;
  const doorW = opts.doorW || Math.max(8, Math.min(14, w * 0.09));
  // foyer stem keeps building door free (only useful gap besides corridor)
  const foyerW = Math.max(doorW + 4, Math.min(20, Math.round(w * 0.1)));
  // central corridor — only intentional band between wings
  const corridorH = Math.max(10, Math.min(14, Math.round(availH * 0.12)));
  const refend = hexToNum(RAMPS.salle?.shadow || RAMPS.molasse?.shadow || "#B8AE98");
  const crepi = hexToNum(RAMPS.salle.base);
  const innerW = w - pad * 2;
  const usableH = Math.max(28, availH - pad * 2 - corridorH);

  // floor / corridor mass (visible in corridor + foyer)
  const floor = new PIXI.Graphics();
  floor.beginFill(refend, 1);
  floor.drawRect(pad, pad, w - pad * 2, Math.max(1, availH - pad * 2));
  floor.endFill();
  floor.__isRefendFloor = true;
  layer.addChild(floor);

  // Layout mode:
  //  - n≤2: vertical central corridor (rooms L|R) — door free, balanced
  //  - n≥3: horizontal corridor; door-bank always 2 rooms around foyer stem
  const verticalCorridor = n <= 2;
  let allRects = [];
  let gutterX = Math.round(w / 2);
  let corridorY = availH / 2;

  if (verticalCorridor) {
    // ┌────┬──┬────┐  doors open onto vertical corridor
    // │ A  │  │ B  │  stem reaches building door
    // └────┴──┴────┘
    const cW = Math.max(foyerW, Math.min(18, Math.round(w * 0.14)));
    const sideW = (innerW - cW) / 2;
    const roomH = availH - pad * 2;
    const y0 = pad;
    const leftX = pad;
    const rightX = pad + sideW + cW;
    gutterX = pad + sideW + cW / 2;
    corridorY = doorNorth ? pad + 4 : pad + roomH - 4;
    layer.__corridor = {
      y: corridorY,
      y0: pad,
      h: roomH,
      gutterX,
      x0: pad + sideW,
      x1: pad + sideW + cW,
      foyerW: cW,
      vertical: true,
    };
    if (n === 1) {
      // single room on left; right = vestibule
      allRects = [
        {
          room: list[0],
          x: leftX,
          y: y0,
          w: sideW,
          h: roomH,
          doorSide: "e", // opens east onto corridor
        },
      ];
    } else {
      allRects = [
        {
          room: list[0],
          x: leftX,
          y: y0,
          w: sideW,
          h: roomH,
          doorSide: "e",
        },
        {
          room: list[1],
          x: rightX,
          y: y0,
          w: sideW,
          h: roomH,
          doorSide: "w",
        },
      ];
    }
  } else {
    // door-bank = exactly 2 rooms (foyer between) → balanced sizes
    const nDoorBank = 2;
    const nFarBank = n - nDoorBank;
    let northList;
    let southList;
    if (doorNorth) {
      northList = list.slice(0, nDoorBank);
      southList = list.slice(nDoorBank);
    } else {
      northList = list.slice(0, nFarBank);
      southList = list.slice(nFarBank);
    }
    const nNorth = northList.length;
    const nSouth = southList.length;
    // heights ∝ room count → similar area per room
    let northH;
    let southH;
    if (nSouth === 0) {
      northH = usableH;
      southH = 0;
    } else if (nNorth === 0) {
      northH = 0;
      southH = usableH;
    } else {
      northH = Math.max(16, Math.round((usableH * nNorth) / n));
      southH = Math.max(16, usableH - northH);
    }
    const corridorY0 = pad + northH;
    corridorY = corridorY0 + corridorH / 2;
    const southY0 = corridorY0 + corridorH;
    layer.__corridor = {
      y: corridorY,
      y0: corridorY0,
      h: corridorH,
      gutterX,
      x0: pad,
      x1: w - pad,
      foyerW,
      vertical: false,
    };
    const northFoyer = doorNorth && nNorth > 0 ? foyerW : 0;
    const southFoyer = !doorNorth && nSouth > 0 ? foyerW : 0;
    const northRects = layoutBankRects(
      northList,
      pad,
      northH,
      "s",
      0,
      innerW,
      pad,
      northFoyer
    );
    const southRects = layoutBankRects(
      southList,
      southY0,
      southH,
      "n",
      nNorth,
      innerW,
      pad,
      southFoyer
    );
    allRects = northRects.concat(southRects);
  }

  // paint room fills only (no per-room stroke → no double borders)
  for (const pr of allRects) {
    const { room, x, y, w: rw, h: rh, doorSide } = pr;
    if (rw < 2 || rh < 2) continue;
    const g = new PIXI.Graphics();
    g.beginFill(crepi, 1);
    g.drawRect(x, y, rw, rh);
    g.endFill();
    g.__roomId = room.id;
    g.__roomLabel = room.label;
    g.__roomRect = { x, y, w: rw, h: rh };

    // door posts (2 montants) on corridor-facing edge — no bridge
    let doorX;
    let doorY;
    let dw;
    const postLen = 3.2;
    g.lineStyle(1.2, hexToNum(RAMPS.encre.base), 0.55);
    if (doorSide === "e") {
      doorX = x + rw;
      doorY = y + rh / 2;
      dw = Math.max(6, Math.min(12, rh * 0.18));
      // horizontal posts into room (west of east edge)
      g.moveTo(doorX, doorY - dw / 2);
      g.lineTo(doorX - postLen, doorY - dw / 2);
      g.moveTo(doorX, doorY + dw / 2);
      g.lineTo(doorX - postLen, doorY + dw / 2);
    } else if (doorSide === "w") {
      doorX = x;
      doorY = y + rh / 2;
      dw = Math.max(6, Math.min(12, rh * 0.18));
      g.moveTo(doorX, doorY - dw / 2);
      g.lineTo(doorX + postLen, doorY - dw / 2);
      g.moveTo(doorX, doorY + dw / 2);
      g.lineTo(doorX + postLen, doorY + dw / 2);
    } else if (doorSide === "n") {
      doorX = x + rw / 2;
      doorY = y;
      dw = Math.max(6, Math.min(12, rw * 0.2));
      g.moveTo(doorX - dw / 2, doorY);
      g.lineTo(doorX - dw / 2, doorY + postLen);
      g.moveTo(doorX + dw / 2, doorY);
      g.lineTo(doorX + dw / 2, doorY + postLen);
    } else {
      // "s"
      doorX = x + rw / 2;
      doorY = y + rh;
      dw = Math.max(6, Math.min(12, rw * 0.2));
      g.moveTo(doorX - dw / 2, doorY);
      g.lineTo(doorX - dw / 2, doorY - postLen);
      g.moveTo(doorX + dw / 2, doorY);
      g.lineTo(doorX + dw / 2, doorY - postLen);
    }
    g.__doorGlyph = "two-posts";
    if (roomDoors) {
      roomDoors.push({
        x: doorX,
        y: doorY,
        roomId: room.id,
        side: doorSide,
        rect: { x, y, w: rw, h: rh },
        doorW: dw,
      });
    }
    g.__hasRoomDoor = true;
    g.__roomDoorSide = doorSide;

    g.__furniture = true;
    g.__furnitureG = g;
    layer.addChild(g);

    // Semantic animated icon (relevée pour laisser place au titre sous l'icône)
    const icon = createRoomIcon(room, rw, rh);
    icon.x = x + rw / 2;
    icon.y = y + rh * 0.42;
    icon.__roomRect = { x, y, w: rw, h: rh };
    layer.addChild(icon);
    layer.__roomIcons[room.id] = icon;
    // legacy QA flags on room fill
    if (icon.__hasHemicycle) g.__hasHemicycle = true;
    if (icon.__hasCouncilTable) g.__hasCouncilTable = true;
    if (icon.__hasSgcIcon) g.__hasSgcIcon = true;
    if (icon.__signature) g.__signature = icon.__signature;
    g.__roomIcon = icon;

    const raw = room.label || room.id || "";
    if (raw) {
      const abbr = roomLabelShort(room.id, raw);
      const full = roomLabelFull(room.id, raw);
      const t = new PIXI.Text(abbr, {
        fontFamily: "Segoe UI, system-ui, sans-serif",
        fontSize: 7,
        fill: 0x6b5e48,
        wordWrap: true,
        wordWrapWidth: Math.max(8, rw - 4),
        align: "center",
      });
      t.anchor.set(0.5, 0);
      t.x = x + rw / 2;
      t.y = y + 2;
      t.resolution = 2;
      t.visible = false;
      t.__roomId = room.id;
      t.__roomRect = { x, y, w: rw, h: rh };
      t.__full = full;
      t.__abbr = abbr;
      t.text = abbr;
      layer.addChild(t);
      if (roomLabels) roomLabels.push(t);
    }
  }

  // Shared interior walls only (merged borders) — gaps at room doors
  const walls = new PIXI.Graphics();
  walls.lineStyle(1.1, refend, 0.95);
  walls.__isRoomWalls = true;

  if (verticalCorridor) {
    // walls along vertical corridor with door gaps (no stroke across openings)
    for (const r of allRects) {
      const dw = Math.max(6, Math.min(12, r.h * 0.18));
      const doorY = r.y + r.h / 2;
      if (r.doorSide === "e") {
        const edgeX = r.x + r.w;
        // vertical wall with gap
        if (doorY - dw / 2 > r.y) {
          strokeV(walls, edgeX, r.y, doorY - dw / 2);
        }
        if (doorY + dw / 2 < r.y + r.h) {
          strokeV(walls, edgeX, doorY + dw / 2, r.y + r.h);
        }
      } else if (r.doorSide === "w") {
        const edgeX = r.x;
        if (doorY - dw / 2 > r.y) {
          strokeV(walls, edgeX, r.y, doorY - dw / 2);
        }
        if (doorY + dw / 2 < r.y + r.h) {
          strokeV(walls, edgeX, doorY + dw / 2, r.y + r.h);
        }
      }
    }
  } else {
    // group by bank (same y)
    const byY = new Map();
    for (const r of allRects) {
      const key = Math.round(r.y);
      if (!byY.has(key)) byY.set(key, []);
      byY.get(key).push(r);
    }
    for (const rects of byY.values()) {
      const bankY = rects[0].y;
      const bankH = rects[0].h;
      const doorSide = rects[0].doorSide;
      const sorted = [...rects].sort((a, b) => a.x - b.x);
      // vertical shared partitions (gap=0 → single wall)
      for (let i = 0; i < sorted.length - 1; i++) {
        const a = sorted[i];
        const b = sorted[i + 1];
        const seam = a.x + a.w;
        if (Math.abs(seam - b.x) < 0.6) {
          strokeV(walls, seam, bankY, bankY + bankH);
        }
      }
      // corridor-facing edge with door gaps
      const edgeY = doorSide === "s" ? bankY + bankH : bankY;
      for (const r of sorted) {
        const dw = Math.max(6, Math.min(12, r.w * 0.2));
        const doorX = r.x + r.w / 2;
        strokeHGap(walls, r.x, r.x + r.w, edgeY, doorX, dw);
      }
    }
  }

  layer.addChild(walls);
  layer.__roomWalls = walls;
}

/**
 * Libellé carte (court) — nomenclature institutionnelle unique
 * (`engine/room-nomenclature.js`). Le nom complet va en fiche détail.
 * @param {string} full
 * @param {string} [id]
 */
export function abbreviateRoomLabel(full, id) {
  return roomLabelShort(id, full);
}

/** Flat ground tile as Graphics (cached by kind). */
const _tileGfx = new Map();
export function tileTexture(kind, variant) {
  // Return a Texture from a small canvas for Tilemap Sprite reuse —
  // but use LINEAR scale and flat fill (AA ok).
  const key = `vtile-${kind}`;
  if (_tileGfx.has(key)) return _tileGfx.get(key);
  const c = document.createElement("canvas");
  c.width = TILE;
  c.height = TILE;
  const ctx = c.getContext("2d");
  ctx.imageSmoothingEnabled = true;
  let fill = RAMPS.herbe.base;
  if (kind === "water") fill = RAMPS.eau.base;
  else if (kind === "pave") fill = RAMPS.pave.base;
  else if (kind === "parquet") fill = RAMPS.crepi.base;
  else if (kind === "jura") fill = RAMPS.juraNear.base;
  else if (kind === "lavaux") fill = "#A8B36B";
  else if (kind === "sky") fill = RAMPS.ciel.base;
  ctx.fillStyle = fill;
  ctx.fillRect(0, 0, TILE, TILE);
  // K22: flower grass rolled back — plain grass aplat only
  if (kind === "lavaux") {
    ctx.strokeStyle = "#87954F";
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.moveTo(2, TILE * 0.35);
    ctx.quadraticCurveTo(TILE * 0.5, TILE * 0.25, TILE - 2, TILE * 0.35);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  if (kind === "jura") {
    ctx.fillStyle = RAMPS.juraFar.base;
    ctx.beginPath();
    ctx.moveTo(0, TILE);
    ctx.lineTo(0, TILE * 0.45);
    ctx.lineTo(TILE * 0.5, TILE * 0.2);
    ctx.lineTo(TILE, TILE * 0.5);
    ctx.lineTo(TILE, TILE);
    ctx.fill();
  }
  if (kind === "water") {
    ctx.strokeStyle = RAMPS.eau.light;
    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    ctx.moveTo(0, TILE * 0.4);
    ctx.quadraticCurveTo(TILE * 0.5, TILE * 0.3, TILE, TILE * 0.4);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  const tex = PIXI.Texture.from(c);
  tex.baseTexture.scaleMode = PIXI.SCALE_MODES.LINEAR;
  _tileGfx.set(key, tex);
  return tex;
}

export function makeUsherSprite() {
  const g = new PIXI.Graphics();
  // body
  g.beginFill(hexToNum(RAMPS.crepi.shadow));
  g.drawRoundedRect(-5, -14, 10, 12, 2);
  g.endFill();
  g.beginFill(hexToNum(RAMPS.peau.base));
  g.drawCircle(0, -18, 4);
  g.endFill();
  g.beginFill(hexToNum(RAMPS.encre.shadow));
  g.drawRect(-3, -2, 2.5, 6);
  g.drawRect(0.5, -2, 2.5, 6);
  g.endFill();
  g.__isVector = true;
  g.__setDir = () => {};
  g.__setWalk = () => {};
  return g;
}

export function makeUsherTextures() {
  return { s: [null], n: [null], e: [null], w: [null] };
}

export function makeDossierTexture() {
  const c = document.createElement("canvas");
  c.width = 8;
  c.height = 10;
  const ctx = c.getContext("2d");
  ctx.fillStyle = RAMPS.encre.base;
  ctx.fillRect(0, 2, 8, 8);
  ctx.fillStyle = RAMPS.crepi.light;
  ctx.fillRect(1, 0, 6, 3);
  const tex = PIXI.Texture.from(c);
  tex.baseTexture.scaleMode = PIXI.SCALE_MODES.LINEAR;
  return tex;
}

export function makeGoldHaloSprite() {
  const g = new PIXI.Graphics();
  g.lineStyle(2.5, hexToNum(RESP_GOLD), 0.95);
  g.drawCircle(0, 0, 10);
  g.beginFill(hexToNum(RESP_GOLD), 0.2);
  g.drawCircle(0, 0, 7);
  g.endFill();
  return g;
}

export function makeCometParticle() {
  const g = new PIXI.Graphics();
  g.beginFill(hexToNum(RESP_GOLD), 0.85);
  g.drawCircle(0, 0, 3);
  g.endFill();
  return g;
}

// Compat stubs used by old code paths
export function makeTexture(w, h, drawFn, cacheKey) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  ctx.imageSmoothingEnabled = true;
  const put = (x, y, color) => {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, 1, 1);
  };
  const rect = (x, y, rw, rh, color) => {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, rw, rh);
  };
  drawFn(ctx, put, rect);
  const tex = PIXI.Texture.from(c);
  tex.baseTexture.scaleMode = PIXI.SCALE_MODES.LINEAR;
  return tex;
}

export function makeSprite(w, h, drawFn, cacheKey) {
  const tex = makeTexture(w, h, drawFn, cacheKey);
  return new PIXI.Sprite(tex);
}

export function drawShadowTexture(w, h) {
  return makeTexture(w, h, (ctx) => {
    ctx.fillStyle = "rgba(47,66,102,0.15)";
    ctx.beginPath();
    ctx.ellipse(w / 2, h / 2, w * 0.42, h * 0.32, 0, 0, Math.PI * 2);
    ctx.fill();
  });
}
