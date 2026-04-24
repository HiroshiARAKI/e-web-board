// Copyright 2026 Hiroshi Araki (https://hiroshi.araki.tech)
// SPDX-License-Identifier: Apache-2.0
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";
import type { boards, mediaItems, messages } from "@/db/schema";

// Select types (read from DB)
export type Board = Omit<InferSelectModel<typeof boards>, "config"> & {
  config: string | Record<string, unknown>;
};
export type MediaItem = InferSelectModel<typeof mediaItems>;
export type Message = InferSelectModel<typeof messages>;

// Insert types (write to DB)
export type NewBoard = InferInsertModel<typeof boards>;
export type NewMediaItem = InferInsertModel<typeof mediaItems>;
export type NewMessage = InferInsertModel<typeof messages>;

// Template types
export type TemplateId = "simple" | "photo-clock" | "retro" | "message" | "call-number";

export interface BoardTemplate {
  id: TemplateId;
  name: string;
  description: string;
  defaultConfig: Record<string, unknown>;
  component: React.ComponentType<BoardTemplateProps>;
}

export interface BoardTemplateProps {
  board: Board;
  mediaItems: MediaItem[];
  messages: Message[];
}
