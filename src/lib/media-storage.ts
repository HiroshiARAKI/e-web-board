// Copyright 2026 Hiroshi Araki (https://hiroshi.araki.tech)
// SPDX-License-Identifier: Apache-2.0
import {
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import fs from "fs";
import path from "path";

const LOCAL_UPLOAD_DIR = path.resolve(process.cwd(), "uploads");
const PUBLIC_UPLOAD_PREFIX = "/uploads/";
const THUMB_PREFIX = "thumbs/";

const MIME_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
};

const IMAGE_EXTS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);
const VIDEO_EXTS = new Set([".mp4", ".webm"]);
const MEDIA_EXTS = new Set([...IMAGE_EXTS, ...VIDEO_EXTS]);

type StorageDriver = "local" | "s3";

type S3Config = {
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle: boolean;
};

export type StoredObject = {
  key: string;
  size: number;
  modifiedAt: string;
};

export type StoredObjectBody = {
  body: Buffer;
  contentLength: number;
  contentType: string;
};

let cachedClient: S3Client | null = null;
let cachedConfig: S3Config | null | undefined;

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  return !["0", "false", "no", "off"].includes(value.toLowerCase());
}

function mimeTypeFromKey(key: string): string {
  return MIME_TYPES[path.extname(key).toLowerCase()] ?? "application/octet-stream";
}

function sanitizeStorageKey(key: string): string {
  const normalized = key.replace(/^\/+/, "");
  const segments = normalized.split("/");

  if (!normalized || segments.some((segment) => !segment || segment === "." || segment === "..")) {
    throw new Error("Invalid storage key");
  }

  return normalized;
}

function resolveLocalPath(key: string): string {
  const resolved = path.resolve(LOCAL_UPLOAD_DIR, key);
  if (!resolved.startsWith(LOCAL_UPLOAD_DIR)) {
    throw new Error("Invalid storage key");
  }
  return resolved;
}

function getS3Config(): S3Config | null {
  if (cachedConfig !== undefined) {
    return cachedConfig;
  }

  const endpoint = process.env.S3_ENDPOINT?.trim();
  const bucket = process.env.S3_BUCKET?.trim();
  const accessKeyId = process.env.S3_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY?.trim();
  const region = process.env.S3_REGION?.trim() || "us-east-1";

  const values = [endpoint, bucket, accessKeyId, secretAccessKey];
  const provided = values.filter(Boolean).length;

  if (provided === 0) {
    cachedConfig = null;
    return cachedConfig;
  }

  if (provided !== values.length) {
    throw new Error(
      "Incomplete S3 storage configuration. Set S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY_ID, and S3_SECRET_ACCESS_KEY.",
    );
  }

  cachedConfig = {
    endpoint: endpoint!,
    region,
    bucket: bucket!,
    accessKeyId: accessKeyId!,
    secretAccessKey: secretAccessKey!,
    forcePathStyle: parseBoolean(process.env.S3_FORCE_PATH_STYLE, true),
  };

  return cachedConfig;
}

function getStorageDriver(): StorageDriver {
  return getS3Config() ? "s3" : "local";
}

function getS3Client(): { client: S3Client; config: S3Config } {
  const config = getS3Config();
  if (!config) {
    throw new Error("S3 storage is not configured");
  }

  if (!cachedClient) {
    cachedClient = new S3Client({
      region: config.region,
      endpoint: config.endpoint,
      forcePathStyle: config.forcePathStyle,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }

  return { client: cachedClient, config };
}

function isNotFoundError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const statusCode = (error as Error & { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode;
  return error.name === "NoSuchKey" || error.name === "NotFound" || statusCode === 404;
}

function listLocalObjects(dirPath: string, prefix = ""): StoredObject[] {
  if (!fs.existsSync(dirPath)) {
    return [];
  }

  const results: StoredObject[] = [];

  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;

    const nextPrefix = prefix ? `${prefix}/${entry.name}` : entry.name;
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      results.push(...listLocalObjects(fullPath, nextPrefix));
      continue;
    }

    const stat = fs.statSync(fullPath);
    results.push({
      key: nextPrefix,
      size: stat.size,
      modifiedAt: stat.mtime.toISOString(),
    });
  }

  return results;
}

export function publicPathForStorageKey(key: string): string {
  return `${PUBLIC_UPLOAD_PREFIX}${sanitizeStorageKey(key)}`;
}

export function storageKeyFromPublicPath(filePath: string): string {
  if (!filePath.startsWith(PUBLIC_UPLOAD_PREFIX)) {
    throw new Error("Invalid public upload path");
  }

  return sanitizeStorageKey(filePath.slice(PUBLIC_UPLOAD_PREFIX.length));
}

export function thumbnailStorageKeyFromFilename(filename: string): string {
  const safeName = path.basename(filename);
  const ext = path.extname(safeName).toLowerCase();
  const thumbExt = ext === ".gif" ? ".jpg" : ext;
  const base = path.basename(safeName, ext);
  return `${THUMB_PREFIX}${base}${thumbExt}`;
}

export function thumbnailStorageKeyFromPublicPath(filePath: string): string {
  return thumbnailStorageKeyFromFilename(path.basename(storageKeyFromPublicPath(filePath)));
}

export function isThumbnailStorageKey(key: string): boolean {
  return sanitizeStorageKey(key).startsWith(THUMB_PREFIX);
}

export function isMediaStorageKey(key: string): boolean {
  const safeKey = sanitizeStorageKey(key);
  if (safeKey.startsWith(THUMB_PREFIX)) {
    return false;
  }

  return MEDIA_EXTS.has(path.extname(safeKey).toLowerCase());
}

export function mediaTypeFromStorageKey(key: string): "image" | "video" | null {
  const ext = path.extname(sanitizeStorageKey(key)).toLowerCase();
  if (IMAGE_EXTS.has(ext)) return "image";
  if (VIDEO_EXTS.has(ext)) return "video";
  return null;
}

export function mediaStorageDriver(): StorageDriver {
  return getStorageDriver();
}

export async function writeStoredObject(
  key: string,
  body: Buffer,
  contentType: string,
): Promise<void> {
  const safeKey = sanitizeStorageKey(key);

  if (getStorageDriver() === "local") {
    const targetPath = resolveLocalPath(safeKey);
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.writeFileSync(targetPath, body);
    return;
  }

  const { client, config } = getS3Client();
  await client.send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: safeKey,
      Body: body,
      ContentType: contentType,
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );
}

export async function readStoredObject(key: string): Promise<StoredObjectBody | null> {
  const safeKey = sanitizeStorageKey(key);

  if (getStorageDriver() === "local") {
    const targetPath = resolveLocalPath(safeKey);
    if (!fs.existsSync(targetPath)) {
      return null;
    }

    const stat = fs.statSync(targetPath);
    const body = fs.readFileSync(targetPath);
    return {
      body,
      contentLength: stat.size,
      contentType: mimeTypeFromKey(safeKey),
    };
  }

  const { client, config } = getS3Client();

  try {
    const response = await client.send(
      new GetObjectCommand({
        Bucket: config.bucket,
        Key: safeKey,
      }),
    );

    if (!response.Body) {
      return null;
    }

    const body = Buffer.from(await response.Body.transformToByteArray());
    return {
      body,
      contentLength: Number(response.ContentLength ?? body.length),
      contentType: response.ContentType ?? mimeTypeFromKey(safeKey),
    };
  } catch (error) {
    if (isNotFoundError(error)) {
      return null;
    }
    throw error;
  }
}

export async function deleteStoredObject(key: string): Promise<void> {
  const safeKey = sanitizeStorageKey(key);

  if (getStorageDriver() === "local") {
    const targetPath = resolveLocalPath(safeKey);
    try {
      if (fs.existsSync(targetPath)) {
        fs.unlinkSync(targetPath);
      }
    } catch {
      // ignore
    }
    return;
  }

  const { client, config } = getS3Client();
  await client.send(
    new DeleteObjectCommand({
      Bucket: config.bucket,
      Key: safeKey,
    }),
  );
}

export async function listStoredObjects(): Promise<StoredObject[]> {
  if (getStorageDriver() === "local") {
    return listLocalObjects(LOCAL_UPLOAD_DIR);
  }

  const { client, config } = getS3Client();
  const results: StoredObject[] = [];
  let continuationToken: string | undefined;

  do {
    const response = await client.send(
      new ListObjectsV2Command({
        Bucket: config.bucket,
        ContinuationToken: continuationToken,
      }),
    );

    for (const object of response.Contents ?? []) {
      if (!object.Key) continue;
      results.push({
        key: object.Key,
        size: Number(object.Size ?? 0),
        modifiedAt: (object.LastModified ?? new Date(0)).toISOString(),
      });
    }

    continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined;
  } while (continuationToken);

  return results;
}