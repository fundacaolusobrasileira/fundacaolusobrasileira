-- =====================================================================
-- AUDITORIA FUNDAÇÃO LUSO-BRASILEIRA — DIAGNÓSTICO RLS
-- 100% SOMENTE LEITURA. Nenhum INSERT/UPDATE/DELETE/ALTER/CREATE/DROP.
-- =====================================================================
--
-- COMO USAR
-- O SQL Editor só mostra o resultado da ÚLTIMA query executada.
-- Por isso: execute UMA query de cada vez (selecione o bloco e Ctrl+Enter).
--
-- Depois de cada uma: botão "Export" > "Download CSV", e guarde os ficheiros
-- na pasta do projeto (C:\Users\sslaw\fundacaolusobrasileira\) com os nomes:
--   rls-A.csv   e   rls-B.csv
-- Assim leio-os diretamente, sem depender de screenshots.
--
-- NOTA: só lê catálogos do sistema (pg_class, pg_policies, storage.buckets,
-- pg_proc). Não toca em nenhuma tabela de dados, por isso não falha se uma
-- tabela do domínio não existir — que foi o que aconteceu com community_media.
-- =====================================================================


-- ---------------------------------------------------------------------
-- QUERY A  >>> execute esta primeiro, exporte como rls-A.csv
-- Devolve numa só tabela: tabelas + RLS, todas as policies, buckets de
-- storage, policies de storage e funções SECURITY DEFINER.
-- ---------------------------------------------------------------------
WITH tabelas AS (
  SELECT
    'A_TABELA' AS secao,
    c.relname::text AS item,
    'rls_ligada=' || c.relrowsecurity::text
      || ' | n_policies=' || (SELECT count(*) FROM pg_policies p
                              WHERE p.schemaname = 'public' AND p.tablename = c.relname)::text
      || ' | linhas_aprox=' || c.reltuples::bigint::text AS detalhe
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind = 'r'
),
policies AS (
  SELECT
    'B_POLICY' AS secao,
    (tablename || ' » ' || cmd || ' » ' || policyname)::text AS item,
    'papeis=' || array_to_string(roles, ',')
      || ' | permissiva=' || permissive
      || ' | USING=' || COALESCE(qual, '(sem)')
      || ' | WITH_CHECK=' || COALESCE(with_check, '(sem)') AS detalhe
  FROM pg_policies
  WHERE schemaname = 'public'
),
buckets AS (
  SELECT
    'C_BUCKET' AS secao,
    b.id::text AS item,
    'publico=' || b.public::text
      || ' | limite_tamanho=' || COALESCE(b.file_size_limit::text, 'NULL (sem limite)')
      || ' | mimes=' || COALESCE(array_to_string(b.allowed_mime_types, ','), 'NULL (todos)') AS detalhe
  FROM storage.buckets b
),
storage_policies AS (
  SELECT
    'D_STORAGE_POLICY' AS secao,
    (cmd || ' » ' || policyname)::text AS item,
    'papeis=' || array_to_string(roles, ',')
      || ' | USING=' || COALESCE(qual, '(sem)')
      || ' | WITH_CHECK=' || COALESCE(with_check, '(sem)') AS detalhe
  FROM pg_policies
  WHERE schemaname = 'storage' AND tablename = 'objects'
),
definers AS (
  SELECT
    'E_SECURITY_DEFINER' AS secao,
    (n.nspname || '.' || p.proname)::text AS item,
    COALESCE(array_to_string(p.proconfig, ', '), '*** SEM search_path — RISCO ***') AS detalhe
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname IN ('public', 'auth') AND p.prosecdef
)
SELECT * FROM tabelas
UNION ALL SELECT * FROM policies
UNION ALL SELECT * FROM buckets
UNION ALL SELECT * FROM storage_policies
UNION ALL SELECT * FROM definers
ORDER BY secao, item;


-- ---------------------------------------------------------------------
-- QUERY B  >>> execute depois, exporte como rls-B.csv
-- Migrações que o Supabase CLI julga estarem aplicadas.
-- Separada porque o schema `supabase_migrations` pode não existir; se der
-- erro "schema does not exist", isso É a resposta (nenhuma migração foi
-- aplicada via CLI — logo o repositório não descreve o estado da produção).
-- ---------------------------------------------------------------------
SELECT version, name, (statements IS NOT NULL) AS tem_sql
FROM supabase_migrations.schema_migrations
ORDER BY version;
