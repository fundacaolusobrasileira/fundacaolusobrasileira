import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const serviceRoleKey = process.env.E2E_SUPABASE_SERVICE_ROLE_KEY!;

const adminClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

export const E2E_MARKER = 'E2E-AUTO';

export const e2eLabel = (label: string) => `${E2E_MARKER} ${label} ${Date.now()}`;

export const findEventIdByTitle = async (title: string) => {
  const { data, error } = await adminClient
    .from('events')
    .select('id')
    .eq('title', title)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data?.id ?? '';
};

export const findPartnerIdByName = async (name: string) => {
  const { data, error } = await adminClient
    .from('partners')
    .select('id')
    .eq('name', name)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data?.id ?? '';
};

export const createE2ECleanupBag = () => {
  const authUserIds = new Set<string>();
  const eventIds = new Set<string>();
  const partnerIds = new Set<string>();
  const benefitIds = new Set<string>();
  const precadastroIds = new Set<string>();
  const precadastroEmails = new Set<string>();

  return {
    trackAuthUserId: (id: string) => authUserIds.add(id),
    trackEventId: (id: string) => eventIds.add(id),
    trackPartnerId: (id: string) => partnerIds.add(id),
    trackBenefitId: (id: string) => benefitIds.add(id),
    trackPreCadastroId: (id: string) => precadastroIds.add(id),
    trackPreCadastroEmail: (email: string) => precadastroEmails.add(email),
    async cleanup() {
      for (const id of benefitIds) {
        await adminClient.from('benefits').delete().eq('id', id);
      }

      for (const id of eventIds) {
        await adminClient.from('events').delete().eq('id', id);
      }

      for (const id of partnerIds) {
        await adminClient.from('partners').delete().eq('id', id);
      }

      for (const id of precadastroIds) {
        await adminClient.from('precadastros').delete().eq('id', id);
      }

      for (const email of precadastroEmails) {
        await adminClient.from('precadastros').delete().eq('email', email);
      }

      for (const id of authUserIds) {
        await adminClient.auth.admin.deleteUser(id);
      }
    },
  };
};
