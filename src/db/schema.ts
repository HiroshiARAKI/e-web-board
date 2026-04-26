// Copyright 2026 Hiroshi Araki (https://hiroshi.araki.tech)
// SPDX-License-Identifier: Apache-2.0
import { pgTable, text, integer, boolean, primaryKey, AnyPgColumn } from "drizzle-orm/pg-core";
import { sql, relations } from "drizzle-orm";
import { randomUUID } from "crypto";

const isoNow = sql`to_char(timezone('utc', now()), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`;

export const boards = pgTable("boards", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  ownerUserId: text("owner_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  templateId: text("template_id").notNull(), // "simple" | "photo-clock" | "retro" | "message" | "call-number"
  config: text("config").notNull().default("{}"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: text("created_at")
    .notNull()
    .default(isoNow),
  updatedAt: text("updated_at")
    .notNull()
    .default(isoNow)
    .$onUpdate(() => new Date().toISOString()),
});

export const mediaItems = pgTable("media_items", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  boardId: text("board_id")
    .notNull()
    .references(() => boards.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // "image" | "video"
  filePath: text("file_path").notNull(),
  displayOrder: integer("display_order").notNull().default(0),
  duration: integer("duration").notNull().default(5), // seconds
  createdAt: text("created_at")
    .notNull()
    .default(isoNow),
  updatedAt: text("updated_at")
    .notNull()
    .default(isoNow)
    .$onUpdate(() => new Date().toISOString()),
});

export const messages = pgTable("messages", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  boardId: text("board_id")
    .notNull()
    .references(() => boards.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  priority: integer("priority").notNull().default(0),
  expiresAt: text("expires_at"),
  createdAt: text("created_at")
    .notNull()
    .default(isoNow),
  updatedAt: text("updated_at")
    .notNull()
    .default(isoNow)
    .$onUpdate(() => new Date().toISOString()),
});

export const settings = pgTable(
  "settings",
  {
    ownerUserId: text("owner_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    value: text("value").notNull(),
    updatedAt: text("updated_at")
      .notNull()
      .default(isoNow)
      .$onUpdate(() => new Date().toISOString()),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.ownerUserId, table.key] }),
  }),
);

export const pinResetTokens = pgTable("pin_reset_tokens", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  token: text("token").notNull().unique(),
  /** User whose PIN this token resets */
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),
  expiresAt: text("expires_at").notNull(),
  usedAt: text("used_at"),
  createdAt: text("created_at")
    .notNull()
    .default(isoNow),
});

export const pinAttempts = pgTable("pin_attempts", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  ipAddress: text("ip_address").notNull(),
  attemptedAt: text("attempted_at")
    .notNull()
    .default(isoNow),
});

// ── New auth tables ─────────────────────────────────────

export const users = pgTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  /** Human-readable login ID (e.g. "admin") */
  userId: text("user_id").notNull().unique(),
  email: text("email").notNull().unique(),
  /** Phone number for owner sign-up uniqueness checks */
  phoneNumber: text("phone_number").unique(),
  passwordHash: text("password_hash").notNull(),
  /** 6-digit PIN hash (nullable until PIN is configured) */
  pinHash: text("pin_hash"),
  /** Owner of an isolated workspace, or a shared member under an owner */
  attribute: text("attribute").notNull().default("shared"),
  /** Shared users point at their owner user; owner users keep this null */
  ownerUserId: text("owner_user_id").references(
    (): AnyPgColumn => users.id,
    { onDelete: "set null" },
  ),
  role: text("role").notNull().default("general"),
  /** Dashboard color theme preference: "system" | "light" | "dark" */
  colorTheme: text("color_theme").notNull().default("system"),
  /** Timestamp of the last successful email+password login */
  lastFullAuthAt: text("last_full_auth_at"),
  createdAt: text("created_at")
    .notNull()
    .default(isoNow),
  updatedAt: text("updated_at")
    .notNull()
    .default(isoNow)
    .$onUpdate(() => new Date().toISOString()),
});

export const authSessions = pgTable("auth_sessions", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  sessionToken: text("session_token").notNull().unique(),
  expiresAt: text("expires_at").notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(isoNow),
});

// ── Relations ────────────────────────────────────────────

export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(authSessions),
  pinResetTokens: many(pinResetTokens),
}));

export const pinResetTokensRelations = relations(pinResetTokens, ({ one }) => ({
  user: one(users, {
    fields: [pinResetTokens.userId],
    references: [users.id],
  }),
}));

export const authSessionsRelations = relations(authSessions, ({ one }) => ({
  user: one(users, {
    fields: [authSessions.userId],
    references: [users.id],
  }),
}));
