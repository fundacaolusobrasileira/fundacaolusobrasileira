-- =====================================================================
-- AUDITORIA FUNDAÇÃO LUSO-BRASILEIRA
-- SQL 1 — DIAGNÓSTICO (100% SOMENTE LEITURA)
-- =====================================================================
--
-- COMO USAR
-- 1. Abra o Supabase Dashboard do projeto DA FUNDAÇÃO (lhgzyrszzbxjjvnxfwzf)
-- 2. SQL Editor > New query
-- 3. Cole UM bloco de cada vez (estão numerados), execute, e envie-me o resultado
-- 4. Pode executar tudo de uma vez, mas o editor só mostra o resultado da
--    última query — por isso é melhor um bloco de cada vez.
--
-- SEGURANÇA: não existe aqui nenhum INSERT, UPDATE, DELETE, DROP, ALTER ou
-- CREATE. Só SELECT sobre catálogos do sistema. Nada é alterado. Nenhuma
-- destas queries lê dados pessoais dos utilizadores — só metadados de schema.
--
-- OBJETIVO: provar o estado REAL da RLS. Hoje a auditoria diz "RLS NÃO
-- PROVADA" porque foi toda derivada de leitura de ficheiros .sql, e existem
-- DUAS árvores de migração divergentes no repositório. Isto resolve isso.
-- =====================================================================


-- ---------------------------------------------------------------------
-- BLOCO 1 — Tabelas existentes e se a RLS está ligada
-- Responde a: as tabelas que o código consulta existem mesmo? Qual delas
-- está com RLS desligada (= aberta a toda a gente com a anon key)?
-- ---------------------------------------------------------------------
SELECT
  c.relname                                   AS tabela,
  c.relrowsecurity                            AS rls_ligada,
  c.relforcerowsecurity                       AS rls_forcada,
  (SELECT count(*) FROM pg_policies p
     WHERE p.schemaname = 'public' AND p.tablename = c.relname) AS n_policies,
  pg_size_pretty(pg_total_relation_size(c.oid))              AS tamanho,
  (SELECT reltuples::bigint FROM pg_class WHERE oid = c.oid)  AS linhas_aprox
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind = 'r'
ORDER BY
  -- primeiro o que é perigoso: RLS desligada, ou ligada sem nenhuma policy
  (c.relrowsecurity IS FALSE) DESC,
  (SELECT count(*) FROM pg_policies p
     WHERE p.schemaname='public' AND p.tablename=c.relname) ASC,
  c.relname;


-- ---------------------------------------------------------------------
-- BLOCO 2 — TODAS as policies, em detalhe  << O BLOCO MAIS IMPORTANTE >>
-- Responde a: qual das duas versões divergentes de `activity_logs` está
-- realmente aplicada? A policy de INSERT em `profiles` valida a coluna
-- `role` (escalada de privilégio) ou não?
-- ---------------------------------------------------------------------
SELECT
  tablename   AS tabela,
  policyname  AS policy,
  cmd         AS comando,
  permissive  AS permissiva,
  roles       AS papeis,
  qual        AS using_expr,
  with_check  AS with_check_expr
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, cmd, policyname;


-- ---------------------------------------------------------------------
-- BLOCO 3 — Storage: buckets e as suas policies
-- Responde a: o bucket `media` é público? Tem limite de tamanho e de tipo
-- de ficheiro? Existe mesmo uma policy que deixa ANÓNIMOS fazer upload?
-- ---------------------------------------------------------------------
SELECT id, name, public, file_size_limit, allowed_mime_types, created_at
FROM storage.buckets
ORDER BY name;

SELECT policyname AS policy, cmd AS comando, roles AS papeis,
       qual AS using_expr, with_check AS with_check_expr
FROM pg_policies
WHERE schemaname = 'storage' AND tablename = 'objects'
ORDER BY cmd, policyname;


-- ---------------------------------------------------------------------
-- BLOCO 4 — Funções SECURITY DEFINER e o seu search_path
-- Responde a: as funções is_admin/is_editor/handle_new_user/hook do JWT
-- têm `SET search_path`? Sem isso são vulneráveis a search_path hijacking.
-- ---------------------------------------------------------------------
SELECT
  p.proname                                   AS funcao,
  CASE WHEN p.prosecdef THEN 'DEFINER' ELSE 'INVOKER' END AS seguranca,
  COALESCE(array_to_string(p.proconfig, ', '), '(NENHUM — RISCO)') AS config,
  pg_get_function_identity_arguments(p.oid)   AS argumentos
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname IN ('public', 'auth')
  AND p.prosecdef              -- só as SECURITY DEFINER
ORDER BY (p.proconfig IS NULL) DESC, p.proname;


-- ---------------------------------------------------------------------
-- BLOCO 5 — Colunas das tabelas do domínio
-- Responde a: o schema real bate certo com o que os services em TypeScript
-- esperam? (ex.: a coluna `phone` em profiles existe mesmo?)
-- ---------------------------------------------------------------------
SELECT table_name AS tabela, ordinal_position AS pos, column_name AS coluna,
       data_type AS tipo, is_nullable AS aceita_null, column_default AS valor_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN (
    'profiles','partners','events','council_members','institutional_documents',
    'estatutos_leads','precadastros','community_media','activity_logs','benefits'
  )
ORDER BY table_name, ordinal_position;


-- ---------------------------------------------------------------------
-- BLOCO 6 — Índices, chaves estrangeiras e constraints
-- Responde a: as colunas usadas em ORDER BY pelos services têm índice?
-- (o bootstrap ordena por created_at, category, order, council)
-- ---------------------------------------------------------------------
SELECT tablename AS tabela, indexname AS indice, indexdef AS definicao
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

SELECT
  tc.table_name       AS tabela,
  tc.constraint_name  AS constraint,
  tc.constraint_type  AS tipo,
  string_agg(kcu.column_name, ', ' ORDER BY kcu.ordinal_position) AS colunas
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.key_column_usage kcu
  ON kcu.constraint_name = tc.constraint_name
 AND kcu.table_schema    = tc.table_schema
WHERE tc.table_schema = 'public'
  AND tc.constraint_type IN ('PRIMARY KEY','FOREIGN KEY','UNIQUE','CHECK')
GROUP BY tc.table_name, tc.constraint_name, tc.constraint_type
ORDER BY tc.table_name, tc.constraint_type;


-- ---------------------------------------------------------------------
-- BLOCO 7 — Triggers
-- ---------------------------------------------------------------------
SELECT event_object_table AS tabela, trigger_name AS trigger,
       action_timing AS quando, event_manipulation AS evento,
       action_statement AS acao
FROM information_schema.triggers
WHERE trigger_schema IN ('public','auth')
ORDER BY event_object_table, trigger_name;


-- ---------------------------------------------------------------------
-- BLOCO 8 — Hook de JWT: está mesmo ativo?
-- A auditoria estática concluiu que NENHUMA policy lê o claim do JWT
-- (todas fazem subquery a `profiles`). Isto confirma se o hook sequer corre.
-- ---------------------------------------------------------------------
SELECT p.proname AS funcao_hook,
       has_function_privilege('supabase_auth_admin', p.oid, 'EXECUTE') AS auth_admin_pode_executar
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE p.proname ILIKE '%access_token%' OR p.proname ILIKE '%custom_claims%';


-- ---------------------------------------------------------------------
-- BLOCO 9 — Distribuição de papéis (SEM dados pessoais)
-- Só contagens. Não devolve emails, nomes nem ids.
-- ---------------------------------------------------------------------
SELECT role AS papel, count(*) AS quantos
FROM public.profiles
GROUP BY role
ORDER BY quantos DESC;

-- Volume das tabelas com dados pessoais (só contagem, para dimensionar LGPD)
SELECT 'precadastros'    AS tabela, count(*) AS registos FROM public.precadastros
UNION ALL SELECT 'estatutos_leads', count(*) FROM public.estatutos_leads
UNION ALL SELECT 'activity_logs',   count(*) FROM public.activity_logs
UNION ALL SELECT 'community_media', count(*) FROM public.community_media;


-- ---------------------------------------------------------------------
-- BLOCO 10 — Migrações que o Supabase CLI julga estarem aplicadas
-- Responde à pergunta central: o repositório tem `migrations/` (11 ficheiros)
-- e `supabase/migrations/` (5 ficheiros) divergentes. O que é que o banco
-- REAL tem registado? Se esta tabela estiver quase vazia, confirma-se que
-- as migrações foram aplicadas à mão no SQL Editor e que o repositório NÃO
-- descreve o estado da produção.
-- ---------------------------------------------------------------------
SELECT version, name, statements IS NOT NULL AS tem_sql
FROM supabase_migrations.schema_migrations
ORDER BY version;
