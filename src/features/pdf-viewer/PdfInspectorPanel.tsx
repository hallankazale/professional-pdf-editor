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

  useEffect(() => {
    setDraftText(previewText ?? selectedItem?.text ?? "");
  }, [previewText, selectedItem]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedItem) return;
    onApplyPreview(draftText);
  }

  return (
    <aside
      className={`inspector-panel ${selectedItem ? "is-open" : "is-idle"}`}
      aria-label="Inspetor do PDF"
    >
      <div className="inspector-header">
        <div>
          <span className="inspector-eyebrow">{selectedItem ? "Editar seleção" : "Documento"}</span>
          <h2>{selectedItem ? "Texto selecionado" : "Toque em um texto"}</h2>
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
