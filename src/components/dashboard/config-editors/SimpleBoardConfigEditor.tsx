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

/** Ticker color/style presets */
const TICKER_PRESETS = [
  { label: "ダーク（デフォルト）", textColor: "#ffffff", tickerBgColor: "#1a1a2e" },
  { label: "白背景", textColor: "#1a1a2e", tickerBgColor: "#ffffff" },
  { label: "ネオンブルー", textColor: "#00e5ff", tickerBgColor: "#0d1117" },
  { label: "ネオングリーン", textColor: "#39ff14", tickerBgColor: "#0a0a0a" },
  { label: "サンセット", textColor: "#ffffff", tickerBgColor: "#e65100" },
  { label: "ロイヤルブルー", textColor: "#ffd700", tickerBgColor: "#1a237e" },
  { label: "チェリー", textColor: "#ffffff", tickerBgColor: "#c2185b" },
  { label: "フォレスト", textColor: "#e8f5e9", tickerBgColor: "#1b5e20" },
];

interface SimpleBoardConfigEditorProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

export function SimpleBoardConfigEditor({
  config,
  onChange,
}: SimpleBoardConfigEditorProps) {
  useLoadAllGoogleFonts();

  const slideInterval = (config.slideInterval as number) ?? 5;
  const tickerSpeed = (config.tickerSpeed as number) ?? 60;
  const backgroundColor = (config.backgroundColor as string) ?? "#000000";
  const textColor = (config.textColor as string) ?? "#ffffff";
  const tickerBgColor = (config.tickerBgColor as string) ?? "#1a1a2e";
  const tickerFontFamily = (config.tickerFontFamily as string) ?? "";

  function update(key: string, value: unknown) {
    onChange({ ...config, [key]: value });
  }

  function applyPreset(preset: (typeof TICKER_PRESETS)[number]) {
    onChange({
      ...config,
      textColor: preset.textColor,
      tickerBgColor: preset.tickerBgColor,
    });
  }

  return (
    <div className="space-y-6">
      {/* Slideshow settings */}
      <div>
        <h4 className="mb-3 text-sm font-semibold">スライドショー</h4>
        <div className="space-y-3">
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
        </div>
      </div>

      {/* Ticker settings */}
      <div>
        <h4 className="mb-3 text-sm font-semibold">ティッカー（流れる文字）</h4>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="cfg-tickerSpeed">スクロール速度（px/秒）</Label>
            <Input
              id="cfg-tickerSpeed"
              type="number"
              min={10}
              max={500}
              value={tickerSpeed}
              onChange={(e) =>
                update("tickerSpeed", Math.max(10, parseInt(e.target.value, 10) || 60))
              }
              className="w-24"
            />
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
            <Label htmlFor="cfg-tickerBg">背景色</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                id="cfg-tickerBg"
                value={tickerBgColor}
                onChange={(e) => update("tickerBgColor", e.target.value)}
                className="h-9 w-12 cursor-pointer rounded border"
              />
              <Input
                value={tickerBgColor}
                onChange={(e) => update("tickerBgColor", e.target.value)}
                className="w-28 font-mono text-sm"
                maxLength={7}
              />
            </div>
          </div>

          {/* Preview */}
          <div className="space-y-1.5">
            <Label>プレビュー</Label>
            <div
              className="flex h-10 items-center overflow-hidden rounded-md border px-3 text-sm font-medium"
              style={{
                color: textColor,
                backgroundColor: tickerBgColor,
                fontFamily: tickerFontFamily || undefined,
              }}
            >
              サンプルテキストが流れます　　　お知らせ情報
            </div>
          </div>

          {/* Color presets */}
          <div className="space-y-1.5">
            <Label>カラープリセット</Label>
            <div className="flex flex-wrap gap-2">
              {TICKER_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => applyPreset(preset)}
                  className="flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors hover:bg-accent"
                >
                  <span
                    className="inline-block size-3 rounded-full border"
                    style={{ backgroundColor: preset.tickerBgColor }}
                  />
                  <span
                    className="inline-block size-3 rounded-full border"
                    style={{ backgroundColor: preset.textColor }}
                  />
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Font family */}
          <div className="space-y-1.5">
            <Label htmlFor="cfg-font">フォント</Label>
            <Select
              value={tickerFontFamily}
              onValueChange={(v) => update("tickerFontFamily", v === "__default__" ? "" : v)}
            >
              <SelectTrigger id="cfg-font" className="w-64">
                <SelectValue placeholder="フォントを選択" />
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
      </div>
    </div>
  );
}
