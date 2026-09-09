# AUDITORIA 10 — COBERTURA REAL, TYPESCRIPT E MATRIZ DE PERMISSÕES
Agente Red Team B — projeto `fundacaolusobrasileira`. Data de execução: 2026-09-07.

## Metodologia e ambiente

- Cópia do projeto para `/tmp/flb` (sem `node_modules`, `.git`, `dist`), `npm ci` limpo (258 pacotes). `.env` criado a partir do ficheiro `env` da raiz.
- **Nenhum ficheiro do mount foi alterado.** Nenhum teste foi editado. Nenhum threshold foi alterado.
- Todos os números abaixo são de execução real nesta sessão (comandos citados).
- Ficheiros temporários criados **apenas** em `/tmp/flb`: `vite.probe.config.ts` (prova do bug de threshold), `tsconfig.<flag>.json` (matriz TS), e uma sonda de render descartada após uso.

---

# A) COBERTURA REAL POR ÁREA (checkpoint item 8)

## A.0 Estado da suíte

`npx vitest run` (config do projeto): **19 ficheiros passam, 1 falha — 354 passam / 7 falham (361)**.
As 7 falhas são todas de `component.ui.test.tsx` (`MemberEditorModal`), causa única:
`Error: [vitest] No "isAdmin" export is defined on the "./store/app.store" mock` disparado em `component.ui.tsx:1365:34`.
Conforme instrução, o teste **não foi corrigido**; para obter números de cobertura excluí **apenas** esse ficheiro via CLI (`--exclude='component.ui.test.tsx'`), o que deixa **340/340 a passar**. Isto está registado como limitação: a cobertura abaixo é a cobertura *sem* os 7 testes quebrados (que de qualquer forma nunca chegam a renderizar o modal).

## A.1 Comando executado (include ampliado, sem tocar em `vite.config.ts`)

```
npx vitest run --coverage \
  --coverage.include='App.tsx' --coverage.include='router.tsx' \
  --coverage.include='store/**' --coverage.include='components/**' \
  --coverage.include='pages/**' --coverage.include='hooks/**' \
  --coverage.include='services/**' --coverage.include='validation/**' \
  --coverage.include='utils/**' --coverage.include='component.ui.tsx' \
  --coverage.include='component.domain.tsx' \
  --exclude='component.ui.test.tsx' --exclude='tests/rls/**' --exclude='tests/e2e/**'
```

**Total real do produto: 22.62% statements / 15.73% branches / 10.30% functions.**
(A métrica "oficial" do projeto, restrita a `services|validation|utils`, mostra 68.95% — ou seja, **o número publicado esconde 3.0x de código não medido**.)

## A.2 Tabela por área

| Área | % statements | % branches | Veredito |
|---|---|---|---|
| **TOTAL REAL (todas as áreas)** | **22.62** | **15.73** | CRÍTICO — 3/4 do produto sem rede |
| `App.tsx` | 0 | 0 | CRÍTICO — bootstrap/sessão sem teste |
| `router.tsx` | 0 | 0 | **CRÍTICO — `ProtectedRoute` (router.tsx:20-33) tem 0% de cobertura** |
| `component.ui.tsx` (138 KB, 2229 linhas) | 0 | 0 | CRÍTICO — único teste que o toca está quebrado |
| `component.domain.tsx` (644 linhas) | 0 | 0 | CRÍTICO |
| `store/app.store.ts` | 69.64 | 40.90 | MÉDIO — `isAdmin`/`isEditor` são a base de toda a autorização de UI |
| `components/ui/**` | 31.30 | 12.69 | FRACO (`ErrorBoundary.tsx` 0%, `Toast.tsx` 3.7%) |
| `components/domain/**` | 41.66 | 18.64 | FRACO (só `Header` e `SmartInviteModal` testados) |
| `hooks/**` | 38.63 | 16.66 | FRACO (`useAuthSession` 70.8%; restantes 0%) |
| `pages/dashboard/**` | **0** | **0** | **CRÍTICO — toda a superfície administrativa sem teste** |
| `pages/auth/**` (Login, Cadastro, PreCadastro, ResetPassword) | **0** | **0** | **CRÍTICO** |
| `pages/membro/**` | 0 | 0 | CRÍTICO (inclui `PartnerGalleryEditor` = upload storage) |
| `pages/eventos/**` | 0 | 0 | CRÍTICO |
| `pages/documentacao/**` | 27.04 | 15.78 | FRACO — só helpers; o componente **nunca é renderizado** (ver B.4) |
| `pages/home`, `legal`, `parceiros`, `beneficios`, `quem-somos`, `administracao`, `legaltech-space` | 0 | 0 | FRACO/CRÍTICO conforme criticidade |
| `services/**` | 68.06 | 57.88 | MÉDIO — abaixo do threshold declarado (80/75) |
| ├ `activity-log.service.ts` | 100 | 100 | OK |
| ├ `community-media.service.ts` | 100 | 100 | OK |
| ├ `precadastros.service.ts` | 97.54 | 88.57 | OK |
| ├ `events.service.ts` | 93.84 | 80.50 | OK |
| ├ `members.service.ts` | 91.72 | 83.33 | OK |
| ├ `media.service.ts` | 83.33 | 62.50 | MÉDIO |
| ├ `auth.service.ts` | 74.05 | 65.35 | **FRACO — é o serviço de autorização** |
| ├ `benefits.service.ts` | 52.17 | 41.66 | FRACO |
| ├ `documents.service.ts` | 10.30 | 2.94 | **CRÍTICO** |
| ├ `estatutos-leads.service.ts` | 11.90 | 0 | **CRÍTICO (PII/leads)** |
| ├ `councils.service.ts` | **0** | **0** | **CRÍTICO** |
| └ `search.service.ts` | 0 | 0 | BAIXO risco |
| `utils/**` | 81.81 | 78.94 | MÉDIO (threshold declarado: 100) |
| `validation/schemas.ts` | 93.33 | 100 | BOM (threshold declarado: 100) |

## A.3 Áreas críticas fora da métrica atual (ordem de prioridade pedida)

1. **auth** — `pages/auth/**` 0%; `auth.service.ts` 74%/65% (ramos de erro de sessão, `convertPreCadastroToAccount`, `evaluateAuthBypass`/`AUTH_BYPASS_URL` em `services/auth.service.ts:119` sem cobertura); `useAuthSession` 70.8%.
2. **router / guards** — `router.tsx` 0%. `ProtectedRoute` (`router.tsx:20-33`) e as 4 rotas `requireEditor` (`router.tsx:70,78,79,80`) nunca são exercidas. É o único ponto de bloqueio de UI para todo o dashboard.
3. **permissions** — `isAdmin`/`isEditor` (`store/app.store.ts:67-68`) só têm 40.9% de branches; nenhum teste de UI prova que um `membro` não vê os controlos de admin (`pages/dashboard/DashboardPage.tsx:244`, `checkAuth` em `:129-133`).
4. **backup/restore** — export CSV/JSON de utilizadores em `pages/dashboard/UserManagerModal.tsx:136-145` (0%); nenhum teste de integridade de export/import.
5. **media** — `media.service.ts` 83%/62.5% mas `deleteMediaBlob` (`services/media.service.ts:56-66`) parseia URL sem validação de bucket; `pages/dashboard/DashboardMediaPage.tsx` 0%; `pages/membro/PartnerGalleryEditor.tsx` 0%.
6. **pré-cadastro** — serviço bem coberto (97.5%), mas o funil de UI (`pages/auth/PreCadastroPage.tsx`, aprovação em `DashboardPage`) está a 0%.
7. **members** — `members.service.ts` 91.7%, mas o editor real (`component.ui.tsx` `MemberEditorModal`, linha ~1365) está a 0% **e** o único teste existente está quebrado.
8. **events** — serviço 93.8%; `pages/eventos/**` e a moderação de mídia comunitária (`approveCommunityMedia`/`rejectCommunityMedia` chamados em `DashboardMediaPage.tsx:116,120`) a 0% de UI.

Fora da lista pedida mas igualmente crítico: **`councils.service.ts` a 0%** e **`documents.service.ts` a 10.3%** — ambos com escrita em tabelas públicas do site institucional.

## A.4 Armadilha confirmada: thresholds são configuração morta

`vite.config.ts:37-41` declara:

```ts
thresholds: {
  'services/':   { statements: 80, branches: 75 },
  'validation/': { statements: 100 },
  'utils/':      { statements: 100 },
}
```

No Vitest 4 as chaves de threshold por caminho são **globs**; `'services/'` não casa `services/auth.service.ts`. Prova executada:

| Execução | Resultado real | Exit code |
|---|---|---|
| Config do projeto (`'services/'`, `'validation/'`, `'utils/'`) | services 68.06/57.88, validation 93.33, utils 81.81 — **todos abaixo do declarado** | **0 (PASSA)** |
| Config idêntica com `'**/services/**'`, `'**/validation/**'`, `'**/utils/**'` (`/tmp/flb/vite.probe.config.ts`) | 4 erros: `Coverage for statements (68.06%) does not meet "**/services/**" threshold (80%)`, branches (57.88% vs 75%), validation (93.33% vs 100%), utils (81.81% vs 100%) | **1 (FALHA)** |

**Conclusão: os thresholds nunca foram aplicados; o gate de cobertura é decorativo e a cobertura de `services` já regrediu ~12 pontos abaixo do contrato sem que nada falhasse.** Agrava-se pelo facto de o CI (`.github/workflows/test.yml:26`) correr `npm run test` e não `test:coverage` — ou seja, cobertura nem sequer é medida no CI.

## A.5 Testes novos propostos, por ROI (proposta — NÃO implementado)

| # | Teste | Área | Porquê (regressão que trava) |
|---|---|---|---|
| 1 | `router.test.tsx`: `ProtectedRoute` com sessão `viewer`/`membro`/anónimo → redireciona; com `editor` → renderiza | auth+router+permissions | Um único regresso aqui abre **todo** o dashboard. Custo ~40 linhas. |
| 2 | `store/app.store` — matriz `isAdmin()`/`isEditor()` para os 4 roles × logged/deslogado | permissions | Base de 30+ guardas de serviço; hoje 40.9% de branches. |
| 3 | Teste de guarda por serviço: para cada mutação (`createEvent`, `deleteMember`, `updatePreCadastro`, `createCouncilMember`, `createDocument`, `deleteEstatutosLead`, `approveCommunityMedia`) com sessão não-editor → **não chama o Supabase** e devolve false/null | permissions | Prova em unidade a metade "UI" da matriz C; cobre `councils`/`documents`/`estatutos-leads` que estão a 0-12%. |
| 4 | `DocumentacaoPage` render smoke (`render(<DocumentacaoPage/>)`) | documentação | Teria apanhado o P0 do `tick` (ver B.4). Uma linha por página pública. |
| 5 | Smoke de render para as 4 páginas de auth + `/dashboard` (com sessão mockada) | auth | 0% hoje; apanha ReferenceError/crash de import como o de B.4. |
| 6 | `UserManagerModal`: `updateUserRole` só visível/efetivo para admin + export CSV com escaping | permissions/backup | Escalada de privilégio e vazamento de PII em export. |
| 7 | `precadastros`: transição de estados (novo→aprovado→convertido) e idempotência de `convertPreCadastroToMember` (`services/precadastros.service.ts:175-216`) | pré-cadastro | Conversão dupla cria membros duplicados. |
| 8 | `media.service.deleteMediaBlob` com URLs hostis (outro bucket, `../`, querystring) | media | Hoje 62.5% de branches num parser de path. |
| 9 | RLS specs em falta: `council_members`, `institutional_documents`, `estatutos_leads`, `storage.objects` (bucket `media`) | permissões backend | São exatamente as linhas "NÃO PROVADO" da matriz C. |
| 10 | Corrigir o mock de `component.ui.test.tsx` (adicionar `isAdmin`) para reativar os 7 testes de `MemberEditorModal` | members | Recupera cobertura já escrita e paga. |

Além dos testes: **corrigir as chaves de threshold para globs `**/services/**` e passar o CI a correr `test:coverage`** — sem isso, qualquer teste novo pode voltar a apodrecer sem sinal.

---

# B) TYPESCRIPT (checkpoint item 9)

## B.1 Baseline

`npx tsc --noEmit` → **29 erros em 14 ficheiros** (o `tsconfig.json` não tem `strict`, `strictNullChecks` nem `noImplicitAny`).
Ficheiros: `components/ui/ErrorBoundary.tsx`, `data/events.data.ts`, `pages/dashboard/UserManagerModal.tsx`, `pages/documentacao/DocumentacaoPage.tsx`, `pages/legal/LegalPage.tsx`, `pages/membro/PartnerGalleryEditor.tsx`, `pages/parceiros/ParceirosPage.tsx`, `router.tsx`, `services/auth.service.test.ts`, `services/auth.service.ts`, `services/precadastros.service.test.ts`, `supabase/functions/admin-create-user/index.ts`, `tests/rls/seed.ts`, `vite.config.ts`.

> **Achado colateral grave:** `.github/workflows/test.yml:23-24` corre `npx tsc --noEmit` como passo de CI. Com 29 erros, **o job `unit-integration` falha antes sequer de correr os testes** — o pipeline está vermelho por construção, ou está a ser ignorado/contornado. Isto explica como os bugs de B.4 chegaram a `main`.

## B.2 Matriz de flags (medição real, uma flag de cada vez, tsconfigs temporários em `/tmp/flb`)

| Flag | Nº de erros (total) | Δ vs baseline | Top 5 ficheiros afetados | Risco | Esforço |
|---|---|---|---|---|---|
| `strict: true` | **4662** | +4633 | `component.ui.tsx` (969), `component.domain.tsx` (296), `pages/membro/MembroPerfilPage.tsx` (288), `pages/dashboard/DashboardPage.tsx` (251), `pages/home/HomePage.tsx` (240) | Refatoração massiva; risco alto de introduzir bugs ao "calar" tipos | XXL (semanas) |
| `noImplicitAny` | **4684** | +4655 | idênticos (`component.ui.tsx` 969, `component.domain.tsx` 296, `MembroPerfilPage` 288, `DashboardPage` 251, `HomePage` 240) | É a flag que domina o `strict`: props de componentes sem tipo | XXL |
| `strictNullChecks` | **34** | **+5** | `supabase/functions/*` (5, ruído Deno), `services/precadastros.service.test.ts` (5), `components/ui/ErrorBoundary.tsx` (5), `services/auth.service.test.ts` (3), `pages/membro/PartnerGalleryEditor.tsx` (3) | **Baixo e alto valor** — os 5 novos são reais: `services/auth.service.ts:286` (array possivelmente `null`), `services/precadastros.service.ts:138` (objeto não satisfaz `PreCadastro`), 3 em testes | **S (1-2 dias)** |
| `noUncheckedIndexedAccess` | **30** | +1 | `supabase/functions/*` (5), `ErrorBoundary.tsx` (5), `auth.service.test.ts` (3), `PartnerGalleryEditor.tsx` (3), `LegalPage.tsx` (2) | Muito baixo; ganho real em parsers de path (`media.service`, `url.ts`) | S |
| `noUnusedLocals` | **55** | +26 | `supabase/functions/*` (5), `ErrorBoundary.tsx` (5), `component.ui.tsx` (5), `precadastros.service.test.ts` (3), `auth.service.test.ts` (3) | Baixo, mas **é a flag que apanha código morto** — inclui 2 em `DocumentacaoPage.tsx` | S |
| `noUnusedParameters` | **31** | +2 | `supabase/functions/*` (5), `ErrorBoundary.tsx` (5), `auth.service.test.ts` (3), `PartnerGalleryEditor.tsx` (3), `ParceirosPage.tsx` (2) | Muito baixo | XS |

Nota: `components/ui/ErrorBoundary.tsx` e `router.tsx` aparecem em todas as execuções com `Property 'state'/'props' does not exist` — sintoma de `useDefineForClassFields: false` + falta de tipagem das class components; é ruído estrutural, corrigível com uma anotação `extends React.Component<Props, State>`.

## B.3 Plano incremental proposto (não implementado)

**Passo 0 — higiene (1 hora, zero risco).** Excluir Deno do typecheck do frontend:
```jsonc
// tsconfig.json
"exclude": ["node_modules", "dist", "supabase/functions/**"]
```
Efeito medido: **29 → 25 erros** (elimina os 5 erros `Cannot find name 'Deno'` / `npm:@supabase/supabase-js`, que não são bugs). As funções Deno devem ter o seu próprio `supabase/functions/tsconfig.json` ou `deno.json`.

**Passo 1 — chegar a zero erros no baseline (25 erros, ~1 dia).** Prioridade absoluta: os 2 erros `TS2304` de `DocumentacaoPage.tsx` (B.4, são bugs de runtime). Depois: tipar `ErrorBoundary`/`ChunkErrorBoundary` (5+1), `ProfilesResultWithCapabilities` em `UserManagerModal.tsx:172` (union sem `error`), `data/events.data.ts:31` (`sponsors` vs `sponsorIds` — provável campo silenciosamente ignorado), `LegalPage` (`key` em spread), `PartnerGalleryEditor` (3), `ParceirosPage:46`, `auth.service.ts:286`, `vite.config.ts:5` (tipar como `UserConfig` do `vitest/config`).

**Passo 2 — ligar `noUnusedLocals` + `noUnusedParameters` (~55 e 31 erros, quase todos triviais).** Ligar já com `tsc --noEmit` no CI a bloquear. É esta a flag que teria assinalado o `setTick` sem `tick` como código morto em `DocumentacaoPage`.

**Passo 3 — `strictNullChecks` isolado (34 erros).** Ligar `strictNullChecks: true` **sem** `strict`. É onde está 90% do valor de segurança de tipos (nulls do Supabase) por ~1-2 dias de trabalho. Corrigir primeiro `services/**` (2 erros reais), depois testes.

**Passo 4 — `noUncheckedIndexedAccess` (30).** Barato depois do passo 3; endurece os parsers de URL/path.

**Passo 5 — `noImplicitAny`/`strict` NUNCA de uma vez.** Com 4.6k erros concentrados em 5 ficheiros gigantes, a única via sã é: (a) manter `strict:false` no `tsconfig.json` global; (b) criar `tsconfig.strict.json` que aplica `strict:true` só a `services/**`, `validation/**`, `utils/**`, `store/**` e correr como passo de CI adicional; (c) alargar o `include` desse ficheiro à medida que `component.ui.tsx` (2229 linhas) e `component.domain.tsx` forem partidos em componentes. Não abrir refatoração das páginas antes disso.

## B.4 Erros que são BUGS DE RUNTIME REAIS (P0)

`pages/documentacao/DocumentacaoPage.tsx`:

- **linha 374**: `const groups = useMemo(() => GROUP_DEFS.map(buildGroup), [tick]);` — o estado é declarado em `:349` como `const [, setTick] = useState(0);`, ou seja, **o valor `tick` foi descartado mas continua referenciado no array de dependências**.
- **linha 409**: `onDirectDownload={handleDirectDownload}` — `handleDirectDownload` **não existe em nenhum ficheiro do repositório** (grep global: única ocorrência é esta).

**O que acontece em runtime — verificado empiricamente**, não inferido. Sonda executada em `/tmp/flb` (`render(<MemoryRouter><DocumentacaoPage/></MemoryRouter>)`), resultado:

```
RENDER_ERROR: ReferenceError: tick is not defined
```

Análise:
- O erro ocorre no **corpo do componente, durante o primeiro render**, antes de qualquer interação. A linha 374 é avaliada em toda a renderização; a 409 é atingida a seguir (o JSX é avaliado eagerly), pelo que mesmo corrigindo o `tick` o `handleDirectDownload` rebentaria da mesma forma no mesmo render.
- Vite/esbuild **não** apanha identificadores não definidos: o build passa. O erro só existe em runtime.
- A rota é `/documentacao` (`router.tsx:85`), carregada via `lazy()`. O `ChunkErrorBoundary` de `router.tsx` trata falhas de *chunk*; um `ReferenceError` de render propaga para o error boundary mais próximo — se este mostrar fallback, o utilizador vê um ecrã de erro; se não houver boundary a cobrir a rota, é **tela branca**. Em qualquer dos casos **a página de Documentação Institucional está 100% inacessível ao público**, sem qualquer conteúdo renderizado.
- **Porque é que os testes não apanham:** `tests/documentacao-page.test.tsx` importa apenas os helpers `buildGroup` e `downloadDocument` — nunca renderiza `DocumentacaoPage`. A suíte passa a verde com a página completamente partida.

**Veredito: P0.** Página pública institucional (transparência legal — estatutos, relatórios) totalmente quebrada em produção, com CI incapaz de a detetar por dois motivos independentes (typecheck vermelho tolerado + zero testes de render). Correção: remover `tick` das deps (ou usar o valor real) e implementar/remover `handleDirectDownload`. Custo: minutos. Impacto: total.

Os restantes 27 erros são ruído de tipo ou risco latente, com duas menções honrosas de risco funcional (P2, não confirmados em runtime): `data/events.data.ts:31` (`sponsors` não existe em `Partial<Event>` → dados de patrocinadores provavelmente descartados em silêncio) e `pages/dashboard/UserManagerModal.tsx:172` (acesso a `.error` num ramo da union onde não existe → `undefined` em vez de mensagem de erro).

---

# C) MATRIZ DE PERMISSÕES (checkpoint itens 7 e 12)

## C.0 AVISO DE HONESTIDADE METODOLÓGICA — LER ANTES DA TABELA

**Nenhuma linha desta tabela pode receber o valor `PROTEGIDO`.** Não foi possível executar um único teste contra um banco de dados real nesta sessão: não existe `.env.test` (só `.env.test.example`), e o MCP Supabase configurado aponta para outro projeto. As specs de `tests/rls/*.spec.ts` **existem e estão escritas**, mas **não foram executadas** — nem aqui, nem no CI (`.github/workflows/test.yml` não tem job `test:rls`; `vitest.rls.config.ts` só corre manualmente).
Portanto: **`PROTEGIDO NÃO TESTADO` é o veredito máximo possível**, e significa "UI bloqueia + existe policy RLS no SQL + existe spec escrita — nada disto foi provado em execução".
Adicionalmente, todas as policies foram lidas em **ficheiros de migração**; não há prova de que o estado real da base de dados de produção corresponda ao SQL versionado.

Legenda de RESULTADO: `PROTEGIDO NÃO TESTADO` | `SÓ UI` (=P0/P1) | `NÃO PROVADO`.

## C.1 Tabela

| AÇÃO | TABELA/BUCKET | MÉTODO | UI BLOQUEIA? | BACKEND/RLS BLOQUEIA? (policy e arquivo:linha) | TESTE PROVA? (teste) | RESULTADO |
|---|---|---|---|---|---|---|
| Criar membro/parceiro | `partners` | INSERT | SIM — `isEditor()` em `services/members.service.ts:79`; rota `router.tsx:78` | SIM — `"partners: inserção editores" WITH CHECK is_editor()` em `supabase/migrations/20260101000001_rls_policies.sql:100-102` | Escrita, nunca executada — `tests/rls/partners.rls.spec.ts:51,56,61` | PROTEGIDO NÃO TESTADO |
| Editar membro/parceiro | `partners` | UPDATE | SIM — `services/members.service.ts:96` | SIM — `"partners: atualização editores"` em `..._rls_policies.sql:104-106` | Escrita, não executada — `tests/rls/partners.rls.spec.ts:67,73` | PROTEGIDO NÃO TESTADO |
| Apagar membro/parceiro | `partners` | DELETE | SIM — `services/members.service.ts:161` | SIM — `"partners: exclusão editores"` em `..._rls_policies.sql:108-110` | Escrita, não executada — `tests/rls/partners.rls.spec.ts:78,84` | PROTEGIDO NÃO TESTADO |
| Criar membro do conselho | `council_members` | INSERT | SIM — `isEditor()` em `services/councils.service.ts:50`; UI `pages/dashboard/CouncilManagerSection.tsx:60` | SIM, **mas fora de `supabase/migrations/`** — `"council_members: inserção editor"` em `migrations/20260521_council_members.sql:64-66` | **NÃO — não existe `tests/rls/council*.spec.ts`**; `councils.service.ts` tem **0% de cobertura** | NÃO PROVADO |
| Editar membro do conselho | `council_members` | UPDATE | SIM — `services/councils.service.ts:89` | SIM — `migrations/20260521_council_members.sql:70-73` | NÃO — nenhum teste | NÃO PROVADO |
| Apagar membro do conselho | `council_members` | DELETE | SIM — `services/councils.service.ts:115` | SIM — `migrations/20260521_council_members.sql:77-79` | NÃO — nenhum teste | NÃO PROVADO |
| Criar evento | `events` | INSERT | SIM — `services/events.service.ts:58`; rota `router.tsx:79` | SIM — `"events: inserção editores"` em `..._rls_policies.sql:124-126` | Escrita, não executada — `tests/rls/events.rls.spec.ts:65,70,75` | PROTEGIDO NÃO TESTADO |
| Editar evento | `events` | UPDATE | SIM — `services/events.service.ts:108` | SIM — `..._rls_policies.sql:128-130` | Escrita, não executada — `tests/rls/events.rls.spec.ts:82,88,94` | PROTEGIDO NÃO TESTADO |
| Apagar evento | `events` | DELETE | SIM — `services/events.service.ts:151` | SIM — `..._rls_policies.sql:132-134` | Escrita, não executada — `tests/rls/events.rls.spec.ts:100,106,112` | PROTEGIDO NÃO TESTADO |
| Criar documento institucional | `institutional_documents` | INSERT | SIM — `services/documents.service.ts:68`; UI `pages/dashboard/DocumentManagerSection.tsx:81` | SIM, fora de `supabase/migrations/` — `migrations/20260521_institutional_documents.sql:62-64` | **NÃO — nenhuma spec RLS; serviço a 10.3% de cobertura** | NÃO PROVADO |
| Editar/ativar documento | `institutional_documents` | UPDATE | SIM — `services/documents.service.ts:109` | SIM — `migrations/20260521_institutional_documents.sql:67-70` | NÃO | NÃO PROVADO |
| Apagar documento | `institutional_documents` | DELETE | SIM — `services/documents.service.ts:135` | SIM — `migrations/20260521_institutional_documents.sql:73-75` | NÃO | NÃO PROVADO |
| Criar benefício | `benefits` | INSERT | SIM — `services/benefits.service.ts:29` | SIM — `"benefits: escrita editor"` em `supabase/migrations/20260101000000_initial_schema.sql:534` | Escrita, não executada — `tests/rls/benefits.rls.spec.ts:69,76` | PROTEGIDO NÃO TESTADO |
| Editar benefício | `benefits` | UPDATE | SIM — `services/benefits.service.ts:47` | SIM — `..._initial_schema.sql:543` | Escrita, não executada — `tests/rls/benefits.rls.spec.ts:86,92` | PROTEGIDO NÃO TESTADO |
| Apagar benefício | `benefits` | DELETE | SIM — `services/benefits.service.ts:60` | SIM — `..._initial_schema.sql:552` | Escrita, não executada — `tests/rls/benefits.rls.spec.ts:98,104` | PROTEGIDO NÃO TESTADO |
| Aprovar/rejeitar/atualizar pré-cadastro | `precadastros` | UPDATE | SIM — `services/precadastros.service.ts:108` (+ verificação de linhas afetadas em `:123-133`) | SIM — `"precadastros: atualização editores"` em `..._rls_policies.sql:157-159` | Escrita, não executada — `tests/rls/precadastros.rls.spec.ts:79,85,91` | PROTEGIDO NÃO TESTADO |
| Apagar pré-cadastro | `precadastros` | DELETE | SIM — `services/precadastros.service.ts:147` | SIM — `..._rls_policies.sql:161-163` | Escrita, não executada — `tests/rls/precadastros.rls.spec.ts:97,103` | PROTEGIDO NÃO TESTADO |
| Ler lista de pré-cadastros (PII) | `precadastros` | SELECT | SIM — dashboard sob `requireEditor` (`router.tsx:78`) | SIM — `"precadastros: leitura editores"` em `..._rls_policies.sql:153-155` | Escrita, não executada — `tests/rls/precadastros.rls.spec.ts:49,56,62` | PROTEGIDO NÃO TESTADO |
| Converter pré-cadastro em conta | `auth.users` + `profiles` | Edge Function `admin-create-user` | SIM — `isAdmin()` em `services/auth.service.ts:380` | SIM — verificação de role no servidor: `supabase/functions/admin-create-user/index.ts:64-66` (`requesterProfile?.role !== 'admin'` → 403), com service-role key só no servidor | **NÃO — nenhum teste da edge function; `convertPreCadastroToAccount` sem cobertura de ramo** | NÃO PROVADO |
| Moderar (aprovar) mídia comunitária | `community_media_submissions` | UPDATE/DELETE | SIM — `services/events.service.ts:257` (`approveCommunityMedia`), UI `pages/dashboard/DashboardMediaPage.tsx:116` | SIM — `"community_media: atualização editor"` e `"...exclusão editor"` em `..._rls_policies.sql:193-199` | Escrita, não executada — `tests/rls/community-media.rls.spec.ts:99,105,111,117,123` | PROTEGIDO NÃO TESTADO |
| Rejeitar mídia comunitária | `community_media_submissions` | DELETE | SIM — `services/events.service.ts:295` | SIM — `..._rls_policies.sql:197-199` | Escrita, não executada — `tests/rls/community-media.rls.spec.ts:117,123` | PROTEGIDO NÃO TESTADO |
| Ler fila de moderação (PII: email do submissor) | `community_media_submissions` | SELECT | SIM — dashboard `requireEditor` | SIM — `"community_media: leitura editor"` em `..._rls_policies.sql:188-190` | Escrita, não executada — `tests/rls/community-media.rls.spec.ts:65,71,77` | PROTEGIDO NÃO TESTADO |
| Listar todos os utilizadores | `profiles` | SELECT | SIM — `isAdmin()` em `services/auth.service.ts:267`; botão só para admin em `pages/dashboard/DashboardPage.tsx:244` | SIM — `"profiles: leitura" USING (auth.uid()=user_id OR is_admin())` em `..._rls_policies.sql:54-59` | Escrita, não executada — `tests/rls/profiles.rls.spec.ts:39,45,51` | PROTEGIDO NÃO TESTADO |
| Alterar role de utilizador (escalada de privilégio) | `profiles` | UPDATE | SIM — `isAdmin()` em `services/auth.service.ts:360`; UI `pages/dashboard/UserManagerModal.tsx:210` | PARCIAL — `"profiles: atualização por admin"` (`..._rls_policies.sql:84-86`) mas a policy de auto-atualização em `:71-80` tem **precedência de operadores suspeita**: `WITH CHECK (a AND b OR is_admin())` — o `AND`/`OR` sem parênteses precisa de validação em DB | Escrita, não executada — `tests/rls/profiles.rls.spec.ts:62,70` | NÃO PROVADO (ver nota C.2.1) |
| Vincular utilizador a parceiro | `profiles` | UPDATE | SIM — `isAdmin()` em `services/auth.service.ts:466` | SIM — mesma policy admin `..._rls_policies.sql:84-86` | NÃO — nenhum teste específico | NÃO PROVADO |
| Exportar CSV de utilizadores (backup) | `profiles` (client-side) | download | SIM — modal só abre para admin (`DashboardPage.tsx:244`) | N/A — dados já em memória; proteção é a do SELECT | NÃO — `UserManagerModal.tsx:136-145` a 0% de cobertura | SÓ UI |
| Upload de ficheiro para storage (editor) | bucket `media` | storage INSERT | NÃO — `services/media.service.ts:14-23` (`saveMediaBlob`) e `:44` (`saveCommunityMediaBlob`) **não têm `isEditor()`** | PARCIAL — `"media: upload autenticados e tipos válidos"` exige apenas `auth.role()='authenticated'` (`..._rls_policies.sql:339-350`; idem `20260425000003_storage_sync_prod.sql:40-50`) → **qualquer `membro` autenticado pode escrever no bucket** | NÃO — nenhuma spec de `storage.objects` | SÓ UI (P1) |
| Upload anónimo para `community/` | bucket `media` | storage INSERT | Parcialmente (formulário público, por design) | **NÃO EFETIVO** — `"media: upload comunidade anónimo"` em `supabase/migrations/20260425000003_storage_sync_prod.sql:52-58` faz `WITH CHECK (bucket_id='media' AND name LIKE 'community/%')` **sem restrição de extensão nem de autenticação**; como policies permissivas são OR'd, esta anula a whitelist de extensões | NÃO — nenhuma spec de storage | SÓ UI (P1 — ver C.2.2) |
| Remover ficheiro do storage | bucket `media` | storage DELETE | **NÃO** — `services/media.service.ts:56-66` (`deleteMediaBlob`) não verifica `isEditor()` e não valida o bucket no path | SIM — `"media: exclusão editor(es)"` em `20260425000003_storage_sync_prod.sql:91-104` e `..._rls_policies.sql:358-360` | NÃO — nenhuma spec de storage; `media.service` a 62.5% de branches | PROTEGIDO NÃO TESTADO (depende só de RLS) |
| Ler leads de estatutos (PII) | `estatutos_leads` | SELECT | SIM — `isEditor()` em `services/estatutos-leads.service.ts:49` | SIM, fora de `supabase/migrations/` — `migrations/20260519_estatutos_leads.sql:56-58` | **NÃO — nenhuma spec; serviço a 11.9% / 0% de branches** | NÃO PROVADO |
| Apagar lead de estatutos | `estatutos_leads` | DELETE | SIM — `services/estatutos-leads.service.ts:62` | SIM — `migrations/20260519_estatutos_leads.sql:62-64` | NÃO | NÃO PROVADO |
| Ler activity log | `activity_logs` | SELECT | SIM — dashboard `requireEditor` | **DIVERGÊNCIA** — `supabase/migrations/20260425000000_activity_logs.sql:19-21` permite `auth.role()='authenticated'` (**qualquer membro lê o log de auditoria**), enquanto `migrations/20260425_activity_logs.sql:19-21` exige `is_editor()` | Escrita, não executada — `tests/rls/activity-logs.rls.spec.ts:43,49,54` (o teste **assume e legitima** a versão fraca: "viewer CAN SELECT") | SÓ UI (P1 — ver C.2.3) |
| Escrever no activity log | `activity_logs` | INSERT | NÃO — `services/activity-log.service.ts:26-36` sem guarda | **DIVERGÊNCIA** — versão em `supabase/migrations/...:24-26` permite insert de qualquer autenticado sem `user_id`; versão em `migrations/...:24-26` exige `user_id = auth.uid()` → na versão "prod" **qualquer membro pode forjar entradas de auditoria** | Escrita, não executada — `tests/rls/activity-logs.rls.spec.ts:60,67,74` | SÓ UI (P2 — integridade da auditoria) |

## C.2 Achados de permissões que merecem ticket próprio

**C.2.1 — Precedência SQL na policy de auto-atualização de perfil.** `supabase/migrations/20260101000001_rls_policies.sql:71-80`:
```sql
WITH CHECK (
  auth.uid() = user_id
  AND (role = (SELECT role FROM public.profiles WHERE user_id = auth.uid()))
  OR public.is_admin()
);
```
Em SQL, `AND` liga mais forte que `OR`, pelo que a expressão é `(A AND B) OR is_admin()` — o que é o comportamento pretendido *para esta policy isolada*. O risco real é outro: existem **duas** policies UPDATE permissivas sobre `profiles` (`:71` e `:84`), e policies permissivas são OR'd — a avaliação combinada precisa de ser provada em DB. `tests/rls/profiles.rls.spec.ts:62` ("viewer CANNOT change own role") existe exatamente para isto e **nunca correu**. Prioridade: executar esta spec é o teste de maior valor de todo o repositório.

**C.2.2 — Upload anónimo sem restrição de tipo (P1).** `20260425000003_storage_sync_prod.sql:52-58` permite a qualquer anónimo escrever `community/<qualquer-nome>.<qualquer-extensão>` no bucket `media`, que é de **leitura pública** (`:35-38`). A whitelist de extensões da policy vizinha (`:40-50`) não protege nada porque as policies são OR'd. Consequência: hospedagem arbitrária de ficheiros no domínio do storage da Fundação (HTML/SVG com script → XSS na origem do storage, distribuição de conteúdo ilícito, enchimento de quota). O comentário do próprio ficheiro (`:74-78`) reconhece a duplicação de policies mas apenas para UPDATE/DELETE.

**C.2.3 — Duas árvores de migrações divergentes.** `migrations/` e `supabase/migrations/` contêm versões **diferentes** das policies de `activity_logs` (uma exige `is_editor()`, a outra aceita qualquer autenticado). Além disso, `council_members`, `institutional_documents` e `estatutos_leads` existem **apenas** em `migrations/` — não estão na árvore `supabase/migrations/` que o Supabase CLI aplica. Não é possível determinar, a partir do repositório, qual o estado real de produção. Isto sozinho invalida qualquer afirmação de "protegido" sobre essas três tabelas.

**C.2.4 — Guardas de escrita ausentes no cliente de storage.** `saveMediaBlob`, `saveCommunityMediaBlob` e `deleteMediaBlob` (`services/media.service.ts:14,44,56`) são as únicas mutações do sistema sem `isEditor()`. Para o delete, o RLS cobre; para o upload, o RLS **também** só exige `authenticated` — pelo que um membro comum autenticado pode encher o bucket. Recomenda-se endurecer a policy de INSERT para `is_editor() OR (name LIKE 'community/%' AND extensão em whitelist)`.

## C.3 Resumo quantitativo da matriz

| RESULTADO | Nº de ações |
|---|---|
| PROTEGIDO (UI+RLS+teste executado) | **0** — impossível nesta sessão, por construção |
| PROTEGIDO NÃO TESTADO | 15 |
| SÓ UI (P0/P1) | 5 |
| NÃO PROVADO | 10 |

**30 ações administrativas/sensíveis mapeadas; zero com prova de execução.**
