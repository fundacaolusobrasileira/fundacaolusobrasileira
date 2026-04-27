import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Supabase mock ──────────────────────────────────────────────────────────
const mockSelect = vi.fn<any>();
const mockInsert = vi.fn<any>(() => ({ select: mockSelect }));
// Update chain now uses .select() to detect RLS silent-filter (BUG 2 fix).
// Default returns one row to keep success-path tests passing.
const mockUpdateEqSelect = vi.fn<any>().mockResolvedValue({ data: [{ id: 'mock-event' }], error: null });
const mockUpdateEq = vi.fn<any>(() => ({ select: mockUpdateEqSelect }));
const mockUpdate = vi.fn<any>(() => ({ eq: mockUpdateEq }));
// Delete chain now uses .select() to detect RLS silent-filter (DELETE pattern fix).
const mockDeleteEqSelect = vi.fn<any>().mockResolvedValue({ data: [{ id: 'mock-event' }], error: null });
const mockDeleteEq = vi.fn<any>(() => ({ select: mockDeleteEqSelect }));
const mockDelete = vi.fn(() => ({ eq: mockDeleteEq }));
const mockOrder = vi.fn();
const mockFrom = vi.fn(() => ({
  select: vi.fn().mockReturnValue({ order: mockOrder }),
  insert: mockInsert,
  update: mockUpdate,
  delete: mockDelete,
}));
vi.mock('../supabaseClient', () => ({ supabase: { from: mockFrom } }));

// ─── Store mock ─────────────────────────────────────────────────────────────
const mockShowToast = vi.fn();
const mockNotifyState = vi.fn();
const mockLogActivity = vi.fn();
const mockSetEventsLoading = vi.fn();
const mockSetEventsError = vi.fn();
const EVENTS: any[] = [];
const PENDING_MEDIA_SUBMISSIONS: any[] = [];
vi.mock('../store/app.store', async () => {
  const actual = await vi.importActual('../store/app.store');
  return {
    ...actual as any,
    isEditor: vi.fn(() => true),
    showToast: mockShowToast,
    notifyState: mockNotifyState,
    logActivity: mockLogActivity,
    EVENTS,
    generateId: vi.fn(() => 'gen-id'),
    PENDING_MEDIA_SUBMISSIONS,
    setEventsLoading: mockSetEventsLoading,
    setEventsError: mockSetEventsError,
  };
});

// ─── Helpers ────────────────────────────────────────────────────────────────
const DB_EVENT = { id: 'ev-1', title: 'Festival', gallery: [], cover_image: null, social_links: {}, description_short: null, end_date: null, end_time: null, card_image: null };

// ============================================================================
// normalizeEvent (via createEvent)
// ============================================================================
describe('normalizeEvent', () => {
  it('maps all snake_case fields to camelCase', async () => {
    vi.resetModules();
    const dbRow = {
      id: 'e-1', title: 'Test Event', cover_image: 'cover.jpg',
      social_links: { facebook: 'fb.com' }, gallery: [],
      description_short: 'Short desc', end_date: '2026-04-01',
      end_time: '18:00', card_image: 'card.jpg',
    };
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

  it('handles malformed gallery JSON without throwing', async () => {
    vi.resetModules();
    mockSelect.mockResolvedValue({ data: [{ ...DB_EVENT, gallery: 'not-json' }], error: null });
    const { createEvent } = await import('./events.service');
    const result = await createEvent({ title: 'T' });
    expect(result?.gallery).toEqual([]);
  });
});

// ============================================================================
// CREATE
// ============================================================================
describe('createEvent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    EVENTS.length = 0;
    mockSelect.mockResolvedValue({ data: [DB_EVENT], error: null });
  });

  it('inserts all event fields in the payload', async () => {
    const { createEvent } = await import('./events.service');
    await createEvent({
      title: 'Festival', subtitle: 'Subtítulo', description: 'Desc',
      descriptionShort: 'Short', date: '2026-04-01', time: '14:00',
      endDate: '2026-04-02', endTime: '18:00', location: 'Lisboa',
      address: 'Rua X', city: 'Lisboa', country: 'Portugal',
      category: 'Outros', tags: ['music'], image: 'img.jpg',
      coverImage: 'cover.jpg', cardImage: 'card.jpg',
      socialLinks: { facebook: 'fb' }, gallery: [],
      links: { registration: 'http://reg' }, status: 'published',
      featured: true, objective: 'Obj', experience: 'Exp',
      sponsorIds: ['sponsor-1', 'sponsor-2'], notes: 'Notes',
    });
    const payload = mockInsert.mock.calls[0]![0]![0] as any;
    expect(payload.cover_image).toBe('cover.jpg');
    expect(payload.social_links).toEqual({ facebook: 'fb' });
    expect(payload.description_short).toBe('Short');
    expect(payload.end_date).toBe('2026-04-02');
    expect(payload.end_time).toBe('18:00');
    expect(payload.card_image).toBe('card.jpg');
    expect(payload.subtitle).toBe('Subtítulo');
    expect(payload.time).toBe('14:00');
    expect(payload.address).toBe('Rua X');
    expect(payload.city).toBe('Lisboa');
    expect(payload.country).toBe('Portugal');
    expect(payload.featured).toBe(true);
    expect(payload.objective).toBe('Obj');
    expect(payload.experience).toBe('Exp');
    // sponsorIds is serialized to JSON string for the 'sponsors' DB column
    expect(payload.sponsors).toBe(JSON.stringify(['sponsor-1', 'sponsor-2']));
    expect(payload.notes).toBe('Notes');
    expect(payload.coverImage).toBeUndefined();
    expect(payload.socialLinks).toBeUndefined();
  });

  it('adds new event to EVENTS store', async () => {
    const { createEvent } = await import('./events.service');
    await createEvent({ title: 'New Event' });
    expect(EVENTS).toHaveLength(1);
  });

  it('shows success toast', async () => {
    const { createEvent } = await import('./events.service');
    await createEvent({ title: 'Event' });
    expect(mockShowToast).toHaveBeenCalledWith('Evento criado.', 'success');
  });

  it('shows error toast and returns null when supabase fails', async () => {
    mockSelect.mockResolvedValueOnce({ data: null, error: new Error('DB error') });
    const { createEvent } = await import('./events.service');
    const result = await createEvent({ title: 'Event' });
    expect(result).toBeNull();
    expect(mockShowToast).toHaveBeenCalledWith('Erro ao criar evento.', 'error');
  });

  it('returns null when not editor', async () => {
    const store = await import('../store/app.store');
    (store.isEditor as any).mockReturnValueOnce(false);
    const { createEvent } = await import('./events.service');
    const result = await createEvent({ title: 'Event' });
    expect(result).toBeNull();
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('defaults status to draft when not provided', async () => {
    const { createEvent } = await import('./events.service');
    await createEvent({ title: 'Event' });
    const payload = mockInsert.mock.calls[0]![0]![0] as any;
    expect(payload.status).toBe('draft');
  });
});

// ============================================================================
// READ (syncEvents)
// ============================================================================
describe('syncEvents', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    EVENTS.length = 0;
  });

  it('populates EVENTS store from database rows', async () => {
    mockOrder.mockResolvedValue({ data: [DB_EVENT], error: null });
    const { syncEvents } = await import('./events.service');
    await syncEvents();
    expect(EVENTS).toHaveLength(1);
    expect(EVENTS[0].id).toBe('ev-1');
  });

  it('normalizes snake_case fields from DB rows', async () => {
    mockOrder.mockResolvedValue({
      data: [{ ...DB_EVENT, cover_image: 'c.jpg', end_date: '2026-05-01' }],
      error: null,
    });
    const { syncEvents } = await import('./events.service');
    await syncEvents();
    expect(EVENTS[0].coverImage).toBe('c.jpg');
    expect(EVENTS[0].endDate).toBe('2026-05-01');
  });

  it('calls notifyState after sync', async () => {
    mockOrder.mockResolvedValue({ data: [DB_EVENT], error: null });
    const { syncEvents } = await import('./events.service');
    await syncEvents();
    expect(mockNotifyState).toHaveBeenCalled();
  });

  it('does nothing when supabase returns error', async () => {
    mockOrder.mockResolvedValue({ data: null, error: new Error('Network') });
    const { syncEvents } = await import('./events.service');
    await syncEvents();
    expect(EVENTS).toHaveLength(0);
  });

  it('sets EVENTS_LOADING to false on success', async () => {
    mockOrder.mockResolvedValue({ data: [DB_EVENT], error: null });
    const { syncEvents } = await import('./events.service');
    await syncEvents();
    expect(mockSetEventsLoading).toHaveBeenLastCalledWith(false);
  });

  it('sets EVENTS_ERROR and EVENTS_LOADING=false on supabase error', async () => {
    mockOrder.mockResolvedValue({ data: null, error: { message: 'Network failure' } });
    const { syncEvents } = await import('./events.service');
    await syncEvents();
    expect(mockSetEventsError).toHaveBeenCalledWith('Network failure');
    expect(mockSetEventsLoading).toHaveBeenLastCalledWith(false);
  });
});

// ============================================================================
// getPublicEvents
// ============================================================================
describe('getPublicEvents', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    EVENTS.length = 0;
  });

  it('returns all events regardless of status', async () => {
    EVENTS.push(
      { id: 'ev-1', title: 'Published', status: 'published', gallery: [] },
      { id: 'ev-2', title: 'Draft', status: 'draft', gallery: [] },
    );
    const { getPublicEvents } = await import('./events.service');
    const result = getPublicEvents();
    expect(result).toHaveLength(2);
  });

  it('returns empty array when EVENTS is empty', async () => {
    const { getPublicEvents } = await import('./events.service');
    expect(getPublicEvents()).toEqual([]);
  });
});

// ============================================================================
// UPDATE
// ============================================================================
describe('updateEvent payload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    EVENTS.length = 0;
    EVENTS.push({ id: 'ev-1', title: 'Existing', gallery: [] });
  });

  it('converts all camelCase fields to snake_case', async () => {
    const { updateEvent } = await import('./events.service');
    await updateEvent('ev-1', {
      coverImage: 'new-cover.jpg', socialLinks: { twitter: 'tw' },
      descriptionShort: 'New short', endDate: '2026-05-01',
      endTime: '20:00', cardImage: 'new-card.jpg',
    }, false);
    const payload = mockUpdate.mock.calls[0]![0] as any;
    expect(payload.cover_image).toBe('new-cover.jpg');
    expect(payload.social_links).toEqual({ twitter: 'tw' });
    expect(payload.description_short).toBe('New short');
    expect(payload.end_date).toBe('2026-05-01');
    expect(payload.end_time).toBe('20:00');
    expect(payload.card_image).toBe('new-card.jpg');
    expect(payload.coverImage).toBeUndefined();
    expect(payload.socialLinks).toBeUndefined();
  });

  it('does not send unknown fields to the database', async () => {
    const { updateEvent } = await import('./events.service');
    await updateEvent('ev-1', { title: 'Valid', id: 'bad' } as any, false);
    const payload = mockUpdate.mock.calls[0]![0] as any;
    expect(payload.title).toBe('Valid');
    expect(payload.id).toBeUndefined();
  });

  it('updates EVENTS store on success', async () => {
    const { updateEvent } = await import('./events.service');
    const ok = await updateEvent('ev-1', { title: 'Updated' }, false);
    expect(ok).toBe(true);
    expect(EVENTS[0].title).toBe('Updated');
  });

  it('shows error toast when supabase update fails', async () => {
    mockUpdateEqSelect.mockResolvedValueOnce({ data: null, error: new Error('Update failed') });
    const { updateEvent } = await import('./events.service');
    const ok = await updateEvent('ev-1', { title: 'Fail' }, true);
    expect(ok).toBe(false);
    expect(mockShowToast).toHaveBeenCalledWith('Erro ao salvar.', 'error');
  });

  it('does nothing when not editor', async () => {
    const store = await import('../store/app.store');
    (store.isEditor as any).mockReturnValueOnce(false);
    const { updateEvent } = await import('./events.service');
    await updateEvent('ev-1', { title: 'No' });
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('shows success toast when notify=true', async () => {
    const { updateEvent } = await import('./events.service');
    await updateEvent('ev-1', { title: 'T' }, true);
    expect(mockShowToast).toHaveBeenCalledWith('Evento salvo.', 'success');
  });
});

// ============================================================================
// DELETE
// ============================================================================
describe('deleteEvent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    EVENTS.length = 0;
    EVENTS.push({ id: 'ev-1', title: 'To Delete', gallery: [] });
    mockDeleteEqSelect.mockResolvedValue({ data: [{ id: 'ev-1' }], error: null });
  });

  it('removes the event from the database', async () => {
    const { deleteEvent } = await import('./events.service');
    await deleteEvent('ev-1');
    expect(mockDeleteEq).toHaveBeenCalledWith('id', 'ev-1');
  });

  it('removes the event from the EVENTS store', async () => {
    const { deleteEvent } = await import('./events.service');
    await deleteEvent('ev-1');
    expect(EVENTS.find(e => e.id === 'ev-1')).toBeUndefined();
  });

  it('shows success toast after deletion', async () => {
    const { deleteEvent } = await import('./events.service');
    await deleteEvent('ev-1');
    expect(mockShowToast).toHaveBeenCalledWith('Evento removido.', 'success');
  });

  it('does NOT remove from store when supabase returns error', async () => {
    mockDeleteEqSelect.mockResolvedValueOnce({ data: null, error: new Error('Delete failed') });
    const { deleteEvent } = await import('./events.service');
    await deleteEvent('ev-1');
    expect(EVENTS).toHaveLength(1);
  });

  it('does nothing when not editor', async () => {
    const store = await import('../store/app.store');
    (store.isEditor as any).mockReturnValueOnce(false);
    const { deleteEvent } = await import('./events.service');
    await deleteEvent('ev-1');
    expect(mockDeleteEq).not.toHaveBeenCalled();
    expect(EVENTS).toHaveLength(1);
  });
});

// ============================================================================
// addUrlMediaToEvent
// ============================================================================
describe('addUrlMediaToEvent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    EVENTS.length = 0;
    EVENTS.push({ id: 'ev-1', title: 'Festival', gallery: [] } as any);
    mockUpdateEqSelect.mockResolvedValue({ data: [{ id: 'mock-event' }], error: null });
  });

  it('adds a valid https URL to the event gallery', async () => {
    const { addUrlMediaToEvent } = await import('./events.service');
    addUrlMediaToEvent('ev-1', 'https://cdn.example.com/photo.jpg');
    // addGalleryItem calls updateEvent internally; wait for the async chain
    await vi.waitFor(() => expect(mockUpdate).toHaveBeenCalled());
    const payload = mockUpdate.mock.calls[0]![0] as any;
    const gallery = payload.gallery;
    expect(Array.isArray(gallery)).toBe(true);
    expect(gallery[0].url).toBe('https://cdn.example.com/photo.jpg');
    expect(gallery[0].source).toBe('oficial');
  });

  it('preserves video kind when adding a URL from the video tab', async () => {
    const { addUrlMediaToEvent } = await import('./events.service');
    addUrlMediaToEvent('ev-1', 'https://youtube.com/watch?v=abc123', 'video');
    await vi.waitFor(() => expect(mockUpdate).toHaveBeenCalled());
    const payload = mockUpdate.mock.calls[0]![0] as any;
    expect(payload.gallery[0].kind).toBe('video');
  });

  it('rejects javascript: URL with toast — gallery unchanged', async () => {
    const { addUrlMediaToEvent } = await import('./events.service');
    await addUrlMediaToEvent('ev-1', 'javascript:alert(1)');
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(mockShowToast).toHaveBeenCalledWith(expect.stringContaining('inválida'), 'error');
  });

  it('rejects URL with leading spaces — gallery unchanged', async () => {
    const { addUrlMediaToEvent } = await import('./events.service');
    await addUrlMediaToEvent('ev-1', '  https://example.com');
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('does nothing when not editor', async () => {
    const store = await import('../store/app.store');
    (store.isEditor as any).mockReturnValueOnce(false);
    const { addUrlMediaToEvent } = await import('./events.service');
    await addUrlMediaToEvent('ev-1', 'https://valid.com/img.jpg');
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  // M-2: function must always resolve to boolean (never undefined)
  it('returns true on success — Promise<boolean> contract', async () => {
    const { addUrlMediaToEvent } = await import('./events.service');
    const result = await addUrlMediaToEvent('ev-1', 'https://valid.com/img.jpg');
    expect(typeof result).toBe('boolean');
    expect(result).toBe(true);
  });

  it('returns false when URL is invalid — Promise<boolean> contract', async () => {
    const { addUrlMediaToEvent } = await import('./events.service');
    const result = await addUrlMediaToEvent('ev-1', 'javascript:alert(1)');
    expect(typeof result).toBe('boolean');
    expect(result).toBe(false);
  });

  it('returns false when not editor — Promise<boolean> contract', async () => {
    const store = await import('../store/app.store');
    (store.isEditor as any).mockReturnValueOnce(false);
    const { addUrlMediaToEvent } = await import('./events.service');
    const result = await addUrlMediaToEvent('ev-1', 'https://valid.com/img.jpg');
    expect(typeof result).toBe('boolean');
    expect(result).toBe(false);
  });
});

// ============================================================================
// approveCommunityMedia
// ============================================================================
describe('approveCommunityMedia', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    EVENTS.length = 0;
    EVENTS.push({ id: 'ev-1', title: 'Festival', gallery: [] } as any);
    PENDING_MEDIA_SUBMISSIONS.length = 0;
    PENDING_MEDIA_SUBMISSIONS.push({
      id: 'sub-1', eventId: 'ev-1', authorName: 'Ana', email: 'a@a.com',
      url: 'https://cdn.example.com/photo.jpg', type: 'image', message: '', status: 'pending',
      createdAt: '2026-04-25T00:00:00Z',
    } as any);
    mockUpdateEqSelect.mockResolvedValue({ data: [{ id: 'mock-event' }], error: null });
  });

  it('moves submission url into event gallery with source: comunidade', async () => {
    const { approveCommunityMedia } = await import('./events.service');
    await approveCommunityMedia('ev-1', 'sub-1');
    await vi.waitFor(() => expect(mockUpdate).toHaveBeenCalled());
    const payload = mockUpdate.mock.calls[0]![0] as any;
    const gallery = payload.gallery;
    expect(gallery[0].url).toBe('https://cdn.example.com/photo.jpg');
    expect(gallery[0].source).toBe('comunidade');
    expect(gallery[0].caption).toContain('Ana');
  });

  it('removes submission from PENDING_MEDIA_SUBMISSIONS after approval', async () => {
    const { approveCommunityMedia } = await import('./events.service');
    await approveCommunityMedia('ev-1', 'sub-1');
    await vi.waitFor(() => expect(PENDING_MEDIA_SUBMISSIONS).toHaveLength(0));
  });

  it('deletes the submission from Supabase after approval', async () => {
    const { approveCommunityMedia } = await import('./events.service');
    await approveCommunityMedia('ev-1', 'sub-1');
    await vi.waitFor(() => expect(mockDeleteEq).toHaveBeenCalledWith('id', 'sub-1'));
  });

  it('shows success toast after approval', async () => {
    const { approveCommunityMedia } = await import('./events.service');
    await approveCommunityMedia('ev-1', 'sub-1');
    await vi.waitFor(() => expect(mockShowToast).toHaveBeenCalledWith('Mídia aprovada.', 'success'));
  });

  it('does nothing when submission not found', async () => {
    const { approveCommunityMedia } = await import('./events.service');
    await approveCommunityMedia('ev-1', 'nonexistent-id');
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('keeps submission in store when Supabase delete fails after approval', async () => {
    mockDeleteEqSelect.mockResolvedValueOnce({ data: null, error: new Error('Delete failed') });
    const { approveCommunityMedia } = await import('./events.service');
    await approveCommunityMedia('ev-1', 'sub-1');
    expect(PENDING_MEDIA_SUBMISSIONS).toHaveLength(1);
    expect(EVENTS[0].gallery).toHaveLength(0);
    expect(mockUpdate).toHaveBeenCalledTimes(2);
    expect(mockShowToast).toHaveBeenCalledWith('Erro ao atualizar submissão de mídia. A publicação foi revertida.', 'error');
  });

  it('does nothing when not editor', async () => {
    const store = await import('../store/app.store');
    (store.isEditor as any).mockReturnValueOnce(false);
    const { approveCommunityMedia } = await import('./events.service');
    await approveCommunityMedia('ev-1', 'sub-1');
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(PENDING_MEDIA_SUBMISSIONS).toHaveLength(1);
  });
});

// ============================================================================
// rejectCommunityMedia
// ============================================================================
describe('rejectCommunityMedia', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    PENDING_MEDIA_SUBMISSIONS.length = 0;
    PENDING_MEDIA_SUBMISSIONS.push({
      id: 'sub-1', eventId: 'ev-1', authorName: 'Ana', email: 'a@a.com',
      url: 'https://cdn.example.com/photo.jpg', type: 'image', message: '', status: 'pending',
      createdAt: '2026-04-25T00:00:00Z',
    } as any);
  });

  it('removes submission from PENDING_MEDIA_SUBMISSIONS', async () => {
    const { rejectCommunityMedia } = await import('./events.service');
    await rejectCommunityMedia('sub-1');
    expect(PENDING_MEDIA_SUBMISSIONS).toHaveLength(0);
  });

  it('shows rejection toast', async () => {
    const { rejectCommunityMedia } = await import('./events.service');
    await rejectCommunityMedia('sub-1');
    expect(mockShowToast).toHaveBeenCalledWith('Mídia rejeitada.', 'info');
  });

  it('does NOT add anything to event gallery', async () => {
    EVENTS.length = 0;
    EVENTS.push({ id: 'ev-1', title: 'Festival', gallery: [] } as any);
    const { rejectCommunityMedia } = await import('./events.service');
    await rejectCommunityMedia('sub-1');
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(EVENTS[0].gallery).toHaveLength(0);
  });

  it('deletes the submission from Supabase when rejecting', async () => {
    const { rejectCommunityMedia } = await import('./events.service');
    await rejectCommunityMedia('sub-1');
    expect(mockDeleteEq).toHaveBeenCalledWith('id', 'sub-1');
  });

  it('does nothing when not editor', async () => {
    const store = await import('../store/app.store');
    (store.isEditor as any).mockReturnValueOnce(false);
    const { rejectCommunityMedia } = await import('./events.service');
    await rejectCommunityMedia('sub-1');
    expect(PENDING_MEDIA_SUBMISSIONS).toHaveLength(1);
  });

  it('keeps submission when Supabase delete fails', async () => {
    mockDeleteEqSelect.mockResolvedValueOnce({ data: null, error: new Error('Delete failed') });
    const { rejectCommunityMedia } = await import('./events.service');
    await rejectCommunityMedia('sub-1');
    expect(PENDING_MEDIA_SUBMISSIONS).toHaveLength(1);
    expect(mockShowToast).toHaveBeenCalledWith('Erro ao rejeitar mídia.', 'error');
  });
});

// ============================================================================
// addMediaToEvent
// ============================================================================
describe('addMediaToEvent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('shows the real error message from storage when upload fails', async () => {
    vi.doMock('./media.service', () => ({
      saveMediaBlob: vi.fn().mockRejectedValue(new Error('The resource already exists')),
    }));
    const { addMediaToEvent } = await import('./events.service');
    await addMediaToEvent('event-1', new File(['x'], 'photo.jpg', { type: 'image/jpeg' }));
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.stringContaining('The resource already exists'), 'error',
    );
  });
});

// ============================================================================
// addEventImagesFromFiles
// ============================================================================
describe('addEventImagesFromFiles', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('does not show a duplicate summary toast after individual uploads', async () => {
    vi.doMock('./media.service', () => ({
      saveMediaBlob: vi.fn().mockResolvedValue('https://cdn.example.com/img.jpg'),
    }));
    const { addEventImagesFromFiles } = await import('./events.service');
    await addEventImagesFromFiles('event-1', [
      new File(['a'], 'a.jpg', { type: 'image/jpeg' }),
      new File(['b'], 'b.jpg', { type: 'image/jpeg' }),
    ]);
    const summaryCall = mockShowToast.mock.calls.find(
      ([msg]) => typeof msg === 'string' && msg.includes('arquivos processados'),
    );
    expect(summaryCall).toBeUndefined();
  });
});

// ============================================================================
// BUG 1 (CRITICAL) — addGalleryItem stale reference produces order collision
// when called in parallel. After the first updateEvent replaces the store
// entry, the second call still reads the stale `event` reference and
// computes the same `order` value.
// ============================================================================
describe('addGalleryItem parallel race (BUG 1)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    EVENTS.length = 0;
    EVENTS.push({ id: 'ev-race', title: 'Race', gallery: [] } as any);
    mockUpdateEqSelect.mockResolvedValue({ data: [{ id: 'mock-event' }], error: null });
  });

  it('assigns distinct order values when 2 URL adds run in parallel', async () => {
    const { addUrlMediaToEvent } = await import('./events.service');

    // Fire both BEFORE awaiting, simulating parallel uploads
    const p1 = addUrlMediaToEvent('ev-race', 'https://cdn.example.com/a.jpg');
    const p2 = addUrlMediaToEvent('ev-race', 'https://cdn.example.com/b.jpg');
    await Promise.all([p1, p2]);

    // Each updateEvent payload should carry a gallery with a distinct trailing item.
    // Collect all gallery items written across both calls
    const allOrders: number[] = [];
    for (const call of mockUpdate.mock.calls) {
      const payload = call[0] as any;
      const gallery = payload.gallery as Array<{ order: number }>;
      if (gallery && gallery.length > 0) {
        allOrders.push(gallery[gallery.length - 1].order);
      }
    }

    // Final stored gallery must have 2 distinct orders (0 and 1), not [0, 0]
    const distinct = new Set(allOrders);
    expect(distinct.size).toBe(allOrders.length);
  });
});

// ============================================================================
// BUG 2 (HIGH) — updateEvent silent-filter false positive
// RLS USING denies → { error: null, data: [] } → must NOT mutate store
// nor show success toast.
// ============================================================================
describe('updateEvent silent-filter false positive (BUG 2)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    EVENTS.length = 0;
    EVENTS.push({ id: 'ev-rls', title: 'Original', gallery: [] } as any);
  });

  it('returns false and does NOT show success toast when RLS silently filters', async () => {
    mockUpdateEqSelect.mockResolvedValueOnce({ data: [], error: null });

    const { updateEvent } = await import('./events.service');
    const result = await updateEvent('ev-rls', { title: 'Hijacked title' });

    expect(result).toBe(false);
    expect(mockShowToast).not.toHaveBeenCalledWith('Evento salvo.', 'success');
  });

  it('does NOT mutate store when RLS silently filters', async () => {
    mockUpdateEqSelect.mockResolvedValueOnce({ data: [], error: null });

    const { updateEvent } = await import('./events.service');
    await updateEvent('ev-rls', { title: 'Hijacked title' });

    expect(EVENTS[0].title).toBe('Original');
  });
});

// ============================================================================
// DELETE silent-filter (HIGH) — same RLS pattern but for DELETE.
// PostgREST returns { error: null, data: [] } when RLS denies DELETE.
// deleteEvent must NOT remove from store nor show success toast.
// ============================================================================
describe('deleteEvent silent-filter false positive', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    EVENTS.length = 0;
    EVENTS.push({ id: 'ev-rls-del', title: 'Persistent', gallery: [] } as any);
  });

  it('returns false and keeps event in store when RLS silently filters DELETE', async () => {
    mockDeleteEqSelect.mockResolvedValueOnce({ data: [], error: null });

    const { deleteEvent } = await import('./events.service');
    const result = await deleteEvent('ev-rls-del');

    expect(result).toBe(false);
    expect(mockShowToast).not.toHaveBeenCalledWith('Evento removido.', 'success');
    expect(EVENTS).toHaveLength(1);
    expect(EVENTS[0].id).toBe('ev-rls-del');
  });
});
