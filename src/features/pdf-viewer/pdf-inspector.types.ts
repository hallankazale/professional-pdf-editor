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
