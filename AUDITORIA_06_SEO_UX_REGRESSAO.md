# AUDITORIA 06 — SEO, UX Institucional, Acessibilidade e Regressão Histórica

Projeto: `C:\Users\sslaw\fundacaolusobrasileira` (React 19 + Vite 6 + HashRouter + Supabase)
Data da análise: 2026-09-07 · Commit `bafb811`
Método: análise estática do código-fonte. **Nenhum arquivo foi alterado.**
Convenção: **BUG** = deveria funcionar e não funciona · **RISCO** = funciona mas expõe a fundação · **OPORTUNIDADE** = melhoria/preferência.

---

## A) SEO TÉCNICO

### A.1 — Impacto real do HashRouter (2026)

`App.tsx:135` usa `<HashRouter>`. Todas as rotas de `router.tsx:64-93` vivem depois de `#`.
O fragmento (`#/...`) **nunca é enviado ao servidor** — é uma regra do HTTP, não uma limitação de crawler.

| Consumidor | Executa JS? | O que realmente recebe | Consequência |
|---|---|---|---|
| **Googlebot** | Sim (WRS) | Só busca `https://dominio/`. O `#/eventos/123` colapsa para `/`. | Indexa **1 única URL** (a Home renderizada). Todas as páginas internas (`/quem-somos`, `/eventos/:id`, `/documentacao`, `/parceiros`, `/beneficios`) são **inindexáveis como URLs distintas**. Nenhuma pode receber ranking, sitelink ou rich result próprio. |
| **Bingbot** | Parcial | Igual ao Google, com renderização JS menos confiável. | Mesmo efeito, com risco adicional de a Home ser indexada com conteúdo incompleto. |
| **WhatsApp / Facebook / LinkedIn** | **Não** | Só o HTML estático de `index.html`. Fragmento descartado. | **Preview idêntico para todo link do site.** |

**Resposta concreta à pergunta:** compartilhar `https://…/#/eventos/123` no WhatsApp mostra sempre:
título "Fundação Luso-Brasileira", descrição "Conectando Portugal e Brasil através da cultura e inovação." e a imagem `og-image.png` genérica (`index.html:22-31`). Nunca o nome do evento, a data, o local ou a capa. O mesmo vale para LinkedIn e Facebook. Um convite institucional para um evento chega ao destinatário sem qualquer sinal do evento. **P1 — BUG de comunicação institucional.**

`hooks/usePageMeta.ts:3-13` confirma o teto: o hook só altera `document.title` e o `content` de `meta[name="description"]` **já existente**, e faz `window.scrollTo`. Ele **não toca em nenhuma tag `og:*` nem `twitter:*`**, não cria meta quando ela não existe, e roda dentro de `useEffect` — ou seja, só produz efeito em agentes que executam JS. Para Google/Bing ele melhora o title da Home; para WhatsApp/LinkedIn/Facebook é **completamente inerte**.

### A.2 — Domínio na metadata global

`index.html:24,29,30,34` apontam para `https://fundacaolusobrasileira.vercel.app/`.

Evidências no repo sobre o domínio real:
- `.vercel/project.json` → `"projectName":"fundacaolusobrasileira"` (confirma apenas o projeto Vercel, não o domínio de produção).
- `pages/legal/LegalPage.tsx:87,92,102,114,119,129,148,164` → e-mail institucional oficial **`geral@fundacaolusobrasileira.pt`**, sede "Rua de S. Marçal, n.º 77/79 … Lisboa", NIPC 503.071.706, e filial "Rua General Jardim, n.º 808 … São Paulo", CNPJ 57.018.427/0001-34.
- `README.md` não menciona domínio (é o boilerplate do AI Studio, sem relação com o projeto).
- `vercel.json` não define `domains`/`alias`.

**Classificação: RISCO ALTO (P1), não comprovável como BUG.** O repo não declara o domínio de produção em lugar nenhum, mas o e-mail oficial `@fundacaolusobrasileira.pt` é forte indício de que existe um domínio próprio `.pt`. Se o site servir em domínio próprio, **toda a metadata OG/Twitter aponta para outro host** — o `og:image` absoluto (`…vercel.app/og-image.png`) continuará resolvendo enquanto o deploy Vercel existir, mas o `og:url` declara canonicamente o host errado, o que fragmenta sinal de SEO e faz o LinkedIn/Facebook atribuírem a partilha ao domínio vercel.app. **Ação: confirmar o domínio com a fundação antes de qualquer outra correção de SEO** — todas as demais dependem dele.

### A.3 — Inventário de artefatos de SEO

| Artefato | Estado | Evidência |
|---|---|---|
| `public/robots.txt` | **AUSENTE** | `ls public/` |
| `public/sitemap.xml` | **AUSENTE** | `ls public/` |
| `public/site.webmanifest` | Presente e válido | `public/site.webmanifest`; referenciado em `index.html:15` |
| `favicon.ico` + 16/32/48 + `apple-touch-icon.png` | Presentes | `public/`; `index.html:11-14` |
| `og-image.png` (1200×630) | Presente | `public/og-image.png` (194 KB); `index.html:29-33` |
| `<link rel="canonical">` | **AUSENTE** | `index.html` (nenhuma ocorrência) |
| JSON-LD / schema.org | **AUSENTE** | nenhuma ocorrência de `ld+json` no repo |
| `<html lang>` | `pt-BR` | `index.html:2`; `og:locale` `pt_BR` em `index.html:26` |
| 404 real | **Não existe** | ver A.4 |

- **JSON-LD ausente — P2, OPORTUNIDADE alta.** Para uma fundação, o tipo correto é `Organization` (ou `NGO`), com `name`, `url`, `logo`, `email` (`geral@fundacaolusobrasileira.pt`), `address` (as duas sedes já publicadas em `LegalPage.tsx:87,114`), `taxID`/`vatID` (NIPC 503.071.706 / CNPJ 57.018.427/0001-34) e `sameAs` para o Instagram e Facebook oficiais (`components/domain/Footer.tsx:41`). Sem isso, o Google não tem base estruturada para um Knowledge Panel institucional. **Nota:** com HashRouter, JSON-LD só faz sentido injetado no `index.html` estático — colocá-lo via React seria visto apenas pelo Google, não pelos demais.
- **`lang="pt-BR"` — P3, RISCO baixo.** A entidade é sediada em Lisboa (`LegalPage.tsx:87`) e o conteúdo é declaradamente misto: a UI usa português europeu ("Pré-Registo" `Header.tsx:75`, "contacto", "utilizadores" `App.tsx:110`) enquanto o `lang` e o `og:locale` declaram Brasil. Não é bug funcional, mas dá sinal geográfico errado ao Google e faz leitores de ecrã escolherem a pronúncia brasileira num conteúdo pt-PT. Sugestão de menor risco: `lang="pt"` (neutro) ou `pt-PT` com `og:locale:alternate` `pt_BR`.

### A.4 — 404 sempre HTTP 200

`router.tsx:93` mapeia `path="*"` para `NotFoundPage` (`pages/home/HomePage.tsx:22-46`), que renderiza um 404 visualmente correto. Mas:
1. Com HashRouter, **qualquer** URL de fragmento é servida pelo `index.html` com **HTTP 200**.
2. `vercel.json` não tem `rewrites`, então uma URL de path real inexistente devolve o 404 nativo da Vercel — uma página que não é da fundação.

Resultado: para crawlers, não existe URL alguma que devolva 404. **P3 — RISCO.** Hoje é quase irrelevante (só existe 1 URL indexável); passa a ser P1 se migrarem para BrowserRouter sem tratar isso.

### A.5 — Comparação das 3 opções

| | Manter HashRouter | Migrar para BrowserRouter | Prerender / SSG |
|---|---|---|---|
| **URLs indexáveis** | 1 (só a Home) | Todas (≈14 públicas) | Todas |
| **Preview social por página** | Nunca | **Continua genérico** (crawler social não roda JS) | Sim — é a única opção que resolve |
| **Esforço** | Zero | Baixo-médio | Médio-alto |
| **Risco de quebra** | Nenhum | **Alto se não fizer o rewrite** | Médio (build/CI) |

**Verificação crítica confirmada:** `vercel.json` **não possui bloco `rewrites`** (só `buildCommand`, `outputDirectory`, `framework` e `headers`). Sem `{"rewrites":[{"source":"/(.*)","destination":"/index.html"}]}`, migrar para BrowserRouter faz **todo refresh e todo acesso direto a `/eventos`, `/quem-somos`, etc. devolver 404 da Vercel**. É a armadilha número um dessa migração.

Riscos adicionais da migração para BrowserRouter, específicos deste repo:
- `pages/auth/LoginPage.tsx:50` monta o `redirectTo` de recuperação de senha como `window.location.origin + '/#/reset-password'`. Com BrowserRouter esse link passa a ser inválido — **quebraria a recuperação de senha em produção**, e o URL de redirect também precisa ser reautorizado no painel do Supabase.
- Todos os links `#/…` já partilhados por e-mail/WhatsApp deixariam de resolver: exigem uma redireção client-side de `#/x` → `/x` no bootstrap.
- `router.tsx:11-16` (`ChunkErrorBoundary`) faz `window.location.reload()` uma vez em erro de chunk; com rewrite ausente esse reload cairia no 404 da Vercel em vez de recuperar.

**Recomendação (menor risco × maior benefício), em ordem:**
1. **Agora, risco ~zero:** confirmar o domínio de produção com a fundação e corrigir `og:url`/`og:image`/`twitter:image` em `index.html:24,29,30,34`; adicionar `robots.txt`, `<link rel="canonical">` e JSON-LD `Organization` no `index.html` estático. Isso melhora o único ativo hoje indexável (a Home) sem tocar no roteamento. **Não gerar `sitemap.xml` com URLs de hash — seria inútil e pode gerar avisos no Search Console.**
2. **Depois, risco controlado:** migrar para BrowserRouter **na mesma alteração** que adiciona o rewrite SPA em `vercel.json`, corrige o `redirectTo` em `LoginPage.tsx:50` (+ Supabase Redirect URLs) e adiciona o shim `#/x → /x`. Só então publicar `sitemap.xml` e `canonical` por rota. Ganho: SEO real para ≈14 páginas.
3. **Só depois, se a partilha social importar:** prerender. A versão barata que resolve 90% do problema é uma Edge Middleware / função Vercel que injeta `og:title`/`og:description`/`og:image` por rota **apenas para user-agents de crawler**, sem tocar no app React. A versão completa (SSG por rota) exige repensar o carregamento de dados, hoje feito por sincronizações globais disparadas no import de `App.tsx:36-39`.

---

## B) UX INSTITUCIONAL E RESPONSIVIDADE

### B.1 — Bugs

- **B1 (P2, BUG).** `components/ui/Modals.tsx:170,176,192,201,202` têm **texto corrompido por dupla codificação (mojibake)** visível ao utilizador: "Ãrea exclusiva para editores.", "VocÃª precisa de permissÃµes de editor para realizar esta aÃ§Ã£o.", "Confirmar exclusÃ£o", "Esta aÃ§Ã£o Ã© permanente e nÃ£o pode ser desfeita.", e o placeholder de senha `â€¢â€¢â€¢â€¢`. Atinge o `AccessDeniedModal` e os defaults do `ConfirmDialog` — texto de erro num site institucional.
- **B2 (P2, BUG).** `components/domain/Footer.tsx:50` — o link **"Sobre Nós" aponta para `/`** (a Home), não para `/quem-somos`. É o link institucional mais óbvio do rodapé e leva ao lugar errado.
- **B3 (P2, BUG).** `components/domain/Footer.tsx:41` — o ícone de LinkedIn aponta para **`https://linkedin.com`** (placeholder genérico), enquanto Instagram e Facebook têm URLs reais da fundação. Um visitante que clica cai na homepage do LinkedIn.
- **B4 (P2, BUG de acessibilidade/estrutura).** `pages/eventos/EventoDetalhePage.tsx` **não tem nenhum `<h1>`** (só `<h2>`, linhas 123, 185, 198, 215, 234). A página de evento — o conteúdo mais partilhável do site — não declara o próprio título como cabeçalho principal.

### B.2 — Riscos

- **B5 (P2, RISCO).** **Menu mobile sem fecho por ESC, sem bloqueio de scroll e sem armadilha de foco.** `components/domain/Header.tsx:101-143`: o overlay `fixed inset-0` abre com `aria-label`/`aria-expanded` corretos (`Header.tsx:89-92`), mas nenhum `keydown` de Escape, nenhum `document.body.style.overflow='hidden'` e nenhum `role="dialog"`. O corpo continua a rolar por trás e o Tab sai do menu para elementos invisíveis. (O `Modal` genérico faz tudo isto certo — ver B.4 —, o menu não reutiliza esse comportamento.)
- **B6 (P2, RISCO de a11y/contraste).** A paleta de `tailwind.config.ts` é sólida, mas o uso é agressivamente translúcido: **74 ocorrências** de `text-white/10|20|30|40` em `pages/` e `components/`. Casos concretos sobre `bg-brand-900` (`#0A1410`): rodapé `text-white/20` no copyright e no "Lisboa • Brasília" (`Footer.tsx:117-127`), `text-white/30` nos títulos de coluna (`Footer.tsx:47,59,69,93`), `text-white/40` no texto descritivo (`Footer.tsx:38,96`), `placeholder:text-white/20` no campo de newsletter (`Footer.tsx:106`). Branco a 20-30% de opacidade sobre quase-preto fica na ordem de 2:1 a 3:1 de contraste — abaixo do mínimo WCAG AA de 4.5:1 para texto normal. Numa fundação com público sénior e institucional, isto é sentido.
- **B7 (P2, RISCO).** **126 ocorrências de `text-[10px]`** em `pages/` e `components/` — tamanho fixo, abaixo do mínimo prático de leitura, sem variante responsiva `sm:`/`md:`. Combinado com `uppercase tracking-widest` (o padrão do design) e com o contraste de B6, gera rótulos praticamente ilegíveis em telemóvel.
- **B8 (P2, RISCO).** **Ausência total de `env(safe-area-inset-*)`** no projeto (0 ocorrências em `.tsx`/`.css`). O `SmartInviteModal` é `fixed bottom-6 right-6` (`SmartInviteModal.tsx:61`) e o `ToastContainer` também é fixo (`components/ui/Toast.tsx:53`) — em iPhone com barra de gestos, ambos podem cair sob a *home indicator*.
- **B9 (P3, RISCO).** `components/ui/Reveal.tsx:13` faz `if (immediate) return <div…>` **antes** dos hooks `useRef`/`useState`/`useEffect` — violação das regras de hooks do React. Hoje é inofensivo porque `immediate` é sempre constante por instância, mas qualquer uso dinâmico dessa prop quebra a árvore em runtime. Além disso, **não há nenhum `prefers-reduced-motion`** no projeto: `Reveal` anima todo o conteúdo do site e `index.css:24-38` (`.reveal-hidden`, blur + translate) ignora a preferência do utilizador — problema real para utilizadores com sensibilidade vestibular.
- **B10 (P3, RISCO).** `public/_headers` define `X-Frame-Options: ALLOWALL` e `Content-Security-Policy: frame-ancestors *`. É um formato Netlify/Cloudflare Pages que a **Vercel ignora**, portanto hoje não tem efeito — mas está no repo, contradiz a CSP restritiva de `index.html:8` e viraria uma permissão de clickjacking se algum dia mudarem de host.

### B.3 — O que está correto (verificado, não assumido)

- **Tabelas**: as duas tabelas do projeto estão dentro de `overflow-x-auto` — `pages/dashboard/DashboardPage.tsx:444-445` e `pages/dashboard/UserManagerModal.tsx:260-261`. Sem bug de scroll horizontal.
- **Larguras fixas**: as ocorrências de `w-[NNNpx]` são todas de elementos decorativos `absolute` com `blur` (ex.: `LoginPage.tsx:116-117`, `DocumentacaoPage.tsx:383-384`) ou `max-w-[…]` de contentor — nenhuma força largura de conteúdo. Os `min-w-[280px] md:min-w-[300px]` do Toast (`Toast.tsx:53`) têm variante responsiva.
- **Grids**: colapsam corretamente (ex.: `BeneficiosPage.tsx:120` `grid-cols-1 md:grid-cols-2 xl:grid-cols-3`; `CouncilManagerSection.tsx:249` `grid-cols-1 lg:grid-cols-2`).
- **Botões com loading/disabled**: `components/ui/Button.tsx:22-24` aplica `disabled={disabled || isLoading}` **e** `aria-busy`, com spinner. `EventoColaborarPage.tsx:393-394` desabilita o submit durante upload e troca o rótulo.
- **Busca da Home**: exemplar em a11y — `<label class="sr-only">`, `role="combobox"`, `aria-autocomplete`, `aria-expanded`, `aria-controls`, região `aria-live="polite"` para feedback, e o "e" caligráfico marcado `aria-hidden` com `<span class="sr-only"> e </span>` como substituto (`HomePage.tsx:285-330`).

### B.4 — Modais

`components/ui/Modals.tsx:20-121` implementa corretamente, para **todos** os modais do site: `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, bloqueio de scroll em `body` **e** `documentElement` com restauro no cleanup (`Modals.tsx:29-33,86-88`), fecho por **Escape** (`Modals.tsx:47-51`), **armadilha de foco** bidirecional com Tab/Shift+Tab (`Modals.tsx:53-79`), foco inicial no primeiro elemento focável (`Modals.tsx:35-42`) e **restauro do foco anterior** ao fechar (`Modals.tsx:89`). O botão de fechar tem `aria-label="Fechar modal"` e área de toque de 40×40 (`Modals.tsx:110-116`). É o ponto mais forte da acessibilidade do projeto — e torna a lacuna do menu mobile (B5) uma inconsistência, não uma limitação técnica.

### B.5 — Presença institucional: o que existe e o que falta

**Presente e encontrável:** Quem Somos com Missão e História (`QuemSomosPage.tsx:51,75`); Governança/Órgãos Sociais em `/administracao`, alimentada por `council_members` e dividida em Conselho de Administração, Executivo, Fiscal e Curadores (`AdminPage.tsx:64-113`); Transparência em `/documentacao` com Estatutos, Relatórios Anuais e Regulamento Interno (`DocumentacaoPage.tsx:73-91`) e PDFs reais em `public/` (contas 2021-2024, parecer do Conselho Fiscal 2024, relatório de gestão 2023); Eventos; Parceiros; Benefícios; páginas legais completas em pt-PT **e** pt-BR (`LegalPage.tsx`).

**AUSÊNCIAS (não inventei conteúdo — são lacunas de navegação/estrutura, o conteúdo existe noutro sítio):**
- **A1 (P1).** **Não existe página nem secção de Contacto.** O único canal (`geral@fundacaolusobrasileira.pt`) e as duas moradas (Lisboa e São Paulo) estão enterrados no corpo da Política de Privacidade (`LegalPage.tsx:87,114`) — o visitante teria de ler a política legal para descobrir como falar com a fundação. Não há link "Contacto" no Header (`Header.tsx:15-22`) nem no Footer (`Footer.tsx:44-95`). Para uma fundação, esta é a ausência mais grave da presença institucional.
- **A2 (P2).** O rodapé não expõe **nenhum dado de identificação legal** — nem NIPC, nem CNPJ, nem morada da sede. É prática corrente (e, em Portugal, expectável) que constem no rodapé; hoje só o `© ano` e "Lisboa • Brasília" aparecem (`Footer.tsx:117-127`).
- **A3 (P2).** **Nenhuma secção de "Projetos"/"Iniciativas" ou de "Objetivos"** existe no site. `QuemSomosPage` cobre Missão e História; `/eventos` cobre agenda. Um visitante ou financiador não encontra o que a fundação **faz** de forma continuada.
- **A4 (P3).** Falta **skip-link** ("Saltar para o conteúdo") — ver secção C.
- **A5 (P3).** O Header não expõe `/documentacao` (Transparência) — só o rodapé o faz (`Footer.tsx:73-88`). Para uma fundação, transparência costuma merecer nível de navegação primária.

---

## C) ACESSIBILIDADE

| Item | Estado | Evidência |
|---|---|---|
| `lang` no `<html>` | Presente, mas `pt-BR` num conteúdo maioritariamente pt-PT | `index.html:2` — ver A.3 |
| **Skip-link** | **AUSENTE** — nenhuma ocorrência no projeto | `App.tsx:133-147` renderiza `Header` → conteúdo → `Footer` sem âncora de salto. Com o menu principal fixo e 6 links, todo utilizador de teclado atravessa a navegação em cada página. **P2, BUG de a11y.** |
| Hierarquia de headings | Correta em quase todo o lado — 1 `<h1>` por página nas 25 páginas verificadas | Exceções: `EventoDetalhePage.tsx` com **zero h1** (B4); `HomePage.tsx` conta 2 porque o ficheiro também exporta `NotFoundPage` (`HomePage.tsx:31` e `HomePage.tsx:285`) — não coexistem em runtime, **não é bug**. `DashboardMediaPage.tsx` e `EventoColaborarPage.tsx` idem (componentes distintos no mesmo ficheiro). |
| Semântica dos headings | Discutível | `QuemSomosPage.tsx:50,74,98` usam `<h2>` para micro-rótulos de 10px ("Missão", "História") enquanto o texto grande da secção é `<p>` — o leitor de ecrã ouve a estrutura, mas o utilizador vidente vê outra. **P3, OPORTUNIDADE.** |
| `alt` em imagens | **Parcialmente ausente** | Sem `alt`: `pages/dashboard/DashboardPage.tsx:212,223` (miniaturas de lista), `EventosPage.tsx:42`, `HomePage.tsx:197,210,236,249,268,409`, `MembroPerfilPage.tsx:130`, `ParceiroPerfilPage.tsx:83`, `LegaltechSpacePage.tsx:272`, `BeneficiosPage.tsx:101`, `LoginPage.tsx:67`, `ResetPasswordPage.tsx:66`, `component.ui.tsx:650,1058`. Corretos: `Footer.tsx:26-30` (`alt=""` decorativa — certo), `QuemSomosPage.tsx:124` (alt com nome do presidente), `component.ui.tsx:652,1036` (prévias). **P2, BUG** — o retrato do presidente na Home (`HomePage.tsx:409-410`) e as imagens de evento são conteúdo, não decoração. |
| `aria-label` em botões só-ícone | **Bom** | `Header.tsx:66,89,105`; `Modals.tsx:113`; `component.ui.tsx:557,1046,1061,1124,1543`; `CouncilManagerSection` usa `title=` nos botões de ícone (`title="Editar"`, `title="Excluir"`) — `title` é fallback fraco face a `aria-label`. **P3.** |
| Foco visível | **Bom no Header e nos botões** | `Header.tsx:37,45,63,72,78,90` e `Button.tsx:7` usam `focus:ring-2`. |
| Navegação por teclado — modais | **Excelente** | ver B.4 |
| Navegação por teclado — menu mobile | **Deficiente** | ver B5 |
| `role`/`aria` em menus | Parcial | `nav aria-label="Navegação Principal"` e `"Navegação Mobile"` (`Header.tsx:40,109`), `aria-current="page"` no link ativo (`Header.tsx:45`) — bom. Falta `role="dialog"` no overlay mobile. |
| `prefers-reduced-motion` | **AUSENTE** | 0 ocorrências. Todo o site anima via `Reveal` + `index.css:24-38`. **P3, RISCO.** |
| Alvos de toque | Mistos | OK: fechar modal 40×40 (`Modals.tsx:113`), hambúrguer `p-2` + ícone 24 (`Header.tsx:88-93`). Abaixo de 44px: botões de ação em listas com `p-1.5` + ícone 14-15 (≈26px) em `CouncilManagerSection.tsx:170,181,192,207,212` e nos cartões de gestão. **P3.** |

---

## D) REGRESSÃO DO RELATÓRIO HISTÓRICO

Três documentos lidos integralmente: `PDF_BUGFIX_REPORT.md` (15 itens corrigidos), `RELEASE_OPEN_ITEMS.md` (5 itens abertos), `PROMPT_REPLICAR_ALTERACOES.md` (4 mudanças). Nada foi aceite pela palavra do relatório — cada item foi procurado no código atual.

**Nota metodológica importante:** o relatório aponta evidência para `component.ui.tsx` e `component.domain.tsx`. Confirmei que ambos **continuam no caminho de execução real**, e não são código morto: `component.ui.tsx` é importado por `pages/dashboard/DashboardPage.tsx:4`, `pages/eventos/EventoDetalhePage.tsx:7` e `pages/eventos/EventosPage.tsx:3`; `component.domain.tsx` por `pages/dashboard/DashboardMediaPage.tsx:4` e `pages/eventos/EventoDetalhePage.tsx:5`. As evidências abaixo são portanto válidas.

### D.1 — Os 15 itens de `PDF_BUGFIX_REPORT.md`

| # | Item | Veredicto | Evidência |
|---|---|---|---|
| 1 | Pré-registo convertido bloqueia nome/email/tipo/perfil/estado | **PRESENTE** | `component.ui.tsx:1912` (`isConverted`), campos com `disabled={isConverted}` em `1944,1948,1953,1959`; o **estado deixou de ser editável** — é um `<div>` só de leitura (`component.ui.tsx:1975-1980`) com a nota "Altere o estado pelos botões de ação"; aviso ao editor em `1990-1992`; mensagem continua editável (`1985`) como o relatório prometia |
| 2 | Editar membro existe no back e no front | **PRESENTE** | `pages/membro/MembroPerfilPage.tsx:212` (`MembroEditarPage`), rota em `router.tsx:81` |
| 3 | "Foto ou Vídeo da Memória" + destino explícito | **PRESENTE** | `EventoColaborarPage.tsx:238` (rótulo), `:291` ("Documentos nao sao aceitos neste fluxo"), `:292` e `:193` (Galeria da Comunidade); reforço em `EventoDetalhePage.tsx:172`; a galeria existe em `component.domain.tsx:620` |
| 4 | Admin superset de editor + recuperação de senha não submete o login | **PRESENTE** | `store/app.store.ts:67-68` (`isEditor` aceita `editor` **ou** `admin`); `LoginPage.tsx:187` botão de recuperação com **`type="button"`** e `LoginPage.tsx:44-45` com `e?.preventDefault()` — não dispara o submit do form |
| 5 | Limite de 5MB na capa, visível e aplicado | **PRESENTE** | Limite exibido em `component.ui.tsx:1052`; upload passa por `handleSingleImageUpload` (`component.ui.tsx:790-805`) → `uploadSingleImage` (`services/media.service.ts:25-30`) → `MediaUploadSchema` (`validation/schemas.ts:85-88`) com toast de erro visível |
| 6 | Prévia real antes de publicar (URL e colaboração pública) | **PRESENTE** | Modal: `component.ui.tsx:635-658` (vídeo, imagem e estado "Prévia indisponível"); público: `EventoColaborarPage.tsx:300-307` |
| 7 | Modal inteligente não reaparece para utilizador autenticado | **PRESENTE** | `components/domain/SmartInviteModal.tsx:19-26` — `syncVisibility` fecha e cancela o timer se `AUTH_SESSION.isLoggedIn`, re-avaliado a cada `FLB_STATE_EVENT` (`:36`) |
| 8 | Curadoria com "Ver" e "Baixar" | **PRESENTE** | `component.domain.tsx:259-271` — âncoras `href={src}` com `Ver` e `download` com `Baixar`, ícones `aria-hidden` |
| 9 | Modal dedicado para adicionar URL | **PRESENTE** | `component.ui.tsx:557` (abre), `:665` ("Adicionar URL"), com prévia (item 6) |
| 10 | Governança sem cargo definido aparece na página pública | **PRESENTE** | `AdminPage.tsx:87-98` — `toCardMember` cria cartão só com nome+cargo quando não há partner; `AdminPage.tsx:111-113` — o balde `vogais` captura todos os que não são presidente/vice/secretário, **incluindo cargo vazio** |
| 11 | (duplicado do 7) | **PRESENTE** | idem item 7 |
| 12 | Benefícios lado a lado por parceiro | **PRESENTE** | `pages/beneficios/BeneficiosPage.tsx:120` — `grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4` dentro do bloco de cada parceiro |
| 13 | `featured` prioriza na listagem + selo visual | **PRESENTE** | Ordenação `ParceirosPage.tsx:64`, secção própria `:68,109-119`; selo em `components/domain/PartnerCard.tsx:38` e `components/domain/MemberCard.tsx:42` |
| 14 | Presidente lido do membro com `tier = presidente` | **REGREDIU (parcial)** | `QuemSomosPage.tsx:23-25` **cumpre** (`PARTNERS.find(p => p.tier === 'presidente' && p.active !== false)`). A **Home não**: `HomePage.tsx:158-159` resolve o presidente por **nome literal** `execEntry(['Paulo Campos Costa'], 'Presidente')` via `findGov` (`HomePage.tsx:128-148`), e `HomePage.tsx:410` ainda tem o fallback estático `'/presidente.webp'`. Trocar o presidente pelo dashboard (mudando o `tier`) **não** troca o bloco da Home enquanto o nome não for o mesmo — exatamente o sintoma que o item 14 dizia ter resolvido |
| 15 | Reposicionamento visual do bloco do presidente | **NÃO FOI POSSÍVEL PROVAR** | É um veredicto puramente visual. Os blocos existem (`HomePage.tsx:405-425`, `QuemSomosPage.tsx:120-135`) mas "melhor enquadramento" não é verificável por leitura de código, e as evidências citadas (`test-results/pdf-visual-pages`) **não existem no repo** |

### D.2 — Os 5 itens abertos de `RELEASE_OPEN_ITEMS.md`

| Item | Veredicto | Evidência |
|---|---|---|
| `Criar Conta` estável no cenário prod-like / E2E verde | **NÃO FOI POSSÍVEL PROVAR** | O código do fluxo existe (`services/precadastros.service.ts:207`, `component.ui.tsx:1763`) e a spec `tests/e2e/` está no repo, mas "estável em prod-like" só se prova executando E2E contra ambiente remoto — fora do alcance de análise estática, e sem `test-results/` no repo |
| Aprovação de mídia da comunidade falha na suíte crítica E2E | **NÃO FOI POSSÍVEL PROVAR** | Idem — código presente (`pages/dashboard/DashboardMediaPage.tsx`, `component.domain.tsx:217+`), resultado de execução indisponível |
| `/membro/:id/editar` protegida no **roteador** | **RESOLVIDO** | `router.tsx:81` — `<Route path="/membro/:id/editar" element={<ProtectedRoute requireEditor><MembroEditarPage /></ProtectedRoute>} />`; `ProtectedRoute` em `router.tsx:20-34` redireciona para `/login` ou `/`. A proteção interna da página continua como segunda camada (`MembroPerfilPage.tsx:219-227`) |
| Estado visual de carregamento no upload da colaboração pública | **RESOLVIDO** | `EventoColaborarPage.tsx:21` (`uploadingMedia`), spinner/estado em `:255`, aviso em `:293`, submit bloqueado com rótulo "Aguarde o upload..." em `:393-394`, e os seletores de modo desabilitados em `:240-241` |
| Newsletter `pausar/retomar` validada em E2E remoto | **NÃO FOI POSSÍVEL PROVAR** | O suporte existe (migração `migrations/20260425_precadastros_status_pausado.sql`, estado `pausado` em `types/index.ts:155` e `services/precadastros.service.ts:22`, ícones `Pause`/`Play` importados em `DashboardPage.tsx:5`), mas a validação pedida é de execução E2E remota |

### D.3 — As 4 mudanças de `PROMPT_REPLICAR_ALTERACOES.md`

| Mudança | Veredicto | Evidência |
|---|---|---|
| 1a. `migrations/20260525_estatutos_seed.sql` | **REGREDIU (artefato ausente)** | `ls migrations/` lista 12 ficheiros — o `20260525_estatutos_seed.sql` **não está entre eles**, embora o commit `bc23a40` o inclua na mensagem. Se a migração foi aplicada ao Supabase manualmente, o efeito pode estar em produção, mas o repo deixou de conter o script — não é reproduzível numa base limpa |
| 1b. `buildGroup` com estático como fallback | **PRESENTE e evoluído — com risco novo** | `DocumentacaoPage.tsx:95-113` implementa o fallback exatamente como especificado, e ainda acrescenta `isLegacyEstatutosDoc` (`:31-34`) para filtrar o `/Estatutos.pdf` legado vindo do banco. **Porém**, o commit `e63b8ba` removeu o `staticDocs` do grupo Estatutos: `GROUP_DEFS` (`DocumentacaoPage.tsx:74-78`) já não define `staticDocs`. Combinado com a migração ausente (1a), **se o seed não tiver sido aplicado ao banco a secção "Estatutos" da página pública fica vazia** — apesar de `public/Estatutos.pdf` existir no repo. **P1, RISCO — verificar a tabela `institutional_documents` em produção.** |
| 2. `CouncilManagerSection` com busca + recolher | **PRESENTE** | `pages/dashboard/CouncilManagerSection.tsx:22` (`COLLAPSE_LIMIT = 5`), `:53` (lógica de visíveis), `:184-190` ("Ver todos/Ver menos"), `:242` (campo "Buscar nome ou cargo...") |
| 3. Open Graph + Twitter completos no `index.html` | **PRESENTE, mas com domínio suspeito** | `index.html:20-34` tem todas as tags especificadas. O domínio `fundacaolusobrasileira.vercel.app` é o ponto de dúvida — ver A.2. Além disso, o próprio documento avisava que a prévia teria de ser re-raspada; com HashRouter continua a ser **uma prévia única para todo o site** (A.1) |
| 4. Favicons + `site.webmanifest` | **PRESENTE** | `public/favicon.ico`, `favicon-16x16.png`, `favicon-32x32.png`, `favicon-48x48.png`, `apple-touch-icon.png`, `icon-192.png`, `icon-512.png`, `site.webmanifest` — todos existem e são referenciados em `index.html:11-15` |

---

## Síntese por prioridade

**P1**
- Prévia de partilha idêntica para todo link do site (WhatsApp/LinkedIn/Facebook) — `App.tsx:135` + `index.html:20-34` + `usePageMeta.ts:3-13`.
- Metadata global aponta para `vercel.app` enquanto o e-mail oficial é `@fundacaolusobrasileira.pt` — `index.html:24,29,30,34` vs `LegalPage.tsx:87`. **Bloqueia todas as outras correções de SEO.**
- Site sem página/secção de Contacto; e-mail e moradas só dentro da política de privacidade — `Header.tsx:15-22`, `Footer.tsx:44-95`, `LegalPage.tsx:87,114`.
- Secção "Estatutos" pode estar vazia em produção: `staticDocs` removido + migração de seed ausente do repo — `DocumentacaoPage.tsx:74-78` + `migrations/`.

**P2**
- Mojibake visível em modais — `Modals.tsx:170,176,192,201,202`.
- "Sobre Nós" do rodapé aponta para `/` — `Footer.tsx:50`; LinkedIn placeholder — `Footer.tsx:41`.
- `EventoDetalhePage.tsx` sem `<h1>`.
- Menu mobile sem ESC, scroll-lock ou focus trap — `Header.tsx:101-143`.
- Skip-link ausente em todo o projeto — `App.tsx:133-147`.
- ~14 `<img>` sem `alt`, incluindo o retrato do presidente — `HomePage.tsx:409`.
- Contraste abaixo de AA (74 usos de `text-white/10..40`) e 126 usos de `text-[10px]` fixo.
- Regressão do item 14: Home resolve o presidente por nome literal — `HomePage.tsx:158-159`.
- Sem `robots.txt`, `canonical` nem JSON-LD `Organization`/`NGO`.

**P3**
- `lang="pt-BR"`/`og:locale=pt_BR` numa fundação sediada em Lisboa com UI em pt-PT.
- 404 sempre HTTP 200 (crítico só se migrarem para BrowserRouter).
- Sem `safe-area-inset` (iOS) e sem `prefers-reduced-motion`.
- Hooks condicionais em `Reveal.tsx:13`.
- Alvos de toque < 44px em listas de gestão.
- `public/_headers` com `frame-ancestors *` (inerte na Vercel, contradiz a CSP do `index.html:8`).
