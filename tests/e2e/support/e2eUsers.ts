import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const serviceRoleKey = process.env.E2E_SUPABASE_SERVICE_ROLE_KEY!;

const adminClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

export type TempE2EUser = {
  userId: string;
  email: string;
  password: string;
  role: 'membro' | 'editor' | 'admin';
};

export const createTempE2EUser = async (opts: {
  name: string;
  role: 'membro' | 'editor' | 'admin';
  type?: string;
}) => {
  const email = `e2e-${opts.role}-${Date.now()}@example.com`;
  const password = `E2E-${Date.now()}-Aa1!`;
  const type = opts.type || 'individual';

  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      name: opts.name,
      type,
    },
  });

  if (error || !data.user) {
    throw new Error(error?.message || 'Falha ao criar utilizador E2E.');
  }

  const { error: profileError } = await adminClient.from('profiles').upsert({
    user_id: data.user.id,
    name: opts.name,
    email,
    type,
    role: opts.role,
  }, { onConflict: 'user_id' });

  if (profileError) {
    await adminClient.auth.admin.deleteUser(data.user.id).catch(() => {});
    throw new Error(profileError.message);
  }

  return {
    userId: data.user.id,
    email,
    password,
    role: opts.role,
  } satisfies TempE2EUser;
};

export const deleteTempE2EUser = async (userId: string) => {
  await adminClient.auth.admin.deleteUser(userId);
};
