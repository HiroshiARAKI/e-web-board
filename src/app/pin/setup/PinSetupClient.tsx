// Copyright 2026 Hiroshi Araki (https://hiroshi.araki.tech)
// SPDX-License-Identifier: Apache-2.0
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MonitorPlay, ShieldCheck } from "lucide-react";
import { PinInput } from "@/components/auth/PinInput";

type Step = "credentials" | "pin" | "confirmPin";

export default function PinSetupClient() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("credentials");

  // Credentials step
  const [userId, setUserId] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // PIN step
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleCredentialsSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("パスワードが一致しません");
      return;
    }
    if (password.length < 8) {
      setError("パスワードは8文字以上で入力してください");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/credentials/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: userId.trim(), email: email.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "登録に失敗しました");
        return;
      }
      setStep("pin");
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setSubmitting(false);
    }
  }

  function handlePinComplete(value: string) {
    setPin(value);
    setError("");
    setStep("confirmPin");
  }

  async function handleConfirmPinComplete(value: string) {
    if (value !== pin) {
      setError("PINが一致しません。もう一度入力してください。");
      setConfirmPin("");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/auth/pin/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: value }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "PIN登録に失敗しました");
        setStep("pin");
        setPin("");
        setConfirmPin("");
        return;
      }
      router.push("/boards");
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setSubmitting(false);
    }
  }

  const stepLabels: Record<Step, string> = {
    credentials: "アカウント情報を入力してください",
    pin: "6桁のPINを設定してください",
    confirmPin: "確認のためもう一度入力してください",
  };

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
            <ShieldCheck className="size-8 text-blue-600" />
            <h2 className="text-lg font-bold text-gray-900">管理者アカウントの登録</h2>
            <p className="text-center text-sm text-gray-500">{stepLabels[step]}</p>
          </div>

          {/* Step 1: Email + Password */}
          {step === "credentials" && (
            <form onSubmit={handleCredentialsSubmit} className="space-y-4">
              <div>
                <label htmlFor="userId" className="mb-1.5 block text-sm font-medium text-gray-700">
                  ユーザーID
                </label>
                <input
                  id="userId"
                  type="text"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
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
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@example.com"
                  required
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                />
              </div>
              <div>
                <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-gray-700">
                  パスワード
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="8文字以上"
                  required
                  minLength={8}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                />
              </div>
              <div>
                <label htmlFor="confirmPassword" className="mb-1.5 block text-sm font-medium text-gray-700">
                  パスワード（確認）
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="もう一度入力"
                  required
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                />
              </div>
              {error && (
                <p className="text-center text-sm text-red-600">{error}</p>
              )}
              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:bg-gray-300"
              >
                {submitting ? "登録中..." : "次へ（PINの設定）"}
              </button>
            </form>
          )}

          {/* Step 2: PIN */}
          {step === "pin" && (
            <div>
              <PinInput
                value={pin}
                onChange={setPin}
                onComplete={handlePinComplete}
                error={!!error}
              />
              {error && <p className="mt-3 text-center text-sm text-red-600">{error}</p>}
            </div>
          )}

          {/* Step 3: Confirm PIN */}
          {step === "confirmPin" && (
            <div>
              <PinInput
                value={confirmPin}
                onChange={setConfirmPin}
                onComplete={handleConfirmPinComplete}
                error={!!error}
                disabled={submitting}
              />
              {error && <p className="mt-3 text-center text-sm text-red-600">{error}</p>}
              <button
                type="button"
                onClick={() => {
                  setStep("pin");
                  setPin("");
                  setConfirmPin("");
                  setError("");
                }}
                className="mt-4 block w-full text-center text-sm text-gray-500 hover:text-gray-700"
              >
                PINを入力し直す
              </button>
            </div>
          )}
        </div>

        {/* Steps indicator */}
        <div className="mt-6 flex justify-center gap-2">
          {(["credentials", "pin", "confirmPin"] as Step[]).map((s) => (
            <div
              key={s}
              className={`size-2 rounded-full transition-colors ${
                step === s ? "bg-blue-600" : "bg-gray-300"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
