-- ============================================================
-- FUNDAÇÃO LUSO-BRASILEIRA — SQL Completo de Segurança
-- Versão: 2026-03-30 (v2 — inclui admin, gestão de utilizadores,
--         submissões autenticadas e constraints de integridade)
-- ============================================================
-- INSTRUÇÕES:
-- 1. Abra o SQL Editor no Supabase Dashboard
-- 2. Cole e execute este arquivo completo (Run All)
-- 3. Este script é idempotente — pode ser executado mais de uma vez
-- ============================================================


-- ============================================================
-- 1. FUNÇÕES DE AUTORIZAÇÃO
-- ============================================================

-- is_editor(): editor OU admin pode editar conteúdo
CREATE OR REPLACE FUNCTION public.is_editor()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid()
      AND role IN ('editor', 'admin')
  );
$$;

-- is_admin(): só admin pode gerir utilizadores e permissões
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid()
      AND role = 'admin'
  );
$$;


-- ============================================================
-- 2. RLS: profiles
-- ============================================================

-- Leitura: próprio perfil ou admin
DROP POLICY IF EXISTS "profiles: leitura própria"   ON public.profiles;
DROP POLICY IF EXISTS "profiles: leitura editores"  ON public.profiles;

CREATE POLICY "profiles: leitura"
  ON public.profiles FOR SELECT
  USING (
    auth.uid() = user_id
    OR public.is_admin()
  );

-- Inserção: trigger automático (SECURITY DEFINER, não precisa de policy extra)
-- Atualização do próprio perfil (nome, email, type)
DROP POLICY IF EXISTS "profiles: atualização própria" ON public.profiles;

CREATE POLICY "profiles: atualização própria"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    -- Não permite alterar o próprio role sem ser admin
    AND (role = (SELECT role FROM public.profiles WHERE user_id = auth.uid()))
    OR public.is_admin()
  );

-- Admin pode atualizar qualquer perfil (inclui mudar role)
DROP POLICY IF EXISTS "profiles: atualização por admin" ON public.profiles;

CREATE POLICY "profiles: atualização por admin"
  ON public.profiles FOR UPDATE
  USING (public.is_admin());


-- ============================================================
-- 3. RLS: partners — só editores/admin escrevem
-- ============================================================

DROP POLICY IF EXISTS "partners: inserção autenticados"    ON public.partners;
DROP POLICY IF EXISTS "partners: atualização autenticados" ON public.partners;
DROP POLICY IF EXISTS "partners: exclusão autenticados"    ON public.partners;
DROP POLICY IF EXISTS "partners: inserção editores"        ON public.partners;
DROP POLICY IF EXISTS "partners: atualização editores"     ON public.partners;
DROP POLICY IF EXISTS "partners: exclusão editores"        ON public.partners;

CREATE POLICY "partners: inserção editores"
  ON public.partners FOR INSERT
  WITH CHECK (public.is_editor());

CREATE POLICY "partners: atualização editores"
  ON public.partners FOR UPDATE
  USING (public.is_editor());

CREATE POLICY "partners: exclusão editores"
  ON public.partners FOR DELETE
  USING (public.is_editor());


-- ============================================================
-- 4. RLS: events — só editores/admin escrevem
-- ============================================================

DROP POLICY IF EXISTS "events: inserção autenticados"    ON public.events;
DROP POLICY IF EXISTS "events: atualização autenticados" ON public.events;
DROP POLICY IF EXISTS "events: exclusão autenticados"    ON public.events;
DROP POLICY IF EXISTS "events: inserção editores"        ON public.events;
DROP POLICY IF EXISTS "events: atualização editores"     ON public.events;
DROP POLICY IF EXISTS "events: exclusão editores"        ON public.events;

CREATE POLICY "events: inserção editores"
  ON public.events FOR INSERT
  WITH CHECK (public.is_editor());

CREATE POLICY "events: atualização editores"
  ON public.events FOR UPDATE
  USING (public.is_editor());

CREATE POLICY "events: exclusão editores"
  ON public.events FOR DELETE
  USING (public.is_editor());


-- ============================================================
-- 5. RLS: precadastros
-- ============================================================

DROP POLICY IF EXISTS "precadastros: atualização autenticados" ON public.precadastros;
DROP POLICY IF EXISTS "precadastros: exclusão autenticados"    ON public.precadastros;
DROP POLICY IF EXISTS "precadastros: atualização editores"     ON public.precadastros;
DROP POLICY IF EXISTS "precadastros: exclusão editores"        ON public.precadastros;
DROP POLICY IF EXISTS "precadastros: leitura autenticados"     ON public.precadastros;
DROP POLICY IF EXISTS "precadastros: inserção pública"         ON public.precadastros;

-- Public insert: anyone can submit a pre-registration (no auth required)
CREATE POLICY "precadastros: inserção pública"
  ON public.precadastros FOR INSERT
  WITH CHECK (true);

CREATE POLICY "precadastros: leitura editores"
  ON public.precadastros FOR SELECT
  USING (public.is_editor());

CREATE POLICY "precadastros: atualização editores"
  ON public.precadastros FOR UPDATE
  USING (public.is_editor());

CREATE POLICY "precadastros: exclusão editores"
  ON public.precadastros FOR DELETE
  USING (public.is_editor());


-- ============================================================
-- 6. RLS: community_media_submissions
-- Submissões agora exigem utilizador autenticado (não anónimo)
-- ============================================================

DROP POLICY IF EXISTS "community_media: inserção pública"       ON public.community_media_submissions;
DROP POLICY IF EXISTS "community_media: leitura autenticados"   ON public.community_media_submissions;
DROP POLICY IF EXISTS "community_media: atualização autenticados" ON public.community_media_submissions;
DROP POLICY IF EXISTS "community_media: exclusão autenticados"  ON public.community_media_submissions;

-- Inserção: apenas utilizadores autenticados (requer conta)
CREATE POLICY "community_media: inserção autenticados"
  ON public.community_media_submissions FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND auth.uid() IS NOT NULL
  );

-- Leitura do próprio envio OU admin/editor para aprovação
CREATE POLICY "community_media: leitura"
  ON public.community_media_submissions FOR SELECT
  USING (
    user_id = auth.uid()
    OR public.is_editor()
  );

-- Aprovação/rejeição: só editores/admin
CREATE POLICY "community_media: atualização editores"
  ON public.community_media_submissions FOR UPDATE
  USING (public.is_editor());

CREATE POLICY "community_media: exclusão editores"
  ON public.community_media_submissions FOR DELETE
  USING (public.is_editor());


-- ============================================================
-- 7. ADICIONAR user_id À TABELA community_media_submissions
-- Liga cada submissão ao utilizador que a enviou
-- ============================================================

ALTER TABLE public.community_media_submissions
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS community_media_user_id_idx
  ON public.community_media_submissions (user_id);


-- ============================================================
-- 8. CONSTRAINTS DE INTEGRIDADE — partners
-- ============================================================

ALTER TABLE public.partners
  ADD CONSTRAINT IF NOT EXISTS partners_name_length
  CHECK (length(trim(name)) >= 2);

ALTER TABLE public.partners
  ADD CONSTRAINT IF NOT EXISTS partners_type_check
  CHECK (type IN ('pessoa', 'empresa'));

ALTER TABLE public.partners
  ADD CONSTRAINT IF NOT EXISTS partners_category_check
  CHECK (category IN (
    'Parceiro Platinum', 'Parceiro Gold', 'Parceiro Silver',
    'Apoio Público', 'Outro Apoio', 'Exposição', 'Governança'
  ));


-- ============================================================
-- 9. CONSTRAINTS DE INTEGRIDADE — events
-- ============================================================

ALTER TABLE public.events
  ADD CONSTRAINT IF NOT EXISTS events_title_length
  CHECK (length(trim(title)) >= 2);

ALTER TABLE public.events
  ADD CONSTRAINT IF NOT EXISTS events_status_check
  CHECK (status IN ('draft', 'published'));

ALTER TABLE public.events
  ADD CONSTRAINT IF NOT EXISTS events_category_check
  CHECK (category IN ('33 Anos', 'Fundação', 'Embaixada', 'Outros'));


-- ============================================================
-- 10. CONSTRAINTS DE INTEGRIDADE — precadastros
-- ============================================================

ALTER TABLE public.precadastros
  ADD CONSTRAINT IF NOT EXISTS precadastros_email_format
  CHECK (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$');

ALTER TABLE public.precadastros
  ADD CONSTRAINT IF NOT EXISTS precadastros_name_length
  CHECK (length(trim(name)) >= 2);

ALTER TABLE public.precadastros
  ADD CONSTRAINT IF NOT EXISTS precadastros_status_check
  CHECK (status IN ('novo', 'contatado', 'aprovado', 'rejeitado', 'convertido'));

ALTER TABLE public.precadastros
  ADD CONSTRAINT IF NOT EXISTS precadastros_registration_type_check
  CHECK (
    "registrationType" IS NULL
    OR "registrationType" IN ('membro', 'parceiro', 'colaborador', 'embaixador')
  );


-- ============================================================
-- 11. CONSTRAINTS DE INTEGRIDADE — community_media_submissions
-- ============================================================

ALTER TABLE public.community_media_submissions
  ADD CONSTRAINT IF NOT EXISTS community_media_email_format
  CHECK (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$');

ALTER TABLE public.community_media_submissions
  ADD CONSTRAINT IF NOT EXISTS community_media_author_name_length
  CHECK (length(trim(author_name)) >= 2);

ALTER TABLE public.community_media_submissions
  ADD CONSTRAINT IF NOT EXISTS community_media_type_check
  CHECK (type IN ('image', 'video'));

ALTER TABLE public.community_media_submissions
  ADD CONSTRAINT IF NOT EXISTS community_media_status_check
  CHECK (status IN ('pending', 'approved', 'rejected'));

ALTER TABLE public.community_media_submissions
  ADD CONSTRAINT IF NOT EXISTS community_media_url_not_empty
  CHECK (length(trim(url)) > 0);


-- ============================================================
-- 12. ÍNDICES ADICIONAIS
-- ============================================================

CREATE INDEX IF NOT EXISTS precadastros_email_created_at_idx
  ON public.precadastros (email, created_at DESC);


-- ============================================================
-- 13. STORAGE: restringir upload a tipos de arquivo válidos
-- ============================================================

DROP POLICY IF EXISTS "media: upload autenticados"              ON storage.objects;
DROP POLICY IF EXISTS "media: upload editores e tipos válidos"  ON storage.objects;

CREATE POLICY "media: upload autenticados e tipos válidos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'media'
    AND auth.role() = 'authenticated'
    AND lower(storage.extension(name)) IN (
      'jpg', 'jpeg', 'png', 'gif', 'webp', 'svg',
      'mp4', 'mov', 'webm', 'pdf'
    )
  );

-- Atualização e exclusão só por editores
DROP POLICY IF EXISTS "media: atualização autenticados" ON storage.objects;
DROP POLICY IF EXISTS "media: exclusão autenticados"    ON storage.objects;

CREATE POLICY "media: atualização editores"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'media' AND public.is_editor());

CREATE POLICY "media: exclusão editores"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'media' AND public.is_editor());


-- ============================================================
-- 14. PROFILES: garantir que role só tem valores válidos
-- ============================================================

ALTER TABLE public.profiles
  ADD CONSTRAINT IF NOT EXISTS profiles_role_check
  CHECK (role IN ('membro', 'editor', 'admin'));


-- ============================================================
-- FIM DO SCRIPT
-- ============================================================
-- PASSOS MANUAIS APÓS EXECUTAR:
--
-- A) CRIAR O UTILIZADOR ADMIN (você):
--    1. Authentication > Users > "Invite user" com o seu email
--    2. Na tabela profiles, mude o role para 'admin':
--       UPDATE public.profiles SET role = 'admin'
--       WHERE email = 'seu@email.com';
--
-- B) CRIAR O UTILIZADOR PAULO CAMPOS:
--    1. Authentication > Users > "Invite user" com o email de Paulo
--    2. Na tabela profiles, mude o role para 'admin' (pode gerir utilizadores)
--       ou 'editor' (só edita conteúdo):
--       UPDATE public.profiles SET role = 'admin'
--       WHERE email = 'paulo@email.com';
--
-- C) GERIR OUTROS MEMBROS:
--    - No Dashboard da plataforma (botão "Utilizadores", visível só para admin)
--    - Selecione o role de cada utilizador: Membro / Editor / Admin
--
-- D) RATE LIMITING (Authentication > Settings > Rate Limits):
--    - Sign ups:          10 / hora por IP
--    - Password recovery:  3 / hora por IP
--    - OTP:               30 / hora por IP
-- ============================================================
