// Copyright 2026 Hiroshi Araki (https://hiroshi.araki.tech)
// SPDX-License-Identifier: Apache-2.0
import Link from "next/link";
import { db } from "@/db";
import { boards } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { Plus, ExternalLink, Globe, Lock, Settings2 } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { templates } from "@/lib/templates";
import { getSessionUser } from "@/lib/auth";
import { resolveOwnerUserId } from "@/lib/ownership";

export const dynamic = "force-dynamic";

export default async function BoardsPage() {
  const session = await getSessionUser();
  if (!session) {
    return null;
  }

  const allBoards = await db
    .select()
    .from(boards)
    .where(eq(boards.ownerUserId, resolveOwnerUserId(session.user)))
    .orderBy(desc(boards.createdAt));

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-xl font-bold sm:text-2xl">ボード管理</h1>
          <p className="text-xs text-muted-foreground sm:text-sm">
            ボードの作成・編集・削除を行います。表示確認や共有は各カードの「表示」を使用してください。
          </p>
        </div>
        <Link
          href="/boards/new"
          className={buttonVariants()}
        >
          <Plus data-icon="inline-start" />
          新規作成
        </Link>
      </div>

      {allBoards.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="mb-4 text-muted-foreground">
              ボードがまだありません
            </p>
            <Link
              href="/boards/new"
              className={buttonVariants()}
            >
              <Plus data-icon="inline-start" />
              最初のボードを作成
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {allBoards.map((board) => {
            const template = templates[board.templateId as keyof typeof templates];
            return (
              <Card key={board.id} className="transition-shadow hover:shadow-md">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <CardTitle className="text-base">{board.name}</CardTitle>
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <Badge variant={board.isActive ? "default" : "secondary"}>
                        {board.isActive ? "有効" : "無効"}
                      </Badge>
                      <Badge variant={board.visibility === "public" ? "default" : "secondary"}>
                        {board.visibility === "public" ? (
                          <>
                            <Globe data-icon="inline-start" />
                            Public
                          </>
                        ) : (
                          <>
                            <Lock data-icon="inline-start" />
                            Private
                          </>
                        )}
                      </Badge>
                    </div>
                  </div>
                  <CardDescription>
                    {template?.name ?? board.templateId}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <div>
                      作成: {new Date(board.createdAt).toLocaleDateString("ja-JP")}
                    </div>
                    <div>
                      {board.visibility === "public"
                        ? "表示URLは非認証でも開けます"
                        : "表示URLはログイン済みユーザーのみ開けます"}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/boards/${board.id}`}
                      className={buttonVariants({ variant: "outline", size: "sm" })}
                    >
                      <Settings2 data-icon="inline-start" />
                      管理
                    </Link>
                    <a
                      href={`/${board.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={buttonVariants({ size: "sm" })}
                    >
                      <ExternalLink data-icon="inline-start" />
                      表示
                    </a>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
