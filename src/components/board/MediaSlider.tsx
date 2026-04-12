// Copyright 2026 Hiroshi Araki (https://hiroshi.araki.tech)
// SPDX-License-Identifier: Apache-2.0
"use client";

import { useState, useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { MediaItem } from "@/types";

interface MediaSliderProps {
  mediaItems: MediaItem[];
  /** Interval between slides in seconds (default from board config) */
  interval?: number;
  /** How media fits the container: "contain" (show all) or "cover" (fill, may crop) */
  objectFit?: "contain" | "cover";
}

export function MediaSlider({ mediaItems, interval = 5, objectFit = "contain" }: MediaSliderProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const advance = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % mediaItems.length);
  }, [mediaItems.length]);

  useEffect(() => {
    if (mediaItems.length <= 1) return;

    const item = mediaItems[currentIndex];
    // For videos, wait for their natural duration; for images, use the configured interval
    const ms =
      item?.type === "video"
        ? (item.duration || interval) * 1000
        : (item?.duration || interval) * 1000;

    const timer = setTimeout(advance, ms);
    return () => clearTimeout(timer);
  }, [currentIndex, mediaItems, interval, advance]);

  if (mediaItems.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-black/80 text-white/60">
        <p className="text-lg">メディアが登録されていません</p>
      </div>
    );
  }

  const current = mediaItems[currentIndex];

  return (
    <div className="relative h-full w-full overflow-hidden bg-black">
      <AnimatePresence mode="wait">
        <motion.div
          key={current.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
          className="absolute inset-0"
        >
          {current.type === "video" ? (
            <video
              src={current.filePath}
              className={`h-full w-full ${objectFit === "cover" ? "object-cover" : "object-contain"}`}
              autoPlay
              muted
              playsInline
              onEnded={advance}
            />
          ) : (
            <img
              src={current.filePath}
              alt=""
              className={`h-full w-full ${objectFit === "cover" ? "object-cover" : "object-contain"}`}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
