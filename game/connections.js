/**
 * Institutional action connections (TASK-098).
 * On pin: soft directional flows along board paths (094).
 *
 * Visual language (rewritten): calm water-like stream —
 *   hairline path + soft glow + slow drifting pearls (not marching ants).
 * IN vs OUT: subtle tint + reverse pearl direction.
 * No gold. prefers-reduced-motion → static pearls.
 */
/* global PIXI */
import { resolveRbac, RBAC_FICHES } from "./inspector-data.js";
import { hexToNum, RAMPS } from "../engine/shapes.js";
import { flowColorForKind, FLOW_SEMANTIC } from "../engine/theme.js";
import {
  pathPointsStrict,
  pathIsManhattan,
} from "../engine/path-graph.js";
import { resolveTargetLocation } from "./resolve-target.js";

// Re-export path API + target resolve (single source)
export { pathPointsStrict, pathIsManhattan, resolveTargetLocation };

/**
 * Collect all link targets from a RBAC slice (K8 multi-targets).
 * @param {object} rbac
 * @param {string} fromSiteId
 */
function collectTargets(rbac, fromSiteId) {
  const out = [];
  const seen = new Set();
  function push(raw, label) {
    const loc = resolveTargetLocation(raw, fromSiteId);
    if (!loc) return;
    const key = `${loc.siteId}::${loc.roomId || ""}`;
    if (seen.has(key)) return;
    seen.add(key);
    const kind =
      typeof raw === "object" && raw && raw.kind
        ? raw.kind
        : "default";
    out.push({
      loc,
      label: label || (typeof raw === "string" ? raw : raw.label) || "",
      targetText:
        typeof raw === "string"
          ? raw
          : raw.label || `${raw.siteId}/${raw.roomId || ""}`,
      kind,
    });
  }
  // A4 : chemin structuré prioritaire — `targets: []` = zéro lien spatial (pas de fallback string).
  // Fallback string uniquement si la propriété `targets` est absente (legacy).
  if (Array.isArray(rbac.targets)) {
    for (const t of rbac.targets) push(t, t.label);
  } else if (rbac.target) {
    push(rbac.target, rbac.target);
  }
  return out;
}

function locKey(siteId, roomId) {
  return `${siteId}::${roomId || ""}`;
}

/** K9: who targets this location? (reverse of targets[]). */
function allInboundTo(toSiteId, toRoomId) {
  const out = [];
  const seen = new Set();
  const want = locKey(toSiteId, toRoomId);
  for (const [sid, pack] of Object.entries(RBAC_FICHES || {})) {
    const rooms = pack.rooms || {};
    for (const [rid, slice] of Object.entries(rooms)) {
      for (const c of collectTargets(slice, sid)) {
        if (locKey(c.loc.siteId, c.loc.roomId) !== want) continue;
        if (sid === toSiteId && rid === toRoomId) continue;
        const k = locKey(sid, rid);
        if (seen.has(k)) continue;
        seen.add(k);
        // verb = action institutionnelle à la SOURCE (pas le libellé de cible)
        out.push({
          siteId: sid,
          roomId: rid,
          label: slice.institutionalAction || c.label || "",
          targetText: c.targetText,
          kind: c.kind || "default",
        });
      }
    }
    // building-level targets
    if (pack.building) {
      for (const c of collectTargets(pack.building, sid)) {
        if (locKey(c.loc.siteId, c.loc.roomId) !== want) continue;
        const k = locKey(sid, null);
        if (seen.has(k)) continue;
        seen.add(k);
        out.push({
          siteId: sid,
          roomId: null,
          label: pack.building.institutionalAction || c.label || "",
          targetText: c.targetText,
          kind: c.kind || "default",
        });
      }
    }
  }
  return out;
}

/**
 * Links from a focus (site + optional room) using 096 RBAC targets.
 * K9: OUT (targets) + IN (who targets this room).
 */
export function linksFrom(siteId, roomId) {
  const rbac = resolveRbac(siteId, roomId);
  const links = [];
  const seen = new Set();

  if (rbac) {
    const collected = collectTargets(rbac, siteId);
    for (const c of collected) {
      if (
        c.loc.siteId === siteId &&
        (c.loc.roomId || null) === (roomId || null)
      ) {
        continue; // skip self
      }
      const k = `out::${locKey(c.loc.siteId, c.loc.roomId)}`;
      if (seen.has(k)) continue;
      seen.add(k);
      links.push({
        from: { siteId, roomId: roomId || null },
        to: c.loc,
        label: rbac.institutionalAction || c.label,
        targetText: c.targetText,
        direction: "out",
        kind: c.kind || "default",
      });
    }
  }

  // K9: inbound — others that target this location
  for (const src of allInboundTo(siteId, roomId || null)) {
    const k = `in::${locKey(src.siteId, src.roomId)}`;
    if (seen.has(k)) continue;
    // also skip if already listed as reverse of an out
    const kOut = `out::${locKey(src.siteId, src.roomId)}`;
    if (seen.has(kOut) && false) {
      /* keep both directions if mutual */
    }
    seen.add(k);
    links.push({
      from: { siteId: src.siteId, roomId: src.roomId },
      to: { siteId, roomId: roomId || null },
      label: src.label,
      targetText: src.targetText || src.label,
      direction: "in",
      kind: src.kind || "default",
    });
  }
  return links;
}

/**
 * @param {object} opts
 * @param {object} opts.scene
 */
export function installConnections(opts) {
  const { scene } = opts;
  const layer = scene.tilemap.buildingsLayer;
  // TASK-110: base polylines (dirty) + pearls (anim every frame)
  const gBase = new PIXI.Graphics();
  gBase.zIndex = 48_000;
  gBase.eventMode = "none";
  const gPearls = new PIXI.Graphics();
  gPearls.zIndex = 48_001;
  gPearls.eventMode = "none";
  layer.sortableChildren = true;
  layer.addChild(gBase);
  layer.addChild(gPearls);
  /** @deprecated alias — some QA may reference .graphics */
  const g = gBase;

  const reduced =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let active = null; // { siteId, roomId, links, paths }
  let tSec = 0; // slow time for drift
  /** @type {Set<object>} paths under cursor (highlight) */
  let hoverPaths = new Set();
  /** @type {HTMLElement|null} single hover tip panel */
  let tipEl = null;
  let lastTipHtml = "";
  let baseDirty = true;
  let lastHoverKey = "";
  let fullRedraws = 0;
  let pearlOnlyFrames = 0;
  /** Throttle perles ~30 fps (soft drift; base streams restent dirty-only). */
  let pearlAccum = 0;
  const PEARL_DT = 1 / 30;

  /**
   * Couleur flux = f(link.kind) pure (TASK-109).
   * kind annoté sur targets[] inspector-data — pas de regex nominale.
   */
  function flowColorForLink(link) {
    return flowColorForKind(link?.kind);
  }

  /** Index-based fallback (palette stable) */
  function flowColor(i) {
    const keys = Object.keys(FLOW_SEMANTIC).filter((k) => k !== "default");
    return FLOW_SEMANTIC[keys[i % keys.length]] || FLOW_SEMANTIC.default;
  }

  function ensureTipCss() {
    // bump id when tip skin changes so hot-reload / F5 always gets glass + colors
    const prev = document.getElementById("sovd-flow-tip-css");
    if (prev) prev.remove();
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
        box-shadow: 0 0 0 3px rgba(62, 122, 82, 0.18);
        /* ring tint follows row color via outline */
        outline: 3px solid color-mix(in srgb, var(--row-c, var(--flow-c)) 28%, transparent);
        outline-offset: 0;
      }
      .sovd-flow-tip .ft-verb {
        flex: 1;
        min-width: 0;
        font-size: 12.5px;
        font-weight: 700;
        letter-spacing: 0.01em;
        color: #2F4266;
      }
      .sovd-flow-tip .ft-n {
        flex-shrink: 0;
        font-size: 11px;
        font-weight: 800;
        letter-spacing: 0.02em;
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
    // Monter dans #sovd-root pour rester visible en plein écran
    const mount =
      document.getElementById("sovd-root") || document.body;
    if (!tipEl) {
      tipEl = document.createElement("div");
      tipEl.className = "sovd-flow-tip";
      tipEl.setAttribute("role", "tooltip");
      tipEl.hidden = true;
      mount.appendChild(tipEl);
    } else if (tipEl.parentElement !== mount && mount !== document.body) {
      mount.appendChild(tipEl);
    }
    return tipEl;
  }

  /**
   * Action / verbe only — source & cible sont lues sur le plan (illustration).
   * Strip tails " › lieu" and pure destination arrows when present.
   */
  function actionVerb(link) {
    let s = String(link?.label || "").trim();
    if (!s) {
      s = link?.direction === "in" ? "Flux entrant" : "Flux sortant";
    }
    // drop hierarchical place tails (site › room)
    s = s.replace(/\s*[›>].*$/, "").trim();
    // drop trailing "→ <lieu institutionnel>" when it looks like a place, not an act
    s = s
      .replace(
        /\s*→\s*(le\s+)?(plénum|hémicycle|conseil d['']état|chancellerie|grand conseil|commission|cabinet|sgc|csg|fao)\b.*$/i,
        ""
      )
      .trim();
    // collapse multi-arrow action chains to the first verbal clause if very long
    if (s.length > 52 && s.includes("→")) {
      s = s.split("→")[0].trim();
    }
    return s || (link?.direction === "in" ? "Flux entrant" : "Flux sortant");
  }

  /**
   * Factorize hover hits by verb: same name → one row + counter.
   * Pastille color(s) = flux color(s).
   * @param {object[]} paths
   */
  function tipHtmlFromPaths(paths) {
    /** @type {Map<string, { verb: string, count: number, colors: string[] }>} */
    const groups = new Map();
    for (const p of paths) {
      const verb = actionVerb(p.link || {});
      const css = (p.color || flowColorForLink(p.link)).css;
      if (!groups.has(verb)) {
        groups.set(verb, { verb, count: 0, colors: [] });
      }
      const g = groups.get(verb);
      g.count += 1;
      if (!g.colors.includes(css)) g.colors.push(css);
    }
    const rows = [...groups.values()];
    // panel accent = first flux color (reader map stream → tip)
    const accent = rows[0]?.colors[0] || FLOW_SEMANTIC.default.css;
    const body = rows
      .map((g) => {
        const dots =
          g.colors.length > 1
            ? `<span class="ft-dots" aria-hidden="true">${g.colors
                .map(
                  (c) =>
                    `<span class="ft-dot" style="--row-c:${c};background:${c}"></span>`
                )
                .join("")}</span>`
            : `<span class="ft-dot" aria-hidden="true" style="--row-c:${g.colors[0]};background:${g.colors[0]}"></span>`;
        const n =
          g.count > 1 ? `<span class="ft-n" title="${g.count} flux">×${g.count}</span>` : "";
        return `<div class="ft-row">${dots}<span class="ft-verb">${esc(g.verb)}</span>${n}</div>`;
      })
      .join("");
    return { html: body, accent };
  }

  /**
   * Show tip next to cursor (hover only). No auto placement on pin.
   * @param {number} sx screen x
   * @param {number} sy screen y
   * @param {object[]} paths
   */
  function showHoverTip(sx, sy, paths) {
    if (!paths?.length) {
      hideTip();
      return;
    }
    const el = ensureTipEl();
    const { html, accent } = tipHtmlFromPaths(paths);
    el.style.setProperty("--flow-c", accent);
    if (html !== lastTipHtml) {
      el.innerHTML = html;
      lastTipHtml = html;
    }
    // coords écran → coords dans #sovd-root / host
    const mount =
      document.getElementById("sovd-root") || document.body;
    const mR = mount.getBoundingClientRect?.() || { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
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

  /** Clear hover highlight + tip. */
  function clearHover() {
    if (hoverPaths.size) {
      hoverPaths = new Set();
      baseDirty = true;
      redraw();
    }
    hideTip();
  }

  /** Hide tip (+ optional keep stream highlight if redraw already called). */
  function hideTip() {
    if (tipEl) {
      tipEl.hidden = true;
      tipEl.classList.remove("is-on");
      tipEl.innerHTML = "";
    }
    lastTipHtml = "";
  }

  /** No-op kept for app.js call sites (tips are hover-only now). */
  function placeAutoTips() {
    /* hover-only: nothing to auto-place */
  }

  function esc(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function clear() {
    gBase.clear();
    gPearls.clear();
    active = null;
    tSec = 0;
    hoverPaths = new Set();
    baseDirty = true;
    lastHoverKey = "";
    hideTip();
  }

  function setFrom(siteId, roomId) {
    if (!siteId) {
      clear();
      return;
    }
    const links = linksFrom(siteId, roomId);
    const paths = [];
    let colorI = 0;
    for (const link of links) {
      const pts = pathPointsStrict(
        scene,
        link.from.siteId,
        link.from.roomId,
        link.to.siteId,
        link.to.roomId
      );
      if (pts.length >= 2) {
        const col = flowColorForLink(link);
        paths.push({
          pts,
          segs: buildSegs(pts),
          link,
          manhattan: pathIsManhattan(pts),
          color: col,
          semantic: col.key,
          colorIndex: colorI++,
        });
      }
    }
    active = { siteId, roomId: roomId || null, links, paths };
    tSec = 0;
    hoverPaths = new Set();
    baseDirty = true;
    lastHoverKey = "";
    hideTip();
    // tips appear on hover only (no auto clutter)
    redraw();
  }

  /** Distance point → segment (world units). */
  function distToSeg(px, py, x0, y0, x1, y1) {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const len2 = dx * dx + dy * dy || 1e-6;
    let t = ((px - x0) * dx + (py - y0) * dy) / len2;
    t = Math.max(0, Math.min(1, t));
    const qx = x0 + t * dx;
    const qy = y0 + t * dy;
    return Math.hypot(px - qx, py - qy);
  }

  /** Min distance path → point (world). */
  function pathDist(p, wx, wy) {
    let best = Infinity;
    const pts = p.pts;
    for (let i = 1; i < pts.length; i++) {
      const d = distToSeg(
        wx,
        wy,
        pts[i - 1].x,
        pts[i - 1].y,
        pts[i].x,
        pts[i].y
      );
      if (d < best) best = d;
    }
    return best;
  }

  /**
   * Hit-test active flows. Returns nearest path within threshold (world px).
   * @param {number} wx
   * @param {number} wy
   * @param {number} [threshold=12]
   */
  function hitTest(wx, wy, threshold = 12) {
    if (!active?.paths?.length) return null;
    let best = null;
    let bestD = threshold;
    for (const p of active.paths) {
      const d = pathDist(p, wx, wy);
      if (d < bestD) {
        bestD = d;
        best = p;
      }
    }
    return best;
  }

  /**
   * All paths under cursor within threshold (for stacked flows).
   * @returns {object[]}
   */
  function hitTestAll(wx, wy, threshold = 12) {
    if (!active?.paths?.length) return [];
    const hits = [];
    for (const p of active.paths) {
      const d = pathDist(p, wx, wy);
      if (d <= threshold) hits.push({ p, d });
    }
    hits.sort((a, b) => a.d - b.d);
    return hits.map((h) => h.p);
  }

  /**
   * Pointer hover over flows — highlight stream(s) + tip near cursor.
   * Superposed fluxes → factorized list (same verb ×N).
   * @param {number} wx world x
   * @param {number} wy world y
   * @param {number} [sx] screen x (client)
   * @param {number} [sy] screen y (client)
   * @param {number} [worldThreshold]
   * @returns {object|null} hit path info (nearest)
   */
  function hoverAt(wx, wy, sx, sy, worldThreshold) {
    if (!active?.paths?.length) {
      return null;
    }
    const thr = worldThreshold ?? 12;
    const hits = hitTestAll(wx, wy, thr);
    if (!hits.length) {
      clearHover();
      return null;
    }
    // stable set compare
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
    if (changed) {
      baseDirty = true;
      redraw();
    }
    // tip always follows cursor while over stream
    if (sx != null && sy != null) {
      showHoverTip(sx, sy, hits);
    }
    const nearest = hits[0];
    return {
      label: nearest.link?.label,
      target: nearest.link?.targetText,
      direction: nearest.link?.direction,
      count: hits.length,
    };
  }

  function buildSegs(pts) {
    const segs = [];
    let total = 0;
    for (let i = 1; i < pts.length; i++) {
      const dx = pts[i].x - pts[i - 1].x;
      const dy = pts[i].y - pts[i - 1].y;
      const len = Math.hypot(dx, dy) || 1e-6;
      segs.push({
        x0: pts[i - 1].x,
        y0: pts[i - 1].y,
        dx,
        dy,
        len,
        start: total,
      });
      total += len;
    }
    return { segs, total };
  }

  function pointAt(segsObj, dist) {
    const { segs, total } = segsObj;
    if (!segs.length) return { x: 0, y: 0 };
    let d = ((dist % total) + total) % total;
    for (const s of segs) {
      if (d <= s.len) {
        const t = d / s.len;
        return { x: s.x0 + s.dx * t, y: s.y0 + s.dy * t };
      }
      d -= s.len;
    }
    const last = segs[segs.length - 1];
    return { x: last.x0 + last.dx, y: last.y0 + last.dy };
  }

  /** Soft continuous polyline on a Graphics target. */
  function strokePath(gfx, pts, color, width, alpha) {
    if (pts.length < 2) return;
    gfx.lineStyle(width, color, alpha);
    gfx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) gfx.lineTo(pts[i].x, pts[i].y);
  }

  function orderedPaths() {
    if (!active?.paths?.length) return [];
    return [...active.paths].sort((a, b) => {
      const aH = hoverPaths.has(a) ? 1 : 0;
      const bH = hoverPaths.has(b) ? 1 : 0;
      if (aH !== bH) return aH - bH;
      const ai = a.link?.direction === "in" ? 0 : 1;
      const bi = b.link?.direction === "in" ? 0 : 1;
      return ai - bi;
    });
  }

  function hoverKey() {
    if (!hoverPaths.size) return "";
    return [...hoverPaths]
      .map((p) => p.colorIndex ?? p.link?.kind ?? "")
      .join(",");
  }

  /** Base stream: glow + hairline + end nodes (dirty only). */
  function drawStreamBase(pathObj, isIn, isHover) {
    const pts = pathObj.pts;
    if (!pts || pts.length < 2) return;
    const col = pathObj.color?.hex ?? flowColor(0).hex;
    const glowA = isHover ? 0.2 : 0.1;
    const lineA = isHover ? 0.78 : 0.48;
    const lineW = isHover ? 1.85 : 1.25;
    strokePath(gBase, pts, col, isHover ? 7 : 5, glowA);
    strokePath(gBase, pts, col, lineW, lineA);
    const a = pts[0];
    const b = pts[pts.length - 1];
    gBase.lineStyle(0);
    gBase.beginFill(col, isHover ? 0.28 : 0.2);
    gBase.drawCircle(a.x, a.y, 4.5);
    gBase.drawCircle(b.x, b.y, 3.2);
    gBase.endFill();
    gBase.beginFill(col, 0.55);
    gBase.drawCircle(a.x, a.y, 1.8);
    gBase.drawCircle(b.x, b.y, 1.4);
    gBase.endFill();
  }

  /** Pearls only (every anim frame). */
  function drawStreamPearls(pathObj, isIn, isHover) {
    const segsObj = pathObj.segs;
    if (!segsObj || segsObj.total < 2) return;
    const col = pathObj.color?.hex ?? flowColor(0).hex;
    const total = segsObj.total;
    const spacing = Math.max(48, Math.min(90, total / 3.2));
    const n = Math.max(2, Math.min(6, Math.floor(total / spacing)));
    const speed = 18 + Math.min(12, total * 0.02);
    const dir = isIn ? -1 : 1;
    for (let k = 0; k < n; k++) {
      let u = tSec * speed * dir + (k / n) * total;
      if (reduced) u = (k / n) * total + total * 0.15;
      const p = pointAt(segsObj, u);
      gPearls.beginFill(col, isHover ? 0.18 : 0.12);
      gPearls.drawCircle(p.x, p.y, isHover ? 6.2 : 5.5);
      gPearls.endFill();
      gPearls.beginFill(0xf7f4ee, 0.92);
      gPearls.drawCircle(p.x, p.y, isHover ? 2.7 : 2.4);
      gPearls.endFill();
      gPearls.lineStyle(0.9, col, 0.55);
      gPearls.drawCircle(p.x, p.y, isHover ? 2.7 : 2.4);
      gPearls.lineStyle(0);
      gPearls.beginFill(col, 0.35);
      gPearls.drawCircle(p.x, p.y, 0.9);
      gPearls.endFill();
    }
  }

  function redrawBase() {
    gBase.clear();
    fullRedraws++;
    if (!active?.paths?.length) return;
    for (const p of orderedPaths()) {
      drawStreamBase(p, p.link?.direction === "in", hoverPaths.has(p));
    }
    baseDirty = false;
    lastHoverKey = hoverKey();
  }

  function redrawPearls() {
    gPearls.clear();
    if (!active?.paths?.length) return;
    for (const p of orderedPaths()) {
      drawStreamPearls(p, p.link?.direction === "in", hoverPaths.has(p));
    }
    pearlOnlyFrames++;
  }

  /** Full redraw (base + pearls) — setFrom / hover change. */
  function redraw() {
    baseDirty = true;
    redrawBase();
    redrawPearls();
  }

  function tick(dt) {
    if (!active?.paths?.length) {
      if (baseDirty) {
        gBase.clear();
        gPearls.clear();
        baseDirty = false;
      }
      pearlAccum = 0;
      return;
    }
    const hk = hoverKey();
    if (baseDirty || hk !== lastHoverKey) {
      redrawBase();
      // hover change → perles immédiates (highlight)
      if (!reduced) redrawPearls();
    }
    if (!reduced) {
      const d = dt || 0.016;
      tSec += d;
      pearlAccum += d;
      if (pearlAccum >= PEARL_DT) {
        pearlAccum = 0;
        redrawPearls();
      }
    } else if (baseDirty) {
      redrawPearls();
    }
  }

  function getState() {
    const hoverArr = [...hoverPaths];
    return active
      ? {
          siteId: active.siteId,
          roomId: active.roomId,
          linkCount: active.links.length,
          links: active.links.map((l) => ({
            fromSite: l.from.siteId,
            fromRoom: l.from.roomId,
            toSite: l.to.siteId,
            toRoom: l.to.roomId,
            target: l.targetText,
            label: l.label,
            direction: l.direction || "out",
          })),
          inCount: active.links.filter((l) => l.direction === "in").length,
          outCount: active.links.filter((l) => l.direction !== "in").length,
          pathsManhattan: (active.paths || []).every((p) => p.manhattan),
          pathPointCounts: (active.paths || []).map((p) => p.pts.length),
          hoverLabel: hoverArr[0]?.link?.label || null,
          hoverCount: hoverArr.length,
        }
      : {
          linkCount: 0,
          links: [],
          inCount: 0,
          outCount: 0,
          pathsManhattan: true,
          pathPointCounts: [],
          hoverLabel: null,
          hoverCount: 0,
        };
  }

  return {
    graphics: gBase,
    graphicsPearls: gPearls,
    setFrom,
    clear,
    tick,
    getState,
    hitTest,
    hitTestAll,
    hoverAt,
    hideTip,
    clearHover,
    placeAutoTips,
    linksFrom,
    resolveTargetLocation,
    pathPointsStrict: (fromS, fromR, toS, toR) =>
      pathPointsStrict(scene, fromS, fromR, toS, toR),
    pathIsManhattan,
    getFrameStats() {
      return { fullRedraws, pearlOnlyFrames, baseDirty };
    },
    resetFrameStats() {
      fullRedraws = 0;
      pearlOnlyFrames = 0;
    },
    dispose() {
      clear();
      if (tipEl) {
        tipEl.remove();
        tipEl = null;
      }
      if (gBase.parent) gBase.parent.removeChild(gBase);
      if (gPearls.parent) gPearls.parent.removeChild(gPearls);
      gBase.destroy();
      gPearls.destroy();
    },
  };
}
