/**
 * Ambient animations (D-012) — clouds, Belle Époque vapor, lake current.
 * Cosmetic only. Stopped by prefers-reduced-motion.
 */
/* global PIXI */
import { hexToNum, RAMPS, RESP_GOLD } from "../engine/shapes.js";
import { TILE } from "../engine/render2d.js";

/**
 * @param {object} scene
 * @param {object} world
 */
export function installAmbient(scene, world) {
  const root = scene.tilemap.root || scene.tilemap.ground.parent;
  const layer = new PIXI.Container();
  // K17: Jura+clouds ABOVE ground tiles, BELOW buildings (zIndex 5)
  // (zIndex -50 was sorting under grass → "triangles bleus sur vert" only)
  layer.zIndex = 5;
  layer.eventMode = "none";
  root.sortableChildren = true;
  const buildings = scene.tilemap.buildingsLayer;
  if (buildings?.parent) {
    const parent = buildings.parent;
    const idx = parent.getChildIndex(buildings);
    parent.addChildAt(layer, Math.max(0, idx));
  } else {
    root.addChild(layer);
  }
  // z-order au niveau du ROOT (root.sortableChildren=true) : ground 0 < ambient 5 < buildings 10.
  // ⚠ FIX régression : buildingsLayer.zIndex restait à 0 → le décor (z5) recouvrait le bâti
  // (herbe visible au centre, aucun header). Le zIndex des VUES (footprint+100) est INTERNE au layer
  // et ne joue pas au niveau root ; il faut bumper le LAYER lui-même au-dessus du décor.
  if (scene.tilemap.ground) scene.tilemap.ground.zIndex = 0;
  if (buildings) buildings.zIndex = 10;
  if (scene.tilemap.entities) scene.tilemap.entities.zIndex = 20;
  if (scene.tilemap.labelsLayer) scene.tilemap.labelsLayer.zIndex = 30;
  scene.__ambientLayer = layer;

  const gw = (world.grid?.w || 36) * TILE;
  const gh = (world.grid?.h || 26) * TILE;
  const juraBand = (world.borders?.jura || 5) * TILE;
  const lakeBand = (world.borders?.lake || 5) * TILE;
  const lakeY0 = gh - lakeBand;
  // TASK-100 K2: overscan bleed so contain letterbox is still décor (0 canvas void)
  const OVER = Math.max(gw, gh) * 1.5;

  const reduced =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  scene.__ambientReduced = !!reduced;

  // —— full-bleed underlay (letterbox fill) ——
  const bleed = new PIXI.Graphics();
  // top / sky overscan
  bleed.beginFill(hexToNum(RAMPS.ciel.base));
  bleed.drawRect(-OVER, -OVER, gw + OVER * 2, juraBand + OVER);
  bleed.endFill();
  // mid plateau green (sides letterbox)
  bleed.beginFill(hexToNum(RAMPS.herbe?.base || RAMPS.pave?.base || 0xc5d4a8));
  // try herbe; fallback soft green
  bleed.endFill();
  bleed.beginFill(0xc8d4a8);
  bleed.drawRect(-OVER, juraBand, gw + OVER * 2, Math.max(1, lakeY0 - juraBand));
  bleed.endFill();
  // lake bottom overscan
  bleed.beginFill(hexToNum(RAMPS.eau.base));
  bleed.drawRect(-OVER, lakeY0, gw + OVER * 2, lakeBand + OVER);
  bleed.endFill();
  layer.addChild(bleed);
  scene.__decorBleed = bleed;

  // —— sky / Jura — K8 minimal + K9 soft earth-horizon curvature ——
  const sky = new PIXI.Graphics();
  sky.beginFill(hexToNum(RAMPS.ciel.base));
  sky.drawRect(-OVER * 0.25, -OVER * 0.1, gw + OVER * 0.5, juraBand + OVER * 0.1);
  sky.endFill();
  // far ridge with gentle earth-horizon arc (not a flat line)
  sky.beginFill(hexToNum(RAMPS.juraFar.base));
  sky.moveTo(-2, juraBand + 2);
  const nArc = 24;
  for (let i = 0; i <= nArc; i++) {
    const t = i / nArc;
    const x = t * gw;
    // base arc (horizon curve) + small peaks
    const arc = Math.sin(t * Math.PI) * juraBand * 0.55;
    const peak = Math.sin(t * Math.PI * 3.2) * juraBand * 0.12;
    const y = Math.max(1, juraBand - arc - peak - juraBand * 0.05);
    sky.lineTo(x, y);
  }
  sky.lineTo(gw + 2, juraBand + 2);
  sky.closePath();
  sky.endFill();
  // near ridge, same curvature, slightly lower
  sky.beginFill(hexToNum(RAMPS.juraNear.base));
  sky.moveTo(-2, juraBand + 2);
  for (let i = 0; i <= nArc; i++) {
    const t = i / nArc;
    const x = t * gw;
    const arc = Math.sin(t * Math.PI) * juraBand * 0.38;
    const peak = Math.sin(t * Math.PI * 3.2 + 0.4) * juraBand * 0.08;
    const y = Math.max(2, juraBand - arc - peak);
    sky.lineTo(x, y);
  }
  sky.lineTo(gw + 2, juraBand + 2);
  sky.closePath();
  sky.endFill();
  layer.addChild(sky);
  scene.__juraSilhouette = sky;

  // snow caps — upper band only (K6)
  const caps = new PIXI.Graphics();
  caps.beginFill(0xf3f6f4, 0.9);
  [0.35, 0.62, 0.88].forEach((p) => {
    const x = p * gw;
    const y = juraBand * 0.12;
    const capH = Math.max(6, juraBand * 0.35);
    caps.moveTo(x, y);
    caps.lineTo(x + 10, y + capH);
    caps.lineTo(x - 10, y + capH);
    caps.closePath();
  });
  caps.endFill();
  layer.addChild(caps);

  // —— clouds (3, drift east) ——
  const cloudClip = new PIXI.Graphics();
  cloudClip.beginFill(0xffffff);
  cloudClip.drawRect(0, 0, gw, juraBand);
  cloudClip.endFill();
  const cloudsCont = new PIXI.Container();
  cloudsCont.mask = cloudClip;
  layer.addChild(cloudClip);
  layer.addChild(cloudsCont);

  function makeCloud(scale, opacity) {
    const g = new PIXI.Graphics();
    g.beginFill(0xffffff, opacity);
    g.drawEllipse(0, 0, 46 * scale, 18 * scale);
    g.drawEllipse(34 * scale, -8 * scale, 34 * scale, 20 * scale);
    g.drawEllipse(-28 * scale, -6 * scale, 30 * scale, 16 * scale);
    g.endFill();
    return g;
  }

  // TASK-100 K6/K10: clouds small; boat even slower
  const CLOUD_SCALE = 0.24;
  const SPEED_FACTOR = 1 / 2.2;
  const clouds = [
    {
      g: makeCloud(1 * CLOUD_SCALE, 0.55),
      y: juraBand * 0.28,
      speed: (gw / 48) * SPEED_FACTOR,
      phase: 0,
      size: 1 * CLOUD_SCALE,
    },
    {
      g: makeCloud(0.8 * CLOUD_SCALE, 0.45),
      y: juraBand * 0.16,
      speed: (gw / 62) * SPEED_FACTOR,
      phase: -0.35,
      size: 0.8 * CLOUD_SCALE,
    },
    {
      g: makeCloud(0.75 * CLOUD_SCALE, 0.5),
      y: juraBand * 0.4,
      speed: (gw / 55) * SPEED_FACTOR,
      phase: -0.6,
      size: 0.75 * CLOUD_SCALE,
    },
  ];
  clouds.forEach((c, i) => {
    c.g.y = c.y;
    c.g.x = -60 + i * -90;
    c.baseX = c.g.x;
    c.g.alpha = 0.85;
    cloudsCont.addChild(c.g);
  });
  scene.__clouds = clouds;
  // Boat: was 0.18 (TASK-100 tiny) → ×3 for readability on lake fringe
  const BOAT_SCALE = 0.54;
  scene.__ambientMeta = {
    cloudScale: CLOUD_SCALE,
    speedFactor: SPEED_FACTOR,
    boatScale: BOAT_SCALE,
    boatCycle: 45,
  };

  // —— lake aplat already from tiles; enhance + waves ——
  const lakeFx = new PIXI.Container();
  lakeFx.y = lakeY0;
  layer.addChild(lakeFx);

  const waves = [];
  for (let i = 0; i < 3; i++) {
    const w = new PIXI.Graphics();
    w.lineStyle(1.8, hexToNum(RAMPS.eau.light), 0.35);
    const yy = 18 + i * 24;
    w.moveTo(-40, yy);
    for (let x = 0; x <= gw + 80; x += 40) {
      w.quadraticCurveTo(x + 20, yy - 4, x + 40, yy);
    }
    w.y = 0;
    w.__baseY = 0;
    w.__phase = i * 0.3;
    w.__dur = (9 + i * 2) * 1.5; // slower
    w.__amp = (12 + i * 3) * 0.75; // subtler
    lakeFx.addChild(w);
    waves.push(w);
  }
  scene.__waves = waves;
  scene.__lakeBand = { y0: lakeY0, h: lakeBand, w: gw };

  // —— Belle Époque steamboat ——
  const boat = new PIXI.Container();
  const hull = new PIXI.Graphics();
  hull.beginFill(hexToNum(RAMPS.crepi.light));
  hull.lineStyle(1.2, hexToNum(RAMPS.molasse.shadow), 1);
  hull.moveTo(0, 20);
  hull.lineTo(96, 20);
  hull.lineTo(82, 40);
  hull.lineTo(8, 40);
  hull.closePath();
  hull.endFill();
  boat.addChild(hull);
  const cabin = new PIXI.Graphics();
  cabin.beginFill(hexToNum(RAMPS.crepi.base));
  cabin.lineStyle(1, hexToNum(RAMPS.molasse.shadow), 1);
  cabin.drawRoundedRect(22, 6, 50, 14, 2);
  cabin.endFill();
  boat.addChild(cabin);
  const paddle = new PIXI.Graphics();
  paddle.beginFill(hexToNum(RAMPS.crepi.shadow));
  paddle.lineStyle(1, hexToNum(RAMPS.molasse.shadow), 1);
  paddle.drawCircle(10, 28, 9);
  paddle.endFill();
  boat.addChild(paddle);
  const stack = new PIXI.Graphics();
  stack.beginFill(hexToNum(RAMPS.toit.base));
  stack.drawRect(48, -6, 7, 14);
  stack.beginFill(hexToNum(RAMPS.encre.shadow));
  stack.drawRect(48, -8, 7, 3);
  stack.endFill();
  boat.addChild(stack);
  // vaudois pennant
  const pen = new PIXI.Graphics();
  pen.beginFill(0xc4453c);
  pen.drawRect(78, 2, 12, 9);
  pen.beginFill(0xffffff);
  pen.drawRect(81, 5, 6, 2);
  pen.drawRect(83, 3, 2, 5);
  pen.endFill();
  boat.addChild(pen);
  // K10: NO white wake trail
  // smoke puff (subtle)
  const smoke = new PIXI.Graphics();
  smoke.beginFill(0xd8d8d8, 0.4);
  smoke.drawCircle(52, -14, 3);
  smoke.endFill();
  boat.addChild(smoke);
  boat.__smoke = smoke;

  boat.scale.set(BOAT_SCALE); // TASK-100 K6: ×4 smaller than 0.72
  boat.x = -100;
  boat.y = lakeY0 + Math.max(2, lakeBand * 0.35);
  boat.__baseY = boat.y;
  boat.__cycle = 90; // K10: twice as slow (was 45s) — tranquil
  layer.addChild(boat);
  scene.__vapor = boat;
  scene.__ambientMeta.boatCycle = 90;

  // —— Terrasses de Lavaux (vertical label, frange est) ——
  const lavauxW = (world.borders?.lavaux || 2) * TILE;
  const lavauxLabel = new PIXI.Text("Terrasses de Lavaux", {
    fontFamily: "Segoe UI, system-ui, sans-serif",
    fontSize: 11,
    fontWeight: "600",
    fill: 0x4f5e3c,
  });
  lavauxLabel.anchor.set(0.5, 0.5);
  lavauxLabel.resolution = 2;
  // vertical reading (90°)
  lavauxLabel.rotation = -Math.PI / 2;
  lavauxLabel.x = gw - lavauxW * 0.5;
  lavauxLabel.y = gh * 0.48;
  lavauxLabel.alpha = 0.75;
  layer.addChild(lavauxLabel);
  scene.__lavauxLabel = lavauxLabel;

  scene.__ambient = {
    t: 0,
    clouds,
    waves,
    boat,
    reduced,
    gw,
    lakeY0,
    lakeBand,
    meta: scene.__ambientMeta,
    lavauxLabel: true,
  };

  return {
    tick(dt) {
      tickAmbient(scene, dt);
    },
    snapshot() {
      return ambientSnapshot(scene);
    },
  };
}

export function tickAmbient(scene, dt) {
  const a = scene.__ambient;
  if (!a || a.reduced || scene.__ambientReduced) return;
  a.t += dt;
  const t = a.t;

  for (const c of a.clouds) {
    c.g.x += c.speed * dt;
    if (c.g.x > a.gw + 100) c.g.x = -120;
  }

  for (const w of a.waves) {
    const period = w.__dur;
    const phase = (t / period + w.__phase) % 1;
    w.x = Math.sin(phase * Math.PI * 2) * w.__amp;
  }

  // boat crosses lake slowly (TASK-093: ~45s)
  const cycle = a.boat.__cycle || 45;
  const p = (t % cycle) / cycle;
  a.boat.x = -100 + p * (a.gw + 200);
  // gentle bob
  const bob = Math.sin((t / 5.5) * Math.PI * 2) * 1.8;
  a.boat.y = a.boat.__baseY + bob;
  if (a.boat.__smoke) {
    a.boat.__smoke.y = -14 - ((t * 8) % 16);
    a.boat.__smoke.alpha = 0.55 * (1 - ((t * 8) % 16) / 16);
  }
}

export function ambientSnapshot(scene) {
  const a = scene.__ambient;
  if (!a) return { present: false };
  const meta = a.meta || scene.__ambientMeta || {};
  return {
    present: true,
    reduced: !!(a.reduced || scene.__ambientReduced),
    clouds: a.clouds.map((c) => ({
      x: c.g.x,
      y: c.g.y,
      size: c.size || 1,
      speed: c.speed,
    })),
    waves: a.waves.map((w) => ({ x: w.x, y: w.y, dur: w.__dur, amp: w.__amp })),
    boat: {
      x: a.boat.x,
      y: a.boat.y,
      baseY: a.boat.__baseY,
      scale: a.boat.scale?.x || 1,
      cycle: a.boat.__cycle || 45,
    },
    meta: {
      cloudScale: meta.cloudScale || 0.72,
      speedFactor: meta.speedFactor || 1 / 1.5,
      boatScale: meta.boatScale || 0.72,
      boatCycle: meta.boatCycle || 45,
    },
    jura: !!scene.__juraSilhouette,
    vapor: !!scene.__vapor,
    lavauxLabel: !!(
      scene.__lavauxLabel &&
      String(scene.__lavauxLabel.text || "").includes("Lavaux")
    ),
    lavauxText: scene.__lavauxLabel?.text || null,
  };
}
