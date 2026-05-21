-- ============================================================
-- Migration: corrigir apóstrofo de "Luís Filipe D’Avila"
-- Data: 2026-05-21
-- Objetivo:
--   O seed inicial gravou o nome com apóstrofo reto ("D'Avila").
--   Esta migração atualiza o registro existente para o apóstrofo
--   tipográfico/curvo ("D’Avila"), igual à lista oficial.
--
-- Notas:
--   - Idempotente — após rodar uma vez, a 2ª execução não encontra
--     mais o nome antigo e não faz nada.
--   - Só toca neste único registro do Conselho de Curadores.
-- ============================================================

UPDATE public.council_members
SET name = 'Luís Filipe D’Avila'
WHERE council = 'curadores'
  AND name = 'Luís Filipe D''Avila';

-- ============================================================
-- FIM
-- ============================================================
