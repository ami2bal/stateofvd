/**
 * S2 « EMPD — crédit d'ouvrage qui fâche » — flux à conflit (cycle-projet-acte).
 * EMPD = Exposé des motifs et projet de décret (véhicule CE → GC).
 * Substance = crédit d'ouvrage > 2 mio → majorité absolue des membres (art. 102 LGC).
 * 3 fins : promulgue | rejete | retire. Déterministe (pas de Math.random).
 */

/** Seuil figé art. 102 — majorité absolue des 150 membres. */
export const ABSOLUTE_MEMBERS_THRESHOLD = 76;
export const GC_MEMBERS = 150;

/**
 * Soutien de base et modificateurs (déterministes).
 * 72 − 8 (minorité) = 64 < 76 → rejet sans amendement
 * 64 + 12 (amendement) = 76 ≥ 76 → adoption avec amendement
 */
export const SUPPORT = {
  base: 72,
  minorityReport: -8,
  amendmentAdmitted: 12,
};

/**
 * États où le CE peut retirer (art. 137 al. 4 — jusqu'au vote définitif).
 * Pas depuis vote-final ni au-delà.
 */
export const WITHDRAW_STATES = [
  "en-elaboration",
  "adopte-ce",
  "saisine-commission",
  "rapports-deposes",
  "entree-en-matiere",
  "en-debats",
];

/** @type {object} */
export const CREDIT_QUI_FACHE = {
  id: "credit-qui-fache",
  title: "EMPD — crédit d'ouvrage qui fâche",
  subtitle:
    "Exposé des motifs et projet de décret — crédit d'ouvrage > 2 MCHF (majorité absolue art. 102 LGC)",
  objectId: "obj-credit-ouvrage-dsas",
  objectType: "decret",
  objectLabel:
    "EMPD (exposé des motifs et projet de décret) — crédit d'ouvrage 45 MCHF (fictif)",
  pilotBodyId: "dep-dsas",
  lifecycleId: "cycle-projet-acte",
  amountMio: 45,
  majority: "absolute-members",
  majorityThreshold: ABSOLUTE_MEMBERS_THRESHOLD,
  members: GC_MEMBERS,
  support: SUPPORT,
  withdrawStates: WITHDRAW_STATES,
  steps: [
    {
      id: "s2-1-adopte-ce",
      from: "en-elaboration",
      to: "adopte-ce",
      by: "decision",
      decisionType: "adopte",
      weekdayTag: "ce",
      siteId: "chateau",
      actorLabel: "DSAS → Collège du Conseil d'État",
      actLabel: "Présenter l'EMPD de crédit d'ouvrage au collège",
      lessonWrongDay:
        "Le collège du CE siège le mercredi. Avancez l'horloge jusqu'au mercredi.",
      successLesson:
        "Le collège adopte l'EMPD (projet de décret de crédit d'ouvrage). Saisine à préparer.",
    },
    {
      id: "s2-2-saisine",
      from: "adopte-ce",
      to: "saisine-commission",
      by: "handover",
      siteId: "parlement",
      fromSiteId: "chateau",
      actorLabel: "Chancellerie → SGC",
      actLabel: "Transmettre au Grand Conseil (navette)",
      successLesson: "Navette : le dossier arrive au Secrétariat du Grand Conseil.",
    },
    {
      id: "s2-3-rapports",
      from: "saisine-commission",
      to: "rapports-deposes",
      by: "handover",
      siteId: "parlement",
      actorLabel: "Commission du Grand Conseil",
      actLabel: "Déposer les rapports (majorité + minorité)",
      minorityReport: true,
      successLesson:
        "Rapport de majorité et rapport de minorité déposés — le vote s'annonce serré.",
    },
    {
      id: "s2-4-eem",
      from: "rapports-deposes",
      to: "entree-en-matiere",
      by: "decision",
      decisionType: "adopte",
      weekdayTag: "gc",
      siteId: "parlement",
      actorLabel: "Plénum du Grand Conseil",
      actLabel: "Voter l'entrée en matière",
      lessonWrongDay: "Le Grand Conseil siège le mardi.",
      successLesson: "Entrée en matière acceptée (de justesse).",
      // alternate for reject branch at EEM:
      rejectAlt: {
        to: "rejete",
        decisionType: "non-entree-en-matiere",
        actLabel: "Refuser l'entrée en matière",
        successLesson: "Non-entrée en matière — projet rejeté.",
      },
    },
    {
      id: "s2-5-debats",
      from: "entree-en-matiere",
      to: "en-debats",
      by: "decision",
      decisionType: "adopte",
      weekdayTag: "gc",
      siteId: "parlement",
      actorLabel: "Plénum du Grand Conseil",
      actLabel: "Ouvrir les débats (2e lecture)",
      lessonWrongDay: "Les débats se tiennent un mardi de séance du Grand Conseil.",
      successLesson: "Deuxième débat ouvert. Un amendement peut encore être admis.",
      opensDebates: true,
    },
    {
      id: "s2-6-vote-final",
      from: "en-debats",
      to: "vote-final",
      by: "decision",
      decisionType: "adopte",
      weekdayTag: "gc",
      siteId: "parlement",
      actorLabel: "Plénum du Grand Conseil",
      actLabel: "Clore les débats et mettre au vote",
      lessonWrongDay: "Le vote final a lieu un mardi de séance.",
      successLesson: "Le dossier est mis au vote final (scrutin à majorité absolue).",
    },
    {
      id: "s2-7-scrutin",
      from: "vote-final",
      to: "mise-au-point",
      by: "decision",
      decisionType: "adopte",
      weekdayTag: "gc",
      siteId: "parlement",
      actorLabel: "Plénum — scrutin (majorité absolue des membres)",
      actLabel: "Scrutin final (≥ 76 / 150)",
      lessonWrongDay: "Le scrutin a lieu un mardi de séance du Grand Conseil.",
      successLesson:
        "Majorité absolue atteinte. Texte adopté (évent. amendé) — mise au point.",
      qualifiedVote: true,
      majority: "absolute-members",
      majorityThreshold: ABSOLUTE_MEMBERS_THRESHOLD,
      rejectAlt: {
        to: "rejete",
        decisionType: "refuse",
        actLabel: "Scrutin final — refus",
        successLesson: "Majorité absolue non atteinte — projet rejeté.",
      },
    },
    {
      id: "s2-8-publication",
      from: "mise-au-point",
      to: "publie-delai-referendaire",
      by: "handover",
      siteId: "chateau",
      fromSiteId: "parlement",
      actorLabel: "Chancellerie — publication FAO",
      actLabel: "Mettre au point et publier",
      successLesson: "Texte publié (Chancellerie / FAO). Le délai référendaire commence.",
      startDeadline: "delai-referendaire",
    },
    {
      id: "s2-9-promulgue",
      from: "publie-delai-referendaire",
      to: "promulgue",
      by: "handover",
      siteId: "chateau",
      actorLabel: "Chancellerie / FAO",
      actLabel: "Promulguer",
      successLesson: "L'acte est promulgué. Fin du parcours S2 (adopté).",
    },
  ],
  /**
   * Branches for autoplay / validate_scenario.
   * - adopte: amendement + scrutin ≥ 76 → promulgue
   * - rejete: pas d'amendement → soutien 64 < 76 → refuse au scrutin
   * - retire: retrait CE en en-debats (pré vote-final)
   */
  branches: {
    adopte: {
      id: "adopte",
      finalState: "promulgue",
      admitAmendment: true,
      finalDecision: "adopte",
      withdrawAt: null,
    },
    rejete: {
      id: "rejete",
      finalState: "rejete",
      admitAmendment: false,
      finalDecision: "refuse",
      withdrawAt: null,
    },
    retire: {
      id: "retire",
      finalState: "retire",
      admitAmendment: false,
      finalDecision: null,
      withdrawAt: "en-debats",
    },
  },
};

export default CREDIT_QUI_FACHE;
