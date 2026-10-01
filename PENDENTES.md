# PENDENTES — Fundação Luso-Brasileira

Estado em 2026-09-13, depois da sessão de auditoria.

---

## FEITO E PROVADO

| Item | Evidência |
|---|---|
| Perfis de parceiro partidos em produção (P0) | corrigido e verificado no site real |
| `ChunkErrorBoundary` engolia todos os erros | teste novo: 3/4 casos falham contra o código antigo |
| CSP bloqueava embeds de vídeo | zero violações medidas em produção |
| Headers de segurança | eram 1, são 6, medidos na resposta HTTP |
| Domínio `.pt`, canonical, JSON-LD, robots, sitemap | 200 em produção |
| Escalada de privilégio em `profiles` (P0) | trigger `profiles_guard_role` ativo |
| Bucket `media` sem limites | 50 MB + 9 mimes, upload anónimo restrito a `community/` |
| `activity_logs` legível e forjável por qualquer autenticado | agora `is_editor() OR is_admin()` + `user_id = auth.uid()` |
| `tsc` 29 erros → 0; testes 354/7 → 365/365; CI destravado | corrido na máquina do utilizador |
| Deadlock de auth | corrigido; **por confirmar se foi deployed** |

---

## P1 — RISCO REAL, POR RESOLVER

### 1. `resolveUserRole` degrada para `viewer` em silêncio
`auth.service.ts:174` — quando a consulta a `profiles` estoura o timeout, devolve `viewer` sem avisar ninguém. Foi isto que provavelmente causou a perda de acesso de admin de hoje.

O utilizador vê "perdi o acesso"; ninguém vê a causa. **Correção:** distinguir "não consegui resolver" de "és viewer" — manter o papel anterior em caso de timeout, ou mostrar erro explícito e oferecer nova tentativa. Nunca degradar privilégio por falha de rede.

### 2. RLS continua NÃO PROVADA por teste
`npm run test:rls` sai **verde com 73/73 testes pulados** por falta de `.env.test`. Isto é pior do que falhar: parece proteção e não é.

As policies foram verificadas por leitura do catálogo (e isso é muito mais do que existia), mas **nenhum teste negativo foi executado** — ninguém provou que um viewer não consegue escrever onde não deve. Precisa de um projeto Supabase de teste.

### 3. E2E nunca executado
92 testes, **0 corridos**. Falta `.env.e2e` e os browsers do Playwright.

Nota de segurança: `e2eCleanup.ts` e `e2eUsers.ts` criam cliente **service-role** a partir de `VITE_SUPABASE_URL` — a variável de **produção**. Sem `.env.e2e` a sobrepor, correr os E2E escreveria e apagaria em produção. Hoje é inócuo porque não correm; deixa de ser no dia em que alguém os fizer correr.

### 4. Schema não é reproduzível
`supabase_migrations.schema_migrations` **não existe** — zero migrações aplicadas via CLI. Os 16 ficheiros de migração do repositório não descrevem o banco. Se o projeto for perdido ou recriado, não há como o reconstruir.

**Correção:** gerar um dump do schema atual e passá-lo a ser a migração base.

### 5. Partilha social e SEO
Com HashRouter, qualquer link partilhado (evento, membro, parceiro) mostra sempre a prévia da home. O Google indexa 1 URL. Decisão de arquitetura, não bug — as três opções estão em `AUDITORIA_06_SEO_UX_REGRESSAO.md`.

---

## P2 — QUALIDADE E LACUNAS

| Item | Detalhe |
|---|---|
| Cobertura real 22,6% | `App.tsx`, `router.tsx`, páginas de dashboard/auth/eventos: **0%** |
| `search_path` das funções de autorização | revertido hoje; era seguro (confirmei o corpo). Reaplicar com calma |
| INSERT em `profiles` não valida `role` | tapado por acidente pelo `UNIQUE(user_id)`, não por desenho |
| Submissões públicas não são registadas | pré-cadastro e envio de mídia nunca entram no `activity_logs` |
| `svg` na policy de upload de autenticados | tapado pela whitelist de mimes do bucket; duas camadas a discordar |
| Policies duplicadas | `media: exclusão editor`/`editores`, duas UPDATE de admin em `profiles` |
| Sem miniatura de vídeo no schema | vídeos aparecem como imagem partida no painel de mídia |
| Secção "Estatutos" vazia | mostra "Documento em preparação" numa fundação com dever de transparência |
| Sem página de contacto | email e moradas só dentro da Política de Privacidade |
| Acentuação removida | "Documentacao", "Transparencia" em várias páginas; mojibake em `Modals.tsx` |
| Mobile nunca testado | Playwright só tem projetos desktop |
| 5 admins em 6 contas | decisão tomada: manter. Sem nível "admin master" no schema |

---

## PRÓXIMAS 5 AÇÕES POR RETORNO

1. **Confirmar os testes na app** (10 min) — registar conta nova, enviar foto pública num evento, carregar PDF em Documentação. São os que as alterações de hoje podem ter partido, e todos falham em silêncio.
2. **Corrigir o degradar-para-viewer** (30 min) — é o bug que já o afetou hoje e vai voltar.
3. **Criar projeto Supabase de teste + `.env.test`** (1 h) — destranca 73 testes de RLS e transforma "não provado" em provado.
4. **Dump do schema como migração base** (30 min) — torna o banco reproduzível.
5. **Testes de render das páginas públicas** (2 h) — teriam apanhado o bug dos perfis de parceiro no dia em que foi introduzido.

---

## A LIÇÃO DO DIA

O achado mais grave da auditoria — uma secção institucional inteira partida em produção — **não estava em nenhum relatório, teste ou métrica**. Estava invisível porque um error boundary transformava a exceção em ecrã branco silencioso.

Os três padrões que se repetiram:

- **erro engolido** — boundary devolve `null`, `resolveUserRole` devolve `viewer`, `logActivity` falha sem ninguém ver;
- **métrica que mente** — cobertura a dizer 68,9% quando era 22,6%; `test:rls` verde com tudo pulado;
- **tipos desligados** — sem `@types/react`, nenhum JSX era verificado, e foi ao ligá-los que 9 bugs reais apareceram.

Nenhum destes se resolve com mais código. Resolvem-se com a disciplina de nunca deixar um erro desaparecer em silêncio.
