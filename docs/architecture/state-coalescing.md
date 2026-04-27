# State Coalescing — `notifyState()`

## Overview

`notifyState()` em `store/app.store.ts` é o mecanismo de re-render reativo da app. Componentes subscrevem `window.addEventListener('flb_state_update', ...)` e fazem `setTick(t => t + 1)` para forçar re-render quando os arrays mutáveis do store mudam.

Para evitar tempestade de re-renders quando vários services mutam o store no mesmo tick (e.g., durante `syncEvents` + `syncPartners` + `syncPreCadastros` em sequência), `notifyState()` está **coalesced via microtask queue**.

## Implementação

```ts
let stateNotifyPending = false;
export const notifyState = () => {
  if (typeof window === 'undefined' || stateNotifyPending) return;
  stateNotifyPending = true;
  queueMicrotask(() => {
    stateNotifyPending = false;
    window.dispatchEvent(new Event(FLB_STATE_EVENT));
  });
};
```

### Garantias

- **N chamadas síncronas no mesmo tick → 1 só evento dispatched**
- **2 chamadas em ticks diferentes → 2 eventos** (não há throttle agressivo)
- **Custo**: 1 microtask de delay no re-render (sub-milissegundo, imperceptível)

## Implicações para testes

Componentes/hooks que mutam o store via `setAuthSession + notifyState` e fazem assertions imediatas precisam **flush microtask queue**:

```ts
// ANTES (assumindo dispatch síncrono — falhará agora):
act(() => {
  setAuthSession({ ... });
  notifyState();
});
expect(result.current.isLoggedIn).toBe(true); // ❌

// DEPOIS:
await act(async () => {
  setAuthSession({ ... });
  notifyState();
  await Promise.resolve(); // ← flush microtask
});
expect(result.current.isLoggedIn).toBe(true); // ✓
```

## Cobertura

- **Unit** (`store/app.store.test.ts`):
  - Single dispatch após microtask flush
  - 10 chamadas síncronas → 1 evento
  - 2 chamadas em ticks separados → 2 eventos
- **Integration** (`hooks/useAuthSession.test.ts`, `components/domain/Header.test.tsx`):
  - Hooks/components reagem corretamente após flush
- **E2E**: N/A — coalescing é otimização interna, não é user-visible. Justificado: o user-facing behavior (UI atualiza) já é coberto por outros E2E que naturalmente aguardam ciclos de render.

## Changed: 2026-04-26
- Adicionado coalescing via `queueMicrotask`
- Tests atualizados para flush microtask antes de assertions (`await Promise.resolve()`)
- Antes: cada chamada disparava re-render imediato; em sync runs múltiplos, observado tempestade de renders no DevTools
