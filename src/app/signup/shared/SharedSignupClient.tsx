// Copyright 2026 Hiroshi Araki (https://hiroshi.araki.tech)
// SPDX-License-Identifier: Apache-2.0
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound } from "lucide-react";
import { GoogleAuthButton } from "@/components/auth/GoogleAuthButton";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { KeinageLogo } from "@/components/KeinageLogo";

export default function SharedSignupClient({
  token,
  email,
  googleAuthEnabled,
}: {
  token: string;
  email: string;
  googleAuthEnabled: boolean;
}) {
  const router = useRouter();
  const { t } = useLocale();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [googleError, setGoogleError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError(t("auth.signupPassword.mismatch"));
      return;
    }
    if (password.length < 8) {
      setError(t("auth.signupPassword.tooShort"));
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/credentials/shared/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || t("auth.signupPassword.failed"));
        return;
      }

      router.push("/pin/setup");
    } catch {
      setError(t("error.network"));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogleSignup() {
    setGoogleError("");
    setGoogleSubmitting(true);

    try {
      const res = await fetch("/api/auth/google/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "shared-signup", token }),
      });
      const data = await res.json();

      if (!res.ok) {
        setGoogleError(data.error || t("auth.google.failed"));
        return;
      }

      window.location.href = data.authorizationUrl;
    } catch {
      setGoogleError(t("error.network"));
    } finally {
      setGoogleSubmitting(false);
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
            <KeyRound className="size-8 text-blue-600" />
            <h2 className="text-lg font-bold text-gray-900">{t("auth.sharedSignup.title")}</h2>
            <p className="text-center text-sm text-gray-500">
              {t("auth.sharedSignup.subtitle", { email })}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-gray-700">
                {t("common.password")}
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={t("users.passwordHint")}
                required
                minLength={8}
                autoFocus
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="mb-1.5 block text-sm font-medium text-gray-700">
                {t("auth.signupPassword.passwordConfirmLabel")}
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder={t("auth.signupPassword.passwordConfirmPlaceholder")}
                required
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              />
            </div>

            {error && <p className="text-center text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:bg-gray-300"
            >
              {submitting ? t("auth.signupPassword.submitting") : t("auth.signupPassword.submit")}
            </button>
          </form>

          {googleAuthEnabled && (
            <div className="mt-4 space-y-3">
              <div className="flex items-center gap-3 text-xs text-gray-400">
                <span className="h-px flex-1 bg-gray-200" />
                <span>{t("common.or")}</span>
                <span className="h-px flex-1 bg-gray-200" />
              </div>
              <GoogleAuthButton
                onClick={handleGoogleSignup}
                disabled={googleSubmitting}
              >
                {googleSubmitting ? t("auth.google.starting") : t("auth.google.signup")}
              </GoogleAuthButton>
              {googleError && <p className="text-center text-sm text-red-600">{googleError}</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
