// data/content.data.ts
import { BookOpen, Landmark, Cpu, Palette } from 'lucide-react';
import type { Pillar } from '../types';

export const MISSION = {
  summary:
    'A Fundação Luso-Brasileira para o Desenvolvimento do Mundo de Língua Portuguesa tem como missão promover e fortalecer os laços culturais, económicos e institucionais entre Portugal, Brasil e os países do espaço lusófono.',
  full: `A Fundação Luso-Brasileira para o Desenvolvimento do Mundo de Língua Portuguesa foi criada em 1992, no quadro das comemorações do V Centenário dos Descobrimentos Portugueses, com o objetivo de consolidar e aprofundar as relações entre Portugal e o Brasil, e de promover o desenvolvimento do espaço lusófono.

Ao longo de mais de três décadas, a Fundação tem desenvolvido iniciativas nas áreas cultural, educativa, tecnológica e patrimonial, reunindo empresas, instituições e personalidades de ambos os países numa plataforma única de cooperação e diálogo.

A Fundação atua como uma ponte entre os dois países, facilitando o intercâmbio de pessoas, ideias e recursos, e contribuindo para a criação de um espaço lusófono coeso, dinâmico e relevante no contexto global.

A sua ação assenta na convicção de que a língua portuguesa é um patrimônio comum e um ativo estratégico de valor inestimável, capaz de unir mais de 250 milhões de pessoas em todos os continentes e de criar oportunidades únicas de cooperação e desenvolvimento.`,
};

export const PRESIDENT_MESSAGE = {
  quote:
    'É uma honra e um privilégio presidir a esta Fundação e uma enorme responsabilidade...',
  full: `É uma honra e um privilégio presidir a esta Fundação e uma enorme responsabilidade continuar o trabalho de tantos que, antes de nós, dedicaram o seu tempo e talento à construção destas pontes entre Portugal e o Brasil.

A Fundação Luso-Brasileira representa o que há de mais genuíno na relação entre os dois países: a vontade de cooperar, de partilhar e de crescer juntos, com respeito pela identidade e pela história de cada um.

Num momento em que o mundo enfrenta desafios sem precedentes, a língua portuguesa e os valores que partilhamos são um recurso precioso — não apenas para os nossos países, mas para o mundo. É com este espírito que assumimos a liderança desta Fundação: com ambição, com humildade e com a certeza de que o melhor está ainda por vir.

Entre Portugal e o Brasil não podem existir entraves, temos de construir pontes que unam a nossa rica e diversificada cultura.`,
  author: 'Paulo Campos Costa',
  role: 'Presidente',
  company: 'Fundação Luso-Brasileira',
};

export const HISTORY = {
  summary:
    'Fundada em 1992, no quadro das comemorações do V Centenário dos Descobrimentos Portugueses, a Fundação Luso-Brasileira celebra mais de três décadas ao serviço da cooperação entre Portugal e Brasil.',
  full: `A Fundação Luso-Brasileira para o Desenvolvimento do Mundo de Língua Portuguesa nasceu em 1992, num momento histórico de renovação dos laços entre Portugal e o Brasil, coincidindo com as comemorações do V Centenário dos Descobrimentos Portugueses.

Desde a sua fundação, a Fundação reuniu algumas das mais relevantes empresas e instituições portuguesas e brasileiras, criando uma plataforma única de diálogo, cooperação e desenvolvimento no espaço lusófono.

Ao longo de mais de 30 anos de história, a Fundação organizou eventos de referência, apoiou iniciativas culturais e educativas de impacto, e contribuiu para a consolidação de uma rede de relações que atravessa os dois lados do Atlântico.

Em 2025, com a renovação dos seus órgãos sociais e a chegada de uma nova liderança, a Fundação Luso-Brasileira inicia um novo capítulo — mantendo a fidelidade à sua missão fundadora, mas com uma visão renovada e ambiciosa para o futuro da cooperação luso-brasileira no século XXI.`,
};

export const PILLARS: Pillar[] = [
  {
    id: 'cultural',
    title: 'Cultural',
    description:
      'Promovemos o intercâmbio cultural entre Portugal e Brasil, valorizando a língua portuguesa como patrimônio comum e vetor de identidade partilhada.',
    icon: Palette,
  },
  {
    id: 'educativo',
    title: 'Educativo',
    description:
      'Apoiamos iniciativas de educação, formação e investigação que reforçam os laços académicos e científicos entre os dois países.',
    icon: BookOpen,
  },
  {
    id: 'tecnologico',
    title: 'Tecnológico',
    description:
      'Fomentamos a inovação e a transferência de conhecimento, conectando ecossistemas tecnológicos e empreendedores dos dois lados do Atlântico.',
    icon: Cpu,
  },
  {
    id: 'patrimonial',
    title: 'Patrimonial',
    description:
      'Preservamos e valorizamos o patrimônio histórico e cultural comum, reconhecendo o legado partilhado como fundamento da nossa identidade lusófona.',
    icon: Landmark,
  },
];
