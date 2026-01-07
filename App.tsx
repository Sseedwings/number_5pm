
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameState, GuessRecord } from './types';
import { getSageFeedback, speakSageMessage } from './services/geminiService';
import { soundService } from './services/soundService';
import GuessChart from './components/GuessChart';

const MAX_ATTEMPTS = 10;
const APP_VERSION = "v1.2.0-final-audio"; // 업데이트 확인용 버전

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

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 selection:bg-cyan-500/30">
      <div className="w-full max-w-2xl">
        <header className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-orbitron font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-400 to-purple-500 mb-2">
            성운의 현자
          </h1>
          <p className="text-slate-500 uppercase tracking-[0.3em] text-[10px] font-bold">Cosmic Oracle Protocol</p>
        </header>

        {!isBgmStarted ? (
          <main className="glass-panel rounded-3xl p-16 text-center animate-pulse cursor-pointer border-2 border-cyan-500/30 hover:border-cyan-400/60 transition-all duration-500" onClick={startNewGame}>
            <div className="mb-8 flex justify-center">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center shadow-[0_0_50px_rgba(34,197,94,0.3)]">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <h2 className="text-2xl font-orbitron font-bold text-white mb-2 tracking-tight">공명 시작 대기</h2>
            <p className="text-slate-400 mb-10 text-sm">현자의 고주파 음성과 성운 배경음악이 준비되었소.</p>
            <span className="px-8 py-3 bg-white/5 border border-white/10 rounded-full text-cyan-400 font-bold tracking-widest hover:bg-white/10 transition-all">연결 수립</span>
          </main>
        ) : (
          <main className="glass-panel rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden">
            {/* Status */}
            <div className="flex justify-between items-center mb-8 px-2">
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">LIFE FLOW</span>
                <div className="flex gap-1 mt-1">
                  {Array.from({ length: MAX_ATTEMPTS }).map((_, i) => (
                    <div key={i} className={`h-1.5 w-6 rounded-full transition-all duration-500 ${i < (MAX_ATTEMPTS - gameState.guesses.length) ? 'bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.6)]' : 'bg-slate-800'}`} />
                  ))}
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">REMAINING</span>
                <p className="text-2xl font-orbitron text-white leading-none mt-1">{MAX_ATTEMPTS - gameState.guesses.length}</p>
              </div>
            </div>

            {/* AI Voice Box */}
            <div className={`relative flex gap-5 items-center mb-10 bg-slate-900/60 p-6 rounded-2xl border transition-all duration-500 ${isProcessing ? 'border-cyan-500/50 bg-slate-900' : 'border-white/5'}`}>
              <div className="relative flex-shrink-0">
                <div className={`w-20 h-20 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center shadow-xl border-2 border-white/10 ${isProcessing ? 'animate-spin-slow' : 'animate-pulse'}`}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white/90" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                  </svg>
                </div>
                {isProcessing && <div className="absolute inset-0 rounded-full border-2 border-cyan-400 animate-ping opacity-25"></div>}
              </div>
              <div className="flex-1">
                <p className="text-lg text-slate-200 leading-relaxed font-medium italic drop-shadow-sm font-noto">
                  "{gameState.message}"
                </p>
              </div>
            </div>

            {/* Input */}
            {gameState.status === 'playing' ? (
              <form onSubmit={handleGuess} className="flex gap-3">
                <input
                  type="number"
                  min="1"
                  max="100"
                  autoFocus
                  value={currentInput}
                  onChange={(e) => setCurrentInput(e.target.value)}
                  placeholder="추측 숫자를 입력하시오..."
                  disabled={isProcessing}
                  className="flex-1 bg-slate-800/50 border-2 border-white/5 rounded-2xl px-6 py-4 text-2xl font-orbitron text-white focus:outline-none focus:border-cyan-500 focus:bg-slate-800 transition-all placeholder:text-slate-600"
                />
                <button
                  type="submit"
                  disabled={isProcessing || !currentInput}
                  className="bg-white text-slate-950 font-black px-10 py-4 rounded-2xl shadow-xl hover:bg-cyan-400 transition-all active:scale-95 disabled:opacity-30 disabled:grayscale"
                >
                  {isProcessing ? 'SCAN' : 'SEND'}
                </button>
              </form>
            ) : (
              <div className="text-center p-8 bg-white/5 rounded-3xl border border-white/10 backdrop-blur-sm">
                <h2 className={`text-4xl font-black mb-3 ${gameState.status === 'won' ? 'text-cyan-400' : 'text-rose-500'}`}>
                  {gameState.status === 'won' ? 'ASCENSION COMPLETE' : 'FREQUENCY LOST'}
                </h2>
                <p className="text-slate-400 mb-8 text-lg font-medium">진실의 숫자는 <span className="text-white text-2xl font-bold ml-2 underline decoration-cyan-500">{gameState.target}</span> 이었소.</p>
                <button
                  onClick={startNewGame}
                  className="w-full bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-black py-4 rounded-2xl hover:brightness-110 transition-all shadow-lg"
                >
                  새로운 공명 시도
                </button>
              </div>
            )}

            {/* Chart */}
            <div className="mt-12 pt-8 border-t border-white/5">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Trajectory Analysis</h4>
                <div className="text-[10px] text-slate-400 bg-white/5 px-2 py-1 rounded tracking-tighter">{APP_VERSION}</div>
              </div>
              <GuessChart guesses={gameState.guesses} target={gameState.target} showTarget={gameState.status !== 'playing'} />
            </div>
          </main>
        )}

        <footer className="mt-8 flex justify-between items-center px-4">
          <p className="text-slate-700 text-[9px] font-bold tracking-widest uppercase">© 2024 NEBULA SAGE CORP</p>
          <div className="h-px bg-slate-800 flex-1 mx-6 opacity-50"></div>
          <p className="text-slate-700 text-[9px] font-bold tracking-widest uppercase">Secured by Gemini AI</p>
        </footer>
      </div>
    </div>
  );
};

export default App;
