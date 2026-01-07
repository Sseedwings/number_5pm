
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

  // 배경음악 시작 (웅장한 앰비언트 사운드)
  startBGM() {
    if (this.isBgmPlaying) return;
    this.initCtx();
    if (!this.ctx) return;

    this.isBgmPlaying = true;
    this.bgmGain = this.ctx.createGain();
    
    // 배경음악 볼륨을 0.6으로 추가 상향하여 몰입감 극대화
    this.bgmGain.gain.setValueAtTime(0, this.ctx.currentTime);
    this.bgmGain.gain.linearRampToValueAtTime(0.6, this.ctx.currentTime + 4);
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
      lfo.frequency.setValueAtTime(0.15, this.ctx!.currentTime);
      lfoGain.gain.setValueAtTime(4, this.ctx!.currentTime);
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);
      lfo.start();
    };

    // 저음역대 드론 보강 (웅장함 강조)
    createDrone(41.20, 0.12); // E1 (매우 낮은 베이스)
    createDrone(82.41, 0.08, 5); // E2
    createDrone(82.41, 0.08, -5); // E2 (살짝 튜닝을 틀어 코러스 효과)
    createDrone(123.47, 0.05); // B2
    createDrone(164.81, 0.04); // E3

    // 무작위 별빛 소리
    const twinkle = () => {
      if (!this.isBgmPlaying) return;
      const freqs = [880, 1046.50, 1318.51, 1567.98, 1760, 2093];
      const f = freqs[Math.floor(Math.random() * freqs.length)];
      this.createOscillator(f, 'sine', 6, 0.05);
      setTimeout(twinkle, 1200 + Math.random() * 2500);
    };
    twinkle();
  }

  playScan() {
    this.createOscillator(880, 'triangle', 0.2, 0.1); 
    setTimeout(() => this.createOscillator(1760, 'triangle', 0.1, 0.06), 50);
  }

  playSageIntro() {
    [440, 554.37, 659.25].forEach((freq, i) => {
      setTimeout(() => this.createOscillator(freq, 'sine', 1.5, 0.12), i * 150);
    });
  }

  playHighHint() {
    this.createOscillator(660, 'sine', 0.3, 0.15);
    setTimeout(() => this.createOscillator(520, 'sine', 0.2, 0.08), 100);
  }

  playLowHint() {
    this.createOscillator(330, 'sine', 0.3, 0.15);
    setTimeout(() => this.createOscillator(440, 'sine', 0.2, 0.08), 100);
  }

  playVictory() {
    const freqs = [523.25, 659.25, 783.99, 1046.50];
    freqs.forEach((f, i) => {
      setTimeout(() => this.createOscillator(f, 'sine', 2, 0.15), i * 100);
    });
  }

  playGameOver() {
    this.initCtx();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.frequency.setValueAtTime(220, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(55, this.ctx.currentTime + 1.5);
    gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 1.5);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 1.5);
  }

  playReset() {
    this.initCtx();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.frequency.setValueAtTime(110, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(440, this.ctx.currentTime + 0.8);
    gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.8);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.8);
  }
}

export const soundService = new SoundService();
