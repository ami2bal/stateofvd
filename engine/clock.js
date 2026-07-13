/**
 * Simulated clock — pause / x1 / x2 / x4.
 * Active day window 07:00–19:00. Weekly tags: Mon CSG · Tue GC · Wed CE.
 * Pure sim time only (no wall-clock, no RNG).
 */

const DAY_START_MIN = 7 * 60; // 07:00
const DAY_END_MIN = 19 * 60; // 19:00
const ACTIVE_MINUTES = DAY_END_MIN - DAY_START_MIN; // 720

const WEEKDAY_TAG = ["csg", "gc", "ce", "open", "open", "weekend", "weekend"];

export class Clock {
  /**
   * @param {object} [opts]
   * @param {number} [opts.speed] 0|1|2|4
   * @param {number} [opts.day] 1-based day index
   * @param {number} [opts.minuteOfDay] absolute minute 0–1439 (default 7*60)
   */
  constructor(opts) {
    opts = opts || {};
    this.speed = opts.speed != null ? opts.speed : 1;
    this.day = opts.day != null ? opts.day : 1; // 1-based
    this._minuteOfDay = opts.minuteOfDay != null ? opts.minuteOfDay : DAY_START_MIN;
    /** Total simulated minutes since day1 07:00 (active minutes only). */
    this.simTime = this._toSim(this.day, this._minuteOfDay);
  }

  static get ACTIVE_MINUTES() {
    return ACTIVE_MINUTES;
  }
  static get DAY_START_MIN() {
    return DAY_START_MIN;
  }

  _toSim(day, minuteOfDay) {
    const clamped = Math.max(DAY_START_MIN, Math.min(DAY_END_MIN, minuteOfDay));
    const active = clamped - DAY_START_MIN;
    return (day - 1) * ACTIVE_MINUTES + active;
  }

  _fromSim(sim) {
    const day = Math.floor(sim / ACTIVE_MINUTES) + 1;
    const active = sim - (day - 1) * ACTIVE_MINUTES;
    return { day, minuteOfDay: DAY_START_MIN + active };
  }

  setSpeed(s) {
    this.speed = s === 0 || s === 1 || s === 2 || s === 4 ? s : 1;
  }

  /** Advance by real dt seconds × speed → sim minutes. */
  tick(dtSec) {
    if (this.speed === 0) return 0;
    // 1 real second at x1 ≈ 1 sim minute (accelerated day)
    const dMin = dtSec * this.speed;
    this.simTime += dMin;
    const p = this._fromSim(this.simTime);
    this.day = p.day;
    this._minuteOfDay = p.minuteOfDay;
    return dMin;
  }

  /** Jump to absolute simTime (minutes). */
  setSimTime(t) {
    this.simTime = Math.max(0, t);
    const p = this._fromSim(this.simTime);
    this.day = p.day;
    this._minuteOfDay = p.minuteOfDay;
  }

  get hour() {
    return Math.floor(this._minuteOfDay / 60);
  }
  get minute() {
    return Math.floor(this._minuteOfDay % 60);
  }

  /** 0=Mon … 6=Sun from day 1 = Monday. */
  get weekday() {
    return (this.day - 1) % 7;
  }

  get weekdayTag() {
    return WEEKDAY_TAG[this.weekday];
  }

  formatTime() {
    const h = String(this.hour).padStart(2, "0");
    const m = String(this.minute).padStart(2, "0");
    return `${h}:${m}`;
  }

  formatHud() {
    const days = ["lun", "mar", "mer", "jeu", "ven", "sam", "dim"];
    return `J${this.day} ${days[this.weekday]} ${this.formatTime()} · ${this.weekdayTag.toUpperCase()} · ×${this.speed || "⏸"}`;
  }
}
