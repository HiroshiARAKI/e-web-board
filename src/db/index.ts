// Copyright 2026 Hiroshi Araki (https://hiroshi.araki.tech)
// SPDX-License-Identifier: Apache-2.0
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import path from "path";
import fs from "fs";

const DB_PATH = path.resolve(process.cwd(), "data", "e-web-board.db");

type DbInstance = ReturnType<typeof drizzle<typeof schema>>;

let _db: DbInstance | undefined;

function initDb(): DbInstance {
  if (!_db) {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    const sqlite = new Database(DB_PATH);
    sqlite.pragma("journal_mode = WAL");
    sqlite.pragma("busy_timeout = 5000");
    sqlite.pragma("foreign_keys = ON");
    _db = drizzle(sqlite, { schema });
  }
  return _db;
}

// Lazy proxy: DB connection is established on first access, not at import time.
// This prevents SQLITE_BUSY errors when Next.js build workers evaluate modules concurrently.
export const db: DbInstance = new Proxy({} as DbInstance, {
  get(_, prop) {
    return (initDb() as never)[prop];
  },
});
