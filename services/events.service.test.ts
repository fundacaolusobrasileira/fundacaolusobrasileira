import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock supabase
const mockSelect = vi.fn<any>();
const mockInsert = vi.fn<any>(() => ({ select: mockSelect }));
const mockUpdate = vi.fn<any>(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) }));
const mockFrom = vi.fn(() => ({
  select: vi.fn().mockReturnValue({ order: vi.fn().mockResolvedValue({ data: [], error: null }) }),
  insert: mockInsert,
  update: mockUpdate,
}));
vi.mock('../supabaseClient', () => ({ supabase: { from: mockFrom } }));
vi.mock('../store/app.store', async () => {
  const actual = await vi.importActual('../store/app.store');
  return {
    ...actual as any,
    isEditor: vi.fn(() => true),
  };
});

describe('normalizeEvent', () => {
  it('maps all snake_case fields to camelCase', async () => {
    // Reset to get fresh module
    vi.resetModules();

    const dbRow = {
      id: 'e-1',
      title: 'Test Event',
      cover_image: 'cover.jpg',
      social_links: { facebook: 'fb.com' },
      gallery: [],
      description_short: 'Short desc',
      end_date: '2026-04-01',
      end_time: '18:00',
      card_image: 'card.jpg',
    };

    // We need to test normalizeEvent — it's not exported, but syncEvents uses it
    // So we test via createEvent which returns a normalized event
    mockSelect.mockResolvedValue({ data: [dbRow], error: null });

    const { createEvent } = await import('./events.service');
    const result = await createEvent({ title: 'Test Event' });

    expect(result).not.toBeNull();
    expect(result!.coverImage).toBe('cover.jpg');
    expect(result!.socialLinks).toEqual({ facebook: 'fb.com' });
    expect(result!.descriptionShort).toBe('Short desc');
    expect(result!.endDate).toBe('2026-04-01');
    expect(result!.endTime).toBe('18:00');
    expect(result!.cardImage).toBe('card.jpg');
  });
});

describe('createEvent payload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSelect.mockResolvedValue({ data: [{ id: 'e-1', title: 'T', gallery: [] }], error: null });
  });

  it('includes all event fields in the INSERT payload', async () => {
    const { createEvent } = await import('./events.service');

    await createEvent({
      title: 'Festival',
      subtitle: 'Subtítulo',
      description: 'Desc',
      descriptionShort: 'Short',
      date: '2026-04-01',
      time: '14:00',
      endDate: '2026-04-02',
      endTime: '18:00',
      location: 'Lisboa',
      address: 'Rua X',
      city: 'Lisboa',
      country: 'Portugal',
      category: 'Outros',
      tags: ['music'],
      image: 'img.jpg',
      coverImage: 'cover.jpg',
      cardImage: 'card.jpg',
      socialLinks: { facebook: 'fb' },
      gallery: [],
      links: { registration: 'http://reg' },
      status: 'published',
      featured: true,
      objective: 'Objective text',
      experience: 'Experience text',
      sponsors: 'Sponsor text',
      notes: 'Notes text',
    });

    expect(mockInsert).toHaveBeenCalled();
    const payload = mockInsert.mock.calls[0]![0]![0] as any;

    // snake_case conversions
    expect(payload.cover_image).toBe('cover.jpg');
    expect(payload.social_links).toEqual({ facebook: 'fb' });
    expect(payload.description_short).toBe('Short');
    expect(payload.end_date).toBe('2026-04-02');
    expect(payload.end_time).toBe('18:00');
    expect(payload.card_image).toBe('card.jpg');

    // direct fields
    expect(payload.subtitle).toBe('Subtítulo');
    expect(payload.time).toBe('14:00');
    expect(payload.address).toBe('Rua X');
    expect(payload.city).toBe('Lisboa');
    expect(payload.country).toBe('Portugal');
    expect(payload.tags).toEqual(['music']);
    expect(payload.links).toEqual({ registration: 'http://reg' });
    expect(payload.featured).toBe(true);
    expect(payload.objective).toBe('Objective text');
    expect(payload.experience).toBe('Experience text');
    expect(payload.sponsors).toBe('Sponsor text');
    expect(payload.notes).toBe('Notes text');

    // camelCase keys should NOT be in the payload
    expect(payload.coverImage).toBeUndefined();
    expect(payload.socialLinks).toBeUndefined();
    expect(payload.descriptionShort).toBeUndefined();
    expect(payload.endDate).toBeUndefined();
    expect(payload.endTime).toBeUndefined();
    expect(payload.cardImage).toBeUndefined();
  });
});

describe('updateEvent payload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('converts all camelCase fields to snake_case in UPDATE payload', async () => {
    const { updateEvent } = await import('./events.service');

    await updateEvent('e-1', {
      coverImage: 'new-cover.jpg',
      socialLinks: { twitter: 'tw' },
      descriptionShort: 'New short',
      endDate: '2026-05-01',
      endTime: '20:00',
      cardImage: 'new-card.jpg',
    }, false);

    expect(mockUpdate).toHaveBeenCalled();
    const payload = mockUpdate.mock.calls[0]![0] as any;

    expect(payload.cover_image).toBe('new-cover.jpg');
    expect(payload.social_links).toEqual({ twitter: 'tw' });
    expect(payload.description_short).toBe('New short');
    expect(payload.end_date).toBe('2026-05-01');
    expect(payload.end_time).toBe('20:00');
    expect(payload.card_image).toBe('new-card.jpg');

    // camelCase keys must NOT be present
    expect(payload.coverImage).toBeUndefined();
    expect(payload.socialLinks).toBeUndefined();
    expect(payload.descriptionShort).toBeUndefined();
    expect(payload.endDate).toBeUndefined();
    expect(payload.endTime).toBeUndefined();
    expect(payload.cardImage).toBeUndefined();
  });
});
