export type PdfRgbColor = {
  red: number;
  green: number;
  blue: number;
};

export type InspectedTextItem = {
  id: string;
  text: string;
  fontFamily: string;
  cssFontFamily: string;
  fontName: string;
  fontSize: number;
  fontWeight: "normal" | "bold";
  fontStyle: "normal" | "italic";
  textColor: PdfRgbColor;
  backgroundColor: PdfRgbColor;
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