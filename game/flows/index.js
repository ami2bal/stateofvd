/**
 * Catalogue unique des scénarios Mode Parcours.
 * Groupés par point d'entrée institutionnel (DPT · CE · GC · CIT).
 * Chaque entrée : info hover (résumé, conditions, légal).
 */
import { PETIT_CREDIT } from "./petit-credit.js";
import { CREDIT_QUI_FACHE } from "./credit-qui-fache.js";
import { MOTION } from "./motion.js";
import { INTERPELLATION } from "./interpellation.js";
import { PETITION } from "./petition.js";
import { POSTULAT } from "./postulat.js";
import { SIMPLE_QUESTION } from "./simple-question.js";
import { QUESTION_ORALE } from "./question-orale.js";
import { EMPL_LOI } from "./empl-loi.js";
import { BUDGET_ANNUEL } from "./budget-annuel.js";
import { RESOLUTION } from "./resolution.js";
import { DETERMINATION } from "./determination.js";
import { INITIATIVE } from "./initiative.js";
import { DEMANDE_GRACE } from "./demande-grace.js";
import { SEANCE_GC } from "./seance-gc.js";
import { SEANCE_CE } from "./seance-ce.js";
import { REFERENDUM } from "./referendum.js";
import { INITIATIVE_POPULAIRE } from "./initiative-populaire.js";
import { REVISION_CONSTITUTIONNELLE } from "./revision-constitutionnelle.js";
import { NON_ENTREE_EN_MATIERE } from "./non-entree-en-matiere.js";
import { BUREAU_ODJ } from "./bureau-odj.js";
import { DELAI_REFERENDAIRE } from "./delai-referendaire.js";
import { URGENCE } from "./urgence.js";
import { NAVETTE_CE_GC } from "./navette-ce-gc.js";

/**
 * @typedef {'dpt'|'ce'|'gc'|'citoyen'} EntryPoint
 * @typedef {{
 *   summary: string,
 *   conditions: string,
 *   legal: string,
 *   legalUrl?: string
 * }} ScenarioInfo
 * @typedef {{
 *   id: string,
 *   short: string,
 *   label: string,
 *   entry: EntryPoint,
 *   playable: boolean,
 *   scenario: object|null,
 *   info: ScenarioInfo
 * }} ScenarioDef
 */

const LGC = "https://www.lexfind.ch/tolv/232876/fr";
const CST = "https://www.lexfind.ch/tolv/230660/fr";

/** Ordre d'affichage des groupes dans le drawer */
export const ENTRY_ORDER = [
  {
    id: "dpt",
    label: "Département",
    hint: "Instruction · saisine de projets",
  },
  {
    id: "ce",
    label: "Conseil d'État",
    hint: "Collège · Chancellerie · publication",
  },
  {
    id: "gc",
    label: "Grand Conseil",
    hint: "Instruments · délibération · contrôle",
  },
  {
    id: "citoyen",
    label: "Citoyen / tiers",
    hint: "Saisine hors État · parcours dès l’institution d’accueil",
  },
];

/**
 * Catalogue complet (jouables + planifiés sans steps).
 * @type {ScenarioDef[]}
 */
export const SCENARIO_DEFS = [
  // ── DPT ──
  {
    id: "petit-credit",
    short: "S1",
    label: "EMPD — petit crédit",
    entry: "dpt",
    playable: true,
    scenario: PETIT_CREDIT,
    info: {
      summary:
        "Tutoriel : un crédit d'investissement simple suit le cycle projet d'acte (décret) du département au CE puis au GC jusqu'à la promulgation.",
      conditions:
        "Golden path (adoption). Collège le mercredi, GC le mardi. Montant sous les seuils de majorité qualifiée.",
      legal: "LGC art. 92 (projet d'acte) · circuit descendant art. 93–102, 139, 152",
      legalUrl: LGC,
    },
  },
  {
    id: "credit-qui-fache",
    short: "S2",
    label: "EMPD — crédit d'ouvrage",
    entry: "dpt",
    playable: true,
    scenario: CREDIT_QUI_FACHE,
    info: {
      summary:
        "Crédit d'ouvrage élevé : tension politique, rapports maj/min, majorité absolue des membres, 3 fins possibles (adopte / rejette / retire).",
      conditions:
        "Seuil > 2 MCHF pédagogique · art. 102 (majorité absolue des membres) · retrait CE avant vote définitif.",
      legal: "LGC art. 92, 102 · art. 137 al. 4 (retrait)",
      legalUrl: LGC,
    },
  },
  {
    id: "non-entree-en-matiere",
    short: "S20",
    label: "EMPD — non-entrée en matière",
    entry: "dpt",
    playable: true,
    scenario: NON_ENTREE_EN_MATIERE,
    info: {
      summary:
        "B4-4 : le projet d'acte meurt au vote d'entrée en matière — classement sans débats de fond (fin ✕).",
      conditions:
        "★ Nominal = rejet (≠ branche optionnelle de S2). Art. 94 LGC. Court : CE → commission → plénum non-EEM.",
      legal: "LGC art. 94 (entrée en matière) · art. 92 (projet d'acte)",
      legalUrl: LGC,
    },
  },
  {
    id: "empl-loi",
    short: "S6",
    label: "EMPL — loi ordinaire",
    entry: "dpt",
    playable: true,
    scenario: EMPL_LOI,
    info: {
      summary:
        "EMPL (exposé des motifs et projet de loi) : même circuit qu'un décret, avec délai référendaire facultatif à la publication FAO.",
      conditions:
        "ObjectType loi · Cst-VD art. 84. Peuple hors carte (préambule / S17 si aboutissement).",
      legal: "LGC art. 92 · Cst-VD art. 84 (FAO / référendum facultatif)",
      legalUrl: CST,
    },
  },
  {
    id: "budget-annuel",
    short: "S7",
    label: "Budget annuel",
    entry: "ce",
    playable: true,
    scenario: BUDGET_ANNUEL,
    info: {
      summary:
        "Paquet budgétaire multi-livrables : fonctionnement · crédits d'investissement · comptes — DFA → collège → COFI → plénum.",
      conditions:
        "Session automne/hiver. ★ Pas de référendum facultatif (Cst-VD art. 84 al. 2 b).",
      legal: "LGC compétences budgétaires · Cst-VD art. 84 al. 2 b",
      legalUrl: CST,
    },
  },
  {
    id: "revision-constitutionnelle",
    short: "S19",
    label: "Révision constitutionnelle",
    entry: "dpt",
    playable: true,
    scenario: REVISION_CONSTITUTIONNELLE,
    info: {
      summary:
        "Révision partielle portée par l'État : DPT → CE → GC → votation populaire obligatoire (préambule hors carte) → Chancellerie.",
      conditions:
        "★ Même logique que le référendum (peuple hors géospatial). Référendum *obligatoire* art. 83 a (≠ facultatif art. 84). Totale / constituante / initiative hors S19.",
      legal: "Cst-VD art. 174, 83 · LGC (débats projet d'acte)",
      legalUrl: CST,
    },
  },
  {
    id: "seance-ce",
    short: "S16",
    label: "Séance du CE",
    entry: "ce",
    playable: true,
    scenario: SEANCE_CE,
    info: {
      summary:
        "Rituel collège : préparation CSG → dossiers → séance collégiale des 7 → formalisation Chancellerie.",
      conditions:
        "Complète les moments « collège » de S1/S2. Calendrier pédagogique : CSG puis collège du mercredi.",
      legal: "LOCE · pratique CSG (convention administrative)",
      legalUrl: LGC,
    },
  },
  {
    id: "referendum",
    short: "S17",
    label: "Référendum facultatif",
    entry: "ce",
    playable: true,
    scenario: REFERENDUM,
    info: {
      summary:
        "Après publication FAO (Feuille des avis officiels) : délai, aboutissement éventuel, votation hors carte, formalisation à la Chancellerie.",
      conditions:
        "★ Peuple hors géospatial (préambules). Entrée institutionnelle = Chancellerie. Alignement produit.",
      legal: "Cst-VD art. 84 (FAO / référendum facultatif)",
      legalUrl: CST,
    },
  },
  {
    id: "delai-referendaire",
    short: "S22",
    label: "Délai référendaire",
    entry: "ce",
    playable: true,
    scenario: DELAI_REFERENDAIRE,
    info: {
      summary:
        "B4-1 : focus pédagogique sur la **publication FAO** et l'**horloge du délai** — sans urne. Nominal = silence → promulgation.",
      conditions:
        "★ Distinct de S17 (aboutissement + votation hors carte). Ancrage Chancellerie. Peuple hors plateau.",
      legal: "Cst-VD art. 84 (FAO / référendum facultatif)",
      legalUrl: CST,
    },
  },
  {
    id: "urgence",
    short: "S23",
    label: "EMPD — urgence",
    entry: "dpt",
    playable: true,
    scenario: URGENCE,
    info: {
      summary:
        "B4-3 : procédure accélérée — moins d'étapes commission, tag urgence, contraste avec le cycle normal S1.",
      conditions:
        "Pédagogique (fictif). Cycle court CE → commission express → plénum compressé → promulgation.",
      legal: "LGC circuit projet d'acte (repères) — urgence illustrée, pas un régime légal exhaustif",
      legalUrl: LGC,
    },
  },
  {
    id: "navette-ce-gc",
    short: "S24",
    label: "EMPL — navette CE ↔ GC",
    entry: "dpt",
    playable: true,
    scenario: NAVETTE_CE_GC,
    info: {
      summary:
        "B4-2 : allers-retours sur un EMPL amendé. ★ Monisme cantonal — GC seul législatif, CE initiateur / réacteur (pas bicaméralisme fédéral).",
      conditions:
        "1re navette → amendement GC → retour CE → 2e navette → vote final GC.",
      legal: "LGC projet d'acte / navette institutionnelle (repères pédagogiques)",
      legalUrl: LGC,
    },
  },

  // ── GC ──
  {
    id: "motion",
    short: "S3",
    label: "Motion",
    entry: "gc",
    playable: true,
    scenario: MOTION,
    info: {
      summary:
        "Mandat impératif : le GC charge le CE de présenter un projet de loi ou de décret.",
      conditions:
        "Prise en considération (art. 125) ≠ entrée en matière. Délai de réponse art. 111. Peut être transformée en postulat.",
      legal: "LGC art. 120–126a, 111, 125",
      legalUrl: LGC,
    },
  },
  {
    id: "postulat",
    short: "S8",
    label: "Postulat",
    entry: "gc",
    playable: true,
    scenario: POSTULAT,
    info: {
      summary:
        "Mandat d'étude : le CE doit examiner l'opportunité d'une mesure et faire rapport — pas forcément un projet d'acte.",
      conditions:
        "★ Différence avec la motion : rapport d'étude, pas d'obligation de projet. Même délai art. 111.",
      legal: "LGC art. 118–119, 111",
      legalUrl: LGC,
    },
  },
  {
    id: "interpellation",
    short: "S4",
    label: "Interpellation",
    entry: "gc",
    playable: true,
    scenario: INTERPELLATION,
    info: {
      summary:
        "Contrôle / haute surveillance : demande d'explications au CE, discussion, sans acte contraignant.",
      conditions:
        "★ Aucun acte, aucune publication. CE représenté (art. 137). Satisfaction déclarée, pas de vote d'acte.",
      legal: "LGC art. 115–116, 137 · délai art. 111 si différé",
      legalUrl: LGC,
    },
  },
  {
    id: "simple-question",
    short: "S9",
    label: "Simple question",
    entry: "gc",
    playable: true,
    scenario: SIMPLE_QUESTION,
    info: {
      summary:
        "Demande écrite de renseignement : réponse écrite du CE sans discussion en plénum.",
      conditions: "Délai de réponse 4 semaines (art. 114). Format écrit uniquement.",
      legal: "LGC art. 113–114",
      legalUrl: LGC,
    },
  },
  {
    id: "question-orale",
    short: "S10",
    label: "Question orale",
    entry: "gc",
    playable: true,
    scenario: QUESTION_ORALE,
    info: {
      summary:
        "Question d'actualité : dépôt le 1er mardi du mois, réponse orale le 2e.",
      conditions: "Calendrier de séance strict (art. 112). Format court.",
      legal: "LGC art. 112",
      legalUrl: LGC,
    },
  },
  {
    id: "resolution",
    short: "S11",
    label: "Résolution",
    entry: "gc",
    playable: true,
    scenario: RESOLUTION,
    info: {
      summary:
        "Déclaration ou vœu du GC sans effet contraignant (20 soutiens) — suivi CE ≈ 3 mois.",
      conditions:
        "★ Pas d'acte législatif, pas de FAO. Distinct de la détermination (art. 117, suite d'interpellation).",
      legal: "LGC art. 136",
      legalUrl: LGC,
    },
  },
  {
    id: "determination",
    short: "S12",
    label: "Détermination",
    entry: "gc",
    playable: true,
    scenario: DETERMINATION,
    info: {
      summary:
        "Déclaration ou vœu suite à une interpellation (enchaîne typiquement après S4).",
      conditions:
        "Art. 117 · suivi du vœu ≈ 3 mois. ★ Pas d'acte. Préférer avoir vu S4 pour le contexte.",
      legal: "LGC art. 117",
      legalUrl: LGC,
    },
  },
  {
    id: "initiative",
    short: "S13",
    label: "Initiative",
    entry: "gc",
    playable: true,
    scenario: INITIATIVE,
    info: {
      summary:
        "Projet rédigé de toutes pièces (≠ motion) : préavis du CE, commission, débat plénier.",
      conditions:
        "Initiative parlementaire. Lifecycle art. 127–135 encore simplifié ; suite = circuit projet d'acte (S1/S6).",
      legal: "LGC art. 127–135",
      legalUrl: LGC,
    },
  },
  {
    id: "seance-gc",
    short: "S15",
    label: "Séance du GC",
    entry: "gc",
    playable: true,
    scenario: SEANCE_GC,
    info: {
      summary:
        "Rituel d'une journée de séance : ordre du jour (Bureau) → préparation SGC → ouverture → débat → vote → clôture.",
      conditions:
        "Transverse aux instruments (S1–S14). L'objet à l'ODJ est un exemple ; les règles de fond restent celles de chaque instrument.",
      legal: "LGC art. 82–89, 97–99, 148–151 (repères séance / scrutin)",
      legalUrl: LGC,
    },
  },
  {
    id: "bureau-odj",
    short: "S21",
    label: "Bureau — fixer l'ODJ",
    entry: "gc",
    playable: true,
    scenario: BUREAU_ODJ,
    info: {
      summary:
        "B4-5 : mini-parcours spatial — le Bureau arrête l'ordre du jour, le SGC prépare, le plénum acté l'agenda.",
      conditions:
        "★ Distinct de S15 (rituel séance complet). Ici seule la chaîne d'agenda Bureau → SGC → hémicycle.",
      legal: "LGC attributions du Bureau / séance (repères pédagogiques art. 82–89)",
      legalUrl: LGC,
    },
  },

  // ── CITOYEN ──
  {
    id: "petition",
    short: "S5",
    label: "Pétition",
    entry: "citoyen",
    playable: true,
    scenario: PETITION,
    info: {
      summary:
        "Toute personne peut saisir le GC ; obligation de réponse (délais courts art. 108).",
      conditions:
        "★ Parcours dès le SGC (pas de site citoyen). Bureau → commission → plénum.",
      legal: "LGC art. 105–108 · Cst-VD art. 31",
      legalUrl: LGC,
    },
  },
  {
    id: "demande-de-grace",
    short: "S14",
    label: "Demande de grâce",
    entry: "citoyen",
    playable: true,
    scenario: DEMANDE_GRACE,
    info: {
      summary:
        "Requête individuelle : préambule hors carte, puis réception SGC, rapport, scrutin secret sans discussion.",
      conditions:
        "Rapport ≥ 5 j avant (art. 104). ★ Secret de vote UI encore simplifié. Peuple non spatialisé (cadrage produit).",
      legal: "LGC art. 103–104",
      legalUrl: LGC,
    },
  },
  {
    id: "initiative-populaire",
    short: "S18",
    label: "Initiative populaire",
    entry: "citoyen",
    playable: true,
    scenario: INITIATIVE_POPULAIRE,
    info: {
      summary:
        "Dépôt citoyen : préambule signatures hors carte, réception SGC (Secrétariat général du Grand Conseil), préavis CE, examen, plénum.",
      conditions:
        "★ Distinct de S13 (initiative parlementaire). Peuple hors géospatial ; entrée = SGC.",
      legal: "Cst-VD · LGC (initiative populaire — repères pédagogiques)",
      legalUrl: CST,
    },
  },
];

/** Map id → objet scénario (uniquement playables) */
export const SCENARIOS = Object.fromEntries(
  SCENARIO_DEFS.filter((d) => d.playable && d.scenario).map((d) => [
    d.id,
    d.scenario,
  ])
);

/** @param {string} id */
export function getScenarioDef(id) {
  return SCENARIO_DEFS.find((d) => d.id === id) || SCENARIO_DEFS[0];
}

/** Groupes pour le drawer — items triés alpha (fr) par label propre. */
export function scenariosByEntry() {
  return ENTRY_ORDER.map((g) => ({
    ...g,
    items: SCENARIO_DEFS.filter((d) => d.entry === g.id)
      .slice()
      .sort((a, b) =>
        String(a.label || "").localeCompare(String(b.label || ""), "fr", {
          sensitivity: "base",
        })
      ),
  })).filter((g) => g.items.length > 0);
}
