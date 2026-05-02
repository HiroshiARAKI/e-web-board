// Copyright 2026 Hiroshi Araki (https://hiroshi.araki.tech)
// SPDX-License-Identifier: Apache-2.0
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useLocale } from "@/components/i18n/LocaleProvider";
import type { MediaItem } from "@/types";

/** How many upcoming images to preload ahead of the current slide. */
const PRELOAD_AHEAD = 2;

interface MediaSliderProps {
  mediaItems: MediaItem[];
  /** Interval between slides in seconds (default from board config) */
  interval?: number;
  /** How media fits the container: "contain" (show all) or "cover" (fill, may crop) */
  objectFit?: "contain" | "cover";
}

export function MediaSlider({ mediaItems, interval = 5, objectFit = "contain" }: MediaSliderProps) {
  const { t } = useLocale();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [imageLoaded, setImageLoaded] = useState(false);
  const preloadedRef = useRef<Set<string>>(new Set());
  const currentImageRef = useRef<HTMLImageElement | null>(null);

  const advance = useCallback(() => {
    setImageLoaded(false);
    setCurrentIndex((prev) => (prev + 1) % mediaItems.length);
  }, [mediaItems.length]);

  // --- Preload upcoming images ---
  useEffect(() => {
    if (mediaItems.length <= 1) return;

    for (let offset = 1; offset <= PRELOAD_AHEAD; offset++) {
      const idx = (currentIndex + offset) % mediaItems.length;
      const item = mediaItems[idx];
      if (item?.type === "image" && !preloadedRef.current.has(item.filePath)) {
        preloadedRef.current.add(item.filePath);
        const img = new Image();
        img.src = item.filePath;
      }
    }
  }, [currentIndex, mediaItems]);

  const current = mediaItems[currentIndex];

  useEffect(() => {
    if (!current) return;

    const loaded =
      current.type !== "image" || Boolean(currentImageRef.current?.complete);
    const raf = requestAnimationFrame(() => setImageLoaded(loaded));

    return () => cancelAnimationFrame(raf);
  }, [current]);

  // --- Auto-advance timer (starts only after the current image has loaded) ---
  useEffect(() => {
    if (mediaItems.length <= 1) return;

    const item = mediaItems[currentIndex];
    if (!item) return;

    // For videos the advance is driven by the onEnded callback
    if (item.type === "video") return;

    // Wait until the browser has decoded and painted the current image
    if (!imageLoaded) return;

    const ms = (item.duration || interval) * 1000;
    const timer = setTimeout(advance, ms);
    return () => clearTimeout(timer);
  }, [currentIndex, mediaItems, interval, advance, imageLoaded]);

  // --- Video timer fallback (in case onEnded doesn't fire) ---
  useEffect(() => {
    if (mediaItems.length <= 1) return;

    const item = mediaItems[currentIndex];
    if (item?.type !== "video") return;

    const ms = (item.duration || interval) * 1000;
    const timer = setTimeout(advance, ms);
    return () => clearTimeout(timer);
  }, [currentIndex, mediaItems, interval, advance]);

  // Reset preload cache when the media list changes
  useEffect(() => {
    preloadedRef.current.clear();
  }, [mediaItems]);

  if (mediaItems.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-black/80 text-white/60">
        <p className="text-lg">{t("board.noMedia")}</p>
      </div>
    );
  }
  const fitClass = objectFit === "cover" ? "object-cover" : "object-contain";

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
              className={`h-full w-full ${fitClass}`}
              autoPlay
              muted
              playsInline
              onEnded={advance}
            />
          ) : (
            <img
              ref={currentImageRef}
              src={current.filePath}
              alt=""
              className={`h-full w-full ${fitClass}`}
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageLoaded(true)}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
