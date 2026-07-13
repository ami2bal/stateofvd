/**
 * Mobile entities + grid pathfinding (BFS) — sim-logic unchanged.
 * Views are 2D pixel sprites (usher 16×24).
 */
/* global PIXI */
import { footXY, sortKey } from "./render2d.js";
import {
  makeUsherSprite,
  makeDossierTexture,
  makeGoldHaloSprite,
  RAMPS,
} from "./shapes.js";

const DIRS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

export function findPath(walkable, gx0, gy0, gx1, gy1) {
  const h = walkable.length;
  const w = walkable[0].length;
  if (!inBounds(w, h, gx0, gy0) || !inBounds(w, h, gx1, gy1)) return null;
  if (!walkable[gy0][gx0] || !walkable[gy1][gx1]) return null;
  if (gx0 === gx1 && gy0 === gy1) return [{ gx: gx0, gy: gy0 }];

  const key = (x, y) => y * w + x;
  const came = new Map();
  const q = [[gx0, gy0]];
  came.set(key(gx0, gy0), null);
  let found = false;
  while (q.length) {
    const [x, y] = q.shift();
    if (x === gx1 && y === gy1) {
      found = true;
      break;
    }
    for (const [dx, dy] of DIRS) {
      const nx = x + dx;
      const ny = y + dy;
      if (!inBounds(w, h, nx, ny) || !walkable[ny][nx]) continue;
      const k = key(nx, ny);
      if (came.has(k)) continue;
      came.set(k, [x, y]);
      q.push([nx, ny]);
    }
  }
  if (!found) return null;
  const path = [];
  let cur = [gx1, gy1];
  while (cur) {
    path.push({ gx: cur[0], gy: cur[1] });
    cur = came.get(key(cur[0], cur[1]));
  }
  path.reverse();
  return path;
}

function inBounds(w, h, x, y) {
  return x >= 0 && y >= 0 && x < w && y < h;
}

export function buildWalkable(tiles, buildings) {
  const h = tiles.length;
  const w = tiles[0].length;
  const walk = tiles.map((row) =>
    row.map((k) => k === "grass" || k === "pave" || k === "parquet")
  );
  for (const b of buildings) {
    for (let dy = 0; dy < b.fh; dy++) {
      for (let dx = 0; dx < b.fw; dx++) {
        const x = b.gx + dx;
        const y = b.gy + dy;
        if (inBounds(w, h, x, y)) walk[y][x] = false;
      }
    }
    if (b.entry && inBounds(w, h, b.entry.gx, b.entry.gy)) {
      walk[b.entry.gy][b.entry.gx] = true;
    }
  }
  return walk;
}

function dirFromDelta(dx, dy) {
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? "e" : "w";
  if (dy < 0) return "n";
  return "s";
}

export class Entity {
  constructor(opts) {
    this.id = opts.id;
    this.gx = opts.gx;
    this.gy = opts.gy;
    this.elev = opts.elev || 0;
    this.view = opts.view;
    this.path = [];
    this.pathI = 0;
    this.speed = opts.speed != null ? opts.speed : 2.5;
    this._frac = 0;
    this.carryingGold = false;
    this._goldView = null;
    this._dossier = null;
    this._syncPos();
  }

  _syncPos() {
    const p = footXY(this.gx, this.gy);
    this.view.x = p.x;
    this.view.y = p.y;
    this.view.zIndex = sortKey(this.gx, this.gy);
    if (this._goldView) {
      this._goldView.x = 0;
      this._goldView.y = -2;
    }
    if (this._dossier) {
      this._dossier.x = 4;
      this._dossier.y = -14;
    }
  }

  setPath(path) {
    this.path = path || [];
    this.pathI = 0;
    this._frac = 0;
  }

  setGold(on) {
    this.carryingGold = !!on;
    if (on) {
      if (!this._goldView) {
        this._goldView = makeGoldHaloSprite();
        // UNDER the body sprite
        this.view.addChildAt(this._goldView, 0);
      }
      this._goldView.visible = true;
    } else if (this._goldView) {
      this._goldView.visible = false;
    }
  }

  setDossier(familyHex) {
    if (!this._dossier) {
      const s = new PIXI.Sprite(makeDossierTexture(familyHex));
      s.anchor.set(0.5, 1);
      s.roundPixels = true;
      this.view.addChild(s);
      this._dossier = s;
    }
    this._dossier.visible = true;
  }

  update(dtSimMin) {
    if (!this.path || this.pathI >= this.path.length - 1) {
      this._syncPos();
      return true;
    }
    const a = this.path[this.pathI];
    const b = this.path[this.pathI + 1];
    const dx = b.gx - a.gx;
    const dy = b.gy - a.gy;
    if (this.view.__frames) {
      const dir = dirFromDelta(dx, dy);
      this.view.__dir = dir;
      this.view.__animAcc = (this.view.__animAcc || 0) + dtSimMin;
      // 8 fps walk ≈ every 0.125s real; in sim minutes use ~0.2
      if (this.view.__animAcc > 0.2) {
        this.view.__animAcc = 0;
        this.view.__fi = (this.view.__fi + 1) % 4;
        this.view.texture = this.view.__frames[dir][this.view.__fi];
      }
    }
    const step = this.speed * dtSimMin * 0.15;
    this._frac += step;
    while (this._frac >= 1 && this.pathI < this.path.length - 1) {
      this._frac -= 1;
      this.pathI += 1;
      this.gx = this.path[this.pathI].gx;
      this.gy = this.path[this.pathI].gy;
    }
    if (this.pathI < this.path.length - 1) {
      const a2 = this.path[this.pathI];
      const b2 = this.path[this.pathI + 1];
      this.gx = a2.gx + (b2.gx - a2.gx) * this._frac;
      this.gy = a2.gy + (b2.gy - a2.gy) * this._frac;
    }
    this._syncPos();
    return this.pathI >= this.path.length - 1 && this._frac < 0.01;
  }
}

export class EntitySystem {
  constructor(layer, walkable) {
    this.layer = layer;
    this.walkable = walkable;
    this.list = [];
  }

  add(entity) {
    this.list.push(entity);
    this.layer.addChild(entity.view);
    return entity;
  }

  spawnUsher(id, gx, gy, elev, simple) {
    let view;
    if (simple) {
      view = new PIXI.Container();
      const g = new PIXI.Graphics();
      g.beginFill(0x2f4266);
      g.drawRect(-3, -10, 6, 10);
      g.endFill();
      view.addChild(g);
      view.pivot.set(0, 0);
    } else {
      view = new PIXI.Container();
      const body = makeUsherSprite();
      // TASK-094 #11: ~1 tile tall on plan
      body.scale.set(0.55);
      view.addChild(body);
      view.__frames = body.__frames;
      view.__dir = "s";
      view.__fi = 0;
      view.__animAcc = 0;
      Object.defineProperty(view, "texture", {
        get() {
          return body.texture;
        },
        set(t) {
          body.texture = t;
        },
      });
    }
    view.scale.set(0.85);
    return this.add(new Entity({ id, gx, gy, elev: elev || 0, view }));
  }

  spawnDossier(id, gx, gy, elev, color) {
    const view = new PIXI.Container();
    const s = new PIXI.Sprite(makeDossierTexture(color || RAMPS.encre.base));
    s.anchor.set(0.5, 1);
    s.roundPixels = true;
    view.addChild(s);
    return this.add(
      new Entity({ id, gx, gy, elev: elev || 0, view, speed: 3.2 })
    );
  }

  pathTo(entity, gx, gy) {
    const path = findPath(
      this.walkable,
      Math.round(entity.gx),
      Math.round(entity.gy),
      gx,
      gy
    );
    if (path) entity.setPath(path);
    return path;
  }

  update(dtSimMin) {
    for (const e of this.list) e.update(dtSimMin);
  }

  get count() {
    return this.list.length;
  }
}
