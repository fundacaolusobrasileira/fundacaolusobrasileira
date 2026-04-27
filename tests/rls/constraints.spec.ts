// tests/rls/constraints.spec.ts
// Phase 2.2 — Database constraint verification against real Supabase.
// Tests that CHECK constraints, length limits, FK cascades enforce at DB level.
//
// Unit/Integration: schema-level enforcement tested here (can't mock DB constraints)
// E2E: PENDENTE — Fase 3

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { hasTestDB, serviceClient } from './client';

describe.skipIf(!hasTestDB)('DB constraints (2.2)', () => {
  let service: SupabaseClient;
  let partnerId: string;
  let eventId: string;

  beforeAll(async () => {
    service = serviceClient();

    const { data: p } = await service.from('partners').insert([{
      name: '__rls_constraint_partner__', type: 'empresa', category: 'Governança',
    }]).select('id').single();
    partnerId = p!.id;

    const { data: e } = await service.from('events').insert([{
      title: '__rls_constraint_event__', category: 'Outros', status: 'draft', gallery: '[]',
    }]).select('id').single();
    eventId = e!.id;
  });

  afterAll(async () => {
    // FK cascade should delete community_media when event is deleted
    await service.from('events').delete().eq('id', eventId);
    // FK cascade should delete benefits when partner is deleted
    await service.from('partners').delete().eq('id', partnerId);
  });

  // CHECK — status enums ----------------------------------------------------
  it('events: rejects invalid status value', async () => {
    const { error } = await service.from('events').insert([{
      title: '__bad_status__', category: 'Outros', status: 'invalid_status', gallery: '[]',
    }]);
    expect(error).not.toBeNull();
  });

  it('precadastros: rejects invalid status value', async () => {
    const { error } = await service.from('precadastros').insert([{
      name: '__test__', email: 'check@test.flb', status: 'invalid_status', registration_type: 'individual',
    }]);
    expect(error).not.toBeNull();
    await service.from('precadastros').delete().eq('email', 'check@test.flb');
  });

  it('precadastros: accepts all 6 valid status values', async () => {
    const statuses = ['novo', 'contatado', 'aprovado', 'pausado', 'rejeitado', 'convertido'];
    for (const status of statuses) {
      const { error } = await service.from('precadastros').insert([{
        name: `__status_${status}__`, email: `status-${status}@test.flb`,
        status, registrationType: 'membro',
      }]);
      expect(error).toBeNull();
    }
    await service.from('precadastros').delete().like('email', 'status-%@test.flb');
  });

  it('community_media: rejects empty url', async () => {
    const { error } = await service.from('community_media_submissions').insert([{
      author_name: '__test__', email: 'cm-url@test.flb', url: '', type: 'image', status: 'pending',
    }]);
    expect(error).not.toBeNull();
  });

  // FK CASCADE ---------------------------------------------------------------
  it('deleting an event cascades delete to community_media_submissions', async () => {
    // Insert a community_media linked to the test event
    await service.from('community_media_submissions').insert([{
      event_id: eventId,
      author_name: '__cascade_test__',
      email: 'cascade@test.flb',
      url: 'https://example.com/img.jpg',
      type: 'image',
      status: 'pending',
    }]);

    // Delete the event
    await service.from('events').delete().eq('id', eventId);

    // The linked community_media should be gone
    const { data } = await service.from('community_media_submissions').select('id').eq('event_id', eventId);
    expect(data?.length ?? 0).toBe(0);

    // Re-create eventId for afterAll (no-op if already deleted)
    const { data: e } = await service.from('events').insert([{
      title: '__rls_constraint_event__', category: 'Outros', status: 'draft', gallery: '[]',
    }]).select('id').single();
    eventId = e!.id;
  });

  it('deleting a partner cascades delete to benefits', async () => {
    await service.from('benefits').insert([{
      partner_id: partnerId, title: '__cascade_benefit__', category: 'desconto', active: false, order: 0,
    }]);

    await service.from('partners').delete().eq('id', partnerId);

    const { data } = await service.from('benefits').select('id').eq('partner_id', partnerId);
    expect(data?.length ?? 0).toBe(0);

    // Re-create partnerId for afterAll
    const { data: p } = await service.from('partners').insert([{
      name: '__rls_constraint_partner__', type: 'empresa', category: 'Governança',
    }]).select('id').single();
    partnerId = p!.id;
  });
});
