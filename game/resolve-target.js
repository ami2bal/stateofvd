/**
 * Résolution cible RBAC → { siteId, roomId } (P2 industrialisation).
 * Priorité : ref structurée → libellé « Bâtiment › Salle » → fallback libre minimal.
 * Remplace la chaîne regex ad hoc dans connections.js.
 */

/**
 * @typedef {{ siteId: string, roomId: string|null }} BoardLoc
 */

/** Bâtiments connus (libellés institutionnels → siteId). */
const BUILDING_HINTS = [
  {
    id: "parlement",
    match: (t) =>
      t.includes("grand conseil") ||
      t.includes("parlement") ||
      /\bgc\b/.test(t),
  },
  {
    id: "chateau",
    match: (t) =>
      t.includes("conseil d'état") ||
      t.includes("conseil d'etat") ||
      t.includes("château") ||
      t.includes("chateau") ||
      /\bce\b/.test(t),
  },
];

/**
 * Salles connues (libellés → roomId + siteId par défaut).
 * Aligné room-nomenclature / world.json.
 */
const ROOM_HINTS = [
  {
    siteId: "parlement",
    roomId: "plenum-gc",
    match: (t) =>
      t.includes("hémicycle") ||
      t.includes("hemicycle") ||
      t.includes("plénum") ||
      t.includes("plenum") ||
      t.includes("séance du gc") ||
      t.includes("seance du gc"),
  },
  {
    siteId: "parlement",
    roomId: "bureau-gc",
    match: (t) => t.includes("bureau"),
  },
  {
    siteId: "parlement",
    roomId: "commission",
    match: (t) => t.includes("commission"),
  },
  {
    siteId: "parlement",
    roomId: "sgc",
    match: (t) =>
      t.includes("sgc") ||
      (t.includes("secrétariat") && t.includes("grand conseil")) ||
      t.includes("guichet") ||
      t.includes("pétition") ||
      t.includes("petition") ||
      t.includes("grâce") ||
      t.includes("grace") ||
      t.includes("objet citoyen"),
  },
  {
    siteId: "parlement",
    roomId: "pas-perdus",
    match: (t) => t.includes("pas perdus"),
  },
  {
    siteId: "chateau",
    roomId: "college-ce",
    match: (t) =>
      t.includes("collège") ||
      t.includes("college") ||
      t.includes("salle du conseil") ||
      t.includes("séance du ce") ||
      t.includes("seance du ce"),
  },
  {
    siteId: "chateau",
    roomId: "chancellerie",
    match: (t) =>
      t.includes("chancellerie") ||
      t.includes("publication") ||
      t.includes("fao") ||
      t.includes("acte publié") ||
      t.includes("acte publie"),
  },
  {
    siteId: "chateau",
    roomId: "csg",
    match: (t) =>
      t.includes("csg") || t.includes("conférence des secrétaires"),
  },
];

/**
 * Parse « Bâtiment › Salle » (et variantes > / —).
 * @param {string} t lowercased
 * @returns {{ building: string, room: string }|null}
 */
export function parseHierarchyLabel(t) {
  const m = String(t || "").match(/^(.+?)\s*[›>／/—–-]\s*(.+)$/);
  if (!m) return null;
  return { building: m[1].trim(), room: m[2].trim() };
}

/**
 * @param {string} text lowercased
 * @returns {string|null}
 */
function matchBuilding(text) {
  for (const b of BUILDING_HINTS) {
    if (b.match(text)) return b.id;
  }
  return null;
}

/**
 * @param {string} text lowercased
 * @param {string|null} preferSite
 * @returns {BoardLoc|null}
 */
function matchRoom(text, preferSite) {
  for (const r of ROOM_HINTS) {
    if (!r.match(text)) continue;
    if (preferSite && r.siteId !== preferSite) {
      // room hint force site (hémicycle = always parlement)
      // keep r.siteId
    }
    return { siteId: r.siteId, roomId: r.roomId };
  }
  return null;
}

/**
 * Résolution cible → emplacement board.
 * @param {string|{siteId:string, roomId?:string|null, label?:string}|null|undefined} target
 * @param {string} fromSiteId
 * @returns {BoardLoc|null}
 */
export function resolveTargetLocation(target, fromSiteId) {
  if (!target) return null;

  // 1) Ref structurée K8 (chemin nominal)
  if (typeof target === "object" && target.siteId) {
    return {
      siteId: target.siteId,
      roomId: target.roomId || null,
    };
  }

  const raw = String(target);
  const t = raw.toLowerCase();

  // 2) Hiérarchie « Bâtiment › Salle »
  const hier = parseHierarchyLabel(t);
  if (hier) {
    const siteFromBuilding = matchBuilding(hier.building);
    const roomHit = matchRoom(hier.room, siteFromBuilding);
    if (roomHit) return roomHit;
    if (siteFromBuilding) {
      // bâtiment seul dans la partie salle
      const onlyBuilding = matchRoom(hier.room, siteFromBuilding);
      if (onlyBuilding) return onlyBuilding;
      return { siteId: siteFromBuilding, roomId: null };
    }
  }

  // 3) Département local (cabinet / SG / projet EMPD)
  if (String(fromSiteId || "").startsWith("dep-")) {
    if (t.includes("cabinet") || t.includes("département › cabinet")) {
      return { siteId: fromSiteId, roomId: `${fromSiteId}-cabinet` };
    }
    if (
      t.includes("dossier") ||
      t.includes("sg") ||
      t.includes("secrétariat") ||
      t.includes("secretariat")
    ) {
      return { siteId: fromSiteId, roomId: `${fromSiteId}-sg` };
    }
    if (t.includes("empd") || t.includes("projet")) {
      return { siteId: fromSiteId, roomId: `${fromSiteId}-projet` };
    }
  }

  // 4) Fallback libre : salle puis bâtiment
  const roomHit = matchRoom(t, null);
  if (roomHit) return roomHit;
  const b = matchBuilding(t);
  if (b) return { siteId: b, roomId: null };

  return null;
}
