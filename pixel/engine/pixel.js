/**
 * Pixel pipeline — NEAREST scale, integer world units.
 */
/* global PIXI */

/** Logical map size (crisp pixels). Displayed via camera scale. 30×23 tiles @ 16. */
export let MAP_W = 480;
export let MAP_H = 368;

/** @param {number} w @param {number} h */
export function setMapSize(w, h) {
  MAP_W = w;
  MAP_H = h;
}

export const C = {
  ciel: 0xd6e8f4,
  juraFar: 0x9db3bc,
  juraNear: 0x6e8a6e,
  snow: 0xf3f6f4,
  herbe: 0x8fbc6a,
  herbeDeep: 0x6a9a4a,
  herbeLite: 0xa8d07a,
  pave: 0xb8b0a0,
  paveDeep: 0x968e80,
  sable: 0xd4c4a0,
  molasse: 0xd4c8b0,
  molasseDeep: 0xb0a48c,
  crepi: 0xede8dc,
  brique: 0xa4553e,
  briqueLite: 0xc47058,
  toit: 0xb4674f,
  toitDeep: 0x8e4838,
  vertGc: 0x3e7a52,
  orCe: 0xc9a45c,
  orDeep: 0xa08040,
  encre: 0x2f4266,
  eau: 0x4c83ab,
  eauLite: 0x6ba4c8,
  eauDeep: 0x2e5a7a,
  vitre: 0x9fc2dc,
  bois: 0x8b6914,
  boisLite: 0xb8893a,
  feuille: 0x3d7a3a,
  feuilleDeep: 0x2a5a28,
  vigne: 0x5a8a3a,
  path: 0xc9b896,
  shadow: 0x2a3028,
};

export function applyNearest() {
  if (typeof PIXI === "undefined") return;
  PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST;
  PIXI.settings.ROUND_PIXELS = true;
  if (PIXI.BaseTexture?.defaultOptions) {
    PIXI.BaseTexture.defaultOptions.scaleMode = PIXI.SCALE_MODES.NEAREST;
  }
}

/** Ease out cubic */
export function easeOutCubic(t) {
  const u = 1 - Math.min(1, Math.max(0, t));
  return 1 - u * u * u;
}

/** Ease in-out */
export function easeInOut(t) {
  const x = Math.min(1, Math.max(0, t));
  return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
}

export function mulberry32(a) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
