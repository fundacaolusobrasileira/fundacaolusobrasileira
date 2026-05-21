// services/councils.service.ts
// Conselho de Curadores e Conselho Fiscal — apenas NOMES (não perfis).
// Tabela isolada `council_members`; não toca em `partners`.
import { supabase } from '../supabaseClient';
import { COUNCILS, notifyState, showToast, logActivity, isEditor } from '../store/app.store';
import { CouncilMemberSchema } from '../validation/schemas';
import type { CouncilMember, CouncilType } from '../types';

const normalize = (row: any): CouncilMember => ({
  id: row.id,
  council: row.council,
  name: row.name,
  role: row.role ?? null,
  order: row.order ?? 0,
  active: row.active !== false,
  partner_id: row.partner_id ?? null,
  created_at: row.created_at,
});

const replaceStore = (rows: CouncilMember[]) => {
  COUNCILS.length = 0;
  COUNCILS.push(...rows);
  notifyState();
};

export const syncCouncils = async (): Promise<void> => {
  const { data, error } = await supabase
    .from('council_members')
    .select('*')
    .order('council', { ascending: true })
    .order('order', { ascending: true })
    .order('created_at', { ascending: true });
  if (error || !data) {
    // Tabela ainda não migrada ou sem permissão de leitura: deixa a lista vazia
    // (a página mostra o placeholder "Em breve" sem quebrar).
    replaceStore([]);
    return;
  }
  replaceStore(data.map(normalize));
};

export const getCouncil = (council: CouncilType): CouncilMember[] =>
  COUNCILS
    .filter(m => m.council === council && m.active !== false)
    .sort((a, b) => (a.order - b.order) || a.name.localeCompare(b.name));

export const createCouncilMember = async (
  input: { council: CouncilType; name: string; role?: string | null; order?: number; active?: boolean },
): Promise<CouncilMember | null> => {
  if (!isEditor()) { showToast('Sem permissão.', 'error'); return null; }

  // Próxima ordem dentro do conselho, quando não informada.
  const fallbackOrder =
    Math.max(0, ...COUNCILS.filter(m => m.council === input.council).map(m => m.order)) + 1;

  const candidate = {
    council: input.council,
    name: input.name,
    role: input.role ?? null,
    order: input.order ?? fallbackOrder,
    active: input.active ?? true,
  };

  const parsed = CouncilMemberSchema.safeParse(candidate);
  if (!parsed.success) {
    showToast(parsed.error.issues[0]?.message || 'Dados inválidos.', 'error');
    return null;
  }

  const { data, error } = await supabase
    .from('council_members')
    .insert([parsed.data])
    .select()
    .single();
  if (error || !data) { showToast('Erro ao adicionar nome.', 'error'); return null; }

  const created = normalize(data);
  COUNCILS.push(created);
  logActivity('Adicionou nome ao conselho', created.name);
  notifyState();
  showToast('Nome adicionado.', 'success');
  return created;
};

export const updateCouncilMember = async (
  id: string,
  patch: Partial<Pick<CouncilMember, 'name' | 'role' | 'order' | 'active' | 'council'>>,
): Promise<boolean> => {
  if (!isEditor()) { showToast('Sem permissão.', 'error'); return false; }

  const parsed = CouncilMemberSchema.partial().safeParse(patch);
  if (!parsed.success) {
    showToast(parsed.error.issues[0]?.message || 'Dados inválidos.', 'error');
    return false;
  }

  // RLS USING denial devolve { error: null, data: [] } — confirmar linhas afetadas.
  const { data, error } = await supabase
    .from('council_members')
    .update(parsed.data)
    .eq('id', id)
    .select('id');
  if (error) { showToast('Erro ao atualizar nome.', 'error'); return false; }
  if (!data || data.length === 0) { showToast('Sem permissão para atualizar.', 'error'); return false; }

  const idx = COUNCILS.findIndex(m => m.id === id);
  if (idx !== -1) COUNCILS[idx] = { ...COUNCILS[idx], ...parsed.data } as CouncilMember;
  logActivity('Editou nome do conselho', COUNCILS.find(m => m.id === id)?.name || id);
  notifyState();
  showToast('Nome atualizado.', 'success');
  return true;
};

export const deleteCouncilMember = async (id: string): Promise<boolean> => {
  if (!isEditor()) { showToast('Sem permissão.', 'error'); return false; }

  const { data, error } = await supabase
    .from('council_members')
    .delete()
    .eq('id', id)
    .select('id');
  if (error) { showToast('Erro ao remover nome.', 'error'); return false; }
  if (!data || data.length === 0) { showToast('Sem permissão para remover.', 'error'); return false; }

  const idx = COUNCILS.findIndex(m => m.id === id);
  if (idx !== -1) {
    const name = COUNCILS[idx].name;
    COUNCILS.splice(idx, 1);
    logActivity('Removeu nome do conselho', name);
    notifyState();
    showToast('Nome removido.', 'success');
  }
  return true;
};
