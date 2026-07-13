/**
 * S21 « Bureau — fixer l'ordre du jour » (B4-5)
 * Mini-parcours spatial GC : Bureau → SGC → plénum (ODJ arrêté).
 * ★ Distinct de S15 (rituel séance complet) : ici seule la décision d'agenda.
 * Couche contenu — flow-engine / verdict inchangés.
 */

/** @type {object} */
export const BUREAU_ODJ = {
  id: "bureau-odj",
  title: "Bureau — fixer l'ordre du jour",
  subtitle:
    "S21 — Mini-parcours : qui décide ce qui est débattu en séance",
  objectId: "obj-odj-bureau-s21",
  objectType: "motion",
  objectLabel: "Projet d'ordre du jour de séance du Grand Conseil",
  pilotBodyId: "parlement",
  lifecycleId: "cycle-projet-acte",
  noAct: true,
  noPublication: true,
  /** marqueur pédagogique : agenda, pas instrument de fond */
  agendaRitual: true,
  steps: [
    {
      id: "s21-1-bureau",
      from: "en-elaboration",
      to: "saisine-commission",
      by: "handover",
      siteId: "parlement",
      actorLabel: "Bureau du Grand Conseil",
      actLabel: "Arrêter le projet d'ordre du jour",
      successLesson:
        "Le Bureau fixe les objets, l'ordre et les temps de parole. ★ C'est une décision d'agenda — pas encore le débat de fond en hémicycle.",
    },
    {
      id: "s21-2-sgc",
      from: "saisine-commission",
      to: "rapports-deposes",
      by: "handover",
      siteId: "parlement",
      actorLabel: "SGC",
      actLabel: "Convoquer et préparer les dossiers",
      successLesson:
        "Le Secrétariat général convoque, assemble les dossiers et met en forme l'ODJ pour la séance.",
    },
    {
      id: "s21-3-plenum",
      from: "rapports-deposes",
      to: "entree-en-matiere",
      by: "handover",
      weekdayTag: "gc",
      siteId: "parlement",
      actorLabel: "Présidence — plénum",
      actLabel: "Ouvrir la séance et arrêter l'ODJ",
      lessonWrongDay:
        "Le Grand Conseil siège le mardi. Avancez l'horloge jusqu'au mardi.",
      successLesson:
        "En hémicycle : l'ordre du jour est adopté / acté. ★ Les objets peuvent maintenant être appelés (voir S15 pour le rituel complet de séance).",
    },
    {
      id: "s21-4-fin",
      from: "entree-en-matiere",
      to: "promulgue",
      by: "handover",
      siteId: "parlement",
      actorLabel: "SGC",
      actLabel: "ODJ figé pour la séance",
      successLesson:
        "L'agenda de la séance est fixé. Fin pédagogique S21 — la cartographie Bureau → SGC → plénum est complète.",
    },
  ],
  branches: {
    adopte: { label: "ODJ arrêté pour la séance" },
  },
};

export default BUREAU_ODJ;
