-- ============================================================
-- Migration: estatutos_seed
-- Data: 2026-05-25
-- Objetivo:
--   Semear o documento "Estatutos em vigor" na tabela
--   `institutional_documents` (categoria 'estatutos'), de modo que ele
--   passe a ser gerível no Dashboard (editar, substituir o PDF, ocultar,
--   excluir) — exatamente como os Relatórios Anuais.
--
-- Contexto:
--   Até aqui o item "Estatutos em vigor" aparecia na página /documentacao
--   apenas como item ESTÁTICO no código (DocumentacaoPage.tsx → staticDocs),
--   apontando para /Estatutos.pdf. Por não existir linha no banco, ele não
--   aparecia no gestor de documentos do painel e não podia ser editado.
--   Esta migração cria essa linha. A página foi ajustada para mostrar o
--   item estático apenas como fallback (quando o banco não tem Estatutos),
--   evitando duplicação após esta migração rodar.
--
-- Notas:
--   - Idempotente: só insere se ainda não existir um documento na categoria
--     'estatutos' (evita duplicar caso rode mais de uma vez).
--   - O download continua "gated" (gizado: exige nome + email antes de
--     liberar o arquivo, capturado em estatutos_leads).
--   - O arquivo /Estatutos.pdf já está hospedado em /public.
-- ============================================================

INSERT INTO public.institutional_documents (category, title, description, year, file_url, gated, "order")
SELECT v.category, v.title, v.description, v.year, v.file_url, v.gated, v."order"
FROM (VALUES
  ('estatutos', 'Estatutos em vigor',
     'Versão consolidada dos estatutos em vigor da Fundação Luso-Brasileira.', NULL::INTEGER,
     '/Estatutos.pdf', TRUE, 1)
) AS v(category, title, description, year, file_url, gated, "order")
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutional_documents d
  WHERE d.category = 'estatutos'
);

-- ============================================================
-- FIM
-- ============================================================
