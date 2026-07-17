export type InspectedTextItem = {
  id: string;
  text: string;
  fontFamily: string;
  fontName: string;
  fontSize: number;
  fontWeight: "normal" | "bold";
  fontStyle: "normal" | "italic";
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
