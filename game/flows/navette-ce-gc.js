/**
 * S24 « Navette CE ↔ GC » (B4-2)
 * Allers-retours sur un même EMPL amendé — **monisme cantonal** :
 * GC = seul législatif ; CE = exécutif / initiateur (pas de bicaméralisme fédéral).
 * ★ Scénario only — flow-engine / verdict inchangés.
 */

/** @type {object} */
export const NAVETTE_CE_GC = {
  id: "navette-ce-gc",
  title: "EMPL — navette CE ↔ GC",
  subtitle:
    "S24 — Amendement au GC, retour au CE, 2e passage (monisme cantonal)",
  objectId: "obj-empl-navette",
  objectType: "loi",
  objectLabel: "EMPL (exposé des motifs et projet de loi) — amendé en plénum",
  pilotBodyId: "dep-dfa",
  lifecycleId: "cycle-projet-acte",
  /** garde-fou pédagogique */
  monismeCantonal: true,
  steps: [
    {
      id: "s24-1-ce",
      from: "en-elaboration",
      to: "adopte-ce",
      by: "decision",
      decisionType: "adopte",
      weekdayTag: "ce",
      siteId: "chateau",
      actorLabel: "DPT → Collège du CE",
      actLabel: "Adopter l'EMPL au collège",
      lessonWrongDay: "Le collège du CE siège le mercredi.",
      successLesson:
        "Le CE (exécutif) adopte le projet de loi. ★ Ce n'est pas une « chambre » face au GC — monisme cantonal : un seul législatif (le Grand Conseil).",
    },
    {
      id: "s24-2-navette1",
      from: "adopte-ce",
      to: "saisine-commission",
      by: "handover",
      siteId: "parlement",
      fromSiteId: "chateau",
      actorLabel: "Chancellerie → SGC",
      actLabel: "1re navette vers le Grand Conseil",
      successLesson:
        "Navette Place du Château → Parlement : le dossier saisit le GC (législatif).",
    },
    {
      id: "s24-3-commission",
      from: "saisine-commission",
      to: "rapports-deposes",
      by: "handover",
      siteId: "parlement",
      actorLabel: "Commission",
      actLabel: "Rapport (préavis d'amendement)",
      successLesson:
        "La commission propose des amendements. Le texte ne restera pas tel quel.",
    },
    {
      id: "s24-4-eem",
      from: "rapports-deposes",
      to: "entree-en-matiere",
      by: "decision",
      decisionType: "adopte",
      weekdayTag: "gc",
      siteId: "parlement",
      actorLabel: "Plénum",
      actLabel: "Entrée en matière",
      lessonWrongDay: "Le Grand Conseil siège le mardi.",
      successLesson: "Entrée en matière acceptée — les débats d'amendement s'ouvrent.",
    },
    {
      id: "s24-5-amende",
      from: "entree-en-matiere",
      to: "en-debats",
      by: "decision",
      decisionType: "adopte",
      weekdayTag: "gc",
      siteId: "parlement",
      actorLabel: "Plénum",
      actLabel: "Adopter un amendement",
      lessonWrongDay: "Le Grand Conseil siège le mardi.",
      successLesson:
        "Le GC amende le projet. ★ C'est le législatif qui fixe le texte ; le CE n'est pas une 2e chambre.",
    },
    {
      id: "s24-6-retour-ce",
      from: "en-debats",
      to: "en-elaboration",
      by: "handover",
      siteId: "chateau",
      fromSiteId: "parlement",
      actorLabel: "SGC → Chancellerie / CE",
      actLabel: "Navette retour — texte amendé au CE",
      successLesson:
        "Retour au Château : le CE est saisi du texte **amendé** (examen / position de l'exécutif), pas d'un « 2e vote de chambre ».",
    },
    {
      id: "s24-7-ce2",
      from: "en-elaboration",
      to: "adopte-ce",
      by: "decision",
      decisionType: "adopte",
      weekdayTag: "ce",
      siteId: "chateau",
      actorLabel: "Collège du CE",
      actLabel: "Prendre position sur le texte amendé",
      lessonWrongDay: "Le collège du CE siège le mercredi.",
      successLesson:
        "Le collège se positionne (accepte / propose). ★ Toujours monisme : la décision législative finale reste au GC.",
    },
    {
      id: "s24-8-navette2",
      from: "adopte-ce",
      to: "saisine-commission",
      by: "handover",
      siteId: "parlement",
      fromSiteId: "chateau",
      actorLabel: "Chancellerie → SGC",
      actLabel: "2e navette vers le Grand Conseil",
      successLesson:
        "Deuxième traversée de la place : le dossier revient au législatif pour le vote final.",
    },
    {
      id: "s24-9-vote",
      from: "saisine-commission",
      to: "mise-au-point",
      by: "decision",
      decisionType: "adopte",
      weekdayTag: "gc",
      siteId: "parlement",
      actorLabel: "Plénum — scrutin final",
      actLabel: "Vote final de la loi amendée",
      lessonWrongDay: "Le Grand Conseil siège le mardi.",
      successLesson:
        "Le GC adopte définitivement. ★ Seul le Grand Conseil légifère — le CE a initié et réagi, pas « co-légiféré » comme une 2e chambre.",
    },
    {
      id: "s24-10-fin",
      from: "mise-au-point",
      to: "promulgue",
      by: "handover",
      siteId: "chateau",
      fromSiteId: "parlement",
      actorLabel: "Chancellerie",
      actLabel: "Formaliser (suite publication / promulgation)",
      successLesson:
        "Fin S24 — navette pédagogique CE↔GC sous monisme cantonal (≠ bicaméralisme fédéral).",
    },
  ],
  branches: {
    adopte: { label: "Loi amendée adoptée après navette" },
  },
};

export default NAVETTE_CE_GC;
