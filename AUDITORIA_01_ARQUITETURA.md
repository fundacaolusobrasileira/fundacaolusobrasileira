# AUDITORIA 01 — ARQUITETURA E INVENTÁRIO
Projeto: `fundacaolusobrasileira` (React 19.2 + Vite 6.2 + Supabase JS 2.87 + react-router-dom 7.10, HashRouter)
Data: 2026-09-07. Nenhum arquivo foi alterado.
Método: `find`, `grep`, `diff`, `git ls-files`, leitura direta. Onde não houve prova, está marcado **NÃO PROVADO**.

---

## 1. Estrutura real

Raiz é o "src" do projeto (não existe `src/` de código — só `src/test/`). Aliases: nenhum; imports relativos `../../`.

| Caminho | Tamanho | Responsabilidade |
|---|---|---|
| `App.tsx` | 4,5 KB / 120+ linhas | Bootstrap: dispara 4 syncs no escopo do módulo (`App.tsx:38-41`), regista `supabase.auth.onAuthStateChange` (`App.tsx:47`), monta Header/Footer/Router/ToastContainer |
| `router.tsx` | 6,3 KB | 23 `lazy()` + 24 rotas (`router.tsx:35-86`), `ProtectedRoute` |
| `index.tsx` | 495 B | Entry, envolve em `ErrorBoundary` |
| `supabaseClient.ts` | 402 B | Cliente único; lança erro se faltarem env vars |
| `component.ui.tsx` | **138.834 B / 2.236 linhas** | God file de UI — 31 exports (ver §2) |
| `component.domain.tsx` | **35.234 B / 663 linhas** | God file de domínio — 10 exports |
| `component.ui.test.tsx` | 9,8 KB | Testa apenas `MemberEditorModal` e `EventEditorModal` do god file |
| `components/ui/` | 12 arquivos, ~28 KB | Versão modular: Button, Badge, Card, Input, Layout, Loaders, Modals, Toast, Reveal, Skeleton, ExpandableText, ErrorBoundary + `index.ts` barrel |
| `components/domain/` | 8 componentes + 2 testes | BrandLogo, Header, Footer, SearchResults, SmartInviteModal, MemberCard, EventCard, PartnerCard + `index.ts` |
| `pages/` | 25 arquivos, 13 pastas | Páginas + secções de dashboard (`BenefitsManagerSection`, `CouncilManagerSection`, `DocumentManagerSection`, `UserManagerModal`). Maiores: `home/HomePage.tsx` 35,9 KB, `dashboard/DashboardPage.tsx` 35 KB, `membro/MembroPerfilPage.tsx` 34,6 KB, `eventos/EventoColaborarPage.tsx` 24,6 KB |
| `services/` | 13 services + 9 arquivos de teste | Acesso a Supabase + mutação dos arrays globais (§4) |
| `store/app.store.ts` | 3,5 KB / 79 linhas | Estado global mutável + event bus (§3) |
| `hooks/` | 4 hooks | `useAuthSession` (subscreve FLB_STATE_EVENT, timeout 4000 ms), `useDebounce`, `useFeedback`, `usePageMeta` |
| `utils/` | `url.ts` (safeUrl, isSafeHttpUrl, resolveLink), `uuid.ts` (UUID_REGEX, isUuid) | Ambos com testes |
| `validation/schemas.ts` | 5,1 KB | 9 schemas Zod (Login, Cadastro, ResetPassword, PreCadastro, Colaborar, Benefit, MediaUpload, CouncilMember, Document) |
| `types/index.ts` | 5,8 KB | 32 tipos/interfaces do domínio |
| `data/` | 4 arquivos, 31,5 KB | Seeds hardcoded (§6) |
| `migrations/` | 12 `.sql` | SQL avulso, fora do fluxo Supabase CLI (§8) |
| `supabase/migrations/` | 6 `.sql` | Migrações oficiais do CLI |
| `supabase/functions/admin-create-user/index.ts` | 1 edge function | — |
| `tests/` | contract (2), e2e (8+), rls (5) | Playwright + Vitest |
| `docs/` | 14 `.md` | api/, architecture/, business-rules/, superpowers/ |

---

## 2. Os god files

### 2.1 `component.ui.tsx` — 31 exports
`ToastContainer`(21), `PremiumLoader`(85), `SocialIcons`(138), `Button`(168), `ShareActions`(197), `Badge`(213), `Card`(222), `Carousel`(230), `SectionWrapper`(238), `Skeleton`(242), `AsyncContent`(246), `Input`(251), `Modal`(262), `ModalHeader`(310), `ModalBody`(317), `ModalFooter`(324), `AsyncImage`(330), `LoginModal`(362), `AccessDeniedModal`(402), `ConfirmDialog`(413), `MediaManagerModal`(446), `EventEditorModal`(674), `MemberEditorModal`(1167), `SettingsModal`(1516), `Reveal`(1553), `StatCard`(1589), `ListRow`(1601), `ActivityFeed`(1616), `UniversalListModal`(1634), `PreCadastroManagerModal`(2005), `Lightbox`(2192).

### 2.2 `component.domain.tsx` — 10 exports
`BrandLogo`(21), `Header`(59), `MediaCurationCard`(217), `Footer`(285), `SmartInviteModal`(379), `SearchResults`(463), `PresidentMessage`(513), `PillarsGrid`(538), `EventDetailHeader`(576), `GallerySection`(613).

### 2.3 Imports circulares — **NÃO EXISTEM**
Prova (grep exaustivo por `component.ui` / `component.domain`):
- `component.domain.tsx:7` → `import { Button, Badge, Card, SocialIcons, LoginModal, Input, AsyncImage } from './component.ui'`
- `component.ui.tsx` **não** importa `component.domain` (imports em `component.ui.tsx:2-12`: react, lucide, `./types`, `./store/app.store`, 5 services, `./utils/url`, `./utils/uuid`)
- Páginas importam dos dois, nenhum god file importa páginas.
Grafo: `pages → component.ui`, `pages → component.domain → component.ui`. **Acíclico.**

### 2.4 Quem realmente consome os god files (só 4 arquivos de produção)
- `pages/dashboard/DashboardPage.tsx:4` → StatCard, ListRow, EventEditorModal, MemberEditorModal, ActivityFeed, UniversalListModal, SettingsModal, PremiumLoader, MediaManagerModal, PreCadastroManagerModal
- `pages/eventos/EventoDetalhePage.tsx:4,7` → Lightbox, AsyncImage, ShareActions, SocialIcons, EventEditorModal
- `pages/eventos/EventosPage.tsx:3` → EventEditorModal
- `pages/dashboard/DashboardMediaPage.tsx:4` → MediaCurationCard; `pages/eventos/EventoDetalhePage.tsx:5` → EventDetailHeader, GallerySection

### 2.5 Problema concreto: **duplicação viva, não só dívida**
19 dos 31 exports de `component.ui.tsx` têm **implementação paralela** em `components/ui/` (comparação por nome de export):
`AccessDeniedModal, AsyncContent, AsyncImage, Badge, Button, Card, ConfirmDialog, Input, LoginModal, Modal, ModalBody, ModalFooter, ModalHeader, PremiumLoader, Reveal, SectionWrapper, Skeleton, SocialIcons, ToastContainer`.
Idem em domínio: `BrandLogo, Footer, Header, SearchResults, SmartInviteModal` existem nos dois lugares.

As duas versões **divergiram**. Exemplo verificável: `components/ui/Modals.tsx` tem focus trap completo, restauração de foco e `Escape` (`Modals.tsx:7-17` focusableSelector, `:45` Escape, `:55-76` trap, `:87` restore). O `Modal` do god file (`component.ui.tsx:262-308`) **não trata Escape, não faz focus trap e não restaura o foco anterior** — apenas `modalRef.current.focus()`.
Consequência real: os modais abertos a partir do Dashboard/Eventos (EventEditorModal, MemberEditorModal, MediaManagerModal, UniversalListModal, PreCadastroManagerModal, Lightbox) usam o `Modal` inferior — regressão de acessibilidade/UX apenas nessas telas. **Isto é bug de comportamento, não só dívida.**

Impacto adicional:
- **Bundle**: `DashboardPage`, `EventosPage` e `EventoDetalhePage` são `lazy()`, mas cada uma puxa os 138 KB de `component.ui.tsx` inteiro (sem tree-shaking útil, pois o módulo tem side-effect-free exports mas o chunk é partilhado). Quantificação exata do chunk: **NÃO PROVADO** (requer build — Agente 5).
- **Testabilidade**: `component.ui.test.tsx` faz `await import('./component.ui')` 22 vezes — cada teste carrega o módulo inteiro com 5 services e o store.
- **Re-render**: não há `React.memo` em nenhum export do god file; combinado com o padrão `setTick` (§3) todo o subtree re-renderiza. Medição: **NÃO PROVADO**.

---

## 3. Estado global — `store/app.store.ts`

### Arrays/variáveis globais mutáveis (linhas 7-18)
`EVENTS`, `PARTNERS`, `PRECADASTROS`, `PENDING_MEDIA_SUBMISSIONS`, `ACTIVITY_LOG`, `ESTATUTOS_LEADS`, `COUNCILS`, `DOCUMENTS` (todos `const [] `), mais `let AUTH_SESSION`, `let AUTH_LOADING`, `let EVENTS_LOADING`, `let EVENTS_ERROR`.

### `notifyState` / `FLB_STATE_EVENT` (`app.store.ts:28-36`)
```
let stateNotifyPending = false;
export const notifyState = () => {
  if (typeof window === 'undefined' || stateNotifyPending) return;
  stateNotifyPending = true;
  queueMicrotask(() => { stateNotifyPending = false; window.dispatchEvent(new Event(FLB_STATE_EVENT)); });
};
```
Coalescing por microtask. 18 arquivos de produção escutam `FLB_STATE_EVENT` e reagem com `setTick(t => t + 1)` (29 ocorrências do padrão em `app.txt`). Ou seja: **qualquer mutação em qualquer coleção re-renderiza todos os componentes montados que escutam**, independentemente da coleção alterada. Não há seletores nem granularidade.

### Riscos de mutação direta (provados)
- Os arrays são exportados como `const` mas o conteúdo é livremente mutado: `EVENTS.length = 0; EVENTS.push(...)` (`services/events.service.ts:49-50`), idem `members.service.ts:73-74`, `precadastros.service.ts:34-35`, `community-media.service.ts:24-25`, `councils.service.ts:21-22`, `documents.service.ts:30-33`.
- **Mutação fora da camada de services**: `App.tsx:29-32` (`clearEditorOnlyState` zera 4 arrays diretamente).
- Como a identidade do array nunca muda, `useMemo([...])`/`React.memo` sobre eles são inúteis — ver `pages/parceiros/ParceirosPage.tsx:45` que depende de `[tick]` com `eslint-disable react-hooks/exhaustive-deps` para contornar.
- `ACTIVITY_LOG.unshift` + `pop` com limite 50 em `app.store.ts:50-57`; persistência fire-and-forget com import dinâmico e `.catch(() => {})` (`app.store.ts:61-63`) — falhas silenciosas.
- `exportState`/`importState` (`app.store.ts:78-79`) são no-ops que só mostram toast — código morto funcional ainda importado por `component.ui.tsx:5`.
- `resolveGalleryItemSrc` está definido **duas vezes**: `app.store.ts:76` (síncrono, retorna `item.url`) e `services/media.service.ts:39` (async). `component.ui.tsx:6` importa a versão do service. Duplicação com assinaturas incompatíveis.

---

## 4. Services — funções exportadas, tabela e proteções

| Service | Funções exportadas | Tabela/Storage | Cache / dedupe / proteção |
|---|---|---|---|
| `activity-log.service.ts` (39 l.) | `syncActivityLog`, `persistLogEntry` | `activity_logs` | nenhum |
| `auth.service.ts` (479 l.) | `resolveUserRole`, `loginAsEditor`, `logout`, `signUp`, `fetchAllProfiles`, `updateUserRole`, `convertPreCadastroToAccount`, `linkUserToPartner` | `profiles`, `partners` | timeouts e fallbacks internos; 9 `console.error`; sem dedupe de chamadas |
| `benefits.service.ts` (66 l.) | `fetchBenefits`, `fetchBenefitsByPartner`, `createBenefit`, `updateBenefit`, `deleteBenefit` | `benefits` | nenhum |
| `community-media.service.ts` (63 l.) | `syncCommunityMedia`, `submitCommunityMedia` | `community_media_submissions` | nenhum |
| `councils.service.ts` (134 l.) | `syncCouncils`, `getCouncil`, `createCouncilMember`, `updateCouncilMember`, `deleteCouncilMember` | `council_members` | nenhum |
| `documents.service.ts` (154 l.) | `syncDocuments`, `getDocumentsByCategory`, `uploadDocumentFile`, `createDocument`, `updateDocument`, `deleteDocument` | `institutional_documents` + storage `media` | `cacheControl: '3600'`, `upsert:false` |
| `estatutos-leads.service.ts` (84 l.) | `createEstatutosLead`, `syncEstatutosLeads`, `deleteEstatutosLead` | `estatutos_leads` | nenhum |
| `events.service.ts` (313 l.) | `syncEvents`, `getPublicEvents`, `createEvent`, `updateEvent`, `deleteEvent`, `addMediaToEvent`, `addUrlMediaToEvent`, `addEventImagesFromFiles`, `approveCommunityMedia`, `rejectCommunityMedia` | `events`, `community_media_submissions` | **única proteção real de concorrência do projeto**: `galleryWriteChain` (Map de promessas serializadas por `eventId`, `events.service.ts:184`) |
| `media.service.ts` (69 l.) | `saveMediaBlob`, `uploadSingleImage`, `resolveGalleryItemSrc`, `saveCommunityMediaBlob`, `deleteMediaBlob` | storage `media` | `upsert:true` em `saveMediaBlob` (`:16`) vs `upsert:false` em `saveCommunityMediaBlob` (`:50`) — inconsistente |
| `members.service.ts` (185 l.) | `getMemberByTier` (re-export de `data/members.data`), `syncMembers`, `createMember`, `updateMember`, `deleteMember` | `partners` | fuzzy match seed↔DB (`seedMatchesDbRow`), sem dedupe |
| `precadastros.service.ts` (225 l.) | `syncPreCadastros`, `createPreCadastro`, `subscribeToNewsletter`, `updatePreCadastro`, `deletePreCadastro`, `convertPreCadastroToMember` | `precadastros` | cache de conversões pendentes por `preId` documentado como "BUG 3 FIX" (`:169-215`) |
| `search.service.ts` (22 l.) | `searchFoundation` | nenhuma (memória: `SPACES`, `MEMBERS_SEED`, `PARTNERS`, `EVENTS`) | — |

Observações:
- **Nenhum service tem dedupe de requisições em voo.** `syncEvents`, `syncMembers`, `syncCouncils`, `syncDocuments` são chamados no topo do módulo (`App.tsx:38-41`) **e outra vez** dentro do handler de auth (`App.tsx:68-71`, `:100`, `:105-108`) → fetch duplicado no arranque. Confirmação de rede: Agente 5.
- Todos os services mutam os globais diretamente e chamam `notifyState()`; não há camada de imutabilidade.

---

## 5. Código órfão / não utilizado (provado por grep sobre todo o código de produção)

**Exports nunca referenciados fora da própria definição:**
| Símbolo | Definição | Prova |
|---|---|---|
| `Carousel` | `component.ui.tsx:230` | única ocorrência no repo (excl. `dist/`, `node_modules`) |
| `PillarsGrid` | `component.domain.tsx:538` | única ocorrência |
| `PresidentMessage` | `component.domain.tsx:513` | única ocorrência |
| `EVENTS_SEED` | `data/events.data.ts:4` | única ocorrência — arquivo inteiro (2,8 KB) é morto |
| `getParceirosPorCategoria` | `data/partners.data.ts:271` | única ocorrência |

**Exports vivos apenas por acidente de duplicação** (usados só por `component.domain.tsx:7`, enquanto o resto da app usa `components/ui/`): `Button`, `Badge`, `Card`, `SocialIcons`, `LoginModal`, `Input`, `AsyncImage` de `component.ui.tsx`.
**Duplicatas do god file sem nenhum consumidor**: `Modal`, `ModalHeader`, `ModalBody`, `ModalFooter`, `Skeleton`, `AsyncContent`, `Reveal`, `SectionWrapper`, `PremiumLoader`, `ToastContainer`, `AccessDeniedModal`, `ConfirmDialog` — usados apenas *dentro* de `component.ui.tsx`; as páginas consomem as versões de `components/ui/`.
**`component.domain.tsx`**: `BrandLogo`, `Header`, `Footer`, `SearchResults`, `SmartInviteModal` não são importados por ninguém — `App.tsx:3-7`, `pages/auth/LoginPage.tsx:4`, `ResetPasswordPage.tsx:4` e `HomePage.tsx:14` usam `components/domain/`. Só 3 dos 10 exports do arquivo estão vivos (`MediaCurationCard`, `EventDetailHeader`, `GallerySection`).
**Store**: `exportState`, `importState`, `generateTestActivity`, `setEventsLoading`, `setEventsError`, `EVENTS_LOADING`, `EVENTS_ERROR` — verificação de consumo: `exportState`/`importState` importados em `component.ui.tsx:5`; os restantes **NÃO PROVADO** que sejam usados fora de testes.

---

## 6. TODO/FIXME, console, mock/hardcoded

- **TODO / FIXME / HACK / XXX / @ts-ignore / @ts-nocheck: ZERO ocorrências** em todo o código de produção (grep sobre 19.630 linhas indexadas). Positivo.
- **`console.*`: 27 ocorrências**, das quais 16 em produção. Guardadas por `import.meta.env.DEV` apenas em 3 pontos (`pages/eventos/EventoColaborarPage.tsx:146`, `components/ui/ErrorBoundary.tsx:24`, `component.ui.tsx:200`). **Não guardadas (vão para produção)**: `auth.service.ts:72,89,150,173,254,392,433,441,455`, `community-media.service.ts:53`, `estatutos-leads.service.ts:40`, `events.service.ts:226`, `media.service.ts:67`, `precadastros.service.ts:89,221`, `component.ui.tsx:1201`. Risco de vazamento de detalhe de erro/PII no console do browser — a avaliar pelo Agente 3.
- **Dados hardcoded no caminho de produção**:
  - `data/members.data.ts` (`MEMBERS_SEED`, 9,5 KB) **não é fallback** — é fonte primária mesclada em toda sincronização: `services/members.service.ts:60-74` faz `MEMBERS_SEED.map(...)` com fuzzy match ao DB e só depois adiciona os "extras" do banco. Um membro removido do banco continua a aparecer no site. Também alimenta `search.service.ts:3`.
  - `data/partners.data.ts` (`PARTNERS_SEED`, 13,9 KB) é fallback **e** fonte de `pageRoute`: `pages/parceiros/ParceirosPage.tsx:45,49` e `ParceiroPerfilPage.tsx:35` — rotas customizadas (ex. `/legaltech-space`) existem apenas no arquivo.
  - `data/content.data.ts` (MISSION, PRESIDENT_MESSAGE, HISTORY, PILLARS, SPACES) é conteúdo institucional 100% hardcoded, consumido por `HomePage.tsx:20`, `QuemSomosPage.tsx:5`, `search.service.ts:2`. Não editável pelo admin.
  - `data/events.data.ts` (`EVENTS_SEED`): morto.

---

## 7. Duplicações relevantes

1. **`component.ui.tsx` ↔ `components/ui/`** — 19 componentes duplicados e divergentes (§2.5).
2. **`component.domain.tsx` ↔ `components/domain/`** — 5 componentes duplicados (BrandLogo, Header, Footer, SearchResults, SmartInviteModal).
3. **`resolveGalleryItemSrc`** definido em `store/app.store.ts:76` e `services/media.service.ts:39` com assinaturas divergentes (sync vs async).
4. **SQL em três locais** (§8).
5. **Padrão `useEffect` + `setTick` + `addEventListener(FLB_STATE_EVENT)`** replicado em 18 arquivos — devia ser um hook (`useStoreTick`) e não é.
6. `getMemberByTier` re-exportado por `services/members.service.ts:7` a partir de `data/members.data.ts:142` — dois caminhos de import para a mesma função.

---

## 8. Arquivos suspeitos na raiz

### 8.1 `env` — **versionado com credenciais**
- Conteúdo: `VITE_SUPABASE_URL=...` e `VITE_SUPABASE_ANON_KEY=sb_pub...`
- `git ls-files` confirma que **está rastreado**; entrou no commit `76224c1`.
- `.gitignore` ignora `.env*` mas **não** o arquivo chamado `env` (sem ponto).
- Vite lê `.env`, não `env` → o arquivo é **inerte** para o build (`vite.config.ts` não o referencia). É credencial exposta sem sequer ser usada.
- Severidade mitigada: a chave é `sb_publishable_*` (chave pública destinada ao cliente, protegida por RLS). Não é `service_role`. **Não há service_role key no repo** (grep negativo). Continua a ser má higiene e a expor a URL do projeto.

### 8.2 `_env fundação .eml` — **versionado**
E-mail Outlook de `sslawtech@outlook.com` para `sslawtech@outlook.com.br`, assunto `_env fundação`, 2026-03-31, 8,9 KB. Grep por `SUPABASE`, `service_role`, `anon_key`, `password`, `eyJ*`, `sb_*` no arquivo: **zero ocorrências**; base64 do corpo não decodificou para texto legível. Se contém segredos: **NÃO PROVADO**. Ainda assim é um e-mail pessoal versionado no repositório e deve sair.

### 8.3 `obs-backgroundremoval/` + `instalar-plugin-obs.ps1` — **versionados, 97 MB**
32 arquivos rastreados no git, incluindo DLL Windows de 64 bits e 11 modelos ONNX/ORT. O `.ps1` instala um plugin de OBS Studio em `C:\ProgramData\obs-studio\plugins`. **Nada disto tem relação com a aplicação web.** `.git` ocupa 101 MB; objetos somam ~135 MB. Remover do working tree não reduz o clone — exige reescrita de histórico.

### 8.4 `LOGOSFUNDACAO/` — versionado, 560 KB
4 arquivos, incluindo `logo-flb - Atalho.lnk` (atalho do Windows, inútil fora da máquina do autor). Os logos reais já estão em `public/` (`logo-flb.png`, `logo-flb-full.png`, `.webp`).

### 8.5 `dist/` — **NÃO versionado**
`git ls-files | grep '^dist/'` → 0. `.gitignore` contém `dist`. Existe só localmente (2,2 MB). Sem problema de versionamento; apenas resíduo local.

### 8.6 SQL em TRÊS lugares — fonte da verdade e divergências

**(A) Raiz** — `supabase_schema.sql` (22,6 KB), `supabase_security_update.sql` (14 KB), `supabase_jwt_role_hook.sql` (2,1 KB), `seed_members_bio.sql` (10,9 KB)
**(B) `migrations/`** — 12 arquivos, nomes `AAAAMMDD_*.sql`
**(C) `supabase/migrations/`** — 6 arquivos, nomes `AAAAMMDDHHMMSS_*.sql` (formato exigido pelo Supabase CLI)

Determinação: **a fonte da verdade operacional é (C)** — é o único diretório que o Supabase CLI aplica (`supabase/config.toml:53 [db.migrations]`). (A) e (B) são cópias/manuais.

Divergências provadas:
1. `supabase_schema.sql` é **byte-a-byte idêntico** a `supabase/migrations/20260101000000_initial_schema.sql` (`diff` vazio) — cópia redundante.
2. `migrations/20260425_precadastros_status_pausado.sql` é idêntico a `supabase/migrations/20260425000001_...` — redundante.
3. **`activity_logs` diverge nas policies RLS**:
   - `migrations/20260425_activity_logs.sql:18-26` → `activity_logs_select_editor USING (public.is_editor())` e `activity_logs_insert_authenticated WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid())`
   - `supabase/migrations/20260425000000_activity_logs.sql:18-26` → `"activity_logs: read for authenticated" USING (auth.role() = 'authenticated')` e insert `WITH CHECK (auth.role() = 'authenticated')`, com comentário "matches production"
   - Ou seja: **a versão realmente aplicada é a mais permissiva** — qualquer utilizador autenticado lê e escreve o log de auditoria. Detalhe para o Agente 2/3.
4. **Tabelas ausentes das migrações oficiais**: `council_members`, `institutional_documents`, `estatutos_leads` são criadas **apenas** em `migrations/` (`20260521_council_members.sql`, `20260521_institutional_documents.sql`, `20260519_estatutos_leads.sql`). Grep em `supabase/migrations/` e `supabase_schema.sql` por esses nomes: **zero**. Consequência concreta: um `supabase db reset` produz uma base **sem** as 3 tabelas que `councils.service.ts`, `documents.service.ts` e `estatutos-leads.service.ts` consultam — Conselhos, Documentação institucional e leads dos Estatutos quebram em qualquer ambiente recriado do zero.
5. `supabase/config.toml:65` declara `sql_paths = ["./seed.sql"]`, mas **`supabase/seed.sql` não existe** (`ls supabase/` → config.toml, functions, migrations). `seed_members_bio.sql` está na raiz e não é referenciado por nada.
6. `supabase_jwt_role_hook.sql` (`custom_access_token_hook`) tem equivalente em `supabase/migrations/20260425000002_custom_access_token_hook.sql`. Comparação linha-a-linha: **NÃO PROVADO** (não diferenciados neste passo).
7. `supabase_security_update.sql` define `is_editor`, `is_admin` e ~dezenas de policies; sobreposição com `20260101000001_rls_policies.sql`: **NÃO PROVADO**.

### 8.7 Outros
- `README.md` ainda é o boilerplate do Google AI Studio, refere `GEMINI_API_KEY` e `.env.local` — nada disso existe no projeto. Documentação enganosa.
- `.claude/settings.local.json` (18,4 KB) — `.gitignore` tem `/.claude`, logo não versionado.
- `git status`: 3 arquivos modificados não commitados (`.gitignore`, `components/ui/Modals.tsx`, `pages/documentacao/DocumentacaoPage.tsx`) + 2 testes novos não rastreados.

---

## Classificação

**P0**
- `council_members`, `institutional_documents`, `estatutos_leads` não existem em `supabase/migrations/` → ambiente recriado do zero fica sem 3 tabelas usadas em produção (§8.6.4).

**P1**
- RLS de `activity_logs` divergente e permissiva na versão aplicada (§8.6.3).
- Credenciais em `env` versionado (§8.1) e `_env fundação .eml` versionado (§8.2).
- `Modal` do god file sem Escape/focus trap enquanto `components/ui/Modals.tsx` tem — regressão de a11y no Dashboard e Eventos (§2.5).
- `MEMBERS_SEED` hardcoded como fonte primária, não fallback (§6).
- Fetch duplicado no arranque (`App.tsx:38-41` + `:68-71`), sem dedupe em nenhum service (§4).

**P2**
- Duplicação `component.ui.tsx`/`components/ui` e `component.domain.tsx`/`components/domain` — 24 componentes duplicados divergentes (§7).
- `FLB_STATE_EVENT` + `setTick` global: qualquer mutação re-renderiza 18 componentes (§3).
- 16 `console.*` sem guarda `DEV` em produção (§6).
- 97 MB de plugin OBS + `.lnk` + `LOGOSFUNDACAO/` no git (§8.3-8.4).
- `supabase/config.toml` aponta para `seed.sql` inexistente (§8.6.5).

**P3**
- Código órfão: `Carousel`, `PillarsGrid`, `PresidentMessage`, `EVENTS_SEED`, `getParceirosPorCategoria`, `exportState`/`importState` (§5).
- `resolveGalleryItemSrc` duplicado com assinaturas incompatíveis (§7.3).
- `supabase_schema.sql` e `migrations/20260425_precadastros_status_pausado.sql` como cópias redundantes (§8.6.1-2).
- README boilerplate enganoso (§8.7).
