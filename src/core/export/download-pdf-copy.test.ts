import { describe, expect, it } from "vitest";

import { createEditedPdfFilename } from "./download-pdf-copy";

describe("createEditedPdfFilename", () => {
  it("adiciona o sufixo antes da extensão PDF", () => {
    expect(createEditedPdfFilename("contrato.pdf")).toBe("contrato_editado.pdf");
  });

  it("preserva nomes com pontos", () => {
    expect(createEditedPdfFilename("contrato.v2.PDF")).toBe("contrato.v2_editado.pdf");
  });

  it("usa um nome seguro quando o arquivo não possui nome", () => {
    expect(createEditedPdfFilename("   ")).toBe("documento_editado.pdf");
  });
});
