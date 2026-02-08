"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function GamePage() {
  const [playerName, setPlayerName] = useState<string | null>(null);
  const [players, setPlayers] = useState<string[]>([]);
  const [gameStarted, setGameStarted] = useState(false);
  const [currentRound, setCurrentRound] = useState(0);
  const router = useRouter();

  useEffect(() => {
    const stored = localStorage.getItem("playerName");
    if (!stored) {
      router.replace("/");
      return;
    }
    setPlayerName(stored);

    async function poll() {
      const [playersRes, gameRes] = await Promise.all([
        fetch("/api/players"),
        fetch("/api/game"),
      ]);
      const playersData = await playersRes.json();
      const gameData = await gameRes.json();
      setPlayers(playersData.players);
      setGameStarted(gameData.started);
      setCurrentRound(gameData.currentRound);
    }

    poll();
    const interval = setInterval(poll, 5000);
    return () => clearInterval(interval);
  }, [router]);

  async function handleStartGame() {
    const res = await fetch("/api/game", { method: "POST" });
    const data = await res.json();
    setGameStarted(true);
    setCurrentRound(data.currentRound);
  }

  async function handleEndGame() {
    await fetch("/api/game", { method: "DELETE" });
    setGameStarted(false);
    setPlayers([]);
    localStorage.removeItem("playerName");
    router.replace("/");
  }

  const maxCards =
    gameStarted && players.length > 0
      ? Math.min(13, Math.floor(51 / players.length))
      : 0;

  const totalRounds = maxCards * 2;

  if (!playerName) return null;

  return (
    <div className="flex min-h-screen flex-col items-center gap-6 p-6">
      {gameStarted && maxCards > 0 && (
        <div className="flex flex-wrap justify-center gap-2">
          {Array.from({ length: maxCards }, (_, i) => (
            <div
              key={i}
              className="flex h-24 w-16 items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/50 text-xs text-muted-foreground"
            >
              {i + 1}
            </div>
          ))}
        </div>
      )}

      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl">Up and Back</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <p className="text-center text-lg text-muted-foreground">
            Welcome, <span className="font-semibold text-foreground">{playerName}</span>!
          </p>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">#</TableHead>
                <TableHead>Player</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {players.map((name, i) => (
                <TableRow key={name}>
                  <TableCell>{i + 1}</TableCell>
                  <TableCell>
                    {name}
                    {name === playerName && (
                      <span className="ml-2 text-xs text-muted-foreground">(you)</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {gameStarted ? (
            <div className="flex flex-col gap-3">
              <p className="text-center text-sm font-medium text-green-600">
                Round {currentRound} of {totalRounds}
              </p>
              <Button onClick={handleEndGame} variant="destructive" className="w-full">
                End Game
              </Button>
            </div>
          ) : (
            <Button onClick={handleStartGame} className="w-full">
              Start Game
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
