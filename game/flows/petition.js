/**
 * S5 « La pétition » — entrée citoyenne (LGC art. 105 / Cst-VD art. 31).
 * ★ Post-107 : départ = SGC, PAS Rumine.
 * ★ Obligation de RÉPONDRE (art. 105) dans toutes les issues.
 * ★ Lifecycle dédié `cycle-petition` (≠ cycle-projet-acte).
 * Couche de contenu — flow-engine/verdict INCHANGÉS.
 */

/** @type {object} */
export const PETITION = {
  id: "petition",
  title: "La pétition",
  subtitle: "S5 — Entrée citoyenne (obligation de réponse art. 105)",
  objectId: "obj-petition-s5",
  objectType: "petition",
  objectLabel: "Pétition — adressée au Grand Conseil",
  pilotBodyId: "parlement",
  lifecycleId: "cycle-petition",
  mustRespond: true,
  citizenPreamble: true,
  steps: [
    {
      id: "s5-1-depot",
      from: "ebauche",
      to: "recue-sgc",
      by: "handover",
      siteId: "parlement",
      actorLabel: "Citoyen·ne → SGC",
      actLabel: "Déposer la pétition (réception SGC)",
      successLesson:
        "Pétition adressée au GC, reçue par le SGC. Frontière citoyenne : art. 105 LGC / art. 31 Cst-VD. ★ Peuple hors géospatial.",
    },
    {
      id: "s5-2-renvoi-commission",
      from: "recue-sgc",
      to: "en-commission",
      by: "handover",
      siteId: "parlement",
      actorLabel: "Bureau → Commission des pétitions",
      actLabel: "Renvoyer en commission",
      successLesson:
        "Le Bureau renvoie la pétition à la Commission des pétitions (art. 105/106).",
    },
    {
      id: "s5-3-examen",
      from: "en-commission",
      to: "rapport-pret",
      by: "handover",
      siteId: "parlement",
      actorLabel: "Commission des pétitions",
      actLabel: "Examiner et rapporter",
      successLesson:
        "Examen en commission + rapport (prise en considération / renvoi CE / classement) — art. 105.",
    },
    {
      id: "s5-4-gc-statue",
      from: "rapport-pret",
      to: "statuee-gc",
      by: "decision",
      decisionType: "adopte",
      weekdayTag: "gc",
      siteId: "parlement",
      actorLabel: "Plénum — statue",
      actLabel: "Prendre acte et statuer",
      lessonWrongDay:
        "Le Grand Conseil siège le mardi. Avancez l'horloge jusqu'au mardi.",
      successLesson:
        "★ Le GC statue (renvoi au CE ou classement). Il est TENU de répondre au pétitionnaire (art. 105 LGC).",
      rejectAlt: {
        decisionType: "refuse",
        to: "classee",
        actLabel: "Classer (réponse motivée)",
        successLesson:
          "Classement avec réponse motivée — l'obligation de répondre demeure (art. 105).",
      },
    },
    {
      id: "s5-5-reponse-ce",
      from: "statuee-gc",
      to: "en-etude-ce",
      by: "handover",
      siteId: "chateau",
      fromSiteId: "parlement",
      actorLabel: "CE — étude / réponse",
      actLabel: "Étudier et répondre (délai art. 111)",
      successLesson:
        "Si renvoi au CE : étude et réponse dans le délai (art. 111).",
    },
    {
      id: "s5-6-reponse-petitionnaire",
      from: "en-etude-ce",
      to: "reponse-notifiee",
      by: "handover",
      siteId: "parlement",
      fromSiteId: "chateau",
      actorLabel: "SGC — clôture",
      actLabel: "Notifier la réponse au pétitionnaire",
      successLesson:
        "Réponse transmise au pétitionnaire via le SGC. Obligation art. 105 clôturée — cycle-petition terminé.",
    },
  ],
  branches: {
    renvoi_ce: { label: "Prise en considération / renvoi CE → réponse" },
    classement: { label: "Classement — réponse motivée (obligation demeure)" },
  },
};

export default PETITION;
