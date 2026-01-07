
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameState, GuessRecord } from './types';
import { getSageFeedback, speakSageMessage } from './services/geminiService';
import { soundService } from './services/soundService';
import GuessChart from './components/GuessChart';

const MAX_ATTEMPTS = 10;

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>({
    target: Math.floor(Math.random() * 100) + 1,
    guesses: [],
    status: 'playing',
    maxAttempts: MAX_ATTEMPTS,
    message: "환영하오, 구도자여. 성운의 현자가 그대의 추측을 기다리고 있소.",
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

  // 첫 상호작용 시 BGM 시작을 위한 헬퍼
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
      message: "우주의 톱니바퀴가 재설정되었소. 새로운 숫자가 구체화되었구려.",
    });
    setCurrentInput('');
  };

  const handleGuess = async (e: React.FormEvent) => {
    e.preventDefault();
    ensureBgm(); // 전송 시 BGM 시작 확인

    const guessVal = parseInt(currentInput);
    
    if (isNaN(guessVal) || guessVal < 1 || guessVal > 100) {
      setGameState(prev => ({ ...prev, message: "1에서 100 사이의 경계를 유지하십시오, 여행자여." }));
      return;
    }

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

    // Get Sage Feedback
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

    // 결과에 따른 효과음 및 목소리 출력
    if (newStatus === 'won') {
      soundService.playVictory();
    } else if (newStatus === 'lost') {
      soundService.playGameOver();
    } else {
      soundService.playSageIntro();
      if (direction === 'high') soundService.playHighHint();
      else soundService.playLowHint();
    }

    speakSageMessage(feedback.text);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <header className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-orbitron font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500 mb-2">
            성운의 연금술사
          </h1>
          <p className="text-slate-400 uppercase tracking-widest text-sm">숫자 탐구 챌린지</p>
        </header>

        {!isBgmStarted ? (
          <main className="glass-panel rounded-3xl p-12 text-center animate-pulse cursor-pointer border-2 border-cyan-500/50" onClick={startNewGame}>
            <div className="mb-6 flex justify-center">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center shadow-2xl shadow-cyan-500/50">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            </div>
            <h2 className="text-2xl font-orbitron font-bold text-white mb-2">성운 연결 대기 중</h2>
            <p className="text-slate-400 mb-8">화면을 터치하여 현자의 정신과 공명하십시오.</p>
            <span className="text-cyan-400 font-bold tracking-widest animate-bounce">[ 여기를 눌러 시작 ]</span>
          </main>
        ) : (
          <main className="glass-panel rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden transition-all duration-1000">
            {/* Nebula Decoration */}
            <div className="absolute -top-24 -left-24 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>

            {/* Status Indicator */}
            <div className="flex justify-between items-center mb-6">
              <div className="flex flex-col">
                <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">남은 시도</span>
                <span className={`text-2xl font-orbitron ${gameState.maxAttempts - gameState.guesses.length <= 3 && gameState.status === 'playing' ? 'text-rose-500' : 'text-cyan-400'}`}>
                  {gameState.maxAttempts - gameState.guesses.length}
                </span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">탐색 횟수</span>
                <span className="text-2xl font-orbitron text-purple-400">
                  {gameState.guesses.length}
                </span>
              </div>
            </div>

            {/* AI Avatar & Message */}
            <div className={`flex gap-4 items-start mb-8 bg-slate-900/50 p-4 rounded-2xl border border-slate-800 transition-all duration-500 ${isProcessing ? 'border-cyan-500/50 shadow-inner' : ''}`}>
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-500 to-indigo-600 flex-shrink-0 flex items-center justify-center border-2 border-white/20 shadow-lg shadow-cyan-500/20">
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-8 w-8 text-white ${isProcessing ? 'animate-spin' : 'animate-pulse'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="font-orbitron text-[10px] font-bold text-slate-500 mb-1 tracking-widest uppercase">The Nebula Sage</h3>
                <p className="text-lg text-slate-100 leading-snug font-medium italic">"{gameState.message}"</p>
              </div>
            </div>

            {/* Game Controls */}
            {gameState.status === 'playing' ? (
              <form onSubmit={handleGuess} className="flex gap-2">
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={currentInput}
                  onChange={(e) => setCurrentInput(e.target.value)}
                  placeholder="1-100 사이 숫자"
                  disabled={isProcessing}
                  className="flex-1 bg-slate-800 border-2 border-slate-700 rounded-xl px-4 py-3 text-xl font-orbitron text-white focus:outline-none focus:border-cyan-500 transition-all disabled:opacity-50 placeholder:text-slate-600"
                />
                <button
                  type="submit"
                  disabled={isProcessing || !currentInput}
                  className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold px-8 py-3 rounded-xl shadow-lg shadow-cyan-500/30 transition-all active:scale-95 disabled:opacity-50 disabled:grayscale"
                >
                  {isProcessing ? '탐색 중...' : '전송'}
                </button>
              </form>
            ) : (
              <div className="text-center bg-slate-900/80 border border-slate-700 p-6 rounded-2xl animate-in fade-in zoom-in duration-300">
                <h2 className={`text-3xl font-bold mb-2 ${gameState.status === 'won' ? 'text-emerald-400' : 'text-rose-500'}`}>
                  {gameState.status === 'won' ? '점술 성공!' : '공명 상실...'}
                </h2>
                <p className="text-slate-400 mb-6">
                  우주의 해답은 <span className="text-white font-bold text-xl">{gameState.target}</span> 이었소.
                </p>
                <button
                  onClick={startNewGame}
                  className="bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-600 hover:to-slate-700 text-white font-bold px-10 py-3 rounded-xl transition-all shadow-xl"
                >
                  새로운 성운 탐색
                </button>
              </div>
            )}

            {/* Guess Visualizer */}
            <div className="mt-8 border-t border-slate-800 pt-6">
              <div className="flex justify-between items-end mb-4">
                <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">추측 주파수 궤적</h4>
                {!gameState.guesses.length && <span className="text-[10px] text-slate-600 italic">아직 기록된 궤적이 없소</span>}
              </div>
              
              {gameState.guesses.length > 0 && (
                <>
                  <GuessChart 
                    guesses={gameState.guesses} 
                    target={gameState.target} 
                    showTarget={gameState.status !== 'playing'}
                  />
                  
                  <div 
                    ref={scrollRef}
                    className="mt-6 flex gap-3 overflow-x-auto pb-4 scrollbar-hide scroll-smooth"
                  >
                    {gameState.guesses.map((g, i) => (
                      <div 
                        key={i} 
                        className={`flex-shrink-0 px-4 py-2 rounded-lg border flex flex-col items-center justify-center min-w-[70px] transition-all ${
                          g.direction === 'correct' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 
                          g.direction === 'high' ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' : 
                          'bg-sky-500/10 border-sky-500/30 text-sky-400'
                        }`}
                      >
                        <span className="text-[10px] font-bold opacity-50 mb-1 leading-none">{i + 1}회차</span>
                        <span className="text-xl font-orbitron font-bold leading-none">{g.value}</span>
                        <span className="text-[9px] mt-1 font-bold tracking-tighter">
                          {g.direction === 'correct' ? '일치' : g.direction === 'high' ? '높음' : '낮음'}
                        </span>
                      </div>
                    )).reverse()}
                  </div>
                </>
              )}
            </div>
          </main>
        )}

        <footer className="mt-8 text-center text-slate-600 text-[10px] tracking-widest uppercase">
          <p>© 2024 Nebula Sage Intelligence • Cosmic Frequency Project</p>
        </footer>
      </div>
    </div>
  );
};

export default App;
