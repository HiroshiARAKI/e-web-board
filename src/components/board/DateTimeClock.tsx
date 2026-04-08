"use client";

import { useState, useEffect } from "react";

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

interface DateTimeClockProps {
  /** 24-hour format (default: true) */
  is24Hour?: boolean;
  /** Font size class or CSS value */
  fontSize?: string;
  /** Text color */
  color?: string;
  /** Background opacity 0-1 */
  bgOpacity?: number;
}

export function DateTimeClock({
  is24Hour = true,
  fontSize = "text-4xl",
  color = "#ffffff",
  bgOpacity = 0.5,
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

  return (
    <div
      className="inline-flex flex-col items-center rounded-lg px-6 py-3"
      style={{
        backgroundColor: `rgba(0, 0, 0, ${bgOpacity})`,
        color,
      }}
    >
      <span className={`${fontSize} font-mono font-bold tabular-nums tracking-wider`}>
        {hoursStr}:{minutes}:{seconds}{period}
      </span>
      <span className="mt-1 text-lg font-medium opacity-90">
        {year}/{month}/{day} ({weekday})
      </span>
    </div>
  );
}
