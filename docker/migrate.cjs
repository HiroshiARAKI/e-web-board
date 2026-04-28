// Copyright 2026 Hiroshi Araki (https://hiroshi.araki.tech)
// SPDX-License-Identifier: Apache-2.0
/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Lightweight migration runner for Docker container startup.
 * Reads drizzle migration SQL files and applies them using PostgreSQL.
 */
const { Client } = require("pg");
const fs = require("fs");
const path = require("path");

const MIGRATIONS_DIR = path.resolve(process.cwd(), "drizzle");
const JOURNAL_PATH = path.join(MIGRATIONS_DIR, "meta", "_journal.json");
const DEFAULT_DATABASE_URL =
  "postgresql://postgres:postgres@127.0.0.1:5432/keinage";
const INITIAL_APP_TABLES = [
  "auth_sessions",
  "boards",
  "media_items",
  "messages",
  "pin_attempts",
  "pin_reset_tokens",
  "settings",
  "users",
];

function readDatabaseUrlFromDotEnv() {
  const envPath = path.resolve(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return null;

  const lines = fs.readFileSync(envPath, "utf-8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    if (!trimmed.startsWith("DATABASE_URL=")) continue;

    const value = trimmed.slice("DATABASE_URL=".length).trim();
    if (!value) return null;

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      return value.slice(1, -1);
    }

    return value;
  }

  return null;
}

const DATABASE_URL =
  process.env.DATABASE_URL ||
  readDatabaseUrlFromDotEnv() ||
  DEFAULT_DATABASE_URL;

if (!DATABASE_URL) {
  console.error("[migrate] DATABASE_URL is required.");
  process.exit(1);
}

async function backfillInitialMigrationIfNeeded(client, journal, applied) {
  if (applied.size > 0 || journal.entries.length === 0) return;

  const [initialEntry] = journal.entries;
  if (!initialEntry) return;

  const existingTablesResult = await client.query(
    `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = ANY($1::text[])
    `,
    [INITIAL_APP_TABLES],
  );

  const existingTables = new Set(
    existingTablesResult.rows.map((row) => row.table_name),
  );

  const hasFullInitialSchema = INITIAL_APP_TABLES.every((tableName) =>
    existingTables.has(tableName),
  );

  if (!hasFullInitialSchema) return;

  await client.query(
    "INSERT INTO __drizzle_migrations (hash, created_at) VALUES ($1, $2)",
    [initialEntry.tag, Date.now()],
  );
  applied.add(initialEntry.tag);
  console.log(
    `[migrate] Backfilled applied migration: ${initialEntry.tag} (schema already exists).`,
  );
}

async function main() {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS __drizzle_migrations (
        id SERIAL PRIMARY KEY,
        hash TEXT NOT NULL,
        created_at BIGINT
      )
    `);

    if (!fs.existsSync(JOURNAL_PATH)) {
      console.log("[migrate] No migration journal found, skipping.");
      return;
    }

    const journal = JSON.parse(fs.readFileSync(JOURNAL_PATH, "utf-8"));
    const appliedResult = await client.query("SELECT hash FROM __drizzle_migrations");
    const applied = new Set(appliedResult.rows.map((row) => row.hash));

  await backfillInitialMigrationIfNeeded(client, journal, applied);

    let count = 0;
    for (const entry of journal.entries) {
      if (applied.has(entry.tag)) continue;

      const sqlPath = path.join(MIGRATIONS_DIR, `${entry.tag}.sql`);
      if (!fs.existsSync(sqlPath)) {
        console.error(`[migrate] Migration file not found: ${sqlPath}`);
        process.exit(1);
      }

      const sql = fs.readFileSync(sqlPath, "utf-8");
      const statements = sql
        .split("--> statement-breakpoint")
        .map((statement) => statement.trim())
        .filter(Boolean);

      try {
        await client.query("BEGIN");

        for (const statement of statements) {
          await client.query(statement);
        }

        await client.query(
          "INSERT INTO __drizzle_migrations (hash, created_at) VALUES ($1, $2)",
          [entry.tag, Date.now()],
        );
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }

      count++;
      console.log(`[migrate] Applied: ${entry.tag}`);
    }

    if (count === 0) {
      console.log("[migrate] Database is up to date.");
    } else {
      console.log(`[migrate] Applied ${count} migration(s).`);
    }
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error("[migrate] Failed:", error);
  process.exit(1);
});
