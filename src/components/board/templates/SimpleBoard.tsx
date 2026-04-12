// Copyright 2026 Hiroshi Araki (https://hiroshi.araki.tech)
// SPDX-License-Identifier: Apache-2.0
"use client";

import { MediaSlider } from "@/components/board/MediaSlider";
import { TickerText } from "@/components/board/TickerText";
import { GoogleFontLoader } from "@/components/board/GoogleFontLoader";
import type { BoardTemplateProps } from "@/types";

/** Default config for the Simple Board template */
export const simpleBoardDefaultConfig = {
  slideInterval: 5,
  tickerSpeed: 60,
  backgroundColor: "#000000",
  textColor: "#ffffff",
  tickerBgColor: "#1a1a2e",
  tickerFontFamily: "",
};

type SimpleBoardConfig = typeof simpleBoardDefaultConfig;

function parseConfig(raw: unknown): SimpleBoardConfig {
  const cfg = (raw && typeof raw === "object" ? raw : {}) as Partial<SimpleBoardConfig>;
  return { ...simpleBoardDefaultConfig, ...cfg };
}

export default function SimpleBoard({
  board,
  mediaItems,
  messages,
}: BoardTemplateProps) {
  const config = parseConfig(board.config);

  const sorted = [...mediaItems].sort(
    (a, b) => a.displayOrder - b.displayOrder
  );

  const tickerMessages = messages.map((m) => m.content);

  return (
    <div
      className="flex h-screen w-screen flex-col"
      style={{ backgroundColor: config.backgroundColor }}
    >
      {config.tickerFontFamily && (
        <GoogleFontLoader fonts={[config.tickerFontFamily]} />
      )}
      {/* Main area — slideshow */}
      <div className="flex-1 min-h-0">
        <MediaSlider mediaItems={sorted} interval={config.slideInterval} />
      </div>

      {/* Bottom ticker */}
      {tickerMessages.length > 0 && (
        <div
          className="h-14 flex items-center border-t border-white/10 px-4 text-lg font-medium"
          style={{ color: config.textColor, backgroundColor: config.tickerBgColor }}
        >
          <TickerText
            messages={tickerMessages}
            speed={config.tickerSpeed}
            fontFamily={config.tickerFontFamily || undefined}
          />
        </div>
      )}
    </div>
  );
}
