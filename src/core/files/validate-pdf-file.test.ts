import { describe, expect, it } from "vitest";

import {
  MAX_PDF_FILE_SIZE_BYTES,
  validatePdfFile,
} from "./validate-pdf-file";

describe("validatePdfFile", () => {
  it("aceita um PDF válido", () => {
    const file = new File(["pdf-content"], "documento.pdf", {
      type: "application/pdf",
    });

    expect(validatePdfFile(file)).toEqual({ isValid: true });
  });

  it("rejeita extensão diferente de PDF", () => {
    const file = new File(["content"], "documento.txt", {
      type: "text/plain",
    });

    expect(validatePdfFile(file)).toEqual({
      isValid: false,
      message: "Selecione um arquivo PDF válido.",
    });
  });

  it("rejeita arquivo vazio", () => {
    const file = new File([], "documento.pdf", {
      type: "application/pdf",
    });

    expect(validatePdfFile(file)).toEqual({
      isValid: false,
      message: "O arquivo PDF está vazio.",
    });
  });

  it("rejeita arquivo acima do limite", () => {
    const oversizedContent = new Uint8Array(MAX_PDF_FILE_SIZE_BYTES + 1);
    const file = new File([oversizedContent], "documento.pdf", {
      type: "application/pdf",
    });

    expect(validatePdfFile(file)).toEqual({
      isValid: false,
      message: "O arquivo ultrapassa o limite inicial de 50 MB.",
    });
  });
});
