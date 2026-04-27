// tests/rls/partners.rls.spec.ts
// RLS matrix for `partners`:
//   - Anon/Viewer: SELECT ok (public read); INSERT/UPDATE/DELETE deny
//   - Editor: full access
//
// Unit/Integration: N/A — no separate partners service test file (covered via members.service.test.ts)
// E2E: PENDENTE — Fase 3

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { hasTestDB, anonClient, signInAs, serviceClient, TEST_USERS } from './client';

const TEST_PARTNER = {
  name: '__rls_test_partner__',
  type: 'empresa',
  category: 'Governança',
};

describe.skipIf(!hasTestDB)('partners RLS (2.1)', () => {
  let anon: SupabaseClient;
  let viewer: SupabaseClient;
  let editor: SupabaseClient;
  let service: SupabaseClient;
  let seededId: string;

  beforeAll(async () => {
    anon    = anonClient();
    service = serviceClient();
    viewer  = await signInAs(TEST_USERS.viewer.email, TEST_USERS.viewer.password);
    editor  = await signInAs(TEST_USERS.editor.email, TEST_USERS.editor.password);

    const { data } = await service.from('partners').insert([TEST_PARTNER]).select('id').single();
    seededId = data!.id;
  });

  afterAll(async () => {
    await service.from('partners').delete().eq('id', seededId);
    await service.from('partners').delete().eq('name', '__rls_editor_partner__');
  });

  it('anon CAN SELECT partners (public read)', async () => {
    const { error } = await anon.from('partners').select('id').limit(1);
    expect(error).toBeNull();
  });

  it('viewer CAN SELECT partners', async () => {
    const { error } = await viewer.from('partners').select('id').limit(1);
    expect(error).toBeNull();
  });

  it('anon CANNOT INSERT partners', async () => {
    const { error } = await anon.from('partners').insert([{ ...TEST_PARTNER, name: '__anon_partner__' }]);
    expect(error).not.toBeNull();
  });

  it('viewer CANNOT INSERT partners', async () => {
    const { error } = await viewer.from('partners').insert([{ ...TEST_PARTNER, name: '__viewer_partner__' }]);
    expect(error).not.toBeNull();
  });

  it('editor CAN INSERT partners', async () => {
    const { error } = await editor.from('partners').insert([{ ...TEST_PARTNER, name: '__rls_editor_partner__' }]);
    expect(error).toBeNull();
  });

  // USING (public.is_editor()) silently filters for non-editors — verify data unchanged
  it('anon CANNOT UPDATE partners', async () => {
    await anon.from('partners').update({ name: '__anon_update__' }).eq('id', seededId);
    const { data } = await service.from('partners').select('name').eq('id', seededId).single();
    expect(data?.name).not.toBe('__anon_update__');
  });

  it('editor CAN UPDATE partners', async () => {
    const { error } = await editor.from('partners').update({ name: '__editor_update__' }).eq('id', seededId);
    expect(error).toBeNull();
  });

  it('anon CANNOT DELETE partners', async () => {
    await anon.from('partners').delete().eq('id', seededId);
    const { data } = await service.from('partners').select('id').eq('id', seededId).single();
    expect(data).not.toBeNull();
  });

  it('editor CAN DELETE partners', async () => {
    const { data: fresh } = await service.from('partners').insert([{ ...TEST_PARTNER, name: '__to_delete__' }]).select('id').single();
    const { error } = await editor.from('partners').delete().eq('id', fresh!.id);
    expect(error).toBeNull();
  });
});
