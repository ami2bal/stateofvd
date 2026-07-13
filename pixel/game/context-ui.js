/**
 * Vue contextuelle glassomorphique — labels + inspector iso main.
 * Hover = fiche de base · clic/pin = fiche enrichie RBAC · placement focale.
 */
import { resolveFiche, ACRONYM_FULL, FICHES, expandTitleAcronyms } from "./fiches.js";
import { resolveRbac, hierarchyLabel } from "./from-main.js";
import { placePanelNear, hotspotScreenRect } from "./place-panel.js";

const CLOSE_DELAY_MS = 160;

/**
 * Titre explicite pour un hotspot (sigle développé si possible).
 * @param {{ id?:string, kind?:string, label?:string, siteId?:string, siteKind?:string, sub?:string }} hs
 */
export function explicitName(hs) {
  if (!hs) return "Lieu";
  const fiche = resolveFiche(hs);
  if (fiche?.title) return fiche.title;
  const raw = hs.label || hs.id || "Lieu";
  if (ACRONYM_FULL[raw]) return `${raw} — ${ACRONYM_FULL[raw]}`;
  return expandTitleAcronyms(raw);
}

/**
 * Fil d'Ariane Bâtiment › Salle
 * @param {{ kind?:string, siteId?:string, label?:string, sub?:string, id?:string }} hs
 */
export function breadcrumb(hs) {
  if (!hs) return "";
  if (hs.kind === "room") {
    const site = FICHES[hs.siteId];
    const siteName = site?.title || hs.sub || hs.siteId || "Institution";
    const roomName = explicitName(hs);
    return `${siteName} › ${roomName}`;
  }
  return explicitName(hs);
}

/**
 * @param {object} opts
 * @param {HTMLElement} opts.root  #sovd-root
 * @param {import('../engine/camera.js').SoftCamera} opts.camera
 * @param {Record<string, any>} opts.markers
 * @param {() => number} opts.getScale
 */
export function installContextUi(opts) {
  const { root, camera, markers, getScale } = opts;

  // ── Floating labels layer ──────────────────────────────────────────────
  let labelHost = root.querySelector("#label-layer");
  if (!labelHost) {
    labelHost = document.createElement("div");
    labelHost.id = "label-layer";
    labelHost.className = "label-layer";
    labelHost.setAttribute("aria-hidden", "true");
    root.appendChild(labelHost);
  }

  /** @type {Map<string, HTMLElement>} */
  const labelEls = new Map();

  function ensureLabel(hs) {
    let el = labelEls.get(hs.id);
    if (el) return el;
    el = document.createElement("div");
    el.className = "map-label";
    el.dataset.id = hs.id;
    el.dataset.kind = hs.kind || "site";
    if (hs.siteKind) el.dataset.siteKind = hs.siteKind;
    const name = explicitName(hs);
    el.innerHTML = `<span class="map-label__text">${escapeHtml(name)}</span>`;
    labelHost.appendChild(el);
    labelEls.set(hs.id, el);
    return el;
  }

  for (const m of Object.values(markers)) {
    if (m.__hs) ensureLabel(m.__hs);
  }

  function updateLabels() {
    const scale = getScale();
    const showSites = true;
    const showRooms = scale >= 2.0;

    for (const m of Object.values(markers)) {
      const hs = m.__hs;
      if (!hs) continue;
      const el = labelEls.get(hs.id);
      if (!el) continue;
      const isRoom = hs.kind === "room";
      if (isRoom && !showRooms) {
        el.hidden = true;
        continue;
      }
      if (!isRoom && !showSites) {
        el.hidden = true;
        continue;
      }
      if (!isRoom && showRooms && scale > 2.4) {
        el.hidden = true;
        continue;
      }
      const scr = camera.worldToScreen(hs.cx, hs.cy);
      const oy = isRoom ? 0 : -Math.min(28, (hs.h || 32) * scale * 0.35);
      el.style.transform = `translate(${scr.x}px, ${scr.y + oy}px) translate(-50%, -50%)`;
      el.hidden = false;
      el.classList.toggle("is-room", isRoom);
      el.classList.toggle("is-site", !isRoom);
    }
  }

  // ── Inspector (hover / pin) ────────────────────────────────────────────
  let modal = root.querySelector("#ctx-modal");
  if (!modal) {
    modal = document.createElement("aside");
    modal.id = "ctx-modal";
    modal.className = "ctx-modal";
    modal.hidden = true;
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "false");
    modal.setAttribute("aria-live", "polite");
    modal.innerHTML = `
      <button type="button" class="ctx-modal__close" id="ctx-close" aria-label="Fermer">×</button>
      <div class="ctx-modal__header" id="ctx-header">
        <div class="ctx-modal__kicker" id="ctx-kicker"></div>
        <div class="ctx-modal__badge" id="ctx-badge"></div>
        <h2 class="ctx-modal__title" id="ctx-title"></h2>
        <p class="ctx-modal__crumb" id="ctx-crumb"></p>
      </div>
      <p class="ctx-modal__body" id="ctx-body"></p>
      <div class="ctx-modal__meta" id="ctx-meta" hidden></div>
      <ul class="ctx-modal__list" id="ctx-list" hidden></ul>
      <footer class="ctx-modal__foot" id="ctx-foot" hidden></footer>
      <div class="ctx-modal__pin" id="ctx-pin" hidden>Épinglé · fiche enrichie</div>
    `;
    root.appendChild(modal);
  } else if (!modal.querySelector("#ctx-pin")) {
    const pinEl = document.createElement("div");
    pinEl.className = "ctx-modal__pin";
    pinEl.id = "ctx-pin";
    pinEl.hidden = true;
    pinEl.textContent = "Épinglé · fiche enrichie";
    modal.appendChild(pinEl);
  }

  const els = {
    modal,
    close: modal.querySelector("#ctx-close"),
    header: modal.querySelector("#ctx-header"),
    kicker: modal.querySelector("#ctx-kicker"),
    badge: modal.querySelector("#ctx-badge"),
    title: modal.querySelector("#ctx-title"),
    crumb: modal.querySelector("#ctx-crumb"),
    body: modal.querySelector("#ctx-body"),
    meta: modal.querySelector("#ctx-meta"),
    list: modal.querySelector("#ctx-list"),
    foot: modal.querySelector("#ctx-foot"),
    pin: modal.querySelector("#ctx-pin"),
  };

  const state = {
    visible: false,
    pinned: false,
    enriched: false,
    id: null,
  };

  /** @type {null|{ id?:string, kind?:string, siteId?:string, cx?:number, cy?:number, w?:number, h?:number }} */
  let focusHs = null;
  /** @type {null|((id:string)=>void)} */
  let onFocusRoom = null;
  /** @type {{ x:number, y:number, side:string }|null} */
  let lastPlace = null;
  /** @type {ReturnType<typeof setTimeout>|null} */
  let closeTimer = null;
  /** @type {string} */
  let lastKey = "";

  function clearCloseTimer() {
    if (closeTimer) {
      clearTimeout(closeTimer);
      closeTimer = null;
    }
  }

  function obstacleEls() {
    return [
      document.getElementById("flow-hud"),
      document.getElementById("sovd-chrome"),
      document.getElementById("sovd-ariane"),
      document.getElementById("step-card"),
      document.querySelector(".flow-act-panel"),
    ].filter(Boolean);
  }

  function reposition() {
    if (!state.visible || modal.hidden || !focusHs) return lastPlace;
    const focus = hotspotScreenRect(focusHs, camera);
    lastPlace = placePanelNear(modal, focus, {
      shell: root,
      last: lastPlace,
      obstacleEls: obstacleEls(),
      bottomReserve: 128,
      topReserve: 56,
    });
    return lastPlace;
  }

  function hide() {
    clearCloseTimer();
    modal.hidden = true;
    modal.classList.remove("is-open", "is-pinned", "is-scenario", "is-room-focus");
    modal.removeAttribute("data-side");
    if (els.pin) els.pin.hidden = true;
    if (els.meta) {
      els.meta.hidden = true;
      els.meta.innerHTML = "";
    }
    if (els.list) {
      els.list.hidden = true;
      els.list.innerHTML = "";
    }
    if (els.foot) {
      els.foot.hidden = true;
      els.foot.innerHTML = "";
    }
    state.visible = false;
    state.pinned = false;
    state.enriched = false;
    state.id = null;
    focusHs = null;
    lastKey = "";
  }

  function siteIdOf(hs) {
    if (!hs) return null;
    if (hs.kind === "room") return hs.siteId || null;
    return hs.siteId || hs.id || null;
  }

  function roomIdOf(hs) {
    return hs?.kind === "room" ? hs.id : null;
  }

  /**
   * @param {object} hs
   * @param {{ enriched?: boolean, scenarioHint?: string|null }} opts
   */
  function render(hs, opts = {}) {
    if (!hs) return;
    const enriched = !!opts.enriched;
    const scenarioHint = opts.scenarioHint || null;
    const fiche = resolveFiche(hs);
    const siteId = siteIdOf(hs);
    const roomId = roomIdOf(hs);
    const key = `${hs.id}|${enriched ? 1 : 0}|${scenarioHint || ""}`;
    focusHs = hs;
    state.id = hs.id;
    state.visible = true;
    state.enriched = enriched;

    if (key === lastKey && state.visible && !modal.hidden) {
      modal.classList.toggle("is-pinned", state.pinned);
      if (els.pin) els.pin.hidden = !state.pinned;
      reposition();
      return;
    }
    lastKey = key;

    const isRoom = hs.kind === "room";
    const title = fiche?.title || explicitName(hs);
    const crumb = isRoom
      ? breadcrumb(hs)
      : fiche?.subtitle || expandTitleAcronyms(fiche?.subtitle || "");

    els.kicker.textContent = scenarioHint
      ? "Contexte · parcours"
      : state.pinned
        ? "Épinglé"
        : isRoom
          ? "Salle"
          : "Institution";
    els.badge.textContent =
      fiche?.badge || (isRoom ? "Salle" : "Lieu");
    els.badge.style.background = fiche?.accent || "#2f4266";
    if (els.header) {
      els.header.style.background = fiche?.accent || "#2f4266";
      els.header.classList.toggle(
        "ce",
        String(fiche?.accent || "").toUpperCase() === "#C9A45C"
      );
    }
    els.title.textContent = title;
    els.crumb.textContent = crumb || breadcrumb(hs);
    els.body.textContent =
      fiche?.body ||
      (isRoom
        ? "Espace de travail institutionnel sur le plan."
        : "Institution de la Place du Château.");
    els.body.hidden = !els.body.textContent;
    modal.classList.toggle("is-room-focus", isRoom);
    modal.classList.toggle("is-scenario", !!scenarioHint);

    // Hover = pas de liste salles ni RBAC
    if (!enriched && !scenarioHint) {
      els.meta.hidden = true;
      els.meta.innerHTML = "";
      els.list.hidden = true;
      els.list.innerHTML = "";
      els.foot.hidden = true;
      els.foot.innerHTML = "";
    } else {
      // Rooms list (building pin)
      if (!isRoom && fiche?.rooms?.length) {
        els.list.hidden = false;
        els.list.innerHTML = fiche.rooms
          .map(
            (r) =>
              `<li><button type="button" class="ctx-room-btn" data-room="${escapeAttr(r.id)}"><strong>${escapeHtml(r.title)}</strong><span>${escapeHtml(r.text)}</span></button></li>`
          )
          .join("");
        els.list.querySelectorAll(".ctx-room-btn").forEach((btn) => {
          btn.addEventListener("click", () => {
            const rid = btn.getAttribute("data-room");
            if (rid && onFocusRoom) onFocusRoom(rid);
          });
        });
      } else if (isRoom && siteId) {
        const site = FICHES[siteId];
        els.list.hidden = false;
        els.list.innerHTML = `<li class="ctx-list-note">Fait partie de <strong>${escapeHtml(site?.title || hs.sub || siteId)}</strong></li>`;
      } else {
        els.list.hidden = true;
        els.list.innerHTML = "";
      }

      // RBAC enrichi (pin only)
      if (enriched && siteId) {
        try {
          const rbac = resolveRbac(siteId, roomId);
          if (rbac) {
            const bits = [];
            try {
              const hier = hierarchyLabel?.(siteId, roomId);
              if (hier) bits.push(`<p class="ctx-hier">${escapeHtml(hier)}</p>`);
            } catch {
              /* optional */
            }
            if (rbac.roles?.length)
              bits.push(
                `<div class="ctx-sec"><div class="ctx-sec-h">Rôle(s) RBAC</div><ul>${rbac.roles.map((r) => `<li>${escapeHtml(r)}</li>`).join("")}</ul></div>`
              );
            if (rbac.actions?.length)
              bits.push(
                `<div class="ctx-sec"><div class="ctx-sec-h">Actions possibles</div><ul>${rbac.actions
                  .slice(0, 6)
                  .map((a) => `<li>${escapeHtml(a)}</li>`)
                  .join("")}</ul>${
                  rbac.cadence
                    ? `<p class="ctx-cadence">${escapeHtml(rbac.cadence)}</p>`
                    : ""
                }</div>`
              );
            if (rbac.legalRefs?.length) {
              bits.push(
                `<div class="ctx-sec"><div class="ctx-sec-h">Bases légales</div><ul class="ctx-legal">${rbac.legalRefs
                  .slice(0, 4)
                  .map(
                    (r) =>
                      `<li><a href="${escapeAttr(r.url)}" target="_blank" rel="noopener">${escapeHtml(r.label || `art. ${r.art} ${r.code}`)}</a></li>`
                  )
                  .join("")}</ul></div>`
              );
            }
            if (bits.length) {
              els.meta.hidden = false;
              els.meta.innerHTML =
                (scenarioHint
                  ? `<span class="ctx-pill">${escapeHtml(scenarioHint)}</span>`
                  : "") + `<div class="ctx-rbac">${bits.join("")}</div>`;
            } else {
              els.meta.hidden = !scenarioHint;
              els.meta.innerHTML = scenarioHint
                ? `<span class="ctx-pill">${escapeHtml(scenarioHint)}</span>`
                : "";
            }
          } else {
            els.meta.hidden = !scenarioHint;
            els.meta.innerHTML = scenarioHint
              ? `<span class="ctx-pill">${escapeHtml(scenarioHint)}</span>`
              : "";
          }
        } catch {
          els.meta.hidden = true;
          els.meta.innerHTML = "";
        }
      } else if (scenarioHint) {
        els.meta.hidden = false;
        els.meta.innerHTML = `<span class="ctx-pill">${escapeHtml(scenarioHint)}</span>`;
      } else {
        els.meta.hidden = true;
        els.meta.innerHTML = "";
      }

      if (scenarioHint) {
        els.foot.hidden = false;
        els.foot.innerHTML = `<span>Étape en cours sur ce lieu</span>`;
      } else {
        els.foot.hidden = true;
        els.foot.innerHTML = "";
      }
    }

    if (els.pin) els.pin.hidden = !state.pinned;
    modal.hidden = false;
    void modal.offsetWidth;
    modal.classList.add("is-open");
    modal.classList.toggle("is-pinned", state.pinned);
    // remonter dans le shell
    if (modal.parentElement) modal.parentElement.appendChild(modal);
    requestAnimationFrame(() => {
      reposition();
      requestAnimationFrame(() => reposition());
    });
  }

  /** Hover = fiche de base, non épinglée (iso main showHover). */
  function showHover(hs) {
    if (!hs) {
      scheduleHide();
      return;
    }
    clearCloseTimer();
    if (state.pinned) return; // pin gagne
    state.pinned = false;
    render(hs, { enriched: false });
  }

  /** Pin = fiche enrichie RBAC (iso main pin). */
  function pin(hs) {
    if (!hs) {
      unpin();
      return;
    }
    clearCloseTimer();
    state.pinned = true;
    render(hs, { enriched: true });
  }

  /** Alias historique (clic = pin). */
  function openPlace(hs, { scenarioHint = null } = {}) {
    if (!hs) return;
    clearCloseTimer();
    state.pinned = true;
    render(hs, { enriched: !scenarioHint, scenarioHint });
  }

  function unpin() {
    state.pinned = false;
    modal.classList.remove("is-pinned");
    if (els.pin) els.pin.hidden = true;
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

  function openScenarioStep(step, index, total, scenario) {
    const m = markers[step.room];
    const hs = m?.__hs || {
      id: step.room,
      kind: "room",
      label: step.title,
    };
    const fiche = resolveFiche(hs);
    const placeTitle = fiche?.title || step.title;
    openPlace(hs, {
      scenarioHint: `${scenario?.short || scenario?.label || "Parcours"} · ${index + 1}/${total}`,
    });
    els.title.textContent = step.title;
    els.crumb.textContent = breadcrumb(hs);
    els.body.textContent = step.body || fiche?.body || "";
    els.kicker.textContent = "Étape du parcours";
    els.foot.hidden = false;
    els.foot.innerHTML = `<span class="ctx-foot-place">📍 ${escapeHtml(placeTitle)}</span>`;
    lastKey = ""; // force content stick
    requestAnimationFrame(() => reposition());
  }

  // Garder la fiche ouverte quand la souris passe dessus (depuis un hotspot)
  modal.addEventListener("pointerenter", () => clearCloseTimer());
  modal.addEventListener("pointerleave", () => {
    if (!state.pinned) scheduleHide();
  });

  els.close?.addEventListener("click", () => {
    unpin();
    hide();
  });

  return {
    updateLabels,
    showHover,
    pin,
    unpin,
    openPlace,
    openScenarioStep,
    close: hide,
    hide,
    scheduleHide,
    clearCloseTimer,
    reposition,
    setOnFocusRoom(fn) {
      onFocusRoom = fn;
    },
    getState: () => ({
      visible: state.visible,
      pinned: state.pinned,
      enriched: state.enriched,
      id: state.id,
    }),
    get pinnedId() {
      return state.pinned ? state.id : null;
    },
    get isPinned() {
      return state.pinned;
    },
    get modalEl() {
      return modal;
    },
  };
}

function escapeHtml(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(s) {
  return escapeHtml(s).replace(/'/g, "&#39;");
}
