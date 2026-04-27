// tests/rls/precadastros.rls.spec.ts
// RLS matrix for `precadastros`:
//   - Anon: INSERT ok; SELECT deny
//   - Editor: SELECT / UPDATE / DELETE ok
//
// Unit/Integration: covered in services/precadastros.service.test.ts
// E2E: PENDENTE — Fase 3 (precadastro-flow.spec.ts)

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { hasTestDB, anonClient, signInAs, serviceClient, TEST_USERS } from './client';

const TEST_ROW = {
  name: '__rls_test__',
  email: 'rls@test.flb',
  message: 'RLS test submission',
  registrationType: 'membro',
  status: 'novo',
};

describe.skipIf(!hasTestDB)('precadastros RLS (2.1)', () => {
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

    const { data } = await service.from('precadastros').insert([TEST_ROW]).select('id').single();
    seededId = data!.id;
  });

  afterAll(async () => {
    // Clean up by ALL test markers — name AND email — to prevent ghost rows
    // from accumulating across failed CI runs (anon insert uses different email).
    await service.from('precadastros').delete().eq('email', 'rls@test.flb');
    await service.from('precadastros').delete().eq('email', 'rls-anon@test.flb');
    await service.from('precadastros').delete().eq('email', 'rls-del@test.flb');
    await service.from('precadastros').delete().eq('name', '__rls_anon_insert__');
    await service.from('precadastros').delete().eq('name', '__rls_test__');
  });

  // SELECT -------------------------------------------------------------------
  it('anon CANNOT SELECT precadastros', async () => {
    const { data, error } = await anon.from('precadastros').select('id').limit(1);
    // Either error or empty result due to RLS
    const denied = !!error || (data?.length === 0);
    expect(denied).toBe(true);
  });

  it('viewer CANNOT SELECT precadastros', async () => {
    const { data, error } = await viewer.from('precadastros').select('id').limit(1);
    const denied = !!error || (data?.length === 0);
    expect(denied).toBe(true);
  });

  it('editor CAN SELECT precadastros', async () => {
    const { error } = await editor.from('precadastros').select('id').limit(1);
    expect(error).toBeNull();
  });

  // INSERT -------------------------------------------------------------------
  it('anon CAN INSERT precadastros (public form)', async () => {
    const { error } = await anon.from('precadastros').insert([{
      ...TEST_ROW,
      name: '__rls_anon_insert__',
      email: 'rls-anon@test.flb',
    }]);
    expect(error).toBeNull();
  });

  // UPDATE -------------------------------------------------------------------
  // USING (public.is_editor()) silently filters for non-editors — verify data unchanged
  it('anon CANNOT UPDATE precadastros', async () => {
    await anon.from('precadastros').update({ status: 'contatado' }).eq('id', seededId);
    const { data } = await service.from('precadastros').select('status').eq('id', seededId).single();
    expect(data?.status).not.toBe('contatado');
  });

  it('viewer CANNOT UPDATE precadastros', async () => {
    await viewer.from('precadastros').update({ status: 'contatado' }).eq('id', seededId);
    const { data } = await service.from('precadastros').select('status').eq('id', seededId).single();
    expect(data?.status).not.toBe('contatado');
  });

  it('editor CAN UPDATE precadastros', async () => {
    const { error } = await editor.from('precadastros').update({ status: 'contatado' }).eq('id', seededId);
    expect(error).toBeNull();
  });

  // DELETE -------------------------------------------------------------------
  it('anon CANNOT DELETE precadastros', async () => {
    await anon.from('precadastros').delete().eq('id', seededId);
    const { data } = await service.from('precadastros').select('id').eq('id', seededId).single();
    expect(data).not.toBeNull();
  });

  it('editor CAN DELETE precadastros', async () => {
    const { data: fresh } = await service.from('precadastros').insert([{ ...TEST_ROW, email: 'rls-del@test.flb' }]).select('id').single();
    const { error } = await editor.from('precadastros').delete().eq('id', fresh!.id);
    expect(error).toBeNull();
  });
});
