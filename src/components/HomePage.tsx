'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import useLocalStorage from '@/hooks/use-local-storage';
import type { PlayerScore, GameDifficulty, PlayerInfo } from '@/lib/types';
import { RelatixLogo } from './icons';
import { cn } from '@/lib/utils';
import { Trophy, Loader2 } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { db } from '@/lib/firebase';
import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore';

export default function HomePage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(PlaceHolderImages[0].imageUrl);
  const [difficulty, setDifficulty] = useState<GameDifficulty>('easy');
  const [highScores, setHighScores] = useState<PlayerScore[]>([]);
  const [loadingScores, setLoadingScores] = useState(true);
  const [, setPlayerInfo] = useLocalStorage<PlayerInfo | null>('relatix-player', null);

  useEffect(() => {
    const fetchHighScores = async () => {
      setLoadingScores(true);
      try {
        const highScoresCollection = collection(db, 'highscores');
        const q = query(highScoresCollection, orderBy('score', 'desc'), limit(5));
        const querySnapshot = await getDocs(q);
        const scores = querySnapshot.docs.map(doc => doc.data() as PlayerScore);
        setHighScores(scores);
      } catch (error) {
        console.error("Error fetching high scores: ", error);
      } finally {
        setLoadingScores(false);
      }
    };

    fetchHighScores();
  }, []);

  const handleStartGame = () => {
    if (name.trim()) {
      setPlayerInfo({ name: name.trim(), avatar: selectedAvatar, difficulty });
      router.push('/play');
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1">
        <div className="container mx-auto px-4 py-8 md:py-16">
          <div className="flex flex-col items-center text-center mb-12">
            <RelatixLogo className="w-24 h-24 text-primary mb-4" />
            <h1 className="text-4xl md:text-6xl font-headline font-bold tracking-tighter">
              Relatix
            </h1>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl">
              Master the use of 'that', 'who', and 'which' through a fun and interactive game. Are you ready for the challenge?
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            <Card className="flex flex-col">
              <CardHeader>
                <CardTitle>Start a New Game</CardTitle>
                <CardDescription>Enter your name and choose an avatar to begin.</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Player Name</Label>
                  <Input
                    id="name"
                    placeholder="Enter your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleStartGame()}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Choose Difficulty</Label>
                  <RadioGroup
                    defaultValue="easy"
                    className="grid grid-cols-3 gap-4"
                    onValueChange={(value: GameDifficulty) => setDifficulty(value)}
                    value={difficulty}
                  >
                    <div>
                      <RadioGroupItem value="easy" id="easy" className="peer sr-only" />
                      <Label
                        htmlFor="easy"
                        className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                      >
                        Easy
                      </Label>
                    </div>
                    <div>
                      <RadioGroupItem
                        value="medium"
                        id="medium"
                        className="peer sr-only"
                      />
                      <Label
                        htmlFor="medium"
                        className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                      >
                        Medium
                      </Label>
                    </div>
                    <div>
                      <RadioGroupItem value="hard" id="hard" className="peer sr-only" />
                      <Label
                        htmlFor="hard"
                        className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                      >
                        Hard
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
                
                <div className="space-y-2">
                  <Label>Choose Your Avatar</Label>
                  <div className="flex flex-wrap gap-4">
                    {PlaceHolderImages.map((img) => (
                      <button
                        key={img.id}
                        onClick={() => setSelectedAvatar(img.imageUrl)}
                        className={cn(
                          'rounded-full ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
                          selectedAvatar === img.imageUrl && 'ring-2 ring-primary'
                        )}
                        aria-label={`Select ${img.description}`}
                      >
                        <Avatar className="h-16 w-16 border-2 border-transparent hover:border-primary transition-colors">
                          <AvatarImage src={img.imageUrl} alt={img.description} data-ai-hint={img.imageHint} />
                          <AvatarFallback>{name.slice(0, 2) || 'AV'}</AvatarFallback>
                        </Avatar>
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button onClick={handleStartGame} disabled={!name.trim()} className="w-full">
                  Start Game
                </Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="text-primary" /> High Scores
                </CardTitle>
                <CardDescription>See who is at the top of the leaderboard.</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingScores ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : highScores.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[50px]">Rank</TableHead>
                        <TableHead>Player</TableHead>
                        <TableHead className="text-right">Score</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {highScores.map((player, index) => (
                        <TableRow key={`${player.name}-${player.date}`}>
                          <TableCell className="font-medium">{index + 1}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={player.avatar} />
                                <AvatarFallback>{player.name.slice(0, 2)}</AvatarFallback>
                              </Avatar>
                              <span className="font-medium">{player.name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-mono">{player.score}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    No high scores yet. Be the first!
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <footer className="py-4 text-center text-sm text-muted-foreground">
        <p>
          Built for educational purposes. &copy; {new Date().getFullYear()} Relatix.
        </p>
        <Link href="/admin" className="text-primary hover:underline">
          Teacher Panel
        </Link>
      </footer>
    </div>
  );
}
