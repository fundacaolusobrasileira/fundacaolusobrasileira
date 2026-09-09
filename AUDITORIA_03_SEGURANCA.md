# AUDITORIA 03 — SEGURANÇA, AUTENTICAÇÃO, AUTORIZAÇÃO E BACKUP/RESTORE

Projeto: `fundacaolusobrasileira` (React 19 + Vite + Supabase, HashRouter)
Agente 3 — investigação apenas, nenhum arquivo alterado.
Todas as afirmações citam `arquivo:linha`.

---

## A) AUTH E RACE CONDITION

### A.1 `resolveUserRole` — timeout e comportamento em erro

`services/auth.service.ts:160-183`:

```ts
const timeoutPromise = new Promise<'viewer'>((resolve) =>
  setTimeout(() => { console.warn(...); resolve('viewer'); }, ROLE_TIMEOUT_MS));
try { return await Promise.race([queryPromise, timeoutPromise]); }
catch { return 'viewer'; }
```

- Timeout: sim, `ROLE_TIMEOUT_MS = 3000` (`auth.service.ts:6`).
- Em timeout **e** em exceção o retorno é `'viewer'` (linhas 174 e 181).
- Também retorna `'viewer'` quando `.single()` devolve `data: null` (erro de RLS/rede é engolido dentro do `.then` — `auth.service.ts:166-169`: só se lê `data`, o `error` é descartado).

**Classificação: fail-closed no frontend.** `'viewer'` é o menor privilégio: `isEditor()`/`isAdmin()` (`store/app.store.ts:67-68`) retornam `false`, o `ProtectedRoute requireEditor` redireciona (`router.tsx:31`) e todos os guards de serviço negam. Não há escalonamento. O efeito colateral é **degradação de disponibilidade**: um admin com rede lenta (>3 s) é rebaixado a viewer e perde o dashboard até recarregar. O código reconhece isso no comentário `App.tsx:51-53` e criou a heurística `alreadyResolved` justamente para mitigar — heurística que gera o defeito A.2.

Nota importante: o *fail-closed* só vale para a UI. A autorização real está na RLS (secção B) e é independente deste valor.

### A.2 `alreadyResolved` — existe cenário em que INITIAL_SESSION nunca mais chega? **SIM — provado**

`App.tsx:57-66`:

```ts
const alreadyResolved =
  event === 'SIGNED_IN' && (
    (AUTH_SESSION.isLoggedIn && AUTH_SESSION.userId === session.user.id && AUTH_SESSION.role !== 'viewer') ||
    AUTH_LOADING  // INITIAL_SESSION hasn't fired yet — it will handle this SIGNED_IN
  );
if (alreadyResolved) { notifyState(); return; }
```

O comentário assume: `AUTH_LOADING === true` ⟹ `INITIAL_SESSION` ainda **vai** chegar. A premissa é falsa porque `AUTH_LOADING` também é `true` **durante** o processamento de um `INITIAL_SESSION` já emitido: `setAuthLoading(false)` só ocorre em `App.tsx:87`, **depois** do `await resolveUserRole` da linha 74, que dura até 3 s.

Sequência que refuta o comentário:

| t | Evento | `authGeneration` | Estado |
|---|--------|------------------|--------|
| 0 | `INITIAL_SESSION` + sessão | 1 | entra na branch, chega ao `await` (`App.tsx:74`); `AUTH_LOADING` continua `true` |
| 1 | `SIGNED_IN` (refresh do `_recoverAndRefresh`, outra aba, ou login) | 2 | `AUTH_LOADING === true` ⟹ `alreadyResolved` ⟹ `return` (`App.tsx:63-66`) — **não seta nada** |
| 2 | handler de t=0 retoma | — | `generation (1) !== authGeneration (2)` ⟹ `return` (`App.tsx:76-78`) — **não seta nada** |

Resultado: `AUTH_LOADING` fica `true` **para sempre** e `AUTH_SESSION` continua `{isLoggedIn:false, role:'viewer'}` (`store/app.store.ts:15-16`). O `INITIAL_SESSION` já foi consumido e não será reemitido pelo SDK. **Cenário provado, não refutado.**

### A.3 `authGeneration` — eventos não tratados agravam o problema

`App.tsx:48`: `const generation = ++authGeneration;` executa para **todos** os eventos, inclusive os que caem no `else` implícito e não fazem nada (não há branch para `TOKEN_REFRESHED`, `USER_UPDATED`, `PASSWORD_RECOVERY` — `App.tsx:50-109`). Logo:

- Um `TOKEN_REFRESHED` que chegue durante o `await` da linha 74 **invalida silenciosamente** a resolução em curso (mesmo desfecho de A.2), sem sequer ter feito trabalho útil.
- `PASSWORD_RECOVERY` é emitido em `/reset-password` (`pages/auth/ResetPasswordPage.tsx:22-26`) — o listener global de `App.tsx` também o recebe e incrementa a geração.

**Matriz de cenários**

| Cenário | Branch tomada | Resultado |
|---|---|---|
| `INITIAL_SESSION` + sessão (feliz) | `App.tsx:50` | role resolvido, `AUTH_LOADING=false` (`:87`) — OK |
| `INITIAL_SESSION` sem sessão | `App.tsx:96-100` | viewer, `AUTH_LOADING=false` — OK |
| `SIGNED_IN` antes de `INITIAL_SESSION` | early-return (`:63`) | correto **por acaso**: o `INITIAL_SESSION` posterior resolve |
| `SIGNED_IN` **durante** o `await` de `INITIAL_SESSION` | early-return + geração obsoleta | **loader eterno / sessão fantasma** (A.2) |
| `TOKEN_REFRESHED` | nenhuma (`App.tsx:109` fecha o if/else) | só incrementa `authGeneration` → pode descartar resolução em curso |
| `USER_UPDATED` | nenhuma | idem; alteração de role no perfil não reflete na UI |
| `PASSWORD_RECOVERY` | nenhuma | idem |
| `SIGNED_OUT` | `App.tsx:101-108` | viewer + limpeza — OK |
| Duas abas (login na aba B) | aba A recebe `SIGNED_IN` | se a aba A ainda estiver no `await`, cai em A.2 |
| Login de outro utilizador logo após logout | `SIGNED_OUT` → `SIGNED_IN` | `AUTH_LOADING` já é `false` e `isLoggedIn` é `false` ⟹ `alreadyResolved=false` ⟹ resolve corretamente. **Sem vazamento de role entre utilizadores** — os arrays sensíveis são zerados em `clearEditorOnlyState()` (`App.tsx:28-34`, chamado em `:72` e `:104`) |

Existe estado com "role errado"? Não encontrei caminho de **escalonamento** (o pior caso é sempre `viewer`). Existe estado de **loader eterno**: sim, A.2/A.3.

Mitigação parcial e incompleta — `hooks/useAuthSession.ts:28-42`: timeout de 4 s que força `setAuthLoading(false)`. Três limitações provadas:
1. `ProtectedRoute` **não usa** o hook — lê `AUTH_LOADING` diretamente (`router.tsx:29`) e só re-renderiza no evento `FLB_STATE_EVENT` (`router.tsx:23-27`).
2. O hook chama `sync()` (estado local) mas **nunca** `notifyState()` (`useAuthSession.ts:33-39`), logo `FLB_STATE_EVENT` não é disparado e o `ProtectedRoute` continua a mostrar `<PremiumLoader />` indefinidamente.
3. Apenas `component.domain.tsx` consome o hook (`grep -rl useAuthSession` → `component.domain.tsx`, `component.ui.test.tsx`); nenhuma página do dashboard o usa.

Resultado prático de A.2 numa rota protegida: **loader infinito em `/dashboard`**; ou, quando o `Header` força a resolução, utilizador aparece como deslogado apesar de ter sessão Supabase válida.

### A.4 `ProtectedRoute` — UX ou autorização?

`router.tsx:20-33` é **exclusivamente UX**: lê `AUTH_LOADING`/`AUTH_SESSION.isLoggedIn`/`isEditor()` de módulos JS do bundle. Qualquer pessoa pode executar `setAuthSession({isLoggedIn:true, role:'admin'})` no console ou chamar o `supabase-js` diretamente com a chave publishable (`env:2`) — o router não participa de nenhuma decisão do servidor.

**Operações sensíveis cuja única barreira é o frontend** (lista completa; ver detalhe na secção B):

1. **Upload de ficheiros ao bucket `media`** — `services/media.service.ts:14-21` (`saveMediaBlob`) não tem guard e é chamado por caminhos com guard `isEditor()`; a RLS de produção exige apenas `auth.role() = 'authenticated'` (`supabase/migrations/20260425000003_storage_sync_prod.sql:40-49`). Um utilizador `membro` (sem acesso ao dashboard) pode fazer upload chamando o SDK diretamente.
2. **Upload anónimo para `community/`** — `services/media.service.ts:44-54`; RLS: `bucket_id='media' AND name LIKE 'community/%'`, **sem exigir autenticação e sem restrição de extensão** (`20260425000003_storage_sync_prod.sql:52-57`).
3. **Leitura integral do `activity_logs`** — `services/activity-log.service.ts:14-24` não tem guard; a chamada só é feita para admin/editor em `App.tsx:88-92`, mas a RLS de produção permite `SELECT` a **qualquer autenticado** (`supabase/migrations/20260425000000_activity_logs.sql:19-21`).
4. **Escrita no `activity_logs`** — `services/activity-log.service.ts:26-38`: `user_name` e `user_id` vêm do cliente (`AUTH_SESSION`), e a RLS de produção aceita qualquer autenticado sem exigir `user_id = auth.uid()` (`20260425000000_activity_logs.sql:24-26`) ⟹ **falsificação de trilha de auditoria**.

Todas as demais escritas têm RLS equivalente ao guard do frontend (secção B).

---

## B) AUTORIZAÇÃO REAL — operação por operação

Legenda: **FE** = `if (isEditor()/isAdmin())` no frontend; **RLS** = política no banco.

| Serviço / operação | Guard FE | RLS (arquivo:linha) | Veredito |
|---|---|---|---|
| `members.createMember` | `members.service.ts:79` | `partners: inserção editores` — `20260101000001_rls_policies.sql:100-102` | FE+RLS |
| `members.updateMember` | `:96` | `:104-106` | FE+RLS (verifica linhas afetadas, `:143-152`) |
| `members.deleteMember` | `:161` | `:108-110` | FE+RLS |
| `councils.createCouncilMember` | `councils.service.ts:50` | `migrations/20260521_council_members.sql:64` | FE+RLS |
| `councils.updateCouncilMember` | `:89` | `...:70` | FE+RLS |
| `councils.deleteCouncilMember` | `:115` | `...:77` | FE+RLS |
| `documents.createDocument` | `documents.service.ts:68` | `migrations/20260521_institutional_documents.sql:62` | FE+RLS |
| `documents.updateDocument` | `:109` | `...:67` | FE+RLS |
| `documents.deleteDocument` | `:135` | `...:73` | FE+RLS |
| `documents.uploadDocumentFile` | `:47` | storage: só `authenticated` (`20260425000003:40-49`) | **FE mais forte que RLS — P1** |
| `events.createEvent` | `events.service.ts:58` | `20260101000001:124-126` | FE+RLS |
| `events.updateEvent` | `:108` | `:128-130` | FE+RLS |
| `events.deleteEvent` | `:151` | `:132-134` | FE+RLS |
| `events.addGalleryItem` / `addMediaToEvent` / `addUrlMediaToEvent` | `:181`, `:209`, `:234` | via `updateEvent` (RLS de events) + storage | FE+RLS (storage fraco, ver P1) |
| `events.approve/rejectCommunityMedia` | `:257`, `:295` | `community_media: atualização/exclusão editor` (`20260101000001:193-199`) | FE+RLS |
| `community-media.submitCommunityMedia` | nenhum (por design, público) | `WITH CHECK (true)` (`20260101000001:183-185`) | Público intencional — spam (P2) |
| `community-media.syncCommunityMedia` | nenhum | `SELECT` só editor (`:188-190`) | RLS |
| `precadastros.createPreCadastro` | nenhum (público) | `WITH CHECK (true)` (`:149-151`) | Público intencional — spam (P2) |
| `precadastros.updatePreCadastro` | `precadastros.service.ts:108` | `:157-159` | FE+RLS |
| `precadastros.deletePreCadastro` | `:147` | `:161-163` | FE+RLS |
| `precadastros.convertPreCadastroToMember` | `:176` | herda RLS de partners/precadastros | FE+RLS |
| `precadastros.syncPreCadastros` | nenhum | `SELECT` só editor (`:153-155`) | RLS |
| `estatutos-leads.createEstatutosLead` | nenhum (público) | `inserção pública` (`migrations/20260519_estatutos_leads.sql:50`) | Público intencional |
| `estatutos-leads.syncEstatutosLeads` | `estatutos-leads.service.ts:49` | `leitura editores` (`...:56`) | FE+RLS |
| `estatutos-leads.deleteEstatutosLead` | `:62` | `exclusão editores` (`...:62`) | FE+RLS |
| `benefits.createBenefit` | `benefits.service.ts:29` | `benefits: escrita editor` (`20260101000000:534`) | FE+RLS |
| `benefits.updateBenefit` | `:47` | `...:543` | FE+RLS |
| `benefits.deleteBenefit` | `:60` | `...:552` | FE+RLS |
| `media.saveMediaBlob` | **nenhum** | storage: `authenticated` + extensão (`20260425000003:40-49`) | **P1 — qualquer `membro` faz upload** |
| `media.saveCommunityMediaBlob` | nenhum | `name LIKE 'community/%'`, **anónimo, sem filtro de extensão** (`20260425000003:52-57`) | **P1** |
| `media.deleteMediaBlob` | nenhum | `DELETE` só editor (`20260425000003:91-104`) | RLS |
| `activity-log.persistLogEntry` | nenhum | `INSERT` qualquer autenticado, sem `user_id = auth.uid()` (`20260425000000:24-26`) | **P1 — log forjável** |
| `activity-log.syncActivityLog` | nenhum | `SELECT` qualquer autenticado (`20260425000000:19-21`) | **P1 — PII exposta** |
| `auth.updateUserRole` | `auth.service.ts:360` | `profiles: atualização por admin` (`20260101000001:84-86`) | FE+RLS |
| `auth.linkUserToPartner` | `:466` | idem | FE+RLS |
| `auth.fetchAllProfiles` | `:267` | `profiles: leitura` = próprio OU admin (`20260101000001:54-59`) | FE+RLS |
| `auth.convertPreCadastroToAccount` | `:380` | Edge Function verifica admin no servidor (`supabase/functions/admin-create-user/index.ts:64-66`) | FE+servidor |

### B.1 Autoescalonamento de role — verificado e **bloqueado**

`20260101000001_rls_policies.sql:71-79`: o `WITH CHECK` exige `role = (SELECT role FROM profiles WHERE user_id = auth.uid())` — a subquery vê o snapshot pré-UPDATE, logo bloqueia mudar o próprio role. A rota alternativa (inserir um **segundo** perfil próprio com `role='admin'`, permitida por `profiles: inserção própria`, `:64-66`, que não valida o `role`) é fechada pela constraint `user_id UUID UNIQUE` (`supabase/migrations/20260101000000_initial_schema.sql:36`) combinada com `ON CONFLICT (user_id) DO NOTHING` no trigger (`:360`). Teste correspondente: `tests/rls/profiles.rls.spec.ts:62-68`.

### B.2 Divergência perigosa entre os dois diretórios de migrations

`migrations/20260425_activity_logs.sql:19-26` (restritivo: `SELECT` só editor, `INSERT` exige `user_id = auth.uid()`) **contradiz** `supabase/migrations/20260425000000_activity_logs.sql:19-26` (permissivo), cujo próprio comentário diz "matches production". O teste `tests/rls/activity-logs.rls.spec.ts:49-52` afirma "viewer CAN SELECT activity_logs (any authenticated user)" — confirmando que **a versão permissiva é a que está em produção**. Existem dois conjuntos de migrations divergentes no repositório sem indicação de qual é canónico.

---

## C) BACKUP / RESTORE (Red Team)

`exportState` e `importState` estão em `store/app.store.ts:78-79`:

```ts
export const exportState = () => { showToast('Exportação desativada no modo Supabase.', 'info'); };
export const importState = (_jsonString: string) => ({ success: false, message: 'Importação desativada.' });
```

São **stubs desativados**. A UI ainda existe: `component.ui.tsx:1516-1551` (`SettingsModal`) — botão "Exportar Backup" chama `exportState()` (`:1517`) e o `<input type="file" accept=".json">` (`:1543`) lê o ficheiro com `FileReader` e passa a string a `importState` (`:1523`), que a ignora (`_jsonString` prefixado com `_`).

Respostas ponto a ponto, com evidência:

| Pergunta | Resposta |
|---|---|
| Quem pode executar | Quem abrir o `SettingsModal`; a modal é montada no dashboard (rota `requireEditor`, `router.tsx:78`). Irrelevante: as funções não fazem nada. |
| O que é exportado | **Nada.** `app.store.ts:78` só emite um toast. Zero dados pessoais, emails, leads, logs ou IDs saem da aplicação. |
| Valida schema com Zod | N/A — o argumento é descartado (`app.store.ts:79`). |
| Aceita IDs arbitrários | Não — nenhum parsing ocorre. |
| Pode alterar roles/utilizadores | Não. Nenhuma chamada a `supabase` nas duas funções. |
| Sobrescreve ou duplica | N/A. |
| Transacional / rollback | N/A — não há escrita. |
| Regista no activity log | Não (`app.store.ts:78-79` não chama `logActivity`). |
| Limite de tamanho | Não há — `reader.readAsText(file)` (`component.ui.tsx:1526`) lê o ficheiro inteiro na memória do browser. Único impacto: um JSON gigante congela a aba do próprio utilizador (self-DoS). |
| Confirmação | Nenhuma: `handleRestore` dispara no `onChange` do input (`component.ui.tsx:1518-1527`), sem diálogo. |

**Um JSON adulterado consegue fazer algo que o utilizador não conseguiria pela UI?** **Não.** O conteúdo nunca é parseado nem enviado ao Supabase — `importState` retorna `{success:false}` incondicionalmente e `res.success` é sempre falso (`component.ui.tsx:1524`). **Não é P0.** É P3 (UI enganosa: a modal promete "Exporte todos os eventos, membros e logs", `component.ui.tsx:1536`, e o botão não faz nada — risco operacional de o admin julgar ter backup).

---

## D) SEGREDOS E EXPOSIÇÃO

### D.1 Ficheiro `env` versionado

`env:1-2` contém `VITE_SUPABASE_URL=https://lhgzyrszzbxjjvnxfwzf.supabase.co` e `VITE_SUPABASE_ANON_KEY=sb_publishable_5kxyqGvP9GV4e2BhvLwWVw_RraqN7Bt`. Está rastreado no git (aparece em `git ls-files`; introduzido em `76224c1`, único commit que o toca).

**Risco real: baixo em si.** É uma chave *publishable* (prefixo `sb_publishable_`), desenhada para ir no bundle do browser — `supabaseClient.ts:3-10` injeta-a no cliente, logo qualquer visitante já a tem. O `.gitignore:16-19` ignora `.env`/`.env.local` mas o ficheiro chama-se `env` (sem ponto), escapando à regra — sinal de descuido de processo, não de vazamento de segredo. **O risco efetivo é 100 % determinado pela RLS** (secção B): com a chave, qualquer pessoa pode `INSERT` em `precadastros`, `community_media_submissions`, `estatutos_leads` e no prefixo `community/` do storage, e qualquer utilizador autenticado pode ler `activity_logs`.

### D.2 Procura por `service_role` no histórico

- `git log --oneline -S 'service_role' --all` → **nenhum commit**.
- `git log --oneline -S 'eyJ' --all` → 4 commits (`bafb811`, `dfedc73`, `65fb160`, `db4c4da`), mas `git grep -n "eyJ"` mostra que as ocorrências estão apenas em **binários** (`public/contas-2023.pdf`, `public/relatorio-contas-2024.pdf`, `obs-backgroundremoval/*`) — falso positivo de base64 em PDF/DLL, não JWTs.
- `git log -p --follow -- env` → o ficheiro só alguma vez conteve a chave publishable atual (nenhuma anon-key JWT antiga).
- A service-role key só é lida de variáveis de ambiente em código de teste: `tests/e2e/support/admin-bypass-server.ts:9`, `tests/e2e/support/adminCreateUserBypass.ts:6`, `.env.test.example:7`. `.env.e2e` e `.env.test` estão no `.gitignore:29-30`.

**Conclusão: nenhuma service-role key no repositório nem no histórico.**

Ponto de atenção não relacionado a chaves: `_env fundação .eml` está versionado (`git ls-files`); o grep não encontrou credenciais nele, mas é um email de configuração no repositório público — deve sair.

### D.3 Edge Function `admin-create-user`

`supabase/functions/admin-create-user/index.ts`, leitura integral:

- **Usa service_role**: sim, `Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')` (`:31`) num `adminClient` (`:45-47`) — a chave nunca sai do servidor.
- **Verifica JWT**: sim. Exige header `Authorization` (`:38-40`) e valida-o com `requesterClient.auth.getUser()` (`:49-52`), devolvendo 401 se inválido.
- **Verifica se o chamador é admin**: sim, consulta `profiles.role` pelo `adminClient` (portanto ignorando RLS, corretamente) e devolve 403 se `!== 'admin'` (`:54-66`). **Não é possível a um utilizador anónimo nem a um `membro`/`editor` criar contas.**
- **Valida entrada**: campos obrigatórios (`:76-78`) e `partnerId` como UUID (`:80-82`).
- **CORS aberto**: `'Access-Control-Allow-Origin': '*'` (`:4`). Como a autorização é feita pelo Bearer token (não por cookies), CSRF não se aplica; é P3.
- Fraqueza menor (P2): o `role` do body é aceite tal como vem (`:107`) e o tipo declara `'membro' | 'editor'` (`:72`) mas **não há validação em runtime** — um admin pode enviar `role: 'admin'` e criar outro admin. Só um admin já autenticado consegue, logo não é escalonamento de privilégio, mas contorna qualquer restrição de UI.

**Não é P0.**

### D.4 Bypass de admin em E2E — pode vazar para produção?

Código de produção envolvido: `services/auth.service.ts:8-33`.

```ts
const AUTH_BYPASS_URL = import.meta.env.VITE_AUTH_BYPASS_URL || 'http://127.0.0.1:8787';   // :8
const enabled = import.meta.env.VITE_AUTH_BYPASS_CREATE_USER === 'true';                    // :18
if (import.meta.env.PROD && !isLocalBypass) { return { use:false, refused:true, ... }; }     // :25-31
```

Análise:
- O **código está sim no bundle de produção** (`auth.service.ts` é módulo de aplicação; `build:e2e` em `package.json:9` é apenas `vite build --mode e2e`, mesmo entrypoint).
- O caminho só é atingido **depois** de `if (!isAdmin())` (`auth.service.ts:380`) e, do lado do servidor, o `admin-bypass-server.ts` e o `adminCreateUserBypass.ts` **também** exigem Bearer válido + `role === 'admin'` (`admin-bypass-server.ts:52-102`; `adminCreateUserBypass.ts:26-52`). Não há bypass de autorização real em lado nenhum.
- Em build PROD, com `VITE_AUTH_BYPASS_CREATE_USER=true` e URL não-local, a chamada é **recusada** (`:25-31`) e mostrada como erro.
- A service-role key vive apenas no processo Node do servidor de bypass (`admin-bypass-server.ts:9`), nunca no bundle.
- Falha residual: `isLocalBypass` aceita `'/__e2e__'` (`:22`); num build de produção com essa combinação, o app faria POST para `https://<dominio>/__e2e__/admin-create-user`, que não existe → falha inócua, sem criação de utilizadores.

**Não é P0.** É P2: código de teste embarcado no bundle de produção (superfície e peso desnecessários) — deveria ser eliminado por `dead-code elimination` atrás de uma flag de build, não avaliado em runtime.

---

## E) XSS / INJEÇÃO / UPLOAD / IDOR

### E.1 XSS por injeção de HTML

`grep -rn "dangerouslySetInnerHTML\|innerHTML\|eval(\|new Function"` sobre todo o código (excluindo `node_modules`) devolve **apenas** duas linhas de mock em `component.ui.test.tsx:48-49` (`exportState`/`importState`), nenhuma ocorrência real. Não há injeção de HTML no código da aplicação.

### E.2 Validação de URL

`utils/url.ts:15-23` (`isSafeHttpUrl`): rejeita string com espaços nas pontas (`:16`), faz `new URL()` e aceita só `http:`/`https:` (`:19`). Bloqueia `javascript:`, `data:`, `file:` — robusto para o objetivo. `safeUrl` (`:3-11`) idem, mas **não** rejeita whitespace.

Aplicação: `services/community-media.service.ts:32-35` e `validation/schemas.ts:60-63` (link de benefício). Documentado em `docs/business-rules/url-validation.md:1-20`.

Lacunas:
- `resolveLink` (`utils/url.ts:43-77`) trata como **interno** qualquer host que case `/\.vercel\.app$/i`, `/^fundacaolusobrasileira\./i` ou `/^flb\./i` (`:28-32`). `*.vercel.app` é um domínio partilhado por qualquer utilizador da Vercel: um link `https://atacante.vercel.app/#/x` é classificado como interno e convertido em navegação relativa — não abre redirect externo (fecha esse risco), mas confunde a origem. Redirect aberto propriamente dito não encontrei: o `href` externo é sempre o URL original já validado como http/https (`:77`).
- `DocumentSchema.file_url` (`validation/schemas.ts:121`) só valida `min(1).max(2048)` — **não** passa por `isSafeHttpUrl`. Um editor pode gravar `javascript:...` como URL de documento institucional; a renderização determina se é explorável (não verifiquei todos os pontos de render, mas é uma inconsistência com a regra do `docs/business-rules/url-validation.md:4`). P2.

### E.3 Upload

- Validação cliente: `validation/schemas.ts:74-91` — 9 MIME types (inclui `image/svg+xml` e `application/pdf`) e 5 MB (`:85`). Aplicada em `uploadSingleImage` (`media.service.ts:26-30`) e `saveCommunityMediaBlob` (`:45-48`), **não** em `saveMediaBlob` (`:14-21`).
- Sanitização de nome: `media.service.ts:9-12` — `originalName.replace(/[^a-zA-Z0-9.]/g,'')` remove `/` e `\`, e o nome final é `${crypto.randomUUID()}-${sanitized}`. **Sem path traversal** (`..` sobrevive ao filtro mas o prefixo UUID impede que o nome comece por `..`).
- Servidor: bucket `media` **público, `file_size_limit = null`, `allowed_mime_types = null`** (`supabase/migrations/20260425000003_storage_sync_prod.sql:10-15`). O limite de 5 MB é **só client-side**.
- Política anónima: `bucket_id='media' AND name LIKE 'community/%'` (`20260425000003:52-57`) — **sem exigir autenticação e sem filtro de extensão**. Qualquer pessoa na internet pode enviar ficheiros arbitrários (`.html`, `.svg`, `.js`, executáveis) de tamanho arbitrário para um bucket público. Consequências: XSS armazenado na origem do storage, hospedagem de malware/phishing sob o domínio Supabase do projeto, e custo/DoS de armazenamento ilimitado. **P1.**
- Política autenticada: `auth.role() = 'authenticated'` + extensão na allowlist (`20260425000003:40-49`) — qualquer `membro` (sem acesso ao dashboard) pode fazer upload, embora a UI só o ofereça a editores. **P1** (`svg` está na allowlist ⟹ XSS armazenado servido de origem pública).
- O path do storage **não inclui o user id**: `media.service.ts:11` e `:49`. Como nomes são UUID aleatórios, não são adivinháveis (não há IDOR de leitura por enumeração), mas também não há qualquer atribuição de propriedade — a política de DELETE/UPDATE é global de editor (`20260425000003:91-104`), portanto qualquer editor pode apagar mídia de qualquer outro.

### E.4 IDOR nas rotas

- `/membro/:id` e `/parceiros/:id`: `partners` tem `SELECT USING (true)` (`20260101000000_initial_schema.sql:263-265`) — é conteúdo institucional público por desenho. O `id` é UUID (`:57`). Sem IDOR.
- `/membro/:id/editar` (`router.tsx:70`): guarda de rota `requireEditor` (UX) + `isEditor()` na página (`pages/membro/MembroPerfilPage.tsx:227-229`, `:242-245`, `:305`) + **RLS `partners: atualização editores`** (`20260101000001:104-106`). A autorização real está na RLS; a verificação de linhas afetadas em `members.service.ts:143-152` deteta a negação silenciosa da RLS. **Sem IDOR.** Nota: não há noção de "dono" — **qualquer editor pode editar qualquer membro**, o que é o modelo pretendido, não um bug.
- `/eventos/:id`: `events` tem `SELECT` público apenas para `status='published'`; rascunhos só para editor/admin (`20260101000000:284-289`). Correto.

---

## F) LGPD / PII

**Dados pessoais existentes**

| Dado | Onde é armazenado | Quem lê (RLS) |
|---|---|---|
| Nome, email, tipo, mensagem de pré-cadastro | `precadastros` (`20260101000000:308-310`) | Editor/admin |
| Nome + email de leads dos Estatutos | `estatutos_leads` (`migrations/20260519_estatutos_leads.sql:56`) | Editor/admin |
| Nome do autor, email, mensagem em submissões de mídia | `community_media_submissions` (`20260101000001:188-190`) | Editor/admin |
| Nome, email, telefone, role de utilizadores | `profiles` (`20260101000001:54-59`) | Próprio ou admin |
| Emails de inscritos na newsletter | `precadastros` com `type='newsletter'` (`precadastros.service.ts:95-102`) | Editor/admin |
| **Emails e nomes dentro de `activity_logs.target`** | `activity_logs` | **Qualquer autenticado** |

**Achado principal (P1):** `store/app.store.ts:48-65` (`logActivity`) grava o alvo da ação em texto livre e `services/activity-log.service.ts:26-38` persiste-o. Alvos que são PII: `logActivity('Login', data.user.email)` (`auth.service.ts:205`), `logActivity('Novo cadastro', email)` (`:257`), `logActivity('Criou conta a partir de pré-cadastro', opts.email)` (`:135` e `:460`), `logActivity('Novo pré-cadastro', data.name)` (`precadastros.service.ts:83`), `logActivity('Submissão de mídia', submission.authorName)` (`community-media.service.ts:60`). Além disso, `user_name` = `AUTH_SESSION.displayName`, que é o **email** do utilizador (`App.tsx:83`: `displayName: session.user.email`). Combinado com a política permissiva `activity_logs: read for authenticated` (`20260425000000:19-21`), **qualquer utilizador registado — mesmo um `membro` sem acesso ao dashboard — pode ler, com a chave publishable pública, o histórico de emails de administradores, novos cadastros e leads.**

**PII em consola/logs:** `auth.service.ts:433` grava o email num `console.error` **sem** guard de `DEV` (`console.error('[convertPreCadastroToAccount] signUp returned user with null id ...', opts.email)`), e `:173` grava o `userId`. Ao contrário de `component.ui.tsx:200`, `components/ui/ErrorBoundary.tsx:24` e `pages/eventos/EventoColaborarPage.tsx:146`, que usam `if (import.meta.env.DEV)`, os `console.error` dos serviços (19 ocorrências, incluindo `precadastros.service.ts:89`, `estatutos-leads.service.ts:40`, `community-media.service.ts:53`) executam em produção e podem incluir payloads com dados de formulário no objeto de erro. P2.

**Retenção / política:** existem as páginas `/privacidade` e `/termos` (`router.tsx:83-84`, `pages/legal/LegalPage.tsx`). **Não encontrei nenhum mecanismo de retenção, expurgo ou anonimização**: nenhuma política `DELETE` agendada, nenhum `TTL`, e `activity_logs` é explicitamente *append-only* sem `UPDATE`/`DELETE` (`20260425000000:28`) — ou seja, os emails ali gravados **não podem sequer ser apagados** pela aplicação (só com service-role), o que colide com o direito ao apagamento. `ACTIVITY_LOG.pop()` em `app.store.ts:57` limita apenas o array em memória a 50 itens, não a tabela. P2.

---

## CLASSIFICAÇÃO

### P0
Nenhum achado atinge P0. Especificamente **descartados como P0** após verificação: backup/restore (funções desativadas, secção C), Edge Function `admin-create-user` (verifica JWT + role admin no servidor, D.3), bypass de E2E (dupla verificação de admin, D.4), autoescalonamento de role via `profiles` (bloqueado por `WITH CHECK` + `UNIQUE(user_id)`, B.1), service-role key no repositório/histórico (inexistente, D.2).

### P1
1. **Upload anónimo irrestrito ao bucket público `media`** — `20260425000003_storage_sync_prod.sql:52-57` + `:10-15`: sem autenticação, sem limite de tamanho, sem filtro de extensão sob `community/`. XSS armazenado, hospedagem de malware, DoS de custo.
2. **Upload por qualquer autenticado, incluindo `.svg`** — `20260425000003:40-49`: a RLS é mais fraca que o guard de UI (`documents.service.ts:47`, `media.service.ts:14`); `membro` sem dashboard pode enviar ficheiros.
3. **`activity_logs` legível por qualquer autenticado, com PII** — `20260425000000_activity_logs.sql:19-21` + `auth.service.ts:205/257/433`, `App.tsx:83`. Exposição de emails de admins e de novos cadastros.
4. **`activity_logs` gravável por qualquer autenticado sem vínculo ao `auth.uid()`** — `20260425000000:24-26` + `activity-log.service.ts:30-36`: trilha de auditoria forjável (o autor vem do cliente).
5. **Deadlock de autenticação (`alreadyResolved` + `authGeneration`)** — `App.tsx:57-78`: loader eterno em rotas protegidas ou sessão fantasma; o safety-net de `useAuthSession.ts:28-42` não resolve porque não dispara `FLB_STATE_EVENT` e o `ProtectedRoute` não consome o hook (`router.tsx:29`).

### P2
6. **Migrations divergentes e sem canónico** — `migrations/20260425_activity_logs.sql:19-26` (restritivo) vs `supabase/migrations/20260425000000_activity_logs.sql:19-26` (permissivo, "matches production"). Risco de reaplicar a errada.
7. **`TOKEN_REFRESHED`/`USER_UPDATED`/`PASSWORD_RECOVERY` não tratados mas incrementam `authGeneration`** — `App.tsx:48` + ausência de branch em `:50-109`.
8. **`resolveUserRole` engole erros de query** — `auth.service.ts:166-169`: falha de rede/RLS é indistinguível de "membro"; rebaixa admins silenciosamente após 3 s (`:171-176`).
9. **Código de bypass de E2E embarcado no bundle de produção** — `services/auth.service.ts:8-33`; deveria ser eliminado em build, não avaliado em runtime.
10. **Edge Function aceita `role` do body sem validação de runtime** — `admin-create-user/index.ts:72` + `:107`: admin pode criar outro admin contornando a UI.
11. **`DocumentSchema.file_url` não valida esquema de URL** — `validation/schemas.ts:121`, inconsistente com `docs/business-rules/url-validation.md:4`.
12. **`console.error` com PII ativo em produção** — `auth.service.ts:433` (email), `:173` (userId), e mais 17 ocorrências nos serviços sem guard `DEV`.
13. **Sem política de retenção/expurgo de PII; `activity_logs` sem `DELETE`** — `20260425000000:28`; colide com direito ao apagamento.
14. **Clickjacking permitido** — `public/_headers:2-3`: `X-Frame-Options: ALLOWALL` e `frame-ancestors *`. Agravante: o formato `_headers` é da Netlify/Cloudflare; na Vercel os headers vêm de `vercel.json`, que **não define nenhum header de segurança** (`vercel.json:5-27`) — logo o site não tem CSP, HSTS, `X-Content-Type-Options` nem `Referrer-Policy`.
15. **INSERT público sem CAPTCHA nem rate-limit aplicativo** em `precadastros` (`20260101000001:149-151`), `community_media_submissions` (`:183-185`) e `estatutos_leads` (`20260519_estatutos_leads.sql:50`) — spam e envenenamento da base de leads.

### P3
16. **`SettingsModal` promete backup que não existe** — `component.ui.tsx:1516-1551` vs stubs em `store/app.store.ts:78-79`; risco operacional de falsa sensação de backup.
17. **Ficheiro `env` versionado** — `env:1-2`; chave é publishable (risco material baixo), mas escapa ao `.gitignore:16-19` por não ter ponto no nome. Rotacionar por higiene e mover para variável de ambiente da Vercel.
18. **`_env fundação .eml` versionado** — email de configuração no repositório (sem credenciais detetadas).
19. **CORS `*` na Edge Function** — `admin-create-user/index.ts:4`; sem impacto por ser autorização via Bearer, não cookies.
20. **`resolveLink` trata `*.vercel.app` como host interno** — `utils/url.ts:28-32`: domínio partilhado por terceiros.
