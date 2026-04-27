// Copyright 2026 Hiroshi Araki (https://hiroshi.araki.tech)
// SPDX-License-Identifier: Apache-2.0
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, LoaderCircle } from "lucide-react";
import { KeinageLogo } from "@/components/KeinageLogo";

type DeletingAccountClientProps = {
  token: string;
};

export default function DeletingAccountClient({ token }: DeletingAccountClientProps) {
  const router = useRouter();
  const startedRef = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (startedRef.current) {
      return;
    }
    startedRef.current = true;

    void (async () => {
      try {
        const response = await fetch("/api/auth/account-deletion/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const data = await response.json();

        if (!response.ok) {
          setError(data.error ?? "アカウント削除に失敗しました");
          return;
        }

        router.replace("/deleted-account");
      } catch {
        setError("通信エラーが発生しました");
      }
    })();
  }, [router, token]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-red-50 to-slate-100 p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center gap-3">
          <KeinageLogo className="h-12 w-auto text-gray-900" />
          <h1 className="text-xl font-bold text-gray-900">Keinage</h1>
        </div>

        <div className="rounded-2xl border bg-white p-8 shadow-sm">
          {error ? (
            <div className="flex flex-col items-center gap-3 text-center">
              <AlertTriangle className="size-9 text-red-600" />
              <h2 className="text-lg font-bold text-gray-900">アカウントを削除できませんでした</h2>
              <p className="text-sm text-gray-500">{error}</p>
              <div className="flex flex-wrap justify-center gap-3 pt-2">
                <Link
                  href="/signup"
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
                >
                  サインアップへ
                </Link>
                <Link
                  href="/pin"
                  className="rounded-lg border px-4 py-2 text-sm font-semibold text-gray-700"
                >
                  ログインへ
                </Link>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 text-center">
              <LoaderCircle className="size-9 animate-spin text-red-600" />
              <h2 className="text-lg font-bold text-gray-900">アカウントを削除しています</h2>
              <p className="text-sm leading-6 text-gray-500">
                Ownerアカウント、Shared ユーザー、ボード、メディア、設定、Preferences を削除しています。
                完了後、自動で完了画面へ移動します。
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}