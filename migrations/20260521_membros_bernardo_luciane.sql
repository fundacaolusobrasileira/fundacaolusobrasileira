-- ============================================================
-- Migration: registos de membro para Bernardo Correa de Barros e Luciane Tomé
-- Data: 2026-05-21
-- Objetivo:
--   Criar os registos destes dois Vogais do Conselho de Administração na
--   tabela `partners` (categoria Governança), para que tenham página de
--   perfil (/membro/:id) e fiquem editáveis no Dashboard (foto, bio, etc.),
--   tal como os restantes conselheiros.
--
-- Notas:
--   - Idempotente — só insere se ainda não existir (por name + categoria).
--   - O seed (members.data.ts) também os inclui; o sync casa por nome, sem
--     duplicar. A foto/bio podem ser preenchidas depois no Dashboard.
-- ============================================================

INSERT INTO public.partners (name, type, category, role, tier, summary, "full", active, "order")
SELECT v.name, 'pessoa', 'Governança', 'Vogal', 'vogal', v.summary, v."full", TRUE, v."order"
FROM (VALUES
  ('Bernardo Correa de Barros',
     'Vogal do Conselho de Administração da Fundação Luso-Brasileira.',
     'Bernardo Correa de Barros integra o Conselho de Administração da Fundação Luso-Brasileira na qualidade de Vogal.',
     9),
  ('Luciane Tomé',
     'Vogal do Conselho de Administração da Fundação Luso-Brasileira.',
     'Luciane Tomé integra o Conselho de Administração da Fundação Luso-Brasileira na qualidade de Vogal.',
     10)
) AS v(name, summary, "full", "order")
WHERE NOT EXISTS (
  SELECT 1 FROM public.partners p
  WHERE p.name = v.name AND p.category = 'Governança'
);

-- ============================================================
-- FIM
-- ============================================================
