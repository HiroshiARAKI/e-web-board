// Copyright 2026 Hiroshi Araki (https://hiroshi.araki.tech)
// SPDX-License-Identifier: Apache-2.0
import { randomBytes, scrypt, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

/**
 * Hash a password using scrypt (memory-hard).
 * Returns "<hash>.<salt>" where both are hex-encoded.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

/** Verify a plaintext password against a stored scrypt hash */
export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const [hashed, salt] = stored.split(".");
  if (!hashed || !salt) return false;
  try {
    const buf = (await scryptAsync(password, salt, 64)) as Buffer;
    const hashedBuf = Buffer.from(hashed, "hex");
    if (buf.length !== hashedBuf.length) return false;
    return timingSafeEqual(buf, hashedBuf);
  } catch {
    return false;
  }
}

/** Auth session cookie name */
export const AUTH_SESSION_COOKIE = "auth-session";

/**
 * Cookie that stores the userId (human-readable) of the most recently
 * authenticated user. Used to target the correct account on the PIN screen.
 * Long-lived (1 year), httpOnly.
 */
export const LAST_USER_COOKIE = "last-user-id";

/** PIN session duration: 24 hours (in seconds, for cookie maxAge) */
export const SESSION_MAX_AGE = 60 * 60 * 24;

/** Default full-auth expiry: 30 days */
export const DEFAULT_AUTH_EXPIRE_DAYS = 30;

/** Maximum full-auth expiry: 365 days */
export const MAX_AUTH_EXPIRE_DAYS = 365;

/** Settings key for the configurable full-auth expiry (days) */
export const AUTH_EXPIRE_DAYS_KEY = "authExpireDays";

/** Compute the full-auth expiry date from lastFullAuthAt and configured days */
export function computeFullAuthExpiry(
  lastFullAuthAt: string | null | undefined,
  expireDays: number,
): Date | null {
  if (!lastFullAuthAt) return null;
  return new Date(
    new Date(lastFullAuthAt).getTime() + expireDays * 24 * 60 * 60 * 1000,
  );
}

/** Return true if full-auth is still valid */
export function isFullAuthValid(
  lastFullAuthAt: string | null | undefined,
  expireDays: number,
): boolean {
  const expiry = computeFullAuthExpiry(lastFullAuthAt, expireDays);
  if (!expiry) return false;
  return expiry > new Date();
}

// ── Session helper ────────────────────────────────────────────────────────────

import { cookies } from "next/headers";
import { db } from "@/db";
import { authSessions } from "@/db/schema";
import { eq, and, gt } from "drizzle-orm";

/**
 * Read the current session from the cookie store and return the
 * associated session row (with user) if it is valid, or null.
 * Only for use inside Next.js request context (Route Handlers / Server
 * Components).
 */
export async function getSessionUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await db.query.authSessions.findFirst({
    where: and(
      eq(authSessions.sessionToken, token),
      gt(authSessions.expiresAt, new Date().toISOString()),
    ),
    with: { user: true },
  });
  return session ?? null;
}
