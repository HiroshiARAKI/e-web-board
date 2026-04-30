// Copyright 2026 Hiroshi Araki (https://hiroshi.araki.tech)
// SPDX-License-Identifier: Apache-2.0
import { ErrorScreen } from "@/components/ErrorScreen";

export default function NotFound() {
  return (
    <ErrorScreen
      statusLabel="404 / Not Found"
      title="ページが見つかりません"
      description="指定されたページは削除されたか、URL が間違っている可能性があります。"
    />
  );
}
