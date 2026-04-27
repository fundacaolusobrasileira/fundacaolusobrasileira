import { supabase } from '../supabaseClient';
import { setAuthSession, AUTH_SESSION, isAdmin, notifyState, showToast, logActivity } from '../store/app.store';
import { LoginSchema, CadastroSchema } from '../validation/schemas';
import type { UserProfile } from '../types';

const ROLE_TIMEOUT_MS = 3000;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const AUTH_BYPASS_URL = import.meta.env.VITE_AUTH_BYPASS_URL || 'http://127.0.0.1:8787';

// M-1: bypass status is computed at call-time so a misconfigured prod build
// is detected and refused here instead of silently calling 127.0.0.1.
type BypassDecision =
  | { use: true }
  | { use: false }
  | { use: false; refused: true; reason: string };

const evaluateAuthBypass = (): BypassDecision => {
  const enabled = import.meta.env.VITE_AUTH_BYPASS_CREATE_USER === 'true';
  if (!enabled) return { use: false };
  const bypassUrl = AUTH_BYPASS_URL.trim();
  const isLocalBypass =
    bypassUrl.startsWith('/__e2e__')
    || bypassUrl.startsWith('http://127.0.0.1')
    || bypassUrl.startsWith('http://localhost');
  if (import.meta.env.PROD && !isLocalBypass) {
    return {
      use: false,
      refused: true,
      reason: 'Auth bypass está desativado em builds de produção (VITE_AUTH_BYPASS_CREATE_USER ignorado).',
    };
  }
  return { use: true };
};

type ProfilesResult = { ok: true; data: UserProfile[] } | { ok: false; data: UserProfile[]; error: string };
type AdminCapabilities = { partnerLinking: boolean };
type ProfilesSuccessResult = { ok: true; data: UserProfile[]; capabilities: AdminCapabilities };
type ProfilesErrorResult = { ok: false; data: UserProfile[]; error: string; capabilities: AdminCapabilities };
type ProfilesResultWithCapabilities = ProfilesSuccessResult | ProfilesErrorResult;

const DEFAULT_ADMIN_CAPABILITIES: AdminCapabilities = { partnerLinking: false };
const PROFILE_READY_RETRIES = 6;
const PROFILE_READY_INTERVAL_MS = 250;

const isMissingProfilesColumnError = (errorMessage: string, column: string) =>
  errorMessage.includes(`column profiles.${column} does not exist`)
  || errorMessage.includes(`Could not find the '${column}' column of 'profiles'`);

const mapAuthCreationError = (message: string) => {
  if (message.includes('already registered')) return 'Este email já tem conta registada.';
  if (message.toLowerCase().includes('email rate limit exceeded')) {
    return 'Limite de envio de emails atingido no Supabase. Aguarde alguns minutos e tente novamente.';
  }
  return message;
};

const finalizeExistingProfileByEmail = async (opts: {
  name: string;
  email: string;
  type: string;
  role: 'membro' | 'editor' | 'admin';
  partnerId?: string | null;
}): Promise<{ ok: boolean; error?: string; pending?: true }> => {
  for (let attempt = 0; attempt < PROFILE_READY_RETRIES; attempt += 1) {
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', opts.email)
      .maybeSingle();

    if (error) {
      console.error('[finalizeExistingProfileByEmail] profile lookup failed:', error);
      return { ok: false, error: error.message };
    }

    if (data?.id) {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          name: opts.name,
          email: opts.email,
          type: opts.type,
          role: opts.role,
          ...(opts.partnerId ? { partner_id: opts.partnerId } : { partner_id: null }),
        })
        .eq('id', data.id);

      if (updateError) {
        console.error('[finalizeExistingProfileByEmail] profile update failed:', updateError);
        return { ok: false, error: updateError.message };
      }

      return { ok: true };
    }

    if (attempt < PROFILE_READY_RETRIES - 1) {
      await new Promise((resolve) => setTimeout(resolve, PROFILE_READY_INTERVAL_MS));
    }
  }

  return { ok: false, pending: true, error: 'Perfil ainda não disponível.' };
};

const createUserViaAdminFunction = async (opts: {
  name: string;
  email: string;
  type: string;
  role: 'membro' | 'editor' | 'admin';
  partnerId?: string | null;
}): Promise<{ ok: boolean; error?: string }> => {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) {
    const msg = 'Sessão administrativa inválida para criar conta em modo de teste.';
    showToast(msg, 'error');
    return { ok: false, error: msg };
  }

  const response = await fetch(`${AUTH_BYPASS_URL}/admin-create-user`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(opts),
  }).catch((error) => ({ ok: false, status: 0, json: async () => ({ ok: false, error: error.message }) } as Response));

  const payload = await response.json().catch(() => ({ ok: false, error: 'Erro ao criar conta.' }));
  if (!response.ok || !payload?.ok) {
    const msg = mapAuthCreationError(payload?.error || 'Erro ao criar conta.');
    showToast(msg, 'error');
    return { ok: false, error: msg };
  }

  logActivity('Criou conta a partir de pré-cadastro', opts.email);
  showToast(`Conta criada para ${opts.email}. Pronta para acesso imediato em ambiente de teste.`, 'success');
  return { ok: true };
};

const waitForProfileByUserId = async (userId: string): Promise<boolean> => {
  for (let attempt = 0; attempt < PROFILE_READY_RETRIES; attempt += 1) {
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (data?.id) return true;
    if (error) {
      console.error('[waitForProfileByUserId] profile lookup failed:', error);
      return false;
    }
    if (attempt < PROFILE_READY_RETRIES - 1) {
      await new Promise((resolve) => setTimeout(resolve, PROFILE_READY_INTERVAL_MS));
    }
  }
  return false;
};

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
export const fetchAllProfiles = async (): Promise<ProfilesResultWithCapabilities> => {
  if (!isAdmin()) {
    const error = 'Sem permissão.';
    showToast(error, 'error');
    return { ok: false, data: [], error, capabilities: DEFAULT_ADMIN_CAPABILITIES };
  }

  const primaryProfilesQuery = await supabase
    .from('profiles')
    .select('id, user_id, name, email, role, type, phone, created_at')
    .order('created_at', { ascending: false });

  let data = primaryProfilesQuery.data;
  let error = primaryProfilesQuery.error;

  if (error && isMissingProfilesColumnError(error.message, 'phone')) {
    const fallbackProfilesQuery = await supabase
      .from('profiles')
      .select('id, user_id, name, email, role, type, created_at')
      .order('created_at', { ascending: false });
    data = fallbackProfilesQuery.data;
    error = fallbackProfilesQuery.error;
  }

  if (error) {
    showToast('Erro ao carregar utilizadores.', 'error');
    return { ok: false, data: [], error: error.message, capabilities: DEFAULT_ADMIN_CAPABILITIES };
  }

  const profiles = (data || []) as UserProfile[];
  const { data: profileLinks, error: profileLinksError } = await supabase
    .from('profiles')
    .select('id, partner_id');

  if (profileLinksError) {
    if (isMissingProfilesColumnError(profileLinksError.message, 'partner_id')) {
      return {
        ok: true,
        data: profiles.map((profile) => ({ ...profile, partner: null })),
        capabilities: DEFAULT_ADMIN_CAPABILITIES,
      };
    }
    showToast('Erro ao carregar utilizadores.', 'error');
    return { ok: false, data: [], error: profileLinksError.message, capabilities: DEFAULT_ADMIN_CAPABILITIES };
  }

  const partnerIds = Array.from(new Set(
    ((profileLinks || []) as Array<{ id: string; partner_id: string | null }>).map((profile) => profile.partner_id).filter(Boolean)
  )) as string[];

  if (partnerIds.length === 0) {
    return {
      ok: true,
      data: profiles.map((profile) => ({
        ...profile,
        partner_id: null,
        partner: null,
      })),
      capabilities: { partnerLinking: true },
    };
  }

  const { data: partnerData, error: partnerError } = await supabase
    .from('partners')
    .select('id, name');

  if (partnerError) {
    showToast('Erro ao carregar utilizadores.', 'error');
    return { ok: false, data: [], error: partnerError.message, capabilities: DEFAULT_ADMIN_CAPABILITIES };
  }

  const partnerMap = new Map(
    ((partnerData || []) as Array<{ id: string; name: string }>).map((partner) => [
      partner.id,
      { id: partner.id, name: partner.name },
    ])
  );
  const profilePartnerMap = new Map(
    ((profileLinks || []) as Array<{ id: string; partner_id: string | null }>).map((profile) => [
      profile.id,
      profile.partner_id,
    ])
  );

  const hydratedProfiles = profiles.map((profile) => ({
    ...profile,
    partner_id: profilePartnerMap.get(profile.id) ?? null,
    partner: profilePartnerMap.get(profile.id) ? (partnerMap.get(profilePartnerMap.get(profile.id) as string) ?? null) : null,
  }));

  return { ok: true, data: hydratedProfiles, capabilities: { partnerLinking: true } };
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
  role: 'membro' | 'editor' | 'admin';
  partnerId?: string | null;
}): Promise<{ ok: boolean; error?: string }> => {
  if (!isAdmin()) { showToast('Sem permissão.', 'error'); return { ok: false, error: 'Sem permissão.' }; }
  if (opts.partnerId && !UUID_REGEX.test(opts.partnerId)) {
    const error = 'Perfil vinculado inválido.';
    showToast(error, 'error');
    return { ok: false, error };
  }

  const bypass = evaluateAuthBypass();
  if (bypass.use) {
    return createUserViaAdminFunction(opts);
  }
  if ('refused' in bypass && bypass.refused) {
    console.error('[convertPreCadastroToAccount] auth bypass refused:', bypass.reason);
    showToast(bypass.reason, 'error');
    return { ok: false, error: bypass.reason };
  }

  // Password aleatória — utilizador define a sua via "Esqueci a password"
  const tempPassword = crypto.randomUUID() + crypto.randomUUID();

  const { data, error } = await supabase.auth.signUp({
    email: opts.email,
    password: tempPassword,
    options: { data: { name: opts.name, type: opts.type } }
  });

  if (error) {
    if (error.message.includes('already registered')) {
      const finalized = await finalizeExistingProfileByEmail(opts);
      if (finalized.ok) {
        logActivity('Concluiu configuração de conta existente', opts.email);
        showToast(`Conta existente configurada para ${opts.email}.`, 'success');
        return { ok: true };
      }
      const msg = finalized.pending
        ? 'A conta já existe, mas o perfil ainda não ficou disponível. Tente novamente em alguns segundos.'
        : mapAuthCreationError(finalized.error || error.message);
      showToast(msg, 'error');
      return { ok: false, error: msg };
    }
    const msg = mapAuthCreationError(error.message);
    showToast(msg, 'error');
    return { ok: false, error: msg };
  }

  if (!data.user) { showToast('Erro ao criar conta.', 'error'); return { ok: false, error: 'Erro ao criar conta.' }; }

  // BUG 4 FIX: Supabase v2 quirk — duplicate signup with email confirmation pending
  // returns { user: { id: null }, session: null } and no error. Detect and refuse
  // before passing null to .eq('user_id', null) which produces a malformed query
  // and locks the email out of recovery flows.
  if (!data.user.id) {
    const message = 'Este email já está registado mas não confirmado. Peça ao utilizador para confirmar via link no email recebido.';
    console.error('[convertPreCadastroToAccount] signUp returned user with null id (likely duplicate unconfirmed email):', opts.email);
    showToast(message, 'error');
    return { ok: false, error: message };
  }

  const profileReady = await waitForProfileByUserId(data.user.id);
  if (!profileReady) {
    const message = 'Conta criada, mas o perfil ainda não ficou disponível. Tente novamente em alguns segundos para concluir a configuração.';
    console.error('[convertPreCadastroToAccount] profile not ready for user:', data.user.id);
    showToast(message, 'error');
    return { ok: false, error: message };
  }

  const { error: profileError } = await supabase.from('profiles').update({
    name: opts.name,
    email: opts.email,
    type: opts.type,
    role: opts.role,
    ...(opts.partnerId ? { partner_id: opts.partnerId } : {}),
  }).eq('user_id', data.user.id);

  if (profileError) {
    console.error('[convertPreCadastroToAccount] profile update:', profileError);
    showToast('Conta criada, mas erro no perfil. Verifique em Utilizadores.', 'error');
    return { ok: false, error: profileError.message };
  }

  logActivity('Criou conta a partir de pré-cadastro', opts.email);
  showToast(`Conta criada para ${opts.email}. Aguarda confirmação de email.`, 'success');
  return { ok: true };
};

export const linkUserToPartner = async (profileId: string, partnerId: string | null): Promise<boolean> => {
  if (!isAdmin()) { showToast('Sem permissão.', 'error'); return false; }
  if (partnerId && !UUID_REGEX.test(partnerId)) {
    showToast('Perfil vinculado inválido.', 'error');
    return false;
  }
  const { error } = await supabase
    .from('profiles')
    .update({ partner_id: partnerId })
    .eq('id', profileId);
  if (error) { showToast('Erro ao vincular membro.', 'error'); return false; }
  logActivity(partnerId ? 'Vinculou utilizador a membro' : 'Removeu vínculo de membro', profileId);
  showToast(partnerId ? 'Membro vinculado.' : 'Vínculo removido.', 'success');
  return true;
};
