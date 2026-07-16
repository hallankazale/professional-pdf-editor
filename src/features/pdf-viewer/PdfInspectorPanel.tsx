import type { InspectedTextItem, PdfPageTextStatus } from "./pdf-inspector.types";

type PdfInspectorPanelProps = {
  selectedItem: InspectedTextItem | null;
  pageStatus: PdfPageTextStatus;
  onClearSelection: () => void;
};

export function PdfInspectorPanel({
  selectedItem,
  pageStatus,
  onClearSelection,
}: PdfInspectorPanelProps) {
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
        <dl className="inspector-properties">
          <div>
            <dt>Conteúdo</dt>
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
      )}
    </aside>
  );
}
