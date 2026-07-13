/**
 * A4 — gate : cibles RBAC spatiales 100 % structurées.
 * Usage: node proto/state-of-vd/tools/audit_structured_targets.mjs
 *
 * Règles :
 *  - Si `targets` est un tableau → chemin structuré (vide = zéro lien spatial, OK).
 *  - Si `targets` est absent et `target` string résout en lieu → FAIL (doit migrer).
 *  - Si `target` string ne résout pas → libellé purement affichage, OK.
 */
import { RBAC_FICHES } from "../game/inspector-data.js";
import { resolveTargetLocation } from "../game/resolve-target.js";

let errors = 0;
const report = { structured: 0, emptyTargets: 0, labelOnly: 0, legacyStringSpatial: [] };

function fail(msg) {
  console.error("FAIL", msg);
  errors += 1;
}

function auditSlice(path, slice, fromSiteId) {
  if (!slice) return;
  const hasTargetsProp = Object.prototype.hasOwnProperty.call(slice, "targets");
  if (hasTargetsProp && Array.isArray(slice.targets)) {
    if (slice.targets.length === 0) {
      report.emptyTargets += 1;
    } else {
      report.structured += slice.targets.length;
      for (const t of slice.targets) {
        if (!t || typeof t !== "object" || !t.siteId) {
          fail(`${path}: target entry without siteId — ${JSON.stringify(t)}`);
        }
      }
    }
    return;
  }
  // Pas de targets[] : string seule
  if (typeof slice.target === "string" && slice.target.trim()) {
    const loc = resolveTargetLocation(slice.target, fromSiteId);
    if (loc) {
      report.legacyStringSpatial.push({ path, target: slice.target, loc });
      fail(
        `${path}: spatial string target without targets[] — «${slice.target}» → ${loc.siteId}/${loc.roomId || ""}`
      );
    } else {
      report.labelOnly += 1;
    }
  }
}

for (const [sid, pack] of Object.entries(RBAC_FICHES || {})) {
  auditSlice(`${sid}.building`, pack.building, sid);
  for (const [rid, slice] of Object.entries(pack.rooms || {})) {
    auditSlice(`${sid}.rooms.${rid}`, slice, sid);
  }
}

const out = {
  ...report,
  legacyStringSpatial: report.legacyStringSpatial,
  errors,
  ok: errors === 0,
};
console.log(JSON.stringify(out, null, 2));
process.exit(errors ? 1 : 0);
