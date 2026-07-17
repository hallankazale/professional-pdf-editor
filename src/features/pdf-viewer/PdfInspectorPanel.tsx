"use client";

import { FormEvent, useEffect, useState } from "react";

import type { InspectedTextItem, PdfPageTextStatus } from "./pdf-inspector.types";

type PdfInspectorPanelProps = {
  selectedItem: InspectedTextItem | null;
  pageStatus: PdfPageTextStatus;
  previewText: string | null;
  onApplyPreview: (nextText: string) => void;
  onClearSelection: () => void;
};

export function PdfInspectorPanel({
  selectedItem,
  pageStatus,
  previewText,
  onApplyPreview,
  onClearSelection,
}: PdfInspectorPanelProps) {
  const [draftText, setDraftText] = useState("");
  const [copyMessage, setCopyMessage] = useState<string | null>(null);

  useEffect(() => {
    setDraftText(previewText ?? selectedItem?.text ?? "");
    setCopyMessage(null);
  }, [previewText, selectedItem]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedItem) return;
    onApplyPreview(draftText);
  }

  function focusEditor(): void {
    globalThis.document.getElementById("preview-text")?.focus();
  }

  async function copySelectedText(): Promise<void> {
    if (!selectedItem) return;

    try {
      await globalThis.navigator.clipboard.writeText(previewText ?? selectedItem.text);
      setCopyMessage("Texto copiado!");
    } catch {
      setCopyMessage("Não foi possível copiar.");
    }
  }

  return (
    <aside
      className={`inspector-panel ${selectedItem ? "is-open" : "is-idle"}`}
      aria-label="Inspetor do PDF"
    >
      <div className="inspector-header">
        <div>
          <span className="inspector-eyebrow">{selectedItem ? "Texto selecionado" : "Documento"}</span>
          <h2>{selectedItem ? "O que deseja fazer?" : "Toque em um texto"}</h2>
        </div>
        {selectedItem && (
          <button type="button" className="inspector-close" onClick={onClearSelection}>
            Fechar
          </button>
        )}
      </div>

      <div className={`document-kind document-kind-${pageStatus}`}>
        {pageStatus === "loading" && "Analisando página…"}
        {pageStatus === "digital" && "Texto editável detectado"}
        {pageStatus === "scanned" && "Página escaneada: OCR necessário"}
      </div>

      {!selectedItem ? (
        <p className="inspector-empty">
          Toque em uma palavra no PDF para abrir as opções de edição.
        </p>
      ) : (
        <>
          <div
            role="toolbar"
            aria-label="Ações do texto selecionado"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: 8,
              marginTop: 12,
            }}
          >
            <button type="button" className="primary-action" onClick={focusEditor}>
              Editar
            </button>
            <button type="button" className="toolbar-button" onClick={() => void copySelectedText()}>
              Copiar
            </button>
            <button type="button" className="toolbar-button" onClick={onClearSelection}>
              Cancelar
            </button>
          </div>

          {copyMessage && (
            <p role="status" style={{ margin: "9px 0 0", color: "#bfdbfe", fontSize: ".8rem" }}>
              {copyMessage}
            </p>
          )}

          <form className="preview-edit-form" onSubmit={handleSubmit}>
            <label htmlFor="preview-text">Novo conteúdo</label>
            <textarea
              id="preview-text"
              value={draftText}
              onChange={(event) => setDraftText(event.target.value)}
              rows={2}
              maxLength={500}
            />
            <button
              type="submit"
              className="primary-action"
              disabled={draftText === (previewText ?? selectedItem.text)}
            >
              Aplicar edição
            </button>
          </form>

          <details className="inspector-details">
            <summary>Ver propriedades do texto</summary>
            <dl className="inspector-properties">
              <div>
                <dt>Conteúdo original</dt>
                <dd className="inspector-text-value">{selectedItem.text}</dd>
              </div>
              <div>
                <dt>Fonte aproximada</dt>
                <dd>{selectedItem.fontFamily}</dd>
              </div>
              <div>
                <dt>Tamanho</dt>
                <dd>{selectedItem.fontSize.toFixed(1)} px</dd>
              </div>
              <div>
                <dt>Rotação</dt>
                <dd>{selectedItem.angle.toFixed(1)}°</dd>
              </div>
              <div>
                <dt>Posição</dt>
                <dd>X {selectedItem.left.toFixed(1)} · Y {selectedItem.top.toFixed(1)}</dd>
              </div>
            </dl>
          </details>
        </>
      )}
    </aside>
  );
}
