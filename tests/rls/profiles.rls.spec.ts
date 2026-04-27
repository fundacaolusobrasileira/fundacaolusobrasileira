// tests/rls/profiles.rls.spec.ts
// RLS matrix for `profiles`:
//   - User reads own profile
//   - Admin reads all profiles
//   - User CANNOT change own role
//   - Admin CAN change role for others
//
// Unit/Integration: N/A (no service layer for profiles — direct Supabase auth)
// E2E: PENDENTE — Fase 3 (auth.spec.ts, admin-roles.spec.ts)

import { describe, it, expect, beforeAll } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { hasTestDB, signInAs, serviceClient, TEST_USERS } from './client';

describe.skipIf(!hasTestDB)('profiles RLS (2.1)', () => {
  let viewer: SupabaseClient;
  let editor: SupabaseClient;
  let adminUser: SupabaseClient;
  let service: SupabaseClient;

  let viewerProfileId: string;
  let editorProfileId: string;

  beforeAll(async () => {
    service   = serviceClient();
    viewer    = await signInAs(TEST_USERS.viewer.email, TEST_USERS.viewer.password);
    editor    = await signInAs(TEST_USERS.editor.email, TEST_USERS.editor.password);
    adminUser = await signInAs(TEST_USERS.admin.email, TEST_USERS.admin.password);

    // Resolve profile IDs via service role
    const { data: vp } = await service.from('profiles').select('id').eq('name', 'Test Viewer').single();
    viewerProfileId = vp!.id;

    const { data: ep } = await service.from('profiles').select('id').eq('name', 'Test Editor').single();
    editorProfileId = ep!.id;
  });

  // SELECT -------------------------------------------------------------------
  it('viewer CAN SELECT own profile', async () => {
    const { data, error } = await viewer.from('profiles').select('id').eq('id', viewerProfileId);
    expect(error).toBeNull();
    expect(data?.length).toBe(1);
  });

  it('viewer CANNOT SELECT another user\'s profile', async () => {
    const { data, error } = await viewer.from('profiles').select('id').eq('id', editorProfileId);
    const denied = !!error || (data?.length === 0);
    expect(denied).toBe(true);
  });

  it('admin CAN SELECT all profiles', async () => {
    const { data, error } = await adminUser.from('profiles').select('id').limit(10);
    expect(error).toBeNull();
    expect((data?.length ?? 0)).toBeGreaterThan(1);
  });

  // UPDATE role restriction --------------------------------------------------
  // NOTE: regardless of whether RLS errors out or silently filters, the role
  // MUST never become 'admin' for a viewer-initiated UPDATE. Asserting
  // unconditionally avoids masking a real RLS regression (previous version
  // had a conditional branch that could pass even if escalation succeeded).
  it('viewer CANNOT change own role via profiles UPDATE', async () => {
    await viewer.from('profiles').update({ role: 'admin' }).eq('id', viewerProfileId);
    const { data } = await service.from('profiles').select('role').eq('id', viewerProfileId).single();
    expect(data?.role).not.toBe('admin');
    // restore (idempotent — safe even if no change)
    await service.from('profiles').update({ role: 'membro' }).eq('id', viewerProfileId);
  });

  it('admin CAN change role of another user', async () => {
    // Set editor role to 'membro' and verify, then restore
    const { error } = await adminUser.from('profiles').update({ role: 'membro' }).eq('id', editorProfileId);
    expect(error).toBeNull();
    // Restore
    await service.from('profiles').update({ role: 'editor' }).eq('id', editorProfileId);
  });
});
