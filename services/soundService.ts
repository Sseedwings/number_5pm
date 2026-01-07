
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

  // 배경음악 시작 (Generative Ambient Nebula Drone)
  startBGM() {
    if (this.isBgmPlaying) return;
    this.initCtx();
    if (!this.ctx) return;

    this.isBgmPlaying = true;
    this.bgmGain = this.ctx.createGain();
    
    // 배경음악 전체 볼륨을 0.4로 증폭 (상당히 큰 소리)
    this.bgmGain.gain.setValueAtTime(0, this.ctx.currentTime);
    this.bgmGain.gain.linearRampToValueAtTime(0.4, this.ctx.currentTime + 3);
    this.bgmGain.connect(this.ctx.destination);

    const createDrone = (freq: number, vol: number = 0.05) => {
      const osc = this.ctx!.createOscillator();
      const g = this.ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, this.ctx!.currentTime);
      g.gain.setValueAtTime(vol, this.ctx!.currentTime);
      osc.connect(g);
      g.connect(this.bgmGain!);
      osc.start();
      
      // 깊고 느린 파동 효과
      const lfo = this.ctx!.createOscillator();
      const lfoGain = this.ctx!.createGain();
      lfo.frequency.setValueAtTime(0.2, this.ctx!.currentTime);
      lfoGain.gain.setValueAtTime(5, this.ctx!.currentTime);
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);
      lfo.start();
    };

    // 더 묵직하고 웅장한 화음 구성
    createDrone(55, 0.08);   // Low A (강화)
    createDrone(82.41, 0.06); // E2 (강화)
    createDrone(110, 0.05);  // A2
    createDrone(164.81, 0.03); // E3

    // 무작위 별빛 소리 (Twinkle) - 볼륨 상향
    const twinkle = () => {
      if (!this.isBgmPlaying) return;
      const freqs = [880, 1046.50, 1318.51, 1567.98, 1760];
      const f = freqs[Math.floor(Math.random() * freqs.length)];
      this.createOscillator(f, 'sine', 5, 0.04);
      setTimeout(twinkle, 1500 + Math.random() * 3000);
    };
    twinkle();
  }

  playScan() {
    this.createOscillator(880, 'triangle', 0.2, 0.08); // 스캔음 볼륨 상향
    setTimeout(() => this.createOscillator(1760, 'triangle', 0.1, 0.05), 50);
  }

  playSageIntro() {
    [440, 554.37, 659.25].forEach((freq, i) => {
      setTimeout(() => this.createOscillator(freq, 'sine', 1.5, 0.08), i * 150);
    });
  }

  playHighHint() {
    this.createOscillator(660, 'sine', 0.3, 0.1);
    setTimeout(() => this.createOscillator(520, 'sine', 0.2, 0.05), 100);
  }

  playLowHint() {
    this.createOscillator(330, 'sine', 0.3, 0.1);
    setTimeout(() => this.createOscillator(440, 'sine', 0.2, 0.05), 100);
  }

  playVictory() {
    const freqs = [523.25, 659.25, 783.99, 1046.50];
    freqs.forEach((f, i) => {
      setTimeout(() => this.createOscillator(f, 'sine', 2, 0.1), i * 100);
    });
  }

  playGameOver() {
    this.initCtx();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.frequency.setValueAtTime(220, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(55, this.ctx.currentTime + 1.5);
    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
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
    gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.8);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.8);
  }
}

export const soundService = new SoundService();
