// services/members.service.ts
import { supabase } from '../supabaseClient';
import { MEMBERS_SEED, getMemberByTier } from '../data/members.data';
import { PARTNERS, notifyState, showToast, logActivity, isEditor } from '../store/app.store';
import type { Partner } from '../types';

export { getMemberByTier };

// All editable columns in the partners table (excludes id, created_at, updated_at)
const PARTNER_DB_COLUMNS = new Set([
  'name', 'type', 'category', 'role', 'bio', 'summary', 'full',
  'image', 'avatar', 'country', 'website', 'social_links', 'tags',
  'tier', 'since', 'active', 'featured', 'order',
]);

const normalize = (p: any): Partner => {
  const { social_links, ...rest } = p;
  return {
    ...rest,
    type: p.type || 'pessoa',
    socialLinks: social_links || {},
    gallery: p.gallery || [],
    albums: p.albums || [],
  };
};

// Fuzzy name matching: allows the admin to rename a seed member without breaking
// the seed↔DB link. Strategy:
//   1. Exact name match (existing behaviour).
//   2. Order match — stable once seed metadata is persisted on first insert.
//   3. Token match — all significant tokens (>3 chars) of the shorter name appear
//      in the longer name (e.g. "Álvaro Covões" ↔ "Álvaro Ricardo … Covões Gávea").
const seedMatchesDbRow = (seed: { name: string; order?: number }, d: any): boolean => {
  if (d.name === seed.name) return true;
  if (seed.order !== undefined && d.order !== null && d.order !== undefined && d.order === seed.order) return true;
  if (!d.name) return false;
  const a = seed.name.toLowerCase().trim();
  const b = (d.name as string).toLowerCase().trim();
  const [shorter, longer] = a.length <= b.length ? [a, b] : [b, a];
  const tokens = shorter.split(/\s+/).filter((t: string) => t.length > 3);
  return tokens.length >= 2 && tokens.every((t: string) => longer.includes(t));
};

export const syncMembers = async () => {
  const { data, error } = await supabase.from('partners').select('*').order('created_at', { ascending: false });
  if (error || !data) {
    // Fallback to seed data
    PARTNERS.length = 0;
    PARTNERS.push(...MEMBERS_SEED.map(seed => ({
      ...seed,
      type: 'pessoa' as const,
      category: 'Governança' as const,
    })));
    notifyState();
    return;
  }

  // Match seed members to DB records — now with fuzzy matching so renames in the
  // admin panel don't break the link. When matched, the DB UUID becomes the id.
  const matchedDbIds = new Set<string>();
  const merged: Partner[] = MEMBERS_SEED.map(seed => {
    const live = data.find((d: any) => !matchedDbIds.has(d.id) && seedMatchesDbRow(seed, d));
    if (live) {
      matchedDbIds.add(live.id);
      return { ...seed, ...normalize(live) }; // live.id (UUID) overrides seed.id (slug)
    }
    return { ...seed, type: 'pessoa' as const, category: 'Governança' as const };
  });

  // Add DB partners not matched to any seed member
  const extras = data.filter((d: any) => !matchedDbIds.has(d.id)).map(normalize);

  PARTNERS.length = 0;
  PARTNERS.push(...merged, ...extras);
  notifyState();
};

export const createMember = async (notify = true): Promise<Partner | null> => {
  if (!isEditor()) return null;
  const { data: res, error } = await supabase
    .from('partners')
    .insert([{ name: 'Novo Membro', type: 'pessoa', category: 'Parceiro Silver', active: true }])
    .select();
  if (error || !res) return null;
  const newMember = normalize(res[0]);
  PARTNERS.unshift(newMember);
  logActivity('Criou membro', newMember.name);
  notifyState();
  if (notify) showToast('Membro criado.', 'success');
  return newMember;
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const updateMember = async (id: string, patch: Partial<Partner>, notify = true): Promise<boolean> => {
  if (!isEditor()) return false;
  const raw: any = { ...patch };
  if (patch.socialLinks !== undefined) { raw.social_links = patch.socialLinks; }

  const payload: any = {};
  for (const key of Object.keys(raw)) {
    if (PARTNER_DB_COLUMNS.has(key)) payload[key] = raw[key];
  }

  // BUG 0 FIX: seed members have slug IDs (not UUIDs) — INSERT on first edit, then UPDATE
  if (!UUID_REGEX.test(id)) {
    const seedMember = PARTNERS.find(p => p.id === id);
    // Persist seed metadata (tier, order, category, role, country) on first insert so
    // that future syncMembers calls can match by `order` even if the name changes.
    const seedMeta: any = {};
    if (seedMember) {
      if (seedMember.tier !== undefined) seedMeta.tier = seedMember.tier;
      if (seedMember.order !== undefined) seedMeta.order = seedMember.order;
      if (!payload.category && seedMember.category) seedMeta.category = seedMember.category;
      if (!payload.role && seedMember.role) seedMeta.role = seedMember.role;
      if (!payload.country && seedMember.country) seedMeta.country = seedMember.country;
    }
    const insertPayload: any = { ...seedMeta, ...payload };
    if (!insertPayload.name && seedMember) insertPayload.name = seedMember.name;

    const { data: inserted, error: insertError } = await supabase
      .from('partners')
      .insert([insertPayload])
      .select()
      .single();

    if (insertError || !inserted) {
      showToast('Erro ao salvar membro.', 'error');
      return false;
    }

    // Replace slug ID with real UUID in the store
    const idx = PARTNERS.findIndex(p => p.id === id);
    if (idx !== -1) PARTNERS[idx] = { ...PARTNERS[idx], ...patch, id: inserted.id };
    logActivity('Criou membro no banco', inserted.name);
    notifyState();
    if (notify) showToast('Membro salvo.', 'success');
    return true;
  }

  // BUG 2 FIX: RLS USING denial returns { error: null, data: [] } — must check
  // rows affected, not just absence of error.
  const { data, error } = await supabase.from('partners').update(payload).eq('id', id).select('id');
  if (error) {
    showToast('Erro ao atualizar membro.', 'error');
    return false;
  }
  if (!data || data.length === 0) {
    showToast('Sem permissão para atualizar este membro.', 'error');
    return false;
  }
  const idx = PARTNERS.findIndex(p => p.id === id);
  if (idx !== -1) { PARTNERS[idx] = { ...PARTNERS[idx], ...patch }; }
  logActivity('Editou membro', PARTNERS.find(p => p.id === id)?.name || id);
  notifyState();
  if (notify) showToast('Membro atualizado.', 'success');
  return true;
};

export const deleteMember = async (id: string): Promise<boolean> => {
  if (!isEditor()) return false;
  if (!UUID_REGEX.test(id)) {
    showToast('Este membro ainda é do seed inicial. Salve-o primeiro para gerar um registo editável.', 'warning');
    return false;
  }
  // BUG 2 PATTERN: RLS USING denial returns { error: null, data: [] } — verify rows affected.
  const { data, error } = await supabase.from('partners').delete().eq('id', id).select('id');
  if (error) {
    showToast('Erro ao remover membro.', 'error');
    return false;
  }
  if (!data || data.length === 0) {
    showToast('Sem permissão para remover este membro.', 'error');
    return false;
  }
  const idx = PARTNERS.findIndex(p => p.id === id);
  if (idx !== -1) {
    const name = PARTNERS[idx].name;
    PARTNERS.splice(idx, 1);
    logActivity('Removeu membro', name);
    notifyState();
    showToast('Membro removido.', 'success');
  }
  return true;
};
