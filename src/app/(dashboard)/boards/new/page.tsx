// Copyright 2026 Hiroshi Araki (https://hiroshi.araki.tech)
// SPDX-License-Identifier: Apache-2.0
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { templates } from "@/lib/templates";
import type { TemplateId } from "@/types";

const templateList = Object.values(templates);

export default function NewBoardPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [templateId, setTemplateId] = useState<TemplateId>("simple");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const res = await fetch("/api/boards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, templateId }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "作成に失敗しました");
      setSubmitting(false);
      return;
    }

    const board = await res.json();
    router.push(`/boards/${board.id}`);
  }

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/boards"
          className={buttonVariants({ variant: "ghost", size: "sm" })}
        >
          <ArrowLeft data-icon="inline-start" />
          ボード一覧に戻る
        </Link>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>新規ボード作成</CardTitle>
          <CardDescription>
            テンプレートを選んでボードを作成します
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Board name */}
            <div className="space-y-2">
              <Label htmlFor="name">ボード名</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例: 1F ロビー掲示板"
                required
                maxLength={100}
              />
            </div>

            {/* Template selection */}
            <div className="space-y-3">
              <Label>テンプレート</Label>
              <div className="grid gap-3 sm:grid-cols-2">
                {templateList.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTemplateId(t.id)}
                    className={`rounded-lg border p-4 text-left transition-colors ${
                      templateId === t.id
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "border-border hover:bg-accent"
                    }`}
                  >
                    <div className="font-medium">{t.name}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {t.description}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <div className="flex gap-3">
              <Button type="submit" disabled={submitting || !name.trim()}>
                {submitting ? "作成中..." : "作成"}
              </Button>
              <Link
                href="/boards"
                className={buttonVariants({ variant: "outline" })}
              >
                キャンセル
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
