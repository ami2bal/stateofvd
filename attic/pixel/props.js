/**
 * Procedural charm props (GDD D-010) — ramps only, NEAREST, no bitmaps, no gold.
 */
/* global PIXI */
import { makeTexture, makeSprite, RAMPS, TILE } from "./shapes.js";
import { cellXY } from "./render2d.js";

/** Registry for QA: {type, zone, gx?, gy?, siteId?, roomRole?}[] */
export const propRegistry = [];

function reg(entry) {
  propRegistry.push(entry);
  return entry;
}

export function clearPropRegistry() {
  propRegistry.length = 0;
}

export function propsReport() {
  const byType = {};
  const byZone = {};
  for (const p of propRegistry) {
    byType[p.type] = (byType[p.type] || 0) + 1;
    byZone[p.zone] = byZone[p.zone] || {};
    byZone[p.zone][p.type] = (byZone[p.zone][p.type] || 0) + 1;
  }
  return {
    total: propRegistry.length,
    byType,
    byZone,
    items: propRegistry.slice(),
  };
}

// —— factories (pixel sprites) ——

export function makeTree(variant) {
  const v = variant || 0;
  const tex = makeTexture(
    16,
    20,
    (ctx, put, rect) => {
      // trunk
      rect(7, 12, 2, 8, RAMPS.molasse.shadow);
      put(7, 12, RAMPS.molasse.base);
      // canopy
      const c = v % 2 === 0 ? RAMPS.herbe : RAMPS.vertGc;
      rect(3, 4, 10, 9, c.base);
      rect(4, 3, 8, 2, c.light);
      rect(3, 10, 10, 2, c.shadow);
      put(5, 6, c.light);
      put(10, 7, c.shadow);
    },
    `tree-${v}`
  );
  const s = new PIXI.Sprite(tex);
  s.anchor.set(0.5, 1);
  s.roundPixels = true;
  s.__propType = v % 2 === 0 ? "tree-a" : "tree-b";
  return s;
}

export function makeHedge() {
  const tex = makeTexture(
    20,
    8,
    (ctx, put, rect) => {
      rect(0, 2, 20, 6, RAMPS.herbe.base);
      rect(0, 2, 20, 2, RAMPS.herbe.light);
      for (let x = 1; x < 20; x += 3) put(x, 5, RAMPS.herbe.shadow);
    },
    "hedge"
  );
  const s = new PIXI.Sprite(tex);
  s.anchor.set(0.5, 1);
  s.roundPixels = true;
  s.__propType = "hedge";
  return s;
}

export function makeFlowerBed(variant) {
  const v = variant || 0;
  const tex = makeTexture(
    12,
    8,
    (ctx, put, rect) => {
      rect(0, 5, 12, 3, RAMPS.herbe.shadow);
      const blooms = [RAMPS.brique.light, RAMPS.sableCe.base, RAMPS.vertGc.light, RAMPS.vitre.base];
      for (let i = 0; i < 5; i++) {
        put(1 + i * 2, 3 + ((i + v) % 2), blooms[(i + v) % blooms.length]);
        put(2 + i * 2, 2, RAMPS.herbe.light);
      }
    },
    `flowers-${v}`
  );
  const s = new PIXI.Sprite(tex);
  s.anchor.set(0.5, 1);
  s.roundPixels = true;
  s.__propType = "flower-bed";
  return s;
}

export function makeLamp() {
  const tex = makeTexture(
    6,
    16,
    (ctx, put, rect) => {
      rect(2, 4, 2, 12, RAMPS.encre.shadow);
      rect(1, 0, 4, 5, RAMPS.sableCe.light);
      put(2, 1, RAMPS.sableCe.base);
      put(3, 2, RAMPS.crepi.light);
    },
    "lamp"
  );
  const s = new PIXI.Sprite(tex);
  s.anchor.set(0.5, 1);
  s.roundPixels = true;
  s.__propType = "lamp";
  return s;
}

export function makeBench() {
  const tex = makeTexture(
    14,
    8,
    (ctx, put, rect) => {
      rect(1, 3, 12, 2, RAMPS.molasse.base);
      rect(1, 2, 12, 1, RAMPS.molasse.light);
      rect(2, 5, 2, 3, RAMPS.molasse.shadow);
      rect(10, 5, 2, 3, RAMPS.molasse.shadow);
    },
    "bench"
  );
  const s = new PIXI.Sprite(tex);
  s.anchor.set(0.5, 1);
  s.roundPixels = true;
  s.__propType = "bench";
  return s;
}

export function makeMarketStall(variant) {
  const v = variant || 0;
  const tex = makeTexture(
    18,
    16,
    (ctx, put, rect) => {
      // awning
      const aw = v % 2 === 0 ? RAMPS.brique : RAMPS.vertGc;
      rect(1, 0, 16, 5, aw.base);
      rect(1, 0, 16, 2, aw.light);
      // posts
      rect(2, 5, 2, 10, RAMPS.molasse.shadow);
      rect(14, 5, 2, 10, RAMPS.molasse.shadow);
      // counter
      rect(3, 10, 12, 4, RAMPS.crepi.base);
      put(5, 11, RAMPS.sableCe.base);
      put(8, 12, RAMPS.encre.base);
    },
    `stall-${v}`
  );
  const s = new PIXI.Sprite(tex);
  s.anchor.set(0.5, 1);
  s.roundPixels = true;
  s.__propType = "market-stall";
  return s;
}

export function makeSteamboat() {
  const frames = [0, 1].map((f) =>
    makeTexture(
      28,
      14,
      (ctx, put, rect) => {
        rect(2, 8, 22, 5, RAMPS.crepi.base);
        rect(2, 8, 22, 2, RAMPS.crepi.light);
        rect(4, 4, 14, 5, RAMPS.crepi.shadow);
        rect(18, 2 + f, 4, 6, RAMPS.encre.base);
        put(19, 1 + f, RAMPS.brique.base);
        // paddle hint
        put(24, 9, RAMPS.molasse.shadow);
        put(25, 10, RAMPS.molasse.base);
      },
      `boat-${f}`
    )
  );
  const s = new PIXI.Sprite(frames[0]);
  s.anchor.set(0.5, 1);
  s.roundPixels = true;
  s.__frames = frames;
  s.__fi = 0;
  s.__propType = "steamboat";
  return s;
}

export function makeVines(variant) {
  const v = variant || 0;
  const tex = makeTexture(
    24,
    16,
    (ctx, put, rect) => {
      for (let row = 0; row < 4; row++) {
        const y = 2 + row * 3;
        rect(1, y, 22 - row, 2, row % 2 ? RAMPS.herbe.base : RAMPS.vertGc.base);
        rect(1, y, 22 - row, 1, RAMPS.herbe.light);
        // wall
        for (let x = 2; x < 20; x += 4) put(x + (v % 2), y + 2, RAMPS.molasse.shadow);
      }
    },
    `vines-${v}`
  );
  const s = new PIXI.Sprite(tex);
  s.anchor.set(0.5, 1);
  s.roundPixels = true;
  s.__propType = "vines";
  return s;
}

// —— interior furniture ——

export function makeTribune() {
  const tex = makeTexture(
    20,
    12,
    (ctx, put, rect) => {
      rect(2, 4, 16, 6, RAMPS.encre.base);
      rect(2, 4, 16, 2, RAMPS.encre.light);
      rect(6, 0, 8, 5, RAMPS.molasse.base);
      put(9, 2, RAMPS.sableCe.base);
    },
    "tribune"
  );
  const s = new PIXI.Sprite(tex);
  s.anchor.set(0.5, 1);
  s.roundPixels = true;
  s.__propType = "tribune";
  return s;
}

export function makeCarpet() {
  const tex = makeTexture(
    16,
    10,
    (ctx, put, rect) => {
      rect(0, 0, 16, 10, RAMPS.brique.shadow);
      rect(1, 1, 14, 8, RAMPS.brique.base);
      rect(3, 3, 10, 4, RAMPS.brique.light);
    },
    "carpet"
  );
  const s = new PIXI.Sprite(tex);
  s.anchor.set(0.5, 0.5);
  s.roundPixels = true;
  s.__propType = "carpet";
  return s;
}

export function makeArmchair() {
  const tex = makeTexture(
    8,
    8,
    (ctx, put, rect) => {
      rect(1, 3, 6, 4, RAMPS.encre.base);
      rect(1, 2, 6, 2, RAMPS.encre.light);
      rect(0, 3, 1, 3, RAMPS.encre.shadow);
      rect(7, 3, 1, 3, RAMPS.encre.shadow);
    },
    "armchair"
  );
  const s = new PIXI.Sprite(tex);
  s.anchor.set(0.5, 1);
  s.roundPixels = true;
  s.__propType = "armchair";
  return s;
}

export function makeWallMap() {
  const tex = makeTexture(
    14,
    10,
    (ctx, put, rect) => {
      rect(0, 0, 14, 10, RAMPS.molasse.shadow);
      rect(1, 1, 12, 8, RAMPS.vitre.base);
      put(4, 3, RAMPS.vertGc.base);
      put(8, 5, RAMPS.herbe.shadow);
      put(6, 6, RAMPS.eau.base);
    },
    "wall-map"
  );
  const s = new PIXI.Sprite(tex);
  s.anchor.set(0.5, 0.5);
  s.roundPixels = true;
  s.__propType = "wall-map";
  return s;
}

export function makeDesk() {
  const tex = makeTexture(
    14,
    10,
    (ctx, put, rect) => {
      rect(1, 4, 12, 5, RAMPS.molasse.base);
      rect(1, 4, 12, 2, RAMPS.molasse.light);
      rect(2, 2, 3, 2, RAMPS.encre.base);
      put(8, 3, RAMPS.crepi.light);
    },
    "desk"
  );
  const s = new PIXI.Sprite(tex);
  s.anchor.set(0.5, 1);
  s.roundPixels = true;
  s.__propType = "desk";
  return s;
}

export function makeShelf() {
  const tex = makeTexture(
    12,
    14,
    (ctx, put, rect) => {
      rect(0, 0, 12, 14, RAMPS.molasse.shadow);
      for (let y = 2; y < 14; y += 4) {
        rect(1, y, 10, 1, RAMPS.molasse.base);
        put(2, y - 1, RAMPS.encre.base);
        put(5, y - 1, RAMPS.vertGc.base);
        put(8, y - 1, RAMPS.sableCe.base);
      }
    },
    "shelf"
  );
  const s = new PIXI.Sprite(tex);
  s.anchor.set(0.5, 1);
  s.roundPixels = true;
  s.__propType = "shelf";
  return s;
}

export function makeTableChairs() {
  const tex = makeTexture(
    16,
    12,
    (ctx, put, rect) => {
      rect(3, 4, 10, 5, RAMPS.molasse.base);
      rect(3, 4, 10, 2, RAMPS.molasse.light);
      // chairs
      rect(1, 6, 2, 4, RAMPS.encre.shadow);
      rect(13, 6, 2, 4, RAMPS.encre.shadow);
      put(5, 3, RAMPS.encre.base);
      put(9, 3, RAMPS.encre.base);
    },
    "table-chairs"
  );
  const s = new PIXI.Sprite(tex);
  s.anchor.set(0.5, 1);
  s.roundPixels = true;
  s.__propType = "table-chairs";
  return s;
}

export function makeDossierStack() {
  const tex = makeTexture(
    6,
    6,
    (ctx, put, rect) => {
      rect(0, 2, 6, 4, RAMPS.encre.base);
      rect(0, 1, 5, 2, RAMPS.crepi.light);
      put(1, 0, RAMPS.vertGc.base);
    },
    "dossier-stack"
  );
  const s = new PIXI.Sprite(tex);
  s.anchor.set(0.5, 1);
  s.roundPixels = true;
  s.__propType = "dossier-stack";
  return s;
}

export function makeCounter() {
  const tex = makeTexture(
    18,
    10,
    (ctx, put, rect) => {
      rect(0, 3, 18, 7, RAMPS.crepi.base);
      rect(0, 3, 18, 2, RAMPS.crepi.light);
      rect(2, 0, 4, 4, RAMPS.encre.shadow);
    },
    "counter"
  );
  const s = new PIXI.Sprite(tex);
  s.anchor.set(0.5, 1);
  s.roundPixels = true;
  s.__propType = "counter";
  return s;
}

export function makeCubbies() {
  const tex = makeTexture(
    14,
    12,
    (ctx, put, rect) => {
      rect(0, 0, 14, 12, RAMPS.molasse.base);
      for (let y = 0; y < 12; y += 4) {
        for (let x = 0; x < 14; x += 4) {
          rect(x + 1, y + 1, 2, 2, RAMPS.encre.shadow);
        }
      }
    },
    "cubbies"
  );
  const s = new PIXI.Sprite(tex);
  s.anchor.set(0.5, 1);
  s.roundPixels = true;
  s.__propType = "cubbies";
  return s;
}

export function makeDelaysBoard() {
  const tex = makeTexture(
    18,
    12,
    (ctx, put, rect) => {
      rect(0, 0, 18, 12, RAMPS.encre.shadow);
      rect(1, 1, 16, 10, RAMPS.crepi.base);
      for (let i = 0; i < 4; i++) {
        rect(2, 2 + i * 2, 12, 1, RAMPS.encre.base);
        put(15, 2 + i * 2, i % 2 ? RAMPS.vertGc.base : RAMPS.sableCe.base);
      }
    },
    "delays-board"
  );
  const s = new PIXI.Sprite(tex);
  s.anchor.set(0.5, 0.5);
  s.roundPixels = true;
  s.__propType = "delays-board";
  return s;
}

// —— micro-life ——

export function makeIdleNpc() {
  const tex = makeTexture(
    16,
    24,
    (ctx, put, rect) => {
      rect(6, 18, 4, 6, RAMPS.encre.shadow);
      rect(5, 10, 6, 9, RAMPS.crepi.shadow);
      rect(5, 4, 6, 6, RAMPS.peau.base);
      put(6, 6, RAMPS.peau.light);
    },
    "idle-npc"
  );
  const s = new PIXI.Sprite(tex);
  s.anchor.set(0.5, 1);
  s.roundPixels = true;
  s.__propType = "idle-npc";
  return s;
}

export function makeBird() {
  const frames = [0, 1].map((f) =>
    makeTexture(
      6,
      4,
      (ctx, put) => {
        put(1 + f, 1, RAMPS.encre.base);
        put(2, 1, RAMPS.encre.light);
        put(3 - f, 2, RAMPS.encre.shadow);
      },
      `bird-${f}`
    )
  );
  const s = new PIXI.Sprite(frames[0]);
  s.anchor.set(0.5, 0.5);
  s.roundPixels = true;
  s.__frames = frames;
  s.__fi = 0;
  s.__propType = "bird";
  return s;
}

export function makeChimneySmoke() {
  const frames = [0, 1, 2].map((f) =>
    makeTexture(
      8,
      10,
      (ctx, put) => {
        put(3, 8 - f, RAMPS.pave.light);
        put(4, 6 - f, RAMPS.crepi.shadow);
        put(2 + (f % 2), 4 - f, RAMPS.pave.base);
      },
      `smoke-${f}`
    )
  );
  const s = new PIXI.Sprite(frames[0]);
  s.anchor.set(0.5, 1);
  s.roundPixels = true;
  s.__frames = frames;
  s.__fi = 0;
  s.__propType = "chimney-smoke";
  return s;
}

/**
 * Place outdoor props (D-011: light accents only — ≤ 8 trees, no forest band).
 * Esplanade guard from world.esplanade (compact layout v0.4).
 */
export function placeOutdoorProps(scene) {
  clearPropRegistry();
  const layer = scene.tilemap.buildingsLayer;
  const life = new PIXI.Container();
  life.sortableChildren = true;
  scene.tilemap.entities.addChild(life);
  scene.__lifeLayer = life;

  const reduced =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  scene.__reducedMotion = !!reduced;

  const world = scene.world || {};
  const esp = world.esplanade || { gx0: 13, gx1: 16, gy0: 8, gy1: 12 };
  const par = (world.sites || []).find((s) => s.id === "parlement");
  const cha = (world.sites || []).find((s) => s.id === "chateau");
  const lakeY = (world.grid && world.grid.h ? world.grid.h : 26) - 2;

  function onEsplanade(gx, gy) {
    return gx >= esp.gx0 && gx <= esp.gx1 && gy >= esp.gy0 && gy <= esp.gy1;
  }

  function putProp(sprite, gx, gy, zone, type) {
    if (onEsplanade(gx, gy)) return null;
    const p = cellXY(gx + 0.5, gy + 1);
    sprite.x = Math.round(p.x);
    sprite.y = Math.round(p.y);
    sprite.zIndex = gy * 1000 + gx;
    layer.addChild(sprite);
    reg({ type: type || sprite.__propType, zone, gx, gy });
    return sprite;
  }

  // ≤ 8 trees total — light parvis accents (D-011)
  const treeSpots = [
    [par ? par.gx - 1 : 5, par ? par.gy + 1 : 9],
    [par ? par.gx - 1 : 5, par ? par.gy + par.fh - 1 : 12],
    [cha ? cha.gx + cha.fw : 22, cha ? cha.gy + 1 : 9],
    [cha ? cha.gx + cha.fw : 22, cha ? cha.gy + cha.fh - 1 : 12],
    [par ? par.gx + 1 : 7, par ? par.gy + par.fh + 1 : 14],
    [cha ? cha.gx + cha.fw - 2 : 20, cha ? cha.gy + cha.fh + 1 : 14],
  ];
  treeSpots.slice(0, 6).forEach((pos, i) => {
    putProp(makeTree(i), pos[0], pos[1], "parvis", i % 2 ? "tree-b" : "tree-a");
  });
  // 2 more near dept street ends (total 8)
  putProp(makeTree(0), 3, 16, "depts", "tree-a");
  putProp(makeTree(1), 32, 16, "depts", "tree-b");

  // 1 hedge accent (not forest)
  putProp(makeHedge(), par ? par.gx - 2 : 4, par ? par.gy + 2 : 10, "parvis", "hedge");

  // Flowers near parvis (2 massifs)
  if (par) {
    putProp(makeFlowerBed(0), par.entry.gx - 1, par.entry.gy, "parvis", "flower-bed");
    putProp(makeFlowerBed(1), par.entry.gx + 1, par.entry.gy, "parvis", "flower-bed");
  }

  // Lamps + benches south of majors (off esplanade)
  if (par && cha) {
    putProp(makeLamp(), par.entry.gx - 2, par.entry.gy + 1, "esplanade-edge", "lamp");
    putProp(makeLamp(), cha.entry.gx + 1, cha.entry.gy + 1, "esplanade-edge", "lamp");
    putProp(makeBench(), par.entry.gx - 3, par.entry.gy + 1, "esplanade-edge", "bench");
    putProp(makeBench(), cha.entry.gx + 2, cha.entry.gy + 1, "esplanade-edge", "bench");
  }

  // One steamboat on lake border (no market forest / no vines band)
  const boat = makeSteamboat();
  putProp(boat, 18, lakeY, "lac", "steamboat");
  scene.__boat = boat;

  // Chimney smoke on 2 roofs
  if (!reduced) {
    for (const id of ["chateau", "parlement"]) {
      const v = scene.siteViews[id]?.view;
      if (!v) continue;
      const smoke = makeChimneySmoke();
      smoke.x = Math.round(v.__w * 0.3);
      smoke.y = 4;
      v.addChild(smoke);
      reg({ type: "chimney-smoke", zone: "rooftop", siteId: id });
      if (!scene.__smokes) scene.__smokes = [];
      scene.__smokes.push(smoke);
    }
  }

  // Micro-life near depts (compact map) — still cut by reduced-motion
  scene.__life = { npcs: [], birds: [], t: 0 };
  if (!reduced) {
    for (let i = 0; i < 2; i++) {
      const npc = makeIdleNpc();
      const gx = 10 + i * 8;
      const gy = 17;
      const p = cellXY(gx + 0.5, gy + 1);
      npc.x = p.x;
      npc.y = p.y;
      npc.__path = [
        { x: p.x, y: p.y },
        { x: p.x + 30, y: p.y },
        { x: p.x + 15, y: p.y + 12 },
      ];
      npc.__pi = 0;
      life.addChild(npc);
      scene.__life.npcs.push(npc);
      reg({ type: "idle-npc", zone: "depts", gx, gy });
    }
    for (let i = 0; i < 2; i++) {
      const b = makeBird();
      b.x = 120 + i * 60;
      b.y = 80 + i * 20;
      b.__vx = 0.4 + i * 0.1;
      life.addChild(b);
      scene.__life.birds.push(b);
      reg({ type: "bird", zone: "sky" });
    }
  }

  return propsReport();
}

/** Animate micro-life + boat (no-op if reduced motion). */
export function tickPropsLife(scene, dt) {
  if (scene.__reducedMotion) return;
  const life = scene.__life;
  if (!life) return;
  life.t += dt;
  // boat paddle
  if (scene.__boat && scene.__boat.__frames && life.t > 0.35) {
    scene.__boat.__fi = 1 - (scene.__boat.__fi || 0);
    scene.__boat.texture = scene.__boat.__frames[scene.__boat.__fi];
  }
  if (scene.__smokes) {
    for (const s of scene.__smokes) {
      if (s.__frames && life.t > 0.25) {
        s.__fi = ((s.__fi || 0) + 1) % s.__frames.length;
        s.texture = s.__frames[s.__fi];
      }
    }
  }
  if (life.t < 0.3) return;
  life.t = 0;
  for (const npc of life.npcs) {
    const path = npc.__path;
    if (!path || !path.length) continue;
    const tgt = path[npc.__pi % path.length];
    npc.x += Math.sign(tgt.x - npc.x) * 1;
    npc.y += Math.sign(tgt.y - npc.y) * 1;
    if (Math.abs(npc.x - tgt.x) < 2 && Math.abs(npc.y - tgt.y) < 2) {
      npc.__pi = (npc.__pi + 1) % path.length;
    }
  }
  for (const b of life.birds) {
    b.x += b.__vx * 8;
    if (b.__frames) {
      b.__fi = 1 - (b.__fi || 0);
      b.texture = b.__frames[b.__fi];
    }
    if (b.x > 1200) b.x = 100;
  }
}

/**
 * Add furniture sprites into a room container based on role.
 * @returns {string[]} prop types added
 */
export function furnishRoom(cont, room, siteId) {
  const types = [];
  const role = room.role || "";
  const bodyId = room.bodyId || room.id || "";

  function add(sprite, dx, dy, type) {
    sprite.x = dx;
    sprite.y = dy;
    cont.addChild(sprite);
    types.push(type || sprite.__propType);
    reg({
      type: type || sprite.__propType,
      zone: "interior",
      siteId,
      roomRole: role || bodyId,
      bodyId,
    });
  }

  if (role === "hemicycle") {
    add(makeCarpet(), 0, 2, "carpet");
    add(makeTribune(), 0, 10, "tribune");
  } else if (role === "council-table") {
    add(makeArmchair(), -14, 4, "armchair");
    add(makeArmchair(), 14, 4, "armchair");
    add(makeWallMap(), 0, -14, "wall-map");
  } else if (role === "delays-board" || bodyId === "sgc") {
    add(makeDelaysBoard(), 0, -12, "delays-board");
    add(makeDesk(), -6, 6, "desk");
    add(makeShelf(), 10, 4, "shelf");
  } else if (role === "chancellerie" || bodyId === "chancellerie") {
    add(makeCounter(), 0, 6, "counter");
    add(makeCubbies(), 10, 2, "cubbies");
  } else if (
    bodyId === "bureau-gc" ||
    bodyId === "commission" ||
    role === "anteroom" ||
    room.decor
  ) {
    add(makeTableChairs(), 0, 6, "table-chairs");
    add(makeDossierStack(), 8, 4, "dossier-stack");
  } else {
    // default office-ish
    add(makeTableChairs(), 0, 6, "table-chairs");
    add(makeDossierStack(), -8, 4, "dossier-stack");
  }
  return types;
}
