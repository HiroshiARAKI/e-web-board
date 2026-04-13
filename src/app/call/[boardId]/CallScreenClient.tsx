// Copyright 2026 Hiroshi Araki (https://hiroshi.araki.tech)
// SPDX-License-Identifier: Apache-2.0
"use client";

import { useState, useCallback, useMemo } from "react";
import { useSSE } from "@/hooks/useSSE";
import type { Message } from "@/types";

interface CallScreenClientProps {
  boardId: string;
  initialMessages: Message[];
}

export default function CallScreenClient({
  boardId,
  initialMessages,
}: CallScreenClientProps) {
  const [messages, setMessages] = useState(initialMessages);
  const [confirmTarget, setConfirmTarget] = useState<Message | null>(null);
  const [calling, setCalling] = useState(false);

  // Refetch messages on SSE events
  const refetchMessages = useCallback(async () => {
    try {
      const res = await fetch(`/api/boards/${boardId}/messages`);
      if (!res.ok) return;
      const data = await res.json();
      setMessages(data);
    } catch {
      // Will retry on next SSE event
    }
  }, [boardId]);

  const handleSSEEvent = useCallback(() => {
    refetchMessages();
  }, [refetchMessages]);

  useSSE({ boardId, onEvent: handleSSEEvent });

  // Waiting messages only (priority = 0)
  const waiting = useMemo(
    () =>
      messages
        .filter((m) => m.priority === 0)
        .sort((a, b) =>
          a.content.localeCompare(b.content, "ja", { numeric: true }),
        ),
    [messages],
  );

  async function handleCall(msg: Message) {
    setCalling(true);
    try {
      const res = await fetch(`/api/messages/${msg.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priority: 1 }),
      });
      if (res.ok) {
        setConfirmTarget(null);
        // Optimistic update
        setMessages((prev) =>
          prev.map((m) =>
            m.id === msg.id ? { ...m, priority: 1, updatedAt: new Date().toISOString() } : m,
          ),
        );
      }
    } catch {
      // Will be synced on next SSE event
    } finally {
      setCalling(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-white px-4 py-3 shadow-sm">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <h1 className="text-lg font-bold text-gray-900">呼び出し画面</h1>
          <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
            待機中: {waiting.length}件
          </span>
        </div>
      </header>

      {/* Number grid */}
      <main className="mx-auto w-full max-w-2xl flex-1 p-4">
        {waiting.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <svg
              className="mb-4 size-16"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
            <p className="text-base">待機中の番号はありません</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {waiting.map((msg) => (
              <button
                key={msg.id}
                type="button"
                onClick={() => setConfirmTarget(msg)}
                className="flex items-center justify-center rounded-xl border-2 border-gray-200 bg-white px-3 py-5 text-2xl font-bold tabular-nums text-gray-900 shadow-sm transition-all active:scale-95 hover:border-blue-400 hover:bg-blue-50 sm:text-3xl"
              >
                {msg.content}
              </button>
            ))}
          </div>
        )}
      </main>

      {/* Confirm dialog */}
      {confirmTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-xs rounded-2xl bg-white p-6 shadow-xl">
            <p className="mb-6 text-center text-lg font-semibold text-gray-900">
              <span className="text-3xl font-bold text-blue-600">
                {confirmTarget.content}
              </span>
              <br />
              をお呼び出ししますか？
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmTarget(null)}
                disabled={calling}
                className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-3 text-base font-medium text-gray-700 transition-colors hover:bg-gray-50"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={() => handleCall(confirmTarget)}
                disabled={calling}
                className="flex-1 rounded-lg bg-blue-600 px-4 py-3 text-base font-semibold text-white transition-colors hover:bg-blue-700 disabled:bg-gray-300"
              >
                {calling ? "処理中..." : "はい"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
