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
  PARTNERS: [],
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
    (AppModule.updateMember as any).mockResolvedValue(true);

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

describe('MemberEditorModal — field completeness', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('renders a field for summary (resumo curto)', async () => {
    const { MemberEditorModal } = await import('./component.ui');
    render(<MemberEditorModal isOpen={true} onClose={vi.fn()} member={{ id: 'x', name: 'Test', type: 'pessoa', category: 'Governança' }} />);
    // Should have a textarea or input for "resumo" / "summary"
    expect(screen.getByPlaceholderText(/resumo/i)).toBeTruthy();
  });

  it('renders a field for full biography', async () => {
    const { MemberEditorModal } = await import('./component.ui');
    render(<MemberEditorModal isOpen={true} onClose={vi.fn()} member={{ id: 'x', name: 'Test', type: 'pessoa', category: 'Governança' }} />);
    expect(screen.getByPlaceholderText(/biografia completa/i)).toBeTruthy();
  });

  it('renders a field for country (país)', async () => {
    const { MemberEditorModal } = await import('./component.ui');
    render(<MemberEditorModal isOpen={true} onClose={vi.fn()} member={{ id: 'x', name: 'Test', type: 'pessoa', category: 'Governança' }} />);
    expect(screen.getByPlaceholderText(/país/i)).toBeTruthy();
  });

  it('renders a field for institutional tier', async () => {
    const { MemberEditorModal } = await import('./component.ui');
    render(<MemberEditorModal isOpen={true} onClose={vi.fn()} member={{ id: 'x', name: 'Test', type: 'pessoa', category: 'Governança' }} />);
    expect(screen.getByLabelText(/cargo institucional/i)).toBeTruthy();
  });
});

describe('EventEditorModal — field completeness', () => {
  const baseEvent = { id: 'ev-1', title: 'Festa', category: 'Outros', gallery: [], socialLinks: {} };

  beforeEach(() => {
    vi.resetModules();
  });

  it('renders subtitle field', async () => {
    const { EventEditorModal } = await import('./component.ui');
    render(<EventEditorModal isOpen={true} onClose={vi.fn()} event={baseEvent} />);
    expect(screen.getByPlaceholderText(/subtítulo/i)).toBeTruthy();
  });

  it('renders start time field', async () => {
    const { EventEditorModal } = await import('./component.ui');
    render(<EventEditorModal isOpen={true} onClose={vi.fn()} event={baseEvent} />);
    expect(screen.getByText(/hora início/i)).toBeTruthy();
  });

  it('renders end date field', async () => {
    const { EventEditorModal } = await import('./component.ui');
    render(<EventEditorModal isOpen={true} onClose={vi.fn()} event={baseEvent} />);
    expect(screen.getByText(/data fim/i)).toBeTruthy();
  });

  it('renders end time field', async () => {
    const { EventEditorModal } = await import('./component.ui');
    render(<EventEditorModal isOpen={true} onClose={vi.fn()} event={baseEvent} />);
    expect(screen.getByText(/hora fim/i)).toBeTruthy();
  });

  it('renders address field', async () => {
    const { EventEditorModal } = await import('./component.ui');
    render(<EventEditorModal isOpen={true} onClose={vi.fn()} event={baseEvent} />);
    expect(screen.getByPlaceholderText(/morada|endereço|address/i)).toBeTruthy();
  });

  it('renders city field', async () => {
    const { EventEditorModal } = await import('./component.ui');
    render(<EventEditorModal isOpen={true} onClose={vi.fn()} event={baseEvent} />);
    expect(screen.getByPlaceholderText(/cidade/i)).toBeTruthy();
  });

  it('renders country field', async () => {
    const { EventEditorModal } = await import('./component.ui');
    render(<EventEditorModal isOpen={true} onClose={vi.fn()} event={baseEvent} />);
    expect(screen.getByPlaceholderText(/país.*evento|país/i)).toBeTruthy();
  });

  it('renders descriptionShort field', async () => {
    const { EventEditorModal } = await import('./component.ui');
    render(<EventEditorModal isOpen={true} onClose={vi.fn()} event={baseEvent} />);
    expect(screen.getByPlaceholderText(/descrição curta|resumo/i)).toBeTruthy();
  });

  it('renders status toggle (draft/published)', async () => {
    const { EventEditorModal } = await import('./component.ui');
    render(<EventEditorModal isOpen={true} onClose={vi.fn()} event={baseEvent} />);
    expect(screen.getByText(/publicado|rascunho|draft/i)).toBeTruthy();
  });

  it('renders featured toggle', async () => {
    const { EventEditorModal } = await import('./component.ui');
    render(<EventEditorModal isOpen={true} onClose={vi.fn()} event={baseEvent} />);
    expect(screen.getByText(/destaque/i)).toBeTruthy();
  });

  it('renders objective field', async () => {
    const { EventEditorModal } = await import('./component.ui');
    render(<EventEditorModal isOpen={true} onClose={vi.fn()} event={baseEvent} />);
    expect(screen.getByPlaceholderText(/objetivo/i)).toBeTruthy();
  });

  it('renders experience field', async () => {
    const { EventEditorModal } = await import('./component.ui');
    render(<EventEditorModal isOpen={true} onClose={vi.fn()} event={baseEvent} />);
    expect(screen.getByPlaceholderText(/experiência/i)).toBeTruthy();
  });

  it('renders sponsors field', async () => {
    const { EventEditorModal } = await import('./component.ui');
    render(<EventEditorModal isOpen={true} onClose={vi.fn()} event={baseEvent} />);
    expect(screen.getByText(/patrocinadores/i)).toBeTruthy();
  });

  it('renders notes field', async () => {
    const { EventEditorModal } = await import('./component.ui');
    render(<EventEditorModal isOpen={true} onClose={vi.fn()} event={baseEvent} />);
    expect(screen.getByPlaceholderText(/notas|observações/i)).toBeTruthy();
  });
});
