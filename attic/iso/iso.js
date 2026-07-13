/**
 * Isometric primitives — GDD v2 line-claire helvetic palette & volumes.
 * RESP_GOLD #E8C15A only for responsibility halo.
 */
/* global PIXI */

export const TILE_W = 64;
export const TILE_H = 32;

/** GDD palette exact. Contours = surface darkened 25%, never pure black. */
export const PAL = {
  sky: 0xd6e6f2,
  grass: 0xc8d9a8,
  grassEdge: 0xa8bc84,
  pave: 0xb8b2a6,
  paveEdge: 0x9a958a,
  water: 0x6ba4c8,
  waterDeep: 0x4c83ab,
  parquet: 0xd4c4a0,
  molasse: 0xc9bca3,
  molasseShade: 0xa89f8d,
  molasseL: 0xd8cfbe,
  molasseR: 0xa89f8d,
  brique: 0xa4553e,
  briqueShade: 0x7e3f2e,
  briqueL: 0xb86a52,
  briqueR: 0x7e3f2e,
  crepi: 0xe8e2d4,
  crepiL: 0xf2ece0,
  crepiR: 0xd4cec0,
  toit: 0xb4674f,
  toitShade: 0x8e5843,
  vertGc: 0x3e7a52,
  sableCe: 0xc9a45c,
  encre: 0x2f4266,
  win: 0x3b4a5e,
  door: 0x5a4632,
  shadow: 0x2f4266,
  ink: 0x2f4266,
  label: 0x2f4266,
  /** Responsibility gold — ONLY for the halo marker. */
  RESP_GOLD: 0xe8c15a,
};

export function darken(hex, pct) {
  const r = (hex >> 16) & 0xff;
  const g = (hex >> 8) & 0xff;
  const b = hex & 0xff;
  const f = 1 - pct;
  return ((r * f) << 16) | ((g * f) << 8) | (b * f);
}

export function isoX(gx, gy) {
  return (gx - gy) * (TILE_W / 2);
}
export function isoY(gx, gy) {
  return (gx + gy) * (TILE_H / 2);
}
export function proj(gx, gy, elev) {
  return { x: isoX(gx, gy), y: isoY(gx, gy) - (elev || 0) };
}

/** Baseline for y-sort: south edge of footprint (never sprite center). */
export function footprintBaseline(gx, gy, fw, fh, elev) {
  const sx = gx + fw / 2;
  const sy = gy + fh; // south edge
  return (sx + sy) * 10 + (elev || 0) * 0.01;
}

export function diamond(g, cx, cy, wT, hT, fill, alpha) {
  const hw = (wT * TILE_W) / 2;
  const hh = (hT * TILE_H) / 2;
  g.beginFill(fill, alpha == null ? 1 : alpha);
  g.moveTo(cx, cy - hh);
  g.lineTo(cx + hw, cy);
  g.lineTo(cx, cy + hh);
  g.lineTo(cx - hw, cy);
  g.closePath();
  g.endFill();
}

export function isoQuad(g, pts, fill, alpha) {
  g.beginFill(fill, alpha == null ? 1 : alpha);
  g.moveTo(pts[0].x, pts[0].y);
  g.lineTo(pts[1].x, pts[1].y);
  g.lineTo(pts[2].x, pts[2].y);
  g.lineTo(pts[3].x, pts[3].y);
  g.closePath();
  g.endFill();
}

function rWall(u, v, hw, hh, h) {
  return { x: u * hw, y: hh - u * hh - v * h };
}
function lWall(u, v, hw, hh, h) {
  return { x: -hw + u * hw, y: u * hh - v * h };
}

/**
 * Contact shadow ellipse centered on footprint (anchoring).
 */
export function drawContactShadow(g, fw, fh) {
  const hw = (fw * TILE_W) / 2;
  const hh = (fh * TILE_H) / 2;
  g.beginFill(PAL.shadow, 0.15);
  g.drawEllipse(0, hh * 0.15, hw * 0.92, hh * 0.55);
  g.endFill();
}

function facadeWindows(g, hw, hh, h, cols, rows) {
  const wW = 0.14;
  const wH = 0.14;
  for (let r = 0; r < rows; r++) {
    for (let ci = 0; ci < cols; ci++) {
      const u0 = 0.14 + ci * (0.72 / cols);
      const u1 = u0 + wW;
      const v0 = 0.28 + r * (0.55 / Math.max(1, rows - 0.2));
      const v1 = v0 + wH;
      if (v1 > 0.92) continue;
      isoQuad(
        g,
        [
          rWall(u0, v0, hw, hh, h),
          rWall(u1, v0, hw, hh, h),
          rWall(u1, v1, hw, hh, h),
          rWall(u0, v1, hw, hh, h),
        ],
        PAL.win,
        0.55
      );
    }
  }
}

function drawFlag(g, x, y, color) {
  g.lineStyle(1.4, darken(PAL.encre, 0.15), 0.85);
  g.moveTo(x, y);
  g.lineTo(x, y - 18);
  g.lineStyle(0);
  g.beginFill(color, 1);
  g.moveTo(x, y - 18);
  g.lineTo(x + 14, y - 13);
  g.lineTo(x, y - 8);
  g.closePath();
  g.endFill();
}

/**
 * Draw a GDD site volume.
 * @param {object} site from world.json
 * @param {{roof?:boolean}} [opts]
 */
export function drawSite(site, opts) {
  opts = opts || {};
  const showRoof = opts.roof !== false;
  const c = new PIXI.Container();
  const fw = site.fw;
  const fh = site.fh;
  const levels = site.levels || 2;
  const h = 18 + levels * 16;
  const hw = (fw * TILE_W) / 2 * 0.92;
  const hh = (fh * TILE_H) / 2 * 0.92;

  const base = new PIXI.Graphics();
  drawContactShadow(base, fw * 0.95, fh * 0.95);
  diamond(base, 0, 0, fw * 0.98, fh * 0.98, PAL.pave, 0.35);
  c.addChild(base);

  let wl = PAL.molasseL;
  let wr = PAL.molasseR;
  let top = PAL.molasse;
  if (site.kind === "chateau") {
    // base molasse, upper brick — contrast is the skyline signature
    wl = PAL.molasseL;
    wr = PAL.molasseR;
  } else if (site.kind === "chancellerie") {
    wl = PAL.crepiL;
    wr = PAL.crepiR;
    top = PAL.crepi;
  } else if (site.kind === "hotel-dept") {
    wl = PAL.molasseL;
    wr = PAL.molasseR;
  }

  const body = new PIXI.Graphics();
  // walls
  isoQuad(body, [{ x: -hw, y: 0 }, { x: 0, y: hh }, { x: 0, y: hh - h }, { x: -hw, y: -h }], wl, 1);
  isoQuad(body, [{ x: 0, y: hh }, { x: hw, y: 0 }, { x: hw, y: -h }, { x: 0, y: hh - h }], wr, 1);

  if (site.kind === "chateau") {
    // upper brick band
    const hBrick = h * 0.55;
    isoQuad(
      body,
      [
        { x: -hw, y: -h + hBrick },
        { x: 0, y: hh - h + hBrick },
        { x: 0, y: hh - h },
        { x: -hw, y: -h },
      ],
      PAL.briqueL,
      1
    );
    isoQuad(
      body,
      [
        { x: 0, y: hh - h + hBrick },
        { x: hw, y: -h + hBrick },
        { x: hw, y: -h },
        { x: 0, y: hh - h },
      ],
      PAL.briqueR,
      1
    );
  }

  // stone courses
  body.lineStyle(1, darken(wl, 0.25), 0.4);
  for (let v = 0.2; v < 0.9; v += 0.22) {
    const a = lWall(0, v, hw, hh, h);
    const b = lWall(1, v, hw, hh, h);
    body.moveTo(a.x, a.y);
    body.lineTo(b.x, b.y);
  }
  body.lineStyle(0);

  // edges = darkened surface 25%, never #000
  const edgeCol = darken(wr, 0.25);
  body.lineStyle(1.2, edgeCol, 0.65);
  body.moveTo(0, hh);
  body.lineTo(0, hh - h);
  body.moveTo(-hw, 0);
  body.lineTo(-hw, -h);
  body.moveTo(hw, 0);
  body.lineTo(hw, -h);
  body.lineStyle(0);
  c.addChild(body);

  const fac = new PIXI.Graphics();
  facadeWindows(fac, hw, hh, h, site.kind === "parlement" ? 4 : 3, levels >= 3 ? 3 : 2);
  // door
  isoQuad(
    fac,
    [
      rWall(0.4, 0, hw, hh, h),
      rWall(0.6, 0, hw, hh, h),
      rWall(0.6, 0.28, hw, hh, h),
      rWall(0.4, 0.28, hw, hh, h),
    ],
    PAL.door,
    0.9
  );
  c.addChild(fac);

  // dept liseré accent ≤10%
  if (site.kind === "hotel-dept" && site.deptTint) {
    const tint = parseInt(String(site.deptTint).replace("#", ""), 16);
    const band = new PIXI.Graphics();
    band.beginFill(tint, 0.85);
    band.drawRect(-hw * 0.15, -h * 0.55, hw * 0.3, 4);
    band.endFill();
    c.addChild(band);
  }

  const roof = new PIXI.Graphics();
  roof.visible = showRoof;
  if (site.kind === "parlement") {
    // long tile roof + contemporary polygonal lantern
    isoQuad(
      roof,
      [
        { x: 0, y: -h - hh * 0.7 },
        { x: hw, y: -h },
        { x: 0, y: -h + hh * 0.35 },
        { x: -hw, y: -h },
      ],
      PAL.toit,
      1
    );
    isoQuad(
      roof,
      [
        { x: 0, y: -h - hh * 0.7 },
        { x: hw * 0.55, y: -h - 4 },
        { x: 0, y: -h + 6 },
        { x: -hw * 0.55, y: -h - 4 },
      ],
      PAL.toitShade,
      1
    );
    // lantern
    roof.beginFill(PAL.crepi);
    roof.drawEllipse(0, -h - hh * 0.95, hw * 0.22, hh * 0.35);
    roof.endFill();
    roof.beginFill(PAL.win, 0.45);
    roof.drawEllipse(0, -h - hh * 0.95, hw * 0.16, hh * 0.25);
    roof.endFill();
    roof.beginFill(PAL.toitShade);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      roof.drawCircle(Math.cos(a) * 6, -h - hh * 1.15 + Math.sin(a) * 3, 2);
    }
    roof.endFill();
    drawFlag(roof, hw * 0.55, -h - hh * 0.5, PAL.vertGc);
  } else if (site.kind === "chateau") {
    // merlons + towers
    for (const dx of [-hw * 0.55, hw * 0.55]) {
      roof.beginFill(PAL.briqueL);
      roof.drawRect(dx - 10, -h - 28, 20, 28);
      roof.endFill();
      roof.beginFill(PAL.briqueShade);
      for (let i = -1; i <= 1; i++) roof.drawRect(dx - 9 + (i + 1) * 6, -h - 34, 5, 8);
      roof.endFill();
    }
    roof.beginFill(PAL.brique);
    roof.drawRect(-hw * 0.35, -h - 22, hw * 0.7, 18);
    roof.endFill();
    // merlons center
    roof.beginFill(PAL.briqueShade);
    for (let i = -2; i <= 2; i++) roof.drawRect(i * 10 - 3, -h - 30, 6, 10);
    roof.endFill();
    drawFlag(roof, 0, -h - 32, PAL.sableCe);
  } else if (site.kind === "chancellerie") {
    // hipped roof (croupes)
    isoQuad(
      roof,
      [
        { x: 0, y: -h - hh * 0.85 },
        { x: hw * 0.85, y: -h },
        { x: 0, y: -h + hh * 0.2 },
        { x: -hw * 0.85, y: -h },
      ],
      PAL.toit,
      1
    );
    roof.beginFill(PAL.toitShade);
    roof.moveTo(-hw * 0.5, -h);
    roof.lineTo(0, -h - hh * 0.85);
    roof.lineTo(hw * 0.5, -h);
    roof.closePath();
    roof.endFill();
    // encre sign accent
    roof.beginFill(PAL.encre, 0.9);
    roof.drawRoundedRect(-12, -h * 0.35, 24, 6, 1);
    roof.endFill();
  } else {
    // hotel pitched roof alternating
    isoQuad(
      roof,
      [
        { x: 0, y: -h - hh * 0.6 },
        { x: hw, y: -h },
        { x: 0, y: -h + hh * 0.2 },
        { x: -hw, y: -h },
      ],
      site.levels % 2 === 0 ? PAL.toit : PAL.toitShade,
      1
    );
  }
  c.addChild(roof);
  c.__roof = roof;

  const ring = new PIXI.Graphics();
  c.addChild(ring);
  c.__ring = ring;
  c.__hw = hw;
  c.__hh = hh;
  c.__h = h;
  c.__fw = fw;
  c.__fh = fh;
  c.__baseline = footprintBaseline(site.gx, site.gy, fw, fh, site.elev);
  return c;
}

export function setBuildingHighlight(container, on, color) {
  const ring = container.__ring;
  if (!ring) return;
  ring.clear();
  if (!on) return;
  const hw = container.__hw;
  const hh = container.__hh;
  const h = container.__h;
  const col = color != null ? color : PAL.encre;
  ring.lineStyle(2, col, 0.7);
  ring.moveTo(0, -h - hh);
  ring.lineTo(hw, -h);
  ring.lineTo(hw, 0);
  ring.lineTo(0, hh);
  ring.lineTo(-hw, 0);
  ring.lineTo(-hw, -h);
  ring.closePath();
}

export function drawDossierToken(familyColor) {
  const c = new PIXI.Container();
  const sh = new PIXI.Graphics();
  sh.beginFill(PAL.shadow, 0.18);
  sh.drawEllipse(0, 4, 12, 5);
  sh.endFill();
  c.addChild(sh);
  const g = new PIXI.Graphics();
  g.beginFill(familyColor != null ? familyColor : 0xfffefb);
  g.lineStyle(1.2, darken(PAL.molasse, 0.25), 0.9);
  g.drawRoundedRect(-11, -30, 22, 30, 3);
  g.endFill();
  g.lineStyle(0);
  g.beginFill(0xd8d0be);
  for (let i = 0; i < 3; i++) g.drawRect(-7, -24 + i * 6, i === 2 ? 10 : 14, 2);
  g.endFill();
  g.beginFill(0xa32028);
  g.drawCircle(5, -8, 3);
  g.endFill();
  c.addChild(g);
  return c;
}

/** Responsibility gold halo — sole use of RESP_GOLD. */
export function drawGoldHalo() {
  const g = new PIXI.Graphics();
  g.beginFill(PAL.RESP_GOLD, 0.26);
  g.drawCircle(0, 2, 20);
  g.endFill();
  g.lineStyle(2, PAL.RESP_GOLD, 0.95);
  g.drawCircle(0, 2, 16);
  g.lineStyle(0);
  g.beginFill(PAL.RESP_GOLD, 0.55);
  g.drawCircle(0, 2, 4);
  g.endFill();
  g.__isResponsibilityGold = true;
  return g;
}

export function drawUsher() {
  const c = new PIXI.Container();
  const sh = new PIXI.Graphics();
  sh.beginFill(PAL.shadow, 0.16);
  sh.drawEllipse(0, 3, 8, 3.5);
  sh.endFill();
  c.addChild(sh);
  const g = new PIXI.Graphics();
  g.beginFill(PAL.encre);
  g.drawCircle(0, -16, 4.5);
  g.endFill();
  g.beginFill(0x4a5a78);
  g.drawRoundedRect(-5, -12, 10, 14, 2);
  g.endFill();
  g.beginFill(0x2a3348);
  g.drawRect(-4, 2, 3.5, 7);
  g.drawRect(1, 2, 3.5, 7);
  g.endFill();
  c.addChild(g);
  return c;
}
