/**
 * S8 « Le postulat » — mandat d'étude au CE (LGC art. 118–119, 111).
 * ★ Lifecycle dédié `cycle-postulat` (≠ cycle-projet-acte).
 * Couche de contenu — flow-engine / verdict INCHANGÉS.
 */

/** @type {object} */
export const POSTULAT = {
  id: "postulat",
  title: "Le postulat",
  subtitle: "S8 — Mandat d'étude : le CE fait rapport (≠ motion)",
  objectId: "obj-postulat-s8",
  objectType: "postulat",
  objectLabel: "Postulat — charge d'étudier l'opportunité d'une mesure",
  pilotBodyId: "parlement",
  lifecycleId: "cycle-postulat",
  noAct: true,
  noPublication: true,
  steps: [
    {
      id: "post-1-depot",
      from: "ebauche",
      to: "depose",
      by: "handover",
      siteId: "parlement",
      actorLabel: "Député·e — dépôt",
      actLabel: "Déposer le postulat",
      successLesson:
        "Postulat déposé (art. 118 LGC) : demander d'étudier l'opportunité d'une mesure et de faire rapport — pas un projet d'acte.",
    },
    {
      id: "post-2-prise",
      from: "depose",
      to: "pris-en-consideration",
      by: "decision",
      decisionType: "adopte",
      weekdayTag: "gc",
      siteId: "parlement",
      actorLabel: "Plénum — prise en considération",
      actLabel: "Prendre en considération",
      lessonWrongDay: "Le Grand Conseil siège le mardi.",
      successLesson:
        "Prise en considération : le GC charge le CE d'étudier (≠ motion qui impose un projet).",
      rejectAlt: {
        decisionType: "refuse",
        to: "rejete",
        actLabel: "Ne pas prendre en considération",
        successLesson: "Postulat non pris en considération — classé.",
      },
    },
    {
      id: "post-3-ce",
      from: "pris-en-consideration",
      to: "en-etude-ce",
      by: "handover",
      siteId: "chateau",
      fromSiteId: "parlement",
      actorLabel: "GC → CE",
      actLabel: "Transmettre au Conseil d'État",
      successLesson:
        "Le CE est saisi pour étude et rapport (art. 118–119). Délai de réponse art. 111.",
      startDeadline: "delai-reponse-ce",
    },
    {
      id: "post-4-rapport",
      from: "en-etude-ce",
      to: "rapport-depose",
      by: "handover",
      siteId: "parlement",
      fromSiteId: "chateau",
      actorLabel: "CE → GC",
      actLabel: "Déposer le rapport d'étude",
      successLesson:
        "Le CE dépose un rapport d'étude (pas forcément un EMPD). ★ Différence clé avec la motion.",
    },
    {
      id: "post-5-cloture",
      from: "rapport-depose",
      to: "clos",
      by: "handover",
      siteId: "parlement",
      actorLabel: "Plénum — prise d'acte",
      actLabel: "Prendre acte du rapport",
      successLesson:
        "Clôture du cycle postulat : le GC prend acte. Aucune promulgation d'acte.",
    },
  ],
  branches: {
    adopte: { label: "Prise en considération → rapport CE" },
    rejete: { label: "Non prise en considération" },
  },
};

export default POSTULAT;
