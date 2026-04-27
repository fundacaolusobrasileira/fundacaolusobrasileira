// tests/rls/community-media.rls.spec.ts
// RLS matrix for `community_media_submissions` (matches production):
//   - Anon: INSERT ok (public submission form, WITH CHECK true); SELECT deny
//   - Membro: INSERT ok; SELECT deny (production: only editors read)
//   - Editor: SELECT all; UPDATE/DELETE all
//
// Unit/Integration: covered in services/community-media.service.test.ts
// E2E: PENDENTE — Fase 3 (community-media.spec.ts)

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { hasTestDB, anonClient, signInAs, serviceClient, TEST_USERS } from './client';

describe.skipIf(!hasTestDB)('community_media_submissions RLS (2.1)', () => {
  let anon: SupabaseClient;
  let membro: SupabaseClient;
  let editor: SupabaseClient;
  let service: SupabaseClient;
  let seededId: string;
  let testEventId: string;

  beforeAll(async () => {
    anon    = anonClient();
    service = serviceClient();
    membro  = await signInAs(TEST_USERS.membro.email, TEST_USERS.membro.password);
    editor  = await signInAs(TEST_USERS.editor.email, TEST_USERS.editor.password);

    // Seed a test event (event_id is NOT NULL FK on community_media_submissions)
    const { data: ev } = await service.from('events').insert([{
      title: '__rls_cm_test_event__',
      category: 'Outros',
      status: 'draft',
      gallery: '[]',
    }]).select('id').single();
    testEventId = ev!.id;

    const { data } = await service.from('community_media_submissions').insert([{
      author_name: '__rls_test__',
      email: 'rls-cm@test.flb',
      url: 'https://example.com/photo.jpg',
      type: 'image',
      status: 'pending',
      event_id: testEventId,
    }]).select('id').single();
    seededId = data!.id;
  });

  afterAll(async () => {
    await service.from('community_media_submissions').delete().eq('email', 'rls-cm@test.flb');
    await service.from('community_media_submissions').delete().eq('email', 'rls-cm-anon@test.flb');
    await service.from('community_media_submissions').delete().eq('email', 'rls-cm-membro@test.flb');
    await service.from('events').delete().eq('id', testEventId);
  });

  const makeRow = (overrides: Record<string, unknown> = {}) => ({
    author_name: '__rls_test__',
    url: 'https://example.com/photo.jpg',
    type: 'image',
    status: 'pending',
    event_id: testEventId,
    ...overrides,
  });

  // SELECT -------------------------------------------------------------------
  it('anon CANNOT SELECT community_media_submissions', async () => {
    const { data, error } = await anon.from('community_media_submissions').select('id').limit(1);
    const denied = !!error || (data?.length === 0);
    expect(denied).toBe(true);
  });

  it('membro CANNOT SELECT community_media_submissions (production: editors only)', async () => {
    const { data, error } = await membro.from('community_media_submissions').select('id').limit(1);
    const denied = !!error || (data?.length === 0);
    expect(denied).toBe(true);
  });

  it('editor CAN SELECT all community_media_submissions', async () => {
    const { error } = await editor.from('community_media_submissions').select('id').limit(5);
    expect(error).toBeNull();
  });

  // INSERT -------------------------------------------------------------------
  it('anon CAN INSERT community_media (public submission — WITH CHECK true)', async () => {
    const { error } = await anon.from('community_media_submissions').insert([
      makeRow({ email: 'rls-cm-anon@test.flb' }),
    ]);
    expect(error).toBeNull();
  });

  it('membro CAN INSERT community_media', async () => {
    const { error } = await membro.from('community_media_submissions').insert([
      makeRow({ email: 'rls-cm-membro@test.flb' }),
    ]);
    expect(error).toBeNull();
  });

  // UPDATE -------------------------------------------------------------------
  // USING (public.is_editor()) silently filters for non-editors — verify data unchanged
  it('anon CANNOT UPDATE community_media_submissions', async () => {
    await anon.from('community_media_submissions').update({ status: 'approved' }).eq('id', seededId);
    const { data } = await service.from('community_media_submissions').select('status').eq('id', seededId).single();
    expect(data?.status).not.toBe('approved');
  });

  it('membro CANNOT UPDATE community_media_submissions', async () => {
    await membro.from('community_media_submissions').update({ status: 'approved' }).eq('id', seededId);
    const { data } = await service.from('community_media_submissions').select('status').eq('id', seededId).single();
    expect(data?.status).not.toBe('approved');
  });

  it('editor CAN UPDATE community_media_submissions', async () => {
    const { error } = await editor.from('community_media_submissions').update({ status: 'approved' }).eq('id', seededId);
    expect(error).toBeNull();
  });

  // DELETE -------------------------------------------------------------------
  it('anon CANNOT DELETE community_media_submissions', async () => {
    await anon.from('community_media_submissions').delete().eq('id', seededId);
    const { data } = await service.from('community_media_submissions').select('id').eq('id', seededId).single();
    expect(data).not.toBeNull();
  });

  it('editor CAN DELETE community_media_submissions', async () => {
    const { data: fresh } = await service.from('community_media_submissions').insert([
      makeRow({ email: 'rls-cm-del@test.flb' }),
    ]).select('id').single();
    const { error } = await editor.from('community_media_submissions').delete().eq('id', fresh!.id);
    expect(error).toBeNull();
    await service.from('community_media_submissions').delete().eq('email', 'rls-cm-del@test.flb');
  });
});
