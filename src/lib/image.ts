// Copyright 2026 Hiroshi Araki (https://hiroshi.araki.tech)
// SPDX-License-Identifier: Apache-2.0
import sharp from "sharp";
import path from "path";
import fs from "fs";

const UPLOAD_DIR = path.resolve(process.cwd(), "uploads");
const THUMB_DIR = path.join(UPLOAD_DIR, "thumbs");

/** Default long-edge maximum (4K). 0 means no limit. */
export const DEFAULT_IMAGE_MAX_LONG_EDGE = 3840;

/** Thumbnail long-edge size. */
export const THUMBNAIL_LONG_EDGE = 600;

/**
 * Resize an image so that its longest edge does not exceed `maxLongEdge`.
 * If the image is already within the limit, the buffer is returned as-is.
 * Returns the (possibly unchanged) buffer.
 *
 * GIF files are returned untouched to preserve animation.
 */
export async function resizeImage(
  buffer: Buffer,
  ext: string,
  maxLongEdge: number,
): Promise<Buffer> {
  if (maxLongEdge <= 0) return buffer;
  if (ext.toLowerCase() === ".gif") return buffer;

  const image = sharp(buffer);
  const metadata = await image.metadata();
  const w = metadata.width ?? 0;
  const h = metadata.height ?? 0;
  const longEdge = Math.max(w, h);

  if (longEdge <= maxLongEdge) return buffer;

  const resized = image.resize({
    width: w >= h ? maxLongEdge : undefined,
    height: h > w ? maxLongEdge : undefined,
    fit: "inside",
    withoutEnlargement: true,
  });

  return await resized.toBuffer();
}

/**
 * Generate a thumbnail (600px long edge) and save to uploads/thumbs/.
 * Returns the public URL path of the thumbnail (e.g. `/uploads/thumbs/uuid.jpg`).
 *
 * GIF files get a static JPEG thumbnail (first frame).
 */
export async function generateThumbnail(
  buffer: Buffer,
  filename: string,
): Promise<string> {
  fs.mkdirSync(THUMB_DIR, { recursive: true });

  const ext = path.extname(filename).toLowerCase();
  // For GIF, generate a JPEG thumbnail from the first frame
  const thumbExt = ext === ".gif" ? ".jpg" : ext;
  const thumbFilename =
    path.basename(filename, ext) + thumbExt;
  const thumbPath = path.join(THUMB_DIR, thumbFilename);

  let pipeline = sharp(buffer);

  if (ext === ".gif") {
    // Extract first frame and convert to JPEG
    pipeline = pipeline.jpeg({ quality: 80 });
  }

  await pipeline
    .resize({
      width: THUMBNAIL_LONG_EDGE,
      height: THUMBNAIL_LONG_EDGE,
      fit: "inside",
      withoutEnlargement: true,
    })
    .toFile(thumbPath);

  return `/uploads/thumbs/${thumbFilename}`;
}

/**
 * Delete a thumbnail for a given original filename, if it exists.
 */
export function deleteThumbnail(filename: string): void {
  const ext = path.extname(filename).toLowerCase();
  const thumbExt = ext === ".gif" ? ".jpg" : ext;
  const thumbFilename = path.basename(filename, ext) + thumbExt;
  const thumbPath = path.join(THUMB_DIR, thumbFilename);
  try {
    if (fs.existsSync(thumbPath)) {
      fs.unlinkSync(thumbPath);
    }
  } catch {
    // ignore
  }
}
