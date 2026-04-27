import type { Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY!;
const serviceRoleKey = process.env.E2E_SUPABASE_SERVICE_ROLE_KEY!;

const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const adminClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

export const installAdminCreateUserBypass = async (
  page: Page,
  opts?: { onCreatedUserId?: (userId: string) => void },
) => {
  await page.route('**/__e2e__/admin-create-user', async (route) => {
    try {
      const request = route.request();

      const authHeader = await request.headerValue('authorization');
      if (!authHeader?.startsWith('Bearer ')) {
        await route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ ok: false, error: 'Missing authorization header.' }) });
        return;
      }

      const { data: requesterData, error: requesterError } = await anonClient.auth.getUser(authHeader.slice('Bearer '.length));
      if (requesterError || !requesterData.user) {
        await route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ ok: false, error: 'Not authenticated.' }) });
        return;
      }

      const { data: requesterProfile, error: profileError } = await adminClient
        .from('profiles')
        .select('role')
        .eq('user_id', requesterData.user.id)
        .maybeSingle();

      if (profileError) {
        await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ ok: false, error: profileError.message }) });
        return;
      }

      if (requesterProfile?.role !== 'admin') {
        await route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ ok: false, error: 'Sem permissão.' }) });
        return;
      }

      const body = request.postDataJSON() as {
        name?: string;
        email?: string;
        type?: string;
        role?: 'membro' | 'editor' | 'admin';
        partnerId?: string | null;
      };

      if (!body.name || !body.email || !body.type || !body.role) {
        await route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ ok: false, error: 'Missing required fields.' }) });
        return;
      }

      if (body.partnerId && !isUuid(body.partnerId)) {
        await route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ ok: false, error: 'Perfil vinculado inválido.' }) });
        return;
      }

      const tempPassword = `${crypto.randomUUID()}${crypto.randomUUID()}`;
      const { data: createData, error: createError } = await adminClient.auth.admin.createUser({
        email: body.email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          name: body.name,
          type: body.type,
        },
      });

      if (createError || !createData.user) {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({ ok: false, error: createError?.message || 'Erro ao criar conta.' }),
        });
        return;
      }

      const { error: upsertError } = await adminClient.from('profiles').upsert({
        user_id: createData.user.id,
        name: body.name,
        email: body.email,
        type: body.type,
        role: body.role,
        ...(body.partnerId ? { partner_id: body.partnerId } : {}),
      }, { onConflict: 'user_id' });

      if (upsertError) {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ ok: false, error: upsertError.message }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, userId: createData.user.id }),
      });
      opts?.onCreatedUserId?.(createData.user.id);
    } catch (error: any) {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ ok: false, error: error?.message || 'Erro ao criar conta.' }),
      });
    }
  });
};
