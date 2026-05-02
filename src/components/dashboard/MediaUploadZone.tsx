// Copyright 2026 Hiroshi Araki (https://hiroshi.araki.tech)
// SPDX-License-Identifier: Apache-2.0
"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { AlertCircle, Upload, X, GripVertical, Trash2, Image as ImageIcon, Film } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { planLimitMessageKey } from "@/lib/plan-limit";
import { thumbUrl } from "@/lib/utils";
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

const VIDEO_TYPES = new Set(["video/mp4", "video/webm"]);
const VIDEO_POSTER_MIME_TYPE = "image/jpeg";
const VIDEO_POSTER_EXTENSION = ".jpg";

function waitForVideoEvent(video: HTMLVideoElement, eventName: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error(`Timed out while waiting for ${eventName}`));
    }, 8000);

    const cleanup = () => {
      window.clearTimeout(timeout);
      video.removeEventListener(eventName, handleEvent);
      video.removeEventListener("error", handleError);
    };

    const handleEvent = () => {
      cleanup();
      resolve();
    };

    const handleError = () => {
      cleanup();
      reject(new Error("Could not load video for poster generation"));
    };

    video.addEventListener(eventName, handleEvent, { once: true });
    video.addEventListener("error", handleError, { once: true });
  });
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob(resolve, VIDEO_POSTER_MIME_TYPE, 0.82);
  });
}

async function createVideoPoster(file: File): Promise<File | null> {
  if (!VIDEO_TYPES.has(file.type)) return null;

  const objectUrl = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.muted = true;
  video.preload = "metadata";
  video.playsInline = true;
  video.src = objectUrl;

  try {
    video.load();
    await waitForVideoEvent(video, "loadedmetadata");

    const duration = Number.isFinite(video.duration) ? video.duration : 0;
    const seekTarget = duration > 0.3 ? Math.min(0.25, duration / 3) : 0;
    if (seekTarget > 0) {
      video.currentTime = seekTarget;
      await waitForVideoEvent(video, "seeked");
    } else if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      await waitForVideoEvent(video, "loadeddata");
    }

    const width = video.videoWidth;
    const height = video.videoHeight;
    if (width <= 0 || height <= 0) return null;

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return null;
    context.drawImage(video, 0, 0, width, height);

    const blob = await canvasToBlob(canvas);
    if (!blob) return null;

    const baseName = file.name.replace(/\.[^.]+$/, "");
    return new File([blob], `${baseName}${VIDEO_POSTER_EXTENSION}`, {
      type: VIDEO_POSTER_MIME_TYPE,
    });
  } catch (error) {
    console.error("[MediaUploadZone] Failed to generate video poster", {
      filename: file.name,
      error,
    });
    return null;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export default function MediaUploadZone({
  boardId,
  mediaItems,
  onUpdate,
}: MediaUploadZoneProps) {
  const { t } = useLocale();
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploading, setUploading] = useState<UploadProgress[]>([]);
  const [uploadNotice, setUploadNotice] = useState<string | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const ACCEPTED_TYPES =
    "image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm";

  useEffect(() => {
    if (!uploadNotice) return;
    const timeout = window.setTimeout(() => setUploadNotice(null), 7000);
    return () => window.clearTimeout(timeout);
  }, [uploadNotice]);

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
        const poster = await createVideoPoster(file);
        if (poster) {
          formData.append("poster", poster);
        }

        try {
          const res = await fetch("/api/media", {
            method: "POST",
            body: formData,
          });

          if (!res.ok) {
            const err = await res.json();
            const messageKey = planLimitMessageKey(err.code, err.messageKey);
            setUploadNotice(
              messageKey
                ? t(messageKey)
                : typeof err.error === "string"
                  ? err.error
                  : t("error.network"),
            );
            console.error(`Upload failed for ${file.name}:`, err.error);
          }

          setUploading((prev) =>
            prev.map((p, idx) =>
              idx === i ? { ...p, progress: 100 } : p,
            ),
          );
        } catch (err) {
          setUploadNotice(t("error.network"));
          console.error(`Upload error for ${file.name}:`, err);
        }
      }

      await onUpdate();
      setUploading([]);
    },
    [boardId, onUpdate, t],
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
      {uploadNotice && (
        <div className="fixed right-4 top-4 z-50 flex max-w-sm items-start gap-2 rounded-lg border border-destructive/30 bg-background px-4 py-3 text-sm text-foreground shadow-lg">
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
          <div className="min-w-0 flex-1">{uploadNotice}</div>
          <button
            type="button"
            onClick={() => setUploadNotice(null)}
            className="rounded-md p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label={t("common.cancel")}
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}

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
          {t("media.uploadPrompt")}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {t("media.acceptedTypesHint")}
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
              className="flex flex-col gap-2 rounded-md border px-3 py-2 text-sm sm:flex-row sm:items-center"
            >
              <span className="flex-1 truncate">{item.name}</span>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted sm:w-24">
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
          {t("settings.mediaEmpty")}
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
              className={`flex flex-wrap items-center gap-3 rounded-md border px-3 py-2 text-sm transition-colors ${
                draggedIndex === index ? "opacity-50" : ""
              } ${dragOverIndex === index ? "border-primary bg-primary/5" : ""}`}
            >
              <GripVertical className="size-4 shrink-0 cursor-grab text-muted-foreground" />

              {/* Thumbnail */}
              <div className="relative size-12 shrink-0 overflow-hidden rounded border bg-muted">
                {item.type === "image" ? (
                  <img
                    src={thumbUrl(item.filePath)}
                    alt=""
                    className="size-full object-cover"
                    onError={(e) => {
                      // Fall back to full image if thumbnail not found
                      (e.target as HTMLImageElement).src = item.filePath;
                    }}
                  />
                ) : (
                  <div className="flex size-full items-center justify-center">
                    <img
                      src={thumbUrl(item.filePath)}
                      alt=""
                      className="absolute inset-0 size-full object-cover"
                      onError={(e) => {
                        (e.currentTarget.style.display = "none");
                      }}
                    />
                    <Film className="size-5 text-muted-foreground" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="min-w-0 flex-1 basis-40">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="shrink-0">
                    {item.type === "image" ? (
                      <ImageIcon className="mr-1 size-3" />
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
              <div className="ml-auto flex shrink-0 items-center gap-1">
                <Label className="text-xs text-muted-foreground">{t("media.durationSeconds")}</Label>
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
                className="ml-auto sm:ml-0"
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
