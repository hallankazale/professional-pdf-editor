"use client";

import type { PDFPageProxy } from "pdfjs-dist";
import { useEffect, useState } from "react";

import type { InspectedTextItem, PdfPageTextStatus } from "./pdf-inspector.types";

type TextSpan = InspectedTextItem;

type PdfTextLayerProps = {
  page: PDFPageProxy | null;
  scale: number;
  selectedItemId: string | null;
  onSelectItem: (item: InspectedTextItem) => void;
  onPageStatusChange: (status: PdfPageTextStatus) => void;
};

/**
 * Cria uma camada textual sobre o canvas sem modificar o PDF.
 * Além da seleção/cópia, expõe os metadados necessários ao modo de inspeção.
 */
export function PdfTextLayer({
  page,
  scale,
  selectedItemId,
  onSelectItem,
  onPageStatusChange,
}: PdfTextLayerProps) {
  const [items, setItems] = useState<TextSpan[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function buildTextLayer() {
      if (!page) {
        setItems([]);
        onPageStatusChange("loading");
        return;
      }

      onPageStatusChange("loading");

      const viewport = page.getViewport({ scale });
      const textContent = await page.getTextContent();
      const styles = textContent.styles;

      const nextItems = textContent.items.flatMap((item, index) => {
        if (!("str" in item) || !item.str.trim()) return [];

        const [a, b, , d, e, f] = item.transform;
        const x = viewport.transform[0] * e + viewport.transform[2] * f + viewport.transform[4];
        const y = viewport.transform[1] * e + viewport.transform[3] * f + viewport.transform[5];
        const fontSize = Math.max(1, Math.hypot(b, d) * scale);
        const angle = Math.atan2(b, a) * (180 / Math.PI);
        const fontFamily = styles[item.fontName]?.fontFamily || "sans-serif";
        const width = Math.max(fontSize, (item.width || item.str.length * fontSize * 0.5) * scale);
        const height = Math.max(fontSize, (item.height || fontSize / scale) * scale);

        return [
          {
            id: `${index}-${e}-${f}`,
            text: item.str,
            left: x,
            top: y - fontSize,
            fontSize,
            angle,
            fontFamily,
            width,
            height,
          },
        ];
      });

      if (!cancelled) {
        setItems(nextItems);
        onPageStatusChange(nextItems.length > 0 ? "digital" : "scanned");
      }
    }

    void buildTextLayer().catch(() => {
      if (!cancelled) {
        setItems([]);
        onPageStatusChange("scanned");
      }
    });

    return () => {
      cancelled = true;
    };
  }, [onPageStatusChange, page, scale]);

  return (
    <div className="pdf-text-layer" aria-label="Camada de texto selecionável">
      {items.map((item) => (
        <button
          type="button"
          key={item.id}
          className={`pdf-text-item${selectedItemId === item.id ? " is-selected" : ""}`}
          style={{
            left: item.left,
            top: item.top,
            width: item.width,
            minHeight: item.height,
            fontSize: item.fontSize,
            fontFamily: item.fontFamily,
            transform: `rotate(${item.angle}deg)`,
          }}
          onClick={() => onSelectItem(item)}
          title={`Inspecionar: ${item.text}`}
        >
          {item.text}
        </button>
      ))}
    </div>
  );
}
