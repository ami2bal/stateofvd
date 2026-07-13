/**
 * State of VD Pixel — M0–M5 runtime (asset-driven + LOD + tour + SFX).
 */
/* global PIXI */
import { applyNearest, MAP_W, MAP_H } from "./engine/pixel.js";
import { SoftCamera } from "./engine/camera.js";
import { buildPixelMap } from "./engine/map.js";
import { loadTiledMap } from "./engine/tiled.js";
import { installAmbient } from "./engine/ambient.js";
import { installTour } from "./game/tour.js";
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

function fillScenarioList(tour) {
  const host = $("scenario-list");
  if (!host) return;
  host.innerHTML = "";
  const groups = {
    dpt: "Département",
    ce: "Conseil d'État",
    gc: "Grand Conseil",
    citoyen: "Citoyen",
  };
  const by = {};
  for (const s of tour.list) {
    (by[s.entry] ||= []).push(s);
  }
  for (const [eid, label] of Object.entries(groups)) {
    const items = by[eid];
    if (!items?.length) continue;
    const g = document.createElement("div");
    g.className = "sc-group";
    g.innerHTML = `<div class="sc-group__label">${label}</div>`;
    for (const s of items) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "sc-card";
      b.dataset.id = s.id;
      b.innerHTML = `<p class="sc-card__title">${s.label}</p><p class="sc-card__meta">${s.summary}</p>`;
      b.addEventListener("click", () => {
        host.querySelectorAll(".sc-card").forEach((c) => {
          c.classList.toggle("is-active", c === b);
          c.classList.toggle("is-dim", c !== b);
        });
        tour.start(s.id);
        toast(`Parcours · ${s.short}`);
      });
      g.appendChild(b);
    }
    host.appendChild(g);
  }
}

function bindTransport(tour) {
  $("btn-play")?.addEventListener("click", () => {
    if (tour.status === "pause") tour.resume();
    else if (tour.status === "done" && tour.scenario) tour.start(tour.scenario.id);
    else if (tour.status === "idle") {
      tour.start(tour.list[0].id);
      document
        .querySelector(`.sc-card[data-id="${tour.list[0].id}"]`)
        ?.classList.add("is-active");
    } else tour.resume();
  });
  $("btn-pause")?.addEventListener("click", () => tour.pause());
  $("btn-stop")?.addEventListener("click", () => {
    tour.stop();
    document.querySelectorAll(".sc-card").forEach((c) => {
      c.classList.remove("is-active", "is-dim");
    });
  });
}

function bindHotspots(markers, camera) {
  const tip = $("tip");
  const pin = $("pin");
  const pinTitle = $("pin-title");
  const pinSub = $("pin-sub");
  const pinBadge = $("pin-badge");

  function showTip(hs, sx, sy) {
    if (!tip) return;
    tip.hidden = false;
    tip.textContent = hs.label;
    tip.style.left = `${sx}px`;
    tip.style.top = `${sy}px`;
  }
  function hideTip() {
    if (tip) tip.hidden = true;
  }
  function openPin(hs) {
    if (!pin) return;
    pin.hidden = false;
    pinTitle.textContent = hs.label;
    pinSub.textContent = hs.sub;
    pinBadge.textContent = hs.kind;
    pinBadge.style.background =
      hs.kind === "parlement" || hs.siteKind === "parlement"
        ? "#3e7a52"
        : hs.kind === "chateau" || hs.siteKind === "chateau"
          ? "#a08040"
          : hs.kind === "department" || hs.siteKind === "department" || hs.kind === "room"
            ? "#5c6e8a"
            : hs.kind === "nature"
              ? "#4c83ab"
              : "#2f4266";
    sfx.pin();
  }

  $("pin-close")?.addEventListener("click", () => {
    if (pin) pin.hidden = true;
  });
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && pin) pin.hidden = true;
  });

  for (const id of Object.keys(markers)) {
    const m = markers[id];
    const hs = m.__hs;
    m.on("pointerover", (ev) => {
      m.__ring.visible = true;
      m.__ring.alpha = 0.85;
      showTip(hs, ev.clientX, ev.clientY);
    });
    m.on("pointerout", () => {
      hideTip();
      if (!m.__tourLock) m.__ring.visible = false;
    });
    m.on("pointertap", () => {
      openPin(hs);
      camera.focusOn({
        x: hs.cx,
        y: hs.cy,
        scale: Math.max(camera.scale, 2.5),
        ms: reduced ? 200 : 750,
      });
      hideTip();
    });
  }
}

async function loadWorld() {
  const tiledUrl = new URL("./assets/map/world.json", import.meta.url).href;
  try {
    const m = await loadTiledMap(tiledUrl);
    return m;
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

  // LOD on scale change (wheel) + continuous soft update
  const prevOnScale = camera.onScaleChange;
  camera.onScaleChange = (s) => {
    if (prevOnScale) prevOnScale(s);
    if (map.applyLod) map.applyLod(s, reduced);
  };

  const tour = installTour({
    camera,
    markers: map.markers,
    fxLayer: map.fxLayer,
    reduced,
  });

  for (const m of Object.values(map.markers)) {
    Object.defineProperty(m, "__tourLock", {
      get() {
        return !!tour.scenario && tour.status !== "idle";
      },
    });
  }

  fillScenarioList(tour);
  bindTransport(tour);
  bindHotspots(map.markers, camera);
  installFullscreen(rootEl);

  window.addEventListener("resize", () => {
    const w = host.clientWidth;
    const h = host.clientHeight;
    if (w > 0 && h > 0) app.renderer.resize(w, h);
    camera.resize();
    if (map.applyLod) map.applyLod(camera.scale, reduced);
  });

  const boot = $("boot");
  await new Promise((r) => setTimeout(r, reduced ? 200 : 600));
  camera.introFly(reduced ? 400 : 1600);
  await new Promise((r) => setTimeout(r, reduced ? 250 : 850));
  if (boot) boot.classList.add("is-done");
  const srcMsg =
    map.source === "kenney-composed"
      ? `${tour.list.length} parcours · Roguelike RPG Pack · zoom = intérieurs`
      : map.source?.includes("tiled")
        ? `${tour.list.length} parcours · zoom pour ouvrir les toits`
        : "Mode procédural (fallback)";
  toast(srcMsg, 3600);
  if (map.credit) console.info(map.credit);

  let last = performance.now();
  let lodT = 0;
  app.ticker.add(() => {
    const now = performance.now();
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    camera.tick(now);
    ambient.tick(dt, reduced);
    tour.tick(now, dt);
    // smooth LOD while camera animates
    lodT += dt;
    if (lodT > 0.05 && map.applyLod) {
      lodT = 0;
      map.applyLod(camera.scale, reduced);
    }
  });

  window.__SOVD_PIXEL__ = { app, camera, map, tour, sfx };
}

main().catch((e) => {
  console.error(e);
  const boot = $("boot");
  const sub = boot?.querySelector(".boot__sub");
  if (sub) sub.textContent = "Erreur de chargement — voir console";
});
