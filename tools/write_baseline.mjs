/**
 * Fige un baseline machine-readable (C2).
 * Usage: node proto/state-of-vd/tools/write_baseline.mjs [label]
 * Default label = date ISO day.
 */
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, statSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { createHash } from "crypto";
import { SCENARIOS, SCENARIO_DEFS } from "../game/flows/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const label = process.argv[2] || new Date().toISOString().slice(0, 10);
const outDir = join(ROOT, "baselines", label);
mkdirSync(outDir, { recursive: true });

function sha256(path) {
  const buf = readFileSync(path);
  return createHash("sha256").update(buf).digest("hex");
}

function fileMeta(rel) {
  const abs = join(ROOT, rel);
  const st = statSync(abs);
  return {
    path: rel.replace(/\\/g, "/"),
    bytes: st.size,
    sha256: sha256(abs),
  };
}

const catalog = SCENARIO_DEFS.map((d) => ({
  id: d.id,
  short: d.short,
  label: d.label,
  entry: d.entry,
  playable: d.playable,
  steps: SCENARIOS[d.id]?.steps?.length || 0,
  lifecycleId: SCENARIOS[d.id]?.lifecycleId || null,
  branches: (SCENARIOS[d.id]?.steps || []).filter((s) => s.rejectAlt).length,
}));

const tracked = [
  "model/COVERAGE.md",
  "model/coverage-matrix.json",
  "model/profiles/vaud.json",
  "data/world.json",
  "game/flows/index.js",
  "game/inspector-data.js",
  "game/resolve-target.js",
  "engine/theme.js",
  "engine/room-nomenclature.js",
  "ARCHITECTURE.md",
];

const files = tracked.map((p) => {
  try {
    return fileMeta(p);
  } catch (e) {
    return { path: p, error: String(e.message || e) };
  }
});

// copies utiles
try {
  copyFileSync(join(ROOT, "model/COVERAGE.md"), join(outDir, "COVERAGE.md"));
  copyFileSync(
    join(ROOT, "model/coverage-matrix.json"),
    join(outDir, "coverage-matrix.json")
  );
} catch (e) {
  console.warn("copy coverage failed", e.message);
}

writeFileSync(
  join(outDir, "scenario-catalog.json"),
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      playable: catalog.filter((c) => c.playable).length,
      totalDefs: catalog.length,
      scenarios: catalog,
    },
    null,
    2
  ),
  "utf8"
);

const manifest = {
  label,
  generatedAt: new Date().toISOString(),
  note:
    "Baseline State of VD — ne pas modifier à la main. Régénérer via tools/write_baseline.mjs",
  playableScenarios: catalog.filter((c) => c.playable).length,
  scenarioKeys: Object.keys(SCENARIOS).sort(),
  files,
  kpis: {
    walkthroughApproxBytes: fileMeta("game/walkthrough.js").bytes,
    appApproxBytes: fileMeta("app.js").bytes,
    qaScenariosBytes: fileMeta("game/qa-scenarios.js").bytes,
  },
};

writeFileSync(join(outDir, "MANIFEST.json"), JSON.stringify(manifest, null, 2), "utf8");
writeFileSync(
  join(ROOT, "baselines/LATEST.txt"),
  `${label}\n`,
  "utf8"
);

console.log(
  JSON.stringify(
    {
      ok: true,
      outDir: `baselines/${label}`,
      playable: manifest.playableScenarios,
      files: files.length,
    },
    null,
    2
  )
);
