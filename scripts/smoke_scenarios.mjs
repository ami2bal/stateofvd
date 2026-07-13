/**
 * Smoke QA — 19 scénarios Mode Parcours (états lifecycle + room meta + rejectAlt).
 * Usage (depuis la racine du dépôt) :
 *   node scripts/smoke_scenarios.mjs
 */
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { SCENARIOS, SCENARIO_DEFS } from "../game/flows/index.js";
import { metaForStep } from "../game/walkthrough-meta.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const profile = JSON.parse(
  readFileSync(join(__dirname, "../model/profiles/vaud.json"), "utf8")
);
const lcMap = Object.fromEntries(
  (profile.catalogues.lifecycles || []).map((l) => [
    l.id,
    new Set((l.states || []).map((s) => s.id)),
  ])
);

let errors = 0;
const branchSteps = [];

function fail(msg) {
  console.error("FAIL", msg);
  errors += 1;
}

for (const def of SCENARIO_DEFS) {
  if (!def.playable) continue;
  const sc = SCENARIOS[def.id];
  if (!sc) {
    fail(`${def.id}: playable but missing SCENARIOS entry`);
    continue;
  }
  if (sc.lifecycleId && !lcMap[sc.lifecycleId]) {
    fail(`${def.id}: unknown lifecycle ${sc.lifecycleId}`);
  }
  const states = lcMap[sc.lifecycleId];
  const steps = sc.steps || [];
  if (!steps.length) fail(`${def.id}: no steps`);
  for (const st of steps) {
    if (states) {
      if (!states.has(st.from)) fail(`${def.id}/${st.id}: from «${st.from}» not in ${sc.lifecycleId}`);
      if (!states.has(st.to)) fail(`${def.id}/${st.id}: to «${st.to}» not in ${sc.lifecycleId}`);
      if (st.rejectAlt?.to && !states.has(st.rejectAlt.to)) {
        fail(`${def.id}/${st.id}: rejectAlt.to «${st.rejectAlt.to}» not in ${sc.lifecycleId}`);
      }
    }
    const meta = metaForStep(st);
    if (!meta.roomId) fail(`${def.id}/${st.id}: missing roomId meta`);
    if (!st.siteId) fail(`${def.id}/${st.id}: missing siteId`);
    if (st.rejectAlt) branchSteps.push(`${def.short || def.id}:${st.id}`);
  }
}

const nPlay = SCENARIO_DEFS.filter((d) => d.playable).length;
console.log(
  JSON.stringify(
    {
      playable: nPlay,
      scenarios: Object.keys(SCENARIOS).length,
      branchSteps,
      errors,
      ok: errors === 0,
    },
    null,
    2
  )
);
process.exit(errors ? 1 : 0);
