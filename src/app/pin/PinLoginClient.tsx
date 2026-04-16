// Copyright 2026 Hiroshi Araki (https://hiroshi.araki.tech)
// SPDX-License-Identifier: Apache-2.0
"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MonitorPlay, Lock } from "lucide-react";
import { PinInput } from "@/components/auth/PinInput";

export default function PinLoginClient({ userId }: { userId: string }) {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [blocked, setBlocked] = useState(false);

  const handleComplete = useCallback(
    async (value: string) => {
      if (verifying || blocked) return;
      setVerifying(true);
      setError("");

      try {
        const res = await fetch("/api/auth/pin/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pin: value }),
        });
        const data = await res.json();

        if (!res.ok) {
          if (data.blocked) {
            setBlocked(true);
          }
          setError(data.error || "認証に失敗しました");
          setPin("");
          setVerifying(false);
          return;
        }

        router.push("/boards");
      } catch {
        setError("通信エラーが発生しました");
        setPin("");
        setVerifying(false);
      }
    },
    [router, verifying, blocked],
  );

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
            <Lock className="size-8 text-gray-400" />
            <h2 className="text-lg font-bold text-gray-900">
              PIN入力
            </h2>
            <p className="text-center text-sm text-gray-500">
              <span className="font-medium text-gray-700">{userId}</span> のPINを入力してください
            </p>
          </div>

          <PinInput
            value={pin}
            onChange={setPin}
            onComplete={handleComplete}
            disabled={verifying || blocked}
            error={!!error}
          />

          {verifying && !error && (
            <p className="mt-3 text-center text-sm text-gray-500">
              認証中...
            </p>
          )}

          {error && (
            <p className="mt-3 text-center text-sm text-red-600">{error}</p>
          )}

          <div className="mt-6 flex flex-col items-center gap-3">
            <Link
              href="/pin/login"
              className="text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              メールアドレスまたはIDでログインする
            </Link>
            <Link
              href="/pin/forgot"
              className="text-sm text-gray-500 hover:text-blue-600"
            >
              PINを忘れた場合
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
