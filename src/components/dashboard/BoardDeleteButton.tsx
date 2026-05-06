// Copyright 2026 Hiroshi Araki (https://hiroshi.araki.tech)
// SPDX-License-Identifier: Apache-2.0
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { Button } from "@/components/ui/button";

export function BoardDeleteButton({
  boardId,
  boardName,
  size = "sm",
}: {
  boardId: string;
  boardName: string;
  size?: "sm" | "default";
}) {
  const { t } = useLocale();
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function deleteBoard() {
    if (!window.confirm(t("boards.deleteConfirm", { name: boardName }))) return;

    setDeleting(true);
    try {
      const response = await fetch(`/api/boards/${boardId}`, { method: "DELETE" });
      if (!response.ok) {
        window.alert(t("boards.deleteFailed"));
        return;
      }
      router.refresh();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Button
      type="button"
      size={size}
      variant="outline"
      onClick={deleteBoard}
      disabled={deleting}
    >
      <Trash2 data-icon="inline-start" />
      {deleting ? t("boards.deleting") : t("common.delete")}
    </Button>
  );
}
