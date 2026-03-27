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
    address: 'Lisboa, Portugal',
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
