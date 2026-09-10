-- =====================================================================
-- AUDITORIA — QUERY C: texto integral das policies críticas
-- 100% SOMENTE LEITURA. Lê apenas pg_policies (catálogo do sistema).
-- Não devolve nenhum dado pessoal.
-- =====================================================================
--
-- Porquê esta query: a grelha do SQL Editor corta a coluna `detalhe`, e é
-- precisamente no fim das expressões que está a resposta à pergunta que
-- importa — a policy impede um utilizador de mudar o seu próprio `role`
-- para 'admin'? Aqui o texto vem partido em pedaços de 60 caracteres, um
-- por linha, para caber no ecrã sem truncar.
--
-- Cole APENAS isto no editor (apague o resto) e faça Run.
-- Depois envie o screenshot; se forem muitas linhas, role e mande dois.
-- =====================================================================

SELECT
  (tablename || ' » ' || cmd || ' » ' || policyname) AS policy,
  n                                                  AS parte,
  substr(txt, (n - 1) * 60 + 1, 60)                  AS trecho
FROM (
  SELECT
    tablename,
    cmd,
    policyname,
    'USING=' || COALESCE(qual, '(sem)')
      || '  ||  WITH_CHECK=' || COALESCE(with_check, '(sem)') AS txt
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename IN ('profiles', 'activity_logs')
) s
CROSS JOIN generate_series(1, 40) n
WHERE (n - 1) * 60 < length(txt)
ORDER BY policy, parte;
