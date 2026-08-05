"use client";

import { useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";

import styles from "./PdfThumbnailSidebar.module.css";

type PdfThumbnailSidebarProps = {
  document: PDFDocumentProxy;
  activePage: number;
  onSelectPage: (pageNumber: number) => void;
};

type ThumbnailProps = {
  document: PDFDocumentProxy;
  pageNumber: number;
  isActive: boolean;
  onSelect: () => void;
};

function PdfThumbnail({ document, pageNumber, isActive, onSelect }: ThumbnailProps) {
  const hostRef = useRef<HTMLButtonElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const renderTaskRef = useRef<{ cancel: () => void } | null>(null);
  const [shouldRender, setShouldRender] = useState(isActive || pageNumber <= 3);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (shouldRender || !hostRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setShouldRender(true);
          observer.disconnect();
        }
      },
      { rootMargin: "240px" },
    );

    observer.observe(hostRef.current);
    return () => observer.disconnect();
  }, [shouldRender]);

  useEffect(() => {
    if (!shouldRender || !canvasRef.current) return;

    let cancelled = false;

    async function renderThumbnail(): Promise<void> {
      const canvas = canvasRef.current;
      if (!canvas) return;

      try {
        renderTaskRef.current?.cancel();
        const page = await document.getPage(pageNumber);
        const baseViewport = page.getViewport({ scale: 1 });
        const scale = Math.min(1, 132 / Math.max(baseViewport.width, 1));
        const viewport = page.getViewport({ scale });
        const context = canvas.getContext("2d", { alpha: false });
        if (!context || cancelled) return;

        const pixelRatio = Math.min(globalThis.devicePixelRatio || 1, 1.5);
        canvas.width = Math.max(1, Math.floor(viewport.width * pixelRatio));
        canvas.height = Math.max(1, Math.floor(viewport.height * pixelRatio));
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        const renderTask = page.render({
          canvasContext: context,
          viewport,
          transform:
            pixelRatio === 1 ? undefined : [pixelRatio, 0, 0, pixelRatio, 0, 0],
        });

        renderTaskRef.current = renderTask;
        await renderTask.promise;
        if (!cancelled) setIsReady(true);
      } catch (error) {
        if (error instanceof Error && error.name === "RenderingCancelledException") return;
        if (!cancelled) setIsReady(false);
      }
    }

    void renderThumbnail();

    return () => {
      cancelled = true;
      renderTaskRef.current?.cancel();
    };
  }, [document, pageNumber, shouldRender]);

  return (
    <button
      ref={hostRef}
      type="button"
      className={`${styles.item} ${isActive ? styles.itemActive : ""}`}
      aria-current={isActive ? "page" : undefined}
      aria-label={`Ir para a página ${pageNumber}`}
      onClick={onSelect}
    >
      <span className={styles.canvasWrap}>
        {shouldRender ? (
          <>
            <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />
            {!isReady && <span className={styles.placeholder}>Carregando…</span>}
          </>
        ) : (
          <span className={styles.placeholder}>Página {pageNumber}</span>
        )}
      </span>
      <span className={styles.label}>Página {pageNumber}</span>
    </button>
  );
}

export function PdfThumbnailSidebar({
  document,
  activePage,
  onSelectPage,
}: PdfThumbnailSidebarProps) {
  return (
    <aside className={styles.sidebar} aria-label="Miniaturas das páginas">
      <div className={styles.header}>
        <strong>Páginas</strong>
        <span>{document.numPages}</span>
      </div>
      <div className={styles.list}>
        {Array.from({ length: document.numPages }, (_, index) => {
          const pageNumber = index + 1;
          return (
            <PdfThumbnail
              key={pageNumber}
              document={document}
              pageNumber={pageNumber}
              isActive={pageNumber === activePage}
              onSelect={() => onSelectPage(pageNumber)}
            />
          );
        })}
      </div>
    </aside>
  );
}
