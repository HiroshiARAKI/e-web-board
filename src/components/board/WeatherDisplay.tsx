"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";

interface WeatherData {
  telop: string;
  image: { url: string; title: string; width: number; height: number };
  chanceOfRain: {
    T00_06: string;
    T06_12: string;
    T12_18: string;
    T18_24: string;
  };
  temperature: {
    min: { celsius: string | null };
    max: { celsius: string | null };
  };
}

interface WeatherDisplayProps {
  color?: string;
  bgOpacity?: number;
}

/** Get the current time slot label */
function currentRainSlot(rain: WeatherData["chanceOfRain"]): {
  label: string;
  value: string;
} {
  const hour = new Date().getHours();
  if (hour < 6) return { label: "0-6時", value: rain.T00_06 };
  if (hour < 12) return { label: "6-12時", value: rain.T06_12 };
  if (hour < 18) return { label: "12-18時", value: rain.T12_18 };
  return { label: "18-24時", value: rain.T18_24 };
}

export function WeatherDisplay({
  color = "#ffffff",
  bgOpacity = 0.5,
}: WeatherDisplayProps) {
  const [weather, setWeather] = useState<WeatherData | null>(null);

  const fetchWeather = useCallback(async () => {
    try {
      const res = await fetch("/api/weather");
      if (!res.ok) return;
      const data = await res.json();
      setWeather(data);
    } catch {
      // silently ignore
    }
  }, []);

  useEffect(() => {
    fetchWeather();
    // Refresh every 30 minutes
    const interval = setInterval(fetchWeather, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchWeather]);

  if (!weather) return null;

  const rain = currentRainSlot(weather.chanceOfRain);

  return (
    <div
      className="flex items-center gap-3 rounded-xl px-4 py-2"
      style={{
        backgroundColor: `rgba(0,0,0,${bgOpacity})`,
        color,
      }}
    >
      {/* Weather icon */}
      {weather.image?.url && (
        <Image
          src={weather.image.url}
          alt={weather.image.title || weather.telop}
          width={50}
          height={40}
          className="shrink-0"
          unoptimized
        />
      )}

      <div className="flex flex-col gap-0.5 text-sm leading-tight">
        {/* Telop (e.g. 晴れ) */}
        <span className="font-bold text-base">{weather.telop}</span>

        {/* Chance of rain */}
        <span className="opacity-80">
          降水 {rain.label}: {rain.value}
        </span>

        {/* Temperature */}
        {(weather.temperature.max.celsius ||
          weather.temperature.min.celsius) && (
          <span className="opacity-80">
            {weather.temperature.max.celsius &&
              `最高 ${weather.temperature.max.celsius}°C`}
            {weather.temperature.max.celsius &&
              weather.temperature.min.celsius &&
              " / "}
            {weather.temperature.min.celsius &&
              `最低 ${weather.temperature.min.celsius}°C`}
          </span>
        )}
      </div>
    </div>
  );
}
