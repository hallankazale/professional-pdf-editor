import {
  PDFDocument,
  StandardFonts,
  degrees,
  popGraphicsState,
  pushGraphicsState,
  rgb,
  scale as scaleGraphics,
  type PDFFont,
} from "pdf-lib";

import type { InspectedTextItem, PdfRgbColor } from "@/features/pdf-viewer/pdf-inspector.types";
import { createEditedPdfFilename } from "./download-pdf-copy";

export type PdfTextEdit = {
  pageNumber: number;
  text: string;
  original: InspectedTextItem;
  scale: number;
};

type FontVariant = {
  regular: StandardFonts;
  bold: StandardFonts;
  italic: StandardFonts;
  boldItalic: StandardFonts;
};

type FittedText = {
  fontSize: number;
  horizontalScale: number;
};

const FONT_VARIANTS: Record<"helvetica" | "times" | "courier", FontVariant> = {
  helvetica: {
    regular: StandardFonts.Helvetica,
    bold: StandardFonts.HelveticaBold,
    italic: StandardFonts.HelveticaOblique,
    boldItalic: StandardFonts.HelveticaBoldOblique,
  },
  times: {
    regular: StandardFonts.TimesRoman,
    bold: StandardFonts.TimesRomanBold,
    italic: StandardFonts.TimesRomanItalic,
    boldItalic: StandardFonts.TimesRomanBoldItalic,
  },
  courier: {
    regular: StandardFonts.Courier,
    bold: StandardFonts.CourierBold,
    italic: StandardFonts.CourierOblique,
    boldItalic: StandardFonts.CourierBoldOblique,
  },
};

const BLACK: PdfRgbColor = { red: 0, green: 0, blue: 0 };
const WHITE: PdfRgbColor = { red: 1, green: 1, blue: 1 };
const MIN_HORIZONTAL_SCALE = 0.72;
const MAX_HORIZONTAL_SCALE = 1.2;

function resolveFontGroup(original: InspectedTextItem): keyof typeof FONT_VARIANTS {
  const descriptor = `${original.fontName ?? ""} ${original.fontFamily ?? ""}`.toLowerCase();
  if (/times|serif|georgia|garamond|cambria/.test(descriptor)) return "times";
  if (/courier|mono|consolas|menlo/.test(descriptor)) return "courier";
  return "helvetica";
}

function resolveStandardFont(original: InspectedTextItem): StandardFonts {
  const variants = FONT_VARIANTS[resolveFontGroup(original)];
  const isBold = original.fontWeight === "bold" || /bold|black|heavy|semibold|demi/.test(original.fontName ?? "");
  const isItalic = original.fontStyle === "italic" || /italic|oblique|slanted/.test(original.fontName ?? "");

  if (isBold && isItalic) return variants.boldItalic;
  if (isBold) return variants.bold;
  if (isItalic) return variants.italic;
  return variants.regular;
}

function fitTextToWidth(
  font: PDFFont,
  text: string,
  preferredSize: number,
  availableWidth: number,
  angle: number,
): FittedText {
  if (!text || availableWidth <= 0) {
    return { fontSize: preferredSize, horizontalScale: 1 };
  }

  const measuredWidth = Math.max(0.01, font.widthOfTextAtSize(text, preferredSize));
  const desiredScale = availableWidth / measuredWidth;

  // A compressão horizontal mantém a altura e o peso visual mais próximos do original.
  // Para textos rotacionados, mantemos a transformação simples para não deslocar a posição.
  if (Math.abs(angle) < 0.1 && desiredScale >= MIN_HORIZONTAL_SCALE) {
    return {
      fontSize: preferredSize,
      horizontalScale: Math.min(MAX_HORIZONTAL_SCALE, Math.max(MIN_HORIZONTAL_SCALE, desiredScale)),
    };
  }

  if (measuredWidth <= availableWidth) {
    return { fontSize: preferredSize, horizontalScale: 1 };
  }

  return {
    fontSize: Math.max(1, preferredSize * (availableWidth / measuredWidth)),
    horizontalScale: 1,
  };
}

function safeColor(color: PdfRgbColor | undefined, fallback: PdfRgbColor): PdfRgbColor {
  if (!color) return fallback;
  return {
    red: Math.min(1, Math.max(0, color.red)),
    green: Math.min(1, Math.max(0, color.green)),
    blue: Math.min(1, Math.max(0, color.blue)),
  };
}

/**
 * Substitui visualmente o texto mantendo posição, rotação, tamanho, estilo,
 * cores e largura aproximada da área original.
 */
export async function exportEditedPdf(file: File, edits: PdfTextEdit[]): Promise<void> {
  const sourceBytes = await file.arrayBuffer();
  const pdfDocument = await PDFDocument.load(sourceBytes, { ignoreEncryption: false });
  const embeddedFonts = new Map<StandardFonts, PDFFont>();

  async function getFont(fontName: StandardFonts): Promise<PDFFont> {
    const cached = embeddedFonts.get(fontName);
    if (cached) return cached;
    const embedded = await pdfDocument.embedFont(fontName);
    embeddedFonts.set(fontName, embedded);
    return embedded;
  }

  for (const edit of edits) {
    const page = pdfDocument.getPage(edit.pageNumber - 1);
    if (!page) continue;

    const safeScale = edit.scale > 0 ? edit.scale : 1;
    const x = edit.original.left / safeScale;
    const preferredFontSize = Math.max(1, edit.original.fontSize / safeScale);
    const width = Math.max(preferredFontSize, edit.original.width / safeScale);
    const height = Math.max(preferredFontSize, edit.original.height / safeScale);
    const y = page.getHeight() - edit.original.top / safeScale - height;
    const font = await getFont(resolveStandardFont(edit.original));
    const fitted = fitTextToWidth(font, edit.text, preferredFontSize, width, edit.original.angle);
    const textColor = safeColor(edit.original.textColor, BLACK);
    const backgroundColor = safeColor(edit.original.backgroundColor, WHITE);
    const baselineY = y + Math.max(0, (height - fitted.fontSize) / 2);

    page.drawRectangle({
      x,
      y,
      width,
      height: height * 1.15,
      color: rgb(backgroundColor.red, backgroundColor.green, backgroundColor.blue),
      borderWidth: 0,
    });

    if (fitted.horizontalScale !== 1) {
      page.pushOperators(pushGraphicsState(), scaleGraphics(fitted.horizontalScale, 1));
    }

    page.drawText(edit.text, {
      x: fitted.horizontalScale === 1 ? x : x / fitted.horizontalScale,
      y: baselineY,
      size: fitted.fontSize,
      font,
      color: rgb(textColor.red, textColor.green, textColor.blue),
      rotate: degrees(-edit.original.angle),
      maxWidth: Math.max(width / fitted.horizontalScale, fitted.fontSize),
      lineHeight: fitted.fontSize * 1.05,
    });

    if (fitted.horizontalScale !== 1) {
      page.pushOperators(popGraphicsState());
    }
  }

  const outputBytes = await pdfDocument.save();
  const browserSafeBytes = new Uint8Array(outputBytes);
  const blob = new Blob([browserSafeBytes], { type: "application/pdf" });
  const objectUrl = URL.createObjectURL(blob);
  const anchor = globalThis.document.createElement("a");

  anchor.href = objectUrl;
  anchor.download = createEditedPdfFilename(file.name);
  anchor.rel = "noopener";
  anchor.style.display = "none";
  globalThis.document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  globalThis.setTimeout(() => URL.revokeObjectURL(objectUrl), 1_000);
}
