/**
 * Chunked isometric tilemap with viewport culling + y-sorted entity layer.
 */
/* global PIXI */
import { TILE_W, TILE_H, PAL, diamond, isoX, isoY, proj } from "./iso.js";

const CHUNK = 16;

const TILE_FILL = {
  grass: PAL.grass,
  pave: PAL.pave,
  water: PAL.water,
  parquet: PAL.parquet,
};

export class Tilemap {
  /**
   * @param {object} world data/world.json
   * @param {PIXI.Container} root
   */
  constructor(world, root) {
    this.w = world.grid.w;
    this.h = world.grid.h;
    this.tiles = world.tiles;
    this.citeElev = world.citeElev || 0;
    this.root = root;
    this.ground = new PIXI.Container();
    this.entities = new PIXI.Container();
    this.entities.sortableChildren = true;
    this.buildingsLayer = new PIXI.Container();
    this.buildingsLayer.sortableChildren = true;
    this.labelsLayer = new PIXI.Container();
    root.addChild(this.ground);
    root.addChild(this.buildingsLayer);
    root.addChild(this.entities);
    root.addChild(this.labelsLayer);

    this._chunks = new Map();
    this._visibleTiles = 0;
    this._buildAllChunks();
  }

  _chunkKey(cx, cy) {
    return cx + "," + cy;
  }

  _buildAllChunks() {
    const ncx = Math.ceil(this.w / CHUNK);
    const ncy = Math.ceil(this.h / CHUNK);
    for (let cy = 0; cy < ncy; cy++) {
      for (let cx = 0; cx < ncx; cx++) {
        const cont = new PIXI.Container();
        const g = new PIXI.Graphics();
        let count = 0;
        for (let ly = 0; ly < CHUNK; ly++) {
          for (let lx = 0; lx < CHUNK; lx++) {
            const gx = cx * CHUNK + lx;
            const gy = cy * CHUNK + ly;
            if (gx >= this.w || gy >= this.h) continue;
            const kind = this.tiles[gy][gx];
            const elev =
              kind === "parquet" ? this.citeElev : kind === "water" ? -4 : 0;
            const p = proj(gx + 0.5, gy + 0.5, elev);
            // flat fill only (line-claire) — no per-tile stroke (perf)
            diamond(g, p.x, p.y, 1.01, 1.01, TILE_FILL[kind] || PAL.grass, 1);
            count++;
          }
        }
        cont.addChild(g);
        cont.__tileCount = count;
        cont.__cx = cx;
        cont.__cy = cy;
        // chunk world bounds (approx)
        const minGx = cx * CHUNK;
        const minGy = cy * CHUNK;
        const maxGx = Math.min(this.w, (cx + 1) * CHUNK);
        const maxGy = Math.min(this.h, (cy + 1) * CHUNK);
        cont.__bounds = {
          x0: isoX(maxGx, minGy) - TILE_W,
          x1: isoX(minGx, maxGy) + TILE_W,
          y0: isoY(minGx, minGy) - TILE_H - this.citeElev,
          y1: isoY(maxGx, maxGy) + TILE_H,
        };
        this._chunks.set(this._chunkKey(cx, cy), cont);
        this.ground.addChild(cont);
      }
    }
  }

  /**
   * Cull chunks against camera viewport in world space.
   * @param {{x:number,y:number,scale:number}} cam
   * @param {number} viewW
   * @param {number} viewH
   */
  cull(cam, viewW, viewH) {
    const inv = 1 / cam.scale;
    const wx0 = -cam.x * inv - 80;
    const wy0 = -cam.y * inv - 80;
    const wx1 = (-cam.x + viewW) * inv + 80;
    const wy1 = (-cam.y + viewH) * inv + 80;
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

  /**
   * Bake ground chunks into one RenderTexture (stress / perf).
   * @param {PIXI.Renderer} renderer
   */
  bakeStatic(renderer) {
    if (this._baked) return;
    try {
      // show all chunks for bake
      for (const cont of this._chunks.values()) cont.visible = true;
      const bounds = this.ground.getBounds();
      const w = Math.min(4096, Math.ceil(bounds.width + 4));
      const h = Math.min(4096, Math.ceil(bounds.height + 4));
      if (w < 8 || h < 8) return;
      const tex = renderer.generateTexture(this.ground, {
        region: bounds,
        resolution: 1,
      });
      const spr = new PIXI.Sprite(tex);
      spr.x = bounds.x;
      spr.y = bounds.y;
      // replace chunk children with sprite
      this.ground.removeChildren();
      this.ground.addChild(spr);
      this._chunks.clear();
      this._baked = true;
      this._visibleTiles = this.w * this.h;
    } catch (e) {
      // keep unbaked if GPU rejects
      this._baked = false;
    }
  }

  addBuildingSprite(sprite, gx, gy, elev) {
    const p = proj(gx + 0.5, gy + 0.5, elev || 0);
    sprite.x = p.x;
    sprite.y = p.y;
    sprite.zIndex = (gx + gy) * 10 + (elev || 0) + 5;
    this.buildingsLayer.addChild(sprite);
  }

  addLabel(text, gx, gy, elev, style) {
    const t = new PIXI.Text(
      text,
      Object.assign(
        {
          fontFamily: "Segoe UI, Helvetica, Arial, sans-serif",
          fontSize: 11,
          fill: PAL.ink,
          fontWeight: "600",
        },
        style || {}
      )
    );
    t.anchor.set(0.5, 1);
    const p = proj(gx, gy, (elev || 0) + 8);
    t.x = p.x;
    t.y = p.y - 56;
    this.labelsLayer.addChild(t);
    return t;
  }
}
