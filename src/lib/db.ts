import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const dataDir = path.join(process.cwd(), "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(path.join(dataDir, "game.db"));
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS players (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    joined_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS game_state (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    started INTEGER NOT NULL DEFAULT 0,
    current_round INTEGER NOT NULL DEFAULT 0,
    deck TEXT NOT NULL DEFAULT '[]',
    trump_card TEXT DEFAULT NULL
  )
`);
db.exec(`INSERT OR IGNORE INTO game_state (id, started, current_round) VALUES (1, 0, 0)`);

db.exec(`
  CREATE TABLE IF NOT EXISTS player_cards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    round INTEGER NOT NULL,
    player_name TEXT NOT NULL,
    card TEXT NOT NULL,
    UNIQUE(round, player_name, card)
  )
`);

// Migrate: add columns if table existed before they were added
const columns = db.prepare("PRAGMA table_info(game_state)").all() as { name: string }[];
if (!columns.some((c) => c.name === "current_round")) {
  db.exec("ALTER TABLE game_state ADD COLUMN current_round INTEGER NOT NULL DEFAULT 0");
}
if (!columns.some((c) => c.name === "deck")) {
  db.exec("ALTER TABLE game_state ADD COLUMN deck TEXT NOT NULL DEFAULT '[]'");
}
if (!columns.some((c) => c.name === "trump_card")) {
  db.exec("ALTER TABLE game_state ADD COLUMN trump_card TEXT DEFAULT NULL");
}

export function getAllPlayers(): string[] {
  const rows = db.prepare("SELECT name FROM players ORDER BY id").all() as { name: string }[];
  return rows.map((r) => r.name);
}

export function isGameStarted(): boolean {
  const row = db.prepare("SELECT started FROM game_state WHERE id = 1").get() as { started: number };
  return row.started === 1;
}

export function getCurrentRound(): number {
  const row = db.prepare("SELECT current_round FROM game_state WHERE id = 1").get() as { current_round: number };
  return row.current_round;
}

export function setCurrentRound(round: number): void {
  db.prepare("UPDATE game_state SET current_round = ? WHERE id = 1").run(round);
}

function createDeck(): string[] {
  const ranks = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
  const suits = ["H", "D", "C", "S"];
  const deck: string[] = [];
  for (const r of ranks) {
    for (const s of suits) {
      deck.push(r + s);
    }
  }
  return deck;
}

function shuffleDeck(deck: string[]): string[] {
  const a = [...deck];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function dealRound(round: number): void {
  const row = db.prepare("SELECT deck FROM game_state WHERE id = 1").get() as { deck: string };
  const deck: string[] = JSON.parse(row.deck);
  const players = getAllPlayers();

  const insertCard = db.prepare("INSERT INTO player_cards (round, player_name, card) VALUES (?, ?, ?)");

  for (const player of players) {
    const card = deck.pop()!;
    insertCard.run(round, player, card);
  }

  if (round === 1) {
    const trumpCard = deck.pop()!;
    db.prepare("UPDATE game_state SET deck = ?, trump_card = ? WHERE id = 1").run(JSON.stringify(deck), trumpCard);
  } else {
    db.prepare("UPDATE game_state SET deck = ? WHERE id = 1").run(JSON.stringify(deck));
  }
}

export function getPlayerCards(playerName: string): string[] {
  const rows = db.prepare("SELECT card FROM player_cards WHERE player_name = ? ORDER BY round").all(playerName) as { card: string }[];
  return rows.map((r) => r.card);
}

export function getTrumpCard(): string | null {
  const row = db.prepare("SELECT trump_card FROM game_state WHERE id = 1").get() as { trump_card: string | null };
  return row.trump_card;
}

export function startGame(): void {
  const deck = shuffleDeck(createDeck());
  db.prepare("UPDATE game_state SET started = 1, current_round = 1, deck = ?, trump_card = NULL WHERE id = 1").run(JSON.stringify(deck));
  dealRound(1);
}

export function endGame(): void {
  db.prepare("UPDATE game_state SET started = 0, current_round = 0, deck = '[]', trump_card = NULL WHERE id = 1").run();
  db.prepare("DELETE FROM player_cards").run();
  db.prepare("DELETE FROM players").run();
}

export function addPlayer(name: string): string | null {
  if (isGameStarted()) return null;

  const exists = db.prepare("SELECT 1 FROM players WHERE name = ?");
  let candidate = name;
  let counter = 2;
  while (exists.get(candidate)) {
    candidate = `${name} ${counter}`;
    counter++;
  }
  db.prepare("INSERT INTO players (name) VALUES (?)").run(candidate);
  return candidate;
}
