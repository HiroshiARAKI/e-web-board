// Copyright 2026 Hiroshi Araki (https://hiroshi.araki.tech)
// SPDX-License-Identifier: Apache-2.0
"use client";

import { GoogleFontLoader } from "@/components/board/GoogleFontLoader";
import type { BoardTemplateProps } from "@/types";

interface ClinicDayConfig {
  closed: boolean;
  morning: string;
  afternoon: string;
}

interface ClinicHoursConfig {
  title: string;
  body: string;
  daysToShow: number;
  weekStartsOn: "sun" | "mon";
  titleFontSize: number;
  bodyFontSize: number;
  titleColor: string;
  bodyColor: string;
  fontFamily: string;
  days: ClinicDayConfig[];
}

export const clinicHoursDefaultConfig: ClinicHoursConfig = {
  title: "診療時間案内",
  body: "受付時間は状況により変更になる場合があります。",
  daysToShow: 14,
  weekStartsOn: "sun",
  titleFontSize: 48,
  bodyFontSize: 24,
  titleColor: "#0f766e",
  bodyColor: "#1f2937",
  fontFamily: "",
  days: [
    { closed: true, morning: "", afternoon: "" },
    { closed: false, morning: "09:00~12:00", afternoon: "14:00~18:00" },
    { closed: false, morning: "09:00~12:00", afternoon: "14:00~18:00" },
    { closed: false, morning: "09:00~12:00", afternoon: "14:00~18:00" },
    { closed: false, morning: "09:00~12:00", afternoon: "14:00~18:00" },
    { closed: false, morning: "09:00~12:00", afternoon: "14:00~18:00" },
    { closed: false, morning: "09:00~12:00", afternoon: "" },
  ],
};

function parseConfig(raw: unknown): ClinicHoursConfig {
  const cfg = (raw && typeof raw === "object" ? raw : {}) as Partial<ClinicHoursConfig>;
  const days = Array.from({ length: 7 }, (_, index) => ({
    ...clinicHoursDefaultConfig.days[index],
    ...(Array.isArray(cfg.days) ? cfg.days[index] : {}),
  }));
  return {
    ...clinicHoursDefaultConfig,
    ...cfg,
    daysToShow: Math.min(31, Math.max(7, Number(cfg.daysToShow) || 14)),
    days,
  };
}

function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function formatDay(date: Date) {
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

const weekdayLabels = ["日", "月", "火", "水", "木", "金", "土"];

export default function ClinicHoursBoard({ board }: BoardTemplateProps) {
  const config = parseConfig(board.config);
  const today = new Date();
  const dates = Array.from({ length: config.daysToShow }, (_, index) => addDays(today, index));
  const firstDayIndex =
    config.weekStartsOn === "mon" ? (dates[0].getDay() + 6) % 7 : dates[0].getDay();
  const calendarCells: Array<Date | null> = [
    ...Array.from({ length: firstDayIndex }, () => null),
    ...dates,
  ];

  return (
    <div
      className="flex h-screen w-screen flex-col bg-[#f7fbfb] p-10"
      style={{ fontFamily: config.fontFamily || undefined }}
    >
      {config.fontFamily && <GoogleFontLoader fonts={[config.fontFamily]} />}
      <header className="mb-6">
        <h1
          className="font-bold tracking-normal"
          style={{ color: config.titleColor, fontSize: config.titleFontSize }}
        >
          {config.title || board.name}
        </h1>
        {config.body && (
          <p
            className="mt-2 max-w-5xl leading-relaxed"
            style={{ color: config.bodyColor, fontSize: config.bodyFontSize }}
          >
            {config.body}
          </p>
        )}
      </header>

      <div className="grid flex-1 auto-rows-fr gap-3" style={{ gridTemplateColumns: "repeat(7, minmax(0, 1fr))" }}>
        {calendarCells.map((date, index) => {
          if (!date) {
            return <div key={`blank-${index}`} aria-hidden="true" />;
          }

          const day = config.days[date.getDay()] ?? clinicHoursDefaultConfig.days[date.getDay()];
          const isSunday = date.getDay() === 0;
          const isSaturday = date.getDay() === 6;
          return (
            <section
              key={date.toISOString()}
              className={`flex min-h-0 flex-col rounded-lg border bg-white p-4 shadow-sm ${
                day.closed ? "border-rose-200 bg-rose-50" : "border-teal-100"
              }`}
            >
              <div className="mb-3 flex items-baseline justify-between gap-2">
                <span className="text-2xl font-bold text-slate-900">{formatDay(date)}</span>
                <span
                  className={`rounded px-2 py-0.5 text-sm font-semibold ${
                    isSunday
                      ? "bg-rose-100 text-rose-700"
                      : isSaturday
                        ? "bg-sky-100 text-sky-700"
                        : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {weekdayLabels[date.getDay()]}
                </span>
              </div>
              {day.closed ? (
                <div className="flex flex-1 items-center justify-center rounded-md bg-rose-100 text-3xl font-bold text-rose-700">
                  休診
                </div>
              ) : (
                <div className="space-y-3 text-slate-900">
                  <div className="rounded-md bg-teal-50 p-3">
                    <div className="text-sm font-semibold text-teal-700">午前</div>
                    <div className="mt-1 text-2xl font-bold">{day.morning || "—"}</div>
                  </div>
                  <div className="rounded-md bg-cyan-50 p-3">
                    <div className="text-sm font-semibold text-cyan-700">午後</div>
                    <div className="mt-1 text-2xl font-bold">{day.afternoon || "—"}</div>
                  </div>
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
