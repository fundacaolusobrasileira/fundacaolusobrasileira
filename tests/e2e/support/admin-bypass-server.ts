import { config as loadEnv } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import http from 'node:http';

loadEnv({ path: '.env.e2e' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.E2E_SUPABASE_SERVICE_ROLE_KEY;
const port = Number(process.env.E2E_AUTH_BYPASS_PORT || '8787');

if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
  throw new Error('E2E auth bypass server requires VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY and E2E_SUPABASE_SERVICE_ROLE_KEY.');
}

const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const adminClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const json = (res: http.ServerResponse, status: number, body: Record<string, unknown>) => {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  });
  res.end(JSON.stringify(body));
};

const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    json(res, 200, { ok: true });
    return;
  }

  if (req.method === 'GET' && req.url === '/') {
    json(res, 200, { ok: true, service: 'admin-bypass-server' });
    return;
  }

  if (req.method !== 'POST' || req.url !== '/admin-create-user') {
    json(res, 404, { ok: false, error: 'Not found.' });
    return;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    json(res, 401, { ok: false, error: 'Missing authorization header.' });
    return;
  }

  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}') as {
    name?: string;
    email?: string;
    type?: string;
    role?: 'membro' | 'editor' | 'admin';
    partnerId?: string | null;
  };

  if (!body.name || !body.email || !body.type || !body.role) {
    json(res, 400, { ok: false, error: 'Missing required fields.' });
    return;
  }

  if (body.partnerId && !isUuid(body.partnerId)) {
    json(res, 400, { ok: false, error: 'Perfil vinculado inválido.' });
    return;
  }

  const accessToken = authHeader.slice('Bearer '.length);
  const { data: requesterData, error: requesterError } = await anonClient.auth.getUser(accessToken);
  if (requesterError || !requesterData.user) {
    json(res, 401, { ok: false, error: 'Not authenticated.' });
    return;
  }

  const { data: requesterProfile, error: profileError } = await adminClient
    .from('profiles')
    .select('role')
    .eq('user_id', requesterData.user.id)
    .maybeSingle();

  if (profileError) {
    json(res, 500, { ok: false, error: profileError.message });
    return;
  }

  if (requesterProfile?.role !== 'admin') {
    json(res, 403, { ok: false, error: 'Sem permissão.' });
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
    json(res, 400, { ok: false, error: createError?.message || 'Erro ao criar conta.' });
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
    json(res, 500, { ok: false, error: upsertError.message });
    return;
  }

  json(res, 200, { ok: true, userId: createData.user.id });
});

server.listen(port, '127.0.0.1', () => {
  console.log(`E2E auth bypass server listening on http://127.0.0.1:${port}`);
});
