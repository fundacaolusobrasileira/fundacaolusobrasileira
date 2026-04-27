#!/usr/bin/env tsx
// Seed script — run ONCE before Phase 2 RLS tests:
//   npx tsx tests/rls/seed.ts
//
// Requires .env.test with SUPABASE_TEST_URL + SUPABASE_TEST_SERVICE_ROLE_KEY.
// Creates 4 auth users (viewer/membro/editor/admin) and sets their profiles.role.
// Safe to run multiple times — skips users that already exist.

import { config as loadDotenv } from 'dotenv';
loadDotenv({ path: '.env.test' });

import { createClient } from '@supabase/supabase-js';

const URL = process.env.SUPABASE_TEST_URL!;
const SERVICE_KEY = process.env.SUPABASE_TEST_SERVICE_ROLE_KEY!;

if (!URL || !SERVICE_KEY) {
  console.error('[seed] Missing SUPABASE_TEST_URL or SUPABASE_TEST_SERVICE_ROLE_KEY in .env.test');
  process.exit(1);
}

const admin = createClient(URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// 'viewer' maps to 'membro' in profiles — it's just an authenticated user with no special role.
const SEED_USERS = [
  { email: 'viewer@test.flb',  password: 'FLBTest2026!', profileRole: 'membro',  name: 'Test Viewer'  },
  { email: 'membro@test.flb',  password: 'FLBTest2026!', profileRole: 'membro',  name: 'Test Membro'  },
  { email: 'editor@test.flb',  password: 'FLBTest2026!', profileRole: 'editor',  name: 'Test Editor'  },
  { email: 'admin@test.flb',   password: 'FLBTest2026!', profileRole: 'admin',   name: 'Test Admin'   },
];

async function seed() {
  for (const user of SEED_USERS) {
    // Create auth user (email already confirmed via admin API)
    const { data, error } = await admin.auth.admin.createUser({
      email: user.email,
      password: user.password,
      email_confirm: true,
    });

    let userId: string;

    if (error) {
      if (error.message.toLowerCase().includes('already registered') || error.message.includes('already been registered')) {
        // User exists — fetch their ID to upsert profile
        const { data: existing } = await admin.auth.admin.listUsers();
        const found = existing?.users.find(u => u.email === user.email);
        if (!found) { console.log(`[seed] SKIP  ${user.email} — exists but ID not found`); continue; }
        userId = found.id;
        console.log(`[seed] EXISTS ${user.email} (id: ${userId})`);
      } else {
        console.error(`[seed] ERROR creating ${user.email}: ${error.message}`);
        process.exit(1);
      }
    } else {
      userId = data.user!.id;
      console.log(`[seed] CREATE ${user.email} (id: ${userId})`);
    }

    // Set role in profiles table (upsert — profiles table uses user_id as FK)
    const { error: profileError } = await admin
      .from('profiles')
      .upsert(
        {
          user_id: userId,
          name: user.name,
          email: user.email,
          type: 'individual',
          role: user.profileRole,
        },
        { onConflict: 'user_id' },
      );

    if (profileError) {
      console.error(`[seed] ERROR setting profile for ${user.email}: ${profileError.message}`);
      process.exit(1);
    }

    console.log(`[seed] ROLE  ${user.email} → ${user.profileRole}`);
  }

  console.log('[seed] Done.');
}

seed().catch((e) => { console.error(e); process.exit(1); });
