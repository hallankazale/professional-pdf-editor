"use client";

import { ChangeEvent, useState } from "react";

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;

export default function HomePage() {
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleFileSelection(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    setError(null);
    setFileName(null);

    if (!file) return;

    if (file.type !== "application/pdf") {
      setError("Selecione um arquivo PDF válido.");
      event.target.value = "";
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setError("O arquivo ultrapassa o limite inicial de 50 MB.");
      event.target.value = "";
      return;
    }

    setFileName(file.name);
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <span className="eyebrow">Versão 0.1.0</span>
          <h1>Professional PDF Editor</h1>
        </div>
        <button type="button" className="secondary-button" disabled>
          Exportar
        </button>
      </header>

      <section className="workspace" aria-labelledby="upload-title">
        <div className="upload-card">
          <span className="document-icon" aria-hidden="true">PDF</span>
          <h2 id="upload-title">Abra seu documento</h2>
          <p>
            Nesta primeira etapa, o arquivo permanece no seu dispositivo. A
            visualização e o motor de edição serão conectados nas próximas entregas.
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

          {fileName && <p className="success-message">Arquivo selecionado: {fileName}</p>}
          {error && <p className="error-message" role="alert">{error}</p>}
        </div>
      </section>
    </main>
  );
}
