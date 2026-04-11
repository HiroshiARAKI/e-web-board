/**
 * SSE (Server-Sent Events) manager
 *
 * Manages per-board SSE channels. API routes call `emitSSE(boardId, event)`
 * after mutations, which pushes events to all connected clients for that board.
 */

type SSEClient = {
  controller: ReadableStreamDefaultController;
};

const channels = new Map<string, Set<SSEClient>>();

/** Register a client connection for a board */
export function addClient(
  boardId: string,
  controller: ReadableStreamDefaultController,
): SSEClient {
  const client: SSEClient = { controller };
  if (!channels.has(boardId)) {
    channels.set(boardId, new Set());
  }
  channels.get(boardId)!.add(client);
  return client;
}

/** Remove a client connection */
export function removeClient(boardId: string, client: SSEClient): void {
  const clients = channels.get(boardId);
  if (clients) {
    clients.delete(client);
    if (clients.size === 0) {
      channels.delete(boardId);
    }
  }
}

/** Emit an SSE event to all clients connected to a board */
export function emitSSE(
  boardId: string,
  event: string,
  data?: Record<string, unknown>,
): void {
  const clients = channels.get(boardId);
  if (!clients || clients.size === 0) return;

  const payload =
    `event: ${event}\ndata: ${JSON.stringify(data ?? {})}\n\n`;
  const encoded = new TextEncoder().encode(payload);

  for (const client of clients) {
    try {
      client.controller.enqueue(encoded);
    } catch {
      // Client disconnected; remove it
      clients.delete(client);
    }
  }

  // Clean up empty channel
  if (clients.size === 0) {
    channels.delete(boardId);
  }
}

/** Get number of connected clients for a board (for debugging) */
export function getClientCount(boardId: string): number {
  return channels.get(boardId)?.size ?? 0;
}
