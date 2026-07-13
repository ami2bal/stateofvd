/**
 * Multi-viewport pure tests for computeFitScale (TASK-111).
 * Usage: node proto/state-of-vd/tools/test_camera_fit.mjs
 */
import {
  computeFitScale,
  contentBoxFromBuilt,
  FIT,
} from "../engine/camera-fit.js";

const VIEWPORTS = [
  [1280, 720],
  [1920, 1080],
  [900, 900],
  [640, 800],
  [1600, 900],
];

// Built AABB ~ institutions on 38×24 grid @ 24px
const built = { bx0: 48, by0: 48, bx1: 840, by1: 504 };
const box = contentBoxFromBuilt(built);
const worldW = 38 * 24;
const worldH = 24 * 24;

let fails = 0;
function assert(cond, msg) {
  if (!cond) {
    console.error("  FAIL", msg);
    fails++;
  } else {
    console.log("  OK  ", msg);
  }
}

console.log("content", box.contentW.toFixed(0), "×", box.contentH.toFixed(0));
console.log("FIT", FIT);

for (const [viewW, viewH] of VIEWPORTS) {
  const r = computeFitScale({
    viewW,
    viewH,
    contentW: box.contentW,
    contentH: box.contentH,
    worldW,
    worldH,
  });
  const lyRatio = r.letterboxY / viewH;
  console.log(
    `\n${viewW}×${viewH} scale=${r.scale.toFixed(4)} letterboxY=${r.letterboxY.toFixed(1)} (${(lyRatio * 100).toFixed(1)}%)`
  );
  assert(r.scale > 0 && Number.isFinite(r.scale), `${viewW}×${viewH} scale fini`);
  assert(
    lyRatio <= FIT.MAX_LETTERBOX_Y_RATIO + 0.05 + 1e-6,
    `${viewW}×${viewH} letterboxY/H ≤ ~${FIT.MAX_LETTERBOX_Y_RATIO}+slack (got ${lyRatio.toFixed(3)})`
  );
  assert(r.minScale <= r.fitScale + 1e-9, `${viewW}×${viewH} min≤fit`);
  assert(r.maxScale >= r.fitScale, `${viewW}×${viewH} max≥fit`);
  // height fill intent: content*scale covers most of height when we zoomed
  const fillH = (box.contentH * r.scale) / viewH;
  assert(fillH >= 0.75, `${viewW}×${viewH} content fills ≥75% height (got ${(fillH * 100).toFixed(0)}%)`);
}

console.log(fails ? `\n=== ${fails} FAIL ===` : "\n=== ALL PASS ===");
process.exit(fails ? 1 : 0);
