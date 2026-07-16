export const MAX_PDF_FILE_SIZE_BYTES = 50 * 1024 * 1024;

export type PdfFileValidationResult =
  | { isValid: true }
  | { isValid: false; message: string };

/**
 * Valida o arquivo antes de qualquer leitura pesada.
 * A extensão é usada apenas como apoio; o MIME type continua sendo obrigatório.
 */
export function validatePdfFile(file: File): PdfFileValidationResult {
  const hasPdfMimeType = file.type === "application/pdf";
  const hasPdfExtension = file.name.toLowerCase().endsWith(".pdf");

  if (!hasPdfMimeType || !hasPdfExtension) {
    return {
      isValid: false,
      message: "Selecione um arquivo PDF válido.",
    };
  }

  if (file.size === 0) {
    return {
      isValid: false,
      message: "O arquivo PDF está vazio.",
    };
  }

  if (file.size > MAX_PDF_FILE_SIZE_BYTES) {
    return {
      isValid: false,
      message: "O arquivo ultrapassa o limite inicial de 50 MB.",
    };
  }

  return { isValid: true };
}
