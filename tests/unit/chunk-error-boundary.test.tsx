// tests/unit/chunk-error-boundary.test.tsx
// Regressao: o ChunkErrorBoundary so pode absorver falhas de carregamento de chunk.
// Qualquer outro erro tem de subir para o ErrorBoundary global (nunca ecra branco).
import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { ChunkErrorBoundary } from '../../router';

/** Boundary "global" de teste: representa o ErrorBoundary de index.tsx. */
class ParentBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; message: string }
> {
  state = { hasError: false, message: '' };
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, message: error.message };
  }
  render() {
    const s = this.state;
    if (s.hasError) {
      return <div data-testid="parent-fallback">GLOBAL: {s.message}</div>;
    }
    return (this as any).props.children;
  }
}

const Boom = ({ error }: { error: Error }): React.ReactElement => {
  throw error;
};

let reloadSpy: ReturnType<typeof vi.fn>;
let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
let originalLocation: Location;

beforeEach(() => {
  // window.location.reload nao e implementado em jsdom -> stub obrigatorio.
  originalLocation = window.location;
  reloadSpy = vi.fn();
  Object.defineProperty(window, 'location', {
    configurable: true,
    writable: true,
    value: { ...originalLocation, reload: reloadSpy },
  });
  sessionStorage.clear();
  // React imprime o erro capturado por boundaries: silenciar ruido.
  consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  consoleErrorSpy.mockRestore();
  Object.defineProperty(window, 'location', {
    configurable: true,
    writable: true,
    value: originalLocation,
  });
  sessionStorage.clear();
});

describe('ChunkErrorBoundary', () => {
  it('NAO absorve erro normal: propaga para o boundary pai, que mostra fallback visivel', () => {
    render(
      <ParentBoundary>
        <ChunkErrorBoundary>
          <Boom error={new Error('boom')} />
        </ChunkErrorBoundary>
      </ParentBoundary>,
    );

    const fallback = screen.getByTestId('parent-fallback');
    expect(fallback).toBeTruthy();
    expect(fallback.textContent).toContain('boom');
    // Regressao do bug antigo: renderizava string vazia (ecra branco).
    expect(document.body.textContent?.trim()).not.toBe('');
    expect(reloadSpy).not.toHaveBeenCalled();
  });

  it('erro de chunk com flag chunk_reload ja gasta: NAO recarrega e mostra UI de recuperacao', () => {
    sessionStorage.setItem('chunk_reload', '1');

    render(
      <ParentBoundary>
        <ChunkErrorBoundary>
          <Boom error={new Error('Failed to fetch dynamically imported module')} />
        </ChunkErrorBoundary>
      </ParentBoundary>,
    );

    // Nao subiu para o boundary global.
    expect(screen.queryByTestId('parent-fallback')).toBeNull();
    // Nao houve reload em loop.
    expect(reloadSpy).not.toHaveBeenCalled();
    // UI de recuperacao visivel (nao `null`).
    expect(screen.getByText(/Atualizacao disponivel/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /Recarregar pagina/i })).toBeTruthy();
  });

  it('o botao de recuperacao limpa a flag chunk_reload do sessionStorage', () => {
    sessionStorage.setItem('chunk_reload', '1');

    render(
      <ChunkErrorBoundary>
        <Boom error={new Error('Failed to fetch dynamically imported module')} />
      </ChunkErrorBoundary>,
    );

    const button = screen.getByRole('button', { name: /Recarregar pagina/i });
    expect(sessionStorage.getItem('chunk_reload')).toBe('1');

    button.click();

    expect(sessionStorage.getItem('chunk_reload')).toBeNull();
    expect(reloadSpy).toHaveBeenCalledTimes(1);
  });

  it('renderiza normalmente os filhos quando nao ha erro', () => {
    render(
      <ChunkErrorBoundary>
        <span data-testid="ok">conteudo</span>
      </ChunkErrorBoundary>,
    );
    expect(screen.getByTestId('ok').textContent).toBe('conteudo');
  });
});
