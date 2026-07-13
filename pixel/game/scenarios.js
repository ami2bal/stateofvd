/**
 * Catalogue parcours pixel — room ids = hotspots.json (M4).
 * Aligné mentalement sur les flows parent (navette, EMPD, instruments, etc.).
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
    summary: "Un projet circule entre le Château et le Grand Conseil.",
    steps: [
      {
        room: "ce",
        title: "Collège du Conseil d'État",
        body: "Le collège adopte le projet. Le dossier quitte le Château Saint-Maire.",
        ms: 4000,
      },
      {
        room: "chancellerie",
        title: "Passage Chancellerie",
        body: "Coordination et mise en forme — le dossier est prêt pour le parlement.",
        ms: 3600,
      },
      {
        room: "gc",
        title: "Grand Conseil",
        body: "Dépôt au Bureau, orientation commission, débat en plénum.",
        ms: 4200,
      },
      {
        room: "ce",
        title: "Retour au gouvernement",
        body: "Selon le sort du vote, le dossier revient pour suite ou publication.",
        ms: 3800,
      },
    ],
  },
  {
    id: "empd-pixel",
    short: "EMPD",
    label: "EMPD — du département au CE",
    entry: "dpt",
    summary: "Instruction départementale puis montée au collège.",
    steps: [
      {
        room: "dep-dfa",
        title: "Cellule DFA",
        body: "Le service instruit l'exposé des motifs et projet de décret.",
        ms: 3800,
      },
      {
        room: "ce",
        title: "Collège",
        body: "Le Conseil d'État statue. Le dossier peut ensuite filer au GC.",
        ms: 4000,
      },
      {
        room: "gc",
        title: "Grand Conseil",
        body: "Le parlement reprend la main pour le cycle législatif.",
        ms: 3800,
      },
    ],
  },
  {
    id: "pub-pixel",
    short: "Publication",
    label: "Publication & délai",
    entry: "ce",
    summary: "De la décision à la chancellerie — porte d'entrée du délai référendaire.",
    steps: [
      {
        room: "gc",
        title: "Vote final",
        body: "Le Grand Conseil adopte le texte.",
        ms: 3400,
      },
      {
        room: "chancellerie",
        title: "Publication FAO",
        body: "La Chancellerie publie. Le délai référendaire commence à courir.",
        ms: 4200,
      },
      {
        room: "leman",
        title: "Hors carte — peuple",
        body: "Pendant le délai, le corps électoral agit hors plateau. L'institution observe.",
        ms: 4000,
      },
    ],
  },
  {
    id: "motion-pixel",
    short: "Motion",
    label: "Motion parlementaire",
    entry: "gc",
    summary: "Instrument du Grand Conseil : dépôt, renvoi, traitement gouvernemental.",
    steps: [
      {
        room: "gc",
        title: "Dépôt au Bureau",
        body: "Une députée dépose une motion. Le Bureau l'inscrit.",
        ms: 3600,
      },
      {
        room: "gc",
        title: "Débat & renvoi",
        body: "Le plénum renvoie au Conseil d'État pour rapport.",
        ms: 3800,
      },
      {
        room: "ce",
        title: "Instruction CE",
        body: "Le collège mandate le département concerné.",
        ms: 3600,
      },
      {
        room: "dep-dits",
        title: "Département saisi",
        body: "La DITS prépare la réponse — le dossier reviendra au GC.",
        ms: 4000,
      },
    ],
  },
  {
    id: "budget-pixel",
    short: "Budget",
    label: "Budget annuel",
    entry: "dpt",
    summary: "Du département financier au débat parlementaire.",
    steps: [
      {
        room: "dep-dfa",
        title: "Préparation budgétaire",
        body: "La DFA consolide les demandes des départements.",
        ms: 3800,
      },
      {
        room: "ce",
        title: "Adoption collège",
        body: "Le Conseil d'État arrête le projet de budget.",
        ms: 3600,
      },
      {
        room: "gc",
        title: "Débat Grand Conseil",
        body: "Commissions puis plénum — le budget est l'acte politique de l'année.",
        ms: 4200,
      },
    ],
  },
  {
    id: "urgence-pixel",
    short: "Urgence",
    label: "Procédure d'urgence",
    entry: "ce",
    summary: "Accélération du cycle quand les délais ordinaires ne suffisent pas.",
    steps: [
      {
        room: "ce",
        title: "Constat d'urgence",
        body: "Le collège sollicite la procédure accélérée.",
        ms: 3400,
      },
      {
        room: "gc",
        title: "Bureau & plénum",
        body: "Le Grand Conseil accepte ou refuse l'urgence — calendrier resserré.",
        ms: 4000,
      },
      {
        room: "chancellerie",
        title: "Exécution rapide",
        body: "Publication et mise en œuvre dans un tempo contraint.",
        ms: 3600,
      },
    ],
  },
  {
    id: "init-pop-pixel",
    short: "Initiative",
    label: "Initiative populaire (entrée institution)",
    entry: "citoyen",
    summary: "Le peuple reste hors carte ; l'institution accueille le texte à la Chancellerie / SGC.",
    steps: [
      {
        room: "chancellerie",
        title: "Accueil du texte",
        body: "Après récolte des signatures (hors plateau), le texte entre par la Chancellerie.",
        ms: 4000,
      },
      {
        room: "ce",
        title: "Préavis gouvernement",
        body: "Le Conseil d'État prépare son préavis.",
        ms: 3600,
      },
      {
        room: "gc",
        title: "Grand Conseil",
        body: "Le parlement débat — aboutissement, contre-projet ou rejet.",
        ms: 4200,
      },
    ],
  },
  {
    id: "seance-gc-pixel",
    short: "Séance GC",
    label: "Séance du Grand Conseil",
    entry: "gc",
    summary: "Une matinée type : Bureau, commissions, plénum.",
    steps: [
      {
        room: "gc",
        title: "Bureau du matin",
        body: "Ordre du jour, urgences, répartition des objets.",
        ms: 3400,
      },
      {
        room: "gc",
        title: "Commissions",
        body: "Les salles annexes travaillent les dossiers techniques.",
        ms: 3600,
      },
      {
        room: "gc",
        title: "Plénum",
        body: "Votes et déclarations sous la coupole verte.",
        ms: 4000,
      },
    ],
  },
];
