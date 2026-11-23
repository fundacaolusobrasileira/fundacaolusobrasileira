// services/invites.service.ts
// Convite de membro por email: cria a conta via Edge Function `admin-create-user`,
// liga o perfil criado à ficha de membro (PARTNERS) e envia o email para a pessoa
// definir a sua password.
//
// NOTA DE INFRAESTRUTURA: a Edge Function `admin-create-user` existe no repo
// (supabase/functions/admin-create-user/index.ts) mas NÃO foi possível confirmar
// que está publicada no projeto Supabase. Por isso tratamos explicitamente:
//   - 404 / 'Failed to fetch' → "função não disponível no servidor"
//   - 401 / 403 → sem permissão
//   - 400 com 'already registered' → conta já existente
// Em nenhum caso o chamador fica sem resposta: devolvemos sempre { ok, error }.
import { supabase } from '../supabaseClient';
import { isAdmin, showToast, logActivity } from '../store/app.store';
import { linkUserToPartner } from './auth.service';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const PROFILE_LOOKUP_RETRIES = 4;
const PROFILE_LOOKUP_INTERVAL_MS = 300;

const FUNCTION_UNAVAILABLE =
  'A função de criação de contas não está disponível no servidor. Peça ao responsável técnico para publicar a Edge Function "admin-create-user".';

// Tipo PLANO de propósito: este projeto corre sem `strictNullChecks` e o
// estreitamento de uniões por discriminante booleano falha (ver nota em
// auth.service.ts). Os consumidores leem `ok`, `error` e `warning` diretamente.
export type InviteMemberResult = {
  ok: boolean;
  error?: string;
  warning?: string;
  profileId?: string;
};

const fail = (error: string, silent = false): InviteMemberResult => {
  if (!silent) showToast(error, 'error');
  return { ok: false, error };
};

// Extrai status + mensagem do servidor a partir do erro do `functions.invoke`.
// Em supabase-js v2 o FunctionsHttpError transporta a Response em `context`;
// FunctionsFetchError (rede/CORS/função ausente) não transporta status.
const describeInvokeError = async (error: unknown): Promise<{ status: number; serverMessage: string }> => {
  const context: any = (error as any)?.context;
  const status = typeof context?.status === 'number' ? context.status : 0;
  let serverMessage = '';

  if (context && typeof context.json === 'function') {
    const body = await context.json().catch(() => null);
    if (body && typeof body.error === 'string') serverMessage = body.error;
  }
  if (!serverMessage && typeof (error as any)?.message === 'string') {
    serverMessage = (error as any).message;
  }
  return { status, serverMessage };
};

const mapInvokeError = (status: number, serverMessage: string): string => {
  const lower = (serverMessage || '').toLowerCase();

  // Função ausente no servidor, ou falha de rede/CORS no preflight. Os dois casos
  // são indistinguíveis do lado do browser, por isso a mensagem cobre ambos.
  if (status === 404) return FUNCTION_UNAVAILABLE;
  if (status === 0) {
    if (lower.includes('failed to fetch') || lower.includes('failed to send') || lower.includes('networkerror')) {
      return FUNCTION_UNAVAILABLE;
    }
    return serverMessage || FUNCTION_UNAVAILABLE;
  }

  if (status === 401) return 'Sessão expirada ou inválida. Entre novamente e repita o convite.';
  if (status === 403) return 'Sem permissão para criar contas. Esta ação exige um utilizador administrador.';

  if (lower.includes('already registered') || lower.includes('already been registered') || lower.includes('already exists')) {
    return 'Este email já tem conta registada. Associe a conta existente à ficha em "Utilizadores".';
  }
  if (lower.includes('email rate limit exceeded')) {
    return 'Limite de envio de emails atingido no Supabase. Aguarde alguns minutos e tente novamente.';
  }
  if (status === 500 || status === 502 || status === 503) {
    return `A função de criação de contas falhou no servidor${serverMessage ? `: ${serverMessage}` : '.'}`;
  }
  return serverMessage || 'Erro ao criar a conta.';
};

const findProfileIdByUserId = async (userId: string): Promise<string | null> => {
  for (let attempt = 0; attempt < PROFILE_LOOKUP_RETRIES; attempt += 1) {
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      if (import.meta.env.DEV) console.error('[inviteMemberByEmail] profile lookup failed:', error);
      return null;
    }
    if (data?.id) return data.id as string;

    if (attempt < PROFILE_LOOKUP_RETRIES - 1) {
      await new Promise(resolve => setTimeout(resolve, PROFILE_LOOKUP_INTERVAL_MS));
    }
  }
  return null;
};

/**
 * Convida um membro por email.
 * 1. exige admin;
 * 2. cria a conta via Edge Function `admin-create-user`;
 * 3. liga o perfil criado à ficha de membro (`linkUserToPartner`);
 * 4. envia o email de definição de password.
 *
 * Devolve sempre um resultado — nunca deixa o chamador à espera.
 */
export const inviteMemberByEmail = async (input: {
  email: string;
  name: string;
  partnerId: string;
}): Promise<InviteMemberResult> => {
  // Guardado no início, como no resto do projeto.
  if (!isAdmin()) return fail('Sem permissão.');

  const email = (input.email || '').trim().toLowerCase();
  const name = (input.name || '').trim();
  const partnerId = (input.partnerId || '').trim();

  if (!EMAIL_REGEX.test(email)) return fail('Email inválido.');
  if (name.length < 2) return fail('Nome do membro inválido.');
  if (!UUID_REGEX.test(partnerId)) return fail('Ficha de membro inválida.');

  // 2. Criar a conta. O `invoke` envia o Authorization do utilizador actual.
  // `partnerId` NÃO vai no body de propósito: o vínculo é feito no passo 3 com
  // `linkUserToPartner`, que é o caminho já testado deste projeto.
  let invokeData: any = null;
  let invokeError: unknown = null;
  try {
    const response = await supabase.functions.invoke('admin-create-user', {
      body: { name, email, type: 'individual', role: 'membro' },
    });
    invokeData = response.data;
    invokeError = response.error;
  } catch (err) {
    // `invoke` não deve lançar, mas se lançar não deixamos o botão a girar.
    invokeError = err;
  }

  if (invokeError) {
    const { status, serverMessage } = await describeInvokeError(invokeError);
    if (import.meta.env.DEV) console.error('[inviteMemberByEmail] invoke failed:', status, serverMessage);
    return fail(mapInvokeError(status, serverMessage));
  }

  if (!invokeData?.ok) {
    return fail(mapInvokeError(400, typeof invokeData?.error === 'string' ? invokeData.error : ''));
  }

  const userId = typeof invokeData.userId === 'string' ? invokeData.userId : '';
  if (!userId) {
    return fail('A conta foi criada mas o servidor não devolveu o identificador do utilizador. Verifique em "Utilizadores".');
  }

  // 3. Ligar o perfil à ficha de membro.
  const profileId = await findProfileIdByUserId(userId);
  let warning: string | undefined;

  if (!profileId) {
    warning = 'A conta foi criada, mas o perfil ainda não estava disponível para ligar à ficha de membro. Conclua o vínculo em "Utilizadores".';
    showToast(warning, 'warning');
  } else {
    // `linkUserToPartner` já mostra o seu próprio toast em caso de erro.
    const linked = await linkUserToPartner(profileId, partnerId);
    if (!linked) {
      warning = 'A conta foi criada, mas falhou a ligação à ficha de membro. Conclua o vínculo em "Utilizadores".';
    }
  }

  // 4. Email para a pessoa definir a password.
  const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin + '/#/reset-password',
  });

  if (resetError) {
    const message = resetError.message?.toLowerCase().includes('rate limit')
      ? 'A conta foi criada, mas o Supabase atingiu o limite de envio de emails. Peça à pessoa para usar "Esqueci a password" mais tarde.'
      : `A conta foi criada, mas falhou o envio do email de definição de password: ${resetError.message}`;
    if (import.meta.env.DEV) console.error('[inviteMemberByEmail] resetPasswordForEmail failed:', resetError);
    logActivity('Convidou membro (email de password falhou)', email);
    showToast(message, 'warning');
    return { ok: true, profileId, warning: message };
  }

  logActivity('Convidou membro por email', email);
  showToast(
    warning
      ? `Convite enviado para ${email}, com avisos.`
      : `Convite enviado para ${email}. A pessoa recebeu o email para definir a password.`,
    warning ? 'warning' : 'success',
  );

  return { ok: true, profileId, warning };
};
