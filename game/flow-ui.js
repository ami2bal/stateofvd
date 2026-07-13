/**
 * DOM HUD + act button for active flow (verdict AFTER gesture).
 * TASK-095: anchored LEFT via style.css; glass skin on #flow-hud.
 */
import { seekWeekday } from "./flow-engine.js";

/**
 * @param {object} opts
 * @param {import('./flow-engine.js').FlowEngine} opts.engine
 * @param {HTMLElement} opts.root
 * @param {object} [opts.scene] for visual navette hint
 */
export function installFlowUi(opts) {
  const { engine, root, scene, clock } = opts;
  root.hidden = false;
  root.classList.add("sovd-glass", "flow-hud-left");
  root.setAttribute("data-side", "left");

  root.innerHTML = `
    <div class="flow-title" id="flow-title"></div>
    <div class="flow-obj" id="flow-obj"></div>
    <div class="flow-conflict" id="flow-conflict" hidden></div>
    <div class="flow-next" id="flow-next"></div>
    <div class="flow-clock" id="flow-clock-line"></div>
    <div class="flow-actions">
      <button type="button" id="flow-act" class="flow-btn">Agir</button>
      <button type="button" id="flow-seek" class="flow-btn secondary">Aller au jour requis</button>
      <button type="button" id="flow-amend" class="flow-btn secondary" hidden>Admettre un amendement</button>
      <button type="button" id="flow-withdraw" class="flow-btn secondary" hidden>CE retire le projet</button>
    </div>
    <div class="flow-stamp" id="flow-stamp" hidden></div>
    <div class="flow-lesson" id="flow-lesson" hidden></div>
  `;

  const elTitle = root.querySelector("#flow-title");
  const elObj = root.querySelector("#flow-obj");
  const elConflict = root.querySelector("#flow-conflict");
  const elNext = root.querySelector("#flow-next");
  const elClock = root.querySelector("#flow-clock-line");
  const elAct = root.querySelector("#flow-act");
  const elSeek = root.querySelector("#flow-seek");
  const elAmend = root.querySelector("#flow-amend");
  const elWithdraw = root.querySelector("#flow-withdraw");
  const elStamp = root.querySelector("#flow-stamp");
  const elLesson = root.querySelector("#flow-lesson");

  function refresh() {
    const st = engine.getState();
    elTitle.textContent = engine.scenario.title;
    if (!st.object) {
      elObj.textContent = "—";
      elNext.textContent = "Démarrer le tutoriel";
      elAct.disabled = true;
      return;
    }
    elObj.textContent = `${st.object.label} · état : ${st.object.state}`;
    // S2 conflict HUD
    const c = st.conflict;
    if (c && (engine.scenario.majority || c.minorityReport || c.readingCount)) {
      elConflict.hidden = false;
      const parts = [];
      if (c.minorityReport) parts.push("rapports majorité + minorité");
      if (c.readingCount) parts.push(`lecture ${c.readingCount}`);
      if (c.majority) {
        parts.push(
          `soutien ${c.support}/150 (seuil ${c.threshold} · ${c.majority})`
        );
      }
      elConflict.textContent = parts.join(" · ");
    } else {
      elConflict.hidden = true;
    }
    elAmend.hidden = !(c && c.canAdmitAmendment);
    elWithdraw.hidden = !(c && c.canWithdraw && !st.done);
    if (st.done) {
      const term = st.object.state;
      elNext.textContent =
        term === "promulgue"
          ? "Terminé — acte promulgué."
          : term === "rejete"
            ? "Terminé — projet rejeté."
            : term === "retire"
              ? "Terminé — projet retiré par le CE."
              : "Terminé.";
      elAct.disabled = true;
      elSeek.disabled = true;
      elAmend.hidden = true;
      elWithdraw.hidden = true;
    } else if (st.step) {
      const dayHint = st.step.weekdayTag
        ? ` · jour : ${st.step.weekdayTag === "ce" ? "mercredi (CE)" : st.step.weekdayTag === "gc" ? "mardi (GC)" : st.step.weekdayTag}`
        : "";
      elNext.textContent = `Prochain acte : ${st.step.actLabel} (${st.step.actorLabel})${dayHint}`;
      elAct.textContent = st.step.actLabel;
      elAct.disabled = false;
      elSeek.disabled = !st.step.weekdayTag;
    }
    elClock.textContent = st.clock.hud;
  }

  function showVerdict(result) {
    elStamp.hidden = false;
    elStamp.className =
      "flow-stamp " + (result.verdict === "ACCORDE" ? "ok" : "ko");
    elStamp.textContent =
      result.verdict === "ACCORDE" ? "ACCORDÉ" : "REFUS — leçon";
    if (result.lesson) {
      elLesson.hidden = false;
      elLesson.textContent = result.lesson;
    } else {
      elLesson.hidden = true;
    }
  }

  elAct.addEventListener("click", () => {
    // Gesture first (neutral button), THEN verdict stamp
    const result = engine.attemptCurrent();
    showVerdict(result);
    refresh();
    if (result.verdict === "ACCORDE" && scene) {
      hintNavette(scene, engine);
    }
    // Terminal object → carrier no longer has responsibility (F-halo)
    if (engine.done || isTerminal(engine.object?.state)) {
      clearGold(scene);
    }
  });

  elSeek.addEventListener("click", () => {
    const step = engine.currentStep;
    if (step?.weekdayTag) {
      seekWeekday(clock || engine.clock, step.weekdayTag);
      refresh();
      elLesson.hidden = false;
      elLesson.textContent = `Horloge avancée au jour « ${step.weekdayTag} ». Vous pouvez agir.`;
    }
  });

  elAmend.addEventListener("click", () => {
    if (!engine.admitAmendment) return;
    const result = engine.admitAmendment();
    showVerdict(result);
    refresh();
  });

  elWithdraw.addEventListener("click", () => {
    if (!engine.attemptWithdraw) return;
    const result = engine.attemptWithdraw();
    showVerdict(result);
    refresh();
    if (engine.done || isTerminal(engine.object?.state)) {
      clearGold(scene);
    }
  });

  engine.onEvent = (ev) => {
    if (ev.type === "verdict") {
      /* stamp already from button; keep refresh */
    }
    refresh();
  };

  refresh();
  return { refresh, showVerdict, getEngine: () => engine };
}

const TERMINAL = new Set(["promulgue", "rejete", "retire"]);

function isTerminal(state) {
  return state && TERMINAL.has(state);
}

function clearGold(scene) {
  const demo = window.__SOVD__?.demo;
  if (demo?.clearAllGold) demo.clearAllGold();
  else if (scene?.entities?.list) {
    for (const en of scene.entities.list) en.setGold?.(false);
  }
}

function hintNavette(scene, engine) {
  const hist = engine.history;
  const last = hist[hist.length - 1];
  if (!last || last.verdict !== "ACCORDE") return;
  // No gold after terminal
  if (engine.done || isTerminal(engine.object?.state)) {
    clearGold(scene);
    return;
  }
  const step = engine.scenario.steps.find((s) => s.id === last.stepId);
  if (!step || step.by !== "handover") return;
  // Move a visual carrier toward target site entry if demo carrier exists
  const demo = window.__SOVD__?.demo;
  if (!demo?.getState) return;
  const siteId = step.siteId;
  const site = scene.world.sites.find((s) => s.id === siteId);
  if (!site?.entry) return;
  const carrier = demo.getState().carrier;
  if (carrier && scene.entities?.pathTo) {
    carrier.setGold?.(true);
    if (demo.getState) demo.getState().goldAttachedTo = carrier.id;
    scene.entities.pathTo(carrier, site.entry.gx, site.entry.gy);
  }
}
