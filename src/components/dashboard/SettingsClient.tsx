// Copyright 2026 Hiroshi Araki (https://hiroshi.araki.tech)
// SPDX-License-Identifier: Apache-2.0
"use client";

import { useState, useEffect } from "react";
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
  }, []);

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
      } else {
        setDeleteResult("削除に失敗しました");
      }
    } catch {
      setDeleteResult("削除に失敗しました");
    } finally {
      setDeleting(false);
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
  );
}
