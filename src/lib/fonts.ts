// Copyright 2026 Hiroshi Araki (https://hiroshi.araki.tech)
// SPDX-License-Identifier: Apache-2.0
/** Available Google Fonts for board text */
export const GOOGLE_FONTS = [
  { value: "", label: "デフォルト（システムフォント）" },
  { value: "Noto Sans JP", label: "Noto Sans JP" },
  { value: "Noto Serif JP", label: "Noto Serif JP" },
  { value: "M PLUS Rounded 1c", label: "M PLUS Rounded 1c" },
  { value: "M PLUS 1p", label: "M PLUS 1p" },
  { value: "Kosugi Maru", label: "Kosugi Maru" },
  { value: "Sawarabi Gothic", label: "Sawarabi Gothic" },
  { value: "Sawarabi Mincho", label: "Sawarabi Mincho" },
  { value: "Zen Maru Gothic", label: "Zen Maru Gothic" },
  { value: "Zen Kaku Gothic New", label: "Zen Kaku Gothic New" },
  { value: "Kiwi Maru", label: "Kiwi Maru" },
  { value: "Hachi Maru Pop", label: "Hachi Maru Pop" },
  { value: "Dela Gothic One", label: "Dela Gothic One" },
  { value: "Reggae One", label: "Reggae One" },
  { value: "RocknRoll One", label: "RocknRoll One" },
  { value: "Train One", label: "Train One" },
] as const;

/**
 * Build the Google Fonts CSS link URL for given font families.
 * Returns null if no fonts are specified.
 */
export function buildGoogleFontsUrl(families: string[]): string | null {
  const filtered = families.filter(Boolean);
  if (filtered.length === 0) return null;

  const params = filtered
    .map((f) => `family=${encodeURIComponent(f)}:wght@400;700`)
    .join("&");
  return `https://fonts.googleapis.com/css2?${params}&display=swap`;
}
