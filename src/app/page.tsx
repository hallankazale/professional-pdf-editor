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

    setSelectedFile(file);
    setIsValidating(true);

    try {
      const validation = await validatePdfFile(file);
      if (!validation.isValid) {
        setSelectedFile(null);
        setError(validation.message);
        input.value = "";
      }
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

  if (selectedFile) {
    return (
      <main className="app-shell is-editing">
        <PdfViewer
          key={`${selectedFile.name}-${selectedFile.size}-${selectedFile.lastModified}`}
          file={selectedFile}
          onClose={handleCloseDocument}
        />
      </main>
    );
  }

  return (
    <main className="home-shell">
      <header className="home-topbar">
        <div className="home-brand">
          <div className="home-brand-mark" aria-hidden="true">P</div>
          <div className="home-brand-copy">
            <span>Editor mobile</span>
            <strong>Professional PDF</strong>
          </div>
        </div>
        <span className="home-security">● Privado</span>
      </header>

      <section className="home-main" aria-labelledby="home-title">
        <div className="home-hero">
          <div className="home-copy">
            <span className="home-kicker">PDF no seu celular</span>
            <h1 id="home-title">Edite sem enviar seus documentos.</h1>
            <p>
              Abra, revise e baixe o PDF diretamente no aparelho. Rápido, simples e com processamento local.
            </p>
          </div>

          <div className="home-upload-card">
            <div className="home-dropzone">
              <span className="home-pdf-icon" aria-hidden="true">PDF</span>
              <div className="home-drop-copy">
                <strong>Escolha seu documento</strong>
                <span>PDF de até 50 MB. Ele abre automaticamente no editor.</span>
              </div>
            </div>

            <label className="home-select-button" htmlFor="pdf-file" aria-disabled={isValidating}>
              {isValidating ? "Abrindo documento…" : "Abrir PDF"}
            </label>
            <input
              id="pdf-file"
              className="visually-hidden"
              type="file"
              accept="application/pdf,.pdf"
              onChange={(event) => void handleFileSelection(event)}
              disabled={isValidating}
            />

            <div className="home-proof" aria-label="Recursos principais">
              <div><strong>Local</strong><span>Não envia o arquivo</span></div>
              <div><strong>Rápido</strong><span>Abre em segundos</span></div>
              <div><strong>Seguro</strong><span>Original preservado</span></div>
            </div>

            {error && <p className="home-error" role="alert">{error}</p>}
          </div>
        </div>
      </section>
    </main>
  );
}
