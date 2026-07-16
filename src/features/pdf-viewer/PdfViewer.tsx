"use client";

import { useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";

const MIN_SCALE = 0.5;
const MAX_SCALE = 2.5;
const SCALE_STEP = 0.25;

type PdfViewerProps = {
  file: File;
  onClose: () => void;
};

export function PdfViewer({ file, onClose }: PdfViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const renderTaskRef = useRef<{ cancel: () => void } | null>(null);
  const [document, setDocument] = useState<PDFDocumentProxy | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let activeDocument: PDFDocumentProxy | null = null;
    let cancelled = false;

    async function loadDocument() {
      setIsLoading(true);
      setError(null);

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
        setDocument(loadedDocument);
        setPageNumber(1);
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
    if (!document || !canvasRef.current) return;

    let cancelled = false;

    async function renderPage() {
      try {
        setIsLoading(true);
        renderTaskRef.current?.cancel();

        const page = await document.getPage(pageNumber);
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
  }, [document, pageNumber, scale]);

  const totalPages = document?.numPages ?? 0;

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

        <div className="toolbar-group" aria-label="Navegação entre páginas">
          <button
            type="button"
            className="toolbar-button"
            disabled={pageNumber <= 1 || isLoading}
            onClick={() => setPageNumber((current) => Math.max(1, current - 1))}
          >
            Anterior
          </button>
          <span className="page-indicator">{pageNumber} / {totalPages || "—"}</span>
          <button
            type="button"
            className="toolbar-button"
            disabled={!totalPages || pageNumber >= totalPages || isLoading}
            onClick={() => setPageNumber((current) => Math.min(totalPages, current + 1))}
          >
            Próxima
          </button>
        </div>

        <div className="toolbar-group" aria-label="Controle de zoom">
          <button
            type="button"
            className="toolbar-button square-button"
            disabled={scale <= MIN_SCALE || isLoading}
            onClick={() => setScale((current) => Math.max(MIN_SCALE, current - SCALE_STEP))}
            aria-label="Diminuir zoom"
          >
            −
          </button>
          <span className="zoom-indicator">{Math.round(scale * 100)}%</span>
          <button
            type="button"
            className="toolbar-button square-button"
            disabled={scale >= MAX_SCALE || isLoading}
            onClick={() => setScale((current) => Math.min(MAX_SCALE, current + SCALE_STEP))}
            aria-label="Aumentar zoom"
          >
            +
          </button>
        </div>

        <button type="button" className="primary-action" disabled>
          Editar
        </button>
      </div>

      {error && <p className="viewer-error" role="alert">{error}</p>}

      <div className="document-stage">
        {isLoading && <div className="loading-overlay" role="status">Processando página…</div>}
        <canvas ref={canvasRef} className="pdf-canvas" aria-label={`Página ${pageNumber} do PDF`} />
      </div>
    </section>
  );
}
