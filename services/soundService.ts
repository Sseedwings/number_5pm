
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
    
    // 배경음악 볼륨을 0.7로 대폭 상향
    this.bgmGain.gain.setValueAtTime(0, this.ctx.currentTime);
    this.bgmGain.gain.linearRampToValueAtTime(0.7, this.ctx.currentTime + 3);
    this.bgmGain.connect(this.ctx.destination);

    const createDrone = (freq: number, vol: number = 0.05, detune: number = 0) => {
      const osc = this.ctx!.createOscillator();
      const g = this.ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, this.ctx!.currentTime);
      osc.detune.setValueAtTime(detune, this.ctx!.currentTime);
      g.gain.setValueAtTime(vol, this.ctx!.currentTime);
      osc.connect(g);
      g.connect(this.bgmGain!);
      osc.start();
      
      const lfo = this.ctx!.createOscillator();
      const lfoGain = this.ctx!.createGain();
      lfo.frequency.setValueAtTime(0.1, this.ctx!.currentTime);
      lfoGain.gain.setValueAtTime(4, this.ctx!.currentTime);
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);
      lfo.start();
    };

    // 웅장한 저음 레이어
    createDrone(38.89, 0.15); // Eb1
    createDrone(77.78, 0.1, 5); // Eb2
    createDrone(77.78, 0.1, -5); 
    createDrone(116.54, 0.08); // Bb2
    createDrone(155.56, 0.05); // Eb3

    const twinkle = () => {
      if (!this.isBgmPlaying) return;
      const freqs = [932.33, 1108.73, 1396.91, 1567.98, 1864.66];
      const f = freqs[Math.floor(Math.random() * freqs.length)];
      this.createOscillator(f, 'sine', 7, 0.07);
      setTimeout(twinkle, 1000 + Math.random() * 2000);
    };
    twinkle();
  }

  playScan() { this.createOscillator(880, 'triangle', 0.2, 0.12); }
  playReset() { this.createOscillator(440, 'sine', 1.2, 0.2); }
  playHighHint() { this.createOscillator(660, 'sine', 0.5, 0.15); }
  playLowHint() { this.createOscillator(330, 'sine', 0.5, 0.15); }
  playVictory() { [523, 659, 783, 1046].forEach((f, i) => setTimeout(() => this.createOscillator(f, 'sine', 2, 0.2), i * 120)); }
  playGameOver() { 
    this.initCtx();
    const osc = this.ctx!.createOscillator();
    const g = this.ctx!.createGain();
    osc.frequency.setValueAtTime(200, this.ctx!.currentTime);
    osc.frequency.linearRampToValueAtTime(40, this.ctx!.currentTime + 2);
    g.gain.setValueAtTime(0.3, this.ctx!.currentTime);
    g.gain.linearRampToValueAtTime(0, this.ctx!.currentTime + 2);
    osc.connect(g);
    g.connect(this.ctx!.destination);
    osc.start();
    osc.stop(this.ctx!.currentTime + 2);
  }
}

export const soundService = new SoundService();
