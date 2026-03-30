import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSelect = vi.fn<any>().mockResolvedValue({
  data: [{ id: 'sub-1', event_id: 'e-1', author_name: 'João', email: 'j@e.com', url: 'http://img.jpg', type: 'image', message: 'hi', status: 'pending', created_at: '2026-03-30T10:00:00Z' }],
  error: null,
});
const mockInsert = vi.fn<any>(() => ({ select: mockSelect }));
const mockFrom = vi.fn<any>(() => ({
  insert: mockInsert,
  select: vi.fn().mockReturnValue({ order: vi.fn().mockResolvedValue({ data: [], error: null }) }),
}));

vi.mock('../supabaseClient', () => ({ supabase: { from: mockFrom } }));
vi.mock('../store/app.store', async () => {
  const actual = await vi.importActual('../store/app.store');
  return { ...actual as any };
});

describe('submitCommunityMedia', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSelect.mockResolvedValue({
      data: [{ id: 'sub-1', event_id: 'e-1', author_name: 'João', email: 'j@e.com', url: 'http://img.jpg', type: 'image', message: 'hi', status: 'pending', created_at: '2026-03-30T10:00:00Z' }],
      error: null,
    });
  });

  it('persists submission to Supabase with snake_case fields', async () => {
    const { submitCommunityMedia } = await import('./community-media.service');

    const result = await submitCommunityMedia({
      eventId: 'e-1',
      authorName: 'João',
      email: 'j@e.com',
      url: 'http://img.jpg',
      type: 'image',
      message: 'Great event!',
    });

    // Must call Supabase insert
    expect(mockFrom).toHaveBeenCalledWith('community_media_submissions');
    expect(mockInsert).toHaveBeenCalled();

    const payload = mockInsert.mock.calls[0]![0]![0] as any;
    // snake_case fields in payload
    expect(payload.event_id).toBe('e-1');
    expect(payload.author_name).toBe('João');
    expect(payload.email).toBe('j@e.com');
    expect(payload.url).toBe('http://img.jpg');
    expect(payload.type).toBe('image');
    expect(payload.message).toBe('Great event!');

    // camelCase should NOT be in payload
    expect(payload.eventId).toBeUndefined();
    expect(payload.authorName).toBeUndefined();

    // Result should be normalized to camelCase
    expect(result).not.toBeNull();
    expect(result!.eventId).toBe('e-1');
    expect(result!.authorName).toBe('João');
  });

  it('returns null and shows error toast when Supabase fails', async () => {
    mockSelect.mockResolvedValue({ data: null, error: { message: 'RLS violation' } });

    const { submitCommunityMedia } = await import('./community-media.service');

    const result = await submitCommunityMedia({
      eventId: 'e-1',
      authorName: 'Test',
      email: 'test@e.com',
      url: 'http://test.jpg',
      type: 'image',
      message: '',
    });

    expect(result).toBeNull();
  });
});
