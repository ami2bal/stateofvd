/**
 * Connexions RBAC — traits le long des chemins + hover tip (iso main connections.js).
 */
/* global PIXI */
import { resolveRbac, RBAC_FICHES } from "./from-main.js";
import { routeHotspots } from "../engine/path-route.js";
import {
  flowColorForKind,
  FLOW_SEMANTIC,
} from "../../engine/theme.js";

/**
 * @param {object} opts
 * @param {PIXI.Container} opts.fxLayer
 * @param {Record<string, any>} opts.markers
 * @param {() => any} opts.getPathGraph
 * @param {HTMLElement} [opts.mount]  #sovd-root pour le tip DOM
 */
export function installConnections(opts) {
  const { fxLayer, markers, getPathGraph, mount } = opts;
  const g = new PIXI.Graphics();
  g.zIndex = 35;
  g.eventMode = "none";
  fxLayer.addChild(g);
  if (fxLayer.sortableChildren !== undefined) fxLayer.sortableChildren = true;

  /** @type {{ pts: {x:number,y:number}[], segs: number[], len: number, phase: number, color: number, inbound: boolean, path: object }[]} */
  let pearls = [];
  /**
   * @type {{
   *   pts: {x:number,y:number}[],
   *   color: number,
   *   css: string,
   *   inbound: boolean,
   *   link: { label: string, direction: string, kind: string, targetText?: string }
   * }[]}
   */
  let paths = [];
  /** @type {Set<object>} */
  let hoverPaths = new Set();
  let t0 = performance.now();
  let lastHs = null;
  /** @type {HTMLElement|null} */
  let tipEl = null;
  let lastTipHtml = "";

  function ensureTipCss() {
    if (document.getElementById("sovd-flow-tip-css")) return;
    const st = document.createElement("style");
    st.id = "sovd-flow-tip-css";
    st.textContent = `
      .sovd-flow-tip {
        --flow-c: #3E7A52;
        position: absolute;
        z-index: 55;
        pointer-events: none;
        max-width: min(280px, calc(100vw - 28px));
        padding: 8px 12px;
        border-radius: 12px;
        background: linear-gradient(
          155deg,
          rgba(255, 255, 255, 0.58) 0%,
          rgba(237, 232, 220, 0.42) 55%,
          rgba(255, 255, 255, 0.32) 100%
        );
        border: 1px solid rgba(255, 255, 255, 0.58);
        border-left: 3px solid var(--flow-c);
        box-shadow:
          0 8px 28px rgba(36, 48, 63, 0.12),
          inset 0 1px 0 rgba(255, 255, 255, 0.72);
        backdrop-filter: blur(14px) saturate(1.2);
        -webkit-backdrop-filter: blur(14px) saturate(1.2);
        color: #2F4266;
        font: 600 12px/1.3 "Segoe UI", system-ui, sans-serif;
        transform: translate(12px, -50%);
        transition: opacity 0.12s ease;
        opacity: 0;
        display: flex;
        flex-direction: column;
        gap: 5px;
      }
      .sovd-flow-tip.is-on { opacity: 1; }
      .sovd-flow-tip[hidden] { display: none !important; }
      .sovd-flow-tip .ft-row {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .sovd-flow-tip .ft-dot {
        flex-shrink: 0;
        width: 9px;
        height: 9px;
        border-radius: 50%;
        background: var(--row-c, var(--flow-c));
        outline: 3px solid color-mix(in srgb, var(--row-c, var(--flow-c)) 28%, transparent);
      }
      .sovd-flow-tip .ft-verb {
        flex: 1;
        min-width: 0;
        font-size: 12.5px;
        font-weight: 700;
        color: #2F4266;
      }
      .sovd-flow-tip .ft-n {
        flex-shrink: 0;
        font-size: 11px;
        font-weight: 800;
        color: #5e6c84;
        background: rgba(47, 66, 102, 0.08);
        border-radius: 999px;
        padding: 1px 7px;
      }
      .sovd-flow-tip .ft-dots {
        display: flex;
        align-items: center;
        gap: 3px;
        flex-shrink: 0;
      }
      .sovd-flow-tip .ft-dots .ft-dot { outline-width: 2px; width: 7px; height: 7px; }
    `;
    document.head.appendChild(st);
  }

  function ensureTipEl() {
    ensureTipCss();
    const host =
      mount ||
      document.getElementById("sovd-root") ||
      document.body;
    if (!tipEl) {
      tipEl = document.createElement("div");
      tipEl.className = "sovd-flow-tip";
      tipEl.setAttribute("role", "tooltip");
      tipEl.hidden = true;
      host.appendChild(tipEl);
    } else if (tipEl.parentElement !== host && host !== document.body) {
      host.appendChild(tipEl);
    }
    return tipEl;
  }

  function esc(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function actionVerb(link) {
    let s = String(link?.label || "").trim();
    if (!s) {
      s = link?.direction === "in" ? "Flux entrant" : "Flux sortant";
    }
    s = s.replace(/\s*[›>].*$/, "").trim();
    s = s
      .replace(
        /\s*→\s*(le\s+)?(plénum|hémicycle|conseil d['']état|chancellerie|grand conseil|commission|cabinet|sgc|csg|fao)\b.*$/i,
        ""
      )
      .trim();
    if (s.length > 52 && s.includes("→")) s = s.split("→")[0].trim();
    return s || (link?.direction === "in" ? "Flux entrant" : "Flux sortant");
  }

  function tipHtmlFromPaths(hitPaths) {
    /** @type {Map<string, { verb: string, count: number, colors: string[] }>} */
    const groups = new Map();
    for (const p of hitPaths) {
      const verb = actionVerb(p.link || {});
      const css = p.css || FLOW_SEMANTIC.default.css;
      if (!groups.has(verb)) groups.set(verb, { verb, count: 0, colors: [] });
      const g0 = groups.get(verb);
      g0.count += 1;
      if (!g0.colors.includes(css)) g0.colors.push(css);
    }
    const rows = [...groups.values()];
    const accent = rows[0]?.colors[0] || FLOW_SEMANTIC.default.css;
    const body = rows
      .map((row) => {
        const dots =
          row.colors.length > 1
            ? `<span class="ft-dots" aria-hidden="true">${row.colors
                .map(
                  (c) =>
                    `<span class="ft-dot" style="--row-c:${c};background:${c}"></span>`
                )
                .join("")}</span>`
            : `<span class="ft-dot" aria-hidden="true" style="--row-c:${row.colors[0]};background:${row.colors[0]}"></span>`;
        const n =
          row.count > 1
            ? `<span class="ft-n" title="${row.count} flux">×${row.count}</span>`
            : "";
        return `<div class="ft-row">${dots}<span class="ft-verb">${esc(row.verb)}</span>${n}</div>`;
      })
      .join("");
    return { html: body, accent };
  }

  function hideTip() {
    if (tipEl) {
      tipEl.hidden = true;
      tipEl.classList.remove("is-on");
      tipEl.innerHTML = "";
    }
    lastTipHtml = "";
  }

  function showHoverTip(sx, sy, hitPaths) {
    if (!hitPaths?.length) {
      hideTip();
      return;
    }
    const el = ensureTipEl();
    const { html, accent } = tipHtmlFromPaths(hitPaths);
    el.style.setProperty("--flow-c", accent);
    if (html !== lastTipHtml) {
      el.innerHTML = html;
      lastTipHtml = html;
    }
    const host =
      mount ||
      document.getElementById("sovd-root") ||
      document.body;
    const mR = host.getBoundingClientRect?.() || {
      left: 0,
      top: 0,
      width: window.innerWidth,
      height: window.innerHeight,
    };
    const pad = 12;
    const lx = sx - mR.left;
    const ly = sy - mR.top;
    const x = Math.max(pad, Math.min((mR.width || window.innerWidth) - pad, lx));
    const y = Math.max(pad, Math.min((mR.height || window.innerHeight) - pad, ly));
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.hidden = false;
    el.classList.add("is-on");
  }

  function clear() {
    g.clear();
    pearls = [];
    paths = [];
    hoverPaths = new Set();
    lastHs = null;
    hideTip();
  }

  function clearHover() {
    if (hoverPaths.size) {
      hoverPaths = new Set();
      drawStrokes();
    }
    hideTip();
  }

  /** Distance point → polyline (world). */
  function pathDist(path, wx, wy) {
    const pts = path.pts;
    let best = Infinity;
    for (let i = 1; i < pts.length; i++) {
      const ax = pts[i - 1].x;
      const ay = pts[i - 1].y;
      const bx = pts[i].x;
      const by = pts[i].y;
      const abx = bx - ax;
      const aby = by - ay;
      const len2 = abx * abx + aby * aby || 1e-6;
      let t = ((wx - ax) * abx + (wy - ay) * aby) / len2;
      t = Math.max(0, Math.min(1, t));
      const px = ax + abx * t;
      const py = ay + aby * t;
      const d = Math.hypot(wx - px, wy - py);
      if (d < best) best = d;
    }
    return best;
  }

  function hitTestAll(wx, wy, threshold = 12) {
    if (!paths.length) return [];
    const hits = [];
    for (const p of paths) {
      const d = pathDist(p, wx, wy);
      if (d <= threshold) hits.push({ p, d });
    }
    hits.sort((a, b) => a.d - b.d);
    return hits.map((h) => h.p);
  }

  /**
   * Hover flux — highlight + tip près du curseur.
   * @param {number} wx world x
   * @param {number} wy world y
   * @param {number} [sx] client x
   * @param {number} [sy] client y
   * @param {number} [worldThreshold]
   */
  function hoverAt(wx, wy, sx, sy, worldThreshold) {
    if (!paths.length) return null;
    const thr = worldThreshold ?? 12;
    const hits = hitTestAll(wx, wy, thr);
    if (!hits.length) {
      clearHover();
      return null;
    }
    let changed = hits.length !== hoverPaths.size;
    if (!changed) {
      for (const p of hits) {
        if (!hoverPaths.has(p)) {
          changed = true;
          break;
        }
      }
    }
    hoverPaths = new Set(hits);
    if (changed) drawStrokes();
    if (sx != null && sy != null) showHoverTip(sx, sy, hits);
    const nearest = hits[0];
    return {
      label: nearest.link?.label,
      target: nearest.link?.targetText,
      direction: nearest.link?.direction,
      count: hits.length,
    };
  }

  function drawStrokes() {
    g.clear();
    // non-hover first, then hover on top
    const ordered = [
      ...paths.filter((p) => !hoverPaths.has(p)),
      ...paths.filter((p) => hoverPaths.has(p)),
    ];
    for (const s of ordered) {
      const pts = s.pts;
      if (pts.length < 2) continue;
      const hi = hoverPaths.has(s);
      const glowA = hi ? 0.28 : 0.12;
      const lineA = hi ? 0.95 : 0.55;
      const lineW = hi ? 2.6 : 1.5;
      g.lineStyle(hi ? 10 : 6, s.color, glowA);
      g.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
      g.lineStyle(lineW, s.color, lineA);
      g.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
    }
  }

  function registerFlow(pts, kind, inbound, link) {
    const sem = flowColorForKind(kind);
    const color = sem.hex;
    const path = {
      pts,
      color,
      css: sem.css,
      inbound,
      link: link || {
        label: inbound ? "Flux entrant" : "Flux sortant",
        direction: inbound ? "in" : "out",
        kind: kind || "default",
      },
    };
    paths.push(path);

    let len = 0;
    const segs = [0];
    for (let i = 1; i < pts.length; i++) {
      len += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
      segs.push(len);
    }
    if (len < 8) return;
    const n = Math.min(8, Math.max(3, Math.floor(len / 80)));
    for (let k = 0; k < n; k++) {
      pearls.push({
        pts,
        segs,
        len,
        phase: k / n,
        color,
        inbound,
        path,
      });
    }
  }

  function routePts(fromHs, toHs, graph) {
    if (graph) return routeHotspots(fromHs, toHs, graph);
    return [
      { x: fromHs.cx, y: fromHs.cy },
      { x: toHs.cx, y: toHs.cy },
    ];
  }

  /**
   * @param {{ id?:string, kind?:string, siteId?:string, cx?:number, cy?:number }} hs
   */
  function showFor(hs) {
    pearls = [];
    paths = [];
    hoverPaths = new Set();
    hideTip();
    lastHs = hs || null;
    t0 = performance.now();
    if (!hs) {
      g.clear();
      return;
    }
    const graph = getPathGraph?.();
    const siteId = hs.kind === "room" ? hs.siteId : hs.id;
    const roomId = hs.kind === "room" ? hs.id : null;
    if (!siteId) {
      g.clear();
      return;
    }

    let rbac = null;
    try {
      rbac = resolveRbac(siteId, roomId);
    } catch {
      g.clear();
      return;
    }
    if (!rbac) {
      g.clear();
      return;
    }

    const fromHs = markers[roomId || siteId]?.__hs || hs;
    const targets = Array.isArray(rbac.targets) ? rbac.targets : [];
    const outLabel = rbac.institutionalAction || rbac.target || "";

    for (const t of targets) {
      const toSite = t.siteId || t;
      const toRoom = typeof t === "object" ? t.roomId : null;
      const kind = typeof t === "object" ? t.kind || "default" : "default";
      const label =
        (typeof t === "object" && t.label) || outLabel || "Flux sortant";
      const toHs =
        markers[toRoom || toSite]?.__hs || markers[toSite]?.__hs;
      if (!toHs || !fromHs) continue;
      const pts = routePts(fromHs, toHs, graph);
      if (pts.length < 2) continue;
      registerFlow(pts, kind, false, {
        label,
        targetText:
          typeof t === "object"
            ? t.label || `${toSite}/${toRoom || ""}`
            : String(t),
        direction: "out",
        kind,
      });
    }

    // Entrants : scan RBAC_FICHES (iso main allInboundTo)
    try {
      for (const [sid, pack] of Object.entries(RBAC_FICHES || {})) {
        if (sid === siteId && !roomId) continue;
        const slices = [];
        if (pack.building) slices.push({ rid: null, slice: pack.building });
        for (const [rid, slice] of Object.entries(pack.rooms || {})) {
          slices.push({ rid, slice });
        }
        for (const { rid, slice } of slices) {
          const tlist = Array.isArray(slice?.targets) ? slice.targets : [];
          for (const t of tlist) {
            const sidT = t.siteId || t;
            const ridT = typeof t === "object" ? t.roomId : null;
            const hitsUs =
              sidT === siteId && (!roomId || ridT === roomId || !ridT);
            if (!hitsUs) continue;
            const ohs =
              markers[rid || sid]?.__hs || markers[sid]?.__hs;
            if (!ohs || !fromHs) continue;
            const kind = typeof t === "object" ? t.kind || "default" : "default";
            const label =
              slice.institutionalAction ||
              (typeof t === "object" && t.label) ||
              "Flux entrant";
            const pts = routePts(ohs, fromHs, graph);
            if (pts.length < 2) continue;
            registerFlow(pts, kind, true, {
              label,
              targetText:
                typeof t === "object"
                  ? t.label || `${sidT}/${ridT || ""}`
                  : String(t),
              direction: "in",
              kind,
            });
          }
        }
      }
    } catch {
      /* inbound scan optional */
    }

    drawStrokes();
  }

  function pointAt(pts, segs, len, u) {
    const target = ((((u % 1) + 1) % 1) * len);
    let i = 1;
    while (i < segs.length && segs[i] < target) i++;
    const i0 = Math.max(0, i - 1);
    const i1 = Math.min(pts.length - 1, i);
    const a = pts[i0];
    const b = pts[i1];
    const seg = segs[i1] - segs[i0] || 1;
    const t = (target - segs[i0]) / seg;
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
  }

  function tick(now, reduced) {
    if (!lastHs || !paths.length) return;
    drawStrokes();
    if (!pearls.length) return;
    const t = (now - t0) / 1000;
    for (const p of pearls) {
      const hi = hoverPaths.has(p.path);
      const u = reduced ? p.phase : p.phase + t * (p.inbound ? -0.08 : 0.08);
      const pt = pointAt(p.pts, p.segs, p.len, u);
      g.beginFill(p.color, hi ? 1 : 0.8);
      g.drawCircle(pt.x, pt.y, hi ? 3.2 : 2.4);
      g.endFill();
    }
  }

  return {
    showFor,
    clear,
    clearHover,
    hoverAt,
    tick,
    get active() {
      return !!lastHs;
    },
    get pathCount() {
      return paths.length;
    },
  };
}
