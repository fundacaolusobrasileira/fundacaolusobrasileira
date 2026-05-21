-- ============================================================
-- Migration: institutional_documents
-- Data: 2026-05-21
-- Objetivo:
--   1. Criar a tabela `institutional_documents` para os documentos da
--      página /documentacao (Estatutos, Relatórios Anuais, Regulamento
--      Interno, Órgãos Sociais), geríveis no Dashboard.
--   2. RLS: leitura pública / escrita+exclusão apenas editores.
--   3. Semear os 4 Relatórios Anuais (arquivos já em /public).
--
-- Notas:
--   - Idempotente — pode rodar mais de uma vez sem duplicar (seed via
--     INSERT ... WHERE NOT EXISTS por file_url).
--   - Reutiliza public.handle_updated_at() e public.is_editor().
--   - O download continua "gated": o site exige nome+email antes de
--     liberar o arquivo (capturado em estatutos_leads, com o nome do
--     documento na coluna `document`).
-- ============================================================


-- ============================================================
-- 1. TABELA
-- ============================================================
CREATE TABLE IF NOT EXISTS public.institutional_documents (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category    TEXT NOT NULL CONSTRAINT institutional_documents_category_valid
                CHECK (category IN ('estatutos', 'relatorios-anuais', 'regulamento-interno', 'orgaos-sociais')),
  title       TEXT NOT NULL CONSTRAINT institutional_documents_title_length
                CHECK (length(trim(title)) >= 2),
  description TEXT,
  year        INTEGER,
  file_url    TEXT NOT NULL,
  gated       BOOLEAN NOT NULL DEFAULT TRUE,   -- exige nome+email para download
  "order"     INTEGER NOT NULL DEFAULT 0,
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS institutional_documents_category_order_idx
  ON public.institutional_documents (category, "order");

CREATE INDEX IF NOT EXISTS institutional_documents_active_idx
  ON public.institutional_documents (active);

CREATE OR REPLACE TRIGGER institutional_documents_updated_at
  BEFORE UPDATE ON public.institutional_documents
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


-- ============================================================
-- 2. RLS
-- ============================================================
ALTER TABLE public.institutional_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "institutional_documents: leitura pública" ON public.institutional_documents;
CREATE POLICY "institutional_documents: leitura pública"
  ON public.institutional_documents FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "institutional_documents: inserção editor" ON public.institutional_documents;
CREATE POLICY "institutional_documents: inserção editor"
  ON public.institutional_documents FOR INSERT
  WITH CHECK (public.is_editor());

DROP POLICY IF EXISTS "institutional_documents: atualização editor" ON public.institutional_documents;
CREATE POLICY "institutional_documents: atualização editor"
  ON public.institutional_documents FOR UPDATE
  USING (public.is_editor())
  WITH CHECK (public.is_editor());

DROP POLICY IF EXISTS "institutional_documents: exclusão editor" ON public.institutional_documents;
CREATE POLICY "institutional_documents: exclusão editor"
  ON public.institutional_documents FOR DELETE
  USING (public.is_editor());


-- ============================================================
-- 3. SEED — Relatórios Anuais (arquivos já hospedados em /public)
-- ============================================================
INSERT INTO public.institutional_documents (category, title, description, year, file_url, gated, "order")
SELECT v.category, v.title, v.description, v.year, v.file_url, v.gated, v."order"
FROM (VALUES
  ('relatorios-anuais', 'Relatório de Gestão 2023',
     'Relatório de gestão e atividades da Fundação (2023).', 2023,
     '/relatorio-gestao-2023.pdf', TRUE, 1),
  ('relatorios-anuais', 'Contas 2023',
     'Demonstrações financeiras e contas do exercício de 2023.', 2023,
     '/contas-2023.pdf', TRUE, 2),
  ('relatorios-anuais', 'Relatório e Contas 2024',
     'Relatório de atividades e demonstrações financeiras de 2024.', 2024,
     '/relatorio-contas-2024.pdf', TRUE, 3),
  ('relatorios-anuais', 'Relatório e Parecer do Conselho Fiscal 2024',
     'Parecer do Conselho Fiscal sobre as contas de 2024.', 2024,
     '/parecer-conselho-fiscal-2024.pdf', TRUE, 4)
) AS v(category, title, description, year, file_url, gated, "order")
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutional_documents d
  WHERE d.file_url = v.file_url
);


-- ============================================================
-- FIM
-- ============================================================
