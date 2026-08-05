"use client";

type MobileEditorMenuProps = {
  isOpen: boolean;
  canUndo: boolean;
  canRedo: boolean;
  hasSelection: boolean;
  onClose: () => void;
  onOpenPages: () => void;
  onOpenSearch: () => void;
  onEditSelection: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onChangePdf: () => void;
};

export function MobileEditorMenu({
  isOpen,
  canUndo,
  canRedo,
  hasSelection,
  onClose,
  onOpenPages,
  onOpenSearch,
  onEditSelection,
  onUndo,
  onRedo,
  onChangePdf,
}: MobileEditorMenuProps) {
  if (!isOpen) return null;

  function run(action: () => void): void {
    action();
    onClose();
  }

  return (
    <>
      <button
        type="button"
        className="mobile-menu-backdrop"
        aria-label="Fechar menu"
        onClick={onClose}
      />
      <aside className="mobile-editor-menu" aria-label="Menu do editor">
        <div className="mobile-menu-header">
          <div>
            <span>Ferramentas</span>
            <strong>Editor de PDF</strong>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar menu">×</button>
        </div>

        <nav className="mobile-menu-actions">
          <button type="button" onClick={() => run(onOpenPages)}>
            <span aria-hidden="true">▦</span>
            <div><strong>Páginas</strong><small>Ver miniaturas</small></div>
          </button>
          <button type="button" onClick={() => run(onOpenSearch)}>
            <span aria-hidden="true">⌕</span>
            <div><strong>Buscar</strong><small>Localizar texto</small></div>
          </button>
          <button type="button" disabled={!hasSelection} onClick={() => run(onEditSelection)}>
            <span aria-hidden="true">✎</span>
            <div><strong>Editar seleção</strong><small>Alterar o texto escolhido</small></div>
          </button>
          <button type="button" disabled={!canUndo} onClick={() => run(onUndo)}>
            <span aria-hidden="true">↶</span>
            <div><strong>Desfazer</strong><small>Voltar uma alteração</small></div>
          </button>
          <button type="button" disabled={!canRedo} onClick={() => run(onRedo)}>
            <span aria-hidden="true">↷</span>
            <div><strong>Refazer</strong><small>Restaurar uma alteração</small></div>
          </button>
          <button type="button" onClick={() => run(onChangePdf)}>
            <span aria-hidden="true">⇄</span>
            <div><strong>Trocar PDF</strong><small>Abrir outro documento</small></div>
          </button>
        </nav>
      </aside>
    </>
  );
}
