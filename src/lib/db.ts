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

export function getAllPlayers(): string[] {
  const rows = db.prepare("SELECT name FROM players ORDER BY id").all() as { name: string }[];
  return rows.map((r) => r.name);
}

export function addPlayer(name: string): string {
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
