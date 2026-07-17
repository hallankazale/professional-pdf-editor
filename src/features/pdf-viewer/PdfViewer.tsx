"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy, PDFPageProxy } from "pdfjs-dist";

import { exportEditedPdf, type PdfTextEdit } from "@/core/export/export-edited-pdf";
import {
  loadPdfEditSession,
  savePdfEditSession,
  type StoredPdfEditState,
} from "@/core/session/pdf-edit-session";
import { PdfInspectorPanel } from "./PdfInspectorPanel";
import { PdfTextLayer } from "./PdfTextLayer";
import type { InspectedTextItem, PdfPageTextStatus } from "./pdf-inspector.types";

const MIN_SCALE = 0.5;
const MAX_SCALE = 2.5;
const SCALE_STEP = 0.25;

type PreviewEdit = PdfTextEdit & { id: string };
type PreviewState = Record<string, PreviewEdit>;
type SearchResult = { pageNumber: number; occurrences: number };

type PdfViewerProps = {
  file: File;
  onClose: () => void;
};

function clonePreviewState(state: PreviewState): PreviewState {
  return Object.fromEntries(
    Object.entries(state).map(([key, value]) => [
      key,
      { ...value, original: { ...value.original } },
    ]),
  );
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
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<InspectedTextItem | null>(null);
  const [pageTextStatus, setPageTextStatus] = useState<PdfPageTextStatus>("loading");
  const [previewEdits, setPreviewEdits] = useState<PreviewState>({});
  const [undoStack, setUndoStack] = useState<PreviewState[]>([]);
  const [redoStack, setRedoStack] = useState<PreviewState[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchCompleted, setSearchCompleted] = useState(false);

  const totalPages = pdfDocument?.numPages ?? 0;
  const editCount = Object.keys(previewEdits).length;
  const totalOccurrences = searchResults.reduce((total, result) => total + result.occurrences, 0);
  const currentPagePrefix = `${pageNumber}:`;
  const currentPageEdits = Object.fromEntries(
    Object.entries(previewEdits)
      .filter(([key]) => key.startsWith(currentPagePrefix))
      .map(([key, value]) => [key.slice(currentPagePrefix.length), value.text]),
  );
  const selectedEditKey = selectedItem ? `${pageNumber}:${selectedItem.id}` : null;
  const selectedPreviewText = selectedEditKey
    ? previewEdits[selectedEditKey]?.text ?? null
    : null;

  const handlePageStatusChange = useCallback((status: PdfPageTextStatus) => {
    setPageTextStatus(status);
  }, []);

  useEffect(() => {
    const restoredEdits = loadPdfEditSession(file) as PreviewState;
    setPreviewEdits(restoredEdits);
    setStatusMessage(
      Object.keys(restoredEdits).length ? "Edições salvas restauradas." : null,
    );
  }, [file]);

  useEffect(() => {
    let openedDocument: PDFDocumentProxy | null = null;
    let cancelled = false;

    async function loadDocument(): Promise<void> {
      setIsLoading(true);
      setError(null);
      setActivePage(null);
      setSelectedItem(null);
      setPageTextStatus("loading");
      setUndoStack([]);
      setRedoStack([]);
      setSearchResults([]);
      setSearchCompleted(false);

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

        openedDocument = loadedDocument;
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
      if (openedDocument) void openedDocument.destroy();
    };
  }, [file]);

  useEffect(() => {
    const documentToRender = pdfDocument;
    const canvasToRender = canvasRef.current;
    if (!documentToRender || !canvasToRender) return;

    let cancelled = false;

    async function renderPage(
      safeDocument: PDFDocumentProxy,
      safeCanvas: HTMLCanvasElement,
    ): Promise<void> {
      try {
        setIsLoading(true);
        setError(null);
        setSelectedItem(null);
        setPageTextStatus("loading");
        renderTaskRef.current?.cancel();

        const page = await safeDocument.getPage(pageNumber);
        const viewport = page.getViewport({ scale });
        if (cancelled) return;

        const context = safeCanvas.getContext("2d", { alpha: false });
        if (!context) throw new Error("Canvas indisponível");

        const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
        safeCanvas.width = Math.floor(viewport.width * pixelRatio);
        safeCanvas.height = Math.floor(viewport.height * pixelRatio);
        safeCanvas.style.width = `${Math.floor(viewport.width)}px`;
        safeCanvas.style.height = `${Math.floor(viewport.height)}px`;

        const renderTask = page.render({
          canvasContext: context,
          viewport,
          transform:
            pixelRatio === 1
              ? undefined
              : [pixelRatio, 0, 0, pixelRatio, 0, 0],
        });

        renderTaskRef.current = renderTask;
        await renderTask.promise;
        if (!cancelled) setActivePage(page);
      } catch (renderError) {
        if (
          renderError instanceof Error &&
          renderError.name === "RenderingCancelledException"
        ) {
          return;
        }
        setError("Ocorreu um erro ao renderizar esta página.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void renderPage(documentToRender, canvasToRender);

    return () => {
      cancelled = true;
      renderTaskRef.current?.cancel();
    };
  }, [pdfDocument, pageNumber, scale]);

  function goToPage(nextPage: number): void {
    if (!totalPages) return;
    const normalizedPage = Math.min(totalPages, Math.max(1, nextPage));
    setPageNumber(normalizedPage);
    setPageInput(String(normalizedPage));
  }

  function handlePageSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const parsedPage = Number.parseInt(pageInput, 10);
    if (Number.isNaN(parsedPage)) {
      setPageInput(String(pageNumber));
      return;
    }
    goToPage(parsedPage);
  }

  async function handleSearch(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const documentToSearch = pdfDocument;
    const normalizedQuery = searchQuery.trim().toLocaleLowerCase("pt-BR");
    if (!documentToSearch || !normalizedQuery || isSearching) return;

    setIsSearching(true);
    setSearchCompleted(false);
    setSearchResults([]);
    setError(null);

    try {
      const results: SearchResult[] = [];
      for (let pageIndex = 1; pageIndex <= documentToSearch.numPages; pageIndex += 1) {
        const page = await documentToSearch.getPage(pageIndex);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item) => ("str" in item ? item.str : ""))
          .join(" ")
          .toLocaleLowerCase("pt-BR");
        let occurrences = 0;
        let position = 0;
        while ((position = pageText.indexOf(normalizedQuery, position)) !== -1) {
          occurrences += 1;
          position += Math.max(normalizedQuery.length, 1);
        }
        if (occurrences) results.push({ pageNumber: pageIndex, occurrences });
      }
      setSearchResults(results);
      setSearchCompleted(true);
    } catch {
      setError("Não foi possível pesquisar neste PDF.");
    } finally {
      setIsSearching(false);
    }
  }

  function closeSearch(): void {
    setShowSearch(false);
    setSearchResults([]);
    setSearchCompleted(false);
  }

  function applyPreview(nextText: string): void {
    if (!selectedItem || !selectedEditKey) return;

    setStatusMessage(null);
    setUndoStack((current) => [...current, clonePreviewState(previewEdits)]);
    setRedoStack([]);
    setPreviewEdits((current) => {
      const next = { ...current };
      if (nextText === selectedItem.text) {
        delete next[selectedEditKey];
      } else {
        next[selectedEditKey] = {
          id: selectedEditKey,
          pageNumber,
          text: nextText,
          original: { ...selectedItem },
          scale,
        };
      }
      return next;
    });
  }

  function undo(): void {
    const previous = undoStack.at(-1);
    if (!previous) return;
    setRedoStack((current) => [...current, clonePreviewState(previewEdits)]);
    setPreviewEdits(previous);
    setUndoStack((current) => current.slice(0, -1));
    setStatusMessage(null);
  }

  function redo(): void {
    const next = redoStack.at(-1);
    if (!next) return;
    setUndoStack((current) => [...current, clonePreviewState(previewEdits)]);
    setPreviewEdits(next);
    setRedoStack((current) => current.slice(0, -1));
    setStatusMessage(null);
  }

  function handleSaveSession(): void {
    savePdfEditSession(file, previewEdits as StoredPdfEditState);
    setStatusMessage(
      editCount
        ? `${editCount} edição(ões) salvas no aparelho.`
        : "Sessão salva sem alterações.",
    );
  }

  async function handleExportEdits(): Promise<void> {
    if (isExporting) return;
    setIsExporting(true);
    setError(null);
    setStatusMessage(null);

    try {
      await exportEditedPdf(file, Object.values(previewEdits));
      setStatusMessage("PDF exportado para a pasta de downloads.");
    } catch {
      setError("Não foi possível exportar este PDF.");
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <section className="editor-shell" aria-label="Editor de PDF">
      <div className="editor-toolbar">
        <div className="file-summary" title={file.name}>
          <strong>{file.name}</strong>
          <span>
            {totalPages
              ? `${totalPages} página${totalPages > 1 ? "s" : ""}`
              : "Carregando…"}
          </span>
        </div>

        <div className="mobile-primary-actions">
          <button type="button" className="toolbar-button" onClick={handleSaveSession}>
            Salvar{editCount ? ` (${editCount})` : ""}
          </button>
          <button
            type="button"
            className="primary-action"
            disabled={isExporting}
            onClick={() => void handleExportEdits()}
          >
            {isExporting ? "Exportando…" : "Exportar"}
          </button>
        </div>

        <div className="toolbar-group" aria-label="Histórico">
          <button type="button" className="toolbar-button" disabled={!undoStack.length} onClick={undo}>Desfazer</button>
          <button type="button" className="toolbar-button" disabled={!redoStack.length} onClick={redo}>Refazer</button>
        </div>

        <div className="toolbar-group" aria-label="Páginas">
          <button type="button" className="toolbar-button square-button" disabled={pageNumber <= 1 || isLoading} onClick={() => goToPage(pageNumber - 1)} aria-label="Página anterior">‹</button>
          <form className="page-jump-form" onSubmit={handlePageSubmit}>
            <input className="page-number-input" inputMode="numeric" pattern="[0-9]*" value={pageInput} onChange={(event) => setPageInput(event.target.value.replace(/\D/g, ""))} onBlur={() => setPageInput(String(pageNumber))} disabled={!totalPages || isLoading} aria-label="Página atual" />
            <span className="page-indicator">/ {totalPages || "—"}</span>
          </form>
          <button type="button" className="toolbar-button square-button" disabled={!totalPages || pageNumber >= totalPages || isLoading} onClick={() => goToPage(pageNumber + 1)} aria-label="Próxima página">›</button>
        </div>

        <div className="toolbar-group" aria-label="Zoom">
          <button type="button" className="toolbar-button square-button" disabled={scale <= MIN_SCALE || isLoading} onClick={() => setScale((current) => Math.max(MIN_SCALE, current - SCALE_STEP))} aria-label="Diminuir zoom">−</button>
          <span className="zoom-indicator">{Math.round(scale * 100)}%</span>
          <button type="button" className="toolbar-button square-button" disabled={scale >= MAX_SCALE || isLoading} onClick={() => setScale((current) => Math.min(MAX_SCALE, current + SCALE_STEP))} aria-label="Aumentar zoom">+</button>
        </div>

        <button type="button" className="toolbar-button" disabled={!pdfDocument} onClick={() => setShowSearch(true)}>Buscar</button>
        <button type="button" className="toolbar-button" onClick={onClose}>Trocar PDF</button>
        <button type="button" className="primary-action edit-selection-button" disabled={!selectedItem} onClick={() => globalThis.document.getElementById("preview-text")?.focus()}>Editar seleção</button>
      </div>

      {error && <p className="viewer-error" role="alert">{error}</p>}
      {statusMessage && <p className="viewer-status" role="status">{statusMessage}</p>}

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

        {showSearch && (
          <aside className="pdf-search-panel" aria-label="Pesquisar no PDF">
            <div className="pdf-search-header">
              <div><span>Pesquisa</span><strong>Buscar no PDF</strong></div>
              <button type="button" onClick={closeSearch} aria-label="Fechar pesquisa">×</button>
            </div>
            <form className="pdf-search-form" onSubmit={(event) => void handleSearch(event)}>
              <input
                value={searchQuery}
                onChange={(event) => {
                  setSearchQuery(event.target.value);
                  setSearchCompleted(false);
                }}
                placeholder="Digite uma palavra..."
                autoFocus
                aria-label="Palavra para pesquisar"
              />
              <button type="submit" disabled={!searchQuery.trim() || isSearching || !pdfDocument}>
                {isSearching ? "Buscando…" : "Buscar"}
              </button>
            </form>
            {isSearching && <p className="pdf-search-message">Analisando as páginas…</p>}
            {searchCompleted && (
              <p className="pdf-search-summary">
                {totalOccurrences
                  ? `${totalOccurrences} ocorrência${totalOccurrences > 1 ? "s" : ""} em ${searchResults.length} página${searchResults.length > 1 ? "s" : ""}.`
                  : "Nenhuma ocorrência encontrada."}
              </p>
            )}
            <div className="pdf-search-results">
              {searchResults.map((result) => (
                <button
                  key={result.pageNumber}
                  type="button"
                  className={result.pageNumber === pageNumber ? "is-current" : ""}
                  onClick={() => goToPage(result.pageNumber)}
                >
                  <span>Página {result.pageNumber}</span>
                  <small>{result.occurrences} encontrada{result.occurrences > 1 ? "s" : ""}</small>
                </button>
              ))}
            </div>
            <p className="pdf-search-note">A pesquisa funciona em PDFs com texto. Documentos escaneados podem precisar de OCR.</p>
          </aside>
        )}

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
