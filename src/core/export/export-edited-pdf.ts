import { PDFDocument, StandardFonts, degrees, rgb, type PDFFont } from "pdf-lib";

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

function fitFontSize(font: PDFFont, text: string, preferredSize: number, availableWidth: number): number {
  if (!text || availableWidth <= 0) return preferredSize;
  const measuredWidth = font.widthOfTextAtSize(text, preferredSize);
  if (measuredWidth <= availableWidth) return preferredSize;
  return Math.max(1, preferredSize * (availableWidth / measuredWidth));
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
 * cor da letra e cor de fundo aproximadas a partir da renderização original.
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
    const fontSize = fitFontSize(font, edit.text, preferredFontSize, width);
    const textColor = safeColor(edit.original.textColor, BLACK);
    const backgroundColor = safeColor(edit.original.backgroundColor, WHITE);

    page.drawRectangle({
      x,
      y,
      width,
      height: height * 1.15,
      color: rgb(backgroundColor.red, backgroundColor.green, backgroundColor.blue),
      borderWidth: 0,
    });

    page.drawText(edit.text, {
      x,
      y: y + Math.max(0, (height - fontSize) / 2),
      size: fontSize,
      font,
      color: rgb(textColor.red, textColor.green, textColor.blue),
      rotate: degrees(-edit.original.angle),
      maxWidth: Math.max(width, fontSize),
      lineHeight: fontSize * 1.05,
    });
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
