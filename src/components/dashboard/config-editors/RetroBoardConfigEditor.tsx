// Copyright 2026 Hiroshi Araki (https://hiroshi.araki.tech)
// SPDX-License-Identifier: Apache-2.0
"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GOOGLE_FONTS, buildGoogleFontsUrl } from "@/lib/fonts";
import { useEffect } from "react";

/** Load ALL Google Fonts so the dropdown and preview can display them */
function useLoadAllGoogleFonts() {
  useEffect(() => {
    const families = GOOGLE_FONTS.map((f) => f.value).filter(Boolean);
    const url = buildGoogleFontsUrl(families);
    if (!url) return;

    const linkId = "google-fonts-all";
    if (document.getElementById(linkId)) return;

    const link = document.createElement("link");
    link.id = linkId;
    link.rel = "stylesheet";
    link.href = url;
    document.head.appendChild(link);
  }, []);
}

interface RetroBoardConfigEditorProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

export function RetroBoardConfigEditor({
  config,
  onChange,
}: RetroBoardConfigEditorProps) {
  useLoadAllGoogleFonts();

  const displayColor = (config.displayColor as string) ?? "green";
  const rows = (config.rows as number) ?? 5;
  const flipSpeed = (config.flipSpeed as number) ?? 0.08;
  const switchInterval = (config.switchInterval as number) ?? 5;
  const showClock = (config.showClock as boolean) ?? false;
  const showWeather = (config.showWeather as boolean) ?? false;
  const fontFamily = (config.fontFamily as string) ?? "";

  const colorLabels: Record<string, string> = {
    green: "グリーン",
    orange: "オレンジ",
    white: "ホワイト",
  };

  function update(key: string, value: unknown) {
    onChange({ ...config, [key]: value });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="cfg-displayColor">表示カラー</Label>
        <Select value={displayColor} onValueChange={(v) => update("displayColor", v)}>
          <SelectTrigger id="cfg-displayColor" className="w-full max-w-48">
            <SelectValue placeholder="カラーを選択">{colorLabels[displayColor] ?? displayColor}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="green">
              <span className="flex items-center gap-2">
                <span className="inline-block size-3 rounded-full" style={{ backgroundColor: "#39ff14" }} />
                グリーン
              </span>
            </SelectItem>
            <SelectItem value="orange">
              <span className="flex items-center gap-2">
                <span className="inline-block size-3 rounded-full" style={{ backgroundColor: "#ff8c00" }} />
                オレンジ
              </span>
            </SelectItem>
            <SelectItem value="white">
              <span className="flex items-center gap-2">
                <span className="inline-block size-3 rounded-full border" style={{ backgroundColor: "#f0f0f0" }} />
                ホワイト
              </span>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="cfg-rows">表示行数</Label>
        <Input
          id="cfg-rows"
          type="number"
          min={1}
          max={20}
          value={rows}
          onChange={(e) =>
            update("rows", Math.max(1, parseInt(e.target.value, 10) || 5))
          }
          className="w-24"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="cfg-flipSpeed">フリップ速度（秒/文字）</Label>
        <Input
          id="cfg-flipSpeed"
          type="number"
          min={0.01}
          max={1}
          step={0.01}
          value={flipSpeed}
          onChange={(e) =>
            update("flipSpeed", Math.max(0.01, parseFloat(e.target.value) || 0.08))
          }
          className="w-24"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="cfg-switchInterval">切替間隔（秒）</Label>
        <Input
          id="cfg-switchInterval"
          type="number"
          min={1}
          max={300}
          value={switchInterval}
          onChange={(e) =>
            update("switchInterval", Math.max(1, parseInt(e.target.value, 10) || 5))
          }
          className="w-24"
        />
      </div>

      <div className="flex flex-wrap items-start gap-3">
        <Switch
          id="cfg-showClock"
          checked={showClock}
          onCheckedChange={(v) => update("showClock", v)}
        />
        <Label htmlFor="cfg-showClock">現在時刻を表示</Label>
      </div>

      <div className="flex flex-wrap items-start gap-3">
        <Switch
          id="cfg-showWeather"
          checked={showWeather}
          onCheckedChange={(v) => update("showWeather", v)}
        />
        <Label htmlFor="cfg-showWeather">天気予報を表示</Label>
      </div>
      {showWeather && (
        <p className="text-xs text-muted-foreground">
          表示地域は<a href="/settings" className="underline">設定ページ</a>で変更できます。
        </p>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="cfg-font">フォント</Label>
        <Select
          value={fontFamily}
          onValueChange={(v) => update("fontFamily", v === "__default__" ? "" : v)}
        >
          <SelectTrigger id="cfg-font" className="w-full max-w-64">
            <SelectValue placeholder="フォントを選択">
              {GOOGLE_FONTS.find((f) => f.value === fontFamily)?.label ?? "デフォルト"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {GOOGLE_FONTS.map((f) => (
              <SelectItem
                key={f.value || "__default__"}
                value={f.value || "__default__"}
                style={f.value ? { fontFamily: f.value } : undefined}
              >
                {f.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
