/**
 * inspector-data.js — RBAC fiche enrichie (TASK-096 + TASK-098 K8 + TASK-106).
 * Données FIGÉES validées par le BA / référent LGC.
 * Rôles = fonctions/mandats, JAMAIS de personnes.
 * Hiérarchie UX : bâtiment › bureau.
 * K8 : `targets: [{siteId, roomId, label}]` = graphe législatif multi-cibles.
 * K106 : `legalRefs: [{ code, art, label, url }]` — URLs legal_index.
 */
import { FK } from "../engine/theme.js";

/**
 * FlowKind (TASK-109) — typage explicite des arêtes RBAC pour couleurs stables.
 * @typedef {import('../engine/theme.js').FlowKind} FlowKind
 * @typedef {{ siteId: string, roomId?: string|null, label?: string, kind?: FlowKind }} TargetRef
 * @typedef {{ code: string, art: string, label: string, url: string }} LegalRef
 * @typedef {{
 *   roles: string[],
 *   actions: string[],
 *   cadence?: string,
 *   institutionalAction: string,
 *   target: string,
 *   targets: TargetRef[],
 *   legalRefs?: LegalRef[]
 * }} RbacSlice
 * cadence = temporalité du lieu (1 ligne ; pas un agenda d'objets)
 * A4 : `targets[]` = graphe spatial (peut être []) ; `target` string = libellé fiche uniquement.
 */

/** @deprecated use FK from theme.js — re-export for call sites */
export { FK };

/** URLs source (data_is/legal_index.json — ne pas inventer). */
export const LEGAL_URLS = {
  LGC: "https://www.lexfind.ch/tolv/232876/fr",
  LOCE: "https://www.lexfind.ch/tolv/212781/fr",
  "Cst-VD": "https://www.lexfind.ch/tolv/230660/fr",
  LEDP: "https://www.lexfind.ch/tolv/259397/fr",
};

/** @param {string} code @param {string} art @param {string} [extra] */
export function legalRef(code, art, extra) {
  const label = extra
    ? `art. ${art} ${code} — ${extra}`
    : `art. ${art} ${code}`;
  return {
    code,
    art: String(art),
    label,
    url: LEGAL_URLS[code] || LEGAL_URLS.LGC,
  };
}

/** @type {Record<string, { building: RbacSlice, rooms: Record<string, RbacSlice> }>} */
export const RBAC_FICHES = {
  parlement: {
    building: {
      roles: ["Député (150 mandats)"],
      actions: [
        "siéger au Grand Conseil",
        "voter les lois, décrets et le budget",
        "exercer la haute surveillance sur le Conseil d'État",
      ],
      cadence: "Pic le mardi (séance plénière) ; travail de mandat hors séance.",
      institutionalAction: "Pouvoir législatif — délibération et scrutin",
      target: "objets en séance du Grand Conseil",
      targets: [
        {
          siteId: "parlement",
          roomId: "plenum-gc",
          label: "Grand Conseil › Hémicycle du Grand Conseil",
          kind: FK.decision,
        },
      ],
    },
    rooms: {
      "plenum-gc": {
        roles: ["Député"],
        actions: [
          "entrer en matière",
          "débattre",
          "amender",
          "voter (loi / décret / budget)",
        ],
        cadence: "Séances plénières le mardi.",
        institutionalAction: "Décision / Scrutin → promulgation",
        target: "Conseil d'État › Chancellerie d'État",
        // K8 #5: acte adopté → promulgation/publication
        targets: [
          {
            siteId: "chateau",
            roomId: "chancellerie",
            label: "Conseil d'État › Chancellerie d'État",
            kind: FK.publication,
          },
        ],
      },
      "bureau-gc": {
        roles: ["Bureau du GC (présidence)"],
        actions: ["arrêter l'ordre du jour", "convoquer la session", "renvoyer en commission"],
        cadence: "En amont des séances du mardi (ODJ, renvois).",
        institutionalAction: "Fixe l'ordre du jour + renvoi commission",
        target: "Grand Conseil › Commissions parlementaires",
        // K8 #3: renvoi en commission (art. 106)
        targets: [
          {
            siteId: "parlement",
            roomId: "commission",
            label: "Grand Conseil › Commissions parlementaires",
            kind: FK.coordination,
          },
        ],
      },
      commission: {
        roles: ["Commissaire"],
        actions: [
          "examiner l'objet",
          "rapporter (majorité / minorité)",
        ],
        cadence: "Hors séance plénière ; avant le débat / vote en hémicycle.",
        institutionalAction: "Produit un préavis → hémicycle",
        target: "Grand Conseil › Hémicycle du Grand Conseil",
        // K8 #4: préavis → plénum (art. 94)
        targets: [
          {
            siteId: "parlement",
            roomId: "plenum-gc",
            label: "Grand Conseil › Hémicycle du Grand Conseil",
            kind: FK.controle,
          },
        ],
      },
      sgc: {
        roles: ["SGC — Secrétariat général du Grand Conseil"],
        actions: [
          "appui administratif",
          "procès-verbaux",
          "notifications",
          "recevoir les pétitions (art. 27-31)",
        ],
        cadence: "Permanent ; pic avant/après la séance du mardi.",
        institutionalAction: "Réception citoyenne + transmission",
        target: "Grand Conseil › Commissions parlementaires (pétitions art. 105)",
        // TASK-107: entrée citoyenne / pétitions → SGC → Commissions (plus Rumine)
        targets: [
          {
            siteId: "parlement",
            roomId: "commission",
            label: "Grand Conseil › Commissions parlementaires",
            kind: FK.citoyen,
          },
          {
            siteId: "parlement",
            roomId: "bureau-gc",
            label: "Grand Conseil › Bureau du Grand Conseil",
            kind: FK.coordination,
          },
        ],
      },
      "pas-perdus": {
        roles: ["Député"],
        actions: ["échanger hors séance", "préparer un débat"],
        cadence: "Hors séance — continuum informel.",
        institutionalAction: "Circulation informelle",
        target: "Grand Conseil › Hémicycle du Grand Conseil",
        targets: [
          {
            siteId: "parlement",
            roomId: "plenum-gc",
            label: "Grand Conseil › Hémicycle du Grand Conseil",
            kind: FK.decision,
          },
        ],
      },
    },
  },

  chateau: {
    building: {
      roles: ["Conseiller d'État (7 mandats)"],
      actions: [
        "gouverner collégialement",
        "proposer des projets au Grand Conseil (EMPD)",
        "exécuter lois et décrets",
      ],
      cadence: "Collège le mercredi ; préparation CSG en amont (lundi).",
      institutionalAction: "Pouvoir exécutif collégial",
      target: "Grand Conseil › Bureau",
      targets: [
        {
          siteId: "parlement",
          roomId: "bureau-gc",
          label: "Grand Conseil › Bureau",
          kind: FK.transmission,
        },
      ],
    },
    rooms: {
      "college-ce": {
        roles: ["Conseiller d'État (collège des 7)"],
        actions: [
          "délibérer",
          "décider collégialement",
          "adopter l'EMPD",
        ],
        cadence: "Séance collégiale le mercredi.",
        institutionalAction: "Décision collégiale + transmission au GC",
        target: "Grand Conseil › Bureau",
        // K8 #2: transmission du projet au GC
        targets: [
          {
            siteId: "parlement",
            roomId: "bureau-gc",
            label: "Grand Conseil › Bureau",
            kind: FK.transmission,
          },
        ],
      },
      chancellerie: {
        roles: ["Chancellerie"],
        actions: ["publier (FAO)", "sceller", "authentifier"],
        cadence: "Permanent ; pic après adoption d'acte (FAO / délai référendaire).",
        institutionalAction: "Publication FAO / sceau (Cst-VD art. 84)",
        target: "acte publié (FAO) — délai référendaire",
        // TASK-107: publication stays at Chancellerie (no Rumine)
        targets: [],
      },
      csg: {
        roles: ["CSG — Conférence des secrétaires généraux"],
        actions: [
          "coordonner",
          "préparer l'agenda du CE (Conseil d'État)",
        ],
        cadence: "Préparation typiquement le lundi.",
        institutionalAction: "Ordre du jour du CE (Conseil d'État)",
        target: "Conseil d'État › Collège du Conseil d'État",
        // K8 #1: agenda alimente le collège
        targets: [
          {
            siteId: "chateau",
            roomId: "college-ce",
            label: "Conseil d'État › Collège du Conseil d'État",
            kind: FK.coordination,
          },
        ],
      },
    },
  },

  // TASK-107: rumine removed — publication@chancellerie, pétitions@SGC/commissions
};

/** Schéma partagé des 7 départements (cabinet + SG + éventuel projet). */
function makeDeptRbac(acronym) {
  return {
    building: {
      roles: ["Chef de département (Conseiller d'État à la tête du dépt)"],
      actions: [
        "mettre en œuvre les politiques publiques du domaine",
        "porter un projet (EMPD) au collège",
      ],
      cadence: "Instruction continue ; saisine collège le mercredi.",
      institutionalAction: "Préparation et saisine de projets",
      target: "Conseil d'État › Collège du Conseil d'État",
      targets: [
        {
          siteId: "chateau",
          roomId: "college-ce",
          label: "Conseil d'État › Collège du Conseil d'État",
          kind: FK.transmission,
        },
      ],
    },
    rooms: {
      [`dep-${acronym}-cabinet`]: {
        roles: ["Chef de département"],
        actions: ["impulser", "porter le projet (EMPD) au collège"],
        cadence: "Continue ; moment collège le mercredi.",
        institutionalAction: "Saisine du CE + instruction SG",
        target: "Conseil d'État › Collège du Conseil d'État",
        // conserver Cabinet → CE + Cabinet ↔ SG
        targets: [
          {
            siteId: "chateau",
            roomId: "college-ce",
            label: "Conseil d'État › Collège du Conseil d'État",
            kind: FK.transmission,
          },
          {
            siteId: `dep-${acronym}`,
            roomId: `dep-${acronym}-sg`,
            label: `Département › SG — Secrétariat général`,
            kind: FK.instruction,
          },
        ],
      },
      [`dep-${acronym}-sg`]: {
        roles: ["SG — Secrétariat général de département"],
        actions: ["instruire le dossier", "préparer les pièces"],
        cadence: "Permanent (instruction de dossier).",
        institutionalAction: "Instruction → cabinet",
        target: "Département › Cabinet",
        targets: [
          {
            siteId: `dep-${acronym}`,
            roomId: `dep-${acronym}-cabinet`,
            label: "Département › Cabinet",
            kind: FK.instruction,
          },
        ],
      },
      [`dep-${acronym}-projet`]: {
        roles: ["Chef de département", "SG de département"],
        actions: ["instruire un projet EMPD", "coordonner les pièces"],
        cadence: "Selon calendrier du projet → collège mercredi.",
        institutionalAction: "Préparation de projet → CE",
        target: "Conseil d'État › Collège du Conseil d'État",
        targets: [
          {
            siteId: "chateau",
            roomId: "college-ce",
            label: "Conseil d'État › Collège du Conseil d'État",
            kind: FK.transmission,
          },
        ],
      },
    },
  };
}

for (const acr of ["dits", "deiep", "def", "dsas", "dcirh", "djes", "dfa"]) {
  RBAC_FICHES[`dep-${acr}`] = makeDeptRbac(acr);
}

// TASK-106 — attach legalRefs (post-107: no Rumine; pétitions@SGC, FAO@Chancellerie)
(function attachLegalRefs() {
  const L = legalRef;
  const pack = {
    parlement: {
      building: [
        L("LGC", "92", "compétences législatives"),
        L("LGC", "94", "entrée en matière"),
      ],
      rooms: {
        "plenum-gc": [
          L("LGC", "94", "entrée en matière"),
          L("LGC", "101", "3e débat"),
          L("LGC", "102", "vote définitif"),
        ],
        "bureau-gc": [
          L("LGC", "21", "composition du Bureau"),
          L("LGC", "23", "attributions du Bureau"),
        ],
        commission: [
          L("LGC", "106", "annonce et examen préalable"),
          L("LGC", "105", "pétitions"),
        ],
        sgc: [
          L("LGC", "27", "secrétariat général"),
          L("LGC", "31", "secrétaire général"),
          L("LGC", "105", "réception des pétitions"),
          L("Cst-VD", "31", "droit de pétition"),
        ],
        "pas-perdus": [L("LGC", "92", "siège du GC")],
      },
    },
    chateau: {
      building: [
        L("LOCE", "1", "pouvoir exécutif collégial"),
        L("LGC", "137", "participation du CE"),
      ],
      rooms: {
        "college-ce": [
          L("LGC", "137", "participation du CE"),
          L("LOCE", "1", "collège exécutif"),
        ],
        chancellerie: [
          L("Cst-VD", "84", "publication / délai référendaire"),
          L("LOCE", "1", "Chancellerie d'État"),
        ],
        csg: [L("LOCE", "1", "coordination / agenda du CE")],
      },
    },
  };
  for (const [sid, conf] of Object.entries(pack)) {
    const fiche = RBAC_FICHES[sid];
    if (!fiche) continue;
    if (fiche.building) fiche.building.legalRefs = conf.building;
    for (const [rid, refs] of Object.entries(conf.rooms || {})) {
      if (fiche.rooms?.[rid]) fiche.rooms[rid].legalRefs = refs;
    }
  }
  const deptBuilding = [
    L("LOCE", "1", "organisation des départements"),
    L("LGC", "120", "saisine via EMPD / mandat"),
  ];
  const deptCab = [
    L("LOCE", "1", "chef de département"),
    L("LGC", "120", "porter un projet au collège"),
  ];
  const deptSg = [L("LOCE", "1", "SG de département")];
  for (const acr of ["dits", "deiep", "def", "dsas", "dcirh", "djes", "dfa"]) {
    const fiche = RBAC_FICHES[`dep-${acr}`];
    if (!fiche) continue;
    fiche.building.legalRefs = deptBuilding;
    if (fiche.rooms[`dep-${acr}-cabinet`])
      fiche.rooms[`dep-${acr}-cabinet`].legalRefs = deptCab;
    if (fiche.rooms[`dep-${acr}-sg`])
      fiche.rooms[`dep-${acr}-sg`].legalRefs = deptSg;
    if (fiche.rooms[`dep-${acr}-projet`])
      fiche.rooms[`dep-${acr}-projet`].legalRefs = deptCab;
  }
})();

/**
 * Resolve RBAC slice for site + optional room (room overrides building).
 * @param {string} siteId
 * @param {string|null} [roomId]
 * @returns {RbacSlice|null}
 */
export function resolveRbac(siteId, roomId) {
  const pack = RBAC_FICHES[siteId];
  if (!pack) return null;
  if (roomId && pack.rooms[roomId]) return pack.rooms[roomId];
  // fuzzy room match
  if (roomId && pack.rooms) {
    const key = Object.keys(pack.rooms).find(
      (k) => roomId.includes(k) || k.includes(roomId)
    );
    if (key) return pack.rooms[key];
  }
  return pack.building;
}

/**
 * Hierarchy label for UX: « Bâtiment › Bureau ».
 */
export function hierarchyLabel(siteId, roomId, displayName, roomTitle) {
  const site =
    displayName ||
    ({
      parlement: "Grand Conseil",
      chateau: "Conseil d'État",
    }[siteId] ||
      (String(siteId).startsWith("dep-")
        ? String(siteId).replace("dep-", "").toUpperCase()
        : siteId));
  if (!roomId) return site;
  // nomenclature institutionnelle unique (carte + détail)
  // import dynamique évité : mapping aligné sur engine/room-nomenclature.js
  const roomIdLabel = {
    sgc: "SGC — Secrétariat général du Grand Conseil",
    csg: "CSG — Conférence des secrétaires généraux",
    "plenum-gc": "Hémicycle du Grand Conseil",
    "bureau-gc": "Bureau du Grand Conseil",
    commission: "Commissions parlementaires",
    "college-ce": "Collège du Conseil d'État",
    chancellerie: "Chancellerie d'État",
    "pas-perdus": "Salle des pas perdus",
  };
  // roomTitle fourni = déjà le bon libellé détail
  if (roomTitle) return `${site} › ${roomTitle}`;
  const rid = roomIdLabel[roomId] || roomId;
  return `${site} › ${rid}`;
}
