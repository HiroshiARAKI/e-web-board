// Copyright 2026 Hiroshi Araki (https://hiroshi.araki.tech)
// SPDX-License-Identifier: Apache-2.0
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MonitorPlay, ShieldCheck } from "lucide-react";
import { PinInput } from "@/components/auth/PinInput";

export default function PinSetupClient() {
  const router = useRouter();
  const [step, setStep] = useState<"pin" | "confirm" | "email">("pin");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function handlePinComplete(value: string) {
    setPin(value);
    setError("");
    setStep("confirm");
  }

  function handleConfirmComplete(value: string) {
    if (value !== pin) {
      setError("PINが一致しません。もう一度入力してください。");
      setConfirmPin("");
      return;
    }
    setConfirmPin(value);
    setError("");
    setStep("email");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) {
      setError("メールアドレスを入力してください");
      return;
    }
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/auth/pin/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin, email: email.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "登録に失敗しました");
        setSubmitting(false);
        return;
      }

      router.push("/boards");
    } catch {
      setError("通信エラーが発生しました");
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
            <ShieldCheck className="size-8 text-blue-600" />
            <h2 className="text-lg font-bold text-gray-900">
              管理者PINの登録
            </h2>
            <p className="text-center text-sm text-gray-500">
              {step === "pin" && "6桁の数字PINを設定してください"}
              {step === "confirm" && "確認のためもう一度入力してください"}
              {step === "email" &&
                "PIN初期化用のメールアドレスを入力してください"}
            </p>
          </div>

          {step === "pin" && (
            <div>
              <PinInput
                value={pin}
                onChange={setPin}
                onComplete={handlePinComplete}
                error={!!error}
              />
              {error && (
                <p className="mt-3 text-center text-sm text-red-600">
                  {error}
                </p>
              )}
            </div>
          )}

          {step === "confirm" && (
            <div>
              <PinInput
                value={confirmPin}
                onChange={setConfirmPin}
                onComplete={handleConfirmComplete}
                error={!!error}
              />
              {error && (
                <p className="mt-3 text-center text-sm text-red-600">
                  {error}
                </p>
              )}
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

          {step === "email" && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="email"
                  className="mb-1.5 block text-sm font-medium text-gray-700"
                >
                  メールアドレス
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@example.com"
                  required
                  autoFocus
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                />
                <p className="mt-1.5 text-xs text-gray-400">
                  PINを忘れた場合の初期化に使用します
                </p>
              </div>
              {error && (
                <p className="text-center text-sm text-red-600">{error}</p>
              )}
              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:bg-gray-300"
              >
                {submitting ? "登録中..." : "登録する"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setStep("pin");
                  setPin("");
                  setConfirmPin("");
                  setError("");
                }}
                className="block w-full text-center text-sm text-gray-500 hover:text-gray-700"
              >
                最初からやり直す
              </button>
            </form>
          )}
        </div>

        {/* Steps indicator */}
        <div className="mt-6 flex justify-center gap-2">
          {["pin", "confirm", "email"].map((s) => (
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
