/**
 * Mode Parcours orchestrator (TASK-097).
 * READS flow scenario steps — never mutates flows/verdict/flow-engine.
 */
/* global PIXI */
import { SCENARIOS } from "./flows/index.js";
import { metaForStep, ACTIVITY_LABEL } from "./walkthrough-meta.js";
import { hexToNum, RAMPS, RESP_GOLD } from "../engine/shapes.js";
import {
  pathPointsStrict,
  pathIsManhattan,
  forceManhattanPolyline,
} from "../engine/path-graph.js";
import { ensureUiTokens } from "./ui-tokens.js";
import { ensureWalkthroughStyles } from "./walkthrough-styles.js";
import {
  collectScenarioStops as collectStopsShared,
  createStepBadgeController,
} from "./step-badges.js";
import {
  drawDossierBody,
  drawDossierFeed,
  createDossierToken,
  applyDossierScale,
  DOSSIER,
} from "./walkthrough-dossier.js";
import {
  mountAriane,
  createCardTimer,
  TIMER_CIRC,
} from "./walkthrough-ariane.js";

const ICON_GLYPH = {
  college: "◆",
  handover: "→",
  commission: "≡",
  vote: "●",
  debate: "◎",
  publish: "▣",
  generic: "○",
  citizen: "◇",
};

/**
 * @param {object} opts
 * @param {import('../engine/camera.js').Camera} opts.camera
 * @param {object} opts.scene
 * @param {() => void} [opts.onLod]
 * @param {(siteId:string, roomId?:string|null) => void} [opts.pinInspector]
 * @param {(siteId:string|null, roomId?:string|null) => void} [opts.onHoverFocus]
 */
export function installWalkthrough(opts) {
  const { camera, scene, onLod, pinInspector, onHoverFocus } = opts;
  ensureUiTokens();
  const reduced =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /** null = aucun scénario (défaut + après fin de parcours) */
  let scenarioId = null;
  let scenario = null;
  let index = 0;
  let playing = false;
  /**
   * Fin de parcours : panneau Rejouer (✓ / ✕) à la place du fil d'étapes.
   * @type {{ scenarioId: string, title: string, outcome: 'success'|'reject', msg: string }|null}
   */
  let endState = null;
  /** Pendant le trajet dossier : étape / salle de destination (animation « prochaine ») */
  let travelTo = null;
  /** R3 : lecture en pause sur une étape à rejectAlt, en attente du joueur */
  let awaitingChoice = false;
  /** true = reprendra autoplay après un choix « accepter » */
  let resumeAfterChoice = false;
  let speed = 1;
  let statusText = "Prêt — lancez la lecture";
  let timer = null;
  let blinkT = 0;
  let blinkView = null;
  let haloG = null;
  let haloPhase = 0; // 0=ping expand, 1=stable
  let haloSite = null;
  let dossier = null;
  let followDossier = false;
  let animPath = null;
  let animI = 0;
  let animFrac = 0;
  let pathLen = 0;

  // DOM card + icon — DOIVENT vivre dans #sovd-root (plein écran = seul le FS tree est visible)
  const hudMount =
    document.getElementById("sovd-root") || document.body;
  let card = document.getElementById("sovd-step-card");
  if (!card) {
    card = document.createElement("div");
    card.id = "sovd-step-card";
    hudMount.appendChild(card);
  } else if (card.parentElement !== hudMount && hudMount !== document.body) {
    hudMount.appendChild(card);
  }
  // CSS carte + fil d'Ariane (module walkthrough-styles.js)
  ensureWalkthroughStyles();
  let iconEl = document.getElementById("sovd-step-icon");
  if (!iconEl) {
    iconEl = document.createElement("div");
    iconEl.id = "sovd-step-icon";
    hudMount.appendChild(iconEl);
  } else if (iconEl.parentElement !== hudMount && hudMount !== document.body) {
    hudMount.appendChild(iconEl);
  }

  // Fil d'Ariane haut (module walkthrough-ariane.js)
  const sa = mountAriane(hudMount);
  const ariane = sa.root;
  const elSaLabel = sa.label;
  const elSaSteps = sa.steps;
  const elSaBranchRow = sa.branchRow;
  const elSaAwaitHint = sa.awaitHint;
  const elSaEndRow = sa.endRow;
  /** Anneau timer carte (module walkthrough-ariane.js) */
  const cardTimer = createCardTimer(card);
  /** @type {number|null} */
  let hoverStepI = null;
  /** Contrôleur pastilles n° (module partagé) — initialisé après siteWorldCenter */
  let badgeCtrl = null;
  /** @type {PIXI.Container[]} */
  let roomStepBadges = [];

  function stepsDecorated() {
    return (scenario?.steps || []).map((s) => ({
      ...s,
      meta: metaForStep(s),
    }));
  }

  function getState() {
    if (!scenario) {
      return {
        scenarioId: null,
        scenarioTitle: endState?.title || null,
        scenarioSubtitle: null,
        objectLabel: null,
        steps: [],
        index: 0,
        playing: false,
        awaitingChoice: false,
        resumeAfterChoice: false,
        speed,
        statusText,
        reduced,
        step: null,
        hasBranchChoice: false,
        dossierWorking: !!(dossier && dossier.__working),
        cardOpen: !!(card && card.classList.contains("is-open")),
        cardAnchoredToRoom: !!(cardAnchor && card.classList.contains("is-open")),
        cardAnchor: cardAnchor ? { ...cardAnchor } : null,
        walkthroughScale: walkthroughScale(),
        fitScale: camera.fitScale,
        lastPathInternal: !!(dossier && dossier.__lastPathInternal),
        lastPathManhattan: dossier ? !!dossier.__lastPathManhattan : true,
        lastPathPts: dossier?.__lastPathPts || 0,
        traveling: false,
        travelTargetStepI: null,
        endState: endState ? { ...endState } : null,
      };
    }
    const step = stepsDecorated()[index] || null;
    return {
      scenarioId,
      scenarioTitle: scenario.title,
      scenarioSubtitle: scenario.subtitle,
      objectLabel: scenario.objectLabel,
      steps: stepsDecorated(),
      index,
      playing,
      awaitingChoice,
      resumeAfterChoice,
      speed,
      statusText,
      reduced,
      step,
      hasBranchChoice: !!(step && step.rejectAlt),
      // K14/K15/K16 QA hooks
      dossierWorking: !!(dossier && dossier.__working),
      cardOpen: !!(card && card.classList.contains("is-open")),
      cardAnchoredToRoom: !!(cardAnchor && card.classList.contains("is-open")),
      cardAnchor: cardAnchor ? { ...cardAnchor } : null,
      walkthroughScale: walkthroughScale(),
      fitScale: camera.fitScale,
      lastPathInternal: !!(dossier && dossier.__lastPathInternal),
      // path-on-board QA (Mode Parcours dossier)
      lastPathManhattan: dossier ? !!dossier.__lastPathManhattan : true,
      lastPathPts: dossier?.__lastPathPts || 0,
      traveling: !!travelTo,
      travelTargetStepI: travelTo?.stepI ?? null,
      dossierFollowing: !!followDossier,
      endState: null,
    };
  }

  function notify() {
    if (typeof api.onChange === "function") api.onChange(getState());
  }

  function clearTimer() {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    cardTimer.stop();
  }

  function stopStepTimer() {
    cardTimer.stop();
  }

  /** Anneau qui s'épuise pendant la durée de lecture de l'étape (sans texte). */
  function startStepTimer(ms) {
    cardTimer.start(ms, { playing, awaitingChoice });
  }

  function updateStepTimerVisual() {
    cardTimer.tick();
  }

  function siteWorldCenter(siteId, roomId) {
    const entry = scene.siteViews[siteId];
    if (!entry?.view) return null;
    const v = entry.view;
    // K10: prefer room center when room is the action locus
    if (roomId && v.__roomDoors) {
      const rd = v.__roomDoors.find((d) => d.roomId === roomId);
      if (rd?.rect) {
        const ox = v.x;
        const oy = v.y + (v.__roomsLayer?.y || 0);
        return {
          x: ox + rd.rect.x + rd.rect.w / 2,
          y: oy + rd.rect.y + rd.rect.h / 2,
          doorX: ox + rd.x,
          doorY: oy + rd.y,
          view: v,
          def: entry.def,
          roomId,
        };
      }
    }
    return {
      x: v.x + (v.__w || 0) / 2,
      y: v.y + (v.__h || 0) / 2,
      doorX: v.x + (v.__w || 0) / 2,
      doorY:
        v.__buildingDoor?.side === "n"
          ? v.y
          : v.y + (v.__h || 0),
      view: v,
      def: entry.def,
      roomId: roomId || null,
    };
  }

  /**
   * K16: walkthrough zoom — keep dossier centered but wider than room-tight
   * so plan context stays readable (closer to fit than previous 1.85×).
   */
  function walkthroughScale() {
    const fit = camera.fitScale || 1;
    // wider overview: ~1.15–1.35× fit (was ~1.85× / ≥1.9 — too tight)
    const target = Math.max(fit * 1.12, Math.min(fit * 1.32, 1.45));
    return Math.min(camera.maxScale, Math.max(camera.minScale || fit, target));
  }

  function focusSite(siteId, roomId) {
    const c = siteWorldCenter(siteId, roomId);
    if (!c) return;
    // K20: pan only — do NOT change user zoom (centerOn keeps current scale)
    camera.centerOn(c.x, c.y);
    if (onLod) onLod(camera.scale, true);
    if (scene.screenLabels) scene.screenLabels.update();
    // K11: NO building blink / halo / stripes — dossier is the indicator
    stopHalo();
    if (pinInspector) pinInspector(siteId, roomId || null);
  }

  /**
   * Soft preview (fil d'Ariane hover): pan + room hover, no pin / no dossier travel.
   */
  function preview(i) {
    const steps = scenario?.steps || [];
    if (i < 0 || i >= steps.length) return;
    const step = steps[i];
    const meta = metaForStep(step);
    const roomId = meta.roomId || null;
    const c = siteWorldCenter(step.siteId, roomId);
    if (c) {
      camera.centerOn(c.x, c.y);
      if (onLod) onLod(camera.scale, true);
      if (scene.screenLabels) scene.screenLabels.update();
    }
    if (typeof onHoverFocus === "function") {
      onHoverFocus(step.siteId, roomId);
    }
  }

  function clearPreview() {
    if (typeof onHoverFocus === "function") {
      // only clear if not playing a committed step pin
      if (!playing) onHoverFocus(null);
    }
  }

  /** Active room for card anchor (K15). */
  let cardAnchor = null; // { siteId, roomId }

  function ensureHalo() {
    if (haloG) return haloG;
    haloG = new PIXI.Graphics();
    haloG.zIndex = 49_000;
    haloG.eventMode = "none";
    scene.tilemap.buildingsLayer.addChild(haloG);
    return haloG;
  }

  function startHalo(view, siteId) {
    stopHalo();
    if (!view) return;
    blinkView = view; // keep ref for tint
    haloSite = siteId;
    haloPhase = reduced ? 1 : 0;
    blinkT = 0;
    const def = scene.siteViews[siteId]?.def;
    const tint =
      def?.kind === "parlement"
        ? 0x3e7a52
        : def?.kind === "chateau"
          ? 0xc9a45c
          : def?.deptTint
            ? parseInt(String(def.deptTint).replace("#", ""), 16)
            : 0x2f4266;
    view.__haloTint = tint;
    // subtle stable lift of fill
    view.alpha = 1;
    ensureHalo();
    drawHalo(view, 1, 0.35);
  }

  function drawHalo(view, expand, alpha) {
    if (!haloG || !view) return;
    haloG.clear();
    const pad = 4 + expand * 10;
    const col = view.__haloTint || 0x2f4266;
    haloG.lineStyle(3, col, alpha * 0.85);
    haloG.drawRoundedRect(
      view.x - pad,
      view.y - pad,
      (view.__w || 0) + pad * 2,
      (view.__h || 0) + pad * 2,
      8
    );
    haloG.lineStyle(1.5, 0xffffff, alpha * 0.35);
    haloG.drawRoundedRect(
      view.x - pad + 2,
      view.y - pad + 2,
      (view.__w || 0) + pad * 2 - 4,
      (view.__h || 0) + pad * 2 - 4,
      6
    );
  }

  function stopHalo() {
    if (haloG) haloG.clear();
    if (blinkView) {
      blinkView.alpha = 1;
      blinkView = null;
    }
    haloSite = null;
    haloPhase = 0;
  }

  function stopBlink() {
    stopHalo();
  }

  function pathLength(pts) {
    let L = 0;
    for (let i = 1; i < pts.length; i++) {
      L += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    }
    return L || 1;
  }

  /**
   * Join current dossier position onto the board path with a short Manhattan stub
   * (never diagonal — stay on circulation language).
   */
  function prependFromCurrent(pts, d) {
    if (!pts?.length || !d) return pts;
    const cur = { x: d.x, y: d.y };
    const first = pts[0];
    const dist = Math.hypot(cur.x - first.x, cur.y - first.y);
    if (dist < 2) return pts;
    // axis-aligned join: H then V (or V then H if closer on Y first)
    const stub =
      Math.abs(cur.x - first.x) >= Math.abs(cur.y - first.y)
        ? [
            cur,
            { x: first.x, y: cur.y },
            first,
          ]
        : [
            cur,
            { x: cur.x, y: first.y },
            first,
          ];
    // drop duplicate first of pts
    return stub.concat(pts.slice(1));
  }

  /**
   * Board path for dossier travel — same engine as flux pin (connections).
   * Interior = pathMeta corridor/rails ; exterior = spine esplanade.
   */
  function dossierPath(fromSiteId, fromRoomId, toSiteId, toRoomId) {
    if (!fromSiteId || !toSiteId) return null;
    const pts = pathPointsStrict(
      scene,
      fromSiteId,
      fromRoomId || null,
      toSiteId,
      toRoomId || null
    );
    if (!pts || pts.length < 2) return null;
    return pts;
  }

  /**
   * K15: card anchored to the ACTION ROOM (not glued to dossier token).
   * Dossier remains the fil conducteur; explanation belongs to the place.
   */
  function isSecretStep(step) {
    if (!step) return false;
    if (step.secretBallot) return true;
    const meta = metaForStep(step);
    return (
      /secret/i.test(meta.legal || "") ||
      /secret/i.test(step.actLabel || "") ||
      step.id === "gr-3-scrutin"
    );
  }

  function ensureBadgeCtrl() {
    if (!badgeCtrl) {
      badgeCtrl = createStepBadgeController({
        scene,
        camera,
        siteWorldCenter,
      });
    }
    return badgeCtrl;
  }

  function collectScenarioStops() {
    return collectStopsShared(scenario?.steps || [], metaForStep);
  }

  function clearRoomStepBadges() {
    ensureBadgeCtrl().clear();
    roomStepBadges = [];
  }

  function isDrawerOpen() {
    if (typeof document === "undefined") return false;
    return !!document.querySelector(
      "#sovd-root.sovd-drawer-open, .sovd-root.sovd-drawer-open"
    );
  }

  function shellEl() {
    return (
      document.getElementById("sovd-root") ||
      document.querySelector(".sovd-root") ||
      document.body
    );
  }

  function badgeHighlightState() {
    const curStep = scenario?.steps?.[index];
    const curMeta = curStep ? metaForStep(curStep) : null;
    const drawerOpen = isDrawerOpen();
    return {
      index,
      travelTo,
      followDossier,
      awaitingChoice,
      curSite: curStep?.siteId || null,
      curRoom: curMeta?.roomId || null,
      hideAll: drawerOpen,
    };
  }

  function updateRoomStepBadgesHighlight() {
    const ctrl = ensureBadgeCtrl();
    roomStepBadges = ctrl.badges;
    ctrl.updateHighlight(badgeHighlightState());
  }

  function repositionRoomStepBadges(force) {
    const ctrl = ensureBadgeCtrl();
    roomStepBadges = ctrl.badges;
    if (!roomStepBadges.length) return;
    if (isDrawerOpen()) {
      for (const c of roomStepBadges) c.visible = false;
      return;
    }
    ctrl.reposition({ force: !!force });
  }

  function rebuildRoomStepBadges() {
    const ctrl = ensureBadgeCtrl();
    if (!scenario?.steps?.length) {
      clearRoomStepBadges();
      return;
    }
    ctrl.rebuild(collectScenarioStops(), { zIndex: 2500 });
    roomStepBadges = ctrl.badges;
    updateRoomStepBadgesHighlight();
  }

  /** Panneau fin de parcours : Rejouer (✓) / fermer (✕). */
  function showEndAriane() {
    if (!endState) {
      hideAriane();
      return;
    }
    ariane.classList.add("is-open", "is-end");
    ariane.classList.remove("is-awaiting");
    ariane.classList.toggle("outcome-success", endState.outcome === "success");
    ariane.classList.toggle("outcome-reject", endState.outcome === "reject");
    if (elSaSteps) elSaSteps.innerHTML = "";
    if (elSaBranchRow) elSaBranchRow.innerHTML = "";
    if (elSaAwaitHint) elSaAwaitHint.textContent = "";
    const outcomeIco = endState.outcome === "reject" ? "✕" : "✓";
    const outcomeLab =
      endState.outcome === "reject"
        ? "Fin par rejet"
        : "Parcours abouti";
    // Libellé court uniquement (jamais la prose successLesson de dernière étape)
    elSaLabel.textContent = endState.title
      ? `${outcomeLab} — ${endState.title}`
      : outcomeLab;
    if (elSaEndRow) {
      elSaEndRow.innerHTML = `
        <button type="button" class="sa-end-btn replay" data-act="replay"
          title="Rejouer ce scénario">
          <span class="sa-end-ico" aria-hidden="true">✓</span>
          <span>Rejouer</span>
        </button>
        <button type="button" class="sa-end-btn dismiss" data-act="dismiss"
          title="Fermer">
          <span class="sa-end-ico" aria-hidden="true">✕</span>
        </button>
      `;
      elSaEndRow.querySelectorAll("[data-act]").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          const act = btn.getAttribute("data-act");
          if (act === "replay") replayLastScenario();
          else dismissEndChoice();
        });
      });
    }
  }

  function dismissEndChoice() {
    if (!endState) return;
    endState = null;
    hideAriane();
    statusText = "Aucun scénario — choisissez dans le menu";
    notify();
  }

  function replayLastScenario() {
    const id = endState?.scenarioId;
    if (!id || !SCENARIOS[id]) {
      dismissEndChoice();
      return;
    }
    endState = null;
    setScenario(id, { autoPlay: true });
  }

  function updateTopAriane() {
    // fin de parcours prioritaire
    if (endState) {
      showEndAriane();
      return;
    }
    const steps = scenario?.steps || [];
    if (!steps.length) {
      ariane.classList.remove("is-open", "is-awaiting", "is-end");
      ariane.classList.remove("outcome-success", "outcome-reject");
      if (elSaSteps) elSaSteps.innerHTML = "";
      if (elSaLabel) elSaLabel.textContent = "";
      if (elSaBranchRow) elSaBranchRow.innerHTML = "";
      if (elSaEndRow) elSaEndRow.innerHTML = "";
      return;
    }
    ariane.classList.add("is-open");
    ariane.classList.remove("is-end", "outcome-success", "outcome-reject");
    if (elSaEndRow) elSaEndRow.innerHTML = "";
    ariane.classList.toggle("is-awaiting", !!awaitingChoice);
    const nextI = travelTo?.stepI;
    elSaSteps.innerHTML = steps
      .map((s, i) => {
        const isBranch = !!s.rejectAlt;
        const isAwait = !!awaitingChoice && !travelTo && i === index;
        const cls = [
          !travelTo && i === index ? "is-active" : "",
          travelTo && i === nextI ? "is-next" : "",
          i < (travelTo ? nextI : index) ? "is-done" : "",
          hoverStepI === i ? "is-hover" : "",
          isBranch ? "is-branch" : "",
          isAwait ? "is-awaiting" : "",
        ]
          .filter(Boolean)
          .join(" ");
        const fork = isBranch
          ? `<span class="sa-fork" title="Étape à choix d'issue" aria-hidden="true">⑂</span>`
          : "";
        const title = isBranch
          ? `${s.actLabel || s.id} · choix d'issue`
          : s.actLabel || s.id;
        return `<li class="${cls}" data-i="${i}" title="${esc(
          title
        )}"><span class="sa-n">${i + 1}</span>${fork}</li>`;
      })
      .join("");
    // label : hover prioritaire, sinon prochaine (trajet), sinon étape courante
    const labelI =
      hoverStepI != null
        ? hoverStepI
        : travelTo
          ? travelTo.stepI
          : index;
    const labStep = steps[labelI];
    elSaLabel.textContent = labStep
      ? labStep.actLabel || labStep.id
      : "";

    // mindmap de branche : chips accept / reject quand input requis
    if (elSaBranchRow) {
      const cur = steps[index];
      if (awaitingChoice && cur?.rejectAlt && !travelTo) {
        const acceptLab = cur.actLabel || "Accepter";
        const rejectLab = cur.rejectAlt.actLabel || "Rejeter";
        elSaBranchRow.innerHTML = `
          <button type="button" class="sa-branch-chip accept" data-choice="accept" title="${esc(
            acceptLab
          )}">✓ ${esc(shortChip(acceptLab))}</button>
          <button type="button" class="sa-branch-chip reject" data-choice="reject" title="${esc(
            rejectLab
          )}">✕ ${esc(shortChip(rejectLab))}</button>
        `;
        elSaBranchRow.querySelectorAll("[data-choice]").forEach((btn) => {
          btn.addEventListener("click", (e) => {
            e.stopPropagation();
            if (btn.getAttribute("data-choice") === "reject") chooseReject();
            else chooseAccept();
          });
        });
      } else {
        elSaBranchRow.innerHTML = "";
      }
    }
    if (elSaAwaitHint) {
      elSaAwaitHint.textContent = awaitingChoice
        ? "À vous de choisir une issue"
        : "";
    }

    elSaSteps.querySelectorAll("li[data-i]").forEach((li) => {
      const i = Number(li.getAttribute("data-i"));
      li.addEventListener("mouseenter", () => {
        hoverStepI = i;
        const st = scenario.steps[i];
        if (!st) return;
        const meta = metaForStep(st);
        elSaLabel.textContent = st.actLabel || st.id;
        elSaSteps.querySelectorAll("li").forEach((x) => {
          x.classList.toggle(
            "is-hover",
            Number(x.getAttribute("data-i")) === i
          );
        });
        if (typeof onHoverFocus === "function") {
          onHoverFocus(st.siteId, meta.roomId || null);
        }
      });
      li.addEventListener("mouseleave", () => {
        hoverStepI = null;
        const li2 =
          travelTo != null
            ? scenario.steps[travelTo.stepI]
            : scenario.steps[index];
        elSaLabel.textContent = li2?.actLabel || li2?.id || "";
        elSaSteps.querySelectorAll("li").forEach((x) =>
          x.classList.remove("is-hover")
        );
        if (typeof onHoverFocus === "function") onHoverFocus(null);
      });
      li.addEventListener("click", (e) => {
        e.stopPropagation();
        // En lecture : saute à l'étape et continue le play (pas de pause)
        const keepPlay = playing;
        clearTimer();
        awaitingChoice = false;
        travelTo = null;
        goto(i, { keepPlay });
      });
    });
  }

  function shortChip(s) {
    const t = String(s || "");
    return t.length > 28 ? `${t.slice(0, 26)}…` : t;
  }

  /**
   * Hover carte → surbrille l'étape correspondante dans le fil d'Ariane.
   * Bidirectionnel avec hover fil d'Ariane → carte.
   */
  function syncHoverFromMap(siteId, roomId) {
    if (!scenario?.steps?.length) return;
    if (!siteId) {
      hoverStepI = null;
      updateTopArianeHighlightOnly();
      return;
    }
    const rid = roomId || null;
    let found = -1;
    for (let i = 0; i < scenario.steps.length; i++) {
      const st = scenario.steps[i];
      const meta = metaForStep(st);
      if (st.siteId === siteId && (meta.roomId || null) === rid) {
        found = i;
        break;
      }
    }
    if (found < 0) {
      for (let i = 0; i < scenario.steps.length; i++) {
        if (scenario.steps[i].siteId === siteId) {
          found = i;
          break;
        }
      }
    }
    hoverStepI = found >= 0 ? found : null;
    updateTopArianeHighlightOnly();
  }

  function updateTopArianeHighlightOnly() {
    if (!elSaSteps || !scenario?.steps) return;
    const nextI = travelTo?.stepI;
    ariane.classList.toggle("is-awaiting", !!awaitingChoice);
    elSaSteps.querySelectorAll("li[data-i]").forEach((li) => {
      const i = Number(li.getAttribute("data-i"));
      li.classList.toggle("is-active", !travelTo && i === index);
      li.classList.toggle("is-next", !!travelTo && i === nextI);
      li.classList.toggle("is-done", i < (travelTo ? nextI : index));
      li.classList.toggle("is-hover", hoverStepI === i);
      li.classList.toggle(
        "is-awaiting",
        !!awaitingChoice && !travelTo && i === index
      );
    });
    if (hoverStepI != null && scenario.steps[hoverStepI]) {
      elSaLabel.textContent =
        scenario.steps[hoverStepI].actLabel || scenario.steps[hoverStepI].id;
    } else if (travelTo && scenario.steps[travelTo.stepI]) {
      elSaLabel.textContent =
        scenario.steps[travelTo.stepI].actLabel ||
        scenario.steps[travelTo.stepI].id;
    } else if (scenario.steps[index]) {
      elSaLabel.textContent =
        scenario.steps[index].actLabel || scenario.steps[index].id;
    }
  }

  function placeCardNear(siteId, step) {
    const meta = metaForStep(step);
    const act = ACTIVITY_LABEL[meta.activity] || ACTIVITY_LABEL.generic;
    // D : scrutin secret — badge + urne, pas de voix individuelles
    const secret = isSecretStep(step);
    const secretBadge = secret
      ? `<div class="sc-secret" title="Scrutin secret sans discussion">🔒 Scrutin secret · sans discussion</div>`
      : "";
    const alt = step.rejectAlt;
    // R3 : dès qu'il y a une branche, on attend un input (animation UX)
    const needsChoice = !!alt;
    if (needsChoice) awaitingChoice = true;
    const awaitBanner = needsChoice
      ? `<div class="sc-await-banner" role="status"><span class="sc-await-dot" aria-hidden="true"></span><span>À vous de jouer — choisissez une issue</span></div>`
      : "";
    const choiceHtml = alt
      ? `<div class="sc-choice" role="group" aria-label="Choisir une issue">
          <div class="sc-choice-h">Choisir une issue</div>
          <button type="button" class="sc-choice-btn accept" data-choice="accept">
            ${esc(step.actLabel || "Accepter / adopter")}
          </button>
          <button type="button" class="sc-choice-btn reject" data-choice="reject">
            ${esc(alt.actLabel || "Rejeter / classer")}
          </button>
        </div>`
      : "";
    const urneHtml = secret
      ? `<div class="sc-urne" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>
         <div class="sc-secret-hint">Les voix individuelles ne sont pas affichées — résultat global uniquement.</div>`
      : "";
    // panel contextuel dossier = TEXTE d'étape + anneau timer (lecture)
    card.innerHTML = `
      <div class="sc-timer" aria-hidden="true" title="Durée de l'étape">
        <svg viewBox="0 0 32 32" focusable="false">
          <circle class="sc-timer-track" cx="16" cy="16" r="12" />
          <circle class="sc-timer-arc" cx="16" cy="16" r="12"
            style="stroke-dasharray:${TIMER_CIRC};stroke-dashoffset:0" />
        </svg>
      </div>
      ${awaitBanner}
      <div class="sc-act">${esc(act)}</div>
      ${secretBadge}
      <div class="sc-title">${esc(step.actLabel || step.id)}</div>
      <div class="sc-body">${esc(meta.prose || step.successLesson || "")}</div>
      ${urneHtml}
      ${choiceHtml}
      <div class="sc-legal">${esc(meta.legal || "—")}</div>
    `;
    card.classList.add("is-open");
    card.classList.remove("has-timer");
    card.classList.toggle("is-secret", secret);
    card.classList.toggle("has-choice", !!alt);
    card.classList.toggle("is-awaiting", needsChoice);
    // si lecture déjà en cours (rebuild carte), le scheduleAdvance relance le timer
    // Classes d'état sur #sovd-root (pas body hôte) pour isoler l'embed iframe
    {
      const sh = shellEl();
      sh.classList.toggle("sovd-secret-ballot", secret);
      sh.classList.toggle("sovd-awaiting-choice", needsChoice);
      if (sh !== document.body) {
        document.body.classList.remove("sovd-secret-ballot", "sovd-awaiting-choice");
      }
    }
    iconEl.classList.remove("is-open");
    cardAnchor = { siteId, roomId: meta.roomId || null };
    // 2 passes : layout puis après paint (offsetHeight fiable)
    positionCardAtRoom();
    requestAnimationFrame(() => {
      positionCardAtRoom();
      requestAnimationFrame(() => positionCardAtRoom());
    });
    if (dossier) {
      dossier.__secret = secret;
      if (dossier.__body) {
        drawDossierBody(
          dossier.__body,
          !!dossier.__done,
          secret,
          !!dossier.__open
        );
      }
    }
    if (alt) {
      card.querySelectorAll("[data-choice]").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          const c = btn.getAttribute("data-choice");
          if (c === "reject") chooseReject();
          else chooseAccept();
        });
      });
    }
    updateTopAriane();
    updateRoomStepBadgesHighlight();
  }

  /**
   * Placement intelligent à côté de la salle courante (bbox pièce/bâtiment).
   * Jamais en position fixe gauche — toujours ancré à la focale d'étape.
   */
  function positionCardAtRoom() {
    if (!card.classList.contains("is-open") || !cardAnchor) return;
    const host =
      document.getElementById("game-host") ||
      document.getElementById("sovd-root");
    const hostW = host?.clientWidth || window.innerWidth;
    const hostH = host?.clientHeight || window.innerHeight;
    const cardW = Math.min(288, hostW - 28);
    const cardH = Math.min(
      card.offsetHeight || 180,
      Math.min(0.58 * hostH, 420)
    );

    const c = siteWorldCenter(cardAnchor.siteId, cardAnchor.roomId);
    // fallback : position du dossier s'il est dans la salle
    let cx;
    let cy;
    let halfW = 40;
    let halfH = 30;
    if (c) {
      cx = camera.x + c.x * camera.scale;
      cy = camera.y + c.y * camera.scale;
      if (c.rect) {
        halfW = Math.max(20, (c.rect.w / 2) * camera.scale);
        halfH = Math.max(16, (c.rect.h / 2) * camera.scale);
      } else if (c.view) {
        halfW = Math.max(20, ((c.view.__w || 40) / 2) * camera.scale * 0.45);
        halfH = Math.max(16, ((c.view.__h || 40) / 2) * camera.scale * 0.4);
      }
    } else if (dossier && dossier.visible) {
      cx = camera.x + dossier.x * camera.scale;
      cy = camera.y + dossier.y * camera.scale;
      halfW = 18;
      halfH = 16;
    } else {
      // dernier recours : centre écran (évite coin gauche figé)
      cx = hostW * 0.5;
      cy = hostH * 0.4;
      halfW = 0;
      halfH = 0;
    }

    const gap = 14;
    // candidats : droite / gauche / dessous / dessus de la salle
    const candidates = [
      { left: cx + halfW + gap, top: cy - cardH * 0.35, side: "right" },
      { left: cx - halfW - gap - cardW, top: cy - cardH * 0.35, side: "left" },
      { left: cx - cardW * 0.5, top: cy + halfH + gap, side: "below" },
      { left: cx - cardW * 0.5, top: cy - halfH - gap - cardH, side: "above" },
    ];
    function score(p) {
      let s = 0;
      // préférence droite
      if (p.side === "right") s += 40;
      if (p.side === "left") s += 25;
      if (p.side === "below") s += 10;
      // pénalité hors viewport
      const l = p.left;
      const t = p.top;
      const r = l + cardW;
      const b = t + cardH;
      if (l < 8) s -= (8 - l) * 2;
      if (t < 48) s -= (48 - t) * 2;
      if (r > hostW - 8) s -= (r - (hostW - 8)) * 2;
      if (b > hostH - 100) s -= (b - (hostH - 100)) * 2; // laisse place barre bas
      return s;
    }
    candidates.sort((a, b) => score(b) - score(a));
    const best = candidates[0];
    const left = Math.min(hostW - cardW - 8, Math.max(8, best.left));
    const top = Math.min(hostH - cardH - 96, Math.max(48, best.top));

    card.style.setProperty("left", `${Math.round(left)}px`, "important");
    card.style.setProperty("top", `${Math.round(top)}px`, "important");
    card.style.setProperty("right", "auto", "important");
    card.style.setProperty("bottom", "auto", "important");
    card.style.setProperty("transform", "none", "important");
    card.style.setProperty("width", `${cardW}px`, "important");
    card.dataset.side = best.side;
  }

  function hideCard() {
    stopStepTimer();
    card.classList.remove(
      "is-open",
      "is-secret",
      "has-choice",
      "is-awaiting",
      "has-timer"
    );
    {
      const sh = shellEl();
      sh.classList.remove("sovd-secret-ballot", "sovd-awaiting-choice");
      if (sh !== document.body) {
        document.body.classList.remove("sovd-secret-ballot", "sovd-awaiting-choice");
      }
    }
    iconEl.classList.remove("is-open");
    cardAnchor = null;
    if (dossier) {
      dossier.__secret = false;
      if (dossier.__body) {
        drawDossierBody(
          dossier.__body,
          !!dossier.__done,
          false,
          !!dossier.__open
        );
      }
    }
  }

  function hideAriane() {
    ariane.classList.remove(
      "is-open",
      "is-awaiting",
      "is-end",
      "outcome-success",
      "outcome-reject"
    );
    hoverStepI = null;
    if (elSaLabel) elSaLabel.textContent = "";
    if (elSaSteps) elSaSteps.innerHTML = "";
    if (elSaBranchRow) elSaBranchRow.innerHTML = "";
    if (elSaAwaitHint) elSaAwaitHint.textContent = "";
    if (elSaEndRow) elSaEndRow.innerHTML = "";
  }

  function esc(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  /** Classeur — rendu dans walkthrough-dossier.js */
  const DOSSIER_BODY = DOSSIER.BODY;
  const DOSSIER_EDGE = DOSSIER.EDGE;
  const FEED_SHEET = DOSSIER.FEED_SHEET;

  function applyDossierBaseScale(extra) {
    applyDossierScale(dossier, camera.scale, extra);
  }

  function ensureDossier() {
    if (dossier) return dossier;
    dossier = createDossierToken(scene, camera.scale);
    return dossier;
  }

  function setDossierWorking(on) {
    const d = ensureDossier();
    if (d.__fading && on) return;
    d.__fading = false;
    d.__fadeT = 0;
    d.alpha = 1;
    d.__working = !!on && !reduced;
    d.__open = !!on;
    d.__done = false;
    if (d.__body) drawDossierBody(d.__body, false, !!d.__secret, d.__open);
    if (!on && d.__feed) d.__feed.clear();
    d.visible = true;
    applyDossierBaseScale(1);
  }

  function setDossierDone() {
    const d = ensureDossier();
    if (d.__fading) return;
    d.__working = false;
    d.__open = true;
    d.__done = true;
    d.__fading = false;
    d.alpha = 1;
    d.visible = true;
    if (d.__feed) d.__feed.clear();
    if (d.__body) drawDossierBody(d.__body, true, !!d.__secret, true);
    applyDossierBaseScale(1);
  }

  function drawSpinner(d) {
    drawDossierFeed(d);
  }

  function moveDossierTo(siteId, then, fromSiteId, roomId, fromRoomId) {
    const c = siteWorldCenter(siteId, roomId);
    if (!c) {
      if (then) then();
      return;
    }
    const d = ensureDossier();
    // quitte la salle → classeur se referme (vide)
    setDossierWorking(false);
    d.__open = false;
    if (d.__body) drawDossierBody(d.__body, false, !!d.__secret, false);
    // ★ Same path topology as pin-flux (pathMeta + exterior spine)
    let pts = null;
    if (fromSiteId) {
      pts = dossierPath(fromSiteId, fromRoomId, siteId, roomId);
    }
    if (!pts || pts.length < 2) {
      // last resort: stay on axis to room center (no free diagonal flight)
      const from = {
        x: Number.isFinite(d.x) ? d.x : c.x,
        y: Number.isFinite(d.y) ? d.y : c.y,
      };
      pts = [
        from,
        { x: c.x, y: from.y },
        { x: c.x, y: c.y },
      ];
    } else if (Number.isFinite(d.x) && Number.isFinite(d.y)) {
      // join from current token position without leaving the board language
      pts = prependFromCurrent(pts, d);
    }
    // ensure Manhattan (repair diagonals if any slipped in)
    if (!pathIsManhattan(pts)) {
      pts = forceManhattanPolyline(pts);
    }
    animPath = pts;
    pathLen = pathLength(pts);
    animI = 0;
    animFrac = 0;
    followDossier = true;
    d.visible = true;
    d.alpha = 1;
    d.__traveling = true;
    d.__travelPulse = 0;
    d.__onArrive = then;
    d.__lastPathInternal = !!(fromSiteId && fromSiteId === siteId);
    d.__lastPathManhattan = pathIsManhattan(pts);
    d.__lastPathPts = pts.length;
    // dossier a quitté la salle → n° d'étape réapparaissent (dest en pulse)
    updateRoomStepBadgesHighlight();
  }

  function showStep(i, { travelFrom, travelFromRoom } = {}) {
    if (!scenario) return;
    const steps = scenario.steps || [];
    if (i < 0 || i >= steps.length) return;
    index = i;
    const step = steps[i];
    const meta = metaForStep(step);
    const siteId = step.siteId;
    const roomId = meta.roomId || null;
    // reset choice gate sauf si on revient sur une étape à branche
    awaitingChoice = false;
    statusText = playing
      ? `▶ ${i + 1}/${steps.length} — ${step.actLabel} · Pause pour explorer`
      : `Étape ${i + 1}/${steps.length} — ${step.actLabel}`;

    const runFocus = () => {
      // arrivée : fin d'animation « prochaine » ; dossier occupe le slot du n°
      travelTo = null;
      focusSite(siteId, roomId);
      // place dossier IN the action room
      const c = siteWorldCenter(siteId, roomId);
      const d = ensureDossier();
      if (c) {
        d.x = c.x;
        d.y = c.y;
        d.visible = true;
        d.alpha = 1;
      }
      setDossierWorking(true);
      // R3 : set awaiting AVANT placeCardNear (carte + fil d'Ariane + animation)
      if (step.rejectAlt) {
        awaitingChoice = true;
        if (playing) {
          resumeAfterChoice = true;
          playing = false;
          statusText = `Étape ${i + 1}/${steps.length} — à vous de choisir`;
        }
      }
      placeCardNear(siteId, step);
      // n° masqué (dossier en place)
      updateRoomStepBadgesHighlight();
      notify();
      // pas d'auto-avance si choix requis
      if (playing && !awaitingChoice) scheduleAdvance(step);
    };

    const prevMeta =
      travelFrom != null
        ? metaForStep(steps[Math.max(0, i - 1)])
        : null;
    const fromRoom =
      travelFromRoom != null ? travelFromRoom : prevMeta?.roomId || null;
    if (travelFrom && (travelFrom !== siteId || fromRoom !== roomId)) {
      // comme avant : carte OFF pendant le trajet, ON à l'arrivée en salle
      hideCard();
      setDossierWorking(false);
      // anime fil d'Ariane + n° chambre destination pendant le déplacement
      travelTo = { stepI: i, siteId, roomId };
      updateTopAriane();
      updateRoomStepBadgesHighlight();
      statusText =
        travelFrom === siteId
          ? `Circulation interne → ${roomId || siteId}`
          : `Navette → ${siteId}`;
      notify();
      moveDossierTo(siteId, runFocus, travelFrom, roomId, fromRoom);
    } else {
      travelTo = null;
      updateTopAriane();
      updateRoomStepBadgesHighlight();
      runFocus();
    }
  }

  function stepDurationMs(step) {
    const meta = metaForStep(step);
    const len = (meta.prose || "").length + (step.actLabel || "").length;
    // adaptive 2.2s .. 6.5s / speed
    const base = Math.min(6500, Math.max(2200, 1800 + len * 28));
    return base / Math.max(0.4, speed);
  }

  /**
   * Fin de parcours : card OFF + fade dossier + panneau Rejouer (✓ / ✕).
   * Libellé UI court uniquement (pas de successLesson / prose métier sur le panneau).
   * @param {string} [_msgIgnored]  ignoré — la leçon reste sur la carte d'étape, pas en fin
   * @param {{ outcome?: 'success'|'reject' }} [opts]
   */
  function finishParcours(_msgIgnored, opts = {}) {
    const finishedId = scenarioId;
    const finishedTitle = scenario?.title || "";
    const outcome = opts.outcome === "reject" ? "reject" : "success";
    // ★ Court : « Parcours abouti » / « Fin par rejet » (+ titre scénario)
    // Ne plus afficher le successLesson long (ex. S19 Chancellerie / votation…).
    const shortMsg =
      outcome === "reject" ? "Fin par rejet" : "Parcours abouti";
    playing = false;
    awaitingChoice = false;
    resumeAfterChoice = false;
    clearTimer();
    followDossier = false;
    animPath = null;
    travelTo = null;
    if (dossier) {
      dossier.__onArrive = null;
      dossier.__working = false;
      if (dossier.__feed) dossier.__feed.clear();
    }
    hideCard(); // K18
    startDossierFadeOut();
    // mémorise pour Rejouer, libère l'actif
    endState = finishedId
      ? {
          scenarioId: finishedId,
          title: finishedTitle,
          outcome,
          msg: shortMsg,
        }
      : null;
    scenarioId = null;
    scenario = null;
    index = 0;
    clearRoomStepBadges();
    if (endState) showEndAriane();
    else hideAriane();
    statusText = endState
      ? `${shortMsg}${finishedTitle ? ` — ${finishedTitle}` : ""} · Rejouer ou choisir un scénario`
      : "Parcours terminé — choisissez un scénario";
    notify();
  }

  /** Réinitialise sans scénario (menu « aucun »). */
  function clearScenario() {
    clearTimer();
    playing = false;
    awaitingChoice = false;
    resumeAfterChoice = false;
    followDossier = false;
    animPath = null;
    travelTo = null;
    endState = null;
    scenarioId = null;
    scenario = null;
    index = 0;
    hideCard();
    hideDossierHard();
    clearRoomStepBadges();
    hideAriane();
    statusText = "Aucun scénario — choisissez dans le menu";
    notify();
  }

  /** Durée fade fin de parcours (secondes). */
  const DOSSIER_FADE_SEC = 0.95;

  /** Fade-out doux du jeton dossier en fin de parcours. */
  function startDossierFadeOut() {
    if (!dossier) return;
    dossier.__working = false;
    dossier.__done = false;
    dossier.__secret = false;
    dossier.__fading = true;
    dossier.__fadeT = 0;
    if (dossier.__feed) dossier.__feed.clear();
    dossier.__open = false;
    // classeur refermé pour le fade
    if (dossier.__body) drawDossierBody(dossier.__body, false, false, false);
    dossier.visible = true;
    // repartir d'une opacité lisible (évite un fade déjà à 0)
    if (!(dossier.alpha > 0.05)) dossier.alpha = 1;
  }

  /** Masque définitif le jeton (après fade ou reset dur). */
  function hideDossierHard() {
    if (!dossier) return;
    dossier.__fading = false;
    dossier.__fadeT = 0;
    dossier.__working = false;
    dossier.__done = false;
    dossier.__secret = false;
    dossier.alpha = 0;
    dossier.visible = false;
    if (dossier.__feed) dossier.__feed.clear();
  }

  function resetDossierVisibility() {
    if (!dossier) return;
    dossier.__fading = false;
    dossier.__fadeT = 0;
    dossier.alpha = 1;
    dossier.visible = true;
  }

  function scheduleAdvance(step) {
    // clear timeout seulement (pas le timer visuel encore — on le relance)
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    if (!playing || awaitingChoice || !scenario) {
      stopStepTimer();
      return;
    }
    // R3 : étape à issue → pause lecture, attendre le joueur
    if (step?.rejectAlt) {
      awaitingChoice = true;
      resumeAfterChoice = true;
      playing = false;
      stopStepTimer();
      statusText = "Choisissez une issue sur la carte d'étape";
      notify();
      return;
    }
    const ms = stepDurationMs(step);
    startStepTimer(ms);
    timer = setTimeout(() => {
      if (!playing || awaitingChoice || !scenario) return;
      stopStepTimer();
      if (index >= (scenario.steps || []).length - 1) {
        // K14/K18: end of last step → spinner OFF + card OFF
        // B4-4 : fin nominale en rejet (to rejete/retire ou endOutcome)
        finishParcours(null, {
          outcome: resolveEndOutcome(scenario, step),
        });
        return;
      }
      const prevSite = step.siteId;
      const prevRoom = metaForStep(step).roomId || null;
      showStep(index + 1, {
        travelFrom: prevSite,
        travelFromRoom: prevRoom,
      });
    }, ms);
  }

  /** success | reject selon dernière étape / flag scénario (B4-4 non-EEM). */
  function resolveEndOutcome(sc, lastStep) {
    if (sc?.endOutcome === "reject" || sc?.endOutcome === "success") {
      return sc.endOutcome;
    }
    const to = lastStep?.to;
    if (to === "rejete" || to === "retire") return "reject";
    const dt = lastStep?.decisionType || "";
    if (
      dt === "non-entree-en-matiere" ||
      dt === "refuse" ||
      dt === "rejete"
    ) {
      return "reject";
    }
    return "success";
  }

  /** R3 — issue principale (adopter / accepter) → suite du parcours */
  function chooseAccept() {
    if (!scenario) return;
    const step = scenario.steps?.[index];
    if (!step?.rejectAlt && !awaitingChoice) {
      // pas de branche : avance simple
      if (index >= (scenario.steps || []).length - 1) {
        finishParcours(null, {
          outcome: resolveEndOutcome(scenario, step),
        });
        return;
      }
      next();
      return;
    }
    const wasResume = resumeAfterChoice;
    awaitingChoice = false;
    resumeAfterChoice = false;
    clearTimer();
    statusText = step?.successLesson
      ? `Issue : ${step.actLabel || "acceptée"}`
      : "Issue acceptée — suite du parcours";
    notify();
    if (index >= (scenario.steps || []).length - 1) {
      finishParcours(null, {
        outcome: resolveEndOutcome(scenario, step),
      });
      return;
    }
    const prevSite = step.siteId;
    const prevRoom = metaForStep(step).roomId || null;
    if (wasResume) {
      playing = true;
      statusText = "Lecture… — suite après choix";
      notify();
      showStep(index + 1, {
        travelFrom: prevSite,
        travelFromRoom: prevRoom,
      });
    } else {
      showStep(index + 1, {
        travelFrom: prevSite,
        travelFromRoom: prevRoom,
      });
    }
  }

  /** R3 — issue alternative rejectAlt → fin de branche pédagogique */
  function chooseReject() {
    if (!scenario) return;
    const step = scenario.steps?.[index];
    const alt = step?.rejectAlt;
    if (!alt) return;
    awaitingChoice = false;
    resumeAfterChoice = false;
    playing = false;
    clearTimer();
    // met à jour la carte avec le libellé / leçon de rejet
    const synthetic = {
      ...step,
      actLabel: alt.actLabel || step.actLabel,
      successLesson: alt.successLesson || step.successLesson,
      decisionType: alt.decisionType || "refuse",
      to: alt.to,
      rejectAlt: null,
    };
    const meta = metaForStep(step);
    placeCardNear(step.siteId, synthetic);
    // laisse lire la leçon de rejet ~2 s puis fade fin
    statusText = alt.successLesson || "Issue rejetée — fin de branche";
    notify();
    setTimeout(() => {
      // Panneau fin = libellé court seulement (prose déjà lue sur la carte)
      finishParcours(null, { outcome: "reject" });
    }, Math.max(1800, Math.min(4000, (alt.successLesson || "").length * 35)));
  }

  function play() {
    if (!scenario?.steps?.length) {
      statusText = "Choisissez un scénario d'abord";
      notify();
      return;
    }
    if (awaitingChoice) {
      // relancer ne force pas un choix — reste sur la carte
      statusText = "Choisissez une issue sur la carte d'étape";
      notify();
      return;
    }
    playing = true;
    // réaffiche le jeton pour la lecture (après un fade de fin ou un setScenario)
    if (dossier) {
      dossier.__fading = false;
      dossier.__fadeT = 0;
      dossier.alpha = 1;
      dossier.visible = true;
    } else {
      resetDossierVisibility();
    }
    statusText = "Lecture… — Pause pour explorer le plan";
    notify();
    showStep(index, {});
  }

  function pause() {
    playing = false;
    clearTimer();
    followDossier = false;
    // garde awaitingChoice si on est sur une branche
    statusText = awaitingChoice
      ? "Choisissez une issue sur la carte d'étape"
      : "En pause — cliquez une salle pour les flux";
    notify();
  }

  function next() {
    clearTimer();
    if (!scenario) return;
    if (awaitingChoice) {
      // sans clic explicite, next = issue principale
      chooseAccept();
      return;
    }
    const steps = scenario.steps || [];
    const cur = steps[index];
    // étape à branche sans autoplay : demander le choix
    if (cur?.rejectAlt && !awaitingChoice) {
      awaitingChoice = true;
      resumeAfterChoice = false;
      playing = false;
      statusText = "Choisissez une issue sur la carte d'étape";
      placeCardNear(cur.siteId, cur);
      notify();
      return;
    }
    if (index >= steps.length - 1) {
      // K14/K18: already on last step → clean rest
      finishParcours("Fin du parcours");
      return;
    }
    const prev = steps[index];
    const prevRoom = prev ? metaForStep(prev).roomId || null : null;
    showStep(index + 1, {
      travelFrom: prev?.siteId,
      travelFromRoom: prevRoom,
    });
  }

  function prev() {
    clearTimer();
    if (!scenario) return;
    const keepPlay = playing;
    travelTo = null;
    if (index <= 0) {
      goto(0, { keepPlay });
      return;
    }
    goto(index - 1, { keepPlay });
  }

  /**
   * @param {number} i
   * @param {{ keepPlay?: boolean }} [opts]  si true (ou déjà en lecture), continue le play
   */
  function goto(i, opts = {}) {
    clearTimer();
    if (!scenario) return;
    const steps = scenario.steps || [];
    if (!steps.length) return;
    const target = Math.max(0, Math.min(steps.length - 1, i));
    const keepPlay = !!opts.keepPlay || playing;
    const fromI = index;
    const fromStep = steps[fromI];
    const fromMeta = fromStep ? metaForStep(fromStep) : null;
    const toStep = steps[target];
    const toMeta = metaForStep(toStep);

    if (!keepPlay) {
      playing = false;
    } else {
      playing = true;
    }
    travelTo = null;
    // saut pendant play : voyage si salle différente, sinon focus direct
    const sameRoom =
      fromStep &&
      fromStep.siteId === toStep.siteId &&
      (fromMeta?.roomId || null) === (toMeta?.roomId || null);
    if (keepPlay && fromI !== target && fromStep && !sameRoom) {
      showStep(target, {
        travelFrom: fromStep.siteId,
        travelFromRoom: fromMeta?.roomId || null,
      });
    } else {
      showStep(target, {});
    }
  }

  function setSpeed(s) {
    speed = Math.max(0.4, Math.min(3, Number(s) || 1));
    if (playing && scenario) {
      clearTimer();
      const step = scenario.steps[index];
      if (step) scheduleAdvance(step);
    }
  }

  /**
   * @param {string|null} id
   * @param {{ autoPlay?: boolean }} [opts]  autoPlay défaut true (sélection catalogue)
   */
  function setScenario(id, opts = {}) {
    if (id == null || id === "") {
      clearScenario();
      return;
    }
    if (!SCENARIOS[id]) {
      statusText = `Scénario non jouable encore : ${id}`;
      notify();
      return;
    }
    const autoPlay = opts.autoPlay !== false;
    clearTimer();
    playing = false;
    awaitingChoice = false;
    resumeAfterChoice = false;
    followDossier = false;
    animPath = null;
    travelTo = null;
    endState = null; // nouveau scénario → ferme le panneau Rejouer
    scenarioId = id;
    scenario = SCENARIOS[id];
    index = 0;
    hideCard();
    hideDossierHard();
    if (dossier) {
      dossier.__done = false;
      dossier.__working = false;
      dossier.__open = false;
      dossier.__secret = false;
      if (dossier.__feed) dossier.__feed.clear();
      if (dossier.__body) drawDossierBody(dossier.__body, false, false, false);
    }
    statusText = autoPlay
      ? `Scénario : ${scenario.title} — lecture…`
      : `Scénario : ${scenario.title} — ▶ pour lire`;
    rebuildRoomStepBadges();
    updateTopAriane();
    notify();
    // auto-lecture après fermeture drawer / frame (restore cam d'abord)
    if (autoPlay && (scenario.steps || []).length) {
      requestAnimationFrame(() => {
        if (scenarioId !== id) return;
        play();
      });
    } else {
      const s0 = scenario.steps[0];
      if (s0) {
        const meta = metaForStep(s0);
        focusSite(s0.siteId, meta.roomId);
      }
    }
  }

  /** Per-frame tick (from app ticker). */
  function tick(dt) {
    // K11: no halo/blink tick
    // Alimentation dossier (feuilles) pendant l'action en salle
    if (dossier?.__working) {
      dossier.__spinT = (dossier.__spinT || 0) + (dt || 0.016) * 3.2;
      drawSpinner(dossier);
    } else if (dossier?.__feed) {
      dossier.__feed.clear();
    } else if (dossier?.__spinner && !dossier.__done && !dossier.__fading) {
      dossier.__spinner.clear();
    }
    // Fade-out fin de parcours (prioritaire : pas de feed/spinner pendant le fade)
    if (dossier?.__fading) {
      dossier.__working = false;
      if (dossier.__feed) dossier.__feed.clear();
      dossier.__fadeT = (dossier.__fadeT || 0) + (dt || 0.016);
      const u = Math.min(1, dossier.__fadeT / DOSSIER_FADE_SEC);
      // ease-in-out soft
      const e = u * u * (3 - 2 * u);
      dossier.alpha = Math.max(0, 1 - e);
      dossier.visible = true;
      applyDossierBaseScale(1);
      if (u >= 1) {
        hideDossierHard();
      }
    }
    // taille écran quasi constante (re-sync si zoom change)
    if (dossier && dossier.visible && !dossier.__fading) {
      if (!dossier.__traveling && !awaitingChoice) {
        applyDossierBaseScale(1);
      }
    }
    // K15: card stays on room — reproject if camera moves
    if (card.classList.contains("is-open") && cardAnchor) {
      positionCardAtRoom();
    }
    // anneau compte à rebours étape
    if (cardTimer.active()) updateStepTimerVisual();
    // Attente de choix : pulse d'attention sur le classeur
    if (
      awaitingChoice &&
      dossier &&
      dossier.visible &&
      !dossier.__traveling &&
      !dossier.__fading &&
      !followDossier
    ) {
      dossier.__awaitPulse =
        (dossier.__awaitPulse || 0) + (dt || 0.016) * 5.5;
      const p = 1 + 0.1 * Math.sin(dossier.__awaitPulse);
      applyDossierBaseScale(p);
      dossier.alpha = 0.82 + 0.18 * Math.abs(Math.sin(dossier.__awaitPulse * 1.2));
    } else if (dossier && !dossier.__traveling && !followDossier && !dossier.__fading) {
      if (dossier.__awaitPulse) {
        dossier.__awaitPulse = 0;
        applyDossierBaseScale(1);
        if (dossier.alpha < 1 && !dossier.__fading) dossier.alpha = 1;
      }
    }
    // pastilles n° : suivre la caméra (screen-space)
    if (roomStepBadges.length) {
      repositionRoomStepBadges();
    }
    // pulse n° chambre de destination pendant le trajet dossier
    if (travelTo && roomStepBadges.length) {
      const pulseT =
        (travelTo.__pulseT = (travelTo.__pulseT || 0) + (dt || 0.016) * 9);
      for (const cont of roomStepBadges) {
        if (cont.__kind !== "next") continue;
        const p = 1 + 0.14 * Math.abs(Math.sin(pulseT));
        cont.scale.set(p);
        cont.alpha = 0.82 + 0.18 * Math.abs(Math.sin(pulseT * 1.15));
      }
    }
    // dossier travel along path polyline (K9/K12) — plus rapide + pulse d'attention
    if (followDossier && animPath && dossier) {
      // ~3× plus rapide qu'avant (110 → 340 base)
      const speedPx = 340 * speed;
      let remain = (dt || 0.016) * speedPx;
      while (remain > 0 && animI < animPath.length - 1) {
        const a = animPath[animI];
        const b = animPath[animI + 1];
        const seg = Math.hypot(b.x - a.x, b.y - a.y) || 1e-6;
        const left = (1 - animFrac) * seg;
        if (remain < left) {
          animFrac += remain / seg;
          remain = 0;
        } else {
          remain -= left;
          animI += 1;
          animFrac = 0;
        }
      }
      // pulse pendant le trajet (classeur fermé) — scale relative à la taille écran
      dossier.__travelPulse = (dossier.__travelPulse || 0) + (dt || 0.016) * 10;
      const pulse = 0.78 + 0.22 * Math.abs(Math.sin(dossier.__travelPulse));
      dossier.alpha = pulse;
      const sc = 1 + 0.1 * Math.sin(dossier.__travelPulse * 1.4);
      applyDossierBaseScale(sc);

      if (animI >= animPath.length - 1) {
        const last = animPath[animPath.length - 1];
        dossier.x = last.x;
        dossier.y = last.y;
        followDossier = false;
        dossier.__traveling = false;
        dossier.alpha = 1;
        applyDossierBaseScale(1);
        const cb = dossier.__onArrive;
        dossier.__onArrive = null;
        // runFocus → ouvre le classeur + carte
        if (cb) cb();
      } else {
        const a = animPath[animI];
        const b = animPath[animI + 1];
        const t = Math.min(1, animFrac);
        dossier.x = a.x + (b.x - a.x) * t;
        dossier.y = a.y + (b.y - a.y) * t;
        camera.centerOn(dossier.x, dossier.y);
        if (scene.screenLabels) scene.screenLabels.update();
      }
    }
  }

  function dispose() {
    clearTimer();
    stopHalo();
    hideCard();
    hideAriane();
    clearRoomStepBadges();
    if (haloG?.parent) haloG.parent.removeChild(haloG);
    if (dossier?.parent) dossier.parent.removeChild(dossier);
  }

  const api = {
    getState,
    play,
    pause,
    next,
    prev,
    goto,
    setSpeed,
    setScenario,
    clearScenario,
    dismissEndChoice,
    replayLastScenario,
    chooseAccept,
    chooseReject,
    syncHoverFromMap,
    preview,
    clearPreview,
    tick,
    dispose,
    onChange: null,
    /** for QA */
    showStep,
    scenarios: SCENARIOS,
  };

  // initial : aucun scénario sélectionné
  statusText = "Aucun scénario — choisissez dans le menu";
  return api;
}
