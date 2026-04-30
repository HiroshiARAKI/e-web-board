// Copyright 2026 Hiroshi Araki (https://hiroshi.araki.tech)
// SPDX-License-Identifier: Apache-2.0
"use client";

import { useEffect } from "react";
import { ErrorScreen } from "@/components/ErrorScreen";

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="ja">
      <body>
        <ErrorScreen
          statusLabel="500 / Server Error"
          title="重大なエラーが発生しました"
          description="画面を表示できませんでした。時間をおいて再度アクセスしてください。"
        />
      </body>
    </html>
  );
}
