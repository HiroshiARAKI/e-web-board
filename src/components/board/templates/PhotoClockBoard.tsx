// Copyright 2026 Hiroshi Araki (https://hiroshi.araki.tech)
// SPDX-License-Identifier: Apache-2.0
"use client";

import { MediaSlider } from "@/components/board/MediaSlider";
import { DateTimeClock } from "@/components/board/DateTimeClock";
import { WeatherDisplay } from "@/components/board/WeatherDisplay";
import type { ClockLayout } from "@/components/board/DateTimeClock";
import type { BoardTemplateProps } from "@/types";

type ClockPosition =
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right"
  | "center";

/** Default config for the Photo-Clock Board template */
export const photoClockDefaultConfig = {
  slideInterval: 8,
  clockPosition: "bottom-right" as ClockPosition,
  clockFontSize: 48,
  clockColor: "#ffffff",
  clockBgOpacity: 0.5,
  clockLayout: "standard" as ClockLayout,
  is24Hour: true,
  showWeather: false,
};

type PhotoClockConfig = typeof photoClockDefaultConfig;

function parseConfig(raw: unknown): PhotoClockConfig {
  const cfg = (raw && typeof raw === "object" ? raw : {}) as Partial<PhotoClockConfig>;

  // Migrate old Tailwind class fontSize to pixel value
  const merged = { ...photoClockDefaultConfig, ...cfg };
  if (typeof merged.clockFontSize === "string") {
    const sizeMap: Record<string, number> = {
      "text-3xl": 30,
      "text-5xl": 48,
      "text-7xl": 72,
      "text-9xl": 128,
    };
    merged.clockFontSize =
      sizeMap[merged.clockFontSize as string] ?? 48;
  }
  return merged;
}

const positionClasses: Record<ClockPosition, string> = {
  "top-left": "top-6 left-6",
  "top-right": "top-6 right-6",
  "bottom-left": "bottom-6 left-6",
  "bottom-right": "bottom-6 right-6",
  center: "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
};

export default function PhotoClockBoard({
  board,
  mediaItems,
}: BoardTemplateProps) {
  const config = parseConfig(board.config);

  const sorted = [...mediaItems].sort(
    (a, b) => a.displayOrder - b.displayOrder
  );

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black">
      {/* Full-screen slideshow */}
      <MediaSlider mediaItems={sorted} interval={config.slideInterval} />

      {/* Clock + Weather overlay */}
      <div
        className={`absolute z-10 flex flex-col gap-2 ${positionClasses[config.clockPosition] ?? positionClasses["bottom-right"]}`}
      >
        <DateTimeClock
          is24Hour={config.is24Hour}
          timeFontSize={config.clockFontSize}
          color={config.clockColor}
          bgOpacity={config.clockBgOpacity}
          layout={config.clockLayout}
        />
        {config.showWeather && (
          <WeatherDisplay
            color={config.clockColor}
            bgOpacity={config.clockBgOpacity}
          />
        )}
      </div>
    </div>
  );
}
