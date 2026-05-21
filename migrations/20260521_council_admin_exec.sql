-- ============================================================
-- Migration: council_members — Conselho de Administração + Executivo
-- Data: 2026-05-21
-- Objetivo:
--   1. Ampliar o CHECK da coluna `council` para aceitar também
--      'administracao' e 'executivo' (além de 'curadores' e 'fiscal').
--   2. Semear a composição oficial dos dois órgãos, cada nome com a
--      sua FUNÇÃO (role): Presidente, Vice-Presidente, Vogal,
--      Secretário-Geral.
--
-- Notas:
--   - Depende da migração 20260521_council_members.sql (tabela já criada).
--   - Idempotente — pode ser executada mais de uma vez sem duplicar.
--   - NÃO toca em `partners` nem nos cards de perfil existentes.
--   - Nomes podem repetir entre conselhos (ex.: Paulo Campos Costa em
--     Administração e Executivo) — a tabela não tem unique em name.
-- ============================================================


-- ============================================================
-- 1. Ampliar o CHECK de `council`
--    (PostgreSQL não suporta ALTER ... ADD CONSTRAINT IF NOT EXISTS,
--     por isso fazemos DROP IF EXISTS + ADD.)
-- ============================================================
ALTER TABLE public.council_members
  DROP CONSTRAINT IF EXISTS council_members_council_valid;

ALTER TABLE public.council_members
  ADD CONSTRAINT council_members_council_valid
  CHECK (council IN ('curadores', 'fiscal', 'administracao', 'executivo'));


-- ============================================================
-- 2. SEED — Conselho de Administração (idempotente)
-- ============================================================
INSERT INTO public.council_members (council, name, role, "order")
SELECT v.council, v.name, v.role, v."order"
FROM (VALUES
  ('administracao', 'Paulo Campos Costa',                              'Presidente',       1),
  ('administracao', 'Álvaro Ricardo Villaverde Covões Gávea',          'Vice-Presidente',  2),
  ('administracao', 'Nuno Maria Pinto de Magalhães Fernandes Thomaz',  'Vogal',            3),
  ('administracao', 'Bernardo Correa de Barros',                       'Vogal',            4),
  ('administracao', 'Luciane Tomé',                                    'Vogal',            5),
  ('administracao', 'Pedro Luís Bernardes Ribeiro',                    'Vogal',            6),
  ('administracao', 'Fernando Guntovitch',                             'Vogal',            7),
  ('administracao', 'João Carvalho',                                   'Secretário-Geral', 8)
) AS v(council, name, role, "order")
WHERE NOT EXISTS (
  SELECT 1 FROM public.council_members cm
  WHERE cm.council = v.council AND cm.name = v.name
);


-- ============================================================
-- 3. SEED — Conselho Executivo (idempotente)
-- ============================================================
INSERT INTO public.council_members (council, name, role, "order")
SELECT v.council, v.name, v.role, v."order"
FROM (VALUES
  ('executivo', 'Paulo Campos Costa',                              'Presidente',       1),
  ('executivo', 'Álvaro Ricardo Villaverde Covões Gávea',          'Vice-Presidente',  2),
  ('executivo', 'Nuno Maria Pinto de Magalhães Fernandes Thomaz',  'Vogal',            3),
  ('executivo', 'Pedro Luís Bernardes Ribeiro',                    'Vogal',            4),
  ('executivo', 'João Carvalho',                                   'Secretário-Geral', 5)
) AS v(council, name, role, "order")
WHERE NOT EXISTS (
  SELECT 1 FROM public.council_members cm
  WHERE cm.council = v.council AND cm.name = v.name
);


-- ============================================================
-- FIM
-- ============================================================
