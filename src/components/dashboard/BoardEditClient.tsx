// Copyright 2026 Hiroshi Araki (https://hiroshi.araki.tech)
// SPDX-License-Identifier: Apache-2.0
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ExternalLink,
  Trash2,
  Plus,
  Save,
  Pencil,
  Check,
  X,
} from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
  DialogTrigger,
} from "@/components/ui/dialog";
import { templates } from "@/lib/templates";
import { TemplateConfigEditor } from "@/components/dashboard/config-editors";
import MediaUploadZone from "@/components/dashboard/MediaUploadZone";
import type { Board, MediaItem, Message } from "@/types";

interface BoardDetail extends Board {
  mediaItems: MediaItem[];
  messages: Message[];
}

export default function BoardEditClient({ boardId }: { boardId: string }) {
  const router = useRouter();
  const [board, setBoard] = useState<BoardDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Edit state
  const [name, setName] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [config, setConfig] = useState<Record<string, unknown>>({});

  // New message state
  const [newMsgContent, setNewMsgContent] = useState("");
  const [newMsgPriority, setNewMsgPriority] = useState("0");

  // Message editing state
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [editMsgContent, setEditMsgContent] = useState("");
  const [editMsgPriority, setEditMsgPriority] = useState("");

  const fetchBoard = useCallback(async () => {
    const res = await fetch(`/api/boards/${boardId}`);
    if (!res.ok) {
      setError("ボードが見つかりません");
      setLoading(false);
      return;
    }
    const data: BoardDetail = await res.json();
    setBoard(data);
    setName(data.name);
    setIsActive(data.isActive);
    const parsed =
      typeof data.config === "string" ? JSON.parse(data.config) : data.config;
    setConfig(parsed && typeof parsed === "object" ? parsed : {});
    setLoading(false);
  }, [boardId]);

  useEffect(() => {
    fetchBoard();
  }, [fetchBoard]);

  async function handleSave() {
    setSaving(true);
    setError(null);

    const res = await fetch(`/api/boards/${boardId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, isActive, config }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "保存に失敗しました");
    } else {
      await fetchBoard();
    }
    setSaving(false);
  }

  async function handleDelete() {
    const res = await fetch(`/api/boards/${boardId}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/boards");
    }
  }

  async function handleAddMessage() {
    if (!newMsgContent.trim()) return;

    const res = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        boardId,
        content: newMsgContent,
        priority: parseInt(newMsgPriority, 10) || 0,
      }),
    });

    if (res.ok) {
      setNewMsgContent("");
      setNewMsgPriority("0");
      await fetchBoard();
    }
  }

  async function handleDeleteMessage(msgId: string) {
    const res = await fetch(`/api/messages/${msgId}`, { method: "DELETE" });
    if (res.ok) {
      await fetchBoard();
    }
  }

  function startEditMessage(msg: Message) {
    setEditingMsgId(msg.id);
    setEditMsgContent(msg.content);
    setEditMsgPriority(String(msg.priority));
  }

  function cancelEditMessage() {
    setEditingMsgId(null);
    setEditMsgContent("");
    setEditMsgPriority("");
  }

  async function handleSaveMessage(msgId: string) {
    const res = await fetch(`/api/messages/${msgId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: editMsgContent,
        priority: parseInt(editMsgPriority, 10) || 0,
      }),
    });
    if (res.ok) {
      setEditingMsgId(null);
      await fetchBoard();
    }
  }

  if (loading) {
    return <div className="py-12 text-center text-muted-foreground">読み込み中...</div>;
  }

  if (!board) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">{error ?? "ボードが見つかりません"}</p>
        <Link
          href="/boards"
          className={`mt-4 ${buttonVariants({ variant: "outline" })}`}
        >
          ボード一覧に戻る
        </Link>
      </div>
    );
  }

  const template = templates[board.templateId as keyof typeof templates];

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link
            href="/boards"
            className={buttonVariants({ variant: "ghost", size: "sm" })}
          >
            <ArrowLeft data-icon="inline-start" />
            ボード一覧
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={`/${boardId}`}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <ExternalLink data-icon="inline-start" />
            プレビュー
          </a>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: Board settings (2 cols) */}
        <div className="space-y-6 lg:col-span-2">
          {/* Basic info */}
          <Card>
            <CardHeader>
              <CardTitle>基本設定</CardTitle>
              <CardDescription>
                テンプレート: {template?.name ?? board.templateId}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="board-name">ボード名</Label>
                <Input
                  id="board-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={100}
                />
              </div>

              <div className="flex items-center gap-3">
                <Switch
                  id="board-active"
                  checked={isActive}
                  onCheckedChange={setIsActive}
                />
                <Label htmlFor="board-active">
                  ボードを有効にする
                </Label>
                <Badge variant={isActive ? "default" : "secondary"}>
                  {isActive ? "有効" : "無効"}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Config Editor */}
          <Card>
            <CardHeader>
              <CardTitle>テンプレート設定</CardTitle>
              <CardDescription>
                テンプレート固有の設定を編集できます
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TemplateConfigEditor
                templateId={board.templateId}
                config={config}
                onChange={setConfig}
              />
            </CardContent>
          </Card>

          {/* Messages (not used by photo-clock template) */}
          {board.templateId !== "photo-clock" && (
          <Card>
            <CardHeader>
              <CardTitle>メッセージ</CardTitle>
              <CardDescription>
                {board.messages.length} 件のメッセージ
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add new message */}
              <div className="flex gap-2">
                <Input
                  value={newMsgContent}
                  onChange={(e) => setNewMsgContent(e.target.value)}
                  placeholder="メッセージを入力..."
                  className="flex-1"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                      e.preventDefault();
                      handleAddMessage();
                    }
                  }}
                />
                <Input
                  value={newMsgPriority}
                  onChange={(e) => setNewMsgPriority(e.target.value)}
                  placeholder="優先度"
                  type="number"
                  min={0}
                  className="w-20"
                />
                <Button type="button" size="sm" onClick={handleAddMessage}>
                  <Plus data-icon="inline-start" />
                  追加
                </Button>
              </div>

              <Separator />

              {/* Message list */}
              {board.messages.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  メッセージはありません
                </p>
              ) : (
                <div className="space-y-2">
                  {[...board.messages]
                    .sort((a, b) => b.priority - a.priority)
                    .map((msg) =>
                      editingMsgId === msg.id ? (
                        <div
                          key={msg.id}
                          className="flex items-center gap-2 rounded-md border border-primary/30 bg-accent/30 px-3 py-2 text-sm"
                        >
                          <Input
                            value={editMsgPriority}
                            onChange={(e) => setEditMsgPriority(e.target.value)}
                            type="number"
                            min={0}
                            className="w-16 shrink-0"
                          />
                          <Input
                            value={editMsgContent}
                            onChange={(e) => setEditMsgContent(e.target.value)}
                            className="flex-1"
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                                e.preventDefault();
                                handleSaveMessage(msg.id);
                              }
                              if (e.key === "Escape") {
                                cancelEditMessage();
                              }
                            }}
                            autoFocus
                          />
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => handleSaveMessage(msg.id)}
                          >
                            <Check className="size-3.5 text-green-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={cancelEditMessage}
                          >
                            <X className="size-3.5 text-muted-foreground" />
                          </Button>
                        </div>
                      ) : (
                        <div
                          key={msg.id}
                          className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
                        >
                          <Badge variant="secondary" className="shrink-0">
                            P{msg.priority}
                          </Badge>
                          <span className="flex-1 truncate">{msg.content}</span>
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => startEditMessage(msg)}
                          >
                            <Pencil className="size-3.5 text-muted-foreground" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => handleDeleteMessage(msg.id)}
                          >
                            <Trash2 className="size-3.5 text-destructive" />
                          </Button>
                        </div>
                      ),
                    )}
                </div>
              )}
            </CardContent>
          </Card>
          )}

          {/* Media items */}
          <Card>
            <CardHeader>
              <CardTitle>メディア</CardTitle>
              <CardDescription>
                {board.mediaItems.length} 件のメディア
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MediaUploadZone
                boardId={boardId}
                mediaItems={board.mediaItems}
                onUpdate={fetchBoard}
              />
            </CardContent>
          </Card>
        </div>

        {/* Right: Actions sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">アクション</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full" onClick={handleSave} disabled={saving}>
                <Save data-icon="inline-start" />
                {saving ? "保存中..." : "保存"}
              </Button>

              <a
                href={`/${boardId}`}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonVariants({ variant: "outline", className: "w-full" })}
              >
                <ExternalLink data-icon="inline-start" />
                プレビュー
              </a>

              <Separator />

              <Dialog>
                <DialogTrigger
                render={
                  <Button variant="destructive" className="w-full">
                    <Trash2 data-icon="inline-start" />
                    ボードを削除
                  </Button>
                }
              />
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>ボードを削除しますか？</DialogTitle>
                    <DialogDescription>
                      「{board.name}」を削除します。この操作は取り消せません。
                      関連するメディアとメッセージもすべて削除されます。
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <DialogClose
                      render={<Button variant="outline">キャンセル</Button>}
                    />
                    <Button variant="destructive" onClick={handleDelete}>
                      削除する
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>

          {error && (
            <Card className="border-destructive">
              <CardContent className="py-3">
                <p className="text-sm text-destructive">{error}</p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="py-4 text-xs text-muted-foreground">
              <div>ID: <span className="font-mono">{board.id}</span></div>
              <div>作成: {new Date(board.createdAt).toLocaleString("ja-JP")}</div>
              <div>更新: {new Date(board.updatedAt).toLocaleString("ja-JP")}</div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
