/**
 * Pont FlowEngine (main) ↔ Mode Parcours pixel.
 * Horloge sim + Agir / Aller au jour / amendement / retrait.
 */
import {
  FlowEngine,
  seekWeekday,
  Clock,
  loadVaudProfile,
  getPixelScenario,
  SCENARIOS,
} from "./from-main.js";

/**
 * @param {object} opts
 * @param {HTMLElement} opts.mount  #sovd-root
 * @param {(msg:string)=>void} [opts.toast]
 * @param {(siteId:string, roomId?:string|null)=>void} [opts.focusPlace]
 */
export function installFlowBridge(opts) {
  const { mount, toast, focusPlace } = opts;
  let clock = new Clock({ speed: 0 });
  /** @type {FlowEngine|null} */
  let engine = null;
  let profile = null;

  // UI panel
  let panel = mount.querySelector("#flow-act-panel");
  if (!panel) {
    panel = document.createElement("div");
    panel.id = "flow-act-panel";
    panel.className = "flow-act-panel";
    panel.hidden = true;
    panel.innerHTML = `
      <div class="flow-act-panel__head">
        <span class="flow-act-panel__kicker">Machine de flux</span>
        <span class="flow-act-panel__clock" id="flow-clock">—</span>
      </div>
      <div class="flow-act-panel__obj" id="flow-obj">—</div>
      <div class="flow-act-panel__next" id="flow-next">—</div>
      <div class="flow-act-panel__conflict" id="flow-conflict" hidden></div>
      <div class="flow-act-panel__actions">
        <button type="button" class="flow-act-btn primary" id="flow-act">Agir</button>
        <button type="button" class="flow-act-btn" id="flow-seek">Aller au jour requis</button>
        <button type="button" class="flow-act-btn" id="flow-amend" hidden>Admettre un amendement</button>
        <button type="button" class="flow-act-btn" id="flow-withdraw" hidden>CE retire le projet</button>
      </div>
      <div class="flow-act-panel__stamp" id="flow-stamp" hidden></div>
      <div class="flow-act-panel__lesson" id="flow-lesson" hidden></div>
    `;
    mount.appendChild(panel);
  }

  const els = {
    clock: panel.querySelector("#flow-clock"),
    obj: panel.querySelector("#flow-obj"),
    next: panel.querySelector("#flow-next"),
    conflict: panel.querySelector("#flow-conflict"),
    act: panel.querySelector("#flow-act"),
    seek: panel.querySelector("#flow-seek"),
    amend: panel.querySelector("#flow-amend"),
    withdraw: panel.querySelector("#flow-withdraw"),
    stamp: panel.querySelector("#flow-stamp"),
    lesson: panel.querySelector("#flow-lesson"),
  };

  function clockHud() {
    try {
      if (typeof clock.formatHud === "function") return clock.formatHud();
      return `J${clock.day} · ${(clock.weekdayTag || "—").toUpperCase()}`;
    } catch {
      return `J${clock.day || 1}`;
    }
  }

  function refresh() {
    // Iso Mode Parcours : le panneau « Machine de flux » n'est pas exposé
    // (walkthrough / step-card portent le récit). Moteur conservé pour QA.
    panel.hidden = true;
    if (!engine) {
      return;
    }
    const st = engine.getState ? engine.getState() : null;
    const obj = engine.object;
    const step = engine.currentStep || engine.scenario?.steps?.[engine.stepIndex];

    if (els.clock) els.clock.textContent = clockHud();
    if (els.obj) {
      els.obj.textContent = obj
        ? `${obj.label || engine.scenario.objectLabel || "Objet"} · ${obj.state || "—"}`
        : "—";
    }
    if (els.next) {
      if (engine.done) {
        els.next.textContent = `Terminé — ${obj?.state || "fin"}`;
      } else if (step) {
        const day =
          step.weekdayTag === "ce"
            ? " · mercredi (CE)"
            : step.weekdayTag === "gc"
              ? " · mardi (GC)"
              : step.weekdayTag
                ? ` · ${step.weekdayTag}`
                : "";
        els.next.textContent = `Prochain : ${step.actLabel || step.id}${day}`;
        if (els.act) els.act.textContent = step.actLabel || "Agir";
      } else {
        els.next.textContent = "—";
      }
    }
    if (els.act) els.act.disabled = !!engine.done || !step;
    if (els.seek) els.seek.disabled = !step?.weekdayTag || !!engine.done;

    // S2 conflict
    const c = st?.conflict || null;
    if (c && (engine.scenario.majority || c.minorityReport || c.readingCount)) {
      els.conflict.hidden = false;
      const parts = [];
      if (c.minorityReport) parts.push("rapports maj/min");
      if (c.readingCount) parts.push(`lecture ${c.readingCount}`);
      if (c.majority)
        parts.push(`soutien ${c.support}/150 (seuil ${c.threshold})`);
      els.conflict.textContent = parts.join(" · ");
    } else if (els.conflict) {
      els.conflict.hidden = true;
    }
    if (els.amend) els.amend.hidden = !(c && c.canAdmitAmendment);
    if (els.withdraw) els.withdraw.hidden = !(c && c.canWithdraw && !engine.done);
  }

  function showVerdict(result) {
    if (!els.stamp) return;
    els.stamp.hidden = false;
    const ok = result?.verdict === "ACCORDE";
    els.stamp.className = "flow-act-panel__stamp " + (ok ? "ok" : "ko");
    els.stamp.textContent = ok ? "ACCORDÉ" : "REFUS — leçon";
    if (result?.lesson && els.lesson) {
      els.lesson.hidden = false;
      els.lesson.textContent = result.lesson;
    } else if (els.lesson) {
      els.lesson.hidden = true;
    }
    if (toast) toast(ok ? "Acte accordé" : "Acte refusé — voir leçon");
  }

  els.act?.addEventListener("click", () => {
    if (!engine || engine.done) return;
    const result = engine.attemptCurrent();
    showVerdict(result);
    refresh();
    // focus spatial
    const step = engine.currentStep || engine.scenario?.steps?.[engine.stepIndex];
    if (step?.siteId && focusPlace) {
      const room =
        step.siteId === "parlement"
          ? "plenum-gc"
          : step.siteId === "chateau"
            ? "college-ce"
            : null;
      focusPlace(step.siteId, room);
    }
  });

  els.seek?.addEventListener("click", () => {
    if (!engine) return;
    const step = engine.currentStep || engine.scenario?.steps?.[engine.stepIndex];
    if (step?.weekdayTag) {
      seekWeekday(clock, step.weekdayTag);
      refresh();
      if (els.lesson) {
        els.lesson.hidden = false;
        els.lesson.textContent = `Horloge avancée au jour « ${step.weekdayTag} ». Vous pouvez agir.`;
      }
    }
  });

  els.amend?.addEventListener("click", () => {
    if (!engine?.admitAmendment) return;
    showVerdict(engine.admitAmendment());
    refresh();
  });

  els.withdraw?.addEventListener("click", () => {
    if (!engine?.attemptWithdraw) return;
    showVerdict(engine.attemptWithdraw());
    refresh();
  });

  async function ensureProfile() {
    if (!profile) profile = await loadVaudProfile();
    return profile;
  }

  /**
   * Démarre la machine de flux pour un scénario main (id catalogue).
   * @param {string} scenarioId
   */
  async function startForScenario(scenarioId) {
    const px = getPixelScenario(scenarioId);
    const raw = SCENARIOS[scenarioId] || px?.scenario;
    if (!raw) {
      engine = null;
      panel.hidden = true;
      return null;
    }
    await ensureProfile();
    clock = new Clock({ speed: 0, day: 1 });
    engine = new FlowEngine({
      profile,
      clock,
      scenario: raw,
    });
    engine.start();
    engine.onEvent = () => refresh();
    if (els.stamp) els.stamp.hidden = true;
    if (els.lesson) els.lesson.hidden = true;
    refresh();
    return engine;
  }

  function stop() {
    engine = null;
    panel.hidden = true;
  }

  function tick(dt) {
    if (clock && clock.speed) clock.tick(dt);
    if (engine && !panel.hidden) {
      // light clock refresh
      if (els.clock) els.clock.textContent = clockHud();
    }
  }

  return {
    startForScenario,
    stop,
    refresh,
    tick,
    get engine() {
      return engine;
    },
    get clock() {
      return clock;
    },
  };
}
