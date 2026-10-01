/**
 * Preflight do `npm run test:rls`.
 *
 * PORQUÊ: sem `.env.test`, os 73 testes de RLS eram TODOS pulados e o comando
 * saía com código 0. Isso é pior do que falhar: aparenta proteção e não é —
 * uma policy podia ser removida sem que nada acusasse.
 *
 * A partir daqui, faltando credenciais, o comando falha ruidosamente.
 */
import { config as loadDotenv } from 'dotenv';

loadDotenv({ path: '.env.test' });

const REQUIRED = [
  'SUPABASE_TEST_URL',
  'SUPABASE_TEST_ANON_KEY',
  'SUPABASE_TEST_SERVICE_ROLE_KEY',
] as const;

// Projeto de PRODUÇÃO — nunca pode ser o alvo dos testes de RLS, que apagam e
// recriam dados com a chave service-role.
const PRODUCTION_PROJECT_REF = 'lhgzyrszzbxjjvnxfwzf';

const missing = REQUIRED.filter((name) => !process.env[name]);

const fail = (message: string): never => {
  console.error('\n' + '='.repeat(72));
  console.error('TESTES DE RLS NAO PODEM CORRER');
  console.error('='.repeat(72));
  console.error(message);
  console.error('='.repeat(72) + '\n');
  process.exit(1);
};

if (missing.length > 0) {
  fail(
    [
      '',
      `Variaveis em falta: ${missing.join(', ')}`,
      '',
      'Os testes de RLS precisam de um projeto Supabase DEDICADO A TESTES.',
      'NUNCA aponte estas variaveis para o projeto de PRODUCAO: a suite usa a',
      'chave service-role e apaga/recria linhas (profiles, events, partners,',
      'benefits, precadastros, ...).',
      '',
      'Crie um ficheiro `.env.test` na raiz do projeto com:',
      '',
      '  SUPABASE_TEST_URL=https://<ref-do-projeto-de-testes>.supabase.co',
      '  SUPABASE_TEST_ANON_KEY=<anon key do projeto de testes>',
      '  SUPABASE_TEST_SERVICE_ROLE_KEY=<service role key do projeto de testes>',
      '',
      'Depois: `npm run seed:rls` e so entao `npm run test:rls`.',
      '',
      'ATENCAO: ate hoje este comando saia com codigo 0 e 73 testes pulados.',
      'Isso nao era protecao nenhuma — era um falso positivo silencioso.',
    ].join('\n')
  );
}

const testUrl = process.env.SUPABASE_TEST_URL ?? '';

if (testUrl.includes(PRODUCTION_PROJECT_REF)) {
  fail(
    [
      '',
      `SUPABASE_TEST_URL aponta para o projeto de PRODUCAO (${PRODUCTION_PROJECT_REF}).`,
      '',
      'A suite de RLS corre com a chave service-role e apaga dados reais.',
      'Use um projeto Supabase separado, criado exclusivamente para testes.',
    ].join('\n')
  );
}

console.log('[rls] Credenciais de teste presentes. Alvo:', testUrl);
