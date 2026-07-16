"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy, PDFPageProxy } from "pdfjs-dist";

import { PdfInspectorPanel } from "./PdfInspectorPanel";
import { PdfTextLayer } from "./PdfTextLayer";
import type { InspectedTextItem, PdfPageTextStatus } from "./pdf-inspector.types";

const MIN_SCALE = 0.5;
const MAX_SCALE = 2.5;
const SCALE_STEP = 0.25;

type PreviewState = Record<string, string>;

type PdfViewerProps = {
  file: File;
  onClose: () => void;
};

function clonePreviewState(state: PreviewState): PreviewState {
  return { ...state };
}

export function PdfViewer({ file, onClose }: PdfViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const renderTaskRef = useRef<{ cancel: () => void } | null>(null);
  const [pdfDocument, setPdfDocument] = useState<PDFDocumentProxy | null>(null);
  const [activePage, setActivePage] = useState<PDFPageProxy | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageInput, setPageInput] = useState("1");
  const [scale, setScale] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<InspectedTextItem | null>(null);
  const [pageTextStatus, setPageTextStatus] = useState<PdfPageTextStatus>("loading");
  const [previewEdits, setPreviewEdits] = useState<PreviewState>({});
  const [undoStack, setUndoStack] = useState<PreviewState[]>([]);
  const [redoStack, setRedoStack] = useState<PreviewState[]>([]);

  const handlePageStatusChange = useCallback((status: PdfPageTextStatus) => {
    setPageTextStatus(status);
  }, []);

  const currentPagePrefix = `${pageNumber}:`;
  const currentPageEdits = Object.fromEntries(
    Object.entries(previewEdits)
      .filter(([key]) => key.startsWith(currentPagePrefix))
      .map(([key, value]) => [key.slice(currentPagePrefix.length), value]),
  );
  const selectedEditKey = selectedItem ? `${pageNumber}:${selectedItem.id}` : null;
  const selectedPreviewText = selectedEditKey ? previewEdits[selectedEditKey] ?? null : null;

  useEffect(() => {
    let activeDocument: PDFDocumentProxy | null = null;
    let cancelled = false;

    async function loadDocument() {
      setIsLoading(true);
      setError(null);
      setActivePage(null);
      setSelectedItem(null);
      setPageTextStatus("loading");
      setPreviewEdits({});
      setUndoStack([]);
      setRedoStack([]);

      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/build/pdf.worker.min.mjs",
          import.meta.url,
        ).toString();

        const bytes = new Uint8Array(await file.arrayBuffer());
        const loadedDocument = await pdfjs.getDocument({ data: bytes }).promise;

        if (cancelled) {
          await loadedDocument.destroy();
          return;
        }

        activeDocument = loadedDocument;
        setPdfDocument(loadedDocument);
        setPageNumber(1);
        setPageInput("1");
      } catch {
        setError("Não foi possível abrir este PDF. Ele pode estar protegido ou corrompido.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void loadDocument();

    return () => {
      cancelled = true;
      renderTaskRef.current?.cancel();
      if (activeDocument) void activeDocument.destroy();
    };
  }, [file]);

  useEffect(() => {
    if (!pdfDocument || !canvasRef.current) return;

    let cancelled = false;

    async function renderPage() {
      try {
        setIsLoading(true);
        setError(null);
        setSelectedItem(null);
        setPageTextStatus("loading");
        renderTaskRef.current?.cancel();

        const page = await pdfDocument.getPage(pageNumber);
        const viewport = page.getViewport({ scale });
        const canvas = canvasRef.current;

        if (!canvas || cancelled) return;

        const context = canvas.getContext("2d", { alpha: false });
        if (!context) throw new Error("Canvas indisponível");

        const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.floor(viewport.width * pixelRatio);
        canvas.height = Math.floor(viewport.height * pixelRatio);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        const renderTask = page.render({
          canvasContext: context,
          viewport,
          transform: pixelRatio === 1 ? undefined : [pixelRatio, 0, 0, pixelRatio, 0, 0],
        });

        renderTaskRef.current = renderTask;
        await renderTask.promise;

        if (!cancelled) setActivePage(page);
      } catch (renderError) {
        if (renderError instanceof Error && renderError.name === "RenderingCancelledException") return;
        setError("Ocorreu um erro ao renderizar esta página.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void renderPage();

    return () => {
      cancelled = true;
      renderTaskRef.current?.cancel();
    };
  }, [pdfDocument, pageNumber, scale]);

  const totalPages = pdfDocument?.numPages ?? 0;

  function goToPage(nextPage: number) {
    if (!totalPages) return;
    const normalizedPage = Math.min(totalPages, Math.max(1, nextPage));
    setPageNumber(normalizedPage);
    setPageInput(String(normalizedPage));
  }

  function handlePageSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsedPage = Number.parseInt(pageInput, 10);

    if (Number.isNaN(parsedPage)) {
      setPageInput(String(pageNumber));
      return;
    }

    goToPage(parsedPage);
  }

  function applyPreview(nextText: string) {
    if (!selectedItem || !selectedEditKey) return;

    setUndoStack((current) => [...current, clonePreviewState(previewEdits)]);
    setRedoStack([]);
    setPreviewEdits((current) => {
      const next = { ...current };
      if (nextText === selectedItem.text) delete next[selectedEditKey];
      else next[selectedEditKey] = nextText;
      return next;
    });
  }

  function undo() {
    const previous = undoStack.at(-1);
    if (!previous) return;

    setRedoStack((current) => [...current, clonePreviewState(previewEdits)]);
    setPreviewEdits(previous);
    setUndoStack((current) => current.slice(0, -1));
  }

  function redo() {
    const next = redoStack.at(-1);
    if (!next) return;

    setUndoStack((current) => [...current, clonePreviewState(previewEdits)]);
    setPreviewEdits(next);
    setRedoStack((current) => current.slice(0, -1));
  }

  return (
    <section className="editor-shell" aria-label="Visualizador de PDF">
      <div className="editor-toolbar">
        <button type="button" className="toolbar-button" onClick={onClose}>
          Trocar PDF
        </button>

        <div className="file-summary" title={file.name}>
          <strong>{file.name}</strong>
          <span>{totalPages ? `${totalPages} página${totalPages > 1 ? "s" : ""}` : "Carregando…"}</span>
        </div>

        <div className="toolbar-group" aria-label="Histórico de alterações">
          <button type="button" className="toolbar-button" disabled={!undoStack.length} onClick={undo}>
            Desfazer
          </button>
          <button type="button" className="toolbar-button" disabled={!redoStack.length} onClick={redo}>
            Refazer
          </button>
        </div>

        <div className="toolbar-group" aria-label="Navegação entre páginas">
          <button type="button" className="toolbar-button" disabled={pageNumber <= 1 || isLoading} onClick={() => goToPage(pageNumber - 1)}>
            Anterior
          </button>

          <form className="page-jump-form" onSubmit={handlePageSubmit}>
            <label className="visually-hidden" htmlFor="page-number-input">Ir para página</label>
            <input
              id="page-number-input"
              className="page-number-input"
              inputMode="numeric"
              pattern="[0-9]*"
              value={pageInput}
              onChange={(event) => setPageInput(event.target.value.replace(/\D/g, ""))}
              onBlur={() => setPageInput(String(pageNumber))}
              disabled={!totalPages || isLoading}
            />
            <span className="page-indicator">/ {totalPages || "—"}</span>
          </form>

          <button type="button" className="toolbar-button" disabled={!totalPages || pageNumber >= totalPages || isLoading} onClick={() => goToPage(pageNumber + 1)}>
            Próxima
          </button>
        </div>

        <div className="toolbar-group" aria-label="Controle de zoom">
          <button type="button" className="toolbar-button square-button" disabled={scale <= MIN_SCALE || isLoading} onClick={() => setScale((current) => Math.max(MIN_SCALE, current - SCALE_STEP))} aria-label="Diminuir zoom">−</button>
          <span className="zoom-indicator">{Math.round(scale * 100)}%</span>
          <button type="button" className="toolbar-button square-button" disabled={scale >= MAX_SCALE || isLoading} onClick={() => setScale((current) => Math.min(MAX_SCALE, current + SCALE_STEP))} aria-label="Aumentar zoom">+</button>
        </div>

        <button type="button" className="primary-action" disabled={!selectedItem} onClick={() => globalThis.document.getElementById("preview-text")?.focus()}>
          Editar seleção
        </button>
      </div>

      {error && <p className="viewer-error" role="alert">{error}</p>}

      <div className="editor-content">
        <div className="document-stage">
          {isLoading && <div className="loading-overlay" role="status">Processando página…</div>}
          <div className="pdf-page-stack">
            <canvas ref={canvasRef} className="pdf-canvas" aria-label={`Página ${pageNumber} do PDF`} />
            <PdfTextLayer
              page={activePage}
              scale={scale}
              selectedItemId={selectedItem?.id ?? null}
              previewEdits={currentPageEdits}
              onSelectItem={setSelectedItem}
              onPageStatusChange={handlePageStatusChange}
            />
          </div>
        </div>

        <PdfInspectorPanel
          selectedItem={selectedItem}
          pageStatus={pageTextStatus}
          previewText={selectedPreviewText}
          onApplyPreview={applyPreview}
          onClearSelection={() => setSelectedItem(null)}
        />
      </div>
    </section>
  );
}
