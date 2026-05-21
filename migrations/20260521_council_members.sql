-- ============================================================
-- Migration: council_members
-- Data: 2026-05-21
-- Objetivo:
--   1. Criar a tabela `council_members` para listar APENAS nomes
--      (não perfis) do Conselho de Curadores e do Conselho Fiscal,
--      editáveis/removíveis no Dashboard do admin.
--   2. Aplicar RLS: leitura pública (página /administracao), escrita
--      e remoção restritas a editores/admin.
--   3. Semear a composição inicial dos dois conselhos.
--
-- Notas:
--   - Tabela ISOLADA. NÃO toca em `partners` nem no Conselho de
--     Administração existente — por isso nomes que já são Vogais
--     (ex.: Tomás Froes, Francisco Teixeira) podem repetir aqui sem
--     conflito, pois exercem mais de uma função.
--   - Idempotente — pode ser executado mais de uma vez sem duplicar
--     (o seed usa INSERT ... WHERE NOT EXISTS por council+name).
--   - Reutiliza as funções já existentes public.handle_updated_at()
--     e public.is_editor().
-- ============================================================


-- ============================================================
-- 1. TABELA: council_members
-- ============================================================
CREATE TABLE IF NOT EXISTS public.council_members (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  council     TEXT NOT NULL CONSTRAINT council_members_council_valid
                CHECK (council IN ('curadores', 'fiscal')),
  name        TEXT NOT NULL CONSTRAINT council_members_name_length
                CHECK (length(trim(name)) >= 2),
  role        TEXT,                                  -- ex.: 'Presidente', 'Vogal' (opcional)
  "order"     INTEGER NOT NULL DEFAULT 0,            -- ordem de exibição manual
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS council_members_council_order_idx
  ON public.council_members (council, "order");

CREATE INDEX IF NOT EXISTS council_members_active_idx
  ON public.council_members (active);

CREATE OR REPLACE TRIGGER council_members_updated_at
  BEFORE UPDATE ON public.council_members
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


-- ============================================================
-- 2. RLS
-- ============================================================
ALTER TABLE public.council_members ENABLE ROW LEVEL SECURITY;

-- Leitura pública: qualquer visitante vê os nomes na página Pessoas
DROP POLICY IF EXISTS "council_members: leitura pública" ON public.council_members;
CREATE POLICY "council_members: leitura pública"
  ON public.council_members FOR SELECT
  USING (true);

-- Inserção: apenas editores e admin
DROP POLICY IF EXISTS "council_members: inserção editor" ON public.council_members;
CREATE POLICY "council_members: inserção editor"
  ON public.council_members FOR INSERT
  WITH CHECK (public.is_editor());

-- Atualização: apenas editores e admin
DROP POLICY IF EXISTS "council_members: atualização editor" ON public.council_members;
CREATE POLICY "council_members: atualização editor"
  ON public.council_members FOR UPDATE
  USING (public.is_editor())
  WITH CHECK (public.is_editor());

-- Exclusão: apenas editores e admin
DROP POLICY IF EXISTS "council_members: exclusão editor" ON public.council_members;
CREATE POLICY "council_members: exclusão editor"
  ON public.council_members FOR DELETE
  USING (public.is_editor());


-- ============================================================
-- 3. SEED — composição inicial (idempotente)
-- ============================================================

-- 3.1 Conselho de Curadores
INSERT INTO public.council_members (council, name, role, "order")
SELECT v.council, v.name, v.role, v."order"
FROM (VALUES
  ('curadores', 'Miguel Horta e Costa',    'Presidente', 1),
  ('curadores', 'Carlos Carreiras',         NULL,        2),
  ('curadores', 'Fernando Maia Cerqueira',  NULL,        3),
  ('curadores', 'Francisco Teixeira',       NULL,        4),
  ('curadores', 'Jorge Rebelo de Almeida',  NULL,        5),
  ('curadores', 'Luís Filipe D’Avila',      NULL,        6),
  ('curadores', 'Maria João Bustorff',      NULL,        7),
  ('curadores', 'Marco Amaral',             NULL,        8),
  ('curadores', 'Mário Assis Ferreira',     NULL,        9),
  ('curadores', 'Miguel Relvas',            NULL,        10),
  ('curadores', 'Miguel Setas',             NULL,        11),
  ('curadores', 'Pedro Matias',             NULL,        12),
  ('curadores', 'Pedro Rebelo de Sousa',    NULL,        13),
  ('curadores', 'Prof. Vítor Gonçalves',    NULL,        14),
  ('curadores', 'Raquel Mendes',            NULL,        15),
  ('curadores', 'Ricardo Pereira',          NULL,        16),
  ('curadores', 'Rui Miguel Nabeiro',       NULL,        17),
  ('curadores', 'Tomás Froes',              NULL,        18)
) AS v(council, name, role, "order")
WHERE NOT EXISTS (
  SELECT 1 FROM public.council_members cm
  WHERE cm.council = v.council AND cm.name = v.name
);

-- 3.2 Conselho Fiscal
INSERT INTO public.council_members (council, name, role, "order")
SELECT v.council, v.name, v.role, v."order"
FROM (VALUES
  ('fiscal', 'Eng.ª Esmeralda Dourado', 'Presidente', 1),
  ('fiscal', 'Eng.º António Bernardo',  'Vogal',      2),
  ('fiscal', 'Dr. Nuno Miranda',        'Vogal',      3)
) AS v(council, name, role, "order")
WHERE NOT EXISTS (
  SELECT 1 FROM public.council_members cm
  WHERE cm.council = v.council AND cm.name = v.name
);


-- ============================================================
-- FIM
-- ============================================================
