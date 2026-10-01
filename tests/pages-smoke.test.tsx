// tests/pages-smoke.test.tsx
//
// Smoke tests de render das páginas públicas.
//
// PORQUÊ: durante semanas TODAS as páginas de perfil de parceiro estiveram
// partidas em produção (`partner.bioFull` só existe no seed estático; os
// parceiros vindos do banco têm o texto em `full`) e ninguém deu por isso,
// porque um error boundary devolvia `null` — ecrã branco silencioso.
// Nenhum dos testes existentes montava sequer uma página.
//
// Estes testes são deliberadamente TOLERANTES: só verificam que a página
// monta sem lançar e produz DOM. A exceção é o ParceiroPerfilPage, que usa
// um parceiro com a forma REAL do banco (sem `bioFull`, só com `full`) para
// que a regressão volte a falhar aqui em vez de em produção.

import React from 'react';
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

// ─── Supabase mock (sem rede) ───────────────────────────────────────────────
// Cadeia genérica: todos os métodos do postgrest devolvem a própria cadeia e
// a cadeia é "thenable", por isso qualquer `await supabase.from(...)...`
// resolve para `{ data: [], error: null }`.
vi.mock('../supabaseClient', () => {
  const chain: any = {};
  const chainable = [
    'select', 'insert', 'update', 'upsert', 'delete',
    'eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'like', 'ilike', 'is', 'in',
    'contains', 'or', 'filter', 'match', 'not',
    'order', 'limit', 'range', 'abortSignal',
  ];
  for (const method of chainable) chain[method] = () => chain;
  chain.single = () => Promise.resolve({ data: null, error: null });
  chain.maybeSingle = () => Promise.resolve({ data: null, error: null });
  chain.then = (resolve: any, reject: any) =>
    Promise.resolve({ data: [], error: null, count: 0 }).then(resolve, reject);

  return {
    supabase: {
      from: () => chain,
      rpc: () => chain,
      storage: {
        from: () => ({
          upload: () => Promise.resolve({ data: null, error: null }),
          remove: () => Promise.resolve({ data: null, error: null }),
          getPublicUrl: () => ({ data: { publicUrl: '' } }),
          createSignedUrl: () => Promise.resolve({ data: null, error: null }),
        }),
      },
      auth: {
        getUser: () => Promise.resolve({ data: { user: null }, error: null }),
        getSession: () => Promise.resolve({ data: { session: null }, error: null }),
        signInWithPassword: () =>
          Promise.resolve({ data: { user: null, session: null }, error: null }),
        signUp: () => Promise.resolve({ data: { user: null, session: null }, error: null }),
        signOut: () => Promise.resolve({ error: null }),
        resetPasswordForEmail: () => Promise.resolve({ data: null, error: null }),
        updateUser: () => Promise.resolve({ data: { user: null }, error: null }),
        onAuthStateChange: () => ({
          data: { subscription: { unsubscribe: () => {} } },
        }),
      },
      functions: { invoke: () => Promise.resolve({ data: null, error: null }) },
      channel: () => {
        const ch: any = { on: () => ch, subscribe: () => ch, unsubscribe: () => ch };
        return ch;
      },
      removeChannel: () => {},
    },
  };
});

// ─── Páginas ────────────────────────────────────────────────────────────────
import { HomePage } from '../pages/home/HomePage';
import { QuemSomosPage } from '../pages/quem-somos/QuemSomosPage';
import { ParceirosPage } from '../pages/parceiros/ParceirosPage';
import { ParceiroPerfilPage } from '../pages/parceiros/ParceiroPerfilPage';
import { EventosPage } from '../pages/eventos/EventosPage';
import { EventoDetalhePage } from '../pages/eventos/EventoDetalhePage';
import { DocumentacaoPage } from '../pages/documentacao/DocumentacaoPage';
import { BeneficiosPage } from '../pages/beneficios/BeneficiosPage';
import { PrivacyPage, TermsPage } from '../pages/legal/LegalPage';
import { ContactoPage } from '../pages/contacto/ContactoPage';
import { LoginPage } from '../pages/auth/LoginPage';
import { PreCadastroPage } from '../pages/auth/PreCadastroPage';
import { PARTNERS } from '../store/app.store';

// ─── Polyfills de jsdom ─────────────────────────────────────────────────────
beforeAll(() => {
  if (!(globalThis as any).IntersectionObserver) {
    function FakeIntersectionObserver(this: any, cb: any) {
      this.root = null;
      this.rootMargin = '';
      this.thresholds = [];
      this.observe = (target: Element) => {
        cb([{ isIntersecting: true, target }], this);
      };
      this.unobserve = () => {};
      this.disconnect = () => {};
      this.takeRecords = () => [];
    }
    (globalThis as any).IntersectionObserver = FakeIntersectionObserver as any;
    (window as any).IntersectionObserver = FakeIntersectionObserver as any;
  }
  // jsdom não implementa scroll; várias páginas chamam window.scrollTo no mount.
  window.scrollTo = (() => {}) as any;
  (window as any).scroll = () => {};
});

afterEach(() => {
  cleanup();
  PARTNERS.length = 0;
});

// ─── Helpers ────────────────────────────────────────────────────────────────
const renderAt = (ui: React.ReactElement, path = '/') =>
  render(<MemoryRouter initialEntries={[path]}>{ui}</MemoryRouter>);

/** Asserção deliberadamente tolerante: a página montou e produziu DOM. */
const expectMounted = async (container: HTMLElement) => {
  await waitFor(() => {
    expect(container.innerHTML.trim().length).toBeGreaterThan(0);
  });
};

// ============================================================================
// Páginas institucionais
// ============================================================================
describe('render das páginas públicas', () => {
  it('HomePage monta sem lançar', async () => {
    const { container } = renderAt(<HomePage />, '/');
    await expectMounted(container);
  });

  it('QuemSomosPage monta sem lançar', async () => {
    const { container } = renderAt(<QuemSomosPage />, '/quem-somos');
    await expectMounted(container);
  });

  it('ParceirosPage monta sem lançar', async () => {
    const { container } = renderAt(<ParceirosPage />, '/parceiros');
    await expectMounted(container);
  });

  it('EventosPage monta sem lançar', async () => {
    const { container } = renderAt(<EventosPage />, '/eventos');
    await expectMounted(container);
  });

  it('EventoDetalhePage monta sem lançar (evento inexistente)', async () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/eventos/sem-evento']}>
        <Routes>
          <Route path="/eventos/:id" element={<EventoDetalhePage />} />
        </Routes>
      </MemoryRouter>
    );
    await expectMounted(container);
  });

  it('DocumentacaoPage monta sem lançar', async () => {
    const { container } = renderAt(<DocumentacaoPage />, '/documentacao');
    await expectMounted(container);
  });

  it('BeneficiosPage monta sem lançar', async () => {
    const { container } = renderAt(<BeneficiosPage />, '/beneficios');
    await expectMounted(container);
  });

  it('LegalPage (Privacidade) monta sem lançar', async () => {
    const { container } = renderAt(<PrivacyPage />, '/privacidade');
    await expectMounted(container);
  });

  it('LegalPage (Termos) monta sem lançar', async () => {
    const { container } = renderAt(<TermsPage />, '/termos');
    await expectMounted(container);
  });

  it('ContactoPage monta sem lançar', async () => {
    const { container } = renderAt(<ContactoPage />, '/contacto');
    await expectMounted(container);
  });

  it('LoginPage monta sem lançar', async () => {
    const { container } = renderAt(<LoginPage />, '/login');
    await expectMounted(container);
  });

  it('PreCadastroPage monta sem lançar', async () => {
    const { container } = renderAt(<PreCadastroPage />, '/pre-cadastro');
    await expectMounted(container);
  });
});

// ============================================================================
// REGRESSÃO bioFull — o bug que ninguém viu durante semanas
// ============================================================================
describe('ParceiroPerfilPage — parceiro vindo do banco', () => {
  // Forma REAL de uma linha de `partners` normalizada: NÃO tem `bioFull`
  // nem `pageRoute`; o texto longo vive em `full`.
  const dbPartner: any = {
    id: 'p-db-1',
    name: 'Parceiro de Teste',
    type: 'empresa',
    category: 'Parceiro Gold',
    image: 'https://example.com/logo.png',
    country: 'Portugal',
    bio: 'Resumo curto do parceiro.',
    full: 'Primeiro parágrafo do texto longo.\n\nSegundo parágrafo do texto longo.',
    website: 'https://example.com',
    tags: ['Jurídico', 'Inovação'],
    since: '2024',
    active: true,
  };

  it('renderiza o perfil usando `full` (sem `bioFull`) sem lançar', async () => {
    PARTNERS.push(dbPartner);

    const { container } = render(
      <MemoryRouter initialEntries={['/parceiros/p-db-1']}>
        <Routes>
          <Route path="/parceiros/:id" element={<ParceiroPerfilPage />} />
        </Routes>
      </MemoryRouter>
    );

    await expectMounted(container);
    // Se alguém voltar a ler apenas `partner.bioFull`, o render rebenta com
    // "Cannot read properties of undefined (reading 'split')" e este teste cai.
    expect(await screen.findByText('Parceiro de Teste')).toBeInTheDocument();
    expect(
      await screen.findByText('Primeiro parágrafo do texto longo.')
    ).toBeInTheDocument();
    expect(
      await screen.findByText('Segundo parágrafo do texto longo.')
    ).toBeInTheDocument();
  });

  it('não rebenta quando o parceiro do banco não tem texto longo', async () => {
    PARTNERS.push({ ...dbPartner, id: 'p-db-2', full: undefined });

    const { container } = render(
      <MemoryRouter initialEntries={['/parceiros/p-db-2']}>
        <Routes>
          <Route path="/parceiros/:id" element={<ParceiroPerfilPage />} />
        </Routes>
      </MemoryRouter>
    );

    await expectMounted(container);
    expect(await screen.findByText('Parceiro de Teste')).toBeInTheDocument();
  });
});
