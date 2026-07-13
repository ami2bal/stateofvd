/**
 * S20 « EMPD — non-entrée en matière » (B4-4)
 * Parcours dédié : le projet meurt au vote d'entrée en matière (art. 94 LGC).
 * ★ Nominal = rejet (pas une branche optionnelle cachée dans S2).
 * Couche contenu — flow-engine / verdict inchangés.
 */

/** @type {object} */
export const NON_ENTREE_EN_MATIERE = {
  id: "non-entree-en-matiere",
  title: "EMPD — non-entrée en matière",
  subtitle:
    "S20 — Le projet meurt en plénum : refus d'entrée en matière (classement)",
  objectId: "obj-empd-non-eem",
  objectType: "decret",
  objectLabel:
    "EMPD (exposé des motifs et projet de décret) — objet classé sans débat de fond",
  pilotBodyId: "dep-dsas",
  lifecycleId: "cycle-projet-acte",
  /** fin pédagogique = rejet (walkthrough lit to terminal) */
  endOutcome: "reject",
  steps: [
    {
      id: "s20-1-adopte-ce",
      from: "en-elaboration",
      to: "adopte-ce",
      by: "decision",
      decisionType: "adopte",
      weekdayTag: "ce",
      siteId: "chateau",
      actorLabel: "Département → Collège du CE",
      actLabel: "Adopter l'EMPD au collège",
      lessonWrongDay:
        "Le collège du CE siège le mercredi. Avancez l'horloge jusqu'au mercredi.",
      successLesson:
        "Le collège adopte l'EMPD. Rien n'est encore acquis : le Grand Conseil peut refuser d'entrer en matière.",
    },
    {
      id: "s20-2-saisine",
      from: "adopte-ce",
      to: "saisine-commission",
      by: "handover",
      siteId: "parlement",
      fromSiteId: "chateau",
      actorLabel: "Chancellerie → SGC",
      actLabel: "Transmettre au Grand Conseil (navette)",
      successLesson:
        "Navette : le dossier arrive au Secrétariat du Grand Conseil puis en commission.",
    },
    {
      id: "s20-3-rapports",
      from: "saisine-commission",
      to: "rapports-deposes",
      by: "handover",
      siteId: "parlement",
      actorLabel: "Commission du Grand Conseil",
      actLabel: "Déposer le rapport (préavis défavorable)",
      successLesson:
        "La commission rapporte — le climat politique est hostile. Le plénum va trancher l'entrée en matière.",
    },
    {
      id: "s20-4-non-eem",
      from: "rapports-deposes",
      to: "rejete",
      by: "decision",
      decisionType: "non-entree-en-matiere",
      weekdayTag: "gc",
      siteId: "parlement",
      actorLabel: "Plénum du Grand Conseil",
      actLabel: "Refuser l'entrée en matière",
      lessonWrongDay: "Le Grand Conseil siège le mardi.",
      successLesson:
        "Non-entrée en matière (art. 94 LGC) : le Grand Conseil refuse de traiter l'objet. ★ Le projet est classé — pas de débats de fond, pas de promulgation. Fin ✕.",
    },
  ],
  branches: {
    rejete: {
      id: "rejete",
      finalState: "rejete",
      label: "Non-entrée en matière — projet classé",
    },
  },
};

export default NON_ENTREE_EN_MATIERE;
