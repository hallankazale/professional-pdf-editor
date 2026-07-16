export type InspectedTextItem = {
  id: string;
  text: string;
  fontFamily: string;
  fontSize: number;
  angle: number;
  left: number;
  top: number;
  width: number;
  height: number;
};

export type PdfPageTextStatus = "loading" | "digital" | "scanned";

export type TextPreviewEdit = {
  key: string;
  pageNumber: number;
  itemId: string;
  originalText: string;
  nextText: string;
};
