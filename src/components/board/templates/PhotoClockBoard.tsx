"use client";

import { MediaSlider } from "@/components/board/MediaSlider";
import { DateTimeClock } from "@/components/board/DateTimeClock";
import type { BoardTemplateProps } from "@/types";

/** Default config for the Photo-Clock Board template */
export const photoClockDefaultConfig = {
  slideInterval: 8,
  clockPosition: "bottom-right" as ClockPosition,
  clockFontSize: "text-5xl",
  clockColor: "#ffffff",
  clockBgOpacity: 0.5,
  is24Hour: true,
};

type ClockPosition = "top-left" | "top-right" | "bottom-left" | "bottom-right";

type PhotoClockConfig = typeof photoClockDefaultConfig;

function parseConfig(raw: unknown): PhotoClockConfig {
  const cfg = (raw && typeof raw === "object" ? raw : {}) as Partial<PhotoClockConfig>;
  return { ...photoClockDefaultConfig, ...cfg };
}

const positionClasses: Record<ClockPosition, string> = {
  "top-left": "top-6 left-6",
  "top-right": "top-6 right-6",
  "bottom-left": "bottom-6 left-6",
  "bottom-right": "bottom-6 right-6",
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

      {/* Clock overlay */}
      <div
        className={`absolute z-10 ${positionClasses[config.clockPosition] ?? positionClasses["bottom-right"]}`}
      >
        <DateTimeClock
          is24Hour={config.is24Hour}
          fontSize={config.clockFontSize}
          color={config.clockColor}
          bgOpacity={config.clockBgOpacity}
        />
      </div>
    </div>
  );
}
