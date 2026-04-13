// Copyright 2026 Hiroshi Araki (https://hiroshi.araki.tech)
// SPDX-License-Identifier: Apache-2.0
"use client";

import { useRef, useCallback } from "react";

interface PinInputProps {
  value: string;
  onChange: (value: string) => void;
  onComplete?: (pin: string) => void;
  disabled?: boolean;
  length?: number;
  error?: boolean;
}

/**
 * 6-digit PIN input with individual digit boxes.
 * Auto-focuses next digit on input, auto-submits on completion.
 */
export function PinInput({
  value,
  onChange,
  onComplete,
  disabled = false,
  length = 6,
  error = false,
}: PinInputProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const focusInput = useCallback(
    (index: number) => {
      if (index >= 0 && index < length) {
        inputRefs.current[index]?.focus();
      }
    },
    [length],
  );

  const handleInput = useCallback(
    (index: number, digit: string) => {
      if (!/^\d$/.test(digit)) return;

      const chars = value.split("");
      // Fill any gaps with empty
      while (chars.length < length) chars.push("");
      chars[index] = digit;
      const newValue = chars.join("").slice(0, length);
      onChange(newValue);

      if (index < length - 1) {
        focusInput(index + 1);
      }

      // Auto-complete check
      if (newValue.length === length && /^\d{6}$/.test(newValue)) {
        // Small delay so the UI updates before submitting
        setTimeout(() => onComplete?.(newValue), 50);
      }
    },
    [value, length, onChange, onComplete, focusInput],
  );

  const handleKeyDown = useCallback(
    (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Backspace") {
        e.preventDefault();
        const chars = value.split("");
        if (chars[index]) {
          chars[index] = "";
          onChange(chars.join(""));
        } else if (index > 0) {
          chars[index - 1] = "";
          onChange(chars.join(""));
          focusInput(index - 1);
        }
      } else if (e.key === "ArrowLeft") {
        focusInput(index - 1);
      } else if (e.key === "ArrowRight") {
        focusInput(index + 1);
      }
    },
    [value, onChange, focusInput],
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      e.preventDefault();
      const pasted = e.clipboardData
        .getData("text")
        .replace(/\D/g, "")
        .slice(0, length);
      if (pasted.length > 0) {
        onChange(pasted);
        focusInput(Math.min(pasted.length, length - 1));
        if (pasted.length === length) {
          setTimeout(() => onComplete?.(pasted), 50);
        }
      }
    },
    [length, onChange, onComplete, focusInput],
  );

  return (
    <div className="flex justify-center gap-2 sm:gap-3">
      {Array.from({ length }, (_, i) => (
        <input
          key={i}
          ref={(el) => {
            inputRefs.current[i] = el;
          }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[i] ?? ""}
          disabled={disabled}
          onChange={(e) => {
            const v = e.target.value;
            if (v.length > 0) {
              handleInput(i, v[v.length - 1]);
            }
          }}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          onFocus={(e) => e.target.select()}
          className={`size-12 rounded-lg border-2 bg-white text-center text-2xl font-bold shadow-sm outline-none transition-colors focus:ring-2 sm:size-14 sm:text-3xl ${
            error
              ? "border-red-400 text-red-600 focus:border-red-500 focus:ring-red-200"
              : "border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-blue-200"
          } disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400`}
          aria-label={`PIN ${i + 1}桁目`}
        />
      ))}
    </div>
  );
}
