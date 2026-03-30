import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Mock supabaseClient to avoid env var validation
vi.mock('../../supabaseClient', () => ({
  supabase: { auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null } }) } },
}));

// Mock auth service
vi.mock('../../services/auth.service', () => ({
  logout: vi.fn(),
}));

// Mock Modals to keep test minimal
vi.mock('../ui/Modals', () => ({
  LoginModal: () => null,
}));

// Mock BrandLogo
vi.mock('./BrandLogo', () => ({
  BrandLogo: () => <div data-testid="brand-logo" />,
}));

describe('Header auth reactivity', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('shows "Entrar" button when user is not logged in', async () => {
    const { Header } = await import('./Header');
    render(
      <MemoryRouter initialEntries={['/']}>
        <Header />
      </MemoryRouter>
    );
    expect(screen.getByText('Entrar')).toBeInTheDocument();
  });

  it('shows logout button and username when user is logged in', async () => {
    const { setAuthSession, notifyState } = await import('../../store/app.store');
    setAuthSession({ isLoggedIn: true, role: 'editor', displayName: 'admin@flb.pt' });
    notifyState();

    const { Header } = await import('./Header');
    render(
      <MemoryRouter initialEntries={['/']}>
        <Header />
      </MemoryRouter>
    );

    expect(screen.getByText(/admin@flb\.pt/i)).toBeInTheDocument();
    expect(screen.getByLabelText('Sair da conta')).toBeInTheDocument();
  });

  it('hides logout button and shows "Entrar" after logout', async () => {
    const { setAuthSession, notifyState } = await import('../../store/app.store');
    const { Header } = await import('./Header');

    // Start logged in
    setAuthSession({ isLoggedIn: true, role: 'editor', displayName: 'admin@flb.pt' });
    notifyState();

    render(
      <MemoryRouter initialEntries={['/']}>
        <Header />
      </MemoryRouter>
    );

    expect(screen.getByLabelText('Sair da conta')).toBeInTheDocument();

    // Simulate logout — state changes and event fires
    act(() => {
      setAuthSession({ isLoggedIn: false, role: 'viewer' });
      notifyState();
    });

    expect(screen.getByText('Entrar')).toBeInTheDocument();
    expect(screen.queryByLabelText('Sair da conta')).not.toBeInTheDocument();
  });
});
