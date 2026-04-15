// Copyright 2026 Hiroshi Araki (https://hiroshi.araki.tech)
// SPDX-License-Identifier: Apache-2.0
"use client";

import { useState } from "react";
import Link from "next/link";
import { MonitorPlay, Mail } from "lucide-react";

export default function PinForgotPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [resetUrl, setResetUrl] = useState("");
  const [method, setMethod] = useState<"email" | "link" | "">("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/auth/pin/forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "エラーが発生しました");
        setSubmitting(false);
        return;
      }

      setSubmitted(true);
      if (data.method) setMethod(data.method);
      if (data.resetUrl) {
        setResetUrl(data.resetUrl);
      }
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg">
            <MonitorPlay className="size-7" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Keinage</h1>
        </div>

        <div className="rounded-2xl border bg-white p-8 shadow-sm">
          <div className="mb-6 flex flex-col items-center gap-2">
            <Mail className="size-8 text-gray-400" />
            <h2 className="text-lg font-bold text-gray-900">
              PINの初期化
            </h2>
            <p className="text-center text-sm text-gray-500">
              登録済みのメールアドレスを入力してください
            </p>
          </div>

          {!submitted ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
                required
                autoFocus
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              />
              {error && (
                <p className="text-center text-sm text-red-600">{error}</p>
              )}
              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:bg-gray-300"
              >
                {submitting ? "送信中..." : "初期化リンクを発行"}
              </button>
            </form>
          ) : (
            <div className="space-y-4">
              {method === "email" ? (
                <p className="text-center text-sm text-gray-600">
                  メールアドレスが登録されている場合、初期化リンクをメールで送信しました。
                  <br />
                  <span className="text-xs text-gray-400">
                    メールが届かない場合は迷惑メールフォルダをご確認ください。
                  </span>
                </p>
              ) : resetUrl ? (
                <>
                  <p className="text-center text-sm text-gray-600">
                    メールアドレスが確認されました。以下のリンクからPINを再設定してください。
                  </p>
                  <a
                    href={resetUrl}
                    className="block break-all rounded-lg bg-blue-50 px-4 py-3 text-center text-sm font-medium text-blue-700 hover:bg-blue-100"
                  >
                    PINを再設定する
                  </a>
                  <p className="text-center text-xs text-gray-400">
                    このリンクは30分間有効です
                  </p>
                </>
              ) : (
                <p className="text-center text-sm text-gray-600">
                  メールアドレスが登録されている場合、初期化リンクを送信しました。
                </p>
              )}
            </div>
          )}

          <div className="mt-6 text-center">
            <Link
              href="/pin"
              className="text-sm text-gray-500 hover:text-blue-600"
            >
              PIN入力に戻る
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
