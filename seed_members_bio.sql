-- seed_members_bio.sql
-- Updates partners (governance members) with hardcoded bio data from members.data.ts
-- Run once in Supabase SQL Editor. Matches by name to avoid needing UUIDs.

UPDATE partners SET
  role        = 'Presidente',
  tier        = 'presidente',
  "order"     = 1,
  country     = 'PT',
  image       = '/presidente.webp',
  category    = 'Governança',
  active      = true,
  tags        = ARRAY['Presidência', 'EDP', 'Liderança', 'Lusofonia'],
  summary     = 'Lidera a Fundação Luso-Brasileira com o compromisso de fortalecer os laços culturais, económicos e institucionais entre Portugal, Brasil e os países lusófonos. Com uma trajetória marcada pela liderança em grandes organizações internacionais, Paulo Campos Costa traz à Fundação uma visão estratégica de longo prazo.',
  "full"      = 'Paulo Campos Costa assumiu a presidência da Fundação Luso-Brasileira com a missão de renovar e ampliar o impacto institucional da organização no espaço lusófono. Com uma carreira de décadas em posições de liderança — incluindo passagem pela EDP a nível global —, traz consigo uma rede de relacionamentos de alto nível em Portugal, no Brasil e nos mercados internacionais.

A sua visão para a Fundação assenta em três pilares fundamentais: a recuperação e fortalecimento de relações históricas entre os dois países, o impulso a novas parcerias empresariais e institucionais, e a promoção da língua portuguesa como vetor de cooperação económica e cultural.

"Entre Portugal e o Brasil não podem existir entraves, temos de construir pontes que unam a nossa rica e diversificada cultura", afirma Paulo Campos Costa, sintetizando o espírito que orienta a sua liderança à frente da Fundação.

Sob a sua presidência, a Fundação Luso-Brasileira tem reforçado a sua presença institucional, ampliado a rede de parceiros e desenvolvido iniciativas que aproximam pessoas, empresas e comunidades dos dois lados do Atlântico.'
WHERE name = 'Paulo Campos Costa';

-- ─────────────────────────────────────────────────────────────────────────────

UPDATE partners SET
  role        = 'Diretor',
  tier        = 'direcao',
  "order"     = 2,
  country     = 'PT',
  category    = 'Governança',
  active      = true,
  tags        = ARRAY['Direção', 'Estratégia', 'Parcerias'],
  summary     = 'Integra a Direção da Fundação Luso-Brasileira com responsabilidade pela coordenação estratégica e pelo desenvolvimento de iniciativas institucionais. A sua atuação centra-se no fortalecimento das parcerias e na promoção das atividades da Fundação junto dos seus membros e parceiros.',
  "full"      = 'Álvaro Covões integra a Direção da Fundação Luso-Brasileira, onde contribui para a definição e execução da estratégia institucional da organização.

Com experiência consolidada na gestão de projetos e no relacionamento institucional, dedica-se à coordenação das iniciativas da Fundação e ao desenvolvimento das suas parcerias estratégicas, tanto em Portugal como no Brasil.

A sua ação na Direção é orientada pela convicção de que o espaço lusófono representa uma oportunidade única de cooperação, e de que a Fundação tem um papel central na concretização dessas pontes.'
WHERE name = 'Álvaro Covões';

-- ─────────────────────────────────────────────────────────────────────────────

UPDATE partners SET
  role        = 'Diretor',
  tier        = 'direcao',
  "order"     = 3,
  country     = 'PT',
  category    = 'Governança',
  active      = true,
  tags        = ARRAY['Direção', 'Gestão', 'Cooperação'],
  summary     = 'Membro da Direção da Fundação Luso-Brasileira, contribui para o planeamento e execução das iniciativas institucionais, com especial enfoque no relacionamento com os membros e na dinamização da atividade da Fundação.',
  "full"      = 'Pedro Ribeiro faz parte da Direção da Fundação Luso-Brasileira, onde assume responsabilidades no planeamento estratégico e na gestão das relações institucionais da organização.

A sua participação na Direção reflete o compromisso com a missão da Fundação de promover a cooperação entre Portugal, Brasil e os restantes países de língua portuguesa, através de iniciativas culturais, educativas e empresariais de impacto.'
WHERE name = 'Pedro Ribeiro';

-- ─────────────────────────────────────────────────────────────────────────────

UPDATE partners SET
  role        = 'Secretário Geral',
  tier        = 'secretario-geral',
  "order"     = 4,
  country     = 'PT',
  category    = 'Governança',
  active      = true,
  tags        = ARRAY['Secretariado', 'Administração', 'Coordenação'],
  summary     = 'Responsável pela coordenação administrativa e operacional da Fundação, João Pedro Carvalho assegura o funcionamento eficiente dos órgãos sociais e a articulação entre as diferentes áreas de atividade da instituição.',
  "full"      = 'João Pedro Carvalho desempenha as funções de Secretário Geral da Fundação Luso-Brasileira, cargo de responsabilidade central na coordenação administrativa e operacional da instituição.

O Secretário Geral é o eixo que garante a articulação entre os órgãos sociais e as diferentes iniciativas da Fundação, assegurando que os processos internos funcionam com eficiência e que a missão institucional é suportada por uma estrutura operacional robusta.

Com um perfil marcado pela atenção ao detalhe, pela capacidade de coordenação e pelo rigor na gestão, João Pedro Carvalho tem sido fundamental para a consolidação organizacional da Fundação Luso-Brasileira e para o bom funcionamento da sua estrutura de governança.

O seu trabalho inclui a gestão das comunicações institucionais, o apoio à organização de eventos e a coordenação com parceiros e membros da Fundação em Portugal e no Brasil.'
WHERE name = 'João Pedro Carvalho';

-- ─────────────────────────────────────────────────────────────────────────────

UPDATE partners SET
  role        = 'Vogal',
  tier        = 'vogal',
  "order"     = 5,
  country     = 'BR',
  category    = 'Governança',
  active      = true,
  tags        = ARRAY['Vogal', 'Conselho', 'Brasil'],
  summary     = 'Vogal do Conselho de Administração da Fundação Luso-Brasileira, contribui com a sua experiência para o fortalecimento das relações luso-brasileiras e para o desenvolvimento das iniciativas da Fundação.',
  "full"      = 'Fernando Guntovitch integra o Conselho de Administração da Fundação Luso-Brasileira na qualidade de Vogal, trazendo uma perspetiva valiosa para a governança da instituição.

A sua participação no Conselho reflete o compromisso com os valores e a missão da Fundação, contribuindo para as deliberações estratégicas e para a orientação das atividades da organização.'
WHERE name = 'Fernando Guntovitch';

-- ─────────────────────────────────────────────────────────────────────────────

UPDATE partners SET
  role        = 'Vogal',
  tier        = 'vogal',
  "order"     = 6,
  country     = 'PT',
  category    = 'Governança',
  active      = true,
  tags        = ARRAY['Vogal', 'Conselho', 'Estratégia'],
  summary     = 'Vogal do Conselho de Administração, Tomás Froes contribui para a orientação estratégica da Fundação Luso-Brasileira e para o desenvolvimento das suas iniciativas institucionais.',
  "full"      = 'Tomás Froes é Vogal do Conselho de Administração da Fundação Luso-Brasileira, participando ativamente nas decisões estratégicas da instituição.

O seu envolvimento na Fundação traduz-se numa contribuição constante para o fortalecimento da missão institucional e para a dinamização das relações entre Portugal e Brasil.'
WHERE name = 'Tomás Froes';

-- ─────────────────────────────────────────────────────────────────────────────

UPDATE partners SET
  role        = 'Vogal',
  tier        = 'vogal',
  "order"     = 7,
  country     = 'PT',
  category    = 'Governança',
  active      = true,
  tags        = ARRAY['Vogal', 'Conselho', 'Governança'],
  summary     = 'Vogal do Conselho de Administração da Fundação Luso-Brasileira, Nuno Fernandes Thomaz participa na definição das orientações estratégicas da instituição e no acompanhamento das suas iniciativas.',
  "full"      = 'Nuno Fernandes Thomaz integra o Conselho de Administração da Fundação Luso-Brasileira como Vogal, contribuindo com a sua experiência e visão para a governança da instituição.

A sua participação nas deliberações do Conselho é orientada pelo compromisso com os valores da Fundação e pela convicção de que a cooperação luso-brasileira é um vetor fundamental de desenvolvimento para ambos os países.'
WHERE name = 'Nuno Fernandes Thomaz';

-- ─────────────────────────────────────────────────────────────────────────────

UPDATE partners SET
  role        = 'Vogal',
  tier        = 'vogal',
  "order"     = 8,
  country     = 'PT',
  category    = 'Governança',
  active      = true,
  tags        = ARRAY['Vogal', 'Conselho', 'Supervisão'],
  summary     = 'Vogal do Conselho de Administração da Fundação Luso-Brasileira, Francisco Teixeira contribui para a supervisão e orientação estratégica da Fundação.',
  "full"      = 'Francisco Teixeira é Vogal do Conselho de Administração da Fundação Luso-Brasileira, participando nas instâncias de governança da instituição.

O seu envolvimento reflete o compromisso com a missão da Fundação de promover a cooperação cultural, educativa e empresarial entre Portugal, Brasil e o espaço lusófono.'
WHERE name = 'Francisco Teixeira';
