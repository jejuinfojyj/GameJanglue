let ctx = null;

function ac() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

function tone(freq, dur, type = 'sine', gain = 0.08, when = 0) {
  const a = ac();
  if (!a) return;
  const t0 = a.currentTime + when;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  o.connect(g);
  g.connect(a.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
}

export const SFX = {
  pull() {
    tone(180, 0.05, 'triangle', 0.04);
  },
  shoot() {
    tone(220, 0.08, 'square', 0.06);
    tone(340, 0.1, 'sine', 0.04, 0.04);
  },
  rim() {
    tone(140, 0.06, 'triangle', 0.05);
  },
  score(clean) {
    if (clean) {
      tone(520, 0.09, 'sine', 0.07);
      tone(680, 0.12, 'sine', 0.06, 0.06);
      tone(860, 0.14, 'triangle', 0.05, 0.12);
    } else {
      tone(400, 0.1, 'sine', 0.06);
      tone(520, 0.08, 'sine', 0.04, 0.05);
    }
  },
  star() {
    tone(880, 0.07, 'sine', 0.05);
    tone(1200, 0.1, 'triangle', 0.04, 0.05);
  },
  miss() {
    tone(160, 0.18, 'sawtooth', 0.05);
    tone(90, 0.22, 'triangle', 0.04, 0.08);
  },
};
