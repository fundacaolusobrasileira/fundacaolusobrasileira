# AUDITORIA 09 — RED TEAM A: Chunk Error Boundary, Resiliência e Ciclo de Deploy

Projeto: `fundacaolusobrasileira` (React 19.2.3 + Vite 6 + react-router-dom 7 HashRouter, deploy Vercel)
Data: 2026-09-07. Nenhum ficheiro do projeto foi alterado.

**Execução real**: projeto copiado para `/tmp/proj` (sem `node_modules`/`.git`/`dist`/`public`), `npm ci` OK,
`npx vitest run tests/unit/chunk-error-boundary.audit.test.tsx` →
**7 passed | 3 expected fail (it.fails)**, 10 testes. Todas as hipóteses abaixo estão *provadas por execução*,
não por leitura. Ficheiro de teste: `outputs/chunk-error-boundary.audit.test.tsx`.

---

## Árvore de componentes (prova de qual boundary é o mais interno)

| Nível | Ficheiro:linha | Componente |
|---|---|---|
| 1 (mais externo) | `index.tsx:15` | `<ErrorBoundary>` (o global, com UI de fallback) |
| 2 | `index.tsx:16` → `App.tsx:123` | `<App>` |
| 3 | `App.tsx:125` | `<HashRouter>` |
| 4 | `App.tsx:129` | `<AppRouter>` |
| 5 (mais interno) | `router.tsx:60` | `<ChunkErrorBoundary>` |
| 6 | `router.tsx:61` | `<Suspense fallback={<PremiumLoader/>}>` |
| 7 | `router.tsx:62` | `<Routes>` |

Em React (18 e 19) o error boundary **mais próximo do componente que lançou** captura o erro e a propagação
**para**. Como `ChunkErrorBoundary` (nível 5) está estritamente abaixo do `ErrorBoundary` global (nível 1) e
**não relança** o erro em `componentDidCatch`, o `ErrorBoundary` global de `index.tsx:15` **nunca é atingido
por nenhum erro de renderização de página**. O seu fallback bonito (`ErrorBoundary.tsx:30-42`, com botão
"Recarregar página") é **código morto para tudo o que acontece dentro do router** — só cobre erros no `Header`,
`Footer`, `ToastContainer` e no próprio `App`.

---

## A) ACHADOS — Chunk Error Boundary

### A1 — Erro normal (não-chunk) numa lazy page = tela branca silenciosa — **P0**
`router.tsx:9` `static getDerivedStateFromError() { return { errored: true }; }` marca `errored` para
**qualquer** erro, sem inspecionar a mensagem. `router.tsx:17`
`render() { return this.state.errored ? null : this.props.children; }` renderiza **`null`**.
`router.tsx:10-16` `componentDidCatch` só age se for erro de chunk; para um `TypeError` normal
(ex.: `Cannot read properties of undefined`) **não faz absolutamente nada** — nem log, nem telemetria.

Provado (teste A1, passa):
- `container.innerHTML === ''` → tela em branco total;
- `screen.queryByText(/Ocorreu um erro inesperado/i)` é `null` → o `ErrorBoundary` global **não** vê o erro;
- o mesmo erro, **sem** o `ChunkErrorBoundary` no meio, produz a UI de fallback correta (2.º teste, passa).

Ou seja: **o ChunkErrorBoundary desativou o tratamento de erros do site inteiro**. Qualquer bug de runtime
em qualquer das 24 rotas lazy (`router.tsx:35-57`) resulta em página branca, sem mensagem, sem botão, sem
console (o `console.error` do `ErrorBoundary` em `ErrorBoundary.tsx:24` também nunca corre), sem forma de
o utilizador ou o suporte perceberem o que aconteceu.

**P0** — impacto máximo (site aparentemente morto), probabilidade alta (qualquer regressão de dados
do Supabase numa página basta), custo de deteção ~zero para o utilizador, custo de diagnóstico enorme
para a equipa. É um *silenciador global de erros* introduzido por um fix pontual.

### A2 — `chunk_reload` nunca é removida = tela branca permanente na 2.ª falha — **P1**
`rg chunk_reload` em todo o repo (excluindo `node_modules`) devolve **exatamente 2 ocorrências**, ambas em
`router.tsx`:
- **leitura**: `router.tsx:12` `!sessionStorage.getItem('chunk_reload')`
- **escrita**: `router.tsx:13` `sessionStorage.setItem('chunk_reload', '1')`
- **remoção**: **nenhuma**. Não há `removeItem`, nem limpeza no `App.tsx`, nem no `index.tsx`, nem em
  `store/app.store`, nem no logout.

Consequências provadas (testes A2, 3/3 passam):
1. 1.º erro de chunk → flag escrita + `reload()` chamado 1x.
2. Segundo erro de chunk **na mesma aba/sessão** (2.º deploy do dia, ou outra rota lazy cujo chunk também
   ficou stale) → `reload` **não** é chamado e o boundary devolve `null`: tela branca **definitiva**.
3. Um render bem-sucedido **não** limpa a flag — ela persiste para o resto da vida do `sessionStorage`
   (fecho da aba). Como a `sessionStorage` sobrevive a reloads e a navegações de hash, e a Fundação faz
   deploys frequentes, um utilizador com a aba aberta o dia todo fica com **uma única tentativa de
   auto-recuperação por aba, para sempre**.

O ponto correto para limpar a flag seria após um render bem-sucedido da app (ex.: `useEffect` no `App`
ou em `AppRouter`), o que "rearma" a recuperação para o deploy seguinte.

**P1** (não P0 porque exige duas falhas de chunk na mesma sessão — cenário real mas não o primeiro
encontro; combinado com A1 a experiência final é idêntica: branco sem saída).

### A3 — Loop de reload evitado, mas ao custo de tela branca — **P1** (trade-off mal escolhido)
Se após o reload o chunk continuar em falta (deploy ainda a propagar na CDN, cache do browser a servir o
`index.html` antigo, ou o rollback de um deploy), a flag `chunk_reload` impede o segundo reload
(`router.tsx:12`) — provado no teste A3: `reload` continua com **1** chamada, sem loop infinito.
A proteção anti-loop **funciona** e é a única parte defensável deste código.

O problema é o *fallback escolhido*: em vez de degradar para uma UI ("Nova versão disponível — recarregar"),
degrada para `null`. O trade-off correto é o mesmo custo (uma única tentativa automática) com um estado
final informativo. Note-se ainda que `window.location.reload()` num erro de chunk **não garante** bypass de
cache: recarrega usando as regras normais de cache HTTP; a recuperação depende inteiramente de o
`index.html` vir com `max-age=0, must-revalidate` (o que está correto, ver B). Um
`location.reload()` sobre um `index.html` ainda válido em cache não resolve nada.

### A4 — `errored` nunca é resetado: mudar de rota mantém o branco — **P1**
`ChunkErrorBoundary` está **fora** do `<Routes>` (`router.tsx:60` envolve `router.tsx:62-87`), não tem `key`
ligada ao `location.pathname`, não tem nenhum `componentDidUpdate`/`useLocation` que faça
`setState({errored:false})`, e não expõe qualquer método de reset. Uma vez `errored === true`, a instância
permanece nesse estado enquanto o `HashRouter` estiver montado.

Provado (teste A4, passa): após o erro, um `rerender` com children diferentes (equivalente a navegar para
outra rota, já que o boundary não desmonta) continua a devolver `''` e o conteúdo novo nunca aparece.
Na prática: o utilizador que apanha o branco em `/#/eventos` clica no logo/menu do `Header` (que continua
montado e funcional, porque está acima do boundary) e o conteúdo **nunca volta** — só F5 resolve.
Isto agrava A1 de "uma página partida" para "app inteira partida".

### A5 — Teste de regressão (a colocar em `tests/unit/chunk-error-boundary.test.tsx`)
Escrito e executado. As três asserções do comportamento **desejado** estão marcadas `it.fails` e falham
contra o código atual (confirmando os achados); quando o fix for aplicado, troca-se `it.fails` por `it`:
1. erro normal deve chegar a um boundary que **renderiza UI**, nunca `null`;
2. 2.º erro de chunk deve oferecer botão "Recarregar" em vez de branco;
3. o estado de erro deve resetar ao mudar de rota.

Pré-requisito para a versão definitiva: **exportar** `ChunkErrorBoundary` em `router.tsx:7` (hoje é privada),
para o teste importar o código real em vez da cópia fiel usada aqui.

---

## B) CICLO DE DEPLOY / STALE CHUNK

### B1 — `vercel.json` sem rewrite SPA — **confirmado; P3 no estado atual**
`vercel.json:1-25` contém apenas `buildCommand`, `outputDirectory`, `framework: "vite"` e três regras de
`headers`. **Não existe bloco `rewrites` nem `routes`** — a resposta esperada confirma-se. Como a app usa
`HashRouter` (`App.tsx:125`), todo o routing vive depois do `#` e o servidor só serve `/` — não há
necessidade funcional de rewrite. Fica **P3** (dívida latente): no dia em que alguém migrar para
`BrowserRouter`, todos os deep links passam a 404 silenciosamente.

Cache confirmado e correto para o essencial:
- `vercel.json:6-11` `/assets/(.*)` → `public, max-age=31536000, immutable` (hashes no nome, correto);
- `vercel.json:18-23` `/index.html` → `public, max-age=0, must-revalidate` (correto — é o que torna a
  recuperação por reload sequer possível).

### B2 — Cenário encadeado (deploy sobre app aberta) — **P1**
1. Utilizador tem a app aberta com `index.html` do deploy N (JS `/assets/HomePage-AAA.js`).
2. Deploy N+1 publica `/assets/HomePage-BBB.js`; a Vercel remove os artefactos do deploy N do domínio de
   produção → `HomePage-AAA.js` passa a **404**.
3. Utilizador navega para uma rota lazy → `import()` falha com
   `Failed to fetch dynamically imported module` → `ChunkErrorBoundary` (`router.tsx:11`) reconhece,
   escreve a flag (`router.tsx:13`) e faz `reload()`.
4. **Ponto frágil**: o reload só recupera se o browser revalidar o `index.html`. Isso está garantido pelo
   `must-revalidate` (`vercel.json:20`). O `index.html` novo referencia `HomePage-BBB.js`, que ainda não
   está em cache → é descarregado. **Neste caminho feliz, o mecanismo funciona.**
5. Caminhos infelizes, todos terminando em **branco permanente** por A2+A3+A4:
   - o utilizador está atrás de um proxy corporativo/CDN intermédia que ignora `must-revalidate`;
   - a app está a correr como PWA/em modo offline com o `index.html` já em memória (o reload não sai da aba);
   - o deploy ainda está a propagar e o `index.html` novo chega mas um dos chunks ainda 404;
   - **acontece um segundo deploy** enquanto a aba está aberta → flag já gasta, sem segunda tentativa.
   Nota importante: o JS antigo **não pode** ser servido do cache com o `index.html` novo, porque os nomes
   são diferentes (hash no nome). O risco real não é "JS velho + HTML novo", é **"HTML velho servido do
   cache/proxy → volta a pedir o chunk que já não existe"**. Aí o loop está cortado pela flag → branco.

### B3 — `tests/e2e/stale-chunk.spec.ts`: cobertura ilusória — **P2**
(E2E **não executável nesta sessão** — sem browsers Playwright nem `.env.e2e`; registado. Análise por leitura.)

- Teste 1 ("app loads without JS errors"): genérico, não testa nada de stale chunk. Passaria.
- Teste 2 ("error boundary is rendered when simulated chunk load fails") — **vacuamente verdadeiro**, três
  defeitos somados:
  1. `page.goto('/dashboard')` (`stale-chunk.spec.ts:31`) — a app é **HashRouter**; a rota real é
     `/#/dashboard`. `/dashboard` nem sequer é uma rota do servidor e não há rewrite SPA (B1),
     logo carrega 404 da Vercel ou a home;
  2. o filtro de interceção exige `request.url().includes('chunk') && includes('dashboard')`
     (`stale-chunk.spec.ts:24`) — o Vite gera `DashboardPage-<hash>.js`, **sem** a substring `chunk`.
     A rota nunca é interceptada, nenhum 404 é injetado;
  3. a asserção final `expect(hasErrorBoundary || hasRedirect)` (`stale-chunk.spec.ts:39-42`) aceita
     `hasRedirect = page.url().endsWith('/')` — verdadeiro para praticamente qualquer resultado,
     incluindo "não aconteceu nada".
  **Passa hoje sem exercitar uma única linha do `ChunkErrorBoundary`.** É um teste que dá falsa confiança
  precisamente sobre o mecanismo P0 acima. Pior: mesmo que o chunk fosse realmente 404, o comportamento
  atual (`null`) faria o teste passar via `hasRedirect`.
- Teste 3 (rotas públicas sem erro de consola): as URLs também são paths sem `#`; e com o
  `ChunkErrorBoundary` a engolir tudo em `null` **sem** relançar nem logar, um crash real de página
  **não** gera `pageerror` — o teste continuaria verde com o site branco. Cobertura negativa.

### B4 — PDFs e imagens grandes fora do `Cache-Control` — **P2**
`public/` tem **27 MB**, dos quais **24 MB são 5 PDFs** (`relatorio-contas-2021.pdf` 6.7 MB,
`relatorio-contas-2024.pdf` 5.7 MB, `relatorio-contas-2022.pdf` 5.2 MB, `contas-2023.pdf` 4.9 MB,
`relatorio-gestao-2023.pdf` 1.7 MB; 7 PDFs no total).
A regra de imagens (`vercel.json:12-17`) cobre apenas `png|webp|svg|jpg|jpeg`; a regra de assets
(`vercel.json:6-11`) cobre apenas `/assets/*`. Ficheiros em `public/` são copiados para a **raiz** do
`dist`, não para `/assets/`. **Nenhuma das três regras cobre `.pdf`** → servidos com o default da Vercel
(`public, max-age=0, must-revalidate`), ou seja, revalidação em cada visita e download integral em qualquer
miss de ETag. Também não cobertos: `favicon.ico`, `site.webmanifest` e os dois ficheiros `.PNG`
(**maiúsculas** — o `source` regex de `vercel.json:14` é case-sensitive, logo esses dois escapam à regra
das imagens).
**P2**: custo de banda e latência em ligações móveis, não é falha funcional. Fix trivial: acrescentar
`.pdf` (e `(?i)`/duplicar para maiúsculas) à regra de 30 dias.

---

## C) HEADERS DE SEGURANÇA

### C1 — `public/_headers` é formato Netlify e é **inerte** na Vercel — **P1**
Conteúdo integral de `public/_headers` (3 linhas):
```
/*
  X-Frame-Options: ALLOWALL
  Content-Security-Policy: frame-ancestors *
```
A Vercel **não lê** `_headers` (é convenção Netlify/Cloudflare Pages); a Vercel usa exclusivamente
`vercel.json > headers`. Confirmado: `vercel.json:5-24` não tem nenhum header de segurança. **Pior**:
como está em `public/`, o Vite copia-o para `dist/_headers` e ele é **servido como ficheiro estático
público** em `https://<dominio>/_headers` — não faz mal de segurança direto, mas é ruído e sinaliza a
configuração pretendida.

E o conteúdo pretendido é **perigoso**: `X-Frame-Options: ALLOWALL` (valor que nem sequer é válido — os
valores legais são `DENY` e `SAMEORIGIN`) e `frame-ancestors *` autorizariam **clickjacking total** do
site, incluindo `/#/dashboard` e `/#/login`. Se algum dia migrarem para Netlify ou "corrigirem" copiando
isto para o `vercel.json`, ficam com o site enquadrável por qualquer origem.

Estado real hoje: o site **não envia** `Strict-Transport-Security`, `X-Content-Type-Options`,
`Referrer-Policy`, `Permissions-Policy`, `X-Frame-Options` nem CSP por header. A única política ativa é a
CSP via `<meta http-equiv>` em `index.html:8`.

### C2 — CSP via `<meta>` não suporta `frame-ancestors` — **P1**
A CSP de `index.html:8` é razoável (`default-src 'self'`, `object-src 'none'`, `base-uri 'self'`,
`connect-src` restrito ao Supabase), mas por especificação, quando entregue via `<meta>`, os agentes
**ignoram** `frame-ancestors`, `report-uri` e `sandbox`. Logo **não existe hoje nenhuma proteção contra
clickjacking** — nem por `X-Frame-Options` (não enviado), nem por `frame-ancestors` (impossível via meta).
Este é o argumento decisivo para mover a CSP para header. Nota adicional: `index.html:8` não declara
`frame-src`, e como `default-src 'self'` é o fallback, **qualquer `<iframe>` do YouTube já está bloqueado
hoje** — se houver embeds de vídeo, estão partidos (verificar com o agente de conteúdo).

### C3 — Bloco `headers` proposto para `vercel.json` (PREPARADO, **NÃO APLICADO**)

```jsonc
{
  "source": "/(.*)",
  "headers": [
    { "key": "Strict-Transport-Security", "value": "max-age=63072000; includeSubDomains; preload" },
    { "key": "X-Content-Type-Options", "value": "nosniff" },
    { "key": "X-Frame-Options", "value": "DENY" },
    { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
    { "key": "Permissions-Policy", "value": "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()" },
    { "key": "Content-Security-Policy", "value":
      "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https:; media-src 'self' https:; connect-src 'self' https://*.supabase.co wss://*.supabase.co; frame-src https://www.youtube.com https://www.youtube-nocookie.com; frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'; upgrade-insecure-requests" }
  ]
}
```

Diretiva a diretiva — e **o que parte se estiver errado**:

| Diretiva | Porquê | Se errada |
|---|---|---|
| `Strict-Transport-Security` 2 anos + preload | força HTTPS, elimina downgrade/SSL-strip | `preload` é **quase irreversível**: se um subdomínio da fundação não tiver TLS, fica inacessível. Começar sem `preload` e sem `includeSubDomains`, e só depois escalar |
| `X-Content-Type-Options: nosniff` | impede MIME-sniffing (PDF/upload servido como HTML) | risco ~zero; se algum asset tiver `Content-Type` errado, deixa de renderizar — o que é o comportamento desejado |
| `X-Frame-Options: DENY` | anti-clickjacking para browsers legados; substitui o `ALLOWALL` inerte | se o site precisar de ser embebido (widget num parceiro), parte. Aqui não é o caso |
| `Referrer-Policy: strict-origin-when-cross-origin` | não vaza o path (incl. IDs de membro) para terceiros | analytics de terceiros perdem granularidade de referrer — irrelevante aqui |
| `Permissions-Policy` | desliga APIs não usadas | se algum dia houver upload por câmara no `/dashboard`, `camera=()` bloqueia-o silenciosamente |
| `script-src 'self' 'unsafe-inline'` | mantém a política atual | `'unsafe-inline'` é fraco, mas **remover sem nonce parte o site**: `index.html:38` tem `onload="this.onload=null;this.rel='stylesheet'"` inline. Endurecer exige remover esse handler primeiro |
| `style-src ... googleapis.com` | Tailwind injeta estilos inline; fontes Google | remover `'unsafe-inline'` → site sem estilos |
| `font-src gstatic.com` | ficheiros das fontes | fontes caem para fallback do sistema |
| `img-src 'self' data: blob: https:` | logos, previews base64, media do Supabase Storage | apertar para `'self'` parte todas as imagens do Storage |
| `media-src` (novo) | vídeo/áudio de media da comunidade | sem isto, `default-src 'self'` bloqueia media externa |
| `connect-src` Supabase + `wss:` | REST + Realtime | remover `wss://` mata subscrições realtime **silenciosamente** |
| **`frame-src` YouTube (mínimo)** | permite exatamente os dois hosts de embed e mais nada | omitir → `default-src 'self'` bloqueia todos os embeds (**é o estado de hoje**). Alargar para `https:` anula o valor da diretiva. `youtube-nocookie.com` incluído por privacidade (RGPD) |
| **`frame-ancestors 'none'`** | anti-clickjacking moderno — **só funciona via header** | é a razão principal para migrar do `<meta>`. Se posto em `<meta>`, é ignorado sem qualquer aviso |
| `object-src 'none'` | sem Flash/plugins | os PDFs continuam a funcionar via `<a href>`/download; parte apenas `<embed>`/`<object>` de PDF inline — **verificar as páginas de documentação antes de aplicar** |
| `form-action 'self'` | impede exfiltração de credenciais por form injetado | parte qualquer POST para domínio externo (não existe hoje) |
| `upgrade-insecure-requests` | promove sub-recursos `http://` | rede de segurança; sem efeitos adversos conhecidos |

Sequência de aplicação recomendada: (1) apagar `public/_headers` para eliminar a contradição, (2) publicar
primeiro com `Content-Security-Policy-Report-Only` durante um deploy, (3) verificar embeds de YouTube e
visualização de PDFs, (4) trocar para enforcing, (5) só então considerar `preload` no HSTS.

---

## Matriz de severidade

| # | Achado | Ficheiro:linha | Sev | Justificação |
|---|---|---|---|---|
| A1 | Erro normal → tela branca silenciosa; ErrorBoundary global inalcançável | `router.tsx:9,17` + `index.tsx:15` | **P0** | Falha total e silenciosa em qualquer das 24 rotas lazy; zero diagnóstico; anula o fallback existente |
| A4 | `errored` nunca reseta → app inteira branca até F5 | `router.tsx:8,17,60` | **P1** | Transforma erro de 1 página em erro de app; agrava A1 |
| A2 | `chunk_reload` nunca removida (só get/set) | `router.tsx:12,13` | **P1** | 1 auto-recuperação por aba, para sempre; 2.º deploy = branco permanente |
| A3 | Anti-loop OK mas fallback é `null` em vez de UI | `router.tsx:12-17` | **P1** | Trade-off correto na proteção, errado na degradação |
| C1 | `public/_headers` inerte na Vercel; nenhum header de segurança enviado | `public/_headers:1-3`, `vercel.json:5-24` | **P1** | Sem HSTS/nosniff/Referrer/Permissions/XFO; conteúdo pretendido é `ALLOWALL` (perigoso se migrado) |
| C2 | Sem proteção anti-clickjacking (meta CSP ignora `frame-ancestors`) | `index.html:8` | **P1** | `/#/login` e `/#/dashboard` enquadráveis por qualquer origem |
| B2 | Recuperação de stale chunk depende de caminho feliz único | `router.tsx:10-16` + `vercel.json:18-23` | **P1** | Cache/proxy intermédio ou 2.º deploy → branco definitivo |
| B3 | `stale-chunk.spec.ts` passa sem exercitar o boundary | `stale-chunk.spec.ts:24,31,39-42` | **P2** | Falsa confiança sobre o mecanismo P0; 3 defeitos independentes |
| B4 | 24 MB de PDFs sem `Cache-Control`; `.PNG` maiúsculo escapa à regra | `vercel.json:6-17` | **P2** | Banda/latência; sem impacto funcional |
| C2b | Embeds YouTube provavelmente já bloqueados (sem `frame-src`) | `index.html:8` | **P2** | Confirmar se existem embeds antes de classificar acima |
| B1 | Sem rewrite SPA no `vercel.json` | `vercel.json` (ausência) | **P3** | Inócuo com HashRouter; bomba-relógio se migrarem para BrowserRouter |

## Notas de execução
- Vitest **executado com sucesso** em `/tmp/proj` (cópia limpa + `npm ci`): 7 provas passam, 3 `it.fails` confirmam o comportamento indesejado.
- Playwright/E2E **não executado** (sem browsers instalados nem `.env.e2e` nesta sessão) — B3 é análise por leitura.
- Nenhum ficheiro do projeto foi modificado.
