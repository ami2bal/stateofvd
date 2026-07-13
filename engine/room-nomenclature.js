/**
 * Nomenclature institutionnelle des salles — source unique carte + fiche détail.
 *
 * Principes (Canton de Vaud / institutions parlementaires-exécutives) :
 * - Carte : libellé court ou acronyme courant (lisibilité zoom).
 * - Détail : nom institutionnel complet (jamais d’acronyme nu sans développement).
 * - Hémicycle = pièce physique du GC (rôle hemicycle) ; « plénum » = mode de séance.
 * - « Salle des pas perdus » = terme institutionnel (pas « Hall »).
 */

/**
 * @typedef {{ short: string, full: string }} RoomName
 */

/** @type {Record<string, RoomName>} */
export const ROOM_NOMENCLATURE = {
  // Grand Conseil — Parlement
  "plenum-gc": {
    short: "Hémicycle",
    full: "Hémicycle du Grand Conseil",
  },
  "bureau-gc": {
    short: "Bureau",
    full: "Bureau du Grand Conseil",
  },
  commission: {
    short: "Commissions",
    full: "Commissions parlementaires",
  },
  sgc: {
    short: "SGC",
    full: "Secrétariat général du Grand Conseil",
  },
  "pas-perdus": {
    short: "Pas perdus",
    full: "Salle des pas perdus",
  },
  // Conseil d'État — Château
  "college-ce": {
    short: "Collège",
    full: "Collège du Conseil d'État",
  },
  csg: {
    short: "CSG",
    full: "Conférence des secrétaires généraux",
  },
  chancellerie: {
    short: "Chancellerie",
    full: "Chancellerie d'État",
  },
  // éventuels autres
  "guichet-citoyen": {
    short: "Guichet",
    full: "Guichet citoyen",
  },
  publication: {
    short: "FAO",
    full: "Publication — Feuille des avis officiels (FAO)",
  },
};

/**
 * Salles de département (id : dep-xxx-cabinet|sg|projet).
 * @param {string} roomId
 * @returns {RoomName|null}
 */
export function deptRoomName(roomId) {
  if (!roomId || !/^dep-[a-z]+-/.test(roomId)) return null;
  const short = roomId.replace(/^dep-[a-z]+-/, "");
  if (short === "cabinet") {
    return {
      short: "Cabinet",
      full: "Cabinet du chef de département",
    };
  }
  if (short === "sg") {
    return {
      short: "SG",
      full: "Secrétariat général",
    };
  }
  if (short === "projet") {
    return {
      short: "EMPD",
      full: "Cellule EMPD — exposé des motifs et projet de décret",
    };
  }
  return null;
}

/**
 * @param {string|null|undefined} roomId
 * @param {string} [fallbackFull] label brut world.json
 * @returns {RoomName}
 */
export function roomName(roomId, fallbackFull) {
  if (roomId && ROOM_NOMENCLATURE[roomId]) {
    return { ...ROOM_NOMENCLATURE[roomId] };
  }
  const dep = deptRoomName(roomId || "");
  if (dep) return dep;
  const f = String(fallbackFull || roomId || "").trim();
  // heuristiques sur libellés world si id inconnu
  const lower = f.toLowerCase();
  if (lower.includes("hémicycle") || lower.includes("plénum")) {
    return {
      short: "Hémicycle",
      full: f.includes("Grand Conseil") ? f : "Hémicycle du Grand Conseil",
    };
  }
  if (lower.includes("pas perdus")) {
    return { short: "Pas perdus", full: "Salle des pas perdus" };
  }
  if (lower.includes("secrétariat général") && lower.includes("grand conseil")) {
    return {
      short: "SGC",
      full: "Secrétariat général du Grand Conseil",
    };
  }
  if (lower.includes("conférence des secrétaires")) {
    return {
      short: "CSG",
      full: "Conférence des secrétaires généraux",
    };
  }
  if (lower.includes("chancellerie")) {
    return { short: "Chancellerie", full: "Chancellerie d'État" };
  }
  if (lower.includes("bureau") && lower.includes("grand conseil")) {
    return { short: "Bureau", full: "Bureau du Grand Conseil" };
  }
  if (lower.includes("commission")) {
    return { short: "Commissions", full: "Commissions parlementaires" };
  }
  if (lower.includes("collège") || lower.includes("salle du conseil")) {
    return { short: "Collège", full: "Collège du Conseil d'État" };
  }
  if (lower.includes("empd")) {
    return {
      short: "EMPD",
      full: f.length > 8 ? f : "Cellule EMPD — exposé des motifs et projet de décret",
    };
  }
  if (!f) return { short: roomId || "?", full: roomId || "?" };
  // libellé déjà court
  if (f.length <= 14) return { short: f, full: f };
  const parts = f.split(/\s+/).filter(Boolean);
  return {
    short: parts[0].length <= 12 ? parts[0] : `${parts[0].slice(0, 10)}…`,
    full: f,
  };
}

/** Libellé carte (court / acronyme courant). */
export function roomLabelShort(roomId, fallbackFull) {
  return roomName(roomId, fallbackFull).short;
}

/** Libellé fiche détail (nom institutionnel complet). */
export function roomLabelFull(roomId, fallbackFull) {
  return roomName(roomId, fallbackFull).full;
}

/**
 * Titre détail : si short ≠ full, affiche « short — full » pour les acronymes,
 * sinon le nom complet seul.
 * @param {string|null|undefined} roomId
 * @param {string} [fallbackFull]
 */
export function roomLabelDetail(roomId, fallbackFull) {
  const { short, full } = roomName(roomId, fallbackFull);
  // acronyme / sigle court → « SIGLE — nom complet »
  if (/^[A-Z]{2,8}$/.test(short) && full && !full.startsWith(short)) {
    if (full.includes(short)) return full;
    return `${short} — ${full}`;
  }
  // short déjà contenu dans full
  if (full && (full === short || full.startsWith(short))) return full;
  return full || short;
}
