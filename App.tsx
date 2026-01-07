import React, { useState, useEffect, useRef } from 'react';
import { GameState, GuessRecord } from './types';
import { getSageFeedback, speakSageMessage } from './services/geminiService';
import { soundService } from './services/soundService';
import GuessChart from './components/GuessChart';

const MAX_ATTEMPTS = 10;
// 배포가 정상적으로 반영되었는지 확인하기 위해 버전을 v16.0.0으로 업데이트합니다.
const APP_VERSION = "v16.0.0-PRO-ROBUST"; 

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>({
    target: Math.floor(Math.random() * 100) + 1,
    guesses: [],
    status: 'playing',
    maxAttempts: MAX_ATTEMPTS,
    message: "성운의 현자가 그대를 기다리고 있소. 숫자를 입력하여 공명을 시도하시오.",
  });
  
  const [currentInput, setCurrentInput] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isBgmStarted, setIsBgmStarted] = useState<boolean>(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
  }, [gameState.guesses]);

  // 브라우저 정책상 첫 상호작용 시 오디오 및 API 연동 시작
  const ensureAudio = async () => {
    if (!isBgmStarted) {
      soundService.startBGM();
      setIsBgmStarted(true);
      // 첫 인사 실행 (Vercel 환경 변수 process.env.API_KEY 자동 사용)
      try {
        const feedback = await getSageFeedback(0, gameState.target, 0, []);
        setGameState(prev => ({ ...prev, message: feedback.text }));
        speakSageMessage(feedback.text);
      } catch (e) { 
        console.error("Sage connection error:", e); 
      }
    }
  };

  const startNewGame = () => {
    soundService.playReset();
    setGameState({
      target: Math.floor(Math.random() * 100) + 1,
      guesses: [],
      status: 'playing',
      maxAttempts: MAX_ATTEMPTS,
      message: "새로운 운명의 숫자가 배정되었소. 탐색을 시작하시오.",
    });
    setCurrentInput('');
  };

  const handleGuess = async (e: React.FormEvent) => {
    e.preventDefault();
    await ensureAudio();

    const guessVal = parseInt(currentInput);
    if (isNaN(guessVal) || guessVal < 1 || guessVal > 100) return;
    if (gameState.status !== 'playing' || isProcessing) return;

    setIsProcessing(true);
    soundService.playScan();

    const distance = Math.abs(guessVal - gameState.target);
    const direction = guessVal === gameState.target ? 'correct' : (guessVal > gameState.target ? 'high' : 'low');
    
    const newRecord: GuessRecord = {
      value: guessVal,
      timestamp: Date.now(),
      distance,
      direction,
    };

    const updatedGuesses = [...gameState.guesses, newRecord];
    const hasWon = direction === 'correct';
    const hasLost = !hasWon && updatedGuesses.length >= gameState.maxAttempts;
    const newStatus = hasWon ? 'won' : (hasLost ? 'lost' : 'playing');

    // 피드백 요청
    const feedback = await getSageFeedback(
      guessVal, 
      gameState.target, 
      updatedGuesses.length,
      updatedGuesses.map(g => g.value)
    );

    setGameState(prev => ({
      ...prev,
      guesses: updatedGuesses,
      status: newStatus,
      message: feedback.text,
    }));

    setCurrentInput('');
    setIsProcessing(false);

    if (newStatus === 'won') soundService.playVictory();
    else if (newStatus === 'lost') soundService.playGameOver();
    else {
      if (direction === 'high') soundService.playHighHint();
      else soundService.playLowHint();
    }

    // TTS 음성 출력 (내부적으로 Quota 에러 발생 시 무시됨)
    speakSageMessage(feedback.text);
  };

  const lastGuess = gameState.guesses[gameState.guesses.length - 1];
  const feedbackStyles = !lastGuess ? { border: 'border-white/5', text: 'text-slate-200', glow: '' } : 
    lastGuess.direction === 'high' ? { border: 'border-orange-500/50 shadow-[0_0_20px_rgba(249,115,22,0.2)]', text: 'text-orange-400', glow: 'bg-orange-500/10' } :
    lastGuess.direction === 'low' ? { border: 'border-cyan-500/50 shadow-[0_0_20px_rgba(6,182,212,0.2)]', text: 'text-cyan-400', glow: 'bg-cyan-500/10' } :
    { border: 'border-green-500/50 shadow-[0_0_20px_rgba(34,197,94,0.2)]', text: 'text-green-400', glow: 'bg-green-500/10' };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 selection:bg-cyan-500/30 font-inter text-slate-200" onClick={ensureAudio}>
      <div className="w-full max-w-2xl relative z-10">
        
        <header className="text-center mb-10">
          <h1 className="text-5xl md:text-7xl font-orbitron font-bold text-transparent bg-clip-text bg-gradient-to-b from-white via-cyan-400 to-indigo-600 mb-2 drop-shadow-[0_0_15px_rgba(6,182,212,0.4)] tracking-tighter">
            NEBULA SAGE
          </h1>
          <div className="flex items-center justify-center gap-4 opacity-40">
            <div className="h-[1px] bg-cyan-500/50 flex-1 max-w-[60px]"></div>
            <p className="text-cyan-400 uppercase tracking-[0.7em] text-[10px] font-black">Quantum Resonance System</p>
            <div className="h-[1px] bg-cyan-500/50 flex-1 max-w-[60px]"></div>
          </div>
        </header>

        <main className="glass-panel rounded-[40px] p-8 md:p-12 shadow-[0_0_100px_rgba(0,0,0,0.8)] relative overflow-hidden border border-white/10 animate-fade-in">
          <div className="flex justify-between items-center mb-10 px-2">
            <div className="flex flex-col gap-3">
              <span className="text-[10px] text-slate-500 font-black uppercase tracking-[0.4em]">Energy Nodes</span>
              <div className="flex gap-2">
                {Array.from({ length: MAX_ATTEMPTS }).map((_, i) => (
                  <div key={i} className={`h-2 w-7 rounded-full transition-all duration-1000 ${i < (MAX_ATTEMPTS - gameState.guesses.length) ? 'bg-gradient-to-r from-cyan-600 to-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.3)]' : 'bg-slate-900 border border-white/5'}`} />
                ))}
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-500 font-black uppercase tracking-[0.4em]">Capacity</span>
              <p className="text-4xl font-orbitron font-bold text-white leading-none mt-2 drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">{MAX_ATTEMPTS - gameState.guesses.length}</p>
            </div>
          </div>

          <div className={`relative flex flex-col md:flex-row gap-6 items-center mb-10 p-8 rounded-[35px] border transition-all duration-1000 ${feedbackStyles.border} ${feedbackStyles.glow || 'bg-slate-900/50 backdrop-blur-3xl'}`}>
            <div className="relative flex-shrink-0">
              <div className={`w-20 h-20 rounded-full bg-slate-950 flex items-center justify-center border border-white/10 shadow-inner ${isProcessing ? 'animate-spin-slow' : 'animate-pulse'}`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-cyan-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </div>
            </div>
            <div className="flex-1 text-center md:text-left overflow-hidden">
              <div className="mb-2 text-[9px] text-cyan-500/40 font-black tracking-[0.4em] uppercase">Sage Signal</div>
              <p className={`text-sm md:text-base leading-relaxed font-medium italic font-noto transition-colors duration-500 ${feedbackStyles.text}`}>
                "{gameState.message}"
              </p>
            </div>
          </div>

          {gameState.status === 'playing' ? (
            <form onSubmit={handleGuess} className="flex flex-col md:flex-row gap-5 mb-4">
              <div className="relative flex-1 group">
                <input
                  type="number"
                  min="1"
                  max="100"
                  autoFocus
                  value={currentInput}
                  onChange={(e) => setCurrentInput(e.target.value)}
                  placeholder="추측할 주파수 입력 (1-100)..."
                  disabled={isProcessing}
                  className="w-full bg-black/40 border border-white/10 rounded-[20px] px-8 py-6 text-3xl font-orbitron text-white focus:outline-none focus:border-cyan-500/60 transition-all placeholder:text-slate-800 placeholder:text-lg"
                />
                <div className="absolute right-8 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-800 tracking-widest group-focus-within:text-cyan-500/40 transition-colors">FREQ</div>
              </div>
              <button
                type="submit"
                disabled={isProcessing || !currentInput}
                className="bg-white text-black font-black px-12 py-6 rounded-[20px] shadow-2xl hover:bg-cyan-400 hover:-translate-y-1 transition-all active:scale-95 disabled:opacity-10 text-xl font-orbitron"
              >
                {isProcessing ? 'SCAN' : 'EMIT'}
              </button>
            </form>
          ) : (
            <div className="text-center p-12 bg-black/40 rounded-[40px] border border-white/10 animate-scale-in">
              <h2 className={`text-5xl font-orbitron font-black mb-6 tracking-tighter ${gameState.status === 'won' ? 'text-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.4)]' : 'text-rose-500'}`}>
                {gameState.status === 'won' ? 'STABILIZED' : 'INTERRUPTED'}
              </h2>
              <p className="text-slate-400 mb-10 text-xl font-light">진실의 주파수는 <span className="text-white text-3xl font-black ml-4 bg-white/5 px-6 py-2 rounded-2xl border border-white/10">{gameState.target}</span> 이었소.</p>
              <button
                onClick={startNewGame}
                className="w-full bg-gradient-to-r from-cyan-600 to-indigo-700 text-white font-black py-6 rounded-[20px] hover:brightness-110 transition-all text-xl font-orbitron shadow-2xl"
              >
                RE-ESTABLISH LINK
              </button>
            </div>
          )}

          <div className="mt-14 pt-10 border-t border-white/5">
            <div className="flex justify-between items-center mb-6 px-2">
              <h4 className="text-[10px] font-black text-slate-600 uppercase tracking-[0.5em]">Trajectory Analysis</h4>
              <div className="text-[9px] text-cyan-400 font-black tracking-widest px-3 py-1 bg-cyan-950/40 rounded-full border border-cyan-800/40">{APP_VERSION}</div>
            </div>
            <div className="bg-slate-950/50 p-6 rounded-[30px] border border-white/5 shadow-inner">
              <GuessChart guesses={gameState.guesses} target={gameState.target} showTarget={gameState.status !== 'playing'} />
            </div>
          </div>
        </main>

        <footer className="mt-12 flex justify-between items-center px-6 opacity-30 hover:opacity-100 transition-opacity duration-700">
          <p className="text-[10px] font-black tracking-[0.5em] uppercase text-slate-500">© 2024 NEBULA QUANTUM SYSTEMS</p>
          <div className="h-[1px] bg-slate-900 flex-1 mx-12"></div>
          <div className="flex gap-4 items-center">
            <div className="w-2.5 h-2.5 rounded-full bg-cyan-500 shadow-[0_0_10px_cyan]"></div>
            <p className="text-[10px] font-black tracking-[0.5em] uppercase text-cyan-500">VERSION: 16.0.0 PRO</p>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default App;