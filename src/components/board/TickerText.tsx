"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";

interface TickerTextProps {
  messages: string[];
  /** Scroll speed in pixels per second */
  speed?: number;
  className?: string;
  /** Font family for ticker text */
  fontFamily?: string;
}

export function TickerText({
  messages,
  speed = 60,
  className = "",
  fontFamily,
}: TickerTextProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLSpanElement>(null);
  const [contentWidth, setContentWidth] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);
  const [ready, setReady] = useState(false);

  const text = messages.length > 0 ? messages.join("　　　") : "";

  const measure = useCallback(() => {
    if (!containerRef.current || !contentRef.current) return;
    const cw = containerRef.current.offsetWidth;
    const tw = contentRef.current.offsetWidth;
    if (cw > 0 && tw > 0) {
      setContainerWidth(cw);
      setContentWidth(tw);
      setReady(true);
    }
  }, []);

  useEffect(() => {
    setReady(false);
    // Use requestAnimationFrame to ensure DOM is laid out before measuring
    const raf = requestAnimationFrame(() => {
      measure();
    });
    return () => cancelAnimationFrame(raf);
  }, [text, fontFamily, measure]);

  // Re-measure on window resize
  useEffect(() => {
    const handleResize = () => {
      setReady(false);
      requestAnimationFrame(measure);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [measure]);

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
        initial={{ x: containerWidth || "100%" }}
        animate={ready ? { x: -contentWidth } : { x: "100%" }}
        transition={
          ready
            ? {
                duration,
                ease: "linear",
                repeat: Infinity,
                repeatType: "loop",
              }
            : { duration: 0 }
        }
        key={`${text}-${ready}`}
      >
        <span
          ref={contentRef}
          className="inline-block"
          style={fontFamily ? { fontFamily } : undefined}
        >
          {text}
        </span>
      </motion.div>
    </div>
  );
}
