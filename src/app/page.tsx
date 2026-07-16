"use client";

import { ChangeEvent, useState } from "react";

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

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <span className="eyebrow">Versão 0.5.0 • Mobile</span>
          <h1>Professional PDF Editor</h1>
        </div>
      </header>

      {selectedFile ? (
        <PdfViewer file={selectedFile} onClose={handleCloseDocument} />
      ) : (
        <section className="workspace" aria-labelledby="upload-title">
          <div className="upload-card">
            <span className="document-icon" aria-hidden="true">PDF</span>
            <h2 id="upload-title">Abra seu documento</h2>
            <p>
              Edite e salve o trabalho no aparelho. O download do PDF acontece somente ao tocar em Exportar.
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

            {error && <p className="error-message" role="alert">{error}</p>}
          </div>
        </section>
      )}
    </main>
  );
}
