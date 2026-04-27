// services/community-media.service.test.ts
// Unit: normalize (snake→camel mapping).
// Integration: submitCommunityMedia (payload, URL validation, Supabase error, store update),
//              syncCommunityMedia (populate, re-sync, error).
// E2E: SKIPPED per test-strategy.md 1.4 — covered in Phase 3 (community-media.spec.ts).

import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- Mocks ---
// Service chain: from().insert([...]).select('*').single() → Promise<{data,error}>
// Service chain: from().select('*').order(...) → Promise<{data,error}>
const mockInsertSingle = vi.fn<any>().mockResolvedValue({
  data: { id: 'sub-123', event_id: 'e-1', author_name: 'João', email: 'j@e.com', url: 'http://img.jpg', type: 'image', message: 'Great event!', status: 'pending', created_at: '2026-03-30T10:00:00Z' },
  error: null,
});
const mockInsertSelect = vi.fn<any>(() => ({ single: mockInsertSingle }));
const mockInsert = vi.fn<any>(() => ({ select: mockInsertSelect }));
const mockOrder = vi.fn<any>().mockResolvedValue({
  data: [
    { id: 'sub-1', event_id: 'e-1', author_name: 'João', email: 'j@e.com', url: 'http://img.jpg', type: 'image', message: 'hi', status: 'pending', created_at: '2026-03-30T10:00:00Z' },
  ],
  error: null,
});
const mockSelect = vi.fn<any>(() => ({ order: mockOrder }));
const mockFrom = vi.fn<any>(() => ({
  insert: mockInsert,
  select: mockSelect,
}));

vi.mock('../supabaseClient', () => ({ supabase: { from: mockFrom } }));
vi.mock('../store/app.store', async () => {
  const actual = await vi.importActual('../store/app.store');
  return {
    ...actual as any,
    showToast: vi.fn(),
    logActivity: vi.fn(),
    notifyState: vi.fn(),
  };
});

// ============================================================================
// UNIT — normalize (via syncCommunityMedia side-effect)
// ============================================================================
describe('normalize (unit)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOrder.mockResolvedValue({
      data: [{ id: 'sub-1', event_id: 'e-1', author_name: 'João', email: 'j@e.com', url: 'http://img.jpg', type: 'image', message: 'hi', status: 'pending', created_at: '2026-03-30T10:00:00Z' }],
      error: null,
    });
  });

  it('maps event_id → eventId', async () => {
    const { syncCommunityMedia } = await import('./community-media.service');
    const { PENDING_MEDIA_SUBMISSIONS } = await import('../store/app.store');
    PENDING_MEDIA_SUBMISSIONS.length = 0;
    await syncCommunityMedia();
    expect(PENDING_MEDIA_SUBMISSIONS[0].eventId).toBe('e-1');
    expect((PENDING_MEDIA_SUBMISSIONS[0] as any).event_id).toBeUndefined();
  });

  it('maps author_name → authorName', async () => {
    const { syncCommunityMedia } = await import('./community-media.service');
    const { PENDING_MEDIA_SUBMISSIONS } = await import('../store/app.store');
    PENDING_MEDIA_SUBMISSIONS.length = 0;
    await syncCommunityMedia();
    expect(PENDING_MEDIA_SUBMISSIONS[0].authorName).toBe('João');
    expect((PENDING_MEDIA_SUBMISSIONS[0] as any).author_name).toBeUndefined();
  });

  it('maps created_at → createdAt', async () => {
    const { syncCommunityMedia } = await import('./community-media.service');
    const { PENDING_MEDIA_SUBMISSIONS } = await import('../store/app.store');
    PENDING_MEDIA_SUBMISSIONS.length = 0;
    await syncCommunityMedia();
    expect(PENDING_MEDIA_SUBMISSIONS[0].createdAt).toBe('2026-03-30T10:00:00Z');
    expect((PENDING_MEDIA_SUBMISSIONS[0] as any).created_at).toBeUndefined();
  });

  it('preserves status, type, url, message', async () => {
    const { syncCommunityMedia } = await import('./community-media.service');
    const { PENDING_MEDIA_SUBMISSIONS } = await import('../store/app.store');
    PENDING_MEDIA_SUBMISSIONS.length = 0;
    await syncCommunityMedia();
    expect(PENDING_MEDIA_SUBMISSIONS[0].status).toBe('pending');
    expect(PENDING_MEDIA_SUBMISSIONS[0].type).toBe('image');
    expect(PENDING_MEDIA_SUBMISSIONS[0].url).toBe('http://img.jpg');
    expect(PENDING_MEDIA_SUBMISSIONS[0].message).toBe('hi');
  });
});

// ============================================================================
// INTEGRATION — syncCommunityMedia
// ============================================================================
describe('syncCommunityMedia (integration)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOrder.mockResolvedValue({
      data: [
        { id: 'sub-1', event_id: 'e-1', author_name: 'João', email: 'j@e.com', url: 'http://img.jpg', type: 'image', message: 'hi', status: 'pending', created_at: '2026-03-30T10:00:00Z' },
        { id: 'sub-2', event_id: 'e-2', author_name: 'Ana', email: 'a@a.com', url: 'http://vid.mp4', type: 'video', message: '', status: 'pending', created_at: '2026-03-29T10:00:00Z' },
      ],
      error: null,
    });
  });

  it('populates PENDING_MEDIA_SUBMISSIONS with normalized items', async () => {
    const { syncCommunityMedia } = await import('./community-media.service');
    const { PENDING_MEDIA_SUBMISSIONS } = await import('../store/app.store');
    PENDING_MEDIA_SUBMISSIONS.length = 0;
    await syncCommunityMedia();
    expect(PENDING_MEDIA_SUBMISSIONS).toHaveLength(2);
  });

  it('clears store before repopulating — no duplicates on re-sync', async () => {
    const { syncCommunityMedia } = await import('./community-media.service');
    const { PENDING_MEDIA_SUBMISSIONS } = await import('../store/app.store');
    PENDING_MEDIA_SUBMISSIONS.length = 0;
    await syncCommunityMedia();
    await syncCommunityMedia();
    expect(PENDING_MEDIA_SUBMISSIONS).toHaveLength(2);
  });

  it('queries ordered by created_at descending', async () => {
    const { syncCommunityMedia } = await import('./community-media.service');
    await syncCommunityMedia();
    expect(mockFrom).toHaveBeenCalledWith('community_media_submissions');
    expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: false });
  });

  it('silently ignores Supabase error — store unchanged', async () => {
    mockOrder.mockResolvedValue({ data: null, error: { message: 'DB error' } });
    const { syncCommunityMedia } = await import('./community-media.service');
    const { PENDING_MEDIA_SUBMISSIONS } = await import('../store/app.store');
    PENDING_MEDIA_SUBMISSIONS.length = 0;
    await syncCommunityMedia();
    expect(PENDING_MEDIA_SUBMISSIONS).toHaveLength(0);
  });
});

// ============================================================================
// INTEGRATION — submitCommunityMedia
// ============================================================================
describe('submitCommunityMedia (integration)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInsertSingle.mockResolvedValue({
      data: { id: 'sub-123', event_id: 'e-1', author_name: 'João', email: 'j@e.com', url: 'http://img.jpg', type: 'image', message: 'Great event!', status: 'pending', created_at: '2026-03-30T10:00:00Z' },
      error: null,
    });
  });

  const validSubmission = {
    eventId: 'e-1',
    authorName: 'João',
    email: 'j@e.com',
    url: 'http://img.jpg',
    type: 'image' as const,
    message: 'Great event!',
  };

  it('persists submission to Supabase with snake_case fields', async () => {
    const { submitCommunityMedia } = await import('./community-media.service');
    await submitCommunityMedia(validSubmission);
    expect(mockFrom).toHaveBeenCalledWith('community_media_submissions');
    expect(mockInsert).toHaveBeenCalled();
    const payload = mockInsert.mock.calls[0]![0]![0] as any;
    expect(payload.event_id).toBe('e-1');
    expect(payload.author_name).toBe('João');
    expect(payload.email).toBe('j@e.com');
    // camelCase must NOT be in payload
    expect(payload.eventId).toBeUndefined();
    expect(payload.authorName).toBeUndefined();
  });

  it('returns normalized camelCase result on success', async () => {
    const { submitCommunityMedia } = await import('./community-media.service');
    const result = await submitCommunityMedia(validSubmission);
    expect(result).not.toBeNull();
    expect(result!.id).toBe('sub-123');
    expect(result!.eventId).toBe('e-1');
    expect(result!.authorName).toBe('João');
    expect(result!.status).toBe('pending');
    expect(result!.createdAt).toBe('2026-03-30T10:00:00Z');
  });

  it('adds optimistic entry to PENDING_MEDIA_SUBMISSIONS store', async () => {
    const { submitCommunityMedia } = await import('./community-media.service');
    const { PENDING_MEDIA_SUBMISSIONS } = await import('../store/app.store');
    PENDING_MEDIA_SUBMISSIONS.length = 0;
    await submitCommunityMedia(validSubmission);
    expect(PENDING_MEDIA_SUBMISSIONS).toHaveLength(1);
    expect(PENDING_MEDIA_SUBMISSIONS[0].eventId).toBe('e-1');
  });

  it('rejects javascript: URL — returns null, toast, no Supabase call', async () => {
    const { submitCommunityMedia } = await import('./community-media.service');
    const { showToast } = await import('../store/app.store');
    const result = await submitCommunityMedia({ ...validSubmission, url: 'javascript:alert(1)' });
    expect(result).toBeNull();
    expect(mockInsert).not.toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledWith(expect.stringContaining('inválida'), 'error');
  });

  it('rejects ftp: URL — returns null, no Supabase call', async () => {
    const { submitCommunityMedia } = await import('./community-media.service');
    const result = await submitCommunityMedia({ ...validSubmission, url: 'ftp://files.example.com/img.jpg' });
    expect(result).toBeNull();
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('rejects URL with leading spaces — returns null', async () => {
    const { submitCommunityMedia } = await import('./community-media.service');
    const result = await submitCommunityMedia({ ...validSubmission, url: '  https://valid.com' });
    expect(result).toBeNull();
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('returns null and shows error toast when Supabase insert fails', async () => {
    mockInsertSingle.mockResolvedValue({ data: null, error: { message: 'RLS violation' } });
    const { submitCommunityMedia } = await import('./community-media.service');
    const { showToast } = await import('../store/app.store');
    const result = await submitCommunityMedia(validSubmission);
    expect(result).toBeNull();
    expect(showToast).toHaveBeenCalledWith(expect.any(String), 'error');
  });

  // Lock-in: when Supabase insert fails, the store MUST NOT contain a phantom
  // entry. The current implementation only mutates PENDING_MEDIA_SUBMISSIONS
  // after a successful insert (pessimistic update); this test prevents a
  // future refactor from accidentally introducing optimistic-without-rollback.
  it('does NOT add anything to PENDING_MEDIA_SUBMISSIONS when Supabase insert fails', async () => {
    const { PENDING_MEDIA_SUBMISSIONS } = await import('../store/app.store');
    PENDING_MEDIA_SUBMISSIONS.length = 0;

    mockInsertSingle.mockResolvedValue({ data: null, error: { message: 'RLS violation' } });
    const { submitCommunityMedia } = await import('./community-media.service');
    await submitCommunityMedia(validSubmission);

    expect(PENDING_MEDIA_SUBMISSIONS).toHaveLength(0);
  });
});
