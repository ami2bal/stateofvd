/**
 * S18 « Initiative populaire » — dépôt citoyen (repères Cst-VD / LGC).
 *
 * ★ Lifecycle `cycle-initiative-populaire` (préambule hors carte → SGC).
 * ★ Distinct de S13 (initiative parlementaire).
 */

/** @type {object} */
export const INITIATIVE_POPULAIRE = {
  id: "initiative-populaire",
  title: "L'initiative populaire",
  subtitle: "S18 — Dépôt citoyen → réception institutionnelle → examen",
  objectId: "obj-init-pop-s18",
  objectType: "initiative",
  objectLabel: "Initiative populaire — texte déposé",
  pilotBodyId: "parlement",
  lifecycleId: "cycle-initiative-populaire",
  citizenPreamble: true,
  steps: [
    {
      id: "ip-0-preambule",
      from: "preambule-hors-carte",
      to: "preambule-hors-carte",
      by: "handover",
      siteId: "parlement",
      actorLabel: "Préambule — hors carte",
      actLabel: "Comprendre le parcours préalable",
      successLesson:
        "Préambule : comité d'initiative, récolte de signatures, formalités hors institutions cartographiées. ★ Le système métier ne traite pas le citoyen comme acteur — on entre au dépôt institutionnel.",
    },
    {
      id: "ip-1-depot",
      from: "preambule-hors-carte",
      to: "recue-sgc",
      by: "handover",
      siteId: "parlement",
      actorLabel: "SGC — réception",
      actLabel: "Recevoir le dépôt de l'initiative",
      successLesson:
        "Dépôt reçu au Secrétariat général du Grand Conseil. ★ Point d'entrée institutionnel (même logique que pétition / grâce).",
    },
    {
      id: "ip-2-preavis",
      from: "recue-sgc",
      to: "preavisee-ce",
      by: "handover",
      siteId: "chateau",
      fromSiteId: "parlement",
      actorLabel: "CE — préavis",
      actLabel: "Rendre le préavis du CE",
      successLesson:
        "Le CE rend un préavis (délais et formes selon le type d'initiative). ★ Simplifié pédagogiquement.",
    },
    {
      id: "ip-3-examen",
      from: "preavisee-ce",
      to: "en-examen",
      by: "handover",
      siteId: "parlement",
      fromSiteId: "chateau",
      actorLabel: "Commission / Bureau",
      actLabel: "Examiner et préparer le plénum",
      successLesson:
        "Examen institutionnel (commission, rapport) avant débat en plénum — comme un objet législatif majeur.",
    },
    {
      id: "ip-4-plenum",
      from: "en-examen",
      to: "statuee-gc",
      by: "decision",
      decisionType: "adopte",
      weekdayTag: "gc",
      siteId: "parlement",
      actorLabel: "Plénum",
      actLabel: "Statuer sur l'initiative",
      lessonWrongDay:
        "Le Grand Conseil siège le mardi. Avancez l'horloge jusqu'au mardi.",
      successLesson:
        "Le GC statue (adoption, contre-projet, rejet…). Suite éventuelle = circuit d'acte ou nouvelle votation — hors détail S18. ★ Cycle-initiative-populaire clos.",
      rejectAlt: {
        decisionType: "refuse",
        to: "rejetee",
        actLabel: "Rejeter / classer",
        successLesson:
          "Initiative rejetée ou classée selon les issues prévues — fin de branche pédagogique.",
      },
    },
  ],
  branches: {
    adopte: { label: "Suite institutionnelle (acte / contre-projet…)" },
    rejete: { label: "Rejet / classement" },
  },
};

export default INITIATIVE_POPULAIRE;
