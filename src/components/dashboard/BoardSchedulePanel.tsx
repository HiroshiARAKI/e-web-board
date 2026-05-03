// Copyright 2026 Hiroshi Araki (https://hiroshi.araki.tech)
// SPDX-License-Identifier: Apache-2.0
"use client";

import { CalendarDays, Clock3, Image as ImageIcon, MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DEFAULT_DISPLAY_SCHEDULE,
  getScheduleMap,
  normalizeDisplaySchedule,
  type DisplaySchedule,
  type ScheduleCapability,
  type ScheduleMap,
} from "@/lib/scheduling";
import { thumbUrl } from "@/lib/utils";
import type { MediaItem, Message } from "@/types";

interface BoardSchedulePanelProps {
  templateId: string;
  config: Record<string, unknown>;
  mediaItems: MediaItem[];
  messages: Message[];
  scheduling: ScheduleCapability;
  onChange: (config: Record<string, unknown>) => void;
}

const WEEKDAYS = [
  { value: 0, label: "日" },
  { value: 1, label: "月" },
  { value: 2, label: "火" },
  { value: 3, label: "水" },
  { value: 4, label: "木" },
  { value: 5, label: "金" },
  { value: 6, label: "土" },
] as const;

function planLabel(capability: ScheduleCapability) {
  switch (capability) {
    case "none":
      return "このプランではスケジュール機能は利用できません";
    case "time_weekday":
      return "時間帯と曜日を指定できます。日付期間は Standard 以上で利用できます";
    case "full":
      return "時間帯、曜日、日付期間を指定できます";
  }
}

function scheduleModeLabel(schedule: DisplaySchedule) {
  return schedule.mode === "scheduled" ? "指定する" : "常に表示";
}

function sanitizeMap(map: ScheduleMap) {
  return Object.fromEntries(
    Object.entries(map).filter(([, schedule]) => schedule.mode === "scheduled"),
  );
}

function itemName(item: MediaItem) {
  return item.filePath.split("/").pop() ?? item.filePath;
}

interface ScheduleControlsProps {
  idPrefix: string;
  schedule: DisplaySchedule;
  capability: ScheduleCapability;
  onChange: (schedule: DisplaySchedule) => void;
}

function ScheduleControls({
  idPrefix,
  schedule,
  capability,
  onChange,
}: ScheduleControlsProps) {
  const disabled = capability === "none";
  const isScheduled = schedule.mode === "scheduled";

  function update(patch: Partial<DisplaySchedule>) {
    onChange({ ...schedule, ...patch });
  }

  function toggleDay(day: number) {
    const days = schedule.daysOfWeek.includes(day)
      ? schedule.daysOfWeek.filter((value) => value !== day)
      : [...schedule.daysOfWeek, day].sort((a, b) => a - b);
    update({ daysOfWeek: days });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={schedule.mode}
          disabled={disabled}
          onValueChange={(value) => {
            update({
              ...(value === "scheduled" ? DEFAULT_DISPLAY_SCHEDULE : schedule),
              mode: value === "scheduled" ? "scheduled" : "always",
            });
          }}
        >
          <SelectTrigger id={`${idPrefix}-mode`} className="w-40">
            <SelectValue>{scheduleModeLabel(schedule)}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="always">常に表示</SelectItem>
            <SelectItem value="scheduled">指定する</SelectItem>
          </SelectContent>
        </Select>
        {schedule.mode === "scheduled" && (
          <Badge variant="secondary" className="gap-1">
            <Clock3 className="size-3" />
            スケジュール中
          </Badge>
        )}
      </div>

      {isScheduled && (
        <div className="grid gap-3 rounded-md border bg-muted/20 p-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor={`${idPrefix}-start-time`}>開始時刻</Label>
            <Input
              id={`${idPrefix}-start-time`}
              type="time"
              value={schedule.startTime}
              disabled={disabled}
              onChange={(event) => update({ startTime: event.target.value || "00:00" })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`${idPrefix}-end-time`}>終了時刻</Label>
            <Input
              id={`${idPrefix}-end-time`}
              type="time"
              value={schedule.endTime}
              disabled={disabled}
              onChange={(event) => update({ endTime: event.target.value || "23:59" })}
            />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label>曜日</Label>
            <div className="flex flex-wrap gap-2">
              {WEEKDAYS.map((day) => {
                const checked = schedule.daysOfWeek.includes(day.value);
                return (
                  <label
                    key={day.value}
                    className={`inline-flex h-8 min-w-8 cursor-pointer items-center justify-center rounded-md border px-2 text-sm transition-colors ${
                      checked
                        ? "border-primary bg-primary text-primary-foreground"
                        : "bg-background hover:bg-accent"
                    } ${disabled ? "pointer-events-none opacity-50" : ""}`}
                  >
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={checked}
                      disabled={disabled}
                      onChange={() => toggleDay(day.value)}
                    />
                    {day.label}
                  </label>
                );
              })}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={disabled}
                onClick={() => update({ daysOfWeek: [] })}
              >
                毎日
              </Button>
            </div>
          </div>

          {capability === "full" && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor={`${idPrefix}-start-date`}>開始日</Label>
                <Input
                  id={`${idPrefix}-start-date`}
                  type="date"
                  value={schedule.startDate}
                  onChange={(event) => update({ startDate: event.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`${idPrefix}-end-date`}>終了日</Label>
                <Input
                  id={`${idPrefix}-end-date`}
                  type="date"
                  value={schedule.endDate}
                  onChange={(event) => update({ endDate: event.target.value })}
                />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export function BoardSchedulePanel({
  templateId,
  config,
  mediaItems,
  messages,
  scheduling,
  onChange,
}: BoardSchedulePanelProps) {
  const isSimple = templateId === "simple";
  const isPhotoClock = templateId === "photo-clock";
  if (!isSimple && !isPhotoClock) return null;

  const mediaSchedules = getScheduleMap(config.mediaSchedules);
  const messageSchedules = getScheduleMap(config.messageSchedules);
  const sortedMedia = [...mediaItems].sort((a, b) => a.displayOrder - b.displayOrder);
  const imageItems = sortedMedia.filter((item) => item.type === "image");
  const fallbackMediaId =
    typeof config.fallbackMediaId === "string" ? config.fallbackMediaId : "";

  function updateSchedule(kind: "mediaSchedules" | "messageSchedules", id: string, schedule: DisplaySchedule) {
    const currentMap = getScheduleMap(config[kind]);
    const nextMap = sanitizeMap({
      ...currentMap,
      [id]: schedule,
    });
    onChange({
      ...config,
      [kind]: nextMap,
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarDays className="size-4" />
          スケジュール
        </CardTitle>
        <CardDescription>{planLabel(scheduling)}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {scheduling !== "none" && (
          <div className="space-y-1.5">
            <Label htmlFor="schedule-fallback">表示対象がない時の画像</Label>
            <Select
              value={fallbackMediaId || "__none__"}
              onValueChange={(value) =>
                onChange({
                  ...config,
                  fallbackMediaId: value === "__none__" ? "" : value,
                })
              }
            >
              <SelectTrigger id="schedule-fallback" className="w-full max-w-md">
                <SelectValue placeholder="デフォルト（黒画にKeinageロゴ）" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">デフォルト（黒画にKeinageロゴ）</SelectItem>
                {imageItems.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {itemName(item)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-3">
          <h4 className="text-sm font-semibold">画像・動画</h4>
          {sortedMedia.length === 0 ? (
            <p className="rounded-md border border-dashed px-3 py-4 text-center text-sm text-muted-foreground">
              メディアを追加すると、ここで表示スケジュールを設定できます。
            </p>
          ) : (
            <div className="space-y-2">
              {sortedMedia.map((item) => {
                const schedule = normalizeDisplaySchedule(mediaSchedules[item.id]);
                return (
                  <div key={item.id} className="rounded-md border p-3">
                    <div className="mb-3 flex flex-wrap items-center gap-3">
                      <div className="relative size-10 shrink-0 overflow-hidden rounded border bg-muted">
                        <img
                          src={thumbUrl(item.filePath)}
                          alt=""
                          className="size-full object-cover"
                          onError={(event) => {
                            if (item.type === "image") {
                              (event.currentTarget as HTMLImageElement).src = item.filePath;
                            } else {
                              event.currentTarget.style.display = "none";
                            }
                          }}
                        />
                      </div>
                      <Badge variant="outline" className="gap-1">
                        <ImageIcon className="size-3" />
                        {item.type}
                      </Badge>
                      <span className="min-w-0 flex-1 truncate font-mono text-xs text-muted-foreground">
                        {itemName(item)}
                      </span>
                    </div>
                    <ScheduleControls
                      idPrefix={`media-${item.id}`}
                      schedule={schedule}
                      capability={scheduling}
                      onChange={(nextSchedule) =>
                        updateSchedule("mediaSchedules", item.id, nextSchedule)
                      }
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {isSimple && (
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">メッセージ</h4>
            {messages.length === 0 ? (
              <p className="rounded-md border border-dashed px-3 py-4 text-center text-sm text-muted-foreground">
                メッセージを追加すると、ここで表示スケジュールを設定できます。
              </p>
            ) : (
              <div className="space-y-2">
                {[...messages]
                  .sort((a, b) => b.priority - a.priority)
                  .map((message) => {
                    const schedule = normalizeDisplaySchedule(messageSchedules[message.id]);
                    return (
                      <div key={message.id} className="rounded-md border p-3">
                        <div className="mb-3 flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className="gap-1">
                            <MessageSquare className="size-3" />
                            P{message.priority}
                          </Badge>
                          <span className="min-w-0 flex-1 truncate text-sm">
                            {message.content}
                          </span>
                        </div>
                        <ScheduleControls
                          idPrefix={`message-${message.id}`}
                          schedule={schedule}
                          capability={scheduling}
                          onChange={(nextSchedule) =>
                            updateSchedule("messageSchedules", message.id, nextSchedule)
                          }
                        />
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
