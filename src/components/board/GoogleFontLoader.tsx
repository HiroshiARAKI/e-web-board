"use client";

import { useEffect } from "react";
import { buildGoogleFontsUrl } from "@/lib/fonts";

/**
 * Dynamically loads Google Fonts by injecting a <link> tag.
 * Only loads fonts that aren't already loaded.
 */
export function GoogleFontLoader({ fonts }: { fonts: string[] }) {
  useEffect(() => {
    const url = buildGoogleFontsUrl(fonts);
    if (!url) return;

    const linkId = "google-fonts-dynamic";
    const existing = document.getElementById(linkId) as HTMLLinkElement | null;

    if (existing && existing.href === url) return;

    if (existing) existing.remove();

    const link = document.createElement("link");
    link.id = linkId;
    link.rel = "stylesheet";
    link.href = url;
    document.head.appendChild(link);

    return () => {
      // Don't remove on cleanup — fonts may still be needed
    };
  }, [fonts]);

  return null;
}
