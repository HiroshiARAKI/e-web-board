// Copyright 2026 Hiroshi Araki (https://hiroshi.araki.tech)
// SPDX-License-Identifier: Apache-2.0
"use client";

import { useState } from "react";
import Link from "next/link";
import { MailCheck } from "lucide-react";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { KeinageLogo } from "@/components/KeinageLogo";

export default function SigningUpClient({
  email,
  previewUrl,
}: {
  email: string;
  previewUrl: string | null;
}) {
  const { t } = useLocale();
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [resending, setResending] = useState(false);
  const [currentPreviewUrl, setCurrentPreviewUrl] = useState(previewUrl);
  const usesDirectLink = currentPreviewUrl !== null;

  async function handleResend() {
    setError("");
    setNotice("");
    setResending(true);

    try {
      const res = await fetch("/api/auth/credentials/setup/resend", {
        method: "POST",
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || t("auth.signingUp.resendFailed"));
        return;
      }

      setCurrentPreviewUrl(data.previewUrl ?? null);
      setNotice(
        data.previewUrl
          ? t("auth.signingUp.linkReissued")
          : t("auth.signingUp.mailResent"),
      );
    } catch {
      setError(t("error.network"));
    } finally {
      setResending(false);
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
            <MailCheck className="size-8 text-blue-600" />
            <h2 className="text-lg font-bold text-gray-900">
              {usesDirectLink ? t("auth.signingUp.linkReadyTitle") : t("auth.signingUp.mailSentTitle")}
            </h2>
            <p className="text-center text-sm text-gray-500">
              {usesDirectLink
                ? t("auth.signingUp.linkReadySubtitle", { email })
                : t("auth.signingUp.mailSentSubtitle", { email })}
            </p>
          </div>

          <div className="space-y-4">
            <p className="rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-600">
              {usesDirectLink
                ? t("auth.signingUp.linkReadyNote")
                : t("auth.signingUp.mailSentNote")}
            </p>

            {currentPreviewUrl && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                <p className="font-medium">{t("auth.signingUp.previewLabel")}</p>
                <p className="mt-1 break-all text-xs text-amber-800">{currentPreviewUrl}</p>
                <a
                  href={currentPreviewUrl}
                  className="mt-3 inline-flex text-sm font-medium text-amber-900 underline"
                >
                  {t("auth.signingUp.previewOpen")}
                </a>
              </div>
            )}

            {notice && <p className="text-center text-sm text-emerald-600">{notice}</p>}
            {error && <p className="text-center text-sm text-red-600">{error}</p>}

            <button
              type="button"
              onClick={handleResend}
              disabled={resending}
              className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:bg-gray-300"
            >
              {resending
                ? (usesDirectLink ? t("auth.signingUp.linkReissuing") : t("auth.signingUp.mailResending"))
                : (usesDirectLink ? t("auth.signingUp.linkReissue") : t("auth.signingUp.mailResend"))}
            </button>
          </div>

          <div className="mt-6 text-center">
            <Link
              href="/signup"
              className="text-sm text-gray-500 hover:text-blue-600"
            >
              {t("auth.signingUp.retry")}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}