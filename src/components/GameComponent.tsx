'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { questions as allQuestions } from '@/lib/questions';
import useLocalStorage from '@/hooks/use-local-storage';
import { playCorrectSound, playIncorrectSound, toggleMusic } from '@/lib/sounds';
import { adaptQuestionsToUserPerformance } from '@/ai/flows/adapt-questions-to-user-performance.flow';
import type { AppQuestion, GameState, PlayerPerformance, PlayerScore, PlayerSession, PlayerInfo, GameDifficulty } from '@/lib/types';
import {
  Award,
  CheckCircle2,
  ChevronRight,
  Home,
  Loader2,
  Music,
  Star,
  Trophy,
  XCircle,
  VolumeX,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { RelatixLogo } from './icons';

const QUESTIONS_PER_LEVEL = 5;
const TIMED_QUESTION_DURATION = 10; // seconds

const difficultyToLevels: Record<GameDifficulty, number[]> = {
  easy: [1],
  medium: [2],
  hard: [3],
};

export default function GameComponent() {
  const router = useRouter();
  const [playerInfo] = useLocalStorage<PlayerInfo>('relatix-player', { name: 'Player', avatar: '', difficulty: 'easy' });
  const [highScores, setHighScores] = useLocalStorage<PlayerScore[]>('relatix-highscores', []);
  const [playerSessions, setPlayerSessions] = useLocalStorage<PlayerSession[]>('relatix-sessions', []);

  const [gameState, setGameState] = useState<GameState>('idle');
  const [currentLevelIndex, setCurrentLevelIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [questionQueue, setQuestionQueue] = useState<AppQuestion[]>([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [userPerformance, setUserPerformance] = useState<PlayerPerformance[]>([]);
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const [isMusicOn, setIsMusicOn] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [timer, setTimer] = useState(TIMED_QUESTION_DURATION);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);

  const gameLevels = useMemo(() => {
    if (playerInfo.difficulty === 'easy') return [1];
    if (playerInfo.difficulty === 'medium') return [2];
    if (playerInfo.difficulty === 'hard') return [3];
    return [1]; // Default
  }, [playerInfo.difficulty]);
  
  const currentLevel = useMemo(() => gameLevels[currentLevelIndex], [gameLevels, currentLevelIndex]);

  const currentQuestion = useMemo(() => questionQueue[questionIndex], [questionQueue, questionIndex]);
  
  const handleAnswer = useCallback((answer: string) => {
    if (feedback) return; // Prevent multiple answers

    setSelectedAnswer(answer);
    const isCorrect = answer === currentQuestion.correctAnswer;
    
    setFeedback(isCorrect ? 'correct' : 'incorrect');
    if (isCorrect) {
      playCorrectSound();
      setScore(s => s + 10 * currentLevel);
    } else {
      playIncorrectSound();
    }

    setUserPerformance(prev => [...prev, { questionId: currentQuestion.id, correct: isCorrect, chosenAnswer: answer }]);

  }, [currentQuestion, currentLevel, feedback]);

  const handleContinue = () => {
    setFeedback(null);
    setSelectedAnswer(null);
    if (questionIndex < QUESTIONS_PER_LEVEL - 1) {
      setQuestionIndex(i => i + 1);
    } else {
      if (currentLevelIndex < gameLevels.length - 1) {
        setGameState('level-transition');
      } else {
        setGameState('finished');
      }
    }
  };
  
  const startLevel = useCallback(async () => {
    setGameState('idle');
    setIsAiLoading(true);
    const levelQuestions = allQuestions.filter(q => gameLevels.includes(q.level));

    const performanceDataForAI = userPerformance.map(p => ({
      questionId: p.questionId,
      correct: p.correct,
    }));
    
    try {
      const adaptedQuestions = await adaptQuestionsToUserPerformance({
        questions: levelQuestions,
        userPerformanceData: performanceDataForAI,
      });
      const shuffledQuestions = [...adaptedQuestions].sort(() => 0.5 - Math.random());
      setQuestionQueue(shuffledQuestions.slice(0, QUESTIONS_PER_LEVEL));
    } catch(e) {
      console.error("AI flow failed, falling back to default questions.", e);
      const shuffledQuestions = [...levelQuestions].sort(() => 0.5 - Math.random());
      setQuestionQueue(shuffledQuestions.slice(0, QUESTIONS_PER_LEVEL));
    }
    
    setQuestionIndex(0);
    setIsAiLoading(false);
    setGameState('playing');
  }, [userPerformance, gameLevels]);
  
  useEffect(() => {
    if (!playerInfo?.name) {
      router.push('/');
      return;
    }
    startLevel();
  }, [playerInfo, router, startLevel]);

  useEffect(() => {
    if (gameState === 'playing' && currentQuestion?.type === 'timed-choice' && !feedback) {
      setTimer(TIMED_QUESTION_DURATION);
      const interval = setInterval(() => {
        setTimer(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            handleAnswer('timeout');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [gameState, currentQuestion, handleAnswer, feedback]);


  const handleNextLevel = () => {
    const nextLevelIndex = currentLevelIndex + 1;
    if (nextLevelIndex < gameLevels.length) {
      setCurrentLevelIndex(nextLevelIndex);
      startLevel();
    } else {
      setGameState('finished');
    }
  };
  
  const handleFinishGame = () => {
    const finalScore: PlayerScore = { name: playerInfo.name, avatar: playerInfo.avatar, score, date: new Date().toISOString() };
    const sessionData: PlayerSession = { ...finalScore, performance: userPerformance };

    setHighScores([...highScores, finalScore]);
    setPlayerSessions([...playerSessions, sessionData]);
    router.push('/');
  };

  const toggleMusicHandler = () => {
    const newMusicState = !isMusicOn;
    setIsMusicOn(newMusicState);
    toggleMusic(newMusicState);
  };

  if (!playerInfo?.name) {
    return null;
  }

  const renderContent = () => {
    if (isAiLoading) {
      return (
        <div className="flex flex-col items-center justify-center text-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <h2 className="text-2xl font-headline">Preparing Your Questions...</h2>
          <p className="text-muted-foreground">Our AI is adapting the game to your performance!</p>
        </div>
      );
    }
    
    switch (gameState) {
      case 'playing':
        return (
          <Card className={cn("w-full max-w-2xl transition-all duration-500", feedback && (feedback === 'correct' ? 'border-accent shadow-accent/20' : 'border-destructive shadow-destructive/20'))}>
            <CardHeader>
              <div className="flex justify-between items-center mb-2">
                <CardTitle className="font-headline text-2xl">
                  {`Difficulty: ${playerInfo.difficulty}`}
                </CardTitle>
                <div className="flex items-center gap-2 font-mono text-lg font-bold text-primary">
                  <Star className="w-5 h-5 fill-primary" /> {score}
                </div>
              </div>
              <Progress value={((questionIndex + 1) / QUESTIONS_PER_LEVEL) * 100} className="w-full" />
            </CardHeader>
            {currentQuestion ? (
              <CardContent className="flex flex-col items-center text-center">
                {currentQuestion.type === 'timed-choice' && !feedback && (
                  <div className="w-full mb-4">
                    <div className="relative h-2 bg-secondary rounded-full overflow-hidden">
                       <div className="absolute top-0 left-0 h-full bg-destructive animate-progress-bar" style={{ animationDuration: `${TIMED_QUESTION_DURATION}s`}}></div>
                    </div>
                     <p className="text-sm text-destructive font-mono mt-1 text-right">{timer}s</p>
                  </div>
                )}
                <p className="text-xl md:text-2xl font-semibold mb-8 min-h-[6rem]">
                  {currentQuestion.text.split('___').map((part, i) => (
                    <span key={i}>{part}{i < currentQuestion.text.split('___').length - 1 && <span className="inline-block w-24 border-b-2 border-dashed mx-2"></span>}</span>
                  ))}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                  {currentQuestion.options.map(option => (
                    <Button
                      key={option}
                      variant="outline"
                      size="lg"
                      className={cn("h-auto py-4 text-base", {
                        "bg-accent text-accent-foreground hover:bg-accent": feedback === 'correct' && option === currentQuestion.correctAnswer,
                        "bg-destructive text-destructive-foreground hover:bg-destructive": feedback === 'incorrect' && selectedAnswer === option,
                      })}
                      onClick={() => handleAnswer(option)}
                      disabled={!!feedback}
                    >
                      {option}
                    </Button>
                  ))}
                </div>
                {feedback && (
                  <div className="mt-6 flex flex-col items-center gap-4 w-full">
                    <div className="flex items-center gap-2">
                      {feedback === 'correct' ? (
                         <CheckCircle2 className="h-6 w-6 text-accent" />
                      ) : (
                         <XCircle className="h-6 w-6 text-destructive" />
                      )}
                      <p className={cn("text-lg font-semibold", feedback === 'correct' ? 'text-accent' : 'text-destructive')}>
                         {feedback === 'correct' ? "Excellent!" : `The correct answer is: ${currentQuestion.correctAnswer}`}
                      </p>
                    </div>
                    <Button onClick={handleContinue} className="w-full sm:w-auto">
                      Continue <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                )}
              </CardContent>
            ) : <p>Loading questions...</p>}
          </Card>
        );
      case 'level-transition':
        return (
          <Card className="w-full max-w-md text-center">
            <CardHeader>
              <CardTitle className="font-headline text-3xl">Level {currentLevel} Complete!</CardTitle>
              <CardDescription>Great job! Get ready for the next challenge.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex justify-center">
                    <Award className="w-24 h-24 text-primary"/>
                </div>
              <p className="text-lg">Your score: <span className="font-bold text-primary">{score}</span></p>
              <Button onClick={handleNextLevel} className="w-full">
                Start Next Level <ChevronRight className="ml-2 h-4 w-4"/>
              </Button>
            </CardContent>
          </Card>
        );
      case 'finished':
        const isNewHighScore = score > 0 && (highScores.length < 5 || score > Math.min(...highScores.map(s => s.score)));
        return (
          <Card className="w-full max-w-md text-center">
            <CardHeader>
              <CardTitle className="font-headline text-3xl">Challenge Complete!</CardTitle>
              {isNewHighScore && (
                <div className="flex items-center justify-center gap-2 text-accent font-semibold">
                  <Trophy className="w-6 h-6"/> New High Score!
                </div>
              )}
            </CardHeader>
            <CardContent className="space-y-6">
                <p className="text-4xl font-bold text-primary">{score}</p>
                <p className="text-muted-foreground">You've mastered the relative clauses. Congratulations!</p>
              <div className="flex gap-4">
                <Button onClick={() => router.push('/')} variant="outline" className="w-full">
                  <Home className="mr-2 h-4 w-4"/> Main Menu
                </Button>
                <Button onClick={handleFinishGame} className="w-full">
                  Save & Exit
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      default:
        return (
          <div className="flex flex-col items-center justify-center text-center gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <h2 className="text-2xl font-headline">Loading Game...</h2>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
       <header className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2 text-foreground/80 hover:text-foreground">
             <RelatixLogo className="w-8 h-8"/>
             <span className="font-headline text-xl">Relatix</span>
          </Link>
          <div className="flex items-center gap-4">
             <div className="flex items-center gap-3 bg-card px-4 py-2 rounded-full border">
                <Avatar className="h-8 w-8">
                   <AvatarImage src={playerInfo.avatar} />
                   <AvatarFallback>{playerInfo.name?.slice(0, 2)}</AvatarFallback>
                </Avatar>
                <span className="font-semibold">{playerInfo.name}</span>
             </div>
             <Button variant="ghost" size="icon" onClick={toggleMusicHandler} aria-label="Toggle Music">
                {isMusicOn ? <Music className="h-5 w-5"/> : <VolumeX className="h-5 w-5"/>}
             </Button>
          </div>
       </header>
      {renderContent()}
    </div>
  );
}
