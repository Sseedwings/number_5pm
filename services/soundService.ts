
class SoundService {
  private ctx: AudioContext | null = null;
  private bgmGain: GainNode | null = null;
  private isBgmPlaying: boolean = false;

  private initCtx() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  private createOscillator(freq: number, type: OscillatorType = 'sine', duration: number = 0.5, volume: number = 0.1) {
    this.initCtx();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

    gain.gain.setValueAtTime(volume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  startBGM() {
    if (this.isBgmPlaying) return;
    this.initCtx();
    if (!this.ctx) return;

    this.isBgmPlaying = true;
    this.bgmGain = this.ctx.createGain();
    
    // BGM을 웅장하게 키우되 보이스와 겹치지 않도록 조절
    this.bgmGain.gain.setValueAtTime(0, this.ctx.currentTime);
    this.bgmGain.gain.linearRampToValueAtTime(0.6, this.ctx.currentTime + 3);
    this.bgmGain.connect(this.ctx.destination);

    const createDrone = (freq: number, vol: number = 0.05, detune: number = 0) => {
      if (!this.ctx || !this.bgmGain) return;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      osc.detune.setValueAtTime(detune, this.ctx.currentTime);
      g.gain.setValueAtTime(vol, this.ctx.currentTime);
      osc.connect(g);
      g.connect(this.bgmGain);
      osc.start();
      
      const lfo = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();
      lfo.frequency.setValueAtTime(0.05, this.ctx.currentTime);
      lfoGain.gain.setValueAtTime(5, this.ctx.currentTime);
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);
      lfo.start();
    };

    // Deep Cosmic Atmosphere
    createDrone(32.70, 0.2); // C1
    createDrone(65.41, 0.15, 8); // C2
    createDrone(98.00, 0.1); // G2
    createDrone(130.81, 0.08); // C3

    const twinkle = () => {
      if (!this.isBgmPlaying) return;
      const freqs = [1046.50, 1318.51, 1567.98, 1975.53, 2349.32]; // C6, E6, G6, B6, D7
      const f = freqs[Math.floor(Math.random() * freqs.length)];
      this.createOscillator(f, 'sine', 10, 0.04);
      setTimeout(twinkle, 2000 + Math.random() * 4000);
    };
    twinkle();
  }

  playScan() { this.createOscillator(987.77, 'triangle', 0.15, 0.1); } // B5
  playReset() { this.createOscillator(392.00, 'sine', 1.5, 0.15); } // G4
  playHighHint() { this.createOscillator(880.00, 'sine', 0.4, 0.1); } // A5
  playLowHint() { this.createOscillator(220.00, 'sine', 0.4, 0.15); } // A3
  playVictory() { [523.25, 659.25, 783.99, 1046.50].forEach((f, i) => setTimeout(() => this.createOscillator(f, 'sine', 2.5, 0.2), i * 150)); }
  playGameOver() { 
    this.initCtx();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.frequency.setValueAtTime(150, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(30, this.ctx.currentTime + 2.5);
    g.gain.setValueAtTime(0.25, this.ctx.currentTime);
    g.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 2.5);
    osc.connect(g);
    g.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 2.5);
  }
}

export const soundService = new SoundService();
