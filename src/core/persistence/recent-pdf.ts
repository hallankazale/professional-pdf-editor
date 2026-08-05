const DATABASE_NAME = "professional-pdf-editor";
const DATABASE_VERSION = 1;
const STORE_NAME = "documents";
const LAST_DOCUMENT_KEY = "last-opened-pdf";

type StoredPdfDocument = {
  key: string;
  name: string;
  type: string;
  lastModified: number;
  bytes: ArrayBuffer;
  savedAt: number;
};

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: "key" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Falha ao abrir o armazenamento local."));
  });
}

function runTransaction<T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDatabase().then(
    (database) =>
      new Promise<T>((resolve, reject) => {
        const transaction = database.transaction(STORE_NAME, mode);
        const request = action(transaction.objectStore(STORE_NAME));

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error ?? new Error("Falha no armazenamento local."));
        transaction.oncomplete = () => database.close();
        transaction.onerror = () => reject(transaction.error ?? new Error("Transação local interrompida."));
      }),
  );
}

export async function saveRecentPdf(file: File): Promise<void> {
  if (typeof indexedDB === "undefined") return;

  const document: StoredPdfDocument = {
    key: LAST_DOCUMENT_KEY,
    name: file.name,
    type: file.type || "application/pdf",
    lastModified: file.lastModified,
    bytes: await file.arrayBuffer(),
    savedAt: Date.now(),
  };

  await runTransaction("readwrite", (store) => store.put(document));
}

export async function loadRecentPdf(): Promise<File | null> {
  if (typeof indexedDB === "undefined") return null;

  const document = await runTransaction<StoredPdfDocument | undefined>(
    "readonly",
    (store) => store.get(LAST_DOCUMENT_KEY),
  );

  if (!document) return null;

  return new File([document.bytes], document.name, {
    type: document.type,
    lastModified: document.lastModified,
  });
}

export async function clearRecentPdf(): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  await runTransaction("readwrite", (store) => store.delete(LAST_DOCUMENT_KEY));
}
