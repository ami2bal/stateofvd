/**
 * Site labels — DOM-quality Text, anti-collision, LOD (majors at ×1).
 */
/* global PIXI */
import { cellXY, TILE } from "./render2d.js";

const MAJOR = new Set(["parlement", "chateau"]);

export class LabelSystem {
  constructor(layer, sites) {
    this.layer = layer;
    this.entries = [];
    for (const s of sites) {
      const t = new PIXI.Text(s.displayName, {
        fontFamily: "Segoe UI, Helvetica, Arial, sans-serif",
        fontSize: 12,
        fontWeight: "600",
        fill: 0x2f4266,
        dropShadow: true,
        dropShadowColor: "#ffffff",
        dropShadowDistance: 1,
        dropShadowBlur: 0,
      });
      t.anchor.set(0.5, 1);
      const p = cellXY(s.gx + s.fw / 2, s.gy);
      t.x = Math.round(p.x);
      t.y = Math.round(p.y - 8 - (s.levels || 2) * 6);
      t.__siteId = s.id;
      t.__major = MAJOR.has(s.id);
      t.__priority = MAJOR.has(s.id)
        ? 0
        : s.kind === "department" || s.kind === "hotel-dept"
          ? 2
          : 1;
      layer.addChild(t);
      this.entries.push({ site: s, text: t });
    }
  }

  applyLodScale(scale, lod) {
    this.update(scale);
  }

  update(scale) {
    // Building names live on vector buildings; floating labels = majors only, sparse
    const s = Number(scale) || 1;
    // Dirty skip: floating majors only change with scale band
    const band = s < 1.3 ? 0 : 1;
    if (this._lastBand === band && this._lastScaleKey === Math.round(s * 50)) {
      this._skipCount = (this._skipCount || 0) + 1;
      return false;
    }
    this._lastBand = band;
    this._lastScaleKey = Math.round(s * 50);
    this._updateCount = (this._updateCount || 0) + 1;
    for (const e of this.entries) {
      // Prefer on-building titles: hide floating labels when building has __title
      e.text.visible = e.text.__major && s < 1.3;
      const targetScreen = 12;
      e.text.style.fontSize = Math.max(4, targetScreen / Math.max(0.4, s));
      e.text.scale.set(1);
      e.text.resolution = 2;
    }
    const vis = this.entries
      .filter((e) => e.text.visible)
      .sort((a, b) => a.text.__priority - b.text.__priority);
    const placed = [];
    for (const e of vis) {
      const b = this._bounds(e.text);
      let hit = false;
      for (const p of placed) {
        if (this._overlap(b, p.box)) {
          hit = true;
          break;
        }
      }
      if (hit && !e.text.__major) {
        e.text.visible = false;
      } else if (hit && e.text.__major) {
        for (const p of placed) {
          if (!p.major && this._overlap(b, p.box)) p.text.visible = false;
        }
        placed.push({ box: b, text: e.text, major: true });
      } else {
        placed.push({ box: b, text: e.text, major: e.text.__major });
      }
    }
    return true;
  }

  _bounds(t) {
    const w = t.width;
    const h = t.height;
    return {
      x0: t.x - w * t.anchor.x,
      y0: t.y - h * t.anchor.y,
      x1: t.x + w * (1 - t.anchor.x),
      y1: t.y + h * (1 - t.anchor.y),
    };
  }

  _overlap(a, b) {
    return !(a.x1 < b.x0 || a.x0 > b.x1 || a.y1 < b.y0 || a.y0 > b.y1);
  }

  labels() {
    return this.entries.map((e) => {
      const b = this._bounds(e.text);
      return {
        id: e.text.__siteId,
        text: e.text.text,
        visible: !!e.text.visible,
        major: !!e.text.__major,
        box: b,
        fontSize: 12 * e.text.scale.x,
      };
    });
  }
}
