// Copyright 2026 Hiroshi Araki (https://hiroshi.araki.tech)
// SPDX-License-Identifier: Apache-2.0
/**
 * Seed script — inserts sample data for development.
 * Usage: pnpm db:seed
 */
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { asc, eq } from "drizzle-orm";
import * as schema from "../src/db/schema";

const DATABASE_URL =
  process.env.DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:5432/keinage";

async function main() {
  const pool = new Pool({ connectionString: DATABASE_URL });
  const db = drizzle(pool, { schema });

  let ownerUserId = (
    await db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(eq(schema.users.attribute, "owner"))
      .orderBy(asc(schema.users.createdAt))
      .limit(1)
  )[0]?.id;

  if (!ownerUserId) {
    ownerUserId = (
      await db
        .insert(schema.users)
        .values({
          userId: "seed-owner",
          email: "seed-owner@example.com",
          phoneNumber: "000-0000-0000",
          passwordHash: "seed-password-hash",
          attribute: "owner",
          role: "admin",
        })
        .returning({ id: schema.users.id })
    )[0]?.id;

    if (ownerUserId) {
      await db.insert(schema.authAccounts).values({
        userId: ownerUserId,
        provider: "credentials",
        providerAccountId: "seed-owner@example.com",
        email: "seed-owner@example.com",
      });
    }
  }

  if (!ownerUserId) {
    throw new Error("Failed to prepare an owner user for seed data");
  }

  const boardId = (
    await db
      .insert(schema.boards)
      .values({
        ownerUserId,
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
      .returning({ id: schema.boards.id })
  )[0]?.id;

  if (!boardId) {
    throw new Error("Failed to create the sample board");
  }

  // サンプル画像（プレースホルダー画像を使用）
  const sampleImages = [
    "https://picsum.photos/seed/board1/1920/1080",
    "https://picsum.photos/seed/board2/1920/1080",
    "https://picsum.photos/seed/board3/1920/1080",
  ];

  for (const [index, url] of sampleImages.entries()) {
    await db.insert(schema.mediaItems).values({
      boardId,
      type: "image",
      filePath: url,
      displayOrder: index,
      duration: 5,
    });
  }

  // サンプルメッセージ
  const sampleMessages = [
    "本日の受付は 17:00 までです",
    "館内では静かにお願いします",
    "Wi-Fi パスワード: guest1234",
  ];

  for (const [index, content] of sampleMessages.entries()) {
    await db.insert(schema.messages).values({
      boardId,
      content,
      priority: index,
    });
  }

  console.log(`✅ Seed complete — board ID: ${boardId}`);
  console.log(`   Open http://localhost:3000/${boardId}`);

  // --- Photo-Clock Board ---
  const photoClockId = (
    await db
      .insert(schema.boards)
      .values({
        ownerUserId,
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
      .returning({ id: schema.boards.id })
  )[0]?.id;

  if (!photoClockId) {
    throw new Error("Failed to create the photo-clock sample board");
  }

  for (const [index, url] of sampleImages.entries()) {
    await db.insert(schema.mediaItems).values({
      boardId: photoClockId,
      type: "image",
      filePath: url,
      displayOrder: index,
      duration: 8,
    });
  }

  console.log(`✅ Photo-Clock board ID: ${photoClockId}`);
  console.log(`   Open http://localhost:3000/${photoClockId}`);

  // --- Retro Board ---
  const retroBoardId = (
    await db
      .insert(schema.boards)
      .values({
        ownerUserId,
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
      .returning({ id: schema.boards.id })
  )[0]?.id;

  if (!retroBoardId) {
    throw new Error("Failed to create the retro sample board");
  }

  const retroMessages = [
    "1番線  東京行き  10:15 発  定刻",
    "2番線  大阪行き  10:32 発  定刻",
    "3番線  名古屋行き  10:45 発  約5分遅れ",
    "4番線  博多行き  11:00 発  定刻",
    "5番線  仙台行き  11:15 発  定刻",
    "6番線  新潟行き  11:30 発  定刻",
    "7番線  広島行き  11:45 発  運休",
  ];

  for (const [index, content] of retroMessages.entries()) {
    await db.insert(schema.messages).values({
      boardId: retroBoardId,
      content,
      priority: retroMessages.length - index,
    });
  }

  console.log(`✅ Retro board ID: ${retroBoardId}`);
  console.log(`   Open http://localhost:3000/${retroBoardId}`);

  // --- Message Board ---
  const messageBoardId = (
    await db
      .insert(schema.boards)
      .values({
        ownerUserId,
        name: "メッセージ掲示板 サンプル",
        templateId: "message",
        config: JSON.stringify({
          maxDisplayCount: 10,
          fontSize: "text-xl",
          backgroundColor: "#1e293b",
          textColor: "#f8fafc",
          accentColor: "#3b82f6",
        }),
        isActive: true,
      })
      .returning({ id: schema.boards.id })
  )[0]?.id;

  if (!messageBoardId) {
    throw new Error("Failed to create the message sample board");
  }

  const msgBoardMessages = [
    { content: "本日 14:00 より全体会議を行います", priority: 5 },
    { content: "エレベーター点検のため、15:00〜16:00 は使用不可です", priority: 3 },
    { content: "社員食堂 本日のメニュー: カレーライス定食", priority: 1 },
    { content: "落とし物: 黒い財布が受付に届いています", priority: 2 },
    { content: "来週月曜日は祝日のため休業です", priority: 0 },
  ];

  for (const { content, priority } of msgBoardMessages) {
    await db.insert(schema.messages).values({
      boardId: messageBoardId,
      content,
      priority,
    });
  }

  console.log(`✅ Message board ID: ${messageBoardId}`);
  console.log(`   Open http://localhost:3000/${messageBoardId}`);

  await pool.end();
}

main().catch((error) => {
  console.error("❌ Seed failed", error);
  process.exit(1);
});
