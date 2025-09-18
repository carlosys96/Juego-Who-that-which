'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import type { PlayerSession } from '@/lib/types';
import { questions as allQuestions } from '@/lib/questions';
import { Download, Lock, CheckCircle2, XCircle, LogIn, Loader2 } from 'lucide-react';
import { RelatixLogo } from './icons';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { db } from '@/lib/firebase';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';

const ADMIN_PASSWORD = '270219';

const questionsMap = new Map(allQuestions.map(q => [q.id, q.text]));

export default function AdminPanel() {
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState('');
  const [playerSessions, setPlayerSessions] = useState<PlayerSession[]>([]);
  const [loading, setLoading] = useState(true);

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
          const sessions = querySnapshot.docs.map(doc => doc.data() as PlayerSession);
          setPlayerSessions(sessions);
        } catch (err) {
          console.error("Error fetching sessions: ", err);
          setError("Could not load player data from the database.");
        } finally {
          setLoading(false);
        }
      };
      fetchSessions();
    }
  }, [isAuthenticated]);

  const downloadCSV = () => {
    const headers = ['PlayerName', 'PlayerAvatar', 'FinalScore', 'Date', 'QuestionID', 'QuestionText', 'Correct', 'ChosenAnswer'];
    let csvContent = headers.join(',') + '\n';

    playerSessions.forEach(session => {
      if (session.performance && session.performance.length > 0) {
        session.performance.forEach(perf => {
          const questionText = questionsMap.get(perf.questionId) || 'Question not found';
          const row = [
            session.name,
            session.avatar,
            session.score,
            session.date,
            perf.questionId,
            `"${questionText.replace(/"/g, '""')}"`,
            perf.correct,
            `"${perf.chosenAnswer.replace(/"/g, '""')}"`
          ].join(',');
          csvContent += row + '\n';
        });
      } else {
        const row = [session.name, session.avatar, session.score, session.date, '', '', '', ''].join(',');
        csvContent += row + '\n';
      }
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', 'relatix_player_data.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

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
        <Button onClick={downloadCSV} disabled={playerSessions.length === 0}>
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
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : playerSessions.length > 0 ? (
          <Accordion type="multiple" className="w-full">
            {playerSessions.map((session, index) => (
              <AccordionItem value={`item-${index}`} key={index}>
                <AccordionTrigger>
                  <div className="flex items-center gap-4 w-full pr-4">
                    <Avatar>
                      <AvatarImage src={session.avatar} />
                      <AvatarFallback>{session.name.slice(0, 2)}</AvatarFallback>
                    </Avatar>
                    <span className="font-semibold flex-1 text-left">{session.name}</span>
                    <span className="text-sm text-muted-foreground">Score: {session.score}</span>
                    <span className="text-sm text-muted-foreground hidden md:inline-block">Date: {new Date(session.date).toLocaleDateString()}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  {session.performance && session.performance.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Question</TableHead>
                          <TableHead>Chosen Answer</TableHead>
                          <TableHead className="text-right">Result</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {session.performance.map((perf, perfIndex) => (
                          <TableRow key={perfIndex}>
                            <TableCell className="font-medium">{questionsMap.get(perf.questionId) || perf.questionId}</TableCell>
                            <TableCell>"{perf.chosenAnswer}"</TableCell>
                            <TableCell className="text-right">
                              {perf.correct ? (
                                <CheckCircle2 className="h-5 w-5 text-green-500 inline" />
                              ) : (
                                <XCircle className="h-5 w-5 text-destructive inline" />
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-muted-foreground text-center py-4">No detailed performance data for this session.</p>
                  )}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              No player data has been recorded yet.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
