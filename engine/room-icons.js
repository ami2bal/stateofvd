/**
 * Room iconography — procedural vector vignettes (DA molasse / encre).
 * Semantic icons per room role; animate on hover (hands typing, gavel, stamp…).
 * Pixi Graphics only (D-010) — no external bitmaps.
 */
/* global PIXI */

/** Local palette (mirrors shapes.RAMPS — no import to avoid circular dep). */
function hex(h) {
  return parseInt(String(h).replace("#", ""), 16);
}
const C = {
  ink: hex("#2F4266"),
  inkSoft: hex("#4A5F8A"),
  crepi: hex("#F2ECE0"),
  crepiBase: hex("#EDE8DC"),
  mol: hex("#A89F8D"),
  molBase: hex("#C9BCA3"),
  molLight: hex("#DCD2BE"),
  gc: hex("#3E7A52"),
  gcLight: hex("#5A9A6E"),
  ce: hex("#C9A45C"),
  ceShadow: hex("#A08040"),
  peau: hex("#E0B890"),
  pave: hex("#B8B2A6"),
};
const INK = () => C.ink;
const INK_SOFT = () => C.inkSoft;
const CREPI = () => C.crepi;
const MOL = () => C.mol;
const GC = () => C.gc;
const CE = () => C.ce;
const PEAU = () => C.peau;
const PAVE = () => C.pave;

/**
 * Resolve icon kind from room role / id (semantic map).
 * @param {{ id?: string, role?: string, label?: string }} room
 */
export function resolveIconKind(room) {
  const id = room?.id || "";
  const role = room?.role || "";
  if (role === "hemicycle" || id === "plenum-gc") return "hemicycle";
  if (id === "bureau-gc") return "bureau";
  if (id === "commission") return "commission";
  if (role === "delays-board" || id === "sgc" || role === "secretariat")
    return "secretariat";
  if (id === "pas-perdus") return "lobby";
  if (role === "council-table" || id === "college-ce") return "college";
  if (role === "anteroom" || id === "csg") return "csg";
  if (role === "chancellerie" || id === "chancellerie") return "seal";
  if (role === "cabinet") return "cabinet";
  if (role === "projet") return "projet";
  if (role === "guichet-citoyen") return "guichet";
  if (role === "publication") return "publication";
  return "generic";
}

/**
 * @param {object} room
 * @param {number} rw room width
 * @param {number} rh room height
 * @returns {PIXI.Container}
 */
export function createRoomIcon(room, rw, rh) {
  const kind = resolveIconKind(room);
  // plus lisible : ~58 % de la plus petite dimension (ratios zoom conservés via world-space)
  const s = Math.max(16, Math.min(rw, rh) * 0.58);
  const root = new PIXI.Container();
  root.__isRoomIcon = true;
  root.__iconKind = kind;
  root.__roomId = room.id;
  root.__hover = false;
  root.__t0 = Math.random() * 10;

  const staticG = new PIXI.Graphics();
  const animG = new PIXI.Graphics();
  const fxG = new PIXI.Graphics(); // hover-only effects (screen lines, bubbles…)
  root.addChild(staticG);
  root.addChild(animG);
  root.addChild(fxG);
  root.__static = staticG;
  root.__anim = animG;
  root.__fx = fxG;

  // builders paint into static/anim; anim parts repositioned in update()
  const builders = {
    hemicycle: buildHemicycle,
    bureau: buildBureau,
    commission: buildCommission,
    secretariat: buildSecretariat,
    lobby: buildLobby,
    college: buildCollege,
    csg: buildCsg,
    seal: buildSeal,
    cabinet: buildCabinet,
    projet: buildProjet,
    guichet: buildGuichet,
    publication: buildPublication,
    generic: buildGeneric,
  };
  const build = builders[kind] || buildGeneric;
  const parts = build(staticG, animG, s) || {};
  root.__parts = parts;

  // QA / legacy flags
  if (kind === "hemicycle") {
    root.__hasHemicycle = true;
    root.__signature = "hemicycle-arcs";
  }
  if (kind === "college") {
    root.__hasCouncilTable = true;
    root.__signature = "college-ellipse";
  }
  if (kind === "secretariat") {
    root.__hasSgcIcon = true;
    root.__signature = "sgc-typing";
  }
  if (kind === "seal") root.__signature = "chancellerie-seal";

  root.setHover = (on) => {
    root.__hover = !!on;
    if (!on) {
      fxG.clear();
      fxG.alpha = 0;
    } else {
      fxG.alpha = 1;
    }
  };

  root.update = (t) => {
    const hover = root.__hover;
    const phase = t + root.__t0;
    updateIcon(kind, root, parts, phase, hover, s);
  };

  // initial idle pose
  root.update(0);
  return root;
}

/** Tick all icons registered on a building view (or scene). */
export function tickRoomIcons(scene, t) {
  for (const id of Object.keys(scene.siteViews || {})) {
    const icons = scene.siteViews[id]?.view?.__roomIcons;
    if (!icons) continue;
    for (const icon of Object.values(icons)) {
      if (icon && typeof icon.update === "function") icon.update(t);
    }
  }
}

/** Activate / deactivate hover animation for a room. */
export function setRoomIconHover(scene, siteId, roomId, on) {
  for (const id of Object.keys(scene.siteViews || {})) {
    const icons = scene.siteViews[id]?.view?.__roomIcons;
    if (!icons) continue;
    for (const [rid, icon] of Object.entries(icons)) {
      if (!icon?.setHover) continue;
      const active = on && id === siteId && rid === roomId;
      icon.setHover(active);
    }
  }
}

// ─── builders (origin 0,0 = icon center) ───────────────────────────────────

function buildHemicycle(st, an, s) {
  st.lineStyle(1.4, GC(), 0.7);
  for (const f of [1, 0.72, 0.48]) {
    st.arc(0, s * 0.12, s * 0.45 * f, Math.PI, 0, false);
  }
  // tribune
  st.lineStyle(1.1, MOL(), 0.85);
  st.beginFill(C.molBase, 0.9);
  st.drawRoundedRect(-s * 0.12, -s * 0.22, s * 0.24, s * 0.14, 1.5);
  st.endFill();
  // speaker (anim: bob)
  an.beginFill(PEAU(), 1);
  an.drawCircle(0, -s * 0.32, s * 0.07);
  an.endFill();
  an.beginFill(INK(), 0.85);
  an.drawRoundedRect(-s * 0.06, -s * 0.26, s * 0.12, s * 0.1, 1);
  an.endFill();
  return { speaker: an };
}

function buildBureau(st, an, s) {
  // desk
  st.lineStyle(1.1, MOL(), 0.9);
  st.beginFill(C.molLight, 0.95);
  st.drawRoundedRect(-s * 0.38, s * 0.05, s * 0.76, s * 0.22, 2);
  st.endFill();
  // paper
  st.beginFill(CREPI(), 1);
  st.drawRect(-s * 0.18, s * 0.08, s * 0.22, s * 0.14);
  st.endFill();
  // gavel (anim: rotate)
  an.lineStyle(1.6, MOL(), 1);
  an.moveTo(s * 0.12, -s * 0.05);
  an.lineTo(s * 0.28, -s * 0.28);
  an.lineStyle(0);
  an.beginFill(MOL(), 1);
  an.drawRoundedRect(s * 0.22, -s * 0.36, s * 0.16, s * 0.1, 1.5);
  an.endFill();
  an.pivot.set(s * 0.18, -s * 0.08);
  an.position.set(s * 0.18, -s * 0.08);
  return { gavel: an };
}

function buildCommission(st, an, s) {
  // table
  st.lineStyle(1.1, MOL(), 0.9);
  st.beginFill(C.molLight, 0.95);
  st.drawEllipse(0, s * 0.08, s * 0.38, s * 0.16);
  st.endFill();
  // three seats (static)
  for (const [dx, dy] of [
    [-s * 0.28, -s * 0.08],
    [0, -s * 0.18],
    [s * 0.28, -s * 0.08],
  ]) {
    st.beginFill(PEAU(), 1);
    st.drawCircle(dx, dy, s * 0.065);
    st.endFill();
    st.beginFill(INK_SOFT(), 0.75);
    st.drawRoundedRect(dx - s * 0.05, dy + s * 0.04, s * 0.1, s * 0.08, 1);
    st.endFill();
  }
  // speech dots (anim alpha via fx)
  return { table: st };
}

function buildSecretariat(st, an, s) {
  // desk
  st.lineStyle(1, MOL(), 0.85);
  st.beginFill(C.molLight, 0.95);
  st.drawRoundedRect(-s * 0.4, s * 0.12, s * 0.8, s * 0.18, 1.5);
  st.endFill();
  // monitor
  st.lineStyle(1.1, INK(), 0.8);
  st.beginFill(0x2a3548, 0.95);
  st.drawRoundedRect(-s * 0.22, -s * 0.22, s * 0.44, s * 0.32, 2);
  st.endFill();
  st.beginFill(0x1a2230, 1);
  st.drawRect(-s * 0.18, -s * 0.17, s * 0.36, s * 0.22);
  st.endFill();
  // stand
  st.lineStyle(1.2, MOL(), 0.9);
  st.moveTo(0, s * 0.1);
  st.lineTo(0, s * 0.14);
  st.moveTo(-s * 0.1, s * 0.14);
  st.lineTo(s * 0.1, s * 0.14);
  // person head + body (static)
  st.beginFill(PEAU(), 1);
  st.drawCircle(-s * 0.02, s * 0.02, s * 0.075);
  st.endFill();
  st.beginFill(INK_SOFT(), 0.85);
  st.drawRoundedRect(-s * 0.1, s * 0.08, s * 0.16, s * 0.12, 1.5);
  st.endFill();
  // hands (anim — redraw positions)
  an.beginFill(PEAU(), 1);
  an.drawCircle(-s * 0.1, s * 0.18, s * 0.045);
  an.drawCircle(s * 0.06, s * 0.18, s * 0.045);
  an.endFill();
  return { hands: an, handBaseY: s * 0.18, handSpread: s * 0.08 };
}

function buildLobby(st, an, s) {
  // arch / hall hint
  st.lineStyle(1.3, MOL(), 0.7);
  st.arc(0, s * 0.2, s * 0.35, Math.PI, 0, false);
  st.moveTo(-s * 0.35, s * 0.2);
  st.lineTo(-s * 0.35, s * 0.35);
  st.moveTo(s * 0.35, s * 0.2);
  st.lineTo(s * 0.35, s * 0.35);
  // walker (anim bob + stride)
  an.beginFill(PEAU(), 1);
  an.drawCircle(0, -s * 0.12, s * 0.07);
  an.endFill();
  an.beginFill(INK_SOFT(), 0.85);
  an.drawRoundedRect(-s * 0.06, -s * 0.05, s * 0.12, s * 0.16, 1.5);
  an.endFill();
  an.lineStyle(1.4, INK(), 0.8);
  an.moveTo(-s * 0.02, s * 0.1);
  an.lineTo(-s * 0.08, s * 0.28);
  an.moveTo(s * 0.02, s * 0.1);
  an.lineTo(s * 0.08, s * 0.28);
  return { walker: an };
}

function buildCollege(st, an, s) {
  st.lineStyle(1.2, MOL(), 1);
  st.beginFill(0xe2dac8, 0.92);
  st.drawEllipse(0, s * 0.05, s * 0.42, s * 0.22);
  st.endFill();
  // 7 seats around table
  for (let i = 0; i < 7; i++) {
    const a = (Math.PI * 2 * i) / 7 - Math.PI / 2;
    const rx = Math.cos(a) * s * 0.38;
    const ry = Math.sin(a) * s * 0.22 + s * 0.05;
    st.beginFill(CE(), 0.85);
    st.drawCircle(rx, ry, s * 0.055);
    st.endFill();
  }
  return { table: st };
}

function buildCsg(st, an, s) {
  // shared table
  st.lineStyle(1, MOL(), 0.85);
  st.beginFill(C.molLight, 0.95);
  st.drawRoundedRect(-s * 0.36, s * 0.05, s * 0.72, s * 0.16, 2);
  st.endFill();
  // two secretaries facing
  for (const dx of [-s * 0.16, s * 0.16]) {
    st.beginFill(PEAU(), 1);
    st.drawCircle(dx, -s * 0.08, s * 0.07);
    st.endFill();
    st.beginFill(INK_SOFT(), 0.8);
    st.drawRoundedRect(dx - s * 0.06, -s * 0.02, s * 0.12, s * 0.1, 1);
    st.endFill();
  }
  // papers
  st.beginFill(CREPI(), 1);
  st.drawRect(-s * 0.1, s * 0.08, s * 0.2, s * 0.1);
  st.endFill();
  return {};
}

function buildSeal(st, an, s) {
  // document
  st.lineStyle(1, MOL(), 0.8);
  st.beginFill(CREPI(), 1);
  st.drawRoundedRect(-s * 0.28, -s * 0.05, s * 0.4, s * 0.36, 1.5);
  st.endFill();
  st.lineStyle(0.8, INK(), 0.4);
  st.moveTo(-s * 0.18, s * 0.05);
  st.lineTo(s * 0.02, s * 0.05);
  st.moveTo(-s * 0.18, s * 0.12);
  st.lineTo(s * 0.05, s * 0.12);
  // stamp (anim press)
  an.lineStyle(1.4, MOL(), 0.95);
  an.beginFill(C.ceShadow, 0.9);
  an.drawCircle(s * 0.12, -s * 0.18, s * 0.14);
  an.endFill();
  an.lineStyle(1, MOL(), 0.7);
  an.drawCircle(s * 0.12, -s * 0.18, s * 0.08);
  an.position.set(0, 0);
  return { stamp: an, stampX: s * 0.12, stampY: -s * 0.18 };
}

function buildCabinet(st, an, s) {
  // desk
  st.lineStyle(1, MOL(), 0.85);
  st.beginFill(C.molLight, 0.95);
  st.drawRoundedRect(-s * 0.38, s * 0.1, s * 0.76, s * 0.2, 2);
  st.endFill();
  // dossier stack
  st.beginFill(C.gcLight, 0.9);
  st.drawRect(-s * 0.28, s * 0.0, s * 0.18, s * 0.12);
  st.endFill();
  st.beginFill(CE(), 0.9);
  st.drawRect(-s * 0.22, -s * 0.04, s * 0.18, s * 0.12);
  st.endFill();
  // chief (anim: slight nod)
  an.beginFill(PEAU(), 1);
  an.drawCircle(s * 0.08, -s * 0.08, s * 0.08);
  an.endFill();
  an.beginFill(INK(), 0.88);
  an.drawRoundedRect(s * 0.0, s * 0.0, s * 0.16, s * 0.14, 1.5);
  an.endFill();
  // phone on desk
  st.lineStyle(1, INK(), 0.7);
  st.beginFill(PAVE(), 0.95);
  st.drawRoundedRect(s * 0.22, s * 0.12, s * 0.12, s * 0.1, 1);
  st.endFill();
  return { chief: an };
}

function buildProjet(st, an, s) {
  // kanban board
  st.lineStyle(1.1, MOL(), 0.85);
  st.beginFill(C.crepiBase, 0.95);
  st.drawRoundedRect(-s * 0.4, -s * 0.28, s * 0.8, s * 0.55, 2);
  st.endFill();
  // columns
  st.lineStyle(0.8, MOL(), 0.45);
  st.moveTo(-s * 0.12, -s * 0.22);
  st.lineTo(-s * 0.12, s * 0.2);
  st.moveTo(s * 0.14, -s * 0.22);
  st.lineTo(s * 0.14, s * 0.2);
  // sticky notes (anim float)
  const notes = [
    { x: -s * 0.28, y: -s * 0.1, c: 0xf0d080 },
    { x: -s * 0.28, y: s * 0.05, c: 0xc8d9a8 },
    { x: 0.0, y: -s * 0.08, c: 0xb8d4ea },
    { x: s * 0.22, y: -s * 0.05, c: 0xe8b0a0 },
  ];
  an.lineStyle(0);
  for (const n of notes) {
    an.beginFill(n.c, 0.95);
    an.drawRoundedRect(n.x, n.y, s * 0.14, s * 0.12, 1);
    an.endFill();
  }
  return { notes: an, noteData: notes };
}

function buildGuichet(st, an, s) {
  st.lineStyle(1.1, INK(), 0.7);
  st.beginFill(PAVE(), 0.9);
  st.drawRect(-s * 0.35, s * 0.05, s * 0.7, s * 0.12);
  st.endFill();
  st.beginFill(PEAU(), 1);
  st.drawCircle(0, -s * 0.08, s * 0.08);
  st.endFill();
  return {};
}

function buildPublication(st, an, s) {
  st.lineStyle(1.1, INK(), 0.75);
  st.beginFill(CREPI(), 1);
  st.drawRoundedRect(-s * 0.2, -s * 0.22, s * 0.4, s * 0.45, 2);
  st.endFill();
  st.lineStyle(0.9, INK(), 0.5);
  for (let i = 0; i < 3; i++) {
    const y = -s * 0.1 + i * s * 0.1;
    st.moveTo(-s * 0.12, y);
    st.lineTo(s * 0.12, y);
  }
  return {};
}

function buildGeneric(st, an, s) {
  st.lineStyle(1.1, MOL(), 0.7);
  st.drawCircle(0, 0, s * 0.2);
  st.moveTo(-s * 0.1, 0);
  st.lineTo(s * 0.1, 0);
  return {};
}

// ─── per-frame animation ───────────────────────────────────────────────────

function updateIcon(kind, root, parts, t, hover, s) {
  const fx = root.__fx;
  const an = root.__anim;
  const speed = hover ? 1 : 0.35;

  switch (kind) {
    case "hemicycle": {
      if (parts.speaker) {
        parts.speaker.y = hover ? Math.sin(t * 6) * s * 0.03 : 0;
      }
      root.scale.set(hover ? 1 + Math.sin(t * 4) * 0.03 : 1);
      break;
    }
    case "bureau": {
      if (parts.gavel) {
        parts.gavel.rotation = hover
          ? Math.sin(t * 10) * 0.45
          : Math.sin(t * 1.2) * 0.04;
      }
      break;
    }
    case "commission": {
      fx.clear();
      if (hover) {
        const a = 0.35 + 0.45 * (0.5 + 0.5 * Math.sin(t * 5));
        fx.beginFill(INK(), a);
        for (let i = 0; i < 3; i++) {
          const ox = (i - 1) * s * 0.08;
          const oy = -s * 0.42 - i * s * 0.02 + Math.sin(t * 5 + i) * s * 0.02;
          fx.drawCircle(ox, oy, s * 0.035 * (1 - i * 0.15));
        }
        fx.endFill();
      }
      break;
    }
    case "secretariat": {
      // hands typing
      if (parts.hands) {
        const amp = hover ? s * 0.035 : s * 0.008;
        const yOff = Math.sin(t * (hover ? 14 : 3)) * amp;
        parts.hands.y = yOff;
        // alternate hands slightly
        parts.hands.x = Math.sin(t * (hover ? 11 : 2.5)) * (hover ? s * 0.02 : 0);
      }
      // screen text lines
      fx.clear();
      if (hover) {
        const nLines = 3 + Math.floor((Math.sin(t * 3) + 1) * 1.2);
        fx.lineStyle(1.1, 0x7ec8e8, 0.85);
        for (let i = 0; i < nLines; i++) {
          const ly = -s * 0.12 + i * s * 0.055;
          const w = s * 0.12 + ((Math.sin(t * 8 + i * 1.7) + 1) * 0.5) * s * 0.12;
          fx.moveTo(-s * 0.14, ly);
          fx.lineTo(-s * 0.14 + w, ly);
        }
        // cursor blink
        if (Math.floor(t * 3) % 2 === 0) {
          fx.lineStyle(1.2, 0xa8e0ff, 0.95);
          const cy = -s * 0.12 + (nLines - 1) * s * 0.055;
          const cx = -s * 0.14 + s * 0.2;
          fx.moveTo(cx, cy - s * 0.02);
          fx.lineTo(cx, cy + s * 0.02);
        }
      } else {
        // faint idle lines
        fx.lineStyle(0.9, 0x7ec8e8, 0.25);
        fx.moveTo(-s * 0.14, -s * 0.1);
        fx.lineTo(s * 0.08, -s * 0.1);
        fx.moveTo(-s * 0.14, -s * 0.04);
        fx.lineTo(s * 0.02, -s * 0.04);
      }
      break;
    }
    case "lobby": {
      if (parts.walker) {
        parts.walker.x = hover
          ? Math.sin(t * 3) * s * 0.12
          : Math.sin(t * 0.8) * s * 0.03;
        parts.walker.y = hover
          ? Math.abs(Math.sin(t * 6)) * s * 0.04
          : 0;
      }
      break;
    }
    case "college": {
      root.scale.set(hover ? 1 + Math.sin(t * 3) * 0.025 : 1);
      fx.clear();
      if (hover) {
        fx.lineStyle(1.2, CE(), 0.35 + 0.25 * Math.sin(t * 4));
        fx.drawEllipse(0, s * 0.05, s * 0.48, s * 0.26);
      }
      break;
    }
    case "csg": {
      // alternate nod via container skew-ish y on anim layer
      an.y = hover ? Math.sin(t * 5) * s * 0.02 : 0;
      fx.clear();
      if (hover) {
        fx.beginFill(INK(), 0.25 + 0.2 * Math.sin(t * 6));
        fx.drawCircle(-s * 0.16, -s * 0.28, s * 0.03);
        fx.drawCircle(s * 0.16, -s * 0.28, s * 0.03);
        fx.endFill();
      }
      break;
    }
    case "seal": {
      if (parts.stamp) {
        const press = hover ? (0.5 + 0.5 * Math.sin(t * 7)) * s * 0.12 : 0;
        parts.stamp.y = press;
      }
      fx.clear();
      if (hover) {
        // imprint fading on paper
        const a = 0.15 + 0.35 * Math.max(0, Math.sin(t * 7));
        fx.lineStyle(1.2, MOL(), a);
        fx.drawCircle(s * 0.12, s * 0.12, s * 0.1);
        fx.drawCircle(s * 0.12, s * 0.12, s * 0.055);
      }
      break;
    }
    case "cabinet": {
      if (parts.chief) {
        parts.chief.rotation = hover
          ? Math.sin(t * 4) * 0.08
          : Math.sin(t * 1.1) * 0.02;
        parts.chief.y = hover ? Math.sin(t * 4) * s * 0.015 : 0;
      }
      break;
    }
    case "projet": {
      if (parts.notes) {
        parts.notes.y = hover
          ? Math.sin(t * 5) * s * 0.03
          : Math.sin(t * 1.5) * s * 0.01;
        parts.notes.rotation = hover ? Math.sin(t * 3) * 0.03 : 0;
      }
      break;
    }
    default: {
      root.alpha = hover ? 0.95 + Math.sin(t * 4) * 0.05 : 0.9;
      break;
    }
  }

  // idle breathing for all
  if (!hover && kind !== "generic") {
    root.alpha = 0.88 + Math.sin(t * speed * 1.5) * 0.04;
  } else if (hover) {
    root.alpha = 1;
  }
}
