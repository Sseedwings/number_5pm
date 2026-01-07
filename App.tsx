
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameState, GuessRecord } from './types';
import { getSageFeedback, speakSageMessage } from './services/geminiService';
import { soundService } from './services/soundService';
import GuessChart from './components/GuessChart';

const MAX_ATTEMPTS = 10;
// 버전을 v8.0.0으로 업데이트하여 Vercel 배포 반영 여부를 즉시 확인합니다.
const APP_VERSION = "v8.0.0-PROD-READY"; 

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
  const [isBgmStarted, setIsBgmStarted] = useState<boolean>(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
  }, [gameState.guesses]);

  const ensureBgm = () => {
    if (!isBgmStarted) {
      soundService.startBGM();
      setIsBgmStarted(true);
    }
  };

  const startNewGame = () => {
    ensureBgm();
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
    ensureBgm();

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

    // 제미나이 피드백 생성
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

    // 효과음 및 음성 출력
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
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 selection:bg-cyan-500/30 font-inter">
      <div className="w-full max-w-2xl relative">
        <div className="absolute -top-24 -left-24 w-64 h-64 bg-cyan-600/10 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-purple-600/10 rounded-full blur-[100px] pointer-events-none"></div>

        <header className="text-center mb-10 relative z-10">
          <h1 className="text-5xl md:text-6xl font-orbitron font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-400 to-purple-500 mb-3 drop-shadow-[0_0_15px_rgba(6,182,212,0.5)]">
            NEBULA SAGE
          </h1>
          <div className="flex items-center justify-center gap-4">
            <div className="h-px bg-gradient-to-r from-transparent via-slate-700 to-transparent flex-1 max-w-[80px]"></div>
            <p className="text-slate-500 uppercase tracking-[0.4em] text-[10px] font-black">Cosmic Frequency Oracle</p>
            <div className="h-px bg-gradient-to-r from-transparent via-slate-700 to-transparent flex-1 max-w-[80px]"></div>
          </div>
        </header>

        {!isBgmStarted ? (
          <main className="glass-panel rounded-[40px] p-20 text-center animate-fade-in border-2 border-white/5 hover:border-cyan-500/30 transition-all duration-700 cursor-pointer shadow-2xl overflow-hidden group" onClick={startNewGame}>
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="mb-10 flex justify-center">
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-cyan-500 to-indigo-600 flex items-center justify-center shadow-[0_0_60px_rgba(6,182,212,0.4)] relative">
                <div className="absolute inset-0 rounded-full border-4 border-white/20 animate-ping"></div>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-white ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                </svg>
              </div>
            </div>
            <h2 className="text-3xl font-orbitron font-bold text-white mb-3 tracking-tight">성운과 공명하기</h2>
            <p className="text-slate-400 mb-12 text-sm max-w-xs mx-auto leading-relaxed">현자의 지혜와 우주의 배경음악이 준비되었소. 클릭하여 공명을 시작하시오.</p>
            <div className="inline-flex items-center gap-2 px-10 py-4 bg-white/5 border border-white/10 rounded-full text-cyan-400 font-bold tracking-widest hover:bg-white/10 transition-all shadow-inner">
              <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse"></div>
              PROTOCOL INITIALIZE
            </div>
          </main>
        ) : (
          <main className="glass-panel rounded-[40px] p-8 md:p-10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative overflow-hidden border border-white/10">
            <div className="flex justify-between items-end mb-10 px-2">
              <div className="flex flex-col gap-2">
                <span className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 shadow-[0_0_5px_cyan]"></div>
                  Frequency Nodes
                </span>
                <div className="flex gap-1.5 p-1 bg-black/20 rounded-lg">
                  {Array.from({ length: MAX_ATTEMPTS }).map((_, i) => (
                    <div key={i} className={`h-2 w-6 rounded-sm transition-all duration-700 ${i < (MAX_ATTEMPTS - gameState.guesses.length) ? 'bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.8)]' : 'bg-slate-800'}`} />
                  ))}
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em]">Oracle Tries</span>
                <p className="text-4xl font-orbitron font-bold text-white leading-none mt-1">{MAX_ATTEMPTS - gameState.guesses.length}</p>
              </div>
            </div>

            <div className={`relative flex flex-col md:flex-row gap-6 items-center mb-10 p-8 rounded-[32px] border transition-all duration-1000 ${feedbackStyles.border} ${feedbackStyles.glow || 'bg-slate-900/60'}`}>
              <div className="relative flex-shrink-0">
                <div className={`w-24 h-24 rounded-full bg-gradient-to-tr from-indigo-700 via-purple-700 to-cyan-700 flex items-center justify-center shadow-2xl border-2 border-white/20 relative ${isProcessing ? 'animate-spin-slow' : 'animate-pulse'}`}>
                  <div className="absolute inset-0 bg-white/10 rounded-full blur-md"></div>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-white/90 relative z-10" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1.323l.395.17c.734.314 1.322.903 1.634 1.635l.17.395H14.5a1 1 0 110 2h-1.301l-.17.395c-.312.732-.9 1.321-1.634 1.635l-.395.17V17a1 1 0 11-2 0v-6.323l-.395-.17c-.734-.314-1.322-.903-1.634-1.635l-.17-.395H5.5a1 1 0 110-2h1.301l.17-.395c.312-.732.9-1.321 1.634-1.635l.395-.17V3a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div className="flex-1 text-center md:text-left">
                <div className="mb-2 text-[10px] text-slate-500 font-bold tracking-widest uppercase">Sage Message</div>
                <p className={`text-xl md:text-2xl leading-relaxed font-bold italic drop-shadow-md font-noto transition-colors duration-500 ${feedbackStyles.text}`}>
                  "{gameState.message}"
                </p>
              </div>
            </div>

            {gameState.status === 'playing' ? (
              <form onSubmit={handleGuess} className="flex flex-col md:flex-row gap-4 mb-4">
                <div className="relative flex-1 group">
                  <input
                    type="number"
                    min="1"
                    max="100"
                    autoFocus
                    value={currentInput}
                    onChange={(e) => setCurrentInput(e.target.value)}
                    placeholder="1-100 사이의 숫자를 추측하시오..."
                    disabled={isProcessing}
                    className={`w-full bg-slate-900/80 border-2 rounded-2xl px-8 py-5 text-3xl font-orbitron text-white focus:outline-none focus:ring-4 focus:ring-cyan-500/20 transition-all placeholder:text-slate-700 placeholder:text-lg ${lastGuess?.direction === 'high' ? 'border-orange-500/40 shadow-[0_0_15px_rgba(249,115,22,0.1)]' : lastGuess?.direction === 'low' ? 'border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.1)]' : 'border-white/10'}`}
                  />
                  <div className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-700 font-black opacity-0 group-hover:opacity-100 transition-opacity">FREQ</div>
                </div>
                <button
                  type="submit"
                  disabled={isProcessing || !currentInput}
                  className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-black px-12 py-5 rounded-2xl shadow-[0_10px_20px_rgba(6,182,212,0.3)] hover:shadow-[0_15px_30px_rgba(6,182,212,0.5)] hover:-translate-y-1 transition-all active:scale-95 disabled:opacity-30 disabled:grayscale disabled:translate-y-0 text-xl tracking-widest font-orbitron"
                >
                  {isProcessing ? 'SCANNING...' : 'EMIT'}
                </button>
              </form>
            ) : (
              <div className="text-center p-10 bg-slate-900/40 rounded-[32px] border-2 border-white/5 backdrop-blur-xl animate-scale-in">
                <h2 className={`text-5xl font-black mb-4 tracking-tight drop-shadow-lg ${gameState.status === 'won' ? 'text-green-400' : 'text-rose-500'}`}>
                  {gameState.status === 'won' ? 'FREQUENCY LOCKED' : 'CONVERSION FAILED'}
                </h2>
                <p className="text-slate-400 mb-10 text-xl font-medium">진실의 주파수는 <span className="text-white text-3xl font-black ml-2 px-4 py-1 bg-white/5 rounded-xl border border-white/10">{gameState.target}</span> 이었소.</p>
                <button
                  onClick={startNewGame}
                  className="w-full bg-white text-slate-950 font-black py-5 rounded-2xl hover:bg-cyan-400 transition-all shadow-xl text-xl tracking-tighter uppercase"
                >
                  Re-Establish Connection
                </button>
              </div>
            )}

            <div className="mt-14 pt-10 border-t border-white/10">
              <div className="flex justify-between items-center mb-6">
                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Signal Trajectory Analysis</h4>
                <div className="text-[9px] text-cyan-400 bg-cyan-500/10 px-3 py-1.5 rounded-full font-black tracking-wider border border-cyan-500/20">{APP_VERSION}</div>
              </div>
              <div className="bg-black/20 p-6 rounded-[24px] border border-white/5">
                <GuessChart guesses={gameState.guesses} target={gameState.target} showTarget={gameState.status !== 'playing'} />
              </div>
            </div>
          </main>
        )}

        <footer className="mt-10 flex justify-between items-center px-6 opacity-60 hover:opacity-100 transition-opacity">
          <p className="text-slate-600 text-[10px] font-black tracking-[0.3em] uppercase">© 2024 Nebula Sage Interactive</p>
          <div className="h-px bg-slate-800 flex-1 mx-8 opacity-30"></div>
          <div className="flex gap-4">
             <div className="w-2 h-2 rounded-full bg-green-500"></div>
             <p className="text-slate-600 text-[10px] font-black tracking-[0.3em] uppercase">Status: Online</p>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default App;
