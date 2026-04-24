// Copyright 2026 Hiroshi Araki (https://hiroshi.araki.tech)
// SPDX-License-Identifier: Apache-2.0
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Derive the thumbnail URL from an original upload path.
 * e.g. `/uploads/uuid.jpg` -> `/uploads/thumbs/uuid.jpg`
 *      `/uploads/uuid.gif` -> `/uploads/thumbs/uuid.jpg` (GIF → JPEG thumb)
 */
export function thumbUrl(filePath: string): string {
  const parts = filePath.split("/");
  const filename = parts.pop() ?? "";
  const dotIdx = filename.lastIndexOf(".");
  const name = dotIdx >= 0 ? filename.slice(0, dotIdx) : filename;
  const ext = dotIdx >= 0 ? filename.slice(dotIdx).toLowerCase() : "";
  const thumbExt = ext === ".gif" ? ".jpg" : ext;
  return `/uploads/thumbs/${name}${thumbExt}`;
}

export function parseJsonObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  if (typeof value !== "string") {
    return {};
  }

  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

export function normalizeConfig<T extends { config: unknown }>(record: T): Omit<T, "config"> & {
  config: Record<string, unknown>;
} {
  return {
    ...record,
    config: parseJsonObject(record.config),
  };
}
