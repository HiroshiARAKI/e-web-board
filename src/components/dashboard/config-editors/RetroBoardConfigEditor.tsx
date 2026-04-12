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

interface RetroBoardConfigEditorProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

export function RetroBoardConfigEditor({
  config,
  onChange,
}: RetroBoardConfigEditorProps) {
  const displayColor = (config.displayColor as string) ?? "green";
  const rows = (config.rows as number) ?? 5;
  const flipSpeed = (config.flipSpeed as number) ?? 0.08;
  const switchInterval = (config.switchInterval as number) ?? 5;

  function update(key: string, value: unknown) {
    onChange({ ...config, [key]: value });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="cfg-displayColor">表示カラー</Label>
        <Select value={displayColor} onValueChange={(v) => update("displayColor", v)}>
          <SelectTrigger id="cfg-displayColor" className="w-48">
            <SelectValue />
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
    </div>
  );
}
