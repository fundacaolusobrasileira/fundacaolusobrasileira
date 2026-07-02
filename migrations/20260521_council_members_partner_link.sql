-- ============================================================
-- Migration: vincular council_members ao partner (fonte da verdade)
-- Data: 2026-05-21
-- Objetivo:
--   Ligar cada membro de conselho ao seu registo em `partners` por ID
--   estável (partner_id). Assim, o nome/cargo/foto/bio editados no perfil
--   (admin) passam a refletir nos cards e listas — mesmo após renomear.
--
-- Notas:
--   - Idempotente — só preenche partner_id quando ainda está vazio.
--   - Liga por nome exato e, para os renomeados, pelo nome antigo.
--   - Quem não tem partner (ex.: maioria dos Curadores e do Fiscal) fica
--     com partner_id NULL e continua a usar o nome guardado na lista.
-- ============================================================

ALTER TABLE public.council_members
  ADD COLUMN IF NOT EXISTS partner_id UUID REFERENCES public.partners(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS council_members_partner_id_idx
  ON public.council_members(partner_id);

-- 1. Vínculo por nome exato (Governança)
UPDATE public.council_members cm
SET partner_id = p.id
FROM public.partners p
WHERE cm.partner_id IS NULL
  AND p.category = 'Governança'
  AND p.name = cm.name;

-- 2. Vínculo por nome antigo (caso o partner ainda não tenha sido renomeado)
UPDATE public.council_members cm SET partner_id = p.id
FROM public.partners p
WHERE cm.partner_id IS NULL AND p.category = 'Governança'
  AND cm.name = 'Álvaro Ricardo Villaverde Covões Gávea' AND p.name = 'Álvaro Covões';

UPDATE public.council_members cm SET partner_id = p.id
FROM public.partners p
WHERE cm.partner_id IS NULL AND p.category = 'Governança'
  AND cm.name = 'Pedro Luís Bernardes Ribeiro' AND p.name = 'Pedro Ribeiro';

UPDATE public.council_members cm SET partner_id = p.id
FROM public.partners p
WHERE cm.partner_id IS NULL AND p.category = 'Governança'
  AND cm.name = 'João Carvalho' AND p.name = 'João Pedro Carvalho';

UPDATE public.council_members cm SET partner_id = p.id
FROM public.partners p
WHERE cm.partner_id IS NULL AND p.category = 'Governança'
  AND cm.name = 'Nuno Maria Pinto de Magalhães Fernandes Thomaz' AND p.name = 'Nuno Fernandes Thomaz';

-- ============================================================
-- FIM
-- ============================================================
