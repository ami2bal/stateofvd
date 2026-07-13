/**
 * Continuous zoom camera — fit-to-view + hard plateau bounds (TASK-092 / D-013).
 * Pan and zoom clamped: décor (Jura/Léman/Lavaux) = hard frame limit.
 * Fit math: engine/camera-fit.js (TASK-111, pure).
 */
/* global PIXI */
import { computeFitScale, contentBoxFromBuilt, FIT } from "./camera-fit.js";

const ZOOMS = [1, 2, 3];
const TILE = 24;

export class Camera {
  /**
   * @param {PIXI.Application} app
   * @param {PIXI.Container} worldRoot
   */
  constructor(app, worldRoot) {
    this.app = app;
    this.worldRoot = worldRoot;
    this.x = 0;
    this.y = 0;
    this.scale = 1;
    this.minScale = 0.5;
    this.maxScale = 4;
    this.fitScale = 1;
    this._dragging = false;
    this._last = { x: 0, y: 0 };
    this._bound = false;
    /** @type {null|((scale:number)=>void)} */
    this.onScaleChange = null;
    this._world = null;
    /** World bounds in world px {x0,y0,x1,y1} */
    this.worldBounds = { x0: 0, y0: 0, x1: 1000, y1: 1000 };
  }

  setWorld(world) {
    this._world = world;
    const gw = (world?.grid?.w || 38) * TILE;
    const gh = (world?.grid?.h || 22) * TILE;
    this.worldBounds = { x0: 0, y0: 0, x1: gw, y1: gh };
  }

  bind() {
    if (this._bound) return;
    this._bound = true;
    const view = this.app.view;
    view.style.cursor = "grab";
    view.addEventListener("pointerdown", (e) => {
      this._dragging = true;
      this._last = { x: e.clientX, y: e.clientY };
      view.style.cursor = "grabbing";
    });
    window.addEventListener("pointerup", () => {
      this._dragging = false;
      view.style.cursor = "grab";
    });
    window.addEventListener("pointermove", (e) => {
      if (!this._dragging) return;
      const dx = e.clientX - this._last.x;
      const dy = e.clientY - this._last.y;
      this._last = { x: e.clientX, y: e.clientY };
      this.x += dx;
      this.y += dy;
      this.clampPan();
      this.apply();
    });
    view.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        const rect = view.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const wx = (mx - this.x) / this.scale;
        const wy = (my - this.y) / this.scale;
        const factor = e.deltaY > 0 ? 0.9 : 1.11;
        const prev = this.scale;
        this.scale = this._clampScale(this.scale * factor);
        this.x = mx - wx * this.scale;
        this.y = my - wy * this.scale;
        this.clampPan();
        this.apply();
        if (Math.abs(prev - this.scale) > 1e-4 && this.onScaleChange) {
          this.onScaleChange(this.scale);
        }
      },
      { passive: false }
    );
  }

  _clampScale(s) {
    // min = fit-to-view (plateau entier) — cannot zoom out further
    return Math.max(this.minScale, Math.min(this.maxScale, s));
  }

  /**
   * Keep viewport inside worldBounds (hard frame).
   * When world is smaller than view on an axis, center that axis.
   */
  clampPan() {
    const viewW = this.app.renderer.width || 1;
    const viewH = this.app.renderer.height || 1;
    const b = this.worldBounds;
    const worldW = (b.x1 - b.x0) * this.scale;
    const worldH = (b.y1 - b.y0) * this.scale;

    if (worldW <= viewW) {
      this.x = (viewW - worldW) / 2 - b.x0 * this.scale;
    } else {
      // x is top-left of world in screen: max 0 at left, min viewW-worldW at right
      const maxX = -b.x0 * this.scale; // left edge of world at left of screen
      const minX = viewW - b.x1 * this.scale; // right edge of world at right of screen
      this.x = Math.min(maxX, Math.max(minX, this.x));
    }

    if (worldH <= viewH) {
      this.y = (viewH - worldH) / 2 - b.y0 * this.scale;
    } else {
      const maxY = -b.y0 * this.scale;
      const minY = viewH - b.y1 * this.scale;
      this.y = Math.min(maxY, Math.max(minY, this.y));
    }
  }

  setScale(s) {
    const prev = this.scale;
    this.scale = this._clampScale(Number(s) || 1);
    this.clampPan();
    this.apply();
    if (Math.abs(prev - this.scale) > 1e-4 && this.onScaleChange) {
      this.onScaleChange(this.scale);
    }
  }

  centerOn(wx, wy) {
    const w = this.app.renderer.width;
    const h = this.app.renderer.height;
    this.x = w / 2 - wx * this.scale;
    this.y = h / 2 - wy * this.scale;
    this.clampPan();
    this.apply();
  }

  /**
   * TASK-097 additive API — focus a world point at a target zoom.
   * Respects minScale/maxScale + clampPan (093). Does not rewrite fit/clamp.
   * @param {number} wx world x
   * @param {number} wy world y
   * @param {number} [targetScale] optional scale (clamped)
   */
  focusOn(wx, wy, targetScale) {
    if (targetScale != null && Number.isFinite(targetScale)) {
      const prev = this.scale;
      this.scale = this._clampScale(targetScale);
      if (Math.abs(prev - this.scale) > 1e-4 && this.onScaleChange) {
        this.onScaleChange(this.scale);
      }
    }
    this.centerOn(wx, wy);
  }

  /**
   * Institutions-first fit (D-013 + fix letterbox vertical).
   *
   * Problème fenêtre classique : contain du monde entier est souvent
   * limité par la LARGEUR → grandes bandes haut/bas remplies par le
   * bleed ciel/lac → montagne & Léman dominent verticalement.
   * En plein écran (viewport plus large), le contain est limité par
   * la HAUTEUR → le bâti remplit l'écran, ratio jugé bon.
   *
   * Solution : cadrer le **bâti + frange décor légère**, plafonner le
   * letterbox vertical (~6 % haut/bas max) en zoomant un peu si besoin
   * (léger crop latéral du décor OK). minScale reste le contain monde.
   */
  frameFitView(world, siteViews) {
    this.setWorld(world || this._world);
    if (siteViews) this._siteViews = siteViews;
    const viewW = this.app.renderer.width || 1280;
    const viewH = this.app.renderer.height || 720;
    const b = this.worldBounds;
    const gw = Math.max(1, b.x1 - b.x0);
    const gh = Math.max(1, b.y1 - b.y0);

    // —— emprise institutions (siteViews) ou builtBBox ——
    let bx0 = Infinity;
    let by0 = Infinity;
    let bx1 = -Infinity;
    let by1 = -Infinity;
    if (siteViews) {
      for (const id of Object.keys(siteViews)) {
        const v = siteViews[id]?.view;
        if (!v) continue;
        bx0 = Math.min(bx0, v.x);
        by0 = Math.min(by0, v.y);
        bx1 = Math.max(bx1, v.x + (v.__w || 0));
        by1 = Math.max(by1, v.y + (v.__h || 0));
      }
    }
    if (!Number.isFinite(bx0)) {
      const bb = world?.builtBBox || this._world?.builtBBox;
      if (bb) {
        bx0 = (bb.gx0 ?? 0) * TILE;
        by0 = (bb.gy0 ?? 0) * TILE;
        bx1 = (bb.gx1 ?? gw / TILE) * TILE;
        by1 = (bb.gy1 ?? gh / TILE) * TILE;
      } else {
        bx0 = b.x0;
        by0 = b.y0;
        bx1 = b.x1;
        by1 = b.y1;
      }
    }

    const box = contentBoxFromBuilt({ bx0, by0, bx1, by1 });
    const { cx0, cy0, cx1, cy1, contentW, contentH } = box;
    const fit = computeFitScale({
      viewW,
      viewH,
      contentW,
      contentH,
      worldW: gw,
      worldH: gh,
    });

    this.fitScale = fit.fitScale;
    this.minScale = fit.minScale;
    this.maxScale = fit.maxScale;
    this.scale = fit.scale;
    // Centre sur le bâti (pas le centre géométrique monde si asymétrique)
    this.centerOn((cx0 + cx1) / 2, (cy0 + cy1) / 2);
    if (this.onScaleChange) this.onScaleChange(this.scale);

    return {
      scale: this.scale,
      fitScale: this.fitScale,
      mode: fit.mode,
      gw,
      gh,
      contentW,
      contentH,
      viewW,
      viewH,
      letterboxX: fit.letterboxX,
      letterboxY: fit.letterboxY,
      fullContain: fit.fullContain,
      contains:
        contentW * fit.scale <= viewW + 1 && contentH * fit.scale <= viewH + 1,
      fitConstants: FIT,
    };
  }

  frameAmphitheater(world, siteViews) {
    return this.frameFitView(world, siteViews);
  }

  frameBuilt(world, siteViews) {
    return this.frameFitView(world, siteViews);
  }

  /**
   * QA: is viewport fully inside plateau?
   */
  isViewportInsidePlateau() {
    const viewW = this.app.renderer.width || 1;
    const viewH = this.app.renderer.height || 1;
    const b = this.worldBounds;
    // corners of viewport in world space
    const corners = [
      { x: (0 - this.x) / this.scale, y: (0 - this.y) / this.scale },
      { x: (viewW - this.x) / this.scale, y: (0 - this.y) / this.scale },
      { x: (0 - this.x) / this.scale, y: (viewH - this.y) / this.scale },
      { x: (viewW - this.x) / this.scale, y: (viewH - this.y) / this.scale },
    ];
    // Allow tiny epsilon when world smaller than view (letterbox OK)
    const worldW = (b.x1 - b.x0) * this.scale;
    const worldH = (b.y1 - b.y0) * this.scale;
    if (worldW <= viewW + 1 && worldH <= viewH + 1) {
      // fully contained letterbox mode
      return { ok: true, mode: "letterbox", corners };
    }
    let ok = true;
    for (const c of corners) {
      if (c.x < b.x0 - 0.5 || c.x > b.x1 + 0.5 || c.y < b.y0 - 0.5 || c.y > b.y1 + 0.5) {
        ok = false;
        break;
      }
    }
    return { ok, mode: "clamped", corners, bounds: b };
  }

  builtScreenRect(siteViews) {
    if (!siteViews) return null;
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const id of Object.keys(siteViews)) {
      const v = siteViews[id].view;
      if (!v) continue;
      const x0 = this.x + v.x * this.scale;
      const y0 = this.y + v.y * this.scale;
      const x1 = this.x + (v.x + (v.__w || 0)) * this.scale;
      const y1 = this.y + (v.y + (v.__h || 0)) * this.scale;
      minX = Math.min(minX, x0);
      maxX = Math.max(maxX, x1);
      minY = Math.min(minY, y0);
      maxY = Math.max(maxY, y1);
    }
    if (!Number.isFinite(minX)) return null;
    const viewW = this.app.renderer.width || 1;
    const viewH = this.app.renderer.height || 1;
    const cx0 = Math.max(0, minX);
    const cy0 = Math.max(0, minY);
    const cx1 = Math.min(viewW, maxX);
    const cy1 = Math.min(viewH, maxY);
    const area = Math.max(0, cx1 - cx0) * Math.max(0, cy1 - cy0);
    return {
      x0: cx0,
      y0: cy0,
      x1: cx1,
      y1: cy1,
      area,
      viewport: viewW * viewH,
      ratio: area / (viewW * viewH),
      scale: this.scale,
    };
  }

  decorScreenRatio(world) {
    const viewW = this.app.renderer.width || 1;
    const viewH = this.app.renderer.height || 1;
    const gw = (world?.grid?.w || 38) * TILE;
    const gh = (world?.grid?.h || 22) * TILE;
    const j = (world?.borders?.jura || 2) * TILE;
    const lake = (world?.borders?.lake || 2) * TILE;
    const lav = (world?.borders?.lavaux || 2) * TILE;
    const jura = this._clipArea(0, 0, gw, j);
    const lakeA = this._clipArea(0, gh - lake, gw, lake);
    const lavaux = this._clipArea(gw - lav, j, lav, gh - j - lake);
    const area = jura + lakeA + lavaux;
    return {
      area,
      ratio: area / (viewW * viewH),
      jura,
      lake: lakeA,
      lavaux,
    };
  }

  _clipArea(wx, wy, ww, wh) {
    const viewW = this.app.renderer.width || 1;
    const viewH = this.app.renderer.height || 1;
    const x0 = Math.max(0, this.x + wx * this.scale);
    const y0 = Math.max(0, this.y + wy * this.scale);
    const x1 = Math.min(viewW, this.x + (wx + ww) * this.scale);
    const y1 = Math.min(viewH, this.y + (wy + wh) * this.scale);
    return Math.max(0, x1 - x0) * Math.max(0, y1 - y0);
  }

  viewCenterWorld() {
    const w = this.app.renderer.width || 1;
    const h = this.app.renderer.height || 1;
    return {
      x: (w / 2 - this.x) / this.scale,
      y: (h / 2 - this.y) / this.scale,
    };
  }

  isNearFitView() {
    return this.scale <= this.fitScale * 1.12;
  }

  apply() {
    this.clampPan();
    this.worldRoot.position.set(this.x, this.y);
    this.worldRoot.scale.set(this.scale);
  }

  /**
   * Stable camera key for dirty-frame (TASK-110).
   * @param {number} [prec=1]
   */
  camKey(prec = 1) {
    const p = 10 ** prec;
    const s3 = Math.round(this.scale * 1000) / 1000;
    return `${Math.round(this.x * p) / p}|${Math.round(this.y * p) / p}|${s3}`;
  }

  resize() {
    // Prefer host (#game-host) — fenêtre vs plein écran / embed iframe
    const host =
      (typeof document !== "undefined" &&
        document.getElementById("game-host")) ||
      null;
    const w = host?.clientWidth || this.app.renderer.width || window.innerWidth;
    const h =
      host?.clientHeight || this.app.renderer.height || window.innerHeight;
    this.app.renderer.resolution = 1;
    if (w > 0 && h > 0) this.app.renderer.resize(w, h);
    // recompute fit when viewport changes (keep relative zoom if user was zoomed in)
    if (this._world) {
      const prev = this.scale / Math.max(1e-6, this.fitScale);
      // siteViews may be on scene — frameFitView works without if builtBBox exists
      this.frameFitView(this._world, this._siteViews || null);
      if (prev > 1.05) {
        this.setScale(this.fitScale * prev);
      }
    } else {
      this.apply();
    }
  }
}

export { ZOOMS };
