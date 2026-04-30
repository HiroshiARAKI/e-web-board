// Copyright 2026 Hiroshi Araki (https://hiroshi.araki.tech)
// SPDX-License-Identifier: Apache-2.0
import Link from "next/link";
import { KeinageLogo } from "@/components/KeinageLogo";

export function ErrorScreen({
  statusLabel,
  title,
  description,
}: {
  statusLabel: string;
  title: string;
  description: string;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-white px-4 py-10 text-slate-900">
      <div className="w-full max-w-md text-center">
        <div className="mb-8 flex flex-col items-center gap-3">
          <KeinageLogo className="h-14 w-auto text-slate-900" />
          <p className="text-sm font-semibold tracking-wide text-slate-500">
            {statusLabel}
          </p>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-xl font-bold text-slate-950">{title}</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            {description}
          </p>
          <Link
            href="/pin/login"
            className="mt-6 inline-flex min-h-11 items-center justify-center rounded-lg bg-slate-950 px-5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2"
          >
            管理者画面へログインする
          </Link>
        </section>
      </div>
    </main>
  );
}
