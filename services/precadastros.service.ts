import { supabase } from '../supabaseClient';
import { z } from 'zod';
import { PRECADASTROS, notifyState, showToast, logActivity, isEditor, generateId } from '../store/app.store';
import { createMember, updateMember } from './members.service';
import type { PreCadastro } from '../types';

// BUG 9 FIX: enum constraint on registrationType (matches DB CHECK constraint)
const CreatePreCadastroSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  type: z.string().min(1).optional(),
  registrationType: z.enum(['membro', 'parceiro', 'colaborador', 'embaixador']).optional().nullable(),
  message: z.string().max(1000).optional(),
});

const UpdatePreCadastroSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  email: z.string().email().optional(),
  type: z.string().min(1).optional(),
  registrationType: z.enum(['membro', 'parceiro', 'colaborador', 'embaixador']).optional().nullable(),
  message: z.string().max(1000).optional(),
  status: z.enum(['novo', 'contatado', 'aprovado', 'pausado', 'rejeitado', 'convertido']).optional(),
  notes: z.string().max(1000).optional(),
});

const normalizePreCadastro = (p: Record<string, unknown>): PreCadastro => {
  const { created_at, updated_at: _updated_at, ...rest } = p;
  return { ...rest, createdAt: created_at as string } as PreCadastro;
};

export const syncPreCadastros = async () => {
  const { data, error } = await supabase.from('precadastros').select('*').order('created_at', { ascending: false });
  if (error || !data) return;
  PRECADASTROS.length = 0;
  PRECADASTROS.push(...data.map(normalizePreCadastro));
  notifyState();
};

export const createPreCadastro = async (data: Partial<PreCadastro>) => {
  const parsed = CreatePreCadastroSchema.safeParse(data);
  if (!parsed.success) {
    // BUG 2 FIX: use .issues[0]?.message instead of .message (Zod v4)
    showToast(parsed.error.issues[0]?.message || 'Dados inválidos.', 'error');
    return null;
  }

  const payload = {
    name: data.name,
    email: data.email,
    type: data.type || 'individual',
    registrationType: data.registrationType || null,
    message: data.message,
    status: 'novo'
  };

  const editorSession = isEditor();
  let inserted: Record<string, unknown> | null = null;
  let error: { message?: string } | null = null;

  if (editorSession) {
    const result = await supabase
      .from('precadastros')
      .insert([payload])
      .select()
      .single();
    inserted = (result.data as Record<string, unknown> | null) ?? null;
    error = result.error;
  } else {
    const result = await supabase.from('precadastros').insert([payload]);
    error = result.error;
  }

  if (!error) {
    if (editorSession) {
      const insertedEntry = inserted
        ? normalizePreCadastro(inserted as Record<string, unknown>)
        : ({
            ...payload,
            id: generateId('pre'),
            createdAt: new Date().toISOString(),
          } as PreCadastro);
      PRECADASTROS.unshift(insertedEntry);
      logActivity('Novo pré-cadastro', data.name || 'Anônimo');
      notifyState();
    }
    showToast('Enviado com sucesso!', 'success');
    return { success: true };
  } else {
    console.error('createPreCadastro error:', error);
    showToast('Erro ao enviar.', 'error');
    return null;
  }
};

export const subscribeToNewsletter = (email: string) => {
  return createPreCadastro({
    name: 'Newsletter',
    email,
    type: 'newsletter',
    message: 'Inscrição via Site'
  });
};

// BUG 3 FIX: only send DB columns, strip camelCase fields (createdAt → created_at handled by DB default)
const PRECADASTRO_DB_COLUMNS = new Set(['name', 'email', 'type', 'registrationType', 'message', 'status', 'notes']);

export const updatePreCadastro = async (id: string, patch: Partial<PreCadastro>): Promise<boolean> => {
  if (!isEditor()) return false;

  const parsed = UpdatePreCadastroSchema.safeParse(patch);
  if (!parsed.success) {
    showToast(parsed.error.issues[0]?.message || 'Dados inválidos.', 'error');
    return false;
  }

  const payload: Partial<Record<string, unknown>> = {};
  for (const key of Object.keys(parsed.data) as Array<keyof typeof parsed.data>) {
    if (PRECADASTRO_DB_COLUMNS.has(key)) payload[key] = parsed.data[key];
  }

  // BUG 2 FIX: RLS USING denial returns { error: null, data: [] } — must check
  // rows affected, not just absence of error.
  const { data, error } = await supabase.from('precadastros').update(payload).eq('id', id).select('id');
  if (error) {
    if (error.code === '23514' && patch.status === 'pausado') {
      showToast('A pausa da newsletter depende da migration 20260425_precadastros_status_pausado.sql no banco.', 'error');
      return false;
    }
    showToast('Erro ao atualizar pré-cadastro.', 'error');
    return false;
  }
  if (!data || data.length === 0) {
    showToast('Sem permissão para atualizar este pré-cadastro.', 'error');
    return false;
  }
  const idx = PRECADASTROS.findIndex(p => p.id === id);
  if (idx !== -1) {
    PRECADASTROS[idx] = { ...PRECADASTROS[idx], ...parsed.data };
    logActivity('Atualizou pré-cadastro', PRECADASTROS[idx].name);
    notifyState();
    showToast('Atualizado.', 'success');
  }
  return true;
};

export const deletePreCadastro = async (id: string): Promise<boolean> => {
  if (!isEditor()) return false;
  // BUG 2 PATTERN: RLS USING denial returns { error: null, data: [] } — verify rows affected.
  const { data, error } = await supabase.from('precadastros').delete().eq('id', id).select('id');
  if (error) {
    showToast('Erro ao remover pré-cadastro.', 'error');
    return false;
  }
  if (!data || data.length === 0) {
    showToast('Sem permissão para remover este pré-cadastro.', 'error');
    return false;
  }
  const idx = PRECADASTROS.findIndex(p => p.id === id);
  if (idx !== -1) {
    const name = PRECADASTROS[idx].name;
    PRECADASTROS.splice(idx, 1);
    logActivity('Removeu pré-cadastro', name);
    notifyState();
    showToast('Removido.', 'success');
  }
  return true;
};

// BUG 3 FIX: cache of pending conversions per preId. If updatePreCadastro
// fails AFTER member creation/update succeeded, we keep the memberId so a
// retry skips createMember and reuses the previously-created partner row,
// preventing duplicate members.
const pendingConversions = new Map<string, string>();

export const convertPreCadastroToMember = async (id: string): Promise<boolean> => {
  if (!isEditor()) return false;
  const pre = PRECADASTROS.find(p => p.id === id);
  if (!pre) return false;

  try {
    // Reuse member from previous failed attempt if any
    let memberId = pendingConversions.get(id) ?? null;

    if (!memberId) {
      const newMember = await createMember(false);
      if (!newMember) {
        showToast('Erro ao criar membro.', 'error');
        return false;
      }
      memberId = newMember.id;

      const memberUpdated = await updateMember(memberId, {
        name: pre.name,
        category: pre.registrationType === 'parceiro' ? 'Parceiro Silver' : 'Outro Apoio',
        bio: pre.message
      }, false);

      if (!memberUpdated) {
        // Member was created but couldn't be updated — still cache so retry
        // doesn't create a 3rd one. Caller can retry to complete the update.
        pendingConversions.set(id, memberId);
        showToast('Erro na conversão (dados do membro). Tente de novo.', 'error');
        return false;
      }
    }

    const preUpdated = await updatePreCadastro(id, { status: 'convertido' });
    if (!preUpdated) {
      // Cache so retry doesn't create another member
      pendingConversions.set(id, memberId);
      showToast('Membro criado, mas falha ao atualizar o pré-cadastro.', 'error');
      return false;
    }

    // Conversion fully complete — clear cache
    pendingConversions.delete(id);
    logActivity('Converteu pré-cadastro em membro', pre.name);
    showToast('Convertido em membro com sucesso.', 'success');
    return true;
  } catch (err) {
    console.error('Conversion failed:', err);
    showToast('Erro na conversão.', 'error');
    return false;
  }
};
