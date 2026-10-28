/** 짧은 효과음. 외부 소리 파일 없이 기기에서 바로 난다. */

let context;

export function unlockAudio() {
  const AudioCtx = globalThis.AudioContext || globalThis.webkitAudioContext;
  if (!AudioCtx) return;
  if (!context) context = new AudioCtx();
  if (context.state === 'suspended') context.resume();
}

function tone(frequency, duration, type, volume) {
  if (!context) return;
  const now = context.currentTime;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, now);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(volume, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(now);
  oscillator.stop(now + duration + 0.02);
}

export function playDrop() {
  tone(220, 0.09, 'sine', 0.06);
}

export function playPop(level) {
  tone(320 + level * 42, 0.16, 'sine', 0.12);
  tone(180 + level * 20, 0.1, 'triangle', 0.05);
}

export function playGameOver() {
  tone(196, 0.28, 'triangle', 0.1);
  tone(146, 0.36, 'sine', 0.08);
}
