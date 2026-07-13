/**
 * Deterministic priority queue: fire callbacks at simTime.
 * Stable order at equal simTime via sequence number.
 * Pure sim queue only (no wall-clock, no RNG).
 */

export class Scheduler {
  constructor() {
    /** @type {{at:number, seq:number, tag?:string, cb:Function}[]} */
    this._q = [];
    this._seq = 0;
    this._fired = [];
  }

  /**
   * Schedule callback at absolute simTime.
   * @param {number} simTime
   * @param {Function} cb
   * @param {string} [tag]
   */
  at(simTime, cb, tag) {
    this._q.push({ at: simTime, seq: this._seq++, cb, tag: tag || null });
    this._q.sort((a, b) => a.at - b.at || a.seq - b.seq);
  }

  clear() {
    this._q.length = 0;
    this._seq = 0;
    this._fired.length = 0;
  }

  /** Drain all events with at <= simTime in deterministic order. */
  tick(simTime) {
    const out = [];
    while (this._q.length && this._q[0].at <= simTime) {
      const e = this._q.shift();
      if (e.tag) this._fired.push(e.tag);
      if (typeof e.cb === "function") e.cb(e);
      out.push(e);
    }
    return out;
  }

  get firedTags() {
    return this._fired.slice();
  }

  get pending() {
    return this._q.length;
  }
}

/**
 * Pure helper for Python-mirror tests: given [{at,tag}] sorted by insertion,
 * return tag order when advancing to max at.
 */
export function replayTags(events) {
  const sch = new Scheduler();
  const tags = [];
  for (const e of events) {
    sch.at(e.at, () => tags.push(e.tag), e.tag);
  }
  const maxAt = events.reduce((m, e) => Math.max(m, e.at), 0);
  sch.tick(maxAt);
  return tags;
}
