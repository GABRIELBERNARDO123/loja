import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { get as getBlob, put, del } from "@vercel/blob";
import { getEnv } from "@/lib/env";
import { randomToken } from "@/lib/security/crypto";

export const ALLOWED_EXTENSIONS = ["xlsx", "xls", "csv", "docx", "doc", "pdf", "txt", "zip"] as const;
export type AllowedExtension = (typeof ALLOWED_EXTENSIONS)[number];

export const MAX_UPLOAD_BYTES = 30 * 1024 * 1024;

export class StorageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StorageError";
  }
}

type SignatureCheck = {
  extension: AllowedExtension;
  label: string;
  mimeTypes: string[];
  validate(buffer: Buffer): boolean;
};

const ZIP_MAGIC = Buffer.from([0x50, 0x4b, 0x03, 0x04]);
const OLE_MAGIC = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);

const SIGNATURES: Record<AllowedExtension, SignatureCheck> = {
  pdf: {
    extension: "pdf",
    label: "PDF",
    mimeTypes: ["application/pdf"],
    validate: (buffer) => buffer.subarray(0, 5).toString("latin1") === "%PDF-",
  },
  zip: {
    extension: "zip",
    label: "ZIP",
    mimeTypes: ["application/zip", "application/x-zip-compressed"],
    validate: (buffer) => buffer.subarray(0, 4).equals(ZIP_MAGIC),
  },
  docx: {
    extension: "docx",
    label: "DOCX",
    mimeTypes: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
    validate: (buffer) => buffer.subarray(0, 4).equals(ZIP_MAGIC),
  },
  xlsx: {
    extension: "xlsx",
    label: "XLSX",
    mimeTypes: ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
    validate: (buffer) => buffer.subarray(0, 4).equals(ZIP_MAGIC),
  },
  doc: {
    extension: "doc",
    label: "DOC",
    mimeTypes: ["application/msword"],
    validate: (buffer) => buffer.subarray(0, 8).equals(OLE_MAGIC),
  },
  xls: {
    extension: "xls",
    label: "XLS",
    mimeTypes: ["application/vnd.ms-excel"],
    validate: (buffer) => buffer.subarray(0, 8).equals(OLE_MAGIC),
  },
  csv: {
    extension: "csv",
    label: "CSV",
    mimeTypes: ["text/csv", "text/plain", "application/csv"],
    validate: (buffer) => !buffer.includes(0) && buffer.length > 0,
  },
  txt: {
    extension: "txt",
    label: "TXT",
    mimeTypes: ["text/plain"],
    validate: (buffer) => !buffer.includes(0) && buffer.length > 0,
  },
};

export function extensionOf(filename: string): AllowedExtension | null {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  return (ALLOWED_EXTENSIONS as readonly string[]).includes(ext) ? (ext as AllowedExtension) : null;
}

export function normalizeFilename(filename: string): string {
  const base = path.basename(filename).replace(/[\u0000-\u001f\u007f]/g, "");
  const cleaned = base.replace(/[^\p{L}\p{N}._ ()\-]/gu, "_").replace(/\s+/g, " ").trim();
  return (cleaned || "arquivo").slice(0, 180);
}

export function safeContentDisposition(filename: string): string {
  const normalized = normalizeFilename(filename);
  const ascii = normalized.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(normalized)}`;
}

export async function validateUploadedFile(file: File): Promise<{
  buffer: Buffer;
  extension: AllowedExtension;
  originalName: string;
  mimeType: string;
  sha256: string;
}> {
  if (!file || file.size === 0) throw new StorageError("Arquivo vazio.");
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new StorageError("O arquivo deve ter no máximo 30 MB.");
  }

  const originalName = normalizeFilename(file.name);
  const ext = extensionOf(originalName);
  if (!ext) {
    throw new StorageError("Formato não permitido. Use PDF, XLSX, XLS, CSV, DOCX, DOC, TXT ou ZIP.");
  }

  const signature = SIGNATURES[ext];
  const buffer = Buffer.from(await file.arrayBuffer());
  if (!signature.validate(buffer)) {
    throw new StorageError(`O conteúdo do arquivo não corresponde ao formato ${signature.label}.`);
  }

  const declaredMime = (file.type || "").toLowerCase();
  const mimeType =
    signature.mimeTypes.find((mime) => mime === declaredMime) ??
    signature.mimeTypes[0] ??
    "application/octet-stream";

  return {
    buffer,
    extension: ext,
    originalName,
    mimeType,
    sha256: createHash("sha256").update(buffer).digest("hex"),
  };
}

function localRoot(): string {
  return path.resolve(process.cwd(), getEnv().LOCAL_STORAGE_DIR);
}

function localPathFor(pathname: string): string {
  const root = localRoot();
  const resolved = path.resolve(root, pathname);
  if (!resolved.startsWith(`${root}${path.sep}`)) {
    throw new StorageError("Caminho de armazenamento inválido.");
  }
  return resolved;
}

export function buildStoragePathname(productId: string, extension: string): string {
  const date = new Date().toISOString().slice(0, 10);
  return `products/${productId}/${date}-${randomToken(18)}.${extension}`;
}

export async function savePrivateFile(params: {
  productId: string;
  extension: string;
  buffer: Buffer;
  contentType: string;
}): Promise<string> {
  const pathname = buildStoragePathname(params.productId, params.extension);
  const env = getEnv();

  if (env.STORAGE_DRIVER === "vercel-blob") {
    if (!env.BLOB_READ_WRITE_TOKEN) {
      throw new StorageError("Armazenamento Vercel Blob não configurado (BLOB_READ_WRITE_TOKEN).");
    }
    await put(pathname, params.buffer, {
      access: "private",
      token: env.BLOB_READ_WRITE_TOKEN,
      contentType: params.contentType,
      addRandomSuffix: false,
      allowOverwrite: false,
    });
    return pathname;
  }

  const target = localPathFor(pathname);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, params.buffer, { mode: 0o600 });
  return pathname;
}

export type StoredFileStream = {
  body: ReadableStream<Uint8Array>;
  size: number | null;
  contentType: string;
};

export async function openPrivateFile(
  pathname: string,
  fallbackContentType = "application/octet-stream",
): Promise<StoredFileStream | null> {
  const env = getEnv();

  if (env.STORAGE_DRIVER === "vercel-blob") {
    if (!env.BLOB_READ_WRITE_TOKEN) throw new StorageError("Armazenamento não configurado.");
    const result = await getBlob(pathname, {
      access: "private",
      token: env.BLOB_READ_WRITE_TOKEN,
      useCache: false,
    });
    if (!result || !result.stream) return null;
    const contentType = result.headers.get("content-type") ?? fallbackContentType;
    return {
      body: result.stream,
      size: result.blob.size ?? null,
      contentType,
    };
  }

  const target = localPathFor(pathname);
  try {
    const info = await stat(target);
    const nodeStream = createReadStream(target);
    return {
      body: Readable.toWeb(nodeStream) as ReadableStream<Uint8Array>,
      size: info.size,
      contentType: fallbackContentType,
    };
  } catch {
    return null;
  }
}

const IMAGE_SIGNATURES: Array<{ ext: string; mime: string; validate: (b: Buffer) => boolean }> = [
  {
    ext: "png",
    mime: "image/png",
    validate: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  },
  {
    ext: "jpg",
    mime: "image/jpeg",
    validate: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  },
  {
    ext: "webp",
    mime: "image/webp",
    validate: (b) => b.subarray(0, 4).toString("latin1") === "RIFF" && b.subarray(8, 12).toString("latin1") === "WEBP",
  },
];

export async function savePublicImage(file: File): Promise<string> {
  if (!file || file.size === 0) throw new StorageError("Imagem vazia.");
  if (file.size > 4 * 1024 * 1024) throw new StorageError("A imagem deve ter no máximo 4 MB.");
  const buffer = Buffer.from(await file.arrayBuffer());
  const detected = IMAGE_SIGNATURES.find((signature) => signature.validate(buffer));
  if (!detected) throw new StorageError("Envie uma imagem PNG, JPG ou WEBP válida.");

  const env = getEnv();
  const filename = `store-images/${new Date().toISOString().slice(0, 10)}-${randomToken(12)}.${detected.ext}`;

  if (env.STORAGE_DRIVER === "vercel-blob") {
    if (!env.BLOB_READ_WRITE_TOKEN) throw new StorageError("Vercel Blob não configurado.");
    const blob = await put(filename, buffer, {
      access: "public",
      token: env.BLOB_READ_WRITE_TOKEN,
      contentType: detected.mime,
      addRandomSuffix: false,
      allowOverwrite: false,
    });
    return blob.url;
  }

  const target = path.join(process.cwd(), "public", "uploads", `${randomToken(12)}.${detected.ext}`);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, buffer, { mode: 0o644 });
  return `/uploads/${path.basename(target)}`;
}

export async function deletePrivateFile(pathname: string): Promise<void> {
  const env = getEnv();
  if (env.STORAGE_DRIVER === "vercel-blob") {
    if (!env.BLOB_READ_WRITE_TOKEN) return;
    await del(pathname, { token: env.BLOB_READ_WRITE_TOKEN }).catch(() => undefined);
    return;
  }
  await rm(localPathFor(pathname), { force: true }).catch(() => undefined);
}

export async function readLocalDevFile(pathname: string): Promise<Buffer | null> {
  if (getEnv().STORAGE_DRIVER !== "local") return null;
  try {
    return await readFile(localPathFor(pathname));
  } catch {
    return null;
  }
}
