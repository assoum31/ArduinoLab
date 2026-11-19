// Procedural Web Audio API sound effects & Piezo Buzzer synthesizer

class SoundEngine {
  private ctx: AudioContext | null = null;
  private enabled = true;
  private buzzerOsc: OscillatorNode | null = null;
  private buzzerGain: GainNode | null = null;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  setEnabled(val: boolean) {
    this.enabled = val;
    if (!val) {
      this.stopBuzzer();
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  playSelect() {
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(760, now + 0.06);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.08);
  }

  playWireSnap() {
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(340, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.05);
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.065);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.07);
  }

  playSuccess() {
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
      const now = ctx.currentTime + idx * 0.085;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0.11, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.25);
    });
  }

  playError() {
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(190, now);
    osc.frequency.linearRampToValueAtTime(135, now + 0.22);
    gain.gain.setValueAtTime(0.09, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.25);
  }

  playBuzzerTone(frequency: number, durationMs?: number) {
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;
    const safeFreq = Math.max(80, Math.min(4000, frequency));

    if (durationMs && durationMs > 0) {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(safeFreq, now);
      gain.gain.setValueAtTime(0.045, now);
      gain.gain.exponentialRampToValueAtTime(
        0.001,
        now + Math.min(durationMs / 1000, 1.5),
      );
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + Math.min(durationMs / 1000, 1.5) + 0.02);
      return;
    }

    // Continuous tone until stopBuzzer()
    this.stopBuzzer();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(safeFreq, ctx.currentTime);
    gain.gain.setValueAtTime(0.04, ctx.currentTime);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    this.buzzerOsc = osc;
    this.buzzerGain = gain;
  }

  stopBuzzer() {
    if (this.buzzerOsc) {
      try {
        this.buzzerOsc.stop();
        this.buzzerOsc.disconnect();
      } catch {
        // ignore if already stopped
      }
      this.buzzerOsc = null;
    }
    if (this.buzzerGain) {
      try {
        this.buzzerGain.disconnect();
      } catch {
        // ignore
      }
      this.buzzerGain = null;
    }
  }
}

export const soundEngine = new SoundEngine();
