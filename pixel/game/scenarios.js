/**
 * Parcours pixel — room ids = world.json / hotspots (canon state-of-vd).
 * Sites: parlement, chateau, dep-* — jamais Rumine / cathédrale.
 */

/** @typedef {{ room:string, title:string, body:string, ms?:number }} Step */
/** @typedef {{ id:string, short:string, label:string, entry:string, summary:string, steps:Step[] }} Scenario */

/** @type {Scenario[]} */
export const PIXEL_SCENARIOS = [
  {
    id: "navette-pixel",
    short: "Navette",
    label: "Navette CE ↔ GC",
    entry: "ce",
    summary: "Projet entre le Château Saint-Maire et le Parlement.",
    steps: [
      {
        room: "college-ce",
        title: "Collège du Conseil d'État",
        body: "Le collège adopte le projet au Château Saint-Maire.",
        ms: 4000,
      },
      {
        room: "chancellerie",
        title: "Chancellerie d'État",
        body: "Mise en forme et saisine — le dossier part vers le Grand Conseil.",
        ms: 3600,
      },
      {
        room: "bureau-gc",
        title: "Bureau du Grand Conseil",
        body: "Réception au Parlement, orientation vers les commissions.",
        ms: 3800,
      },
      {
        room: "plenum-gc",
        title: "Hémicycle",
        body: "Débat et vote en plénum sous la coupole du Parlement.",
        ms: 4200,
      },
      {
        room: "college-ce",
        title: "Retour au collège",
        body: "Selon le sort du vote, le dossier revient au gouvernement.",
        ms: 3600,
      },
    ],
  },
  {
    id: "empd-pixel",
    short: "EMPD",
    label: "EMPD — petit crédit (DFA)",
    entry: "dpt",
    summary: "Cellule EMPD DFA → collège CE → Parlement (aligné S1 main).",
    steps: [
      {
        room: "dep-dfa-projet",
        title: "Cellule EMPD — DFA",
        body: "Instruction de l'exposé des motifs et projet de décret de crédit.",
        ms: 4000,
      },
      {
        room: "college-ce",
        title: "Collège du CE",
        body: "Présentation au collège et adoption de l'EMPD.",
        ms: 4000,
      },
      {
        room: "chancellerie",
        title: "Chancellerie",
        body: "Préparation de la saisine du Grand Conseil.",
        ms: 3400,
      },
      {
        room: "commission",
        title: "Commissions parlementaires",
        body: "Examen en commission avant le plénum.",
        ms: 3800,
      },
      {
        room: "plenum-gc",
        title: "Hémicycle",
        body: "Vote final sur le crédit d'investissement.",
        ms: 4000,
      },
    ],
  },
  {
    id: "pub-pixel",
    short: "Publication",
    label: "Publication & délai",
    entry: "ce",
    summary: "Vote GC → Chancellerie / FAO — peuple hors carte.",
    steps: [
      {
        room: "plenum-gc",
        title: "Vote final",
        body: "Le Grand Conseil adopte le texte.",
        ms: 3400,
      },
      {
        room: "sgc",
        title: "SGC",
        body: "Le secrétariat général assure le suivi administratif.",
        ms: 3200,
      },
      {
        room: "chancellerie",
        title: "Publication FAO",
        body: "La Chancellerie publie. Le délai référendaire court — hors plateau.",
        ms: 4200,
      },
    ],
  },
  {
    id: "motion-pixel",
    short: "Motion",
    label: "Motion parlementaire",
    entry: "gc",
    summary: "Dépôt GC → renvoi CE → département.",
    steps: [
      {
        room: "pas-perdus",
        title: "Salle des pas perdus",
        body: "Circulation des élus et dépôt informel avant l'inscription.",
        ms: 3200,
      },
      {
        room: "bureau-gc",
        title: "Bureau du GC",
        body: "Inscription de la motion à l'ordre du jour.",
        ms: 3600,
      },
      {
        room: "plenum-gc",
        title: "Hémicycle",
        body: "Débat et renvoi au Conseil d'État.",
        ms: 3800,
      },
      {
        room: "college-ce",
        title: "Collège",
        body: "Le collège mandate le département compétent.",
        ms: 3600,
      },
      {
        room: "dep-dits-projet",
        title: "DITS — cellule projet",
        body: "Instruction de la réponse gouvernementale.",
        ms: 4000,
      },
    ],
  },
  {
    id: "budget-pixel",
    short: "Budget",
    label: "Budget annuel",
    entry: "dpt",
    summary: "DFA → collège → commissions → hémicycle.",
    steps: [
      {
        room: "dep-dfa-sg",
        title: "DFA — secrétariat général",
        body: "Consolidation des demandes budgétaires.",
        ms: 3600,
      },
      {
        room: "dep-dfa-projet",
        title: "DFA — EMPD budget",
        body: "Préparation du projet d'acte budgétaire.",
        ms: 3800,
      },
      {
        room: "college-ce",
        title: "Collège",
        body: "Arrêté du projet de budget par le Conseil d'État.",
        ms: 3600,
      },
      {
        room: "commission",
        title: "Commissions",
        body: "Examen parlementaire technique.",
        ms: 3800,
      },
      {
        room: "plenum-gc",
        title: "Hémicycle",
        body: "Débat et adoption du budget.",
        ms: 4200,
      },
    ],
  },
  {
    id: "urgence-pixel",
    short: "Urgence",
    label: "Procédure d'urgence",
    entry: "ce",
    summary: "Collège → Bureau GC → plénum — tempo contraint.",
    steps: [
      {
        room: "college-ce",
        title: "Constat d'urgence",
        body: "Le collège sollicite l'accélération de la procédure.",
        ms: 3400,
      },
      {
        room: "bureau-gc",
        title: "Bureau du GC",
        body: "Acceptation ou refus de l'urgence — calendrier.",
        ms: 3600,
      },
      {
        room: "plenum-gc",
        title: "Hémicycle",
        body: "Traitement accéléré en plénum.",
        ms: 4000,
      },
      {
        room: "chancellerie",
        title: "Exécution",
        body: "Publication et mise en œuvre dans un tempo court.",
        ms: 3600,
      },
    ],
  },
  {
    id: "init-pop-pixel",
    short: "Initiative",
    label: "Initiative populaire (entrée institution)",
    entry: "citoyen",
    summary: "Signatures hors carte → Chancellerie → CE → GC.",
    steps: [
      {
        room: "chancellerie",
        title: "Accueil du texte",
        body: "Après la récolte (hors plateau), le texte entre par la Chancellerie.",
        ms: 4000,
      },
      {
        room: "csg",
        title: "CSG",
        body: "Coordination inter-départements si nécessaire.",
        ms: 3400,
      },
      {
        room: "college-ce",
        title: "Préavis gouvernement",
        body: "Le collège arrête son préavis.",
        ms: 3800,
      },
      {
        room: "plenum-gc",
        title: "Grand Conseil",
        body: "Débat — aboutissement, contre-projet ou rejet.",
        ms: 4200,
      },
    ],
  },
  {
    id: "seance-gc-pixel",
    short: "Séance GC",
    label: "Séance du Grand Conseil",
    entry: "gc",
    summary: "Bureau → commissions → hémicycle (matin type).",
    steps: [
      {
        room: "bureau-gc",
        title: "Bureau du matin",
        body: "Ordre du jour, urgences, répartition des objets.",
        ms: 3400,
      },
      {
        room: "commission",
        title: "Commissions",
        body: "Travail en salles de commissions.",
        ms: 3600,
      },
      {
        room: "pas-perdus",
        title: "Pas perdus",
        body: "Coulisses et négociations avant l'entrée en plénum.",
        ms: 3200,
      },
      {
        room: "plenum-gc",
        title: "Hémicycle",
        body: "Votes et déclarations.",
        ms: 4000,
      },
    ],
  },
  {
    id: "dsas-pixel",
    short: "DSAS",
    label: "Dossier DSAS (santé)",
    entry: "dpt",
    summary: "Parcours département santé → CE → GC.",
    steps: [
      {
        room: "dep-dsas-cabinet",
        title: "Cabinet DSAS",
        body: "Arbitrage politique du chef de département.",
        ms: 3600,
      },
      {
        room: "dep-dsas-projet",
        title: "Cellule EMPD DSAS",
        body: "Rédaction de l'EMPD sectoriel.",
        ms: 3800,
      },
      {
        room: "college-ce",
        title: "Collège",
        body: "Adoption collégiale.",
        ms: 3600,
      },
      {
        room: "plenum-gc",
        title: "Hémicycle",
        body: "Examen parlementaire.",
        ms: 4000,
      },
    ],
  },
];
