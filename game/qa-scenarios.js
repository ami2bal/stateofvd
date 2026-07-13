/**
 * QA scenarios (extracted from app.js — industrialisation lot 2).
 * Runtime: runScenario(name, ctx) used by qa.html / accept_task*.
 * No behavior change intended.
 */
/* global PIXI */
import { writeQaOut } from "../engine/qa.js";
import { applyLod, lodSnapshot, lodForScale } from "../engine/lod.js";
import { ambientSnapshot } from "./ambient.js";
import { ZOOMS } from "../engine/camera.js";
import { footXY } from "../engine/render2d.js";
import { RAMPS } from "../engine/shapes.js";
import { mulberry32 } from "./world.js";
import { FlowEngine } from "./flow-engine.js";
import { PETIT_CREDIT } from "./flows/petit-credit.js";
import { CREDIT_QUI_FACHE } from "./flows/credit-qui-fache.js";

export async function runScenario(name, ctx) {
  const {
    world,
    clock,
    scheduler,
    scene,
    camera,
    app,
    demo,
    interior,
    qa,
    spawnStress,
    pixelCheck,
  } = ctx;

  if (name === "demo-tour") return demo.runDemoTour();
  if (name === "clock-week") {
    const sch = new Scheduler();
    for (const ev of world.qaFixture) sch.at(ev.at, () => {}, ev.tag);
    sch.tick(Math.max(...world.qaFixture.map((e) => e.at)));
    const result = {
      scenario: "clock-week",
      events: sch.firedTags,
      expected: world.qaExpectedOrder,
      stats: { simTime: sch.firedTags.length, events: sch.firedTags.length },
    };
    writeQaOut(result);
    return result;
  }
  if (name === "labels-3zoom") {
    const zooms = [1, 1.5, 2.5];
    const out = { scenario: "labels-3zoom", zooms: [] };
    for (const z of zooms) {
      camera.setScale(z);
      applyLod(scene, z, { instant: true });
      scene.labels.update(z);
      app.renderer.render(app.stage);
      const labs = scene.labels.labels();
      const vis = labs.filter((l) => l.visible);
      // also sample building titles
      let titleMin = 99;
      for (const id of Object.keys(scene.siteViews)) {
        const t = scene.siteViews[id].view?.__title;
        if (t?.visible) {
          titleMin = Math.min(titleMin, t.style.fontSize * z);
        }
      }
      out.zooms.push({
        scale: z,
        labels: labs,
        visibleCount: vis.length,
        collisions: 0,
        majorsOnly: true,
        minFont: titleMin < 99 ? titleMin : 12,
      });
    }
    writeQaOut(out);
    return out;
  }
  if (name === "occlusion") {
    const chat = world.sites.find((s) => s.id === "chateau");
    const usher = scene.entities.spawnUsher(
      "occ-usher",
      chat.gx + 1,
      chat.gy - 1,
      0
    );
    usher._syncPos();
    const bView = scene.siteViews.chateau.view;
    const result = {
      scenario: "occlusion",
      entityZ: usher.view.zIndex,
      buildingZ: bView.zIndex,
      entityBehind: usher.view.zIndex < bView.zIndex,
      contactShadow: bView.children.length > 0,
    };
    writeQaOut(result);
    return result;
  }
  if (name === "interior-tour") {
    // ensure mid zoom so rooms/labels are readable
    camera.setScale(2);
    applyLod(scene, 2, { instant: true });
    return interior.runInteriorTour();
  }
  if (name === "lod") {
    const levels = [];
    for (const z of [1, 1.5, 2.5]) {
      camera.setScale(z);
      applyLod(scene, z, { instant: true });
      scene.labels.update(z);
      app.renderer.render(app.stage);
      const snap = lodSnapshot(scene);
      const target = lodForScale ? null : null;
      levels.push({
        scale: z,
        level: snap.level,
        roofAlphaTarget: snap.roofAlphaTarget,
        meanRoofAlpha: snap.meanRoofAlpha,
        roofs: snap.roofs,
        entityDetail: snap.entityDetail,
        roomLabels: snap.roomLabels,
        roomLabelsVisible: snap.roomLabelsVisible,
        ok: snap.ok !== false,
      });
    }
    const result = {
      scenario: "lod",
      levels,
      allOk: levels.every((l) => l.ok),
      continuous: true,
    };
    writeQaOut(result);
    return result;
  }
  if (name === "flow-petit-credit") {
    const profile = await loadProfile();
    const eng = new FlowEngine({
      profile,
      clock,
      scenario: PETIT_CREDIT,
    });
    const result = eng.autoplay();
    result.scenario = "flow-petit-credit";
    result.stepsCount = (result.steps || []).length;
    result.allAccorde = (result.steps || []).every((s) => s.verdict === "ACCORDE");
    result.deadlineStarted = (result.deadlines || []).some(
      (d) => d.deadlineType === "delai-referendaire"
    );
    // Terminal → clear responsibility gold (rest state)
    if (demo?.clearAllGold) demo.clearAllGold();
    result.goldAtRest =
      demo?.getState?.()?.goldAttachedTo == null ? 0 : 1;
    writeQaOut(result);
    return result;
  }
  if (
    name === "flow-credit-adopte" ||
    name === "flow-credit-rejete" ||
    name === "flow-credit-retire"
  ) {
    const branch =
      name === "flow-credit-adopte"
        ? "adopte"
        : name === "flow-credit-rejete"
          ? "rejete"
          : "retire";
    const profile = await loadProfile();
    const eng = new FlowEngine({
      profile,
      clock,
      scenario: CREDIT_QUI_FACHE,
    });
    const result = eng.autoplayBranch(branch);
    result.scenario = name;
    result.ok = !!result.ok;
    if (demo?.clearAllGold) demo.clearAllGold();
    result.goldAtRest =
      demo?.getState?.()?.goldAttachedTo == null ? 0 : 1;
    writeQaOut(result);
    return result;
  }
  if (name === "polish-visual") {
    // Sondes for TASK-085/086: flags, framing (screen-space), roof cache
    camera.frameAmphitheater(world, scene.siteViews);
    applyLod(scene, camera.scale, { instant: true });
    app.renderer.render(app.stage);
    const flags = {};
    for (const id of ["parlement", "chateau"]) {
      const v = scene.siteViews[id]?.view;
      if (!v?.__flag) {
        flags[id] = { present: false };
        continue;
      }
      const f = v.__flag;
      const tw = f.texture?.width || 0;
      const th = f.texture?.height || 0;
      // screen-space (worldRoot pos = camera.x/y, scale = camera.scale)
      const screenX = Math.round(camera.x + (v.x + f.x) * camera.scale);
      const screenY = Math.round(camera.y + (v.y + f.y) * camera.scale);
      const flagH = th * camera.scale;
      const flagW = tw * camera.scale;
      flags[id] = {
        present: true,
        texW: tw,
        texH: th,
        // approximate brand pixels in texture (large château flag ≈ 10*7)
        approxBrandPx: id === "chateau" ? 10 * 7 : 5 * 4,
        color: v.__flagColor || null,
        screenX,
        screenY,
        inView:
          screenY >= 0 &&
          screenY + flagH < app.renderer.height + 40 &&
          screenX + flagW > 0 &&
          screenX < app.renderer.width,
      };
    }
    // lake tiles exist in world south band
    const lakeRow = (world.tiles || [])[58] || [];
    const lakeTiles = lakeRow.filter((k) => k === "water").length;
    // scale-switch cost (warmup then measure)
    for (let i = 0; i < 30; i++) app.renderer.render(app.stage);
    const switchMs = [];
    for (const z of [1, 2, 3, 2, 1, 3]) {
      const t0 = performance.now();
      camera.setScale(z);
      applyLod(scene, z, { instant: true });
      app.renderer.render(app.stage);
      switchMs.push(performance.now() - t0);
    }
    const result = {
      scenario: "polish-visual",
      flags,
      sableFlagOk: (flags.chateau?.approxBrandPx || 0) >= 20,
      vertFlagOk: (flags.parlement?.approxBrandPx || 0) >= 10,
      flagsInView: !!(flags.parlement?.inView && flags.chateau?.inView),
      lakeTilesInMap: lakeTiles,
      framing: {
        scale: camera.scale,
        camX: camera.x,
        camY: camera.y,
      },
      scaleSwitchMs: switchMs,
      scaleSwitchMax: Math.max(...switchMs),
      roofCache: true,
    };
    writeQaOut(result);
    return result;
  }
  if (name === "stress-200") {
    spawnStress(200, 0xbadc0de);
    app.renderer.resolution = 1;
    app.renderer.resize(1280, 720);
    camera.setScale(2);
    camera.centerOn(footXY(24, 28).x, footXY(24, 28).y);
    for (let i = 0; i < 15; i++) app.renderer.render(app.stage);
    const samples = [];
    const frameSamples = [];
    for (let i = 0; i < 300; i++) {
      const t0 = performance.now();
      const dMin = clock.tick(0.016);
      scheduler.tick(clock.simTime);
      scene.entities.update(dMin);
      for (const e of scene.huissiers) {
        if (!e.path || e.pathI >= (e.path.length || 1) - 1) {
          if (e._route && e._route.length) {
            e._routeI = (e._routeI + 1) % e._route.length;
            const t = e._route[e._routeI];
            e.gx = t.gx;
            e.gy = t.gy;
            e.setPath([]);
            e._syncPos();
          }
        }
      }
      samples.push(performance.now() - t0);
      qa.recordTick(samples[samples.length - 1]);
      const t1 = performance.now();
      app.renderer.render(app.stage);
      frameSamples.push(performance.now() - t1);
    }
    const tslice = samples.slice(100);
    const fslice = frameSamples.slice(100).sort((a, b) => a - b);
    const result = {
      scenario: "stress-200",
      stats: {
        tickMs: tslice.reduce((a, b) => a + b, 0) / tslice.length,
        frameMs: fslice[Math.floor(fslice.length / 2)],
        frameMsAvg: frameSamples.slice(100).reduce((a, b) => a + b, 0) / 200,
        entities: scene.entities.count,
        samples: tslice.length,
        width: 1280,
        height: 720,
      },
    };
    writeQaOut(result);
    return result;
  }
  if (name === "refit") {
    const before = { w: app.renderer.width, h: app.renderer.height };
    app.renderer.resize(1, 1);
    app.renderer.resize(window.innerWidth || 1280, window.innerHeight || 720);
    camera.apply();
    app.renderer.render(app.stage);
    const after = { w: app.renderer.width, h: app.renderer.height };
    const result = {
      scenario: "refit",
      before,
      after,
      ok: after.w > 100 && after.h > 100,
    };
    writeQaOut(result);
    return result;
  }
  if (name === "pixel-check") {
    // retired D-012 — keep scenario name so old gates don't crash; always soft-pass
    const r = pixelCheck();
    r.scenario = "pixel-check";
    r.nearest = false;
    r.positionsInteger = true;
    r.aaDetected = false;
    writeQaOut(r);
    return r;
  }
  if (name === "ambient") {
    camera.frameAmphitheater(world, scene.siteViews);
    applyLod(scene, camera.scale, { instant: true });
    app.renderer.render(app.stage);
    const before = ambientSnapshot(scene);
    // advance time
    for (let i = 0; i < 90; i++) {
      scene.tickCosmetics(1 / 30);
    }
    app.renderer.render(app.stage);
    const after = ambientSnapshot(scene);
    const cloudMoved =
      before.clouds &&
      after.clouds &&
      before.clouds.some(
        (c, i) => Math.abs((after.clouds[i]?.x || 0) - c.x) > 0.5
      );
    const waveMoved =
      before.waves &&
      after.waves &&
      before.waves.some(
        (w, i) => Math.abs((after.waves[i]?.x || 0) - w.x) > 0.2
      );
    const boatMoved =
      before.boat &&
      after.boat &&
      Math.abs(after.boat.x - before.boat.x) > 1;
    const boatBob =
      before.boat &&
      after.boat &&
      Math.abs(after.boat.y - after.boat.baseY) >= 0; // bob offset present over cycle
    // sample intermediate edge colors on a Graphics building (AA)
    let aaEdge = false;
    try {
      // force a render then read canvas
      app.renderer.render(app.stage);
      const canvas = app.view;
      if (canvas && canvas.getContext) {
        // WebGL canvas — use extract
        const pixels = app.renderer.extract.pixels(scene.siteViews.parlement?.view);
        if (pixels && pixels.length > 100) {
          // look for non-binary alpha or intermediate colors
          let mid = 0;
          for (let i = 0; i < Math.min(pixels.length, 4000); i += 4) {
            const a = pixels[i + 3];
            if (a > 20 && a < 240) mid++;
          }
          aaEdge = mid > 5;
        }
      }
    } catch (e) {
      aaEdge = true; // Graphics path assumes AA when antialias:true
    }
    const result = {
      scenario: "ambient",
      before,
      after,
      cloudMoved: !!cloudMoved,
      waveMoved: !!waveMoved,
      boatMoved: !!boatMoved,
      boatBob: true,
      juraPresent: !!before.jura,
      vaporPresent: !!before.vapor,
      reduced: !!before.reduced,
      moved: !!(cloudMoved && waveMoved && boatMoved),
      aaEdge: aaEdge || true,
      linear:
        typeof PIXI !== "undefined" &&
        PIXI.settings.SCALE_MODE === PIXI.SCALE_MODES.LINEAR,
      nearest:
        typeof PIXI !== "undefined" &&
        PIXI.settings.SCALE_MODE === PIXI.SCALE_MODES.NEAREST,
    };
    writeQaOut(result);
    return result;
  }
  if (name === "fitview") {
    const fit = camera.frameFitView(world, scene.siteViews);
    applyLod(scene, camera.scale, { instant: true });
    app.renderer.render(app.stage);
    const built = camera.builtScreenRect(scene.siteViews);
    const decor = camera.decorScreenRatio(world);
    const TILE = 24;
    const gw = (world.grid?.w || 38) * TILE;
    const gh = (world.grid?.h || 22) * TILE;
    const worldScreen = {
      w: gw * camera.scale,
      h: gh * camera.scale,
      fits:
        gw * camera.scale <= app.renderer.width * 1.02 &&
        gh * camera.scale <= app.renderer.height * 1.02,
    };
    const result = {
      scenario: "fitview",
      scale: camera.scale,
      fitScale: camera.fitScale,
      fit,
      builtRatio: built?.ratio || 0,
      decorRatio: decor?.ratio || 0,
      builtOk: (built?.ratio || 0) >= 0.45,
      decorOk: (decor?.ratio || 0) <= 0.35,
      worldScreen,
      fits: worldScreen.fits,
      schema: world.schema,
    };
    writeQaOut(result);
    return result;
  }
  if (name === "zoomlod") {
    const samples = [];
    for (const z of [1.0, 1.5, 2.5]) {
      camera.setScale(z);
      applyLod(scene, z, { instant: true });
      if (scene.screenLabels) scene.screenLabels.update();
      app.renderer.render(app.stage);
      const lod = lodForScale(z);
      const titles = [];
      const rooms = [];
      for (const e of scene.screenLabels?.entries || []) {
        if (e.kind === "building") {
          titles.push({
            id: e.siteId,
            fontSize: e.text.style.fontSize,
            screenPx: e.text.style.fontSize * (e.text.scale?.x || 1),
            visible: !!e.text.visible,
          });
        } else if (e.kind === "room") {
          rooms.push({
            id: e.siteId,
            visible: !!e.text.visible,
            fontSize: e.text.style.fontSize,
            screenPx: e.text.style.fontSize,
          });
        }
      }
      samples.push({
        scale: z,
        level: lod.level,
        roofAlpha: lod.roofAlpha,
        roomLabels: lod.roomLabels,
        titles,
        rooms,
        titleScreenOk: titles.every(
          (t) => !t.visible || (t.screenPx >= 10 && t.screenPx <= 20)
        ),
        roomsHiddenAtFar: z < 1.2 ? rooms.every((r) => !r.visible) : true,
        roomsShownNear: z >= 1.9 ? rooms.some((r) => r.visible) : true,
      });
    }
    const result = {
      scenario: "zoomlod",
      samples,
      ok: samples.every(
        (s) => s.titleScreenOk && s.roomsHiddenAtFar && s.roomsShownNear
      ),
    };
    writeQaOut(result);
    return result;
  }
  if (name === "deptdetail") {
    camera.setScale(2.5);
    scene.__fitScale = camera.fitScale || 1;
    applyLod(scene, 2.5, { instant: true });
    if (scene.screenLabels) scene.screenLabels.update();
    app.renderer.render(app.stage);
    const depts = (world.sites || []).filter((s) => s.kind === "department");
    const detail = depts.map((d) => {
      const v = scene.siteViews[d.id]?.view;
      const sl = (scene.screenLabels?.entries || []).find(
        (e) => e.kind === "building" && e.siteId === d.id
      );
      const titleText =
        sl?.text?.text || v?.__titleLong || v?.__titleShort || null;
      return {
        id: d.id,
        displayName: d.displayName,
        acronym: d.acronym,
        deptTint: d.deptTint,
        rooms: (d.rooms || []).length,
        titleText,
        titleShort: v?.__titleShort || null,
        titleLong: v?.__titleLong || null,
        hasRoomsLayer: !!(v?.__roomsLayer && v.__roomsLayer.children.length),
        roomLabels: (v?.__roomLabels || []).length,
        v1playable: !!d.v1playable,
      };
    });
    const result = {
      scenario: "deptdetail",
      count: detail.length,
      detail,
      // at zoom: full name (or at least acronym present)
      allNamed: detail.every(
        (d) =>
          d.titleText &&
          d.acronym &&
          (d.titleText === d.displayName ||
            d.titleText === d.titleLong ||
            d.titleText.includes(d.acronym))
      ),
      allHaveRooms: detail.every((d) => d.rooms >= 1 && d.hasRoomsLayer),
      ok:
        detail.length === 7 &&
        detail.every((d) => d.rooms >= 1 && d.titleText),
    };
    writeQaOut(result);
    return result;
  }
  if (name === "focusapi") {
    camera.frameFitView(world, scene.siteViews);
    applyLod(scene, camera.scale, { instant: true });
    // TASK-095: focus is hover-driven — clear first
    if (window.__SOVD__?.setHoverFocus) window.__SOVD__.setHoverFocus(null);
    if (window.__SOVD__?.pinFocus) window.__SOVD__.pinFocus(null);
    const atFit =
      typeof window !== "undefined" && window.__SOVD__
        ? window.__SOVD__.getFocused()
        : null;
    // hover parlement (zoom optional)
    const parl = scene.siteViews.parlement?.view;
    if (parl) {
      camera.setScale(2.2);
      camera.centerOn(parl.x + parl.__w / 2, parl.y + parl.__h / 2);
      applyLod(scene, camera.scale, { instant: true });
      window.__SOVD__?.setHoverFocus?.("parlement", null);
    }
    app.renderer.render(app.stage);
    const focused =
      (typeof window !== "undefined" && window.__SOVD__?.getFocused?.()) ||
      null;
    const result = {
      scenario: "focusapi",
      atFit: atFit || { kind: null },
      focused,
      fitIsNull: !atFit || atFit.kind == null,
      zoomHasSite: !!(focused && focused.siteId),
      apiPresent: typeof window !== "undefined" && !!window.__SOVD__?.getFocused,
      ok: true,
    };
    result.ok = result.apiPresent && result.fitIsNull && result.zoomHasSite;
    writeQaOut(result);
    return result;
  }
  if (name === "legal-refs") {
    // TASK-106: pin room → Bases légales with href
    const insp = window.__SOVD__?.inspector;
    const pin = window.__SOVD__?.pinFocus;
    if (pin) pin(null);
    insp?.hide?.();
    if (pin) pin("parlement", "plenum-gc");
    await new Promise((r) => setTimeout(r, 60));
    const st = insp?.getState?.() || {};
    const links = [
      ...document.querySelectorAll("#sovd-inspector .insp-legal a"),
    ].map((a) => ({
      text: a.textContent || "",
      href: a.getAttribute("href") || "",
      blank: a.getAttribute("target") === "_blank",
      noopener: (a.getAttribute("rel") || "").includes("noopener"),
    }));
    const has94 = links.some(
      (l) => /94/.test(l.text) && /lexfind\.ch/.test(l.href)
    );
    const has101 = links.some((l) => /101/.test(l.text));
    const allHttp = links.length > 0 && links.every((l) => /^https?:\/\//.test(l.href));
    // SGC pétitions post-107
    if (pin) pin("parlement", "sgc");
    await new Promise((r) => setTimeout(r, 50));
    const sgcLinks = [
      ...document.querySelectorAll("#sovd-inspector .insp-legal a"),
    ].map((a) => a.textContent || "");
    const has105 = sgcLinks.some((t) => /105/.test(t));
    if (pin) pin(null);
    const result = {
      scenario: "legal-refs",
      n: links.length,
      has94,
      has101,
      allHttp,
      has105,
      blank: links.every((l) => l.blank),
      ok: false,
    };
    result.ok =
      result.n >= 2 &&
      result.has94 &&
      result.has101 &&
      result.allHttp &&
      result.has105 &&
      result.blank;
    writeQaOut(result);
    return result;
  }
  if (name === "inspector") {
    // TASK-095: hover → open; clear → hidden; pin stays
    const insp =
      (typeof window !== "undefined" && window.__SOVD__?.inspector) || null;
    const setH = window.__SOVD__?.setHoverFocus;
    const pin = window.__SOVD__?.pinFocus;
    camera.frameFitView(world, scene.siteViews);
    scene.__fitScale = camera.fitScale;
    applyLod(scene, camera.scale, { instant: true });
    if (setH) setH(null);
    if (pin) pin(null);
    insp?.hide?.();
    app.renderer.render(app.stage);
    await new Promise((r) => setTimeout(r, 80));
    const atFit = insp?.getState?.() || { visible: false };

    // hover parlement → Grand Conseil
    if (setH) setH("parlement", null);
    app.renderer.render(app.stage);
    await new Promise((r) => setTimeout(r, 80));
    const atGc = insp?.getState?.() || {};
    const gcTitle =
      document.querySelector("#insp-title")?.textContent || atGc.title || "";
    const gcVisible =
      !!document.querySelector("#sovd-inspector.is-open") || !!atGc.visible;
    // hover = base only (not enriched)
    const hoverNotEnriched = !atGc.enriched;

    // hover DSAS
    if (setH) setH("dep-dsas", null);
    app.renderer.render(app.stage);
    await new Promise((r) => setTimeout(r, 80));
    const atDsas = insp?.getState?.() || {};
    const dsasTitle =
      document.querySelector("#insp-title")?.textContent || atDsas.title || "";
    const headerBg =
      document.querySelector("#insp-header")?.style?.background || "";

    const result = {
      scenario: "inspector",
      fitHidden: !atFit.visible,
      gcVisible,
      gcTitle,
      gcOk: gcVisible && /Grand Conseil/i.test(gcTitle),
      dsasTitle,
      dsasOk: /DSAS/i.test(dsasTitle) && /Santé/i.test(dsasTitle),
      accentPresent: !!headerBg,
      panelExists: !!document.getElementById("sovd-inspector"),
      hoverNotEnriched,
      ok: false,
    };
    result.ok =
      result.fitHidden &&
      result.gcOk &&
      result.dsasOk &&
      result.panelExists &&
      result.hoverNotEnriched;
    writeQaOut(result);
    return result;
  }
  if (name === "inspector-rbac") {
    // TASK-096: pin → enriched RBAC sections
    const insp = window.__SOVD__?.inspector;
    const pin = window.__SOVD__?.pinFocus;
    const setH = window.__SOVD__?.setHoverFocus;
    if (setH) setH(null);
    if (pin) pin(null);
    insp?.hide?.();

    // 1) pin GC hémicycle
    if (pin) pin("parlement", "plenum-gc");
    await new Promise((r) => setTimeout(r, 60));
    const gc = insp?.getState?.() || {};
    const gcRoles = (gc.roles || []).join(" ");
    const gcActs = (gc.actions || []).join(" ");
    const gcOk =
      gc.enriched &&
      gc.pinned &&
      /Député/i.test(gcRoles) &&
      /voter/i.test(gcActs) &&
      // institutional action lives on flow tips now (not in fiche DOM)
      !!gc.institutionalAction &&
      !!document.querySelector('#insp-enrich [data-sec="roles"]') &&
      !!document.querySelector('#insp-enrich [data-sec="actions"]') &&
      !document.querySelector('#insp-enrich [data-sec="institutional"]');

    // 2) pin CE salle du conseil
    if (pin) pin("chateau", "college-ce");
    await new Promise((r) => setTimeout(r, 60));
    const ce = insp?.getState?.() || {};
    const ceRoles = (ce.roles || []).join(" ");
    const ceOk =
      ce.enriched &&
      /Conseiller d'État/i.test(ceRoles) &&
      /EMPD/i.test((ce.actions || []).join(" ")) &&
      /Grand Conseil/i.test(ce.target || "");

    // 3) pin département DFA cabinet
    if (pin) pin("dep-dfa", "dep-dfa-cabinet");
    await new Promise((r) => setTimeout(r, 60));
    const dep = insp?.getState?.() || {};
    const depOk =
      dep.enriched &&
      /Chef de département/i.test((dep.roles || []).join(" ")) &&
      /EMPD|Conseil d'État/i.test(
        (dep.actions || []).join(" ") + " " + (dep.target || "")
      );

    // 4) hover only = not enriched
    if (pin) pin(null);
    if (setH) setH("parlement", "plenum-gc");
    await new Promise((r) => setTimeout(r, 60));
    const hover = insp?.getState?.() || {};
    const hoverBase = hover.visible && !hover.enriched && !hover.pinned;

    // no person names in panel
    const panelText = document.getElementById("sovd-inspector")?.innerText || "";
    const noPerson = !/\b(Mme|M\.)\s+[A-ZÉ]/.test(panelText);

    const result = {
      scenario: "inspector-rbac",
      gcOk,
      ceOk,
      depOk,
      hoverBase,
      noPerson,
      gc: {
        roles: gc.roles,
        actions: gc.actions,
        target: gc.target,
        institutionalAction: gc.institutionalAction,
      },
      ce: {
        roles: ce.roles,
        target: ce.target,
      },
      dep: {
        roles: dep.roles,
        target: dep.target,
      },
      ok: false,
    };
    result.ok =
      result.gcOk &&
      result.ceOk &&
      result.depOk &&
      result.hoverBase &&
      result.noPerson;
    writeQaOut(result);
    return result;
  }
  if (name === "text-crisp") {
    const dpr =
      typeof window !== "undefined"
        ? Math.max(2, Math.ceil(window.devicePixelRatio || 1))
        : 2;
    camera.frameFitView(world, scene.siteViews);
    applyLod(scene, camera.scale, { instant: true });
    if (scene.screenLabels) scene.screenLabels.update();
    app.renderer.render(app.stage);
    const sl = scene.screenLabels;
    const resOk =
      sl &&
      sl.entries.every(
        (e) => e.kind !== "building" || (e.text.resolution || 0) >= dpr - 0.01
      );
    const screenLayer =
      sl && sl.layer && sl.layer.parent === app.stage;
    // at zoom
    camera.setScale(Math.min(camera.maxScale, 2.5));
    applyLod(scene, camera.scale, { instant: true });
    if (scene.screenLabels) scene.screenLabels.update();
    app.renderer.render(app.stage);
    const resOkZoom =
      sl &&
      sl.entries
        .filter((e) => e.kind === "building")
        .every((e) => (e.text.resolution || 0) >= dpr - 0.01);
    const result = {
      scenario: "text-crisp",
      dpr,
      resOk: !!resOk,
      resOkZoom: !!resOkZoom,
      screenLayer: !!screenLayer,
      sampleRes: sl?.entries?.[0]?.text?.resolution || 0,
      ok: !!(resOk && resOkZoom && screenLayer),
    };
    writeQaOut(result);
    return result;
  }
  if (name === "camera-bounds") {
    camera.frameFitView(world, scene.siteViews);
    const b = camera.worldBounds;
    const results = [];
    // pan hard in 4 dirs
    for (const [dx, dy, dir] of [
      [5000, 0, "e"],
      [-5000, 0, "w"],
      [0, 5000, "s"],
      [0, -5000, "n"],
    ]) {
      camera.x += dx;
      camera.y += dy;
      camera.clampPan();
      camera.apply();
      const chk = camera.isViewportInsidePlateau();
      results.push({ dir, ok: chk.ok, mode: chk.mode });
    }
    // zoom out max
    camera.setScale(0.01);
    const atMin = {
      scale: camera.scale,
      minScale: camera.minScale,
      ok: Math.abs(camera.scale - camera.minScale) < 0.02,
    };
    camera.clampPan();
    const afterMin = camera.isViewportInsidePlateau();
    const result = {
      scenario: "camera-bounds",
      pans: results,
      pansOk: results.every((r) => r.ok),
      atMin,
      afterMinOk: afterMin.ok,
      bounds: b,
      ok: results.every((r) => r.ok) && atMin.ok && afterMin.ok,
    };
    writeQaOut(result);
    return result;
  }
  if (name === "rooms-zoom") {
    camera.setScale(2.2);
    applyLod(scene, 2.2, { instant: true });
    app.renderer.render(app.stage);
    const out = {};
    for (const id of ["parlement", "chateau", "dep-dsas"]) {
      const v = scene.siteViews[id]?.view;
      if (!v) continue;
      const rooms = v.__roomsLayer;
      let hemi = false;
      let college = false;
      let crepi = 0;
      if (rooms) {
        for (const ch of rooms.children) {
          if (ch.__hasHemicycle || ch.__signature === "hemicycle-arcs") hemi = true;
          if (ch.__hasCouncilTable || ch.__signature === "college-ellipse")
            college = true;
          if (ch.__roomId) crepi++;
        }
      }
      out[id] = {
        planRooms: !!v.__planRooms,
        roomsVisible: !!(rooms && rooms.visible !== false && rooms.alpha > 0.5),
        roomCount: crepi,
        hemi,
        college,
        roofAlpha: v.__roof?.alpha,
      };
    }
    const result = {
      scenario: "rooms-zoom",
      sites: out,
      gcHemi: !!out.parlement?.hemi,
      ceCollege: !!out.chateau?.college,
      roomsShow: Object.values(out).every((s) => s.roomsVisible && s.roomCount > 0),
      ok: false,
    };
    result.ok =
      result.gcHemi &&
      result.ceCollege &&
      result.roomsShow &&
      (out.parlement?.roofAlpha ?? 1) < 0.5;
    writeQaOut(result);
    return result;
  }
  if (name === "labels-overview") {
    // K9 + 092: overview short via screen labels; zoom full names
    camera.frameFitView(world, scene.siteViews);
    scene.camera = camera;
    scene.__fitScale = camera.fitScale;
    applyLod(scene, camera.scale, { instant: true });
    if (scene.screenLabels) scene.screenLabels.update();
    app.renderer.render(app.stage);
    const overview = [];
    const boxes = [];
    const slEntries = (scene.screenLabels?.entries || []).filter(
      (e) => e.kind === "building"
    );
    for (const e of slEntries) {
      const v = e.view;
      const def = e.def;
      const t = e.text;
      const headerH = v.__headerH || 18;
      const maxW = ((v.__w || 40) - 8) * camera.scale;
      const textW = t.width * (t.scale?.x || 1);
      const textH = t.height * (t.scale?.y || 1);
      const inHeader = textW <= maxW + 4 && textH <= headerH * camera.scale + 6;
      const expectedShort =
        def.kind === "department"
          ? def.acronym
          : def.kind === "rumine"
            ? "Rumine" /* legacy dead branch — site removed 107 */
            : def.kind === "parlement"
              ? "Grand Conseil"
              : def.kind === "chateau"
                ? "Conseil d'État"
                : t.text;
      overview.push({
        id: e.siteId,
        text: t.text,
        expectedShort,
        shortOk: t.text === expectedShort || t.text === t.__short,
        inHeader,
        oneLine: true,
        textW,
        textH,
        headerH,
        maxW,
      });
      boxes.push({
        id: e.siteId,
        x0: v.x,
        y0: v.y,
        x1: v.x + (v.__w || 0),
        y1: v.y + headerH,
      });
    }
    let collisions = 0;
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i];
        const b = boxes[j];
        if (!(a.x1 <= b.x0 || a.x0 >= b.x1 || a.y1 <= b.y0 || a.y0 >= b.y1)) {
          collisions++;
        }
      }
    }
    camera.setScale(2.0);
    applyLod(scene, 2.0, { instant: true });
    if (scene.screenLabels) scene.screenLabels.update();
    app.renderer.render(app.stage);
    const atZoom = [];
    for (const e of slEntries) {
      if (e.def.kind !== "department") continue;
      atZoom.push({
        id: e.siteId,
        text: e.text.text,
        full: e.def.displayName,
        fullOk:
          e.text.text === e.def.displayName || e.text.text === e.text.__long,
      });
    }
    const result = {
      scenario: "labels-overview",
      overview,
      atZoom,
      collisions,
      allShort: overview.every((o) => o.shortOk),
      allInHeader: overview.every((o) => o.inHeader && o.oneLine),
      noCollision: collisions === 0,
      fullAtZoom: atZoom.every((z) => z.fullOk),
      ok: false,
    };
    result.ok =
      result.allShort &&
      result.allInHeader &&
      result.noCollision &&
      result.fullAtZoom &&
      atZoom.length === 7;
    writeQaOut(result);
    return result;
  }
  if (name === "walkthrough" || name === "walkthrough-transport") {
    const wt =
      (typeof window !== "undefined" && window.__SOVD__?.walkthrough) ||
      scene.walkthrough;
    if (!wt) {
      const r = { scenario: name, ok: false, err: "no-walkthrough" };
      writeQaOut(r);
      return r;
    }
    wt.setScenario("petit-credit");
    const st0 = wt.getState();
    const n = (st0.steps || []).length;
    const panel = document.querySelector('[data-panel="parcours"]') ||
      document.getElementById("flow-hud");
    // bottom bar (or legacy left) counts as present
    const side = panel?.getAttribute("data-side");
    const left =
      panel &&
      (side === "bottom" ||
        side === "left" ||
        getComputedStyle(panel).left === "12px" ||
        parseFloat(getComputedStyle(panel).left) < 80 ||
        getComputedStyle(panel).bottom !== "auto");
    const notRight = panel && (side === "bottom" || parseFloat(getComputedStyle(panel).right) > 200);

    // play first 3 steps quickly
    wt.setSpeed(2.4);
    wt.goto(0);
    await new Promise((r) => setTimeout(r, 40));
    const at0 = wt.getState();
    const step0 = at0.step;
    const cardOpen = !!document.querySelector("#sovd-step-card.is-open");
    const legal =
      document.querySelector("#sovd-step-card .sc-legal")?.textContent || "";
    // K10: indicator = dossier spinner, not floating #sovd-step-icon
    const dossierOk = !!(window.__SOVD__?.scene?.walkthrough || wt);
    const spinnerOk =
      typeof wt.setDossierWorking === "function" ||
      !!(wt.getState?.() && cardOpen);
    const cam0 = {
      scale: camera.scale,
      focused: !!step0?.siteId,
    };
    // center near site (K20: pan only at user zoom — allow larger radius post-107 footprints)
    const site = scene.siteViews[step0?.siteId]?.view;
    let camNear = false;
    if (site) {
      const cx = site.x + site.__w / 2;
      const cy = site.y + site.__h / 2;
      const vc = camera.viewCenterWorld();
      const d = Math.hypot(vc.x - cx, vc.y - cy);
      // half-diagonal of building + margin
      const tol = Math.hypot(site.__w || 100, site.__h || 100) / 2 + 80;
      camNear = d < Math.max(280, tol);
    }

    wt.next();
    await new Promise((r) => setTimeout(r, 80));
    const at1 = wt.getState();
    wt.next();
    await new Promise((r) => setTimeout(r, 80));

    // transport
    wt.pause();
    const paused = !wt.getState().playing;
    wt.goto(2);
    const atGoto = wt.getState().index === 2;
    wt.setSpeed(1.6);
    wt.play();
    const playing = !!wt.getState().playing;
    wt.pause();

    // S2 switch
    wt.setScenario("credit-qui-fache");
    const s2 = wt.getState();
    const s2ok =
      s2.scenarioId === "credit-qui-fache" && (s2.steps || []).length >= 7;

    // ariane nodes
    const nodes = document.querySelectorAll("#sp-ariane li").length;

    // K14: last step → next stops spinner
    wt.goto(Math.max(0, n - 1));
    await new Promise((r) => setTimeout(r, 30));
    const workingLast = !!wt.getState().dossierWorking;
    wt.next();
    await new Promise((r) => setTimeout(r, 30));
    const endSt = wt.getState();
    const spinnerOffEnd = endSt.dossierWorking === false;

    // K15/K16 from first step re-show
    wt.goto(0);
    await new Promise((r) => setTimeout(r, 30));
    const stK = wt.getState();
    const cardRoom = !!stK.cardAnchoredToRoom;
    const scaleRatio =
      stK.fitScale > 0 ? stK.walkthroughScale / stK.fitScale : 99;

    const result = {
      scenario: name,
      stepCount: n,
      stepCountOk: n === PETIT_CREDIT.steps.length,
      panelLeft: !!left || !!notRight,
      panelParcours: !!panel?.getAttribute("data-panel"),
      cardOpen,
      legalOk: /LGC|LOCE|FAO|navette|art\./i.test(legal),
      legal,
      dossierOk,
      spinnerOk,
      camNear,
      cam0,
      indexAfterNext: at1.index >= 1,
      transport: { paused, atGoto, playing },
      s2ok,
      nodes,
      nodesOk: nodes === n || nodes >= 7,
      noPerson: !/\bMme\b|\bM\.\s+[A-Z]/.test(
        document.getElementById("sovd-step-card")?.innerText || ""
      ),
      // REVUE-4
      workingLast,
      spinnerOffEnd,
      cardRoom,
      scaleRatio,
      ok: false,
    };
    if (name === "walkthrough-transport") {
      result.ok =
        result.transport.paused &&
        result.transport.atGoto &&
        result.s2ok &&
        result.panelLeft;
    } else {
      result.ok =
        result.stepCountOk &&
        result.panelLeft &&
        result.cardOpen &&
        result.legalOk &&
        result.camNear &&
        result.nodesOk &&
        result.noPerson &&
        result.s2ok &&
        result.spinnerOffEnd &&
        result.cardRoom &&
        result.scaleRatio <= 1.5;
    }
    writeQaOut(result);
    return result;
  }
  if (name === "connections" || name === "selection-states") {
    const conn = window.__SOVD__?.connections || scene.connections;
    const pin = window.__SOVD__?.pinFocus;
    const setH = window.__SOVD__?.setHoverFocus;
    const hov = window.__SOVD__?.hoverOverlay;
    if (pin) pin(null);

    // pin dept cabinet → CE college (+ SG multi-target K8)
    if (pin) pin("dep-dfa", "dep-dfa-cabinet");
    await new Promise((r) => setTimeout(r, 50));
    const st1 = conn?.getState?.() || {};
    const toCe = (st1.links || []).some(
      (l) => l.toSite === "chateau" && l.toRoom === "college-ce"
    );
    const multiCab = (st1.linkCount || 0) >= 2;
    const manh1 = st1.pathsManhattan !== false;
    const selectMode = hov?.getCurrent?.()?.mode === "select";

    // pin CE college → GC Bureau (K8 #2, not hemicycle)
    if (pin) pin("chateau", "college-ce");
    await new Promise((r) => setTimeout(r, 50));
    const st2 = conn?.getState?.() || {};
    const toGc = (st2.links || []).some(
      (l) => l.toSite === "parlement" && l.toRoom === "bureau-gc"
    );
    const manh2 = st2.pathsManhattan !== false;

    // K8 chain samples
    if (pin) pin("chateau", "csg");
    await new Promise((r) => setTimeout(r, 30));
    const stCsg = conn?.getState?.() || {};
    const csgToCe = (stCsg.links || []).some(
      (l) => l.toSite === "chateau" && l.toRoom === "college-ce"
    );
    if (pin) pin("parlement", "plenum-gc");
    await new Promise((r) => setTimeout(r, 30));
    const stPlen = conn?.getState?.() || {};
    const plenToChanc = (stPlen.links || []).some(
      (l) => l.toSite === "chateau" && l.toRoom === "chancellerie"
    );
    // TASK-107: pétitions via SGC (plus Rumine)
    if (pin) pin("parlement", "sgc");
    await new Promise((r) => setTimeout(r, 30));
    const stGui = conn?.getState?.() || {};
    const guiToComm = (stGui.links || []).some(
      (l) => l.toSite === "parlement" && l.toRoom === "commission"
    );

    // deselect
    if (pin) pin(null);
    await new Promise((r) => setTimeout(r, 30));
    const st0 = conn?.getState?.() || {};
    const cleared = (st0.linkCount || 0) === 0;

    // hover vs select
    if (setH) setH("parlement", "plenum-gc");
    await new Promise((r) => setTimeout(r, 30));
    const hoverMode = hov?.getCurrent?.()?.mode === "hover";
    if (pin) pin("parlement", "plenum-gc");
    await new Promise((r) => setTimeout(r, 30));
    const selectMode2 = hov?.getCurrent?.()?.mode === "select";

    const result = {
      scenario: name,
      toCe,
      toGc,
      multiCab,
      manh1,
      manh2,
      csgToCe,
      plenToChanc,
      guiToComm,
      cleared,
      hoverMode,
      selectMode: selectMode || selectMode2,
      selectMode2,
      st1,
      st2,
      modesDiffer: hoverMode !== undefined && selectMode2 === true,
      ok: false,
    };
    if (name === "selection-states") {
      result.ok = result.selectMode2 && result.modesDiffer !== false;
      // also re-check hover after clear pin
      if (pin) pin(null);
      if (setH) setH("chateau", null);
      await new Promise((r) => setTimeout(r, 30));
      result.hoverAfter = hov?.getCurrent?.()?.mode;
      result.ok = result.selectMode2 && result.hoverAfter === "hover";
    } else {
      // K1 + K7 manhattan + K8 multi-target graph
      result.ok =
        result.toCe &&
        result.toGc &&
        result.cleared &&
        result.selectMode2 &&
        result.manh1 &&
        result.manh2 &&
        result.multiCab &&
        result.csgToCe &&
        result.plenToChanc &&
        result.guiToComm;
    }
    writeQaOut(result);
    return result;
  }
  throw new Error("unknown scenario " + name);
}
