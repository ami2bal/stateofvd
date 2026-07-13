/**
 * Data-driven scenario runner — advances CivicObject along profile lifecycle.
 * Deterministic: no Date.now / Math.random in flow logic.
 * S1 golden path + S2 conflict (qualified majority, reading count, withdraw).
 */
import {
  evaluateAct,
  evaluateWithdraw,
  evaluateAmendment,
  canWithdraw,
  replayGoldenPath,
} from "./verdict.js";

/** Active minutes per day (07:00–19:00). */
const ACTIVE_MIN = 720;
const AT_10H = 180; // 10:00 as minutes after 07:00

/**
 * Jump clock forward day-by-day until weekdayTag matches (or max 21 days).
 * @param {{day:number, weekdayTag:string, setSimTime:Function}} clock
 * @param {string} tag
 */
export function seekWeekday(clock, tag) {
  let guard = 0;
  while (String(clock.weekdayTag) !== String(tag) && guard < 21) {
    const nextDay = (Number(clock.day) || 1) + 1;
    clock.setSimTime((nextDay - 1) * ACTIVE_MIN + AT_10H);
    guard++;
  }
  return String(clock.weekdayTag) === String(tag);
}

export class FlowEngine {
  /**
   * @param {object} opts
   * @param {object} opts.profile vaud.json
   * @param {object} opts.clock
   * @param {object} opts.scenario from flows/*.js
   * @param {(ev:object)=>void} [opts.onEvent]
   */
  constructor(opts) {
    this.profile = opts.profile;
    this.clock = opts.clock;
    this.scenario = opts.scenario;
    this.onEvent = opts.onEvent || (() => {});
    this.lifecycle = (opts.profile.catalogues.lifecycles || []).find(
      (l) => l.id === opts.scenario.lifecycleId
    );
    if (!this.lifecycle) throw new Error("lifecycle missing: " + opts.scenario.lifecycleId);

    this.object = null;
    this.stepIndex = 0;
    this.history = [];
    this.deadlines = [];
    this.handovers = [];
    this.decisions = [];
    this.done = false;
    this.lastVerdict = null;

    // S2 conflict trackers
    this.support = 0;
    this.readingCount = 0;
    this.minorityReport = false;
    this.amendmentAdmitted = false;
    this.amendmentResolved = false;
  }

  _initSupport() {
    const cfg = this.scenario.support || {};
    this.support = cfg.base != null ? cfg.base : 0;
    this.readingCount = 0;
    this.minorityReport = false;
    this.amendmentAdmitted = false;
    this.amendmentResolved = false;
  }

  start() {
    const sc = this.scenario;
    const initial = (this.lifecycle.states || []).find((s) => s.initial);
    this.object = {
      id: sc.objectId || "obj-flow",
      objectType: sc.objectType,
      label: sc.objectLabel,
      state: initial.id,
      pilotBodyId: sc.pilotBodyId,
      family: "act",
    };
    this.stepIndex = 0;
    this.history = [];
    this.deadlines = [];
    this.handovers = [];
    this.decisions = [];
    this.done = false;
    this.lastVerdict = null;
    this._initSupport();
    this.onEvent({ type: "start", object: { ...this.object } });
    return this.getState();
  }

  get currentStep() {
    return this.scenario.steps[this.stepIndex] || null;
  }

  getConflictState() {
    const thr =
      this.scenario.majorityThreshold != null
        ? this.scenario.majorityThreshold
        : 76;
    return {
      support: this.support,
      readingCount: this.readingCount,
      minorityReport: this.minorityReport,
      amendmentAdmitted: this.amendmentAdmitted,
      amendmentResolved: this.amendmentResolved,
      majority: this.scenario.majority || null,
      threshold: thr,
      members: this.scenario.members || 150,
      canWithdraw: this.canWithdrawNow(),
      canAdmitAmendment:
        !!this.object &&
        this.object.state === "en-debats" &&
        !this.amendmentResolved,
    };
  }

  canWithdrawNow() {
    return canWithdraw(
      this.object && this.object.state,
      this.scenario.withdrawStates
    );
  }

  getState() {
    const step = this.currentStep;
    return {
      object: this.object ? { ...this.object } : null,
      stepIndex: this.stepIndex,
      step: step
        ? {
            id: step.id,
            from: step.from,
            to: step.to,
            by: step.by,
            decisionType: step.decisionType || null,
            weekdayTag: step.weekdayTag || null,
            siteId: step.siteId || null,
            actLabel: step.actLabel,
            actorLabel: step.actorLabel,
            qualifiedVote: !!step.qualifiedVote,
            minorityReport: !!step.minorityReport,
          }
        : null,
      done: this.done,
      history: this.history.slice(),
      deadlines: this.deadlines.slice(),
      lastVerdict: this.lastVerdict,
      conflict: this.getConflictState(),
      nextRendezvous: step
        ? {
            dayTag: step.weekdayTag,
            siteId: step.siteId,
            actLabel: step.actLabel,
          }
        : null,
      clock: {
        day: this.clock.day,
        weekdayTag: this.clock.weekdayTag,
        hud: this.clock.formatHud(),
      },
    };
  }

  /**
   * Resolve step with optional alternate (reject branch).
   * @param {object} step
   * @param {'adopte'|'refuse'|'non-entree-en-matiere'|null} finalDecision
   */
  _resolveStep(step, finalDecision) {
    if (!step) return step;
    if (
      finalDecision &&
      step.rejectAlt &&
      (finalDecision === "refuse" || finalDecision === "non-entree-en-matiere")
    ) {
      const alt = step.rejectAlt;
      if (
        finalDecision === alt.decisionType ||
        (finalDecision === "refuse" && alt.decisionType === "refuse") ||
        (finalDecision === "refuse" &&
          alt.decisionType === "non-entree-en-matiere" &&
          step.id &&
          step.id.includes("eem"))
      ) {
        // only apply rejectAlt when caller targets refuse path on this step
      }
      if (
        step.qualifiedVote &&
        finalDecision === "refuse" &&
        alt.decisionType === "refuse"
      ) {
        return {
          ...step,
          to: alt.to,
          decisionType: alt.decisionType,
          actLabel: alt.actLabel || step.actLabel,
          successLesson: alt.successLesson || step.successLesson,
        };
      }
    }
    return step;
  }

  /**
   * Player (or autoplay) attempts the current path act.
   * @param {object} [opts]
   * @param {boolean} [opts.skipDayCheck]
   * @param {object} [opts.stepOverride] use alternate step fields (reject)
   */
  attemptCurrent(opts) {
    opts = opts || {};
    let step = opts.stepOverride || this.currentStep;
    if (!step || this.done) {
      this.lastVerdict = {
        verdict: "REFUS",
        lesson: "Le parcours est terminé.",
        stamp: "verdict",
      };
      return this.lastVerdict;
    }

    const clockForEval = opts.skipDayCheck
      ? {
          weekdayTag: step.weekdayTag || this.clock.weekdayTag,
          day: this.clock.day,
          formatHud: () => "",
        }
      : this.clock;

    const thr =
      this.scenario.majorityThreshold != null
        ? this.scenario.majorityThreshold
        : 76;
    const conflict = {
      support: this.support,
      threshold: thr,
      majority: this.scenario.majority || null,
    };

    const result = evaluateAct({
      expected: step,
      object: this.object,
      lifecycle: this.lifecycle,
      clock: clockForEval,
      attempt: { stepId: step.id },
      conflict: step.qualifiedVote ? conflict : null,
    });

    this.lastVerdict = result;
    this.history.push({
      stepId: step.id,
      verdict: result.verdict,
      wrongDay: !!result.wrongDay,
      stateBefore: this.object.state,
      day: this.clock.day,
      weekdayTag: this.clock.weekdayTag,
      support: this.support,
      majorityFail: !!result.majorityFail,
    });

    if (result.verdict !== "ACCORDE") {
      this.onEvent({ type: "verdict", result, step, object: { ...this.object } });
      return result;
    }

    // Side effects before transition
    if (step.minorityReport) {
      this.minorityReport = true;
      const m = (this.scenario.support && this.scenario.support.minorityReport) || 0;
      this.support += m;
    }
    if (step.opensDebates) {
      // 2e débat
      this.readingCount = Math.max(this.readingCount, 2);
    }

    // Apply transition
    this.object.state = step.to;
    if (step.by === "decision") {
      this.decisions.push({
        id: "dec-" + step.id,
        decisionType: step.decisionType,
        from: step.from,
        to: step.to,
      });
    }
    if (step.by === "handover") {
      this.handovers.push({
        id: "ho-" + step.id,
        fromSite: step.fromSiteId || null,
        toSite: step.siteId || null,
        object: this.object.id,
      });
    }
    if (step.startDeadline) {
      this.deadlines.push({
        id: "dl-" + step.startDeadline,
        deadlineType: step.startDeadline,
        object: this.object.id,
        startStep: step.id,
        state: "running",
      });
    }

    // Leaving en-debats without having resolved amendment → treated as refused
    if (step.from === "en-debats" && step.to !== "en-debats") {
      if (!this.amendmentResolved) {
        this.amendmentResolved = true;
        this.amendmentAdmitted = false;
      }
    }

    this.stepIndex += 1;
    if (
      this.stepIndex >= this.scenario.steps.length ||
      this._isTerminal(this.object.state)
    ) {
      this.done = true;
    }

    this.onEvent({
      type: "verdict",
      result,
      step,
      object: { ...this.object },
      done: this.done,
    });
    return result;
  }

  _isTerminal(state) {
    const st = (this.lifecycle.states || []).find((s) => s.id === state);
    return !!(st && st.terminal);
  }

  /**
   * Admit amendment in en-debats → reading +1, stay in state (art. 101).
   */
  admitAmendment() {
    const result = evaluateAmendment({
      object: this.object,
      alreadyResolved: this.amendmentResolved,
    });
    this.lastVerdict = result;
    this.history.push({
      stepId: "amendment",
      verdict: result.verdict,
      stateBefore: this.object && this.object.state,
      support: this.support,
      readingCount: this.readingCount,
    });
    if (result.verdict !== "ACCORDE") {
      this.onEvent({ type: "verdict", result, object: { ...this.object } });
      return result;
    }
    this.amendmentResolved = true;
    this.amendmentAdmitted = true;
    this.readingCount += 1;
    const delta =
      (this.scenario.support && this.scenario.support.amendmentAdmitted) || 0;
    this.support += delta;
    this.onEvent({
      type: "verdict",
      result: { ...result, support: this.support, readingCount: this.readingCount },
      object: { ...this.object },
    });
    return {
      ...result,
      support: this.support,
      readingCount: this.readingCount,
      amendmentAdmitted: true,
    };
  }

  /**
   * CE withdraws project (author-act → retire). Only pré-vote-final.
   */
  attemptWithdraw() {
    const result = evaluateWithdraw({
      object: this.object,
      lifecycle: this.lifecycle,
      allowedStates: this.scenario.withdrawStates,
    });
    this.lastVerdict = result;
    this.history.push({
      stepId: "withdraw",
      verdict: result.verdict,
      stateBefore: this.object && this.object.state,
      withdrawTooLate: !!result.withdrawTooLate,
    });
    if (result.verdict !== "ACCORDE") {
      this.onEvent({ type: "verdict", result, object: { ...this.object } });
      return result;
    }
    this.object.state = "retire";
    this.done = true;
    this.onEvent({
      type: "verdict",
      result,
      object: { ...this.object },
      done: true,
    });
    return result;
  }

  /**
   * Autoplay golden path (S1 style): seek days + ACCORDE all steps → promulgue.
   */
  autoplay() {
    this.start();
    this.clock.setSimTime(AT_10H);
    const log = [];
    let wrongDayProbe = null;

    const firstTimed = this.scenario.steps.find((s) => s.weekdayTag);
    if (firstTimed) {
      const wrong = firstTimed.weekdayTag === "ce" ? "gc" : "ce";
      seekWeekday(this.clock, wrong);
      const probe = evaluateAct({
        expected: firstTimed,
        object: this.object,
        lifecycle: this.lifecycle,
        clock: this.clock,
      });
      wrongDayProbe = {
        attemptedOn: this.clock.weekdayTag,
        required: firstTimed.weekdayTag,
        verdict: probe.verdict,
        lesson: probe.lesson,
        wrongDay: !!probe.wrongDay,
      };
    }

    for (let i = 0; i < this.scenario.steps.length; i++) {
      const step = this.scenario.steps[i];
      if (step.weekdayTag) {
        const okDay = seekWeekday(this.clock, step.weekdayTag);
        if (!okDay) {
          log.push({
            stepId: step.id,
            verdict: "REFUS",
            reason: "seekWeekday failed",
            weekdayTag: this.clock.weekdayTag,
            wanted: step.weekdayTag,
            day: this.clock.day,
          });
          break;
        }
      }
      const r = this.attemptCurrent();
      log.push({
        stepId: step.id,
        from: step.from,
        to: step.to,
        by: step.by,
        verdict: r.verdict,
        wrongDay: !!r.wrongDay,
        lesson: r.lesson || null,
        state: this.object.state,
        weekdayTag: this.clock.weekdayTag,
        day: this.clock.day,
        support: this.support,
      });
      if (r.verdict !== "ACCORDE") break;
    }

    return {
      scenario: this.scenario.id,
      ok: this.done && this.object.state === "promulgue",
      finalState: this.object.state,
      steps: log,
      deadlines: this.deadlines.slice(),
      handovers: this.handovers.slice(),
      decisions: this.decisions.slice(),
      wrongDayProbe,
      conflict: this.getConflictState(),
      structural: replayGoldenPath(this.lifecycle, this.scenario.steps),
    };
  }

  /**
   * S2 branch autoplay: adopte | rejete | retire.
   * @param {string} branchId
   */
  autoplayBranch(branchId) {
    const branch =
      (this.scenario.branches && this.scenario.branches[branchId]) || null;
    if (!branch) {
      return {
        scenario: this.scenario.id,
        branch: branchId,
        ok: false,
        error: "unknown branch",
      };
    }

    this.start();
    this.clock.setSimTime(AT_10H);
    const log = [];
    const thr =
      this.scenario.majorityThreshold != null
        ? this.scenario.majorityThreshold
        : 76;

    for (let i = 0; i < this.scenario.steps.length; i++) {
      if (this.done) break;
      const step = this.scenario.steps[i];

      // Withdraw before processing the step that would leave withdrawAt state
      if (
        branch.withdrawAt &&
        this.object.state === branch.withdrawAt &&
        step.from === branch.withdrawAt
      ) {
        // optional: admit nothing, then withdraw
        const w = this.attemptWithdraw();
        log.push({
          stepId: "withdraw",
          from: branch.withdrawAt,
          to: "retire",
          by: "author-act",
          verdict: w.verdict,
          state: this.object.state,
          lesson: w.lesson || null,
        });
        break;
      }

      // Before leaving en-debats: optional amendment
      if (
        step.from === "en-debats" &&
        step.to === "vote-final" &&
        branch.admitAmendment &&
        !this.amendmentResolved
      ) {
        if (step.weekdayTag) seekWeekday(this.clock, step.weekdayTag);
        const am = this.admitAmendment();
        log.push({
          stepId: "amendment",
          from: "en-debats",
          to: "en-debats",
          by: "amendment",
          verdict: am.verdict,
          state: this.object.state,
          readingCount: this.readingCount,
          support: this.support,
          lesson: am.lesson || null,
        });
        if (am.verdict !== "ACCORDE") break;
      }

      // Build step override for reject final vote
      let stepOverride = null;
      if (
        step.qualifiedVote &&
        branch.finalDecision === "refuse" &&
        step.rejectAlt
      ) {
        stepOverride = {
          ...step,
          to: step.rejectAlt.to,
          decisionType: step.rejectAlt.decisionType,
          actLabel: step.rejectAlt.actLabel,
          successLesson: step.rejectAlt.successLesson,
        };
      }

      if (step.weekdayTag) {
        const okDay = seekWeekday(this.clock, step.weekdayTag);
        if (!okDay) {
          log.push({
            stepId: step.id,
            verdict: "REFUS",
            reason: "seekWeekday failed",
          });
          break;
        }
      }

      // For adopte branch: if someone tries adopte without enough support, fail
      // For rejete: use refuse override so ACCORDE → rejete
      const r = this.attemptCurrent({ stepOverride });
      const used = stepOverride || step;
      log.push({
        stepId: used.id,
        from: used.from,
        to: used.to,
        by: used.by,
        decisionType: used.decisionType || null,
        verdict: r.verdict,
        state: this.object.state,
        support: this.support,
        readingCount: this.readingCount,
        lesson: r.lesson || null,
        majorityFail: !!r.majorityFail,
      });
      if (r.verdict !== "ACCORDE") break;

      // Stop early on terminal
      if (this._isTerminal(this.object.state)) break;
    }

    // Probe: withdraw too late (after vote-final) — only for info on adopte path mid-run we skip
    // Explicit late-withdraw probe when final is not retire
    let lateWithdrawProbe = null;
    if (branchId !== "retire") {
      // synthetic: object already terminal or past — probe with fake state
      const saved = this.object.state;
      this.object.state = "vote-final";
      const late = evaluateWithdraw({
        object: this.object,
        lifecycle: this.lifecycle,
        allowedStates: this.scenario.withdrawStates,
      });
      lateWithdrawProbe = {
        state: "vote-final",
        verdict: late.verdict,
        withdrawTooLate: !!late.withdrawTooLate,
        lesson: late.lesson,
      };
      this.object.state = saved;
    }

    // Prove qualified majority: adopte needs support >= thr, rejete path support < thr (if went to scrutin)
    const conflict = this.getConflictState();

    return {
      scenario: this.scenario.id,
      branch: branchId,
      ok: this.object.state === branch.finalState,
      finalState: this.object.state,
      expectedFinal: branch.finalState,
      steps: log,
      deadlines: this.deadlines.slice(),
      handovers: this.handovers.slice(),
      decisions: this.decisions.slice(),
      conflict,
      threshold: thr,
      supportAtEnd: this.support,
      readingCount: this.readingCount,
      minorityReport: this.minorityReport,
      amendmentAdmitted: this.amendmentAdmitted,
      lateWithdrawProbe,
      majority: this.scenario.majority,
    };
  }
}
