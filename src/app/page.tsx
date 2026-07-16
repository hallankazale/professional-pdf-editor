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

      // Fluxo direto: terminou a validação, o editor é exibido automaticamente.
      setSelectedFile(file);
    } catch {
      setSelectedFile(null);
      setError("Não foi possível analisar este arquivo.");
      input.value = "";
    } finally {
      setIsValidating(false);
    }
  }

  function handleCloseDocument() {
    setSelectedFile(null);
    setError(null);
  }

  return (
    <main className={`app-shell ${selectedFile ? "is-editing" : "is-home"}`}>
      {selectedFile ? (
        <PdfViewer file={selectedFile} onClose={handleCloseDocument} />
      ) : (
        <>
          <header className="home-header">
            <div className="brand-mark" aria-hidden="true">P</div>
            <div>
              <span className="eyebrow">Editor mobile</span>
              <h1>Professional PDF Editor</h1>
            </div>
          </header>

          <section className="workspace" aria-labelledby="upload-title">
            <div className="upload-card">
              <div className="upload-hero">
                <span className="document-icon" aria-hidden="true">PDF</span>
                <span className="privacy-badge">Processamento local</span>
              </div>

              <h2 id="upload-title">Abra e edite seu PDF</h2>
              <p>
                Selecione o arquivo e ele será aberto automaticamente no editor.
                Nenhum botão extra será necessário.
              </p>

              <label className="primary-button upload-action" htmlFor="pdf-file" aria-disabled={isValidating}>
                {isValidating ? "Abrindo PDF…" : "Selecionar PDF"}
              </label>
              <input
                id="pdf-file"
                className="visually-hidden"
                type="file"
                accept="application/pdf,.pdf"
                onChange={(event) => void handleFileSelection(event)}
                disabled={isValidating}
              />

              <div className="home-benefits" aria-label="Benefícios">
                <span>Sem upload para servidor</span>
                <span>Salvar sem baixar</span>
                <span>Exportar somente quando quiser</span>
              </div>

              {error && <p className="error-message" role="alert">{error}</p>}
            </div>
          </section>
        </>
      )}
    </main>
  );
}
