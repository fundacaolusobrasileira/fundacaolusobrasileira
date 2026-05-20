-- ============================================================
-- Migration: estatutos_leads
-- Data: 2026-05-19
-- Objetivo:
--   1. Criar a tabela `estatutos_leads` para capturar nome + email
--      dos visitantes que pedem download dos Estatutos em /documentacao.
--   2. Aplicar RLS: inserção pública (formulário do site), leitura e
--      remoção restritas a editores/admin.
--   3. Constraints básicas de integridade (nome com 2+ chars, email válido).
--
-- Notas:
--   - Idempotente — pode ser executado mais de uma vez sem erro.
--   - Não toca em nenhuma outra tabela.
--   - As CHECK constraints estão inline no CREATE TABLE porque o PostgreSQL
--     não suporta `ALTER TABLE ... ADD CONSTRAINT IF NOT EXISTS`.
--   - Os Conselhos Fiscal e de Curadores reutilizam a coluna `partners.tier`
--     (já é TEXT sem CHECK constraint), aceitando os novos valores
--     'conselho-fiscal' e 'conselho-curadores' sem migração de schema.
-- ============================================================


-- ============================================================
-- 1. TABELA: estatutos_leads (com CHECK constraints inline)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.estatutos_leads (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL CONSTRAINT estatutos_leads_name_length
                CHECK (length(trim(name)) >= 2),
  email       TEXT NOT NULL CONSTRAINT estatutos_leads_email_format
                CHECK (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  document    TEXT NOT NULL DEFAULT 'estatutos',
  user_agent  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS estatutos_leads_created_at_idx
  ON public.estatutos_leads (created_at DESC);

CREATE INDEX IF NOT EXISTS estatutos_leads_email_idx
  ON public.estatutos_leads (email);


-- ============================================================
-- 2. RLS
-- ============================================================
ALTER TABLE public.estatutos_leads ENABLE ROW LEVEL SECURITY;

-- Inserção pública: qualquer visitante pode submeter o formulário de download
DROP POLICY IF EXISTS "estatutos_leads: inserção pública" ON public.estatutos_leads;
CREATE POLICY "estatutos_leads: inserção pública"
  ON public.estatutos_leads FOR INSERT
  WITH CHECK (true);

-- Leitura: apenas editores e admin (usado pelo Dashboard)
DROP POLICY IF EXISTS "estatutos_leads: leitura editores" ON public.estatutos_leads;
CREATE POLICY "estatutos_leads: leitura editores"
  ON public.estatutos_leads FOR SELECT
  USING (public.is_editor());

-- Exclusão: apenas editores e admin
DROP POLICY IF EXISTS "estatutos_leads: exclusão editores" ON public.estatutos_leads;
CREATE POLICY "estatutos_leads: exclusão editores"
  ON public.estatutos_leads FOR DELETE
  USING (public.is_editor());


-- ============================================================
-- FIM
-- ============================================================
