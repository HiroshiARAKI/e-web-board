"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";

interface WeatherData {
  location: { city: string; prefecture: string };
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

  const rain = weather.chanceOfRain;
  /** "--%" → "0%" */
  const r = (v: string) => (v === "--%" ? "0%" : v);

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
          width={70}
          height={56}
          className="shrink-0"
          unoptimized
        />
      )}

      <div className="flex flex-col gap-1 text-base leading-snug">
        {/* Location header */}
        <span className="font-bold text-lg">
          {weather.location?.city ?? ""}の天気: {weather.telop}
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

        {/* Chance of rain — all time slots */}
        <div className="flex gap-2 opacity-80 text-sm">
          <span>降水確率:</span>
          <span>0-6時 {r(rain.T00_06)}</span>
          <span>6-12時 {r(rain.T06_12)}</span>
          <span>12-18時 {r(rain.T12_18)}</span>
          <span>18-24時 {r(rain.T18_24)}</span>
        </div>
      </div>
    </div>
  );
}
