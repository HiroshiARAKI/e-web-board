// Copyright 2026 Hiroshi Araki (https://hiroshi.araki.tech)
// SPDX-License-Identifier: Apache-2.0
"use client";

import { useState, useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { DateTimeClock } from "@/components/board/DateTimeClock";
import { WeatherDisplay } from "@/components/board/WeatherDisplay";
import type { BoardTemplateProps } from "@/types";

/** Default config for the Retro Board template */
export const retroBoardDefaultConfig = {
  displayColor: "green" as "green" | "orange" | "white",
  rows: 5,
  flipSpeed: 0.08,
  switchInterval: 5,
  showClock: false,
  showWeather: false,
};

type RetroBoardConfig = typeof retroBoardDefaultConfig;

function parseConfig(raw: unknown): RetroBoardConfig {
  const cfg = (raw && typeof raw === "object" ? raw : {}) as Partial<RetroBoardConfig>;
  return { ...retroBoardDefaultConfig, ...cfg };
}

const COLOR_MAP: Record<string, { text: string; glow: string }> = {
  green: { text: "#39ff14", glow: "0 0 8px #39ff14, 0 0 20px #39ff1466" },
  orange: { text: "#ff8c00", glow: "0 0 8px #ff8c00, 0 0 20px #ff8c0066" },
  white: { text: "#f0f0f0", glow: "0 0 8px #f0f0f0, 0 0 20px #f0f0f066" },
};

/** Flip-style single character animation */
function FlipChar({
  char,
  delay,
  color,
  glow,
  flipSpeed,
}: {
  char: string;
  delay: number;
  color: string;
  glow: string;
  flipSpeed: number;
}) {
  return (
    <motion.span
      initial={{ rotateX: -90, opacity: 0 }}
      animate={{ rotateX: 0, opacity: 1 }}
      transition={{
        duration: flipSpeed,
        delay,
        ease: "easeOut",
      }}
      className="inline-block"
      style={{
        color,
        textShadow: glow,
        perspective: "400px",
        transformStyle: "preserve-3d",
      }}
    >
      {char === " " ? "\u00A0" : char}
    </motion.span>
  );
}

/** A single row that flips in character-by-character */
function RetroRow({
  text,
  color,
  glow,
  flipSpeed,
}: {
  text: string;
  color: string;
  glow: string;
  flipSpeed: number;
}) {
  return (
    <div className="flex items-center border-b border-white/5 px-6 py-3">
      <AnimatePresence mode="wait">
        <motion.div
          key={text}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="flex overflow-hidden font-mono text-2xl font-bold tracking-widest md:text-3xl lg:text-4xl"
        >
          {text.split("").map((char, i) => (
            <FlipChar
              key={`${text}-${i}`}
              char={char}
              delay={i * flipSpeed}
              color={color}
              glow={glow}
              flipSpeed={flipSpeed}
            />
          ))}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export default function RetroBoard({
  board,
  messages,
}: BoardTemplateProps) {
  const config = parseConfig(board.config);
  const { text: color, glow } = COLOR_MAP[config.displayColor] ?? COLOR_MAP.green;

  const sorted = [...messages].sort((a, b) => b.priority - a.priority);
  const totalMessages = sorted.length;

  const [offset, setOffset] = useState(0);

  const advance = useCallback(() => {
    if (totalMessages <= config.rows) return;
    setOffset((prev) => (prev + config.rows) % totalMessages);
  }, [totalMessages, config.rows]);

  useEffect(() => {
    if (totalMessages <= config.rows) return;
    const timer = setInterval(advance, config.switchInterval * 1000);
    return () => clearInterval(timer);
  }, [totalMessages, config.rows, config.switchInterval, advance]);

  // Build visible rows (circular)
  const visibleRows: string[] = [];
  for (let i = 0; i < config.rows; i++) {
    if (totalMessages === 0) {
      visibleRows.push("");
    } else {
      visibleRows.push(sorted[(offset + i) % totalMessages].content);
    }
  }

  return (
    <div className="flex h-screen w-screen flex-col bg-[#0a0a0a]">
      {/* Header bar */}
      <div
        className="flex items-center justify-between border-b-2 px-6 py-3"
        style={{ borderColor: color }}
      >
        <span
          className="font-mono text-sm font-bold uppercase tracking-[0.3em]"
          style={{ color, textShadow: glow }}
        >
          {board.name}
        </span>
        <div className="flex items-center gap-4">
          <span
            className="font-mono text-sm tracking-wider opacity-70"
            style={{ color }}
          >
            ● LIVE
          </span>
        </div>
      </div>

      {/* Clock & Weather bar */}
      {(config.showClock || config.showWeather) && (
        <div
          className="flex items-center justify-between border-b px-6 py-1"
          style={{ borderColor: color + "40" }}
        >
          <div className="flex-1">
            {config.showWeather && (
              <WeatherDisplay color={color} bgOpacity={0} />
            )}
          </div>
          {config.showClock && (
            <DateTimeClock
              timeFontSize={18}
              color={color}
              bgOpacity={0}
              layout="compact"
            />
          )}
        </div>
      )}

      {/* Message rows */}
      <div className="flex flex-1 flex-col justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={offset}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {visibleRows.map((text, i) => (
              <RetroRow
                key={`${offset}-${i}`}
                text={text || "—"}
                color={color}
                glow={glow}
                flipSpeed={config.flipSpeed}
              />
            ))}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom decorative line */}
      <div className="h-1" style={{ backgroundColor: color, opacity: 0.3 }} />
    </div>
  );
}
