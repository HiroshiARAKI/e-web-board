"use client";

import { useRef, useEffect, useState } from "react";
import { motion } from "framer-motion";

interface TickerTextProps {
  messages: string[];
  /** Scroll speed in pixels per second */
  speed?: number;
  className?: string;
}

export function TickerText({
  messages,
  speed = 60,
  className = "",
}: TickerTextProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [contentWidth, setContentWidth] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);

  const text = messages.length > 0 ? messages.join("　　　") : "";

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    setContainerWidth(container.offsetWidth);

    const span = container.querySelector("span");
    if (span) {
      setContentWidth(span.offsetWidth);
    }
  }, [text]);

  if (!text) {
    return null;
  }

  const totalDistance = contentWidth + containerWidth;
  const duration = totalDistance / speed;

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden whitespace-nowrap ${className}`}
    >
      <motion.div
        initial={{ x: containerWidth }}
        animate={{ x: -contentWidth }}
        transition={{
          duration,
          ease: "linear",
          repeat: Infinity,
          repeatType: "loop",
        }}
        key={text}
      >
        <span className="inline-block">{text}</span>
      </motion.div>
    </div>
  );
}
