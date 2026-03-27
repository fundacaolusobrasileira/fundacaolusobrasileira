# Refatoração Institucional — Fundação Luso-Brasileira

> **For agentic workers:** Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan.

**Goal:** Refatorar o projeto em uma plataforma institucional com arquitetura limpa, dados estruturados, conteúdo expansível e hierarquia de membros correta.

**Architecture:** Static seed data (members.data.ts, partners.data.ts, content.data.ts) + Supabase para conteúdo editável (bios, eventos). Merge service combina seed + Supabase com precedência para Supabase. Todos os arquivos migram para estrutura de pastas com separação clara de responsabilidades.

**Tech Stack:** React 19, TypeScript, Vite 6, Supabase, Tailwind CDN, React Router 7, Lucide React

**Spec:** `docs/superpowers/specs/2026-03-18-refatoracao-institucional-design.md`

---

## Chunk 1: Foundation — Types, Data, Hooks

### Task 1: Criar types/index.ts

**Files:**
- Create: `types/index.ts`

- [ ] Criar o arquivo com todos os tipos centralizados:

```typescript
// types/index.ts
import React from 'react';

export type MemberTier = 'presidente' | 'direcao' | 'secretario-geral' | 'vogal';

export type PartnerType = 'pessoa' | 'empresa';
export type PartnerCategory = 'Fundador' | 'Apoiador' | 'Institucional' | 'Parceiro' | 'Amigo' | 'Governança';

export interface SocialLinks {
  youtube?: string;
  linkedin?: string;
  twitter?: string;
  facebook?: string;
  instagram?: string;
}

export interface MemberSeed {
  id: string;
  order: number;
  tier: MemberTier;
  name: string;
  role: string;
  summary: string;
  full: string;
  image?: string;
  country?: string;
  tags?: string[];
}

export interface Partner {
  id: string;
  name: string;
  type: PartnerType;
  category: PartnerCategory;
  image?: string;
  role?: string;
  country?: string;
  bio?: string;
  website?: string;
  socialLinks?: SocialLinks;
  avatar?: string;
  tags?: string[];
  since?: string;
  active?: boolean;
  featured?: boolean;
  order?: number;
  // Merged from MemberSeed
  tier?: MemberTier;
  summary?: string;
  full?: string;
}

export interface ContentBlock {
  id: string;
  title: string;
  summary: string;
  full: string;
}

export type Pillar = {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
};

export type Space = {
  id: string;
  name: string;
  location: string;
  description: string;
  image: string;
};

export type EventCategory = '33 Anos' | 'Fundação' | 'Embaixada' | 'Outros';
export type MediaSource = 'oficial' | 'comunidade';
export type MediaStatus = 'published' | 'pending' | 'rejected';

export interface GalleryItem {
  id: string;
  kind: 'image' | 'video';
  srcType: 'url';
  url: string;
  caption?: string;
  authorName?: string;
  email?: string;
  source: MediaSource;
  status: MediaStatus;
  createdAt: string;
  order: number;
}

export interface EventLinks {
  registration?: string;
  website?: string;
}

export interface Event {
  id: string;
  title: string;
  subtitle?: string;
  date: string;
  time?: string;
  endDate?: string;
  endTime?: string;
  location: string;
  address?: string;
  city?: string;
  country?: string;
  category: EventCategory;
  descriptionShort?: string;
  description: string;
  objective?: string;
  experience?: string;
  sponsors?: string;
  tags?: string[];
  image: string;
  coverImage?: string;
  gallery: GalleryItem[];
  media?: any[];
  links?: EventLinks;
  socialLinks?: SocialLinks;
  status: 'draft' | 'published';
  featured: boolean;
  notes?: string;
}

export interface PreCadastro {
  id: string;
  name: string;
  email: string;
  type: string;
  message?: string;
  status: 'novo' | 'contatado' | 'aprovado' | 'rejeitado' | 'convertido';
  createdAt: string;
  notes?: string;
}

export type PendingMediaSubmission = {
  id: string;
  eventId: string;
  type: 'image' | 'video';
  url: string;
  authorName: string;
  email: string;
  message?: string;
  createdAt: string;
};

export type AuthSession = {
  isLoggedIn: boolean;
  role: 'editor' | 'viewer';
  displayName?: string;
  lastLoginAt?: string;
  userId?: string;
};

export type ActivityLogItem = {
  id: string;
  action: string;
  target: string;
  timestamp: string;
  user?: string;
};
```

- [ ] Verificar no browser: `npm run dev` sem erros de TS

- [ ] Commit:
```bash
git add types/index.ts
git commit -m "feat: add centralized TypeScript types"
```

---

### Task 2: Criar data/members.data.ts

**Files:**
- Create: `data/members.data.ts`

- [ ] Criar o arquivo com seed hierárquico obrigatório:

```typescript
// data/members.data.ts
import { MemberSeed } from '../types';

export const MEMBERS_SEED: MemberSeed[] = [
  {
    id: 'paulo-campos-costa',
    order: 1,
    tier: 'presidente',
    name: 'Paulo Campos Costa',
    role: 'Presidente',
    country: 'PT',
    image: '/presidente.webp',
    summary: 'Lidera a Fundação Luso-Brasileira com o compromisso de fortalecer os laços culturais, económicos e institucionais entre Portugal, Brasil e os países lusófonos. Com uma trajetória marcada pela liderança em grandes organizações internacionais, Paulo Campos Costa traz à Fundação uma visão estratégica de longo prazo.',
    full: `Paulo Campos Costa assumiu a presidência da Fundação Luso-Brasileira com a missão de renovar e ampliar o impacto institucional da organização no espaço lusófono. Com uma carreira de décadas em posições de liderança — incluindo passagem pela EDP a nível global —, traz consigo uma rede de relacionamentos de alto nível em Portugal, no Brasil e nos mercados internacionais.

A sua visão para a Fundação assenta em três pilares fundamentais: a recuperação e fortalecimento de relações históricas entre os dois países, o impulso a novas parcerias empresariais e institucionais, e a promoção da língua portuguesa como vetor de cooperação económica e cultural.

"Entre Portugal e o Brasil não podem existir entraves, temos de construir pontes que unam a nossa rica e diversificada cultura", afirma Paulo Campos Costa, sintetizando o espírito que orienta a sua liderança à frente da Fundação.

Sob a sua presidência, a Fundação Luso-Brasileira tem reforçado a sua presença institucional, ampliado a rede de parceiros e desenvolvido iniciativas que aproximam pessoas, empresas e comunidades dos dois lados do Atlântico.`,
    tags: ['Presidência', 'EDP', 'Liderança', 'Lusofonia'],
  },
  {
    id: 'alvaro-covoes',
    order: 2,
    tier: 'direcao',
    name: 'Álvaro Covões',
    role: 'Diretor',
    country: 'PT',
    summary: 'Integra a Direção da Fundação Luso-Brasileira com responsabilidade pela coordenação estratégica e pelo desenvolvimento de iniciativas institucionais. A sua atuação centra-se no fortalecimento das parcerias e na promoção das atividades da Fundação junto dos seus membros e parceiros.',
    full: `Álvaro Covões integra a Direção da Fundação Luso-Brasileira, onde contribui para a definição e execução da estratégia institucional da organização.

Com experiência consolidada na gestão de projetos e no relacionamento institucional, dedica-se à coordenação das iniciativas da Fundação e ao desenvolvimento das suas parcerias estratégicas, tanto em Portugal como no Brasil.

A sua ação na Direção é orientada pela convicção de que o espaço lusófono representa uma oportunidade única de cooperação, e de que a Fundação tem um papel central na concretização dessas pontes.`,
    tags: ['Direção', 'Estratégia', 'Parcerias'],
  },
  {
    id: 'pedro-ribeiro',
    order: 3,
    tier: 'direcao',
    name: 'Pedro Ribeiro',
    role: 'Diretor',
    country: 'PT',
    summary: 'Membro da Direção da Fundação Luso-Brasileira, contribui para o planeamento e execução das iniciativas institucionais, com especial enfoque no relacionamento com os membros e na dinamização da atividade da Fundação.',
    full: `Pedro Ribeiro faz parte da Direção da Fundação Luso-Brasileira, onde assume responsabilidades no planeamento estratégico e na gestão das relações institucionais da organização.

A sua participação na Direção reflete o compromisso com a missão da Fundação de promover a cooperação entre Portugal, Brasil e os restantes países de língua portuguesa, através de iniciativas culturais, educativas e empresariais de impacto.`,
    tags: ['Direção', 'Gestão', 'Cooperação'],
  },
  {
    id: 'joao-pedro-carvalho',
    order: 4,
    tier: 'secretario-geral',
    name: 'João Pedro Carvalho',
    role: 'Secretário Geral',
    country: 'PT',
    summary: 'Responsável pela coordenação administrativa e operacional da Fundação, João Pedro Carvalho assegura o funcionamento eficiente dos órgãos sociais e a articulação entre as diferentes áreas de atividade da instituição.',
    full: `João Pedro Carvalho desempenha as funções de Secretário Geral da Fundação Luso-Brasileira, cargo de responsabilidade central na coordenação administrativa e operacional da instituição.

O Secretário Geral é o eixo que garante a articulação entre os órgãos sociais e as diferentes iniciativas da Fundação, assegurando que os processos internos funcionam com eficiência e que a missão institucional é suportada por uma estrutura operacional robusta.

Com um perfil marcado pela atenção ao detalhe, pela capacidade de coordenação e pelo rigor na gestão, João Pedro Carvalho tem sido fundamental para a consolidação organizacional da Fundação Luso-Brasileira e para o bom funcionamento da sua estrutura de governança.

O seu trabalho inclui a gestão das comunicações institucionais, o apoio à organização de eventos e a coordenação com parceiros e membros da Fundação em Portugal e no Brasil.`,
    tags: ['Secretariado', 'Administração', 'Coordenação'],
  },
  {
    id: 'fernando-guntovitch',
    order: 5,
    tier: 'vogal',
    name: 'Fernando Guntovitch',
    role: 'Vogal',
    country: 'BR',
    summary: 'Vogal do Conselho de Administração da Fundação Luso-Brasileira, contribui com a sua experiência para o fortalecimento das relações luso-brasileiras e para o desenvolvimento das iniciativas da Fundação.',
    full: `Fernando Guntovitch integra o Conselho de Administração da Fundação Luso-Brasileira na qualidade de Vogal, trazendo uma perspetiva valiosa para a governança da instituição.

A sua participação no Conselho reflete o compromisso com os valores e a missão da Fundação, contribuindo para as deliberações estratégicas e para a orientação das atividades da organização.`,
    tags: ['Vogal', 'Conselho', 'Brasil'],
  },
  {
    id: 'tomas-froes',
    order: 6,
    tier: 'vogal',
    name: 'Tomás Froes',
    role: 'Vogal',
    country: 'PT',
    summary: 'Vogal do Conselho de Administração, Tomás Froes contribui para a orientação estratégica da Fundação Luso-Brasileira e para o desenvolvimento das suas iniciativas institucionais.',
    full: `Tomás Froes é Vogal do Conselho de Administração da Fundação Luso-Brasileira, participando ativamente nas decisões estratégicas da instituição.

O seu envolvimento na Fundação traduz-se numa contribuição constante para o fortalecimento da missão institucional e para a dinamização das relações entre Portugal e Brasil.`,
    tags: ['Vogal', 'Conselho', 'Estratégia'],
  },
  {
    id: 'nuno-fernandes-thomaz',
    order: 7,
    tier: 'vogal',
    name: 'Nuno Fernandes Thomaz',
    role: 'Vogal',
    country: 'PT',
    summary: 'Vogal do Conselho de Administração da Fundação Luso-Brasileira, Nuno Fernandes Thomaz participa na definição das orientações estratégicas da instituição e no acompanhamento das suas iniciativas.',
    full: `Nuno Fernandes Thomaz integra o Conselho de Administração da Fundação Luso-Brasileira como Vogal, contribuindo com a sua experiência e visão para a governança da instituição.

A sua participação nas deliberações do Conselho é orientada pelo compromisso com os valores da Fundação e pela convicção de que a cooperação luso-brasileira é um vetor fundamental de desenvolvimento para ambos os países.`,
    tags: ['Vogal', 'Conselho', 'Governança'],
  },
  {
    id: 'francisco-teixeira',
    order: 8,
    tier: 'vogal',
    name: 'Francisco Teixeira',
    role: 'Vogal',
    country: 'PT',
    summary: 'Vogal do Conselho de Administração da Fundação Luso-Brasileira, Francisco Teixeira contribui para a supervisão e orientação estratégica da Fundação.',
    full: `Francisco Teixeira é Vogal do Conselho de Administração da Fundação Luso-Brasileira, participando nas instâncias de governança da instituição.

O seu envolvimento reflete o compromisso com a missão da Fundação de promover a cooperação cultural, educativa e empresarial entre Portugal, Brasil e o espaço lusófono.`,
    tags: ['Vogal', 'Conselho', 'Supervisão'],
  },
];

export const getMemberByTier = (tier: MemberSeed['tier']) =>
  MEMBERS_SEED.filter(m => m.tier === tier).sort((a, b) => a.order - b.order);
```

- [ ] Commit:
```bash
git add data/members.data.ts
git commit -m "feat: add members seed data with hierarchy"
```

---

### Task 3: Criar data/partners.data.ts

**Files:**
- Create: `data/partners.data.ts`

- [ ] Criar com os parceiros fundadores:

```typescript
// data/partners.data.ts
export interface PartnerSeed {
  id: string;
  name: string;
  type: 'empresa' | 'pessoa';
  category: 'Fundador' | 'Apoiador' | 'Institucional' | 'Parceiro' | 'Amigo';
  image: string;
  bio: string;
  bioFull: string;
  website?: string;
  since?: string;
  country?: string;
  tags?: string[];
}

export const PARTNERS_SEED: PartnerSeed[] = [
  {
    id: 'edp',
    name: 'EDP',
    type: 'empresa',
    category: 'Fundador',
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
    category: 'Fundador',
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
    category: 'Fundador',
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
    category: 'Fundador',
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
    category: 'Fundador',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/TAP_Air_Portugal_logo.svg/1024px-TAP_Air_Portugal_logo.svg.png',
    since: '1998',
    country: 'PT',
    bio: 'Companhia aérea nacional portuguesa e membro fundador da Fundação, conectando Portugal e Brasil através do Atlântico há décadas.',
    bioFull: `A TAP Air Portugal é a companhia aérea nacional de Portugal e uma das operadoras com maior experiência nas rotas transatlânticas entre a Europa e o Brasil. Com voos regulares para várias cidades brasileiras, a TAP é, literalmente, a ponte que une os dois países.

Como membro fundador da Fundação Luso-Brasileira, a TAP partilha a visão de que aproximar Portugal e Brasil é uma missão com dimensão histórica e cultural. O seu envolvimento com a Fundação traduz-se no apoio a iniciativas que facilitam a mobilidade, o intercâmbio e a cooperação entre os dois países.`,
    website: 'https://www.flytap.com',
    tags: ['Aviação', 'Transporte', 'Portugal', 'Brasil'],
  },
];

export const getFounders = () => PARTNERS_SEED.filter(p => p.category === 'Fundador');
```

- [ ] Commit:
```bash
git add data/partners.data.ts
git commit -m "feat: add founding partners seed data"
```

---

### Task 4: Criar data/content.data.ts

**Files:**
- Create: `data/content.data.ts`

- [ ] Criar com todos os textos institucionais:

```typescript
// data/content.data.ts
import { BookOpen, Landmark, Cpu, Palette } from 'lucide-react';
import type { Pillar } from '../types';

export const MISSION = {
  summary: 'A Fundação Luso-Brasileira tem por finalidade promover e apoiar iniciativas de carácter Cultural, Educativo, Tecnológico e Patrimonial a concretizar em Portugal, no Brasil e nos restantes países e territórios de Língua Portuguesa.',
  full: `A Fundação Luso-Brasileira foi constituída em 1998 com o propósito de criar uma plataforma permanente de cooperação entre Portugal e o Brasil, estendendo a sua ação a todos os países e territórios de Língua Portuguesa.

A sua missão é promover e apoiar iniciativas de carácter Cultural, Educativo, Tecnológico e Patrimonial, contribuindo para o fortalecimento dos laços históricos, culturais e económicos que unem os povos lusófonos.

Está ao serviço das empresas e de todos os agentes que promovem a aproximação económica, empresarial e cultural, em particular entre Portugal e o Brasil, mas também entre estes dois países e os restantes membros da Comunidade de Países de Língua Oficial Portuguesa (CPLP).

A Fundação acredita que a língua portuguesa é um ativo estratégico de dimensão global, capaz de gerar oportunidades únicas de cooperação, inovação e desenvolvimento para todos os que a partilham. Através das suas iniciativas, procura transformar esse potencial em resultados concretos — aproximando pessoas, instituições e mercados num espaço de confiança mútua e visão partilhada.`,
};

export const PRESIDENT_MESSAGE = {
  quote: '"É uma honra e um privilégio presidir a esta Fundação e uma enorme responsabilidade. A Língua Portuguesa interliga muitos continentes, países, personalidades, instituições e negócios, e por essa razão acredito que a Fundação deve recuperar relações antigas e impulsionar novas parcerias. Entre Portugal e o Brasil não podem existir entraves, temos de construir pontes que unam a nossa rica e diversificada cultura."',
  full: `"É uma honra e um privilégio presidir a esta Fundação e uma enorme responsabilidade. A Língua Portuguesa interliga muitos continentes, países, personalidades, instituições e negócios, e por essa razão acredito que a Fundação deve recuperar relações antigas e impulsionar novas parcerias. Entre Portugal e o Brasil não podem existir entraves, temos de construir pontes que unam a nossa rica e diversificada cultura.

A Fundação Luso-Brasileira tem um papel único a desempenhar neste contexto: ser o lugar onde empresas, instituições e personalidades dos dois países se encontram, partilham experiências e constroem projetos conjuntos. Não apenas para o benefício dos seus membros, mas para o bem das duas sociedades e das comunidades lusófonas em todo o mundo.

O nosso compromisso é com a excelência, a transparência e a perenidade. Queremos que cada iniciativa da Fundação seja um contributo real para o fortalecimento das relações luso-brasileiras — e que cada pessoa que se associa a nós sinta que faz parte de algo maior do que si própria.

Convido todos os que partilham esta visão a juntar-se a nós. Juntos, construiremos pontes que durarão gerações."`,
  author: 'Paulo Campos Costa',
  role: 'Presidente da Fundação',
  company: 'Ex-EDP Global',
};

export const HISTORY = {
  summary: 'Fundada em 1998 por um grupo de empresas visionárias de Portugal e Brasil, a Fundação Luso-Brasileira tem sido, ao longo de mais de duas décadas, uma plataforma de cooperação e diálogo entre os dois países.',
  full: `A Fundação Luso-Brasileira foi criada em 1998 com o impulso de um grupo de empresas e personalidades que acreditavam no potencial inexplorado das relações entre Portugal e o Brasil.

Num momento em que a globalização abria novas oportunidades, mas também novos desafios, os fundadores viram na criação de uma instituição dedicada à cooperação luso-brasileira uma forma de dar estrutura e perenidade a uma ligação que vai muito além dos negócios: uma relação de identidade partilhada, de história comum e de língua que nos une a todos.

Ao longo de mais de duas décadas, a Fundação tem sido palco de iniciativas que atravessam as dimensões cultural, educativa, tecnológica e patrimonial. Tem reunido presidentes de empresas, embaixadores, académicos, artistas e empreendedores em torno de um propósito comum: tornar o espaço lusófono mais coeso, mais próspero e mais influente no mundo.

Hoje, a Fundação Luso-Brasileira olha para o futuro com a ambição de expandir o seu alcance, aprofundar as suas parcerias e criar novas oportunidades para todos os que acreditam que a língua portuguesa é uma vantagem estratégica no século XXI.`,
};

export const PILLARS: Pillar[] = [
  {
    id: 'cultural',
    title: 'Cultural',
    description: 'Promoção de eventos, encontros e iniciativas que celebram a cultura lusófona e o intercâmbio entre artistas, instituições e comunidades.',
    icon: Palette,
  },
  {
    id: 'educativo',
    title: 'Educativo',
    description: 'Apoio a programas educacionais, intercâmbios académicos e projetos que ampliem o conhecimento e a cooperação entre universidades e instituições de ensino.',
    icon: BookOpen,
  },
  {
    id: 'tecnologico',
    title: 'Tecnológico',
    description: 'Fomento a parcerias e projetos tecnológicos que incentivem a inovação bilateral entre Portugal e Brasil, criando pontes entre os ecossistemas de startups dos dois países.',
    icon: Cpu,
  },
  {
    id: 'patrimonial',
    title: 'Patrimonial',
    description: 'Apoio à preservação de patrimónios históricos e memória cultural que ligam Portugal, Brasil e os países lusófonos numa identidade partilhada.',
    icon: Landmark,
  },
];
```

- [ ] Commit:
```bash
git add data/content.data.ts
git commit -m "feat: add institutional content data"
```

---

### Task 5: Criar data/events.data.ts

**Files:**
- Create: `data/events.data.ts`

- [ ] Criar seed do evento Gala 2025:

```typescript
// data/events.data.ts
import type { Event } from '../types';

export const EVENTS_SEED: Partial<Event>[] = [
  {
    id: 'gala-2025',
    title: 'Gala Fundação Luso-Brasileira 2025',
    subtitle: 'Uma noite de celebração da cultura e cooperação lusófona',
    category: 'Fundação',
    status: 'published',
    featured: true,
    date: '2025-11-15',
    time: '19:30',
    location: 'Lisboa',
    address: 'Palácio do Marquês de Pombal, Lisboa',
    city: 'Lisboa',
    country: 'PT',
    image: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=1200&q=80',
    descriptionShort: 'A Gala Anual da Fundação Luso-Brasileira reúne membros, parceiros e personalidades do mundo empresarial, cultural e diplomático numa noite de celebração dos laços que unem Portugal e Brasil.',
    description: `A Gala Anual da Fundação Luso-Brasileira é o momento alto do calendário institucional da Fundação — uma noite que reúne membros, parceiros, embaixadores e personalidades do mundo empresarial, cultural e diplomático de Portugal e do Brasil.

Mais do que um jantar de gala, este evento é uma celebração viva da missão da Fundação: aproximar os dois países, fortalecer relações e criar as condições para novas parcerias e iniciativas conjuntas.

A edição de 2025 marca um momento especial na história da Fundação, com a renovação dos seus órgãos sociais e o lançamento de uma nova fase da sua atividade, orientada por uma visão ambiciosa para a cooperação luso-brasileira no século XXI.`,
    objective: `O objetivo central da Gala é reunir, num ambiente de excelência e elegância, os membros e parceiros da Fundação Luso-Brasileira e as personalidades que, de diferentes formas, contribuem para o fortalecimento das relações entre Portugal e Brasil.

É também uma oportunidade para apresentar os resultados das iniciativas da Fundação ao longo do ano, reconhecer os contributos mais relevantes e lançar os projetos que marcarão o ano seguinte.`,
    experience: `Os convidados são recebidos com um cocktail de boas-vindas, seguido de um jantar de gala com menu português e brasileiro, harmonizado com vinhos selecionados de ambos os países.

A noite inclui momentos musicais e culturais que celebram a riqueza da lusofonia, bem como a entrega de distinções a personalidades e instituições que se destacaram no fortalecimento das relações luso-brasileiras.`,
    sponsors: `A Gala 2025 conta com o apoio dos membros fundadores da Fundação Luso-Brasileira — EDP, Galp, Millennium BCP, Caixa Geral de Depósitos e TAP Air Portugal — e de um conjunto de parceiros institucionais e empresariais que partilham a visão da Fundação.`,
    gallery: [],
    tags: ['Gala', 'Evento Anual', 'Lisboa', 'Networking'],
  },
];
```

- [ ] Commit:
```bash
git add data/events.data.ts
git commit -m "feat: add Gala 2025 event seed"
```

---

### Task 6: Criar hooks/

**Files:**
- Create: `hooks/useDebounce.ts`
- Create: `hooks/usePageMeta.ts`
- Create: `hooks/useFeedback.ts`

- [ ] Criar `hooks/useDebounce.ts`:

```typescript
import { useState, useEffect } from 'react';

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}
```

- [ ] Criar `hooks/usePageMeta.ts`:

```typescript
import { useEffect } from 'react';

export function usePageMeta(title: string, description?: string) {
  useEffect(() => {
    document.title = title;
    if (description) {
      const meta = document.querySelector('meta[name="description"]');
      if (meta) meta.setAttribute('content', description);
    }
    window.scrollTo({ top: 0 });
  }, [title, description]);
}
```

- [ ] Criar `hooks/useFeedback.ts`:

```typescript
import { showToast } from '../store/app.store';

export const useFeedback = () => ({
  showSuccess: (msg: string) => showToast(msg, 'success'),
  showError: (msg: string) => showToast(msg, 'error'),
  showInfo: (msg: string) => showToast(msg, 'info'),
  showWarning: (msg: string) => showToast(msg, 'warning'),
});
```

- [ ] Commit:
```bash
git add hooks/
git commit -m "feat: extract hooks into dedicated files"
```

---

## Chunk 2: Store + Services

### Task 7: Criar store/app.store.ts

**Files:**
- Create: `store/app.store.ts`

- [ ] Criar store centralizado (move exports do App.tsx):

```typescript
// store/app.store.ts
import { Event, Partner, PreCadastro, PendingMediaSubmission, ActivityLogItem, AuthSession } from '../types';

export const FLB_STATE_EVENT = 'flb_state_update';
export const FLB_TOAST_EVENT = 'flb_toast_event';

export const EVENTS: Event[] = [];
export const PARTNERS: Partner[] = [];
export const PRECADASTROS: PreCadastro[] = [];
export const PENDING_MEDIA_SUBMISSIONS: PendingMediaSubmission[] = [];
export const ACTIVITY_LOG: ActivityLogItem[] = [];
export let AUTH_SESSION: AuthSession = { isLoggedIn: false, role: 'viewer' };

export const setAuthSession = (session: AuthSession) => { AUTH_SESSION = session; };

export const notifyState = () => {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(FLB_STATE_EVENT));
};

export const showToast = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'success') => {
  if (typeof window !== 'undefined')
    window.dispatchEvent(new CustomEvent(FLB_TOAST_EVENT, { detail: { message, type } }));
};

export const generateId = (prefix: string) =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? `${prefix}-${crypto.randomUUID()}`
    : `${prefix}-${Date.now()}`;

export const logActivity = (action: string, target: string) => {
  ACTIVITY_LOG.unshift({
    id: generateId('log'),
    action,
    target,
    timestamp: new Date().toISOString(),
    user: AUTH_SESSION.displayName || 'Editor',
  });
  if (ACTIVITY_LOG.length > 50) ACTIVITY_LOG.pop();
};

export const isEditor = () => AUTH_SESSION.isLoggedIn && AUTH_SESSION.role === 'editor';

export const resolveGalleryItemSrc = (item: { srcType: string; url: string }) => item.url;
```

- [ ] Commit:
```bash
git add store/app.store.ts
git commit -m "feat: create centralized app store"
```

---

### Task 8: Criar services/members.service.ts

**Files:**
- Create: `services/members.service.ts`

- [ ] Criar serviço com merge seed + Supabase:

```typescript
// services/members.service.ts
import { supabase } from '../supabaseClient';
import { MEMBERS_SEED, getMemberByTier } from '../data/members.data';
import { PARTNERS, notifyState, isEditor } from '../store/app.store';
import type { Partner } from '../types';

export { getMemberByTier };

const normalize = (p: any): Partner => ({
  ...p,
  type: p.type || 'pessoa',
  socialLinks: p.social_links || {},
});

export const syncMembers = async () => {
  const { data, error } = await supabase.from('partners').select('*').order('created_at', { ascending: false });
  if (error || !data) return;

  // Merge: seed define estrutura, Supabase sobrescreve conteúdo
  const merged: Partner[] = MEMBERS_SEED.map(seed => {
    const live = data.find((d: any) => d.id === seed.id);
    return live
      ? { ...seed, ...normalize(live) }
      : { ...seed, type: 'pessoa' as const, category: 'Governança' as const };
  });

  // Adicionar parceiros do Supabase que não estão no seed
  const seedIds = MEMBERS_SEED.map(s => s.id);
  const extras = data.filter((d: any) => !seedIds.includes(d.id)).map(normalize);

  PARTNERS.length = 0;
  PARTNERS.push(...merged, ...extras);
  notifyState();
};

export const createMember = async (notify = true) => {
  if (!isEditor()) return null;
  const { data: res, error } = await supabase
    .from('partners')
    .insert([{ name: 'Novo Membro', type: 'pessoa', category: 'Parceiro', active: true }])
    .select();
  if (error || !res) return null;
  const newMember = normalize(res[0]);
  PARTNERS.unshift(newMember);
  notifyState();
  return newMember;
};

export const updateMember = async (id: string, patch: Partial<Partner>, notify = true) => {
  if (!isEditor()) return;
  const payload: any = { ...patch };
  if (patch.socialLinks) { payload.social_links = patch.socialLinks; delete payload.socialLinks; }
  const idx = PARTNERS.findIndex(p => p.id === id);
  if (idx !== -1) { PARTNERS[idx] = { ...PARTNERS[idx], ...patch }; notifyState(); }
  await supabase.from('partners').update(payload).eq('id', id);
};

export const deleteMember = async (id: string) => {
  if (!isEditor()) return;
  await supabase.from('partners').delete().eq('id', id);
  const idx = PARTNERS.findIndex(p => p.id === id);
  if (idx !== -1) { PARTNERS.splice(idx, 1); notifyState(); }
};
```

- [ ] Commit:
```bash
git add services/members.service.ts
git commit -m "feat: add members service with seed+supabase merge"
```

---

### Task 9: Criar services/events.service.ts e media.service.ts

**Files:**
- Create: `services/events.service.ts`
- Create: `services/media.service.ts`

- [ ] Criar `services/events.service.ts` (move lógica do App.tsx):

```typescript
// services/events.service.ts
import { supabase } from '../supabaseClient';
import { EVENTS, notifyState, showToast, logActivity, isEditor, generateId } from '../store/app.store';
import type { Event, GalleryItem, PendingMediaSubmission } from '../types';
import { PENDING_MEDIA_SUBMISSIONS } from '../store/app.store';

const normalizeEvent = (e: any): Event => ({
  ...e,
  coverImage: e.cover_image,
  socialLinks: e.social_links || {},
  gallery: typeof e.gallery === 'string' ? JSON.parse(e.gallery) : (e.gallery || []),
});

export const syncEvents = async () => {
  const { data, error } = await supabase.from('events').select('*').order('created_at', { ascending: false });
  if (error || !data) return;
  EVENTS.length = 0;
  EVENTS.push(...data.map(normalizeEvent));
  notifyState();
};

export const createEvent = async (data: Partial<Event>) => {
  if (!isEditor()) return null;
  const payload = {
    title: data.title || 'Novo Evento',
    date: data.date,
    category: data.category || 'Outros',
    description: data.description,
    location: data.location,
    image: data.image,
    cover_image: data.coverImage,
    social_links: data.socialLinks,
    gallery: data.gallery,
    status: data.status || 'draft',
    featured: data.featured || false,
  };
  const { data: res, error } = await supabase.from('events').insert([payload]).select();
  if (error || !res) { showToast('Erro ao criar evento.', 'error'); return null; }
  const newEvent = normalizeEvent(res[0]);
  EVENTS.unshift(newEvent);
  logActivity('Criou evento', newEvent.title);
  notifyState();
  showToast('Evento criado.', 'success');
  return newEvent;
};

export const updateEvent = async (id: string, patch: Partial<Event>, notify = true) => {
  if (!isEditor()) return;
  const payload: any = { ...patch };
  if ('coverImage' in patch) { payload.cover_image = patch.coverImage; delete payload.coverImage; }
  if ('socialLinks' in patch) { payload.social_links = patch.socialLinks; delete payload.socialLinks; }
  delete payload.id; delete payload.created_at; delete payload.updated_at;
  const idx = EVENTS.findIndex(e => e.id === id);
  if (idx !== -1) { EVENTS[idx] = { ...EVENTS[idx], ...patch }; notifyState(); }
  const { error } = await supabase.from('events').update(payload).eq('id', id);
  if (!error && notify) showToast('Evento salvo.', 'success');
  else if (error) showToast('Erro ao salvar.', 'error');
};

export const deleteEvent = async (id: string) => {
  if (!isEditor()) return;
  const { error } = await supabase.from('events').delete().eq('id', id);
  if (!error) {
    const idx = EVENTS.findIndex(e => e.id === id);
    if (idx !== -1) { EVENTS.splice(idx, 1); notifyState(); showToast('Evento removido.', 'success'); }
  }
};

export const addUrlMediaToEvent = async (eventId: string, item: Omit<GalleryItem, 'id' | 'createdAt' | 'order'>) => {
  const event = EVENTS.find(e => e.id === eventId);
  if (!event || !isEditor()) return;
  const newItem: GalleryItem = { ...item, id: generateId('media'), createdAt: new Date().toISOString(), order: event.gallery.length };
  event.gallery.push(newItem);
  await updateEvent(eventId, { gallery: event.gallery }, false);
  notifyState();
};

export const approveCommunityMedia = async (eventId: string, submissionId: string) => {
  if (!isEditor()) return;
  const sub = PENDING_MEDIA_SUBMISSIONS.find(s => s.id === submissionId);
  if (!sub) return;
  await addUrlMediaToEvent(eventId, {
    kind: sub.type, srcType: 'url', url: sub.url,
    caption: `Enviado por ${sub.authorName}`, source: 'comunidade', status: 'published',
  });
  const idx = PENDING_MEDIA_SUBMISSIONS.findIndex(s => s.id === submissionId);
  if (idx !== -1) PENDING_MEDIA_SUBMISSIONS.splice(idx, 1);
  notifyState();
  showToast('Mídia aprovada.', 'success');
};

export const rejectCommunityMedia = (submissionId: string) => {
  if (!isEditor()) return;
  const idx = PENDING_MEDIA_SUBMISSIONS.findIndex(s => s.id === submissionId);
  if (idx !== -1) { PENDING_MEDIA_SUBMISSIONS.splice(idx, 1); notifyState(); showToast('Mídia rejeitada.', 'info'); }
};
```

- [ ] Criar `services/media.service.ts`:

```typescript
// services/media.service.ts
import { supabase } from '../supabaseClient';

export const saveMediaBlob = async (file: File): Promise<string> => {
  const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, '')}`;
  const { error } = await supabase.storage.from('media').upload(fileName, file, { cacheControl: '3600', upsert: false });
  if (error) throw error;
  const { data } = supabase.storage.from('media').getPublicUrl(fileName);
  return data.publicUrl;
};

export const deleteMediaBlob = async (url: string): Promise<void> => {
  try {
    const fileName = url.split('/').pop();
    if (fileName) await supabase.storage.from('media').remove([fileName]);
  } catch (e) {
    console.error('Error deleting media', e);
  }
};
```

- [ ] Commit:
```bash
git add services/
git commit -m "feat: add events and media services"
```

---

## Chunk 3: UI Components

### Task 10: Criar components/ui/ExpandableText.tsx

**Files:**
- Create: `components/ui/ExpandableText.tsx`

- [ ] Criar o componente central:

```tsx
// components/ui/ExpandableText.tsx
import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronUp, ArrowRight } from 'lucide-react';

interface ExpandableTextProps {
  summary: string;
  full?: string;
  detailHref?: string;
  detailLabel?: string;
  previewLines?: number;
  className?: string;
  textClassName?: string;
}

export const ExpandableText: React.FC<ExpandableTextProps> = ({
  summary,
  full,
  detailHref,
  detailLabel = 'Ver página completa',
  previewLines = 4,
  className = '',
  textClassName = 'text-base text-slate-600 font-light leading-relaxed',
}) => {
  const [expanded, setExpanded] = useState(false);
  const [height, setHeight] = useState(0);
  const fullRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (fullRef.current) setHeight(fullRef.current.scrollHeight);
  }, [full]);

  const hasFull = !!full && full !== summary;

  return (
    <div className={className}>
      {/* Preview */}
      <div className="relative">
        <p
          className={`${textClassName} ${!expanded ? `line-clamp-${previewLines}` : 'hidden'}`}
        >
          {summary}
        </p>

        {!expanded && hasFull && (
          <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white to-transparent pointer-events-none" />
        )}
      </div>

      {/* Full content */}
      {hasFull && (
        <div
          ref={fullRef}
          style={{ maxHeight: expanded ? height : 0, overflow: 'hidden' }}
          className="transition-all duration-500 ease-in-out"
        >
          <div className="pt-2">
            {full!.split('\n\n').map((para, i) => (
              <p key={i} className={`${textClassName} mb-4`}>{para}</p>
            ))}
          </div>
        </div>
      )}

      {/* Controls */}
      {(hasFull || detailHref) && (
        <div className="flex items-center gap-4 mt-3">
          {hasFull && (
            <button
              onClick={() => setExpanded(v => !v)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-900 hover:text-sand-600 transition-colors uppercase tracking-widest"
              aria-expanded={expanded}
            >
              {expanded ? (
                <><ChevronUp size={14} /> Ver menos</>
              ) : (
                <><ChevronDown size={14} /> Ler mais</>
              )}
            </button>
          )}
          {detailHref && (
            <Link
              to={detailHref}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-sand-500 hover:text-brand-900 transition-colors uppercase tracking-widest"
            >
              {detailLabel} <ArrowRight size={12} />
            </Link>
          )}
        </div>
      )}
    </div>
  );
};
```

- [ ] Verificar no browser: importar em uma página de teste e confirmar expand/collapse funciona

- [ ] Commit:
```bash
git add components/ui/ExpandableText.tsx
git commit -m "feat: add ExpandableText component with smooth animation"
```

---

### Task 11: Extrair e criar components/ui/index.ts

**Files:**
- Create: `components/ui/Button.tsx`
- Create: `components/ui/Badge.tsx`
- Create: `components/ui/Skeleton.tsx`
- Create: `components/ui/Reveal.tsx`
- Create: `components/ui/Loaders.tsx`
- Create: `components/ui/Modals.tsx`
- Create: `components/ui/Toast.tsx`
- Create: `components/ui/index.ts`

- [ ] Criar cada arquivo copiando o componente correspondente do `component.ui.tsx`:
  - `Button.tsx` ← componente `Button` (variant: 'primary'|'gold'|'outline'|'ghost')
  - `Badge.tsx` ← componente `Badge`
  - `Skeleton.tsx` ← componentes `Skeleton`, `AsyncContent`
  - `Reveal.tsx` ← componente `Reveal` (scroll reveal com IntersectionObserver)
  - `Loaders.tsx` ← componentes `PremiumLoader`, `AsyncImage`, `SocialIcons`
  - `Modals.tsx` ← componentes `LoginModal`, `AccessDeniedModal`, `ConfirmDialog`
  - `Toast.tsx` ← componente `ToastContainer`

- [ ] Criar `components/ui/index.ts` re-exportando tudo:

```typescript
export { Button } from './Button';
export { Badge } from './Badge';
export { Skeleton, AsyncContent } from './Skeleton';
export { Reveal } from './Reveal';
export { PremiumLoader, AsyncImage, SocialIcons } from './Loaders';
export { LoginModal, AccessDeniedModal, ConfirmDialog } from './Modals';
export { ToastContainer } from './Toast';
export { ExpandableText } from './ExpandableText';
// Re-export form components used by pages
export { Input, Textarea, Select } from './Forms';
export { SectionWrapper, Card } from './Layout';
```

- [ ] Criar `components/ui/Layout.tsx` com `SectionWrapper` e `Card`
- [ ] Criar `components/ui/Forms.tsx` com `Input`, `Textarea`, `Select`

- [ ] **IMPORTANTE:** Cada componente extraído deve importar de `../../store/app.store` em vez de `./App`

- [ ] Verificar no browser: nenhum erro de importação

- [ ] Commit:
```bash
git add components/ui/
git commit -m "feat: extract UI components into dedicated files"
```

---

### Task 12: Criar components/domain/

**Files:**
- Create: `components/domain/Header.tsx`
- Create: `components/domain/Footer.tsx`
- Create: `components/domain/MemberCard.tsx`
- Create: `components/domain/EventCard.tsx`
- Create: `components/domain/PartnerCard.tsx`
- Create: `components/domain/SearchResults.tsx`
- Create: `components/domain/index.ts`

- [ ] Copiar `Header` e `Footer` do `component.domain.tsx`, atualizando:
  - Nav links: adicionar `{ name: 'Quem Somos', path: '/quem-somos' }` e `{ name: 'Administração', path: '/administracao' }`
  - Importações: `../../store/app.store` em vez de `./App`
  - Importações de componentes: `../ui` em vez de `./component.ui`

- [ ] Criar `components/domain/MemberCard.tsx`:

```tsx
// components/domain/MemberCard.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, User } from 'lucide-react';
import { ExpandableText } from '../ui/ExpandableText';
import type { Partner, MemberTier } from '../../types';

interface MemberCardProps {
  member: Partner;
  size?: 'large' | 'medium' | 'small';
  showExpandable?: boolean;
}

const tierLabel: Record<MemberTier, string> = {
  'presidente': 'Presidente',
  'direcao': 'Direção',
  'secretario-geral': 'Secretário Geral',
  'vogal': 'Vogal',
};

export const MemberCard: React.FC<MemberCardProps> = ({ member, size = 'medium', showExpandable = false }) => {
  const label = member.tier ? tierLabel[member.tier] : (member.role || member.category);

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden hover:border-sand-400/50 hover:shadow-lg transition-all duration-500 hover:-translate-y-0.5">
      {/* Card header */}
      <div className={`flex items-center gap-4 p-5 ${size === 'large' ? 'p-6' : ''}`}>
        <div className={`
          overflow-hidden rounded-xl shrink-0 shadow-sm bg-slate-100 flex items-center justify-center
          ${size === 'large' ? 'w-20 h-20' : size === 'medium' ? 'w-14 h-14' : 'w-11 h-11'}
        `}>
          {member.image ? (
            <img src={member.image} alt={member.name} className="w-full h-full object-cover" />
          ) : (
            <User size={size === 'large' ? 28 : 20} className="text-slate-400" />
          )}
        </div>
        <div className="flex-grow min-w-0">
          <p className="text-[9px] font-bold uppercase tracking-widest text-sand-500 mb-0.5">{label}</p>
          <h3 className={`font-serif text-brand-900 leading-tight ${size === 'large' ? 'text-xl' : 'text-base'}`}>
            {member.name}
          </h3>
          {member.country && (
            <p className="text-[9px] text-slate-400 mt-0.5 uppercase tracking-wider">{member.country}</p>
          )}
        </div>
      </div>

      {/* Expandable bio */}
      {showExpandable && (member.summary || member.bio) && (
        <div className="px-5 pb-3 border-t border-slate-100 pt-4">
          <ExpandableText
            summary={member.summary || member.bio || ''}
            full={member.full || member.bio}
            detailHref={`/membro/${member.id}`}
            detailLabel="Ver perfil"
            previewLines={3}
            textClassName="text-sm text-slate-500 font-light leading-relaxed"
          />
        </div>
      )}

      {/* Link footer */}
      {!showExpandable && (
        <Link
          to={`/membro/${member.id}`}
          className="flex items-center justify-between px-5 py-3 border-t border-slate-100 text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-brand-900 hover:bg-slate-50 transition-colors group"
        >
          Ver perfil
          <ArrowUpRight size={14} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
        </Link>
      )}
    </div>
  );
};
```

- [ ] Criar `components/domain/EventCard.tsx` (card de evento com imagem, data, título, descrição curta)
- [ ] Criar `components/domain/PartnerCard.tsx` (card de parceiro com logo + ExpandableText)
- [ ] Copiar `SearchResults` do `component.domain.tsx`
- [ ] Criar `components/domain/index.ts`:

```typescript
export { Header } from './Header';
export { Footer } from './Footer';
export { MemberCard } from './MemberCard';
export { EventCard } from './EventCard';
export { PartnerCard } from './PartnerCard';
export { SearchResults } from './SearchResults';
export { BrandLogo } from './BrandLogo';
export { SmartInviteModal } from './SmartInviteModal';
```

- [ ] Commit:
```bash
git add components/domain/
git commit -m "feat: extract domain components and add MemberCard, EventCard, PartnerCard"
```

---

## Chunk 4: Novas Páginas

### Task 13: Criar pages/quem-somos/QuemSomosPage.tsx

**Files:**
- Create: `pages/quem-somos/QuemSomosPage.tsx`

- [ ] Criar a página:

```tsx
// pages/quem-somos/QuemSomosPage.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { usePageMeta } from '../../hooks/usePageMeta';
import { MISSION, PRESIDENT_MESSAGE, PILLARS, HISTORY } from '../../data/content.data';
import { ExpandableText } from '../../components/ui/ExpandableText';
import { Reveal } from '../../components/ui/Reveal';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { SectionWrapper } from '../../components/ui/Layout';

export const QuemSomosPage = () => {
  usePageMeta('Quem Somos – Fundação Luso-Brasileira', 'Missão, história e valores da Fundação.');

  return (
    <main className="bg-white text-slate-900">
      {/* HERO */}
      <section className="bg-brand-900 pt-40 pb-24 px-6">
        <div className="max-w-4xl mx-auto">
          <Reveal>
            <Badge variant="light" className="mb-6 bg-white/10 text-white/70 border-white/10">A Fundação</Badge>
            <h1 className="text-5xl md:text-7xl font-light text-white tracking-tight mb-6 leading-[1.05]">
              Quem <span className="font-serif italic text-sand-400">Somos</span>
            </h1>
            <p className="text-lg text-white/60 max-w-2xl font-light leading-relaxed">
              {MISSION.summary}
            </p>
          </Reveal>
        </div>
      </section>

      {/* MISSÃO COMPLETA */}
      <SectionWrapper className="py-20 md:py-28">
        <div className="grid md:grid-cols-12 gap-10">
          <div className="md:col-span-4">
            <Reveal>
              <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
                <span className="w-8 h-px bg-sand-400"></span> Missão
              </h2>
            </Reveal>
          </div>
          <div className="md:col-span-8">
            <Reveal delay={100}>
              <ExpandableText
                summary={MISSION.summary}
                full={MISSION.full}
                textClassName="text-lg text-slate-600 font-light leading-relaxed"
                previewLines={5}
              />
            </Reveal>
          </div>
        </div>
      </SectionWrapper>

      {/* HISTÓRIA */}
      <section className="bg-[#f8f6f2] py-20 md:py-28">
        <SectionWrapper>
          <div className="grid md:grid-cols-12 gap-10">
            <div className="md:col-span-4">
              <Reveal>
                <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
                  <span className="w-8 h-px bg-sand-400"></span> História
                </h2>
              </Reveal>
            </div>
            <div className="md:col-span-8">
              <Reveal delay={100}>
                <p className="text-3xl md:text-4xl font-light text-brand-900 leading-tight tracking-tight mb-8">
                  Mais de duas décadas de cooperação luso-brasileira.
                </p>
                <ExpandableText
                  summary={HISTORY.summary}
                  full={HISTORY.full}
                  textClassName="text-base text-slate-600 font-light leading-relaxed"
                />
              </Reveal>
            </div>
          </div>
        </SectionWrapper>
      </section>

      {/* 4 PILARES */}
      <SectionWrapper className="py-20 md:py-28">
        <Reveal>
          <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-12 flex items-center gap-3">
            <span className="w-8 h-px bg-sand-400"></span> Áreas de Atuação
          </h2>
        </Reveal>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {PILLARS.map((pillar, idx) => (
            <Reveal key={pillar.id} delay={idx * 80}>
              <div className="p-6 border border-slate-200 rounded-2xl hover:border-sand-400/50 hover:shadow-md transition-all duration-300 h-full">
                <div className="w-10 h-10 bg-brand-900 rounded-xl flex items-center justify-center mb-5">
                  <pillar.icon size={18} className="text-sand-400" />
                </div>
                <h3 className="text-lg font-serif text-brand-900 mb-3">{pillar.title}</h3>
                <p className="text-sm text-slate-500 font-light leading-relaxed">{pillar.description}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </SectionWrapper>

      {/* MENSAGEM DO PRESIDENTE */}
      <section className="bg-[#f8f6f2] py-20 md:py-28">
        <SectionWrapper>
          <div className="grid md:grid-cols-12 gap-10 md:gap-16 items-start">
            <div className="md:col-span-5">
              <Reveal>
                <div className="aspect-[4/5] overflow-hidden rounded-2xl">
                  <img src="/presidente.webp" alt="Paulo Campos Costa" className="w-full h-full object-cover grayscale" />
                </div>
              </Reveal>
            </div>
            <div className="md:col-span-7">
              <Reveal delay={100}>
                <Badge variant="light" className="mb-6 bg-slate-100 text-slate-600 border-slate-200">Presidência</Badge>
                <h2 className="text-3xl md:text-4xl font-serif text-brand-900 mb-6 leading-tight">
                  Construindo Pontes
                </h2>
                <ExpandableText
                  summary={PRESIDENT_MESSAGE.quote}
                  full={PRESIDENT_MESSAGE.full}
                  previewLines={6}
                  textClassName="text-base text-slate-600 font-light leading-relaxed italic border-l-4 border-sand-400 pl-5"
                />
                <div className="mt-8 pt-6 border-t border-slate-200">
                  <p className="text-base font-medium text-brand-900">{PRESIDENT_MESSAGE.author}</p>
                  <p className="text-xs uppercase tracking-widest text-slate-400 mt-1">{PRESIDENT_MESSAGE.role}</p>
                  <p className="text-[10px] uppercase tracking-widest text-sand-500 mt-1">{PRESIDENT_MESSAGE.company}</p>
                </div>
              </Reveal>
            </div>
          </div>
        </SectionWrapper>
      </section>

      {/* CTA */}
      <section className="bg-brand-900 py-24 text-center px-6">
        <div className="max-w-2xl mx-auto">
          <Reveal>
            <h2 className="text-4xl font-light text-white tracking-tight mb-6">
              Faça parte desta missão.
            </h2>
            <p className="text-white/60 text-lg font-light mb-10">
              Junte-se à Fundação Luso-Brasileira e contribua para o fortalecimento dos laços entre Portugal e Brasil.
            </p>
            <Link to="/precadastro">
              <Button variant="gold" className="px-8 py-4 rounded-full text-xs">
                Tornar-se Membro
              </Button>
            </Link>
          </Reveal>
        </div>
      </section>
    </main>
  );
};
```

- [ ] Commit:
```bash
git add pages/quem-somos/
git commit -m "feat: add QuemSomosPage with expandable institutional content"
```

---

### Task 14: Criar pages/administracao/AdminPage.tsx

**Files:**
- Create: `pages/administracao/AdminPage.tsx`

- [ ] Criar a página com hierarquia visual obrigatória:

```tsx
// pages/administracao/AdminPage.tsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { usePageMeta } from '../../hooks/usePageMeta';
import { getMemberByTier } from '../../services/members.service';
import { PARTNERS, FLB_STATE_EVENT } from '../../store/app.store';
import { MemberCard } from '../../components/domain/MemberCard';
import { Reveal } from '../../components/ui/Reveal';
import { Badge } from '../../components/ui/Badge';
import { SectionWrapper } from '../../components/ui/Layout';
import { PremiumLoader } from '../../components/ui/Loaders';
import type { Partner } from '../../types';

const TierSection = ({ title, subtitle, members, size, showExpandable }: {
  title: string;
  subtitle?: string;
  members: Partner[];
  size?: 'large' | 'medium' | 'small';
  showExpandable?: boolean;
}) => {
  if (!members.length) return null;
  return (
    <div className="mb-16 md:mb-20">
      <Reveal>
        <div className="flex items-center gap-4 mb-8">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-[0.25em] text-sand-500">{title}</h2>
            {subtitle && <p className="text-sm text-white/40 font-light mt-0.5">{subtitle}</p>}
          </div>
          <div className="h-px bg-white/10 flex-grow"></div>
        </div>
      </Reveal>
      <div className={`grid gap-4 ${
        size === 'large' ? 'grid-cols-1 max-w-2xl' :
        size === 'medium' ? 'sm:grid-cols-2 max-w-3xl' :
        'sm:grid-cols-2 lg:grid-cols-4'
      }`}>
        {members.map((member, idx) => (
          <Reveal key={member.id} delay={idx * 60}>
            <MemberCard member={member} size={size} showExpandable={showExpandable} />
          </Reveal>
        ))}
      </div>
    </div>
  );
};

export const AdminPage = () => {
  usePageMeta('Administração – Fundação Luso-Brasileira', 'Conselho de Administração e estrutura de governança.');
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 800);
    const handler = () => setTick(v => v + 1);
    window.addEventListener(FLB_STATE_EVENT, handler);
    return () => { clearTimeout(t); window.removeEventListener(FLB_STATE_EVENT, handler); };
  }, []);

  // Build members from merged PARTNERS store (already has seed applied)
  const getMembers = (tier: string) =>
    PARTNERS
      .filter((p: Partner) => p.tier === tier || (tier === 'presidente' && p.role?.includes('Presidente') && !p.role?.includes('Vice')))
      .sort((a: Partner, b: Partner) => (a.order || 99) - (b.order || 99));

  const presidente = getMembers('presidente');
  const direcao = getMembers('direcao');
  const secretario = getMembers('secretario-geral');
  const vogais = getMembers('vogal');

  if (loading) return <PremiumLoader />;

  return (
    <div className="bg-brand-900 min-h-screen">
      {/* HERO */}
      <section className="pt-40 pb-20 px-6 border-b border-white/5">
        <div className="max-w-5xl mx-auto">
          <Reveal>
            <Badge variant="light" className="mb-6 bg-white/10 text-white/70 border-white/10">Governança</Badge>
            <h1 className="text-5xl md:text-7xl font-light text-white mb-6 tracking-tight leading-[1.05]">
              Conselho de <br/>
              <span className="font-serif italic text-white/40">Administração</span>
            </h1>
            <p className="text-lg text-white/50 max-w-2xl font-light leading-relaxed">
              Liderança comprometida com a excelência, transparência e a perenidade da missão institucional da Fundação.
            </p>
          </Reveal>
        </div>
      </section>

      <SectionWrapper className="py-20 md:py-28">
        <TierSection title="Presidente" members={presidente} size="large" showExpandable />
        <TierSection title="Direção" members={direcao} size="medium" showExpandable />
        <TierSection
          title="Secretário Geral"
          subtitle="Coordenação administrativa e operacional"
          members={secretario}
          size="medium"
          showExpandable
        />
        <TierSection title="Vogais" members={vogais} size="small" showExpandable />

        {!presidente.length && !direcao.length && !secretario.length && !vogais.length && (
          <div className="py-20 text-center border border-dashed border-white/10 rounded-3xl">
            <p className="text-white/40">A carregar membros...</p>
          </div>
        )}
      </SectionWrapper>
    </div>
  );
};
```

- [ ] Commit:
```bash
git add pages/administracao/
git commit -m "feat: add AdminPage with mandatory member hierarchy"
```

---

### Task 15: Criar pages/parceiros/ParceirosPage.tsx

**Files:**
- Create: `pages/parceiros/ParceirosPage.tsx`

- [ ] Criar a página de parceiros:

```tsx
// pages/parceiros/ParceirosPage.tsx
import React from 'react';
import { usePageMeta } from '../../hooks/usePageMeta';
import { PARTNERS_SEED } from '../../data/partners.data';
import { ExpandableText } from '../../components/ui/ExpandableText';
import { Reveal } from '../../components/ui/Reveal';
import { Badge } from '../../components/ui/Badge';
import { SectionWrapper } from '../../components/ui/Layout';
import { Star } from 'lucide-react';

const PartnerCardFull = ({ partner }: { partner: typeof PARTNERS_SEED[0] }) => (
  <div className="bg-white border border-slate-200/80 rounded-2xl p-6 hover:border-sand-400/50 hover:shadow-lg transition-all duration-500">
    <div className="flex items-start gap-5 mb-5">
      <div className="h-16 w-24 flex items-center justify-center shrink-0 bg-slate-50 rounded-xl p-2">
        <img src={partner.image} alt={partner.name} className="max-h-full max-w-full object-contain filter grayscale opacity-70 hover:grayscale-0 hover:opacity-100 transition-all duration-500" />
      </div>
      <div>
        <p className="text-[9px] font-bold uppercase tracking-widest text-sand-500 mb-1">
          {partner.category} · Est. {partner.since}
        </p>
        <h3 className="text-xl font-serif text-brand-900">{partner.name}</h3>
        {partner.country && <p className="text-xs text-slate-400 mt-0.5">{partner.country}</p>}
      </div>
    </div>
    <ExpandableText
      summary={partner.bio}
      full={partner.bioFull}
      previewLines={3}
      textClassName="text-sm text-slate-500 font-light leading-relaxed"
    />
    {partner.website && (
      <a href={partner.website} target="_blank" rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 mt-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-brand-900 transition-colors">
        Site oficial →
      </a>
    )}
  </div>
);

export const ParceirosPage = () => {
  usePageMeta('Parceiros – Fundação Luso-Brasileira', 'Rede de parceiros e membros fundadores.');

  const founders = PARTNERS_SEED.filter(p => p.category === 'Fundador');
  const others = PARTNERS_SEED.filter(p => p.category !== 'Fundador');

  return (
    <main className="bg-white min-h-screen">
      {/* HERO */}
      <section className="bg-brand-900 pt-40 pb-24 px-6">
        <div className="max-w-4xl mx-auto">
          <Reveal>
            <Badge variant="light" className="mb-6 bg-white/10 text-white/70 border-white/10">Rede de Apoio</Badge>
            <h1 className="text-5xl md:text-7xl font-light text-white tracking-tight mb-6 leading-[1.05]">
              Nossa <span className="font-serif italic text-sand-400">Rede</span>
            </h1>
            <p className="text-lg text-white/60 font-light leading-relaxed max-w-2xl">
              As instituições que, desde 1998, sustentam a ponte cultural e empresarial entre Portugal e Brasil.
            </p>
          </Reveal>
        </div>
      </section>

      {/* FUNDADORES */}
      <SectionWrapper className="py-20 md:py-28">
        <Reveal>
          <div className="flex items-center gap-3 mb-12">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-brand-900 rounded-full">
              <Star size={10} className="text-sand-400 fill-sand-400" />
              <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-white">Membros Fundadores</span>
            </div>
            <div className="h-px bg-slate-200 flex-grow"></div>
          </div>
        </Reveal>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {founders.map((partner, idx) => (
            <Reveal key={partner.id} delay={idx * 60}>
              <PartnerCardFull partner={partner} />
            </Reveal>
          ))}
        </div>
      </SectionWrapper>

      {/* OUTROS PARCEIROS */}
      {others.length > 0 && (
        <section className="bg-[#f8f6f2] py-20">
          <SectionWrapper>
            <Reveal>
              <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400 mb-10 flex items-center gap-3">
                <span className="w-6 h-px bg-sand-400"></span> Parceiros e Apoiadores
              </h2>
            </Reveal>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {others.map((partner, idx) => (
                <Reveal key={partner.id} delay={idx * 60}>
                  <PartnerCardFull partner={partner} />
                </Reveal>
              ))}
            </div>
          </SectionWrapper>
        </section>
      )}
    </main>
  );
};
```

- [ ] Commit:
```bash
git add pages/parceiros/
git commit -m "feat: add ParceirosPage with expandable partner descriptions"
```

---

## Chunk 5: Refatorar Páginas Existentes

### Task 16: Refatorar pages/home/HomePage.tsx

**Files:**
- Create: `pages/home/HomePage.tsx` (mover de `page.home.tsx`)

- [ ] Copiar `page.home.tsx` para `pages/home/HomePage.tsx`

- [ ] Atualizar todas as importações:
  - `from './component.ui'` → `from '../../components/ui'`
  - `from './component.domain'` → `from '../../components/domain'`
  - `from './App'` → `from '../../store/app.store'` e `from '../../data/partners.data'`
  - `usePageMeta` → `from '../../hooks/usePageMeta'`
  - `useDebounce` → `from '../../hooks/useDebounce'`

- [ ] Adicionar bloco de Missão resumida com link para /quem-somos (após hero):

```tsx
{/* MISSÃO - após hero, antes de propósito */}
<div className="bg-white relative z-20 rounded-t-[2.5rem] -mt-10 pt-8 pb-4">
  <SectionWrapper className="py-8">
    <Reveal>
      <ExpandableText
        summary={MISSION.summary}
        full={undefined}
        detailHref="/quem-somos"
        detailLabel="Conhecer a nossa missão"
        textClassName="text-lg text-slate-500 font-light leading-relaxed max-w-3xl"
      />
    </Reveal>
  </SectionWrapper>
</div>
```

- [ ] Atualizar nav links do Header para incluir `/quem-somos` e `/administracao`

- [ ] `PARTNERS` import → usar `PARTNERS` do store (já populado pelo sync)

- [ ] Verificar no browser que home carrega sem erros

- [ ] Commit:
```bash
git add pages/home/
git commit -m "feat: refactor HomePage to new structure with mission preview"
```

---

### Task 17: Migrar páginas restantes

**Files (cada um move do raiz para pasta):**
- `page.membros.tsx` → `pages/administracao/` (pode ser alias para AdminPage ou manter legado)
- `page.membro.perfil.tsx` → `pages/membro/MembroPerfilPage.tsx`
- `page.eventos.tsx` → `pages/eventos/EventosPage.tsx`
- `page.evento.detalhe.tsx` → `pages/eventos/EventoDetalhePage.tsx`
- `page.evento.colaborar.tsx` → `pages/eventos/EventoColaborarPage.tsx`
- `page.login.tsx` → `pages/auth/LoginPage.tsx`
- `page.cadastro.tsx` → `pages/auth/CadastroPage.tsx`
- `page.precadastro.tsx` → `pages/auth/PreCadastroPage.tsx`
- `page.dashboard.tsx` → `pages/dashboard/DashboardPage.tsx`
- `page.dashboard.media.tsx` → `pages/dashboard/DashboardMediaPage.tsx`
- `page.legal.tsx` → `pages/legal/LegalPage.tsx`

- [ ] Para cada arquivo:
  1. Copiar para novo caminho
  2. Atualizar imports (`./App` → `../../store/app.store`, `../../services/...`, etc.)
  3. Verificar que página funciona no browser

- [ ] Expandir `EventoDetalhePage` com seções: objetivo, experiência, patrocinadores:

```tsx
{/* Adicionar após descrição principal */}
{event.objective && (
  <div className="mb-10">
    <h2 className="text-xs font-bold uppercase tracking-widest text-sand-500 mb-4">Objetivo</h2>
    <ExpandableText summary={event.objective.slice(0, 200) + '...'} full={event.objective} />
  </div>
)}
{event.experience && (
  <div className="mb-10">
    <h2 className="text-xs font-bold uppercase tracking-widest text-sand-500 mb-4">Experiência</h2>
    <ExpandableText summary={event.experience.slice(0, 200) + '...'} full={event.experience} />
  </div>
)}
{event.sponsors && (
  <div className="mb-10">
    <h2 className="text-xs font-bold uppercase tracking-widest text-sand-500 mb-4">Patrocinadores</h2>
    <p className="text-sm text-slate-500 font-light leading-relaxed">{event.sponsors}</p>
  </div>
)}
{/* Galeria placeholder */}
<div className="mt-12 p-8 border border-dashed border-slate-200 rounded-2xl text-center">
  <p className="text-sm text-slate-400">Galeria de imagens · Em breve</p>
</div>
```

- [ ] Commit após cada página migrada:
```bash
git commit -m "feat: migrate [NomePagina] to new folder structure"
```

---

## Chunk 6: Router + App.tsx + Sync + Cleanup

### Task 18: Atualizar router.tsx

**Files:**
- Modify: `router.tsx`

- [ ] Substituir conteúdo do router com lazy loading e novas rotas:

```tsx
// router.tsx
import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { PremiumLoader } from './components/ui/Loaders';

const HomePage = lazy(() => import('./pages/home/HomePage').then(m => ({ default: m.HomePage })));
const QuemSomosPage = lazy(() => import('./pages/quem-somos/QuemSomosPage').then(m => ({ default: m.QuemSomosPage })));
const AdminPage = lazy(() => import('./pages/administracao/AdminPage').then(m => ({ default: m.AdminPage })));
const MembroPerfilPage = lazy(() => import('./pages/membro/MembroPerfilPage').then(m => ({ default: m.MembroPerfilPage })));
const MembroEditarPage = lazy(() => import('./pages/membro/MembroPerfilPage').then(m => ({ default: m.MembroEditarPage })));
const EventosPage = lazy(() => import('./pages/eventos/EventosPage').then(m => ({ default: m.EventosPage })));
const EventoDetalhePage = lazy(() => import('./pages/eventos/EventoDetalhePage').then(m => ({ default: m.EventoDetalhePage })));
const EventoColaborarPage = lazy(() => import('./pages/eventos/EventoColaborarPage').then(m => ({ default: m.EventoColaborarPage })));
const ParceirosPage = lazy(() => import('./pages/parceiros/ParceirosPage').then(m => ({ default: m.ParceirosPage })));
const LoginPage = lazy(() => import('./pages/auth/LoginPage').then(m => ({ default: m.LoginPage })));
const CadastroPage = lazy(() => import('./pages/auth/CadastroPage').then(m => ({ default: m.CadastroPage })));
const PreCadastroPage = lazy(() => import('./pages/auth/PreCadastroPage').then(m => ({ default: m.PreCadastroPage })));
const DashboardPage = lazy(() => import('./pages/dashboard/DashboardPage').then(m => ({ default: m.DashboardPage })));
const DashboardMediaPage = lazy(() => import('./pages/dashboard/DashboardMediaPage').then(m => ({ default: m.DashboardMediaPage })));
const PrivacyPage = lazy(() => import('./pages/legal/LegalPage').then(m => ({ default: m.PrivacyPage })));
const TermsPage = lazy(() => import('./pages/legal/LegalPage').then(m => ({ default: m.TermsPage })));
const NotFoundPage = lazy(() => import('./pages/home/HomePage').then(m => ({ default: m.NotFoundPage })));

export const AppRouter = () => (
  <Suspense fallback={<PremiumLoader />}>
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/quem-somos" element={<QuemSomosPage />} />
      <Route path="/administracao" element={<AdminPage />} />
      <Route path="/membros" element={<Navigate to="/administracao" replace />} />
      <Route path="/parceiros" element={<ParceirosPage />} />
      <Route path="/membro/:id" element={<MembroPerfilPage />} />
      <Route path="/membro/:id/editar" element={<MembroEditarPage />} />
      <Route path="/eventos" element={<EventosPage />} />
      <Route path="/eventos/:id" element={<EventoDetalhePage />} />
      <Route path="/eventos/:id/colaborar" element={<EventoColaborarPage />} />
      <Route path="/precadastro" element={<PreCadastroPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/cadastro" element={<CadastroPage />} />
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/dashboard/eventos" element={<DashboardPage />} />
      <Route path="/dashboard/eventos/:id/midias" element={<DashboardMediaPage />} />
      <Route path="/privacidade" element={<PrivacyPage />} />
      <Route path="/termos" element={<TermsPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  </Suspense>
);
```

- [ ] Commit:
```bash
git add router.tsx
git commit -m "feat: update router with lazy loading and new routes"
```

---

### Task 19: Slim down App.tsx + wire sync

**Files:**
- Modify: `App.tsx`

- [ ] Atualizar `App.tsx` para ser slim — apenas providers, layout e sync:

```tsx
// App.tsx — apenas providers + layout + sync inicial
import React, { useEffect } from 'react';
import { HashRouter } from 'react-router-dom';
import { Header } from './components/domain/Header';
import { Footer } from './components/domain/Footer';
import { SmartInviteModal } from './components/domain/SmartInviteModal';
import { ToastContainer } from './components/ui/Toast';
import { AppRouter } from './router';
import { supabase } from './supabaseClient';
import { PARTNERS, EVENTS, PRECADASTROS, AUTH_SESSION, setAuthSession, notifyState, isEditor } from './store/app.store';
import { syncMembers } from './services/members.service';
import { syncEvents } from './services/events.service';

// Re-exports para backward-compat (serão removidos gradualmente)
export * from './store/app.store';
export * from './types';
export { syncMembers as createMember } from './services/members.service';
export { syncEvents } from './services/events.service';

const syncAll = async () => {
  await Promise.all([syncMembers(), syncEvents()]);
};

const App = () => {
  useEffect(() => {
    // Check existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setAuthSession({
          isLoggedIn: true,
          role: 'editor',
          displayName: session.user.email || 'Editor',
          userId: session.user.id,
          lastLoginAt: new Date().toISOString(),
        });
      }
      syncAll();
    });

    // Auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setAuthSession({ isLoggedIn: true, role: 'editor', displayName: session.user.email || 'Editor', userId: session.user.id });
      } else {
        setAuthSession({ isLoggedIn: false, role: 'viewer' });
      }
      syncAll();
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <HashRouter>
      <Header />
      <AppRouter />
      <Footer />
      <SmartInviteModal />
      <ToastContainer />
    </HashRouter>
  );
};

export default App;
```

- [ ] Manter exports necessários no App.tsx usando re-exports do store (backward-compat)

- [ ] Verificar no browser: app carrega, sync funciona, todas as rotas acessíveis

- [ ] Commit:
```bash
git add App.tsx
git commit -m "feat: slim App.tsx to providers + sync orchestration"
```

---

### Task 20: Verificação final e cleanup

- [ ] Verificar todas as rotas no browser:
  - `/` → HomePage ✓
  - `/quem-somos` → QuemSomosPage ✓
  - `/administracao` → AdminPage com hierarquia ✓
  - `/membros` → redireciona para /administracao ✓
  - `/parceiros` → ParceirosPage ✓
  - `/membro/:id` → MembroPerfilPage ✓
  - `/eventos` → EventosPage ✓
  - `/eventos/:id` → EventoDetalhePage com seções expandidas ✓

- [ ] Verificar ExpandableText funciona em:
  - Missão na HomePage
  - Bios dos membros na AdminPage
  - Mensagem do presidente na QuemSomosPage
  - Parceiros fundadores na ParceirosPage

- [ ] Verificar hierarquia de membros na AdminPage:
  - Presidente em destaque
  - Direção em 2 cards
  - Secretário Geral em seção separada
  - Vogais em grid de 4

- [ ] Verificar lazy loading: páginas carregam com PremiumLoader

- [ ] Verificar no console: zero erros

- [ ] Remover arquivos antigos da raiz (SOMENTE após verificar que tudo funciona):
```bash
# Verificar que nada mais importa os arquivos antigos
grep -r "from './page\." . --include="*.tsx" --include="*.ts"
grep -r "from './component\." . --include="*.tsx" --include="*.ts"

# Se nenhum resultado: deletar
rm page.home.tsx page.membros.tsx page.membro.perfil.tsx
rm page.eventos.tsx page.evento.detalhe.tsx page.evento.colaborar.tsx
rm page.cadastro.tsx page.login.tsx page.precadastro.tsx
rm page.dashboard.tsx page.dashboard.media.tsx page.legal.tsx
rm component.ui.tsx component.domain.tsx
```

- [ ] Commit final:
```bash
git add -A
git commit -m "feat: complete institutional platform refactor

- New folder structure: types/, data/, services/, store/, hooks/, components/, pages/
- Static seed data for members hierarchy and institutional content
- ExpandableText component with smooth animation
- QuemSomosPage, AdminPage (with hierarchy), ParceirosPage (all new)
- EventoDetalhePage expanded with objective, experience, sponsors
- Lazy loading on all pages
- Supabase sync via services layer
- Zero broken routes"
```

---

## Notas para Implementação

1. **Ordem obrigatória:** Chunks 1 → 2 → 3 → 4 → 5 → 6
2. **Não deletar arquivos antigos** até o Task 20
3. **Backward-compat:** `App.tsx` re-exporta do store durante migração
4. **Verificar browser** após cada Task antes de commitar
5. **Importações dos componentes extraídos:** sempre usar `../../store/app.store` (nunca `./App` nos novos arquivos)
6. **MemberCard** depende do `tier` do seed — verificar que sync popula corretamente
7. **Tailwind CDN:** classes custom definidas no `index.html` — não criar `tailwind.config.js`
