/**
 * Seed script — inserts sample data for development.
 * Usage: pnpm db:seed
 */
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { randomUUID } from "crypto";
import * as schema from "../src/db/schema";
import path from "path";
import fs from "fs";

const DB_PATH = path.resolve(process.cwd(), "data", "e-web-board.db");
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const sqlite = new Database(DB_PATH);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

const db = drizzle(sqlite, { schema });

const boardId = randomUUID();

db.insert(schema.boards)
  .values({
    id: boardId,
    name: "サンプルボード",
    templateId: "simple",
    config: JSON.stringify({
      slideInterval: 5,
      tickerSpeed: 60,
      backgroundColor: "#000000",
      textColor: "#ffffff",
    }),
    isActive: true,
  })
  .run();

// サンプル画像（プレースホルダー画像を使用）
const sampleImages = [
  "https://picsum.photos/seed/board1/1920/1080",
  "https://picsum.photos/seed/board2/1920/1080",
  "https://picsum.photos/seed/board3/1920/1080",
];

sampleImages.forEach((url, i) => {
  db.insert(schema.mediaItems)
    .values({
      id: randomUUID(),
      boardId,
      type: "image",
      filePath: url,
      displayOrder: i,
      duration: 5,
    })
    .run();
});

// サンプルメッセージ
const sampleMessages = [
  "本日の受付は 17:00 までです",
  "館内では静かにお願いします",
  "Wi-Fi パスワード: guest1234",
];

sampleMessages.forEach((content, i) => {
  db.insert(schema.messages)
    .values({
      id: randomUUID(),
      boardId,
      content,
      priority: i,
    })
    .run();
});

console.log(`✅ Seed complete — board ID: ${boardId}`);
console.log(`   Open http://localhost:3000/board/${boardId}`);

sqlite.close();
