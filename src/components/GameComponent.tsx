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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { questions as allQuestions } from '@/lib/questions';
import useLocalStorage from '@/hooks/use-local-storage';
import { playCorrectSound, playIncorrectSound, toggleMusic } from '@/lib/sounds';
import type { AppQuestion, GameState, PlayerPerformance, PlayerScore, PlayerInfo, GameDifficulty, PlayerSession } from '@/lib/types';
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
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, addDoc, query, limit, getDocs, writeBatch, doc } from 'firebase/firestore';


const QUESTIONS_PER_LEVEL = 10;
const TIMED_QUESTION_DURATION = 30; // seconds for hard questions
const HIGH_SCORE_LIMIT = 10;

export default function GameComponent() {
  const router = useRouter();
  const { toast } = useToast();
  const [playerInfo] = useLocalStorage<PlayerInfo>('relatix-player', { name: 'Player', avatar: '', difficulty: 'easy' });
  
  const [gameState, setGameState] = useState<GameState>('idle');
  const [score, setScore] = useState(0);
  const [questionQueue, setQuestionQueue] = useState<AppQuestion[]>([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const [isMusicOn, setIsMusicOn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [timer, setTimer] = useState(TIMED_QUESTION_DURATION);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [userPerformance, setUserPerformance] = useState<PlayerPerformance[]>([]);
  
  const currentQuestion = useMemo(() => questionQueue[questionIndex], [questionQueue, questionIndex]);

  const handleContinue = () => {
    setFeedback(null);
    setSelectedAnswer(null);
    setInputValue('');

    const nextQuestionIndex = questionIndex + 1;
    if (nextQuestionIndex < questionQueue.length) {
      setQuestionIndex(nextQuestionIndex);
    } else {
      setGameState('finished');
    }
  };

  const handleAnswer = useCallback((answer: string) => {
    if (feedback) return; // Prevent multiple answers

    setSelectedAnswer(answer);
    
    let isCorrect = false;
    if (currentQuestion.type === 'sentence-completion' && playerInfo.difficulty === 'hard') {
        const normalize = (str: string) => str.trim().toLowerCase().replace(/[.,'"]/g, '');
        isCorrect = normalize(answer) === normalize(currentQuestion.correctAnswer);
    } else {
        const processedAnswer = answer.trim().toLowerCase();
        isCorrect = processedAnswer === currentQuestion.correctAnswer.toLowerCase();
    }

    setUserPerformance(prev => [...prev, { questionId: currentQuestion.id, correct: isCorrect, chosenAnswer: answer }]);
    
    setFeedback(isCorrect ? 'correct' : 'incorrect');
    if (isCorrect) {
      playCorrectSound();
      setScore(s => s + 10);
    } else {
      playIncorrectSound();
    }
  }, [currentQuestion, feedback, playerInfo.difficulty]);
  
  useEffect(() => {
    const isTimed = currentQuestion?.type === 'sentence-completion' && playerInfo.difficulty === 'hard';
    if (gameState === 'playing' && isTimed && !feedback) {
      setTimer(TIMED_QUESTION_DURATION);
      const interval = setInterval(() => {
        setTimer(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            handleAnswer(inputValue || 'timeout');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [gameState, currentQuestion, feedback, handleAnswer, playerInfo.difficulty, inputValue]);

  const startGame = useCallback(async () => {
    setGameState('idle');
    setIsLoading(true);
    setUserPerformance([]);

    const questionsForDifficulty = allQuestions.filter(q => q.difficulty === playerInfo.difficulty);
    const shuffledQuestions = [...questionsForDifficulty].sort(() => 0.5 - Math.random());
    setQuestionQueue(shuffledQuestions.slice(0, QUESTIONS_PER_LEVEL));
    
    setQuestionIndex(0);
    setScore(0);
    setIsLoading(false);
    setGameState('playing');
  }, [playerInfo.difficulty]);
  
  useEffect(() => {
    if (!playerInfo?.name) {
      router.push('/');
      return;
    }
    startGame();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerInfo?.name, router]);
  
  const handleFinishGame = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const date = new Date().toISOString();
      const finalScore: PlayerScore = { name: playerInfo.name, avatar: playerInfo.avatar, score, date };
      const sessionData: PlayerSession = { ...finalScore, performance: userPerformance };

      // 1. Save the detailed player session for the teacher panel
      await addDoc(collection(db, 'sessions'), sessionData);

      // 2. Check and update the high scores leaderboard
      const highScoresCollection = collection(db, 'highscores');
      const q = query(highScoresCollection, limit(HIGH_SCORE_LIMIT));
      const querySnapshot = await getDocs(q);
      const highScores = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as PlayerScore }));

      let lowestHighScore: { id: string; score: number } | null = null;
      if (highScores.length > 0) {
        // Sort on the client to find the lowest score
        highScores.sort((a, b) => a.score - b.score);
        lowestHighScore = { id: highScores[0].id, score: highScores[0].score };
      }
      
      if (highScores.length < HIGH_SCORE_LIMIT || (lowestHighScore && score > lowestHighScore.score)) {
        const batch = writeBatch(db);
        
        const newHighScoreRef = doc(collection(db, 'highscores'));
        batch.set(newHighScoreRef, finalScore);
        
        if (highScores.length >= HIGH_SCORE_LIMIT && lowestHighScore) {
          const lowestScoreDocRef = doc(db, 'highscores', lowestHighScore.id);
          batch.delete(lowestScoreDocRef);
        }
        
        await batch.commit();

        toast({
          title: "New High Score!",
          description: "You've made it to the global leaderboard!",
        });
      } else {
         toast({
          title: "Score Saved!",
          description: "Your session data has been saved.",
        });
      }
    } catch (error) {
      console.error("Error saving score:", error);
      toast({
        title: "Oh no! Something went wrong.",
        description: "There was a problem saving your score. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
      router.push('/');
    }
  };


  const toggleMusicHandler = () => {
    const newMusicState = !isMusicOn;
    setIsMusicOn(newMusicState);
    toggleMusic(newMusicState);
  };
  
  const handleSentenceCompletionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleAnswer(inputValue);
  };

  if (!playerInfo?.name) {
    return null;
  }
  
  const renderFeedbackDialog = () => {
    if (!feedback || !currentQuestion) return null;

    const isCorrect = feedback === 'correct';
    const answerToShow = selectedAnswer === 'timeout' ? 'No answer' : selectedAnswer;

    return (
      <AlertDialog open={!!feedback} onOpenChange={(open) => !open && handleContinue()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {isCorrect ? (
                <CheckCircle2 className="h-6 w-6 text-green-500" />
              ) : (
                <XCircle className="h-6 w-6 text-destructive" />
              )}
              {isCorrect ? 'Excellent!' : 'Incorrect'}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-4 pt-4 text-left">
               <div className="text-foreground p-3 bg-muted rounded-md">
                 <p className="font-semibold mb-2">Your question was:</p>
                 <p>{currentQuestion.text}</p>
               </div>
               <div className="text-foreground p-3 bg-muted rounded-md">
                 <p className="font-semibold mb-2">Your answer:</p>
                 <p>"{answerToShow}"</p>
               </div>
              {!isCorrect && (
                <div className="text-foreground p-3 bg-green-500/10 rounded-md">
                  <p className="font-semibold text-green-700 dark:text-green-400 mb-2">The correct answer is:</p>
                  <p>"{currentQuestion.correctAnswer}"</p>
                </div>
              )}
              {currentQuestion.explanation && (
                 <div>
                   <span className="font-semibold text-foreground">Explanation:</span> {currentQuestion.explanation}
                 </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={handleContinue}>
              Continue <ChevronRight className="ml-2 h-4 w-4" />
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center text-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <h2 className="text-2xl font-headline">Preparing Your Game...</h2>
        </div>
      );
    }
    
    switch (gameState) {
      case 'playing':
        const isTimed = currentQuestion?.type === 'sentence-completion' && playerInfo.difficulty === 'hard';
        const isFullSentenceCompletion = playerInfo.difficulty === 'hard' && currentQuestion?.type === 'sentence-completion';
        return (
          <Card className={cn(
            "w-full max-w-2xl transition-all duration-300"
          )}>
            <CardHeader>
              <div className="flex justify-between items-center mb-4">
                <CardTitle className="font-headline text-2xl">
                  {`Question: ${questionIndex + 1}/${QUESTIONS_PER_LEVEL}`}
                </CardTitle>
                <div className="flex items-center gap-2 font-mono text-lg font-bold text-primary">
                  <Star className="w-5 h-5 fill-primary" /> {score}
                </div>
              </div>
            </CardHeader>
            {currentQuestion ? (
              <CardContent className="flex flex-col items-center text-center">
                {isTimed && !feedback && (
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
                {currentQuestion.type === 'sentence-completion' ? (
                  <form onSubmit={handleSentenceCompletionSubmit} className="w-full max-w-lg flex flex-col gap-2">
                    {isFullSentenceCompletion ? (
                        <Textarea 
                          value={inputValue}
                          onChange={(e) => setInputValue(e.target.value)}
                          placeholder="Write the full sentence here..."
                          disabled={!!feedback}
                          autoFocus
                          rows={3}
                          className="text-base"
                        />
                    ) : (
                        <Input 
                          type="text"
                          value={inputValue}
                          onChange={(e) => setInputValue(e.target.value)}
                          placeholder="Type your answer"
                          disabled={!!feedback}
                          autoFocus
                        />
                    )}
                    <Button type="submit" disabled={!inputValue.trim() || !!feedback}>Submit</Button>
                  </form>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                    {currentQuestion.options.map(option => (
                      <Button
                        key={option}
                        variant="outline"
                        size="lg"
                        className={cn(
                          "h-auto py-4 text-base transition-colors duration-300",
                          selectedAnswer === option && (feedback === 'correct' ? 'bg-green-500/20 text-green-700 dark:text-green-400 border-green-500' : 'bg-destructive/20 text-destructive-foreground border-destructive')
                        )}
                        onClick={() => handleAnswer(option)}
                        disabled={!!feedback}
                      >
                        {option}
                      </Button>
                    ))}
                  </div>
                )}
              </CardContent>
            ) : <p>Loading questions...</p>}
          </Card>
        );
      case 'finished':
        return (
          <Card className="w-full max-w-md text-center">
            <CardHeader>
              <CardTitle className="font-headline text-3xl">Challenge Complete!</CardTitle>
              <div className="flex items-center justify-center gap-2 text-yellow-500 font-semibold">
                <Trophy className="w-6 h-6"/> Great job!
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
                <p className="text-4xl font-bold text-primary">{score}</p>
                <p className="text-muted-foreground">You've finished the game. Save your score to the global leaderboard!</p>
              <div className="flex gap-4">
                <Button onClick={() => router.push('/')} variant="outline" className="w-full">
                  <Home className="mr-2 h-4 w-4"/> Main Menu
                </Button>
                <Button onClick={handleFinishGame} className="w-full" disabled={isSaving}>
                  {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Award className="mr-2 h-4 w-4" />}
                  Save Score & Exit
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
      {renderFeedbackDialog()}
    </div>
  );
}
