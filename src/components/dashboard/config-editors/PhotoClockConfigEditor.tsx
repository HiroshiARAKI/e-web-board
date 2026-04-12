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
  const clockFontSize = (config.clockFontSize as string) ?? "text-5xl";
  const clockColor = (config.clockColor as string) ?? "#ffffff";
  const clockBgOpacity = (config.clockBgOpacity as number) ?? 0.5;
  const is24Hour = (config.is24Hour as boolean) ?? true;

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
        <Label htmlFor="cfg-clockPos">時計の位置</Label>
        <Select value={clockPosition} onValueChange={(v) => update("clockPosition", v)}>
          <SelectTrigger id="cfg-clockPos" className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="top-left">左上</SelectItem>
            <SelectItem value="top-right">右上</SelectItem>
            <SelectItem value="bottom-left">左下</SelectItem>
            <SelectItem value="bottom-right">右下</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="cfg-clockSize">時計のサイズ</Label>
        <Select value={clockFontSize} onValueChange={(v) => update("clockFontSize", v)}>
          <SelectTrigger id="cfg-clockSize" className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="text-3xl">小</SelectItem>
            <SelectItem value="text-5xl">中</SelectItem>
            <SelectItem value="text-7xl">大</SelectItem>
            <SelectItem value="text-9xl">特大</SelectItem>
          </SelectContent>
        </Select>
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
        <Label htmlFor="cfg-24h">24時間表示</Label>
      </div>
    </div>
  );
}
