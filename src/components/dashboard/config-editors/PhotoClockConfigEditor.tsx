// Copyright 2026 Hiroshi Araki (https://hiroshi.araki.tech)
// SPDX-License-Identifier: Apache-2.0
"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

interface PhotoClockConfigEditorProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

export function PhotoClockConfigEditor({
  config,
  onChange,
}: PhotoClockConfigEditorProps) {
  const slideInterval = (config.slideInterval as number) ?? 8;
  const clockPosition = (config.clockPosition as string) ?? "bottom-right";
  const clockFontSize = (config.clockFontSize as number) ?? 48;
  const clockColor = (config.clockColor as string) ?? "#ffffff";
  const clockBgOpacity = (config.clockBgOpacity as number) ?? 0.5;
  const clockLayout = (config.clockLayout as string) ?? "standard";
  const is24Hour = (config.is24Hour as boolean) ?? true;
  const showWeather = (config.showWeather as boolean) ?? false;
  const objectFit = (config.objectFit as string) ?? "contain";

  const positionLabels: Record<string, string> = {
    "top-left": "左上",
    "top-right": "右上",
    center: "中央",
    "bottom-left": "左下",
    "bottom-right": "右下",
  };

  const layoutLabels: Record<string, string> = {
    standard: "スタンダード（時刻 → 日付）",
    compact: "コンパクト（横並び）",
    "large-time": "大時刻（時分を大きく表示）",
    "date-top": "日付上（日付 → 時刻）",
  };

  function update(key: string, value: unknown) {
    onChange({ ...config, [key]: value });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="cfg-slideInterval">スライド間隔（秒）</Label>
        <Input
          id="cfg-slideInterval"
          type="number"
          min={1}
          max={300}
          value={slideInterval}
          onChange={(e) =>
            update("slideInterval", Math.max(1, parseInt(e.target.value, 10) || 1))
          }
          className="w-24"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="cfg-objectFit">メディア表示モード</Label>
        <Select value={objectFit} onValueChange={(v) => update("objectFit", v)}>
          <SelectTrigger id="cfg-objectFit" className="w-72">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="contain">全体表示（余白ができる場合あり）</SelectItem>
            <SelectItem value="cover">全面表示（トリミングされる場合あり）</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="cfg-clockPos">時計の位置</Label>
        <Select value={clockPosition} onValueChange={(v) => update("clockPosition", v)}>
          <SelectTrigger id="cfg-clockPos" className="w-48">
            <SelectValue placeholder="位置を選択">{positionLabels[clockPosition] ?? clockPosition}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="top-left">左上</SelectItem>
            <SelectItem value="top-right">右上</SelectItem>
            <SelectItem value="center">中央</SelectItem>
            <SelectItem value="bottom-left">左下</SelectItem>
            <SelectItem value="bottom-right">右下</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="cfg-clockLayout">時計レイアウト</Label>
        <Select value={clockLayout} onValueChange={(v) => update("clockLayout", v)}>
          <SelectTrigger id="cfg-clockLayout" className="w-64">
            <SelectValue placeholder="レイアウトを選択">{layoutLabels[clockLayout] ?? clockLayout}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="standard">スタンダード（時刻 → 日付）</SelectItem>
            <SelectItem value="compact">コンパクト（横並び）</SelectItem>
            <SelectItem value="large-time">大時刻（時分を大きく表示）</SelectItem>
            <SelectItem value="date-top">日付上（日付 → 時刻）</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="cfg-clockSize">時計の文字サイズ: {clockFontSize}px</Label>
        <input
          id="cfg-clockSize"
          type="range"
          min={24}
          max={160}
          step={4}
          value={clockFontSize}
          onChange={(e) => update("clockFontSize", parseInt(e.target.value, 10))}
          className="w-64"
        />
        <div className="flex justify-between text-xs text-muted-foreground w-64">
          <span>24px</span>
          <span>160px</span>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="cfg-clockColor">時計の文字色</Label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            id="cfg-clockColor"
            value={clockColor}
            onChange={(e) => update("clockColor", e.target.value)}
            className="h-9 w-12 cursor-pointer rounded border"
          />
          <Input
            value={clockColor}
            onChange={(e) => update("clockColor", e.target.value)}
            className="w-28 font-mono text-sm"
            maxLength={7}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="cfg-clockOpacity">
          背景の不透明度: {Math.round(clockBgOpacity * 100)}%
        </Label>
        <input
          id="cfg-clockOpacity"
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={clockBgOpacity}
          onChange={(e) => update("clockBgOpacity", parseFloat(e.target.value))}
          className="w-48"
        />
      </div>

      <div className="flex items-center gap-3">
        <Switch
          id="cfg-24h"
          checked={is24Hour}
          onCheckedChange={(v) => update("is24Hour", v)}
        />
        <Label htmlFor="cfg-24h">24時間表示（OFFで12時間+AM/PM表記）</Label>
      </div>

      <div className="flex items-center gap-3">
        <Switch
          id="cfg-weather"
          checked={showWeather}
          onCheckedChange={(v) => update("showWeather", v)}
        />
        <Label htmlFor="cfg-weather">天気予報を表示</Label>
      </div>
      {showWeather && (
        <p className="text-xs text-muted-foreground">
          表示地域は<a href="/settings" className="underline">設定ページ</a>で変更できます。
        </p>
      )}
    </div>
  );
}
