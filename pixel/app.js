/**
 * State of VD Pixel — runtime (carte pixel + Mode Parcours glass).
 * UX alignée sur state-of-vd (barre bas, drawer, fiche contextuelle).
 */
/* global PIXI */
import { applyNearest, MAP_W, MAP_H } from "./engine/pixel.js";
import { SoftCamera } from "./engine/camera.js";
import { buildPixelMap } from "./engine/map.js";
import { loadTiledMap } from "./engine/tiled.js";
import { installAmbient } from "./engine/ambient.js";
import { installTour } from "./game/tour.js";
import { installContextUi } from "./game/context-ui.js";
import { installFlowBridge } from "./game/flow-bridge.js";
import { installAriane } from "./game/ariane.js";
import { installStepBadges } from "./game/step-badges.js";
import { installConnections } from "./game/connections.js";
import { loadPathGraph } from "./engine/path-route.js";
import { sfx } from "./engine/sfx.js";

const reduced =
  typeof matchMedia !== "undefined" &&
  matchMedia("(prefers-reduced-motion: reduce)").matches;

function $(id) {
  return document.getElementById(id);
}

function toast(msg, ms = 2200) {
  const el = $("toast");
  if (!el) return;
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => {
    el.hidden = true;
  }, ms);
}

function installFullscreen(root) {
  const btn = $("sovd-fs");
  if (!btn) return;
  function isFs() {
    return (
      document.fullscreenElement === root ||
      root.classList.contains("is-fs-fake")
    );
  }
  function sync() {
    const on = isFs();
    btn.setAttribute("aria-pressed", on ? "true" : "false");
    btn.title = on ? "Quitter le plein écran" : "Plein écran";
  }
  btn.addEventListener("click", async () => {
    try {
      if (!isFs()) {
        if (root.requestFullscreen) await root.requestFullscreen();
        else root.classList.add("is-fs-fake");
      } else {
        if (document.fullscreenElement) await document.exitFullscreen();
        root.classList.remove("is-fs-fake");
      }
    } catch {
      root.classList.toggle("is-fs-fake");
    }
    sync();
    window.dispatchEvent(new Event("resize"));
  });
  document.addEventListener("fullscreenchange", sync);
  window.addEventListener("keydown", (e) => {
    if (e.key === "f" || e.key === "F") btn.click();
  });
  sync();
}

const ENTRY_GROUPS = [
  { id: "dpt", label: "Département", hint: "Instruction · saisine de projets" },
  { id: "ce", label: "Conseil d'État", hint: "Collège · Chancellerie · publication" },
  { id: "gc", label: "Grand Conseil", hint: "Instruments · délibération · contrôle" },
  { id: "citoyen", label: "Citoyen / tiers", hint: "Saisine hors État" },
];

function installScenarioPanel(tour) {
  const picker = $("sp-picker");
  const drawerBtn = $("sp-drawer-btn");
  const drawerStack = $("sp-drawer-stack");
  const drawerClose = $("sp-drawer-close");
  if (!picker) return;

  // Tip panel (info légale) — iso main drawer
  let tip = document.getElementById("sp-scen-tip");
  if (!tip && drawerStack) {
    tip = document.createElement("div");
    tip.id = "sp-scen-tip";
    tip.className = "sp-scen-tip";
    tip.hidden = true;
    tip.innerHTML = `
      <div class="sp-tip-title" id="sp-tip-title"></div>
      <p class="sp-tip-sum" id="sp-tip-sum"></p>
      <p class="sp-tip-cond"><span>Conditions</span> <span id="sp-tip-cond"></span></p>
      <p class="sp-tip-legal"><span>Source</span> <a id="sp-tip-legal" href="#" target="_blank" rel="noopener"></a></p>`;
    drawerStack.appendChild(tip);
  }

  function showTip(s) {
    if (!tip) return;
    tip.hidden = false;
    const t = tip.querySelector("#sp-tip-title");
    const sum = tip.querySelector("#sp-tip-sum");
    const cond = tip.querySelector("#sp-tip-cond");
    const legal = tip.querySelector("#sp-tip-legal");
    if (t) t.textContent = s.label;
    if (sum) sum.textContent = s.summary || "";
    if (cond) cond.textContent = s.conditions || "—";
    if (legal) {
      legal.textContent = s.legal || "—";
      legal.href = s.legalUrl || "#";
    }
  }
  function hideTip() {
    if (tip) tip.hidden = true;
  }

  function closeDrawer() {
    if (drawerStack) drawerStack.hidden = true;
    if (drawerBtn) drawerBtn.setAttribute("aria-expanded", "false");
    document.getElementById("sovd-root")?.classList.remove("sovd-drawer-open");
    hideTip();
  }
  function openDrawer() {
    if (drawerStack) drawerStack.hidden = false;
    if (drawerBtn) drawerBtn.setAttribute("aria-expanded", "true");
    document.getElementById("sovd-root")?.classList.add("sovd-drawer-open");
  }
  function toggleDrawer() {
    if (drawerStack?.hidden) openDrawer();
    else closeDrawer();
  }

  drawerBtn?.addEventListener("click", toggleDrawer);
  drawerClose?.addEventListener("click", closeDrawer);

  picker.innerHTML = "";
  const by = {};
  for (const s of tour.list) {
    (by[s.entry] ||= []).push(s);
  }
  for (const g of ENTRY_GROUPS) {
    const items = by[g.id];
    if (!items?.length) continue;
    const block = document.createElement("div");
    block.className = "sp-entry-group";
    block.innerHTML = `<div class="sp-entry-h"><span class="sp-entry-tag">${g.label}</span><span class="sp-entry-hint">${g.hint}</span></div>`;
    for (const s of items) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "sp-scen";
      b.dataset.id = s.id;
      b.innerHTML = `<span class="sp-scen-name">${s.label}<span class="sp-scen-meta">${s.short || ""} · ${s.steps.length} ét.</span></span><span class="sp-scen-steps">${s.steps.length}&nbsp;ét.</span>`;
      b.addEventListener("mouseenter", () => showTip(s));
      b.addEventListener("focus", () => showTip(s));
      b.addEventListener("click", () => {
        picker.querySelectorAll(".sp-scen").forEach((c) => {
          c.classList.toggle("is-active", c === b);
        });
        tour.start(s.id);
        // Iso main : Mode Parcours = walkthrough (step-card + Ariane), PAS le panneau
        // « Machine de flux » (FlowEngine / Agir) — réservé QA / hors parcours.
        window.__SOVD_PIXEL__?.flowBridge?.stop?.();
        closeDrawer();
        toast(`Parcours · ${s.short || s.label}`);
      });
      block.appendChild(b);
    }
    picker.appendChild(block);
  }

  $("sp-play")?.addEventListener("click", () => {
    if (tour.status === "pause") tour.resume();
    else if (tour.status === "done" && tour.scenario) tour.start(tour.scenario.id);
    else if (tour.status === "idle" || !tour.scenario) {
      openDrawer();
    } else tour.resume();
  });
  $("sp-pause")?.addEventListener("click", () => tour.pause());
  $("sp-stop")?.addEventListener("click", () => {
    tour.stop();
    window.__SOVD_PIXEL__?.flowBridge?.stop?.();
    window.__SOVD_PIXEL__?.connections?.clear?.();
    picker.querySelectorAll(".sp-scen").forEach((c) => c.classList.remove("is-active"));
  });

  const speedBtn = $("sp-speed");
  function paintSpeed(i) {
    if (!speedBtn) return;
    const idx = i ?? tour.getSpeedIndex();
    const steps = [0.6, 1, 1.6];
    const val = steps[idx] ?? 1;
    const lab = `×${String(val).replace(".", ",")}`;
    speedBtn.dataset.speedI = String(idx);
    speedBtn.title = `Vitesse ${lab}`;
    const labEl = speedBtn.querySelector(".sp-speed-lab");
    if (labEl) labEl.textContent = lab;
    speedBtn.querySelectorAll(".sp-speed-bars i").forEach((el, j) => {
      el.classList.toggle("on", j <= idx);
    });
  }
  speedBtn?.addEventListener("click", () => {
    const next = (tour.getSpeedIndex() + 1) % 3;
    const { label } = tour.setSpeedIndex(next);
    paintSpeed(next);
    toast(`Vitesse ${label}`);
  });
  paintSpeed();

  // Escape closes drawer / inspector
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeDrawer();
      const insp = $("inspector");
      if (insp) insp.hidden = true;
    }
  });
}

/**
 * Politique UI iso main (ui-mode) — dérivée de l'état tour + pin.
 * @param {{ status?: string, scenario?: object|null }} tour
 * @param {{ isPinned?: boolean, getState?: () => object }} contextUi
 */
function uiPolicy(tour, contextUi) {
  const st = tour?.status;
  const playing = st === "play" || st === "step";
  const paused = st === "pause";
  // PARCOURS_PLAYING
  if (playing) {
    return {
      allowsPin: false,
      allowsHoverFlow: false,
      showInstitutionInspector: false,
      silentInspector: true,
      lockBoard: true,
    };
  }
  // PARCOURS_PAUSED (carte / pause — récit = step-card)
  if (paused) {
    return {
      allowsPin: true,
      allowsHoverFlow: true,
      showInstitutionInspector: false,
      silentInspector: true,
      lockBoard: false,
    };
  }
  // PINNED
  if (contextUi?.isPinned || contextUi?.getState?.()?.pinned) {
    return {
      allowsPin: true,
      allowsHoverFlow: true,
      showInstitutionInspector: true,
      silentInspector: false,
      lockBoard: false,
    };
  }
  // EXPLORE
  return {
    allowsPin: true,
    allowsHoverFlow: false,
    showInstitutionInspector: true,
    silentInspector: false,
    lockBoard: false,
  };
}

function bindHotspots(markers, camera, contextUi, connections, getTour) {
  const legacy = $("inspector");
  if (legacy) legacy.hidden = true;
  // Tooltip noir #tip retiré : la fiche glass (showHover/pin) suffit.

  function pol() {
    return uiPolicy(getTour?.() || null, contextUi);
  }

  /**
   * Clic = pin (fiche enrichie + flux RBAC) — iso main pinFocus.
   */
  function openPlace(hs, opts = {}) {
    if (!hs) return;
    const p = pol();
    const fromParcours = !!opts.silentInspector;

    if (fromParcours || p.lockBoard) {
      connections?.clear?.();
      contextUi?.hide?.();
    } else if (p.silentInspector) {
      // pause parcours : flux OK, pas de modal institution
      connections?.showFor?.(hs);
      contextUi?.hide?.();
    } else {
      contextUi?.pin?.(hs);
      connections?.showFor?.(hs);
    }

    sfx.pin();
    camera.focusOn({
      x: hs.cx,
      y: hs.cy,
      scale: Math.max(camera.scale, hs.kind === "room" ? 2.8 : 2.2),
      ms: reduced ? 200 : 750,
    });
  }

  contextUi?.setOnFocusRoom((roomId) => {
    const m = markers[roomId];
    if (m?.__hs) openPlace(m.__hs);
  });

  document.getElementById("ctx-close")?.addEventListener("click", () => {
    connections?.clear?.();
  });

  for (const id of Object.keys(markers)) {
    const m = markers[id];
    const hs = m.__hs;
    m.on("pointerover", () => {
      m.__ring.visible = true;
      m.__ring.alpha = 0.85;
      const p = pol();
      if (!p.showInstitutionInspector) return;
      if (contextUi?.isPinned || contextUi?.getState?.()?.pinned) return;
      contextUi?.showHover?.(hs);
    });
    m.on("pointerout", () => {
      if (!m.__tourLock) m.__ring.visible = false;
      const p = pol();
      if (!p.showInstitutionInspector) return;
      if (contextUi?.isPinned || contextUi?.getState?.()?.pinned) return;
      contextUi?.scheduleHide?.();
    });
    m.on("pointertap", () => {
      const p = pol();
      if (p.lockBoard && !p.allowsPin) return;
      openPlace(hs);
    });
  }

  return { openPlace, uiPolicy: pol };
}

async function loadWorld() {
  const tiledUrl = new URL("./assets/map/world.json", import.meta.url).href;
  try {
    return await loadTiledMap(tiledUrl);
  } catch (e) {
    console.warn("[pixel] Tiled load failed, procedural fallback", e);
    const m = buildPixelMap();
    return {
      root: m.root,
      markers: m.markers,
      fxLayer: m.fxLayer,
      ambientLayer: m.ambientLayer,
      mapW: MAP_W,
      mapH: MAP_H,
      source: "procedural",
      applyLod: () => {},
    };
  }
}

async function main() {
  applyNearest();
  const host = $("game-host");
  const rootEl = $("sovd-root");
  if (!host || typeof PIXI === "undefined") {
    console.error("Pixi or host missing");
    return;
  }

  const app = new PIXI.Application({
    backgroundAlpha: 0,
    antialias: false,
    autoDensity: false,
    resolution: 1,
    resizeTo: host,
  });
  host.appendChild(app.view);
  app.view.style.imageRendering = "pixelated";

  const map = await loadWorld();
  app.stage.addChild(map.root);

  const ambient = installAmbient(map.ambientLayer);
  const camera = new SoftCamera(app, map.root);
  camera.setWorldSize(map.mapW || MAP_W, map.mapH || MAP_H);
  camera.bind();
  camera.fit();
  if (map.applyLod) map.applyLod(camera.scale, reduced);

  const lodChip = $("lod-chip");
  const lodLabel = $("lod-label");
  let lastLodMode = "";
  function syncLodChip(scale) {
    if (!lodChip || !lodLabel) return;
    let mode, text;
    if (scale < 1.65) {
      mode = "roofs";
      text = "Toits";
    } else if (scale > 2.45) {
      mode = "plans";
      text = "Plans";
    } else {
      mode = "blend";
      text = "Transition";
    }
    if (mode === lastLodMode) return;
    lastLodMode = mode;
    lodChip.classList.toggle("is-plans", mode === "plans");
    lodChip.classList.toggle("is-blend", mode === "blend");
    lodLabel.textContent = text;
  }
  syncLodChip(camera.scale);

  const contextUi = installContextUi({
    root: rootEl,
    camera,
    markers: map.markers,
    getScale: () => camera.scale,
  });

  // Path graph for RBAC connections (tour loads its own copy too)
  let pathGraph = null;
  loadPathGraph().then((g) => {
    pathGraph = g;
  });

  /** @type {ReturnType<typeof installTour>|null} */
  let tour = null;

  const connections = installConnections({
    fxLayer: map.fxLayer,
    markers: map.markers,
    getPathGraph: () => pathGraph || tour?.getPathGraph?.() || null,
    mount: rootEl,
  });

  const stepBadges = installStepBadges({
    mount: rootEl,
    camera,
    markers: map.markers,
  });

  // Ariane → hooks tour (goTo / preview / branches / fin)
  const ariane = installAriane({
    mount: rootEl,
    onSelect: (i) => tour?.goTo?.(i),
    onPreview: (i) => tour?.previewStep?.(i),
    onPreviewEnd: () => tour?.endPreview?.(),
    onAccept: () => tour?.acceptBranch?.(),
    onReject: () => tour?.rejectBranch?.(),
    onReplay: () => {
      const id = tour?.scenario?.id;
      if (id) tour.start(id);
    },
    onDismiss: () => {
      tour?.stop?.();
      connections.clear();
    },
  });

  const prevOnScale = camera.onScaleChange;
  camera.onScaleChange = (s) => {
    if (prevOnScale) prevOnScale(s);
    if (map.applyLod) map.applyLod(s, reduced);
    syncLodChip(s);
    contextUi.updateLabels();
    contextUi.reposition?.();
    stepBadges.update();
    tour?.repositionCard?.();
  };

  tour = installTour({
    camera,
    markers: map.markers,
    fxLayer: map.fxLayer,
    reduced,
    contextUi,
    ariane,
    stepBadges,
  });

  for (const m of Object.values(map.markers)) {
    Object.defineProperty(m, "__tourLock", {
      get() {
        return !!tour.scenario && tour.status !== "idle";
      },
    });
  }

  const flowBridge = installFlowBridge({
    mount: rootEl,
    toast,
    focusPlace: (siteId, roomId) => {
      const id = roomId || siteId;
      const m = map.markers[id] || map.markers[siteId];
      if (m?.__hs) {
        const p = uiPolicy(tour, contextUi);
        if (p.showInstitutionInspector) contextUi.pin?.(m.__hs);
        else contextUi.hide?.();
        if (!p.lockBoard) connections.showFor(m.__hs);
        else connections.clear();
        camera.focusOn({
          x: m.__hs.cx,
          y: m.__hs.cy,
          scale: Math.max(camera.scale, 2.4),
          ms: reduced ? 200 : 700,
        });
      }
    },
  });

  // Expose early so scenario panel can start flow machine
  window.__SOVD_PIXEL__ = {
    app,
    camera,
    map,
    tour,
    sfx,
    contextUi,
    flowBridge,
    connections,
    ariane,
    stepBadges,
  };

  installScenarioPanel(tour);
  bindHotspots(map.markers, camera, contextUi, connections, () => tour);
  installFullscreen(rootEl);
  contextUi.updateLabels();

  // Hover flux RBAC (tip + highlight) quand pin — iso main app.js pointermove
  const canvasEl = app.view;
  canvasEl.addEventListener("pointermove", (e) => {
    if (camera._drag) {
      connections.clearHover?.();
      return;
    }
    const p = uiPolicy(tour, contextUi);
    if (p.lockBoard) {
      connections.clearHover?.();
      return;
    }
    if (!connections.active || !p.allowsHoverFlow) {
      // en EXPLORE sans pin : pas de tip flux
      if (!contextUi?.isPinned && !contextUi?.getState?.()?.pinned) {
        connections.clearHover?.();
      }
      return;
    }
    if (!(contextUi?.isPinned || contextUi?.getState?.()?.pinned)) {
      connections.clearHover?.();
      return;
    }
    const rect = canvasEl.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const wx = (sx - camera.x) / camera.scale;
    const wy = (sy - camera.y) / camera.scale;
    const thr = Math.max(8, 14 / Math.max(0.4, camera.scale));
    const hit = connections.hoverAt?.(wx, wy, e.clientX, e.clientY, thr);
    if (!hit) connections.clearHover?.();
  });
  canvasEl.addEventListener("pointerleave", () => {
    connections.clearHover?.();
  });

  // Esc / close : fiche + flux RBAC
  const origCtxClose = contextUi.close.bind(contextUi);
  contextUi.close = () => {
    origCtxClose();
    connections.clear();
  };
  const origHide = contextUi.hide?.bind(contextUi);
  if (origHide) {
    contextUi.hide = () => {
      origHide();
      // ne clear les flux que si unpin explicite via close — hide hover ne touche pas
    };
  }

  window.addEventListener("resize", () => {
    const w = host.clientWidth;
    const h = host.clientHeight;
    if (w > 0 && h > 0) app.renderer.resize(w, h);
    camera.resize();
    if (map.applyLod) map.applyLod(camera.scale, reduced);
    contextUi.updateLabels();
    contextUi.reposition?.();
    tour.repositionCard?.();
    stepBadges.update();
  });

  const boot = $("boot");
  await new Promise((r) => setTimeout(r, reduced ? 200 : 600));
  camera.introFly(reduced ? 400 : 1600);
  await new Promise((r) => setTimeout(r, reduced ? 250 : 850));
  if (boot) boot.classList.add("is-done");
  const bootHint = $("boot-hint");
  if (bootHint) bootHint.hidden = true;
  toast(
    map.source === "kenney-composed"
      ? `${tour.list.length} parcours · Ariane · RBAC · Agir`
      : "Mode procédural (fallback)",
    3600
  );
  if (map.credit) console.info(map.credit);

  let last = performance.now();
  let lodT = 0;
  let labelT = 0;
  app.ticker.add(() => {
    const now = performance.now();
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    camera.tick(now);
    ambient.tick(dt, reduced);
    tour.tick(now, dt);
    flowBridge.tick(dt);
    connections.tick(now, reduced);
    lodT += dt;
    labelT += dt;
    if (lodT > 0.05 && map.applyLod) {
      lodT = 0;
      map.applyLod(camera.scale, reduced);
      syncLodChip(camera.scale);
    }
    // labels follow camera (pan/zoom)
    if (labelT > 0.04) {
      labelT = 0;
      contextUi.updateLabels();
      contextUi.reposition?.();
      tour.repositionCard?.();
      stepBadges.update();
    }
  });

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      contextUi.close();
      connections.clear();
    }
  });

  // Stop parcours → clear badges/ariane already in tour; clear RBAC lines
  const stopBtn = $("sp-stop");
  stopBtn?.addEventListener("click", () => connections.clear());

  window.__SOVD_PIXEL__ = {
    app,
    camera,
    map,
    tour,
    sfx,
    contextUi,
    flowBridge,
    connections,
    ariane,
    stepBadges,
  };
}

main().catch((e) => {
  console.error(e);
  const boot = $("boot");
  const sub = boot?.querySelector(".boot__sub");
  if (sub) sub.textContent = "Erreur de chargement — voir console";
});
