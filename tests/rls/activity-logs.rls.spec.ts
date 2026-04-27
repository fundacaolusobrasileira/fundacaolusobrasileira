// tests/rls/activity-logs.rls.spec.ts
// RLS matrix for `activity_logs` (matches production):
//   - Anon: SELECT deny; INSERT deny
//   - Authenticated (viewer/editor/membro): SELECT ok; INSERT ok (no user_id required)
//   - Nobody: UPDATE / DELETE (no policy — PostgREST silently skips, 0 rows affected)
//
// Unit/Integration: covered in services/activity-log.service.test.ts
// E2E: PENDENTE — Fase 3 (admin-roles.spec.ts)

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { hasTestDB, anonClient, signInAs, serviceClient, TEST_USERS } from './client';

describe.skipIf(!hasTestDB)('activity_logs RLS (2.1)', () => {
  let anon: SupabaseClient;
  let viewer: SupabaseClient;
  let editor: SupabaseClient;
  let service: SupabaseClient;
  let seededLogId: string;

  beforeAll(async () => {
    anon    = anonClient();
    service = serviceClient();
    viewer  = await signInAs(TEST_USERS.viewer.email, TEST_USERS.viewer.password);
    editor  = await signInAs(TEST_USERS.editor.email, TEST_USERS.editor.password);

    const { data } = await service.from('activity_logs').insert([{
      action: '__rls_test__',
      target: '__rls_target__',
      user_name: 'RLS Test',
      user_id: null,
    }]).select('id').single();
    seededLogId = data!.id;
  });

  afterAll(async () => {
    await service.from('activity_logs').delete().eq('action', '__rls_test__');
    await service.from('activity_logs').delete().eq('action', '__rls_viewer_insert__');
    await service.from('activity_logs').delete().eq('action', '__rls_editor_insert__');
  });

  // SELECT -------------------------------------------------------------------
  it('anon CANNOT SELECT activity_logs', async () => {
    const { data, error } = await anon.from('activity_logs').select('id').limit(1);
    const denied = !!error || (data?.length === 0);
    expect(denied).toBe(true);
  });

  it('viewer CAN SELECT activity_logs (any authenticated user)', async () => {
    const { error } = await viewer.from('activity_logs').select('id').limit(1);
    expect(error).toBeNull();
  });

  it('editor CAN SELECT activity_logs', async () => {
    const { error } = await editor.from('activity_logs').select('id').limit(1);
    expect(error).toBeNull();
  });

  // INSERT -------------------------------------------------------------------
  it('anon CANNOT INSERT activity_logs', async () => {
    const { error } = await anon.from('activity_logs').insert([{
      action: '__anon_insert__', target: 'x', user_name: 'anon',
    }]);
    expect(error).not.toBeNull();
  });

  it('viewer CAN INSERT activity_logs (any authenticated user, no user_id required)', async () => {
    const { error } = await viewer.from('activity_logs').insert([{
      action: '__rls_viewer_insert__', target: 'test', user_name: 'Test Viewer',
    }]);
    expect(error).toBeNull();
  });

  it('editor CAN INSERT activity_logs', async () => {
    const { error } = await editor.from('activity_logs').insert([{
      action: '__rls_editor_insert__', target: 'test', user_name: 'Test Editor',
    }]);
    expect(error).toBeNull();
  });

  // UPDATE -------------------------------------------------------------------
  // No UPDATE policy — PostgREST silently affects 0 rows, verify data unchanged
  it('nobody (even editor) CANNOT UPDATE activity_logs', async () => {
    await editor.from('activity_logs').update({ action: '__mutated__' }).eq('id', seededLogId);
    const { data } = await service.from('activity_logs').select('action').eq('id', seededLogId).single();
    expect(data?.action).not.toBe('__mutated__');
  });

  // DELETE -------------------------------------------------------------------
  it('nobody (even editor) CANNOT DELETE activity_logs', async () => {
    await editor.from('activity_logs').delete().eq('id', seededLogId);
    const { data } = await service.from('activity_logs').select('id').eq('id', seededLogId).single();
    expect(data).not.toBeNull();
  });
});
