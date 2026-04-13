// Copyright 2026 Hiroshi Araki (https://hiroshi.araki.tech)
// SPDX-License-Identifier: Apache-2.0
import { createHash, randomBytes } from "crypto";

/**
 * Hash a 6-digit PIN using SHA-256 with a static salt.
 * Sufficient for a 6-digit numeric PIN in localhost context.
 */
export function hashPin(pin: string): string {
  return createHash("sha256")
    .update(`e-web-board-pin:${pin}`)
    .digest("hex");
}

/** Verify a PIN against a stored hash */
export function verifyPin(pin: string, storedHash: string): boolean {
  return hashPin(pin) === storedHash;
}

/** Generate a cryptographically random session token */
export function generateSessionToken(): string {
  return randomBytes(32).toString("hex");
}

/** Generate a cryptographically random reset token */
export function generateResetToken(): string {
  return randomBytes(32).toString("hex");
}

/** PIN session cookie name */
export const PIN_SESSION_COOKIE = "pin-session";

/** PIN session duration: 24 hours */
export const PIN_SESSION_MAX_AGE = 60 * 60 * 24;

/** Settings keys used for PIN auth */
export const PIN_SETTINGS = {
  PIN_HASH: "adminPinHash",
  PIN_EMAIL: "adminPinEmail",
  SESSION_SECRET: "adminSessionSecret",
} as const;

/** Max consecutive failed attempts before IP block */
export const MAX_PIN_ATTEMPTS = 5;

/** IP block duration: 24 hours in ms */
export const IP_BLOCK_DURATION_MS = 24 * 60 * 60 * 1000;

/** Reset token TTL: 30 minutes */
export const RESET_TOKEN_TTL_MS = 30 * 60 * 1000;
