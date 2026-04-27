import { supabase } from '../supabaseClient';
import { isEditor, showToast, logActivity } from '../store/app.store';
import type { Benefit } from '../types';
import { BenefitSchema } from '../validation/schemas';

export const fetchBenefits = async (): Promise<Benefit[]> => {
  const { data } = await supabase
    .from('benefits')
    .select('*')
    .eq('active', true)
    .order('order', { ascending: true })
    .order('created_at', { ascending: true });
  return (data || []) as Benefit[];
};

export const fetchBenefitsByPartner = async (partnerId: string): Promise<Benefit[]> => {
  const { data } = await supabase
    .from('benefits')
    .select('*')
    .eq('partner_id', partnerId)
    .order('order', { ascending: true })
    .order('created_at', { ascending: true });
  return (data || []) as Benefit[];
};

export const createBenefit = async (
  benefit: Omit<Benefit, 'id' | 'created_at'>
): Promise<Benefit | null> => {
  if (!isEditor()) { showToast('Sem permissão.', 'error'); return null; }
  const parsed = BenefitSchema.safeParse(benefit);
  if (!parsed.success) {
    showToast(parsed.error.issues[0]?.message || 'Dados inválidos.', 'error');
    return null;
  }
  const { data, error } = await supabase
    .from('benefits')
    .insert([parsed.data])
    .select()
    .single();
  if (error) { showToast('Erro ao criar benefício.', 'error'); return null; }
  logActivity('Criou benefício', parsed.data.title);
  showToast('Benefício criado.', 'success');
  return data as Benefit;
};

export const updateBenefit = async (id: string, patch: Partial<Benefit>): Promise<boolean> => {
  if (!isEditor()) { showToast('Sem permissão.', 'error'); return false; }
  const parsed = BenefitSchema.partial().safeParse(patch);
  if (!parsed.success) {
    showToast(parsed.error.issues[0]?.message || 'Dados inválidos.', 'error');
    return false;
  }
  const { error } = await supabase.from('benefits').update(parsed.data).eq('id', id);
  if (error) { showToast('Erro ao atualizar benefício.', 'error'); return false; }
  showToast('Benefício guardado.', 'success');
  return true;
};

export const deleteBenefit = async (id: string): Promise<boolean> => {
  if (!isEditor()) { showToast('Sem permissão.', 'error'); return false; }
  const { error } = await supabase.from('benefits').delete().eq('id', id);
  if (error) { showToast('Erro ao remover benefício.', 'error'); return false; }
  logActivity('Removeu benefício', id);
  showToast('Benefício removido.', 'success');
  return true;
};
