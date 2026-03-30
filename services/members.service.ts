// services/members.service.ts
import { supabase } from '../supabaseClient';
import { MEMBERS_SEED, getMemberByTier } from '../data/members.data';
import { PARTNERS, notifyState, showToast, isEditor, generateId } from '../store/app.store';
import type { Partner, SocialLinks } from '../types';

export { getMemberByTier };

type RawPartnerRow = Omit<Partner, 'socialLinks'> & {
  social_links?: SocialLinks;
};

const normalize = (p: RawPartnerRow): Partner => ({
  ...p,
  type: p.type || 'pessoa',
  socialLinks: p.social_links || {},
});

export const syncMembers = async () => {
  const { data, error } = await supabase.from('partners').select('*').order('created_at', { ascending: false });
  if (error || !data) {
    // Fallback to seed data
    const seedPartners: Partner[] = MEMBERS_SEED.map(seed => ({
      ...seed,
      type: 'pessoa' as const,
      category: 'Governança' as const,
    }));
    PARTNERS.length = 0;
    PARTNERS.push(...seedPartners);
    notifyState();
    return;
  }

  // Merge: seed defines structure, Supabase overrides content
  const seedIds = MEMBERS_SEED.map(s => s.id);
  const merged: Partner[] = MEMBERS_SEED.map(seed => {
    const live = data.find((d: RawPartnerRow) => d.id === seed.id);
    return live
      ? { ...seed, ...normalize(live) }
      : { ...seed, type: 'pessoa' as const, category: 'Governança' as const };
  });

  // Add Supabase partners not in seed
  const extras = data.filter((d: RawPartnerRow) => !seedIds.includes(d.id)).map(normalize);

  PARTNERS.length = 0;
  PARTNERS.push(...merged, ...extras);
  notifyState();
};

export const createMember = async (notify = true): Promise<Partner | null> => {
  if (!isEditor()) return null;
  const { data: res, error } = await supabase
    .from('partners')
    .insert([{ name: 'Novo Membro', type: 'pessoa', category: 'Parceiro', active: true }])
    .select();
  if (error || !res) return null;
  const newMember = normalize(res[0]);
  PARTNERS.unshift(newMember);
  notifyState();
  if (notify) showToast('Membro criado.', 'success');
  return newMember;
};

export const updateMember = async (id: string, patch: Partial<Partner>, notify = true) => {
  if (!isEditor()) return;
  const payload: Record<string, unknown> = { ...patch };
  if (patch.socialLinks) { payload.social_links = patch.socialLinks; delete payload.socialLinks; }
  delete payload.id;
  const idx = PARTNERS.findIndex(p => p.id === id);
  if (idx !== -1) { PARTNERS[idx] = { ...PARTNERS[idx], ...patch }; notifyState(); }
  const { error } = await supabase.from('partners').update(payload).eq('id', id);
  if (!error && notify) showToast('Membro atualizado.', 'success');
};

export const deleteMember = async (id: string) => {
  if (!isEditor()) return;
  const { error } = await supabase.from('partners').delete().eq('id', id);
  if (!error) {
    const idx = PARTNERS.findIndex(p => p.id === id);
    if (idx !== -1) { PARTNERS.splice(idx, 1); notifyState(); showToast('Membro removido.', 'success'); }
  }
};
