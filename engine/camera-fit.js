/**
 * Pure fit math for institutions-first framing (TASK-111).
 * No PIXI — unit-testable under Node.
 */

/** Named thresholds (no magic numbers in callers). */
export const FIT = {
  /** Frange X relative to built width */
  PAD_X_RATIO: 0.035,
  /** Frange Y relative to built height */
  PAD_Y_RATIO: 0.06,
  /** Min pad in world px (tiles ~24) */
  PAD_X_MIN: 28.8, // 1.2 * 24
  PAD_Y_MIN: 24, // 1.0 * 24
  /** If contain letterbox Y exceeds this fraction of viewH → zoom up */
  MAX_LETTERBOX_Y_RATIO: 0.07,
  /** Target content fill of view height when letterbox too big */
  TARGET_HEIGHT_FILL: 0.9,
  /**
   * Max side crop of content when zooming to kill vertical letterbox.
   * 0.45 = up to 45 % of content width may leave the viewport (tall / narrow windows).
   * Prefer cropping décor sides over huge sky/lake letterbox.
   */
  MAX_SIDE_CROP: 0.45,
  /** minScale = min(fullContain, fit * this) */
  MIN_SCALE_FACTOR: 0.92,
  /** maxScale = max(3.5, fit * this) */
  MAX_SCALE_FACTOR: 5,
  MAX_SCALE_FLOOR: 3.5,
};

/**
 * @param {object} p
 * @param {number} p.viewW
 * @param {number} p.viewH
 * @param {number} p.contentW  built + pad width
 * @param {number} p.contentH  built + pad height
 * @param {number} p.worldW
 * @param {number} p.worldH
 * @returns {{
 *   scale: number,
 *   fitScale: number,
 *   minScale: number,
 *   maxScale: number,
 *   letterboxX: number,
 *   letterboxY: number,
 *   fullContain: number,
 *   sContain: number,
 *   mode: string
 * }}
 */
export function computeFitScale(p) {
  const viewW = Math.max(1, p.viewW || 1);
  const viewH = Math.max(1, p.viewH || 1);
  const contentW = Math.max(1, p.contentW || 1);
  const contentH = Math.max(1, p.contentH || 1);
  const worldW = Math.max(1, p.worldW || contentW);
  const worldH = Math.max(1, p.worldH || contentH);

  const sContain = Math.min(viewW / contentW, viewH / contentH);
  // scale that keeps letterboxY ≤ MAX (content fills ≥ 1-2*MAX of height)
  const sLetterboxCap =
    (viewH * (1 - 2 * FIT.MAX_LETTERBOX_Y_RATIO)) / contentH;
  const sFillHeight = (viewH * FIT.TARGET_HEIGHT_FILL) / contentH;
  const sMaxSideCrop = viewW / (contentW * (1 - FIT.MAX_SIDE_CROP));
  let s = sContain;
  const letterboxYIfContain = (viewH - contentH * sContain) / 2;
  if (letterboxYIfContain > viewH * FIT.MAX_LETTERBOX_Y_RATIO) {
    // Prefer meeting letterbox cap; never exceed side-crop budget
    s = Math.min(Math.max(sLetterboxCap, sFillHeight), sMaxSideCrop);
    s = Math.max(s, sContain);
  }

  const fullContain = Math.min(viewW / worldW, viewH / worldH);
  const fitScale = s;
  const minScale = Math.min(fullContain, s * FIT.MIN_SCALE_FACTOR);
  const maxScale = Math.max(FIT.MAX_SCALE_FLOOR, s * FIT.MAX_SCALE_FACTOR);
  const letterboxX = Math.max(0, (viewW - contentW * s) / 2);
  const letterboxY = Math.max(0, (viewH - contentH * s) / 2);

  return {
    scale: s,
    fitScale,
    minScale,
    maxScale,
    letterboxX,
    letterboxY,
    fullContain,
    sContain,
    mode: "institutions-first",
  };
}

/**
 * Compute content box from built AABB + pads.
 * @param {{ bx0:number, by0:number, bx1:number, by1:number }} built
 */
export function contentBoxFromBuilt(built) {
  const builtW = Math.max(1, built.bx1 - built.bx0);
  const builtH = Math.max(1, built.by1 - built.by0);
  const padX = Math.max(FIT.PAD_X_MIN, builtW * FIT.PAD_X_RATIO);
  const padY = Math.max(FIT.PAD_Y_MIN, builtH * FIT.PAD_Y_RATIO);
  return {
    cx0: built.bx0 - padX,
    cy0: built.by0 - padY,
    cx1: built.bx1 + padX,
    cy1: built.by1 + padY,
    contentW: builtW + 2 * padX,
    contentH: builtH + 2 * padY,
    padX,
    padY,
  };
}
