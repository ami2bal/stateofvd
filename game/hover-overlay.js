/**
 * Selection overlay (TASK-095 K7 + TASK-098 gradient states).
 * HOVER = neutral glow stroke only.
 * SELECT (pin) = institutional gradient wash + firm contour. No gold.
 */
/* global PIXI */
import { hexToNum, RAMPS } from "../engine/shapes.js";

function institutionColor(def) {
  if (!def) return hexToNum(RAMPS.encre.base);
  if (def.kind === "parlement") return 0x3e7a52;
  if (def.kind === "chateau") return 0xc9a45c;

  if (def.deptTint) {
    return parseInt(String(def.deptTint).replace("#", ""), 16) || 0x2f4266;
  }
  return 0x2f4266;
}

/**
 * @param {object} opts
 * @param {object} opts.scene
 */
export function installHoverOverlay(opts) {
  const { scene } = opts;
  const layer = scene.tilemap.buildingsLayer;
  const g = new PIXI.Graphics();
  g.zIndex = 50_000;
  g.eventMode = "none";
  layer.sortableChildren = true;
  layer.addChild(g);

  let current = null; // { siteId, roomId, mode }

  function clear() {
    g.clear();
    current = null;
  }

  function roomRectWorld(v, roomId) {
    if (!roomId) return null;
    let rect = null;
    const rd = (v.__roomDoors || []).find((d) => d.roomId === roomId);
    if (rd?.rect) rect = rd.rect;
    if (!rect) {
      for (const ch of v.__roomsLayer?.children || []) {
        if (ch.__roomId === roomId && ch.__roomRect) {
          rect = ch.__roomRect;
          break;
        }
      }
    }
    if (!rect) return null;
    return {
      x: v.x + rect.x,
      y: v.y + (v.__roomsLayer?.y || 0) + rect.y,
      w: rect.w,
      h: rect.h,
    };
  }

  /**
   * @param {{ siteId: string, roomId?: string|null, view: PIXI.Container, def?: object }|null} target
   * @param {{ mode?: 'hover'|'select' }} [opts2]
   */
  function setTarget(target, opts2) {
    const mode = opts2?.mode || "hover";
    if (!target || !target.view) {
      clear();
      return;
    }
    const roomId = target.roomId || null;
    if (
      current &&
      current.siteId === target.siteId &&
      current.roomId === roomId &&
      current.mode === mode
    ) {
      return;
    }

    g.clear();
    const v = target.view;
    const def =
      target.def || scene.siteViews[target.siteId]?.def || null;
    const inst = institutionColor(def);
    const ink = hexToNum(RAMPS.encre.base);

    if (mode === "select") {
      // SELECT = fine institutional border (no heavy double frame)
      g.lineStyle(1.5, inst, 0.92);
      g.drawRoundedRect(v.x - 0.5, v.y - 0.5, (v.__w || 0) + 1, (v.__h || 0) + 1, 4);
      const rr = roomRectWorld(v, roomId);
      if (rr) {
        g.lineStyle(1.35, inst, 0.9);
        g.drawRect(rr.x + 0.5, rr.y + 0.5, rr.w - 1, rr.h - 1);
      }
    } else {
      // HOVER / préselect: light ink outline only
      g.lineStyle(1.4, ink, 0.4);
      g.drawRoundedRect(v.x - 0.5, v.y - 0.5, (v.__w || 0) + 1, (v.__h || 0) + 1, 4);
      const rr = roomRectWorld(v, roomId);
      if (rr) {
        g.lineStyle(1.2, ink, 0.5);
        g.drawRect(rr.x + 0.5, rr.y + 0.5, rr.w - 1, rr.h - 1);
      }
    }

    current = { siteId: target.siteId, roomId, mode };
  }

  function getCurrent() {
    return current ? { ...current } : null;
  }

  return {
    graphics: g,
    setTarget,
    clear,
    getCurrent,
    dispose() {
      clear();
      if (g.parent) g.parent.removeChild(g);
      g.destroy();
    },
  };
}
