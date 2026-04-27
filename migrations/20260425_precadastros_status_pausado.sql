-- Migration: add 'pausado' to precadastros status enum
-- DashboardPage uses 'pausado' to pause outreach without rejecting the lead.

ALTER TABLE public.precadastros
  DROP CONSTRAINT IF EXISTS precadastros_status_check;

ALTER TABLE public.precadastros
  ADD CONSTRAINT precadastros_status_check
  CHECK (status IN ('novo', 'contatado', 'aprovado', 'pausado', 'rejeitado', 'convertido'));
