import { supabase } from '../supabaseClient';
import { PRECADASTROS, notifyState, showToast, logActivity, isEditor, generateId } from '../store/app.store';
import { createMember, updateMember } from './members.service';
import type { PreCadastro } from '../types';

const normalizePreCadastro = (p: any): PreCadastro => {
  const normalized: any = { ...p };
  normalized.createdAt = p.created_at;
  delete normalized.created_at;
  return normalized;
};

export const syncPreCadastros = async () => {
  const { data, error } = await supabase.from('precadastros').select('*').order('created_at', { ascending: false });
  if (error || !data) return;
  PRECADASTROS.length = 0;
  PRECADASTROS.push(...data.map(normalizePreCadastro));
  notifyState();
};

export const createPreCadastro = async (data: Partial<PreCadastro>) => {
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

export const updatePreCadastro = async (id: string, patch: Partial<PreCadastro>) => {
  if (!isEditor()) return;
  const { error } = await supabase.from('precadastros').update(patch).eq('id', id);
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
        await updateMember(newMember.id, {
          name: pre.name,
          category: pre.registrationType === 'parceiro' ? 'Parceiro Silver' : 'Outro Apoio',
          bio: pre.message
        }, false);
        await updatePreCadastro(id, { status: 'convertido' });
        logActivity('Converteu pré-cadastro em membro', pre.name);
        showToast('Convertido em membro com sucesso.', 'success');
      }
    });
  }
  return null;
};
