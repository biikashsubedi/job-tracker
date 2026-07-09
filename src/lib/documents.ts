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
