'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Download, Lock, LogIn, Info, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { RelatixLogo } from './icons';
import { PlayerSession } from '@/lib/types';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { format } from 'date-fns';
import { questions } from '@/lib/questions';

const ADMIN_PASSWORD = '270219';

export default function AdminPanel() {
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState('');
  const [sessions, setSessions] = useState<PlayerSession[]>([]);
  const [loading, setLoading] = useState(false);

  const handleLogin = () => {
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      setError('');
    } else {
      setError('Incorrect password. Please try again.');
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      const fetchSessions = async () => {
        setLoading(true);
        try {
          const sessionsCollection = collection(db, 'sessions');
          const q = query(sessionsCollection, orderBy('date', 'desc'));
          const querySnapshot = await getDocs(q);
          const sessionsData = querySnapshot.docs.map(doc => doc.data() as PlayerSession);
          setSessions(sessionsData);
        } catch (err) {
          console.error("Error fetching sessions:", err);
          setError("Could not fetch session data. Check Firestore configuration and permissions.");
        } finally {
          setLoading(false);
        }
      };
      fetchSessions();
    }
  }, [isAuthenticated]);

  const downloadCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Player Name,Avatar URL,Score,Date,Correct,Incorrect\n";

    sessions.forEach(session => {
        const correctCount = session.performance.filter(p => p.correct).length;
        const incorrectCount = session.performance.length - correctCount;
        const date = format(new Date(session.date), 'yyyy-MM-dd HH:mm');
        csvContent += `${session.name},${session.avatar},${session.score},${date},${correctCount},${incorrectCount}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "relatix_sessions.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <RelatixLogo className="w-12 h-12 text-primary" />
            </div>
            <CardTitle>Teacher Panel</CardTitle>
            <CardDescription>Please enter the password to continue.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Password"
                  className="pl-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button onClick={handleLogin} className="w-full">
                <LogIn className="mr-2 h-4 w-4" />
                Access Panel
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-wrap justify-between items-center gap-4 mb-8">
        <h1 className="text-3xl font-headline font-bold">Teacher Dashboard</h1>
        <Button onClick={downloadCSV} disabled={sessions.length === 0}>
          <Download className="mr-2 h-4 w-4" />
          Download CSV
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Player Sessions</CardTitle>
          <CardDescription>
            Detailed performance data for each player session.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
             <div className="flex justify-center items-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
             </div>
          ) : sessions.length > 0 ? (
            <Accordion type="single" collapsible className="w-full">
              {sessions.map((session, index) => {
                const correctCount = session.performance.filter(p => p.correct).length;
                const totalCount = session.performance.length;
                const accuracy = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;
                 return (
                    <AccordionItem value={`item-${index}`} key={session.date}>
                        <AccordionTrigger>
                            <div className="flex justify-between items-center w-full pr-4">
                                <div className="flex items-center gap-4">
                                    <span className="font-mono text-muted-foreground text-sm">{format(new Date(session.date), 'MMM d, yyyy')}</span>
                                    <span className="font-semibold">{session.name}</span>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className="font-mono text-primary font-bold">Score: {session.score}</span>
                                    <span className="text-sm text-muted-foreground">{accuracy}% Accuracy</span>
                                </div>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent>
                           <ul className="space-y-4 pl-4 pt-2">
                            {session.performance.map(p => {
                                const question = questions.find(q => q.id === p.questionId);
                                if (!question) return null;

                                return (
                                <li key={p.questionId} className="flex items-start gap-3 text-sm p-3 bg-muted/50 rounded-md">
                                    {p.correct ? <CheckCircle className="h-4 w-4 text-green-500 mt-1 shrink-0" /> : <XCircle className="h-4 w-4 text-red-500 mt-1 shrink-0" />}
                                    <div className="flex-1">
                                        <p className="font-semibold mb-2">{question.text}</p>
                                        <p>Tu respuesta: <span className="font-mono p-1 bg-background rounded text-foreground">"{p.chosenAnswer}"</span></p>
                                        {!p.correct && (
                                            <p className="text-green-600 dark:text-green-400">Correcta: <span className="font-mono p-1 bg-green-500/10 rounded">"{question.correctAnswer}"</span></p>
                                        )}
                                    </div>
                                </li>
                            )})}
                           </ul>
                        </AccordionContent>
                    </AccordionItem>
                )
            })}
            </Accordion>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Info className="h-8 w-8 mx-auto mb-4 text-primary" />
              <p className="font-semibold">{error ? 'An Error Occurred' : 'No Player Data'}</p>
              <p className="text-sm">
                {error || 'No sessions have been recorded yet. Play a game to see data here.'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
