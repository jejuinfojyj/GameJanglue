export class EngineAudio {
  private ctx: AudioContext | null = null;
  private osc: OscillatorNode | null = null;
  private filter: BiquadFilterNode | null = null;
  private gain: GainNode | null = null;
  private noiseGain: GainNode | null = null;
  private fxOsc: OscillatorNode | null = null;
  private fxGain: GainNode | null = null;
  private fxNoiseGain: GainNode | null = null;
  muted = false;
  private unlocked = false;

  unlock() {
    if (this.unlocked) {
      if (this.ctx?.state === "suspended") void this.ctx.resume();
      return;
    }
    const Ctx = window.AudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.value = 50;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 240;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    const noiseGain = ctx.createGain();
    noiseGain.gain.value = 0;
    const buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;
    const band = ctx.createBiquadFilter();
    band.type = "bandpass";
    band.frequency.value = 900;
    noise.connect(band);
    band.connect(noiseGain);
    noiseGain.connect(ctx.destination);

    const fxGain = ctx.createGain();
    fxGain.gain.value = 0;
    const fxOsc = ctx.createOscillator();
    fxOsc.type = "square";
    fxOsc.frequency.value = 220;
    fxOsc.connect(fxGain);
    fxGain.connect(ctx.destination);
    const fxNoiseGain = ctx.createGain();
    fxNoiseGain.gain.value = 0;
    noise.connect(fxNoiseGain);
    fxNoiseGain.connect(ctx.destination);
    noise.start();
    fxOsc.start();
    osc.start();

    this.ctx = ctx;
    this.osc = osc;
    this.filter = filter;
    this.gain = gain;
    this.noiseGain = noiseGain;
    this.fxOsc = fxOsc;
    this.fxGain = fxGain;
    this.fxNoiseGain = fxNoiseGain;
    this.unlocked = true;
  }

  update(speed: number, throttle: number, drifting: boolean, boosting: boolean) {
    if (!this.unlocked || !this.ctx || !this.osc || !this.filter || !this.gain || !this.noiseGain) return;
    const now = this.ctx.currentTime;
    const rate = 48 + speed * 0.16 + (throttle > 0 ? 24 : 0) + (boosting ? 36 : 0);
    this.osc.frequency.setTargetAtTime(rate, now, 0.06);
    this.filter.frequency.setTargetAtTime(160 + speed * 0.42 + (boosting ? 180 : 0), now, 0.08);
    const volume = this.muted
      ? 0
      : Math.min(0.16, 0.05 + Math.min(speed, 900) * 0.00012 + (throttle > 0 ? 0.035 : 0) + (boosting ? 0.025 : 0));
    this.gain.gain.setTargetAtTime(volume, now, 0.05);
    const hiss = this.muted ? 0 : drifting ? 0.07 : 0;
    this.noiseGain.gain.setTargetAtTime(hiss, now, 0.05);
  }

  wall() {
    this.noiseBurst(0.22, 0.12);
    this.tone(70, 0.16, 0.12);
  }

  charge() {
    this.tone(420, 0.16, 0.14, 760);
  }

  boost() {
    this.tone(150, 0.2, 0.28, 560);
    this.noiseBurst(0.1, 0.18);
  }

  private tone(freq: number, peak: number, seconds: number, slideTo?: number) {
    if (!this.unlocked || this.muted || !this.ctx || !this.fxOsc || !this.fxGain) return;
    const now = this.ctx.currentTime;
    this.fxOsc.frequency.cancelScheduledValues(now);
    this.fxOsc.frequency.setValueAtTime(Math.max(40, freq), now);
    if (slideTo) this.fxOsc.frequency.exponentialRampToValueAtTime(Math.max(40, slideTo), now + seconds);
    this.fxGain.gain.cancelScheduledValues(now);
    this.fxGain.gain.setValueAtTime(peak, now);
    this.fxGain.gain.exponentialRampToValueAtTime(0.001, now + seconds);
  }

  private noiseBurst(peak: number, seconds: number) {
    if (!this.unlocked || this.muted || !this.ctx || !this.fxNoiseGain) return;
    const now = this.ctx.currentTime;
    this.fxNoiseGain.gain.cancelScheduledValues(now);
    this.fxNoiseGain.gain.setValueAtTime(peak, now);
    this.fxNoiseGain.gain.exponentialRampToValueAtTime(0.001, now + seconds);
  }
}
