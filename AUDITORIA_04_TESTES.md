# AUDITORIA 04 — EXECUÇÃO REAL DE TESTES

Projeto: `fundacaolusobrasileira` (React 19 + Vite 6 + Vitest 4 + Playwright 1.59)
Data de execução: 2026-09-07
Ambiente: sandbox Linux, Node v22.23.2, npm 10.9.8

## 0. Preparação do ambiente (o que foi feito e por quê)

1. Criado `.env` local a partir do arquivo `env` já presente na raiz do repositório
   (contém `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`). Nenhum código-fonte
   ou teste foi alterado.
2. **O `node_modules` que veio montado estava CORROMPIDO / INCOMPLETO.** Evidências:
   - 185 diretórios em `node_modules` contra **258 pacotes** instalados por `npm ci`.
   - `node_modules/.bin` continha apenas shims `.cmd`/`.ps1` (Windows), sem os
     executáveis POSIX (`vitest`, `vite`, `playwright`, `tsx` ausentes).
   - Arquivos de tipos de topo faltando: `node_modules/vite/client.d.ts` e
     `node_modules/vitest/globals.d.ts` **não existiam**, o que fazia o `tsc`
     abortar com 2 erros falsos (`TS2688: Cannot find type definition file for
     'vite/client' / 'vitest/globals'`).
   - `npm ls --depth=0` reportava `invalid: react-dom@`, `invalid: zod@`,
     `extraneous: playwright-core@`, `extraneous: undici@`, etc.
3. `npm ci` **no diretório montado falhou** com `EPERM: operation not permitted,
   unlink '.../node_modules/.package-lock.json'` (o mount Windows não permite
   unlink). Por isso o projeto foi copiado (sem `node_modules`, `.git`, `dist`)
   para um diretório local Linux e lá `npm ci` rodou limpo:
   `added 258 packages in 6s`. Todos os comandos abaixo rodaram nessa cópia
   íntegra — ou seja, os resultados refletem o `package-lock.json` real do repo.
   `package.json` NÃO foi tocado.

---

## 1. `npx tsc --noEmit` — TYPECHECK: **FALHOU**

**Resultado: 29 erros de tipo em 13 arquivos. Exit code 2.**

### 1.1 `strict` NÃO está habilitado

O `tsconfig.json` **não contém `"strict"`**, nem `strictNullChecks`, `noImplicitAny`,
`noUnusedLocals` ou `noUnusedParameters`. Ou seja: os 29 erros abaixo aparecem
mesmo no modo NÃO-estrito — com `strict: true` o número seria substancialmente maior.
Também há `skipLibCheck: true` e `allowJs: true`.

### 1.2 Distribuição por código de erro

```
      9 error TS2339
      6 error TS2304
      3 error TS2348
      3 error TS2345
      3 error TS2322
      2 error TS2554
      1 error TS2769
      1 error TS2561
      1 error TS2307
```

### 1.3 Saída bruta completa

```
components/ui/ErrorBoundary.tsx(16,10): error TS2339: Property 'state' does not exist on type 'ErrorBoundary'.
components/ui/ErrorBoundary.tsx(28,14): error TS2339: Property 'state' does not exist on type 'ErrorBoundary'.
components/ui/ErrorBoundary.tsx(29,16): error TS2339: Property 'props' does not exist on type 'ErrorBoundary'.
components/ui/ErrorBoundary.tsx(29,44): error TS2339: Property 'props' does not exist on type 'ErrorBoundary'.
components/ui/ErrorBoundary.tsx(44,17): error TS2339: Property 'props' does not exist on type 'ErrorBoundary'.
data/events.data.ts(31,5): error TS2561: Object literal may only specify known properties, but 'sponsors' does not exist in type 'Partial<Event>'. Did you mean to write 'sponsorIds'?
pages/dashboard/UserManagerModal.tsx(172,37): error TS2339: Property 'error' does not exist on type 'ProfilesResultWithCapabilities'.
  Property 'error' does not exist on type 'ProfilesSuccessResult'.
pages/documentacao/DocumentacaoPage.tsx(374,61): error TS2304: Cannot find name 'tick'.
pages/documentacao/DocumentacaoPage.tsx(409,35): error TS2304: Cannot find name 'handleDirectDownload'.
pages/legal/LegalPage.tsx(178,30): error TS2322: Type '{ delay: number; locale: string; sections: LegalSectionItem[]; key: string; }' is not assignable to type 'LegalLocaleBlock & { delay?: number; }'.
  Property 'key' does not exist on type 'LegalLocaleBlock & { delay?: number; }'.
pages/legal/LegalPage.tsx(193,30): error TS2322: Type '{ delay: number; locale: string; sections: LegalSectionItem[]; key: string; }' is not assignable to type 'LegalLocaleBlock & { delay?: number; }'.
  Property 'key' does not exist on type 'LegalLocaleBlock & { delay?: number; }'.
pages/membro/PartnerGalleryEditor.tsx(26,41): error TS2345: Argument of type 'unknown' is not assignable to parameter of type 'File'.
  Type '{}' is missing the following properties from type 'File': lastModified, name, webkitRelativePath, size, and 6 more.
pages/membro/PartnerGalleryEditor.tsx(28,15): error TS2554: Expected 1 arguments, but got 0.
pages/membro/PartnerGalleryEditor.tsx(60,11): error TS2554: Expected 1 arguments, but got 0.
pages/parceiros/ParceirosPage.tsx(46,20): error TS2339: Property 'active' does not exist on type 'Partner | PartnerSeed'.
  Property 'active' does not exist on type 'PartnerSeed'.
router.tsx(17,54): error TS2339: Property 'props' does not exist on type 'ChunkErrorBoundary'.
services/auth.service.test.ts(26,18): error TS2348: Value of type 'Mock<any>' is not callable. Did you mean to include 'new'?
services/auth.service.test.ts(408,24): error TS2345: Argument of type 'string' is not assignable to parameter of type 'boolean'.
services/auth.service.test.ts(434,24): error TS2345: Argument of type 'string' is not assignable to parameter of type 'boolean'.
services/auth.service.ts(286,5): error TS2322: Type '{ id: any; user_id: any; name: any; email: any; role: any; type: any; created_at: any; }[]' is not assignable to type '{ id: any; user_id: any; name: any; email: any; role: any; type: any; phone: any; created_at: any; }[]'.
  Property 'phone' is missing in type '{ id: any; user_id: any; name: any; email: any; role: any; type: any; created_at: any; }' but required in type '{ id: any; user_id: any; name: any; email: any; role: any; type: any; phone: any; created_at: any; }'.
services/precadastros.service.test.ts(50,37): error TS2348: Value of type 'MockInstance<any> & (new (...args: unknown[]) => any) & { [x: string]: any; }' is not callable. Did you mean to include 'new'?
services/precadastros.service.test.ts(51,37): error TS2348: Value of type 'MockInstance<any> & (new (...args: unknown[]) => any) & { [x: string]: any; }' is not callable. Did you mean to include 'new'?
supabase/functions/admin-create-user/index.ts(1,30): error TS2307: Cannot find module 'npm:@supabase/supabase-js@2.87.3' or its corresponding type declarations.
supabase/functions/admin-create-user/index.ts(20,1): error TS2304: Cannot find name 'Deno'.
supabase/functions/admin-create-user/index.ts(29,23): error TS2304: Cannot find name 'Deno'.
supabase/functions/admin-create-user/index.ts(30,27): error TS2304: Cannot find name 'Deno'.
supabase/functions/admin-create-user/index.ts(31,34): error TS2304: Cannot find name 'Deno'.
tests/rls/seed.ts(49,51): error TS2339: Property 'email' does not exist on type 'never'.
vite.config.ts(5,29): error TS2769: No overload matches this call.
  The last overload gave the following error.
    Argument of type '() => { server: { port: number; host: string; }; plugins: Plugin<any>[][]; css: { postcss: string; }; resolve: { alias: { '@': string; }; }; build: { rollupOptions: { output: { manualChunks: { 'vendor-react': string[]; 'vendor-supabase': string[]; }; }; }; }; test: { ...; }; }' is not assignable to parameter of type 'UserConfigExport'.
      Type '() => { server: { port: number; host: string; }; plugins: Plugin<any>[][]; css: { postcss: string; }; resolve: { alias: { '@': string; }; }; build: { rollupOptions: { output: { manualChunks: { 'vendor-react': string[]; 'vendor-supabase': string[]; }; }; }; }; test: { ...; }; }' is not assignable to type 'UserConfigFnObject'.
        Call signature return types '{ server: { port: number; host: string; }; plugins: Plugin<any>[][]; css: { postcss: string; }; resolve: { alias: { '@': string; }; }; build: { rollupOptions: { output: { manualChunks: { 'vendor-react': string[]; 'vendor-supabase': string[]; }; }; }; }; test: { ...; }; }' and 'UserConfig' are incompatible.
          The types of 'test.coverage.provider' are incompatible between these types.
            Type 'string' is not assignable to type '"v8" | "istanbul" | "custom"'.
```

### 1.4 Agrupamento por arquivo / natureza

| Arquivo | Nº | Natureza |
|---|---|---|
| `components/ui/ErrorBoundary.tsx` | 5 | `this.state` / `this.props` não existem — classe React sem tipagem de `Component<P,S>` |
| `router.tsx` | 1 | idem, `ChunkErrorBoundary.props` |
| `supabase/functions/admin-create-user/index.ts` | 5 | Edge Function Deno compilada pelo tsconfig do front: `Cannot find name 'Deno'`, `Cannot find module 'npm:@supabase/supabase-js@2.87.3'`. **A pasta `supabase/functions` não está excluída do tsconfig** |
| `pages/documentacao/DocumentacaoPage.tsx` | 2 | `Cannot find name 'tick'` e `Cannot find name 'handleDirectDownload'` — **referências a identificadores inexistentes: bug real em runtime, não ruído de tipos** |
| `pages/membro/PartnerGalleryEditor.tsx` | 3 | `unknown` passado onde se espera `File`; 2× `Expected 1 arguments, but got 0` |
| `pages/legal/LegalPage.tsx` | 2 | `key` sendo passado dentro de objeto de props tipado |
| `pages/dashboard/UserManagerModal.tsx` | 1 | acesso a `.error` em union onde o membro de sucesso não tem `error` |
| `pages/parceiros/ParceirosPage.tsx` | 1 | `.active` não existe em `PartnerSeed` |
| `services/auth.service.ts` | 1 | retorno sem a propriedade obrigatória `phone` |
| `data/events.data.ts` | 1 | `sponsors` não existe em `Partial<Event>` (era `sponsorIds`) — **dado de seed silenciosamente ignorado** |
| `tests/rls/seed.ts` | 1 | `.email` em tipo `never` |
| `vite.config.ts` | 1 | `test.coverage.provider` inferido como `string`; config não é `defineConfig` de `vitest/config` |
| `services/auth.service.test.ts` | 3 | tipos de mocks Vitest 4 |
| `services/precadastros.service.test.ts` | 2 | tipos de mocks Vitest 4 |

> Consequência de CI: o workflow `.github/workflows/test.yml` executa
> `npx tsc --noEmit` como step obrigatório do job `unit-integration`.
> **Com esses 29 erros o pipeline está vermelho (ou nunca foi executado no estado atual).**

---

## 2. `npm test -- --run` (Vitest) — **FALHOU**

| Métrica | Valor |
|---|---|
| Arquivos de teste | 20 (19 passaram, **1 falhou**) |
| Testes totais | **361** |
| Passaram | **354** |
| Falharam | **7** |
| Pulados | **0** |
| Duração | 15,30 s |
| Exit code | **1** |

A suíte **roda sem problemas de env** (o `.env` criado foi suficiente; os testes
mockam o Supabase). As 7 falhas são reais, de código, todas no mesmo arquivo.

### 2.1 Testes que falharam

Todos em `component.ui.test.tsx`:

1. `MemberEditorModal - handleSave > resets loading to false when createMember throws an exception`
2. `MemberEditorModal - handleSave > resets loading to false when createMember returns null (Supabase error)`
3. `MemberEditorModal - handleSave > closes modal after successful member creation`
4. `MemberEditorModal — field completeness > renders a field for summary (resumo curto)`
5. `MemberEditorModal — field completeness > renders a field for full biography`
6. `MemberEditorModal — field completeness > renders a field for country (país)`
7. `MemberEditorModal — field completeness > renders a field for institutional tier`

### 2.2 Causa-raiz única (mensagem real)

```
Error: [vitest] No "isAdmin" export is defined on the "./store/app.store" mock.
Did you forget to return it from "vi.mock"?
If you need to partially mock a module, you can use "importOriginal" helper inside:

vi.mock(import("./store/app.store"), async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    // your mocked methods
  }
})

 ❯ MemberEditorModal component.ui.tsx:1365:34
 ❯ Object.react_stack_bottom_frame node_modules/react-dom/cjs/react-dom-client.development.js:25904:20
 ❯ renderWithHooks node_modules/react-dom/cjs/react-dom-client.development.js:7662:22
```

Interpretação: `component.ui.tsx` (MemberEditorModal, linha 1365) passou a consumir
`isAdmin` de `./store/app.store`, mas o `vi.mock` em `component.ui.test.tsx` não
expõe esse export. O componente **quebra na renderização** dentro do teste.
Os 4 testes de "field completeness" (summary, biography, country, institutional tier)
estão bloqueados por esse mesmo erro — logo **não é possível afirmar que esses
campos existam ou não**; eles simplesmente nunca chegaram a ser verificados.

### 2.3 Suítes que passaram (19 arquivos)

`services/auth.service.test.ts` (36), `services/precadastros.service.test.ts` (42),
`services/members.service.test.ts` (43), `services/media.service.test.ts` (24),
`services/precadastro-bug-hunt.test.ts` (26), `services/community-media.service.test.ts` (16),
`services/benefits.service.test.ts` (14), `services/activity-log.service.test.ts` (8),
`tests/contract/validation-layers.test.ts` (27), `tests/contract/normalize-roundtrip.test.ts` (4),
`utils/url.test.ts` (22), `utils/uuid.test.ts` (2), `store/app.store.test.ts` (10),
`hooks/useAuthSession.test.ts` (4), `components/domain/Header.test.tsx` (3),
`components/domain/SmartInviteModal.test.tsx` (2), `tests/documentacao-page.test.tsx` (2),
`tests/modals.test.tsx` (1), e a parte não-quebrada de `component.ui.test.tsx`.

---

## 3. `npm run test:coverage` — **FALHOU (e não gerou relatório)**

### 3.1 Achado crítico: com a suíte vermelha, NENHUM relatório de cobertura é produzido

`npm run test:coverage` terminou com **exit code 1** e imprimiu apenas
`Coverage enabled with v8`. Não houve tabela de cobertura, e o diretório
`coverage/` **não foi criado**. Ou seja, no estado atual do repositório é
impossível obter cobertura pelo script oficial.

### 3.2 Medição real obtida (execução auxiliar)

Para produzir números reais, a cobertura foi medida excluindo pela CLI apenas o
arquivo que quebra (`component.ui.test.tsx`) — **sem editar nenhum arquivo**:

```
npx vitest run --coverage --exclude '**/node_modules/**' --exclude 'tests/rls/**' \
  --exclude 'tests/e2e/**' --exclude 'component.ui.test.tsx'
```

Resultado: 19 arquivos / 340 testes, todos passando, **exit code 0**.

```
 % Coverage report from v8
-------------------|---------|----------|---------|---------|-------------------
File               | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s 
-------------------|---------|----------|---------|---------|-------------------
All files          |   68.95 |    59.18 |   65.97 |   74.32 |                   
 services          |   68.06 |    57.88 |   64.92 |    73.6 |                   
  ...og.service.ts |     100 |      100 |     100 |     100 |                   
  auth.service.ts  |   74.05 |    65.35 |   82.14 |    78.8 | ...55-457,471-476 
  ...ts.service.ts |   52.17 |    41.66 |      40 |   70.58 | 7-13,17-23,60-65  
  ...ia.service.ts |     100 |      100 |     100 |     100 |                   
  ...ls.service.ts |       0 |        0 |       0 |       0 | 9-133             
  ...ts.service.ts |    10.3 |     2.94 |   14.28 |   15.38 | ...09-131,135-153 
  ...ds.service.ts |    11.9 |        0 |       0 |   13.51 | ...44,49-57,62-83 
  ...ts.service.ts |   93.84 |     80.5 |   95.65 |   95.15 | ...69-270,281-282 
  media.service.ts |   83.33 |     62.5 |   83.33 |   84.21 | 40,49-53          
  ...rs.service.ts |   91.72 |    83.33 |     100 |   98.05 | 64-65             
  ...os.service.ts |   97.54 |    88.57 |     100 |   97.34 | 221-223           
  ...ch.service.ts |       0 |        0 |       0 |       0 | 5-17              
 utils             |   81.81 |    78.94 |   83.33 |   83.78 |                   
  url.ts           |   80.48 |    77.77 |      80 |   82.35 | 4-9,64            
  uuid.ts          |     100 |      100 |     100 |     100 |                   
 validation        |   93.33 |      100 |      75 |   93.33 |                   
  schemas.ts       |   93.33 |      100 |      75 |   93.33 | 26                
-------------------|---------|----------|---------|---------|-------------------
```

### 3.3 Thresholds: **NÃO PASSAM — e, pior, NÃO SÃO APLICADOS**

Thresholds declarados em `vite.config.ts`:

```ts
thresholds: {
  'services/':   { statements: 80, branches: 75 },
  'validation/': { statements: 100 },
  'utils/':      { statements: 100 },
}
```

Confronto com o medido:

| Alvo | Threshold | Real | Veredito |
|---|---|---|---|
| `services/` statements | 80 % | **68,06 %** | ❌ FALHA (−11,94 pp) |
| `services/` branches | 75 % | **57,88 %** | ❌ FALHA (−17,12 pp) |
| `validation/` statements | 100 % | **93,33 %** | ❌ FALHA |
| `utils/` statements | 100 % | **81,81 %** | ❌ FALHA |

**Porém a execução com `--coverage` terminou com exit code 0.** Isso prova que as
chaves de glob `'services/'`, `'validation/'`, `'utils/'` **não casam com nenhum
arquivo** no matcher de thresholds do Vitest (que espera globs no formato
`'**/services/**'`). Os thresholds são **configuração morta**: existem no arquivo,
dão aparência de rigor, e não bloqueiam nada.

### 3.4 Serviços com cobertura zero ou quase zero

| Arquivo | % Stmts | Observação |
|---|---|---|
| `services/…ls.service.ts` (`materials`/`legaltech`) | **0 %** | linhas 9–133 sem nenhum teste |
| `services/…ch.service.ts` (`search`) | **0 %** | linhas 5–17 |
| `services/…ts.service.ts` (`events`) | **10,30 %** | branches 2,94 % |
| `services/…ds.service.ts` (`records`/`downloads`) | **11,90 %** | branches 0 % |
| `services/…ts.service.ts` (`documents`) | 52,17 % | |
| `services/auth.service.ts` | 74,05 % | branches 65,35 % |

Bem cobertos: `activity-log.service.ts` (100 %), `community-media.service.ts` (100 %),
`precadastros.service.ts` (97,54 %), `members.service.ts` (91,72 %),
`…ts.service.ts` (93,84 %), `media.service.ts` (83,33 %), `utils/uuid.ts` (100 %).

---

## 4. `npm run build` — **SUCESSO**

| Item | Valor |
|---|---|
| Exit code | **0** |
| Tempo (vite) | **3,86 s** (`real 0m4,181s` no total do npm) |
| Módulos transformados | 1 899 |
| Erros | nenhum |

### 4.1 Warnings relevantes

```
Browserslist: browsers data (caniuse-lite) is 6 months old. Please run:
  npx update-browserslist-db@latest

[plugin vite:reporter]
(!) services/activity-log.service.ts is dynamically imported by store/app.store.ts
    but also statically imported by App.tsx, dynamic import will not move module
    into another chunk.
```

Não houve warning de "chunks larger than 500 kB" — o maior chunk (326 kB) fica abaixo
do limite padrão do Vite.

### 4.2 Chunks gerados (ordem decrescente de tamanho)

```
dist/assets/index-61RyPfFJ.js                 326.48 kB │ gzip: 99.04 kB
dist/assets/vendor-supabase-vtL5VWMt.js       171.12 kB │ gzip: 44.20 kB
dist/assets/index-BNdwugiC.css                 80.88 kB │ gzip: 13.02 kB
dist/assets/component.ui-CdksgqkW.js           79.77 kB │ gzip: 18.16 kB
dist/assets/DashboardPage-DIgpGuDw.js          51.69 kB │ gzip: 12.26 kB
dist/assets/vendor-react-q5f1n1Zq.js           45.89 kB │ gzip: 16.41 kB
dist/assets/HomePage-CJjVlE_P.js               25.89 kB │ gzip:  7.43 kB
dist/assets/MembroPerfilPage-Bsaprbuf.js       25.66 kB │ gzip:  6.81 kB
dist/assets/LegalPage-CFMpniIJ.js              16.39 kB │ gzip:  4.34 kB
dist/assets/EventoColaborarPage-Dyd7Jizj.js    15.67 kB │ gzip:  5.04 kB
dist/assets/LegaltechSpacePage-BRMqMW-I.js     13.67 kB │ gzip:  4.07 kB
dist/assets/partners.data-K3I3YbkN.js          11.68 kB │ gzip:  3.03 kB
dist/assets/DocumentacaoPage-BJli-3zn.js       10.61 kB │ gzip:  3.95 kB
dist/assets/EventoDetalhePage-Du4d2h5f.js       9.94 kB │ gzip:  3.77 kB
dist/assets/EventosPage-PkFVjpON.js             9.74 kB │ gzip:  3.66 kB
dist/assets/DashboardMediaPage-B-NjvrUN.js      9.40 kB │ gzip:  2.92 kB
dist/assets/BenefitEditorSection-BEG7pUdA.js    8.73 kB │ gzip:  2.44 kB
dist/assets/PreCadastroPage-CNB8WAN7.js         8.46 kB │ gzip:  3.02 kB
dist/assets/LoginPage-f_PAYrIg.js               8.24 kB │ gzip:  2.86 kB
dist/assets/ParceirosPage-DyEl3hxR.js           7.55 kB │ gzip:  2.71 kB
dist/assets/component.domain-BMIGG4qd.js        7.30 kB │ gzip:  2.44 kB
dist/assets/ResetPasswordPage-BK4ultvb.js       7.30 kB │ gzip:  2.58 kB
dist/assets/AdminPage-CiBQWk8N.js               6.65 kB │ gzip:  2.34 kB
dist/assets/Modals-CkmbRSoj.js                  6.29 kB │ gzip:  2.35 kB
dist/assets/QuemSomosPage-CM8HeOb_.js           6.26 kB │ gzip:  2.10 kB
dist/assets/content.data-CNgPer3n.js            6.04 kB │ gzip:  2.42 kB
dist/assets/ParceiroPerfilPage-BO7HKBDq.js      5.03 kB │ gzip:  2.13 kB
dist/assets/CadastroPage-xifFR030.js            4.96 kB │ gzip:  1.85 kB
dist/assets/EventCard-D2Blpq4_.js               4.95 kB │ gzip:  1.46 kB
dist/assets/BeneficiosPage-Cqm8dkFa.js          4.62 kB │ gzip:  1.85 kB
dist/index.html                                 3.54 kB │ gzip:  1.14 kB
dist/assets/MemberCard-BYqgfEy1.js              2.65 kB │ gzip:  1.18 kB
dist/assets/index-DhKnnABA.js                   2.55 kB │ gzip:  1.32 kB
dist/assets/ExpandableText-NsICli8Q.js          2.06 kB │ gzip:  1.03 kB
dist/assets/benefits.service-C9Nq5_BF.js        1.94 kB │ gzip:  0.85 kB
dist/assets/PartnerCard-DiGA6_1b.js             1.73 kB │ gzip:  0.82 kB
dist/assets/Button-_7pCV9Rw.js                  1.60 kB │ gzip:  0.78 kB
dist/assets/media.service-CypeyxIb.js           1.21 kB │ gzip:  0.63 kB
dist/assets/upload-B3JrlL3X.js                  1.13 kB │ gzip:  0.44 kB
dist/assets/star-LgMx0ajD.js                    1.04 kB │ gzip:  0.52 kB
dist/assets/link-Dq0FS4rQ.js                    0.82 kB │ gzip:  0.42 kB
dist/assets/palette-Bxyw9yny.js                 0.68 kB │ gzip:  0.38 kB
dist/assets/Reveal-Dt3oCffS.js                  0.66 kB │ gzip:  0.42 kB
dist/assets/landmark-B59jgRB1.js                0.57 kB │ gzip:  0.37 kB
dist/assets/file-text-DC5lqrMM.js               0.56 kB │ gzip:  0.35 kB
dist/assets/Forms-DcjmY7oW.js                   0.52 kB │ gzip:  0.31 kB
dist/assets/users-C6qIpQhR.js                   0.48 kB │ gzip:  0.33 kB
dist/assets/user-plus-DFvRHjP7.js               0.48 kB │ gzip:  0.34 kB
dist/assets/Badge-BXTpb84E.js                   0.48 kB │ gzip:  0.33 kB
dist/assets/folder-open-DX4__czF.js             0.47 kB │ gzip:  0.32 kB
dist/assets/Layout-SZip8F12.js                  0.44 kB │ gzip:  0.30 kB
dist/assets/map-pin-BaH1Rlge.js                 0.43 kB │ gzip:  0.33 kB
dist/assets/heart-e_VzubNJ.js                   0.43 kB │ gzip:  0.32 kB
dist/assets/calendar-D9JSRbpX.js                0.43 kB │ gzip:  0.31 kB
dist/assets/video-BLwm-f0u.js                   0.42 kB │ gzip:  0.32 kB
dist/assets/link-2-tBaB0bnP.js                  0.42 kB │ gzip:  0.31 kB
dist/assets/external-link-CEQWxL0G.js           0.42 kB │ gzip:  0.30 kB
dist/assets/pen-BMuDetmR.js                     0.41 kB │ gzip:  0.31 kB
dist/assets/globe-Dka_9g0Z.js                   0.41 kB │ gzip:  0.30 kB
dist/assets/download-EM1HBlsE.js                0.41 kB │ gzip:  0.30 kB
dist/assets/mail-YrEv7WeL.js                    0.39 kB │ gzip:  0.31 kB
dist/assets/lock-Dmgm7Pzu.js                    0.37 kB │ gzip:  0.29 kB
dist/assets/user-CMXpQgMN.js                    0.36 kB │ gzip:  0.29 kB
dist/assets/trending-up-BfLvEkLd.js             0.35 kB │ gzip:  0.27 kB
dist/assets/circle-check-CvPbfY7Y.js            0.35 kB │ gzip:  0.27 kB
dist/assets/search-C7dthru7.js                  0.34 kB │ gzip:  0.27 kB
dist/assets/arrow-up-right-BaWCIyMS.js          0.34 kB │ gzip:  0.27 kB
dist/assets/arrow-left--lskOskP.js              0.34 kB │ gzip:  0.27 kB
dist/assets/loader-circle-DANmUTqM.js           0.31 kB │ gzip:  0.26 kB
dist/assets/chevron-up-CkW5Dj7O.js              0.30 kB │ gzip:  0.25 kB
dist/assets/chevron-down-RHvYXkh4.js            0.30 kB │ gzip:  0.25 kB
dist/assets/usePageMeta-BFWI6hyF.js             0.24 kB │ gzip:  0.21 kB
dist/assets/useDebounce-DANXvoTw.js             0.20 kB │ gzip:  0.17 kB
```

Totais: JS+CSS+HTML gerados somam aproximadamente **870 kB** (cerca de 250 kB gzip).
O diretorio `dist/` inteiro pesa **28 MB** — quase tudo e `public/` copiado
(logos/imagens em `LOGOSFUNDACAO` e assets estaticos), nao codigo.

Maiores ofensores de bundle:

| Chunk | Tamanho | Gzip |
|---|---|---|
| `index-61RyPfFJ.js` (entry) | 326,48 kB | 99,04 kB |
| `vendor-supabase-vtL5VWMt.js` | 171,12 kB | 44,20 kB |
| `index-BNdwugiC.css` | 80,88 kB | 13,02 kB |
| `component.ui-CdksgqkW.js` | 79,77 kB | 18,16 kB |
| `DashboardPage-DIgpGuDw.js` | 51,69 kB | 12,26 kB |
| `vendor-react-q5f1n1Zq.js` | 45,89 kB | 16,41 kB |

Observacao: o `manualChunks` de `vite.config.ts` separa `vendor-react` (45,89 kB) e
`vendor-supabase` (171,12 kB), mas o chunk de entrada `index` continua com 326 kB —
maior que ambos os vendors. Code-splitting por rota esta funcionando (~60 chunks
lazy carregados sob demanda), mas o entry ainda concentra bastante coisa.

---

## 5. `npm run test:rls` — **NÃO PÔDE SER EXECUTADO / RLS NÃO PROVADA**

### 5.1 O comando NÃO deu erro — ele passou "verde" pulando tudo

Exit code: **0**. Saída real:

```
> vitest run --config vitest.rls.config.ts

◇ injected env (0) from .env.test // tip: ⌘ custom filepath { path: '/custom/path/.env' }

 RUN  v4.1.2

 ↓ tests/rls/community-media.rls.spec.ts (10 tests | 10 skipped)
 ↓ tests/rls/events.rls.spec.ts          (12 tests | 12 skipped)
 ↓ tests/rls/benefits.rls.spec.ts        ( 9 tests |  9 skipped)
 ↓ tests/rls/constraints.spec.ts         ( 6 tests |  6 skipped)
 ↓ tests/rls/precadastros.rls.spec.ts    ( 9 tests |  9 skipped)
 ↓ tests/rls/activity-logs.rls.spec.ts   ( 8 tests |  8 skipped)
 ↓ tests/rls/partners.rls.spec.ts        ( 9 tests |  9 skipped)
 ↓ tests/rls/profiles.rls.spec.ts        ( 5 tests |  5 skipped)
 ↓ tests/rls/triggers.spec.ts            ( 5 tests |  5 skipped)

 Test Files  9 skipped (9)
      Tests  73 skipped (73)
   Duration  1.21s
```

Note o `injected env (0) from .env.test`: **zero variáveis injetadas** — o arquivo
`.env.test` não existe (só existe `.env.test.example`, com placeholders
`<test-projeto>` / `<anon-key-do-projeto-de-teste>`).

### 5.2 Mecanismo do skip silencioso

`tests/rls/client.ts`:

```ts
export const hasTestDB = !!TEST_URL && !!TEST_ANON_KEY && !!TEST_SERVICE_KEY;
```

E os 9 specs usam `describe.skipIf(!hasTestDB)(...)`. Sem `.env.test`,
`hasTestDB === false` e **todos os 73 testes são pulados, com exit code 0**.

### 5.3 Conclusão

> **RLS NÃO PROVADA.** Existem 73 testes de RLS/constraints/triggers escritos
> (profiles, events, partners, benefits, precadastros, community_media,
> activity_logs, constraints, triggers), mas **nenhum foi executado** nesta sessão,
> porque não há projeto Supabase de teste nem `.env.test`. Não é "falha" — é
> ausência total de evidência.
>
> **Risco de CI:** o job `rls` do workflow tem `if: vars.SUPABASE_TEST_URL != ''`,
> ou seja é inteiramente **pulado** quando a variável não está definida; e mesmo se
> rodasse, `npm run test:rls` retorna 0 quando os secrets estão vazios. Em ambas as
> situações o pipeline fica verde **sem nunca ter testado uma única policy de RLS**.

---

## 6. `npm run test:e2e` (Playwright) — **NÃO PÔDE SER EXECUTADO**

Existem **92 testes E2E** declarados em 20 arquivos `tests/e2e/*.spec.ts`
(auth, route-guards, event-crud, precadastro-flow, precadastro-statuses,
admin-roles, admin-public-governance, community-media, community-media-dashboard,
partner-benefits-crud, member-edit-routing, dashboard-newsletter-separation,
stale-chunk, smoke, e 6 specs de PDF). **Zero foram executados.** Dois bloqueios
independentes:

### 6.1 Bloqueio A — browsers do Playwright não instaláveis (rede bloqueada)

`npx playwright install --with-deps chromium`:

```
Installing dependencies...
Switching to root user to install dependencies...
sudo: /etc/sudo.conf is owned by uid 65534, should be 0
sudo: The "no new privileges" flag is set, which prevents sudo from running as root.
sudo: If sudo is running in a container, you may need to adjust the container
      configuration to disable the flag.
Failed to install browsers
Error: Installation process exited with code: 1
```

Sem `--with-deps`, o download do binário também é barrado (3 tentativas, todas 403):

```
Downloading Chrome for Testing 147.0.7727.15 (playwright chromium v1217) from
https://cdn.playwright.dev/builds/cft/147.0.7727.15/linux64/chrome-linux64.zip
Error: Download failed: server returned code 403
       body 'Connection blocked by network allowlist'.
Failed to install browsers
Error: Failed to download Chrome for Testing 147.0.7727.15 (playwright chromium v1217),
       caused by Error: Download failure, code=1
```

`~/.cache/ms-playwright` não existe — nenhum browser pré-instalado.

### 6.2 Bloqueio B — a suíte nem chega à fase de browser: falha na COLETA

`npm run test:e2e` (exit code 1) falha **antes** de precisar de browser, ao importar
os helpers de suporte:

```
◇ injected env (0) from .env.e2e

Error: supabaseUrl is required.

   at support/e2eCleanup.ts:6

  3 | const supabaseUrl = process.env.VITE_SUPABASE_URL!;
  4 | const serviceRoleKey = process.env.E2E_SUPABASE_SERVICE_ROLE_KEY!;
  5 |
> 6 | const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    |                     ^
    at validateSupabaseUrl (node_modules/@supabase/supabase-js/src/lib/helpers.ts:86:11)
    at SupabaseClient (node_modules/@supabase/supabase-js/src/SupabaseClient.ts:117:21)
    at createClient (node_modules/@supabase/supabase-js/src/index.ts:54:10)
    at tests/e2e/support/e2eCleanup.ts:6:21
```

O mesmo erro ocorre em `support/e2eUsers.ts`. `npx playwright test --list` retorna
`Total: 0 tests in 0 files`.

Causa: `playwright.config.ts` faz `loadEnv({ path: '.env.e2e' })`, e **`.env.e2e`
não existe no repositório — nem sequer há um `.env.e2e.example`** (existem apenas
`.env.example` e `.env.test.example`). Os helpers leem `process.env` em **escopo
de módulo**, com `!` non-null assertion, então qualquer import quebra imediatamente.

### 6.3 Achado de segurança colateral

`tests/e2e/support/e2eCleanup.ts`, `e2eUsers.ts`, `adminCreateUserBypass.ts` e
`admin-bypass-server.ts` constroem um cliente **service-role** (que bypassa RLS)
usando `process.env.VITE_SUPABASE_URL` — a **mesma variável do app de produção**.
Se alguém rodar E2E com um `.env.e2e` que não sobrescreva `VITE_SUPABASE_URL`, os
testes criam/apagam usuários, eventos e mídias **direto no projeto de produção**
(`https://lhgzyrszzbxjjvnxfwzf.supabase.co`, valor presente no arquivo `env` da raiz
do repositório). Não há nenhuma guarda impedindo isso. Recomendação: usar uma
variável dedicada (`E2E_SUPABASE_URL`) e abortar se apontar para o host de produção.

### 6.4 Conclusão

> **E2E NÃO EXECUTADO.** Motivos exatos: (A) `cdn.playwright.dev` bloqueado pelo
> allowlist de rede do sandbox (HTTP 403) e `sudo` indisponível para `--with-deps`;
> (B) independentemente da rede, a suíte falha na coleta por ausência de `.env.e2e`
> / `E2E_SUPABASE_SERVICE_ROLE_KEY` — 0 testes coletados de 92 declarados.
>
> **Risco de CI:** o job `playwright` do workflow instala os browsers, mas o step
> `npm run test:e2e` define apenas `E2E_EDITOR_EMAIL/PASSWORD` e
> `E2E_ADMIN_EMAIL/PASSWORD` — **não define `VITE_SUPABASE_URL` nem
> `E2E_SUPABASE_SERVICE_ROLE_KEY`**. Pelo código dos helpers, esse job falharia em
> CI exatamente com o mesmo `Error: supabaseUrl is required.`

---

## 7. Matriz final da verdade

| # | Comando | Veredito | Exit | Evidência-chave |
|---|---|---|---|---|
| 1 | `npx tsc --noEmit` | **FALHOU** | 2 | 29 erros em 13 arquivos; `strict` ausente do tsconfig |
| 2 | `npm test -- --run` | **FALHOU** | 1 | 361 testes: 354 passaram / 7 falharam / 0 pulados — todas as 7 por `No "isAdmin" export ... on the "./store/app.store" mock` |
| 3 | `npm run test:coverage` | **FALHOU** | 1 | Nenhum relatório gerado. Medição auxiliar: services 68,06 % (alvo 80), branches 57,88 % (alvo 75), validation 93,33 % (alvo 100), utils 81,81 % (alvo 100). **Thresholds não são aplicados — globs inválidos, exit 0 mesmo abaixo do alvo** |
| 4 | `npm run build` | **PASSOU** | 0 | 3,86 s, 1 899 módulos, maior chunk 326,48 kB (99,04 kB gzip) |
| 5 | `npm run test:rls` | **NÃO EXECUTADO** (verde falso) | 0 | 73/73 testes pulados; `injected env (0) from .env.test`. **RLS NÃO PROVADA** |
| 6 | `npm run test:e2e` | **NÃO EXECUTADO** | 1 | 0 de 92 testes coletados; `Error: supabaseUrl is required.` + browsers bloqueados (403 allowlist) |

### 7.1 Os cinco achados mais graves

1. **Typecheck quebrado (29 erros)** — inclui dois identificadores inexistentes em
   `pages/documentacao/DocumentacaoPage.tsx` (`tick` na linha 374, `handleDirectDownload`
   na linha 409), que são bugs de runtime, não ruído de tipos. O CI tem esse step
   como bloqueante do job `unit-integration`.
2. **RLS com verde falso** — `test:rls` retorna 0 pulando 73 testes quando faltam
   secrets. Um pipeline verde não diz nada sobre a segurança dos dados.
3. **Thresholds de cobertura são decorativos** — as chaves `'services/'`, `'utils/'`,
   `'validation/'` não casam nenhum arquivo no matcher do Vitest (que espera
   `'**/services/**'`); a cobertura está abaixo de todos os alvos e mesmo assim o
   comando sai com 0.
4. **E2E inexecutável no repositório como está** — sem `.env.e2e` e sem
   `.env.e2e.example`, e o job de CI não passa as env vars que os helpers exigem.
5. **Helpers E2E service-role apontam para a URL de produção** por padrão
   (`VITE_SUPABASE_URL`), sem nenhum guard-rail.

### 7.2 Testes escritos vs. testes efetivamente executados

| Camada | Escritos | Executados | Passaram |
|---|---|---|---|
| Unit / integração / contrato (Vitest) | 361 | 361 | 354 |
| RLS / constraints / triggers | 73 | **0** | 0 |
| E2E (Playwright) | 92 | **0** | 0 |
| **Total** | **526** | **361 (69 %)** | **354 (67 %)** |

Ou seja: **31 % da suíte declarada nunca chegou a rodar**, e as camadas que não
rodaram são justamente as que validariam segurança de dados (RLS) e fluxos reais
de usuário (E2E).

### 7.3 Anexo — sanidade do ambiente

- `npm ci` limpo: `added 258 packages in 6s`, exit 0.
- Nenhum arquivo de código-fonte ou de teste foi modificado.
- `package.json` não foi alterado.
- Nenhum deploy foi feito.
