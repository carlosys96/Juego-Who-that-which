export type QuestionType = 'multiple-choice' | 'fill-in-the-blank' | 'true-false' | 'timed-choice' | 'sentence-completion';
export type GameDifficulty = 'easy' | 'medium' | 'hard';

export interface AppQuestion {
  id: string;
  level: 1 | 2 | 3;
  type: QuestionType;
  text: string;
  options: string[];
  correctAnswer: string;
  difficulty: GameDifficulty;
  explanation?: string;
}

export interface PlayerScore {
  name: string;
  avatar: string;
  score: number;
  date: string;
}

export interface PlayerInfo {
    name: string;
    avatar: string;
    difficulty: GameDifficulty;
}

// PlayerPerformance and PlayerSession are no longer needed for local storage implementation
// but are kept for potential future re-integration with a cloud database.
export interface PlayerPerformance {
  questionId: string;
  correct: boolean;
  chosenAnswer: string;
}

export interface PlayerSession {
  name: string;
  avatar: string;
  score: number;
  performance: PlayerPerformance[];
  date: string;
}

export type GameState = 'idle' | 'playing' | 'level-transition' | 'finished';
