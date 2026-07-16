export function createEditedPdfFilename(originalName: string): string {
  const normalizedName = originalName.trim() || "documento.pdf";
  const baseName = normalizedName.toLowerCase().endsWith(".pdf")
    ? normalizedName.slice(0, -4)
    : normalizedName;

  return `${baseName}_editado.pdf`;
}

/**
 * Baixa uma cópia local do PDF aberto sem enviar o arquivo a qualquer servidor.
 * Nesta primeira etapa, o conteúdo permanece idêntico ao original; o serviço será
 * evoluído para aplicar as alterações da sessão antes do download.
 */
export function downloadPdfCopy(file: File): void {
  const objectUrl = URL.createObjectURL(file);
  const anchor = globalThis.document.createElement("a");

  anchor.href = objectUrl;
  anchor.download = createEditedPdfFilename(file.name);
  anchor.rel = "noopener";
  anchor.style.display = "none";

  globalThis.document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  // O revoke é adiado para garantir que navegadores móveis iniciem o download.
  globalThis.setTimeout(() => URL.revokeObjectURL(objectUrl), 1_000);
}
