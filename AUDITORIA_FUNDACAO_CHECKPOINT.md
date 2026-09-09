# AUDITORIA FUNDAÇÃO LUSO-BRASILEIRA — CHECKPOINT

Data: 2026-09-07 · Commit local: `bafb811` (2026-07-02) · Produção: deploy de 2026-08-22

---

## 0. AVISO METODOLÓGICO — O QUE NÃO PÔDE SER PROVADO

Três limitações condicionam TODO este relatório. Nenhuma conclusão as ignora.

| Limitação | Consequência |
|---|---|
| **Sem acesso ao banco de produção.** O MCP Supabase desta sessão aponta para `beumlognwtiiysmcglpy` ("soundyapp's Project"), que não tem nenhuma tabela da Fundação. O projeto real é `lhgzyrszzbxjjvnxfwzf`. | **RLS NÃO PROVADA.** Toda análise de policy é leitura de SQL. |
| **Sem `.env.test`.** `npm run test:rls` sai com **exit 0 e 73/73 testes pulados**. | Zero policies testadas — e o comando parece verde. |
| **Sem `.env.e2e` e sem browsers Playwright** (CDN bloqueado pelo sandbox). | **92 testes E2E: 0 executados.** |

O que **foi** provado em runtime: o site de produção foi carregado num navegador real e instrumentado (CSP, headers HTTP, contagem de requests, render de páginas). Esses achados estão marcados **[MEDIDO]**.

---

## 1. VEREDITO ATUAL

**A plataforma pública está no ar e funcional.** Não encontrei nenhuma vulnerabilidade explorável comprovada, nenhuma perda de dados, nenhum fluxo institucional central quebrado em produção.

O problema real é outro e é sério: **a distância entre "o que está em produção" e "o que está no repositório" não é auditável, e a rede de segurança que deveria detectar isso não funciona.**

- O repositório tem uma **regressão não commitada que quebra `/documentacao` no próximo deploy** (corrigida nesta sessão).
- O tratamento de erros do site inteiro estava desativado por um error boundary mal construído (corrigido nesta sessão).
- A suíte que provaria a segurança dos dados **nunca correu**, e sai verde por isso.
- O CI está vermelho por construção (`tsc --noEmit` falha) — logo, ninguém olha para ele.

**Veredito de produção: PRONTA COM RESSALVAS** para o site institucional público. **NÃO PRONTA** para se afirmar que a área administrativa e os dados pessoais (pré-cadastros, leads, activity log) estão protegidos — isso continua por provar.

---

## 2. RESULTADOS DE EXECUÇÃO (números reais)

| Comando | Antes | Depois das correções | Estado |
|---|---|---|---|
| `npx tsc --noEmit` | 29 erros / 14 ficheiros | **22 erros / 12 ficheiros** | ainda FALHA (CI vermelho) |
| `npm test -- --run` | 354 pass / 7 fail | **358 pass / 7 fail** | 7 falhas pré-existentes |
| `npm run test:coverage` | exit 1, **não gera relatório** | idem | thresholds são config morta |
| `npm run build` | passa, 3.86 s | **passa, 3.83 s, 0 warnings** | OK |
| `npm run test:rls` | exit 0, **73/73 pulados** | idem | **RLS NÃO PROVADA** |
| `npm run test:e2e` | **0 de 92 coletados** | idem | **E2E NÃO EXECUTADO** |

**Cobertura real** (medida ampliando o `include` via CLI, sem alterar o projeto): **22,62 % statements / 15,73 % branches** — não os 68,95 % que a métrica oficial reporta, porque a config só mede `services/`, `validation/` e `utils/`.
`App.tsx`, `router.tsx`, `component.ui.tsx`, `component.domain.tsx` e **todas as páginas de dashboard, auth, eventos e membro: 0 %.**

As 7 falhas de teste são todas em `component.ui.test.tsx`, mesma causa: `No "isAdmin" export is defined on the "./store/app.store" mock`. Quatro delas são testes de *completude de campos* do editor de membro que **nunca chegaram a verificar nada** — o componente rebenta antes.

---

## 3. P0 CONFIRMADOS

### P0-1 — Regressão não commitada quebra `/documentacao` no próximo deploy ✅ CORRIGIDO

**Como reproduzir:** `git status` mostra `pages/documentacao/DocumentacaoPage.tsx` modificado e não commitado. Build passa (esbuild não deteta), mas ao renderizar a página: `ReferenceError: tick is not defined`, no primeiro render, sem interação.

**Causa raiz:** trabalho em curso incompleto deixado na árvore de trabalho. `DocumentacaoPage.tsx:349` declara `const [, setTick]` mas `:374` usa `[tick]` no `useMemo`; `:409` passa `onDirectDownload={handleDirectDownload}` a uma função que **não existe no ficheiro**.

**Por que produção está bem:** o bundle em produção (`DocumentacaoPage-usFUzfdH.js`) não contém nenhum dos dois símbolos — foi construído antes desta edição. Verificado por fetch do chunk. **[MEDIDO]**

**Patch aplicado:** `const [tick, setTick] = useState(0)` e definição de `handleDirectDownload` que chama `downloadDocument(doc.file, doc.label)` com toast de erro.

**Risco do patch:** baixo. Restaura o comportamento que o resto do ficheiro já pressupõe.

**Teste que prova:** `tsc` deixou de reportar os 2 erros; `tests/documentacao-page.test.tsx` 2/2.

---

### P0-2 — `ChunkErrorBoundary` desativava o tratamento de erros do site inteiro ✅ CORRIGIDO

**Como reproduzir:** provocar qualquer erro de render numa das 24 rotas lazy. Resultado: **ecrã branco silencioso**, sem mensagem, sem log.

**Causa raiz:** `router.tsx` — `getDerivedStateFromError` marcava `errored` para **qualquer** erro; `render()` devolvia `null`; e o boundary é o mais interno da árvore (`index.tsx` → `ErrorBoundary` global → `App` → `AppRouter` → `ChunkErrorBoundary`), portanto consumia o erro antes do boundary global. O `console.error` do `ErrorBoundary.tsx:24` nunca corria.

Três defeitos somados, todos provados por teste executado:
1. Erro normal → `container.innerHTML === ''`. Sem o boundary intermédio, o mesmo erro renderiza a UI correta.
2. `sessionStorage.chunk_reload` era escrita e nunca removida (2 ocorrências no repo inteiro, ambas em `router.tsx`) → **uma auto-recuperação por aba, para sempre**. Segundo erro de chunk = branco permanente.
3. `errored` nunca resetava e o boundary está **fora** de `<Routes>` → navegar para outra rota mantinha o branco. Transformava "1 página partida" em "app partida".

**Patch aplicado:** relança erros não-chunk para o boundary global; renderiza UI de recuperação ("Atualizacao disponivel" + botão) em vez de `null`; limpa a flag após 5 s de montagem bem-sucedida e no clique do botão.

**Risco do patch:** baixo-médio. Altera o caminho de erro. Mitigado por teste.

**Teste que prova:** `tests/unit/chunk-error-boundary.test.tsx` (novo, 4/4 passa). Contra o `router.tsx` anterior, **3 dos 4 falham** — é regressão real, não teoria.

---

## 4. P1 CONFIRMADOS

### P1-1 — Embeds de vídeo bloqueados pela CSP: funcionalidade fantasma ✅ CORRIGIDO
**[MEDIDO em navegador real, na origem de produção]** — injetei iframes e capturei `securitypolicyviolation`:

```
frame-src ← https://www.youtube.com          BLOQUEADO
frame-src ← https://www.youtube-nocookie.com BLOQUEADO
frame-src ← https://player.vimeo.com         BLOQUEADO
media-src ← vídeo externo .mp4                BLOQUEADO
connect-src ← https://example.com             BLOQUEADO
```

A CSP de `index.html:8` não declarava `frame-src` nem `media-src` → caíam em `default-src 'self'`. O lightbox público (`component.ui.tsx:2208-2214`) e o preview do editor (`:634-640`) **nunca funcionaram em produção**. Feature completa em UI, service e persistência, com falha silenciosa.

**Patch aplicado:** whitelist mínima — `frame-src` só YouTube, youtube-nocookie e Vimeo; `media-src 'self' data: blob: https://*.supabase.co`. Sem `*`, sem `https:` irrestrito.

**Efeito colateral a vigiar:** o preview do editor renderiza a URL **antes** de validar (`component.ui.tsx:636`; validação só em `events.service.ts:235`). Até agora a CSP mascarava isso. Ao desbloquear `frame-src`, a validação passa a ser a única barreira — **item de follow-up, não resolvido neste patch**.

### P1-2 — Zero headers de segurança em produção
**[MEDIDO]** — resposta HTTP real de `fundacaolusobrasileira.vercel.app`:

| Header | Presente? |
|---|---|
| `strict-transport-security` | ✅ (default Vercel) |
| `content-security-policy` | ❌ (só via `<meta>`) |
| `x-content-type-options` | ❌ |
| `referrer-policy` | ❌ |
| `permissions-policy` | ❌ |
| `x-frame-options` / `frame-ancestors` | ❌ |

`public/_headers` é **formato Netlify e é inerte na Vercel** — e está a ser servido publicamente em `/_headers` (HTTP 200), a anunciar a intenção `X-Frame-Options: ALLOWALL` + `frame-ancestors *`. CSP em `<meta>` **ignora `frame-ancestors` por especificação**, logo **não há qualquer proteção anti-clickjacking em `/#/login` e `/#/dashboard`**.

**Não aplicado** — mexe na configuração de produção. Bloco `headers` do `vercel.json` já preparado em `AUDITORIA_09_REDTEAM_CHUNK_DEPLOY.md`, com rollout Report-Only → enforcing.

### P1-3 — Duas árvores de migrações divergentes
9 dos 11 ficheiros em `migrations/` não têm par em `supabase/migrations/`. Um `supabase db push` limpo **não cria** `council_members`, `institutional_documents` nem `estatutos_leads` — tabelas que `councils.service.ts:28`, `documents.service.ts:25` e `estatutos-leads.service.ts:37` consultam.

**[MEDIDO]** Produção **tem** essas tabelas (respondem 200 no bootstrap) → foram aplicadas à mão no SQL Editor. Consequência: **o estado real do banco de produção não é derivável do repositório.** Qualquer ambiente recriado nasce partido.

Pior: onde as duas versões existem, os comentários "matches production" marcam a versão **mais permissiva**. `activity_logs` em `supabase/migrations/20260425000000:19-26` deixa **qualquer autenticado ler o log de auditoria** (que contém emails de pré-cadastro) e **inserir sem `user_id`** — auditoria forjável. A versão em `migrations/` exige `is_editor()` e `user_id = auth.uid()`.

### P1-4 — Upload anónimo irrestrito ao bucket público `media`
`supabase/migrations/20260425000003_storage_sync_prod.sql:52-57`: policy permite INSERT a **anónimos** em `community/*`, sem restrição de extensão. O bucket é público, com `file_size_limit = null` e `allowed_mime_types = null` (`:10-15`). Como policies permissivas são OR'd, a whitelist de extensão da policy de autenticados (`:40-49`) fica anulada. Vetor de hospedagem arbitrária / XSS na origem do storage / DoS de custo.

**Não aplicado** — é policy de produção. Requer decisão.

### P1-5 — Escalada de privilégio teoricamente possível em `profiles`
`supabase/migrations/20260101000001_rls_policies.sql:64-66`: INSERT com `WITH CHECK (auth.uid() = user_id)` **não valida a coluna `role`**. Um autenticado sem profile poderia inserir `role='admin'`. A única barreira efetiva é o UNIQUE em `user_id` (`initial_schema.sql:36`) — acidente, não desenho. **Não coberto por teste executado.** O teste que provaria isto (`tests/rls/profiles.rls.spec.ts:62`, "viewer CANNOT change own role") existe e **nunca correu**.

### P1-6 — Deadlock de auth (loader eterno)
`App.tsx:74` — `INITIAL_SESSION` entra no `await resolveUserRole` com `AUTH_LOADING` ainda `true`. Um `SIGNED_IN` que chegue nesse intervalo retorna cedo por `alreadyResolved` (`:63`) **mas incrementa `authGeneration`** (`:48`), fazendo o handler original abortar em `:76` sem setar sessão nem loading. `AUTH_LOADING` fica `true` para sempre → `PremiumLoader` eterno em qualquer rota protegida. O safety-net de `useAuthSession.ts:28-42` não corrige: não dispara `FLB_STATE_EVENT` e o `ProtectedRoute` não usa o hook (`router.tsx:29`).

**Não aplicado** — mexe na autenticação. Requer a sua aprovação (regra 14 do seu prompt).

### P1-7 — Partilha social e SEO quebrados
HashRouter: o fragmento nunca chega ao servidor. Partilhar `/#/eventos/123` no WhatsApp, LinkedIn ou Facebook mostra **sempre** o mesmo título e a mesma imagem genérica. `usePageMeta.ts:3-13` só altera `document.title` e a meta description — **não toca em `og:*`** e só corre com JS. Google indexa efetivamente **1 URL**.
**[MEDIDO]** `robots.txt` → 404. `sitemap.xml` → 404. Sem canonical, sem JSON-LD.

### P1-8 — Domínio da metadata por confirmar
`index.html:24,29,30,34` apontam para `fundacaolusobrasileira.vercel.app`. O email institucional no repo é `geral@fundacaolusobrasileira.pt` (`LegalPage.tsx:87`). **Não alterei nada** — preciso que confirme o domínio oficial. Bloqueia todas as correções de SEO.

### P1-9 — Secção "Estatutos" vazia em produção
**[MEDIDO]** `/#/documentacao` renderiza "Documento em preparacao - disponivel em breve". `staticDocs` foi removido de `GROUP_DEFS` no commit `e63b8ba` e a migração de seed `20260525_estatutos_seed.sql` **não existe** em `migrations/`. Uma fundação com obrigação legal de transparência mostra hoje uma secção de estatutos vazia.

---

## 5. P2 CONFIRMADOS (resumo)

- **Cobertura enganosa**: thresholds `'services/'`, `'validation/'`, `'utils/'` não casam nada no Vitest 4 (espera `'**/services/**'`) → **nunca falham o build**. Reescrevendo-os numa sonda: exit 1 com 4 violações. E o CI corre `npm test`, não `test:coverage`.
- **TypeScript permissivo**: sem `strict`. `strictNullChecks` isolado custa apenas **34 erros** (melhor ROI); `strict` global custa **4662** — não fazer.
- **`stale-chunk.spec.ts` passa vaziamente**: usa `page.goto('/dashboard')` numa app HashRouter, filtra por `includes('chunk')` (o Vite gera `DashboardPage-<hash>.js`), e a asserção aceita quase tudo. Nunca toca no boundary.
- **13-14 requests por refresh autenticado**, 4-9 duplicadas. **[MEDIDO]** visita anónima = **5 requests REST, `events` pedido 2×**, latência 1,7-2,0 s. Nenhum service tem cache ou dedupe de request em voo.
- **`MEMBERS_SEED` não é fallback**: `members.service.ts:60-74` mescla o seed com o DB em toda sincronização → membro apagado no banco continua a aparecer.
- **Modais duplicados**: `components/ui/Modals.tsx` tem focus trap, Escape e restauração de foco; o `Modal` de `component.ui.tsx:262-308` não tem nenhum dos três — e é o que o Dashboard e os Eventos usam.
- **Mojibake visível** em `Modals.tsx:170,176,192,201,202` e acentos removidos em várias páginas ("Documentacao", "Transparencia").
- **Sem página de Contacto**: email e as duas moradas só existem dentro da Política de Privacidade. Sem link no Header nem no Footer.
- **Menu mobile** sem ESC, scroll-lock ou focus-trap (`Header.tsx:101-143`); sem skip-link; ~14 `<img>` sem `alt`; 74 usos de `text-white/10..40` sobre `brand-900` (contraste abaixo de AA).
- **24 MB de PDFs em `public/`** fora de qualquer regra de `Cache-Control` do `vercel.json`, descarregados via `fetch`+`Blob` em memória (até 6,7 MB por ficheiro).
- **16 `console.*` sem guarda `DEV`** em produção, 9 em `auth.service.ts`, um deles com email (`:433`).
- **`supabase_security_update.sql` nunca executou**: usa `ADD CONSTRAINT IF NOT EXISTS`, sintaxe que não existe em PostgreSQL (linha 212) → aborta, e as secções 9-14 nunca se aplicaram.
- **Segredos de E2E apontam para produção**: `e2eCleanup.ts`, `e2eUsers.ts` e `admin-bypass-server.ts` criam cliente **service-role** a partir de `VITE_SUPABASE_URL` — a var de produção. Sem `.env.e2e` que sobrescreva, os E2E escreveriam e apagariam **direto em produção**. Hoje é inócuo porque não correm; deixa de ser no dia em que alguém os fizer correr.

---

## 6. HIPÓTESES DESCARTADAS (com evidência)

| Hipótese | Veredito |
|---|---|
| Backup/restore como vetor (JSON adulterado) | **DESCARTADA.** `exportState`/`importState` são stubs desativados (`store/app.store.ts:78-79`); o JSON nunca é parseado (`component.ui.tsx:1523`). O `SettingsModal` promete um backup que não existe (P3 de honestidade de UI). |
| Edge Function `admin-create-user` aberta | **DESCARTADA.** Valida JWT (`index.ts:38-52`) e exige `role='admin'` via service-role (`:54-66`). |
| Bypass E2E vazando para produção | **DESCARTADA.** Dupla verificação de admin (`auth.service.ts:380`, `admin-bypass-server.ts:99`) e recusa em PROD com URL não-local (`auth.service.ts:25-31`). O código está no bundle — feio, não explorável (P2). |
| Service-role key no repositório ou histórico git | **DESCARTADA.** `git log -S 'service_role'` vazio; ocorrências de `eyJ` são binários PDF/DLL. |
| Imports circulares nos god files | **DESCARTADA.** O grafo é acíclico. O problema real é **duplicação**: 19 dos 31 exports de `component.ui.tsx` têm implementação paralela e divergente em `components/ui/`. |
| Memory leaks / listeners órfãos | **DESCARTADA.** Os 21 subscritores de `FLB_STATE_EVENT` e todos os listeners de window/document têm cleanup. Zero `useEffect` sem array de deps. |
| Polling ou realtime a consumir quota | **DESCARTADA.** Zero na aplicação. Só o `setInterval(30s)` interno do supabase-js. |
| `env` versionado como vazamento crítico | **REBAIXADA para P3.** É chave `sb_publishable_*`, não service-role — e o Vite nem lê esse ficheiro. O risco real é 100 % da RLS, que é o verdadeiro problema. |
| Escrita administrativa protegida só pelo frontend | **MAIORMENTE DESCARTADA.** As escritas de members/councils/documents/events/precadastros/benefits têm RLS `is_editor()` equivalente. As **únicas** exceções são as 4 já listadas: 2 de storage, 2 de `activity_logs`. |

---

## 7. CORREÇÕES APLICADAS NESTA SESSÃO

| # | Ficheiro | Mudança | Validação |
|---|---|---|---|
| 1 | `pages/documentacao/DocumentacaoPage.tsx` | `tick` consumido; `handleDirectDownload` definido | 2 erros de `tsc` eliminados; 2/2 testes |
| 2 | `router.tsx` | `ChunkErrorBoundary` relança erros não-chunk, renderiza UI de recuperação, limpa a flag | teste novo 4/4; **3/4 falham contra o código antigo** |
| 3 | `index.html` | CSP + `frame-src` (whitelist mínima) e `media-src` | build passa; requer verificação em navegador após deploy |
| 4 | `tsconfig.json` | `exclude` de `supabase/functions` (Deno) | 5 erros de `tsc` eliminados |
| 5 | `tests/unit/chunk-error-boundary.test.tsx` | teste de regressão novo | 4/4 |

**Resultado agregado:** `tsc` 29 → **22 erros**; testes 354 → **358 pass**, mesmas 7 falhas pré-existentes; build passa em 3,83 s sem warnings. **Nenhum deploy feito.**

---

## 8. PRÓXIMAS AÇÕES POR ROI

**Precisam da sua decisão antes de eu executar** (regra 14 / produção):

1. **Confirmar o domínio oficial** (`.pt` ou `.vercel.app`). Desbloqueia toda a correção de SEO. — *pergunta, não tarefa*
2. **Fechar o upload anónimo no bucket `media`** (P1-4) — policy de produção.
3. **Alinhar as duas árvores de migrações** e decidir qual versão de `activity_logs` é a correta (P1-3) — o estado real do banco precisa de ser lido primeiro, o que exige acesso ao projeto `lhgzyrszzbxjjvnxfwzf`.
4. **Corrigir o deadlock de auth** (P1-6) — mexe na autenticação.
5. **Headers de segurança no `vercel.json`** + apagar `public/_headers` (P1-2) — muda configuração de produção.

**Posso executar já, baixo risco, sem a sua aprovação:**

6. Reparar o mock de `component.ui.test.tsx` → destranca 7 testes, incluindo 4 que nunca verificaram nada.
7. Corrigir os globs de threshold de cobertura — **mas isto torna o CI vermelho**, então quero o seu aval sobre o timing.
8. Zerar os 22 erros restantes de `tsc` (destravam o CI) e depois ligar `strictNullChecks` (custo medido: 34 erros).
9. Reescrever `stale-chunk.spec.ts`, que hoje passa vaziamente.
10. Guardar os `console.*` com `import.meta.env.DEV` e remover o que loga email.

**Preciso de acesso ao projeto Supabase `lhgzyrszzbxjjvnxfwzf`** (ou a um projeto de teste com o mesmo schema, para `.env.test`) para transformar "RLS NÃO PROVADA" em prova real. Sem isso, a matriz de permissões fica em **0 linhas "PROTEGIDO"** e 30 ações em "PROTEGIDO NÃO TESTADO" ou "NÃO PROVADO".

---

## 9. RELATÓRIOS DETALHADOS

| Ficheiro | Conteúdo |
|---|---|
| `AUDITORIA_01_ARQUITETURA.md` | inventário, god files, órfãos, estado global |
| `AUDITORIA_02_DADOS_RLS.md` | matriz RLS tabela × papel, storage, hook JWT |
| `AUDITORIA_03_SEGURANCA.md` | auth, autorização, backup/restore, segredos, XSS |
| `AUDITORIA_04_TESTES.md` | outputs brutos de todas as execuções |
| `AUDITORIA_05_PERFORMANCE_CSP.md` | contagem de requests por cenário, bundle, CSP |
| `AUDITORIA_06_SEO_UX_REGRESSAO.md` | SEO, UX, a11y, tabela de regressão do relatório histórico |
| `AUDITORIA_09_REDTEAM_CHUNK_DEPLOY.md` | chunk boundary, ciclo de deploy, headers propostos |
| `AUDITORIA_10_COBERTURA_TS_PERMISSOES.md` | cobertura por área, plano de TS, matriz de permissões |

**Regressão do relatório histórico:** dos 15 bugs de `PDF_BUGFIX_REPORT.md`, **13 continuam corrigidos**, 1 regrediu parcialmente (PDF #14: a Home voltou a nome literal `execEntry(['Paulo Campos Costa'])` em `HomePage.tsx:158-159` em vez de resolver por `tier`), 1 não é provável sem execução visual. Dos itens do `PROMPT_REPLICAR_ALTERACOES.md`, a migração `estatutos_seed` **regrediu** (ficheiro ausente).
