// data/partners.data.ts

export interface PartnerSeed {
  id: string;
  name: string;
  type: 'empresa' | 'pessoa';
  category: 'Parceiro Platinum' | 'Parceiro Gold' | 'Parceiro Silver' | 'Apoio Público' | 'Outro Apoio' | 'Exposição' | 'Governança';
  image: string;
  bio: string;
  bioFull: string;
  website?: string;
  since?: string;
  country?: string;
  tags?: string[];
  pageRoute?: string;
}

export const PARTNERS_SEED: PartnerSeed[] = [
  // PARCEIROS PLATINUM
  {
    id: 'legaltech-space',
    name: 'Legaltech Space Group',
    type: 'empresa',
    category: 'Parceiro Platinum',
    image: 'https://placehold.co/400x200/0f1729/c9af88?text=Legaltech+Space',
    bio: 'Responsável pela infraestrutura digital da plataforma da Fundação Luso-Brasileira.',
    bioFull: `A Legaltech Space Group é a empresa por detrás de toda a infraestrutura digital da Fundação Luso-Brasileira. Desde a arquitetura da plataforma ao design de cada componente, a equipa da Legaltech Space construiu de raiz o ecossistema digital que suporta membros, eventos, parceiros e experiências.

Com uma abordagem que combina tecnologia de ponta, design cuidado e estratégia de negócio, a Legaltech Space é mais do que um parceiro tecnológico — é a força criativa por detrás da identidade digital da Fundação.`,
    pageRoute: '/legaltech-space',
    tags: ['Tecnologia', 'Design', 'Estratégia', 'Web'],
  },

  // PARCEIROS GOLD
  {
    id: 'edp',
    name: 'EDP',
    type: 'empresa',
    category: 'Parceiro Gold',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e2/EDP_logo.svg/1024px-EDP_logo.svg.png',
    since: '1998',
    country: 'PT',
    bio: 'Energias de Portugal, uma das maiores empresas de energia da Península Ibérica e fundadora da Fundação Luso-Brasileira.',
    bioFull: `A EDP — Energias de Portugal é uma das maiores e mais internacionalizadas empresas de energia do mundo, com presença em vários continentes e uma história de forte envolvimento com o Brasil, onde opera há décadas.

Enquanto membro fundador da Fundação Luso-Brasileira desde 1998, a EDP tem sido um pilar fundamental para a missão da instituição, apoiando iniciativas culturais, educativas e de cooperação entre Portugal e Brasil.

O seu compromisso com a sustentabilidade e com a transição energética alinha-se com a visão da Fundação de um espaço lusófono próspero e inovador, onde a colaboração entre os dois países cria valor para as suas comunidades.`,
    website: 'https://www.edp.com',
    tags: ['Energia', 'Sustentabilidade', 'Portugal', 'Brasil'],
  },
  {
    id: 'galp',
    name: 'Galp',
    type: 'empresa',
    category: 'Parceiro Gold',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b4/Galp_logo.svg/1024px-Galp_logo.svg.png',
    since: '1998',
    country: 'PT',
    bio: 'Empresa de energia portuguesa com forte presença no Brasil e membro fundador da Fundação Luso-Brasileira.',
    bioFull: `A Galp é um grupo energético português com operações em mais de 10 países, incluindo uma presença histórica e relevante no Brasil, onde desenvolve atividades de exploração e produção de petróleo e gás natural.

Como membro fundador da Fundação Luso-Brasileira, a Galp partilha o compromisso com o fortalecimento das relações luso-brasileiras, contribuindo para iniciativas que aproximam os dois países nas dimensões cultural, empresarial e institucional.`,
    website: 'https://www.galp.com',
    tags: ['Energia', 'Petróleo', 'Portugal', 'Brasil'],
  },
  {
    id: 'millennium-bcp',
    name: 'Millennium BCP',
    type: 'empresa',
    category: 'Parceiro Gold',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5a/Millennium_bcp_logo.svg/1024px-Millennium_bcp_logo.svg.png',
    since: '1998',
    country: 'PT',
    bio: 'Maior banco privado português e membro fundador da Fundação Luso-Brasileira, com vasta experiência nas relações financeiras luso-brasileiras.',
    bioFull: `O Millennium BCP é o maior banco privado português, com uma rede de clientes que abrange Portugal, Polónia, Moçambique e outros mercados internacionais. Historicamente ligado ao Brasil através de parcerias e investimentos, o Millennium BCP foi um dos membros fundadores da Fundação Luso-Brasileira.

O banco tem sido um parceiro constante nas iniciativas da Fundação, contribuindo para o desenvolvimento de programas que fortalecem as relações económicas e culturais entre Portugal e Brasil, e que promovem o espaço lusófono como área de oportunidade e cooperação.`,
    website: 'https://www.millenniumbcp.pt',
    tags: ['Banca', 'Finanças', 'Portugal'],
  },
  {
    id: 'caixa-geral-depositos',
    name: 'Caixa Geral de Depósitos',
    type: 'empresa',
    category: 'Parceiro Gold',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4f/CGD_logo.svg/1024px-CGD_logo.svg.png',
    since: '1998',
    country: 'PT',
    bio: 'Banco público português e membro fundador da Fundação, com papel central no financiamento de projetos de cooperação luso-brasileira.',
    bioFull: `A Caixa Geral de Depósitos (CGD) é o maior banco português e uma das principais instituições financeiras do espaço lusófono. Como banco público, tem uma missão que vai além do negócio financeiro, incluindo o apoio ao desenvolvimento cultural e económico de Portugal e dos países com quem mantém laços históricos.

Membro fundador da Fundação Luso-Brasileira desde 1998, a CGD tem contribuído ativamente para a missão da instituição, apoiando programas que promovem a cooperação entre Portugal e Brasil nas dimensões cultural, educativa e empresarial.`,
    website: 'https://www.cgd.pt',
    tags: ['Banca', 'Público', 'Portugal'],
  },
  {
    id: 'tap-air-portugal',
    name: 'TAP Air Portugal',
    type: 'empresa',
    category: 'Parceiro Gold',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/TAP_Air_Portugal_logo.svg/1024px-TAP_Air_Portugal_logo.svg.png',
    since: '1998',
    country: 'PT',
    bio: 'Companhia aérea nacional portuguesa e membro fundador da Fundação, conectando Portugal e Brasil através do Atlântico há décadas.',
    bioFull: `A TAP Air Portugal é a companhia aérea nacional de Portugal e uma das operadoras com maior experiência nas rotas transatlânticas entre a Europa e o Brasil. Com voos regulares para várias cidades brasileiras, a TAP é, literalmente, a ponte que une os dois países.

Como membro fundador da Fundação Luso-Brasileira, a TAP partilha a visão de que aproximar Portugal e Brasil é uma missão com dimensão histórica e cultural. O seu envolvimento com a Fundação traduz-se no apoio a iniciativas que facilitam a mobilidade, o intercâmbio e a cooperação entre os dois países.`,
    website: 'https://www.flytap.com',
    tags: ['Aviação', 'Transporte', 'Portugal', 'Brasil'],
  },
  {
    id: 'vila-gale',
    name: 'Vila Galé',
    type: 'empresa',
    category: 'Parceiro Gold',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/Vila_Gal%C3%A9_logo.svg/1024px-Vila_Gal%C3%A9_logo.svg.png',
    since: '2020',
    country: 'PT',
    bio: 'Grupo hoteleiro português com forte presença no Brasil, parceiro da Fundação Luso-Brasileira.',
    bioFull: `O Vila Galé é um dos maiores grupos hoteleiros portugueses, com mais de 40 hotéis em Portugal e no Brasil. A sua expansão para o mercado brasileiro é um exemplo do dinamismo das relações empresariais luso-brasileiras.

Enquanto parceiro da Fundação Luso-Brasileira, o Vila Galé contribui para a promoção do espaço lusófono como destino de eleição para o turismo, os negócios e a cultura.`,
    website: 'https://www.vilagale.com',
    tags: ['Hotelaria', 'Turismo', 'Portugal', 'Brasil'],
  },
  {
    id: 'tivoli',
    name: 'Tivoli Hotels & Resorts',
    type: 'empresa',
    category: 'Parceiro Gold',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/Tivoli_Hotels_%26_Resorts_logo.svg/1024px-Tivoli_Hotels_%26_Resorts_logo.svg.png',
    since: '2020',
    country: 'PT',
    bio: 'Cadeia hoteleira de luxo portuguesa parceira da Fundação Luso-Brasileira.',
    bioFull: `O Tivoli Hotels & Resorts é uma cadeia hoteleira de luxo com raízes em Lisboa e presença internacional. Os seus hotéis são referência de hospitalidade e elegância, refletindo o melhor da tradição portuguesa.

A parceria com a Fundação Luso-Brasileira reforça o compromisso do Tivoli com a promoção da cultura e da identidade lusófona no mundo.`,
    website: 'https://www.tivolihotels.com',
    tags: ['Hotelaria', 'Luxo', 'Portugal'],
  },

  // PARCEIROS SILVER
  {
    id: 'acp',
    name: 'ACP',
    type: 'empresa',
    category: 'Parceiro Silver',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6e/ACP_Automóvel_Clube_de_Portugal_logo.svg/1024px-ACP_Automóvel_Clube_de_Portugal_logo.svg.png',
    since: '2022',
    country: 'PT',
    bio: 'Automóvel Clube de Portugal, parceiro da Fundação Luso-Brasileira.',
    bioFull: `O ACP — Automóvel Clube de Portugal é uma das mais antigas e prestigiadas organizações de mobilidade de Portugal, com uma história de mais de 120 anos ao serviço dos automobilistas portugueses.

A parceria com a Fundação Luso-Brasileira enquadra-se no compromisso do ACP com a promoção da mobilidade segura e sustentável no espaço lusófono.`,
    website: 'https://www.acp.pt',
    tags: ['Mobilidade', 'Automóvel', 'Portugal'],
  },

  // OUTROS APOIOS
  {
    id: 'imga',
    name: 'IMGA',
    type: 'empresa',
    category: 'Outro Apoio',
    image: 'https://placehold.co/400x200/1a1a2e/ffffff?text=IMGA',
    since: '2023',
    country: 'PT',
    bio: 'Apoiante da Fundação Luso-Brasileira.',
    bioFull: 'IMGA é apoiante da Fundação Luso-Brasileira, contribuindo para as suas iniciativas culturais e institucionais.',
    tags: [],
  },
  {
    id: 'isq-brasil',
    name: 'ISQ Brasil',
    type: 'empresa',
    category: 'Outro Apoio',
    image: 'https://placehold.co/400x200/1a1a2e/ffffff?text=ISQ+Brasil',
    since: '2023',
    country: 'BR',
    bio: 'Apoiante da Fundação Luso-Brasileira.',
    bioFull: 'ISQ Brasil é apoiante da Fundação Luso-Brasileira, contribuindo para as suas iniciativas culturais e institucionais.',
    tags: [],
  },
  {
    id: 'tazte',
    name: 'Tazte',
    type: 'empresa',
    category: 'Outro Apoio',
    image: 'https://placehold.co/400x200/1a1a2e/ffffff?text=Tazte',
    since: '2023',
    country: 'PT',
    bio: 'Apoiante da Fundação Luso-Brasileira.',
    bioFull: 'Tazte é apoiante da Fundação Luso-Brasileira, contribuindo para as suas iniciativas culturais e institucionais.',
    tags: [],
  },
  {
    id: 'vista-alegre',
    name: 'Vista Alegre',
    type: 'empresa',
    category: 'Outro Apoio',
    image: 'https://placehold.co/400x200/1a1a2e/ffffff?text=Vista+Alegre',
    since: '2023',
    country: 'PT',
    bio: 'Apoiante da Fundação Luso-Brasileira.',
    bioFull: 'Vista Alegre é apoiante da Fundação Luso-Brasileira, contribuindo para as suas iniciativas culturais e institucionais.',
    tags: [],
  },
  {
    id: 'allure-production-paris',
    name: 'Allure Production Paris',
    type: 'empresa',
    category: 'Outro Apoio',
    image: 'https://placehold.co/400x200/1a1a2e/ffffff?text=Allure+Production',
    since: '2023',
    country: 'FR',
    bio: 'Apoiante da Fundação Luso-Brasileira.',
    bioFull: 'Allure Production Paris é apoiante da Fundação Luso-Brasileira, contribuindo para as suas iniciativas culturais e institucionais.',
    tags: [],
  },
  {
    id: 'teu-site-sandro',
    name: 'Teu site - Sandro',
    type: 'empresa',
    category: 'Outro Apoio',
    image: 'https://placehold.co/400x200/1a1a2e/ffffff?text=Teu+site',
    since: '2023',
    country: 'PT',
    bio: 'Apoiante da Fundação Luso-Brasileira.',
    bioFull: 'Teu site - Sandro é apoiante da Fundação Luso-Brasileira, contribuindo para as suas iniciativas culturais e institucionais.',
    tags: [],
  },
  {
    id: 'convento-espinheiro',
    name: 'Convento Espinheiro',
    type: 'empresa',
    category: 'Outro Apoio',
    image: 'https://placehold.co/400x200/1a1a2e/ffffff?text=Convento+Espinheiro',
    since: '2023',
    country: 'PT',
    bio: 'Apoiante da Fundação Luso-Brasileira.',
    bioFull: 'Convento Espinheiro é apoiante da Fundação Luso-Brasileira, contribuindo para as suas iniciativas culturais e institucionais.',
    tags: [],
  },
  {
    id: 'turismo-de-portugal',
    name: 'Turismo de Portugal',
    type: 'empresa',
    category: 'Outro Apoio',
    image: 'https://placehold.co/400x200/1a1a2e/ffffff?text=Turismo+de+Portugal',
    since: '2023',
    country: 'PT',
    bio: 'Apoiante da Fundação Luso-Brasileira.',
    bioFull: 'Turismo de Portugal é apoiante da Fundação Luso-Brasileira, contribuindo para as suas iniciativas culturais e institucionais.',
    tags: [],
  },
  {
    id: 'casino-estoril',
    name: 'Casino Estoril',
    type: 'empresa',
    category: 'Outro Apoio',
    image: 'https://placehold.co/400x200/1a1a2e/ffffff?text=Casino+Estoril',
    since: '2023',
    country: 'PT',
    bio: 'Apoiante da Fundação Luso-Brasileira.',
    bioFull: 'Casino Estoril é apoiante da Fundação Luso-Brasileira, contribuindo para as suas iniciativas culturais e institucionais.',
    tags: [],
  },
];

export const getParceirosPorCategoria = (category: PartnerSeed['category']) =>
  PARTNERS_SEED.filter(p => p.category === category);
