// Copyright 2026 Hiroshi Araki (https://hiroshi.araki.tech)
// SPDX-License-Identifier: Apache-2.0
"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { DateTimeClock } from "@/components/board/DateTimeClock";
import { GoogleFontLoader } from "@/components/board/GoogleFontLoader";
import type { BoardTemplateProps } from "@/types";

/** Default config for the Call Number Board template */
export const callNumberDefaultConfig = {
  showClock: true,
  backgroundColor: "#1a1a2e",
  waitingTextColor: "#ffffff",
  calledTextColor: "#00ff88",
  highlightColor: "#ff6b35",
  layout: "horizontal" as "horizontal" | "vertical",
  waitingLabel: "お待ちの番号",
  calledLabel: "お呼び出し中",
  passcode: "",
};

type CallNumberConfig = typeof callNumberDefaultConfig;

function parseConfig(raw: unknown): CallNumberConfig {
  const cfg = (raw && typeof raw === "object" ? raw : {}) as Partial<CallNumberConfig>;
  return { ...callNumberDefaultConfig, ...cfg };
}

/** Highlight duration in ms — numbers called within this window are emphasized */
const HIGHLIGHT_DURATION = 60_000;

export default function CallNumberBoard({
  board,
  messages,
}: BoardTemplateProps) {
  const config = parseConfig(board.config);
  const [now, setNow] = useState(() => Date.now());

  // Tick every 5s to re-evaluate "recently called" highlights
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(timer);
  }, []);

  const isRecentlyCalled = useCallback(
    (updatedAt: string) => now - new Date(updatedAt).getTime() < HIGHLIGHT_DURATION,
    [now],
  );

  // Split messages into waiting (priority=0) and called (priority>=1)
  const { waiting, called } = useMemo(() => {
    const w: typeof messages = [];
    const c: typeof messages = [];
    for (const m of messages) {
      if (m.priority >= 1) {
        c.push(m);
      } else {
        w.push(m);
      }
    }
    // Sort waiting by content (number order)
    w.sort((a, b) => a.content.localeCompare(b.content, "ja", { numeric: true }));
    // Sort called: recently called first, then by updatedAt desc
    c.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    return { waiting: w, called: c };
  }, [messages]);

  const isHorizontal = config.layout === "horizontal";

  return (
    <div
      className="flex h-screen w-screen flex-col overflow-hidden"
      style={{ backgroundColor: config.backgroundColor }}
    >
      <GoogleFontLoader fonts={["Noto Sans JP"]} />

      {/* Header with clock */}
      {config.showClock && (
        <div className="flex shrink-0 items-center justify-end px-6 py-3">
          <DateTimeClock
            timeFontSize={36}
            color="#ffffff"
            bgOpacity={0.3}
            layout="compact"
          />
        </div>
      )}

      {/* Main content */}
      <div
        className={`flex flex-1 min-h-0 gap-1 p-4 ${
          isHorizontal ? "flex-row" : "flex-col"
        }`}
      >
        {/* Waiting lane */}
        <div
          className={`flex flex-col rounded-2xl bg-white/5 ${
            isHorizontal ? "flex-1" : "flex-1"
          }`}
        >
          <div className="shrink-0 px-6 py-4">
            <h2
              className="text-2xl font-bold"
              style={{ color: config.waitingTextColor }}
            >
              {config.waitingLabel}
            </h2>
            <p className="mt-1 text-sm text-white/40">
              {waiting.length} 件
            </p>
          </div>
          <div className="flex-1 overflow-auto px-6 pb-4">
            <div className="flex flex-wrap gap-3">
              {waiting.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-6 py-4 text-3xl font-bold"
                  style={{ color: config.waitingTextColor, fontFamily: '"Noto Sans JP", system-ui, sans-serif', fontVariantNumeric: "tabular-nums" }}
                >
                  {m.content}
                </div>
              ))}
              {waiting.length === 0 && (
                <p className="py-8 text-sm text-white/30">
                  待機中の番号はありません
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Called lane */}
        <div
          className={`flex flex-col rounded-2xl bg-white/5 ${
            isHorizontal ? "flex-1" : "flex-1"
          }`}
        >
          <div className="shrink-0 px-6 py-4">
            <h2
              className="text-2xl font-bold"
              style={{ color: config.calledTextColor }}
            >
              {config.calledLabel}
            </h2>
            <p className="mt-1 text-sm text-white/40">
              {called.length} 件
            </p>
          </div>
          <div className="flex-1 overflow-auto px-6 pb-4">
            <div className="flex flex-wrap gap-3">
              {called.map((m) => {
                const highlighted = isRecentlyCalled(m.updatedAt);
                return (
                  <div
                    key={m.id}
                    className={`flex items-center justify-center rounded-xl px-6 py-4 transition-colors ${
                      highlighted
                        ? "animate-pulse text-4xl font-extrabold"
                        : "border border-white/10 bg-white/5 text-3xl font-bold"
                    }`}
                    style={{
                      color: highlighted
                        ? config.highlightColor
                        : config.calledTextColor,
                      fontFamily: '"Noto Sans JP", system-ui, sans-serif',
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {m.content}
                  </div>
                );
              })}
              {called.length === 0 && (
                <p className="py-8 text-sm text-white/30">
                  呼び出し済みの番号はありません
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
