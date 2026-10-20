-- =====================================================================
-- ATUALIZAÇÃO DE CONTEÚDO — Parceiros e nome do Secretário-Geral
-- Execute UM BLOCO DE CADA VEZ. Rollback no fim de cada um.
-- =====================================================================
--
-- NOTA IMPORTANTE: os parceiros TÊM de entrar no banco, não no ficheiro
-- data/partners.data.ts. A app faz `PARTNERS.length > 0 ? PARTNERS :
-- PARTNERS_SEED` — como o banco tem 25 linhas, o seed nunca é usado.
-- =====================================================================


-- #####################################################################
-- BLOCO 1 — João Carvalho → João Pedro Carvalho
-- Estado atual verificado no banco:
--   partners:        1 linha  "João Carvalho"
--   council_members: 2 linhas "João Carvalho" (administracao #8, executivo #5)
--   o texto de `full` também começa por "João Carvalho desempenha..."
-- #####################################################################

-- NOTA: `full` é palavra reservada no PostgreSQL (FULL JOIN) e a coluna
-- chama-se mesmo assim — tem de vir SEMPRE entre aspas duplas.
UPDATE public.partners
SET name = 'João Pedro Carvalho',
    "full"  = replace(COALESCE("full", ''),  'João Carvalho', 'João Pedro Carvalho'),
    bio     = replace(COALESCE(bio, ''),     'João Carvalho', 'João Pedro Carvalho'),
    summary = replace(COALESCE(summary, ''), 'João Carvalho', 'João Pedro Carvalho')
WHERE name = 'João Carvalho';

UPDATE public.council_members
SET name = 'João Pedro Carvalho'
WHERE name = 'João Carvalho';

-- VERIFICAÇÃO 1
SELECT 'partners' AS tabela, name, role FROM public.partners WHERE name ILIKE '%Carvalho%'
UNION ALL
SELECT 'council_members', name, council || ' / ' || role FROM public.council_members WHERE name ILIKE '%Carvalho%';
-- Esperado: 1 linha em partners + 2 em council_members, todas "João Pedro Carvalho".


-- #####################################################################
-- BLOCO 2 — DUPLICADOS REAIS (não foi pedido, mas encontrei)
-- Em `partners` existem DUAS linhas para duas pessoas:
--   "Álvaro Covões"          — uma com website everythingisnew.pt, outra sem
--   "Nuno Fernandes Thomaz"  — ambas sem website
-- Isto faz aparecer o mesmo nome duas vezes na página de Pessoas.
--
-- PRIMEIRO INSPECIONE. Não apague nada sem ver qual tem foto e biografia.
-- #####################################################################

SELECT id, name, role, tier, "order",
       (image IS NOT NULL AND image <> '') AS tem_foto,
       length(COALESCE("full", ''))        AS tamanho_bio,
       website, created_at
FROM public.partners
WHERE name IN ('Álvaro Covões', 'Nuno Fernandes Thomaz')
ORDER BY name, created_at;

-- Depois de escolher qual FICA, apague a outra pelo id (substitua o UUID):
-- DELETE FROM public.partners WHERE id = '<uuid-da-linha-a-remover>';
--
-- CUIDADO: se a linha a remover estiver ligada a um utilizador em
-- profiles.partner_id, desligue primeiro:
-- UPDATE public.profiles SET partner_id = NULL WHERE partner_id = '<uuid>';


-- #####################################################################
-- BLOCO 3 — Espaços a mais nos nomes (higiene de dados)
-- Há nomes gravados como "Hotel Tivoli ", "TAP AIR ", "Vila Galé ",
-- "Legaltech Space Group " e " Vista Alegre". Isso parte ordenações,
-- buscas e qualquer comparação por nome feita no código.
-- #####################################################################

UPDATE public.partners SET name = btrim(name) WHERE name <> btrim(name);

-- VERIFICAÇÃO 3 (deve devolver 0 linhas)
SELECT id, '[' || name || ']' AS nome_com_delimitadores
FROM public.partners WHERE name <> btrim(name);


-- #####################################################################
-- BLOCO 4 — INSERIR OS 9 PARCEIROS NOVOS
-- Nenhum destes existe no banco (verificado). Textos retirados
-- integralmente da folha de cálculo enviada; o da CBA veio da mensagem.
--
-- `image` fica NULL: não tenho os logótipos. O cartão mostra a inicial do
-- nome num círculo enquanto não houver logo — não parte o layout.
-- Para pôr os logótipos depois: painel > Parceiros > editar > carregar.
-- #####################################################################

INSERT INTO public.partners (name, type, category, website, country, bio, "full", active, featured)
VALUES
(
  'Turismo de Cascais', 'empresa', 'Parceiro Gold', 'https://www.visitcascais.com', 'PT',
  $$A Associação Turismo de Cascais promove o concelho como destino de excelência entre o mar e a serra de Sintra, reconhecido pelas suas praias, pelo património e pela qualidade de vida. Cascais é também o local escolhido para a futura sede da Fundação, projetada por Oscar Niemeyer. Esta parceria reforça a ligação da Fundação ao território que será a sua casa e contribui para a promoção de Cascais junto do público e dos investidores brasileiros.$$,
  $$A Associação Turismo de Cascais promove o concelho como destino de excelência entre o mar e a serra de Sintra, reconhecido pelas suas praias, pelo património e pela qualidade de vida. Cascais é também o local escolhido para a futura sede da Fundação, projetada por Oscar Niemeyer. Esta parceria reforça a ligação da Fundação ao território que será a sua casa e contribui para a promoção de Cascais junto do público e dos investidores brasileiros.$$,
  true, false
),
(
  'Turismo de Lisboa', 'empresa', 'Parceiro Gold', 'https://www.visitlisboa.com', 'PT',
  $$A Associação Turismo de Lisboa é a entidade responsável pela promoção de Lisboa e da sua região como destino turístico, de negócios e de congressos, numa parceria entre entidades públicas e privadas. Lisboa é hoje um dos destinos europeus preferidos dos visitantes brasileiros e uma plataforma de ligação entre o Brasil e a Europa. A parceria com a Fundação contribui para reforçar a atratividade da capital portuguesa junto do público, das empresas e das instituições brasileiras.$$,
  $$A Associação Turismo de Lisboa é a entidade responsável pela promoção de Lisboa e da sua região como destino turístico, de negócios e de congressos, numa parceria entre entidades públicas e privadas. Lisboa é hoje um dos destinos europeus preferidos dos visitantes brasileiros e uma plataforma de ligação entre o Brasil e a Europa. A parceria com a Fundação contribui para reforçar a atratividade da capital portuguesa junto do público, das empresas e das instituições brasileiras.$$,
  true, false
),
(
  'Maratona Clube de Portugal', 'empresa', 'Parceiro Gold', 'https://maratonaclubedeportugal.com', 'PT',
  $$O Maratona Clube de Portugal organiza algumas das maiores provas de corrida do país, com destaque para a EDP Maratona de Lisboa e a EDP Meia Maratona de Lisboa. A Maratona de Lisboa, com partida em Carcavelos e meta na Praça do Comércio, tem um percurso integralmente junto ao mar e ao rio e é uma das provas fundadoras do circuito European Marathon Classics, ao lado de Londres, Roma ou Viena. Todos os anos, estas provas trazem a Lisboa milhares de atletas de todo o mundo.$$,
  $$O Maratona Clube de Portugal organiza algumas das maiores provas de corrida do país, com destaque para a EDP Maratona de Lisboa e a EDP Meia Maratona de Lisboa. A Maratona de Lisboa, com partida em Carcavelos e meta na Praça do Comércio, tem um percurso integralmente junto ao mar e ao rio e é uma das provas fundadoras do circuito European Marathon Classics, ao lado de Londres, Roma ou Viena. Todos os anos, estas provas trazem a Lisboa milhares de atletas de todo o mundo.$$,
  true, false
),
(
  'CBA Corp', 'empresa', 'Parceiro Gold', 'https://www.cbacorp.com.br/', 'BR',
  $$Plataforma brasileira de desenvolvimento imobiliário liderada por Cintia Pereira, com atuação desde a estruturação do capital até à entrega. Desenvolve residências de alto padrão em Florianópolis (CBA Empreendimentos) e habitação acessível no âmbito do Minha Casa, Minha Vida (Viva Corp), e avalia agora a expansão para Portugal.$$,
  $$Plataforma brasileira de desenvolvimento imobiliário liderada por Cintia Pereira, com atuação desde a estruturação do capital até à entrega. Desenvolve residências de alto padrão em Florianópolis (CBA Empreendimentos) e habitação acessível no âmbito do Minha Casa, Minha Vida (Viva Corp), e avalia agora a expansão para Portugal.$$,
  true, false
),
(
  'Delta Cafés', 'empresa', 'Parceiro Silver', 'https://www.deltacafes.pt', 'PT',
  $$Fundada em 1961 por Rui Nabeiro, em Campo Maior, a Delta Cafés é a marca de café líder em Portugal e uma referência do empreendedorismo português. Presente em dezenas de mercados, a Delta mantém uma relação próxima com os países produtores de café, entre os quais o Brasil, com quem partilha uma cultura de qualidade e proximidade. O seu compromisso com a responsabilidade social e o desenvolvimento das comunidades está em sintonia com os valores da Fundação.$$,
  $$Fundada em 1961 por Rui Nabeiro, em Campo Maior, a Delta Cafés é a marca de café líder em Portugal e uma referência do empreendedorismo português. Presente em dezenas de mercados, a Delta mantém uma relação próxima com os países produtores de café, entre os quais o Brasil, com quem partilha uma cultura de qualidade e proximidade. O seu compromisso com a responsabilidade social e o desenvolvimento das comunidades está em sintonia com os valores da Fundação.$$,
  true, false
),
(
  'CARM', 'empresa', 'Outro Apoio', 'https://www.carm.pt', 'PT',
  $$A CARM – Casa Agrícola Roboredo Madeira é um produtor familiar do Douro Superior, com várias gerações dedicadas à terra, que produz vinhos e azeites de elevada qualidade. Pioneira na agricultura biológica na região, a CARM alia tradição e sustentabilidade, e os seus produtos estão presentes em diversos mercados internacionais. Os seus vinhos e azeites levam o melhor do Douro à mesa dos parceiros e convidados da Fundação.$$,
  $$A CARM – Casa Agrícola Roboredo Madeira é um produtor familiar do Douro Superior, com várias gerações dedicadas à terra, que produz vinhos e azeites de elevada qualidade. Pioneira na agricultura biológica na região, a CARM alia tradição e sustentabilidade, e os seus produtos estão presentes em diversos mercados internacionais. Os seus vinhos e azeites levam o melhor do Douro à mesa dos parceiros e convidados da Fundação.$$,
  true, false
),
(
  'North Star', 'empresa', 'Outro Apoio', 'https://www.northstar.com.br/', 'BR',
  $$Sediada em Fortaleza, no Ceará, a North Star Táxi Aéreo opera desde 1997 em todo o Brasil, com especial presença no Nordeste. Com uma equipa que soma mais de 35 anos de experiência no setor aeronáutico, distingue-se pela segurança, rigor e excelência no transporte aéreo executivo e regional.$$,
  $$Sediada em Fortaleza, no Ceará, a North Star Táxi Aéreo opera desde 1997 em todo o Brasil, com especial presença no Nordeste. Com uma equipa que soma mais de 35 anos de experiência no setor aeronáutico, distingue-se pela segurança, rigor e excelência no transporte aéreo executivo e regional.$$,
  true, false
),
(
  'Revista lounge*', 'empresa', 'Outro Apoio', 'https://www.revistalounge.com.br', 'BR',
  $$A lounge* é uma revista digital brasileira de lifestyle criada em 2002, com conteúdos sobre gastronomia, vida social, entretenimento, moda, negócios e viagens. Com sede em São Paulo, acompanha de perto a atualidade portuguesa, com uma secção dedicada a Portugal e reportagens regulares sobre Lisboa, Cascais e outros destinos. Como parceira de media da Fundação, a lounge* contribui para dar visibilidade às iniciativas luso-brasileiras junto do público brasileiro.$$,
  $$A lounge* é uma revista digital brasileira de lifestyle criada em 2002, com conteúdos sobre gastronomia, vida social, entretenimento, moda, negócios e viagens. Com sede em São Paulo, acompanha de perto a atualidade portuguesa, com uma secção dedicada a Portugal e reportagens regulares sobre Lisboa, Cascais e outros destinos. Como parceira de media da Fundação, a lounge* contribui para dar visibilidade às iniciativas luso-brasileiras junto do público brasileiro.$$,
  true, false
),
(
  'Clube Português de São Paulo', 'empresa', 'Outro Apoio', 'https://www.clubeportugues.com.br', 'BR',
  $$Fundado em 1920, o Clube Português de São Paulo é uma instituição centenária que reúne portugueses, lusodescendentes e brasileiros em torno da cultura, da memória e da convivência. Destaca-se pela Biblioteca João Alves das Neves, inaugurada em 1929 e reconhecida pelo Governo Português em 1934, e por uma agenda de concertos, exposições e encontros literários na nova sede da Avenida Portugal. É um parceiro natural da Fundação na preservação e promoção da cultura luso-brasileira no Brasil.$$,
  $$Fundado em 1920, o Clube Português de São Paulo é uma instituição centenária que reúne portugueses, lusodescendentes e brasileiros em torno da cultura, da memória e da convivência. Destaca-se pela Biblioteca João Alves das Neves, inaugurada em 1929 e reconhecida pelo Governo Português em 1934, e por uma agenda de concertos, exposições e encontros literários na nova sede da Avenida Portugal. É um parceiro natural da Fundação na preservação e promoção da cultura luso-brasileira no Brasil.$$,
  true, false
);

-- VERIFICAÇÃO 4
SELECT category, count(*) AS quantos
FROM public.partners WHERE active IS NOT FALSE
GROUP BY category ORDER BY category;
-- Esperado depois deste bloco: Parceiro Gold passa de 3 para 7,
-- Parceiro Silver de 1 para 2, Outro Apoio de 10 para 14.


-- =====================================================================
-- ROLLBACK
-- =====================================================================
-- BLOCO 1:
-- UPDATE public.partners        SET name='João Carvalho' WHERE name='João Pedro Carvalho';
-- UPDATE public.council_members SET name='João Carvalho' WHERE name='João Pedro Carvalho';
-- (o texto de `full` teria de ser reposto à mão)
--
-- BLOCO 4:
-- DELETE FROM public.partners WHERE name IN (
--   'Turismo de Cascais','Turismo de Lisboa','Maratona Clube de Portugal','CBA Corp',
--   'Delta Cafés','CARM','North Star','Revista lounge*','Clube Português de São Paulo');
