-- ============================================================
-- Migration: função "Curador" nos membros do Conselho de Curadores
-- Data: 2026-05-21
-- Objetivo:
--   No seed inicial, apenas o Miguel Horta e Costa recebeu função
--   (Presidente); os demais ficaram sem função (role NULL). Esta
--   migração rotula todos os outros curadores como "Curador", para
--   que cada nome apareça com nome + função na página Pessoas.
--
-- Notas:
--   - Idempotente — só atualiza linhas com role NULL; após rodar uma
--     vez, a 2ª execução não encontra mais nada para alterar.
--   - O Presidente (role já = 'Presidente') não é afetado.
--   - Só toca no Conselho de Curadores.
-- ============================================================

UPDATE public.council_members
SET role = 'Curador'
WHERE council = 'curadores'
  AND role IS NULL;

-- ============================================================
-- FIM
-- ============================================================
