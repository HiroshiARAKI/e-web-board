// Copyright 2026 Hiroshi Araki (https://hiroshi.araki.tech)
// SPDX-License-Identifier: Apache-2.0

const LOCALHOST_HOSTNAMES = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);
const NON_PUBLIC_HOSTNAMES = new Set(["0.0.0.0", "::", "[::]"]);

function normalizeHostname(hostname: string): string {
  return hostname.trim().toLowerCase();
}

export function getPublicAppOrigin(): string | null {
  const configuredOrigin = process.env.APP_PUBLIC_ORIGIN?.trim();
  if (!configuredOrigin) {
    return null;
  }

  try {
    const url = new URL(configuredOrigin);
    const hostname = normalizeHostname(url.hostname);
    if (NON_PUBLIC_HOSTNAMES.has(hostname)) {
      console.error(
        "[public-origin] APP_PUBLIC_ORIGIN must be a browser-accessible origin, not a bind address",
      );
      return null;
    }

    return url.origin;
  } catch {
    console.error("[public-origin] APP_PUBLIC_ORIGIN is invalid");
    return null;
  }
}

export function buildPublicAppUrl(pathname: string): string | null {
  const origin = getPublicAppOrigin();
  if (!origin) {
    return null;
  }

  try {
    return new URL(pathname, `${origin}/`).toString();
  } catch {
    return null;
  }
}

export function isUnauthenticatedSignupPreviewEnabled(): boolean {
  if (process.env.ALLOW_UNAUTHENTICATED_SIGNUP_PREVIEW !== "true") {
    return false;
  }

  if (process.env.NODE_ENV === "production") {
    return false;
  }

  const origin = getPublicAppOrigin();
  if (!origin) {
    return false;
  }

  try {
    const hostname = normalizeHostname(new URL(origin).hostname);
    return LOCALHOST_HOSTNAMES.has(hostname);
  } catch {
    return false;
  }
}
