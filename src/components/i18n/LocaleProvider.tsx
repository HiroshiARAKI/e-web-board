// Copyright 2026 Hiroshi Araki (https://hiroshi.araki.tech)
// SPDX-License-Identifier: Apache-2.0
"use client";

import { createContext, useContext, useEffect, useState } from "react";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE_NAME,
  isSupportedLocale,
  formatDate,
  formatDateTime,
  formatTime,
  getTemplateCopy,
  translate,
  translateWeatherTelop,
  type MessageKey,
  type SupportedLocale,
} from "@/lib/i18n";

interface LocaleContextValue {
  locale: SupportedLocale;
  setLocale: (locale: SupportedLocale) => void;
  t: (key: MessageKey, vars?: Record<string, string | number>) => string;
  formatDate: (value: string | number | Date, options?: Intl.DateTimeFormatOptions) => string;
  formatDateTime: (value: string | number | Date, options?: Intl.DateTimeFormatOptions) => string;
  formatTime: (value: string | number | Date, options?: Intl.DateTimeFormatOptions) => string;
  getTemplateCopy: (templateId: string) => { name: string; description: string };
  translateWeatherTelop: (telop: string) => string;
}

const LocaleContext = createContext<LocaleContextValue>({
  locale: DEFAULT_LOCALE,
  setLocale: () => {},
  t: (key) => key,
  formatDate: (value, options) => formatDate(value, DEFAULT_LOCALE, options),
  formatDateTime: (value, options) => formatDateTime(value, DEFAULT_LOCALE, options),
  formatTime: (value, options) => formatTime(value, DEFAULT_LOCALE, options),
  getTemplateCopy: (templateId) => getTemplateCopy(templateId, DEFAULT_LOCALE),
  translateWeatherTelop: (telop) => translateWeatherTelop(telop, DEFAULT_LOCALE),
});

export function useLocale() {
  return useContext(LocaleContext);
}

export function LocaleProvider({
  initialLocale,
  children,
}: {
  initialLocale: SupportedLocale;
  children: React.ReactNode;
}) {
  const [locale, setLocaleState] = useState<SupportedLocale>(initialLocale);

  useEffect(() => {
    setLocaleState(initialLocale);
  }, [initialLocale]);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.cookie = `${LOCALE_COOKIE_NAME}=${encodeURIComponent(locale)}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
  }, [locale]);

  const setLocale = (nextLocale: SupportedLocale) => {
    if (!isSupportedLocale(nextLocale)) return;
    setLocaleState(nextLocale);
  };

  const value: LocaleContextValue = {
    locale,
    setLocale,
    t: (key, vars) => translate(locale, key, vars),
    formatDate: (value, options) => formatDate(value, locale, options),
    formatDateTime: (value, options) => formatDateTime(value, locale, options),
    formatTime: (value, options) => formatTime(value, locale, options),
    getTemplateCopy: (templateId) => getTemplateCopy(templateId, locale),
    translateWeatherTelop: (telop) => translateWeatherTelop(telop, locale),
  };

  return (
    <LocaleContext.Provider value={value}>
      {children}
    </LocaleContext.Provider>
  );
}
