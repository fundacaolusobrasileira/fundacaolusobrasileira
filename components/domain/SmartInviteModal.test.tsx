import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';

const authSession = { isLoggedIn: false };

vi.mock('../../services/precadastros.service', () => ({
  subscribeToNewsletter: vi.fn(),
}));

vi.mock('../../store/app.store', () => ({
  AUTH_SESSION: authSession,
  FLB_STATE_EVENT: 'flb_state_update',
}));

describe('SmartInviteModal', () => {
  beforeEach(() => {
    localStorage.clear();
    authSession.isLoggedIn = false;
    vi.useFakeTimers();
  });

  it('não abre para utilizador autenticado', async () => {
    authSession.isLoggedIn = true;
    const { SmartInviteModal } = await import('./SmartInviteModal');

    render(<SmartInviteModal />);

    act(() => {
      vi.advanceTimersByTime(16000);
    });

    expect(screen.queryByText(/junte-se à comunidade/i)).not.toBeInTheDocument();
  });

  it('fecha se o utilizador fizer login antes do timer terminar', async () => {
    const { SmartInviteModal } = await import('./SmartInviteModal');
    render(<SmartInviteModal />);

    authSession.isLoggedIn = true;
    act(() => {
      window.dispatchEvent(new Event('flb_state_update'));
      vi.advanceTimersByTime(16000);
    });

    expect(screen.queryByText(/junte-se à comunidade/i)).not.toBeInTheDocument();
  });
});
