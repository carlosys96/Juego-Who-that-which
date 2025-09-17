export type QuestionType = 'multiple-choice' | 'fill-in-the-blank' | 'true-false' | 'timed-choice';

export interface AppQuestion {
  id: string;
  level: 1 | 2 | 3;
  type: QuestionType;
  text: string;
  options: string[];
  correctAnswer: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface PlayerScore {
  name: string;
  avatar: string;
  score: number;
  date: string;
}

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
