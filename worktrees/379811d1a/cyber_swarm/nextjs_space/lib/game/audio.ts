// Procedural audio via Web Audio API
export class GameAudio {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private muted = false;

  init() {
    try {
      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.3;
      this.masterGain.connect(this.ctx.destination);
    } catch (_e) {
      // Web Audio not supported
    }
  }

  resume() {
    if (this.ctx?.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.masterGain) {
      this.masterGain.gain.value = this.muted ? 0 : 0.3;
    }
    return this.muted;
  }

  isMuted() { return this.muted; }

  private playTone(freq: number, duration: number, type: OscillatorType = 'square', volume = 0.15) {
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    gain.gain.setValueAtTime(volume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(this.ctx.currentTime);
    osc.stop(this.ctx.currentTime + duration);
  }

  private playNoise(duration: number, volume = 0.1) {
    if (!this.ctx || !this.masterGain) return;
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
    source.connect(gain);
    gain.connect(this.masterGain);
    source.start();
  }

  shoot() {
    this.playTone(800, 0.08, 'square', 0.06);
  }

  hit() {
    this.playTone(200, 0.1, 'sawtooth', 0.08);
  }

  explosion() {
    this.playNoise(0.2, 0.12);
    this.playTone(100, 0.15, 'sawtooth', 0.1);
  }

  levelUp() {
    this.playTone(523, 0.1, 'square', 0.12);
    setTimeout(() => this.playTone(659, 0.1, 'square', 0.12), 80);
    setTimeout(() => this.playTone(784, 0.15, 'square', 0.12), 160);
  }

  playerHit() {
    this.playTone(150, 0.2, 'sawtooth', 0.15);
    this.playNoise(0.1, 0.08);
  }

  select() {
    this.playTone(600, 0.06, 'square', 0.08);
  }

  empPulse() {
    this.playTone(300, 0.3, 'sine', 0.1);
    this.playTone(100, 0.4, 'sine', 0.08);
  }

  bossSpawn() {
    this.playTone(80, 0.5, 'sawtooth', 0.2);
    setTimeout(() => this.playTone(60, 0.5, 'sawtooth', 0.2), 300);
  }

  victory() {
    const notes = [523, 659, 784, 1047];
    notes.forEach((n: number, i: number) => {
      setTimeout(() => this.playTone(n, 0.2, 'square', 0.12), i * 150);
    });
  }

  gameOver() {
    this.playTone(300, 0.3, 'sawtooth', 0.15);
    setTimeout(() => this.playTone(200, 0.4, 'sawtooth', 0.15), 200);
    setTimeout(() => this.playTone(100, 0.6, 'sawtooth', 0.12), 400);
  }
}
