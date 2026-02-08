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
    current_round INTEGER NOT NULL DEFAULT 0
  )
`);
db.exec(`INSERT OR IGNORE INTO game_state (id, started, current_round) VALUES (1, 0, 0)`);

// Migrate: add current_round if table existed before this column was added
const columns = db.prepare("PRAGMA table_info(game_state)").all() as { name: string }[];
if (!columns.some((c) => c.name === "current_round")) {
  db.exec("ALTER TABLE game_state ADD COLUMN current_round INTEGER NOT NULL DEFAULT 0");
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

export function startGame(): void {
  db.prepare("UPDATE game_state SET started = 1, current_round = 1 WHERE id = 1").run();
}

export function endGame(): void {
  db.prepare("UPDATE game_state SET started = 0, current_round = 0 WHERE id = 1").run();
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
