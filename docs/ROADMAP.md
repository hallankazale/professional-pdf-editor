# Roadmap — Professional PDF Editor

## Visão do produto

Editor de PDF web responsivo, com processamento local sempre que possível e arquitetura desacoplada do motor de documentos.

## Fase 1 — Fundação e visualização

- [x] Estrutura Next.js, React e TypeScript estrito
- [x] Interface responsiva
- [x] Upload local de PDF
- [x] Validação modular de arquivo
- [x] Testes unitários iniciais
- [x] GitHub Actions para typecheck, testes e build
- [x] Renderização com PDF.js
- [x] Navegação anterior e próxima
- [x] Salto direto para página
- [x] Zoom entre 50% e 250%
- [x] Camada de texto selecionável
- [ ] Miniaturas laterais
- [ ] Validação binária do cabeçalho `%PDF`

## Fase 2 — Inspeção e prévia de conteúdo

- [x] Seleção de bloco textual
- [x] Identificação da posição do texto
- [x] Identificação aproximada de fonte e tamanho
- [x] Painel de propriedades
- [x] Detecção inicial de PDF digital versus página sem texto
- [x] Edição controlada em prévia
- [x] Histórico de desfazer e refazer da prévia
- [x] Separação entre prévia visual e reescrita nativa
- [ ] Identificação confiável de peso, estilo e cor
- [ ] Persistência local das alterações em andamento

## Fase 3 — Edição nativa

- [ ] Prova de conceito com motor profissional
- [ ] Substituição de palavras e números existentes
- [ ] Preservação da formatação original
- [ ] Mudança de fonte, tamanho, peso, estilo e cor
- [ ] Edição e substituição de imagens
- [ ] Exportação do PDF alterado

> A edição nativa depende da validação técnica e comercial de um SDK especializado. A camada de texto do PDF.js serve para seleção, inspeção e prévia, mas não reescreve sozinha os objetos internos do PDF.

## Fase 4 — Gerenciamento de páginas

- [ ] Reordenar páginas
- [ ] Excluir, duplicar e rotacionar
- [ ] Inserir páginas em branco
- [ ] Mesclar documentos
- [ ] Dividir documento

## Fase 5 — OCR e documentos escaneados

- [x] Detectar páginas sem texto digital
- [ ] OCR com indicador de confiança
- [ ] Reconstrução editável
- [ ] Substituição ou aproximação de fontes

## Fase 6 — Produto comercial

- [ ] Autenticação
- [ ] Projetos salvos
- [ ] Autosave e recuperação
- [ ] Histórico de versões
- [ ] Planos e limites
- [ ] Armazenamento criptografado
- [ ] Auditoria e exclusão automática

## Requisitos permanentes

- nenhuma chave secreta no frontend ou repositório;
- nenhum PDF enviado ao servidor sem consentimento explícito;
- atualizações feitas em branches e Pull Requests;
- TypeScript, testes e build obrigatórios antes de integrar na `main`;
- suporte prioritário a Android e desktop;
- componentes de interface separados da lógica documental.
