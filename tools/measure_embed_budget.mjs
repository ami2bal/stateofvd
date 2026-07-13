/**
 * Mesure la taille « embarquable » State of VD (A1).
 * Usage:
 *   node proto/state-of-vd/tools/measure_embed_budget.mjs
 *   node proto/state-of-vd/tools/measure_embed_budget.mjs --gate
 *
 * Budget par défaut : 900 KiB pour le cœur JS + CSS + data critiques
 * (hors vendor Pixi — compté à part).
 */
import { readdirSync, statSync, readFileSync } from "fs";
import { join, relative, extname } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const gate = process.argv.includes("--gate");

/** KiB soft/hard pour le « cœur » (modules ES + css + world + profile). */
const BUDGET = {
  coreSoftKiB: 750,
  coreHardKiB: 900,
  vendorSoftKiB: 550,
  vendorHardKiB: 650,
};

const SKIP_DIRS = new Set([
  "attic",
  "baselines",
  "docs",
  "design",
  "node_modules",
  ".git",
]);

function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    if (name.startsWith(".")) continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) {
      if (SKIP_DIRS.has(name)) continue;
      walk(p, acc);
    } else {
      acc.push(p);
    }
  }
  return acc;
}

function kiB(n) {
  return Math.round((n / 1024) * 10) / 10;
}

const all = walk(ROOT);
const coreExt = new Set([".js", ".mjs", ".css", ".json", ".html", ".svg"]);
const vendorPaths = [];
const corePaths = [];

for (const p of all) {
  const rel = relative(ROOT, p).replace(/\\/g, "/");
  const ext = extname(p).toLowerCase();
  if (rel.includes("vendor/") || rel.endsWith("pixi.min.js")) {
    vendorPaths.push(p);
    continue;
  }
  if (!coreExt.has(ext)) continue;
  // exclude large design assets already skipped via design/
  corePaths.push(p);
}

function sum(paths) {
  return paths.reduce((a, p) => a + statSync(p).size, 0);
}

const coreBytes = sum(corePaths);
const vendorBytes = sum(vendorPaths);
const top = corePaths
  .map((p) => ({ rel: relative(ROOT, p).replace(/\\/g, "/"), bytes: statSync(p).size }))
  .sort((a, b) => b.bytes - a.bytes)
  .slice(0, 12);

const report = {
  generatedAt: new Date().toISOString(),
  core: {
    files: corePaths.length,
    bytes: coreBytes,
    kiB: kiB(coreBytes),
    softKiB: BUDGET.coreSoftKiB,
    hardKiB: BUDGET.coreHardKiB,
    withinSoft: kiB(coreBytes) <= BUDGET.coreSoftKiB,
    withinHard: kiB(coreBytes) <= BUDGET.coreHardKiB,
  },
  vendor: {
    files: vendorPaths.length,
    bytes: vendorBytes,
    kiB: kiB(vendorBytes),
    softKiB: BUDGET.vendorSoftKiB,
    hardKiB: BUDGET.vendorHardKiB,
    withinSoft: kiB(vendorBytes) <= BUDGET.vendorSoftKiB,
    withinHard: kiB(vendorBytes) <= BUDGET.vendorHardKiB,
  },
  topCore: top.map((t) => ({ path: t.rel, kiB: kiB(t.bytes) })),
  ok: kiB(coreBytes) <= BUDGET.coreHardKiB && kiB(vendorBytes) <= BUDGET.vendorHardKiB,
};

console.log(JSON.stringify(report, null, 2));

if (gate && !report.ok) {
  console.error(
    `EMBED BUDGET FAIL: core ${report.core.kiB} KiB / hard ${BUDGET.coreHardKiB} ; vendor ${report.vendor.kiB} / hard ${BUDGET.vendorHardKiB}`
  );
  process.exit(1);
}
process.exit(0);
