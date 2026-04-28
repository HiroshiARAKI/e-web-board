// Copyright 2026 Hiroshi Araki (https://hiroshi.araki.tech)
// SPDX-License-Identifier: Apache-2.0

import { cookies, headers } from "next/headers";
import { getSessionUser } from "@/lib/auth";
import {
  LOCALE_COOKIE_NAME,
  formatDate,
  formatDateTime,
  formatTime,
  getTemplateCopy,
  resolvePreferredLocale,
  translate,
  translateWeatherTelop,
} from "@/lib/i18n";

export async function getRequestLocale() {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const session = await getSessionUser();

  return resolvePreferredLocale({
    storedLocale: session?.user.locale,
    cookieLocale: cookieStore.get(LOCALE_COOKIE_NAME)?.value ?? null,
    acceptLanguage: headerStore.get("accept-language"),
  });
}

export async function getRequestI18n() {
  const locale = await getRequestLocale();

  return {
    locale,
    t: (key: Parameters<typeof translate>[1], vars?: Record<string, string | number>) =>
      translate(locale, key, vars),
    formatDate: (value: string | number | Date, options?: Intl.DateTimeFormatOptions) =>
      formatDate(value, locale, options),
    formatDateTime: (value: string | number | Date, options?: Intl.DateTimeFormatOptions) =>
      formatDateTime(value, locale, options),
    formatTime: (value: string | number | Date, options?: Intl.DateTimeFormatOptions) =>
      formatTime(value, locale, options),
    getTemplateCopy: (templateId: string) => getTemplateCopy(templateId, locale),
    translateWeatherTelop: (telop: string) => translateWeatherTelop(telop, locale),
  };
}
