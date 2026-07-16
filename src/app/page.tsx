"use client";

import { ChangeEvent, useState } from "react";

import { validatePdfFile } from "@/core/files/validate-pdf-file";
import { PdfViewer } from "@/features/pdf-viewer/PdfViewer";

export default function HomePage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleFileSelection(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    setError(null);

    if (!file) return;

    const validation = validatePdfFile(file);

    if (!validation.isValid) {
      setSelectedFile(null);
      setError(validation.message);
      event.target.value = "";
      return;
    }

    setSelectedFile(file);
  }

  function handleCloseDocument() {
    setSelectedFile(null);
    setError(null);
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <span className="eyebrow">Versão 0.2.0</span>
          <h1>Professional PDF Editor</h1>
        </div>
        <button type="button" className="secondary-button" disabled>
          Exportar
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
              O arquivo é processado localmente no navegador. Nesta etapa, você já
              poderá visualizar as páginas, navegar e controlar o zoom.
            </p>

            <label className="primary-button" htmlFor="pdf-file">
              Selecionar PDF
            </label>
            <input
              id="pdf-file"
              className="visually-hidden"
              type="file"
              accept="application/pdf,.pdf"
              onChange={handleFileSelection}
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
