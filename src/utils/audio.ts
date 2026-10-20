/**
 * Web Audio API high-fidelity procedural audio engine for Vila Ancestral.
 * Includes studio dynamics compressor, harmonic overtones, organic acoustic resonance,
 * and seamless procedural ambient soundscapes for morning, afternoon, and night.
 */

export type AmbientPeriod = 'morning' | 'afternoon' | 'night';

class SoundManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private ambientGain: GainNode | null = null;

  private currentPeriod: AmbientPeriod | null = null;
  private ambientRunning: boolean = false;
  private ambientTimerId: number | null = null;

  // Individual period gains for smooth crossfades
  private morningGain: GainNode | null = null;
  private afternoonGain: GainNode | null = null;
  private nightGain: GainNode | null = null;

  // Ambient sound source nodes
  private breezeSource: AudioNode | null = null;

  private enabled: boolean = true;
  private currentHour: number = 8.0;

  constructor() {
    // Initialized upon first user interaction
  }

  private initCtx() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.setupAudioGraph();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    if (this.enabled && !this.ambientRunning) {
      this.startAmbient();
    }
  }

  private setupAudioGraph() {
    if (!this.ctx) return;

    // Master Dynamics Compressor for studio polish (smooth peaks, no clipping)
    this.compressor = this.ctx.createDynamicsCompressor();
    this.compressor.threshold.setValueAtTime(-16, this.ctx.currentTime);
    this.compressor.knee.setValueAtTime(12, this.ctx.currentTime);
    this.compressor.ratio.setValueAtTime(4, this.ctx.currentTime);
    this.compressor.attack.setValueAtTime(0.003, this.ctx.currentTime);
    this.compressor.release.setValueAtTime(0.25, this.ctx.currentTime);

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(this.enabled ? 1.0 : 0.0, this.ctx.currentTime);

    this.ambientGain = this.ctx.createGain();
    this.ambientGain.gain.setValueAtTime(this.enabled ? 0.05 : 0.0, this.ctx.currentTime);

    // Sub-gains for morning, afternoon, night
    this.morningGain = this.ctx.createGain();
    this.afternoonGain = this.ctx.createGain();
    this.nightGain = this.ctx.createGain();

    this.morningGain.gain.setValueAtTime(0.0, this.ctx.currentTime);
    this.afternoonGain.gain.setValueAtTime(0.0, this.ctx.currentTime);
    this.nightGain.gain.setValueAtTime(0.0, this.ctx.currentTime);

    this.morningGain.connect(this.ambientGain);
    this.afternoonGain.connect(this.ambientGain);
    this.nightGain.connect(this.ambientGain);

    // Master Warmth Lowpass Filter: completely prevents any high screech or grunt
    const warmthFilter = this.ctx.createBiquadFilter();
    warmthFilter.type = 'lowpass';
    warmthFilter.frequency.setValueAtTime(1000, this.ctx.currentTime);
    warmthFilter.Q.setValueAtTime(0.7, this.ctx.currentTime);

    this.ambientGain.connect(warmthFilter);
    warmthFilter.connect(this.masterGain);
    this.masterGain.connect(this.compressor);
    this.compressor.connect(this.ctx.destination);
  }

  public unlockAudio() {
    this.initCtx();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public setEnabled(val: boolean) {
    this.enabled = val;
    if (this.ctx && this.masterGain && this.ambientGain) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.linearRampToValueAtTime(val ? 1.0 : 0.0, now + 0.15);
      this.ambientGain.gain.linearRampToValueAtTime(val ? 0.28 : 0.0, now + 0.15);
    }
    if (val) {
      this.initCtx();
    }
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Updates current time of day and crossfades ambient soundscape smoothly.
   * Manhã: 5h às 12h (Passarinhos cantando, brisa fresca da aurora)
   * Tarde: 12h às 18h (Cigarras vibrando sob o sol, brisa quente da estepe)
   * Noite: 18h às 5h (Grilos relaxantes, fogueira crepitante, coruja distante)
   */
  public setAmbientHour(hour: number) {
    this.currentHour = hour;
    let targetPeriod: AmbientPeriod = 'morning';

    if (hour >= 5.0 && hour < 12.0) {
      targetPeriod = 'morning';
    } else if (hour >= 12.0 && hour < 18.0) {
      targetPeriod = 'afternoon';
    } else {
      targetPeriod = 'night';
    }

    if (this.currentPeriod !== targetPeriod) {
      this.currentPeriod = targetPeriod;
      this.transitionAmbient(targetPeriod);
    }
  }

  private transitionAmbient(period: AmbientPeriod) {
    if (!this.ctx || !this.morningGain || !this.afternoonGain || !this.nightGain) return;
    const now = this.ctx.currentTime;
    const fadeDuration = 2.0;

    this.morningGain.gain.linearRampToValueAtTime(period === 'morning' ? 1.0 : 0.0, now + fadeDuration);
    this.afternoonGain.gain.linearRampToValueAtTime(period === 'afternoon' ? 1.0 : 0.0, now + fadeDuration);
    this.nightGain.gain.linearRampToValueAtTime(period === 'night' ? 1.0 : 0.0, now + fadeDuration);
  }

  private startAmbient() {
    if (!this.ctx || this.ambientRunning) return;
    this.ambientRunning = true;

    // 1. Soft, soothing organic prairie breeze (warm low-pass pink noise, never sharp)
    this.createBreezeAmbiance();

    // 2. Periodic gentle organic nature tones (warm wooden flute, gentle rustle, peaceful night breeze)
    this.ambientTimerId = window.setInterval(() => {
      if (!this.enabled || !this.ctx || this.ctx.state !== 'running') return;

      if (this.currentPeriod === 'morning') {
        if (Math.random() > 0.45) {
          this.triggerMorningFluteTone();
        }
      } else if (this.currentPeriod === 'afternoon') {
        if (Math.random() > 0.5) {
          this.triggerAfternoonWindRustle();
        }
      } else if (this.currentPeriod === 'night') {
        if (Math.random() > 0.6) {
          this.triggerDistantOwl();
        }
      }
    }, 3800);

    // Initial transition to ensure current hour soundscape starts smoothly
    this.setAmbientHour(this.currentHour);
    if (this.currentPeriod) {
      this.transitionAmbient(this.currentPeriod);
    }
  }

  private createBreezeAmbiance() {
    if (!this.ctx || !this.morningGain || !this.afternoonGain || !this.nightGain) return;

    // Create 4-second looping pink noise buffer with smooth loop crossfade
    const bufferSize = this.ctx.sampleRate * 4;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = buffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;

    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.025;
      b6 = white * 0.115926;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = buffer;
    whiteNoise.loop = true;

    // Deep, soothing warm low-pass filter (strictly removes any high pitch or hiss)
    const breezeFilter = this.ctx.createBiquadFilter();
    breezeFilter.type = 'lowpass';
    breezeFilter.frequency.setValueAtTime(320, this.ctx.currentTime);
    breezeFilter.Q.setValueAtTime(0.7, this.ctx.currentTime);

    const breezeGain = this.ctx.createGain();
    breezeGain.gain.setValueAtTime(0.04, this.ctx.currentTime);

    whiteNoise.connect(breezeFilter);
    breezeFilter.connect(breezeGain);
    breezeGain.connect(this.morningGain);
    breezeGain.connect(this.afternoonGain);
    breezeGain.connect(this.nightGain);

    whiteNoise.start();
    this.breezeSource = whiteNoise;
  }

  // Soft, serene wooden flute / wind chime for peaceful morning (500Hz - 660Hz warm sine)
  private triggerMorningFluteTone() {
    if (!this.ctx || !this.morningGain || !this.enabled) return;
    const now = this.ctx.currentTime;
    const notes = [523.25, 587.33, 659.25]; // C5, D5, E5 (warm middle register)
    const chosen = notes[Math.floor(Math.random() * notes.length)];

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(chosen, now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.012, now + 0.15);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);

    osc.connect(gain);
    gain.connect(this.morningGain);

    osc.start(now);
    osc.stop(now + 1.3);
  }

  // Soft afternoon prairie grass rustle (deep low-pass filtered warmth, NO cicadas or grating noise)
  private triggerAfternoonWindRustle() {
    if (!this.ctx || !this.afternoonGain || !this.enabled) return;
    const now = this.ctx.currentTime;
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.9);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(280, now);
    filter.frequency.linearRampToValueAtTime(220, now + 0.9);
    filter.Q.setValueAtTime(0.5, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.015, now + 0.35);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.9);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.afternoonGain);

    noise.start(now);
  }

  // Very gentle, soothing low owl call at night (280Hz - 320Hz warm mellow tone)
  private triggerDistantOwl() {
    if (!this.ctx || !this.nightGain || !this.enabled) return;
    const now = this.ctx.currentTime;
    [
      { delay: 0.0, freq: 300, dur: 0.35 },
      { delay: 0.5, freq: 280, dur: 0.45 },
    ].forEach(({ delay, freq, dur }) => {
      if (!this.ctx || !this.nightGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const startTime = now + delay;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);
      osc.frequency.exponentialRampToValueAtTime(freq - 25, startTime + dur);

      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.linearRampToValueAtTime(0.01, startTime + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + dur);

      osc.connect(gain);
      gain.connect(this.nightGain);

      osc.start(startTime);
      osc.stop(startTime + dur + 0.05);
    });
  }

  // ==========================================
  // HIGH QUALITY SOUND EFFECTS (ENHANCED AUDIO)
  // ==========================================

  public playTurn() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx || !this.masterGain) return;

    // Rich pentatonic flute & chime chord: D4, F#4, A4, D5 with octave harmonics
    const now = this.ctx.currentTime;
    const notes = [293.66, 369.99, 440.0, 587.33];

    notes.forEach((freq, idx) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const overtone = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const overtoneGain = this.ctx.createGain();

      const startTime = now + idx * 0.055;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      overtone.type = 'triangle';
      overtone.frequency.setValueAtTime(freq * 2, startTime);

      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.linearRampToValueAtTime(0.14 / (idx + 1), startTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.7);

      overtoneGain.gain.setValueAtTime(0.001, startTime);
      overtoneGain.gain.linearRampToValueAtTime(0.04 / (idx + 1), startTime + 0.04);
      overtoneGain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.5);

      osc.connect(gain);
      overtone.connect(overtoneGain);
      gain.connect(this.masterGain);
      overtoneGain.connect(this.masterGain);

      osc.start(startTime);
      overtone.start(startTime);
      osc.stop(startTime + 0.75);
      overtone.stop(startTime + 0.75);
    });
  }

  public playHarvest() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx || !this.masterGain) return;

    // Organic wheat sickle swish & grain rustle
    const now = this.ctx.currentTime;
    const bufferSize = this.ctx.sampleRate * 0.18;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1400, now);
    filter.frequency.exponentialRampToValueAtTime(450, now + 0.18);
    filter.Q.value = 2.5;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(now);

    // Sparkling harvest chimes (pentatonic celebration)
    [659.25, 783.99, 987.77, 1318.51].forEach((freq, i) => {
      if (!this.ctx || !this.masterGain) return;
      const chimeOsc = this.ctx.createOscillator();
      const chimeGain = this.ctx.createGain();
      const t = now + 0.04 + i * 0.06;

      chimeOsc.type = 'sine';
      chimeOsc.frequency.setValueAtTime(freq, t);

      chimeGain.gain.setValueAtTime(0.001, t);
      chimeGain.gain.linearRampToValueAtTime(0.09 / (i + 1), t + 0.02);
      chimeGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);

      chimeOsc.connect(chimeGain);
      chimeGain.connect(this.masterGain);

      chimeOsc.start(t);
      chimeOsc.stop(t + 0.5);
    });
  }

  public playWood() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx || !this.masterGain) return;

    // Resonant wooden marimba / woodblock impact
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const overtone = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(280, now);
    osc.frequency.exponentialRampToValueAtTime(75, now + 0.11);

    overtone.type = 'triangle';
    overtone.frequency.setValueAtTime(560, now);
    overtone.frequency.exponentialRampToValueAtTime(150, now + 0.08);

    gain.gain.setValueAtTime(0.24, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);

    osc.connect(gain);
    overtone.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    overtone.start(now);
    osc.stop(now + 0.12);
    overtone.stop(now + 0.12);
  }

  public playStone() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx || !this.masterGain) return;

    // Warm, mellow acoustic stone tap (smooth low-mid resonance)
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const overtone = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(420, now);
    osc.frequency.exponentialRampToValueAtTime(180, now + 0.08);

    overtone.type = 'sine';
    overtone.frequency.setValueAtTime(840, now);
    overtone.frequency.exponentialRampToValueAtTime(360, now + 0.05);

    gain.gain.setValueAtTime(0.16, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    overtone.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    overtone.start(now);
    osc.stop(now + 0.09);
    overtone.stop(now + 0.09);
  }

  public playBuild() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx || !this.masterGain) return;

    // Double rhythmic construction tap
    const now = this.ctx.currentTime;
    [0, 0.09, 0.18].forEach((offset, idx) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(idx % 2 === 0 ? 540 : 410, now + offset);

      gain.gain.setValueAtTime(0.19, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.07);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now + offset);
      osc.stop(now + offset + 0.08);
    });
  }

  public playTech() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx || !this.masterGain) return;

    // Harmonic ancient discovery arpeggio with reverb-like bloom
    const now = this.ctx.currentTime;
    const freqs = [329.63, 440.0, 554.37, 659.25, 880.0]; // E4, A4, C#5, E5, A5

    freqs.forEach((f, i) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const overtone = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const startTime = now + i * 0.065;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, startTime);

      overtone.type = 'triangle';
      overtone.frequency.setValueAtTime(f * 2, startTime);

      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.linearRampToValueAtTime(0.16, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.55);

      osc.connect(gain);
      overtone.connect(gain);
      gain.connect(this.masterGain);

      osc.start(startTime);
      overtone.start(startTime);
      osc.stop(startTime + 0.6);
      overtone.stop(startTime + 0.6);
    });
  }

  public playRecruit() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx || !this.masterGain) return;

    // Cheerful welcoming rising horn chime
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const overtone = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(700, now + 0.16);

    overtone.type = 'sine';
    overtone.frequency.setValueAtTime(880, now);
    overtone.frequency.exponentialRampToValueAtTime(1400, now + 0.16);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

    osc.connect(gain);
    overtone.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    overtone.start(now);
    osc.stop(now + 0.29);
    overtone.stop(now + 0.29);
  }

  public playAlert() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx || !this.masterGain) return;

    // Gentle, warm wooden caution cue (soft triangle, no harsh buzz)
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(330, now);
    osc.frequency.exponentialRampToValueAtTime(220, now + 0.16);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.2);
  }

  public playFanfare() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx || !this.masterGain) return;

    // Grand triumph celebratory fanfare (A4, C#5, E5, A5)
    const now = this.ctx.currentTime;
    const notes = [440, 554.37, 659.25, 880];

    notes.forEach((freq, idx) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const startTime = now + idx * 0.08;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.01, startTime);
      gain.gain.linearRampToValueAtTime(0.18, startTime + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.5);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(startTime);
      osc.stop(startTime + 0.55);
    });
  }
}

export const audio = new SoundManager();
