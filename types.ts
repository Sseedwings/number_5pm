
export interface GuessRecord {
  value: number;
  timestamp: number;
  distance: number;
  direction: 'high' | 'low' | 'correct';
}

export interface GameState {
  target: number;
  guesses: GuessRecord[];
  status: 'playing' | 'won' | 'lost';
  maxAttempts: number;
  message: string;
}

export interface SageResponse {
  commentary: string;
  hint?: string;
}
