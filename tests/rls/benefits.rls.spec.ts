// tests/rls/benefits.rls.spec.ts
// RLS matrix for `benefits`:
//   - Public: SELECT WHERE active=true ok; SELECT WHERE active=false deny
//   - Editor: SELECT all; INSERT / UPDATE / DELETE ok
//
// Unit/Integration: covered in services/benefits.service.test.ts
// E2E: PENDENTE — Fase 3

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { hasTestDB, anonClient, signInAs, serviceClient, TEST_USERS } from './client';

describe.skipIf(!hasTestDB)('benefits RLS (2.1)', () => {
  let anon: SupabaseClient;
  let viewer: SupabaseClient;
  let editor: SupabaseClient;
  let service: SupabaseClient;
  let partnerId: string;
  let activeId: string;
  let inactiveId: string;

  beforeAll(async () => {
    anon    = anonClient();
    service = serviceClient();
    viewer  = await signInAs(TEST_USERS.viewer.email, TEST_USERS.viewer.password);
    editor  = await signInAs(TEST_USERS.editor.email, TEST_USERS.editor.password);

    // Create a seed partner (needed for FK)
    const { data: p } = await service.from('partners').insert([{
      name: '__rls_benefit_partner__',
      type: 'empresa',
      category: 'Governança',
    }]).select('id').single();
    partnerId = p!.id;

    const BASE = { partner_id: partnerId, title: '__rls_benefit__', category: 'desconto', order: 0 };

    const { data: a } = await service.from('benefits').insert([{ ...BASE, active: true }]).select('id').single();
    activeId = a!.id;

    const { data: i } = await service.from('benefits').insert([{ ...BASE, active: false }]).select('id').single();
    inactiveId = i!.id;
  });

  afterAll(async () => {
    await service.from('benefits').delete().eq('partner_id', partnerId);
    await service.from('partners').delete().eq('id', partnerId);
  });

  // SELECT -------------------------------------------------------------------
  it('anon CAN SELECT active benefits', async () => {
    const { error } = await anon.from('benefits').select('id').eq('active', true).limit(1);
    expect(error).toBeNull();
  });

  it('anon CANNOT SELECT inactive benefits', async () => {
    const { data, error } = await anon.from('benefits').select('id').eq('active', false).eq('id', inactiveId);
    const denied = !!error || (data?.length === 0);
    expect(denied).toBe(true);
  });

  it('editor CAN SELECT inactive benefits', async () => {
    const { data, error } = await editor.from('benefits').select('id').eq('active', false).eq('id', inactiveId);
    expect(error).toBeNull();
    expect(data?.length).toBeGreaterThan(0);
  });

  // INSERT -------------------------------------------------------------------
  it('anon CANNOT INSERT benefits', async () => {
    const { error } = await anon.from('benefits').insert([{
      partner_id: partnerId, title: '__anon_insert__', category: 'desconto', active: true, order: 0,
    }]);
    expect(error).not.toBeNull();
  });

  it('editor CAN INSERT benefits', async () => {
    const { data, error } = await editor.from('benefits').insert([{
      partner_id: partnerId, title: '__editor_insert__', category: 'acesso', active: false, order: 99,
    }]).select('id').single();
    expect(error).toBeNull();
    if (data?.id) await service.from('benefits').delete().eq('id', data.id);
  });

  // UPDATE -------------------------------------------------------------------
  // USING (public.is_editor()) silently filters for non-editors — verify data unchanged
  it('anon CANNOT UPDATE benefits', async () => {
    await anon.from('benefits').update({ title: '__anon_update__' }).eq('id', activeId);
    const { data } = await service.from('benefits').select('title').eq('id', activeId).single();
    expect(data?.title).not.toBe('__anon_update__');
  });

  it('editor CAN UPDATE benefits', async () => {
    const { error } = await editor.from('benefits').update({ title: '__editor_update__' }).eq('id', activeId);
    expect(error).toBeNull();
  });

  // DELETE -------------------------------------------------------------------
  it('anon CANNOT DELETE benefits', async () => {
    await anon.from('benefits').delete().eq('id', activeId);
    const { data } = await service.from('benefits').select('id').eq('id', activeId).single();
    expect(data).not.toBeNull();
  });

  it('editor CAN DELETE benefits', async () => {
    const { data: fresh } = await service.from('benefits').insert([{
      partner_id: partnerId, title: '__to_delete__', category: 'desconto', active: false, order: 0,
    }]).select('id').single();
    const { error } = await editor.from('benefits').delete().eq('id', fresh!.id);
    expect(error).toBeNull();
  });
});
