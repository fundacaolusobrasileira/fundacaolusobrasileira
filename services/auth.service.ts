import { supabase } from '../supabaseClient';
import { setAuthSession, setAuthLoading, AUTH_SESSION, notifyState, showToast, logActivity } from '../store/app.store';
import { syncMembers } from './members.service';
import { syncEvents } from './events.service';

const resolveUserRole = async (userId: string): Promise<'editor' | 'viewer'> => {
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', userId)
      .single();
    return (profile?.role === 'editor' || profile?.role === 'admin') ? 'editor' : 'viewer';
  } catch (err) {
    console.error('resolveUserRole failed, defaulting to viewer:', err);
    return 'viewer';
  }
};

export { resolveUserRole };

export const loginAsEditor = async (email: string, password: string): Promise<{ ok: boolean; error?: string }> => {
  if (!email || !password) {
    return { ok: false, error: 'Email e senha são obrigatórios.' };
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
    const userRole = await resolveUserRole(data.user.id);

    setAuthSession({
      isLoggedIn: true,
      role: userRole,
      displayName: data.user.email || 'Editor',
      userId: data.user.id,
      lastLoginAt: new Date().toISOString()
    });
    setAuthLoading(false);
    logActivity('Login', data.user.email || email);
    notifyState();
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
  if (!email || !password || !name) {
    return { ok: false, error: 'Todos os campos são obrigatórios.' };
  }
  if (password.length < 6) {
    return { ok: false, error: 'A senha deve ter pelo menos 6 caracteres.' };
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
    await supabase.from('profiles').insert({
      user_id: data.user.id,
      name,
      email,
      type,
      role: 'membro'
    });
    logActivity('Novo cadastro', email);
    showToast('Conta criada com sucesso! Verifique seu email para confirmar.', 'success');
    return { ok: true };
  }

  return { ok: false, error: 'Erro ao criar conta.' };
};
