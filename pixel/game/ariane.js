/**
 * Fil d'Ariane glass — pastilles + libellé d'acte + branches (iso walkthrough).
 * Étapes complexes (rejectAlt) : nœud ⑂, chips accept/reject, hint d'attente.
 */

/**
 * @param {object} opts
 * @param {HTMLElement} opts.mount  #sovd-root
 * @param {(i:number)=>void} [opts.onSelect]
 * @param {(i:number)=>void} [opts.onPreview]
 * @param {()=>void} [opts.onPreviewEnd]
 * @param {()=>void} [opts.onAccept]
 * @param {()=>void} [opts.onReject]
 * @param {()=>void} [opts.onReplay]
 * @param {()=>void} [opts.onDismiss]
 */
export function installAriane(opts) {
  const {
    mount,
    onSelect,
    onPreview,
    onPreviewEnd,
    onAccept,
    onReject,
    onReplay,
    onDismiss,
  } = opts;

  let root = mount.querySelector("#sovd-ariane");
  if (!root) {
    root = document.createElement("div");
    root.id = "sovd-ariane";
    root.className = "sovd-ariane";
    root.hidden = true;
    root.innerHTML = `
      <div class="sovd-ariane__scenario" id="sa-scenario"></div>
      <div class="sovd-ariane__label" id="sa-label"></div>
      <ol class="sovd-ariane__steps" id="sa-steps"></ol>
      <div class="sovd-ariane__await-hint" id="sa-await-hint" hidden>À vous de choisir une issue</div>
      <div class="sovd-ariane__branch-row" id="sa-branch-row" role="group" aria-label="Choix d'issue" hidden></div>
      <div class="sovd-ariane__end-row" id="sa-end-row" role="group" aria-label="Fin de parcours" hidden></div>
    `;
    mount.appendChild(root);
  } else if (!root.querySelector("#sa-branch-row")) {
    // upgrade DOM if old shell
    root.innerHTML = `
      <div class="sovd-ariane__scenario" id="sa-scenario"></div>
      <div class="sovd-ariane__label" id="sa-label"></div>
      <ol class="sovd-ariane__steps" id="sa-steps"></ol>
      <div class="sovd-ariane__await-hint" id="sa-await-hint" hidden>À vous de choisir une issue</div>
      <div class="sovd-ariane__branch-row" id="sa-branch-row" role="group" aria-label="Choix d'issue" hidden></div>
      <div class="sovd-ariane__end-row" id="sa-end-row" role="group" aria-label="Fin de parcours" hidden></div>
    `;
  }

  const elScenario = root.querySelector("#sa-scenario");
  const elLabel = root.querySelector("#sa-label");
  const elSteps = root.querySelector("#sa-steps");
  const elAwait = root.querySelector("#sa-await-hint");
  const elBranch = root.querySelector("#sa-branch-row");
  const elEnd = root.querySelector("#sa-end-row");

  /** @type {number|null} */
  let hoverI = null;

  function stepTitle(step) {
    if (!step) return "";
    return step.title || step.actLabel || step.id || "";
  }

  function shortChip(s) {
    const t = String(s || "");
    return t.length > 28 ? `${t.slice(0, 26)}…` : t;
  }

  /**
   * @param {object|null} scenario
   * @param {number} index
   * @param {{
   *   playing?: boolean,
   *   status?: string,
   *   awaitingBranch?: boolean,
   *   endOutcome?: null|'success'|'reject',
   * }} [state]
   */
  function render(scenario, index, state = {}) {
    if (!scenario?.steps?.length && !state.endOutcome) {
      hide();
      return;
    }

    // Fin de parcours
    if (state.endOutcome || state.status === "done") {
      root.hidden = false;
      root.classList.add("is-open", "is-end");
      root.classList.remove("is-awaiting");
      root.classList.toggle("outcome-success", state.endOutcome === "success" || !state.endOutcome);
      root.classList.toggle("outcome-reject", state.endOutcome === "reject");
      if (elScenario) {
        elScenario.textContent = scenario
          ? `${scenario.short || ""} · ${scenario.label || scenario.title || ""}`.replace(/^ · /, "")
          : "Parcours terminé";
      }
      if (elLabel) {
        elLabel.textContent =
          state.endOutcome === "reject"
            ? "Issue · refus / classement"
            : "Parcours terminé";
      }
      if (elSteps) elSteps.innerHTML = "";
      if (elAwait) elAwait.hidden = true;
      if (elBranch) {
        elBranch.hidden = true;
        elBranch.innerHTML = "";
      }
      if (elEnd) {
        elEnd.hidden = false;
        elEnd.innerHTML = `
          <button type="button" class="sovd-ariane__end-btn replay" data-end="replay">
            <span class="sovd-ariane__end-ico" aria-hidden="true">↻</span> Rejouer
          </button>
          <button type="button" class="sovd-ariane__end-btn dismiss" data-end="dismiss">
            <span class="sovd-ariane__end-ico" aria-hidden="true">✕</span> Fermer
          </button>`;
        elEnd.querySelector('[data-end="replay"]')?.addEventListener("click", (e) => {
          e.stopPropagation();
          onReplay?.();
        });
        elEnd.querySelector('[data-end="dismiss"]')?.addEventListener("click", (e) => {
          e.stopPropagation();
          onDismiss?.();
        });
      }
      return;
    }

    if (!scenario?.steps?.length) {
      hide();
      return;
    }

    root.hidden = false;
    root.classList.add("is-open");
    root.classList.remove("is-end", "outcome-success", "outcome-reject");
    if (elEnd) {
      elEnd.hidden = true;
      elEnd.innerHTML = "";
    }

    const awaiting = !!state.awaitingBranch;
    root.classList.toggle("is-awaiting", awaiting);

    if (elScenario) {
      elScenario.textContent =
        `${scenario.short || ""} · ${scenario.label || scenario.title || ""}`.replace(/^ · /, "");
    }

    const labelI = hoverI != null ? hoverI : index;
    const labStep = scenario.steps[labelI];
    if (elLabel) {
      const t = stepTitle(labStep);
      elLabel.textContent = labStep?.rejectAlt
        ? `${t} · choix d'issue`
        : t;
      if (labStep?.activityLabel) {
        elLabel.dataset.activity = labStep.activityLabel;
      } else {
        delete elLabel.dataset.activity;
      }
    }

    if (!elSteps) return;
    elSteps.innerHTML = "";
    scenario.steps.forEach((step, i) => {
      const isBranch = !!step.rejectAlt;
      const isAwait = awaiting && i === index;
      const li = document.createElement("li");
      li.className = "sovd-ariane__step";
      li.dataset.i = String(i);
      if (i === index) li.classList.add("is-current", "is-active");
      if (i < index) li.classList.add("is-done");
      if (isBranch) li.classList.add("is-branch");
      if (isAwait) li.classList.add("is-awaiting");
      if (hoverI === i) li.classList.add("is-hover");

      const title = isBranch
        ? `${stepTitle(step)} · choix d'issue`
        : stepTitle(step);
      const act = step.activityLabel ? ` · ${step.activityLabel}` : "";
      li.title = `${title}${act}`;

      const fork = isBranch
        ? `<span class="sovd-ariane__fork" title="Étape à choix d'issue" aria-hidden="true">⑂</span>`
        : "";
      li.innerHTML = `<button type="button" class="sovd-ariane__dot" data-i="${i}" aria-label="Étape ${i + 1}: ${escapeAttr(title)}"><span class="sovd-ariane__n">${i + 1}</span>${fork}</button>`;

      const btn = li.querySelector("button");
      btn?.addEventListener("mouseenter", () => {
        hoverI = i;
        if (elLabel) {
          elLabel.textContent = isBranch
            ? `${stepTitle(step)} · choix d'issue`
            : stepTitle(step);
        }
        elSteps.querySelectorAll(".sovd-ariane__step").forEach((x) => {
          x.classList.toggle("is-hover", Number(x.dataset.i) === i);
        });
        onPreview?.(i);
      });
      btn?.addEventListener("mouseleave", () => {
        hoverI = null;
        const cur = scenario.steps[index];
        if (elLabel) {
          elLabel.textContent = cur?.rejectAlt
            ? `${stepTitle(cur)} · choix d'issue`
            : stepTitle(cur);
        }
        elSteps
          .querySelectorAll(".sovd-ariane__step")
          .forEach((x) => x.classList.remove("is-hover"));
        onPreviewEnd?.();
      });
      btn?.addEventListener("focus", () => onPreview?.(i));
      btn?.addEventListener("blur", () => onPreviewEnd?.());
      btn?.addEventListener("click", (e) => {
        e.stopPropagation();
        onSelect?.(i);
      });
      elSteps.appendChild(li);
    });

    // Chips de branche + hint
    if (elAwait) {
      elAwait.hidden = !awaiting;
      elAwait.textContent = awaiting ? "À vous de choisir une issue" : "";
    }
    if (elBranch) {
      const cur = scenario.steps[index];
      if (awaiting && cur?.rejectAlt) {
        const acceptLab = stepTitle(cur) || "Accepter / adopter";
        const rejectLab =
          cur.rejectAlt.actLabel ||
          cur.rejectAlt.label ||
          cur.rejectAlt.title ||
          "Rejeter / classer";
        elBranch.hidden = false;
        elBranch.innerHTML = `
          <button type="button" class="sovd-ariane__branch-chip accept" data-choice="accept" title="${escapeAttr(acceptLab)}">✓ ${escapeHtml(shortChip(acceptLab))}</button>
          <button type="button" class="sovd-ariane__branch-chip reject" data-choice="reject" title="${escapeAttr(rejectLab)}">✕ ${escapeHtml(shortChip(rejectLab))}</button>
        `;
        elBranch.querySelector('[data-choice="accept"]')?.addEventListener("click", (e) => {
          e.stopPropagation();
          onAccept?.();
        });
        elBranch.querySelector('[data-choice="reject"]')?.addEventListener("click", (e) => {
          e.stopPropagation();
          onReject?.();
        });
      } else {
        elBranch.hidden = true;
        elBranch.innerHTML = "";
      }
    }
  }

  function hide() {
    root.hidden = true;
    root.classList.remove(
      "is-open",
      "is-awaiting",
      "is-end",
      "outcome-success",
      "outcome-reject"
    );
    if (elSteps) elSteps.innerHTML = "";
    if (elBranch) {
      elBranch.hidden = true;
      elBranch.innerHTML = "";
    }
    if (elEnd) {
      elEnd.hidden = true;
      elEnd.innerHTML = "";
    }
    if (elAwait) elAwait.hidden = true;
    if (elLabel) elLabel.textContent = "";
    if (elScenario) elScenario.textContent = "";
    hoverI = null;
  }

  return { render, hide, root };
}

function escapeAttr(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");
}

function escapeHtml(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
