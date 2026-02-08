import { NextResponse } from "next/server";
import { isGameStarted, startGame, endGame } from "@/lib/db";

export function GET() {
  return NextResponse.json({ started: isGameStarted() });
}

export function POST() {
  startGame();
  return NextResponse.json({ started: true });
}

export function DELETE() {
  endGame();
  return NextResponse.json({ started: false });
}
