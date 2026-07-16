import type { PdfTextEdit } from "@/core/export/export-edited-pdf";

export type StoredPdfEdit = PdfTextEdit & { id: string };
export type StoredPdfEditState = Record<string, StoredPdfEdit>;

const STORAGE_PREFIX = "professional-pdf-editor:session:";

function createFileIdentity(file: File): string {
  return [file.name, file.size, file.lastModified].join(":");
}

function createStorageKey(file: File): string {
  return `${STORAGE_PREFIX}${createFileIdentity(file)}`;
}

function getStorage(): Storage | null {
  if (typeof window === "undefined") return null;

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function savePdfEditSession(file: File, edits: StoredPdfEditState): void {
  const storage = getStorage();
  if (!storage) return;

  const payload = {
    version: 1,
    savedAt: new Date().toISOString(),
    edits,
  };

  storage.setItem(createStorageKey(file), JSON.stringify(payload));
}

export function loadPdfEditSession(file: File): StoredPdfEditState {
  const storage = getStorage();
  if (!storage) return {};

  const rawValue = storage.getItem(createStorageKey(file));
  if (!rawValue) return {};

  try {
    const parsed = JSON.parse(rawValue) as { version?: number; edits?: StoredPdfEditState };
    return parsed.version === 1 && parsed.edits ? parsed.edits : {};
  } catch {
    return {};
  }
}

export function clearPdfEditSession(file: File): void {
  getStorage()?.removeItem(createStorageKey(file));
}
