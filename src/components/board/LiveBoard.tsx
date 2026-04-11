"use client";

import { useState, useCallback } from "react";
import { useSSE } from "@/hooks/useSSE";
import type { Board, MediaItem, Message, BoardTemplateProps } from "@/types";

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
    <TemplateComponent board={board} mediaItems={mediaItems} messages={messages} />
  );
}
