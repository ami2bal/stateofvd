/**
 * Parcours animé — dossier spritesheet + SFX + cards (M3–M4).
 */
/* global PIXI */
import { easeInOut, easeOutCubic } from "../engine/pixel.js";
import { PIXEL_SCENARIOS } from "./scenarios.js";
import { sfx } from "../engine/sfx.js";

export { PIXEL_SCENARIOS };

/**
 * @param {object} opts
 * @param {import('../engine/camera.js').SoftCamera} opts.camera
 * @param {Record<string, any>} opts.markers
 * @param {PIXI.Container} opts.fxLayer
 * @param {boolean} opts.reduced
 */
export function installTour(opts) {
  const { camera, markers, fxLayer, reduced } = opts;

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
    root: document.getElementById("transport"),
    step: document.getElementById("t-step"),
    fill: document.getElementById("t-fill"),
  };

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

  function showCard(step, i, n) {
    if (!card.el) return;
    card.kicker.textContent = `Étape ${i + 1} / ${n}`;
    card.title.textContent = step.title;
    card.body.textContent = step.body || "";
    card.el.hidden = false;
    requestAnimationFrame(() => card.el.classList.add("is-on"));
  }

  function hideCard() {
    if (!card.el) return;
    card.el.classList.remove("is-on");
    setTimeout(() => {
      if (!card.el.classList.contains("is-on")) card.el.hidden = true;
    }, 350);
  }

  function setTransport(on) {
    if (transport.root) transport.root.hidden = !on;
  }

  function progress() {
    if (!stepT0 || !stepMs) return 0;
    return Math.min(1, (performance.now() - stepT0) / stepMs);
  }

  function updateTransport() {
    if (!scenario) return;
    const n = scenario.steps.length;
    const step = scenario.steps[index];
    if (transport.step) {
      transport.step.textContent = step
        ? `${index + 1}/${n} · ${step.title}`
        : "Terminé";
    }
    if (transport.fill) {
      const p = ((index + (playing && !moving ? progress() : 0)) / n) * 100;
      transport.fill.style.width = `${Math.min(100, p)}%`;
    }
    if (card.ring && playing && !moving) {
      card.ring.style.strokeDashoffset = String(94.2 * (1 - progress()));
    }
  }

  function moveDossierTo(hs, ms = 1100) {
    if (!hs) return Promise.resolve();
    const x0 = dossier.x;
    const y0 = dossier.y;
    const x1 = hs.cx;
    const y1 = hs.cy;
    if (!dossier.visible) {
      dossier.x = x1;
      dossier.y = y1;
      dossier.visible = true;
      dossier.alpha = 0;
    }
    // face direction
    if (body?.textures) {
      const dx = x1 - dossier.x;
      const dy = y1 - dossier.y;
      const dir =
        Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "e" : "o") : dy > 0 ? "s" : "n";
      // simple: keep walk_s frames (seed sheet); speed up while moving
      if (body.play) {
        body.animationSpeed = 0.22;
        body.play();
      }
      void dir;
    }
    return new Promise((resolve) => {
      moving = {
        t0: performance.now(),
        ms: reduced ? 200 : ms,
        x0: dossier.visible ? x0 : x1,
        y0: dossier.visible ? y0 : y1,
        x1,
        y1,
        fadeIn: dossier.alpha < 1,
        resolve,
      };
      camera.focusOn({
        x: x1,
        y: y1,
        scale: Math.max(camera.scale, 2.3),
        ms: reduced ? 250 : ms + 100,
      });
    });
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
    await moveDossierTo(hotspot(step.room), 1000);
    if (body?.play) body.animationSpeed = 0.12;
    stepMs = reduced ? Math.min(step.ms || 4000, 1500) : step.ms || 4000;
    stepT0 = performance.now();
    showCard(step, i, scenario.steps.length);
    updateTransport();
  }

  function finish() {
    playing = false;
    status = "done";
    hideCard();
    clearRings();
    sfx.done();
    if (transport.step)
      transport.step.textContent = "Parcours terminé — rejouer ▶";
    if (transport.fill) transport.fill.style.width = "100%";
    // esplanade approx (world grid ~18,10 × 16px)
    camera.focusOn({
      x: 18 * 16,
      y: 10 * 16,
      scale: Math.max(camera.minScale, 1.5),
      ms: reduced ? 200 : 1000,
    });
  }

  function start(id) {
    const sc = PIXEL_SCENARIOS.find((s) => s.id === id);
    if (!sc) return;
    scenario = sc;
    index = 0;
    playing = true;
    status = "play";
    trailPts.length = 0;
    trail.clear();
    dossier.visible = false;
    setTransport(true);
    sfx.play();
    const first = hotspot(sc.steps[0].room);
    if (first) {
      dossier.x = first.cx;
      dossier.y = first.cy;
    }
    enterStep(0);
  }

  function pause() {
    if (!playing) return;
    playing = false;
    status = "pause";
    sfx.pause();
    if (body?.stop) body.stop();
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
  }

  function stop() {
    playing = false;
    scenario = null;
    status = "idle";
    hideCard();
    clearRings();
    dossier.visible = false;
    trail.clear();
    trailPts.length = 0;
    setTransport(false);
  }

  function tick(now) {
    if (moving) {
      const u = easeInOut((now - moving.t0) / moving.ms);
      dossier.x = moving.x0 + (moving.x1 - moving.x0) * u;
      dossier.y = moving.y0 + (moving.y1 - moving.y0) * u;
      if (moving.fadeIn) dossier.alpha = easeOutCubic(u);
      else dossier.alpha = 1;
      if (!reduced && u < 1) {
        trailPts.push({ x: dossier.x, y: dossier.y, a: 1 });
        if (trailPts.length > 48) trailPts.shift();
      }
      glow.scale.set(1 + Math.sin(now / 180) * 0.08);
      if (u >= 1) {
        const r = moving.resolve;
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

    if (playing && !moving && scenario) {
      updateTransport();
      if (progress() >= 1) {
        if (index + 1 < scenario.steps.length) enterStep(index + 1);
        else finish();
      }
    }
  }

  return {
    start,
    pause,
    resume,
    stop,
    tick,
    get scenario() {
      return scenario;
    },
    get status() {
      return status;
    },
    list: PIXEL_SCENARIOS,
  };
}
