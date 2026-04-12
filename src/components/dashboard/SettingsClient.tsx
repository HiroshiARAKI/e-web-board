// Copyright 2026 Hiroshi Araki (https://hiroshi.araki.tech)
// SPDX-License-Identifier: Apache-2.0
"use client";

import { useState, useEffect, useCallback } from "react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { WEATHER_AREAS, DEFAULT_CITY_ID } from "@/lib/weather-areas";
import type { WeatherPrefecture } from "@/lib/weather-areas";

interface MediaItemWithBoard {
  id: string;
  boardId: string;
  type: string;
  filePath: string;
  displayOrder: number;
  duration: number;
  createdAt: string;
  updatedAt: string;
  boardName: string | null;
}

export function SettingsClient() {
  const [cityId, setCityId] = useState(DEFAULT_CITY_ID);
  const [selectedPref, setSelectedPref] = useState<WeatherPrefecture | null>(
    null,
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [deleteResult, setDeleteResult] = useState<string | null>(null);
  const [mediaList, setMediaList] = useState<MediaItemWithBoard[]>([]);
  const [mediaLoading, setMediaLoading] = useState(true);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);

  const fetchMedia = useCallback(async () => {
    try {
      const res = await fetch("/api/media");
      if (res.ok) {
        setMediaList(await res.json());
      }
    } finally {
      setMediaLoading(false);
    }
  }, []);

  // Load current settings
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/settings");
        if (!res.ok) return;
        const data = await res.json();
        const saved = data.weatherCityId ?? DEFAULT_CITY_ID;
        setCityId(saved);
        // Find the prefecture for the saved city
        const pref = WEATHER_AREAS.find((p) =>
          p.cities.some((c) => c.id === saved),
        );
        if (pref) setSelectedPref(pref);
      } finally {
        setLoading(false);
      }
    })();
    fetchMedia();
  }, [fetchMedia]);

  function handlePrefChange(prefName: string | null) {
    if (!prefName) return;
    const pref = WEATHER_AREAS.find((p) => p.name === prefName) ?? null;
    setSelectedPref(pref);
    // Auto-select first city
    if (pref && pref.cities.length > 0) {
      setCityId(pref.cities[0].id);
    }
    setSaved(false);
  }

  function handleCityChange(id: string | null) {
    if (!id) return;
    setCityId(id);
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weatherCityId: cityId }),
      });
      if (res.ok) setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteAllMedia() {
    if (!confirm("すべてのメディアファイルを削除します。この操作は取り消せません。\n本当に実行しますか？")) {
      return;
    }
    setDeleting(true);
    setDeleteResult(null);
    try {
      const res = await fetch("/api/media", { method: "DELETE" });
      if (res.ok) {
        const data = await res.json();
        setDeleteResult(`${data.deleted} 件のメディアを削除しました`);
        setMediaList([]);
      } else {
        setDeleteResult("削除に失敗しました");
      }
    } catch {
      setDeleteResult("削除に失敗しました");
    } finally {
      setDeleting(false);
    }
  }

  async function handleDeleteItem(item: MediaItemWithBoard) {
    const boardLabel = item.boardName ?? item.boardId;
    const msg = `このメディアはボード「${boardLabel}」で使用されています。\n削除するとボードからも除外されます。\n\n削除しますか？`;
    if (!confirm(msg)) return;

    setDeletingItemId(item.id);
    try {
      const res = await fetch(`/api/media/${item.id}`, { method: "DELETE" });
      if (res.ok) {
        setMediaList((prev) => prev.filter((m) => m.id !== item.id));
      }
    } finally {
      setDeletingItemId(null);
    }
  }

  const currentCity = WEATHER_AREAS.flatMap((p) => p.cities).find(
    (c) => c.id === cityId,
  );

  if (loading) {
    return <div className="text-sm text-muted-foreground">読み込み中...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Weather Area Selection */}
      <div className="rounded-lg border p-6">
        <h2 className="mb-4 text-lg font-semibold">天気予報の地域設定</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          フォトクロックテンプレートの天気表示で使用する地域を設定します。
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Prefecture selector */}
          <div className="space-y-1.5">
            <Label htmlFor="setting-pref">都道府県</Label>
            <Select
              value={selectedPref?.name ?? ""}
              onValueChange={handlePrefChange}
            >
              <SelectTrigger id="setting-pref" className="w-full">
                <SelectValue placeholder="都道府県を選択">
                  {selectedPref?.name ?? "都道府県を選択"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {WEATHER_AREAS.map((pref) => (
                  <SelectItem key={pref.name} value={pref.name}>
                    {pref.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* City selector */}
          <div className="space-y-1.5">
            <Label htmlFor="setting-city">地域</Label>
            <Select
              value={cityId}
              onValueChange={handleCityChange}
              disabled={!selectedPref}
            >
              <SelectTrigger id="setting-city" className="w-full">
                <SelectValue placeholder="地域を選択">
                  {currentCity?.name ?? "地域を選択"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {selectedPref?.cities.map((city) => (
                  <SelectItem key={city.id} value={city.id}>
                    {city.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "保存中..." : "保存"}
          </Button>
          {saved && (
            <span className="text-sm text-green-600">保存しました</span>
          )}
        </div>

        {currentCity && (
          <p className="mt-3 text-sm text-muted-foreground">
            現在の設定: {selectedPref?.name} {currentCity.name}（コード:{" "}
            {cityId}）
          </p>
        )}
      </div>

      {/* Media Management */}
      <div className="rounded-lg border border-red-200 p-6">
        <h2 className="mb-4 text-lg font-semibold">メディア管理</h2>

        {/* Individual media list */}
        <div className="mb-6">
          <h3 className="mb-2 text-sm font-medium">アップロード済みメディア</h3>
          {mediaLoading ? (
            <p className="text-sm text-muted-foreground">読み込み中...</p>
          ) : mediaList.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              メディアはありません。
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {mediaList.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-3 rounded-md border p-3"
                >
                  {/* Thumbnail */}
                  <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded bg-muted">
                    {item.type === "image" ? (
                      <img
                        src={item.filePath}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <video
                        src={item.filePath}
                        muted
                        className="h-full w-full object-cover"
                      />
                    )}
                  </div>
                  {/* Info + delete button */}
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="truncate text-xs text-muted-foreground">
                      {item.type === "image" ? "画像" : "動画"}
                    </span>
                    <span className="truncate text-xs">
                      ボード: {item.boardName ?? "不明"}
                    </span>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="mt-1 w-fit text-xs"
                      disabled={deletingItemId === item.id}
                      onClick={() => handleDeleteItem(item)}
                    >
                      {deletingItemId === item.id ? "削除中..." : "削除"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bulk delete */}
        <div className="border-t pt-4">
          <p className="mb-4 text-sm text-muted-foreground">
            アップロード済みのすべてのメディアファイル（画像・動画）を一括で削除します。
            全ボードからメディアが削除されます。
          </p>
          <div className="flex items-center gap-3">
            <Button
              variant="destructive"
              onClick={handleDeleteAllMedia}
              disabled={deleting}
            >
              {deleting ? "削除中..." : "すべてのメディアを削除"}
            </Button>
            {deleteResult && (
              <span className="text-sm text-muted-foreground">
                {deleteResult}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
