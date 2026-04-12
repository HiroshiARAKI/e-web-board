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

interface MessageBoardConfigEditorProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

export function MessageBoardConfigEditor({
  config,
  onChange,
}: MessageBoardConfigEditorProps) {
  const maxDisplayCount = (config.maxDisplayCount as number) ?? 10;
  const fontSize = (config.fontSize as string) ?? "text-xl";
  const backgroundColor = (config.backgroundColor as string) ?? "#1e293b";
  const textColor = (config.textColor as string) ?? "#f8fafc";
  const accentColor = (config.accentColor as string) ?? "#3b82f6";

  function update(key: string, value: unknown) {
    onChange({ ...config, [key]: value });
  }

  return (
    <div className="space-y-4">
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
        <Label htmlFor="cfg-fontSize">文字サイズ</Label>
        <Select value={fontSize} onValueChange={(v) => update("fontSize", v)}>
          <SelectTrigger id="cfg-fontSize" className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="text-base">小</SelectItem>
            <SelectItem value="text-lg">やや小</SelectItem>
            <SelectItem value="text-xl">中</SelectItem>
            <SelectItem value="text-2xl">大</SelectItem>
            <SelectItem value="text-3xl">特大</SelectItem>
          </SelectContent>
        </Select>
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
