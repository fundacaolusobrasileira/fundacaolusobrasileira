// services/media.service.test.ts
// Unit: MediaUploadSchema constraints (size, MIME) — each rule one test.
// Integration: service rejects invalid file WITHOUT calling storage; valid file calls storage.
// E2E: user tries to upload large file in event editor → toast error (Phase 3, test-strategy.md 0.5).

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MediaUploadSchema } from '../validation/schemas';

// --- Unit tests for MediaUploadSchema ---
describe('MediaUploadSchema (unit)', () => {
  const makeFile = (name: string, type: string, sizeBytes: number) =>
    Object.defineProperty(new File(['x'], name, { type }), 'size', { value: sizeBytes });

  it('accepts a valid JPEG under 5MB', () => {
    const f = makeFile('photo.jpg', 'image/jpeg', 1024 * 1024);
    expect(() => MediaUploadSchema.parse(f)).not.toThrow();
  });

  it('accepts PNG, WEBP, MP4', () => {
    for (const [name, type] of [['a.png', 'image/png'], ['a.webp', 'image/webp'], ['a.mp4', 'video/mp4']]) {
      expect(() => MediaUploadSchema.parse(makeFile(name, type, 100))).not.toThrow();
    }
  });

  it('rejects file exceeding 5MB', () => {
    const f = makeFile('big.jpg', 'image/jpeg', 5 * 1024 * 1024 + 1);
    expect(() => MediaUploadSchema.parse(f)).toThrow();
  });

  // BUG 5 — schema must align with storage RLS policy that allows
  // jpg/jpeg/png/gif/webp/svg/mp4/mov/webm/pdf extensions.
  it('accepts GIF (storage RLS allows it)', () => {
    const f = makeFile('anim.gif', 'image/gif', 100);
    expect(() => MediaUploadSchema.parse(f)).not.toThrow();
  });

  it('accepts SVG (storage RLS allows it)', () => {
    const f = makeFile('icon.svg', 'image/svg+xml', 100);
    expect(() => MediaUploadSchema.parse(f)).not.toThrow();
  });

  it('accepts MOV (storage RLS allows it)', () => {
    const f = makeFile('clip.mov', 'video/quicktime', 100);
    expect(() => MediaUploadSchema.parse(f)).not.toThrow();
  });

  it('accepts WEBM (storage RLS allows it)', () => {
    const f = makeFile('clip.webm', 'video/webm', 100);
    expect(() => MediaUploadSchema.parse(f)).not.toThrow();
  });

  it('accepts PDF (storage RLS allows it)', () => {
    const f = makeFile('doc.pdf', 'application/pdf', 100);
    expect(() => MediaUploadSchema.parse(f)).not.toThrow();
  });

  it('rejects truly unsupported MIME type (zip)', () => {
    const f = makeFile('archive.zip', 'application/zip', 100);
    expect(() => MediaUploadSchema.parse(f)).toThrow();
  });

  it('rejects truly unsupported MIME type (executable)', () => {
    const f = makeFile('virus.exe', 'application/x-msdownload', 100);
    expect(() => MediaUploadSchema.parse(f)).toThrow();
  });
});

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

  // BUG: Date.now() collides when 2 uploads happen in the same millisecond
  // with the same filename. File names must be unique even at sub-ms resolution.
  it('produces distinct filenames for parallel uploads with the same source name', async () => {
    mockUpload.mockResolvedValue({ error: null });
    const { saveMediaBlob } = await import('./media.service');
    const file = new File(['content'], 'photo.jpg', { type: 'image/jpeg' });

    // Fire many uploads in parallel — all in the same tick
    await Promise.all([
      saveMediaBlob(file), saveMediaBlob(file), saveMediaBlob(file),
      saveMediaBlob(file), saveMediaBlob(file),
    ]);

    const fileNames = mockUpload.mock.calls.map(call => call[0] as string);
    const uniqueFileNames = new Set(fileNames);
    expect(uniqueFileNames.size).toBe(fileNames.length);
  });
});

describe('saveCommunityMediaBlob', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('rejects file > 5MB before calling storage', async () => {
    const { saveCommunityMediaBlob } = await import('./media.service');
    const bigFile = Object.defineProperty(
      new File(['x'], 'big.mp4', { type: 'video/mp4' }),
      'size', { value: 5 * 1024 * 1024 + 1 }
    );

    await expect(saveCommunityMediaBlob(bigFile)).rejects.toThrow(/5MB/i);
    expect(mockUpload).not.toHaveBeenCalled();
  });

  it('rejects unsupported MIME type before calling storage', async () => {
    const { saveCommunityMediaBlob } = await import('./media.service');
    // application/zip is not in the allowed list (post-BUG 5 fix)
    const zipFile = new File(['x'], 'archive.zip', { type: 'application/zip' });

    await expect(saveCommunityMediaBlob(zipFile)).rejects.toThrow(/não suportado/i);
    expect(mockUpload).not.toHaveBeenCalled();
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

  it('rejects file > 5MB WITHOUT calling storage', async () => {
    const { uploadSingleImage } = await import('./media.service');
    const bigFile = Object.defineProperty(
      new File(['x'], 'big.jpg', { type: 'image/jpeg' }),
      'size', { value: 5 * 1024 * 1024 + 1 }
    );
    const url = await uploadSingleImage(bigFile);
    expect(url).toBeNull();
    expect(mockUpload).not.toHaveBeenCalled();
    expect(mockShowToast).toHaveBeenCalledWith(expect.any(String), 'error');
  });

  it('rejects unsupported MIME WITHOUT calling storage', async () => {
    const { uploadSingleImage } = await import('./media.service');
    // application/zip is not in the allowed list (post-BUG 5 fix)
    const zipFile = new File(['x'], 'archive.zip', { type: 'application/zip' });
    const url = await uploadSingleImage(zipFile);
    expect(url).toBeNull();
    expect(mockUpload).not.toHaveBeenCalled();
    expect(mockShowToast).toHaveBeenCalledWith(expect.any(String), 'error');
  });
});

// ============================================================================
// INTEGRATION — deleteMediaBlob
// ============================================================================
describe('deleteMediaBlob (integration)', () => {
  const mockRemove = vi.fn().mockResolvedValue({});

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockRemove.mockResolvedValue({});
    vi.doMock('../supabaseClient', () => ({
      supabase: {
        storage: {
          from: vi.fn(() => ({
            upload: mockUpload,
            getPublicUrl: mockGetPublicUrl,
            remove: mockRemove,
          })),
        },
      },
    }));
  });

  it('calls storage.remove with the fileName extracted from the URL', async () => {
    const { deleteMediaBlob } = await import('./media.service');
    await deleteMediaBlob('https://cdn.example.com/media/1234-photo.jpg');
    expect(mockRemove).toHaveBeenCalledWith(['1234-photo.jpg']);
  });

  it('preserves nested folder path for community uploads', async () => {
    const { deleteMediaBlob } = await import('./media.service');
    await deleteMediaBlob('https://project.supabase.co/storage/v1/object/public/media/community/1234-photo.jpg');
    expect(mockRemove).toHaveBeenCalledWith(['community/1234-photo.jpg']);
  });

  it('silently ignores storage errors — does not throw', async () => {
    mockRemove.mockRejectedValue(new Error('permission denied'));
    const { deleteMediaBlob } = await import('./media.service');
    await expect(deleteMediaBlob('https://cdn.example.com/media/file.jpg')).resolves.toBeUndefined();
  });

  it('does nothing when URL has no path segments', async () => {
    const { deleteMediaBlob } = await import('./media.service');
    await deleteMediaBlob('');
    expect(mockRemove).not.toHaveBeenCalled();
  });
});
