// tests/rls/triggers.spec.ts
// Phase 2.3 — DB trigger verification against real Supabase:
//   - handle_updated_at: updates `updated_at` timestamp on UPDATE
//   - is_editor() / is_admin(): DB functions return correct value per user JWT
//
// Unit/Integration: N/A — trigger behavior can only be tested against real DB
// E2E: N/A — internal DB behavior, not surfaced in UI

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { hasTestDB, signInAs, serviceClient, TEST_USERS } from './client';

describe.skipIf(!hasTestDB)('DB triggers (2.3)', () => {
  let service: SupabaseClient;
  let editor: SupabaseClient;
  let viewer: SupabaseClient;
  let testEventId: string;

  beforeAll(async () => {
    service = serviceClient();
    editor  = await signInAs(TEST_USERS.editor.email, TEST_USERS.editor.password);
    viewer  = await signInAs(TEST_USERS.viewer.email, TEST_USERS.viewer.password);

    const { data } = await service.from('events').insert([{
      title: '__trigger_test__', category: 'Outros', status: 'draft', gallery: '[]',
    }]).select('id, updated_at').single();
    testEventId = data!.id;
  });

  afterAll(async () => {
    await service.from('events').delete().eq('id', testEventId);
  });

  // handle_updated_at --------------------------------------------------------
  it('handle_updated_at updates timestamp after UPDATE', async () => {
    // Force the original updated_at to a known past timestamp via service role,
    // so the trigger-driven NOW() on the second UPDATE is guaranteed to differ.
    // This eliminates the previous 1.1s wall-clock wait and the sub-second
    // resolution flakiness on slow CI.
    await service.from('events')
      .update({ updated_at: '2000-01-01T00:00:00Z' } as any)
      .eq('id', testEventId);

    const { data: before } = await service
      .from('events').select('updated_at').eq('id', testEventId).single();

    await service.from('events').update({ title: '__trigger_updated__' }).eq('id', testEventId);

    const { data: after } = await service
      .from('events').select('updated_at').eq('id', testEventId).single();

    expect(new Date(after!.updated_at).getTime()).toBeGreaterThan(
      new Date(before!.updated_at).getTime(),
    );
  });

  // is_editor() / is_admin() -------------------------------------------------
  it('is_editor() returns true for editor role user', async () => {
    const { data, error } = await editor.rpc('is_editor');
    expect(error).toBeNull();
    expect(data).toBe(true);
  });

  it('is_editor() returns false for viewer role user', async () => {
    const { data, error } = await viewer.rpc('is_editor');
    expect(error).toBeNull();
    expect(data).toBe(false);
  });

  it('is_admin() returns true for admin role user', async () => {
    const adminUser = await signInAs(TEST_USERS.admin.email, TEST_USERS.admin.password);
    const { data, error } = await adminUser.rpc('is_admin');
    expect(error).toBeNull();
    expect(data).toBe(true);
  });

  it('is_admin() returns false for editor role user', async () => {
    const { data, error } = await editor.rpc('is_admin');
    expect(error).toBeNull();
    expect(data).toBe(false);
  });
});
