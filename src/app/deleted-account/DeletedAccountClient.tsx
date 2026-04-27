// Copyright 2026 Hiroshi Araki (https://hiroshi.araki.tech)
// SPDX-License-Identifier: Apache-2.0
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { KeinageLogo } from "@/components/KeinageLogo";

const REDIRECT_SECONDS = 10;

export default function DeletedAccountClient() {
  const router = useRouter();
  const [secondsLeft, setSecondsLeft] = useState(REDIRECT_SECONDS);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setSecondsLeft((current) => {
        if (current <= 1) {
          window.clearInterval(intervalId);
          router.replace("/signup");
          return 0;
        }
        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-50 to-slate-100 p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center gap-3">
          <KeinageLogo className="h-12 w-auto text-gray-900" />
          <h1 className="text-xl font-bold text-gray-900">Keinage</h1>
        </div>

        <div className="rounded-2xl border bg-white p-8 text-center shadow-sm">
          <div className="flex flex-col items-center gap-3">
            <CheckCircle2 className="size-10 text-emerald-600" />
            <h2 className="text-lg font-bold text-gray-900">アカウント削除が完了しました</h2>
            <p className="text-sm leading-6 text-gray-500">
              Ownerアカウントと関連データを削除しました。{secondsLeft} 秒後にサインアップ画面へ移動します。
            </p>
            <Link
              href="/signup"
              className="mt-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
            >
              今すぐサインアップへ移動
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}