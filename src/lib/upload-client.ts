import type { DocumentDTO } from "./types";

/**
 * Upload a single document to an application with progress reporting.
 * Uses XHR (not fetch) because fetch has no upload-progress events.
 */
export function uploadDocument(
  applicationId: string,
  file: File,
  kind: string,
  onProgress?: (pct: number) => void
): Promise<DocumentDTO> {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append("file", file);
    form.append("kind", kind);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", `/api/applications/${applicationId}/documents`);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText));
      } else {
        let message = `Upload failed (${xhr.status})`;
        try {
          message = JSON.parse(xhr.responseText).error ?? message;
        } catch {
          // non-JSON error body
        }
        reject(new Error(message));
      }
    };
    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.send(form);
  });
}
