import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock supabase storage
const mockGetPublicUrl = vi.fn(() => ({ data: { publicUrl: 'https://cdn.example.com/test.jpg' } }));
const mockUpload = vi.fn();
const mockStorage = {
  from: vi.fn(() => ({
    upload: mockUpload,
    getPublicUrl: mockGetPublicUrl,
    remove: vi.fn().mockResolvedValue({}),
  })),
};
vi.mock('../supabaseClient', () => ({ supabase: { storage: mockStorage } }));
const mockShowToast = vi.fn();
vi.mock('../store/app.store', () => ({ logActivity: vi.fn(), showToast: mockShowToast }));

describe('saveMediaBlob', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses upsert: true to avoid 409 on duplicate file names', async () => {
    mockUpload.mockResolvedValue({ error: null });
    const { saveMediaBlob } = await import('./media.service');
    const file = new File(['content'], 'photo.jpg', { type: 'image/jpeg' });

    await saveMediaBlob(file);

    expect(mockUpload).toHaveBeenCalledWith(
      expect.any(String),
      file,
      expect.objectContaining({ upsert: true }),
    );
  });

  it('throws when storage returns an error', async () => {
    mockUpload.mockResolvedValue({ error: new Error('Storage permission denied') });
    const { saveMediaBlob } = await import('./media.service');
    const file = new File(['content'], 'photo.jpg', { type: 'image/jpeg' });

    await expect(saveMediaBlob(file)).rejects.toThrow('Storage permission denied');
  });

  it('returns the public URL on success', async () => {
    mockUpload.mockResolvedValue({ error: null });
    const { saveMediaBlob } = await import('./media.service');
    const file = new File(['content'], 'photo.jpg', { type: 'image/jpeg' });

    const url = await saveMediaBlob(file);

    expect(url).toBe('https://cdn.example.com/test.jpg');
  });
});

describe('uploadSingleImage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('returns the public URL when upload succeeds', async () => {
    mockUpload.mockResolvedValue({ error: null });
    const { uploadSingleImage } = await import('./media.service');
    const file = new File(['content'], 'cover.jpg', { type: 'image/jpeg' });

    const url = await uploadSingleImage(file);

    expect(url).toBe('https://cdn.example.com/test.jpg');
  });

  it('shows real error message and returns null when upload fails', async () => {
    mockUpload.mockResolvedValue({ error: new Error('Bucket not found') });
    const { uploadSingleImage } = await import('./media.service');
    const file = new File(['content'], 'cover.jpg', { type: 'image/jpeg' });

    const url = await uploadSingleImage(file);

    expect(url).toBeNull();
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.stringContaining('Bucket not found'),
      'error',
    );
  });
});
