import { NextResponse } from "next/server";
import { getAllPlayers, addPlayer } from "@/lib/db";

export function GET() {
  return NextResponse.json({ players: getAllPlayers() });
}

export async function POST(request: Request) {
  const body = await request.json();
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  const actualName = addPlayer(name);
  return NextResponse.json({ name: actualName, players: getAllPlayers() });
}
