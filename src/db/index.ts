// Copyright 2026 Hiroshi Araki (https://hiroshi.araki.tech)
// SPDX-License-Identifier: Apache-2.0
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const DATABASE_URL =
  process.env.DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:5432/keinage";

type DbInstance = ReturnType<typeof drizzle<typeof schema>>;
type GlobalDbState = {
  __keinageDbPool?: Pool;
  __keinageDb?: DbInstance;
};

const globalDbState = globalThis as typeof globalThis & GlobalDbState;

function initDb(): DbInstance {
  if (!globalDbState.__keinageDbPool) {
    globalDbState.__keinageDbPool = new Pool({
      connectionString: DATABASE_URL,
    });
  }

  if (!globalDbState.__keinageDb) {
    globalDbState.__keinageDb = drizzle(globalDbState.__keinageDbPool, {
      schema,
    });
  }

  return globalDbState.__keinageDb;
}

// Lazy proxy: DB connection is established on first access, not at import time.
// This keeps build-time module evaluation from opening connections before they are needed.
export const db: DbInstance = new Proxy({} as DbInstance, {
  get(_, prop) {
    return (initDb() as never)[prop];
  },
});
