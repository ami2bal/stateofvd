/**
 * Pastilles n° d'étapes au-dessus des salles (écran, glass).
 */

/**
 * Groupe les étapes successives même salle.
 * @param {object[]} steps pixel steps with .room
 */
export function collectStops(steps) {
  const stops = [];
  for (let i = 0; i < (steps || []).length; i++) {
    const room = steps[i].room;
    if (!room) continue;
    const last = stops[stops.length - 1];
    if (last && last.room === room) {
      last.endI = i;
    } else {
      stops.push({ room, startI: i, endI: i });
    }
  }
  return stops.map((st) => ({
    ...st,
    nLabel:
      st.startI === st.endI
        ? String(st.startI + 1)
        : `${st.startI + 1}–${st.endI + 1}`,
    stepI: st.startI,
  }));
}

/**
 * @param {object} opts
 * @param {HTMLElement} opts.mount
 * @param {import('../engine/camera.js').SoftCamera} opts.camera
 * @param {Record<string, any>} opts.markers
 */
export function installStepBadges(opts) {
  const { mount, camera, markers } = opts;
  let host = mount.querySelector("#step-badge-layer");
  if (!host) {
    host = document.createElement("div");
    host.id = "step-badge-layer";
    host.className = "step-badge-layer";
    host.setAttribute("aria-hidden", "true");
    mount.appendChild(host);
  }

  /** @type {{ room:string, nLabel:string, stepI:number, el:HTMLElement }[]} */
  let active = [];

  /**
   * @param {object|null} scenario
   * @param {number} currentIndex
   */
  function setScenario(scenario, currentIndex = 0) {
    host.innerHTML = "";
    active = [];
    if (!scenario?.steps?.length) return;
    const stops = collectStops(scenario.steps);
    for (const st of stops) {
      const el = document.createElement("div");
      el.className = "step-badge";
      el.dataset.room = st.room;
      el.innerHTML = `<span>${st.nLabel}</span>`;
      host.appendChild(el);
      active.push({ ...st, el });
    }
    setCurrent(currentIndex);
    update();
  }

  function setCurrent(index) {
    for (const st of active) {
      const on = index >= st.startI && index <= st.endI;
      const done = index > st.endI;
      st.el.classList.toggle("is-current", on);
      st.el.classList.toggle("is-done", done);
    }
  }

  function update() {
    for (const st of active) {
      const m = markers[st.room];
      const hs = m?.__hs;
      if (!hs) {
        st.el.hidden = true;
        continue;
      }
      const scr = camera.worldToScreen(hs.cx, hs.cy - (hs.h || 32) * 0.35);
      st.el.style.transform = `translate(${scr.x}px, ${scr.y}px) translate(-50%, -50%)`;
      st.el.hidden = false;
    }
  }

  function clear() {
    host.innerHTML = "";
    active = [];
  }

  return { setScenario, setCurrent, update, clear };
}
