/**
 * Chunked square tilemap (24 px) + culling + entity/building layers.
 */
/* global PIXI */
import { TILE, tileTexture, applySmoothGlobal } from "./shapes.js";
import { cellXY } from "./render2d.js";

const CHUNK = 16;

export class Tilemap {
  /**
   * @param {object} world
   * @param {PIXI.Container} root
   */
  constructor(world, root) {
    applySmoothGlobal();
    this.w = world.grid.w;
    this.h = world.grid.h;
    this.tiles = world.tiles;
    this.root = root;
    this.ground = new PIXI.Container();
    this.buildingsLayer = new PIXI.Container();
    this.buildingsLayer.sortableChildren = true;
    this.entities = new PIXI.Container();
    this.entities.sortableChildren = true;
    this.labelsLayer = new PIXI.Container();
    root.addChild(this.ground);
    root.addChild(this.buildingsLayer);
    root.addChild(this.entities);
    root.addChild(this.labelsLayer);

    this._chunks = new Map();
    this._visibleTiles = 0;
    this._waterFrame = 0;
    this._buildChunks();
  }

  _buildChunks() {
    const ncx = Math.ceil(this.w / CHUNK);
    const ncy = Math.ceil(this.h / CHUNK);
    for (let cy = 0; cy < ncy; cy++) {
      for (let cx = 0; cx < ncx; cx++) {
        const cont = new PIXI.Container();
        let count = 0;
        for (let ly = 0; ly < CHUNK; ly++) {
          for (let lx = 0; lx < CHUNK; lx++) {
            const gx = cx * CHUNK + lx;
            const gy = cy * CHUNK + ly;
            if (gx >= this.w || gy >= this.h) continue;
            const kind = this.tiles[gy][gx];
            const spr = new PIXI.Sprite(tileTexture(kind, (gx + gy) % 3));
            // D-012: smooth edges — no roundPixels
            const p = cellXY(gx, gy);
            spr.x = p.x;
            spr.y = p.y;
            if (kind === "water") spr.__water = true;
            cont.addChild(spr);
            count++;
          }
        }
        cont.__tileCount = count;
        cont.__cx = cx;
        cont.__cy = cy;
        cont.__bounds = {
          x0: cx * CHUNK * TILE,
          y0: cy * CHUNK * TILE,
          x1: (cx + 1) * CHUNK * TILE,
          y1: (cy + 1) * CHUNK * TILE,
        };
        this._chunks.set(cx + "," + cy, cont);
        this.ground.addChild(cont);
      }
    }
  }

  cull(cam, viewW, viewH) {
    const inv = 1 / cam.scale;
    const wx0 = -cam.x * inv - TILE;
    const wy0 = -cam.y * inv - TILE;
    const wx1 = (-cam.x + viewW) * inv + TILE;
    const wy1 = (-cam.y + viewH) * inv + TILE;
    let visible = 0;
    for (const cont of this._chunks.values()) {
      const b = cont.__bounds;
      const show = b.x1 >= wx0 && b.x0 <= wx1 && b.y1 >= wy0 && b.y0 <= wy1;
      cont.visible = show;
      if (show) visible += cont.__tileCount;
    }
    this._visibleTiles = visible;
  }

  get visibleTiles() {
    return this._visibleTiles;
  }

  /** Subtle water frame swap (cosmetic; not sim-time). */
  tickWater(frame) {
    if ((frame | 0) === this._waterFrame) return;
    this._waterFrame = frame | 0;
    const v = this._waterFrame % 3;
    for (const cont of this._chunks.values()) {
      if (!cont.visible) continue;
      for (const ch of cont.children) {
        if (ch.__water) ch.texture = tileTexture("water", v);
      }
    }
  }

  bakeStatic() {
    // optional no-op for 2d (chunks already cheap)
    this._baked = true;
  }

  addLabel(text, gx, gy, style) {
    const t = new PIXI.Text(
      text,
      Object.assign(
        {
          fontFamily: "Segoe UI, Helvetica, Arial, sans-serif",
          fontSize: 12,
          fill: 0x2f4266,
          fontWeight: "600",
          dropShadow: true,
          dropShadowColor: "#ffffff",
          dropShadowDistance: 1,
          dropShadowBlur: 0,
        },
        style || {}
      )
    );
    t.anchor.set(0.5, 1);
    const p = cellXY(gx, gy);
    t.x = p.x + TILE / 2;
    t.y = p.y;
    this.labelsLayer.addChild(t);
    return t;
  }
}
