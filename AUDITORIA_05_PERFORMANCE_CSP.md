# AUDITORIA 05 — BOOTSTRAP/NETWORK, PERFORMANCE E CSP/MÍDIA

**Projeto:** `fundacaolusobrasileira` (React 19.2.3 + Vite 6 + Supabase JS 2.106.1)
**Data:** 2026-09-07
**Agente:** 5 — Bootstrap/Network, Performance, CSP/Mídia
**Arquivos alterados:** nenhum (auditoria read-only)

---

## 0. LIMITES DE MEDIÇÃO (leia primeiro)

Esta auditoria é **análise estática**. O que NÃO pôde ser medido em runtime e por quê:

| Não medido | Motivo |
|---|---|
| Waterfall real de rede, contagem HTTP observada, TTFB/LCP/CLS/INP | Sem navegador nesta sessão |
| Latência e volume de linhas por query | Sem acesso ao banco Supabase |
| Tamanhos reais do bundle de produção atual | **Build impossível**: `node_modules/` foi instalado em Windows (bins `.cmd`/`.ps1`) e está incompleto — `node_modules/rollup/parseAst` ausente. `vite build` falha com `ERR_MODULE_NOT_FOUND`. |
| Bloqueio efetivo da CSP pelo navegador | Sem browser; conclusão derivada da spec CSP Level 3 |

**Correção a uma premissa do briefing:** `dist/` **não está versionado** — `git check-ignore dist` retorna `dist` (ignorado) e `git ls-files dist` retorna vazio. O `dist/` presente no disco é um **artefato local obsoleto**: mtime **2026-04-16**, enquanto o último commit é **2026-07-02** (`bafb811`). Prova adicional de obsolescência: `dist/index.html` não contém os favicons/OG-image adicionados em `index.html` a 2026-05-25. Todos os números de bundle abaixo derivados de `dist/` estão marcados **[STALE]**.

Convenção: **[MEDIDO]** = lido/computado diretamente do código ou de ficheiro no disco. **[INFERIDO]** = deduzido de semântica de biblioteca/spec.

---

## A) BOOTSTRAP E CONTAGEM DE REQUESTS

### A.1 — Queries por sync (MEDIDO, lendo cada service)

| Sync | Ficheiro:linha | Tabela | Queries REST | Guard |
|---|---|---|---|---|
| `syncMembers` | `services/members.service.ts:44-45` | `partners` `select('*')` | **1** | nenhum |
| `syncCouncils` | `services/councils.service.ts:26-32` | `council_members` `select('*')` | **1** | nenhum |
| `syncDocuments` | `services/documents.service.ts:23-29` | `institutional_documents` `select('*')` | **1** | nenhum |
| `syncEvents` | `services/events.service.ts:38-42` | `events` `select('*')` | **1** | nenhum |
| `syncPreCadastros` | `services/precadastros.service.ts:31-32` | `precadastros` | **1** | nenhum |
| `syncCommunityMedia` | `services/community-media.service.ts:18-22` | `community_media_submissions` | **1** | nenhum |
| `syncActivityLog` | `services/activity-log.service.ts:14-19` | `activity_logs` (limit 50) | **1** | nenhum |
| `syncEstatutosLeads` | `services/estatutos-leads.service.ts:48-53` | `estatutos_leads` | **1** | `isEditor()` (linha 49) |
| `resolveUserRole` | `services/auth.service.ts:160-169` | `profiles` `select('role').single()` | **1** | nenhum; timeout 3s |

**Nenhum sync faz join, N+1 ou query múltipla.** Todos são `select('*')` sem `.limit()` (exceto activity_logs) e sem projeção de colunas — sobrefetch de payload, não de contagem de requests.

**N+1 fora do bootstrap (para registo):** `fetchAllProfiles` (`services/auth.service.ts:266-357`) faz 2 a 4 queries em sequência (`profiles` primária → fallback sem `phone` → `profiles` de novo só para `partner_id` → `partners`). Só corre no modal de utilizadores (admin).

### A.2 — Cache / dedupe / in-flight guard: **NÃO EXISTE** (MEDIDO)

Provado por leitura integral dos 8 services: nenhum tem variável de módulo com promise em voo, timestamp de TTL, nem verificação de "já carregado". Cada chamada de `syncX()` faz incondicionalmente `await supabase.from(...)`. Se `syncEvents()` for chamado 3× no mesmo tick, saem 3 requests HTTP.

A **única** serialização existente no repositório é `galleryWriteChain` (`services/events.service.ts:178, 184-205`) — um *promise queue por eventId* para **escritas** de galeria. Não é cache de leitura, não afeta os syncs.

### A.3 — Polling / realtime / subscriptions da aplicação: **ZERO** (MEDIDO)

`grep -rn "setInterval|supabase.channel|postgres_changes|.subscribe(|removeChannel"` em todos os `.ts`/`.tsx` (excluindo `node_modules` e testes) retorna **nenhum resultado**. Não há polling nem Supabase Realtime na app.

**Timers internos do SDK (não são da app, mas existem):**
- `node_modules/@supabase/auth-js/dist/main/GoTrueClient.js:4052` — `setInterval(_autoRefreshTokenTick, 30_000)`. Tick a cada 30s; só emite request quando o token está a ≤ `EXPIRY_MARGIN_MS` (3 ticks = 90s) de expirar (`constants.js:6,13`).
- Idem `:4251` — `window.addEventListener('visibilitychange', ...)` para retomar auto-refresh.

**Única subscription da app:** `supabase.auth.onAuthStateChange` em `App.tsx:47`. O `unsubscribe()` só corre em `import.meta.hot.dispose` (`App.tsx:115-119`) — **HMR apenas**. Em produção o listener vive para sempre; como é criado uma única vez no import do módulo, não há leak acumulativo. Aceitável.

### A.4 — Ordem real dos eventos de auth (MEDIDO no SDK v2.106.1)

Factos verificados em `GoTrueClient.js`:
- `:3892` — `_recoverAndRefresh()` emite **`SIGNED_IN`** quando recupera do localStorage uma sessão **ainda válida**. Ou seja: **um simples refresh de página com sessão viva dispara `SIGNED_IN`**, além de `INITIAL_SESSION`.
- `:3923` — refresh de token emite **`TOKEN_REFRESHED`** (não `SIGNED_IN`). **O comentário em `App.tsx:51` ("On SIGNED_IN (token refresh)") descreve mal o mecanismo**: o refresh periódico emite `TOKEN_REFRESHED`, que o código não trata (cai só no `notifyState()` de `App.tsx:111`) — o que, por acidente, é o comportamento correto: **0 queries**.
- `:3423` — `INITIAL_SESSION` é entregue por emitter **depois** de `await this.initializePromise`. `SIGNED_IN` do `_recoverAndRefresh` é emitido **durante** a inicialização. A ordem relativa face ao registo do subscriber em `App.tsx:47` é uma corrida — exatamente o que o comentário `App.tsx:54-56` descreve.
- `:206-221` — existe **`BroadcastChannel`** com chave = storageKey. Todo `_notifyAllSubscribers(..., broadcast=true)` faz `postMessage` (`:3950-3952`). **Eventos de auth propagam-se entre abas.**

### A.5 — Análise do guard `alreadyResolved` (`App.tsx:57-66`) — **FALHA PARA ROLE `viewer`**

```
const alreadyResolved =
  event === 'SIGNED_IN' && (
    (AUTH_SESSION.isLoggedIn && AUTH_SESSION.userId === session.user.id && AUTH_SESSION.role !== 'viewer') ||
    AUTH_LOADING
  );
```

Cobre dois casos, mas deixa um buraco: `resolveUserRole` (`auth.service.ts:166-168`) mapeia **qualquer role que não seja `admin`/`editor` para `'viewer'`** — incluindo `role = 'membro'`, que é o role por defeito de utilizadores registados (`auth.service.ts:251`). Logo, para um **membro autenticado**:

- `AUTH_LOADING` já é `false` (INITIAL_SESSION resolveu), e
- `AUTH_SESSION.role === 'viewer'` → a condição falha →
- o `SIGNED_IN` seguinte **repete os 4 syncs + `resolveUserRole`**.

O mesmo se aplica quando `resolveUserRole` sofre timeout (3s, `auth.service.ts:171-176`) e devolve `'viewer'` a um admin: o `SIGNED_IN` seguinte volta a disparar 5 queries. **P1.**

### A.6 — TABELA DE CONTAGEM TOTAL DE REQUESTS

Contagem = requests HTTP à API Supabase. "REST" = PostgREST (`/rest/v1/...`); "Auth" = `/auth/v1/...`.
Todos os números são **[MEDIDO]** por rastreio de código, exceto onde marcado.

| # | Cenário | Sequência (ficheiro:linha) | REST | Auth | **Total** | Duplicadas / evitáveis |
|---|---|---|---|---|---|---|
| **1** | **Primeira visita anónima** | import `App.tsx:38-41` → 4 (`partners`,`council_members`,`institutional_documents`,`events`); `INITIAL_SESSION` sem sessão `App.tsx:96-100` → `syncEvents()` +1 | **5** | 0 | **5** | **1** (`events` 2×) |
| **2a** | **Refresh, admin/editor** (caminho feliz: `SIGNED_IN` chega com `AUTH_LOADING=true`, ou depois com role≠viewer → *skip*) | import → 4; `INITIAL_SESSION` c/ sessão `App.tsx:68-71` → 4; `resolveUserRole` `:74` → 1; editor syncs `:89-92` → 4 | **13** | 0¹ | **13** | **4** (partners/councils/documents/events todos 2×) |
| **2b** | **Refresh, utilizador `membro`** (ou admin cujo `resolveUserRole` deu timeout) — guard `alreadyResolved` falha | import → 4; `INITIAL_SESSION` → 4 + role 1; `SIGNED_IN` **não** skipped → 4 + role 1 | **14** | 0¹ | **14** | **9** (4+4 syncs + 1 role duplicados) |
| **3** | **Login a partir de anónimo** | baseline anónimo 5 (já gastos) + `signInWithPassword` 1 Auth + `SIGNED_IN` → 4 syncs + role 1 + (se admin/editor) 4 + `persistLogEntry` insert 1 (`app.store.ts:61-63`) | **10** | **1** | **11** (sessão acumulada **16**) | **4** (os 4 syncs já feitos no import) |
| **4** | **Token refresh (`TOKEN_REFRESHED`)** | `GoTrueClient:3923` → evento não tratado; cai só no `notifyState()` de `App.tsx:111` | **0** | **1** | **1** | 0 — **correto por acidente** |
| **5** | **Logout** | `logout()` `auth.service.ts:213-219`: `logActivity` antes do `setAuthSession(false)` → 1 insert²; `signOut` 1 Auth; `SIGNED_OUT` `App.tsx:105-108` → 4 syncs | **5** | **1** | **6** | **4** — os 4 syncs são **100% desnecessários** (ver A.7) |
| **6** | **Duas abas abertas** | cada aba corre o seu bootstrap independentemente; `BroadcastChannel` (`GoTrueClient:206-221`) replica `SIGNED_IN`/`SIGNED_OUT` na aba passiva | 2× o cenário aplicável | | **10** (anónimo), **26** (admin), e **+9 por aba passiva** a cada login noutra aba; **+4 por aba passiva** a cada logout | ~50% |

¹ Zero requests Auth se o access token ainda é válido (`_recoverAndRefresh` recupera do localStorage). Se expirado: +1 `POST /auth/v1/token?grant_type=refresh_token`.
² O `logActivity` corre com `AUTH_SESSION.isLoggedIn` ainda `true`, logo tenta o INSERT; após `signOut` a RLS provavelmente rejeita — request gasto, erro silenciado por `.catch(() => {})` (`app.store.ts:62`).

### A.7 — Quais requests podem ser eliminados

| Request | Onde | Porquê é eliminável | Poupança |
|---|---|---|---|
| `syncEvents()` do `INITIAL_SESSION` anónimo | `App.tsx:100` | O comentário diz "garante sync após auth context estabelecido", mas os syncs do import (`:38-41`) já correm com o **mesmo** contexto anónimo (o cliente Supabase só anexa o JWT quando existe). Chamada redundante. | −1 em toda visita anónima |
| Os 4 syncs do `SIGNED_OUT` | `App.tsx:105-108` | Após logout o utilizador só pode ver dados públicos — que os syncs do import já carregaram. Se a intenção é *purgar* linhas que a RLS de editor revelou, então também está errado: `clearEditorOnlyState()` (`:104`) já limpa os arrays sensíveis, e `partners`/`council_members`/`institutional_documents` não têm campos gated no store. | −4 por logout |
| Os 4 syncs do `SIGNED_IN`/`INITIAL_SESSION` com sessão | `App.tsx:68-71` | Duplicam exatamente os do import, que já correram ~0-300 ms antes. Um dedupe/TTL de 5s no service eliminava-os. | −4 por refresh autenticado |
| `resolveUserRole` + 4 syncs repetidos no `SIGNED_IN` para role `viewer`/`membro` | `App.tsx:57-61` | Bug do guard (A.5): usar `AUTH_SESSION.userId === session.user.id && !AUTH_LOADING` em vez de `role !== 'viewer'`. | −5 por refresh de membro |
| `syncEvents()` no mount de `EventoDetalhePage` | `pages/eventos/EventoDetalhePage.tsx:34` | Refetch integral da tabela `events` a cada abertura de detalhe, além do `setTimeout(600ms)` artificial (`:35-39`) que atrasa o render sem relação com a resposta. | −1 por navegação |

**Total teórico:** primeira visita anónima 5 → **4**; refresh de admin 13 → **4** (ou 5 com o role); logout 6 → **2**.

---

## B) RENDER E MEMORY

### B.1 — `FLB_STATE_EVENT`: 21 listeners distintos (MEDIDO)

`store/app.store.ts:4` define o evento; `:34` faz o dispatch. Componentes/hooks que subscrevem (`window.addEventListener(FLB_STATE_EVENT, ...)`):

`router.tsx:25` · `component.ui.tsx:2014` · `components/domain/Header.tsx:25` · `components/domain/SmartInviteModal.tsx:37` · `hooks/useAuthSession.ts:20` · `pages/administracao/AdminPage.tsx:193` · `pages/beneficios/BeneficiosPage.tsx:33` · `pages/dashboard/CouncilManagerSection.tsx:222` · `pages/dashboard/DashboardMediaPage.tsx:18` e `:104` · `pages/dashboard/DashboardPage.tsx:63` · `pages/dashboard/DocumentManagerSection.tsx:226` · `pages/documentacao/DocumentacaoPage.tsx:370` · `pages/eventos/EventoDetalhePage.tsx:49` · `pages/eventos/EventosPage.tsx:141` · `pages/home/HomePage.tsx:89` · `pages/membro/MembroPerfilPage.tsx:51` · `pages/parceiros/ParceiroPerfilPage.tsx:41` · `pages/parceiros/ParceirosPage.tsx:39` · `pages/quem-somos/QuemSomosPage.tsx:19`

**Quantos estão montados ao mesmo tempo:** entre **3 e 6**. Sempre montados: `Header`, `SmartInviteModal`, `ProtectedRoute` (nas rotas protegidas). Mais 1-3 da página ativa. **Não é um fan-out patológico.**

**O que cada handler faz:** invariavelmente `setTick(t => t + 1)` (ou `setState({...AUTH_SESSION})`). Como os dados vivem em arrays mutados in-place (`EVENTS.length = 0; EVENTS.push(...)`), **cada evento força re-render da árvore completa de cada página subscrita** — não há reconciliação por chave de dados nem memoização. Numa página como `DashboardPage` isso re-renderiza todas as listas.

### B.2 — Coalescing: o código **CUMPRE** o que `docs/architecture/state-coalescing.md` descreve (MEDIDO)

`store/app.store.ts:28-36` implementa exatamente o snippet documentado: flag `stateNotifyPending` + `queueMicrotask`. N chamadas síncronas no mesmo tick → 1 dispatch. Documentação e implementação estão alinhadas.

**Mas o coalescing não cobre o caso real deste bootstrap.** Os 4 (ou 8, ou 13) syncs são **`async` e independentes** — cada `await supabase...` resolve num tick diferente, e cada um chama `notifyState()` no seu próprio tick. Além disso `syncEvents` chama `notifyState()` **duas** vezes (`events.service.ts:41` antes da query, `:52` depois). Resultado prático num refresh de admin: **≈9-14 dispatches** separados, cada um a re-renderizar 3-6 subscritores. O coalescing por microtask só apanha chamadas verdadeiramente síncronas (ex.: `clearEditorOnlyState()` + `notifyState()`). **P2 — o mecanismo está correto mas mal dimensionado; um `requestAnimationFrame`/debounce de ~16 ms cobriria o caso real.**

### B.3 — Listeners, timers e deps (MEDIDO — auditoria completa)

**Listeners de `window`/`document`: todos com `removeEventListener` no cleanup.** Verificados um a um: `component.domain.tsx:80-82` (scroll), `component.ui.tsx:45` (toast), `:1740-1741` (mousedown, dep `[pickerOpen]`), `:2014-2015`, `components/ui/ExpandableText.tsx:40-41`, `components/ui/Modals.tsx:80`, `components/ui/Toast.tsx:35`, `pages/dashboard/UserManagerModal.tsx:47`, `pages/home/HomePage.tsx:110-111` (mousemove), + os 21 de `FLB_STATE_EVENT`. **Nenhum leak encontrado.**

**`useEffect` sem array de dependências:** **nenhum** (grep exaustivo em `.tsx`).

**Timers:**
- `hooks/useAuthSession.ts:29-41` — `setTimeout(4000)` com `clearTimeout` no cleanup (`:46`). OK.
- `pages/eventos/EventoDetalhePage.tsx:35-39` — **`setTimeout(600ms)` sem `clearTimeout`**. Se o utilizador navegar para fora antes de 600 ms, o callback corre e chama `setEvent`/`setLoading` num componente desmontado. Em React 19 não há warning, mas é um update perdido e um atraso artificial de 600 ms no LCP da página de evento. **P2.**
- `pages/documentacao/DocumentacaoPage.tsx:71` — `setTimeout(1000)` para `revokeObjectURL`. Fire-and-forget aceitável.
- `services/auth.service.ts:171-176` — o `setTimeout(3000)` do `Promise.race` de `resolveUserRole` **nunca é limpo**: mesmo quando a query ganha a corrida, o timer fica pendente 3 s. Sem impacto funcional (o `resolve` do losing branch é ignorado), mas mantém uma closure viva. **P3.**
- `pages/administracao/AdminPage.tsx:194` — `clearTimeout(t)` presente. OK.

**Dep instáveis:** `component.ui.tsx:1733` usa `[isOpen, precadastro?.id]` — correto. Não foram encontradas deps com objetos/arrays recriados por render.

### B.4 — `component.ui.tsx` (138 834 bytes) e o code-splitting

**Conclusão: o code-splitting NÃO é anulado — mas há um custo real em rotas públicas.** (MEDIDO)

Importadores de `component.ui` em produção (grep completo, excluindo testes):

| Ficheiro | Linha | Importa |
|---|---|---|
| `component.domain.tsx` | 7 | `Button, Badge, Card, SocialIcons, LoginModal, Input, AsyncImage` |
| `pages/dashboard/DashboardPage.tsx` | 4 | 11 símbolos (todos os modais de admin) |
| `pages/eventos/EventoDetalhePage.tsx` | 4, 7 | `Lightbox, AsyncImage, ShareActions, SocialIcons` + `EventEditorModal` |
| `pages/eventos/EventosPage.tsx` | 3 | `EventEditorModal` |
| `pages/dashboard/DashboardMediaPage.tsx` | 4 | via `component.domain` |

`App.tsx:3` importa `components/domain` (barrel) → `Header`/`Footer`, **não** `component.domain.tsx` nem `component.ui.tsx`. Confirmado no build [STALE]: `dist/assets/component.ui-CG0SYkTG.js` é um **chunk separado de 67 617 B (15 395 B gzip)**, não parte da entry.

**O problema real:** `component.ui.tsx` é um módulo monolítico com **31 exports** e sem `sideEffects:false` no `package.json`. Como `EventosPage` (rota **pública** `/eventos`) e `EventoDetalhePage` (rota **pública** `/eventos/:id`) importam dele, **qualquer visitante anónimo dessas páginas descarrega o chunk inteiro** — incluindo `PreCadastroManagerModal`, `SettingsModal`, `MemberEditorModal`, `MediaManagerModal`, `UniversalListModal` (todos exclusivos de admin). **P1 — ~15 KB gzip de código de administração servido a visitantes anónimos.**

---

## C) BUNDLE E ASSETS

### C.1 — `manualChunks` (`vite.config.ts:23-27`)

```
'vendor-react':    ['react', 'react-dom', 'react-router-dom'],
'vendor-supabase': ['@supabase/supabase-js'],
```

Medições do build **[STALE, 2026-04-16]** (`gzip -c | wc -c`):

| Chunk | Raw | Gzip |
|---|---|---|
| `index-BUoeCNEI.js` (entry) | 300 652 | **92 368** |
| `vendor-supabase-vtL5VWMt.js` | 171 116 | **44 115** |
| `component.ui-CG0SYkTG.js` | 67 617 | 15 395 |
| `vendor-react-q5f1n1Zq.js` | 45 891 | **16 371** |
| `index-CoMNFgVo.css` | 78 024 | 12 450 |
| `DashboardPage-B2l9UaJ3.js` | 30 683 | 8 195 |
| `HomePage-BFFNoDTG.js` | 25 613 | 7 081 |

**Anomalia:** 45 891 B raw é pequeno demais para conter `react` + `react-dom` + `react-router-dom` (react-dom sozinho ronda ~130 KB minificado). **[INFERIDO]** O `manualChunks` não está a capturar `react-dom` como esperado — provavelmente por o entry o alcançar via `react-dom/client` (subpath) e o entry (300 KB) o absorver. Efeito: o chunk de vendor "estável" (cacheável 1 ano por `vercel.json`) não contém o React, e o entry — que muda a cada deploy — carrega-o. **P2, a confirmar com um build real.** Correção: usar a forma função de `manualChunks` ou incluir `'react-dom/client'` no array.

**Caminho crítico do primeiro paint [STALE]:** entry 92 KB gz + vendor-supabase 44 KB gz + vendor-react 16 KB gz + CSS 12 KB gz ≈ **164 KB gzip**, os três JS em `modulepreload` (`dist/index.html`). Nota: `@supabase/supabase-js` (44 KB gz) está no caminho crítico de **todas** as visitas, incluindo anónimas — é importado sincronamente por `App.tsx:10`.

**CSS 78 KB raw** para uma app com um `index.css` de 1 204 B — é Tailwind. `tailwind.config.ts` não tem `safelist` visível no excerto lido, mas 78 KB pós-purge sugere `content` demasiado abrangente ou classes dinâmicas (ex.: `` `line-clamp-${previewLines}` `` em `components/ui/ExpandableText.tsx:47`, que só funciona se a classe estiver safelisted/presente). **P3, verificar.**

### C.2 — `public/` — **27,8 MB** (MEDIDO)

| Categoria | Bytes | Nota |
|---|---|---|
| **PDFs (7)** | **26 220 431** (94% da pasta) | |
| PNG + `.PNG` (13) | 1 456 500 | |
| WEBP (4) | ~121 000 | |
| SVG, ICO, manifest | ~21 000 | |

**PDFs individuais:** `relatorio-contas-2021.pdf` **6,96 MB**, `relatorio-contas-2024.pdf` **5,89 MB**, `relatorio-contas-2022.pdf` **5,43 MB**, `contas-2023.pdf` **5,11 MB**, `relatorio-gestao-2023.pdf` 1,69 MB, `Estatutos.pdf` 764 KB, `parecer-conselho-fiscal-2024.pdf` 376 KB.

Estes 26 MB são servidos como estáticos e **não estão cobertos pelas regras de cache de `vercel.json`** (que só cobrem `/assets/(.*)` e `png|webp|svg|jpg|jpeg`) → sem `Cache-Control` explícito, dependem do default do Vercel. Além disso, `pages/documentacao/DocumentacaoPage.tsx:56-71` faz `fetch()` + `blob()` + `createObjectURL` para forçar o download — isto **carrega os 7 MB para memória JS** antes de gravar, em vez de usar `<a download href>` direto. Em mobile, um PDF de 7 MB em `Blob` é risco de OOM. **P2.**

**Duplicação PNG/WEBP (MEDIDO):**

| Par | PNG | WEBP | Desperdício |
|---|---|---|---|
| `logo-flb-full` | 362 021 | 47 118 | **314 903 B** |
| `logo-flb` | 128 702 | 39 580 | **89 122 B** |
| `flag-portugal` | 25 068 (+ SVG 14 865) | — | triplicado |
| `flag-brazil` | 10 948 (+ SVG 4 243) | — | duplicado |

Adicionalmente, `public/ICON + NOME FUNDAÇÃO LOGO.PNG` (362 021 B) é **byte-idêntico em tamanho a `logo-flb-full.png`**, e `ICON LOGO FUNDAÇÃO.PNG` (181 650 B) parece ser outra cópia — dois ficheiros com espaços e acentos no nome (URLs percent-encoded), sem referência em nenhum `.tsx` (grep). **Lixo de 544 KB em `public/`. P3.**

Grep de referências confirma que o código usa apenas os `.webp` (`components/domain/BrandLogo.tsx:13`, `pages/home/HomePage.tsx:269, 410`, `data/members.data.ts:12`) — **os PNG grandes não são referenciados por nenhum componente**; existem só como fallback de OG/favicon (`og-image.png` 194 KB, `icon-512.png` 129 KB são legítimos).

### C.3 — Fontes (`index.html:35-41`)

O padrão preload+onload está **sintaticamente correto**:
```html
<link rel="preload" href="…fonts.googleapis.com/css2?…" as="style"
      onload="this.onload=null;this.rel='stylesheet'">
<noscript><link … rel="stylesheet"></noscript>
```
com `preconnect` para `fonts.googleapis.com` e `fonts.gstatic.com` (com `crossorigin`) nas linhas 36-37. **Correto.**

**Duas ressalvas:**
1. **O `onload=` é um inline event handler.** Só executa porque a CSP tem `script-src 'unsafe-inline'` (`index.html:8`). **Se alguém endurecer a CSP removendo `'unsafe-inline'`, as fontes deixam de aplicar-se em browsers com JS ativo** (o `<noscript>` não cobre esse caso). Acoplamento não documentado. **P2.**
2. `<link rel="preload" as="image" href="/logo-flb.webp">` (`:35`) — só a HomePage usa esse ficheiro (`pages/home/HomePage.tsx:269`); em qualquer outra rota é um download desperdiçado de 39,6 KB. O logo do header (`components/domain/BrandLogo.tsx:13`, `/logo-flb-full.webp`, 47 KB), esse sim presente em **todas** as páginas, **não** é preloaded. **Preload aplicado ao ficheiro errado. P2.**

**Custo real das fontes (contagem correta, corrigindo o briefing):** a query pede **Inter 5 pesos** (200,300,400,500,600) + **Playfair Display 5 faces** (0,300; 0,400; 0,500; 0,600; 1,400 — **não 8**) + **Pinyon Script 1** = **11 faces**. `tailwind.config.ts:13-15` usa as três famílias. **[INFERIDO]** o CSS2 do Google serve `unicode-range` por subset; com `latin` + `latin-ext` (necessário para PT-BR: ã, ç, õ) são ~2 ficheiros woff2 por face → **~22 requests de fonte, ~180-300 KB**, todos em `fonts.gstatic.com` (terceira origem, sem partilha de cache HTTP entre sites desde 2020). Pinyon Script é decorativa e provavelmente usada em pouquíssimos elementos: candidata óbvia a corte, tal como Inter 200 e 500.

---

## D) CSP E MÍDIA — **FUNCIONALIDADE FANTASMA CONFIRMADA**

### D.1 — A CSP (`index.html:8`, idêntica em `dist/index.html`)

```
default-src 'self';
script-src 'self' 'unsafe-inline';
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
font-src 'self' https://fonts.gstatic.com;
img-src 'self' data: blob: https:;
connect-src 'self' https://*.supabase.co wss://*.supabase.co;
object-src 'none';
base-uri 'self';
```

**Ausentes: `frame-src`, `media-src`, `form-action`, `frame-ancestors`, `worker-src`.** Pela CSP Level 3, `frame-src` e `media-src` fazem fallback para `default-src` — aqui, **`'self'`**.

### D.2 — P0: os embeds de vídeo do YouTube **estão bloqueados em produção**

Dois `<iframe>` no código, ambos com `src` apontando a domínio externo:

**(1) Preview do modal "Adicionar Mídia por URL" — `component.ui.tsx:634-640`**
```jsx
<iframe
  title="Prévia do vídeo"
  src={urlDraft.replace('watch?v=', 'embed/')}   // ← component.ui.tsx:636
  className="w-full h-full"
  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
  allowFullScreen
/>
```
Placeholder do campo: `'https://youtube.com/...'` (`component.ui.tsx:628`).

**(2) Lightbox público de eventos — `component.ui.tsx:2208-2214`**
```jsx
<iframe
  src={currentItem.src.replace('watch?v=', 'embed/')}   // ← component.ui.tsx:2209
  className="w-full h-full" frameBorder="0"
  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
  allowFullScreen
></iframe>
```
Usado em `pages/eventos/EventoDetalhePage.tsx:303-309`, alimentado pela galeria do evento (`:87-101`), onde `type: item.kind` — e `kind: 'video'` é atribuído em `services/events.service.ts:215` e `:239-245` (`addUrlMediaToEvent(..., 'video')`).

**Prova do bloqueio:**
- `src` resolvido = `https://www.youtube.com/embed/<id>`.
- Diretiva aplicável a `<iframe>` = `frame-src`; **`frame-src` não existe** na policy → fallback para `default-src 'self'`.
- `https://www.youtube.com` ≠ `'self'` (a origem é `fundacaolusobrasileira.vercel.app`, per `index.html:20`).
- → **o browser recusa o carregamento** e emite `Refused to frame 'https://www.youtube.com/' because it violates the following Content Security Policy directive: "default-src 'self'"`.
- **`img-src` permite `https:` — mas `img-src` não governa iframes.** Ter `https:` liberado para imagens não ajuda em nada aqui.

**Conclusão: SIM, é funcionalidade fantasma.** A UI oferece um separador "Vídeo" (`component.ui.tsx:611-617`), um campo com placeholder de YouTube (`:628`), um preview (`:634`), o service aceita e persiste (`events.service.ts:233-247`), a página pública tenta renderizar (`:2208`) — e **nada disso funciona em produção**. O editor vê o preview em branco e assume link partido; o visitante vê um retângulo vazio no lightbox. Nenhum erro é apresentado ao utilizador (a CSP falha silenciosamente na UI; só a consola regista).

Correção mínima: acrescentar `frame-src https://www.youtube-nocookie.com https://www.youtube.com https://player.vimeo.com;` à meta CSP — **e** movê-la para um header HTTP em `vercel.json` (uma CSP em `<meta>` não pode restringir `frame-ancestors` nem `sandbox`, e só entra em vigor depois do parser a alcançar).

**`media-src` ausente:** não existe hoje nenhum `<video>`/`<audio>` no código (grep confirmou: zero ocorrências de `<video` fora do ícone Lucide `Video`). Mas `services/events.service.ts:215` classifica uploads MP4 como `kind: 'video'` e `media.service` guarda-os no Supabase Storage — **se alguém trocar o iframe por `<video src>`, o ficheiro em `*.supabase.co` será bloqueado** por `media-src` → `default-src 'self'`. Mina por rebentar. **P2.**

### D.3 — `connect-src` — uma chamada em risco

`connect-src 'self' https://*.supabase.co wss://*.supabase.co` cobre:
- todas as queries PostgREST e Auth (`supabaseClient.ts:10`) ✔
- Storage uploads (`services/documents.service.ts:52`, `media.service`) ✔ (mesmo domínio)
- **`pages/documentacao/DocumentacaoPage.tsx:57` — `fetch(sourceUrl, { mode: 'cors' })`**, onde `sourceUrl` = `d.file_url` vindo da tabela `institutional_documents` (`:100`). Se um editor registar um documento com URL num CDN externo (Google Drive, S3 próprio, site institucional), **o download é bloqueado por `connect-src`** e o utilizador vê apenas a exceção de `:58-60`. Hoje funciona porque os URLs são `/…​.pdf` (self) ou Supabase Storage. **P2 — fragilidade latente, dependente de dados.**
- `services/auth.service.ts:119` — `fetch('http://127.0.0.1:8787/admin-create-user')`: bloqueado por `connect-src` **e** por mixed-content. Irrelevante em prod: `evaluateAuthBypass()` (`:25-31`) recusa-o em builds `PROD`. Correto.

Nenhuma chamada a analytics ou APIs de terceiros existe no código (grep de `fetch(` retorna apenas as duas acima). Não há Google Analytics, Sentry, nem tag manager — a `connect-src` estreita não custa nada hoje.

### D.4 — `script-src 'unsafe-inline'` — severidade

**Severidade real: MÉDIA-BAIXA, mas não nula.**

Atenuantes (MEDIDO):
- Nenhum framework/SDK de terceiros carregado (grep: zero `<script src>` externos em `index.html`; `package.json` só tem react, react-router, supabase, lucide, zod).
- `object-src 'none'` e `base-uri 'self'` presentes — fecham dois vetores clássicos.
- O único inline script legítimo é o `onload=` do preload de fontes (`index.html:38`) — 40 caracteres.

Agravantes:
- `'unsafe-inline'` remove a proteção da CSP contra **XSS refletido/armazenado**, que é exatamente o risco desta app: o conteúdo (`partners.bio`, `events.description`, `institutional_documents.title`, `community_media_submissions.url`) é escrito por editores e por submissões da comunidade e renderizado no site público. Se qualquer sítio usar `dangerouslySetInnerHTML` (fora do meu escopo — Agente 3), a CSP não travaria a exploração.
- A CSP está em `<meta>` e não em header — não protege o documento antes do parse, e não pode declarar `frame-ancestors`.

Correção: substituir `'unsafe-inline'` por um `nonce` no único inline handler (ou trocar o padrão de fonte por `<link rel="stylesheet" media="print" onload="this.media='all'">`… que tem o mesmo problema; o mais limpo é auto-hospedar as fontes e usar um `<link rel="stylesheet">` normal, eliminando o inline **e** a dependência de `fonts.gstatic.com`).

### D.5 — Preview de mídia renderiza URL **antes** de validar (vetor)

**`component.ui.tsx:631-640`** — o iframe é montado com base apenas em `urlDraft.trim()`, **enquanto o utilizador digita**. A validação (`isSafeHttpUrl`, `utils/url.ts:15-23`) só corre **depois**, dentro de `addUrlMediaToEvent` (`services/events.service.ts:235`), chamado a partir de `handleUrlAdd` (`component.ui.tsx:481`) — ou seja, **só ao clicar em "Adicionar URL"**.

Consequência: um `javascript:`, `data:text/html,…` ou URL arbitrária torna-se `iframe.src` sem qualquer verificação de esquema. O mesmo padrão em `pages/eventos/EventoColaborarPage.tsx:299-306` (`<img src={previewUrl}>` sem validação — este é inócuo, `img` não executa) e em `component.ui.tsx:650-655`.

**Impacto real hoje: baixo** — a CSP (`default-src 'self'`) bloqueia `data:` e origens externas em frames, e o alvo é auto-infligido (o próprio editor cola o URL). **Mas é exatamente a mesma CSP que quebra a funcionalidade legítima (D.2): no dia em que se acrescentar `frame-src` para desbloquear o YouTube, este preview passa a ser um vetor real** se `frame-src` for permissiva. **P2 — validar o URL (`isSafeHttpUrl` + allowlist de host YouTube/Vimeo) antes de renderizar o preview, na mesma mudança que corrige a CSP.**

### D.6 — `public/_headers` é inerte e contradiz a política

```
/*
  X-Frame-Options: ALLOWALL
  Content-Security-Policy: frame-ancestors *
```
- Formato **Netlify/Cloudflare Pages**. O deploy é **Vercel** (`vercel.json`, `.vercel/project.json`, `og:url` = `*.vercel.app`) — **Vercel ignora `_headers`**; headers têm de estar em `vercel.json`, que só define `Cache-Control`. **Ficheiro morto.**
- Se algum dia for honrado: `X-Frame-Options: ALLOWALL` não é um valor válido da spec (só `DENY`/`SAMEORIGIN`) e `frame-ancestors *` permitiria clickjacking do site inteiro. **Além disso, um segundo header CSP não substitui o `<meta>` — as duas políticas aplicam-se em conjunção (a mais restritiva vence em cada diretiva).**
- **P3** — remover ou migrar para `vercel.json` com `frame-ancestors 'none'`.

---

## RESUMO PRIORIZADO

### P0
1. **Embeds de vídeo YouTube completamente bloqueados em produção** — `component.ui.tsx:2208` (lightbox público) e `:634` (preview do editor). Falta `frame-src` na CSP de `index.html:8`; fallback para `default-src 'self'`. Feature existe em UI, service e persistência, e não funciona. Falha silenciosa.

### P1
2. **13-14 requests Supabase por refresh autenticado, 4-9 delas duplicadas** — syncs no import (`App.tsx:38-41`) repetidos em `INITIAL_SESSION`/`SIGNED_IN` (`:68-71`). Zero cache/dedupe em qualquer service.
3. **Guard `alreadyResolved` falha para role `viewer`/`membro`** (`App.tsx:57-61`): utilizadores `membro` — e admins cujo `resolveUserRole` sofreu timeout — pagam +5 queries por refresh. Condição deve testar `userId` + `!AUTH_LOADING`, não `role !== 'viewer'`.
4. **Rotas públicas `/eventos` e `/eventos/:id` descarregam o chunk `component.ui` inteiro** (~15 KB gzip [STALE]) só por importarem `EventEditorModal`/`Lightbox` — inclui todos os modais de administração. `pages/eventos/EventosPage.tsx:3`, `EventoDetalhePage.tsx:4,7`.
5. **26 MB de PDFs em `public/`** (94% da pasta), fora das regras de `Cache-Control` de `vercel.json`, e descarregados via `fetch`+`Blob` em memória (`DocumentacaoPage.tsx:56-71`) — até 7 MB por ficheiro.

### P2
6. Coalescing de `notifyState` (`app.store.ts:29-36`) só apanha chamadas síncronas; os syncs assíncronos geram ~9-14 dispatches por bootstrap × 3-6 subscritores.
7. `manualChunks` provavelmente não captura `react-dom` (vendor-react = 45,9 KB raw [STALE]) — React acaba no entry que muda a cada deploy, perdendo cache de longo prazo.
8. `setTimeout(600ms)` sem `clearTimeout` em `EventoDetalhePage.tsx:35-39` + `syncEvents()` no mount (`:34`): atraso artificial no LCP e state update pós-unmount.
9. Preload de imagem aplicado ao ficheiro errado (`index.html:35` preload `/logo-flb.webp`, só usado na Home; o logo global `/logo-flb-full.webp` não é preloaded).
10. `font-swap` via `onload=` inline (`index.html:38`) depende de `script-src 'unsafe-inline'` — endurecer a CSP quebra as fontes.
11. Preview de mídia renderiza URL não validada como `iframe.src` (`component.ui.tsx:636`); validação só em `events.service.ts:235`, ao submeter. Mitigado hoje pela CSP — deixa de estar quando o P0 for corrigido.
12. `connect-src` sem wildcard: `fetch(file_url)` em `DocumentacaoPage.tsx:57` falha se um editor registar um PDF em domínio externo.
13. `media-src` ausente: qualquer futuro `<video src="https://…supabase.co/…">` será bloqueado.
14. `script-src 'unsafe-inline'` + CSP em `<meta>` em vez de header: sem proteção contra XSS armazenado num site cujo conteúdo vem de editores e da comunidade.

### P3
15. `SIGNED_OUT` dispara 4 syncs desnecessários (`App.tsx:105-108`); `logActivity` no logout gasta um INSERT que a RLS rejeitará (`auth.service.ts:216`).
16. `public/_headers` é inerte no Vercel e, se honrado, permitiria clickjacking (`frame-ancestors *`).
17. ~544 KB de PNG órfãos em `public/` (`ICON + NOME FUNDAÇÃO LOGO.PNG`, `ICON LOGO FUNDAÇÃO.PNG`) sem referência no código; +404 KB em PNG duplicados de `.webp` já usados.
18. 11 faces de fonte de 3 famílias (~22 requests a `fonts.gstatic.com` [INFERIDO]); Pinyon Script e os pesos Inter 200/500 são candidatos a corte.
19. `setTimeout` do `Promise.race` em `resolveUserRole` (`auth.service.ts:171-176`) nunca é limpo.
20. CSS de 78 KB raw [STALE] para um `index.css` de 1,2 KB — purge do Tailwind a rever (classe dinâmica `line-clamp-${n}` em `ExpandableText.tsx:47`).
21. `dist/` local está obsoleto (2026-04-16 vs. commit de 2026-07-02) e é gitignored — não confiar nele; foi usado aqui apenas como proxy declarado.
