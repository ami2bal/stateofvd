/**
 * Parcours animé — dossier spritesheet + SFX + cards (M3–M4).
 */
/* global PIXI */
import { easeInOut, easeOutCubic } from "../engine/pixel.js";
import { loadPathGraph, routeHotspots } from "../engine/path-route.js";
import { PIXEL_SCENARIOS, getPixelScenario } from "./scenarios.js";
import { placePanelNear, hotspotScreenRect } from "./place-panel.js";
import { sfx } from "../engine/sfx.js";

export { PIXEL_SCENARIOS, getPixelScenario };

/**
 * @param {object} opts
 * @param {import('../engine/camera.js').SoftCamera} opts.camera
 * @param {Record<string, any>} opts.markers
 * @param {PIXI.Container} opts.fxLayer
 * @param {boolean} opts.reduced
 * @param {{ openScenarioStep?: Function, close?: Function }} [opts.contextUi]
 * @param {{ render?: Function, hide?: Function }} [opts.ariane]
 * @param {{ setScenario?: Function, setCurrent?: Function, clear?: Function, update?: Function }} [opts.stepBadges]
 * @param {import('../engine/path-route.js').buildPathIndex extends Function ? any : any} [opts.pathGraph]
 */
export function installTour(opts) {
  const { camera, markers, fxLayer, reduced, contextUi, ariane, stepBadges } = opts;
  /** @type {Awaited<ReturnType<typeof loadPathGraph>>} */
  let pathGraph = opts.pathGraph || null;
  loadPathGraph().then((g) => {
    if (g) pathGraph = g;
  });

  const dossier = new PIXI.Container();
  dossier.visible = false;
  dossier.zIndex = 50;
  fxLayer.addChild(dossier);

  const glow = new PIXI.Graphics();
  glow.beginFill(0xe8c15a, 0.28);
  glow.drawCircle(0, 0, 12);
  glow.endFill();
  dossier.addChild(glow);

  /** @type {PIXI.AnimatedSprite|PIXI.Sprite|null} */
  let body = null;
  let animReady = false;

  async function ensureDossierSprite() {
    if (animReady) return;
    try {
      const base = new URL("../assets/characters/", import.meta.url);
      const sheetUrl = new URL("dossier_16.png", base).href;
      const jsonUrl = new URL("dossier_16.json", base).href;
      const [tex, atlas] = await Promise.all([
        PIXI.Assets.load(sheetUrl),
        fetch(jsonUrl).then((r) => r.json()),
      ]);
      tex.baseTexture.scaleMode = PIXI.SCALE_MODES.NEAREST;
      const frames = (atlas.animations?.walk_s || ["dossier_idle"]).map((name) => {
        const f = atlas.frames[name].frame;
        return new PIXI.Texture(
          tex.baseTexture,
          new PIXI.Rectangle(f.x, f.y, f.w, f.h)
        );
      });
      const anim = new PIXI.AnimatedSprite(frames);
      anim.anchor.set(0.5, 0.75);
      anim.animationSpeed = 0.15;
      anim.play();
      body = anim;
      dossier.addChild(anim);
      animReady = true;
    } catch (e) {
      console.warn("dossier sheet fallback", e);
      const g = new PIXI.Graphics();
      g.beginFill(0xf5e6c8);
      g.lineStyle(1, 0xc9a45c, 1);
      g.drawRoundedRect(-6, -8, 12, 16, 2);
      g.endFill();
      body = g;
      dossier.addChild(g);
      animReady = true;
    }
  }
  ensureDossierSprite();

  const trail = new PIXI.Graphics();
  trail.zIndex = 40;
  fxLayer.addChild(trail);
  const trailPts = [];

  let scenario = null;
  let index = 0;
  let playing = false;
  let stepT0 = 0;
  let stepMs = 4000;
  let moving = null;
  let status = "idle";

  const card = {
    el: document.getElementById("step-card"),
    kicker: document.getElementById("step-kicker"),
    title: document.getElementById("step-title"),
    body: document.getElementById("step-body"),
    ring: document.getElementById("step-ring"),
  };
  const transport = {
    label: document.getElementById("sp-scen-label"),
    stepCount: document.getElementById("sp-step-count"),
    statePill: document.getElementById("sp-state-pill"),
    fill: document.getElementById("sp-fill"),
    play: document.getElementById("sp-play"),
    pause: document.getElementById("sp-pause"),
    stop: document.getElementById("sp-stop"),
  };

  /** @type {number} */
  let speedMul = 1;
  const SPEED_STEPS = [0.6, 1, 1.6];

  function hotspot(id) {
    return markers[id]?.__hs || null;
  }

  function clearRings() {
    for (const m of Object.values(markers)) {
      if (m.__ring) {
        m.__ring.visible = false;
        m.__ring.alpha = 0;
      }
    }
  }

  function pulseRing(id) {
    clearRings();
    const m = markers[id];
    if (!m?.__ring) return;
    m.__ring.visible = true;
    m.__ring.alpha = 1;
  }

  let awaitingBranch = false;
  /** @type {null|'success'|'reject'} */
  let endOutcome = null;

  /** @type {{ x:number, y:number, side:string }|null} */
  let cardPlace = null;

  function placeStepCard(step) {
    if (!card.el || card.el.hidden || !step) return;
    const hs = hotspot(step.room);
    if (!hs) return;
    const focus = hotspotScreenRect(hs, camera);
    const shell = document.getElementById("sovd-root");
    cardPlace = placePanelNear(card.el, focus, {
      shell,
      last: cardPlace,
      bottomReserve: 132,
      topReserve: 56,
      obstacleEls: [
        document.getElementById("flow-hud"),
        document.getElementById("sovd-chrome"),
        document.getElementById("sovd-ariane"),
        document.getElementById("ctx-modal"),
        document.querySelector(".flow-act-panel"),
      ].filter(Boolean),
    });
  }

  function showCard(step, i, n) {
    if (!card.el) return;
    const act = step.activityLabel || "Acte";
    card.kicker.textContent = `${act} · ${i + 1} / ${n}`;
    card.title.textContent = step.title;
    // Corps narratif (sans legal collé) — legal en bloc séparé
    let legalEl = card.el.querySelector(".step-card__legal");
    if (!legalEl) {
      legalEl = document.createElement("div");
      legalEl.className = "step-card__legal";
      card.el.appendChild(legalEl);
    }
    card.body.textContent = step.body || "";
    if (step.legal && step.legal !== "—") {
      legalEl.hidden = false;
      legalEl.textContent = step.legal;
    } else {
      legalEl.hidden = true;
      legalEl.textContent = "";
    }
    card.el.classList.toggle("has-choice", !!step.rejectAlt);
    card.el.classList.toggle("is-awaiting", !!step.rejectAlt);
    card.el.hidden = false;
    requestAnimationFrame(() => {
      card.el.classList.add("is-on");
      placeStepCard(step);
      requestAnimationFrame(() => placeStepCard(step));
    });
    // Pendant un parcours : la carte d'étape est le panel narratif (placé à la focale).
    contextUi?.close?.();
    // Branche rejectAlt (iso main)
    renderBranchChoice(step);
  }

  function acceptBranch() {
    const row = document.getElementById("step-branch");
    if (row) row.hidden = true;
    if (!awaitingBranch && status !== "pause") return;
    awaitingBranch = false;
    playing = true;
    status = "play";
    stepT0 = performance.now();
    card.el?.classList.remove("is-awaiting");
    syncStepChrome(index);
    updateTransport();
  }

  function rejectBranch() {
    const row = document.getElementById("step-branch");
    if (row) row.hidden = true;
    awaitingBranch = false;
    endOutcome = "reject";
    playing = false;
    status = "done";
    hideCard();
    clearRings();
    contextUi?.close?.();
    if (transport.stepCount) transport.stepCount.textContent = "Fin · refus";
    if (transport.statePill) {
      transport.statePill.textContent = "Refusé";
      transport.statePill.dataset.state = "done";
    }
    sfx.done();
    ariane?.render?.(scenario, index, {
      playing: false,
      status: "done",
      awaitingBranch: false,
      endOutcome: "reject",
    });
    updateTransport();
  }

  function renderBranchChoice(step) {
    let row = document.getElementById("step-branch");
    if (!step?.rejectAlt) {
      if (row) row.hidden = true;
      awaitingBranch = false;
      card.el?.classList.remove("has-choice", "is-awaiting");
      return;
    }
    if (!row && card.el) {
      row = document.createElement("div");
      row.id = "step-branch";
      row.className = "step-branch";
      card.el.appendChild(row);
    }
    if (!row) return;
    const acceptLab = step.title || "Accepter / adopter";
    const rejectLab =
      step.rejectAlt.actLabel ||
      step.rejectAlt.label ||
      step.rejectAlt.title ||
      "Rejeter / classer";
    row.hidden = false;
    row.innerHTML = `
      <div class="step-branch__banner" role="status">À vous de jouer — choisissez une issue</div>
      <p class="step-branch__hint">Choisir une issue</p>
      <div class="step-branch__btns">
        <button type="button" class="step-branch__ok" data-choice="accept">${escapeText(acceptLab)}</button>
        <button type="button" class="step-branch__ko" data-choice="reject">${escapeText(rejectLab)}</button>
      </div>`;
    row.querySelector('[data-choice="accept"]')?.addEventListener("click", () => {
      acceptBranch();
    });
    row.querySelector('[data-choice="reject"]')?.addEventListener("click", () => {
      rejectBranch();
    });
    // pause auto-advance until choice
    awaitingBranch = true;
    playing = false;
    status = "pause";
    updateTransport();
  }

  function escapeText(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function hideCard() {
    if (!card.el) return;
    card.el.classList.remove("is-on");
    cardPlace = null;
    setTimeout(() => {
      if (!card.el.classList.contains("is-on")) card.el.hidden = true;
    }, 350);
  }

  function syncTransportChrome() {
    if (transport.label) {
      transport.label.textContent = scenario
        ? scenario.label
        : "Choisir un scénario";
    }
    if (transport.play) transport.play.disabled = false;
    if (transport.pause) transport.pause.disabled = !scenario || status === "idle" || status === "done";
    if (transport.stop) transport.stop.disabled = !scenario || status === "idle";
    if (transport.statePill) {
      const map = {
        idle: "Prêt",
        play: "Lecture",
        step: "Lecture",
        pause: "Pause",
        done: "Terminé",
      };
      transport.statePill.textContent = map[status] || "—";
      transport.statePill.dataset.state = status;
    }
  }

  function progress() {
    if (!stepT0 || !stepMs) return 0;
    return Math.min(1, (performance.now() - stepT0) / stepMs);
  }

  function updateTransport() {
    const n = scenario?.steps.length || 0;
    const step = scenario?.steps[index];
    if (transport.stepCount) {
      transport.stepCount.textContent = scenario
        ? step
          ? `${index + 1} / ${n}`
          : `${n} / ${n}`
        : "— / —";
    }
    if (transport.fill) {
      if (!scenario) {
        transport.fill.style.width = "0%";
      } else {
        const p = ((index + (playing && !moving ? progress() : 0)) / n) * 100;
        transport.fill.style.width = `${Math.min(100, p)}%`;
      }
    }
    if (card.ring && playing && !moving) {
      card.ring.style.strokeDashoffset = String(94.2 * (1 - progress()));
    }
    syncTransportChrome();
  }

  /**
   * Walk the dossier along the road network (path_graph) then into the room.
   * @param {object|null} fromHs previous hotspot (null = teleport spawn)
   * @param {object} toHs target hotspot
   * @param {number} [msPerSeg]
   */
  function moveDossierTo(fromHs, toHs, msPerSeg = 420) {
    if (!toHs) return Promise.resolve();
    const fadeIn = !dossier.visible || dossier.alpha < 1;
    if (!dossier.visible) {
      // Spawn at start of route (or on target if no from)
      const spawn = fromHs || toHs;
      dossier.x = spawn.cx;
      dossier.y = spawn.cy;
      dossier.visible = true;
      dossier.alpha = 0;
    }

    let pts;
    if (fromHs && pathGraph) {
      pts = routeHotspots(fromHs, toHs, pathGraph);
    } else if (fromHs) {
      // fallback Manhattan without graph
      pts = [
        { x: fromHs.cx, y: fromHs.cy },
        { x: toHs.cx, y: fromHs.cy },
        { x: toHs.cx, y: toHs.cy },
      ];
    } else {
      pts = [{ x: toHs.cx, y: toHs.cy }];
    }
    // ensure ends at target center
    const last = pts[pts.length - 1];
    if (!last || Math.abs(last.x - toHs.cx) > 1 || Math.abs(last.y - toHs.cy) > 1) {
      pts = [...pts, { x: toHs.cx, y: toHs.cy }];
    }
    // drop zero-length segments
    const cleaned = [pts[0]];
    for (let i = 1; i < pts.length; i++) {
      const a = cleaned[cleaned.length - 1];
      const b = pts[i];
      if (Math.abs(a.x - b.x) > 0.5 || Math.abs(a.y - b.y) > 0.5) cleaned.push(b);
    }
    pts = cleaned;

    if (body?.play) {
      body.animationSpeed = 0.22;
      body.play();
    }

    // Duration proportional to path length (px)
    let dist = 0;
    for (let i = 1; i < pts.length; i++) {
      dist += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    }
    const pxPerMs = reduced ? 1.2 : 0.28 * speedMul;
    const totalMs = reduced
      ? Math.min(400, Math.max(120, dist / 2))
      : Math.max(450, Math.min(9000, dist / Math.max(0.12, pxPerMs)));

    return new Promise((resolve) => {
      moving = {
        t0: performance.now(),
        ms: totalMs,
        pts,
        fadeIn,
        resolve,
        // cumulative lengths for arc-length interpolation
        segLen: (() => {
          const L = [0];
          for (let i = 1; i < pts.length; i++) {
            L.push(
              L[i - 1] +
                Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y)
            );
          }
          return L;
        })(),
      };
      camera.focusOn({
        x: toHs.cx,
        y: toHs.cy,
        scale: Math.max(camera.scale, 2.3),
        ms: reduced ? 250 : Math.min(1400, totalMs + 100),
      });
    });
  }

  function pointOnPath(movingState, u) {
    const { pts, segLen } = movingState;
    const total = segLen[segLen.length - 1] || 1;
    const target = u * total;
    let i = 1;
    while (i < segLen.length && segLen[i] < target) i++;
    const i0 = Math.max(0, i - 1);
    const i1 = Math.min(pts.length - 1, i);
    const a = pts[i0];
    const b = pts[i1];
    const seg = segLen[i1] - segLen[i0] || 1;
    const t = (target - segLen[i0]) / seg;
    return {
      x: a.x + (b.x - a.x) * t,
      y: a.y + (b.y - a.y) * t,
    };
  }

  function syncStepChrome(i) {
    if (scenario) {
      ariane?.render?.(scenario, i, {
        playing,
        status,
        awaitingBranch,
        endOutcome,
      });
      stepBadges?.setCurrent?.(i);
    }
  }

  async function enterStep(i) {
    if (!scenario) return;
    await ensureDossierSprite();
    index = i;
    const step = scenario.steps[i];
    if (!step) {
      finish();
      return;
    }
    status = "step";
    pulseRing(step.room);
    sfx.step();
    syncStepChrome(i);
    const toHs = hotspot(step.room);
    const prev =
      i > 0 ? hotspot(scenario.steps[i - 1].room) : dossier.visible ? { cx: dossier.x, cy: dossier.y, siteId: null, kind: "room" } : null;
    // First step: if already placed on first room, skip travel
    if (i === 0 && toHs) {
      dossier.x = toHs.cx;
      dossier.y = toHs.cy;
      dossier.visible = true;
      dossier.alpha = 1;
      camera.focusOn({
        x: toHs.cx,
        y: toHs.cy,
        scale: Math.max(camera.scale, 2.3),
        ms: reduced ? 200 : 700,
      });
    } else {
      await moveDossierTo(prev, toHs);
    }
    if (body?.play) body.animationSpeed = 0.12;
    const base = step.ms || 4000;
    stepMs = reduced
      ? Math.min(base, 1500)
      : Math.max(1200, base / speedMul);
    stepT0 = performance.now();
    showCard(step, i, scenario.steps.length);
    // Re-sync after travel (index may match; card/context updated)
    if (playing || status === "step" || status === "pause") {
      playing = !awaitingBranch;
      if (!awaitingBranch) status = "play";
    }
    syncStepChrome(i);
    updateTransport();
  }

  function finish() {
    playing = false;
    status = "done";
    if (!endOutcome) endOutcome = "success";
    hideCard();
    clearRings();
    contextUi?.close?.();
    ariane?.render?.(scenario, scenario?.steps?.length || 0, {
      playing: false,
      status: "done",
      awaitingBranch: false,
      endOutcome,
    });
    stepBadges?.setCurrent?.(scenario?.steps?.length || 0);
    sfx.done();
    if (transport.fill) transport.fill.style.width = "100%";
    updateTransport();
    camera.focusOn({
      x: 18 * 16,
      y: 10 * 16,
      scale: Math.max(camera.minScale, 1.5),
      ms: reduced ? 200 : 1000,
    });
  }

  function start(id) {
    const sc = getPixelScenario(id) || PIXEL_SCENARIOS.find((s) => s.id === id);
    if (!sc) return;
    scenario = sc;
    index = 0;
    playing = true;
    status = "play";
    awaitingBranch = false;
    endOutcome = null;
    trailPts.length = 0;
    trail.clear();
    dossier.visible = false;
    sfx.play();
    const first = hotspot(sc.steps[0].room);
    if (first) {
      dossier.x = first.cx;
      dossier.y = first.cy;
    }
    ariane?.render?.(sc, 0, { playing: true, status: "play" });
    stepBadges?.setScenario?.(sc, 0);
    updateTransport();
    enterStep(0);
  }

  function pause() {
    if (!playing) return;
    playing = false;
    status = "pause";
    sfx.pause();
    if (body?.stop) body.stop();
    syncStepChrome(index);
    updateTransport();
  }

  function resume() {
    if (!scenario || status === "done") {
      if (scenario) start(scenario.id);
      return;
    }
    playing = true;
    status = "play";
    sfx.play();
    if (body?.play) body.play();
    stepT0 = performance.now() - progress() * stepMs;
    syncStepChrome(index);
    updateTransport();
  }

  function stop() {
    playing = false;
    scenario = null;
    status = "idle";
    awaitingBranch = false;
    endOutcome = null;
    hideCard();
    clearRings();
    contextUi?.close?.();
    ariane?.hide?.();
    stepBadges?.clear?.();
    dossier.visible = false;
    trail.clear();
    trailPts.length = 0;
    updateTransport();
  }

  /** Clic fil d'Ariane → aller à l'étape i (reprend la lecture). */
  function goTo(i) {
    if (!scenario?.steps?.length) return;
    const n = scenario.steps.length;
    const target = Math.max(0, Math.min(n - 1, i | 0));
    if (status === "done") {
      // relancer depuis cette étape
      playing = true;
      status = "play";
    }
    awaitingBranch = false;
    playing = true;
    status = "play";
    // cancel in-flight move
    if (moving) {
      const r = moving.resolve;
      moving = null;
      if (r) r();
    }
    enterStep(target);
  }

  /** Hover Ariane : pan caméra sur la salle sans changer l'étape. */
  function previewStep(i) {
    if (!scenario?.steps?.[i]) return;
    const hs = hotspot(scenario.steps[i].room);
    if (!hs) return;
    camera.focusOn({
      x: hs.cx,
      y: hs.cy,
      scale: Math.max(camera.scale, 2.1),
      ms: reduced ? 160 : 420,
    });
    pulseRing(scenario.steps[i].room);
  }

  function endPreview() {
    if (!scenario?.steps?.[index]) {
      clearRings();
      return;
    }
    // restore ring on current step room
    pulseRing(scenario.steps[index].room);
    const hs = hotspot(scenario.steps[index].room);
    if (hs && (status === "play" || status === "step" || status === "pause")) {
      camera.focusOn({
        x: hs.cx,
        y: hs.cy,
        scale: Math.max(camera.scale, 2.3),
        ms: reduced ? 160 : 380,
      });
    }
  }

  function setSpeedIndex(i) {
    const idx = ((i % SPEED_STEPS.length) + SPEED_STEPS.length) % SPEED_STEPS.length;
    speedMul = SPEED_STEPS[idx];
    return { index: idx, value: speedMul, label: `×${String(speedMul).replace(".", ",")}` };
  }

  function getSpeedIndex() {
    const i = SPEED_STEPS.indexOf(speedMul);
    return i >= 0 ? i : 1;
  }

  function tick(now) {
    if (moving) {
      const raw = Math.min(1, (now - moving.t0) / moving.ms);
      const u = easeInOut(raw);
      if (moving.pts?.length) {
        const p = pointOnPath(moving, u);
        dossier.x = p.x;
        dossier.y = p.y;
      } else {
        dossier.x = moving.x0 + (moving.x1 - moving.x0) * u;
        dossier.y = moving.y0 + (moving.y1 - moving.y0) * u;
      }
      if (moving.fadeIn) dossier.alpha = easeOutCubic(u);
      else dossier.alpha = 1;
      if (!reduced && u < 1) {
        trailPts.push({ x: dossier.x, y: dossier.y, a: 1 });
        if (trailPts.length > 64) trailPts.shift();
      }
      glow.scale.set(1 + Math.sin(now / 180) * 0.08);
      if (u >= 1) {
        const r = moving.resolve;
        const last = moving.pts?.[moving.pts.length - 1];
        if (last) {
          dossier.x = last.x;
          dossier.y = last.y;
        }
        moving = null;
        dossier.alpha = 1;
        if (r) r();
      }
    } else if (dossier.visible) {
      glow.scale.set(1 + Math.sin(now / 220) * 0.1);
      dossier.y += Math.sin(now / 280) * 0.015;
    }

    if (trailPts.length) {
      trail.clear();
      for (let i = 0; i < trailPts.length; i++) {
        const p = trailPts[i];
        p.a *= 0.965;
        const a = p.a * (i / trailPts.length);
        if (a < 0.04) continue;
        trail.beginFill(0xe8c15a, a * 0.55);
        trail.drawCircle(p.x, p.y, 2);
        trail.endFill();
      }
    }

    for (const m of Object.values(markers)) {
      if (m.__ring?.visible) {
        m.__ring.alpha = 0.55 + Math.sin(now / 320) * 0.35;
      }
    }

    if (playing && !moving && !awaitingBranch && scenario) {
      updateTransport();
      if (progress() >= 1) {
        if (index + 1 < scenario.steps.length) enterStep(index + 1);
        else finish();
      }
    }

    stepBadges?.update?.();
  }

  /** Reposition carte d'étape (appelé au pan/zoom, pas chaque frame). */
  function repositionCard() {
    if (scenario?.steps?.[index] && card.el && !card.el.hidden) {
      placeStepCard(scenario.steps[index]);
    }
  }

  updateTransport();

  return {
    start,
    pause,
    resume,
    stop,
    goTo,
    previewStep,
    endPreview,
    acceptBranch,
    rejectBranch,
    placeStepCard,
    repositionCard,
    tick,
    setSpeedIndex,
    getSpeedIndex,
    get scenario() {
      return scenario;
    },
    get status() {
      return status;
    },
    get index() {
      return index;
    },
    get list() {
      return PIXEL_SCENARIOS;
    },
    get awaitingBranch() {
      return awaitingBranch;
    },
    getPathGraph() {
      return pathGraph;
    },
  };
}
