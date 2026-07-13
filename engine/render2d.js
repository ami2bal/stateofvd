/**
 * 2D 3/4 (Stardew-like) projection helpers — square tiles, integer pixels.
 */
import { TILE } from "./shapes.js";

export { TILE };

/** Grid → world pixels (top-left of cell). */
export function cellXY(gx, gy) {
  return { x: Math.round(gx * TILE), y: Math.round(gy * TILE) };
}

/** Entity foot position (center of cell bottom). */
export function footXY(gx, gy) {
  return {
    x: Math.round(gx * TILE + TILE / 2),
    y: Math.round(gy * TILE + TILE),
  };
}

/** Building top-left including facade height offset handled by sprite. */
export function buildingXY(site, spriteH, footH) {
  const base = cellXY(site.gx, site.gy);
  // sprite drawn so footprint bottom aligns with grid footprint bottom
  return {
    x: base.x,
    y: Math.round(base.y + site.fh * TILE - (footH || site.fh * TILE)),
  };
}

/** y-sort key = foot Y (south). */
export function sortKey(gx, gy) {
  return gy * 1000 + gx;
}

export function footprintBaseline(gx, gy, fw, fh) {
  return (gy + fh) * 1000 + gx;
}
