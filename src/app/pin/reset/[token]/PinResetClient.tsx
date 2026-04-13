// Copyright 2026 Hiroshi Araki (https://hiroshi.araki.tech)
// SPDX-License-Identifier: Apache-2.0
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MonitorPlay, KeyRound } from "lucide-react";
import { PinInput } from "@/components/auth/PinInput";

interface PinResetClientProps {
  token: string;
}

export default function PinResetClient({ token }: PinResetClientProps) {
  const router = useRouter();
  const [step, setStep] = useState<"pin" | "confirm">("pin");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function handlePinComplete(value: string) {
    setPin(value);
    setError("");
    setStep("confirm");
  }

  async function handleConfirmComplete(value: string) {
    if (value !== pin) {
      setError("PINが一致しません。もう一度入力してください。");
      setConfirmPin("");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/auth/pin/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, pin: value }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "PINの変更に失敗しました");
        setSubmitting(false);
        return;
      }

      router.push("/pin");
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
          <h1 className="text-xl font-bold text-gray-900">e-Web Board</h1>
        </div>

        <div className="rounded-2xl border bg-white p-8 shadow-sm">
          <div className="mb-6 flex flex-col items-center gap-2">
            <KeyRound className="size-8 text-blue-600" />
            <h2 className="text-lg font-bold text-gray-900">
              PINの再設定
            </h2>
            <p className="text-center text-sm text-gray-500">
              {step === "pin"
                ? "新しい6桁のPINを入力してください"
                : "確認のためもう一度入力してください"}
            </p>
          </div>

          {step === "pin" ? (
            <div>
              <PinInput
                value={pin}
                onChange={setPin}
                onComplete={handlePinComplete}
                error={!!error}
              />
            </div>
          ) : (
            <div>
              <PinInput
                value={confirmPin}
                onChange={setConfirmPin}
                onComplete={handleConfirmComplete}
                disabled={submitting}
                error={!!error}
              />
              {submitting && (
                <p className="mt-3 text-center text-sm text-gray-500">
                  変更中...
                </p>
              )}
            </div>
          )}

          {error && (
            <p className="mt-3 text-center text-sm text-red-600">{error}</p>
          )}

          {step === "confirm" && !submitting && (
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
          )}
        </div>

        {/* Steps indicator */}
        <div className="mt-6 flex justify-center gap-2">
          {["pin", "confirm"].map((s) => (
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
