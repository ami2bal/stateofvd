/**
 * S11 « La résolution » — vœu sans effet contraignant (LGC art. 136).
 * ★ Lifecycle `cycle-resolution`.
 */

/** @type {object} */
export const RESOLUTION = {
  id: "resolution",
  title: "La résolution",
  subtitle: "S11 — Déclaration / vœu du GC (art. 136)",
  objectId: "obj-resolution-s11",
  objectType: "resolution",
  objectLabel: "Résolution — vœu du Grand Conseil",
  pilotBodyId: "parlement",
  lifecycleId: "cycle-resolution",
  noAct: true,
  noPublication: true,
  steps: [
    {
      id: "res-1-depot",
      from: "ebauche",
      to: "deposee",
      by: "handover",
      siteId: "parlement",
      actorLabel: "Député·e·s (20 soutiens)",
      actLabel: "Déposer la résolution",
      successLesson:
        "Résolution déposée avec 20 soutiens (art. 136 LGC) : déclaration ou vœu politique, sans effet contraignant.",
    },
    {
      id: "res-2-inscription",
      from: "deposee",
      to: "inscrite",
      by: "handover",
      siteId: "parlement",
      actorLabel: "Bureau / SGC",
      actLabel: "Inscrire à l'ordre du jour",
      successLesson:
        "Le Bureau inscrit la résolution ; le SGC prépare la séance (art. 136).",
    },
    {
      id: "res-3-vote",
      from: "inscrite",
      to: "adoptee",
      by: "decision",
      decisionType: "adopte",
      weekdayTag: "gc",
      siteId: "parlement",
      actorLabel: "Plénum",
      actLabel: "Débattre et voter la résolution",
      lessonWrongDay:
        "Le Grand Conseil siège le mardi. Avancez l'horloge jusqu'au mardi.",
      successLesson:
        "Le plénum adopte la résolution (vœu). ★ Ce n'est pas un projet d'acte.",
      rejectAlt: {
        decisionType: "refuse",
        to: "rejetee",
        actLabel: "Rejeter la résolution",
        successLesson: "Résolution rejetée — classée sans suite institutionnelle.",
      },
    },
    {
      id: "res-4-suivi",
      from: "adoptee",
      to: "en-suivi-ce",
      by: "handover",
      siteId: "chateau",
      fromSiteId: "parlement",
      actorLabel: "CE — suivi du vœu",
      actLabel: "Suivre le vœu (≈ 3 mois)",
      successLesson:
        "Suivi du vœu par le CE (délai indicatif ≈ 3 mois). ★ Aucune publication FAO — cycle-resolution clos.",
    },
  ],
  branches: {
    adopte: { label: "Adoption → suivi du vœu" },
    rejete: { label: "Rejet — classée" },
  },
};

export default RESOLUTION;
