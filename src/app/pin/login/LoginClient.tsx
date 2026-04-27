// Copyright 2026 Hiroshi Araki (https://hiroshi.araki.tech)
// SPDX-License-Identifier: Apache-2.0
"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { KeyRound } from "lucide-react";
import { KeinageLogo } from "@/components/KeinageLogo";

export default function LoginClient({ redirectTo }: { redirectTo?: string | null }) {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [blocked, setBlocked] = useState(false);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (submitting || blocked) return;
      setSubmitting(true);
      setError("");

      try {
        const res = await fetch("/api/auth/credentials/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ identifier, password }),
        });
        const data = await res.json();

        console.log("[LoginClient] Login response", { status: res.status, ok: res.ok, data });

        if (!res.ok) {
          if (data.blocked) setBlocked(true);
          setError(data.error || "認証に失敗しました");
          setPassword("");
          setSubmitting(false);
          return;
        }

        router.push(redirectTo || "/boards");
      } catch {
        setError("通信エラーが発生しました");
        setPassword("");
        setSubmitting(false);
      }
    },
    [router, redirectTo, identifier, password, submitting, blocked],
  );

  const pinLoginHref = redirectTo
    ? `/pin?redirectTo=${encodeURIComponent(redirectTo)}`
    : "/pin";

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <KeinageLogo className="h-12 w-auto text-gray-900" />
          <h1 className="text-xl font-bold text-gray-900">Keinage</h1>
        </div>

        <div className="rounded-2xl border bg-white p-8 shadow-sm">
          <div className="mb-6 flex flex-col items-center gap-2">
            <KeyRound className="size-8 text-gray-400" />
            <h2 className="text-lg font-bold text-gray-900">アカウントログイン</h2>
            <p className="text-center text-sm text-gray-500">
              メールアドレスまたはユーザーIDとパスワードを入力してください
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="identifier"
                className="mb-1.5 block text-sm font-medium text-gray-700"
              >
                メールアドレス / ユーザーID
              </label>
              <input
                id="identifier"
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="admin@example.com または admin"
                required
                autoFocus
                disabled={blocked}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-200 disabled:bg-gray-50"
              />
            </div>
            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-sm font-medium text-gray-700"
              >
                パスワード
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="パスワード"
                required
                disabled={blocked}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-200 disabled:bg-gray-50"
              />
            </div>

            {error && (
              <p className="text-center text-sm text-red-600">{error}</p>
            )}

            <button
              type="submit"
              disabled={submitting || blocked}
              className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:bg-gray-300"
            >
              {submitting ? "認証中..." : "ログイン"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link
              href={pinLoginHref}
              className="text-sm text-gray-500 hover:text-blue-600"
            >
              PINでログインする
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
