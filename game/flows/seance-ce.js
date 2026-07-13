/**
 * S16 « Séance du Conseil d'État » — rituel collège
 * (LOCE · pratique CSG lundi → collège mercredi — Manuel §9).
 *
 * ★ Transverse : préparation CSG → collège → suite Chancellerie.
 *   Complète les « moments collège » déjà vus dans S1/S2.
 * Couche de contenu — flow-engine / verdict INCHANGÉS.
 */

/** @type {object} */
export const SEANCE_CE = {
  id: "seance-ce",
  title: "Séance du Conseil d'État",
  subtitle: "S16 — Rituel collège (CSG → collège → Chancellerie)",
  objectId: "obj-seance-ce-s16",
  objectType: "decret",
  objectLabel: "Objet type à l'ordre du collège (ex. projet d'acte)",
  pilotBodyId: "chateau",
  lifecycleId: "cycle-projet-acte",
  noPublication: true,
  sessionRitual: true,
  steps: [
    {
      id: "ss16-1-csg",
      from: "en-elaboration",
      to: "saisine-commission",
      by: "handover",
      siteId: "chateau",
      actorLabel: "CSG",
      actLabel: "Préparer l'agenda du collège",
      successLesson:
        "Conférence des secrétaires généraux (CSG) : coordination interministérielle, filtrage et préparation de l'agenda du collège (pratique administrative, hors LOCE stricte).",
    },
    {
      id: "ss16-2-dossiers",
      from: "saisine-commission",
      to: "rapports-deposes",
      by: "handover",
      siteId: "chateau",
      actorLabel: "Chancellerie / départements",
      actLabel: "Finaliser les dossiers collège",
      successLesson:
        "Dossiers finalisés (notes, projets EMPD/EMPL, décisions) avant la séance collégiale du mercredi.",
    },
    {
      id: "ss16-3-college",
      from: "rapports-deposes",
      to: "adopte-ce",
      by: "decision",
      decisionType: "adopte",
      weekdayTag: "ce",
      siteId: "chateau",
      actorLabel: "Collège des 7",
      actLabel: "Tenir la séance collégiale",
      lessonWrongDay:
        "Le collège du CE siège le mercredi. Avancez l'horloge jusqu'au mercredi.",
      successLesson:
        "Séance collégiale : les 7 membres délibèrent et décident. ★ Décision collégiale (pas monocratique).",
      rejectAlt: {
        decisionType: "refuse",
        to: "rejete",
        actLabel: "Reporter ou refuser l'objet",
        successLesson:
          "Objet reporté ou refusé en collège — retour département / reformulation.",
      },
    },
    {
      id: "ss16-4-suite",
      from: "adopte-ce",
      to: "promulgue",
      by: "handover",
      siteId: "chateau",
      actorLabel: "Chancellerie d'État",
      actLabel: "Formaliser et transmettre",
      successLesson:
        "La Chancellerie formalise la décision (procès-verbal, transmission). Si projet d'acte pour le GC : navette vers le SGC (voir S1).",
    },
  ],
  branches: {
    adopte: { label: "Décision collégiale adoptée" },
    rejete: { label: "Report / refus collège" },
  },
};

export default SEANCE_CE;
