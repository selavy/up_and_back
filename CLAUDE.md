# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — start development server (localhost:3000)
- `npm run build` — production build
- `npm run lint` — run ESLint
- No test framework is configured

## Architecture

This is a multiplayer card game called "Up and Back" built with Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, and shadcn/ui (new-york style).

### Game Overview

A trick-taking card game where rounds go "up" (1 card, 2 cards, ..., max) then "back down." Players join via a lobby, the game starts, cards are dealt, players bid on how many tricks they'll win, then play cards. The dealer rotates each round.

### Key Files

- `src/lib/db.ts` — SQLite database (better-sqlite3) with all game logic: deck creation/shuffling, dealing, bidding, player management. The DB file lives at `data/game.db`. **All state is cleared on server restart.**
- `src/app/page.tsx` — Lobby/join page (client component). Players enter their name and join; polls `/api/game` every 5s.
- `src/app/game/page.tsx` — Main game UI (client component). Shows player cards, trump card, bidding interface, and playing phase. Polls `/api/players`, `/api/game`, and `/api/bids` every 2s. Player identity stored in `localStorage`.
- `src/app/api/game/route.ts` — GET (game state), POST (start game), DELETE (end game)
- `src/app/api/players/route.ts` — GET (list players), POST (join game)
- `src/app/api/bids/route.ts` — GET (bids for round, bidding order), POST (place bid)

### Database Schema (SQLite)

Four tables: `players`, `game_state` (singleton row, id=1), `player_cards`, `player_bids`. Cards are stored as strings like `"10H"`, `"AS"` (rank + suit letter: H/D/C/S).

### UI

Uses shadcn/ui components in `src/components/ui/` (Button, Card, Input, Table). Add new components with `npx shadcn add <component>`.
