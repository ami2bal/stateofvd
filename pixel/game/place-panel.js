/**
 * Placement intelligent d'un panneau DOM à côté d'une focale (salle / bâtiment).
 * Port allégé de state-of-vd inspector + walkthrough step-card.
 */

/**
 * @param {HTMLElement} el
 * @param {{ x:number, y:number, w:number, h:number }} focus  rect en coords shell (#sovd-root)
 * @param {object} [opts]
 * @param {HTMLElement} [opts.shell]
 * @param {number} [opts.margin]
 * @param {number} [opts.gap]
 * @param {number} [opts.bottomReserve]  place pour barre Mode Parcours
 * @param {number} [opts.topReserve]     place pour chrome
 * @param {{ x:number, y:number, side:string }|null} [opts.last]
 * @param {HTMLElement[]} [opts.obstacleEls]
 */
export function placePanelNear(el, focus, opts = {}) {
  if (!el || el.hidden) return opts.last || null;

  const shell =
    opts.shell ||
    el.closest("#sovd-root") ||
    document.getElementById("sovd-root");
  const sh = shell?.getBoundingClientRect?.() || {
    width: window.innerWidth,
    height: window.innerHeight,
  };
  const margin = opts.margin ?? 12;
  const gap = opts.gap ?? 14;
  const topReserve = opts.topReserve ?? 52;
  const bottomReserve = opts.bottomReserve ?? 96;
  const last = opts.last || { x: 0, y: 0, side: "right" };

  const vw = sh.width;
  const vh = sh.height;
  const pw = el.offsetWidth || Math.min(300, Math.max(120, vw - 24));
  const ph = el.offsetHeight || 200;

  const fr = {
    x: focus.x,
    y: focus.y,
    w: Math.max(12, focus.w),
    h: Math.max(12, focus.h),
  };
  const fcx = fr.x + fr.w / 2;
  const fcy = fr.y + fr.h / 2;
  const preferRight = fcx < vw * 0.55;

  /** @type {{ side:string, x:number, y:number }[]} */
  const candidates = [
    { side: "right", x: fr.x + fr.w + gap, y: fcy - ph / 2 },
    { side: "left", x: fr.x - gap - pw, y: fcy - ph / 2 },
    { side: "below", x: fcx - pw / 2, y: fr.y + fr.h + gap },
    { side: "above", x: fcx - pw / 2, y: fr.y - gap - ph },
    { side: "right", x: fr.x + fr.w + gap, y: fr.y },
    { side: "right", x: fr.x + fr.w + gap, y: fr.y + fr.h - ph },
    { side: "left", x: fr.x - gap - pw, y: fr.y },
    { side: "left", x: fr.x - gap - pw, y: fr.y + fr.h - ph },
  ];

  const obstacles = [];
  for (const node of opts.obstacleEls || []) {
    if (!node || node.hidden || node.offsetParent === null) continue;
    const r = node.getBoundingClientRect();
    if (!(r.width > 0 && r.height > 0)) continue;
    const srect = shell?.getBoundingClientRect?.();
    const ox = srect ? srect.left : 0;
    const oy = srect ? srect.top : 0;
    obstacles.push({
      x: r.left - ox - 8,
      y: r.top - oy - 8,
      w: r.width + 16,
      h: r.height + 16,
    });
  }

  function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
  }
  function overlap(a, b, pad = 0) {
    return !(
      a.x + a.w + pad <= b.x ||
      b.x + b.w + pad <= a.x ||
      a.y + a.h + pad <= b.y ||
      b.y + b.h + pad <= a.y
    );
  }

  function scoreCandidate(c) {
    const minY = margin + topReserve;
    const maxY = Math.max(minY, vh - ph - margin - bottomReserve);
    const maxX = Math.max(margin, vw - pw - margin);
    const x = clamp(c.x, margin, maxX);
    const y = clamp(c.y, minY, maxY);
    const box = { x, y, w: pw, h: ph };
    let score = 100;

    if (overlap(box, fr, 4)) score -= 80;
    for (const o of obstacles) {
      if (overlap(box, o, 2)) score -= 50;
    }

    const overflowX =
      Math.max(0, margin - c.x) + Math.max(0, c.x + pw + margin - vw);
    const overflowY =
      Math.max(0, minY - c.y) +
      Math.max(0, c.y + ph + margin + bottomReserve - vh);
    score -= overflowX * 1.2 + overflowY * 1.2;

    if (c.side === "right") score += preferRight ? 28 : 10;
    else if (c.side === "left") score += preferRight ? 8 : 28;
    else if (c.side === "below") score += 10;
    else score += 6;

    if (c.side === last.side) score += 8;
    score -= Math.hypot(x - last.x, y - last.y) * 0.02;

    const dist = Math.hypot(x + pw / 2 - fcx, y + ph / 2 - fcy);
    score -= Math.abs(dist - gap * 4) * 0.05;

    return { x, y, side: c.side, score };
  }

  let best = null;
  for (const c of candidates) {
    const s = scoreCandidate(c);
    if (!best || s.score > best.score) best = s;
  }
  if (!best) {
    best = {
      x: preferRight ? Math.max(margin, vw - pw - margin) : margin,
      y: margin + topReserve,
      side: preferRight ? "right" : "left",
      score: 0,
    };
  }

  const minY = margin + topReserve;
  const maxY = Math.max(minY, vh - ph - margin - bottomReserve);
  const px = Math.round(clamp(best.x, margin, Math.max(margin, vw - pw - margin)));
  const py = Math.round(clamp(best.y, minY, maxY));

  el.style.setProperty("left", `${px}px`, "important");
  el.style.setProperty("top", `${py}px`, "important");
  el.style.setProperty("right", "auto", "important");
  el.style.setProperty("bottom", "auto", "important");
  el.style.setProperty("transform", "none", "important");
  el.dataset.side = best.side;

  return { x: px, y: py, side: best.side };
}

/**
 * Rect screen (shell-local) d'un hotspot pixel via la caméra.
 * @param {{ cx:number, cy:number, w?:number, h?:number }} hs
 * @param {{ worldToScreen:(x:number,y:number)=>{x:number,y:number}, scale:number }} camera
 */
export function hotspotScreenRect(hs, camera) {
  if (!hs || !camera) {
    return { x: 40, y: 80, w: 80, h: 60 };
  }
  const scr = camera.worldToScreen(hs.cx, hs.cy);
  const sc = camera.scale || 1;
  const w = Math.max(24, (hs.w || 48) * sc);
  const h = Math.max(20, (hs.h || 32) * sc);
  return {
    x: scr.x - w / 2,
    y: scr.y - h / 2,
    w,
    h,
  };
}
