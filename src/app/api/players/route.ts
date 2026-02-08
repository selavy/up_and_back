import { NextResponse } from "next/server";
import { getAllPlayers, addPlayer, isGameStarted } from "@/lib/db";

export function GET() {
  return NextResponse.json({ players: getAllPlayers() });
}

export async function POST(request: Request) {
  if (isGameStarted()) {
    return NextResponse.json({ error: "Game already started" }, { status: 403 });
  }

  const body = await request.json();
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  const actualName = addPlayer(name);
  if (!actualName) {
    return NextResponse.json({ error: "Game already started" }, { status: 403 });
  }
  return NextResponse.json({ name: actualName, players: getAllPlayers() });
}
