// tests/rls/events.rls.spec.ts
// RLS matrix for the `events` table:
//   - Visitor (anon): SELECT published ok; INSERT/UPDATE/DELETE deny
//   - Viewer (authenticated, role=viewer): same as anon for write
//   - Editor: full INSERT/UPDATE/DELETE
//
// Unit tests: N/A (no pure logic to isolate here)
// Integration tests: N/A (covered by Vitest + mocked Supabase in services/events.service.test.ts)
// E2E: PENDENTE — Fase 3 (event-crud.spec.ts)
//
// Skipped automatically when SUPABASE_TEST_URL is not set.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { hasTestDB, anonClient, signInAs, serviceClient, TEST_USERS } from './client';

const TEST_EVENT = {
  title: '__rls_test_event__',
  category: 'Outros',
  status: 'draft',
  gallery: '[]',
};

describe.skipIf(!hasTestDB)('events RLS (2.1)', () => {
  let anon: SupabaseClient;
  let viewer: SupabaseClient;
  let editor: SupabaseClient;
  let service: SupabaseClient;
  let insertedId: string;

  beforeAll(async () => {
    anon    = anonClient();
    service = serviceClient();
    viewer  = await signInAs(TEST_USERS.viewer.email,  TEST_USERS.viewer.password);
    editor  = await signInAs(TEST_USERS.editor.email, TEST_USERS.editor.password);

    // Seed a test event via service role for UPDATE/DELETE tests
    const { data } = await service.from('events').insert([TEST_EVENT]).select('id').single();
    insertedId = data?.id;
  });

  afterAll(async () => {
    if (insertedId) await service.from('events').delete().eq('id', insertedId);
    // Clean up any events inserted by editor tests
    await service.from('events').delete().eq('title', '__rls_editor_insert__');
  });

  // SELECT -------------------------------------------------------------------
  it('anon can SELECT published events', async () => {
    const { error } = await anon.from('events').select('id').eq('status', 'published').limit(1);
    expect(error).toBeNull();
  });

  it('viewer can SELECT published events', async () => {
    const { error } = await viewer.from('events').select('id').eq('status', 'published').limit(1);
    expect(error).toBeNull();
  });

  it('editor can SELECT all events (including draft)', async () => {
    const { error } = await editor.from('events').select('id').limit(1);
    expect(error).toBeNull();
  });

  // INSERT -------------------------------------------------------------------
  it('anon CANNOT INSERT events', async () => {
    const { error } = await anon.from('events').insert([{ ...TEST_EVENT, title: '__anon_insert__' }]);
    expect(error).not.toBeNull();
  });

  it('viewer CANNOT INSERT events', async () => {
    const { error } = await viewer.from('events').insert([{ ...TEST_EVENT, title: '__viewer_insert__' }]);
    expect(error).not.toBeNull();
  });

  it('editor CAN INSERT events', async () => {
    const { error } = await editor.from('events').insert([{ ...TEST_EVENT, title: '__rls_editor_insert__' }]);
    expect(error).toBeNull();
  });

  // UPDATE -------------------------------------------------------------------
  // USING (public.is_editor()) silently filters for non-editors — verify data unchanged
  it('anon CANNOT UPDATE events', async () => {
    await anon.from('events').update({ title: '__anon_update__' }).eq('id', insertedId);
    const { data } = await service.from('events').select('title').eq('id', insertedId).single();
    expect(data?.title).not.toBe('__anon_update__');
  });

  it('viewer CANNOT UPDATE events', async () => {
    await viewer.from('events').update({ title: '__viewer_update__' }).eq('id', insertedId);
    const { data } = await service.from('events').select('title').eq('id', insertedId).single();
    expect(data?.title).not.toBe('__viewer_update__');
  });

  it('editor CAN UPDATE events', async () => {
    const { error } = await editor.from('events').update({ title: '__editor_update__' }).eq('id', insertedId);
    expect(error).toBeNull();
  });

  // DELETE -------------------------------------------------------------------
  it('anon CANNOT DELETE events', async () => {
    await anon.from('events').delete().eq('id', insertedId);
    const { data } = await service.from('events').select('id').eq('id', insertedId).single();
    expect(data).not.toBeNull();
  });

  it('viewer CANNOT DELETE events', async () => {
    await viewer.from('events').delete().eq('id', insertedId);
    const { data } = await service.from('events').select('id').eq('id', insertedId).single();
    expect(data).not.toBeNull();
  });

  it('editor CAN DELETE events', async () => {
    const { data: fresh } = await service.from('events').insert([{ ...TEST_EVENT, title: '__to_delete__' }]).select('id').single();
    const { error } = await editor.from('events').delete().eq('id', fresh!.id);
    expect(error).toBeNull();
  });
});
