// Copyright 2026 Hiroshi Araki (https://hiroshi.araki.tech)
// SPDX-License-Identifier: Apache-2.0
"use client";

import Link from "next/link";
import { useState } from "react";
import { AlertTriangle, MailWarning } from "lucide-react";
import type { AccountDeletionSummary } from "@/lib/account-deletion";

type DeleteAccountRequestClientProps = {
  email: string;
  summary: AccountDeletionSummary;
};

export default function DeleteAccountRequestClient({
  email,
  summary,
}: DeleteAccountRequestClientProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  async function handleRequest() {
    const confirmed = window.confirm(
      "登録済みメールアドレス宛に退会リンクを送信します。\nメール内のリンクを開くと、アカウントと関連データが削除されます。\n続行しますか？",
    );
    if (!confirmed) {
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);
    setPreviewUrl(null);

    try {
      const response = await fetch("/api/auth/account-deletion/request", {
        method: "POST",
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "退会リンクの送信に失敗しました");
        return;
      }

      setSuccess(`退会リンクを ${email} に送信しました。10分以内にメールのリンクを開いてください。`);
      setPreviewUrl(typeof data.previewUrl === "string" ? data.previewUrl : null);
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setSubmitting(false);
    }
  }

  const items = [
    { label: "Ownerアカウント", value: "1件" },
    { label: "Sharedユーザー", value: `${summary.sharedUserCount}件` },
    { label: "ボード", value: `${summary.boardCount}件` },
    { label: "メディア", value: `${summary.mediaCount}件` },
    { label: "メッセージ", value: `${summary.messageCount}件` },
    { label: "設定", value: `${summary.settingCount}件` },
    { label: "Preferences", value: `${summary.preferenceCount}件` },
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">Dangerous settings</p>
        <h1 className="mt-2 text-2xl font-bold text-foreground">Ownerアカウントの退会</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          普段使わない設定です。退会が完了すると、Ownerアカウントと関連する不揮発データは復元できません。
        </p>
      </div>

      <div className="rounded-2xl border border-red-200 bg-red-50/70 p-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 size-5 text-red-600" />
          <div className="space-y-2 text-sm text-red-950">
            <p className="font-semibold">この操作は取り消せません。</p>
            <p>
              退会リンクは <span className="font-mono">{email}</span> 宛に送信されます。
              リンクを開くと、Owner配下の Shared ユーザー、ボード、メディア、設定、Preferences が削除されます。
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border bg-background p-6">
        <h2 className="text-lg font-semibold">削除される情報</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          現在のOwnerスコープで削除対象になるデータです。
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {items.map((item) => (
            <div key={item.label} className="rounded-xl border bg-muted/30 px-4 py-3">
              <p className="text-sm font-medium text-foreground">{item.label}</p>
              <p className="mt-1 text-sm text-muted-foreground">{item.value}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-xl border border-dashed border-muted-foreground/30 px-4 py-3 text-sm text-muted-foreground">
          ログインセッションとこの端末の認証情報も無効化されます。退会後は 10 秒後にサインアップ画面へ移動します。
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleRequest}
          disabled={submitting}
          className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-300"
        >
          <MailWarning className="size-4" />
          {submitting ? "退会リンクを送信中..." : "退会リンクをメールで送る"}
        </button>
        <Link
          href="/settings"
          className="inline-flex rounded-lg border px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
        >
          設定へ戻る
        </Link>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <p>{success}</p>
          {previewUrl && (
            <p className="mt-2">
              開発用プレビュー: <a href={previewUrl} className="underline">{previewUrl}</a>
            </p>
          )}
        </div>
      )}
    </div>
  );
}