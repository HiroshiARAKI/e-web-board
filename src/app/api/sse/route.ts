// Copyright 2026 Hiroshi Araki (https://hiroshi.araki.tech)
// SPDX-License-Identifier: Apache-2.0
// SSE routes moved to /api/sse/[boardId]/route.ts
// This file kept to avoid 404 on the base path
export async function GET() {
  return new Response("Use /api/sse/:boardId", { status: 400 });
}
