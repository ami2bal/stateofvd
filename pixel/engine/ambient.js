/**
 * Ambiance animée — nuages, lac, bateau, fumée, scintillement.
 */
/* global PIXI */
import { C, MAP_W, MAP_H, mulberry32 } from "./pixel.js";

/**
 * @param {PIXI.Container} layer
 */
export function installAmbient(layer) {
  const rng = mulberry32(0xa11ce);
  const clouds = [];
  for (let i = 0; i < 5; i++) {
    const g = new PIXI.Graphics();
    g.beginFill(0xffffff, 0.85);
    const cx = 0;
    g.drawEllipse(cx, 0, 18 + rng() * 12, 7 + rng() * 3);
    g.drawEllipse(cx + 12, -3, 12, 6);
    g.drawEllipse(cx - 10, -2, 10, 5);
    g.endFill();
    g.x = rng() * MAP_W;
    g.y = 18 + rng() * 36;
    g.__speed = 4 + rng() * 8;
    g.__phase = rng() * Math.PI * 2;
    layer.addChild(g);
    clouds.push(g);
  }

  // boat
  const boat = new PIXI.Graphics();
  boat.beginFill(C.boisLite);
  boat.drawPolygon([0, 6, 22, 6, 18, 12, 4, 12]);
  boat.endFill();
  boat.beginFill(0xf2f0e8);
  boat.drawPolygon([10, 6, 10, -6, 18, 6]);
  boat.endFill();
  boat.x = 300;
  boat.y = 340;
  layer.addChild(boat);

  // smoke stacks (departments area)
  const smokes = [];
  for (const x of [90, 200, 320]) {
    const s = new PIXI.Graphics();
    s.beginFill(0xd0d8e0, 0.45);
    s.drawCircle(0, 0, 3);
    s.endFill();
    s.x = x;
    s.y = 284;
    s.__t = rng() * 10;
    layer.addChild(s);
    smokes.push(s);
  }

  // lake sparkles
  const spark = new PIXI.Graphics();
  layer.addChild(spark);

  // soft vignette at edges is CSS; water shimmer via redraw
  let t = 0;

  return {
    /**
     * @param {number} dt sec
     * @param {boolean} reduced
     */
    tick(dt, reduced) {
      if (reduced) return;
      t += dt;
      for (const c of clouds) {
        c.x += c.__speed * dt * 0.35;
        c.y += Math.sin(t * 0.4 + c.__phase) * 0.02;
        if (c.x > MAP_W + 40) c.x = -50;
      }
      boat.x = 280 + Math.sin(t * 0.35) * 28;
      boat.y = 338 + Math.sin(t * 1.2) * 1.5;
      boat.rotation = Math.sin(t * 0.8) * 0.04;

      for (const s of smokes) {
        s.__t += dt;
        const u = (s.__t % 3) / 3;
        s.y = 284 - u * 18;
        s.alpha = 0.5 * (1 - u);
        s.scale.set(1 + u * 1.4);
        if (u > 0.98) {
          s.__t = 0;
          s.x = 70 + Math.floor(rng() * 300);
        }
      }

      // sparkles every frame light
      if (Math.floor(t * 8) !== Math.floor((t - dt) * 8)) {
        spark.clear();
        spark.beginFill(0xffffff, 0.55);
        for (let i = 0; i < 12; i++) {
          const sx = Math.floor(rng() * MAP_W);
          // lake band ≈ bottom ~12% of map (works at any grid scale)
          const lakeY0 = Math.floor(MAP_H * 0.88);
          const sy = lakeY0 + Math.floor(rng() * Math.max(1, MAP_H - lakeY0));
          spark.drawRect(sx, sy, 1, 1);
        }
        spark.endFill();
      }
    },
  };
}
