import { NextResponse } from "next/server";
import { isGameStarted, startGame, endGame, getCurrentRound } from "@/lib/db";

export function GET() {
  return NextResponse.json({ started: isGameStarted(), currentRound: getCurrentRound() });
}

export function POST() {
  startGame();
  return NextResponse.json({ started: true, currentRound: 1 });
}

export function DELETE() {
  endGame();
  return NextResponse.json({ started: false, currentRound: 0 });
}
