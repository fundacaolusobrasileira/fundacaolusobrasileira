import { supabase } from '../supabaseClient';
import { setAuthSession, AUTH_SESSION, isAdmin, notifyState, showToast, logActivity } from '../store/app.store';
import { LoginSchema, CadastroSchema } from '../validation/schemas';

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
    // BUG 5 FIX: check profile INSERT error — if it fails, user has no role and resolves as viewer
    const { error: profileError } = await supabase.from('profiles').insert({
      user_id: data.user.id,
      name,
      email,
      type,
      role: 'membro'
    });
    if (profileError) {
      console.error('signUp profile insert failed:', profileError);
      return { ok: false, error: 'Conta criada mas erro ao configurar perfil. Contacte o suporte.' };
    }
    logActivity('Novo cadastro', email);
    showToast('Conta criada com sucesso! Verifique seu email para confirmar.', 'success');
    return { ok: true };
  }

  return { ok: false, error: 'Erro ao criar conta.' };
};

// Admin-only user management
export const fetchAllProfiles = async () => {
  if (!isAdmin()) { showToast('Sem permissão.', 'error'); return []; }
  const { data, error } = await supabase
    .from('profiles')
    .select('id, user_id, name, email, role, created_at')
    .order('created_at', { ascending: false });
  if (error) return [];
  return data as { id: string; user_id: string; name: string; email: string; role: string; created_at: string }[];
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
