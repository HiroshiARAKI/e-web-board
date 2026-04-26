// Copyright 2026 Hiroshi Araki (https://hiroshi.araki.tech)
// SPDX-License-Identifier: Apache-2.0
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MailPlus } from "lucide-react";
import { KeinageLogo } from "@/components/KeinageLogo";

export default function SignupRequestClient() {
  const router = useRouter();
  const [userId, setUserId] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/auth/credentials/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: userId.trim(),
          email: email.trim(),
          phoneNumber: phoneNumber.trim(),
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "仮登録に失敗しました");
        return;
      }

      router.push("/signingup");
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center gap-3">
          <KeinageLogo className="h-12 w-auto text-gray-900" />
          <h1 className="text-xl font-bold text-gray-900">Keinage</h1>
        </div>

        <div className="rounded-2xl border bg-white p-8 shadow-sm">
          <div className="mb-6 flex flex-col items-center gap-2">
            <MailPlus className="size-8 text-blue-600" />
            <h2 className="text-lg font-bold text-gray-900">Ownerアカウントの仮登録</h2>
            <p className="text-center text-sm text-gray-500">
              ユーザーID、メールアドレス、電話番号を入力してください。
              <br />
              登録用リンクをメールで送信します。
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="userId" className="mb-1.5 block text-sm font-medium text-gray-700">
                ユーザーID
              </label>
              <input
                id="userId"
                type="text"
                value={userId}
                onChange={(event) => setUserId(event.target.value)}
                placeholder="admin"
                required
                autoFocus
                pattern="[a-zA-Z0-9_\-]{3,32}"
                title="3〜32文字の英数字・アンダースコア・ハイフン"
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              />
              <p className="mt-1 text-xs text-gray-400">
                英数字・ _ ・ - のみ（3〜32文字）。ログイン時に使用できます。
              </p>
            </div>

            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-gray-700">
                メールアドレス
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="admin@example.com"
                required
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              />
            </div>

            <div>
              <label htmlFor="phoneNumber" className="mb-1.5 block text-sm font-medium text-gray-700">
                電話番号
              </label>
              <input
                id="phoneNumber"
                type="tel"
                value={phoneNumber}
                onChange={(event) => setPhoneNumber(event.target.value)}
                placeholder="090-1234-5678"
                required
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              />
              <p className="mt-1 text-xs text-gray-400">
                同じ電話番号では複数のOwner登録はできません。
              </p>
            </div>

            {error && <p className="text-center text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:bg-gray-300"
            >
              {submitting ? "送信中..." : "登録用メールを送信"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}