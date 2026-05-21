-- ============================================================
-- Migration: nomes oficiais dos membros (Conselho Executivo)
-- Data: 2026-05-21
-- Objetivo:
--   Atualizar nome + cargo (e a menção do nome na bio) dos membros
--   na tabela `partners`, para os perfis (/membro/:id) baterem com a
--   composição oficial. O seed (members.data.ts) já foi atualizado;
--   este UPDATE alinha os registos que já existem no banco.
--
-- Notas:
--   - Idempotente — após o rename, o WHERE pelo nome antigo não casa
--     mais e nada acontece numa 2ª execução.
--   - Só toca em registos de Governança.
--   - replace(NULL, ...) devolve NULL — seguro se summary/full vazios.
-- ============================================================

-- Álvaro Covões → Vice-Presidente
UPDATE public.partners SET
  name    = 'Álvaro Ricardo Villaverde Covões Gávea',
  role    = 'Vice-Presidente',
  summary = replace(summary, 'Álvaro Covões', 'Álvaro Ricardo Villaverde Covões Gávea'),
  "full"  = replace("full",  'Álvaro Covões', 'Álvaro Ricardo Villaverde Covões Gávea')
WHERE category = 'Governança' AND name = 'Álvaro Covões';

-- Pedro Ribeiro → Vogal
UPDATE public.partners SET
  name    = 'Pedro Luís Bernardes Ribeiro',
  role    = 'Vogal',
  summary = replace(summary, 'Pedro Ribeiro', 'Pedro Luís Bernardes Ribeiro'),
  "full"  = replace("full",  'Pedro Ribeiro', 'Pedro Luís Bernardes Ribeiro')
WHERE category = 'Governança' AND name = 'Pedro Ribeiro';

-- João Pedro Carvalho → João Carvalho (Secretário-Geral)
UPDATE public.partners SET
  name    = 'João Carvalho',
  role    = 'Secretário-Geral',
  summary = replace(summary, 'João Pedro Carvalho', 'João Carvalho'),
  "full"  = replace("full",  'João Pedro Carvalho', 'João Carvalho')
WHERE category = 'Governança' AND name = 'João Pedro Carvalho';

-- Nuno Fernandes Thomaz → nome completo (Vogal)
UPDATE public.partners SET
  name    = 'Nuno Maria Pinto de Magalhães Fernandes Thomaz',
  summary = replace(summary, 'Nuno Fernandes Thomaz', 'Nuno Maria Pinto de Magalhães Fernandes Thomaz'),
  "full"  = replace("full",  'Nuno Fernandes Thomaz', 'Nuno Maria Pinto de Magalhães Fernandes Thomaz')
WHERE category = 'Governança' AND name = 'Nuno Fernandes Thomaz';

-- ============================================================
-- FIM
-- ============================================================
