/**
 * Pont iso-fonctionnel → modules métier de state-of-vd (flows, meta, inspector).
 * Ne duplique pas la logique : importe la source d'origine.
 */
import {
  SCENARIO_DEFS,
  SCENARIOS,
  ENTRY_ORDER,
  getScenarioDef,
  scenariosByEntry,
} from "../../game/flows/index.js";
import {
  metaForStep,
  ACTIVITY_LABEL,
  STEP_META,
} from "../../game/walkthrough-meta.js";
import {
  FICHES,
  expandTitleAcronyms,
  ACRONYM_FULL,
} from "../../game/inspector.js";
import {
  resolveRbac,
  hierarchyLabel,
  RBAC_FICHES,
  LEGAL_URLS,
} from "../../game/inspector-data.js";
import { FlowEngine, seekWeekday } from "../../game/flow-engine.js";
import { Clock } from "../../engine/clock.js";

export {
  SCENARIO_DEFS,
  SCENARIOS,
  ENTRY_ORDER,
  getScenarioDef,
  scenariosByEntry,
  metaForStep,
  ACTIVITY_LABEL,
  STEP_META,
  FICHES,
  expandTitleAcronyms,
  ACRONYM_FULL,
  resolveRbac,
  hierarchyLabel,
  RBAC_FICHES,
  LEGAL_URLS,
  FlowEngine,
  seekWeekday,
  Clock,
};

/**
 * Room id pixel pour une étape flow (siteId + meta.roomId).
 * @param {object} step
 * @param {object} [scenario]
 */
export function roomIdForStep(step, scenario) {
  if (!step) return null;
  const meta = metaForStep(step);
  if (meta?.roomId) return meta.roomId;
  const site = step.siteId || step.fromSiteId;
  if (site === "parlement") return "plenum-gc";
  if (site === "chateau") return "college-ce";
  if (site && String(site).startsWith("dep-")) {
    // préférence cellule projet (instruction)
    return `${site}-projet`;
  }
  const pilot = scenario?.pilotBodyId;
  if (pilot && String(pilot).startsWith("dep-")) return `${pilot}-projet`;
  return site || null;
}

/**
 * Convertit un scénario flow main → étapes pixel (room + récit).
 * @param {object} scenario SCENARIOS[id]
 */
export function toPixelSteps(scenario) {
  if (!scenario?.steps?.length) return [];
  return scenario.steps.map((step) => {
    const meta = metaForStep(step);
    const room = roomIdForStep(step, scenario);
    return {
      room,
      siteId: step.siteId || null,
      fromSiteId: step.fromSiteId || null,
      title: step.actLabel || meta.prose || step.id,
      body: meta.prose || step.successLesson || step.actLabel || "",
      legal: meta.legal || "—",
      activity: meta.activity || "generic",
      activityLabel: ACTIVITY_LABEL[meta.activity] || "Acte",
      weekdayTag: step.weekdayTag || null,
      rejectAlt: step.rejectAlt || null,
      successLesson: step.successLesson || null,
      lessonWrongDay: step.lessonWrongDay || null,
      ms: step.weekdayTag ? 4500 : 4000,
      raw: step,
      id: step.id,
    };
  });
}

/**
 * Catalogue pixel dérivé du catalogue main (playables + info légale).
 */
export function pixelScenarioCatalog() {
  return SCENARIO_DEFS.filter((d) => d.playable && d.scenario).map((d) => {
    const steps = toPixelSteps(d.scenario);
    return {
      id: d.id,
      short: d.short,
      label: d.label,
      entry: d.entry,
      summary: d.info?.summary || d.scenario.subtitle || "",
      conditions: d.info?.conditions || "",
      legal: d.info?.legal || "",
      legalUrl: d.info?.legalUrl || "",
      steps,
      scenario: d.scenario,
      info: d.info,
      title: d.scenario.title || d.label,
      subtitle: d.scenario.subtitle || "",
      objectLabel: d.scenario.objectLabel || "",
    };
  });
}

/**
 * @param {string} id
 */
export function getPixelScenario(id) {
  return pixelScenarioCatalog().find((s) => s.id === id) || null;
}

/**
 * Charge le profil Vaud (flow engine).
 */
export async function loadVaudProfile() {
  if (typeof window !== "undefined" && window.__SOVD_PROFILE__) {
    return window.__SOVD_PROFILE__;
  }
  const url = new URL(
    "../../model/profiles/vaud.json",
    import.meta.url
  ).href;
  const r = await fetch(url);
  if (!r.ok) throw new Error("vaud.json missing");
  return r.json();
}
