"use client";

import { ChangeEvent, useState } from "react";

import { downloadPdfCopy } from "@/core/export/download-pdf-copy";
import { validatePdfFile } from "@/core/files/validate-pdf-file";
import { PdfViewer } from "@/features/pdf-viewer/PdfViewer";

export default function HomePage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  async function handleFileSelection(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];

    setError(null);

    if (!file) return;

    setIsValidating(true);

    try {
      const validation = await validatePdfFile(file);

      if (!validation.isValid) {
        setSelectedFile(null);
        setError(validation.message);
        input.value = "";
        return;
      }

      setSelectedFile(file);
    } finally {
      setIsValidating(false);
    }
  }

  function handleCloseDocument() {
    setSelectedFile(null);
    setError(null);
  }

  function handleExport() {
    if (!selectedFile) return;
    downloadPdfCopy(selectedFile);
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <span className="eyebrow">Versão 0.4.0</span>
          <h1>Professional PDF Editor</h1>
        </div>
        <button
          type="button"
          className="secondary-button"
          disabled={!selectedFile}
          onClick={handleExport}
        >
          Exportar original
        </button>
      </header>

      {selectedFile ? (
        <PdfViewer file={selectedFile} onClose={handleCloseDocument} />
      ) : (
        <section className="workspace" aria-labelledby="upload-title">
          <div className="upload-card">
            <span className="document-icon" aria-hidden="true">
              PDF
            </span>
            <h2 id="upload-title">Abra seu documento</h2>
            <p>
              O arquivo é processado localmente no navegador. Você pode visualizar,
              editar blocos textuais e salvar uma nova versão do documento.
            </p>

            <label className="primary-button" htmlFor="pdf-file" aria-disabled={isValidating}>
              {isValidating ? "Verificando PDF…" : "Selecionar PDF"}
            </label>
            <input
              id="pdf-file"
              className="visually-hidden"
              type="file"
              accept="application/pdf,.pdf"
              onChange={(event) => void handleFileSelection(event)}
              disabled={isValidating}
            />

            {error && (
              <p className="error-message" role="alert">
                {error}
              </p>
            )}
          </div>
        </section>
      )}
    </main>
  );
}
