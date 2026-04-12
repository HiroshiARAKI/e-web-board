// Copyright 2026 Hiroshi Araki (https://hiroshi.araki.tech)
// SPDX-License-Identifier: Apache-2.0

import { NextResponse } from "next/server";
import packageJson from "../../../../package.json";

const GITHUB_REPO = "HiroshiARAKI/e-web-board";

export async function GET() {
  const current = packageJson.version;
  const releaseUrl = `https://github.com/${GITHUB_REPO}/releases/tag/v${current}`;

  let latest: string | null = null;
  let latestUrl: string | null = null;
  try {
    const res = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`,
      {
        headers: { Accept: "application/vnd.github.v3+json" },
        next: { revalidate: 3600 },
      },
    );
    if (res.ok) {
      const data = await res.json();
      const tag: string = data.tag_name ?? "";
      latest = tag.replace(/^v/, "");
      latestUrl = data.html_url ?? null;
    }
  } catch {
    // GitHub API unavailable — ignore
  }

  const hasUpdate = latest ? isNewer(latest, current) : false;

  return NextResponse.json({
    current,
    releaseUrl,
    latest,
    latestUrl,
    hasUpdate,
  });
}

/** Return true if `a` is semantically newer than `b` (semver compare). */
function isNewer(a: string, b: string): boolean {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const va = pa[i] ?? 0;
    const vb = pb[i] ?? 0;
    if (va > vb) return true;
    if (va < vb) return false;
  }
  return false;
}
