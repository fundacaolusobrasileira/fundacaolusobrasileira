import { createClient, SupabaseClient } from '@supabase/supabase-js';

const TEST_URL = process.env.SUPABASE_TEST_URL ?? '';
const TEST_ANON_KEY = process.env.SUPABASE_TEST_ANON_KEY ?? '';
const TEST_SERVICE_KEY = process.env.SUPABASE_TEST_SERVICE_ROLE_KEY ?? '';

export const hasTestDB = !!TEST_URL && !!TEST_ANON_KEY && !!TEST_SERVICE_KEY;

// Unauthenticated client (anon role — same as a public visitor)
export const anonClient = (): SupabaseClient =>
  createClient(TEST_URL, TEST_ANON_KEY);

// Service-role client — bypasses RLS, used for seed/teardown only
export const serviceClient = (): SupabaseClient =>
  createClient(TEST_URL, TEST_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

// Sign in and return an authenticated client for that user
export const signInAs = async (email: string, password: string): Promise<SupabaseClient> => {
  const client = anonClient();
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.session) {
    throw new Error(`signInAs(${email}) failed: ${error?.message ?? 'no session'}`);
  }
  return createClient(TEST_URL, TEST_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${data.session.access_token}` } },
  });
};

// Credentials for seed users (created by tests/rls/seed.ts)
export const TEST_USERS = {
  viewer:  { email: 'viewer@test.flb',  password: 'FLBTest2026!' },
  membro:  { email: 'membro@test.flb',  password: 'FLBTest2026!' },
  editor:  { email: 'editor@test.flb',  password: 'FLBTest2026!' },
  admin:   { email: 'admin@test.flb',   password: 'FLBTest2026!' },
} as const;
