// Shared client/server rules for document uploads.

export const MAX_DOC_SIZE = 10 * 1024 * 1024; // 10 MB
export const DOC_ACCEPT = ".pdf,.docx,.txt";

export const ALLOWED_EXTENSIONS = ["pdf", "docx", "txt"] as const;

export const EXTENSION_MIME: Record<string, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  txt: "text/plain",
};

const ALLOWED_MIMES = new Set(Object.values(EXTENSION_MIME));

export function extensionOf(name: string): string {
  const i = name.lastIndexOf(".");
  return i === -1 ? "" : name.slice(i + 1).toLowerCase();
}

/**
 * Returns an error message, or null if the file is acceptable.
 * Checks extension, MIME type, and size. Browsers occasionally report a
 * generic or empty MIME, so those pass as long as the extension is valid.
 */
export function validateDocFile(
  name: string,
  mime: string,
  size: number
): string | null {
  const ext = extensionOf(name);
  if (!(ALLOWED_EXTENSIONS as readonly string[]).includes(ext)) {
    return "Only PDF, DOCX, and TXT files are allowed";
  }
  if (mime && mime !== "application/octet-stream" && !ALLOWED_MIMES.has(mime)) {
    return `File type "${mime}" is not allowed — only PDF, DOCX, and TXT`;
  }
  if (size === 0) {
    return "File is empty";
  }
  if (size > MAX_DOC_SIZE) {
    return "File is too large — the limit is 10 MB";
  }
  return null;
}

// The two dedicated form slots (Resume / Cover Letter) accept PDF/DOCX only.
export const SLOT_EXTENSIONS = ["pdf", "docx"] as const;
export const SLOT_ACCEPT = ".pdf,.docx";

/** Like validateDocFile but restricted to PDF/DOCX (for the form slots). */
export function validateSlotFile(
  name: string,
  mime: string,
  size: number
): string | null {
  const ext = extensionOf(name);
  if (!(SLOT_EXTENSIONS as readonly string[]).includes(ext)) {
    return "Only PDF or DOCX files are allowed here";
  }
  return validateDocFile(name, mime, size);
}

/** Only the size limit — used for "Job Description" which accepts any file type. */
export function validateAnyFile(size: number): string | null {
  if (size === 0) return "File is empty";
  if (size > MAX_DOC_SIZE) return "File is too large — the limit is 10 MB";
  return null;
}

/**
 * Kind-aware validation. "Job Description" accepts any file extension/type;
 * every other kind is restricted to PDF / DOCX / TXT.
 */
export function validateUpload(
  name: string,
  mime: string,
  size: number,
  kind: string
): string | null {
  return kind === "Job Description"
    ? validateAnyFile(size)
    : validateDocFile(name, mime, size);
}

/** True if the bytes start with the PDF signature "%PDF-". */
export function looksLikePdf(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 5 &&
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46 &&
    bytes[4] === 0x2d
  );
}

/** True if the bytes start with a ZIP signature (DOCX is a ZIP container). */
export function looksLikeZip(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 4 &&
    bytes[0] === 0x50 &&
    bytes[1] === 0x4b &&
    (bytes[2] === 0x03 || bytes[2] === 0x05 || bytes[2] === 0x07)
  );
}

/**
 * Server-side content check by magic bytes (not just extension).
 * Job Description accepts anything; TXT has no signature so it's skipped.
 * Returns an error message or null.
 */
export function verifyMagicBytes(
  bytes: Uint8Array,
  filename: string,
  kind: string
): string | null {
  if (kind === "Job Description") return null;
  const ext = extensionOf(filename);
  if (ext === "pdf" && !looksLikePdf(bytes)) {
    return "This file isn't a valid PDF — its contents don't match a PDF.";
  }
  if (ext === "docx" && !looksLikeZip(bytes)) {
    return "This file isn't a valid DOCX — its contents don't match a DOCX.";
  }
  return null;
}

/** Human-readable file size, e.g. "842 KB", "3.1 MB". */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** Strip path components and unsafe characters; keep the extension. */
export function sanitizeFilename(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "file";
  const cleaned = base
    .replace(/[^\w.\-]+/g, "_")
    .replace(/_{2,}/g, "_")
    .replace(/^[_.]+/, "")
    .replace(/[_]+$/, "");
  // keep the tail so the extension survives truncation
  return (cleaned || "file").slice(-100);
}
