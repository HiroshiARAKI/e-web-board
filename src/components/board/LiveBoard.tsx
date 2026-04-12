// Copyright 2026 Hiroshi Araki (https://hiroshi.araki.tech)
// SPDX-License-Identifier: Apache-2.0
"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useSSE } from "@/hooks/useSSE";
import type { Board, MediaItem, Message, BoardTemplateProps } from "@/types";

const CURSOR_HIDE_DELAY = 3000;

interface LiveBoardProps {
  board: Board;
  mediaItems: MediaItem[];
  messages: Message[];
  TemplateComponent: React.ComponentType<BoardTemplateProps>;
}

/**
 * Wraps a board template with SSE-based live updates.
 * Initial data comes from server-side rendering (props).
 * Subsequent updates are fetched when SSE events arrive.
 */
export default function LiveBoard({
  board: initialBoard,
  mediaItems: initialMedia,
  messages: initialMessages,
  TemplateComponent,
}: LiveBoardProps) {
  const [board, setBoard] = useState(initialBoard);
  const [mediaItems, setMediaItems] = useState(initialMedia);
  const [messages, setMessages] = useState(initialMessages);
  const [cursorVisible, setCursorVisible] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // --- Cursor auto-hide ---
  const resetCursorTimer = useCallback(() => {
    setCursorVisible(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setCursorVisible(false), CURSOR_HIDE_DELAY);
  }, []);

  useEffect(() => {
    resetCursorTimer();
    const onMove = () => resetCursorTimer();
    window.addEventListener("mousemove", onMove);
    return () => {
      window.removeEventListener("mousemove", onMove);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [resetCursorTimer]);

  // --- Fullscreen sync ---
  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const enterFullscreen = useCallback(() => {
    containerRef.current?.requestFullscreen?.();
  }, []);

  const exitFullscreen = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen?.();
  }, []);

  // --- SSE live updates ---
  const refetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/boards/${initialBoard.id}`);
      if (!res.ok) return;
      const data = await res.json();

      setBoard({
        id: data.id,
        name: data.name,
        templateId: data.templateId,
        config: data.config,
        isActive: data.isActive,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      });
      setMediaItems(data.mediaItems ?? []);
      setMessages(data.messages ?? []);
    } catch {
      // Network error; will retry on next SSE event
    }
  }, [initialBoard.id]);

  const handleSSEEvent = useCallback(
    (_event: string, _data: Record<string, unknown>) => {
      // On any event, refetch the full board data
      refetchData();
    },
    [refetchData],
  );

  useSSE({
    boardId: initialBoard.id,
    onEvent: handleSSEEvent,
  });

  return (
    <div
      ref={containerRef}
      className="relative h-screen w-screen"
      style={{ cursor: cursorVisible ? "auto" : "none" }}
    >
      <TemplateComponent board={board} mediaItems={mediaItems} messages={messages} />

      {/* Expand / Restore button */}
      <button
        type="button"
        onClick={isFullscreen ? exitFullscreen : enterFullscreen}
        className="fixed bottom-4 left-4 z-50 rounded-md bg-black/50 px-3 py-1.5 text-xs text-white backdrop-blur transition-opacity hover:bg-black/70"
        style={{
          opacity: cursorVisible ? 1 : 0,
          pointerEvents: cursorVisible ? "auto" : "none",
          transition: "opacity 0.3s ease",
        }}
        title={isFullscreen ? "全画面を解除" : "全画面表示"}
      >
        {isFullscreen ? "⤓ 元に戻す" : "⤢ 全画面表示"}
      </button>
    </div>
  );
}
