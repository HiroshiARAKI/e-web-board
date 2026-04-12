"use client";

import { useState, useEffect } from "react";

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

export type ClockLayout = "standard" | "compact" | "large-time" | "date-top";

interface DateTimeClockProps {
  /** 24-hour format (default: true) */
  is24Hour?: boolean;
  /** Font size in px for the time display */
  timeFontSize?: number;
  /** Text color */
  color?: string;
  /** Background opacity 0-1 */
  bgOpacity?: number;
  /** Clock layout variant */
  layout?: ClockLayout;
}

export function DateTimeClock({
  is24Hour = true,
  timeFontSize = 48,
  color = "#ffffff",
  bgOpacity = 0.5,
  layout = "standard",
}: DateTimeClockProps) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (!now) return null;

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const weekday = WEEKDAYS[now.getDay()];

  let hours = now.getHours();
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");

  let period = "";
  if (!is24Hour) {
    period = hours >= 12 ? " PM" : " AM";
    hours = hours % 12 || 12;
  }
  const hoursStr = String(hours).padStart(2, "0");

  const timeStr = `${hoursStr}:${minutes}:${seconds}${period}`;
  const dateStr = `${year}/${month}/${day} (${weekday})`;

  const dateFontSize = Math.max(14, Math.round(timeFontSize * 0.35));

  if (layout === "compact") {
    return (
      <div
        className="inline-flex items-center gap-4 rounded-lg px-5 py-2"
        style={{ backgroundColor: `rgba(0, 0, 0, ${bgOpacity})`, color }}
      >
        <span
          className="font-mono font-bold tabular-nums tracking-wider"
          style={{ fontSize: timeFontSize }}
        >
          {timeStr}
        </span>
        <span
          className="font-medium opacity-90"
          style={{ fontSize: dateFontSize }}
        >
          {dateStr}
        </span>
      </div>
    );
  }

  if (layout === "large-time") {
    return (
      <div
        className="inline-flex flex-col items-center rounded-lg px-8 py-4"
        style={{ backgroundColor: `rgba(0, 0, 0, ${bgOpacity})`, color }}
      >
        <span
          className="font-mono font-bold tabular-nums tracking-wider"
          style={{ fontSize: timeFontSize * 1.3 }}
        >
          {hoursStr}:{minutes}
        </span>
        <span
          className="font-mono tabular-nums opacity-70"
          style={{ fontSize: Math.round(timeFontSize * 0.5) }}
        >
          :{seconds}{period}
        </span>
        <span
          className="mt-1 font-medium opacity-80"
          style={{ fontSize: dateFontSize }}
        >
          {dateStr}
        </span>
      </div>
    );
  }

  if (layout === "date-top") {
    return (
      <div
        className="inline-flex flex-col items-center rounded-lg px-6 py-3"
        style={{ backgroundColor: `rgba(0, 0, 0, ${bgOpacity})`, color }}
      >
        <span
          className="font-medium opacity-90"
          style={{ fontSize: dateFontSize }}
        >
          {dateStr}
        </span>
        <span
          className="mt-1 font-mono font-bold tabular-nums tracking-wider"
          style={{ fontSize: timeFontSize }}
        >
          {timeStr}
        </span>
      </div>
    );
  }

  // "standard" layout (default)
  return (
    <div
      className="inline-flex flex-col items-center rounded-lg px-6 py-3"
      style={{ backgroundColor: `rgba(0, 0, 0, ${bgOpacity})`, color }}
    >
      <span
        className="font-mono font-bold tabular-nums tracking-wider"
        style={{ fontSize: timeFontSize }}
      >
        {timeStr}
      </span>
      <span
        className="mt-1 font-medium opacity-90"
        style={{ fontSize: dateFontSize }}
      >
        {dateStr}
      </span>
    </div>
  );
}
