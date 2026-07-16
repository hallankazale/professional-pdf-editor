import { PDFDocument, StandardFonts, degrees, rgb } from "pdf-lib";

import type { InspectedTextItem } from "@/features/pdf-viewer/pdf-inspector.types";
import { createEditedPdfFilename } from "./download-pdf-copy";

export type PdfTextEdit = {
  pageNumber: number;
  text: string;
  original: InspectedTextItem;
  scale: number;
};

/**
 * Aplica uma primeira versão de edições textuais sobre o PDF original.
 * O conteúdo anterior é coberto por um retângulo branco e o novo texto é desenhado
 * na posição equivalente. Esta abordagem é intencionalmente isolada para ser trocada
 * pelo motor nativo sem acoplar a interface ao pdf-lib.
 */
export async function exportEditedPdf(file: File, edits: PdfTextEdit[]): Promise<void> {
  const sourceBytes = await file.arrayBuffer();
  const pdfDocument = await PDFDocument.load(sourceBytes, { ignoreEncryption: false });
  const fallbackFont = await pdfDocument.embedFont(StandardFonts.Helvetica);

  for (const edit of edits) {
    const page = pdfDocument.getPage(edit.pageNumber - 1);
    if (!page) continue;

    const safeScale = edit.scale > 0 ? edit.scale : 1;
    const x = edit.original.left / safeScale;
    const fontSize = Math.max(1, edit.original.fontSize / safeScale);
    const width = Math.max(fontSize, edit.original.width / safeScale);
    const height = Math.max(fontSize, edit.original.height / safeScale);
    const y = page.getHeight() - edit.original.top / safeScale - height;

    page.drawRectangle({
      x,
      y,
      width,
      height: height * 1.15,
      color: rgb(1, 1, 1),
      borderWidth: 0,
    });

    page.drawText(edit.text, {
      x,
      y: y + Math.max(0, (height - fontSize) / 2),
      size: fontSize,
      font: fallbackFont,
      color: rgb(0, 0, 0),
      rotate: degrees(-edit.original.angle),
      maxWidth: Math.max(width, fontSize),
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
