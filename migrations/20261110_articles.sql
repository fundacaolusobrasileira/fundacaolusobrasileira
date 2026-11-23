-- =====================================================================
-- ÁREA EDITORIAL — artigos, categorias, autores, ligações e versões
-- =====================================================================
-- Execute no SQL Editor do projeto da Fundação.
-- Tudo é CREATE ... IF NOT EXISTS: pode correr duas vezes sem estragar.
--
-- AGENDAMENTO SEM CRON: a policy de leitura pública exige
--   status = 'publicado' AND published_at <= now()
-- Logo, guardar um artigo como 'publicado' com data futura faz com que ele
-- apareça sozinho na hora marcada. Não é preciso agendador nenhum.
-- =====================================================================

-- ---------------------------------------------------------------- tabelas
CREATE TABLE IF NOT EXISTS public.article_categories (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        text NOT NULL UNIQUE,
  name        text NOT NULL,
  description text,
  "order"     integer NOT NULL DEFAULT 0,
  active      boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.article_authors (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  user_id     uuid,
  partner_id  uuid REFERENCES public.partners(id) ON DELETE SET NULL,
  bio         text,
  avatar_url  text,
  active      boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.articles (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            text NOT NULL UNIQUE,
  title           text NOT NULL,
  summary         text NOT NULL DEFAULT '',
  body            jsonb NOT NULL DEFAULT '[]'::jsonb,
  cover_url       text,
  cover_alt       text,
  category_id     uuid REFERENCES public.article_categories(id) ON DELETE SET NULL,
  author_id       uuid REFERENCES public.article_authors(id) ON DELETE SET NULL,
  tags            text[] NOT NULL DEFAULT '{}',
  status          text NOT NULL DEFAULT 'rascunho'
                  CHECK (status IN ('rascunho','em_revisao','agendado','publicado','arquivado')),
  published_at    timestamptz,
  seo_title       text,
  seo_description text,
  seo_image_url   text,
  reading_minutes integer,
  created_by      uuid,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.article_entities (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id  uuid NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  entity_type text NOT NULL CHECK (entity_type IN ('partner','event','council_member','document')),
  entity_id   uuid NOT NULL,
  label       text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (article_id, entity_type, entity_id)
);

CREATE TABLE IF NOT EXISTS public.article_versions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id  uuid NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  version     integer NOT NULL,
  snapshot    jsonb NOT NULL,
  created_by  uuid,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (article_id, version)
);

-- ---------------------------------------------------------------- índices
CREATE INDEX IF NOT EXISTS articles_status_pub_idx ON public.articles (status, published_at DESC);
CREATE INDEX IF NOT EXISTS articles_category_idx   ON public.articles (category_id);
CREATE INDEX IF NOT EXISTS articles_author_idx     ON public.articles (author_id);
CREATE INDEX IF NOT EXISTS article_entities_ent_idx ON public.article_entities (entity_type, entity_id);

-- ---------------------------------------------------------------- triggers
CREATE OR REPLACE FUNCTION public.articles_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS articles_updated_at ON public.articles;
CREATE TRIGGER articles_updated_at BEFORE UPDATE ON public.articles
  FOR EACH ROW EXECUTE FUNCTION public.articles_touch_updated_at();

-- Versão nova a cada PUBLICAÇÃO (não a cada gravação do autosave).
CREATE OR REPLACE FUNCTION public.articles_snapshot_on_publish()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE next_v integer;
BEGIN
  IF NEW.status = 'publicado' AND (OLD.status IS DISTINCT FROM 'publicado') THEN
    SELECT COALESCE(MAX(version), 0) + 1 INTO next_v
      FROM public.article_versions WHERE article_id = NEW.id;
    INSERT INTO public.article_versions (article_id, version, snapshot, created_by)
    VALUES (NEW.id, next_v, to_jsonb(NEW), auth.uid());
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS articles_version_on_publish ON public.articles;
CREATE TRIGGER articles_version_on_publish AFTER UPDATE ON public.articles
  FOR EACH ROW EXECUTE FUNCTION public.articles_snapshot_on_publish();

-- ---------------------------------------------------------------- RLS
ALTER TABLE public.articles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.article_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.article_authors    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.article_entities   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.article_versions   ENABLE ROW LEVEL SECURITY;

-- Visitante: só artigo publicado e já com data vencida.
DROP POLICY IF EXISTS "articles: leitura publica" ON public.articles;
CREATE POLICY "articles: leitura publica" ON public.articles
  FOR SELECT USING (status = 'publicado' AND published_at IS NOT NULL AND published_at <= now());

-- Editor/admin: vê tudo.
DROP POLICY IF EXISTS "articles: leitura editores" ON public.articles;
CREATE POLICY "articles: leitura editores" ON public.articles
  FOR SELECT TO authenticated USING (public.is_editor() OR public.is_admin());

-- Autor: vê e edita os PRÓPRIOS rascunhos (e só enquanto não publicados).
DROP POLICY IF EXISTS "articles: leitura propria" ON public.articles;
CREATE POLICY "articles: leitura propria" ON public.articles
  FOR SELECT TO authenticated USING (created_by = auth.uid());

DROP POLICY IF EXISTS "articles: insercao autor" ON public.articles;
CREATE POLICY "articles: insercao autor" ON public.articles
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() AND status IN ('rascunho','em_revisao'));

DROP POLICY IF EXISTS "articles: edicao propria rascunho" ON public.articles;
CREATE POLICY "articles: edicao propria rascunho" ON public.articles
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid() AND status IN ('rascunho','em_revisao'))
  WITH CHECK (created_by = auth.uid() AND status IN ('rascunho','em_revisao'));

-- Editor/admin: escrita total (rever, agendar, publicar, arquivar).
DROP POLICY IF EXISTS "articles: escrita editores" ON public.articles;
CREATE POLICY "articles: escrita editores" ON public.articles
  FOR ALL TO authenticated
  USING (public.is_editor() OR public.is_admin())
  WITH CHECK (public.is_editor() OR public.is_admin());

-- Taxonomia: leitura pública, escrita só editores.
DROP POLICY IF EXISTS "article_categories: leitura publica" ON public.article_categories;
CREATE POLICY "article_categories: leitura publica" ON public.article_categories FOR SELECT USING (true);
DROP POLICY IF EXISTS "article_categories: escrita editores" ON public.article_categories;
CREATE POLICY "article_categories: escrita editores" ON public.article_categories
  FOR ALL TO authenticated USING (public.is_editor()) WITH CHECK (public.is_editor());

DROP POLICY IF EXISTS "article_authors: leitura publica" ON public.article_authors;
CREATE POLICY "article_authors: leitura publica" ON public.article_authors FOR SELECT USING (true);
DROP POLICY IF EXISTS "article_authors: escrita editores" ON public.article_authors;
CREATE POLICY "article_authors: escrita editores" ON public.article_authors
  FOR ALL TO authenticated USING (public.is_editor()) WITH CHECK (public.is_editor());

-- Ligações: visíveis quando o artigo é visível.
DROP POLICY IF EXISTS "article_entities: leitura publica" ON public.article_entities;
CREATE POLICY "article_entities: leitura publica" ON public.article_entities
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.articles a WHERE a.id = article_id
      AND a.status = 'publicado' AND a.published_at IS NOT NULL AND a.published_at <= now()));
DROP POLICY IF EXISTS "article_entities: leitura editores" ON public.article_entities;
CREATE POLICY "article_entities: leitura editores" ON public.article_entities
  FOR SELECT TO authenticated USING (public.is_editor() OR public.is_admin());
DROP POLICY IF EXISTS "article_entities: escrita editores" ON public.article_entities;
CREATE POLICY "article_entities: escrita editores" ON public.article_entities
  FOR ALL TO authenticated USING (public.is_editor()) WITH CHECK (public.is_editor());

-- Histórico: só editores leem; escrita apenas pelo trigger (SECURITY DEFINER).
DROP POLICY IF EXISTS "article_versions: leitura editores" ON public.article_versions;
CREATE POLICY "article_versions: leitura editores" ON public.article_versions
  FOR SELECT TO authenticated USING (public.is_editor() OR public.is_admin());

-- ---------------------------------------------------------------- definições
-- Interruptor da área: a rota existe sempre, o link no menu só aparece com true.
CREATE TABLE IF NOT EXISTS public.site_settings (
  key        text PRIMARY KEY,
  value      jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "site_settings: leitura publica" ON public.site_settings;
CREATE POLICY "site_settings: leitura publica" ON public.site_settings FOR SELECT USING (true);
DROP POLICY IF EXISTS "site_settings: escrita admin" ON public.site_settings;
CREATE POLICY "site_settings: escrita admin" ON public.site_settings
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

INSERT INTO public.site_settings (key, value) VALUES ('articles_enabled', 'false'::jsonb)
  ON CONFLICT (key) DO NOTHING;

-- Categorias iniciais (pode renomear ou apagar no painel).
INSERT INTO public.article_categories (slug, name, "order") VALUES
  ('institucional', 'Institucional', 1),
  ('cultura',       'Cultura',       2),
  ('economia',      'Economia',      3),
  ('entrevistas',   'Entrevistas',   4)
ON CONFLICT (slug) DO NOTHING;

-- ---------------------------------------------------------------- verificação
SELECT table_name, (SELECT count(*) FROM pg_policies p
                    WHERE p.schemaname='public' AND p.tablename=t.table_name) AS policies
FROM information_schema.tables t
WHERE table_schema='public'
  AND table_name IN ('articles','article_categories','article_authors',
                     'article_entities','article_versions','site_settings')
ORDER BY table_name;
