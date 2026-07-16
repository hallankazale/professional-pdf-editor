export const MAX_PDF_FILE_SIZE_BYTES = 50 * 1024 * 1024;

const PDF_SIGNATURE = "%PDF-";

export type PdfFileValidationResult =
  | { isValid: true }
  | { isValid: false; message: string };

/**
 * Valida metadados e a assinatura binária do arquivo antes de qualquer leitura pesada.
 * A extensão e o MIME type são apenas filtros iniciais; os bytes reais confirmam o formato.
 */
export async function validatePdfFile(file: File): Promise<PdfFileValidationResult> {
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

  try {
    const signatureBytes = new Uint8Array(await file.slice(0, PDF_SIGNATURE.length).arrayBuffer());
    const signature = new TextDecoder("ascii").decode(signatureBytes);

    if (signature !== PDF_SIGNATURE) {
      return {
        isValid: false,
        message: "O conteúdo do arquivo não corresponde a um PDF verdadeiro.",
      };
    }
  } catch {
    return {
      isValid: false,
      message: "Não foi possível verificar a integridade deste arquivo.",
    };
  }

  return { isValid: true };
}
