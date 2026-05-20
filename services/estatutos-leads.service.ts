// services/estatutos-leads.service.ts
import { supabase } from '../supabaseClient';
import { z } from 'zod';
import { ESTATUTOS_LEADS, notifyState, showToast, isEditor } from '../store/app.store';
import type { EstatutosLead } from '../types';

const CreateLeadSchema = z.object({
  name: z.string().min(2, 'Informe o seu nome completo.').max(120),
  email: z.string().email('Informe um email válido.'),
});

const normalizeLead = (row: Record<string, unknown>): EstatutosLead => {
  const { created_at, ...rest } = row;
  return { ...(rest as Omit<EstatutosLead, 'createdAt'>), createdAt: created_at as string };
};

/**
 * Public-facing call. Anyone can create a lead (no auth required) so the
 * download form on /documentacao works for visitors. RLS on the table
 * only allows INSERT (anon) + SELECT/DELETE for editors.
 */
export const createEstatutosLead = async (
  data: Pick<EstatutosLead, 'name' | 'email'>
): Promise<{ success: boolean; error?: string }> => {
  const parsed = CreateLeadSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || 'Dados inválidos.' };
  }

  const payload = {
    name: parsed.data.name.trim(),
    email: parsed.data.email.trim().toLowerCase(),
  };

  const { error } = await supabase.from('estatutos_leads').insert([payload]);

  if (error) {
    console.error('createEstatutosLead error:', error);
    return { success: false, error: 'Não foi possível registar o pedido. Tente novamente.' };
  }

  return { success: true };
};

/** Editor-only sync. Used by the dashboard to list the captured leads. */
export const syncEstatutosLeads = async () => {
  if (!isEditor()) return;
  const { data, error } = await supabase
    .from('estatutos_leads')
    .select('*')
    .order('created_at', { ascending: false });
  if (error || !data) return;
  ESTATUTOS_LEADS.length = 0;
  ESTATUTOS_LEADS.push(...data.map(normalizeLead));
  notifyState();
};

/** Editor-only delete. */
export const deleteEstatutosLead = async (id: string): Promise<boolean> => {
  if (!isEditor()) return false;
  // RLS USING denial returns { error: null, data: [] } — must check rows affected
  const { data, error } = await supabase
    .from('estatutos_leads')
    .delete()
    .eq('id', id)
    .select('id');
  if (error) {
    showToast('Erro ao remover registo.', 'error');
    return false;
  }
  if (!data || data.length === 0) {
    showToast('Sem permissão para remover este registo.', 'error');
    return false;
  }
  const idx = ESTATUTOS_LEADS.findIndex(l => l.id === id);
  if (idx !== -1) {
    ESTATUTOS_LEADS.splice(idx, 1);
    notifyState();
    showToast('Registo removido.', 'success');
  }
  return true;
};
