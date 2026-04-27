// Copyright 2026 Hiroshi Araki (https://hiroshi.araki.tech)
// SPDX-License-Identifier: Apache-2.0
import { createHash, randomBytes, scrypt, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);
const PIN_SCRYPT_PREFIX = "scrypt";

function hashLegacyPin(pin: string): string {
  return createHash("sha256")
    .update(`e-web-board-pin:${pin}`)
    .digest("hex");
}

function parseScryptPinHash(storedHash: string) {
  if (!storedHash.startsWith(`${PIN_SCRYPT_PREFIX}:`)) {
    return null;
  }

  const payload = storedHash.slice(PIN_SCRYPT_PREFIX.length + 1);
  const [hashed, salt] = payload.split(".");
  if (!hashed || !salt) {
    return null;
  }

  return { hashed, salt };
}

/**
 * Hash a 6-digit PIN using scrypt and return a self-describing value.
 */
export async function hashPin(pin: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(pin, salt, 64)) as Buffer;
  return `${PIN_SCRYPT_PREFIX}:${buf.toString("hex")}.${salt}`;
}

/** Verify a PIN against a stored hash */
export async function verifyPin(pin: string, storedHash: string): Promise<boolean> {
  const parsed = parseScryptPinHash(storedHash);
  if (parsed) {
    try {
      const buf = (await scryptAsync(pin, parsed.salt, 64)) as Buffer;
      const hashedBuf = Buffer.from(parsed.hashed, "hex");
      if (buf.length !== hashedBuf.length) {
        return false;
      }
      return timingSafeEqual(buf, hashedBuf);
    } catch {
      return false;
    }
  }

  return timingSafeEqual(
    Buffer.from(hashLegacyPin(pin), "hex"),
    Buffer.from(storedHash, "hex"),
  );
}

/** Return true when a verified PIN hash should be upgraded to the current format. */
export function needsPinRehash(storedHash: string): boolean {
  return parseScryptPinHash(storedHash) === null;
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
