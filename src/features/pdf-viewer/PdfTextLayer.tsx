"use client";

import type { PDFPageProxy } from "pdfjs-dist";
import { useEffect, useState } from "react";

type TextSpan = {
  id: string;
  text: string;
  left: number;
  top: number;
  fontSize: number;
  angle: number;
  fontFamily: string;
};

type PdfTextLayerProps = {
  page: PDFPageProxy | null;
  scale: number;
};

/**
 * Cria uma camada textual sobre o canvas sem modificar o PDF.
 * Essa camada permite seleção/cópia e será reutilizada futuramente
 * pelo motor de inspeção e edição de conteúdo.
 */
export function PdfTextLayer({ page, scale }: PdfTextLayerProps) {
  const [items, setItems] = useState<TextSpan[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function buildTextLayer() {
      if (!page) {
        setItems([]);
        return;
      }

      const viewport = page.getViewport({ scale });
      const textContent = await page.getTextContent();
      const styles = textContent.styles;

      const nextItems = textContent.items.flatMap((item, index) => {
        if (!("str" in item) || !item.str) return [];

        const [a, b, , d, e, f] = item.transform;
        const x = viewport.transform[0] * e + viewport.transform[2] * f + viewport.transform[4];
        const y = viewport.transform[1] * e + viewport.transform[3] * f + viewport.transform[5];
        const fontSize = Math.max(1, Math.hypot(b, d) * scale);
        const angle = Math.atan2(b, a) * (180 / Math.PI);
        const fontFamily = styles[item.fontName]?.fontFamily || "sans-serif";

        return [
          {
            id: `${index}-${e}-${f}`,
            text: item.str,
            left: x,
            top: y - fontSize,
            fontSize,
            angle,
            fontFamily,
          },
        ];
      });

      if (!cancelled) setItems(nextItems);
    }

    void buildTextLayer();

    return () => {
      cancelled = true;
    };
  }, [page, scale]);

  return (
    <div className="pdf-text-layer" aria-label="Camada de texto selecionável">
      {items.map((item) => (
        <span
          key={item.id}
          style={{
            left: item.left,
            top: item.top,
            fontSize: item.fontSize,
            fontFamily: item.fontFamily,
            transform: `rotate(${item.angle}deg)`,
          }}
        >
          {item.text}
        </span>
      ))}
    </div>
  );
}
