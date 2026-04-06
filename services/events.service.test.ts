import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Supabase mock ──────────────────────────────────────────────────────────
const mockSelect = vi.fn<any>();
const mockInsert = vi.fn<any>(() => ({ select: mockSelect }));
const mockUpdateEq = vi.fn().mockResolvedValue({ error: null });
const mockUpdate = vi.fn<any>(() => ({ eq: mockUpdateEq }));
const mockDeleteEq = vi.fn().mockResolvedValue({ error: null });
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
    PENDING_MEDIA_SUBMISSIONS: [],
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
      sponsors: 'Sponsor', notes: 'Notes',
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
    expect(payload.sponsors).toBe('Sponsor');
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
    await updateEvent('ev-1', { title: 'Updated' }, false);
    expect(EVENTS[0].title).toBe('Updated');
  });

  it('shows error toast when supabase update fails', async () => {
    mockUpdateEq.mockResolvedValueOnce({ error: new Error('Update failed') });
    const { updateEvent } = await import('./events.service');
    await updateEvent('ev-1', { title: 'Fail' }, true);
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
    mockDeleteEq.mockResolvedValue({ error: null });
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
    mockDeleteEq.mockResolvedValueOnce({ error: new Error('Delete failed') });
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
