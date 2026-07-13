/**
 * S3 « La motion » — mandat parlementaire au CE (LGC art. 120/125/111).
 * ★ Lifecycle dédié `cycle-motion` (≠ cycle-projet-acte).
 */

/** @type {object} */
export const MOTION = {
  id: "motion",
  title: "La motion",
  subtitle: "S3 — Mandat au Conseil d'État (prise en considération)",
  objectId: "obj-motion-s3",
  objectType: "motion",
  objectLabel: "Motion — demande de projet de loi/décret",
  pilotBodyId: "parlement",
  lifecycleId: "cycle-motion",
  steps: [
    {
      id: "s3-1-depot",
      from: "ebauche",
      to: "deposee",
      by: "handover",
      siteId: "parlement",
      actorLabel: "Député·e — dépôt",
      actLabel: "Déposer la motion motivée",
      successLesson:
        "La motion est déposée au plénum (art. 120 LGC). Elle expose la législation souhaitée.",
    },
    {
      id: "s3-2-renvoi",
      from: "deposee",
      to: "renvoyee-commission",
      by: "handover",
      siteId: "parlement",
      actorLabel: "Bureau → Commission",
      actLabel: "Inscrire et renvoyer en commission",
      successLesson:
        "Le Bureau inscrit la motion ; examen préalable possible en commission (art. 106/120).",
    },
    {
      id: "s3-3-prise-en-consideration",
      from: "renvoyee-commission",
      to: "prise-en-consideration",
      by: "decision",
      decisionType: "adopte",
      weekdayTag: "gc",
      siteId: "parlement",
      actorLabel: "Plénum — prise en considération",
      actLabel: "Voter la prise en considération",
      lessonWrongDay:
        "Le Grand Conseil siège le mardi. Avancez l'horloge jusqu'au mardi.",
      successLesson:
        "★ Fusible (art. 125) : le GC prend en considération la motion (totalement ou partiellement).",
      rejectAlt: {
        decisionType: "refuse",
        to: "non-prise-en-consideration",
        actLabel: "Ne pas prendre en considération",
        successLesson: "Motion non prise en considération — classée (art. 125).",
      },
    },
    {
      id: "s3-4-renvoi-ce",
      from: "prise-en-consideration",
      to: "renvoyee-au-ce",
      by: "handover",
      siteId: "chateau",
      fromSiteId: "parlement",
      actorLabel: "GC → Conseil d'État",
      actLabel: "Charger le CE de présenter un projet",
      successLesson:
        "Handover : le CE est mandaté pour présenter un projet de loi/décret (art. 120 al. 1).",
    },
    {
      id: "s3-5-delai",
      from: "renvoyee-au-ce",
      to: "reponse-deposee",
      by: "handover",
      siteId: "chateau",
      actorLabel: "CE — délai de réponse",
      actLabel: "Répondre dans le délai (art. 111)",
      successLesson:
        "Délai de réponse du CE (rapport intermédiaire à 1 an au moins sauf décision contraire — art. 111).",
      startDeadline: "delai-reponse-ce",
    },
    {
      id: "s3-6-projet-ce",
      from: "reponse-deposee",
      to: "traitee",
      by: "handover",
      siteId: "parlement",
      fromSiteId: "chateau",
      actorLabel: "CE → GC/Bureau",
      actLabel: "Présenter le projet (EMPD/EMPL)",
      successLesson:
        "Le CE présente un projet : le dossier rejoint le circuit législatif (voir S1/S6). ★ Cycle-motion clos (traitee).",
    },
  ],
  branches: {
    adopte: { label: "Prise en considération → mandat CE" },
    rejete: { label: "Non prise en considération — classée" },
    partielle: { label: "Prise partielle — mandat borné" },
  },
};

export default MOTION;
