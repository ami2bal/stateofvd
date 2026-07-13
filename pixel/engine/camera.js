/**
 * Caméra cinématique — pan/zoom avec lerp, zoom quasi-entier pour le pixel art.
 */
/* global PIXI */
import { MAP_W, MAP_H, easeInOut, setMapSize } from "./pixel.js";

export class SoftCamera {
  /**
   * @param {PIXI.Application} app
   * @param {PIXI.Container} world
   */
  constructor(app, world) {
    this.app = app;
    this.world = world;
    this.x = 0;
    this.y = 0;
    this.scale = 2;
    this.minScale = 1;
    this.maxScale = 5;
    this._tx = 0;
    this._ty = 0;
    this._ts = 2;
    this._drag = false;
    this._last = { x: 0, y: 0 };
    this._anim = null;
    this._bound = false;
    this.userPan = true;
    this.mapW = MAP_W;
    this.mapH = MAP_H;
    /** @type {null|((scale:number)=>void)} */
    this.onScaleChange = null;
  }

  /** @param {number} w @param {number} h */
  setWorldSize(w, h) {
    this.mapW = w;
    this.mapH = h;
    setMapSize(w, h);
  }

  bind() {
    if (this._bound) return;
    this._bound = true;
    const view = this.app.view;
    view.style.cursor = "grab";
    view.addEventListener("pointerdown", (e) => {
      if (!this.userPan) return;
      this._drag = true;
      this._anim = null;
      this._last = { x: e.clientX, y: e.clientY };
      view.style.cursor = "grabbing";
    });
    window.addEventListener("pointerup", () => {
      this._drag = false;
      view.style.cursor = "grab";
    });
    window.addEventListener("pointermove", (e) => {
      if (!this._drag || !this.userPan) return;
      const dx = e.clientX - this._last.x;
      const dy = e.clientY - this._last.y;
      this._last = { x: e.clientX, y: e.clientY };
      this.x += dx;
      this.y += dy;
      this._tx = this.x;
      this._ty = this.y;
      this.clamp();
      this.apply();
    });
    view.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        this._anim = null;
        const rect = view.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const wx = (mx - this.x) / this.scale;
        const wy = (my - this.y) / this.scale;
        const dir = e.deltaY > 0 ? -1 : 1;
        // prefer integer-ish steps for crisp pixels
        const prev = this.scale;
        const next = this._snapScale(this.scale + dir * 0.35);
        this.scale = next;
        this._ts = next;
        this.x = mx - wx * this.scale;
        this.y = my - wy * this.scale;
        this._tx = this.x;
        this._ty = this.y;
        this.clamp();
        this.apply();
        if (this.onScaleChange && Math.abs(prev - this.scale) > 1e-4) {
          this.onScaleChange(this.scale);
        }
      },
      { passive: false }
    );
  }

  _snapScale(s) {
    const clamped = Math.max(this.minScale, Math.min(this.maxScale, s));
    // soft snap toward integers
    const nearest = Math.round(clamped);
    if (Math.abs(clamped - nearest) < 0.12) return nearest;
    return Math.round(clamped * 20) / 20;
  }

  fit() {
    const vw = this.app.screen.width;
    const vh = this.app.screen.height;
    const sx = vw / this.mapW;
    const sy = vh / this.mapH;
    const fit = Math.min(sx, sy) * 0.96;
    this.minScale = Math.max(0.85, fit * 0.85);
    this.scale = Math.max(this.minScale, Math.min(this.maxScale, fit));
    this._ts = this.scale;
    this.x = (vw - this.mapW * this.scale) / 2;
    this.y = (vh - this.mapH * this.scale) / 2;
    this._tx = this.x;
    this._ty = this.y;
    this.clamp();
    this.apply();
  }

  clamp() {
    const vw = this.app.screen.width;
    const vh = this.app.screen.height;
    const ww = this.mapW * this.scale;
    const wh = this.mapH * this.scale;
    if (ww <= vw) this.x = (vw - ww) / 2;
    else this.x = Math.min(0, Math.max(vw - ww, this.x));
    if (wh <= vh) this.y = (vh - wh) / 2;
    else this.y = Math.min(0, Math.max(vh - wh, this.y));
    this._tx = this.x;
    this._ty = this.y;
  }

  apply() {
    // round for pixel crispness when scale is near-int
    const s = this.scale;
    const round = Math.abs(s - Math.round(s)) < 0.02;
    this.world.scale.set(s);
    this.world.position.set(
      round ? Math.round(this.x) : this.x,
      round ? Math.round(this.y) : this.y
    );
  }

  /**
   * Cinematic focus on a world-space point (cx, cy) at optional scale.
   * @param {{x:number,y:number,scale?:number,ms?:number,onDone?:()=>void}} opts
   */
  focusOn(opts) {
    const { x, y, scale, ms = 900, onDone } = opts;
    const vw = this.app.screen.width;
    const vh = this.app.screen.height;
    const targetScale = scale != null ? this._snapScale(scale) : this.scale;
    const tx = vw / 2 - x * targetScale;
    const ty = vh / 2 - y * targetScale;
    this._anim = {
      t0: performance.now(),
      ms,
      x0: this.x,
      y0: this.y,
      s0: this.scale,
      x1: tx,
      y1: ty,
      s1: targetScale,
      onDone,
    };
  }

  /** Intro fly from lake northward */
  introFly(ms = 1800) {
    const vw = this.app.screen.width;
    const vh = this.app.screen.height;
    const s0 = Math.max(this.minScale, 1.2);
    const s1 = Math.max(this.minScale, Math.min(2.4, (vw / this.mapW) * 1.05));
    // start south (lake)
    this.scale = s0;
    this.x = vw / 2 - this.mapW * 0.5 * s0;
    this.y = vh / 2 - this.mapH * 0.88 * s0;
    this.focusOn({
      x: this.mapW * 0.48,
      y: this.mapH * 0.48,
      scale: s1,
      ms,
    });
  }

  /**
   * @param {number} now
   */
  tick(now) {
    if (!this._anim) return;
    const a = this._anim;
    const u = easeInOut((now - a.t0) / a.ms);
    this.x = a.x0 + (a.x1 - a.x0) * u;
    this.y = a.y0 + (a.y1 - a.y0) * u;
    this.scale = a.s0 + (a.s1 - a.s0) * u;
    this.clamp();
    this.apply();
    if (u >= 1) {
      const done = a.onDone;
      this._anim = null;
      this._tx = this.x;
      this._ty = this.y;
      this._ts = this.scale;
      if (done) done();
    }
  }

  resize() {
    this.fit();
  }
}
