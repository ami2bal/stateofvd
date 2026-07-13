/**
 * Classeur administratif Mode Parcours — rendu Pixi + scale écran.
 * Fermé en trajet, ouvert en salle (feuilles / feed).
 */
/* global PIXI */

export const DOSSIER = {
  BODY: 0xc4a35a,
  TAB: 0xe8d5a3,
  EDGE: 0x8a6a2e,
  DONE: 0x3e7a52,
  SPINE: 0x9a7a38,
  INNER: 0xd4b878,
  FEED_SHEET: 0xf7f4ee,
};

/**
 * @param {PIXI.Graphics} g
 * @param {boolean} done
 * @param {boolean} secret
 * @param {boolean} [open]
 */
export function drawDossierBody(g, done, secret, open) {
  g.clear();
  const isOpen = !!open;
  if (secret) {
    g.beginFill(0x1a2233, 0.3);
    g.drawRoundedRect(-9, -10, 19, 22, 2.2);
    g.endFill();
    g.beginFill(0x2f4266, 0.96);
    g.lineStyle(1.4, 0xf7f4ee, 0.5);
    g.drawRoundedRect(-8, -9, 16.5, 20, 2);
    g.endFill();
    g.beginFill(0x1e2d45, 0.95);
    g.drawRoundedRect(-8, -9, 3.5, 20, 1.2);
    g.endFill();
    g.lineStyle(0);
    g.beginFill(0x3e7a52, 0.95);
    g.drawCircle(1, 1, 3.2);
    g.endFill();
    g.beginFill(0xf7f4ee, 0.95);
    g.drawCircle(1, 1, 1.4);
    g.endFill();
    return;
  }
  const fill = done ? DOSSIER.DONE : DOSSIER.BODY;
  const tab = done ? 0xa8d4b0 : DOSSIER.TAB;
  const spine = done ? 0x2d5a3c : DOSSIER.SPINE;
  const edgeA = done ? 0.4 : 0.6;

  if (!isOpen) {
    g.beginFill(0x2f4266, 0.2);
    g.drawRoundedRect(-8.5, -8.5, 18, 21, 2.2);
    g.endFill();
    g.beginFill(fill);
    g.lineStyle(1.3, DOSSIER.EDGE, edgeA);
    g.drawRoundedRect(-8, -9, 16.5, 20, 2);
    g.endFill();
    g.lineStyle(0);
    g.beginFill(spine, 0.95);
    g.drawRoundedRect(-8, -9, 4, 20, 1.4);
    g.endFill();
    g.lineStyle(0.8, done ? 0xffffff : 0x6a5020, 0.25);
    g.moveTo(-6.2, -6);
    g.lineTo(-6.2, 8);
    g.moveTo(-5, -6);
    g.lineTo(-5, 8);
    g.lineStyle(0);
    g.beginFill(tab, 0.95);
    g.drawRoundedRect(-2.5, -11.5, 8, 3.6, 1.1);
    g.endFill();
    g.lineStyle(1, DOSSIER.EDGE, 0.2);
    g.drawRoundedRect(-2.2, -4, 9, 12, 1.2);
    g.lineStyle(0);
    g.beginFill(done ? 0xffffff : 0x6a5020, done ? 0.55 : 0.45);
    g.drawRoundedRect(4.5, 0.5, 2.2, 4.5, 0.6);
    g.endFill();
    return;
  }

  g.beginFill(0x2f4266, 0.18);
  g.drawRoundedRect(-11, -8, 24, 20, 2);
  g.endFill();
  g.beginFill(fill, 0.92);
  g.lineStyle(1.2, DOSSIER.EDGE, edgeA);
  g.drawRoundedRect(-3, -8.5, 14, 19, 2);
  g.endFill();
  g.lineStyle(0);
  g.beginFill(DOSSIER.FEED_SHEET, 0.98);
  g.drawRoundedRect(-1.5, -7, 11, 16.5, 1.2);
  g.endFill();
  g.lineStyle(0.7, 0x2f4266, 0.2);
  g.moveTo(0.5, -4);
  g.lineTo(7.5, -4);
  g.moveTo(0.5, -1);
  g.lineTo(6.5, -1);
  g.moveTo(0.5, 2);
  g.lineTo(7.5, 2);
  g.moveTo(0.5, 5);
  g.lineTo(5.5, 5);
  g.lineStyle(1.2, DOSSIER.EDGE, edgeA);
  g.beginFill(DOSSIER.INNER, 0.95);
  g.drawRoundedRect(-12, -8.5, 10, 19, 2);
  g.endFill();
  g.lineStyle(0);
  g.beginFill(spine, 0.95);
  g.drawRoundedRect(-3.2, -8.5, 3.2, 19, 0.8);
  g.endFill();
  g.beginFill(tab, 0.95);
  g.drawRoundedRect(-10.5, -11.2, 6.5, 3.4, 1);
  g.endFill();
  if (done) {
    g.lineStyle(2, 0xffffff, 0.95);
    g.moveTo(1, 2);
    g.lineTo(3.5, 5);
    g.lineTo(8.5, -1.5);
  }
}

/** Scale monde → taille écran quasi constante. */
export function dossierScreenScale(cameraScale) {
  const inv = 1 / Math.max(0.4, cameraScale || 1);
  return Math.min(3.2, Math.max(1.35, inv * 1.05));
}

/**
 * Animation feuilles dans le classeur ouvert.
 * @param {PIXI.Container} d
 */
export function drawDossierFeed(d) {
  const feed = d.__feed || d.__spinner;
  if (!feed) return;
  feed.clear();
  if (!d.__working || !d.__open) return;
  const t = d.__spinT || 0;
  for (let i = 0; i < 3; i++) {
    const phase = (t * 0.9 + i * 0.85) % 2.4;
    if (phase > 1.45) continue;
    const u = phase / 1.45;
    const y = -16 + u * 14;
    const x = 2 + (i - 1) * 2.4 + Math.sin(t + i) * 0.5;
    const a = 0.88 * (1 - u * 0.5);
    const w = 5.5 - u * 0.7;
    const h = 6.5 - u * 0.9;
    feed.beginFill(DOSSIER.FEED_SHEET, a);
    feed.lineStyle(0.7, DOSSIER.EDGE, a * 0.65);
    feed.drawRoundedRect(x - w / 2, y - h / 2, w, h, 0.7);
    feed.endFill();
    feed.lineStyle(0.55, 0x2f4266, a * 0.35);
    feed.moveTo(x - w * 0.28, y - 1);
    feed.lineTo(x + w * 0.28, y - 1);
    feed.moveTo(x - w * 0.28, y + 0.8);
    feed.lineTo(x + w * 0.12, y + 0.8);
  }
  const pulse = 0.1 + 0.07 * Math.sin(t * 2.2);
  feed.beginFill(DOSSIER.BODY, pulse);
  feed.drawCircle(2, 3, 11);
  feed.endFill();
}

/**
 * @param {object} scene
 * @param {number} [cameraScale]
 * @returns {PIXI.Container}
 */
export function createDossierToken(scene, cameraScale) {
  const root = new PIXI.Container();
  root.zIndex = 60_000;
  const body = new PIXI.Graphics();
  drawDossierBody(body, false, false, false);
  root.addChild(body);
  root.__body = body;
  const feed = new PIXI.Graphics();
  feed.__isFeed = true;
  root.addChild(feed);
  root.__spinner = feed;
  root.__feed = feed;
  root.__spinT = 0;
  root.__working = false;
  root.__open = false;
  root.__done = false;
  root.__fading = false;
  root.alpha = 1;
  const sc = dossierScreenScale(cameraScale);
  root.__baseScale = sc;
  root.scale.set(sc);
  scene.tilemap.entities.addChild(root);
  return root;
}

export function applyDossierScale(dossier, cameraScale, extra) {
  if (!dossier) return;
  const base = dossierScreenScale(cameraScale);
  dossier.__baseScale = base;
  dossier.scale.set(base * (extra != null ? extra : 1));
}
