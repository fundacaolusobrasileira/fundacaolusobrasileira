/**
 * Guarda contra correr os testes E2E contra o Supabase de PRODUCAO.
 *
 * PORQUE EXISTE: os helpers E2E criam um cliente service-role a partir de
 * `VITE_SUPABASE_URL` — a MESMA variavel usada pela aplicacao em producao.
 * Sem um `.env.e2e` a sobrepor, `npm run test:e2e` escreveria e apagaria
 * dados reais (utilizadores, eventos, parceiros, beneficios, pre-cadastros).
 *
 * Esta guarda aborta imediatamente nesse cenario.
 */

/** Project ref do Supabase de PRODUCAO. Nunca pode ser alvo de testes. */
export const PRODUCTION_PROJECT_REF = 'lhgzyrszzbxjjvnxfwzf';

const box = (lines: string[]) =>
  ['', '='.repeat(72), 'TESTES E2E BLOQUEADOS', '='.repeat(72), ...lines, '='.repeat(72), ''].join('\n');

/**
 * Valida que o alvo dos testes E2E nao e producao e que as credenciais
 * dedicadas existem. Lanca com mensagem clara se algo estiver errado.
 */
export const assertSafeE2ETarget = (): { supabaseUrl: string; serviceRoleKey: string } => {
  const supabaseUrl = process.env.VITE_SUPABASE_URL ?? '';
  const serviceRoleKey = process.env.E2E_SUPABASE_SERVICE_ROLE_KEY ?? '';

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      box([
        '',
        'Faltam credenciais dedicadas aos testes E2E.',
        '',
        `  VITE_SUPABASE_URL              : ${supabaseUrl ? 'definida' : 'EM FALTA'}`,
        `  E2E_SUPABASE_SERVICE_ROLE_KEY  : ${serviceRoleKey ? 'definida' : 'EM FALTA'}`,
        '',
        'Crie um ficheiro `.env.e2e` na raiz do projeto apontando para um',
        'projeto Supabase DEDICADO A TESTES:',
        '',
        '  VITE_SUPABASE_URL=https://<ref-do-projeto-de-testes>.supabase.co',
        '  VITE_SUPABASE_ANON_KEY=<anon key do projeto de testes>',
        '  E2E_SUPABASE_SERVICE_ROLE_KEY=<service role key do projeto de testes>',
        '',
        'NUNCA aponte estas variaveis para producao: os helpers E2E criam e',
        'apagam utilizadores e registos com a chave service-role.',
      ])
    );
  }

  if (supabaseUrl.includes(PRODUCTION_PROJECT_REF)) {
    throw new Error(
      box([
        '',
        `VITE_SUPABASE_URL aponta para o projeto de PRODUCAO (${PRODUCTION_PROJECT_REF}).`,
        '',
        'Correr os testes E2E assim APAGARIA DADOS REAIS: contas de membros,',
        'eventos, parceiros, beneficios e pre-cadastros.',
        '',
        'Defina `.env.e2e` com um projeto Supabase separado, criado',
        'exclusivamente para testes, e volte a correr.',
      ])
    );
  }

  return { supabaseUrl, serviceRoleKey };
};
