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
  'tier', 'since', 'active', 'featured', 'order', 'gallery', 'albums',
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

  // BUG 0 FIX: Match seed members by name (seed ids are slugs, DB ids are UUIDs)
  // When matched, the DB UUID becomes the id — making the member editable.
  const matchedDbIds = new Set<string>();
  const merged: Partner[] = MEMBERS_SEED.map(seed => {
    const live = data.find((d: any) => d.name === seed.name);
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

export const updateMember = async (id: string, patch: Partial<Partner>, notify = true) => {
  if (!isEditor()) return;
  const raw: any = { ...patch };
  if (patch.socialLinks !== undefined) { raw.social_links = patch.socialLinks; }

  const payload: any = {};
  for (const key of Object.keys(raw)) {
    if (PARTNER_DB_COLUMNS.has(key)) payload[key] = raw[key];
  }

  // BUG 0 FIX: seed members have slug IDs (not UUIDs) — INSERT on first edit, then UPDATE
  if (!UUID_REGEX.test(id)) {
    const seedMember = PARTNERS.find(p => p.id === id);
    const insertPayload: any = { ...payload };
    if (!insertPayload.name && seedMember) insertPayload.name = seedMember.name;

    const { data: inserted, error: insertError } = await supabase
      .from('partners')
      .insert([insertPayload])
      .select()
      .single();

    if (insertError || !inserted) {
      showToast('Erro ao salvar membro.', 'error');
      return;
    }

    // Replace slug ID with real UUID in the store
    const idx = PARTNERS.findIndex(p => p.id === id);
    if (idx !== -1) PARTNERS[idx] = { ...PARTNERS[idx], ...patch, id: inserted.id };
    logActivity('Criou membro no banco', inserted.name);
    notifyState();
    if (notify) showToast('Membro salvo.', 'success');
    return;
  }

  const { error } = await supabase.from('partners').update(payload).eq('id', id);
  if (!error) {
    const idx = PARTNERS.findIndex(p => p.id === id);
    if (idx !== -1) { PARTNERS[idx] = { ...PARTNERS[idx], ...patch }; }
    logActivity('Editou membro', PARTNERS.find(p => p.id === id)?.name || id);
    notifyState();
    if (notify) showToast('Membro atualizado.', 'success');
  } else {
    showToast('Erro ao atualizar membro.', 'error');
  }
};

export const deleteMember = async (id: string) => {
  if (!isEditor()) return;
  const { error } = await supabase.from('partners').delete().eq('id', id);
  if (!error) {
    const idx = PARTNERS.findIndex(p => p.id === id);
    if (idx !== -1) {
      const name = PARTNERS[idx].name;
      PARTNERS.splice(idx, 1);
      logActivity('Removeu membro', name);
      notifyState();
      showToast('Membro removido.', 'success');
    }
  }
};
