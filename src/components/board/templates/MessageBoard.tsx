"use client";

import { useState, useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { BoardTemplateProps, Message } from "@/types";

/** Default config for the Message Board template */
export const messageBoardDefaultConfig = {
  maxDisplayCount: 10,
  fontSize: "text-xl" as string,
  backgroundColor: "#1e293b",
  textColor: "#f8fafc",
  accentColor: "#3b82f6",
};

type MessageBoardConfig = typeof messageBoardDefaultConfig;

function parseConfig(raw: unknown): MessageBoardConfig {
  const cfg = (raw && typeof raw === "object" ? raw : {}) as Partial<MessageBoardConfig>;
  return { ...messageBoardDefaultConfig, ...cfg };
}

/** Priority badge color */
function priorityColor(priority: number): string {
  if (priority >= 5) return "#ef4444"; // red — urgent
  if (priority >= 3) return "#f59e0b"; // amber — high
  return "#6b7280"; // gray — normal
}

function priorityLabel(priority: number): string {
  if (priority >= 5) return "緊急";
  if (priority >= 3) return "重要";
  return "通常";
}

/** Check if a message is expired */
function isExpired(msg: Message): boolean {
  if (!msg.expiresAt) return false;
  return new Date(msg.expiresAt) <= new Date();
}

export default function MessageBoard({
  board,
  messages,
}: BoardTemplateProps) {
  const config = parseConfig(board.config);

  const [currentMessages, setCurrentMessages] = useState<Message[]>(() =>
    messages
      .filter((m) => !isExpired(m))
      .sort((a, b) => b.priority - a.priority)
      .slice(0, config.maxDisplayCount)
  );

  // Track "new" message IDs for highlight — IDs present on first render are not new
  const [knownIds] = useState<Set<string>>(() => new Set(messages.map((m) => m.id)));
  const [newIds, setNewIds] = useState<Set<string>>(new Set());

  // Poll for updated messages from the server
  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(`/api/boards/${board.id}/messages`);
      if (!res.ok) return;
      const data: Message[] = await res.json();
      const sorted = data
        .sort((a, b) => b.priority - a.priority)
        .slice(0, config.maxDisplayCount);

      // Detect new messages
      const freshIds = new Set<string>();
      for (const m of sorted) {
        if (!knownIds.has(m.id)) {
          freshIds.add(m.id);
          knownIds.add(m.id);
        }
      }
      if (freshIds.size > 0) {
        setNewIds((prev) => new Set([...prev, ...freshIds]));
        // Clear "new" highlight after 5 seconds
        setTimeout(() => {
          setNewIds((prev) => {
            const next = new Set(prev);
            for (const id of freshIds) next.delete(id);
            return next;
          });
        }, 5000);
      }

      setCurrentMessages(sorted);
    } catch {
      // silently ignore fetch errors
    }
  }, [board.id, config.maxDisplayCount, knownIds]);

  useEffect(() => {
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  const now = new Date();

  return (
    <div
      className="flex h-screen w-screen flex-col overflow-hidden"
      style={{ backgroundColor: config.backgroundColor, color: config.textColor }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between border-b px-6 py-4"
        style={{ borderColor: config.accentColor + "40" }}
      >
        <h1 className="text-2xl font-bold">{board.name}</h1>
        <div className="flex items-center gap-2 text-sm opacity-60">
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-green-400" />
          LIVE
        </div>
      </div>

      {/* Messages list */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {currentMessages.length === 0 ? (
          <div className="flex h-full items-center justify-center opacity-40">
            <p className={config.fontSize}>メッセージはありません</p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {currentMessages.map((msg) => {
              const isNew = newIds.has(msg.id);
              return (
                <motion.div
                  key={msg.id}
                  layout
                  initial={{ opacity: 0, x: -40 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 40 }}
                  transition={{ duration: 0.3 }}
                  className="mb-3 rounded-lg border p-4"
                  style={{
                    borderColor: isNew ? config.accentColor : config.accentColor + "20",
                    backgroundColor: isNew
                      ? config.accentColor + "15"
                      : config.backgroundColor,
                    boxShadow: isNew
                      ? `0 0 12px ${config.accentColor}40`
                      : "none",
                  }}
                >
                  <div className="mb-1 flex items-center gap-3">
                    {/* Priority badge */}
                    <span
                      className="rounded px-2 py-0.5 text-xs font-bold text-white"
                      style={{ backgroundColor: priorityColor(msg.priority) }}
                    >
                      {priorityLabel(msg.priority)}
                    </span>

                    {isNew && (
                      <span
                        className="rounded px-2 py-0.5 text-xs font-bold"
                        style={{
                          color: config.accentColor,
                          border: `1px solid ${config.accentColor}`,
                        }}
                      >
                        NEW
                      </span>
                    )}

                    {/* Expiry indicator */}
                    {msg.expiresAt && (
                      <span className="ml-auto text-xs opacity-40">
                        期限: {new Date(msg.expiresAt).toLocaleString("ja-JP")}
                      </span>
                    )}
                  </div>
                  <p className={`${config.fontSize} leading-relaxed`}>{msg.content}</p>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>

      {/* Footer */}
      <div
        className="flex items-center justify-between border-t px-6 py-2 text-xs opacity-40"
        style={{ borderColor: config.accentColor + "40" }}
      >
        <span>{currentMessages.length} 件表示</span>
        <span>自動更新中 (3秒間隔)</span>
      </div>
    </div>
  );
}
