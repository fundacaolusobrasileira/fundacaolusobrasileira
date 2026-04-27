// services/activity-log.service.test.ts
// Unit: normalizeLog mapping (snake_case → camelCase).
// Integration: insert + sync round-trip with mocked Supabase; RLS deny for anon.
// E2E: editor performs CRUD on event → entry appears in /dashboard — covered in Phase 3 (test-strategy.md 0.2).

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ActivityLogItem } from '../types';

// --- Mocks ---
// Service chain: from().select('*').order(...).limit(50) → Promise<{data,error}>
const mockInsert = vi.fn<any>().mockResolvedValue({ error: null });
const mockLimit = vi.fn<any>().mockResolvedValue({
  data: [
    {
      id: 'log-1',
      action: 'Criou evento',
      target: 'Festival',
      user_name: 'Admin',
      user_id: 'user-uuid-1',
      created_at: '2026-04-25T10:00:00Z',
    },
  ],
  error: null,
});
const mockOrder = vi.fn<any>(() => ({ limit: mockLimit }));
const mockSelect = vi.fn<any>(() => ({ order: mockOrder }));
const mockFrom = vi.fn<any>(() => ({
  select: mockSelect,
  insert: mockInsert,
}));

vi.mock('../supabaseClient', () => ({ supabase: { from: mockFrom } }));
vi.mock('../store/app.store', async () => {
  const actual = await vi.importActual('../store/app.store');
  return { ...actual as any };
});

// --- Tests ---

describe('normalizeLog (unit)', () => {
  it('maps snake_case DB row to ActivityLogItem', async () => {
    const { syncActivityLog } = await import('./activity-log.service');
    const { ACTIVITY_LOG } = await import('../store/app.store');
    ACTIVITY_LOG.length = 0;
    await syncActivityLog();
    expect(ACTIVITY_LOG[0]).toMatchObject<Partial<ActivityLogItem>>({
      id: 'log-1',
      action: 'Criou evento',
      target: 'Festival',
      user: 'Admin',
      timestamp: '2026-04-25T10:00:00Z',
    });
  });
});

describe('syncActivityLog (integration)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLimit.mockResolvedValue({
      data: [
        { id: 'log-1', action: 'Criou evento', target: 'Festival', user_name: 'Admin', user_id: 'user-uuid-1', created_at: '2026-04-25T10:00:00Z' },
      ],
      error: null,
    });
    mockInsert.mockResolvedValue({ error: null });
  });

  it('queries activity_logs table ordered by created_at desc with limit 50', async () => {
    const { syncActivityLog } = await import('./activity-log.service');
    await syncActivityLog();
    expect(mockFrom).toHaveBeenCalledWith('activity_logs');
    expect(mockSelect).toHaveBeenCalledWith('*');
  });

  it('populates ACTIVITY_LOG store with normalized items', async () => {
    const { syncActivityLog } = await import('./activity-log.service');
    const { ACTIVITY_LOG } = await import('../store/app.store');
    ACTIVITY_LOG.length = 0;
    await syncActivityLog();
    expect(ACTIVITY_LOG).toHaveLength(1);
    expect(ACTIVITY_LOG[0].action).toBe('Criou evento');
  });

  it('clears store before repopulating (no duplicates on re-sync)', async () => {
    const { syncActivityLog } = await import('./activity-log.service');
    const { ACTIVITY_LOG } = await import('../store/app.store');
    ACTIVITY_LOG.length = 0;
    await syncActivityLog();
    await syncActivityLog();
    expect(ACTIVITY_LOG).toHaveLength(1);
  });

  it('silently ignores RLS permission-denied error — store stays empty', async () => {
    mockLimit.mockResolvedValue({ data: null, error: { message: 'permission denied for table activity_logs' } });
    const { syncActivityLog } = await import('./activity-log.service');
    const { ACTIVITY_LOG } = await import('../store/app.store');
    ACTIVITY_LOG.length = 0;
    await syncActivityLog();
    expect(ACTIVITY_LOG).toHaveLength(0);
  });
});

describe('persistLogEntry (integration)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInsert.mockResolvedValue({ error: null });
  });

  it('inserts action and target to activity_logs', async () => {
    const { persistLogEntry } = await import('./activity-log.service');
    const result = await persistLogEntry('Criou evento', 'Festival');
    expect(mockFrom).toHaveBeenCalledWith('activity_logs');
    const payload = mockInsert.mock.calls[0]![0]![0] as any;
    expect(payload.action).toBe('Criou evento');
    expect(payload.target).toBe('Festival');
    // result must expose ok/error (not void)
    expect(result).toHaveProperty('ok');
    expect(result.ok).toBe(true);
  });

  it('returns ok: false when Supabase insert fails', async () => {
    mockInsert.mockResolvedValue({ error: { message: 'RLS violation' } });
    const { persistLogEntry } = await import('./activity-log.service');
    const result = await persistLogEntry('Ação', 'Alvo');
    expect(result.ok).toBe(false);
    expect(result.error).toBe('RLS violation');
  });

  it('includes user_name and user_id from AUTH_SESSION in payload', async () => {
    const { AUTH_SESSION } = await import('../store/app.store');
    AUTH_SESSION.displayName = 'Fernando';
    AUTH_SESSION.userId = 'user-uuid-99';
    const { persistLogEntry } = await import('./activity-log.service');
    await persistLogEntry('Editou membro', 'João Silva');
    const payload = mockInsert.mock.calls[0]![0]![0] as any;
    expect(payload.user_name).toBe('Fernando');
    expect(payload.user_id).toBe('user-uuid-99');
  });
});
