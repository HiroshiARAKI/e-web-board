// Copyright 2026 Hiroshi Araki (https://hiroshi.araki.tech)
// SPDX-License-Identifier: Apache-2.0
import { NextRequest, NextResponse } from "next/server";
import { readStoredObject } from "@/lib/media-storage";

/** Disable static caching so newly uploaded files are served immediately. */
export const dynamic = "force-dynamic";

/**
 * GET /uploads/[...path] — serve uploaded media files.
 *
 * Next.js standalone mode does not serve files that are dynamically added to
 * public/ after the build. This route handler fills that gap by reading the
 * backing storage object and streaming it back with the correct Content-Type.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const segments = await params;
  const filename = segments.path.join("/");

  try {
    const object = await readStoredObject(filename);
    if (!object) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return new NextResponse(new Uint8Array(object.body), {
      status: 200,
      headers: {
        "Content-Type": object.contentType,
        "Content-Length": object.contentLength.toString(),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Invalid storage key") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(
      { error: "Failed to read upload" },
      { status: 500 },
    );
  }
}
