-- ============================================================
-- Migration: Relatórios Anuais 2022 e 2021
-- Data: 2026-05-21
-- Objetivo:
--   1. Inserir "Relatório e Contas 2022" e "Relatório e Contas 2021"
--      (PDFs já hospedados em /public, cada um juntando todos os
--      documentos do respetivo ano).
--   2. Reordenar a secção Relatórios Anuais em ordem cronológica
--      ascendente: 2021, 2022, 2023, 2023, 2024, 2024.
--
-- Notas:
--   - Idempotente — INSERT por file_url só se não existir; os UPDATE
--     de ordem podem ser re-executados sem efeito colateral.
--   - Só toca em institutional_documents (categoria relatorios-anuais).
-- ============================================================

-- 1. Inserir 2021 e 2022
INSERT INTO public.institutional_documents (category, title, description, year, file_url, gated, "order")
SELECT v.category, v.title, v.description, v.year, v.file_url, v.gated, v."order"
FROM (VALUES
  ('relatorios-anuais', 'Relatório e Contas 2021',
     'Relatório de gestão, demonstrações financeiras, parecer do Fiscal Único e relatório de auditoria de 2021.', 2021,
     '/relatorio-contas-2021.pdf', TRUE, 1),
  ('relatorios-anuais', 'Relatório e Contas 2022',
     'Relatório de gestão, demonstrações financeiras e certificação legal das contas de 2022.', 2022,
     '/relatorio-contas-2022.pdf', TRUE, 2)
) AS v(category, title, description, year, file_url, gated, "order")
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutional_documents d WHERE d.file_url = v.file_url
);

-- 2. Reordenar para ficar cronológico (2021 → 2024)
UPDATE public.institutional_documents SET "order" = 1 WHERE file_url = '/relatorio-contas-2021.pdf';
UPDATE public.institutional_documents SET "order" = 2 WHERE file_url = '/relatorio-contas-2022.pdf';
UPDATE public.institutional_documents SET "order" = 3 WHERE file_url = '/relatorio-gestao-2023.pdf';
UPDATE public.institutional_documents SET "order" = 4 WHERE file_url = '/contas-2023.pdf';
UPDATE public.institutional_documents SET "order" = 5 WHERE file_url = '/relatorio-contas-2024.pdf';
UPDATE public.institutional_documents SET "order" = 6 WHERE file_url = '/parecer-conselho-fiscal-2024.pdf';

-- ============================================================
-- FIM
-- ============================================================
