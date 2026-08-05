import type { PdfTextEdit } from "@/core/export/export-edited-pdf";

export type StoredPdfEdit = PdfTextEdit & { id: string };
export type StoredPdfEditState = Record<string, StoredPdfEdit>;

const STORAGE_PREFIX = "professional-pdf-editor:session:";
const SESSION_VERSION = 1;
const MAX_STORED_SESSIONS = 12;

type StoredSessionPayload = {
  version: number;
  savedAt: string;
  edits: StoredPdfEditState;
};

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

function removeOldSessions(storage: Storage): void {
  const sessions: Array<{ key: string; savedAt: number }> = [];

  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (!key?.startsWith(STORAGE_PREFIX)) continue;

    try {
      const payload = JSON.parse(storage.getItem(key) ?? "") as Partial<StoredSessionPayload>;
      sessions.push({
        key,
        savedAt: payload.savedAt ? Date.parse(payload.savedAt) : 0,
      });
    } catch {
      storage.removeItem(key);
    }
  }

  sessions
    .sort((left, right) => right.savedAt - left.savedAt)
    .slice(MAX_STORED_SESSIONS)
    .forEach(({ key }) => storage.removeItem(key));
}

/**
 * Salva somente o estado leve das edições. O arquivo PDF permanece no aparelho
 * e nunca é serializado no localStorage.
 */
export function savePdfEditSession(file: File, edits: StoredPdfEditState): boolean {
  const storage = getStorage();
  if (!storage) return false;

  const payload: StoredSessionPayload = {
    version: SESSION_VERSION,
    savedAt: new Date().toISOString(),
    edits,
  };

  try {
    storage.setItem(createStorageKey(file), JSON.stringify(payload));
    removeOldSessions(storage);
    return true;
  } catch {
    // Navegadores móveis podem bloquear ou esgotar a cota de armazenamento.
    return false;
  }
}

export function loadPdfEditSession(file: File): StoredPdfEditState {
  const storage = getStorage();
  if (!storage) return {};

  try {
    const rawValue = storage.getItem(createStorageKey(file));
    if (!rawValue) return {};

    const parsed = JSON.parse(rawValue) as Partial<StoredSessionPayload>;
    return parsed.version === SESSION_VERSION && parsed.edits ? parsed.edits : {};
  } catch {
    return {};
  }
}

export function clearPdfEditSession(file: File): boolean {
  const storage = getStorage();
  if (!storage) return false;

  try {
    storage.removeItem(createStorageKey(file));
    return true;
  } catch {
    return false;
  }
}
