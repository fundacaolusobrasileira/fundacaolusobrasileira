# ESTADO VALIDADO — PRONTO PARA COMMIT

Validado na máquina do utilizador, 2026-09-09.

| Comando | Antes | Agora |
|---|---|---|
| `npx tsc --noEmit` | 29 erros / 14 ficheiros | **0 erros** |
| `npm test -- --run` | 354 passam / 7 falham | **365 passam / 0 falham** |
| `npm run build` | passa | **passa, 3,46 s** |

O CI (`.github/workflows/test.yml`) corre `npx tsc --noEmit` como passo bloqueante — **estava vermelho por construção e agora fica verde**.

---

## Antes do push

```powershell
Remove-Item tsc-out.txt, build-out.txt   # artefactos de diagnóstico
```

`package.json` e `package-lock.json` mudaram (`@types/react`, `@types/react-dom`) e entram no commit.
Já feito: `git rm data/events.data.ts` e `git rm -f public/_headers`.

## Depois do deploy — 3 verificações de 30 segundos

1. **Abrir uma página de parceiro** (`/#/parceiros/<id>`) → tem de mostrar conteúdo. Hoje mostra apenas cabeçalho e rodapé.
2. **Abrir `/#/documentacao`** → tem de renderizar normalmente.
3. **Um vídeo de evento com embed YouTube** → tem de reproduzir (a CSP bloqueava-o).

---

## P0 CORRIGIDO — perfis de parceiro partidos em produção

**Provado no site em produção**, console real de `www.fundacaolusobrasileira.pt/#/parceiros/e3bf2e64-…`:

```
TypeError: Cannot read properties of undefined (reading 'split')
```

**Causa raiz:** a tabela `partners` tem a coluna `full`. **Não tem `bio_full` nem `page_route`** (confirmado por consulta à API REST). O seed estático usa `bioFull`. O código lia só `partner.bioFull`, sem optional chaining. Como `PARTNERS.length > 0`, todos os parceiros vêm do banco → `bioFull` é sempre `undefined` → `.split()` lança → **todos os perfis de parceiro rebentam**.

**Porque sobreviveu tanto tempo:** o `ChunkErrorBoundary` marcava qualquer erro e devolvia `null`. O visitante via uma zona em branco entre cabeçalho e rodapé — sem mensagem, sem log, sem sinal em lado nenhum.

**Correcção:** `bioText` lê `bioFull` (seed) ou `full` (banco), com `bio` como último recurso; `pageRoute` é lido apenas quando existe.

---

## Bugs revelados pelo `@types/react`

O `@types/react` **não estava instalado** — o React 19 não traz tipos embutidos, portanto `React` resolvia como `any` e **nenhum JSX do projeto era verificado**. Instalá-lo custou 9 erros, todos reais:

| Bug | Efeito |
|---|---|
| `ParceiroPerfilPage` lia `bioFull`/`pageRoute` inexistentes | **P0 acima** — todos os perfis de parceiro partidos |
| `DashboardMediaPage:185,199` lia `item.type` e `item.thumbnailUrl` | `GalleryItem` tem `kind` e `url`; a condição era sempre falsa |
| `PartnerSeed` sem `featured` | secção "Destaques" vazia e ordenação sem efeito no fallback para o seed |

---

## Correcções desta sessão

**Bloqueadores**

- `DocumentacaoPage.tsx` — `tick` e `handleDirectDownload` inexistentes numa edição não commitada. Quebrava `/documentacao` no próximo deploy.
- `router.tsx` — `ChunkErrorBoundary` já não engole erros normais nem devolve ecrã branco; relança para o `ErrorBoundary` global, mostra UI de recuperação, e liberta a flag `chunk_reload` (que nunca era limpa → uma recuperação por aba, para sempre). Teste novo: `tests/unit/chunk-error-boundary.test.tsx`, 4/4 — **3 dos 4 falham contra o código antigo**.
- `ParceiroPerfilPage.tsx` — o P0 acima.

**Segurança**

- `index.html` — CSP ganhou `frame-src` (YouTube, youtube-nocookie, Vimeo) e `media-src`. **Provado em navegador**: os três estavam bloqueados; os embeds de vídeo nunca funcionaram em produção.
- `vercel.json` — `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `X-Frame-Options: DENY` e CSP com `frame-ancestors 'none'` (que **não funciona** via `<meta>`, só por header). Antes existia só `strict-transport-security`.
- `public/_headers` removido — formato Netlify, inerte na Vercel, servido publicamente em `/_headers` a anunciar `X-Frame-Options: ALLOWALL`.
- `auth.service.ts` — deixou de logar email em produção (LGPD); 16 `console.*` protegidos com `import.meta.env.DEV`.

**SEO** (domínio oficial confirmado: apex redirecciona para `www.fundacaolusobrasileira.pt`)

- Metadata, `canonical` e JSON-LD (`NGO`) com dados extraídos apenas do repositório. `lang` pt-BR → pt-PT.
- `robots.txt` e `sitemap.xml` criados (404 antes). O sitemap tem **só a home**: com HashRouter, `/#/rota` não é URL distinta para o Google.

**Testes**

- Mock `isAdmin` em `component.ui.test.tsx` — destrancou 7 testes. **4 deles nunca tinham verificado nada**: o componente rebentava antes da asserção.
- `vite.config.ts` — globs de threshold corrigidos (`'services/'` não casava nada no Vitest 4 → thresholds eram config morta) e relatório de cobertura volta a ser gerado.
- `tests/e2e/stale-chunk.spec.ts` reescrito — passava vaziamente. **Não executado** (sem `.env.e2e`).
- `.env.e2e.example` criado: os E2E criam cliente service-role a partir de `VITE_SUPABASE_URL` — a variável de **produção**.

---

## POR RESOLVER

**Precisa de decisão**

| Item | Estado |
|---|---|
| Upload **anónimo** irrestrito ao bucket público `media` | `storage_sync_prod.sql:52-57`; sem limite de tamanho nem de tipo |
| `activity_logs` legível e forjável por qualquer autenticado | contém emails de pré-cadastro |
| Duas árvores de migração divergentes | 9 de 11 ficheiros de `migrations/` não existem em `supabase/migrations/` |
| Deadlock de auth (loader eterno) | `App.tsx:74` — não mexi em autenticação sem poder testar |

**RLS continua NÃO PROVADA.** `npm run test:rls` sai **verde com 73/73 testes pulados**. Execute `AUDITORIA_SQL_1_DIAGNOSTICO.sql` (10 blocos, só leitura) no SQL Editor do projeto da Fundação e envie os resultados.

**Bugs conhecidos, não corrigidos**

- Não existe campo de miniatura no schema → vídeos no painel de mídia aparecem como imagem partida.
- Secção "Estatutos" vazia em produção ("Documento em preparacao").
- Sem página de contacto; email e moradas só dentro da Política de Privacidade.
- Partilha social: com HashRouter, qualquer link partilhado mostra a prévia da home.
- Cobertura real: **22,6 %** (a métrica oficial diz 68,9 % porque só mede 3 pastas).
