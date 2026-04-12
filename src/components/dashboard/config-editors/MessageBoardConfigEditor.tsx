// Copyright 2026 Hiroshi Araki (https://hiroshi.araki.tech)
// SPDX-License-Identifier: Apache-2.0
"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

interface MessageBoardConfigEditorProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

export function MessageBoardConfigEditor({
  config,
  onChange,
}: MessageBoardConfigEditorProps) {
  const maxDisplayCount = (config.maxDisplayCount as number) ?? 10;
  const fontSize = (config.fontSize as number) ?? 20;
  const backgroundColor = (config.backgroundColor as string) ?? "#1e293b";
  const textColor = (config.textColor as string) ?? "#f8fafc";
  const accentColor = (config.accentColor as string) ?? "#3b82f6";
  const showClock = (config.showClock as boolean) ?? false;
  const showWeather = (config.showWeather as boolean) ?? false;

  function update(key: string, value: unknown) {
    onChange({ ...config, [key]: value });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Switch
          id="cfg-showClock"
          checked={showClock}
          onCheckedChange={(v) => update("showClock", v)}
        />
        <Label htmlFor="cfg-showClock">現在時刻を表示</Label>
      </div>

      <div className="flex items-center gap-3">
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
        <Label htmlFor="cfg-maxDisplay">最大表示件数</Label>
        <Input
          id="cfg-maxDisplay"
          type="number"
          min={1}
          max={100}
          value={maxDisplayCount}
          onChange={(e) =>
            update("maxDisplayCount", Math.max(1, parseInt(e.target.value, 10) || 10))
          }
          className="w-24"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="cfg-fontSize">文字サイズ ({fontSize}px)</Label>
        <input
          id="cfg-fontSize"
          type="range"
          min={12}
          max={48}
          step={1}
          value={fontSize}
          onChange={(e) => update("fontSize", Number(e.target.value))}
          className="w-48"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="cfg-bgColor">背景色</Label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            id="cfg-bgColor"
            value={backgroundColor}
            onChange={(e) => update("backgroundColor", e.target.value)}
            className="h-9 w-12 cursor-pointer rounded border"
          />
          <Input
            value={backgroundColor}
            onChange={(e) => update("backgroundColor", e.target.value)}
            className="w-28 font-mono text-sm"
            maxLength={7}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="cfg-textColor">文字色</Label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            id="cfg-textColor"
            value={textColor}
            onChange={(e) => update("textColor", e.target.value)}
            className="h-9 w-12 cursor-pointer rounded border"
          />
          <Input
            value={textColor}
            onChange={(e) => update("textColor", e.target.value)}
            className="w-28 font-mono text-sm"
            maxLength={7}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="cfg-accentColor">アクセントカラー</Label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            id="cfg-accentColor"
            value={accentColor}
            onChange={(e) => update("accentColor", e.target.value)}
            className="h-9 w-12 cursor-pointer rounded border"
          />
          <Input
            value={accentColor}
            onChange={(e) => update("accentColor", e.target.value)}
            className="w-28 font-mono text-sm"
            maxLength={7}
          />
        </div>
      </div>
    </div>
  );
}
