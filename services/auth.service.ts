import { supabase } from '../supabaseClient';
import { setAuthSession, AUTH_SESSION, isAdmin, notifyState, showToast, logActivity } from '../store/app.store';
import { LoginSchema, CadastroSchema } from '../validation/schemas';
import type { UserProfile } from '../types';

const ROLE_TIMEOUT_MS = 3000;

export const resolveUserRole = async (userId: string): Promise<'admin' | 'editor' | 'viewer'> => {
  const queryPromise = supabase
    .from('profiles')
    .select('role')
    .eq('user_id', userId)
    .single()
    .then(({ data: profile }) =>
      profile?.role === 'admin' ? 'admin' as const :
      profile?.role === 'editor' ? 'editor' as const : 'viewer' as const
    );

  const timeoutPromise = new Promise<'viewer'>((resolve) =>
    setTimeout(() => {
      console.warn(`[AUTH] resolveUserRole timed out after ${ROLE_TIMEOUT_MS}ms for user=${userId}`);
      resolve('viewer');
    }, ROLE_TIMEOUT_MS)
  );

  try {
    return await Promise.race([queryPromise, timeoutPromise]);
  } catch {
    return 'viewer';
  }
};

export const loginAsEditor = async (email: string, password: string): Promise<{ ok: boolean; error?: string }> => {
  const parsed = LoginSchema.safeParse({ email, password });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message || 'Dados inválidos.' };
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    if (error.message === 'Invalid login credentials') {
      return { ok: false, error: 'Email ou senha incorretos.' };
    }
    if (error.message === 'Email not confirmed') {
      return { ok: false, error: 'Email não confirmado. Verifique sua caixa de entrada.' };
    }
    return { ok: false, error: error.message };
  }

  if (data.session) {
    // onAuthStateChange handles session setup — role is read from JWT app_metadata
    logActivity('Login', data.user.email || email);
    showToast(`Bem-vindo, ${data.user.email}!`, 'success');
    return { ok: true };
  }

  return { ok: false, error: 'Falha no login.' };
};

export const logout = async () => {
  const name = AUTH_SESSION.displayName || 'Editor';
  await supabase.auth.signOut();
  logActivity('Logout', name);
  setAuthSession({ isLoggedIn: false, role: 'viewer' });
  notifyState();
  showToast('Sessão encerrada.', 'info');
};

export const signUp = async (email: string, password: string, name: string, type: string): Promise<{ ok: boolean; error?: string }> => {
  const parsed = CadastroSchema.safeParse({ email, password, name, type });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message || 'Dados inválidos.' };
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name, type } }
  });

  if (error) {
    if (error.message.includes('already registered')) {
      return { ok: false, error: 'Este email já está cadastrado.' };
    }
    return { ok: false, error: error.message };
  }

  if (data.user) {
    // Only upsert profile if there's an active session (email confirmation disabled).
    // When session is null, the trigger handle_new_user creates the profile automatically
    // after the user confirms their email — a manual INSERT here would fail with 401.
    if (data.session) {
      const { error: profileError } = await supabase.from('profiles').upsert({
        user_id: data.user.id,
        name,
        email,
        type,
        role: 'membro'
      }, { onConflict: 'user_id' });
      if (profileError) {
        console.error('signUp profile upsert failed:', profileError);
      }
    }
    logActivity('Novo cadastro', email);
    showToast('Conta criada com sucesso! Verifique seu email para confirmar.', 'success');
    return { ok: true };
  }

  return { ok: false, error: 'Erro ao criar conta.' };
};

// Admin-only user management
export const fetchAllProfiles = async (): Promise<UserProfile[]> => {
  if (!isAdmin()) { showToast('Sem permissão.', 'error'); return []; }
  const { data, error } = await supabase
    .from('profiles')
    .select('id, user_id, name, email, role, type, phone, partner_id, created_at, partner:partners(id, name)')
    .order('created_at', { ascending: false });
  if (error) return [];
  return data as UserProfile[];
};

export const updateUserRole = async (profileId: string, newRole: 'admin' | 'editor' | 'membro') => {
  if (!isAdmin()) { showToast('Sem permissão.', 'error'); return false; }
  const { error } = await supabase
    .from('profiles')
    .update({ role: newRole })
    .eq('id', profileId);
  if (error) { showToast('Erro ao atualizar permissão.', 'error'); return false; }
  logActivity('Alterou permissão', `${profileId} → ${newRole}`);
  showToast('Permissão atualizada.', 'success');
  return true;
};

// Cria uma conta Supabase a partir de um pré-cadastro (admin-only).
// Em Supabase JS v2 com confirmação de email ativa, o signUp não afeta a sessão do admin.
export const convertPreCadastroToAccount = async (opts: {
  name: string;
  email: string;
  type: string;
  role: 'membro' | 'editor';
  partnerId?: string | null;
}): Promise<{ ok: boolean; error?: string }> => {
  if (!isAdmin()) { showToast('Sem permissão.', 'error'); return { ok: false, error: 'Sem permissão.' }; }

  // Password aleatória — utilizador define a sua via "Esqueci a password"
  const tempPassword = crypto.randomUUID() + crypto.randomUUID();

  const { data, error } = await supabase.auth.signUp({
    email: opts.email,
    password: tempPassword,
    options: { data: { name: opts.name, type: opts.type } }
  });

  if (error) {
    const msg = error.message.includes('already registered')
      ? 'Este email já tem conta registada.'
      : error.message;
    showToast(msg, 'error');
    return { ok: false, error: msg };
  }

  if (!data.user) { showToast('Erro ao criar conta.', 'error'); return { ok: false, error: 'Erro ao criar conta.' }; }

  // upsert: handle race com trigger handle_new_user (onConflict: 'user_id')
  const { error: profileError } = await supabase.from('profiles').upsert({
    user_id: data.user.id,
    name: opts.name,
    email: opts.email,
    type: opts.type,
    role: opts.role,
    ...(opts.partnerId ? { partner_id: opts.partnerId } : {}),
  }, { onConflict: 'user_id' });

  if (profileError) {
    console.error('[convertPreCadastroToAccount] profile upsert:', profileError);
    showToast('Conta criada, mas erro no perfil. Verifique em Utilizadores.', 'error');
    return { ok: false, error: profileError.message };
  }

  logActivity('Criou conta a partir de pré-cadastro', opts.email);
  showToast(`Conta criada para ${opts.email}. Aguarda confirmação de email.`, 'success');
  return { ok: true };
};

export const linkUserToPartner = async (profileId: string, partnerId: string | null): Promise<boolean> => {
  if (!isAdmin()) { showToast('Sem permissão.', 'error'); return false; }
  const { error } = await supabase
    .from('profiles')
    .update({ partner_id: partnerId })
    .eq('id', profileId);
  if (error) { showToast('Erro ao vincular membro.', 'error'); return false; }
  logActivity(partnerId ? 'Vinculou utilizador a membro' : 'Removeu vínculo de membro', profileId);
  showToast(partnerId ? 'Membro vinculado.' : 'Vínculo removido.', 'success');
  return true;
};
