/**
 * SFX optionnels WebAudio (pas de fichiers) — M3.
 */
let ctx = null;

function ac() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  return ctx;
}

function beep(freq, dur, type = "sine", gain = 0.04) {
  const c = ac();
  if (!c) return;
  if (c.state === "suspended") c.resume().catch(() => {});
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.value = gain;
  o.connect(g);
  g.connect(c.destination);
  const t = c.currentTime;
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.start(t);
  o.stop(t + dur + 0.02);
}

export const sfx = {
  enabled: true,
  play() {
    if (!this.enabled) return;
    beep(523, 0.06, "triangle", 0.03);
  },
  pause() {
    if (!this.enabled) return;
    beep(392, 0.08, "sine", 0.03);
  },
  step() {
    if (!this.enabled) return;
    beep(660, 0.05, "square", 0.025);
  },
  done() {
    if (!this.enabled) return;
    beep(523, 0.07, "sine", 0.03);
    setTimeout(() => beep(784, 0.12, "sine", 0.03), 80);
  },
  pin() {
    if (!this.enabled) return;
    beep(440, 0.04, "triangle", 0.025);
  },
};
