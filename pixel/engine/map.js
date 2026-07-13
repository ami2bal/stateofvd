/**
 * Carte campus procédurale — ambiance DA cible (pixel, N→S Jura→Léman).
 * Pas une copie des JPG : composition libre alignée sur l'identité visuelle.
 */
/* global PIXI */
import { C, MAP_W, MAP_H, mulberry32 } from "./pixel.js";

/**
 * Hotspot defs (world px, center + hit box).
 * @typedef {{ id:string, label:string, kind:string, sub:string, cx:number, cy:number, x:number, y:number, w:number, h:number }} Hotspot
 */

/**
 * @returns {{ root: PIXI.Container, staticLayer: PIXI.Container, ambientLayer: PIXI.Container, hotspotLayer: PIXI.Container, hotspots: Hotspot[], markers: Record<string, PIXI.Container> }}
 */
export function buildPixelMap() {
  const root = new PIXI.Container();
  root.sortableChildren = true;

  const staticLayer = new PIXI.Container();
  staticLayer.zIndex = 0;
  const ambientLayer = new PIXI.Container();
  ambientLayer.zIndex = 10;
  const hotspotLayer = new PIXI.Container();
  hotspotLayer.zIndex = 20;
  const fxLayer = new PIXI.Container();
  fxLayer.zIndex = 30;
  root.addChild(staticLayer, ambientLayer, hotspotLayer, fxLayer);

  const g = new PIXI.Graphics();
  staticLayer.addChild(g);

  const rng = mulberry32(0x50fd);

  // ── Sky + Jura ──
  g.beginFill(C.ciel);
  g.drawRect(0, 0, MAP_W, 72);
  g.endFill();
  // far ridge
  g.beginFill(C.juraFar);
  drawRidge(g, 0, 58, MAP_W, 28, 7, rng);
  g.endFill();
  // near forest ridge
  g.beginFill(C.juraNear);
  drawRidge(g, 0, 64, MAP_W, 18, 11, rng);
  g.endFill();
  // snow caps
  g.beginFill(C.snow);
  for (const px of [70, 150, 240, 330, 410]) {
    g.drawPolygon([px, 28, px + 14, 48, px - 14, 48]);
  }
  g.endFill();

  // ── Ground bands ──
  g.beginFill(C.herbe);
  g.drawRect(0, 72, MAP_W, 220);
  g.endFill();
  // grass dither
  g.beginFill(C.herbeDeep);
  for (let i = 0; i < 420; i++) {
    const x = Math.floor(rng() * MAP_W);
    const y = 74 + Math.floor(rng() * 210);
    g.drawRect(x, y, 1 + (rng() > 0.7 ? 1 : 0), 1);
  }
  g.endFill();
  g.beginFill(C.herbeLite);
  for (let i = 0; i < 180; i++) {
    g.drawRect(Math.floor(rng() * MAP_W), 80 + Math.floor(rng() * 200), 1, 1);
  }
  g.endFill();

  // ── Trees bands (left/right) ──
  drawTreeBand(g, 4, 78, 52, 200, rng, 18);
  drawTreeBand(g, MAP_W - 56, 78, 52, 200, rng, 18);

  // ── Paths ──
  g.beginFill(C.path);
  // main N-S spine
  g.drawRect(MAP_W / 2 - 10, 100, 20, 200);
  // esplanade
  g.drawRoundedRect(150, 148, 180, 70, 4);
  // east to vineyards
  g.drawRect(320, 200, 90, 10);
  // south to depts
  g.drawRect(80, 268, 320, 12);
  g.endFill();
  g.beginFill(C.paveDeep);
  // cobble dots
  for (let i = 0; i < 90; i++) {
    g.drawRect(152 + Math.floor(rng() * 176), 150 + Math.floor(rng() * 66), 1, 1);
  }
  g.endFill();

  // ── Vineyards (east) ──
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 5; col++) {
      const x = 360 + col * 18;
      const y = 120 + row * 12;
      g.beginFill(C.vigne);
      g.drawRect(x, y, 14, 8);
      g.endFill();
      g.beginFill(C.herbeDeep);
      g.drawRect(x, y + 7, 14, 1);
      g.endFill();
    }
  }

  // ── Buildings (pixel masses) ──
  /** @type {Hotspot[]} */
  const hotspots = [];
  const markers = {};

  // Palais / Rumine-like (north)
  {
    const b = { x: 168, y: 86, w: 144, h: 42 };
    drawBuilding(g, b, {
      body: C.molasse,
      roof: C.toit,
      roofStyle: "hip",
      windows: true,
      accent: C.encre,
    });
    // dome
    g.beginFill(C.orCe);
    g.drawEllipse(b.x + b.w / 2, b.y + 6, 16, 8);
    g.endFill();
    addHot(
      hotspots,
      markers,
      hotspotLayer,
      {
        id: "palais",
        label: "Palais de Rumine",
        kind: "institution",
        sub: "Frontière nord · musée / place",
        ...centerBox(b),
        ...b,
      },
      C.encre
    );
  }

  // Grand Conseil (courtyard complex)
  {
    const b = { x: 120, y: 128, w: 100, h: 72 };
    drawBuilding(g, b, {
      body: C.molasse,
      roof: C.toitDeep,
      roofStyle: "flat-header",
      header: C.vertGc,
      windows: true,
      courtyard: true,
    });
    // green cupola
    g.beginFill(C.vertGc);
    g.drawEllipse(b.x + b.w / 2, b.y + 4, 14, 10);
    g.endFill();
    g.beginFill(0x2a5638);
    g.drawRect(b.x + b.w / 2 - 2, b.y - 6, 4, 8);
    g.endFill();
    addHot(
      hotspots,
      markers,
      hotspotLayer,
      {
        id: "gc",
        label: "Grand Conseil",
        kind: "parlement",
        sub: "Hémicycle · Bureau · Commissions",
        ...centerBox(b),
        ...b,
      },
      C.vertGc
    );
  }

  // Château Saint-Maire (CE)
  {
    const b = { x: 248, y: 132, w: 108, h: 68 };
    drawBuilding(g, b, {
      body: C.molasse,
      roof: C.toit,
      roofStyle: "gables",
      header: C.orDeep,
      windows: true,
      turrets: true,
    });
    // statue gold
    g.beginFill(C.orCe);
    g.drawRect(228, 168, 8, 14);
    g.drawCircle(232, 164, 4);
    g.endFill();
    addHot(
      hotspots,
      markers,
      hotspotLayer,
      {
        id: "ce",
        label: "Conseil d'État",
        kind: "chateau",
        sub: "Château Saint-Maire · Collège · Chancellerie",
        ...centerBox(b),
        ...b,
      },
      C.orDeep
    );
  }

  // Cathedral (west)
  {
    const b = { x: 48, y: 150, w: 40, h: 90 };
    g.beginFill(C.molasseDeep);
    g.drawRect(b.x + 8, b.y + 30, 24, 60);
    g.endFill();
    // spire
    g.beginFill(C.encre);
    g.drawPolygon([
      b.x + 20,
      b.y,
      b.x + 34,
      b.y + 36,
      b.x + 6,
      b.y + 36,
    ]);
    g.endFill();
    g.beginFill(C.vitre);
    g.drawCircle(b.x + 20, b.y + 52, 6);
    g.endFill();
    addHot(
      hotspots,
      markers,
      hotspotLayer,
      {
        id: "cathedrale",
        label: "Cathédrale",
        kind: "culture",
        sub: "Repère urbain · hors flux institutionnel",
        ...centerBox(b),
        ...b,
      },
      C.encre
    );
  }

  // Chancellerie annex (between GC/CE south)
  {
    const b = { x: 200, y: 210, w: 72, h: 32 };
    drawBuilding(g, b, {
      body: C.crepi,
      roof: C.toitDeep,
      roofStyle: "flat",
      windows: true,
      accent: C.encre,
    });
    addHot(
      hotspots,
      markers,
      hotspotLayer,
      {
        id: "chancellerie",
        label: "Chancellerie",
        kind: "service",
        sub: "Publication · FAO · coordination",
        ...centerBox(b),
        ...b,
      },
      C.encre
    );
  }

  // Departments row (south strip — “villas basses”)
  const depts = [
    { id: "dep-dsas", label: "DSAS", color: 0x7a6a8c },
    { id: "dep-dfa", label: "DFA", color: 0x8a7a5c },
    { id: "dep-dits", label: "DITS", color: 0x5c6e8a },
    { id: "dep-djes", label: "DJES", color: 0x6a7a5c },
    { id: "dep-def", label: "DEF", color: 0x8a5c5c },
    { id: "dep-deiep", label: "DEIEP", color: 0x5c7a8a },
    { id: "dep-dcirh", label: "DCIRH", color: 0x7a5c6a },
  ];
  depts.forEach((d, i) => {
    const b = { x: 56 + i * 52, y: 286, w: 46, h: 28 };
    drawShop(g, b, d.color);
    // label pixels
    addHot(
      hotspots,
      markers,
      hotspotLayer,
      {
        id: d.id,
        label: d.label,
        kind: "department",
        sub: "Département · instruction des dossiers",
        ...centerBox(b),
        ...b,
      },
      d.color
    );
  });

  // ── Beach + lake ──
  g.beginFill(C.sable);
  g.drawRect(0, 318, MAP_W, 14);
  g.endFill();
  g.beginFill(C.eau);
  g.drawRect(0, 330, MAP_W, MAP_H - 330);
  g.endFill();
  // water bands
  g.beginFill(C.eauLite);
  for (let y = 334; y < MAP_H; y += 5) {
    g.drawRect(0, y, MAP_W, 1);
  }
  g.endFill();

  // pier + boat shell (animated in ambient)
  g.beginFill(C.bois);
  g.drawRect(210, 316, 60, 8);
  g.drawRect(232, 308, 16, 10);
  g.endFill();

  // Labels N/S
  const styleN = new PIXI.TextStyle({
    fontFamily: "monospace",
    fontSize: 9,
    fill: 0x4f5e3c,
    letterSpacing: 2,
  });
  const nLab = new PIXI.Text("N · JURA", styleN);
  nLab.anchor.set(0.5, 0);
  nLab.position.set(MAP_W / 2, 66);
  nLab.alpha = 0.75;
  staticLayer.addChild(nLab);

  const styleS = new PIXI.TextStyle({
    fontFamily: "monospace",
    fontSize: 9,
    fill: 0xe8f2f8,
    letterSpacing: 2,
  });
  const sLab = new PIXI.Text("S · LAC LÉMAN", styleS);
  sLab.anchor.set(0.5, 1);
  sLab.position.set(MAP_W / 2, MAP_H - 4);
  sLab.alpha = 0.85;
  staticLayer.addChild(sLab);

  return { root, staticLayer, ambientLayer, hotspotLayer, fxLayer, hotspots, markers };
}

function centerBox(b) {
  return { cx: b.x + b.w / 2, cy: b.y + b.h / 2 };
}

function drawRidge(g, x0, yBase, w, amp, peaks, rng) {
  const pts = [x0, yBase + amp];
  for (let i = 0; i <= peaks; i++) {
    const x = x0 + (w * i) / peaks;
    const y = yBase - rng() * amp * 0.9;
    pts.push(x, y);
  }
  pts.push(x0 + w, yBase + amp);
  g.drawPolygon(pts);
}

function drawTreeBand(g, x0, y0, w, h, rng, n) {
  for (let i = 0; i < n; i++) {
    const x = x0 + Math.floor(rng() * w);
    const y = y0 + Math.floor(rng() * h);
    const s = 6 + Math.floor(rng() * 6);
    g.beginFill(C.feuilleDeep);
    g.drawEllipse(x, y, s * 0.7, s);
    g.endFill();
    g.beginFill(C.feuille);
    g.drawEllipse(x - 1, y - 2, s * 0.5, s * 0.7);
    g.endFill();
    g.beginFill(C.bois);
    g.drawRect(x - 1, y + s - 2, 2, 4);
    g.endFill();
  }
}

function drawBuilding(g, b, opt) {
  const { body, roof, roofStyle, header, windows, courtyard, turrets, accent } = opt;
  // shadow
  g.beginFill(C.shadow, 0.18);
  g.drawRect(b.x + 3, b.y + b.h - 2, b.w, 4);
  g.endFill();
  // body
  g.beginFill(body);
  g.drawRect(b.x, b.y + 8, b.w, b.h - 8);
  g.endFill();
  // header strip
  if (header) {
    g.beginFill(header);
    g.drawRect(b.x, b.y + 8, b.w, 10);
    g.endFill();
  }
  // roof
  g.beginFill(roof);
  if (roofStyle === "hip" || roofStyle === "gables") {
    g.drawRect(b.x - 2, b.y + 2, b.w + 4, 10);
    if (roofStyle === "gables") {
      g.drawPolygon([b.x, b.y + 8, b.x + 16, b.y, b.x + 32, b.y + 8]);
      g.drawPolygon([
        b.x + b.w - 32,
        b.y + 8,
        b.x + b.w - 16,
        b.y,
        b.x + b.w,
        b.y + 8,
      ]);
    }
  } else if (roofStyle === "flat-header") {
    g.drawRect(b.x - 1, b.y + 2, b.w + 2, 8);
  } else {
    g.drawRect(b.x, b.y + 2, b.w, 8);
  }
  g.endFill();
  // turrets
  if (turrets) {
    g.beginFill(body);
    g.drawRect(b.x - 4, b.y + 10, 10, 16);
    g.drawRect(b.x + b.w - 6, b.y + 10, 10, 16);
    g.endFill();
    g.beginFill(roof);
    g.drawRect(b.x - 5, b.y + 6, 12, 6);
    g.drawRect(b.x + b.w - 7, b.y + 6, 12, 6);
    g.endFill();
  }
  // courtyard hole
  if (courtyard) {
    g.beginFill(C.pave);
    g.drawRect(b.x + 14, b.y + 28, b.w - 28, b.h - 40);
    g.endFill();
  }
  // windows grid
  if (windows) {
    g.beginFill(C.vitre);
    const rows = courtyard ? 1 : 2;
    const cols = Math.max(3, Math.floor(b.w / 14));
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const wx = b.x + 8 + c * Math.floor((b.w - 16) / cols);
        const wy = b.y + (header ? 22 : 18) + r * 14;
        if (courtyard && wy > b.y + 26) continue;
        g.drawRect(wx, wy, 5, 6);
      }
    }
    g.endFill();
  }
  // door
  g.beginFill(accent || C.bois);
  g.drawRect(b.x + b.w / 2 - 4, b.y + b.h - 12, 8, 12);
  g.endFill();
  // outline
  g.lineStyle(1, C.molasseDeep, 0.55);
  g.drawRect(b.x + 0.5, b.y + 8.5, b.w - 1, b.h - 9);
  g.lineStyle(0);
}

function drawShop(g, b, awning) {
  g.beginFill(C.shadow, 0.15);
  g.drawRect(b.x + 2, b.y + b.h - 1, b.w, 3);
  g.endFill();
  g.beginFill(C.molasse);
  g.drawRect(b.x, b.y + 6, b.w, b.h - 6);
  g.endFill();
  g.beginFill(C.toit);
  g.drawRect(b.x - 1, b.y + 2, b.w + 2, 7);
  g.endFill();
  g.beginFill(awning);
  g.drawRect(b.x + 2, b.y + 10, b.w - 4, 5);
  g.endFill();
  g.beginFill(C.vitre);
  g.drawRect(b.x + 4, b.y + 17, b.w - 14, 8);
  g.endFill();
  g.beginFill(C.bois);
  g.drawRect(b.x + b.w - 10, b.y + 17, 6, 10);
  g.endFill();
}

function addHot(hotspots, markers, layer, hs, color) {
  hotspots.push(hs);
  const c = new PIXI.Container();
  c.position.set(hs.cx, hs.cy);
  c.eventMode = "static";
  c.cursor = "pointer";
  // invisible hit
  const hit = new PIXI.Graphics();
  hit.beginFill(0xffffff, 0.001);
  hit.drawRect(-hs.w / 2, -hs.h / 2, hs.w, hs.h);
  hit.endFill();
  c.addChild(hit);
  // focus ring (hidden)
  const ring = new PIXI.Graphics();
  ring.lineStyle(2, color, 0.9);
  ring.drawRoundedRect(-hs.w / 2 - 3, -hs.h / 2 - 3, hs.w + 6, hs.h + 6, 4);
  ring.visible = false;
  ring.alpha = 0;
  c.addChild(ring);
  c.__ring = ring;
  c.__hs = hs;
  layer.addChild(c);
  markers[hs.id] = c;
}
