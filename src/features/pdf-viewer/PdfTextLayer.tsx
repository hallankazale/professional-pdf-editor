"use client";

import type { PDFPageProxy } from "pdfjs-dist";
import { useEffect, useState } from "react";

import type { InspectedTextItem, PdfPageTextStatus } from "./pdf-inspector.types";

type TextSpan = InspectedTextItem;

type PdfTextLayerProps = {
  page: PDFPageProxy | null;
  scale: number;
  selectedItemId: string | null;
  previewEdits: Record<string, string>;
  onSelectItem: (item: InspectedTextItem) => void;
  onPageStatusChange: (status: PdfPageTextStatus) => void;
};

function detectFontWeight(fontName: string, fontFamily: string): "normal" | "bold" {
  const descriptor = `${fontName} ${fontFamily}`.toLowerCase();
  return /bold|black|heavy|semibold|demi|700|800|900/.test(descriptor) ? "bold" : "normal";
}

function detectFontStyle(fontName: string, fontFamily: string): "normal" | "italic" {
  const descriptor = `${fontName} ${fontFamily}`.toLowerCase();
  return /italic|oblique|slanted/.test(descriptor) ? "italic" : "normal";
}

/**
 * Cria uma camada textual sobre o canvas sem modificar o PDF.
 * As alterações são renderizadas apenas como prévia visual e ficam separadas
 * do motor que futuramente fará a reescrita nativa do documento.
 */
export function PdfTextLayer({
  page,
  scale,
  selectedItemId,
  previewEdits,
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
        const fontName = item.fontName || "";
        const fontFamily = styles[fontName]?.fontFamily || "sans-serif";
        const fontWeight = detectFontWeight(fontName, fontFamily);
        const fontStyle = detectFontStyle(fontName, fontFamily);
        const width = Math.max(fontSize, (item.width || item.str.length * fontSize * 0.5) * scale);
        const height = Math.max(fontSize, (item.height || fontSize / scale) * scale);

        return [{
          id: `${index}-${e}-${f}`,
          text: item.str,
          left: x,
          top: y - fontSize,
          fontSize,
          angle,
          fontFamily,
          fontName,
          fontWeight,
          fontStyle,
          width,
          height,
        }];
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
      {items.map((item) => {
        const previewText = previewEdits[item.id];
        const hasPreview = previewText !== undefined && previewText !== item.text;

        return (
          <button
            type="button"
            key={item.id}
            className={`pdf-text-item${selectedItemId === item.id ? " is-selected" : ""}${hasPreview ? " has-preview" : ""}`}
            style={{
              left: item.left,
              top: item.top,
              width: item.width,
              minHeight: item.height,
              fontSize: item.fontSize,
              fontFamily: item.fontFamily,
              fontWeight: item.fontWeight,
              fontStyle: item.fontStyle,
              transform: `rotate(${item.angle}deg)`,
            }}
            onClick={() => onSelectItem(item)}
            title={`Inspecionar: ${item.text}`}
          >
            {hasPreview ? previewText : item.text}
          </button>
        );
      })}
    </div>
  );
}
