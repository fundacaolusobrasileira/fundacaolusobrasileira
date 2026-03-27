-- ============================================================
-- FUNDAÇÃO LUSO-BRASILEIRA — Schema Completo para Supabase
-- Gerado em: 2026-03-13
-- ============================================================
-- INSTRUÇÕES:
-- 1. Cole este arquivo no SQL Editor do Supabase
-- 2. Execute tudo de uma vez (Run)
-- 3. Depois vá em Storage > New Bucket > nome: "media" > Public: ON
-- ============================================================


-- ============================================================
-- EXTENSÕES
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ============================================================
-- 1. TABELA: profiles
-- Criada automaticamente no signup de usuários (auth.users)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  email       TEXT NOT NULL,
  type        TEXT NOT NULL DEFAULT 'individual',  -- 'individual' | 'institucional'
  role        TEXT NOT NULL DEFAULT 'membro',       -- 'membro' | 'editor' | 'admin'
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índice para busca por user_id
CREATE INDEX IF NOT EXISTS profiles_user_id_idx ON public.profiles(user_id);

-- Trigger: atualiza updated_at automaticamente
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


-- ============================================================
-- 2. TABELA: partners
-- Membros, parceiros, conselho e instituições da Fundação
-- ============================================================
CREATE TABLE IF NOT EXISTS public.partners (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Identidade
  name          TEXT NOT NULL DEFAULT 'Novo Membro',
  type          TEXT NOT NULL DEFAULT 'pessoa',     -- 'pessoa' | 'empresa'
  category      TEXT NOT NULL DEFAULT 'Parceiro',   -- 'Fundador' | 'Apoiador' | 'Institucional' | 'Parceiro' | 'Amigo' | 'Governança'

  -- Perfil
  role          TEXT,         -- Cargo ou função (ex: Presidente, CEO)
  bio           TEXT,         -- Biografia ou descrição
  image         TEXT,         -- URL da foto ou logo
  avatar        TEXT,         -- URL de avatar alternativo
  country       TEXT,         -- País de origem ou sede
  website       TEXT,         -- URL do site

  -- Redes sociais (JSON)
  -- Estrutura: { "youtube": "...", "linkedin": "...", "twitter": "...", "facebook": "...", "instagram": "..." }
  social_links  JSONB DEFAULT '{}'::JSONB,

  -- Tags e metadados
  tags          TEXT[],       -- ex: ['Portugal', 'Tecnologia']
  since         TEXT,         -- Ano ou data de ingresso (ex: '2023')
  active        BOOLEAN NOT NULL DEFAULT TRUE,
  featured      BOOLEAN NOT NULL DEFAULT FALSE,
  "order"       INTEGER,      -- Ordem de exibição manual

  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS partners_category_idx ON public.partners(category);
CREATE INDEX IF NOT EXISTS partners_active_idx   ON public.partners(active);
CREATE INDEX IF NOT EXISTS partners_featured_idx ON public.partners(featured);

CREATE OR REPLACE TRIGGER partners_updated_at
  BEFORE UPDATE ON public.partners
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


-- ============================================================
-- 3. TABELA: events
-- Eventos e agenda da Fundação
-- ============================================================
CREATE TABLE IF NOT EXISTS public.events (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Conteúdo principal
  title             TEXT NOT NULL DEFAULT 'Novo Evento',
  subtitle          TEXT,
  description       TEXT,
  description_short TEXT,

  -- Data e hora
  date              TEXT,          -- Data principal (ex: '2024-11-15' ou '15 de Novembro de 2024')
  time              TEXT,          -- Hora de início (ex: '19:00')
  end_date          TEXT,          -- Data de término (para eventos multi-dia)
  end_time          TEXT,          -- Hora de término

  -- Localização
  location          TEXT,          -- Nome do local (ex: 'Auditório Vieira de Almeida')
  address           TEXT,          -- Endereço completo
  city              TEXT,
  country           TEXT,

  -- Classificação
  category          TEXT NOT NULL DEFAULT 'Outros',  -- '33 Anos' | 'Fundação' | 'Embaixada' | 'Outros'
  tags              TEXT[],

  -- Mídia
  image             TEXT,          -- URL da imagem principal de capa
  cover_image       TEXT,          -- URL da imagem de cover (hero)

  -- Galeria oficial (array de GalleryItem em JSON)
  -- Estrutura de cada item:
  -- {
  --   "id": "media-uuid",
  --   "kind": "image" | "video",
  --   "srcType": "url",
  --   "url": "https://...",
  --   "caption": "...",
  --   "authorName": "...",
  --   "email": "...",
  --   "source": "oficial" | "comunidade",
  --   "status": "published" | "pending" | "rejected",
  --   "createdAt": "2024-01-01T00:00:00.000Z",
  --   "order": 0
  -- }
  gallery           JSONB DEFAULT '[]'::JSONB,

  -- Links externos
  -- Estrutura: { "registration": "...", "website": "..." }
  links             JSONB DEFAULT '{}'::JSONB,

  -- Redes sociais do evento
  -- Estrutura: { "youtube": "...", "linkedin": "...", "instagram": "...", ... }
  social_links      JSONB DEFAULT '{}'::JSONB,

  -- Status e visibilidade
  status            TEXT NOT NULL DEFAULT 'draft',   -- 'draft' | 'published'
  featured          BOOLEAN NOT NULL DEFAULT FALSE,
  notes             TEXT,          -- Notas internas (só visíveis para editores)

  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS events_status_idx   ON public.events(status);
CREATE INDEX IF NOT EXISTS events_category_idx ON public.events(category);
CREATE INDEX IF NOT EXISTS events_featured_idx ON public.events(featured);
CREATE INDEX IF NOT EXISTS events_date_idx     ON public.events(date);

CREATE OR REPLACE TRIGGER events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


-- ============================================================
-- 4. TABELA: precadastros
-- Formulário público de interesse / pré-inscrição
-- ============================================================
CREATE TABLE IF NOT EXISTS public.precadastros (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  name        TEXT NOT NULL,
  email       TEXT NOT NULL,
  type        TEXT NOT NULL DEFAULT 'individual',  -- 'individual' | 'empresarial' | 'academico' | 'newsletter'
  message     TEXT,
  status      TEXT NOT NULL DEFAULT 'novo',        -- 'novo' | 'contatado' | 'aprovado' | 'rejeitado' | 'convertido'
  notes       TEXT,          -- Notas internas do editor

  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS precadastros_status_idx ON public.precadastros(status);
CREATE INDEX IF NOT EXISTS precadastros_email_idx  ON public.precadastros(email);
CREATE INDEX IF NOT EXISTS precadastros_type_idx   ON public.precadastros(type);

CREATE OR REPLACE TRIGGER precadastros_updated_at
  BEFORE UPDATE ON public.precadastros
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


-- ============================================================
-- 5. TABELA: community_media_submissions
-- Submissões de mídia da comunidade (pendentes de aprovação)
-- Obs: Atualmente gerenciado em memória no app — esta tabela
--      prepara a migração para persistência real no Supabase
-- ============================================================
CREATE TABLE IF NOT EXISTS public.community_media_submissions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id    UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,

  type        TEXT NOT NULL DEFAULT 'image',  -- 'image' | 'video'
  url         TEXT NOT NULL,
  author_name TEXT NOT NULL,
  email       TEXT NOT NULL,
  message     TEXT,
  status      TEXT NOT NULL DEFAULT 'pending',  -- 'pending' | 'approved' | 'rejected'

  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS community_media_event_id_idx ON public.community_media_submissions(event_id);
CREATE INDEX IF NOT EXISTS community_media_status_idx   ON public.community_media_submissions(status);


-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Ativa RLS em todas as tabelas
ALTER TABLE public.profiles                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partners                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.precadastros                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_media_submissions ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- RLS: profiles
-- ============================================================

-- Usuário lê apenas o próprio perfil
CREATE POLICY "profiles: leitura própria"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

-- Usuário cria o próprio perfil (no signup)
CREATE POLICY "profiles: inserção própria"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Usuário atualiza o próprio perfil
CREATE POLICY "profiles: atualização própria"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);


-- ============================================================
-- RLS: partners
-- ============================================================

-- Qualquer pessoa (incluindo anônimos) pode ver membros
CREATE POLICY "partners: leitura pública"
  ON public.partners FOR SELECT
  USING (true);

-- Apenas autenticados podem criar/editar/deletar
CREATE POLICY "partners: inserção autenticados"
  ON public.partners FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "partners: atualização autenticados"
  ON public.partners FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "partners: exclusão autenticados"
  ON public.partners FOR DELETE
  USING (auth.role() = 'authenticated');


-- ============================================================
-- RLS: events
-- ============================================================

-- Anônimos veem apenas eventos publicados
CREATE POLICY "events: leitura pública (publicados)"
  ON public.events FOR SELECT
  USING (
    status = 'published'
    OR auth.role() = 'authenticated'
  );

-- Apenas autenticados podem criar/editar/deletar
CREATE POLICY "events: inserção autenticados"
  ON public.events FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "events: atualização autenticados"
  ON public.events FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "events: exclusão autenticados"
  ON public.events FOR DELETE
  USING (auth.role() = 'authenticated');


-- ============================================================
-- RLS: precadastros
-- ============================================================

-- Apenas autenticados podem ler pré-cadastros
CREATE POLICY "precadastros: leitura autenticados"
  ON public.precadastros FOR SELECT
  USING (auth.role() = 'authenticated');

-- Qualquer pessoa pode enviar pré-cadastro (formulário público)
CREATE POLICY "precadastros: inserção pública"
  ON public.precadastros FOR INSERT
  WITH CHECK (true);

-- Apenas autenticados podem atualizar (mudar status, adicionar notas)
CREATE POLICY "precadastros: atualização autenticados"
  ON public.precadastros FOR UPDATE
  USING (auth.role() = 'authenticated');

-- Apenas autenticados podem excluir
CREATE POLICY "precadastros: exclusão autenticados"
  ON public.precadastros FOR DELETE
  USING (auth.role() = 'authenticated');


-- ============================================================
-- RLS: community_media_submissions
-- ============================================================

-- Qualquer pessoa pode enviar mídia (formulário público)
CREATE POLICY "community_media: inserção pública"
  ON public.community_media_submissions FOR INSERT
  WITH CHECK (true);

-- Apenas autenticados podem ver submissões pendentes
CREATE POLICY "community_media: leitura autenticados"
  ON public.community_media_submissions FOR SELECT
  USING (auth.role() = 'authenticated');

-- Apenas autenticados podem aprovar/rejeitar (atualizar status)
CREATE POLICY "community_media: atualização autenticados"
  ON public.community_media_submissions FOR UPDATE
  USING (auth.role() = 'authenticated');

-- Apenas autenticados podem excluir
CREATE POLICY "community_media: exclusão autenticados"
  ON public.community_media_submissions FOR DELETE
  USING (auth.role() = 'authenticated');


-- ============================================================
-- TRIGGER: criação automática de profile no signup
-- Quando um usuário se registra, cria um registro em profiles
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name, email, type, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'type', 'individual'),
    'membro'
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Remove trigger antigo se existir, recria limpo
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ============================================================
-- STORAGE: Bucket "media"
-- ============================================================
-- ATENÇÃO: O bucket precisa ser criado manualmente no painel:
--   Supabase > Storage > New Bucket
--   Nome: media
--   Public bucket: SIM (ativado)
--
-- Após criar o bucket, rode os comandos abaixo para as policies:

INSERT INTO storage.buckets (id, name, public)
VALUES ('media', 'media', true)
ON CONFLICT (id) DO NOTHING;

-- Qualquer pessoa pode visualizar arquivos do bucket público
CREATE POLICY "media: leitura pública"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'media');

-- Apenas autenticados podem fazer upload
CREATE POLICY "media: upload autenticados"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'media'
    AND auth.role() = 'authenticated'
  );

-- Apenas autenticados podem atualizar/deletar arquivos
CREATE POLICY "media: atualização autenticados"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'media'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "media: exclusão autenticados"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'media'
    AND auth.role() = 'authenticated'
  );


-- ============================================================
-- DADOS INICIAIS (OPCIONAL)
-- Descomente para inserir dados de exemplo
-- ============================================================

/*
-- Evento de exemplo
INSERT INTO public.events (title, description, date, location, category, status, featured, image)
VALUES (
  'Sessão de Abertura 2024',
  'Evento inaugural da Fundação Luso-Brasileira com a presença de representantes de Portugal e Brasil.',
  '2024-03-15',
  'Auditório Vieira de Almeida, Lisboa',
  'Fundação',
  'published',
  true,
  'https://picsum.photos/1200/600?random=1'
);

-- Membro de exemplo (Conselho)
INSERT INTO public.partners (name, type, category, role, bio, active, featured)
VALUES (
  'Dr. João Silva',
  'pessoa',
  'Governança',
  'Presidente do Conselho',
  'Jurista e empresário com mais de 30 anos de experiência em relações luso-brasileiras.',
  true,
  true
);
*/


-- ============================================================
-- FIM DO SCHEMA
-- ============================================================
-- Após executar este SQL:
-- 1. Vá em Authentication > Users e crie o primeiro usuário editor
-- 2. O bucket "media" já estará configurado
-- 3. O app estará pronto para usar
-- ============================================================
