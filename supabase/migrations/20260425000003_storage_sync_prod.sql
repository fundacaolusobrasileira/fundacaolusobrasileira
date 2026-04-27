-- Migration: sync storage bucket and policies with production
-- Production bucket: media (public, no size limit, no MIME restriction)
-- Production policies: public read, authenticated upload (with type check),
--   anonymous upload to community/ prefix, editor upload, editor update/delete.

-- ============================================================
-- 1. BUCKET: media
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('media', 'media', true, null, null)
ON CONFLICT (id) DO UPDATE
  SET public             = EXCLUDED.public,
      file_size_limit    = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;


-- ============================================================
-- 2. STORAGE POLICIES — drop all variants before recreating
-- ============================================================

DROP POLICY IF EXISTS "media: leitura pública"                       ON storage.objects;
DROP POLICY IF EXISTS "media: upload autenticados e tipos válidos"   ON storage.objects;
DROP POLICY IF EXISTS "media: upload autenticados"                   ON storage.objects;
DROP POLICY IF EXISTS "media: upload editores e tipos válidos"       ON storage.objects;
DROP POLICY IF EXISTS "media: upload comunidade anónimo"             ON storage.objects;
DROP POLICY IF EXISTS "media: upload editor"                         ON storage.objects;
DROP POLICY IF EXISTS "media: atualização editor"                    ON storage.objects;
DROP POLICY IF EXISTS "media: atualização editores"                  ON storage.objects;
DROP POLICY IF EXISTS "media: exclusão editor"                       ON storage.objects;
DROP POLICY IF EXISTS "media: exclusão editores"                     ON storage.objects;


-- SELECT: qualquer pessoa pode ler ficheiros do bucket media
CREATE POLICY "media: leitura pública"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'media');

-- INSERT: utilizadores autenticados com tipos de ficheiro válidos
CREATE POLICY "media: upload autenticados e tipos válidos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'media'
    AND auth.role() = 'authenticated'
    AND lower(storage.extension(name)) = ANY (ARRAY[
      'jpg', 'jpeg', 'png', 'gif', 'webp', 'svg',
      'mp4', 'mov', 'webm', 'pdf'
    ])
  );

-- INSERT: anónimos podem fazer upload para o prefixo community/ (submissões públicas)
CREATE POLICY "media: upload comunidade anónimo"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'media'
    AND name LIKE 'community/%'
  );

-- INSERT: editores e admins podem fazer upload sem restrição de tipo
CREATE POLICY "media: upload editor"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'media'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid()
        AND role = ANY (ARRAY['admin', 'editor'])
    )
  );

-- UPDATE / DELETE: só editores/admin.
-- NOTE: produção tem 2 políticas funcionalmente equivalentes para cada uma
-- (raw EXISTS clause + is_editor() function call). Mantemos ambas para
-- espelhar produção 1:1. As políticas RLS permissivas são OR'd entre si,
-- portanto o efeito final é idêntico — não tentar "limpar" para uma só.
CREATE POLICY "media: atualização editor"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'media'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid()
        AND role = ANY (ARRAY['admin', 'editor'])
    )
  );

CREATE POLICY "media: atualização editores"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'media' AND public.is_editor());

CREATE POLICY "media: exclusão editor"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'media'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid()
        AND role = ANY (ARRAY['admin', 'editor'])
    )
  );

CREATE POLICY "media: exclusão editores"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'media' AND public.is_editor());
