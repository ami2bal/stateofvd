/**
 * Place du Château demo — dossier tour + gold under carrier.
 * TASK-095: recap #fiche removed (inspector hover/pin handles info).
 */
/* global PIXI */
import { writeQaOut } from "../engine/qa.js";
import { makeCometParticle, RAMPS } from "../engine/shapes.js";
import { footXY } from "../engine/render2d.js";

const CLICKABLE = ["parlement", "chateau"];

export function installDemo(ctx) {
  const { scene, scheduler, clock } = ctx;
  const world = scene.world;
  const state = {
    fiches: [],
    dossierVisits: [],
    goldAttachedTo: null,
    carrier: null,
    dossier: null,
    tourIndex: 0,
    tourBuildingIds: (world.dossierTour || []).slice(),
    comets: [],
  };

  // No pointertap → #fiche (TASK-095 #3). Clicks pin inspector via app.js.

  function showFiche(def) {
    // QA bookkeeping only — no DOM recap panel
    const payload = {
      id: def.id,
      label: def.label || def.displayName,
      institution: def.institutionLabel || def.hostLabel || "",
      bodyId: def.bodyId || def.hostBodyId || def.id,
    };
    state.fiches.push(payload);
    return payload;
  }

  function clickBuilding(id) {
    const entry = scene.buildingViews[id] || scene.siteViews[id];
    if (!entry) return null;
    const def = entry.def;
    return showFiche({
      id: def.id,
      label: def.label || def.displayName,
      institutionLabel: def.institutionLabel || def.hostLabel || "",
      bodyId: def.bodyId || def.hostBodyId || def.id,
    });
  }

  function buildingEntryCell(id) {
    const s =
      (world.sites || []).find((x) => x.id === id) ||
      (world.buildings || []).find((x) => x.id === id);
    if (!s) return null;
    return { gx: s.entry.gx, gy: s.entry.gy, elev: s.elev || 0, id: s.id };
  }

  function ensureCarrier() {
    if (state.carrier) return state.carrier;
    const first = buildingEntryCell(state.tourBuildingIds[0]);
    const e = scene.entities.spawnUsher(
      "huissier-dossier",
      first.gx,
      first.gy,
      0
    );
    e.speed = 4;
    e.setDossier(RAMPS.encre.base);
    state.carrier = e;
    const dos = scene.entities.spawnDossier(
      "dossier-demo",
      first.gx,
      first.gy,
      0,
      RAMPS.encre.base
    );
    dos.view.visible = false; // carried on usher
    state.dossier = dos;
    return e;
  }

  function spawnComet(from, to) {
    const a = footXY(from.gx, from.gy);
    const b = footXY(to.gx, to.gy);
    for (let i = 0; i < 6; i++) {
      const p = makeCometParticle();
      p.x = a.x;
      p.y = a.y - 8;
      p.__tx = b.x;
      p.__ty = b.y - 8;
      p.__t = i * 0.05;
      scene.tilemap.entities.addChild(p);
      state.comets.push(p);
    }
  }

  function attachGold(entity) {
    for (const en of scene.entities.list) en.setGold(false);
    entity.setGold(true);
    state.goldAttachedTo = entity.id;
  }

  /** Clear responsibility gold (terminal object / post-flow rest). */
  function clearAllGold() {
    for (const en of scene.entities.list) en.setGold(false);
    state.goldAttachedTo = null;
  }

  function goToTourStep(index) {
    const ids = state.tourBuildingIds;
    const id = ids[index % ids.length];
    const cell = buildingEntryCell(id);
    if (!cell) return;
    const carrier = ensureCarrier();
    const prev = {
      gx: carrier.gx,
      gy: carrier.gy,
    };
    attachGold(carrier);
    scene.entities.pathTo(carrier, cell.gx, cell.gy);
    spawnComet(prev, cell);
    state.dossierVisits.push(id);
    state.tourIndex = index;
  }

  function scheduleTourLoop(startSim) {
    const period = 40;
    for (let i = 0; i < 8; i++) {
      const step = i;
      scheduler.at(startSim + i * period, () => goToTourStep(step), "dossier-leg-" + step);
    }
  }

  function tickSync(dt) {
    // comet update (cosmetic)
    for (let i = state.comets.length - 1; i >= 0; i--) {
      const p = state.comets[i];
      p.__t += dt || 0.05;
      const t = Math.min(1, p.__t);
      p.x = Math.round(p.x + (p.__tx - p.x) * 0.15);
      p.y = Math.round(p.y + (p.__ty - p.y) * 0.15);
      p.alpha = 1 - t;
      if (t >= 1) {
        if (p.parent) p.parent.removeChild(p);
        state.comets.splice(i, 1);
      }
    }
  }

  // K21: no auto dossierTour (superseded by Mode Parcours 097)
  // scheduleTourLoop disabled — keep function for QA scenario demo-tour only

  async function runDemoTour() {
    // on-demand only (QA) — not continuous ambient
    state.fiches = [];
    state.dossierVisits = [];
    for (const id of CLICKABLE) clickBuilding(id);
    state.dossierVisits = [];
    for (let i = 0; i < 4; i++) {
      goToTourStep(i);
      for (let k = 0; k < 120; k++) {
        clock.tick(0.5);
        scheduler.tick(clock.simTime);
        scene.entities.update(0.5);
        tickSync(0.05);
      }
    }
    const result = {
      scenario: "demo-tour",
      fiches: state.fiches.map((f) => ({
        id: f.id,
        label: f.label,
        institution: f.institution,
      })),
      dossierVisits: state.dossierVisits.slice(),
      goldAttachedTo: state.goldAttachedTo,
      expectedTour: ["parlement", "chateau", "chancellerie", "parlement"],
    };
    writeQaOut(result);
    return result;
  }

  return {
    showFiche,
    clickBuilding,
    tickSync,
    runDemoTour,
    clearAllGold,
    attachGold,
    getState: () => state,
    CLICKABLE,
  };
}
