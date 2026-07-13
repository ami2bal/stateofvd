/**
 * QA harness API: window.__QA__ = { renderOnce, stats, runScenario }
 */

export function installQA(api) {
  const state = {
    tickMsSamples: [],
    lastStats: null,
    scenarioResult: null,
  };

  function stats() {
    const samples = state.tickMsSamples;
    const n = samples.length;
    const avg = n ? samples.reduce((a, b) => a + b, 0) / n : 0;
    const s = {
      fps: api.getFps ? api.getFps() : 0,
      tickMs: avg,
      tickMsLast: n ? samples[n - 1] : 0,
      entities: api.getEntityCount ? api.getEntityCount() : 0,
      visibleTiles: api.getVisibleTiles ? api.getVisibleTiles() : 0,
      simTime: api.getSimTime ? api.getSimTime() : 0,
      samples: n,
    };
    state.lastStats = s;
    return s;
  }

  function renderOnce() {
    if (api.renderOnce) api.renderOnce();
    return stats();
  }

  function recordTick(ms) {
    state.tickMsSamples.push(ms);
    if (state.tickMsSamples.length > 600) state.tickMsSamples.shift();
  }

  async function runScenario(name) {
    if (!api.runScenario) throw new Error("runScenario not wired");
    state.scenarioResult = await api.runScenario(name);
    return state.scenarioResult;
  }

  const qa = { renderOnce, stats, runScenario, recordTick, _state: state };
  if (typeof window !== "undefined") window.__QA__ = qa;
  return qa;
}

export function writeQaOut(obj) {
  const el = document.getElementById("qa-out");
  if (!el) return;
  el.textContent = JSON.stringify(obj, null, 2);
}
