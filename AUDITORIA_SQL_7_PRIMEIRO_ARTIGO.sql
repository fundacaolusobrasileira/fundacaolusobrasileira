-- =====================================================================
-- PRIMEIRO ARTIGO — "Portugal & Brasil: Investir com Futuro"
-- =====================================================================
-- Entra como RASCUNHO, de propósito. Nada disto fica público até si rever
-- e carregar em Publicar no painel.
--
-- TUDO o que está escrito vem da descrição do próprio evento no vosso
-- banco. Não há um único facto inventado: sem oradores, sem painéis, sem
-- homenageados, sem números de participantes. A descrição do evento diz
-- "Em breve, novidades sobre painéis e oradores" — portanto ainda não há
-- nada anunciado, e o artigo não finge que há.
--
-- A capa reutiliza o cartaz do próprio evento.
-- =====================================================================

-- ------------------------------------------------- 1) autor institucional
-- Não existia nenhum autor. Crio um em nome da Fundação; pode trocar
-- depois por uma pessoa, no painel.
INSERT INTO public.article_authors (name, bio, active)
SELECT 'Fundação Luso-Brasileira', 'Comunicação institucional da Fundação Luso-Brasileira.', true
WHERE NOT EXISTS (SELECT 1 FROM public.article_authors WHERE name = 'Fundação Luso-Brasileira');

-- ------------------------------------------------- 2) o artigo
INSERT INTO public.articles (
  slug, title, summary, body, cover_url, cover_alt,
  category_id, author_id, tags, status,
  seo_title, seo_description, seo_image_url, reading_minutes
)
SELECT
  'portugal-brasil-investir-com-futuro-2026',
  'Portugal & Brasil: Investir com Futuro',
  'A Fundação Luso-Brasileira reúne em São Paulo, a 24 de novembro, líderes, investidores e decisores dos dois países para um dia dedicado ao investimento, ao turismo e à cultura.',
  $json$[
    {"id":"b1","type":"paragraph","text":"A Fundação Luso-Brasileira realiza a 24 de novembro de 2026, no Tivoli Mofarrej, em São Paulo, a nova edição do seu encontro anual. O dia reúne líderes, investidores e decisores de Portugal e do Brasil em torno de três eixos que a Fundação tem vindo a trabalhar: o investimento, o turismo e a cultura."},
    {"id":"b2","type":"heading","level":2,"text":"Um dia em três tempos"},
    {"id":"b3","type":"paragraph","text":"O programa abre com a conferência, realizada sob o alto patrocínio da IMGA, e prossegue com o Jantar de Gala, no qual são entregues os Prémios da Fundação. A noite encerra com a Champagne Party."},
    {"id":"b4","type":"paragraph","text":"Os painéis e os oradores serão anunciados em breve."},
    {"id":"b5","type":"heading","level":2,"text":"Pontes entre dois países"},
    {"id":"b6","type":"quote","text":"Um dia dedicado ao investimento, ao turismo e à cultura como pontes entre Portugal e o Brasil."},
    {"id":"b7","type":"paragraph","text":"O encontro dá continuidade ao trabalho que a Fundação desenvolve desde 1992 na aproximação entre os dois países, e que em 2025 levou ao Jantar de Gala comemorativo dos 33 anos da instituição, também no Tivoli Mofarrej."},
    {"id":"b8","type":"heading","level":2,"text":"Informações práticas"},
    {"id":"b9","type":"list","items":[
      "Data: 24 de novembro de 2026, a partir das 10h00",
      "Local: Tivoli Mofarrej, São Paulo",
      "Programa: conferência, Jantar de Gala com entrega dos Prémios da Fundação e Champagne Party"
    ]},
    {"id":"b10","type":"divider"},
    {"id":"b11","type":"paragraph","text":"Para mais informações, contacte geral@fundacaolusobrasileira.pt."}
  ]$json$::jsonb,
  'https://lhgzyrszzbxjjvnxfwzf.supabase.co/storage/v1/object/public/media/22491d0d-fdeb-489c-af35-5c44ea971691-d4355020e5d64fa9b0a52dc4afe59dbc.jpg',
  'Cartaz do encontro Portugal & Brasil: Investir com Futuro, 24 de novembro de 2026, Tivoli Mofarrej, São Paulo',
  (SELECT id FROM public.article_categories WHERE slug = 'institucional'),
  (SELECT id FROM public.article_authors   WHERE name = 'Fundação Luso-Brasileira'),
  ARRAY['investimento','turismo','cultura','São Paulo','prémios'],
  'rascunho',
  'Portugal & Brasil: Investir com Futuro — 24 de novembro, São Paulo',
  'A Fundação Luso-Brasileira reúne em São Paulo líderes, investidores e decisores dos dois países para um dia dedicado ao investimento, ao turismo e à cultura.',
  'https://lhgzyrszzbxjjvnxfwzf.supabase.co/storage/v1/object/public/media/22491d0d-fdeb-489c-af35-5c44ea971691-d4355020e5d64fa9b0a52dc4afe59dbc.jpg',
  2
WHERE NOT EXISTS (
  SELECT 1 FROM public.articles WHERE slug = 'portugal-brasil-investir-com-futuro-2026'
);

-- ------------------------------------------------- 3) ligação ao evento
-- Faz o artigo aparecer na página do evento e vice-versa.
INSERT INTO public.article_entities (article_id, entity_type, entity_id, label)
SELECT a.id, 'event', '257d3550-963d-4cf5-a30d-9f2254d791e5',
       'Portugal & Brasil: Investir com Futuro'
FROM public.articles a
WHERE a.slug = 'portugal-brasil-investir-com-futuro-2026'
ON CONFLICT (article_id, entity_type, entity_id) DO NOTHING;

-- ------------------------------------------------- 4) verificação
SELECT a.slug, a.status, a.title, c.name AS categoria, au.name AS autor,
       jsonb_array_length(a.body) AS blocos,
       (SELECT count(*) FROM public.article_entities e WHERE e.article_id = a.id) AS ligacoes
FROM public.articles a
LEFT JOIN public.article_categories c ON c.id = a.category_id
LEFT JOIN public.article_authors   au ON au.id = a.author_id
WHERE a.slug = 'portugal-brasil-investir-com-futuro-2026';


-- =====================================================================
-- LIGAR A ÁREA EDITORIAL  —  só quando quiser que o menu mostre "Artigos"
-- =====================================================================
-- As rotas /artigos e /artigos/:slug já funcionam por URL direto. Isto só
-- acrescenta o link no menu do site.
--
-- UPDATE public.site_settings SET value = 'true'::jsonb, updated_at = now()
-- WHERE key = 'articles_enabled';
--
-- Para desligar outra vez:
-- UPDATE public.site_settings SET value = 'false'::jsonb WHERE key = 'articles_enabled';


-- =====================================================================
-- ROLLBACK
-- =====================================================================
-- DELETE FROM public.articles WHERE slug = 'portugal-brasil-investir-com-futuro-2026';
-- (as ligações em article_entities saem em cascata)
