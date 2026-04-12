// Copyright 2026 Hiroshi Araki (https://hiroshi.araki.tech)
// SPDX-License-Identifier: Apache-2.0
"use client";

import { useState, useRef, useCallback } from "react";
import { Upload, X, GripVertical, Trash2, Image, Film } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { MediaItem } from "@/types";

interface MediaUploadZoneProps {
  boardId: string;
  mediaItems: MediaItem[];
  onUpdate: () => Promise<void>;
}

interface UploadProgress {
  name: string;
  progress: number;
}

export default function MediaUploadZone({
  boardId,
  mediaItems,
  onUpdate,
}: MediaUploadZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploading, setUploading] = useState<UploadProgress[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const ACCEPTED_TYPES =
    "image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm";

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files);
      if (fileArray.length === 0) return;

      setUploading(fileArray.map((f) => ({ name: f.name, progress: 0 })));

      for (let i = 0; i < fileArray.length; i++) {
        const file = fileArray[i];
        const formData = new FormData();
        formData.append("file", file);
        formData.append("boardId", boardId);

        try {
          const res = await fetch("/api/media", {
            method: "POST",
            body: formData,
          });

          if (!res.ok) {
            const err = await res.json();
            console.error(`Upload failed for ${file.name}:`, err.error);
          }

          setUploading((prev) =>
            prev.map((p, idx) =>
              idx === i ? { ...p, progress: 100 } : p,
            ),
          );
        } catch (err) {
          console.error(`Upload error for ${file.name}:`, err);
        }
      }

      await onUpdate();
      setUploading([]);
    },
    [boardId, onUpdate],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      if (e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files);
      }
    },
    [handleFiles],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        handleFiles(e.target.files);
        e.target.value = "";
      }
    },
    [handleFiles],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      const res = await fetch(`/api/media/${id}`, { method: "DELETE" });
      if (res.ok) {
        await onUpdate();
      }
    },
    [onUpdate],
  );

  const handleDurationChange = useCallback(
    async (id: string, duration: number) => {
      await fetch(`/api/media/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ duration }),
      });
      await onUpdate();
    },
    [onUpdate],
  );

  // Drag & drop reorder handlers
  const handleReorderDragStart = useCallback(
    (e: React.DragEvent, index: number) => {
      setDraggedIndex(index);
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", String(index));
    },
    [],
  );

  const handleReorderDragOver = useCallback(
    (e: React.DragEvent, index: number) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      setDragOverIndex(index);
    },
    [],
  );

  const handleReorderDrop = useCallback(
    async (e: React.DragEvent, dropIndex: number) => {
      e.preventDefault();
      setDragOverIndex(null);

      if (draggedIndex === null || draggedIndex === dropIndex) {
        setDraggedIndex(null);
        return;
      }

      const sorted = [...mediaItems].sort(
        (a, b) => a.displayOrder - b.displayOrder,
      );
      const [moved] = sorted.splice(draggedIndex, 1);
      sorted.splice(dropIndex, 0, moved);

      const orderUpdates = sorted.map((item, idx) => ({
        id: item.id,
        displayOrder: idx,
      }));

      setDraggedIndex(null);

      await fetch("/api/media", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderUpdates),
      });
      await onUpdate();
    },
    [draggedIndex, mediaItems, onUpdate],
  );

  const handleReorderDragEnd = useCallback(() => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  }, []);

  const sortedMedia = [...mediaItems].sort(
    (a, b) => a.displayOrder - b.displayOrder,
  );

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors ${
          isDragOver
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-primary/50"
        }`}
      >
        <Upload className="mb-2 size-8 text-muted-foreground" />
        <p className="text-sm font-medium">
          ファイルをドラッグ＆ドロップ、またはクリックして選択
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          JPEG, PNG, WebP, GIF, MP4, WebM（最大 50MB）
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_TYPES}
          multiple
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>

      {/* Upload progress */}
      {uploading.length > 0 && (
        <div className="space-y-2">
          {uploading.map((item, idx) => (
            <div
              key={idx}
              className="flex items-center gap-3 rounded-md border px-3 py-2 text-sm"
            >
              <span className="flex-1 truncate">{item.name}</span>
              <div className="h-2 w-24 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${item.progress}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Media list with thumbnails & reorder */}
      {sortedMedia.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">
          メディアはありません
        </p>
      ) : (
        <div className="space-y-2">
          {sortedMedia.map((item, index) => (
            <div
              key={item.id}
              draggable
              onDragStart={(e) => handleReorderDragStart(e, index)}
              onDragOver={(e) => handleReorderDragOver(e, index)}
              onDrop={(e) => handleReorderDrop(e, index)}
              onDragEnd={handleReorderDragEnd}
              className={`flex items-center gap-3 rounded-md border px-3 py-2 text-sm transition-colors ${
                draggedIndex === index ? "opacity-50" : ""
              } ${dragOverIndex === index ? "border-primary bg-primary/5" : ""}`}
            >
              <GripVertical className="size-4 shrink-0 cursor-grab text-muted-foreground" />

              {/* Thumbnail */}
              <div className="relative size-12 shrink-0 overflow-hidden rounded border bg-muted">
                {item.type === "image" ? (
                  <img
                    src={item.filePath}
                    alt=""
                    className="size-full object-cover"
                  />
                ) : (
                  <div className="flex size-full items-center justify-center">
                    <Film className="size-5 text-muted-foreground" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="shrink-0">
                    {item.type === "image" ? (
                      <Image className="mr-1 size-3" />
                    ) : (
                      <Film className="mr-1 size-3" />
                    )}
                    {item.type}
                  </Badge>
                  <span className="truncate font-mono text-xs text-muted-foreground">
                    {item.filePath.split("/").pop()}
                  </span>
                </div>
              </div>

              {/* Duration */}
              <div className="flex shrink-0 items-center gap-1">
                <Label className="text-xs text-muted-foreground">秒:</Label>
                <Input
                  type="number"
                  min={1}
                  value={item.duration}
                  onChange={(e) => {
                    const v = parseInt(e.target.value, 10);
                    if (v >= 1) handleDurationChange(item.id, v);
                  }}
                  className="h-7 w-16 text-xs"
                />
              </div>

              {/* Delete */}
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => handleDelete(item.id)}
              >
                <Trash2 className="size-3.5 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
