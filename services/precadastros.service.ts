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

  const { error } = await supabase.from('precadastros').insert([payload]);

  if (!error) {
    if (isEditor()) {
      const tempEntry = {
        ...payload,
        id: generateId('pre'),
        createdAt: new Date().toISOString()
      } as PreCadastro;
      PRECADASTROS.unshift(tempEntry);
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
const PRECADASTRO_DB_COLUMNS = new Set(['name', 'email', 'type', 'registrationType', 'message', 'status', 'note']);

export const updatePreCadastro = async (id: string, patch: Partial<PreCadastro>) => {
  if (!isEditor()) return;

  const payload: Partial<Record<string, unknown>> = {};
  for (const key of Object.keys(patch) as Array<keyof PreCadastro>) {
    if (PRECADASTRO_DB_COLUMNS.has(key)) payload[key] = patch[key];
  }

  const { error } = await supabase.from('precadastros').update(payload).eq('id', id);
  if (!error) {
    const idx = PRECADASTROS.findIndex(p => p.id === id);
    if (idx !== -1) {
      PRECADASTROS[idx] = { ...PRECADASTROS[idx], ...patch };
      logActivity('Atualizou pré-cadastro', PRECADASTROS[idx].name);
      notifyState();
      showToast('Atualizado.', 'success');
    }
  }
};

export const deletePreCadastro = async (id: string) => {
  if (!isEditor()) return;
  const { error } = await supabase.from('precadastros').delete().eq('id', id);
  if (!error) {
    const idx = PRECADASTROS.findIndex(p => p.id === id);
    if (idx !== -1) {
      const name = PRECADASTROS[idx].name;
      PRECADASTROS.splice(idx, 1);
      logActivity('Removeu pré-cadastro', name);
      notifyState();
      showToast('Removido.', 'success');
    }
  }
};

export const convertPreCadastroToMember = (id: string) => {
  if (!isEditor()) return null;
  const pre = PRECADASTROS.find(p => p.id === id);
  if (pre) {
    createMember(false).then(async (newMember) => {
      if (newMember) {
        try {
          await updateMember(newMember.id, {
            name: pre.name,
            category: pre.registrationType === 'parceiro' ? 'Parceiro Silver' : 'Outro Apoio',
            bio: pre.message
          }, false);
          await updatePreCadastro(id, { status: 'convertido' });
          logActivity('Converteu pré-cadastro em membro', pre.name);
          showToast('Convertido em membro com sucesso.', 'success');
        } catch (err) {
          console.error('Conversion failed:', err);
          showToast('Erro na conversão.', 'error');
        }
      }
    }).catch(err => {
      console.error('Member creation failed:', err);
      showToast('Erro ao criar membro.', 'error');
    });
  }
  return null;
};
