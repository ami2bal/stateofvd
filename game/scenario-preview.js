/**
 * Prévisualisation scénario au hover du drawer.
 * Pastilles n° via step-badges (source unique) · zoom-out drawer + restore.
 */
/* global PIXI */
import { SCENARIOS } from "./flows/index.js";
import {
  collectScenarioStops,
  createStepBadgeController,
} from "./step-badges.js";

/**
 * @param {object} opts
 * @param {object} opts.scene
 * @param {import('../engine/camera.js').Camera} opts.camera
 * @param {(s:number, instant?:boolean)=>void} [opts.onLod]
 */
export function installScenarioPreview(opts) {
  const { scene, camera, onLod } = opts;

  let activeId = null;
  let sessionActive = false;
  let rafId = null;
  let savedCam = null;

  const badgeCtrl = createStepBadgeController({ scene, camera });

  function clearOverlays() {
    activeId = null;
    badgeCtrl.clear();
    stopLoop();
  }

  function stopLoop() {
    if (rafId != null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  function startLoop() {
    stopLoop();
    const loop = () => {
      if (!badgeCtrl.badges.length) {
        rafId = null;
        return;
      }
      // dirty-cam : skip si caméra stable
      badgeCtrl.reposition();
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
  }

  function endSession() {
    clearOverlays();
    sessionActive = false;
    if (savedCam) {
      camera.scale = savedCam.scale;
      camera.x = savedCam.x;
      camera.y = savedCam.y;
      camera.clampPan?.();
      camera.apply();
      if (onLod) onLod(camera.scale, true);
      if (scene.screenLabels) scene.screenLabels.update({ force: true });
      savedCam = null;
    }
  }

  function clear() {
    endSession();
  }

  function beginSession() {
    sessionActive = true;
    if (!savedCam) {
      savedCam = {
        scale: camera.scale,
        x: camera.x,
        y: camera.y,
      };
    }
    const mid = camera.viewCenterWorld?.() || {
      x: (camera.app.renderer.width / 2 - camera.x) / camera.scale,
      y: (camera.app.renderer.height / 2 - camera.y) / camera.scale,
    };
    const minS = camera.minScale ?? camera.fitScale ?? camera.scale;
    camera.setScale(minS);
    camera.centerOn(mid.x, mid.y);
    if (onLod) onLod(camera.scale, true);
    if (scene.screenLabels) scene.screenLabels.update({ force: true });
  }

  /**
   * @param {string} scenarioId
   */
  function preview(scenarioId) {
    const scenario = SCENARIOS[scenarioId];
    if (!scenario?.steps?.length) {
      clearOverlays();
      activeId = scenarioId || null;
      return;
    }
    if (activeId === scenarioId && badgeCtrl.badges.length) {
      badgeCtrl.reposition({ force: true });
      return;
    }
    activeId = scenarioId;
    const stops = collectScenarioStops(scenario.steps);
    badgeCtrl.rebuild(stops, { zIndex: 2600 });
    badgeCtrl.updateHighlight({
      index: -1,
      travelTo: null,
      followDossier: false,
      awaitingChoice: false,
      curSite: null,
      curRoom: null,
      hideAll: false,
    });
    // all idle (index -1 means none active — need fix: done check uses endI < index)
    // force all idle: use index 0 without marking done — use huge index? better force paint idle
    for (const b of badgeCtrl.badges) {
      b.__kind = "idle";
      b.__show = true;
      b.alpha = 1;
    }
    badgeCtrl.reposition({ force: true });
    startLoop();
  }

  return {
    preview,
    clearOverlays,
    clear,
    beginSession,
    endSession,
    dispose() {
      endSession();
    },
  };
}
