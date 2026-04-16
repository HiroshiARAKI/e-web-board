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
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { WEATHER_AREAS, DEFAULT_CITY_ID } from "@/lib/weather-areas";
import type { WeatherPrefecture } from "@/lib/weather-areas";
import { PinInput } from "@/components/auth/PinInput";
import { useTheme, type Theme } from "@/components/dashboard/ThemeProvider";

interface UploadedFile {
  filename: string;
  filePath: string;
  thumbPath: string | null;
  type: string;
  size: number;
  modifiedAt: string;
  boards: { boardId: string; boardName: string | null }[];
}

interface VersionInfo {
  current: string;
  releaseUrl: string;
  latest: string | null;
  latestUrl: string | null;
  hasUpdate: boolean;
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
  const [mediaList, setMediaList] = useState<UploadedFile[]>([]);
  const [mediaLoading, setMediaLoading] = useState(true);
  const [deletingFile, setDeletingFile] = useState<string | null>(null);
  const [maxLongEdge, setMaxLongEdge] = useState(3840);
  const [resizeEnabled, setResizeEnabled] = useState(true);
  const [imageSaving, setImageSaving] = useState(false);
  const [imageSaved, setImageSaved] = useState(false);
  const [versionInfo, setVersionInfo] = useState<VersionInfo | null>(null);
  const { theme, setTheme } = useTheme();

  // PIN/Email change states
  const [pinConfigured, setPinConfigured] = useState(false);
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [pinStep, setPinStep] = useState<"current" | "new" | "confirm">("current");
  const [pinChanging, setPinChanging] = useState(false);
  const [pinChangeResult, setPinChangeResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [storedEmail, setStoredEmail] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailSaved, setEmailSaved] = useState<{ ok: boolean; msg: string } | null>(null);

  // Password change states
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [passwordChanging, setPasswordChanging] = useState(false);
  const [passwordChangeResult, setPasswordChangeResult] = useState<{ ok: boolean; msg: string } | null>(null);

  // Auth expiry (login cache period) states
  const [authExpireDays, setAuthExpireDays] = useState(30);
  const [authExpirySaving, setAuthExpirySaving] = useState(false);
  const [authExpirySaved, setAuthExpirySaved] = useState<{ ok: boolean; msg: string } | null>(null);
  const [fullAuthExpiry, setFullAuthExpiry] = useState<string | null>(null);

  const fetchMedia = useCallback(async () => {
    try {
      const res = await fetch("/api/media/files");
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
        // Load image resize setting
        if (data.imageMaxLongEdge !== undefined) {
          const val = parseInt(data.imageMaxLongEdge, 10);
          if (val === 0) {
            setResizeEnabled(false);
            setMaxLongEdge(3840);
          } else {
            setResizeEnabled(true);
            setMaxLongEdge(val);
          }
        }
      } finally {
        setLoading(false);
      }
    })();
    fetchMedia();
    fetch("/api/version")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (data) setVersionInfo(data); })
      .catch(() => {});
    // Load PIN status and email
    fetch("/api/auth/pin/status")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          setPinConfigured(data.pinConfigured);
          if (data.email) setStoredEmail(data.email);
          if (data.authExpireDays) setAuthExpireDays(data.authExpireDays);
          if (data.fullAuthExpiry) setFullAuthExpiry(data.fullAuthExpiry);
        }
      })
      .catch(() => {});
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

  async function handleImageSettingSave() {
    setImageSaving(true);
    setImageSaved(false);
    try {
      const value = resizeEnabled ? String(maxLongEdge) : "0";
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageMaxLongEdge: value }),
      });
      if (res.ok) setImageSaved(true);
    } finally {
      setImageSaving(false);
    }
  }

  async function handleVerifyCurrentPin(pin: string) {
    setPinChanging(true);
    setPinChangeResult(null);
    try {
      const res = await fetch("/api/auth/pin/change", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verifyCurrentPin", currentPin: pin }),
      });
      if (res.ok) {
        setCurrentPin(pin);
        setPinStep("new");
      } else {
        const data = await res.json();
        setPinChangeResult({ ok: false, msg: data.error ?? "PINが正しくありません" });
        setCurrentPin("");
      }
    } catch {
      setPinChangeResult({ ok: false, msg: "検証に失敗しました" });
      setCurrentPin("");
    } finally {
      setPinChanging(false);
    }
  }

  async function handlePinChange(completedPin: string) {
    if (completedPin !== newPin) {
      setPinChangeResult({ ok: false, msg: "新しいPINが一致しません" });
      setConfirmPin("");
      setPinStep("confirm");
      return;
    }
    setPinChanging(true);
    setPinChangeResult(null);
    try {
      const res = await fetch("/api/auth/pin/change", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "changePin", currentPin, newPin: completedPin }),
      });
      const data = await res.json();
      if (res.ok) {
        setPinChangeResult({ ok: true, msg: "PINを変更しました" });
        resetPinForm();
      } else {
        setPinChangeResult({ ok: false, msg: data.error ?? "変更に失敗しました" });
        // If current PIN was wrong, go back to step 1
        if (res.status === 401) {
          setCurrentPin("");
          setNewPin("");
          setConfirmPin("");
          setPinStep("current");
        }
      }
    } catch {
      setPinChangeResult({ ok: false, msg: "変更に失敗しました" });
    } finally {
      setPinChanging(false);
    }
  }

  function resetPinForm() {
    setCurrentPin("");
    setNewPin("");
    setConfirmPin("");
    setPinStep("current");
  }

  async function handleEmailChange() {
    setEmailSaving(true);
    setEmailSaved(null);
    try {
      const res = await fetch("/api/auth/pin/change", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "changeEmail", newEmail }),
      });
      const data = await res.json();
      if (res.ok) {
        setStoredEmail(newEmail);
        setNewEmail("");
        setEmailSaved({ ok: true, msg: "メールアドレスを変更しました" });
      } else {
        setEmailSaved({ ok: false, msg: data.error ?? "変更に失敗しました" });
      }
    } catch {
      setEmailSaved({ ok: false, msg: "変更に失敗しました" });
    } finally {
      setEmailSaving(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/auth/pin/logout", { method: "POST" });
    window.location.href = "/pin";
  }

  async function handlePasswordChange() {
    if (newPassword !== confirmNewPassword) {
      setPasswordChangeResult({ ok: false, msg: "新しいパスワードが一致しません" });
      return;
    }
    if (newPassword.length < 8) {
      setPasswordChangeResult({ ok: false, msg: "パスワードは8文字以上で入力してください" });
      return;
    }
    setPasswordChanging(true);
    setPasswordChangeResult(null);
    try {
      const res = await fetch("/api/auth/password/change", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        setPasswordChangeResult({ ok: true, msg: "パスワードを変更しました" });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmNewPassword("");
      } else {
        setPasswordChangeResult({ ok: false, msg: data.error ?? "変更に失敗しました" });
      }
    } catch {
      setPasswordChangeResult({ ok: false, msg: "通信エラーが発生しました" });
    } finally {
      setPasswordChanging(false);
    }
  }

  async function handleAuthExpirySave(days: number) {
    setAuthExpirySaving(true);
    setAuthExpirySaved(null);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ authExpireDays: String(days) }),
      });
      if (res.ok) {
        setAuthExpireDays(days);
        setAuthExpirySaved({ ok: true, msg: "保存しました" });
      } else {
        setAuthExpirySaved({ ok: false, msg: "保存に失敗しました" });
      }
    } catch {
      setAuthExpirySaved({ ok: false, msg: "通信エラーが発生しました" });
    } finally {
      setAuthExpirySaving(false);
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
        await fetchMedia();
      } else {
        setDeleteResult("削除に失敗しました");
      }
    } catch {
      setDeleteResult("削除に失敗しました");
    } finally {
      setDeleting(false);
    }
  }

  async function handleDeleteFile(file: UploadedFile) {
    const boardNames = file.boards
      .map((b) => b.boardName ?? b.boardId)
      .join("、");
    const msg =
      file.boards.length > 0
        ? `このファイルはボード「${boardNames}」で使用されています。\n削除するとボードからも除外されます。\n\n削除しますか？`
        : `このファイルを削除しますか？\n（どのボードにも紐付けられていません）`;
    if (!confirm(msg)) return;

    setDeletingFile(file.filename);
    try {
      const res = await fetch("/api/media/files", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.filename }),
      });
      if (res.ok) {
        setMediaList((prev) =>
          prev.filter((m) => m.filename !== file.filename),
        );
      }
    } finally {
      setDeletingFile(null);
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
      {/* Version Info */}
      {versionInfo && (
        <div className="rounded-lg border p-6">
          <h2 className="mb-4 text-lg font-semibold">バージョン情報</h2>
          <div className="space-y-2">
            <p className="text-sm">
              現在のバージョン:{" "}
              <a
                href={versionInfo.releaseUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono font-semibold text-blue-600 hover:underline"
              >
                v{versionInfo.current}
              </a>
            </p>
            {versionInfo.hasUpdate && versionInfo.latest && (
              <p className="text-sm text-amber-600">
                新しいバージョンがリリースされています:{" "}
                <a
                  href={versionInfo.latestUrl ?? versionInfo.releaseUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono font-semibold hover:underline"
                >
                  v{versionInfo.latest}
                </a>
              </p>
            )}
          </div>
        </div>
      )}

      {/* Theme Selection */}
      <div className="rounded-lg border p-6">
        <h2 className="mb-4 text-lg font-semibold">テーマ設定</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          管理画面の表示テーマを選択します。
        </p>
        <div className="flex gap-3">
          {([
            { value: "system" as Theme, label: "システムに準拠" },
            { value: "light" as Theme, label: "ライト" },
            { value: "dark" as Theme, label: "ダーク" },
          ]).map((opt) => (
            <button
              key={opt.value}
              onClick={() => setTheme(opt.value)}
              className={`rounded-lg border px-4 py-2 text-sm transition-colors ${
                theme === opt.value
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border hover:bg-accent hover:text-accent-foreground"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

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

      {/* Image Resize Settings */}
      <div className="rounded-lg border p-6">
        <h2 className="mb-4 text-lg font-semibold">画像リサイズ設定</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          アップロード時に画像の長辺を指定ピクセル数以下にリサイズします。
          サムネイル（600px）も自動生成されます。
        </p>

        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Switch
              id="resize-enabled"
              checked={resizeEnabled}
              onCheckedChange={setResizeEnabled}
            />
            <Label htmlFor="resize-enabled">リサイズを有効にする</Label>
          </div>

          {resizeEnabled && (
            <div className="space-y-1.5">
              <Label htmlFor="max-long-edge">長辺の最大ピクセル数</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="max-long-edge"
                  type="number"
                  min={100}
                  step={100}
                  value={maxLongEdge}
                  onChange={(e) => {
                    const v = parseInt(e.target.value, 10);
                    if (v >= 100) setMaxLongEdge(v);
                  }}
                  className="w-32"
                />
                <span className="text-sm text-muted-foreground">px</span>
              </div>
              <p className="text-xs text-muted-foreground">
                デフォルト: 3840px（4K相当）
              </p>
            </div>
          )}

          <div className="flex items-center gap-3">
            <Button
              onClick={handleImageSettingSave}
              disabled={imageSaving}
            >
              {imageSaving ? "保存中..." : "保存"}
            </Button>
            {imageSaved && (
              <span className="text-sm text-green-600">保存しました</span>
            )}
          </div>
        </div>
      </div>

      {/* Security / PIN Settings */}
      {pinConfigured && (
        <div className="rounded-lg border p-6">
          <h2 className="mb-4 text-lg font-semibold">セキュリティ</h2>

          {/* PIN Change */}
          <div className="mb-6">
            <h3 className="mb-2 text-sm font-medium">PIN変更</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              管理画面ログイン用の6桁PINを変更します。
            </p>

            {pinStep === "current" && (
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">現在のPINを入力</Label>
                <PinInput
                  value={currentPin}
                  onChange={(v) => { setCurrentPin(v); setPinChangeResult(null); }}
                  onComplete={handleVerifyCurrentPin}
                  disabled={pinChanging}
                  error={pinChangeResult?.ok === false && pinStep === "current"}
                />
              </div>
            )}

            {pinStep === "new" && (
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">新しいPINを入力</Label>
                <PinInput
                  value={newPin}
                  onChange={setNewPin}
                  onComplete={() => setPinStep("confirm")}
                />
              </div>
            )}

            {pinStep === "confirm" && (
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">新しいPINを再入力</Label>
                <PinInput
                  value={confirmPin}
                  onChange={setConfirmPin}
                  onComplete={handlePinChange}
                  disabled={pinChanging}
                  error={pinChangeResult?.ok === false && confirmPin.length < 6}
                />
              </div>
            )}

            <div className="mt-3 flex items-center gap-3">
              {pinStep !== "current" && (
                <Button variant="outline" size="sm" onClick={resetPinForm} disabled={pinChanging}>
                  リセット
                </Button>
              )}
              {pinChangeResult && (
                <span className={`text-sm ${pinChangeResult.ok ? "text-green-600" : "text-red-600"}`}>
                  {pinChangeResult.msg}
                </span>
              )}
            </div>
          </div>

          {/* Email Change */}
          <div className="border-t pt-4">
            <h3 className="mb-2 text-sm font-medium">リカバリーメールアドレス</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              PINを忘れた場合のリセットに使用するメールアドレスです。
            </p>
            {storedEmail && (
              <p className="mb-3 text-sm">
                現在の設定: <span className="font-mono">{storedEmail}</span>
              </p>
            )}
            <div className="flex items-center gap-3">
              <Input
                type="email"
                placeholder="新しいメールアドレス"
                value={newEmail}
                onChange={(e) => {
                  setNewEmail(e.target.value);
                  setEmailSaved(null);
                }}
                className="max-w-sm"
              />
              <Button
                onClick={handleEmailChange}
                disabled={emailSaving || !newEmail || !newEmail.includes("@")}
              >
                {emailSaving ? "保存中..." : "変更"}
              </Button>
            </div>
            {emailSaved && (
              <span className={`mt-2 block text-sm ${emailSaved.ok ? "text-green-600" : "text-red-600"}`}>
                {emailSaved.msg}
              </span>
            )}
          </div>

          {/* Password Change */}
          <div className="border-t pt-4">
            <h3 className="mb-2 text-sm font-medium">パスワード変更</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              管理者ログイン用のパスワードを変更します。
            </p>
            <div className="space-y-3 max-w-sm">
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">現在のパスワード</label>
                <Input
                  type="password"
                  placeholder="現在のパスワード"
                  value={currentPassword}
                  onChange={(e) => { setCurrentPassword(e.target.value); setPasswordChangeResult(null); }}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">新しいパスワード（8文字以上）</label>
                <Input
                  type="password"
                  placeholder="新しいパスワード"
                  value={newPassword}
                  onChange={(e) => { setNewPassword(e.target.value); setPasswordChangeResult(null); }}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">新しいパスワード（確認）</label>
                <Input
                  type="password"
                  placeholder="もう一度入力"
                  value={confirmNewPassword}
                  onChange={(e) => { setConfirmNewPassword(e.target.value); setPasswordChangeResult(null); }}
                />
              </div>
              <div className="flex items-center gap-3">
                <Button
                  onClick={handlePasswordChange}
                  disabled={passwordChanging || !currentPassword || !newPassword || !confirmNewPassword}
                >
                  {passwordChanging ? "変更中..." : "パスワードを変更"}
                </Button>
              </div>
              {passwordChangeResult && (
                <span className={`text-sm ${passwordChangeResult.ok ? "text-green-600" : "text-red-600"}`}>
                  {passwordChangeResult.msg}
                </span>
              )}
            </div>
          </div>

          {/* Auth Expiry / Login Cache Period */}
          <div className="border-t pt-4">
            <h3 className="mb-2 text-sm font-medium">ログイン認証キャッシュ期間</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              メールアドレス+パスワードによるログインの有効期間です。期間を過ぎると、次回PINログイン前にメールアドレスでの再認証が必要になります。
            </p>
            {fullAuthExpiry && (
              <p className="mb-3 text-sm text-muted-foreground">
                現在の有効期限:{" "}
                <span className="font-medium">
                  {new Date(fullAuthExpiry).toLocaleDateString("ja-JP", {
                    year: "numeric", month: "long", day: "numeric",
                  })}
                </span>
              </p>
            )}
            <div className="flex flex-wrap gap-2 mb-4">
              {[
                { label: "30日", days: 30 },
                { label: "60日", days: 60 },
                { label: "90日", days: 90 },
                { label: "180日", days: 180 },
                { label: "1年", days: 365 },
              ].map((opt) => {
                const expiry = new Date(Date.now() + opt.days * 86_400_000);
                return (
                  <button
                    key={opt.days}
                    type="button"
                    onClick={() => handleAuthExpirySave(opt.days)}
                    disabled={authExpirySaving}
                    className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                      authExpireDays === opt.days
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border hover:bg-accent hover:text-accent-foreground"
                    }`}
                    title={expiry.toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" })}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              現在の設定: {authExpireDays}日間
              {authExpireDays === 30 && "（デフォルト）"}
            </p>
            {authExpirySaved && (
              <span className={`mt-2 block text-sm ${authExpirySaved.ok ? "text-green-600" : "text-red-600"}`}>
                {authExpirySaved.msg}
              </span>
            )}
          </div>

          {/* Logout */}
          <div className="mt-6 border-t pt-4">
            <Button variant="outline" onClick={handleLogout}>
              ログアウト
            </Button>
          </div>
        </div>
      )}

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
              {mediaList.map((file) => (
                <div
                  key={file.filename}
                  className="flex items-start gap-3 rounded-md border p-3"
                >
                  {/* Thumbnail */}
                  <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded bg-muted">
                    {file.type === "image" ? (
                      <img
                        src={file.thumbPath ?? file.filePath}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <video
                        src={file.filePath}
                        muted
                        className="h-full w-full object-cover"
                      />
                    )}
                  </div>
                  {/* Info + delete button */}
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="truncate text-xs text-muted-foreground">
                      {file.type === "image" ? "画像" : "動画"} ・{" "}
                      {file.size < 1024 * 1024
                        ? `${Math.round(file.size / 1024)} KB`
                        : `${(file.size / 1024 / 1024).toFixed(1)} MB`}
                    </span>
                    {file.boards.length > 0 ? (
                      <span className="truncate text-xs">
                        ボード:{" "}
                        {file.boards
                          .map((b) => b.boardName ?? b.boardId)
                          .join(", ")}
                      </span>
                    ) : (
                      <span className="truncate text-xs text-amber-600">
                        未使用（どのボードにも紐付けなし）
                      </span>
                    )}
                    <Button
                      variant="destructive"
                      size="sm"
                      className="mt-1 w-fit text-xs"
                      disabled={deletingFile === file.filename}
                      onClick={() => handleDeleteFile(file)}
                    >
                      {deletingFile === file.filename ? "削除中..." : "削除"}
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
