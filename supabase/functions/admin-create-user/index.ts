import { createClient } from 'npm:@supabase/supabase-js@2.87.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });

const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return json(405, { ok: false, error: 'Method not allowed.' });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const authHeader = req.headers.get('Authorization');

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
    return json(500, { ok: false, error: 'Supabase environment is not configured.' });
  }

  if (!authHeader) {
    return json(401, { ok: false, error: 'Missing authorization header.' });
  }

  const requesterClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: requesterData, error: requesterError } = await requesterClient.auth.getUser();
  if (requesterError || !requesterData.user) {
    return json(401, { ok: false, error: 'Not authenticated.' });
  }

  const { data: requesterProfile, error: profileError } = await adminClient
    .from('profiles')
    .select('role')
    .eq('user_id', requesterData.user.id)
    .maybeSingle();

  if (profileError) {
    return json(500, { ok: false, error: profileError.message });
  }

  if (requesterProfile?.role !== 'admin') {
    return json(403, { ok: false, error: 'Sem permissão.' });
  }

  const body = await req.json().catch(() => null) as {
    name?: string;
    email?: string;
    type?: string;
    role?: 'membro' | 'editor';
    partnerId?: string | null;
  } | null;

  if (!body?.name || !body.email || !body.type || !body.role) {
    return json(400, { ok: false, error: 'Missing required fields.' });
  }

  if (body.partnerId && !isUuid(body.partnerId)) {
    return json(400, { ok: false, error: 'Perfil vinculado inválido.' });
  }

  const tempPassword = crypto.randomUUID() + crypto.randomUUID();
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
    return json(400, { ok: false, error: createError?.message || 'Erro ao criar conta.' });
  }

  const { error: updateError } = await adminClient
    .from('profiles')
    .upsert({
      user_id: createData.user.id,
      name: body.name,
      email: body.email,
      type: body.type,
      role: body.role,
      ...(body.partnerId ? { partner_id: body.partnerId } : {}),
    }, { onConflict: 'user_id' });

  if (updateError) {
    return json(500, { ok: false, error: updateError.message });
  }

  return json(200, {
    ok: true,
    userId: createData.user.id,
  });
});
