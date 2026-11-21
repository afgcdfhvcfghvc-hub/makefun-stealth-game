// Synthesized sound for Nightshift: The Meridian Vault.
// Every sound is built from WebAudio oscillators and filtered noise at
// run time. No audio files are shipped, and nothing is fetched.

export class SoundEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this._stepPhase = 0;
  }

  /** Create the context on a user gesture; browsers block audio before one. */
  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.5;
    this.master.connect(this.ctx.destination);
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.master) this.master.gain.value = muted ? 0 : 0.5;
  }

  _tone(freq, dur, type, vol, slideTo = null, delay = 0) {
    if (!this.ctx || !this.master) return;
    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo !== null) osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t0 + dur);
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(vol, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  _noise(dur, vol, lowFreq, delay = 0) {
    if (!this.ctx || !this.master) return;
    const t0 = this.ctx.currentTime + delay;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = lowFreq;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    src.start(t0);
  }

  /** A soft footstep; alternate feet so a walk sounds like walking. */
  footstep(running) {
    this._stepPhase = 1 - this._stepPhase;
    this._noise(0.07, running ? 0.16 : 0.09, this._stepPhase ? 900 : 700);
  }

  pickup() {
    this._tone(880, 0.1, 'sine', 0.22);
    this._tone(1318, 0.14, 'sine', 0.18, null, 0.07);
  }

  unlock() {
    this._tone(523, 0.12, 'triangle', 0.2);
    this._tone(659, 0.12, 'triangle', 0.2, null, 0.1);
    this._tone(784, 0.22, 'triangle', 0.22, null, 0.2);
  }

  /** The sharp two-note sting when a guard fully spots the player. */
  alert() {
    this._tone(196, 0.16, 'sawtooth', 0.16, 147);
    this._tone(147, 0.3, 'sawtooth', 0.18, 98, 0.12);
    this._noise(0.25, 0.1, 1200, 0.02);
  }

  /** A short suspicious blip when a guard starts staring. */
  suspicious() {
    this._tone(660, 0.09, 'square', 0.07, 520);
  }

  caught() {
    this._tone(311, 0.35, 'sawtooth', 0.2, 155);
    this._tone(233, 0.5, 'sawtooth', 0.2, 116, 0.18);
    this._noise(0.4, 0.14, 800, 0.05);
  }

  levelWin() {
    [523, 659, 784, 1046].forEach((f, i) => this._tone(f, 0.18, 'triangle', 0.2, null, i * 0.11));
  }

  campaignWin() {
    [523, 659, 784, 1046, 784, 1046, 1318].forEach((f, i) => this._tone(f, 0.22, 'triangle', 0.2, null, i * 0.13));
  }

  click() {
    this._tone(1200, 0.05, 'sine', 0.12);
  }
}
