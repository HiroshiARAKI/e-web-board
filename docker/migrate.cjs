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
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("[migrate] DATABASE_URL is required.");
  process.exit(1);
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
