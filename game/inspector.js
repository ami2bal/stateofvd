/**
 * Contextual inspector (TASK-091 + 095 + 096 + placement focale).
 * Hover = fiche de base · clic/épingle = fiche enrichie RBAC.
 * Placement intelligent à côté de la focale (salle/bâtiment), hors HUD Mode Parcours.
 * Contenu institutionnel 091 figé ; RBAC = inspector-data.js.
 */
import {
  resolveRbac,
  hierarchyLabel,
} from "./inspector-data.js";
import { roomLabelDetail } from "../engine/room-nomenclature.js";

/**
 * Glossaire acronymes → développement (titres de la fiche détail).
 * Format d'affichage : « SIGLE — nom complet » si le titre n'est que le sigle,
 * ou expansion des sigles orphelins dans une phrase courte.
 */
export const ACRONYM_FULL = {
  CSG: "Conférence des secrétaires généraux",
  SGC: "Secrétariat général du Grand Conseil",
  GC: "Grand Conseil",
  CE: "Conseil d'État",
  EMPD: "exposé des motifs et projet de décret",
  EMPL: "exposé des motifs et projet de loi",
  FAO: "Feuille des avis officiels",
  SG: "Secrétariat général",
  ODJ: "ordre du jour",
  DITS: "Institutions, territoire et sport",
  DEIEP: "Économie, innovation, emploi et patrimoine",
  DEF: "Enseignement et formation professionnelle",
  DSAS: "Santé et action sociale",
  DCIRH: "Culture, infrastructures et ressources humaines",
  DJES: "Jeunesse, environnement et sécurité",
  DFA: "Finances et agriculture",
};

/**
 * Titre lisible pour la fenêtre de détail : tout acronyme nu devient « SIGLE — nom ».
 * Idempotent si le développement est déjà présent (après un tiret cadratin / em dash).
 * @param {string} title
 */
export function expandTitleAcronyms(title) {
  let t = String(title || "").trim();
  if (!t) return t;
  // déjà « SIGLE — … » avec développement : laisser
  const mLead = t.match(/^([A-Z]{2,8})\s*[—–-]\s+(.+)$/);
  if (mLead && ACRONYM_FULL[mLead[1]] && mLead[2].length > 2) {
    return t;
  }
  // titre = purement l'acronyme
  if (ACRONYM_FULL[t]) {
    return `${t} — ${ACRONYM_FULL[t]}`;
  }
  // « Secrétariat général du GC » / « … du CE »
  t = t.replace(/\bdu GC\b/g, "du Grand Conseil (GC)");
  t = t.replace(/\bdu CE\b/g, "du Conseil d'État (CE)");
  // « Projet EMPD » seul
  if (/^Projet EMPD$/i.test(t)) {
    return `Projet EMPD — ${ACRONYM_FULL.EMPD}`;
  }
  // « Département › SG »
  if (/\bSG$/.test(t) && !/Secrétariat/i.test(t)) {
    t = t.replace(/\bSG$/, `SG — ${ACRONYM_FULL.SG}`);
  }
  // sigle isolé en tête encore non développé (ex. CSG restant)
  const mHead = t.match(/^([A-Z]{2,8})\b(.*)$/);
  if (mHead && ACRONYM_FULL[mHead[1]] && !mHead[2].includes(ACRONYM_FULL[mHead[1]])) {
    const rest = mHead[2].replace(/^\s*[—–-]\s*/, "").trim();
    t = rest
      ? `${mHead[1]} — ${ACRONYM_FULL[mHead[1]]}${rest.startsWith("—") || rest.startsWith("–") ? rest : ` · ${rest}`}`
      : `${mHead[1]} — ${ACRONYM_FULL[mHead[1]]}`;
  }
  return t;
}

/** Fixed institutional copy — no living persons, no code jargon. */
export const FICHES = {
  parlement: {
    title: "Grand Conseil",
    subtitle: "Parlement · pouvoir législatif",
    accent: "#3E7A52",
    body:
      "Pouvoir législatif, 150 député·e·s. Vote les lois, décrets et le budget, exerce la haute surveillance sur le Conseil d'État.",
    rooms: [
      {
        id: "plenum-gc",
        title: "Hémicycle du Grand Conseil",
        text: "Salle des débats et votes en séance plénière : entrée en matière, débats, scrutin final.",
      },
      {
        id: "bureau-gc",
        title: "Bureau du Grand Conseil",
        text: "Présidence, ordre du jour de la session.",
      },
      {
        id: "commission",
        title: "Commissions parlementaires",
        text: "Examen préalable des objets, rapports de majorité et de minorité.",
      },
      {
        id: "sgc",
        title: "SGC — Secrétariat général du Grand Conseil",
        text: "Appui administratif, procès-verbaux, réception des pétitions.",
      },
      {
        id: "pas-perdus",
        title: "Salle des pas perdus",
        text: "Espace de circulation et d'échanges informels hors séance.",
      },
    ],
  },
  chateau: {
    title: "Conseil d'État",
    subtitle: "Château Saint-Maire · pouvoir exécutif collégial",
    accent: "#C9A45C",
    body:
      "Pouvoir exécutif collégial, 7 membres. Gouverne, propose au Grand Conseil les projets (EMPD — exposé des motifs et projet de décret), exécute lois et décrets.",
    rooms: [
      {
        id: "college-ce",
        title: "Collège du Conseil d'État",
        text: "Salle du collège des 7 : décisions collégiales, séance hebdomadaire.",
      },
      {
        id: "chancellerie",
        title: "Chancellerie d'État",
        text: "État-major, publication à la FAO (Feuille des avis officiels), sceau, authentification des actes.",
      },
      {
        id: "csg",
        title: "CSG — Conférence des secrétaires généraux",
        text: "Coordination, préparation de l'agenda du Conseil d'État.",
      },
    ],
  },
  "dep-dits": {
    title: "DITS — Institutions, territoire et sport",
    subtitle: "Département · législature 2022-2027",
    accent: "#5C6E8A",
    body:
      "Met en œuvre les politiques publiques de son domaine et prépare les projets EMPD portés par son chef au Conseil d'État.",
    rooms: [],
  },
  "dep-deiep": {
    title: "DEIEP — Économie, innovation, emploi et patrimoine",
    subtitle: "Département · législature 2022-2027",
    accent: "#8A6E5C",
    body:
      "Met en œuvre les politiques publiques de son domaine et prépare les projets EMPD portés par son chef au Conseil d'État.",
    rooms: [],
  },
  "dep-def": {
    title: "DEF — Enseignement et formation professionnelle",
    subtitle: "Département · législature 2022-2027",
    accent: "#6E8A6E",
    body:
      "Met en œuvre les politiques publiques de son domaine et prépare les projets EMPD portés par son chef au Conseil d'État.",
    rooms: [],
  },
  "dep-dsas": {
    title: "DSAS — Santé et action sociale",
    subtitle: "Département · législature 2022-2027 · jouable v1",
    accent: "#7A6A8C",
    body:
      "Met en œuvre les politiques publiques de son domaine et prépare les projets EMPD portés par son chef au Conseil d'État.",
    rooms: [],
  },
  "dep-dcirh": {
    title: "DCIRH — Culture, infrastructures et ressources humaines",
    subtitle: "Département · législature 2022-2027",
    accent: "#5C7A8A",
    body:
      "Met en œuvre les politiques publiques de son domaine et prépare les projets EMPD portés par son chef au Conseil d'État.",
    rooms: [],
  },
  "dep-djes": {
    title: "DJES — Jeunesse, environnement et sécurité",
    subtitle: "Département · législature 2022-2027",
    accent: "#8A5C6E",
    body:
      "Met en œuvre les politiques publiques de son domaine et prépare les projets EMPD portés par son chef au Conseil d'État.",
    rooms: [],
  },
  "dep-dfa": {
    title: "DFA — Finances et agriculture",
    subtitle: "Département · législature 2022-2027 · jouable v1",
    accent: "#8A7A5C",
    body:
      "Met en œuvre les politiques publiques de son domaine et prépare les projets EMPD portés par son chef au Conseil d'État.",
    rooms: [],
  },
};

const FALLBACK = {
  title: "Institution",
  subtitle: "Fiche contextuelle",
  accent: "#A89F8D",
  body: "Organe du canton de Vaud. Approchez-vous pour en voir le détail.",
  rooms: [],
};

const CLOSE_DELAY_MS = 160;

function resolveFiche(siteId, roomId) {
  const base = FICHES[siteId] || FALLBACK;
  let room = null;
  if (roomId && base.rooms && base.rooms.length) {
    room = base.rooms.find((r) => r.id === roomId) || null;
    if (!room) {
      room =
        base.rooms.find(
          (r) => roomId.includes(r.id) || r.id.includes(roomId)
        ) || null;
    }
  }
  // department room labels from room id if no static room list
  if (roomId && !room && String(siteId).startsWith("dep-")) {
    const short = roomId.replace(/^dep-[a-z]+-/, "");
    const titles = {
      cabinet: "Cabinet du chef",
      sg: "SG — Secrétariat général",
      projet: "Projet EMPD — exposé des motifs et projet de décret",
    };
    room = {
      id: roomId,
      title: titles[short] || short,
      text: "Unité du département.",
    };
  }
  return { base, room };
}

function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * @param {object} opts
 * @param {() => object} opts.getFocused
 * @param {HTMLElement} [opts.mount]
 */
export function installInspector(opts) {
  const getFocused = opts.getFocused;
  // Plein écran : monter dans #sovd-root (sinon la fiche est hors arbre FS → invisible)
  const mount =
    opts.mount ||
    document.getElementById("sovd-root") ||
    document.body;

  const el = document.createElement("aside");
  el.id = "sovd-inspector";
  el.setAttribute("aria-live", "polite");
  el.hidden = true;
  el.innerHTML = `
    <div class="insp-header" id="insp-header">
      <div class="insp-title" id="insp-title"></div>
      <div class="insp-sub" id="insp-sub"></div>
    </div>
    <div class="insp-body" id="insp-body"></div>
    <div class="insp-room" id="insp-room" hidden>
      <div class="insp-room-title" id="insp-room-title"></div>
      <div class="insp-room-text" id="insp-room-text"></div>
    </div>
    <div class="insp-enrich" id="insp-enrich" hidden></div>
    <div class="insp-pin" id="insp-pin" hidden>Épinglé · fiche enrichie</div>
  `;

  const style = document.createElement("style");
  style.textContent = `
    #sovd-inspector {
      position: absolute;
      /* Au-dessus canvas/HUD bas, sous drawer scénarios (z≈50) */
      z-index: 48;
      width: min(300px, calc(100% - 24px));
      max-height: min(70%, calc(100% - 24px));
      overflow: auto;
      border-radius: 16px;
      background: rgba(237, 232, 220, 0.72);
      backdrop-filter: blur(14px) saturate(1.15);
      -webkit-backdrop-filter: blur(14px) saturate(1.15);
      color: #2F4266;
      border: 1px solid rgba(255, 255, 255, 0.55);
      box-shadow:
        0 10px 36px rgba(36, 48, 63, 0.14),
        inset 0 1px 0 rgba(255, 255, 255, 0.45);
      font-family: "Segoe UI", system-ui, sans-serif;
      opacity: 0;
      /* left/top set via JS placeContextual (!important) — toujours dans #sovd-root */
      transition: opacity 0.2s ease, left 0.28s cubic-bezier(0.22, 1, 0.36, 1),
        top 0.28s cubic-bezier(0.22, 1, 0.36, 1);
      pointer-events: none;
      /* Évite de passer sous le stacking du canvas (embed iframe) */
      isolation: isolate;
    }
    #sovd-inspector.is-open {
      opacity: 1;
      pointer-events: auto;
    }
    #sovd-inspector.is-pinned {
      box-shadow:
        0 12px 40px rgba(36, 48, 63, 0.18),
        inset 0 1px 0 rgba(255, 255, 255, 0.5),
        0 0 0 1.5px rgba(47, 66, 102, 0.22);
    }
    #sovd-inspector[hidden] { display: none !important; }
    /* soft side cue (does not affect layout) */

    #sovd-inspector .insp-header {
      padding: 14px 16px 12px;
      border-radius: 15px 15px 0 0;
      color: #fff;
    }
    #sovd-inspector .insp-header.ce { color: #4A3A17; }
    #sovd-inspector .insp-title {
      font-size: 15px;
      font-weight: 700;
      line-height: 1.25;
    }
    #sovd-inspector .insp-sub {
      margin-top: 4px;
      font-size: 11px;
      opacity: 0.92;
      font-weight: 600;
      letter-spacing: 0.02em;
    }
    #sovd-inspector .insp-body {
      padding: 14px 16px;
      font-size: 13px;
      line-height: 1.45;
    }
    #sovd-inspector .insp-body[hidden] { display: none !important; }
    /* room focus: tighter panel (no building blurb) */
    #sovd-inspector.is-room-focus .insp-body {
      padding: 10px 16px 12px;
      font-size: 12.5px;
    }
    #sovd-inspector.is-room-focus .insp-sub {
      opacity: 0.78;
      font-size: 10.5px;
    }
    #sovd-inspector .insp-room {
      margin: 0 12px 10px;
      padding: 10px 12px;
      border-radius: 10px;
      background: rgba(255,255,255,0.45);
      border: 1px solid rgba(184, 174, 152, 0.55);
      backdrop-filter: blur(6px);
    }
    #sovd-inspector .insp-room-title {
      font-size: 12px;
      font-weight: 700;
      margin-bottom: 4px;
    }
    #sovd-inspector .insp-room-text {
      font-size: 12px;
      line-height: 1.4;
      opacity: 0.95;
    }
    #sovd-inspector .insp-enrich {
      margin: 0 12px 12px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    #sovd-inspector .insp-sec {
      padding: 10px 12px;
      border-radius: 10px;
      background: rgba(255, 255, 255, 0.42);
      border: 1px solid rgba(47, 66, 102, 0.12);
    }
    #sovd-inspector .insp-sec-h {
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: #2F4266;
      opacity: 0.75;
      margin-bottom: 6px;
    }
    #sovd-inspector .insp-sec ul {
      margin: 0;
      padding-left: 1.1em;
      font-size: 12px;
      line-height: 1.4;
    }
    #sovd-inspector .insp-cadence {
      display: flex;
      align-items: flex-start;
      gap: 7px;
      margin: 6px 0 0;
      padding: 6px 8px;
      border-radius: 8px;
      background: rgba(47,66,102,0.06);
      border: 1px solid rgba(47,66,102,0.1);
      font-size: 11px;
      line-height: 1.35;
      color: #3a4a63;
    }
    #sovd-inspector .insp-cadence-ico {
      flex: 0 0 auto;
      width: 14px;
      height: 14px;
      margin-top: 1px;
      color: #5e6c84;
      opacity: 0.9;
    }
    #sovd-inspector .insp-cadence-txt {
      flex: 1 1 auto;
      min-width: 0;
    }
    #sovd-inspector .insp-sec p {
      margin: 0;
      font-size: 12px;
      line-height: 1.4;
    }
    #sovd-inspector .insp-target {
      margin-top: 4px;
      font-weight: 600;
      color: #3E7A52;
    }
    #sovd-inspector .insp-legal {
      list-style: none;
      margin: 0;
      padding: 0;
    }
    #sovd-inspector .insp-legal li {
      margin: 3px 0;
    }
    #sovd-inspector .insp-legal a {
      color: #2F4266;
      font-size: 11.5px;
      font-weight: 600;
      text-decoration: none;
      border-bottom: 1px solid rgba(47,66,102,0.25);
    }
    #sovd-inspector .insp-legal a:hover {
      border-bottom-color: #2F4266;
      color: #1a2740;
    }
    #sovd-inspector .insp-hier {
      font-size: 11px;
      opacity: 0.85;
      margin-bottom: 4px;
      font-weight: 600;
    }
    #sovd-inspector .insp-pin {
      margin: 0 12px 12px;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: #2F4266;
      opacity: 0.7;
    }
  `;
  document.head.appendChild(style);
  mount.appendChild(el);

  const elHeader = el.querySelector("#insp-header");
  const elTitle = el.querySelector("#insp-title");
  const elSub = el.querySelector("#insp-sub");
  const elBody = el.querySelector("#insp-body");
  const elRoom = el.querySelector("#insp-room");
  const elRoomTitle = el.querySelector("#insp-room-title");
  const elRoomText = el.querySelector("#insp-room-text");
  const elEnrich = el.querySelector("#insp-enrich");
  const elPin = el.querySelector("#insp-pin");

  let lastKey = "";
  let closeTimer = null;
  let lastPlace = { x: 12, y: 72, side: "right" };
  const state = {
    visible: false,
    pinned: false,
    enriched: false,
    siteId: null,
    roomId: null,
    title: null,
    roles: null,
    actions: null,
    cadence: null,
    institutionalAction: null,
    target: null,
    targets: null,
  };

  function clearCloseTimer() {
    if (closeTimer) {
      clearTimeout(closeTimer);
      closeTimer = null;
    }
  }

  /** Canvas origin in viewport (canvas may not be 0,0). */
  function canvasOrigin() {
    const canvas =
      document.getElementById("game") ||
      document.querySelector("#game-host canvas");
    if (!canvas) return { ox: 0, oy: 0 };
    const r = canvas.getBoundingClientRect();
    return { ox: r.left, oy: r.top };
  }

  /** Bounding rect du shell (#sovd-root) en coords viewport. */
  function shellRect() {
    const mount =
      el.parentElement ||
      document.getElementById("sovd-root") ||
      document.querySelector(".sovd-root");
    if (mount?.getBoundingClientRect) {
      const r = mount.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) return r;
    }
    return {
      left: 0,
      top: 0,
      width: window.innerWidth,
      height: window.innerHeight,
      right: window.innerWidth,
      bottom: window.innerHeight,
    };
  }

  /**
   * Focus rect in viewport pixels (from screenRect in canvas space).
   */
  function focusViewportRect(focus) {
    const sr = focus?.screenRect;
    const { ox, oy } = canvasOrigin();
    if (!sr || !(sr.w > 0) || !(sr.h > 0)) {
      // fallback: centre du shell (pas de la fenêtre hôte entière)
      const sh = shellRect();
      return {
        x: sh.left + sh.width * 0.5 - 40,
        y: sh.top + sh.height * 0.4 - 40,
        w: 80,
        h: 80,
      };
    }
    return {
      x: ox + sr.x,
      y: oy + sr.y,
      w: sr.w,
      h: sr.h,
    };
  }

  /** Viewport rect → coords locales au shell. */
  function toShellLocal(rect, sh) {
    return {
      x: rect.x - sh.left,
      y: rect.y - sh.top,
      w: rect.w,
      h: rect.h,
    };
  }

  /** Reserved UI obstacles (Mode Parcours, brand, flow tips, QA…) en coords shell. */
  function obstacles(sh) {
    const list = [];
    const pushEl = (node, pad) => {
      if (!node || node.hidden || node.offsetParent === null) return;
      const r = node.getBoundingClientRect();
      if (!(r.width > 0 && r.height > 0)) return;
      list.push(
        toShellLocal(
          {
            x: r.left - pad,
            y: r.top - pad,
            w: r.width + pad * 2,
            h: r.height + pad * 2,
          },
          sh
        )
      );
    };
    pushEl(document.getElementById("flow-hud"), 10);
    pushEl(document.getElementById("sovd-brand"), 8);
    pushEl(document.getElementById("sovd-chrome"), 6);
    for (const tip of document.querySelectorAll(".sovd-flow-tip.is-on")) {
      pushEl(tip, 10);
    }
    pushEl(document.getElementById("qa-panel"), 4);
    return list;
  }

  function inflateRect(r, pad) {
    return {
      x: r.left - pad,
      y: r.top - pad,
      w: r.width + pad * 2,
      h: r.height + pad * 2,
    };
  }

  function rectsOverlap(a, b, pad = 0) {
    return !(
      a.x + a.w + pad <= b.x ||
      b.x + b.w + pad <= a.x ||
      a.y + a.h + pad <= b.y ||
      b.y + b.h + pad <= a.y
    );
  }

  function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
  }

  /**
   * Placement intelligent **dans le shell #sovd-root** (pas la fenêtre hôte).
   * ★ Bug iframe : vw/vh = window → panel hors cadre → clip overflow:hidden
   *   (surtout salles à gauche : plénum → fiche « sous » le container).
   */
  function placeContextual(focus) {
    if (!focus?.siteId || el.hidden) return lastPlace;

    const margin = 12;
    const gap = 14;
    const sh = shellRect();
    const vw = sh.width;
    const vh = sh.height;
    // measure panel (must be visible / not display:none)
    const pw = el.offsetWidth || Math.min(300, Math.max(120, vw - 24));
    const ph = el.offsetHeight || 200;

    // tout en coords locales shell
    const fr = toShellLocal(focusViewportRect(focus), sh);
    const obs = obstacles(sh);

    const fcx = fr.x + fr.w / 2;
    const fcy = fr.y + fr.h / 2;
    // Prefer the side with space: focus left half → panel right (and inverse)
    const preferRight = fcx < vw * 0.55;

    /** @type {{ side: string, x: number, y: number }[]} */
    const candidates = [
      {
        side: "right",
        x: fr.x + fr.w + gap,
        y: fcy - ph / 2,
      },
      {
        side: "left",
        x: fr.x - gap - pw,
        y: fcy - ph / 2,
      },
      {
        side: "below",
        x: fcx - pw / 2,
        y: fr.y + fr.h + gap,
      },
      {
        side: "above",
        x: fcx - pw / 2,
        y: fr.y - gap - ph,
      },
    ];

    // corner variants
    candidates.push(
      { side: "right", x: fr.x + fr.w + gap, y: fr.y },
      { side: "right", x: fr.x + fr.w + gap, y: fr.y + fr.h - ph },
      { side: "left", x: fr.x - gap - pw, y: fr.y },
      { side: "left", x: fr.x - gap - pw, y: fr.y + fr.h - ph }
    );

    function scoreCandidate(c) {
      // hard clamp into shell — never leave the embed frame
      const x = clamp(c.x, margin, Math.max(margin, vw - pw - margin));
      const y = clamp(c.y, margin, Math.max(margin, vh - ph - margin));
      const box = { x, y, w: pw, h: ph };
      let score = 100;

      // heavily penalize overlap with focale
      if (rectsOverlap(box, fr, 4)) score -= 80;

      // penalize overlap with HUD / flow tips (stronger for tips)
      for (const o of obs) {
        if (rectsOverlap(box, o, 4)) {
          const isTipLike = o.w < 280 && o.h < 80;
          score -= isTipLike ? 95 : 45;
        }
      }

      // prefer staying inside shell without needing clamp
      const overflowX =
        Math.max(0, margin - c.x) + Math.max(0, c.x + pw + margin - vw);
      const overflowY =
        Math.max(0, margin - c.y) + Math.max(0, c.y + ph + margin - vh);
      // ★ overflow = clip hôte — pénalité forte
      score -= overflowX * 1.2 + overflowY * 1.2;

      // side preference depends on where the focus sits
      if (c.side === "right") score += preferRight ? 28 : 10;
      else if (c.side === "left") score += preferRight ? 8 : 28;
      else if (c.side === "below") score += 10;
      else score += 6;

      // continuity
      if (c.side === lastPlace.side) score += 8;
      const dx = x - lastPlace.x;
      const dy = y - lastPlace.y;
      score -= Math.hypot(dx, dy) * 0.02;

      const panelCx = x + pw / 2;
      const panelCy = y + ph / 2;
      const distToFocus = Math.hypot(panelCx - fcx, panelCy - fcy);
      score -= Math.abs(distToFocus - gap * 4) * 0.05;

      return { x, y, side: c.side, score };
    }

    let best = null;
    for (const c of candidates) {
      const s = scoreCandidate(c);
      if (!best || s.score > best.score) best = s;
    }
    if (!best) {
      best = {
        x: preferRight ? Math.max(margin, vw - pw - margin) : margin,
        y: margin + 60,
        side: preferRight ? "right" : "left",
        score: 0,
      };
    }

    // already shell-local (position:absolute dans #sovd-root)
    const px = Math.round(
      clamp(best.x, margin, Math.max(margin, vw - pw - margin))
    );
    const py = Math.round(
      clamp(best.y, margin, Math.max(margin, vh - ph - margin))
    );
    el.style.setProperty("left", `${px}px`, "important");
    el.style.setProperty("top", `${py}px`, "important");
    el.style.setProperty("right", "auto", "important");
    el.style.setProperty("bottom", "auto", "important");
    el.style.setProperty("transform", "none", "important");
    el.dataset.side = best.side;
    lastPlace = { x: px, y: py, side: best.side };
    return lastPlace;
  }

  function hide() {
    clearCloseTimer();
    el.classList.remove("is-open", "is-pinned", "is-room-focus");
    el.hidden = true;
    elBody.hidden = false;
    elPin.hidden = true;
    elEnrich.hidden = true;
    elEnrich.innerHTML = "";
    state.visible = false;
    state.pinned = false;
    state.enriched = false;
    state.siteId = null;
    state.roomId = null;
    state.title = null;
    state.roles = null;
    state.actions = null;
    state.cadence = null;
    state.institutionalAction = null;
    state.target = null;
    state.targets = null;
    state.legalRefs = null;
    lastKey = "null";
  }

  function renderEnrich(siteId, roomId, base, room) {
    const rbac = resolveRbac(siteId, roomId);
    if (!rbac) {
      elEnrich.hidden = true;
      elEnrich.innerHTML = "";
      state.roles = null;
      state.actions = null;
      state.cadence = null;
      state.institutionalAction = null;
      state.target = null;
      state.targets = null;
      state.enriched = false;
      return;
    }
    const hier = expandTitleAcronyms(
      hierarchyLabel(siteId, roomId, base.title, room?.title)
    );
    const rolesHtml = (rbac.roles || [])
      .map((r) => `<li>${esc(expandTitleAcronyms(r))}</li>`)
      .join("");
    const actsHtml = (rbac.actions || [])
      .map((a) => `<li>${esc(a)}</li>`)
      .join("");
    // Cadence = 1 ligne (temporalité du lieu) — pas un chapitre « Agenda » d'objets
    const cadence = (rbac.cadence || "").trim();
    // Icône planner (pas le libellé « Cadence ») — title/aria pour l’accessibilité
    const cadenceHtml = cadence
      ? `<div class="insp-cadence" data-sec="cadence" title="Cadence" role="group" aria-label="Cadence">
          <svg class="insp-cadence-ico" viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" focusable="false">
            <path fill="currentColor" d="M7 2a1 1 0 0 1 1 1v1h8V3a1 1 0 1 1 2 0v1h1.5A2.5 2.5 0 0 1 22 6.5v13A2.5 2.5 0 0 1 19.5 22h-15A2.5 2.5 0 0 1 2 19.5v-13A2.5 2.5 0 0 1 4.5 4H6V3a1 1 0 0 1 1-1zm12.5 8h-15v9.5a.5.5 0 0 0 .5.5h14a.5.5 0 0 0 .5-.5V10zM4.5 6a.5.5 0 0 0-.5.5V8h16V6.5a.5.5 0 0 0-.5-.5h-15zM8 13.5a1 1 0 1 1 0 2 1 1 0 0 1 0-2zm4 0a1 1 0 1 1 0 2 1 1 0 0 1 0-2zm4 0a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/>
          </svg>
          <span class="insp-cadence-txt">${esc(cadence)}</span>
        </div>`
      : "";
    // Action institutionnelle / cibles = panels flux sur le plan (pas dans la fiche)
    elEnrich.innerHTML = `
      <div class="insp-hier">${esc(hier)}</div>
      <div class="insp-sec" data-sec="roles">
        <div class="insp-sec-h">Rôle(s) RBAC</div>
        <ul>${rolesHtml}</ul>
      </div>
      <div class="insp-sec" data-sec="actions">
        <div class="insp-sec-h">Actions possibles</div>
        <ul>${actsHtml}</ul>
        ${cadenceHtml}
      </div>
      ${
        Array.isArray(rbac.legalRefs) && rbac.legalRefs.length
          ? `<div class="insp-sec" data-sec="legal">
        <div class="insp-sec-h">Bases légales</div>
        <ul class="insp-legal">
          ${rbac.legalRefs
            .map(
              (r) =>
                `<li><a href="${esc(r.url)}" target="_blank" rel="noopener noreferrer">${esc(
                  r.label || `art. ${r.art} ${r.code}`
                )} ↗</a></li>`
            )
            .join("")}
        </ul>
      </div>`
          : ""
      }
    `;
    elEnrich.hidden = false;
    state.roles = [...(rbac.roles || [])];
    state.actions = [...(rbac.actions || [])];
    state.cadence = cadence || null;
    // kept in state for API/QA ; no longer rendered in the fiche
    state.institutionalAction = rbac.institutionalAction || null;
    state.target = rbac.target || null;
    state.targets = Array.isArray(rbac.targets)
      ? rbac.targets.map((t) => ({
          siteId: t.siteId,
          roomId: t.roomId || null,
          label: t.label || null,
        }))
      : null;
    state.legalRefs = Array.isArray(rbac.legalRefs)
      ? rbac.legalRefs.map((r) => ({
          code: r.code,
          art: r.art,
          label: r.label,
          url: r.url,
        }))
      : null;
    state.enriched = true;
  }

  function render(focus, { enriched }) {
    const siteId = focus.siteId;
    const roomId = focus.roomId || null;
    const key = `${siteId}|${roomId}|${enriched ? 1 : 0}`;
    if (key === lastKey && state.visible) {
      el.classList.toggle("is-pinned", state.pinned);
      elPin.hidden = !state.pinned;
      placeContextual(focus);
      return;
    }
    lastKey = key;

    const { base, room } = resolveFiche(siteId, roomId);
    const accent = base.accent || "#A89F8D";
    elHeader.style.background = accent;
    elHeader.classList.toggle("ce", accent.toUpperCase() === "#C9A45C");

    // Room focus: panel = salle only (no building body re-display)
    // Building focus: full institutional fiche
    // Titres : nomenclature institutionnelle + acronymes développés
    if (room) {
      // priorité : nom institutionnel complet (source room-nomenclature)
      const detailTitle = roomId
        ? roomLabelDetail(roomId, room.title)
        : room.title;
      elTitle.textContent = expandTitleAcronyms(detailTitle);
      // breadcrumb minimal (orientation) — pas le sous-titre ni le corps bâtiment
      elSub.textContent = expandTitleAcronyms(base.title || "");
      elBody.textContent = room.text || "";
      elBody.hidden = !room.text;
      elRoom.hidden = true; // merged into header + body
      el.classList.add("is-room-focus");
    } else {
      elTitle.textContent = expandTitleAcronyms(base.title);
      elSub.textContent = base.subtitle || "";
      elBody.textContent = base.body || "";
      elBody.hidden = !base.body;
      elRoom.hidden = true;
      el.classList.remove("is-room-focus");
    }

    if (enriched) {
      renderEnrich(siteId, roomId, base, room);
    } else {
      elEnrich.hidden = true;
      elEnrich.innerHTML = "";
      state.roles = null;
      state.actions = null;
      state.cadence = null;
      state.institutionalAction = null;
      state.target = null;
      state.targets = null;
      state.enriched = false;
    }

    el.hidden = false;
    void el.offsetWidth;
    el.classList.add("is-open");
    el.classList.toggle("is-pinned", state.pinned);
    elPin.hidden = !state.pinned;
    state.visible = true;
    state.siteId = siteId;
    state.roomId = roomId;
    state.title = room ? room.title : base.title;
    // Remonter en fin de shell → au-dessus des siblings (canvas) en embed iframe
    if (el.parentElement) el.parentElement.appendChild(el);
    // place after layout; 2nd pass after flow tips have painted (avoid covering them)
    placeContextual(focus);
    requestAnimationFrame(() => {
      placeContextual(focus);
      requestAnimationFrame(() => placeContextual(focus));
    });
  }

  /** Public: re-anchor panel to current focale (camera pan/zoom). */
  function reposition(focus) {
    if (!state.visible) return;
    const f = focus || (typeof getFocused === "function" ? getFocused() : null);
    if (f?.siteId) placeContextual(f);
  }

  /** Hover / temporary show (not pinned) — base fiche only. */
  function showHover(focus) {
    if (!focus || !focus.siteId) {
      scheduleHide();
      return;
    }
    clearCloseTimer();
    if (state.pinned) return;
    state.pinned = false;
    render(focus, { enriched: false });
  }

  /** Pin = enriched RBAC (TASK-096). */
  function pin(focus) {
    if (!focus || !focus.siteId) {
      unpin();
      return;
    }
    clearCloseTimer();
    state.pinned = true;
    render(focus, { enriched: true });
  }

  function unpin() {
    state.pinned = false;
    el.classList.remove("is-pinned");
    elPin.hidden = true;
    if (!state.visible) return;
    hide();
  }

  function scheduleHide() {
    if (state.pinned) return;
    clearCloseTimer();
    closeTimer = setTimeout(() => {
      if (!state.pinned) hide();
    }, CLOSE_DELAY_MS);
  }

  function applyFocus(focus) {
    if (!focus || !focus.siteId || focus.kind == null) {
      if (state.pinned) return;
      hide();
      return;
    }
    // Mode Parcours / silent pin — no institution modal
    if (focus.silentInspector) {
      hide();
      return;
    }
    if (focus.pinned) pin(focus);
    else showHover(focus);
  }

  function onFocusChange(ev) {
    applyFocus(ev.detail);
  }

  window.addEventListener("sovd:focuschange", onFocusChange);

  if (typeof getFocused === "function") {
    applyFocus(getFocused());
  }

  window.addEventListener("resize", () => {
    if (state.visible && typeof getFocused === "function") {
      reposition(getFocused());
    }
  });

  return {
    el,
    getState: () => ({ ...state, place: { ...lastPlace } }),
    showHover,
    pin,
    unpin,
    hide,
    scheduleHide,
    reposition,
    placeContextual,
    refresh: () => applyFocus(getFocused && getFocused()),
    dispose: () => {
      clearCloseTimer();
      window.removeEventListener("sovd:focuschange", onFocusChange);
      el.remove();
      style.remove();
    },
  };
}
