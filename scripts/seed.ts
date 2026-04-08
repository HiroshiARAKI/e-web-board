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
console.log(`   Open http://localhost:3000/${boardId}`);

// --- Photo-Clock Board ---
const photoClockId = randomUUID();

db.insert(schema.boards)
  .values({
    id: photoClockId,
    name: "フォトクロック サンプル",
    templateId: "photo-clock",
    config: JSON.stringify({
      slideInterval: 8,
      clockPosition: "bottom-right",
      clockFontSize: "text-5xl",
      clockColor: "#ffffff",
      clockBgOpacity: 0.5,
      is24Hour: true,
    }),
    isActive: true,
  })
  .run();

sampleImages.forEach((url, i) => {
  db.insert(schema.mediaItems)
    .values({
      id: randomUUID(),
      boardId: photoClockId,
      type: "image",
      filePath: url,
      displayOrder: i,
      duration: 8,
    })
    .run();
});

console.log(`✅ Photo-Clock board ID: ${photoClockId}`);
console.log(`   Open http://localhost:3000/${photoClockId}`);

// --- Retro Board ---
const retroBoardId = randomUUID();

db.insert(schema.boards)
  .values({
    id: retroBoardId,
    name: "レトロ掲示板 サンプル",
    templateId: "retro",
    config: JSON.stringify({
      displayColor: "green",
      rows: 5,
      flipSpeed: 0.08,
      switchInterval: 5,
    }),
    isActive: true,
  })
  .run();

const retroMessages = [
  "1番線  東京行き  10:15 発  定刻",
  "2番線  大阪行き  10:32 発  定刻",
  "3番線  名古屋行き  10:45 発  約5分遅れ",
  "4番線  博多行き  11:00 発  定刻",
  "5番線  仙台行き  11:15 発  定刻",
  "6番線  新潟行き  11:30 発  定刻",
  "7番線  広島行き  11:45 発  運休",
];

retroMessages.forEach((content, i) => {
  db.insert(schema.messages)
    .values({
      id: randomUUID(),
      boardId: retroBoardId,
      content,
      priority: retroMessages.length - i,
    })
    .run();
});

console.log(`✅ Retro board ID: ${retroBoardId}`);
console.log(`   Open http://localhost:3000/${retroBoardId}`);

sqlite.close();
