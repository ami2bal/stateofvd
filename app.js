/**
 * State of VD — 2D pixel-art shell (GDD v4 LOD always-open).
 */
/* global PIXI */
import { Camera, ZOOMS } from "./engine/camera.js";
import { Clock } from "./engine/clock.js";
import { Scheduler } from "./engine/scheduler.js";
import { installQA, writeQaOut } from "./engine/qa.js";
import { footXY } from "./engine/render2d.js";
import { applySmoothGlobal, RAMPS, tileTexture } from "./engine/shapes.js";
import {
  tickRoomIcons,
  setRoomIconHover,
} from "./engine/room-icons.js";
import { ambientSnapshot } from "./game/ambient.js";
import { applyLod, tickLodFade, lodSnapshot, lodForScale } from "./engine/lod.js";
import { installScreenLabels } from "./engine/screenLabels.js";
import { buildWorld, updatePatrols, mulberry32 } from "./game/world.js";
import { installDemo } from "./game/demo.js";
import { installInterior } from "./game/interior.js";
import { FlowEngine } from "./game/flow-engine.js";
import { PETIT_CREDIT } from "./game/flows/petit-credit.js";
import { CREDIT_QUI_FACHE } from "./game/flows/credit-qui-fache.js";
import { installFlowUi } from "./game/flow-ui.js";
import { installInspector } from "./game/inspector.js";
import { installHoverOverlay } from "./game/hover-overlay.js";
import { installConnections } from "./game/connections.js";
import { installWalkthrough } from "./game/walkthrough.js";
import { installScenarioPanel } from "./game/scenario-panel.js";
import { installScenarioPreview } from "./game/scenario-preview.js";
import { deriveUiMode, modePolicy, UIMode } from "./game/ui-mode.js";
import { runScenario } from "./game/qa-scenarios.js";

/** World data — local: fetch ; embed iframe : `window.__SOVD_WORLD__` injecté. */
async function loadWorld() {
  if (typeof window !== "undefined" && window.__SOVD_WORLD__) {
    return window.__SOVD_WORLD__;
  }
  const DATA_URL = new URL("./data/world.json", import.meta.url);
  const r = await fetch(DATA_URL);
  if (!r.ok) throw new Error("world.json missing — run tools/build_data.py");
  return r.json();
}

/** Profil Vaud — local: fetch ; embed iframe : `window.__SOVD_PROFILE__`. */
async function loadProfile() {
  if (typeof window !== "undefined" && window.__SOVD_PROFILE__) {
    return window.__SOVD_PROFILE__;
  }
  const r = await fetch(new URL("./model/profiles/vaud.json", import.meta.url));
  if (!r.ok) throw new Error("vaud.json missing");
  return r.json();
}

/**
 * TASK-097 K13: legacy #hud clock/speeds removed.
 * Clock engine remains; no DOM binding for the old top-left panel.
 */
function bindHud(clock) {
  return () => {
    /* no-op — Mode Parcours owns transport UI */
  };
}

/**
 * Bouton ⛶ #sovd-fs — plein écran sur #sovd-root (fonctionne sous un hôte iframe).
 * Fallback classe .is-fs-fake si l'API Fullscreen est bloquée (iframe sans allow).
 */
function installFullscreenChrome(app, hostEl) {
  const root =
    document.getElementById("sovd-root") ||
    document.documentElement;
  const btn = document.getElementById("sovd-fs");
  if (!btn) return;

  function isFs() {
    const fsEl =
      document.fullscreenElement || document.webkitFullscreenElement;
    return fsEl === root || root.classList.contains("is-fs-fake");
  }

  function syncBtn() {
    const on = isFs();
    btn.setAttribute("aria-pressed", on ? "true" : "false");
    btn.title = on ? "Quitter le plein écran" : "Plein écran";
    btn.setAttribute("aria-label", btn.title);
  }

  function resizeAfterFs() {
    requestAnimationFrame(() => {
      const w = hostEl.clientWidth || window.innerWidth;
      const h = hostEl.clientHeight || window.innerHeight;
      if (w > 0 && h > 0 && app?.renderer) {
        app.renderer.resize(w, h);
      }
      // re-cadrage au ratio fenêtre ↔ plein écran
      if (app?.stage && window.__SOVD__?.camera) {
        window.__SOVD__.camera.resize();
      } else {
        window.dispatchEvent(new Event("resize"));
      }
    });
  }

  function toggle() {
    if (isFs()) {
      const exit = document.exitFullscreen || document.webkitExitFullscreen;
      if (document.fullscreenElement || document.webkitFullscreenElement) {
        if (exit) exit.call(document);
      }
      root.classList.remove("is-fs-fake");
    } else {
      const req = root.requestFullscreen || root.webkitRequestFullscreen;
      if (req) {
        Promise.resolve(req.call(root)).catch(() => {
          // API refusée (souvent iframe hôte sans allow) → faux plein cadre CSS
          root.classList.add("is-fs-fake");
          syncBtn();
          resizeAfterFs();
        });
      } else {
        root.classList.add("is-fs-fake");
      }
    }
    syncBtn();
    resizeAfterFs();
  }

  btn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggle();
  });
  document.addEventListener("fullscreenchange", () => {
    if (!document.fullscreenElement) root.classList.remove("is-fs-fake");
    syncBtn();
    resizeAfterFs();
  });
  document.addEventListener("webkitfullscreenchange", () => {
    if (!document.webkitFullscreenElement) root.classList.remove("is-fs-fake");
    syncBtn();
    resizeAfterFs();
  });
  syncBtn();
}

function installRefit(app, camera) {
  const host = document.getElementById("game-host") || document.body;
  let _lastKey = "";
  const ro = new ResizeObserver(() => {
    const w = host.clientWidth || window.innerWidth;
    const h = host.clientHeight || window.innerHeight;
    if (w <= 0 || h <= 0) return;
    const key = `${w}|${h}`;
    if (key === _lastKey) return;
    _lastKey = key;
    app.renderer.resolution = 1;
    app.renderer.resize(w, h);
    // Re-cadrage institutions-first (évite letterbox ciel/lac en fenêtre)
    if (camera._world) {
      const prevFit = camera.fitScale || 1;
      const prevMin = camera.minScale || prevFit;
      const prevScale = camera.scale;
      // plein dézoom (≤ ~min) : y rester après resize — ne pas remonter au fit
      const wasFullOut = prevScale <= prevMin * 1.04;
      const mid = camera.viewCenterWorld?.() || null;
      const zoomRatio = prevScale / Math.max(1e-6, prevFit);
      camera.frameFitView(camera._world, camera._siteViews || null);
      if (wasFullOut) {
        camera.setScale(camera.minScale);
        if (mid) camera.centerOn(mid.x, mid.y);
      } else if (zoomRatio > 1.05) {
        camera.setScale(camera.fitScale * zoomRatio);
        if (mid) camera.centerOn(mid.x, mid.y);
      }
    } else {
      camera.apply();
    }
  });
  ro.observe(host);
  window.addEventListener("resize", () => camera.resize());
  return ro;
}

/** Force vue d'ensemble (minScale) centrée — boot + filet post-resize. */
function applyFullZoomOut(camera) {
  if (!camera) return;
  const mid = camera.viewCenterWorld?.() || null;
  const minS = camera.minScale ?? camera.fitScale ?? camera.scale;
  camera.setScale(minS);
  if (mid) camera.centerOn(mid.x, mid.y);
  else camera.clampPan?.();
  camera.apply?.();
}

export async function boot(opts) {
  opts = opts || {};
  applySmoothGlobal();
  const canvas = document.getElementById("game");
  if (!canvas) throw new Error("#game canvas missing");
  if (typeof PIXI === "undefined") throw new Error("PIXI not loaded");

  const world = await loadWorld();
  // Host = #game-host (local plein écran OU embed iframe à hauteur fixe)
  const hostEl = document.getElementById("game-host") || document.body;
  const app = new PIXI.Application({
    view: canvas,
    background: 0xdceaf3,
    antialias: true,
    autoDensity: false,
    resolution: 1,
    resizeTo: hostEl,
  });
  applySmoothGlobal();

  // ── Plein écran (iframe + local) : cible #sovd-root ──
  installFullscreenChrome(app, hostEl);

  const root = new PIXI.Container();
  app.stage.addChild(root);

  const scene = buildWorld(world, root);
  const clock = new Clock({ speed: opts.speed != null ? opts.speed : 0 });
  const scheduler = new Scheduler();
  const camera = new Camera(app, root);
  camera.bind();
  installRefit(app, camera);

  const hudRefresh = bindHud(clock);
  const demo = installDemo({ scene, scheduler, clock });
  const interior = installInterior({ scene });
  scene.interior = interior;

  // Flow engine (logic) + Mode Parcours (presentation TASK-097)
  let flowEngine = null;
  let flowUi = null;
  let walkthrough = null;
  let scenarioPanel = null;
  const flowHud = document.getElementById("flow-hud");
  async function startPetitCredit() {
    const profile = await loadProfile();
    flowEngine = new FlowEngine({
      profile,
      clock,
      scenario: PETIT_CREDIT,
    });
    flowEngine.start();
    // Keep installFlowUi available for QA engine tests; UI replaced by Parcours
    if (flowHud && !walkthrough) {
      // placeholder until walkthrough wired after camera/focus
    }
    return flowEngine;
  }
  startPetitCredit().catch((e) => console.error("flow boot", e));

  function onLod(scale, instant) {
    applyLod(scene, scale, { instant: !!instant });
    scene.labels.update(scale);
    if (scene.screenLabels) scene.screenLabels.update();
  }
  camera.onScaleChange = (s) => onLod(s, false);
  // Fit-to-view atelier (D-013) + hard bounds (092)
  // Boot = full zoom-out (minScale) pour vue d'ensemble immédiate
  camera.setWorld(world);
  camera.frameFitView(world, scene.siteViews);
  applyFullZoomOut(camera);
  scene.camera = camera;
  scene.__fitScale = camera.fitScale;
  onLod(camera.scale, true);

  // Filet : le 1er ResizeObserver peut re-cadrer après le boot — re-forcer minScale
  requestAnimationFrame(() => {
    applyFullZoomOut(camera);
    onLod(camera.scale, true);
    if (scene.screenLabels) scene.screenLabels.update({ force: true });
    // 2e passe après layout host (iframe embed / FS)
    requestAnimationFrame(() => {
      applyFullZoomOut(camera);
      onLod(camera.scale, true);
      if (scene.screenLabels) scene.screenLabels.update({ force: true });
    });
  });

  // Crisp screen-space labels (TASK-092 K1)
  const screenLabels = installScreenLabels({ app, camera, scene });
  scene.screenLabels = screenLabels;
  screenLabels.update();

  // TASK-095: hover focus + pin (replaces center-proximity focus)
  const NULL_FOCUS = {
    kind: null,
    siteId: null,
    roomId: null,
    screenRect: null,
    pinned: false,
  };
  let hoverFocus = { ...NULL_FOCUS };
  let pinnedFocus = null;
  let lastFocusKey = "";
  const hoverOverlay = installHoverOverlay({ scene });
  scene.hoverOverlay = hoverOverlay;
  const connections = installConnections({ scene });
  scene.connections = connections;

  function focusPayload(siteId, roomId, pinned) {
    const entry = scene.siteViews[siteId];
    if (!entry?.view) return { ...NULL_FOCUS };
    const v = entry.view;
    const def = entry.def;
    const sc = camera.scale;
    // building rect in canvas space
    let rx = camera.x + v.x * sc;
    let ry = camera.y + v.y * sc;
    let rw = (v.__w || 0) * sc;
    let rh = (v.__h || 0) * sc;
    // room-level focale: tighter rect for contextual panel placement
    if (roomId && v.__roomDoors?.length) {
      const rd = v.__roomDoors.find((d) => d.roomId === roomId);
      if (rd?.rect) {
        const ly = v.__roomsLayer?.y || 0;
        const lx = v.__roomsLayer?.x || 0;
        rx = camera.x + (v.x + lx + rd.rect.x) * sc;
        ry = camera.y + (v.y + ly + rd.rect.y) * sc;
        rw = rd.rect.w * sc;
        rh = rd.rect.h * sc;
      }
    }
    return {
      kind: roomId ? "room" : "building",
      siteId,
      roomId: roomId || null,
      screenRect: { x: rx, y: ry, w: rw, h: rh },
      displayName: def?.displayName || siteId,
      pinned: !!pinned,
    };
  }

  function emitFocus(f) {
    const key = `${f.kind}|${f.siteId}|${f.roomId}|${f.pinned ? 1 : 0}`;
    if (key === lastFocusKey) return;
    lastFocusKey = key;
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("sovd:focuschange", { detail: f }));
    }
  }

  function getFocused() {
    // always recompute screenRect (live camera / focale)
    if (pinnedFocus && pinnedFocus.siteId) {
      return focusPayload(pinnedFocus.siteId, pinnedFocus.roomId, true);
    }
    if (hoverFocus && hoverFocus.siteId) {
      return focusPayload(hoverFocus.siteId, hoverFocus.roomId, false);
    }
    return { ...NULL_FOCUS };
  }

  /** Assigned after installInspector — optional-chained until then. */
  let inspector = null;

  /** TASK-113: single policy from UI mode enum. */
  function currentUiPolicy() {
    const st = walkthrough?.getState?.() || {};
    const mode = deriveUiMode({
      playing: st.playing,
      cardOpen: st.cardOpen,
      dossierFollowing: st.dossierFollowing,
      pinned: !!pinnedFocus?.siteId,
    });
    return { mode, ...modePolicy(mode) };
  }

  function parcoursBlocksInspector() {
    return !currentUiPolicy().showInstitutionInspector;
  }

  function parcoursLocksBoard() {
    return !!currentUiPolicy().lockBoard;
  }

  function syncParcoursBoardLock() {
    const pol = currentUiPolicy();
    const locked = pol.lockBoard;
    // État UI sur #sovd-root uniquement — ne jamais peindre/reflow le body hôte
    const shell =
      document.getElementById("sovd-root") ||
      document.querySelector(".sovd-root") ||
      document.body;
    shell.classList.toggle("sovd-parcours-playing", locked);
    shell.dataset.sovdMode = pol.mode;
    if (shell !== document.body) {
      document.body.classList.remove("sovd-parcours-playing");
      delete document.body.dataset.sovdMode;
    }
    if (app?.view) {
      app.view.style.cursor = locked ? "default" : "";
      app.view.title = locked
        ? "Lecture en cours — Pause pour explorer le plan"
        : "";
    }
    if (locked) {
      connections?.clear?.();
    }
  }

  function setHoverFocus(siteId, roomId) {
    if (!siteId) {
      hoverFocus = { ...NULL_FOCUS };
      setRoomIconHover(scene, null, null, false);
      walkthrough?.syncHoverFromMap?.(null, null);
      if (!pinnedFocus) {
        hoverOverlay.clear();
        inspector?.scheduleHide?.();
        emitFocus(NULL_FOCUS);
      }
      return;
    }
    hoverFocus = focusPayload(siteId, roomId, false);
    // semantic room icon animation (typing, gavel, stamp…)
    setRoomIconHover(scene, siteId, roomId, !!roomId);
    // fil d'Ariane haut ↔ hover carte (bidirectionnel)
    walkthrough?.syncHoverFromMap?.(siteId, roomId);
    const v = scene.siteViews[siteId]?.view;
    const def = scene.siteViews[siteId]?.def;
    if (!pinnedFocus) {
      hoverOverlay.setTarget({ siteId, roomId, view: v, def }, { mode: "hover" });
      if (parcoursBlocksInspector()) {
        inspector?.hide?.();
      } else {
        inspector?.showHover?.(hoverFocus);
      }
      emitFocus(hoverFocus);
    }
  }

  /**
   * @param {string|null} siteId
   * @param {string|null} [roomId]
   * @param {{ silentInspector?: boolean }} [opts]
   */
  function pinFocus(siteId, roomId, opts = {}) {
    // silent = pin narratif parcours (pas de flux). Lecture = aussi sans flux.
    // Pause + clic utilisateur = flux OK même si la carte d'étape est encore ouverte.
    const fromParcours = !!opts.silentInspector;
    const pol = currentUiPolicy();
    const playing = pol.mode === UIMode.PARCOURS_PLAYING;
    const hideModal =
      fromParcours || pol.silentInspector || !pol.showInstitutionInspector;
    if (!siteId) {
      pinnedFocus = null;
      connections.clear();
      inspector?.unpin?.();
      if (hoverFocus.siteId) {
        const v = scene.siteViews[hoverFocus.siteId]?.view;
        const def = scene.siteViews[hoverFocus.siteId]?.def;
        hoverOverlay.setTarget(
          { siteId: hoverFocus.siteId, roomId: hoverFocus.roomId, view: v, def },
          { mode: "hover" }
        );
        if (!hideModal) {
          inspector?.showHover?.(hoverFocus);
        } else {
          inspector?.hide?.();
        }
        emitFocus(hoverFocus);
      } else {
        hoverOverlay.clear();
        emitFocus(NULL_FOCUS);
      }
      return;
    }
    pinnedFocus = focusPayload(siteId, roomId, true);
    hoverFocus = { ...pinnedFocus, pinned: false };
    const v = scene.siteViews[siteId]?.view;
    const def = scene.siteViews[siteId]?.def;
    hoverOverlay.setTarget({ siteId, roomId, view: v, def }, { mode: "select" });
    if (fromParcours || playing) {
      // narratif : zéro liens entre bureaux
      connections.clear();
      inspector?.hide?.();
      emitFocus({ ...pinnedFocus, silentInspector: true });
    } else {
      // exploration manuelle : flux colorés, tips au hover
      connections.setFrom(siteId, roomId);
      if (hideModal) {
        inspector?.hide?.();
        emitFocus({ ...pinnedFocus, silentInspector: true });
      } else {
        inspector?.pin?.(pinnedFocus);
        emitFocus(pinnedFocus);
      }
    }
  }

  /**
   * Hit-test building then room by full room rect (local roomsLayer space).
   * ★ Fix: previous logic used distance-to-door (~28px) → lateral approach
   * missed the room even when the cursor was clearly over the crépi fill.
   */
  function hitTestWorld(wx, wy) {
    // top-most by footprint baseline (higher y first)
    const ids = Object.keys(scene.siteViews).sort((a, b) => {
      const va = scene.siteViews[a].view;
      const vb = scene.siteViews[b].view;
      return (vb?.y || 0) + (vb?.__h || 0) - ((va?.y || 0) + (va?.__h || 0));
    });
    for (const id of ids) {
      const { view: v, def } = scene.siteViews[id];
      if (!v) continue;
      const w = v.__w || 0;
      const h = v.__h || 0;
      if (wx < v.x || wy < v.y || wx > v.x + w || wy > v.y + h) continue;

      let roomId = null;
      const doors = v.__roomDoors || [];
      if (doors.length) {
        // local coords in roomsLayer
        const lx = wx - v.x - (v.__roomsLayer?.x || 0);
        const ly = wy - v.y - (v.__roomsLayer?.y || 0);
        let best = null;
        let bestArea = Infinity;
        let bestD = Infinity;
        for (const rd of doors) {
          const r = rd.rect;
          if (!r) continue;
          // full room emprise (TASK-108 plein-cadre)
          if (
            lx >= r.x &&
            ly >= r.y &&
            lx <= r.x + r.w &&
            ly <= r.y + r.h
          ) {
            const area = r.w * r.h;
            const cx = r.x + r.w / 2;
            const cy = r.y + r.h / 2;
            const d = (cx - lx) ** 2 + (cy - ly) ** 2;
            // prefer smaller room if overlap, else closer center
            if (
              area < bestArea - 0.5 ||
              (Math.abs(area - bestArea) < 0.5 && d < bestD)
            ) {
              bestArea = area;
              bestD = d;
              best = rd.roomId;
            }
          }
        }
        // fallback: nearest room center within half-diagonal (edge cases / gaps)
        if (!best) {
          for (const rd of doors) {
            const r = rd.rect;
            if (!r) {
              // legacy door-only
              const cx = rd.x;
              const cy = rd.y;
              const d = (cx - lx) ** 2 + (cy - ly) ** 2;
              if (d < bestD && d < 40 * 40) {
                bestD = d;
                best = rd.roomId;
              }
              continue;
            }
            const cx = r.x + r.w / 2;
            const cy = r.y + r.h / 2;
            const rad = Math.hypot(r.w, r.h) * 0.55;
            const d = Math.hypot(cx - lx, cy - ly);
            if (d < bestD && d <= rad) {
              bestD = d;
              best = rd.roomId;
            }
          }
        }
        roomId = best;
      }
      return { siteId: id, roomId, def, view: v };
    }
    return null;
  }

  function screenToWorld(clientX, clientY) {
    const view = app.view;
    const rect = view.getBoundingClientRect();
    const sx = clientX - rect.left;
    const sy = clientY - rect.top;
    return {
      wx: (sx - camera.x) / camera.scale,
      wy: (sy - camera.y) / camera.scale,
      sx,
      sy,
    };
  }

  // Pointer hover + click pin on canvas (all sites)
  let ptrDown = null;
  const canvasEl = app.view;
  canvasEl.addEventListener("pointermove", (e) => {
    if (camera._dragging) return;
    // Lecture scénario : pas d'interaction plan (pan caméra OK via camera)
    if (parcoursLocksBoard()) {
      connections?.clearHover?.();
      return;
    }
    const { wx, wy, sx, sy } = screenToWorld(e.clientX, e.clientY);
    // scale-aware threshold: ~10–14 screen px in world units
    const flowThresh = Math.max(8, 12 / Math.max(0.4, camera.scale));
    // Pin salle : hover flux → tip + highlight (si policy allows)
    if (pinnedFocus && connections?.hoverAt && currentUiPolicy().allowsHoverFlow) {
      const flowHit = connections.hoverAt(wx, wy, e.clientX, e.clientY, flowThresh);
      if (flowHit) return;
      connections.clearHover?.();
    }
    const hit = hitTestWorld(wx, wy);
    if (hit) setHoverFocus(hit.siteId, hit.roomId);
    else setHoverFocus(null);
  });
  canvasEl.addEventListener("pointerleave", () => {
    if (!pinnedFocus) setHoverFocus(null);
    connections?.clearHover?.();
  });
  canvasEl.addEventListener("pointerdown", (e) => {
    ptrDown = { x: e.clientX, y: e.clientY, t: performance.now() };
  });
  canvasEl.addEventListener("pointerup", (e) => {
    if (!ptrDown) return;
    const dx = e.clientX - ptrDown.x;
    const dy = e.clientY - ptrDown.y;
    const dt = performance.now() - ptrDown.t;
    ptrDown = null;
    if (dx * dx + dy * dy > 36 || dt > 500) return; // pan / long
    // Lecture en cours → bloquer le pin (pause / fin pour explorer)
    if (parcoursLocksBoard()) return;
    const { wx, wy } = screenToWorld(e.clientX, e.clientY);
    const hit = hitTestWorld(wx, wy);
    if (hit) pinFocus(hit.siteId, hit.roomId);
    else pinFocus(null);
  });

  // Contextual inspector (TASK-091 content + TASK-095 hover/pin glass)
  inspector = installInspector({
    getFocused: () => getFocused(),
  });

  // TASK-097 Mode Parcours (left panel) — presentation over flow steps
  walkthrough = installWalkthrough({
    camera,
    scene,
    onLod: (s, instant) => onLod(s, instant),
    // Parcours: focus spatial + flux, sans modale institution (card parcours suffit)
    pinInspector: (siteId, roomId) =>
      pinFocus(siteId, roomId, { silentInspector: true }),
    // fil d'Ariane hover → même feel qu'un mousehover salle
    onHoverFocus: (siteId, roomId) => {
      if (siteId) setHoverFocus(siteId, roomId);
      else if (!pinnedFocus) setHoverFocus(null);
    },
  });
  const scenarioPreview = installScenarioPreview({
    scene,
    camera,
    onLod: (s, instant) => onLod(s, instant),
  });
  if (flowHud) {
    scenarioPanel = installScenarioPanel({
      root: flowHud,
      walkthrough,
      scenarioPreview,
      setHoverFocus: (siteId, roomId) => {
        if (siteId) setHoverFocus(siteId, roomId);
        else if (!pinnedFocus) setHoverFocus(null);
      },
      // drawer ouvert = mode choix : rien de sélectionné sur le plan
      onDrawerOpen: () => {
        pinFocus(null);
        setHoverFocus(null);
        connections?.clear?.();
        inspector?.hide?.();
      },
    });
  }
  // lock plan pendant lecture ; débloquer en pause / fin
  const _wtOnChange = walkthrough.onChange;
  walkthrough.onChange = (st) => {
    syncParcoursBoardLock();
    if (typeof _wtOnChange === "function") _wtOnChange(st);
  };
  scene.walkthrough = walkthrough;
  syncParcoursBoardLock();

  // dirty-flag: reposition inspector only when camera/focale changes (perf)
  let _inspCamKey = "";
  function tickFocus() {
    if (parcoursBlocksInspector()) {
      // ensure modal stays closed during parcours
      if (inspector?.getState?.()?.visible) inspector.hide();
      return;
    }
    if (!inspector?.reposition) return;
    if (!(pinnedFocus?.siteId || hoverFocus?.siteId)) return;
    const key = `${camera.x.toFixed(1)}|${camera.y.toFixed(1)}|${camera.scale.toFixed(3)}|${pinnedFocus?.siteId || ""}|${pinnedFocus?.roomId || ""}|${hoverFocus?.siteId || ""}|${hoverFocus?.roomId || ""}`;
    if (key === _inspCamKey) return;
    _inspCamKey = key;
    inspector.reposition(getFocused());
  }

  for (const ev of world.qaFixture || []) {
    scheduler.at(ev.at, () => {}, ev.tag);
  }

  let fps = 0;
  let fpsAcc = 0;
  let fpsT = 0;
  let last = performance.now();
  let waterFrame = 0;

  function spawnStress(n, seed) {
    const rnd = mulberry32(seed);
    scene.tilemap.entities.sortableChildren = false;
    scene.tilemap.buildingsLayer.sortableChildren = false;
    scene.labels.layer.visible = false;
    const base = scene.entities.count;
    for (let i = base; i < n; i++) {
      const gx = 10 + Math.floor(rnd() * 40);
      const gy = 24 + Math.floor(rnd() * 20);
      const e = scene.entities.spawnUsher("stress-" + i, gx, gy, 0, true);
      e.speed = 1.5 + rnd() * 2;
      e._route = [
        { gx, gy },
        { gx: Math.min(50, gx + 2 + Math.floor(rnd() * 4)), gy },
        { gx, gy: Math.min(50, gy + 2 + Math.floor(rnd() * 3)) },
      ];
      e._routeI = 0;
      scene.huissiers.push(e);
    }
  }

  if (opts.stress) spawnStress(opts.stress, 0xc0ffee);

  function pixelCheck() {
    // D-012: pixelCheck retired — report smooth mode instead
    return {
      scenario: "pixel-check",
      retired: true,
      nearest: PIXI.settings.SCALE_MODE === PIXI.SCALE_MODES.NEAREST,
      linear: PIXI.settings.SCALE_MODE === PIXI.SCALE_MODES.LINEAR,
      antialias: !!app.renderer?.options?.antialias || true,
      positionsInteger: true,
      aaDetected: false,
      scale: camera.scale,
    };
  }

  const qa = installQA({
    getFps: () => fps,
    getEntityCount: () => scene.entities.count,
    getVisibleTiles: () => scene.tilemap.visibleTiles,
    getSimTime: () => clock.simTime,
    renderOnce: () => {
      scene.labels.update(camera.scale);
      scene.tilemap.cull(camera, app.renderer.width, app.renderer.height);
      app.renderer.render(app.stage);
    },
    runScenario: async (name) =>
      runScenario(name, {
        world,
        clock,
        scheduler,
        scene,
        camera,
        app,
        demo,
        interior,
        qa,
        spawnStress,
        pixelCheck,
      }),
  });
  qa.labels = () => scene.labels.labels();
  qa.pixelCheck = pixelCheck;
  qa.lodSnapshot = () => lodSnapshot(scene);

  let frameN = 0;
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const t0 = performance.now();
    frameN++;

    const dMin = clock.tick(dt);
    scheduler.tick(clock.simTime);
    scene.entities.update(dMin);
    updatePatrols(scene);
    demo.tickSync(dt);
    scene.tickCosmetics(dt);
    tickLodFade(scene, now);
    scene.labels.update(camera.scale);
    scene.tilemap.cull(camera, app.renderer.width, app.renderer.height);
    waterFrame += dt * 2;
    scene.tilemap.tickWater(waterFrame);
    if (scene.screenLabels) scene.screenLabels.update();
    tickFocus();
    if (walkthrough) walkthrough.tick(dt);
    if (connections) connections.tick(dt);
    tickRoomIcons(scene, now / 1000);

    // TASK-110 frame stats (dev)
    if (frameN % 60 === 0 && window.__SOVD__) {
      const sl = scene.screenLabels?.getStats?.();
      const cs = connections?.getFrameStats?.();
      window.__SOVD__.frameStats = {
        labelsSkipped: sl?.skipCount ?? 0,
        labelsUpdated: sl?.updateCount ?? 0,
        connFullRedraws: cs?.fullRedraws ?? 0,
        connPearlFrames: cs?.pearlOnlyFrames ?? 0,
      };
    }

    qa.recordTick(performance.now() - t0);
    fpsAcc++;
    fpsT += dt;
    if (fpsT >= 1) {
      fps = fpsAcc;
      fpsAcc = 0;
      fpsT = 0;
      hudRefresh();
    }
  }

  app.ticker.add(() => frame(performance.now()));
  hudRefresh();
  scene.labels.update(camera.scale);

  window.__SOVD__ = {
    app,
    scene,
    clock,
    scheduler,
    camera,
    demo,
    interior,
    world,
    qa,
    inspector,
    getFocused,
    setHoverFocus,
    pinFocus,
    hoverOverlay,
    connections,
    walkthrough,
    scenarioPanel,
    get flow() {
      return flowEngine;
    },
    startPetitCredit,
  };
  return {
    app,
    scene,
    clock,
    scheduler,
    camera,
    demo,
    interior,
    world,
    qa,
    inspector,
    getFocused,
    setHoverFocus,
    pinFocus,
    hoverOverlay,
    connections,
    walkthrough,
    scenarioPanel,
    get flow() {
      return flowEngine;
    },
    startPetitCredit,
  };
}


if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", () => {
    const mode = document.body.dataset.mode || "game";
    if (mode !== "game" && mode !== "perf") return;
    boot({ speed: 0 }).catch((e) => {
      console.error("BOOT ERROR:", e);
    });
  });
}
