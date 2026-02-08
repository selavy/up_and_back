import { NextRequest, NextResponse } from "next/server";
import { isGameStarted, startGame, endGame, getCurrentRound, getPlayerCards, getTrumpCard, getDealerIndex, getAllPlayers } from "@/lib/db";

export function GET(request: NextRequest) {
  const started = isGameStarted();
  const currentRound = getCurrentRound();
  const trumpCard = started ? getTrumpCard() : null;
  const trumpSuit = trumpCard ? trumpCard.slice(-1) : null;

  const player = request.nextUrl.searchParams.get("player");
  const playerCards = player && started ? getPlayerCards(player) : [];

  let dealerIndex: number | null = null;
  if (started) {
    const players = getAllPlayers();
    if (players.length > 0) {
      const baseDealerIndex = getDealerIndex();
      dealerIndex = (baseDealerIndex + currentRound - 1) % players.length;
    }
  }

  return NextResponse.json({ started, currentRound, trumpCard, trumpSuit, playerCards, dealerIndex });
}

export function POST() {
  startGame();
  return NextResponse.json({ started: true, currentRound: 1 });
}

export function DELETE() {
  endGame();
  return NextResponse.json({ started: false, currentRound: 0 });
}
