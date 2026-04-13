// Copyright 2026 Hiroshi Araki (https://hiroshi.araki.tech)
// SPDX-License-Identifier: Apache-2.0
"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/** Color presets for Light / Dark themes */
const COLOR_PRESETS = [
  {
    label: "ダーク（デフォルト）",
    backgroundColor: "#1a1a2e",
    waitingTextColor: "#ffffff",
    calledTextColor: "#00ff88",
    highlightColor: "#ff6b35",
  },
  {
    label: "ライト",
    backgroundColor: "#f5f5f5",
    waitingTextColor: "#333333",
    calledTextColor: "#16a34a",
    highlightColor: "#dc2626",
  },
  {
    label: "ネイビー",
    backgroundColor: "#0f172a",
    waitingTextColor: "#e2e8f0",
    calledTextColor: "#38bdf8",
    highlightColor: "#f59e0b",
  },
  {
    label: "ホスピタルグリーン",
    backgroundColor: "#ecfdf5",
    waitingTextColor: "#1e3a2f",
    calledTextColor: "#059669",
    highlightColor: "#dc2626",
  },
];

interface CallNumberConfigEditorProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

export function CallNumberConfigEditor({
  config,
  onChange,
}: CallNumberConfigEditorProps) {
  const showClock = (config.showClock as boolean) ?? true;
  const backgroundColor = (config.backgroundColor as string) ?? "#1a1a2e";
  const waitingTextColor = (config.waitingTextColor as string) ?? "#ffffff";
  const calledTextColor = (config.calledTextColor as string) ?? "#00ff88";
  const highlightColor = (config.highlightColor as string) ?? "#ff6b35";
  const layout = (config.layout as string) ?? "horizontal";
  const calledExpireMinutes = (config.calledExpireMinutes as number) ?? 5;
  const numberFontSize = (config.numberFontSize as number) ?? 60;

  function update(key: string, value: unknown) {
    onChange({ ...config, [key]: value });
  }

  function applyPreset(preset: (typeof COLOR_PRESETS)[number]) {
    onChange({
      ...config,
      backgroundColor: preset.backgroundColor,
      waitingTextColor: preset.waitingTextColor,
      calledTextColor: preset.calledTextColor,
      highlightColor: preset.highlightColor,
    });
  }

  return (
    <div className="space-y-6">
      {/* Clock */}
      <div>
        <h4 className="mb-3 text-sm font-semibold">時計</h4>
        <div className="flex items-center gap-3">
          <Switch
            id="cfg-showClock"
            checked={showClock}
            onCheckedChange={(v) => update("showClock", v)}
          />
          <Label htmlFor="cfg-showClock">日付・時刻を表示</Label>
        </div>
      </div>

      {/* Layout */}
      <div>
        <h4 className="mb-3 text-sm font-semibold">レイアウト</h4>
        <div className="space-y-1.5">
          <Label htmlFor="cfg-layout">レーン配置</Label>
          <Select value={layout} onValueChange={(v) => update("layout", v)}>
            <SelectTrigger id="cfg-layout" className="w-48">
              <SelectValue>
                {layout === "horizontal" ? "横レイアウト" : "縦レイアウト"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="horizontal">横レイアウト</SelectItem>
              <SelectItem value="vertical">縦レイアウト</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Number display */}
      <div>
        <h4 className="mb-3 text-sm font-semibold">番号表示</h4>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="cfg-numberFontSize">番号のフォントサイズ ({numberFontSize}px)</Label>
            <input
              id="cfg-numberFontSize"
              type="range"
              min={24}
              max={120}
              step={2}
              value={numberFontSize}
              onChange={(e) => update("numberFontSize", Number(e.target.value))}
              className="w-48"
            />
            <div className="flex w-48 justify-between text-xs text-muted-foreground">
              <span>24px</span>
              <span>120px</span>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cfg-calledExpire">呼び出し済み番号の自動削除 (分)</Label>
            <Input
              id="cfg-calledExpire"
              type="number"
              min={1}
              max={60}
              value={calledExpireMinutes}
              onChange={(e) => update("calledExpireMinutes", parseInt(e.target.value, 10) || 5)}
              className="w-28"
            />
            <p className="text-xs text-muted-foreground">
              呼び出し後、指定時間が経過した番号はボード画面から自動で削除されます
            </p>
          </div>
        </div>
      </div>

      {/* Color presets */}
      <div>
        <h4 className="mb-3 text-sm font-semibold">カラープリセット</h4>
        <div className="flex flex-wrap gap-2">
          {COLOR_PRESETS.map((preset) => (
            <Button
              key={preset.label}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => applyPreset(preset)}
              className="gap-2"
            >
              <span
                className="inline-block size-3 rounded-full border"
                style={{ backgroundColor: preset.backgroundColor }}
              />
              {preset.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Colors */}
      <div>
        <h4 className="mb-3 text-sm font-semibold">カラー設定</h4>
        <div className="space-y-3">
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
            <Label htmlFor="cfg-waitingColor">呼び出し前のテキスト色</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                id="cfg-waitingColor"
                value={waitingTextColor}
                onChange={(e) => update("waitingTextColor", e.target.value)}
                className="h-9 w-12 cursor-pointer rounded border"
              />
              <Input
                value={waitingTextColor}
                onChange={(e) => update("waitingTextColor", e.target.value)}
                className="w-28 font-mono text-sm"
                maxLength={7}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cfg-calledColor">呼び出し済みのテキスト色</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                id="cfg-calledColor"
                value={calledTextColor}
                onChange={(e) => update("calledTextColor", e.target.value)}
                className="h-9 w-12 cursor-pointer rounded border"
              />
              <Input
                value={calledTextColor}
                onChange={(e) => update("calledTextColor", e.target.value)}
                className="w-28 font-mono text-sm"
                maxLength={7}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cfg-highlightColor">直近呼び出しのハイライト色</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                id="cfg-highlightColor"
                value={highlightColor}
                onChange={(e) => update("highlightColor", e.target.value)}
                className="h-9 w-12 cursor-pointer rounded border"
              />
              <Input
                value={highlightColor}
                onChange={(e) => update("highlightColor", e.target.value)}
                className="w-28 font-mono text-sm"
                maxLength={7}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
