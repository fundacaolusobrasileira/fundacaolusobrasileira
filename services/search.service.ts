import { EVENTS, PARTNERS } from '../store/app.store';
import { SPACES } from '../data/content.data';
import { MEMBERS_SEED } from '../data/members.data';

const normalize = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const MAX_QUERY_LENGTH = 100;

export const searchFoundation = (query: string) => {
  const q = normalize(query.slice(0, MAX_QUERY_LENGTH));
  if (!q) return { partners: [], events: [], spaces: [], members: [] };
  return {
    partners: PARTNERS.filter(p => normalize(p.name).includes(q) || normalize(p.category).includes(q)),
    events: EVENTS.filter(e => normalize(e.title).includes(q) || normalize(e.description).includes(q)),
    spaces: SPACES.filter(s => normalize(s.name).includes(q) || normalize(s.location).includes(q)),
    members: MEMBERS_SEED.filter(m =>
      normalize(m.name).includes(q) ||
      normalize(m.role).includes(q) ||
      normalize(m.tier).includes(q)
    ),
  };
};
