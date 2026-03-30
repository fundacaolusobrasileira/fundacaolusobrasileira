import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

// Mock deps — now from services, not App
vi.mock('./services/members.service', () => ({
  createMember: vi.fn(),
  updateMember: vi.fn(),
}));

vi.mock('./services/auth.service', () => ({
  loginAsEditor: vi.fn(),
}));

vi.mock('./services/media.service', () => ({
  saveMediaBlob: vi.fn(),
}));

vi.mock('./services/events.service', () => ({
  createEvent: vi.fn(),
  updateEvent: vi.fn(),
  deleteEvent: vi.fn(),
  addMediaToEvent: vi.fn(),
  addUrlMediaToEvent: vi.fn(),
  addEventImagesFromFiles: vi.fn(),
  approveCommunityMedia: vi.fn(),
  rejectCommunityMedia: vi.fn(),
}));

vi.mock('./services/precadastros.service', () => ({
  updatePreCadastro: vi.fn(),
  deletePreCadastro: vi.fn(),
  convertPreCadastroToMember: vi.fn(),
}));

vi.mock('./store/app.store', () => ({
  AUTH_SESSION: { isLoggedIn: true, role: 'editor' },
  EVENTS: [],
  PRECADASTROS: [],
  PENDING_MEDIA_SUBMISSIONS: [],
  isEditor: vi.fn(() => true),
  showToast: vi.fn(),
  generateId: vi.fn(() => 'test-id'),
  FLB_STATE_EVENT: 'flb_state_update',
  FLB_TOAST_EVENT: 'flb_toast_event',
  resolveGalleryItemSrc: vi.fn(),
  exportState: vi.fn(),
  importState: vi.fn(),
}));

vi.mock('./hooks/useAuthSession', () => ({
  useAuthSession: () => ({ isLoggedIn: true, role: 'editor' }),
}));

describe('MemberEditorModal - handleSave', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('resets loading to false when createMember throws an exception', async () => {
    const AppModule = await import('./services/members.service');
    (AppModule.createMember as any).mockRejectedValue(new Error('Network error'));

    const { MemberEditorModal } = await import('./component.ui');
    const onClose = vi.fn();

    render(
      <MemberEditorModal
        isOpen={true}
        onClose={onClose}
        member={{ name: 'Test Member' }}
      />
    );

    const saveBtn = screen.getByText('Salvar Membro');
    fireEvent.click(saveBtn);

    // Button should enter loading state
    await waitFor(() => {
      expect(screen.getByText('Salvando...')).toBeInTheDocument();
    });

    // After error, loading must be reset — button should NOT stay as "Salvando..."
    await waitFor(() => {
      expect(screen.queryByText('Salvando...')).not.toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('resets loading to false when createMember returns null (Supabase error)', async () => {
    const AppModule = await import('./services/members.service');
    (AppModule.createMember as any).mockResolvedValue(null);

    const { MemberEditorModal } = await import('./component.ui');
    const onClose = vi.fn();

    render(
      <MemberEditorModal
        isOpen={true}
        onClose={onClose}
        member={{ name: 'Test Member' }}
      />
    );

    fireEvent.click(screen.getByText('Salvar Membro'));

    await waitFor(() => {
      expect(screen.queryByText('Salvando...')).not.toBeInTheDocument();
    }, { timeout: 3000 });

    // Modal should NOT close when creation failed
    expect(onClose).not.toHaveBeenCalled();
  });

  it('closes modal after successful member creation', async () => {
    const AppModule = await import('./services/members.service');
    (AppModule.createMember as any).mockResolvedValue({ id: 'new-1', name: 'Novo Membro' });
    (AppModule.updateMember as any).mockResolvedValue(undefined);

    const { MemberEditorModal } = await import('./component.ui');
    const onClose = vi.fn();

    render(
      <MemberEditorModal
        isOpen={true}
        onClose={onClose}
        member={{ name: 'Test Member' }}
      />
    );

    fireEvent.click(screen.getByText('Salvar Membro'));

    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    }, { timeout: 3000 });
  });
});
