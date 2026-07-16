import { describe, expect, it } from "vitest";

import {
  MAX_PDF_FILE_SIZE_BYTES,
  validatePdfFile,
} from "./validate-pdf-file";

describe("validatePdfFile", () => {
  it("aceita um PDF válido", async () => {
    const file = new File(["%PDF-1.7\ncontent"], "documento.pdf", {
      type: "application/pdf",
    });

    await expect(validatePdfFile(file)).resolves.toEqual({ isValid: true });
  });

  it("rejeita extensão diferente de PDF", async () => {
    const file = new File(["content"], "documento.txt", {
      type: "text/plain",
    });

    await expect(validatePdfFile(file)).resolves.toEqual({
      isValid: false,
      message: "Selecione um arquivo PDF válido.",
    });
  });

  it("rejeita arquivo vazio", async () => {
    const file = new File([], "documento.pdf", {
      type: "application/pdf",
    });

    await expect(validatePdfFile(file)).resolves.toEqual({
      isValid: false,
      message: "O arquivo PDF está vazio.",
    });
  });

  it("rejeita arquivo acima do limite", async () => {
    const oversizedContent = new Uint8Array(MAX_PDF_FILE_SIZE_BYTES + 1);
    const file = new File([oversizedContent], "documento.pdf", {
      type: "application/pdf",
    });

    await expect(validatePdfFile(file)).resolves.toEqual({
      isValid: false,
      message: "O arquivo ultrapassa o limite inicial de 50 MB.",
    });
  });

  it("rejeita arquivo renomeado para PDF sem assinatura válida", async () => {
    const file = new File(["conteúdo que não é PDF"], "documento.pdf", {
      type: "application/pdf",
    });

    await expect(validatePdfFile(file)).resolves.toEqual({
      isValid: false,
      message: "O conteúdo do arquivo não corresponde a um PDF verdadeiro.",
    });
  });
});
