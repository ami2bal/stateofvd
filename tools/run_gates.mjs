/**
 * Runner de gates machine State of VD (A1 + A2 + unit + A4 + baseline check).
 * Usage (racine du dépôt ou depuis tools/) :
 *   node tools/run_gates.mjs
 */
import { spawnSync } from "child_process";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { existsSync, readFileSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const node = process.execPath;

const gates = [
  { id: "A1-embed", args: [join(ROOT, "tools/measure_embed_budget.mjs"), "--gate"] },
  { id: "A2-smoke", args: [join(ROOT, "scripts/smoke_scenarios.mjs")] },
  { id: "A4-targets", args: [join(ROOT, "tools/audit_structured_targets.mjs")] },
  { id: "unit-resolve", args: [join(ROOT, "tools/test_resolve_target.mjs")] },
  { id: "unit-flowkind", args: [join(ROOT, "tools/test_flow_kind.mjs")] },
  { id: "unit-rooms", args: [join(ROOT, "tools/test_room_nomenclature.mjs")] },
  { id: "unit-camera", args: [join(ROOT, "tools/test_camera_fit.mjs")] },
];

let failed = 0;
const results = [];

for (const g of gates) {
  const r = spawnSync(node, g.args, {
    encoding: "utf8",
    cwd: join(ROOT, "../.."),
  });
  const ok = r.status === 0;
  if (!ok) failed += 1;
  results.push({
    id: g.id,
    ok,
    status: r.status,
    tail: (r.stdout || r.stderr || "").trim().split(/\r?\n/).slice(-4).join(" | "),
  });
  console.log(ok ? `PASS ${g.id}` : `FAIL ${g.id}`);
  if (!ok && r.stdout) console.log(r.stdout.slice(-800));
  if (!ok && r.stderr) console.error(r.stderr.slice(-800));
}

// C2 soft-check : baseline LATEST exists
const latestPath = join(ROOT, "baselines/LATEST.txt");
let baselineOk = false;
if (existsSync(latestPath)) {
  const label = readFileSync(latestPath, "utf8").trim();
  const manifest = join(ROOT, "baselines", label, "MANIFEST.json");
  baselineOk = existsSync(manifest);
  results.push({ id: "C2-baseline", ok: baselineOk, label });
  console.log(baselineOk ? `PASS C2-baseline (${label})` : `FAIL C2-baseline (${label})`);
  if (!baselineOk) failed += 1;
} else {
  results.push({ id: "C2-baseline", ok: false });
  console.log("FAIL C2-baseline (no LATEST.txt)");
  failed += 1;
}

const summary = { ok: failed === 0, failed, results };
console.log(JSON.stringify(summary, null, 2));
process.exit(failed ? 1 : 0);
