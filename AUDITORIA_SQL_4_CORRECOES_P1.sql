-- =====================================================================
-- CORREÇÕES P1 — BUCKET media, activity_logs, search_path
-- =====================================================================
-- Execute UM BLOCO DE CADA VEZ. Depois de cada bloco, corra a verificação
-- que vem logo a seguir e diga-me o resultado antes de avançar.
-- Cada bloco tem rollback próprio no fim do ficheiro.
--
-- CONTEXTO: o upload anónimo no bucket `media` NÃO é um bug — é a página
-- pública de colaboração em eventos. Por isso restringimos, não removemos.
-- =====================================================================


-- #####################################################################
-- BLOCO 1 — LIMITES NO BUCKET media
-- Hoje: publico=true, limite_tamanho=NULL, mimes=NULL (tudo permitido).
-- Qualquer pessoa envia qualquer ficheiro, de qualquer tamanho.
-- #####################################################################

UPDATE storage.buckets
SET
  file_size_limit    = 52428800,   -- 50 MB (cobre video; a app ja limita capa a 5 MB)
  allowed_mime_types = ARRAY[
    'image/jpeg','image/png','image/webp','image/gif','image/avif',
    'video/mp4','video/webm','video/quicktime',
    'application/pdf'              -- documentos institucionais
  ]
WHERE id = 'media';

-- VERIFICAÇÃO 1
SELECT id, public, file_size_limit, allowed_mime_types
FROM storage.buckets WHERE id = 'media';

-- TESTE MANUAL 1 (faça na app, depois deste bloco):
--   a) dashboard: carregar uma imagem de capa num evento  -> deve FUNCIONAR
--   b) dashboard: carregar um PDF em Documentação          -> deve FUNCIONAR
--   c) pagina publica de colaborar num evento: enviar foto -> deve FUNCIONAR
-- Se algum falhar, o mime respetivo falta na lista acima. Diga-me qual.


-- #####################################################################
-- BLOCO 2 — RESTRINGIR O UPLOAD ANÓNIMO A community/ E A FORMATOS VÁLIDOS
-- Hoje a policy anonima nao tem restricao de pasta nem de extensao, e como
-- policies permissivas sao OR'd, ela anula a whitelist da policy dos
-- autenticados.
-- #####################################################################

DROP POLICY IF EXISTS "media: upload comunidade anónimo" ON storage.objects;

CREATE POLICY "media: upload comunidade anonimo (restrito)"
ON storage.objects
FOR INSERT
TO anon
WITH CHECK (
  bucket_id = 'media'
  AND (storage.foldername(name))[1] = 'community'
  AND lower(storage.extension(name)) IN
      ('jpg','jpeg','png','webp','gif','avif','mp4','webm','mov')
);

-- VERIFICAÇÃO 2
SELECT policyname, cmd, roles, with_check
FROM pg_policies
WHERE schemaname = 'storage' AND tablename = 'objects' AND cmd = 'INSERT'
ORDER BY policyname;

-- TESTE MANUAL 2:
--   pagina publica de colaborar num evento: enviar uma foto -> deve FUNCIONAR
-- Se falhar, o codigo pode estar a gravar noutra pasta que nao `community/`.
-- Nesse caso diga-me e eu ajusto o prefixo em vez de forcar o codigo.


-- #####################################################################
-- BLOCO 3 — activity_logs: fechar leitura e impedir falsificação
-- Hoje: SELECT e INSERT com USING/WITH_CHECK = (auth.role() = 'authenticated').
-- Qualquer autenticado le os 1512 registos (contem emails de pre-cadastro)
-- e insere linhas em nome de quem quiser.
--
-- NOTA: o INSERT anonimo ja falha hoje. Este bloco NAO piora isso — apenas
-- deixa de aceitar linhas forjadas por utilizadores autenticados.
-- #####################################################################

DROP POLICY IF EXISTS "activity_logs: read for authenticated"   ON public.activity_logs;
DROP POLICY IF EXISTS "activity_logs: insert for authenticated" ON public.activity_logs;

CREATE POLICY "activity_logs: leitura editores"
ON public.activity_logs
FOR SELECT
TO authenticated
USING (public.is_editor() OR public.is_admin());

CREATE POLICY "activity_logs: insercao propria"
ON public.activity_logs
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- VERIFICAÇÃO 3
SELECT policyname, cmd, roles, qual AS using_expr, with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'activity_logs'
ORDER BY cmd, policyname;

-- TESTE MANUAL 3:
--   a) admin abre o painel e ve o registo de atividade      -> deve FUNCIONAR
--   b) admin cria/edita um evento e a acao aparece no log   -> deve FUNCIONAR
--   c) o unico membro (nao editor) NAO deve conseguir ler o log
-- Se (a) ou (b) falhar, e sinal de que is_editor() nao cobre admin.
-- Diga-me e eu troco por uma condicao explicita sobre a coluna role.


-- #####################################################################
-- BLOCO 4 — search_path fixo nas funções de autorização
-- is_admin() e is_editor() sao SECURITY DEFINER e sao chamadas por quase
-- todas as policies de escrita. Sem search_path fixo sao vulneraveis a
-- search_path hijacking (lint `function_search_path_mutable` do Supabase).
-- ALTER FUNCTION ... SET search_path preserva o corpo: nao reescreve nada.
-- #####################################################################

ALTER FUNCTION public.is_admin()        SET search_path = public, pg_temp;
ALTER FUNCTION public.is_editor()       SET search_path = public, pg_temp;
ALTER FUNCTION public.handle_new_user() SET search_path = public, pg_temp;

-- VERIFICAÇÃO 4  (as tres devem deixar de dizer "SEM search_path")
SELECT p.proname,
       COALESCE(array_to_string(p.proconfig, ', '), '*** SEM search_path ***') AS config
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.prosecdef
ORDER BY p.proname;

-- TESTE MANUAL 4:
--   a) login como admin, abrir o dashboard        -> deve FUNCIONAR
--   b) criar um registo qualquer (evento/membro)  -> deve FUNCIONAR
--   c) registar uma conta nova pelo formulario    -> deve FUNCIONAR (handle_new_user)


-- #####################################################################
-- BLOCO 5 — limpar policies duplicadas (opcional, cosmético)
-- Existem pares redundantes: "editor"/"editores" em storage, e duas UPDATE
-- de admin em profiles. Nao sao falha de seguranca — sao ruido que torna a
-- revisao futura mais dificil. So execute depois dos blocos 1-4 validados.
-- #####################################################################

-- DROP POLICY IF EXISTS "media: exclusão editores"   ON storage.objects;
-- DROP POLICY IF EXISTS "media: atualização editores" ON storage.objects;
-- DROP POLICY IF EXISTS "profiles: atualização por admin" ON public.profiles;
--
-- Deixei comentado de proposito: confirme primeiro qual de cada par tem a
-- condicao mais correta, com a VERIFICACAO abaixo, antes de apagar.
-- SELECT policyname, cmd, qual, with_check FROM pg_policies
-- WHERE (schemaname='storage' AND tablename='objects')
--    OR (schemaname='public'  AND tablename='profiles')
-- ORDER BY tablename, cmd, policyname;


-- =====================================================================
-- ROLLBACK
-- =====================================================================
-- BLOCO 1:
-- UPDATE storage.buckets SET file_size_limit = NULL, allowed_mime_types = NULL
-- WHERE id = 'media';
--
-- BLOCO 2:
-- DROP POLICY IF EXISTS "media: upload comunidade anonimo (restrito)" ON storage.objects;
-- CREATE POLICY "media: upload comunidade anónimo" ON storage.objects
--   FOR INSERT TO anon WITH CHECK (bucket_id = 'media');
--
-- BLOCO 3:
-- DROP POLICY IF EXISTS "activity_logs: leitura editores"  ON public.activity_logs;
-- DROP POLICY IF EXISTS "activity_logs: insercao propria"  ON public.activity_logs;
-- CREATE POLICY "activity_logs: read for authenticated" ON public.activity_logs
--   FOR SELECT TO authenticated USING (auth.role() = 'authenticated');
-- CREATE POLICY "activity_logs: insert for authenticated" ON public.activity_logs
--   FOR INSERT TO authenticated WITH CHECK (auth.role() = 'authenticated');
--
-- BLOCO 4:
-- ALTER FUNCTION public.is_admin()        RESET search_path;
-- ALTER FUNCTION public.is_editor()       RESET search_path;
-- ALTER FUNCTION public.handle_new_user() RESET search_path;
