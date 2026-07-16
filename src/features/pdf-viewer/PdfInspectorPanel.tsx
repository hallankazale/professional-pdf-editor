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
    <aside className="inspector-panel" aria-label="Inspetor do PDF">
      <div className="inspector-header">
        <div>
          <span className="inspector-eyebrow">Modo inspeção</span>
          <h2>Propriedades</h2>
        </div>
        {selectedItem && (
          <button type="button" className="inspector-close" onClick={onClearSelection}>
            Limpar
          </button>
        )}
      </div>

      <div className={`document-kind document-kind-${pageStatus}`}>
        {pageStatus === "loading" && "Analisando página…"}
        {pageStatus === "digital" && "PDF digital: texto detectado"}
        {pageStatus === "scanned" && "Possível página escaneada: OCR necessário"}
      </div>

      {!selectedItem ? (
        <p className="inspector-empty">
          Toque ou clique em um texto da página para analisar suas propriedades.
        </p>
      ) : (
        <>
          <form className="preview-edit-form" onSubmit={handleSubmit}>
            <label htmlFor="preview-text">Editar conteúdo na prévia</label>
            <textarea
              id="preview-text"
              value={draftText}
              onChange={(event) => setDraftText(event.target.value)}
              rows={3}
              maxLength={500}
            />
            <button
              type="submit"
              className="primary-action"
              disabled={draftText === (previewText ?? selectedItem.text)}
            >
              Aplicar prévia
            </button>
            <p className="preview-warning">
              Esta alteração ainda não reescreve o arquivo PDF original.
            </p>
          </form>

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
            <div>
              <dt>Dimensões</dt>
              <dd>{selectedItem.width.toFixed(1)} × {selectedItem.height.toFixed(1)} px</dd>
            </div>
          </dl>
        </>
      )}
    </aside>
  );
}
