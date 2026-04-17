// Copyright 2026 Hiroshi Araki (https://hiroshi.araki.tech)
// SPDX-License-Identifier: Apache-2.0

/**
 * Keinage SVG logo component.
 * In dark mode the strokes/fills switch to a light colour automatically
 * via `currentColor`.
 */
export function KeinageLogo({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 60 400 180"
      className={className}
      aria-hidden="true"
    >
      <g transform="translate(100, 60)">
        {/* Monitor frame */}
        <rect x="0" y="0" width="200" height="140" rx="12" fill="currentColor" />
        {/* Screen (always white) */}
        <rect x="12" y="12" width="176" height="116" rx="4" fill="#FFFFFF" />
        {/* K shape: vertical bar */}
        <rect
          x="20"
          y="20"
          width="28"
          height="100"
          fill="currentColor"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinejoin="round"
        />
        {/* K shape: triangle */}
        <polygon
          points="60,70 180,20 180,120"
          fill="currentColor"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinejoin="round"
        />
        {/* Stand: neck */}
        <rect x="92" y="140" width="16" height="24" fill="currentColor" />
        {/* Stand: base */}
        <rect x="60" y="164" width="80" height="8" rx="4" fill="currentColor" />
      </g>
    </svg>
  );
}
