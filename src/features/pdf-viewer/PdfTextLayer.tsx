"use client";

import type { PDFPageProxy } from "pdfjs-dist";
import { useEffect, useState } from "react";

import type {
  InspectedTextItem,
  PdfPageTextStatus,
  PdfRgbColor,
} from "./pdf-inspector.types";

type TextSpan = InspectedTextItem;

type PdfTextLayerProps = {
  page: PDFPageProxy | null;
  scale: number;
  selectedItemId: string | null;
  previewEdits: Record<string, string>;
  onSelectItem: (item: InspectedTextItem) => void;
  onPageStatusChange: (status: PdfPageTextStatus) => void;
};

const BLACK: PdfRgbColor = { red: 0, green: 0, blue: 0 };
const WHITE: PdfRgbColor = { red: 1, green: 1, blue: 1 };

function detectFontWeight(fontName: string, fontFamily: string): "normal" | "bold" {
  const descriptor = `${fontName} ${fontFamily}`.toLowerCase();
  return /bold|black|heavy|semibold|demi|700|800|900/.test(descriptor) ? "bold" : "normal";
}

function detectFontStyle(fontName: string, fontFamily: string): "normal" | "italic" {
  const descriptor = `${fontName} ${fontFamily}`.toLowerCase();
  return /italic|oblique|slanted/.test(descriptor) ? "italic" : "normal";
}

function toRgbColor(red: number, green: number, blue: number): PdfRgbColor {
  return {
    red: Math.min(1, Math.max(0, red / 255)),
    green: Math.min(1, Math.max(0, green / 255)),
    blue: Math.min(1, Math.max(0, blue / 255)),
  };
}

function cssRgb(color: PdfRgbColor): string {
  return `rgb(${Math.round(color.red * 255)}, ${Math.round(color.green * 255)}, ${Math.round(color.blue * 255)})`;
}

function colorDistance(
  red: number,
  green: number,
  blue: number,
  background: [number, number, number],
): number {
  return Math.hypot(
    red - background[0],
    green - background[1],
    blue - background[2],
  );
}

function sampleItemColors(
  canvas: HTMLCanvasElement | null,
  item: Pick<InspectedTextItem, "left" | "top" | "width" | "height">,
): { textColor: PdfRgbColor; backgroundColor: PdfRgbColor } {
  if (!canvas) return { textColor: BLACK, backgroundColor: WHITE };

  const context = canvas.getContext("2d", { willReadFrequently: true });
  const cssWidth = Number.parseFloat(canvas.style.width) || canvas.clientWidth;
  const cssHeight = Number.parseFloat(canvas.style.height) || canvas.clientHeight;
  if (!context || !cssWidth || !cssHeight) {
    return { textColor: BLACK, backgroundColor: WHITE };
  }

  const ratioX = canvas.width / cssWidth;
  const ratioY = canvas.height / cssHeight;
  const padding = Math.max(2, Math.round(Math.min(item.height, item.width) * 0.12));
  const sampleLeft = Math.max(0, Math.floor((item.left - padding) * ratioX));
  const sampleTop = Math.max(0, Math.floor((item.top - padding) * ratioY));
  const sampleWidth = Math.max(
    1,
    Math.min(canvas.width - sampleLeft, Math.ceil((item.width + padding * 2) * ratioX)),
  );
  const sampleHeight = Math.max(
    1,
    Math.min(canvas.height - sampleTop, Math.ceil((item.height + padding * 2) * ratioY)),
  );

  try {
    const image = context.getImageData(sampleLeft, sampleTop, sampleWidth, sampleHeight);
    const borderPixels: Array<[number, number, number]> = [];
    const allPixels: Array<[number, number, number]> = [];

    for (let y = 0; y < sampleHeight; y += 1) {
      for (let x = 0; x < sampleWidth; x += 1) {
        const offset = (y * sampleWidth + x) * 4;
        if (image.data[offset + 3] < 16) continue;
        const pixel: [number, number, number] = [
          image.data[offset],
          image.data[offset + 1],
          image.data[offset + 2],
        ];
        allPixels.push(pixel);
        if (x <= 1 || y <= 1 || x >= sampleWidth - 2 || y >= sampleHeight - 2) {
          borderPixels.push(pixel);
        }
      }
    }

    const backgroundSource = borderPixels.length ? borderPixels : allPixels;
    if (!backgroundSource.length) return { textColor: BLACK, backgroundColor: WHITE };

    const background = backgroundSource.reduce<[number, number, number]>(
      (total, pixel) => [
        total[0] + pixel[0],
        total[1] + pixel[1],
        total[2] + pixel[2],
      ],
      [0, 0, 0],
    ).map((value) => value / backgroundSource.length) as [number, number, number];

    const contrastingPixels = allPixels
      .map((pixel) => ({ pixel, distance: colorDistance(...pixel, background) }))
      .filter(({ distance }) => distance >= 38)
      .sort((left, right) => right.distance - left.distance);

    const strongest = contrastingPixels.slice(
      0,
      Math.max(1, Math.ceil(contrastingPixels.length * 0.35)),
    );

    const foreground = strongest.length
      ? strongest.reduce<[number, number, number]>(
          (total, entry) => [
            total[0] + entry.pixel[0],
            total[1] + entry.pixel[1],
            total[2] + entry.pixel[2],
          ],
          [0, 0, 0],
        ).map((value) => value / strongest.length) as [number, number, number]
      : [0, 0, 0];

    return {
      textColor: toRgbColor(...foreground),
      backgroundColor: toRgbColor(...background),
    };
  } catch {
    return { textColor: BLACK, backgroundColor: WHITE };
  }
}

/**
 * Cria uma camada textual sobre o canvas sem modificar o PDF.
 * As alterações são renderizadas apenas como prévia visual e ficam separadas
 * do motor responsável pela exportação.
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
      const canvas = globalThis.document.querySelector<HTMLCanvasElement>(".pdf-canvas");

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
        const geometry = {
          left: x,
          top: y - fontSize,
          width,
          height,
        };
        const colors = sampleItemColors(canvas, geometry);

        return [{
          id: `${index}-${e}-${f}`,
          text: item.str,
          ...geometry,
          fontSize,
          angle,
          fontFamily,
          fontName,
          fontWeight,
          fontStyle,
          ...colors,
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
              color: hasPreview ? cssRgb(item.textColor) : undefined,
              backgroundColor: hasPreview ? cssRgb(item.backgroundColor) : undefined,
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
