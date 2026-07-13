/**
 * S7 « Budget annuel » — multi-livrables pédagogiques.
 *
 * ★ Trois livrables liés (même session budgétaire) :
 *   1) budget de fonctionnement
 *   2) crédits d'investissement
 *   3) comptes / clôture (prise d'acte)
 * ★ Pas de référendum facultatif (Cst-VD art. 84 al. 2 b).
 * Couche de contenu — flow-engine / verdict INCHANGÉS.
 */

/** @type {object} */
export const BUDGET_ANNUEL = {
  id: "budget-annuel",
  title: "Le budget annuel",
  subtitle: "S7 — Multi-livrables : fonctionnement · investissement · comptes",
  objectId: "obj-budget-s7",
  objectType: "decret",
  objectLabel: "Paquet budgétaire annuel (3 livrables liés)",
  pilotBodyId: "dep-dfa",
  lifecycleId: "cycle-projet-acte",
  noOptionalReferendum: true,
  /** R2 : livrables pédagogiques (pas d'entités spatiales séparées) */
  livrables: [
    {
      id: "budget-fonctionnement",
      label: "Budget de fonctionnement",
      note: "Crédits de fonctionnement de l'année N+1",
    },
    {
      id: "credits-investissement",
      label: "Crédits d'investissement",
      note: "Programme d'investissement / crédits liés",
    },
    {
      id: "comptes",
      label: "Comptes",
      note: "Arrêté des comptes — prise d'acte (hors référendum)",
    },
  ],
  steps: [
    {
      id: "bud-1-dfa",
      from: "en-elaboration",
      to: "en-elaboration",
      by: "handover",
      siteId: "dep-dfa",
      actorLabel: "DFA — instruction",
      actLabel: "Préparer le paquet budgétaire (automne)",
      successLesson:
        "Le DFA instruit le **paquet** : budget de fonctionnement + crédits d'investissement (+ préparation des comptes). ★ Trois livrables, une même saison budgétaire.",
    },
    {
      id: "bud-2-csg",
      from: "en-elaboration",
      to: "saisine-commission",
      by: "handover",
      siteId: "chateau",
      fromSiteId: "dep-dfa",
      actorLabel: "CSG",
      actLabel: "Coordonner l'agenda collège",
      successLesson:
        "CSG : inscription du paquet budgétaire à l'agenda du collège (mercredi).",
    },
    {
      id: "bud-3-college",
      from: "saisine-commission",
      to: "adopte-ce",
      by: "decision",
      decisionType: "adopte",
      weekdayTag: "ce",
      siteId: "chateau",
      actorLabel: "Collège du CE",
      actLabel: "Adopter le paquet au collège",
      lessonWrongDay: "Le collège du CE siège le mercredi.",
      successLesson:
        "Le collège adopte les EMPD budgétaires (fonctionnement + investissement). Portage DFA.",
    },
    {
      id: "bud-4-saisine",
      from: "adopte-ce",
      to: "rapports-deposes",
      by: "handover",
      siteId: "parlement",
      fromSiteId: "chateau",
      actorLabel: "Chancellerie → SGC",
      actLabel: "Transmettre au Grand Conseil",
      successLesson:
        "Navette : saisine du GC pour la session budgétaire (automne / hiver).",
    },
    {
      id: "bud-5-comm",
      from: "rapports-deposes",
      to: "entree-en-matiere",
      by: "handover",
      siteId: "parlement",
      actorLabel: "Commission des finances",
      actLabel: "Examiner les livrables",
      successLesson:
        "COFI examine **chaque livrable** du paquet (fonctionnement, investissement) avant le plénum.",
    },
    {
      id: "bud-6-debats",
      from: "entree-en-matiere",
      to: "en-debats",
      by: "decision",
      decisionType: "adopte",
      weekdayTag: "gc",
      siteId: "parlement",
      actorLabel: "Plénum",
      actLabel: "Débattre le budget de fonctionnement",
      lessonWrongDay: "Le Grand Conseil siège le mardi.",
      successLesson:
        "Livrable 1 — **Budget de fonctionnement** : débats et amendements en hémicycle.",
    },
    {
      id: "bud-6b-invest",
      from: "en-debats",
      to: "en-debats",
      by: "handover",
      weekdayTag: "gc",
      siteId: "parlement",
      actorLabel: "Plénum",
      actLabel: "Débattre les crédits d'investissement",
      lessonWrongDay: "Le Grand Conseil siège le mardi.",
      successLesson:
        "Livrable 2 — **Crédits d'investissement** : programme d'investissement / crédits liés (souvent même session).",
    },
    {
      id: "bud-7-vote",
      from: "en-debats",
      to: "mise-au-point",
      by: "decision",
      decisionType: "adopte",
      weekdayTag: "gc",
      siteId: "parlement",
      actorLabel: "Plénum — scrutin",
      actLabel: "Voter le paquet budgétaire",
      lessonWrongDay: "Le Grand Conseil siège le mardi.",
      successLesson:
        "Votes sur les décrets budgétaires. ★ **Pas** de référendum facultatif (art. 84 al. 2 b — budget, comptes, crédits liés).",
      rejectAlt: {
        decisionType: "refuse",
        to: "rejete",
        actLabel: "Rejeter le budget",
        successLesson:
          "Rejet d'un livrable : crise budgétaire pédagogique — retour instruction / nouveau projet.",
      },
    },
    {
      id: "bud-7b-comptes",
      from: "mise-au-point",
      to: "mise-au-point",
      by: "handover",
      siteId: "parlement",
      actorLabel: "Plénum — comptes",
      actLabel: "Prendre acte des comptes",
      successLesson:
        "Livrable 3 — **Comptes** : le GC prend acte (pas un projet d'acte « classique »). Toujours hors référendum facultatif.",
    },
    {
      id: "bud-8-promulgue",
      from: "mise-au-point",
      to: "promulgue",
      by: "handover",
      siteId: "chateau",
      fromSiteId: "parlement",
      actorLabel: "Chancellerie d'État",
      actLabel: "Formaliser et promulguer",
      successLesson:
        "Formalisation Chancellerie. Fin du cycle multi-livrables — sans ouverture de délai référendaire facultatif.",
    },
  ],
  branches: {
    adopte: { label: "Paquet adopté → promulgation" },
    rejete: { label: "Rejet → reformulation" },
  },
};

export default BUDGET_ANNUEL;
