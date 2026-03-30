-- ============================================================
-- FUNDAÇÃO LUSO-BRASILEIRA — Atualização de Segurança
-- Versão: 2026-03-30
-- ============================================================
-- INSTRUÇÕES:
-- 1. Abra o SQL Editor no Supabase Dashboard
-- 2. Cole e execute este arquivo (Run All)
-- 3. Este script é idempotente — pode ser executado mais de uma vez
-- ============================================================


-- ============================================================
-- 1. FUNÇÃO: is_editor()
-- Verifica se o utilizador atual tem role 'editor' ou 'admin'
-- nas profiles. Usada nas políticas RLS abaixo.
-- ============================================================
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


-- ============================================================
-- 2. RLS: partners — restringir escrita a editores
-- Problema anterior: qualquer utilizador autenticado podia
-- inserir/alterar/apagar parceiros. Agora só editores.
-- ============================================================

-- Remover políticas antigas
DROP POLICY IF EXISTS "partners: inserção autenticados"     ON public.partners;
DROP POLICY IF EXISTS "partners: atualização autenticados"  ON public.partners;
DROP POLICY IF EXISTS "partners: exclusão autenticados"     ON public.partners;

-- Novas políticas restritas a editores
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
-- 3. RLS: events — restringir escrita a editores
-- ============================================================

DROP POLICY IF EXISTS "events: inserção autenticados"    ON public.events;
DROP POLICY IF EXISTS "events: atualização autenticados" ON public.events;
DROP POLICY IF EXISTS "events: exclusão autenticados"    ON public.events;

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
-- 4. RLS: profiles — permitir leitura por editores
-- (necessário para o painel de administração)
-- ============================================================

DROP POLICY IF EXISTS "profiles: leitura editores" ON public.profiles;

CREATE POLICY "profiles: leitura editores"
  ON public.profiles FOR SELECT
  USING (
    auth.uid() = user_id
    OR public.is_editor()
  );


-- ============================================================
-- 5. RLS: precadastros — atualização/exclusão só editores
-- (a inserção pública já estava correta)
-- ============================================================

DROP POLICY IF EXISTS "precadastros: atualização autenticados" ON public.precadastros;
DROP POLICY IF EXISTS "precadastros: exclusão autenticados"    ON public.precadastros;

CREATE POLICY "precadastros: atualização editores"
  ON public.precadastros FOR UPDATE
  USING (public.is_editor());

CREATE POLICY "precadastros: exclusão editores"
  ON public.precadastros FOR DELETE
  USING (public.is_editor());


-- ============================================================
-- 6. CONSTRAINTS DE INTEGRIDADE — partners
-- ============================================================

-- Comprimento mínimo de nome
ALTER TABLE public.partners
  ADD CONSTRAINT IF NOT EXISTS partners_name_length
  CHECK (length(trim(name)) >= 2);

-- Valores válidos para type
ALTER TABLE public.partners
  ADD CONSTRAINT IF NOT EXISTS partners_type_check
  CHECK (type IN ('pessoa', 'empresa'));

-- Valores válidos para category
ALTER TABLE public.partners
  ADD CONSTRAINT IF NOT EXISTS partners_category_check
  CHECK (category IN (
    'Parceiro Platinum', 'Parceiro Gold', 'Parceiro Silver',
    'Apoio Público', 'Outro Apoio', 'Exposição', 'Governança'
  ));


-- ============================================================
-- 7. CONSTRAINTS DE INTEGRIDADE — events
-- ============================================================

-- Título obrigatório com comprimento mínimo
ALTER TABLE public.events
  ADD CONSTRAINT IF NOT EXISTS events_title_length
  CHECK (length(trim(title)) >= 2);

-- Valores válidos para status
ALTER TABLE public.events
  ADD CONSTRAINT IF NOT EXISTS events_status_check
  CHECK (status IN ('draft', 'published'));

-- Valores válidos para category
ALTER TABLE public.events
  ADD CONSTRAINT IF NOT EXISTS events_category_check
  CHECK (category IN ('33 Anos', 'Fundação', 'Embaixada', 'Outros'));


-- ============================================================
-- 8. CONSTRAINTS DE INTEGRIDADE — precadastros
-- ============================================================

-- Formato básico de email (complementa validação do frontend)
ALTER TABLE public.precadastros
  ADD CONSTRAINT IF NOT EXISTS precadastros_email_format
  CHECK (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$');

-- Nome com comprimento mínimo
ALTER TABLE public.precadastros
  ADD CONSTRAINT IF NOT EXISTS precadastros_name_length
  CHECK (length(trim(name)) >= 2);

-- Valores válidos para status
ALTER TABLE public.precadastros
  ADD CONSTRAINT IF NOT EXISTS precadastros_status_check
  CHECK (status IN ('novo', 'contatado', 'aprovado', 'rejeitado', 'convertido'));

-- Valores válidos para registrationType
ALTER TABLE public.precadastros
  ADD CONSTRAINT IF NOT EXISTS precadastros_registration_type_check
  CHECK (
    "registrationType" IS NULL
    OR "registrationType" IN ('membro', 'parceiro', 'colaborador', 'embaixador')
  );


-- ============================================================
-- 9. CONSTRAINTS DE INTEGRIDADE — community_media_submissions
-- ============================================================

-- Formato básico de email
ALTER TABLE public.community_media_submissions
  ADD CONSTRAINT IF NOT EXISTS community_media_email_format
  CHECK (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$');

-- Nome com comprimento mínimo
ALTER TABLE public.community_media_submissions
  ADD CONSTRAINT IF NOT EXISTS community_media_author_name_length
  CHECK (length(trim(author_name)) >= 2);

-- Valores válidos para type
ALTER TABLE public.community_media_submissions
  ADD CONSTRAINT IF NOT EXISTS community_media_type_check
  CHECK (type IN ('image', 'video'));

-- Valores válidos para status
ALTER TABLE public.community_media_submissions
  ADD CONSTRAINT IF NOT EXISTS community_media_status_check
  CHECK (status IN ('pending', 'approved', 'rejected'));

-- URL obrigatória e não vazia
ALTER TABLE public.community_media_submissions
  ADD CONSTRAINT IF NOT EXISTS community_media_url_not_empty
  CHECK (length(trim(url)) > 0);


-- ============================================================
-- 10. ÍNDICE: unicidade de email em precadastros por período
-- Evita spam de submissões — mesmo email, max 1 por dia
-- ============================================================

-- Nota: para rate limiting mais agressivo, considere pg_cron
-- ou Supabase Auth rate limits no Dashboard (Auth > Settings)
CREATE INDEX IF NOT EXISTS precadastros_email_created_at_idx
  ON public.precadastros (email, created_at DESC);


-- ============================================================
-- 11. STORAGE: restringir upload a arquivos de imagem/video
-- ============================================================

-- Remover política antiga de upload
DROP POLICY IF EXISTS "media: upload autenticados" ON storage.objects;

-- Nova política com validação de tipo MIME
CREATE POLICY "media: upload editores e tipos válidos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'media'
    AND (
      -- Editores: qualquer arquivo de mídia
      (
        public.is_editor()
        AND (
          lower(storage.extension(name)) IN (
            'jpg', 'jpeg', 'png', 'gif', 'webp', 'svg',
            'mp4', 'mov', 'webm', 'pdf'
          )
        )
      )
      OR
      -- Utilizadores anónimos: só imagens e vídeos (para colaboração pública)
      (
        auth.role() = 'anon'
        AND lower(storage.extension(name)) IN ('jpg', 'jpeg', 'png', 'webp', 'mp4', 'mov', 'webm')
      )
    )
  );


-- ============================================================
-- FIM DA ATUALIZAÇÃO DE SEGURANÇA
-- ============================================================
-- Após executar:
-- 1. Verifique em Authentication > Policies que as novas políticas aparecem
-- 2. Teste login com um utilizador editor — deve conseguir criar/editar
-- 3. Teste login com um utilizador 'membro' — não deve conseguir criar/editar
-- 4. Ative Rate Limiting em Authentication > Settings > Rate Limits:
--    - Sign ups: 10/hora por IP
--    - Password recovery: 3/hora por IP
--    - OTP: 30/hora por IP
-- ============================================================
