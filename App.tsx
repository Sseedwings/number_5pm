
import React, { useState, useEffect, useRef } from 'react';
import { GameState, GuessRecord } from './types';
import { getSageFeedback, speakSageMessage } from './services/geminiService';
import { soundService } from './services/soundService';
import GuessChart from './components/GuessChart';

const MAX_ATTEMPTS = 10;
// 버전을 v10.0.0으로 올려 배포 성공 여부를 명확히 확인합니다.
const APP_VERSION = "v10.0.0-VITE-STABLE"; 

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>({
    target: Math.floor(Math.random() * 100) + 1,
    guesses: [],
    status: 'playing',
    maxAttempts: MAX_ATTEMPTS,
    message: "성운의 현자가 그대를 부르고 있소. 정신을 집중하시오.",
  });
  
  const [currentInput, setCurrentInput] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isStarted, setIsStarted] = useState<boolean>(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
  }, [gameState.guesses]);

  const handleStart = async () => {
    setIsSyncing(true);
    soundService.startBGM();
    soundService.playReset();
    
    try {
      const feedback = await getSageFeedback(0, gameState.target, 0, []);
      setGameState(prev => ({ ...prev, message: feedback.text }));
      speakSageMessage(feedback.text);
    } catch (e) {
      console.error("Initial sync failed:", e);
    }

    setIsSyncing(false);
    setIsStarted(true);
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

    speakSageMessage(feedback.text);
  };

  const lastGuess = gameState.guesses[gameState.guesses.length - 1];
  const feedbackStyles = !lastGuess ? { border: 'border-white/5', text: 'text-slate-200', glow: '' } : 
    lastGuess.direction === 'high' ? { border: 'border-orange-500/50 shadow-[0_0_20px_rgba(249,115,22,0.2)]', text: 'text-orange-400', glow: 'bg-orange-500/10' } :
    lastGuess.direction === 'low' ? { border: 'border-cyan-500/50 shadow-[0_0_20px_rgba(6,182,212,0.2)]', text: 'text-cyan-400', glow: 'bg-cyan-500/10' } :
    { border: 'border-green-500/50 shadow-[0_0_20px_rgba(34,197,94,0.2)]', text: 'text-green-400', glow: 'bg-green-500/10' };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 selection:bg-cyan-500/30 font-inter text-slate-200">
      <div className="w-full max-w-2xl relative z-10">
        
        <header className="text-center mb-10">
          <h1 className="text-5xl md:text-7xl font-orbitron font-bold text-transparent bg-clip-text bg-gradient-to-b from-white via-cyan-400 to-indigo-600 mb-2 drop-shadow-[0_0_15px_rgba(6,182,212,0.4)] tracking-tighter">
            NEBULA SAGE
          </h1>
          <div className="flex items-center justify-center gap-4 opacity-50">
            <div className="h-[1px] bg-cyan-500/50 flex-1 max-w-[50px]"></div>
            <p className="text-cyan-400 uppercase tracking-[0.6em] text-[9px] font-black">Stable Deployment Engine</p>
            <div className="h-[1px] bg-cyan-500/50 flex-1 max-w-[50px]"></div>
          </div>
        </header>

        {!isStarted ? (
          <main 
            className="glass-panel rounded-[40px] p-16 md:p-24 text-center border border-white/10 hover:border-cyan-500/50 transition-all duration-700 cursor-pointer group relative overflow-hidden" 
            onClick={!isSyncing ? handleStart : undefined}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-purple-500/5"></div>
            <div className="mb-10 flex justify-center">
              <div className={`w-32 h-32 rounded-full bg-slate-900 flex items-center justify-center shadow-2xl border border-white/10 relative transition-transform duration-500 group-hover:scale-105`}>
                <div className={`absolute inset-0 rounded-full border border-cyan-400/20 ${isSyncing ? 'animate-ping' : 'animate-pulse'}`}></div>
                {isSyncing ? (
                  <div className="w-14 h-14 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-cyan-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
            </div>
            <h2 className="text-3xl font-orbitron font-bold text-white mb-4 tracking-tight">
              {isSyncing ? 'SYNCING...' : 'ACCESS ORACLE'}
            </h2>
            <p className="text-slate-400 mb-12 text-sm max-w-xs mx-auto leading-relaxed opacity-80">
              Vercel 환경 변수 동기화 및 Vite 번들링 최적화가 완료되었습니다. 입력을 생략하고 즉시 성운의 현자와 공명을 시도합니다.
            </p>
            <div className="inline-block px-10 py-4 bg-cyan-500/10 border border-cyan-500/40 rounded-2xl text-cyan-400 font-black tracking-[0.2em] text-xs transition-all hover:bg-cyan-500/20">
              {isSyncing ? 'CONNECTING...' : 'INITIALIZE'}
            </div>
          </main>
        ) : (
          <main className="glass-panel rounded-[40px] p-8 md:p-10 shadow-2xl relative overflow-hidden border border-white/10 animate-fade-in">
            <div className="flex justify-between items-center mb-10 px-2">
              <div className="flex flex-col gap-2">
                <span className="text-[10px] text-slate-500 font-black uppercase tracking-[0.3em]">Attempts</span>
                <div className="flex gap-1.5">
                  {Array.from({ length: MAX_ATTEMPTS }).map((_, i) => (
                    <div key={i} className={`h-1.5 w-6 rounded-full transition-all duration-700 ${i < (MAX_ATTEMPTS - gameState.guesses.length) ? 'bg-cyan-500' : 'bg-slate-800'}`} />
                  ))}
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-500 font-black uppercase tracking-[0.3em]">Status</span>
                <p className="text-3xl font-orbitron font-bold text-white leading-none mt-1">{MAX_ATTEMPTS - gameState.guesses.length}</p>
              </div>
            </div>

            <div className={`relative flex flex-col md:flex-row gap-6 items-center mb-10 p-8 rounded-[30px] border transition-all duration-1000 ${feedbackStyles.border} ${feedbackStyles.glow || 'bg-slate-900/40'}`}>
              <div className="relative flex-shrink-0">
                <div className={`w-24 h-24 rounded-full bg-slate-900 flex items-center justify-center border border-white/10 ${isProcessing ? 'animate-spin-slow' : 'animate-pulse'}`}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-cyan-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                </div>
              </div>
              <div className="flex-1 text-center md:text-left">
                <p className={`text-xl md:text-2xl leading-snug font-bold italic font-noto transition-colors duration-500 ${feedbackStyles.text}`}>
                  "{gameState.message}"
                </p>
              </div>
            </div>

            {gameState.status === 'playing' ? (
              <form onSubmit={handleGuess} className="flex flex-col md:flex-row gap-4 mb-4">
                <input
                  type="number"
                  min="1"
                  max="100"
                  autoFocus
                  value={currentInput}
                  onChange={(e) => setCurrentInput(e.target.value)}
                  placeholder="1-100..."
                  disabled={isProcessing}
                  className="flex-1 bg-black/30 border border-white/10 rounded-2xl px-8 py-5 text-3xl font-orbitron text-white focus:outline-none focus:border-cyan-500/50 transition-all placeholder:text-slate-800"
                />
                <button
                  type="submit"
                  disabled={isProcessing || !currentInput}
                  className="bg-white text-black font-black px-12 py-5 rounded-2xl shadow-xl hover:bg-cyan-400 transition-all active:scale-95 disabled:opacity-20 text-lg font-orbitron"
                >
                  {isProcessing ? 'SCAN' : 'EMIT'}
                </button>
              </form>
            ) : (
              <div className="text-center p-10 bg-white/5 rounded-[30px] border border-white/10 animate-scale-in">
                <h2 className={`text-5xl font-orbitron font-black mb-4 ${gameState.status === 'won' ? 'text-cyan-400' : 'text-rose-500'}`}>
                  {gameState.status === 'won' ? 'LOCKED' : 'FAILED'}
                </h2>
                <p className="text-slate-400 mb-8 text-xl font-light">진실의 숫자는 <span className="text-white text-3xl font-black ml-2">{gameState.target}</span> 이었소.</p>
                <button
                  onClick={startNewGame}
                  className="w-full bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-black py-5 rounded-2xl hover:brightness-125 transition-all text-xl font-orbitron"
                >
                  RETRY SIGNAL
                </button>
              </div>
            )}

            <div className="mt-12 pt-8 border-t border-white/5">
              <div className="flex justify-between items-center mb-4 px-2">
                <h4 className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em]">Spectral Analysis</h4>
                <div className="text-[9px] text-cyan-500 font-black tracking-widest px-3 py-1 bg-cyan-500/5 rounded-full border border-cyan-500/20">{APP_VERSION}</div>
              </div>
              <div className="bg-black/20 p-4 rounded-3xl border border-white/5">
                <GuessChart guesses={gameState.guesses} target={gameState.target} showTarget={gameState.status !== 'playing'} />
              </div>
            </div>
          </main>
        )}

        <footer className="mt-10 flex justify-between items-center px-4 opacity-20">
          <p className="text-[9px] font-black tracking-[0.4em] uppercase">© 2024 NEBULA STABLE ENGINE</p>
          <div className="h-[1px] bg-slate-800 flex-1 mx-8"></div>
          <p className="text-[9px] font-black tracking-[0.4em] uppercase">Vite Optimized</p>
        </footer>
      </div>
    </div>
  );
};

export default App;
