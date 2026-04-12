/**
 * Lightweight migration runner for Docker container startup.
 * Reads drizzle migration SQL files and applies them using better-sqlite3.
 * This avoids needing drizzle-kit in the production image.
 */
const Database = require("better-sqlite3");
const fs = require("fs");
const path = require("path");

const DB_DIR = path.resolve(process.cwd(), "data");
const DB_PATH = path.join(DB_DIR, "e-web-board.db");
const MIGRATIONS_DIR = path.resolve(process.cwd(), "drizzle");
const JOURNAL_PATH = path.join(MIGRATIONS_DIR, "meta", "_journal.json");

// Ensure data directory exists
fs.mkdirSync(DB_DIR, { recursive: true });

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// Create migration tracking table
db.exec(`
  CREATE TABLE IF NOT EXISTS __drizzle_migrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    hash TEXT NOT NULL,
    created_at NUMERIC
  )
`);

// Read journal
if (!fs.existsSync(JOURNAL_PATH)) {
  console.log("[migrate] No migration journal found, skipping.");
  db.close();
  process.exit(0);
}

const journal = JSON.parse(fs.readFileSync(JOURNAL_PATH, "utf-8"));
const applied = new Set(
  db
    .prepare("SELECT hash FROM __drizzle_migrations")
    .all()
    .map((row) => row.hash),
);

let count = 0;
for (const entry of journal.entries) {
  if (applied.has(entry.tag)) continue;

  const sqlPath = path.join(MIGRATIONS_DIR, `${entry.tag}.sql`);
  if (!fs.existsSync(sqlPath)) {
    console.error(`[migrate] Migration file not found: ${sqlPath}`);
    process.exit(1);
  }

  const sql = fs.readFileSync(sqlPath, "utf-8");
  // Split by drizzle statement breakpoint
  const statements = sql
    .split("--> statement-breakpoint")
    .map((s) => s.trim())
    .filter(Boolean);

  const migrate = db.transaction(() => {
    for (const stmt of statements) {
      db.exec(stmt);
    }
    db.prepare(
      "INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)",
    ).run(entry.tag, Date.now());
  });

  migrate();
  count++;
  console.log(`[migrate] Applied: ${entry.tag}`);
}

if (count === 0) {
  console.log("[migrate] Database is up to date.");
} else {
  console.log(`[migrate] Applied ${count} migration(s).`);
}

db.close();
