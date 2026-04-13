// Copyright 2026 Hiroshi Araki (https://hiroshi.araki.tech)
// SPDX-License-Identifier: Apache-2.0
"use client";

import { useState, useCallback, useMemo } from "react";
import { useSSE } from "@/hooks/useSSE";
import { GoogleFontLoader } from "@/components/board/GoogleFontLoader";
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
  const [issuing, setIssuing] = useState(false);
  const [showDeleteAll, setShowDeleteAll] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showIssueInput, setShowIssueInput] = useState(false);
  const [issueNumber, setIssueNumber] = useState("");

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

  // Called messages (priority >= 1), most recent first
  const called = useMemo(
    () =>
      messages
        .filter((m) => m.priority >= 1)
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
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

  /** Compute next sequential number (e.g. "00001", "00002"), wraps after 99999 */
  function getNextNumber(): string {
    let maxNum = 0;
    for (const m of messages) {
      const n = parseInt(m.content, 10);
      if (!isNaN(n) && n > maxNum) maxNum = n;
    }
    const next = maxNum >= 99999 ? 1 : maxNum + 1;
    return String(next).padStart(5, "0");
  }

  function openIssueDialog() {
    setIssueNumber(getNextNumber());
    setShowIssueInput(true);
  }

  async function handleIssueNumber() {
    const num = issueNumber.trim();
    if (!num) return;
    setIssuing(true);
    try {
      const content = /^\d+$/.test(num) ? num.padStart(5, "0") : num;
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ boardId, content, priority: 0 }),
      });
      if (res.ok) {
        const inserted = await res.json();
        setMessages((prev) => [...prev, inserted]);
        setShowIssueInput(false);
        // Scroll to top so the new number is visible below the sticky header
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } catch {
      // Will be synced on next SSE event
    } finally {
      setIssuing(false);
    }
  }

  async function handleDeleteAll() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/boards/${boardId}/messages`, {
        method: "DELETE",
      });
      if (res.ok) {
        setMessages([]);
        setShowDeleteAll(false);
      }
    } catch {
      // Will be synced on next SSE event
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <GoogleFontLoader fonts={["Noto Sans JP"]} />
      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-white px-4 py-3 shadow-sm">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-2">
          <h1 className="shrink-0 text-lg font-bold text-gray-900">呼び出し画面</h1>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={openIssueDialog}
              className="rounded-lg bg-green-600 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-green-700"
            >
              ＋ 番号発行
            </button>
            <button
              type="button"
              onClick={() => setShowDeleteAll(true)}
              disabled={messages.length === 0}
              className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:bg-gray-300"
            >
              全削除
            </button>
            <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
              待機中: {waiting.length}件
            </span>
          </div>
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
                className="flex items-center justify-center rounded-xl border-2 border-gray-200 bg-white px-3 py-5 text-2xl font-bold text-gray-900 shadow-sm transition-all active:scale-95 hover:border-blue-400 hover:bg-blue-50 sm:text-3xl"
                style={{ fontFamily: '"Noto Sans JP", system-ui, sans-serif', fontVariantNumeric: "tabular-nums" }}
              >
                {msg.content}
              </button>
            ))}
          </div>
        )}
      </main>

      {/* Called numbers section */}
      {called.length > 0 && (
        <div className="mx-auto w-full max-w-2xl border-t border-gray-200 px-4 pb-4 pt-2">
          <p className="mb-2 text-xs font-medium text-gray-400">呼び出し済み ({called.length}件)</p>
          <div className="flex flex-wrap gap-1.5">
            {called.map((msg) => (
              <span
                key={msg.id}
                className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-400"
                style={{ fontFamily: '"Noto Sans JP", system-ui, sans-serif', fontVariantNumeric: "tabular-nums" }}
              >
                {msg.content}
              </span>
            ))}
          </div>
        </div>
      )}

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

      {/* Issue number dialog */}
      {showIssueInput && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-xs rounded-2xl bg-white p-6 shadow-xl">
            <p className="mb-4 text-center text-lg font-semibold text-gray-900">
              番号発行
            </p>
            <input
              type="text"
              inputMode="numeric"
              value={issueNumber}
              onChange={(e) => setIssueNumber(e.target.value)}
              className="mb-4 w-full rounded-lg border border-gray-300 px-4 py-3 text-center text-2xl font-bold tracking-widest text-gray-900 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-200"
              style={{ fontFamily: '"Noto Sans JP", system-ui, sans-serif', fontVariantNumeric: "tabular-nums" }}
              autoFocus
            />
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowIssueInput(false)}
                disabled={issuing}
                className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-3 text-base font-medium text-gray-700 transition-colors hover:bg-gray-50"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={handleIssueNumber}
                disabled={issuing || !issueNumber.trim()}
                className="flex-1 rounded-lg bg-green-600 px-4 py-3 text-base font-semibold text-white transition-colors hover:bg-green-700 disabled:bg-gray-300"
              >
                {issuing ? "発行中..." : "発行"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete all confirmation dialog */}
      {showDeleteAll && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-xs rounded-2xl bg-white p-6 shadow-xl">
            <p className="mb-2 text-center text-lg font-bold text-gray-900">
              全ての番号を削除
            </p>
            <p className="mb-6 text-center text-sm text-gray-500">
              全 {messages.length} 件の番号を完全に削除します。この操作は取り消せません。
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteAll(false)}
                disabled={deleting}
                className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-3 text-base font-medium text-gray-700 transition-colors hover:bg-gray-50"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={handleDeleteAll}
                disabled={deleting}
                className="flex-1 rounded-lg bg-red-600 px-4 py-3 text-base font-semibold text-white transition-colors hover:bg-red-700 disabled:bg-gray-300"
              >
                {deleting ? "削除中..." : "削除する"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
