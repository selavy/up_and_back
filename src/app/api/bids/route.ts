import { NextRequest, NextResponse } from "next/server";
import {
  isGameStarted,
  getCurrentRound,
  getAllPlayers,
  getDealerIndex,
  getCardsInRound,
  getBidsForRound,
  placeBid,
} from "@/lib/db";

export function GET(request: NextRequest) {
  const roundParam = request.nextUrl.searchParams.get("round");
  const round = roundParam ? parseInt(roundParam, 10) : 0;

  const players = getAllPlayers();
  const bids = getBidsForRound(round);
  const cardsInRound = players.length > 0 ? getCardsInRound(round, players.length) : 0;

  const baseDealerIndex = getDealerIndex();
  const dealerIndex = (baseDealerIndex + round - 1) % players.length;

  const biddingOrder: string[] = [];
  for (let i = 1; i <= players.length; i++) {
    biddingOrder.push(players[(dealerIndex + i) % players.length]);
  }

  const currentBidder = biddingOrder.find((p) => !(p in bids)) ?? null;
  const biddingComplete = biddingOrder.every((p) => p in bids);

  return NextResponse.json({ bids, biddingOrder, currentBidder, cardsInRound, biddingComplete });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { player, round, bid } = body;

  if (!isGameStarted()) {
    return NextResponse.json({ error: "Game not started" }, { status: 400 });
  }

  const currentRound = getCurrentRound();
  if (round !== currentRound) {
    return NextResponse.json({ error: "Round mismatch" }, { status: 400 });
  }

  const players = getAllPlayers();
  const cardsInRound = getCardsInRound(round, players.length);
  const bids = getBidsForRound(round);

  const baseDealerIndex = getDealerIndex();
  const dealerIndex = (baseDealerIndex + round - 1) % players.length;

  const biddingOrder: string[] = [];
  for (let i = 1; i <= players.length; i++) {
    biddingOrder.push(players[(dealerIndex + i) % players.length]);
  }

  const currentBidder = biddingOrder.find((p) => !(p in bids)) ?? null;

  if (player !== currentBidder) {
    return NextResponse.json({ error: "Not your turn to bid" }, { status: 400 });
  }

  if (typeof bid !== "number" || !Number.isInteger(bid) || bid < 0 || bid > cardsInRound) {
    return NextResponse.json({ error: `Bid must be an integer between 0 and ${cardsInRound}` }, { status: 400 });
  }

  placeBid(round, player, bid);
  return NextResponse.json({ success: true });
}
