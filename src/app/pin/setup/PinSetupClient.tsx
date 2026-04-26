// Copyright 2026 Hiroshi Araki (https://hiroshi.araki.tech)
// SPDX-License-Identifier: Apache-2.0
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { PinInput } from "@/components/auth/PinInput";
import { KeinageLogo } from "@/components/KeinageLogo";

type Step = "pin" | "confirmPin";

export default function PinSetupClient() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("pin");

  // PIN step
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
    pin: "6桁のPINを設定してください",
    confirmPin: "確認のためもう一度入力してください",
  };

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
            <ShieldCheck className="size-8 text-blue-600" />
            <h2 className="text-lg font-bold text-gray-900">PINの設定</h2>
            <p className="text-center text-sm text-gray-500">{stepLabels[step]}</p>
          </div>

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
          {(["pin", "confirmPin"] as Step[]).map((s) => (
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
