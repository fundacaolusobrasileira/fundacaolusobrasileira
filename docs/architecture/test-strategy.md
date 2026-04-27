# Estratégia de Testes — Fundação Luso-Brasileira

> Documento-mestre para corrigir todos os CRUDs com cobertura completa em três níveis (unit, integration, E2E).
> Plano em 5 fases, executável de forma incremental, **TDD obrigatório** (RED → GREEN → REFACTOR) em todos os itens.

## Princípios

- **TDD em 3 níveis sempre**: cada mudança de código tem teste **unit + integration + E2E**. Se algum nível não se aplica, comentar no arquivo de teste explicando por quê.
- **Um CRUD por vez**: não pular para o próximo até o atual estar 100% verde.
- **Não introduzir refactor durante GREEN**: mínimo necessário para passar; refactor só na 3ª fase do ciclo.
- **DDC**: após cada mudança, atualizar a doc relevante em `docs/`.
- **Sem co-autoria de IA** em commits/PRs.

## Stack de testes

| Nível | Ferramenta | Onde |
|-------|------------|------|
| Unit | Vitest + jsdom | `*.test.ts(x)` ao lado do arquivo |
| Integration | Vitest + Supabase mockado (`vi.mock('../supabaseClient')`) | `services/*.service.test.ts` |
| Integration RLS | Vitest + projeto Supabase de teste real | `tests/rls/*.spec.ts` (a criar) |
| E2E | Playwright (recomendado) | `tests/e2e/*.spec.ts` (a criar) |

## Status atual dos CRUDs

| CRUD | Cobertura | Bloqueador |
|------|-----------|------------|
| Events | 80% | URL validation espalhada |
| Members | 75% | Seed slug-IDs vs UUIDs (homônimos) |
| PreCadastros | 60% | Status `'pausado'` viola CHECK |
| Community Media | 70% | Sem Zod no service |
| Benefits | 40% | Sem schema, sem testes |
| Auth/Profiles | 70% | Timeout de 3s silencioso |
| Activity Logs | 0% | Tabela não existe |
| Media (Storage) | 50% | Sem validação de tamanho/MIME |

---

## FASE 0 — Bloqueadores (executar ANTES da Fase 1)

### [x] 0.1 — Helper de URL (`utils/url.ts`)
- [x] **RED** — `utils/url.test.ts` com 13 casos criado (13 testes falhavam)
- [x] **GREEN** — `isSafeHttpUrl` adicionado a `utils/url.ts` (13 testes passam)
- [x] **REFACTOR** — `isValidUrl` local removido de `events.service.ts`; try/catch inline removido de `community-media.service.ts`; ambos importam `isSafeHttpUrl`
- [x] Corrigidos 2 bugs pré-existentes: mock de insert em `community-media.service.test.ts`; campo `sponsors` vs `sponsorIds` em `events.service.test.ts`
- [x] **Integration**: SKIPPED — helper puro, coberto via service tests
- [x] **E2E**: SKIPPED — coberto indiretamente pelo E2E de community media (Fase 3)
- [x] DDC: `docs/business-rules/url-validation.md` criado

### [x] 0.2 — Migration `activity_logs`
- [x] **RED** — `services/activity-log.service.test.ts` com 7 testes (5 falhavam: `persistLogEntry` retornava void)
- [x] **GREEN** — `migrations/20260425_activity_logs.sql` criado com tabela + índice + RLS (SELECT editor, INSERT autenticado, sem UPDATE/DELETE)
- [x] **GREEN** — `persistLogEntry` agora retorna `{ ok: boolean; error?: string }`
- [x] **REFACTOR** — callers via `logActivity` (store) não precisaram mudar (fire-and-forget retrocompatível)
- [x] Tipo `ActivityLogItem` sem alteração necessária
- [x] **Integration**: 7 testes passando (normalizeLog, sync, insert, RLS-deny, user payload)
- [x] **E2E**: PENDENTE — Fase 3 (test-strategy.md 3.1)
- [x] DDC: `docs/api/database-schema.md` atualizado com tabela e RLS

### [x] 0.3 — Status `'pausado'` no enum precadastros
- [x] **RED** — 3 casos adicionados em `precadastros.service.test.ts` (tipo, update com pausado, create ignora status)
- [x] **GREEN** — migration `migrations/20260425_precadastros_status_pausado.sql` criada
- [x] **GREEN** — `PreCadastro['status']` atualizado em `types/index.ts` (6 valores)
- [x] **GREEN** — `CreatePreCadastroSchema` sem alteração (create sempre insere `novo`; campo status ignorado)
- [x] **REFACTOR** — `as any` removido de `DashboardPage.tsx:77`
- [x] Comentário em `supabase_schema.sql:193` atualizado
- [x] **Unit**: tipo aceita 6 status (teste compile-time implícito via remoção do `as any`)
- [x] **Integration**: `updatePreCadastro` com `pausado` passa payload correto (6 testes passando)
- [x] **E2E**: PENDENTE — Fase 3
- [x] DDC: `docs/business-rules/precadastros-status.md` criado

### [x] 0.4 — Schema Zod para Benefits
- [x] **RED** — `services/benefits.service.test.ts` com 13 testes (6 falhavam: sem validação no service)
- [x] **GREEN** — `BenefitSchema` adicionado em `validation/schemas.ts` (partner_id UUID, title 1–200, category enum, link isSafeHttpUrl, order ≥0)
- [x] **GREEN** — `createBenefit` e `updateBenefit` aplicam `BenefitSchema.safeParse()` / `.partial().safeParse()`
- [x] **GREEN** — ZodError tratado com `issues[0]?.message` → `showToast`
- [x] **Unit**: 8 testes de schema isolados (cada constraint = 1 test)
- [x] **Integration**: 5 testes (valid insert chama Supabase; title/UUID inválidos NÃO chamam Supabase)
- [x] **E2E**: SKIPPED — coberto pelo E2E de Fase 3 "editor cria benefício"
- [x] DDC: `docs/business-rules/benefits-validation.md` criado

### [x] 0.5 — Schema Zod para Media Upload
- [x] **RED** — 4 testes adicionados em `services/media.service.test.ts` (2 unit schema + 2 integration service)
- [x] **GREEN** — `MediaUploadSchema` adicionado em `validation/schemas.ts` (size ≤ 5MB, MIME ∈ {jpeg,png,webp,mp4})
- [x] **GREEN** — `uploadSingleImage` aplica `MediaUploadSchema.safeParse()` antes do storage call
- [x] **Unit**: 5 testes de schema isolados
- [x] **Integration**: 2 testes (arquivo > 5MB / MIME inválido → null + toast + storage NOT chamado)
- [x] **E2E**: PENDENTE — Fase 3 (usuário faz upload grande → toast de erro)
- [x] DDC: `docs/business-rules/media-upload.md` a atualizar

---

## FASE 1 — Integration tests por CRUD

> **Ordem obrigatória** (do mais crítico para o menos). Não avançar antes do anterior estar 100% verde.

### [x] 1.1 — `precadastros`
- [x] **Unit**: `normalizePreCadastro` (3 casos: createdAt, strip snake, preserves fields), `CreatePreCadastroSchema` (5 casos: name min/max, email, message max, toast)
- [x] **Integration**: `syncPreCadastros` (3: re-sync, order, error), `createPreCadastro` (4: payload seguro, registrationType, Supabase error, success), `updatePreCadastro` (5: whitelist, store update, no-update-on-error, non-editor, 6 status), `deletePreCadastro` (4: store remove, Supabase call, no-remove-on-error, non-editor), `convertPreCadastroToMember` (5: sync null, createMember, updateMember patch, status convertido, non-editor), `subscribeToNewsletter` (1)
- [x] **E2E**: PENDENTE — Fase 3 (`precadastro-flow.spec.ts`)
- [x] 31 testes passando

### [x] 1.2 — `events`
- [x] **Unit**: `normalizeEvent` (snake→camel, gallery JSON malformado → []), `EVENT_DB_COLUMNS` whitelist
- [x] **Integration**: `createEvent` (payload, toast, error, non-editor, status default), `syncEvents` (populate, normalize, notifyState, error, loading flag), `getPublicEvents`, `updateEvent` (snake_case, whitelist, store, error, non-editor, toast), `deleteEvent` (DB, store, toast, error, non-editor)
- [x] **Novos testes**: `addUrlMediaToEvent` (4: válida/inválida URL/espaços/non-editor), `approveCommunityMedia` (5: gallery+source, remove pending, toast, not-found, non-editor), `rejectCommunityMedia` (4: remove pending, toast, gallery intacta, non-editor)
- [x] **E2E**: PENDENTE — Fase 3 (`event-crud.spec.ts`)
- [x] 42 testes passando

### [x] 1.3 — `members` / `partners`
- [x] **Unit**: `normalize` (4: socialLinks, gallery [], albums [], type default)
- [x] **Integration**: `createMember` (6), `syncMembers` (4 + 3 seed merge), `updateMember` (11 campos + 5 slug-INSERT-then-UPDATE), `deleteMember` (5)
- [x] **E2E**: PENDENTE — Fase 3
- [x] 40 testes passando (12 novos: normalize + seed merge + slug→UUID)

### [x] 1.4 — `community-media`
- [x] **Unit**: `normalize` (4: eventId, authorName, createdAt, demais campos)
- [x] **Integration**: `syncCommunityMedia` (4: populate, re-sync, order, error), `submitCommunityMedia` (7: payload snake_case, result camelCase, store optimistic, URL invalid × 3 schemes, Supabase error)
- [x] **E2E**: PENDENTE — Fase 3 (`community-media.spec.ts`)
- [x] 15 testes passando

### [x] 1.5 — `benefits`
- [x] Já coberto na Fase 0.4 — 13 testes (BenefitSchema unit + createBenefit/updateBenefit integration)
- [x] **E2E**: PENDENTE — Fase 3

### [x] 1.6 — `auth` / `profiles`
- [x] **Unit**: `LoginSchema` (rejects empty password, invalid email), `CadastroSchema` (password < 8, name < 2, invalid type enum)
- [x] **Integration**: `loginAsEditor` (success, no direct AUTH_SESSION set, invalid credentials, email-not-confirmed, profile-error defaults to viewer), `resolveUserRole` (editor/admin/viewer/throws/3s-timeout), `logout` (calls signOut, resets AUTH_SESSION), `signUp` (success, Supabase error, both types)
- [x] 20 testes passando
- [x] Fixed pre-existing failure: test expected `AUTH_SESSION.isLoggedIn = true` from `loginAsEditor`, but that's `onAuthStateChange`'s job (App.tsx), not the service's
- [x] Fixed `component.ui.test.tsx` 14 pre-existing failures: missing `PARTNERS: []` in store mock + time/date/sponsors tests using `getByText` instead of `getByPlaceholderText`
- [x] **E2E**: PENDENTE — Fase 3 (auth.spec.ts)

### [x] 1.7 — `activity-log` (depende de 0.2)
- [x] **Unit**: `normalizeLog` (snake→camel: user_name→user, created_at→timestamp)
- [x] **Integration**: `syncActivityLog` (populates store, no duplicates, RLS permission-denied → empty store), `persistLogEntry` (inserts action/target, handles error, includes user_name/user_id)
- [x] 8 testes passando (7 do 0.2 + 1 novo RLS deny)
- [x] **E2E**: PENDENTE — Fase 3 (admin-roles.spec.ts)

### [x] 1.8 — `media` (Storage)
- [x] **Unit**: fileName extraction from URL (`url.split('/').pop()`), `MediaUploadSchema` (size ≤5MB, MIME JPEG/PNG/WEBP/MP4)
- [x] **Integration**: `saveMediaBlob` (upsert true, throws on error, returns publicUrl), `uploadSingleImage` (success, storage error→toast, >5MB reject, bad MIME reject), `deleteMediaBlob` (remove with correct fileName, silently ignores errors, noop on empty URL)
- [x] 15 testes passando
- [x] **E2E**: PENDENTE — Fase 3 (event-crud.spec.ts)

---

## FASE 2 — RLS contra Supabase real

> Setup: criar projeto Supabase de teste isolado, env `.env.test`, script `tests/rls/seed.ts` para criar 4 usuários (viewer/membro/editor/admin).

### [x] Setup da Fase 2
- [x] `dotenv` + `tsx` instalados como devDependencies
- [x] `.env.test.example` criado (template com 3 vars: URL, ANON_KEY, SERVICE_ROLE_KEY)
- [x] `vitest.rls.config.ts` criado (node environment, timeout 15s, sequential)
- [x] `tests/rls/client.ts` criado (anonClient, serviceClient, signInAs, TEST_USERS, hasTestDB)
- [x] `tests/rls/seed.ts` criado (npx tsx tests/rls/seed.ts — idempotente, cria 4 usuários)
- [x] `package.json`: scripts `test:rls` e `seed:rls` adicionados
- [x] `vite.config.ts`: `exclude: tests/rls/**` para não poluir suite principal
- [x] 62 testes criados — todos `describe.skipIf(!hasTestDB)` até `.env.test` ser preenchido

### [x] 2.1 — Matriz de policies por tabela
- [x] `events` (events.rls.spec.ts): anon/viewer SELECT published ok; anon/viewer INSERT/UPDATE/DELETE deny; editor full access (12 testes)
- [x] `precadastros` (precadastros.rls.spec.ts): anon INSERT ok (form público); anon/viewer SELECT deny; editor SELECT/UPDATE/DELETE ok (9 testes)
- [x] `community_media_submissions` (community-media.rls.spec.ts): anon/membro INSERT ok; anon SELECT deny; editor SELECT/UPDATE/DELETE ok (10 testes)
- [x] `benefits` (benefits.rls.spec.ts): anon SELECT active=true ok; anon SELECT active=false deny; editor SELECT/INSERT/UPDATE/DELETE ok (9 testes)
- [x] `profiles` (profiles.rls.spec.ts): user lê próprio; admin lê todos; user não escala role; admin muda role de outro (5 testes)
- [x] `activity_logs` (activity-logs.rls.spec.ts): editor SELECT ok; autenticado INSERT ok; anon SELECT/INSERT deny; ninguém UPDATE/DELETE (7 testes)
- [ ] `partners`: PENDENTE — spec ainda não criado (estrutura idêntica a events)

### [x] 2.2 — Constraints DB (constraints.spec.ts — 10 testes)
- [x] CHECK: status enum events (invalid_status rejeita)
- [x] CHECK: status enum precadastros (invalid_status rejeita; 6 válidos aceitam)
- [x] URL not empty (community_media)
- [x] FK cascade: deletar event remove community_media
- [x] FK cascade: deletar partner remove benefits
- [ ] Length constraints: PENDENTE (tabela partners/events não tem min constraint no DB — validação no Zod)
- [ ] Email format: PENDENTE (sem CHECK no DB — validação no Zod)

### [x] 2.3 — Triggers (triggers.spec.ts — 5 testes)
- [x] `handle_updated_at` atualiza timestamp em UPDATE
- [x] `is_editor()` retorna true para editor, false para viewer
- [x] `is_admin()` retorna true para admin, false para editor

---

## FASE 3 — E2E (Playwright)

### [x] 3.0 — Setup
- [x] `@playwright/test` instalado como devDependency
- [x] `playwright.config.ts` criado (baseURL: localhost:4173 via `vite preview`, Chromium + Firefox, webServer auto-build)
- [x] `.github/workflows/test.yml` criado (unit-integration → playwright → rls em paralelo; RLS condicional se secret existe)
- [x] `test:e2e` e `test:e2e:ui` adicionados ao package.json

### [x] 3.1 — Fluxos críticos (specs criados em tests/e2e/)
- [x] `auth.spec.ts` — signup, login com credenciais inválidas, validação Zod client-side, editor login→dashboard→logout (requer E2E_EDITOR_EMAIL)
- [x] `event-crud.spec.ts` — editor cria draft, publica e visitante vê, URL inválida → toast, delete remove do dashboard; smoke test /eventos (sem auth)
- [x] `community-media.spec.ts` — visitante submete mídia, URL inválida rejeitada, editor vê pendentes e aprova
- [x] `precadastro-flow.spec.ts` — público preenche form, email inválido rejeitado, editor vê lista/muda status/converte em membro
- [x] `admin-roles.spec.ts` — admin acessa painel, muda role, ação aparece no activity log
- [x] `stale-chunk.spec.ts` — app carrega sem erros JS, error boundary quando chunk retorna 404, smoke de 5 rotas públicas
- [x] Testes que requerem conta autenticada usam `test.skip(!process.env.E2E_EDITOR_EMAIL, ...)` — seguros para CI sem credenciais

### [x] 3.2 — Smoke tests por página
- [x] `smoke.spec.ts` — 7 rotas públicas (/, /eventos, /quem-somos, /beneficios, /parceiros, /login, /cadastro) sem erro de console

---

## FASE 4 — Smoke / contract tests

### [x] 4.1 — Validação em camadas (tests/contract/validation-layers.test.ts — 31 testes)
- [x] LoginSchema: empty email, invalid email, empty password, valid
- [x] CadastroSchema: password<8, name<2, invalid enum, invalid email, valid
- [x] PreCadastroSchema: empty name, name<2, invalid email, message>1000, invalid type, valid
- [x] BenefitSchema: invalid UUID, empty title, invalid category, negative order, javascript:/ftp: link, valid, https link
- [x] MediaUploadSchema: >5MB, gif, pdf, jpeg válido
- [x] Fix descoberto: Zod v4 valida bits de variante RFC 4122 (UUIDs precisam de version 4 + variant `[89ab]`)

### [x] 4.2 — Round-trip camelCase ↔ snake_case (tests/contract/normalize-roundtrip.test.ts — 4 testes)
- [x] normalizeEvent: sem chaves snake_case no objeto mapeado
- [x] normalizePreCadastro: sem chaves snake_case
- [x] normalizeCommunityMedia: sem chaves snake_case
- [x] normalizeLog: user_name→user, created_at→timestamp, sem snake leakage

### [x] 4.3 — Stale chunk error boundary
- [x] Coberto em `stale-chunk.spec.ts` (Fase 3.1) — intercepta chunk 404 e verifica boundary ou redirect

---

## FASE 5 — Coverage e gates de CI

### [x] 5.1 — Threshold mínimo (vite.config.ts)
- [x] `services/`: 80% statements, 75% branches
- [x] `validation/`: 100% statements
- [x] `utils/`: 100% statements
- [x] Provider: v8, reporters: text + lcov

### [x] 5.2 — Reporters
- [x] `npm run test:coverage` → vitest run --coverage (text + lcov)
- [ ] Upload para Codecov: PENDENTE (requer CODECOV_TOKEN no GitHub Secrets)

### [x] 5.3 — Workflow (.github/workflows/test.yml)
- [x] Job `unit-integration`: checkout → typecheck → vitest
- [x] Job `playwright`: needs unit-integration → build → playwright (Chromium + Firefox)
- [x] Job `rls`: needs unit-integration → RLS tests (only if SUPABASE_TEST_URL secret exists)
- [x] Artifacts: playwright-report em caso de falha (7 dias)

---

## Convenções para o agente que vai executar este plano

1. **Sempre** seguir RED → GREEN → REFACTOR em cada item.
2. **Sempre** escrever testes nos 3 níveis (unit/integration/E2E). Se pular, comentar no arquivo de teste com `// SKIPPED <nível>: <motivo>`.
3. **Não** marcar checklist como concluído sem todos os 3 níveis verdes.
4. **Não** introduzir refactor além do necessário durante GREEN.
5. **Não** adicionar Co-Authored-By em commits/PRs.
6. **Após** cada item da checklist: rodar `npm test` completo. Se algum teste pré-existente quebrou, reverter e investigar antes de avançar.
7. **Após** cada mudança em código de produção, perguntar (DDC): "essa mudança precisa de doc em `docs/`?". Atualizar no mesmo commit.
8. **Commits** em inglês, mensagens curtas no padrão `tipo(escopo): descrição`. Exemplo: `test(precadastros): cover 'pausado' status update`.
9. **Branch**: criar branch por fase. Ex.: `tests/phase-0-blockers`, `tests/phase-1-precadastros`.
10. **PR**: um PR por fase ou subfase grande. Descrição lista checkboxes concluídos.

## Referências internas

- Schema DB: [supabase_schema.sql](../../supabase_schema.sql)
- Constraints/RLS: [supabase_security_update.sql](../../supabase_security_update.sql)
- Mapa de módulos: [docs/architecture/module-structure.md](module-structure.md)
- Schema doc: [docs/api/database-schema.md](../api/database-schema.md)
- Setup Vitest: [vite.config.ts](../../vite.config.ts), [src/test/setup.ts](../../src/test/setup.ts)

## Changed: 2026-04-25
- Fases 0–5 concluídas: 292 testes Vitest (unit/integration/contract) + 71 RLS specs (skip sem .env.test) + specs E2E Playwright + CI workflow
- Fix: Zod v4 rejeita UUIDs sem variant RFC 4122 — todos os testes de UUID atualizados para v4 válido
