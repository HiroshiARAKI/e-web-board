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
import { BoardDeleteButton } from "@/components/dashboard/BoardDeleteButton";
import { isBoardAccessible } from "@/lib/board-status";
import { templates } from "@/lib/templates";
import { getSessionUser } from "@/lib/auth";
import { getRequestI18n } from "@/lib/i18n-server";
import { resolveOwnerUserId } from "@/lib/ownership";

export const dynamic = "force-dynamic";

export default async function BoardsPage() {
  const session = await getSessionUser();
  if (!session) {
    return null;
  }
  const { t, formatDate, getTemplateCopy } = await getRequestI18n();

  const allBoards = await db
    .select()
    .from(boards)
    .where(eq(boards.ownerUserId, resolveOwnerUserId(session.user)))
    .orderBy(desc(boards.createdAt));

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-xl font-bold sm:text-2xl">{t("boards.title")}</h1>
          <p className="text-xs text-muted-foreground sm:text-sm">
            {t("boards.subtitle")}
          </p>
        </div>
        <Link
          href="/boards/new"
          className={buttonVariants()}
        >
          <Plus data-icon="inline-start" />
          {t("boards.new")}
        </Link>
      </div>

      {allBoards.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="mb-4 text-muted-foreground">
              {t("boards.empty")}
            </p>
            <Link
              href="/boards/new"
              className={buttonVariants()}
            >
              <Plus data-icon="inline-start" />
              {t("boards.firstCreate")}
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {allBoards.map((board) => {
            const template = templates[board.templateId as keyof typeof templates];
            const templateCopy = getTemplateCopy(board.templateId);
            const boardAccessible = isBoardAccessible(board);
            return (
              <Card
                key={board.id}
                className={`transition-shadow hover:shadow-md ${
                  boardAccessible ? "" : "border-amber-300 bg-amber-50/60 dark:border-amber-900/60 dark:bg-amber-950/20"
                }`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <CardTitle className="text-base">{board.name}</CardTitle>
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      {!boardAccessible && (
                        <Badge variant="secondary">
                          {t("boards.inactiveDueToPlanBadge")}
                        </Badge>
                      )}
                      <Badge variant={board.isActive ? "default" : "secondary"}>
                        {board.isActive ? t("common.enabled") : t("common.disabled")}
                      </Badge>
                      <Badge variant={board.visibility === "public" ? "default" : "secondary"}>
                        {board.visibility === "public" ? (
                          <>
                            <Globe data-icon="inline-start" />
                            {t("common.public")}
                          </>
                        ) : (
                          <>
                            <Lock data-icon="inline-start" />
                            {t("common.private")}
                          </>
                        )}
                      </Badge>
                    </div>
                  </div>
                  <CardDescription>
                    {template ? templateCopy.name : board.templateId}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <div>
                      {t("common.createdAt")}: {formatDate(board.createdAt)}
                    </div>
                    <div>
                      {!boardAccessible
                        ? t("boards.inactiveDueToPlanHint")
                        : board.visibility === "public"
                          ? t("boards.publicHint")
                          : t("boards.privateHint")}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {boardAccessible ? (
                      <>
                        <Link
                          href={`/boards/${board.id}`}
                          className={buttonVariants({ variant: "outline", size: "sm" })}
                        >
                          <Settings2 data-icon="inline-start" />
                          {t("common.manage")}
                        </Link>
                        <a
                          href={`/${board.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={buttonVariants({ size: "sm" })}
                        >
                          <ExternalLink data-icon="inline-start" />
                          {t("common.display")}
                        </a>
                      </>
                    ) : (
                      <>
                        <span
                          aria-disabled="true"
                          className={buttonVariants({
                            variant: "outline",
                            size: "sm",
                            className: "pointer-events-none opacity-50",
                          })}
                        >
                          <Settings2 data-icon="inline-start" />
                          {t("common.manage")}
                        </span>
                        <span
                          aria-disabled="true"
                          className={buttonVariants({
                            variant: "secondary",
                            size: "sm",
                            className: "pointer-events-none opacity-50",
                          })}
                        >
                          <ExternalLink data-icon="inline-start" />
                          {t("common.display")}
                        </span>
                      </>
                    )}
                    <BoardDeleteButton boardId={board.id} boardName={board.name} />
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
