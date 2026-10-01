-- =====================================================================
-- CORREÇÕES FINAIS — P2 restantes
-- Execute UM BLOCO DE CADA VEZ. Todos têm rollback no fim.
-- =====================================================================


-- #####################################################################
-- BLOCO 1 — Impedir que um perfil NASÇA com papel elevado
-- O trigger que já aplicámos (profiles_guard_role) cobre UPDATE.
-- O INSERT continua sem validar `role`: a policy "profiles: inserção
-- própria" só exige WITH_CHECK = (auth.uid() = user_id).
--
-- Hoje está tapado por ACIDENTE: o handle_new_user cria o perfil no
-- registo e o UNIQUE(user_id) impede um segundo. Funciona por
-- consequência de uma constraint, não por desenho.
--
-- DESENHO DEFENSIVO: só bloqueia a criação COM papel elevado
-- ('admin'/'editor'). Qualquer outro valor passa — assim, seja qual for
-- o papel por omissão que o handle_new_user use ('membro', 'viewer',
-- NULL), o registo de conta nova NÃO parte.
-- #####################################################################

CREATE OR REPLACE FUNCTION public.guard_profile_role_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.role IN ('admin', 'editor') THEN
    IF COALESCE(auth.role(), '') = 'service_role' THEN
      RETURN NEW;
    END IF;
    IF public.is_admin() THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'Criacao de perfil com papel elevado nao permitida.'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_guard_role_insert ON public.profiles;

CREATE TRIGGER profiles_guard_role_insert
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_profile_role_insert();

-- TESTE OBRIGATÓRIO A SEGUIR A ESTE BLOCO:
--   registar uma conta nova pelo formulário público -> TEM de funcionar.
--   Se partir, faça o rollback do Bloco 1 imediatamente e diga-me: quer
--   dizer que o handle_new_user cria o perfil já com papel elevado, e a
--   correcção é outra.


-- #####################################################################
-- BLOCO 2 — Remover `svg` da policy de upload de autenticados
-- SVG é executável: pode conter <script>. Num bucket público é vetor de
-- XSS hospedado num dominio de aparencia confiavel.
-- Hoje está tapado pela whitelist de mimes do bucket (que não inclui
-- image/svg+xml), mas são duas camadas a discordar — se alguém limpar a
-- lista de mimes, o SVG volta.
-- Mesma condição de antes, sem 'svg' e com 'avif' acrescentado.
-- #####################################################################

ALTER POLICY "media: upload autenticados e tipos válidos"
ON storage.objects
WITH CHECK (
  bucket_id = 'media'
  AND auth.role() = 'authenticated'
  AND lower(storage.extension(name)) = ANY (ARRAY[
    'jpg','jpeg','png','gif','webp','avif','mp4','mov','webm','pdf'
  ])
);

-- VERIFICAÇÃO 2
SELECT policyname, with_check
FROM pg_policies
WHERE schemaname='storage' AND tablename='objects'
  AND policyname = 'media: upload autenticados e tipos válidos';


-- #####################################################################
-- BLOCO 3 — Limpar policies duplicadas (cosmético, sem efeito de segurança)
-- Pares redundantes tornam a revisão futura mais difícil e escondem erros.
-- CORRA PRIMEIRO a verificação, para escolher qual de cada par fica.
-- #####################################################################

-- VERIFICAÇÃO 3 (corra isto ANTES de apagar seja o que for)
SELECT schemaname, tablename, cmd, policyname, qual, with_check
FROM pg_policies
WHERE (schemaname='storage' AND tablename='objects')
   OR (schemaname='public'  AND tablename='profiles')
ORDER BY tablename, cmd, policyname;

-- Depois de confirmar que o par tem MESMO a mesma condição, descomente:
-- DROP POLICY IF EXISTS "media: exclusão editores"    ON storage.objects;
-- DROP POLICY IF EXISTS "media: atualização editores" ON storage.objects;
-- DROP POLICY IF EXISTS "profiles: atualização por admin" ON public.profiles;


-- #####################################################################
-- BLOCO 4 — NÃO EXECUTAR HOJE (decisão deliberada)
-- Reaplicar `SET search_path` em is_admin/is_editor/handle_new_user.
--
-- Verifiquei o corpo das três funções: qualificam tudo (public.profiles,
-- auth.uid()), portanto fixar o search_path É seguro em teoria.
--
-- MESMO ASSIM não reaplico hoje: a perda de acesso de admin desta manhã
-- aconteceu logo a seguir a esta alteração e NUNCA foi explicada. Voltar
-- a mexer sem entender a causa é repetir um incidente às cegas.
--
-- Reaplicar só depois de: (a) perceber a causa real do incidente, ou
-- (b) ter um projeto de teste onde isto possa ser validado primeiro.
--
-- ALTER FUNCTION public.is_admin()        SET search_path = public, pg_temp;
-- ALTER FUNCTION public.is_editor()       SET search_path = public, pg_temp;
-- ALTER FUNCTION public.handle_new_user() SET search_path = public, pg_temp;


-- =====================================================================
-- ROLLBACK
-- =====================================================================
-- BLOCO 1:
-- DROP TRIGGER  IF EXISTS profiles_guard_role_insert ON public.profiles;
-- DROP FUNCTION IF EXISTS public.guard_profile_role_insert();
--
-- BLOCO 2 (repõe 'svg'):
-- ALTER POLICY "media: upload autenticados e tipos válidos"
-- ON storage.objects
-- WITH CHECK (
--   bucket_id = 'media'
--   AND auth.role() = 'authenticated'
--   AND lower(storage.extension(name)) = ANY (ARRAY[
--     'jpg','jpeg','png','gif','webp','svg','mp4','mov','webm','pdf'
--   ])
-- );
