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
  const [playerCards, setPlayerCards] = useState<string[]>([]);
  const [trumpCard, setTrumpCard] = useState<string | null>(null);
  const [trumpSuit, setTrumpSuit] = useState<string | null>(null);
  const [dealerIndex, setDealerIndex] = useState<number | null>(null);

  const [bids, setBids] = useState<Record<string, number>>({});
  const [currentBidder, setCurrentBidder] = useState<string | null>(null);
  const [biddingComplete, setBiddingComplete] = useState(false);
  const [cardsInRound, setCardsInRound] = useState(0);
  const [biddingOrder, setBiddingOrder] = useState<string[]>([]);
  const [bidInput, setBidInput] = useState("");

  const router = useRouter();

  const suitSymbol: Record<string, string> = { H: "\u2665", D: "\u2666", C: "\u2663", S: "\u2660" };
  const suitColor: Record<string, string> = { H: "text-red-600", D: "text-red-600", C: "text-black", S: "text-black" };

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
        fetch(`/api/game?player=${encodeURIComponent(stored!)}`),
      ]);
      const playersData = await playersRes.json();
      const gameData = await gameRes.json();
      setPlayers(playersData.players);
      setGameStarted(gameData.started);
      setCurrentRound(gameData.currentRound);
      setPlayerCards(gameData.playerCards ?? []);
      setTrumpCard(gameData.trumpCard ?? null);
      setTrumpSuit(gameData.trumpSuit ?? null);
      setDealerIndex(gameData.dealerIndex ?? null);

      if (gameData.started && gameData.currentRound > 0) {
        const bidsRes = await fetch(`/api/bids?round=${gameData.currentRound}`);
        const bidsData = await bidsRes.json();
        setBids(bidsData.bids);
        setBiddingOrder(bidsData.biddingOrder);
        setCurrentBidder(bidsData.currentBidder);
        setBiddingComplete(bidsData.biddingComplete);
        setCardsInRound(bidsData.cardsInRound);
      }
    }

    poll();
    const interval = setInterval(poll, 2000);
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

  async function handleSubmitBid() {
    const bid = parseInt(bidInput, 10);
    if (isNaN(bid) || bid < 0 || bid > cardsInRound) return;

    const res = await fetch("/api/bids", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ player: playerName, round: currentRound, bid }),
    });
    if (res.ok) {
      setBidInput("");
      // Immediately refresh bidding state
      const bidsRes = await fetch(`/api/bids?round=${currentRound}`);
      const bidsData = await bidsRes.json();
      setBids(bidsData.bids);
      setBiddingOrder(bidsData.biddingOrder);
      setCurrentBidder(bidsData.currentBidder);
      setBiddingComplete(bidsData.biddingComplete);
      setCardsInRound(bidsData.cardsInRound);
    }
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
        <div className="flex flex-col items-center gap-3">
          <div className="flex flex-wrap justify-center gap-2">
            {Array.from({ length: maxCards }, (_, i) => {
              const card = playerCards[i];
              if (card) {
                const suit = card.slice(-1);
                const rank = card.slice(0, -1);
                return (
                  <div
                    key={i}
                    className={`flex h-24 w-16 flex-col items-center justify-center rounded-lg border-2 border-foreground/20 bg-white shadow-sm ${suitColor[suit]}`}
                  >
                    <span className="text-sm font-bold">{rank}</span>
                    <span className="text-lg">{suitSymbol[suit]}</span>
                  </div>
                );
              }
              return (
                <div
                  key={i}
                  className="flex h-24 w-16 items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/50 text-xs text-muted-foreground"
                >
                  {i + 1}
                </div>
              );
            })}
          </div>
          {trumpCard && trumpSuit && (
            <p className={`text-sm font-medium ${suitColor[trumpSuit]}`}>
              Trump: {trumpCard.slice(0, -1)}{suitSymbol[trumpSuit]} ({suitSymbol[trumpSuit]})
            </p>
          )}
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
                    {gameStarted && dealerIndex === i && (
                      <span className="ml-2 text-xs text-muted-foreground">(dealer)</span>
                    )}
                    {gameStarted && name in bids && (
                      <span className="ml-2 inline-block rounded bg-blue-100 px-1.5 py-0.5 text-xs font-medium text-blue-800">
                        Bid: {bids[name]}
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {gameStarted && currentRound > 0 && !biddingComplete && (
            <div className="flex flex-col gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
              <h3 className="text-center text-sm font-semibold text-amber-900">
                Bidding — Round {currentRound} ({cardsInRound} {cardsInRound === 1 ? "card" : "cards"})
              </h3>
              <div className="flex flex-col gap-1">
                {biddingOrder.map((name) => (
                  <div key={name} className="flex items-center justify-between text-sm">
                    <span className={name === currentBidder ? "font-semibold" : ""}>
                      {name}
                      {name === playerName && " (you)"}
                    </span>
                    <span className="text-muted-foreground">
                      {name in bids ? bids[name] : "waiting..."}
                    </span>
                  </div>
                ))}
              </div>
              {currentBidder === playerName ? (
                <div className="flex gap-2">
                  <input
                    type="number"
                    min={0}
                    max={cardsInRound}
                    value={bidInput}
                    onChange={(e) => setBidInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleSubmitBid(); }}
                    className="w-20 rounded border border-input bg-background px-2 py-1 text-sm"
                    placeholder="0"
                  />
                  <Button size="sm" onClick={handleSubmitBid}>
                    Submit Bid
                  </Button>
                </div>
              ) : (
                <p className="text-center text-sm text-muted-foreground">
                  Waiting for {currentBidder} to bid...
                </p>
              )}
            </div>
          )}

          {gameStarted && currentRound > 0 && biddingComplete && (
            <div className="flex flex-col gap-3 rounded-lg border border-green-200 bg-green-50 p-4">
              <h3 className="text-center text-sm font-semibold text-green-900">
                Bids — Round {currentRound} ({cardsInRound} {cardsInRound === 1 ? "card" : "cards"})
              </h3>
              <div className="flex flex-col gap-1">
                {biddingOrder.map((name) => (
                  <div key={name} className="flex items-center justify-between text-sm">
                    <span>{name}{name === playerName && " (you)"}</span>
                    <span className="font-medium">{bids[name]}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

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
