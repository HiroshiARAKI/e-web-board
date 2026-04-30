// Copyright 2026 Hiroshi Araki (https://hiroshi.araki.tech)
// SPDX-License-Identifier: Apache-2.0
import type { NextResponse } from "next/server";
import {
  LOCALE_COOKIE_NAME,
  resolvePreferredLocale,
  type SupportedLocale,
} from "@/lib/i18n";

const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function resolveAuthenticatedLocale(input: {
  storedLocale?: string | null;
  acceptLanguage?: string | null;
}): SupportedLocale {
  return resolvePreferredLocale({
    storedLocale: input.storedLocale,
    cookieLocale: null,
    acceptLanguage: input.acceptLanguage,
  });
}

export function setLocaleCookie(response: NextResponse, locale: SupportedLocale) {
  response.cookies.set(LOCALE_COOKIE_NAME, locale, {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
    maxAge: LOCALE_COOKIE_MAX_AGE,
    secure: process.env.NODE_ENV === "production",
  });
}
