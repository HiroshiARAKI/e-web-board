// Copyright 2026 Hiroshi Araki (https://hiroshi.araki.tech)
// SPDX-License-Identifier: Apache-2.0
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { boards } from "@/db/schema";
import { desc } from "drizzle-orm";
import { createBoardSchema } from "@/lib/validators";
import { templates } from "@/lib/templates";

export async function GET() {
  const allBoards = await db.select().from(boards).orderBy(desc(boards.createdAt));
  return NextResponse.json(allBoards);
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const result = createBoardSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: "Validation failed", details: result.error.flatten() },
      { status: 400 },
    );
  }

  const { name, templateId, config } = result.data;

  // Apply default config from template if no config provided
  const template = templates[templateId as keyof typeof templates];
  const mergedConfig = Object.keys(config).length > 0 ? config : (template?.defaultConfig ?? {});

  const [inserted] = await db
    .insert(boards)
    .values({
      name,
      templateId,
      config: JSON.stringify(mergedConfig),
    })
    .returning();

  return NextResponse.json(inserted, { status: 201 });
}
