// Copyright 2026 Hiroshi Araki (https://hiroshi.araki.tech)
// SPDX-License-Identifier: Apache-2.0
import BoardEditClient from "@/components/dashboard/BoardEditClient";

export default async function BoardEditPage({
  params,
}: {
  params: Promise<{ boardId: string }>;
}) {
  const { boardId } = await params;
  return <BoardEditClient boardId={boardId} />;
}
