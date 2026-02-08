import { NextRequest, NextResponse } from "next/server";
import { isGameStarted, startGame, endGame, getCurrentRound, getPlayerCards, getTrumpCard } from "@/lib/db";

export function GET(request: NextRequest) {
  const started = isGameStarted();
  const currentRound = getCurrentRound();
  const trumpCard = started ? getTrumpCard() : null;
  const trumpSuit = trumpCard ? trumpCard.slice(-1) : null;

  const player = request.nextUrl.searchParams.get("player");
  const playerCards = player && started ? getPlayerCards(player) : [];

  return NextResponse.json({ started, currentRound, trumpCard, trumpSuit, playerCards });
}

export function POST() {
  startGame();
  return NextResponse.json({ started: true, currentRound: 1 });
}

export function DELETE() {
  endGame();
  return NextResponse.json({ started: false, currentRound: 0 });
}
