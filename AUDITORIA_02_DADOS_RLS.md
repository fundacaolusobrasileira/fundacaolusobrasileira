# AUDITORIA 02 — BANCO DE DADOS, RLS E POLICIES
**Projeto:** fundacaolusobrasileira (React + Vite + Supabase)
**Agente:** 2 — Banco de dados, RLS e policies
**Data:** 2026-09-07
**Commit auditado:** `bafb811` (HEAD)

---

## 0. AVISO METODOLÓGICO — VEREDITO DE RLS

> **RLS NÃO PROVADA EM PRODUÇÃO.**
>
> Não existe acesso ao banco Supabase de produção deste projeto nesta sessão. O servidor MCP Supabase disponível aponta para um projeto **diferente e não relacionado** — nenhuma consulta foi feita a ele e nenhuma conclusão deriva dele.
>
> **100% das afirmações abaixo derivam de análise estática do SQL versionado no repositório.** O estado real de `pg_policies`, `pg_class.relrowsecurity`, `storage.buckets` e das configurações de Auth Hooks em produção é **desconhecido e não verificado**.
>
> Agrava-se o problema: o repositório contém **duas fontes de SQL divergentes** (raiz vs `supabase/migrations/`) e comentários no código afirmam "matches production" para versões *mais permissivas* das policies — o que sugere que produção divergiu do SQL "de referência" na raiz. Qual das duas está efetivamente aplicada **não é determinável a partir do repositório**.
>
> A suíte `tests/rls/*.spec.ts`, que seria a única evidência empírica, **não pôde ser executada** (ver §8).

---

## 1. FONTE DA VERDADE E DIVERGÊNCIAS DE MIGRAÇÃO

### 1.1 Inventário de arquivos SQL

| Local | Arquivos | Aplicado por |
|---|---|---|
| Raiz | `supabase_schema.sql` (562 l.), `supabase_security_update.sql` (368 l.), `supabase_jwt_role_hook.sql` (63 l.), `seed_members_bio.sql` | **Nada.** Colagem manual no SQL Editor (instruções em `supabase_schema.sql:5-8`, `supabase_security_update.sql:6-8`, `supabase_jwt_role_hook.sql:11-15`) |
| `migrations/` (raiz) | 11 arquivos `.sql` | **Nada.** Diretório não é lido pelo Supabase CLI |
| `supabase/migrations/` | 5 arquivos | `supabase db push` / `supabase db reset` |

**Fonte da verdade formal = `supabase/migrations/`.** É o único diretório que o Supabase CLI reconhece. Tudo o resto é documentação executável à mão.

### 1.2 Divergências entre pares homónimos

| Par | Estado |
|---|---|
| `supabase_schema.sql` ↔ `supabase/migrations/20260101000000_initial_schema.sql` | **Idênticos** (diff vazio) |
| `supabase_security_update.sql` ↔ `supabase/migrations/20260101000001_rls_policies.sql` | **DIVERGEM materialmente** (ver §1.3) |
| `migrations/20260425_activity_logs.sql` ↔ `supabase/migrations/20260425000000_activity_logs.sql` | **DIVERGEM materialmente** (ver §4.2) |
| `migrations/20260425_precadastros_status_pausado.sql` ↔ `supabase/migrations/20260425000001_...` | Idênticos |
| `supabase_jwt_role_hook.sql` ↔ `supabase/migrations/20260425000002_custom_access_token_hook.sql` | Funcionalmente quase iguais, **exceto `SET search_path = public`** que existe apenas na raiz (`supabase_jwt_role_hook.sql:30`) e **falta** na migration (§6.3) |

### 1.3 Divergências `supabase_security_update.sql` vs `20260101000001_rls_policies.sql`

Três divergências de segurança, todas na direção **migration mais permissiva que a raiz**:

| # | Raiz (`supabase_security_update.sql`) | Migration (`20260101000001_rls_policies.sql`) |
|---|---|---|
| A | linha 61: `profiles` INSERT sem policy — "trigger automático (SECURITY DEFINER, não precisa de policy extra)" | linhas 64-66: cria `"profiles: inserção própria"` `WITH CHECK (auth.uid() = user_id)` — **abre INSERT direto de profile pelo utilizador, sem validar `role`** → §4.1 |
| B | linhas 170-176: `community_media` INSERT **exige `auth.role()='authenticated'` e `auth.uid() IS NOT NULL`** | linhas 183-185: `WITH CHECK (true)` — **INSERT anónimo** ("matches production") |
| C | linhas 178-184: `community_media` SELECT = `user_id = auth.uid() OR is_editor()` (autor vê o próprio envio) | linhas 188-190: SELECT = `is_editor()` apenas ("matches production") |

Também divergem sintaticamente: a raiz usa `ALTER TABLE ... ADD CONSTRAINT IF NOT EXISTS` (linhas 212-225), **sintaxe que o PostgreSQL não suporta** — `supabase_security_update.sql` **falha ao executar** nesse ponto. A migration usa o padrão `DO $$ IF NOT EXISTS (SELECT FROM pg_constraint ...)`, correto.

> **Consequência:** se alguém "restaurar o banco" colando `supabase_security_update.sql` no SQL Editor conforme as instruções do próprio arquivo (linhas 6-8), a execução **aborta na linha 212** e as secções 9-14 (constraints de `events`, `precadastros`, `community_media`, storage policies, `profiles_role_check`) **nunca são aplicadas**.

### 1.4 P0 — Migrations órfãs: 9 de 11 arquivos em `migrations/` nunca serão aplicados

Estes arquivos **não têm contraparte em `supabase/migrations/`**:

| Arquivo | Cria/altera | Objeto perdido |
|---|---|---|
| `migrations/20260519_estatutos_leads.sql:25-64` | `CREATE TABLE public.estatutos_leads` + RLS | **Tabela inteira** |
| `migrations/20260521_council_members.sql:27-125` | `CREATE TABLE public.council_members` + RLS + seed | **Tabela inteira** |
| `migrations/20260521_council_admin_exec.sql:25-69` | Amplia CHECK `council` + seed Administração/Executivo | Constraint + dados |
| `migrations/20260521_council_curadores_funcao.sql:17-20` | `UPDATE council_members SET role='Curador'` | Dados |
| `migrations/20260521_council_fix_apostrofo.sql:16-18` | Correção de nome | Dados |
| `migrations/20260521_council_members_partner_link.sql:16-49` | `ADD COLUMN partner_id` + vínculos | **Coluna** + dados |
| `migrations/20260521_institutional_documents.sql:24-100` | `CREATE TABLE public.institutional_documents` + RLS + seed | **Tabela inteira** |
| `migrations/20260521_membros_bernardo_luciane.sql:16+` | Seed `partners` | Dados |
| `migrations/20260521_partners_nomes_oficiais.sql:18+` | `UPDATE partners` nomes/cargos | Dados |
| `migrations/20260521_relatorios_2022_2021.sql:19+` | Seed `institutional_documents` | Dados |

**Impacto direto:** um `supabase db push` num projeto novo (staging, CI, disaster recovery) produz um schema **sem `estatutos_leads`, sem `council_members`, sem `institutional_documents`**. Os seguintes serviços quebram com `42P01 relation does not exist`:

- `services/councils.service.ts:28-32` (`from('council_members')`)
- `services/documents.service.ts:25-29` (`from('institutional_documents')`)
- `services/estatutos-leads.service.ts:37,51-53,65-68` (`from('estatutos_leads')`)

E o CI não detecta, porque a suíte RLS **não cobre nenhuma das três tabelas** (§8).

`git log` mostra que `supabase/migrations/` só recebeu um commit (`db6cf10`) e que **todos os 10 commits posteriores** escreveram apenas em `migrations/` — o diretório errado. A separação não é intencional; é drift.

---

## 2. INVENTÁRIO DE OBJETOS

### 2.1 Tabelas (9)

| Tabela | PK | Definida em | RLS |
|---|---|---|---|
| `public.profiles` | `id` UUID | `supabase_schema.sql:34-43` | ENABLED (`:235`) |
| `public.partners` | `id` UUID | `supabase_schema.sql:56-88` | ENABLED (`:236`) |
| `public.events` | `id` UUID | `supabase_schema.sql:104-169` | ENABLED (`:237`) |
| `public.precadastros` | `id` UUID | `supabase_schema.sql:185-198` | ENABLED (`:238`) |
| `public.community_media_submissions` | `id` UUID | `supabase_schema.sql:213-225` | ENABLED (`:239`) |
| `public.benefits` | `id` UUID | `supabase_schema.sql:506-517` | ENABLED (`:520`) |
| `public.activity_logs` | `id` UUID | `supabase/migrations/20260425000000_activity_logs.sql:4-11` | ENABLED (`:16`) |
| `public.council_members` ⚠️ órfã | `id` UUID | `migrations/20260521_council_members.sql:27-38` | ENABLED (`:54`) |
| `public.institutional_documents` ⚠️ órfã | `id` UUID | `migrations/20260521_institutional_documents.sql:24-38` | ENABLED (`:54`) |
| `public.estatutos_leads` ⚠️ órfã | `id` UUID | `migrations/20260519_estatutos_leads.sql:25-34` | ENABLED (`:46`) |

**Nenhuma view.** **Nenhuma tabela sem `ENABLE ROW LEVEL SECURITY` no SQL versionado.** (Não verificável em produção — as 3 tabelas órfãs, se criadas à mão no SQL Editor, podem ter sido criadas sem o bloco de RLS que está mais abaixo no mesmo arquivo.)

### 2.2 Chaves estrangeiras

| FK | ON DELETE | Ref |
|---|---|---|
| `profiles.user_id → auth.users(id)` (UNIQUE NOT NULL) | CASCADE | `supabase_schema.sql:36` |
| `profiles.partner_id → partners(id)` | SET NULL | `supabase_schema.sql:422` |
| `community_media_submissions.event_id → events(id)` NOT NULL | CASCADE | `supabase_schema.sql:215` |
| `community_media_submissions.user_id → auth.users(id)` | SET NULL | `supabase_schema.sql:562` |
| `benefits.partner_id → partners(id)` NOT NULL | CASCADE | `supabase_schema.sql:508` |
| `activity_logs.user_id → auth.users(id)` | SET NULL | `20260425000000_activity_logs.sql:9` |
| `council_members.partner_id → partners(id)` ⚠️ órfã | SET NULL | `migrations/20260521_council_members_partner_link.sql:17` |

`institutional_documents` e `estatutos_leads` não têm FK (por desenho).

### 2.3 Índices

`profiles_user_id_idx`, `profiles_partner_id_idx`; `partners_category_idx`, `partners_active_idx`, `partners_featured_idx`, `partners_tier_idx`; `events_status_idx`, `events_category_idx`, `events_featured_idx`, `events_date_idx`; `precadastros_status_idx`, `precadastros_email_idx`, `precadastros_type_idx`, `precadastros_email_created_at_idx` (`20260101000001:328-329`); `community_media_event_id_idx`, `community_media_status_idx`, `community_media_user_id_idx` (`20260101000001:210-211`); `benefits_partner_id_idx`, `benefits_active_idx`; `activity_logs_created_at_idx`; e nas órfãs `council_members_council_order_idx`, `council_members_active_idx`, `council_members_partner_id_idx`, `institutional_documents_category_order_idx`, `institutional_documents_active_idx`, `estatutos_leads_created_at_idx`, `estatutos_leads_email_idx`.

### 2.4 Triggers

| Trigger | Tabela | Função |
|---|---|---|
| `profiles_updated_at` | `profiles` | `handle_updated_at()` |
| `partners_updated_at` | `partners` | idem |
| `events_updated_at` | `events` | idem |
| `precadastros_updated_at` | `precadastros` | idem |
| `council_members_updated_at` ⚠️ órfã | `council_members` | idem |
| `institutional_documents_updated_at` ⚠️ órfã | `institutional_documents` | idem |
| `on_auth_user_created` | `auth.users` AFTER INSERT | `handle_new_user()` (`supabase_schema.sql:367-369`) |

**`community_media_submissions` e `activity_logs` e `estatutos_leads` não têm `updated_at` nem trigger** (append-only por desenho para os dois últimos; para `community_media_submissions` é lacuna — o `status` muda por aprovação e não há registo de quando).

### 2.5 Funções

| Função | Tipo | `SET search_path`? |
|---|---|---|
| `public.handle_updated_at()` | plpgsql, **não** SECURITY DEFINER (`supabase_schema.sql:21-27`) | **Não** |
| `public.handle_new_user()` | plpgsql, **SECURITY DEFINER** (`supabase_schema.sql:349-363`) | **Não** ⚠️ |
| `public.is_admin()` | sql, SECURITY DEFINER, STABLE (`20260101000001:32-43`) | **Não** ⚠️ |
| `public.is_editor()` | sql, SECURITY DEFINER, STABLE (`20260101000001:18-29`) | **Não** ⚠️ |
| `public.custom_access_token_hook(jsonb)` | plpgsql, SECURITY DEFINER (`20260425000002:5-28`) | **Não** ⚠️ (a versão da raiz `supabase_jwt_role_hook.sql:30` **tem**) |

Há **duas definições conflitantes de `is_admin()`**: `supabase_schema.sql:429-435` (sem `STABLE`) e `20260101000001:32-43` (com `STABLE`). Como `CREATE OR REPLACE`, vence a última executada — dependente da ordem de aplicação manual.

`is_editor` / `is_admin` são invocáveis como RPC pelo cliente (usado em `tests/rls/triggers.spec.ts:59,65,71,78`).

---

## 3. MATRIZ RLS

Legenda: **S**=SELECT **I**=INSERT **U**=UPDATE **D**=DELETE. `✓`=permitido, `✗`=negado, `✓*`=condicional (condição na nota). Coluna `authenticated (viewer/membro)` = utilizador com `profiles.role='membro'`. `service_role` **bypassa RLS sempre** (`✓✓✓✓` em toda a tabela) — omitido por redundância, exceto onde relevante.

Baseada em **`supabase/migrations/`** (fonte da verdade formal) + migrations órfãs. Nota: o estado real em produção não é verificável.

| Tabela | anon | membro/viewer | editor | admin | Policies (arquivo:linha) |
|---|---|---|---|---|---|
| **profiles** | ✗ S · ✗ I · ✗ U · ✗ D | ✓* S(própria) · **✓ I(própria, role livre)** · ✓* U(própria, role travado) · ✗ D | = membro | ✓ S(todas) · ✓ I · ✓ U(todas, inclui role) · ✗ D | `20260101000001:54-86` + `supabase_schema.sql:442,453,499` |
| **partners** | **✓ S** · ✗ I · ✗ U · ✗ D | ✓ S · ✗ I · ✗ U · ✗ D | ✓ S · ✓ I · ✓ U · ✓ D | = editor | `supabase_schema.sql:263-277`; `20260101000001:100-110` |
| **events** | ✓* S (`status='published'`) · ✗ I · ✗ U · ✗ D | ✓* S (idem) · ✗ I · ✗ U · ✗ D | ✓ S(todos, inclui draft) · ✓ I · ✓ U · ✓ D | = editor | `supabase_schema.sql:284-301`; `20260101000001:124-134` |
| **precadastros** | ✗ S · **✓ I (`WITH CHECK true`)** · ✗ U · ✗ D | ✗ S · ✓ I · ✗ U · ✗ D | ✓ S · ✓ I · ✓ U · ✓ D | = editor | `20260101000001:149-163` |
| **community_media_submissions** | ✗ S · **✓ I (`WITH CHECK true`)** · ✗ U · ✗ D | ✗ S (nem o próprio envio) · ✓ I · ✗ U · ✗ D | ✓ S · ✓ I · ✓ U · ✓ D | = editor | `20260101000001:183-199` |
| **benefits** | ✓* S (`active=true`) · ✗ I · ✗ U · ✗ D | ✓* S (idem) · ✗ I · ✗ U · ✗ D | ✓ S(todos) · ✓ I · ✓ U · ✓ D | = editor | `supabase_schema.sql:525-554` |
| **activity_logs** | ✗ S · ✗ I · ✗ U · ✗ D | **✓ S (log completo)** · **✓ I (`user_id` arbitrário)** · ✗ U · ✗ D | = membro | = membro | `20260425000000:19-26` |
| **council_members** ⚠️ | **✓ S** · ✗ I · ✗ U · ✗ D | ✓ S · ✗ I · ✗ U · ✗ D | ✓ S · ✓ I · ✓ U · ✓ D | = editor | `migrations/20260521_council_members.sql:58-79` |
| **institutional_documents** ⚠️ | **✓ S** · ✗ I · ✗ U · ✗ D | ✓ S · ✗ I · ✗ U · ✗ D | ✓ S · ✓ I · ✓ U · ✓ D | = editor | `migrations/20260521_institutional_documents.sql:57-75` |
| **estatutos_leads** ⚠️ | ✗ S · **✓ I (`WITH CHECK true`)** · ✗ U · ✗ D | ✗ S · ✓ I · **✗ U (sem policy)** · ✗ D | ✓ S · ✓ I · ✗ U · ✓ D | = editor | `migrations/20260519_estatutos_leads.sql:50-64` |

### 3.1 Divergências matriz-vs-modelo-de-negócio

| # | Divergência | Deveria ser | Severidade |
|---|---|---|---|
| a | `activity_logs`: **qualquer autenticado lê o log de auditoria completo**, que contém emails de pré-cadastro (`services/auth.service.ts:264,479` gravam `logActivity(..., email)`) e nomes de utilizadores | `is_editor()` — como na versão da raiz `migrations/20260425_activity_logs.sql:19-21` | **P0** |
| b | `activity_logs`: **qualquer autenticado insere entradas com `user_id`/`user_name` arbitrários** → log de auditoria forjável, não repudiável | `WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid())` — como na raiz `migrations/20260425_activity_logs.sql:26` | **P0** |
| c | `profiles` INSERT: `WITH CHECK (auth.uid() = user_id)` **não restringe `role`** → utilizador autenticado sem profile pode auto-inserir `role='admin'` | `AND role = 'membro'`, ou remover a policy (confiar no trigger `handle_new_user`, como a raiz recomenda em `supabase_security_update.sql:61`) | **P0** |
| d | `community_media_submissions` SELECT restrito a `is_editor()`: o **próprio autor não vê o seu envio nem o estado de aprovação**; e INSERT anónimo permite spam sem accountability | `user_id = auth.uid() OR is_editor()` no SELECT; INSERT com autenticação (versão raiz `supabase_security_update.sql:170-184`) | **P1** |
| e | `estatutos_leads`: sem policy UPDATE. Correto para append-only, mas nenhum editor consegue corrigir um lead. Aceitável | — | P3 |
| f | `precadastros` INSERT `WITH CHECK (true)` sem rate-limit, sem captcha, sem `user_id`: qualquer bot pode encher a tabela | mitigar na app/Auth rate limits (documentado apenas como passo manual em `20260101000001:396-399`, não aplicado) | **P2** |
| g | `partners` SELECT `USING (true)`: expõe **também os inativos** (`active=false`) e o campo `bio`/`full` de rascunho. `benefits` já filtra por `active`, `events` por `status` — `partners` não | `active = true OR is_editor()` | **P2** |
| h | `events.notes` documentado como "Notas internas (só visíveis para editores)" (`supabase_schema.sql:165`) mas **RLS é por linha, não por coluna** — anon que lê um evento publicado lê `notes` | mover para tabela separada ou view | **P1** |

---

## 4. POLICIES PERIGOSAS

### 4.1 P0 — Escalada de privilégio via `profiles` INSERT

`supabase/migrations/20260101000001_rls_policies.sql:64-66`
```sql
CREATE POLICY "profiles: inserção própria"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```
Nada valida `role`. Um utilizador autenticado que ainda **não tenha linha em `profiles`** pode executar:
```js
supabase.from('profiles').insert({ user_id: <o seu uid>, name:'x', email:'x', role:'admin' })
```
A policy aceita. `profiles_role_check` (`:369`) aceita `'admin'`. O resultado é admin pleno: `is_admin()` passa a devolver `true`, dando UPDATE em todos os profiles (`:84-86`), leitura de todos os pré-cadastros, etc.

A única barreira é acidental: `profiles.user_id` é `UNIQUE` (`supabase_schema.sql:36`) e o trigger `on_auth_user_created` normalmente já criou a linha com `role='membro'`. **Isso é uma mitigação por acaso, não por desenho.** A janela abre quando: o trigger falha ou é removido; o signup ocorre com confirmação de email pendente (o próprio código reconhece esse caminho em `services/auth.service.ts:243-246`, que faz `upsert` com `role:'membro'` — mas nada impede o cliente de enviar `role:'admin'` no mesmo endpoint); ou a linha é apagada por `service_role`.

Repare-se que a versão da raiz **não tem esta policy** e explica porquê: `supabase_security_update.sql:61` — *"Inserção: trigger automático (SECURITY DEFINER, não precisa de policy extra)"*. A migration adicionou-a com o comentário "matches production" — ou seja, **produção provavelmente tem esta policy**. Não verificável.

### 4.2 P0 — `activity_logs` sem vínculo ao autor e legível por todos

`supabase/migrations/20260425000000_activity_logs.sql:19-26`
```sql
CREATE POLICY "activity_logs: read for authenticated"
  ON public.activity_logs FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "activity_logs: insert for authenticated"
  ON public.activity_logs FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');
```
Contra `migrations/20260425_activity_logs.sql:19-26`, que usa `public.is_editor()` e `user_id = auth.uid()`.

Duas falhas somadas: (1) **vazamento** — o log contém emails de pré-cadastros e de contas criadas (`services/auth.service.ts:264` `logActivity('Criou conta a partir de pré-cadastro', opts.email)`; `:479` `logActivity('Novo cadastro', email)`), portanto qualquer membro autenticado enumera os emails que as policies de `precadastros` (`✗ S` para membro) tentam proteger — o controlo de acesso é contornado pelo canal lateral do log; (2) **forja** — sem `WITH CHECK` sobre `user_id`, qualquer autenticado grava entradas atribuídas a outra pessoa, destruindo o valor probatório do log.

### 4.3 P1 — `WITH CHECK (true)` em três tabelas com dados pessoais

- `precadastros` — `20260101000001:149-151`
- `community_media_submissions` — `20260101000001:183-185`
- `estatutos_leads` — `migrations/20260519_estatutos_leads.sql:50-52`

Todas aceitam INSERT anónimo irrestrito e todas armazenam **nome + email** (e `user_agent` em `estatutos_leads`). As CHECK constraints de formato de email (`20260101000001:266,295`) impedem lixo sintático, não abuso. Não há rate limiting no banco; o documento remete-o para configuração manual do painel (`20260101000001:396-399`) que não é código e não é verificável.

Em `community_media_submissions` o `user_id` (`supabase_schema.sql:562`) é nullable e **não é forçado a `auth.uid()`** — um autenticado pode atribuir a submissão a outro utilizador.

### 4.4 P1 — Nenhuma policy usa cláusula `TO`

Todas as ~40 policies do repositório são criadas sem `TO <role>`, portanto aplicam-se a `PUBLIC` (todos os roles, incluindo `anon`). O efeito líquido é benigno onde a expressão é `is_editor()`/`is_admin()` (devolvem `false` para anon), mas significa que cada operação de anon avalia todas as policies da tabela — e, sobretudo, torna a auditoria manual muito mais difícil e qualquer futura policy com predicado laxo automaticamente pública. Prática recomendada Supabase: `TO authenticated` / `TO anon` explícito.

### 4.5 P2 — Policies UPDATE sem `WITH CHECK`

`partners` (`20260101000001:104-106`), `events` (`:128-130`), `precadastros` (`:157-159`), `community_media_submissions` (`:193-195`), `benefits` (`supabase_schema.sql:543-545`), `profiles: atualização por admin` (`20260101000001:84-86`), e todas as storage policies de UPDATE.

Em PostgreSQL, `UPDATE` sem `WITH CHECK` reutiliza a expressão `USING` para validar a linha nova. Como essas expressões não referenciam colunas da linha (só `is_editor()`), o efeito é permitir ao editor alterar qualquer coluna — que é o pretendido. **Não é vulnerabilidade neste desenho**, mas é frágil: qualquer futura policy `USING` que passe a depender de colunas herdará semântica assimétrica silenciosamente. Note-se a inconsistência: `council_members` (`migrations/20260521_council_members.sql:70-73`) e `institutional_documents` (`migrations/20260521_institutional_documents.sql:67-70`) **têm** `WITH CHECK` explícito.

### 4.6 P2 — `profiles: atualização própria`: precedência de operadores e subquery à própria tabela

`supabase/migrations/20260101000001_rls_policies.sql:71-79`
```sql
CREATE POLICY "profiles: atualização própria"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND (role = (SELECT role FROM public.profiles WHERE user_id = auth.uid()))
    OR public.is_admin()
  );
```
Avalia como `(A AND B) OR C` — semanticamente correto para bloquear auto-promoção. **Mas:**
- O subselect lê `public.profiles` **sob a RLS do próprio utilizador** e dentro de uma policy da mesma tabela. Não há recursão infinita porque a policy SELECT (`:54-59`) só usa `auth.uid()` e `is_admin()` (SECURITY DEFINER). É uma dependência não-óbvia: alterar a policy SELECT de `profiles` pode fazer surgir `42P17 infinite recursion detected in policy`.
- Não há parênteses explícitos; a intenção depende da precedência do SQL. Um refactor que insira mais um `OR` quebra a proteção sem erro.
- Existem simultaneamente **duas** policies UPDATE permissivas sobre `profiles` (esta e `"profiles: atualização por admin"`, `:84-86`) — OR'd. Correto, mas duplica o caminho de admin.

### 4.7 P2 — Policies zumbi: `DROP` por nomes que não batem

`20260101000001:82` faz `DROP POLICY IF EXISTS "profiles: atualização por admin"`, mas `supabase_schema.sql:453` cria `"profiles: atualização admin"` (sem "por"). Da mesma forma, `supabase_schema.sql:442` cria `"profiles: leitura admin"` e `:499` `"profiles: inserção admin"`, nenhuma das quais é dropada pelo script de RLS. Resultado: até **três policies órfãs** sobrevivem em `profiles` num banco que executou ambos os arquivos. São todas `is_admin()`-gated (não introduzem escalada), mas tornam `pg_policies` ilegível e o comportamento efetivo dependente da ordem histórica de execução manual.

### 4.8 Tabelas com RLS mas sem policy para alguma operação

| Tabela | Operações sem nenhuma policy | Intencional? |
|---|---|---|
| `profiles` | DELETE | Sim (apagar via `auth.users` CASCADE) |
| `activity_logs` | UPDATE, DELETE | Sim — documentado `20260425000000:28` |
| `estatutos_leads` | UPDATE | Provavelmente sim |
| `community_media_submissions` | — | — |

Nenhuma destas é bug de bloqueio inesperado. **Nenhuma tabela sem RLS foi encontrada no SQL versionado.**

---

## 5. STORAGE

### 5.1 Bucket

Um único bucket: **`media`**, criado **público** e sem quaisquer limites:
`supabase/migrations/20260425000003_storage_sync_prod.sql:10-15`
```sql
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('media', 'media', true, null, null)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public, ...
```
`public=true` → **todo o conteúdo é servido sem autenticação por URL adivinhável/publicável**. `file_size_limit=null` → **sem limite de tamanho**. `allowed_mime_types=null` → **qualquer MIME type**.

O `ON CONFLICT DO UPDATE` força esses valores mesmo que alguém os tenha endurecido no painel — qualquer re-execução da migration reverte o hardening.

### 5.2 Policies de storage (todas em `storage.objects`)

| Policy | Operação | Predicado | Arquivo:linha |
|---|---|---|---|
| `media: leitura pública` | SELECT | `bucket_id='media'` — **sem qualquer restrição** | `20260425000003:35-37` |
| `media: upload autenticados e tipos válidos` | INSERT | `authenticated` + extensão em whitelist | `:40-49` |
| **`media: upload comunidade anónimo`** | INSERT | `bucket_id='media' AND name LIKE 'community/%'` — **sem auth, sem whitelist de extensão, sem limite** | `:52-57` |
| `media: upload editor` | INSERT | editor/admin, sem restrição de tipo | `:60-69` |
| `media: atualização editor` + `media: atualização editores` | UPDATE | editor/admin (duplicado) | `:76-89` |
| `media: exclusão editor` + `media: exclusão editores` | DELETE | editor/admin (duplicado) | `:91-104` |

### 5.3 P1 — Upload anónimo irrestrito para `community/`

Policies permissivas são **OR'd**. A policy anónima (`:52-57`) **não** herda a whitelist de extensões da policy de autenticados (`:45-48`) — o comentário em `:71-75` reconhece explicitamente o padrão OR para UPDATE/DELETE mas não tira a conclusão para INSERT.

Consequência: **qualquer pessoa, sem conta**, pode subir ficheiros de **qualquer tipo e qualquer tamanho** para `community/…` e obtê-los servidos publicamente a partir do domínio do projeto Supabase. Vetores: hospedagem de malware/phishing sob um domínio de aparência institucional; exaustão de quota de storage e de banda (custo direto); armazenamento de conteúdo ilegal atribuível à Fundação. Não há policy DELETE para anon, portanto **nem o remetente nem o site conseguem remover** — só editor/admin, manualmente.

### 5.4 P1 — Documentos "gated" não são gated

`migrations/20260521_institutional_documents.sql:33` define `gated BOOLEAN NOT NULL DEFAULT TRUE` — *"exige nome+email para download"* — e a migration `20260519_estatutos_leads.sql` existe precisamente para capturar esses dados pessoais em troca do download.

Mas `services/documents.service.ts:52-54` faz upload para o bucket **`media`, que é público**, e guarda o `getPublicUrl()` em `institutional_documents.file_url`. A tabela `institutional_documents` tem **SELECT público** (`migrations/20260521_institutional_documents.sql:57-59`). Portanto qualquer visitante lê a linha, obtém o `file_url` público, e descarrega o ficheiro **sem submeter formulário nenhum**. O gate é exclusivamente client-side.

O resultado é o pior dos dois mundos: recolhem-se e armazenam-se dados pessoais (nome, email, `user_agent` — `20260519_estatutos_leads.sql:32`) para proteger recursos que não estão protegidos. Do ponto de vista de RGPD isso enfraquece a base legal da recolha (não há necessidade/proporcionalidade demonstrável).

### 5.5 Dados pessoais em bucket público

Além de §5.4: os uploads de comunidade (`community/`) e de perfis de membros (`services/media.service.ts:16-18,50-52`) vão todos para o mesmo bucket público. Fotografias submetidas pela comunidade ficam publicamente acessíveis **antes** de qualquer moderação — a linha em `community_media_submissions` fica `status='pending'` e invisível ao público, mas **o ficheiro já está publicamente servido**. A moderação é sobre a metadata, não sobre o objeto. **P1.**

---

## 6. HOOK `custom_access_token` E O CAMINHO DO ROLE

### 6.1 Como o role entra no JWT

`supabase/migrations/20260425000002_custom_access_token_hook.sql:5-28`: a função lê `profiles.role` por `user_id` e escreve em `claims.app_metadata.role`, com fallback `'viewer'`. É `SECURITY DEFINER`, `GRANT` a `supabase_auth_admin` e `REVOKE` de `authenticated, anon, public` (`:30-31`) — permissionamento correto.

**Mas o hook precisa de ser ativado na configuração de Auth**, e `supabase/config.toml:277-279` tem o bloco `[auth.hook.custom_access_token]` **comentado**:
```toml
# [auth.hook.custom_access_token]
# enabled = true
# uri = "pg-functions://<database>/<schema>/<hook_name>"
```
Ou seja, **em local/CI o hook está inativo**. Em produção, a ativação seria manual pelo painel (`supabase_jwt_role_hook.sql:12-15` descreve exatamente esse passo manual). **Não verificável.**

### 6.2 As policies **não** usam o claim — usam subquery em `profiles`

Verificado em todo o SQL: **nenhuma policy lê `auth.jwt()`, `app_metadata` ou qualquer claim.** Todas resolvem o role por consulta à tabela:
- via `is_editor()` / `is_admin()` — `20260101000001:18-43`, que fazem `SELECT ... FROM public.profiles WHERE user_id = auth.uid()`;
- ou via `EXISTS (SELECT 1 FROM public.profiles ...)` inline — `supabase_schema.sql:269,273,277,288,293,297,...`, `20260425000003:64-68,80-84,95-99`.

**Consequências:**

| | |
|---|---|
| **Risco de role stale no DB** | **Nenhum.** A autorização lê sempre a tabela; despromover um admin tem efeito imediato na próxima query. Este é o ponto forte do desenho. |
| **Custo** | Cada avaliação de policy faz uma subquery a `profiles`. Com `STABLE` + `profiles_user_id_idx` o custo é baixo, mas multiplica-se por linha em queries grandes sem `initplan` garantido (as chamadas `is_editor()` são estáveis e agrupadas; os `EXISTS` inline de `supabase_schema.sql` não são envolvidos em `(SELECT ...)`, portanto podem ser reavaliados por linha). **P2 de performance.** |
| **O hook é código morto para RLS** | Injeta um claim que nada consome. Mantê-lo ativo é superfície de ataque sem benefício; desativá-lo não muda nenhuma autorização. **P3.** |

### 6.3 P1 — `SECURITY DEFINER` sem `SET search_path`

`custom_access_token_hook` (`20260425000002:5-10`), `is_admin` (`20260101000001:32-37`), `is_editor` (`:18-23`) e `handle_new_user` (`supabase_schema.sql:349-363`) são todas `SECURITY DEFINER` **sem `SET search_path`**. A versão da raiz do hook **tem** (`supabase_jwt_role_hook.sql:30` — `SET search_path = public`); a versão que o CLI aplica **perdeu-a**.

Sem `search_path` fixo, um role capaz de criar objetos num schema que preceda `public` no `search_path` do chamador pode sequestrar a resolução de `public.profiles`. Em Supabase gerido o risco prático é reduzido (poucos roles criam schemas), mas é o *advisor* `function_search_path_mutable` que o Supabase sinaliza por defeito e é trivial de corrigir. Para o hook em particular, o chamador é `supabase_auth_admin` — um alvo de alto valor.

### 6.4 P2 — Role stale **no cliente**

`App.tsx:52-67`: no evento `SIGNED_IN` (que inclui refresh de token), o role **não é re-resolvido** se já existir um role não-`viewer` para o mesmo utilizador:
```js
const alreadyResolved = event === 'SIGNED_IN' && (
  (AUTH_SESSION.isLoggedIn && AUTH_SESSION.userId === session.user.id && AUTH_SESSION.role !== 'viewer') || AUTH_LOADING);
```
Um utilizador despromovido de `admin` para `membro` mantém `AUTH_SESSION.role='admin'` na UI até logout/reload. Não é escalada real — o banco recusa (`is_admin()` lê a tabela) — mas a UI oferece ações que falham silenciosamente ou com erro genérico, e `services/auth.service.ts` faz gating **client-side** (`isAdmin()` em `:271,361,469`; `isEditor()` em `services/councils.service.ts:50,89,115`, `services/documents.service.ts:47,68,109,135`). O gate de UI diverge do gate real durante a sessão.

Adicionalmente, `resolveUserRole` (`services/auth.service.ts:161-180`) tem um `Promise.race` com timeout que **cai para `'viewer'`** — uma latência de rede degrada o role em vez de falhar. Isso é fail-safe (para menos privilégio), mas produz UX de "perdi o acesso" aleatória.

### 6.5 P3 — Vocabulário de roles inconsistente em três camadas

| Camada | Valores |
|---|---|
| Banco (`profiles_role_check`, `20260101000001:369`) | `membro`, `editor`, `admin` |
| Hook JWT (fallback, `20260425000002:19`) | `viewer` ← **não é valor válido em `profiles`** |
| App (`store/app.store.ts:15,67-68`) | `viewer`, `editor`, `admin` |

`resolveUserRole` (`services/auth.service.ts:166-168`) traduz `membro`→`viewer`. Funciona, mas qualquer código que escreva `'viewer'` em `profiles` viola `profiles_role_check`. O comentário em `services/auth.service.ts:204` — *"role is read from JWT app_metadata"* — é **falso**: `resolveUserRole` faz `SELECT role FROM profiles`. Comentário desatualizado a induzir em erro quem auditar.

---

## 7. INTEGRIDADE

### 7.1 P1 — Datas de eventos são `TEXT`

`supabase_schema.sql:117-120`: `date`, `time`, `end_date`, `end_time` são todos `TEXT`, sem CHECK de formato. `events_date_idx` (`:174`) indexa `TEXT` → ordenação **lexicográfica**. `'2024-11-15'` ordena corretamente por acidente do formato ISO; `'15/11/2024'` ou `'Nov 2024'` (nada impede) quebram ordem, filtros de "próximos eventos" e comparações. Não há constraint que force ISO.

### 7.2 P1 — `profiles.email` sem UNIQUE

`supabase_schema.sql:38`: `email TEXT NOT NULL`, sem UNIQUE e sem CHECK de formato (ao contrário de `precadastros.email` e `estatutos_leads.email`, que têm regex).

`services/auth.service.ts:65-69` faz lookup por email com `.maybeSingle()`:
```js
const { data, error } = await supabase.from('profiles').select('id').eq('email', opts.email).maybeSingle();
```
Com dois profiles partilhando email (possível: `updateUserRole`/`convertPreCadastroToAccount` escrevem `email` livremente), `maybeSingle()` **erra** (`PGRST116`), e o fluxo de conversão de pré-cadastro em conta falha de forma opaca (`:74-76` devolve o erro cru). Falta também índice em `profiles(email)` — a query faz seq scan.

### 7.3 P2 — Chaves de idempotência sem UNIQUE

Vários seeds usam `INSERT ... SELECT ... WHERE NOT EXISTS` como mecanismo de idempotência, sobre colunas **sem constraint UNIQUE**:

| Seed | Chave lógica | UNIQUE existe? |
|---|---|---|
| `migrations/20260521_council_members.sql:109-112` | `(council, name)` | **Não** |
| `migrations/20260521_institutional_documents.sql:97-100` | `file_url` | **Não** |
| `migrations/20260521_membros_bernardo_luciane.sql` | `(name, category)` | **Não** |

`WHERE NOT EXISTS` não é atómico: duas execuções concorrentes (ou um retry do CLI) duplicam linhas. Um `UNIQUE` + `ON CONFLICT DO NOTHING` seria correto e barato.

### 7.4 P2 — `partners` sem UNIQUE em `name`, mas `name` usado como chave de junção

`migrations/20260521_council_members_partner_link.sql:23-28` liga `council_members.partner_id` por `p.name = cm.name`. Com nomes duplicados em `partners` (permitido) o `UPDATE ... FROM` escolhe uma linha **arbitrária**. O próprio arquivo reconhece a fragilidade de fazer join por nome ao ter de tratar quatro casos de renomeação à mão (`:31-49`).

### 7.5 P2 — `community_media_submissions.user_id` nullable e não vinculado

`supabase_schema.sql:562`. Combinado com `WITH CHECK (true)` no INSERT (§4.3), não há forma de saber quem submeteu, nem de o autor consultar o seu envio (§3.1d). Falta também `updated_at`: quando o `status` passa a `approved`, não fica registo temporal.

### 7.6 P2 — Nenhuma query paginada

Todos os `SELECT` de listagem carregam a tabela inteira:
- `services/events.service.ts:42` — `select('*').order('created_at', desc)`
- `services/members.service.ts:45` — idem sobre `partners`
- `services/precadastros.service.ts:32` — idem
- `services/councils.service.ts:28-32`, `services/documents.service.ts:25-29`, `services/estatutos-leads.service.ts:51-53` — idem
- `services/activity-log.service.ts:16-19` — único com `.limit(50)`

`events` carrega `gallery JSONB` e `description`/`full` completos em todas as listagens. Com o crescimento de `precadastros` e `estatutos_leads` (ambos com INSERT público irrestrito, §4.3) isto degrada linearmente e sem teto.

### 7.7 P3 — Índices em falta para os padrões de ordenação usados

| Query | Índice existente | Cobre? |
|---|---|---|
| `benefits`: `.eq('active',true).order('order').order('created_at')` (`services/benefits.service.ts:10-12`) | `benefits_active_idx(active)` | Parcial — sort não indexado |
| `benefits`: `.eq('partner_id',…).order('order')` (`:20-22`) | `benefits_partner_id_idx` | Parcial |
| `events`: `.order('created_at' desc)` (`services/events.service.ts:42`) | nenhum em `created_at` | **Não** |
| `partners`: `.order('created_at' desc)` (`services/members.service.ts:45`) | nenhum em `created_at` | **Não** |
| `precadastros`: `.order('created_at' desc)` (`services/precadastros.service.ts:32`) | `precadastros_email_created_at_idx(email, created_at desc)` | **Não** (prefixo errado) |
| `council_members`: `.order('council').order('order')` | `council_members_council_order_idx` | **Sim** |
| `institutional_documents`: `.order('category').order('order')` | `institutional_documents_category_order_idx` | **Sim** |

Tabelas pequenas hoje; classificado P3 exceto onde cruza com §7.6.

### 7.8 Campos nullable problemáticos

- `partners.name` tem `DEFAULT 'Novo Membro'` (`supabase_schema.sql:60`) e `events.title` `DEFAULT 'Novo Evento'` (`:108`) — combinados com os CHECKs de comprimento mínimo (`20260101000001:220,243`), permitem persistir rascunhos com nome placeholder que **passam o filtro público** (`partners` SELECT `USING(true)`, §3.1g).
- `activity_logs.user_name TEXT` nullable e livre (`20260425000000:8`) — redundante com `user_id` e forjável (§4.2).
- `institutional_documents.year INTEGER` nullable e sem CHECK de intervalo.
- `precadastros.notes` — "Notas internas do editor" (`supabase_schema.sql:194`) — mesma questão de RLS por linha vs coluna que `events.notes` (§3.1h), embora aqui a tabela inteira já seja editor-only.

---

## 8. SUÍTE `tests/rls/` — COBERTURA E EXECUTABILIDADE

### 8.1 P1 — A suíte NÃO PÔDE SER EXECUTADA

`.env.test` **não existe** no repositório (confirmado; está em `.gitignore:31`). Apenas `.env.test.example` está presente.

`tests/rls/client.ts:3-7` define `hasTestDB` a partir de três variáveis de ambiente; `vitest.rls.config.ts:4` carrega `.env.test`. Sem o ficheiro, `hasTestDB === false`.

**O modo de falha é silencioso.** Todos os 9 specs usam `describe.skipIf(!hasTestDB)` (`activity-logs.rls.spec.ts:14`, `benefits.rls.spec.ts:13`, `community-media.rls.spec.ts:14`, `constraints.spec.ts:12`, `events.rls.spec.ts:24`, `partners.rls.spec.ts:19`, `precadastros.rls.spec.ts`, `profiles.rls.spec.ts:15`, `triggers.spec.ts:14`). Sem credenciais, `npm run test:rls` **sai com código 0 e zero testes executados** — indistinguível de sucesso para quem só olha o exit code.

O mesmo se repete no CI: `.github/workflows/test.yml:74` — `if: vars.SUPABASE_TEST_URL != ''`. Se a variável não estiver definida no repositório GitHub, o job `rls` inteiro é **skipped** e o workflow fica **verde**. Não há passo que falhe quando a RLS não é testada.

**Portanto: não existe, neste repositório, evidência executada de que qualquer policy RLS funcione.**

### 8.2 O que a suíte cobriria, se executada

| Spec | Tabela | Papéis testados |
|---|---|---|
| `profiles.rls.spec.ts` | `profiles` | viewer, editor, admin |
| `partners.rls.spec.ts` | `partners` | anon, viewer, editor |
| `events.rls.spec.ts` | `events` | anon, viewer, editor |
| `precadastros.rls.spec.ts` | `precadastros` | anon, viewer, editor |
| `community-media.rls.spec.ts` | `community_media_submissions` | anon, membro, editor |
| `benefits.rls.spec.ts` | `benefits` | anon, editor |
| `activity-logs.rls.spec.ts` | `activity_logs` | anon, viewer, editor |
| `constraints.spec.ts` | CHECKs + CASCADE | só `service_role` |
| `triggers.spec.ts` | `handle_updated_at`, RPC `is_editor`/`is_admin` | viewer, editor, admin |

Qualidade: boa. Os testes de UPDATE/DELETE negativos verificam o **efeito** via `service_role` em vez de confiar na ausência de erro (ex. `events.rls.spec.ts:83-86`, `benefits.rls.spec.ts:87-89`) — padrão correto, porque RLS filtra silenciosamente em vez de erro. `profiles.rls.spec.ts:57-68` documenta explicitamente ter corrigido um teste que podia mascarar escalada.

### 8.3 P1 — Lacunas de cobertura

**Tabelas com ZERO cobertura (3):**
- `council_members`
- `institutional_documents`
- `estatutos_leads`

Exatamente as três tabelas das migrations órfãs (§1.4). O gap é duplo: nem são criadas por `db push`, nem testadas — logo o CI nunca revelaria que faltam.

**Superfícies com ZERO cobertura:**
- **`storage.objects` / bucket `media`** — nenhum teste. As policies de storage (§5), incluindo o upload anónimo irrestrito, são inteiramente não verificadas.
- **`custom_access_token_hook`** — nenhum teste de que o claim `app_metadata.role` é injetado, nem de que o hook está ativo.
- **Escalada via INSERT em `profiles`** (§4.1) — `profiles.rls.spec.ts` testa `UPDATE` de role (`:62-68`) mas **não** testa `INSERT` com `role='admin'`. O vetor P0 mais grave está fora da suíte.
- **`anon` contra `profiles`** — `profiles.rls.spec.ts` não instancia `anonClient()`; não há teste de que um visitante não lê profiles.
- **`service_role`** — usado só como ferramenta de seed/verificação; nunca é o sujeito sob teste.

**P2 — `viewer` e `membro` são o mesmo utilizador.** `tests/rls/seed.ts:28-29`:
```js
{ email: 'viewer@test.flb', …, profileRole: 'membro', … },
{ email: 'membro@test.flb', …, profileRole: 'membro', … },
```
Ambos recebem `profiles.role='membro'`. A suíte aparenta cobrir quatro papéis; cobre **três** (`anon`, `membro`, `editor`, `admin` — sendo `viewer` um alias). Nenhuma distinção `viewer` vs `membro` é testada porque não existe no banco (§6.5).

**P2 — `admin` quase não é testado nas tabelas de conteúdo.** `partners`, `events`, `benefits`, `precadastros`, `community_media` só testam `editor`. Como `is_editor()` inclui `admin`, a inferência é razoável, mas não está verificada — e um refactor que separe os dois passaria despercebido.

**P3 — `seed.ts` não tem teardown.** Cria quatro utilizadores auth permanentes; `.gitignore` protege as credenciais mas a password é literal no repositório (`tests/rls/client.ts:33-36`, `tests/rls/seed.ts:28-31`: `FLBTest2026!`). Aceitável para um projeto de teste dedicado — mas `.env.test.example:2` avisa em maiúsculas para nunca apontar a produção, o que confirma que o risco é conhecido e não mitigado por código.

---

## 9. ACHADOS CLASSIFICADOS

### P0

| # | Achado | Evidência |
|---|---|---|
| P0-1 | **Migrations órfãs**: 9/11 arquivos em `migrations/` sem contraparte em `supabase/migrations/`. `db push` num ambiente limpo não cria `estatutos_leads`, `council_members`, `institutional_documents` → 3 serviços quebram com `42P01` | §1.4; `migrations/20260519_*`, `migrations/20260521_*` vs `ls supabase/migrations/` |
| P0-2 | **Escalada de privilégio via `profiles` INSERT**: `WITH CHECK (auth.uid()=user_id)` não valida `role`; mitigação depende acidentalmente do UNIQUE em `user_id` | `supabase/migrations/20260101000001_rls_policies.sql:64-66` |
| P0-3 | **`activity_logs` legível por qualquer autenticado** e contendo emails de pré-cadastros → contorna o gate editor-only de `precadastros` por canal lateral | `supabase/migrations/20260425000000_activity_logs.sql:19-21` vs `services/auth.service.ts:264,479` |
| P0-4 | **`activity_logs` forjável**: INSERT sem `WITH CHECK` sobre `user_id` → log de auditoria não repudiável | `supabase/migrations/20260425000000_activity_logs.sql:24-26` (a versão da raiz corrige: `migrations/20260425_activity_logs.sql:26`) |

### P1

| # | Achado | Evidência |
|---|---|---|
| P1-1 | **Suíte RLS não executável e falha silenciosa**: `.env.test` ausente → `describe.skipIf` faz exit 0 com 0 testes; CI faz skip do job com `if: vars.…!=''` → verde falso | §8.1; `tests/rls/client.ts:7`; `.github/workflows/test.yml:74` |
| P1-2 | **Upload anónimo irrestrito para `community/`** em bucket público sem limite de tamanho nem whitelist de tipo | `supabase/migrations/20260425000003_storage_sync_prod.sql:11,52-57` |
| P1-3 | **Documentos "gated" não são gated**: `file_url` público em `institutional_documents` de leitura pública → recolha de dados pessoais (`estatutos_leads`) sem função protetora | `migrations/20260521_institutional_documents.sql:33,57-59`; `services/documents.service.ts:52-54` |
| P1-4 | **Ficheiros de mídia comunitária publicamente servidos antes da moderação** (bucket público; moderação é só sobre a metadata) | §5.5 |
| P1-5 | **`SECURITY DEFINER` sem `SET search_path`** em `custom_access_token_hook`, `is_admin`, `is_editor`, `handle_new_user`; a variante da raiz do hook **tem** e a migration perdeu-a | `20260425000002:5-10`; `20260101000001:18-43`; `supabase_schema.sql:349-363` vs `supabase_jwt_role_hook.sql:30` |
| P1-6 | **`supabase_security_update.sql` não executa**: usa `ALTER TABLE … ADD CONSTRAINT IF NOT EXISTS`, sintaxe inexistente em PostgreSQL → aborta na linha 212, secções 9-14 nunca aplicadas | `supabase_security_update.sql:212-225` |
| P1-7 | **`events.notes` ("notas internas, só editores") legível por anon** — RLS é por linha, não por coluna | `supabase_schema.sql:165,284-289` |
| P1-8 | **Cobertura zero** para `council_members`, `institutional_documents`, `estatutos_leads`, `storage.objects`, o hook JWT, `anon` vs `profiles`, e o vetor P0-2 | §8.3 |
| P1-9 | **`profiles.email` sem UNIQUE nem índice**, consumido com `.maybeSingle()` → falha opaca com duplicados | `supabase_schema.sql:38`; `services/auth.service.ts:65-76` |
| P1-10 | **`events.date/time/end_date` como `TEXT`** com índice lexicográfico e sem CHECK de formato | `supabase_schema.sql:117-120,174` |
| P1-11 | **`community_media`: autor não vê o próprio envio** e INSERT é anónimo — divergência deliberada face à variante da raiz, marcada "matches production" | `20260101000001:183-190` vs `supabase_security_update.sql:170-184` |
| P1-12 | **Nenhuma policy usa `TO`** — todas aplicam a `PUBLIC`, incluindo `anon` | §4.4 |

### P2

| # | Achado | Evidência |
|---|---|---|
| P2-1 | `partners` SELECT `USING(true)` expõe inativos e rascunhos (`DEFAULT 'Novo Membro'`), ao contrário de `events`/`benefits` que filtram | `supabase_schema.sql:60,263-265` |
| P2-2 | Role stale no cliente: `SIGNED_IN` não re-resolve role não-`viewer`; despromoção só faz efeito na UI após logout | `App.tsx:52-67` |
| P2-3 | `resolveUserRole` degrada para `'viewer'` por timeout de rede em vez de falhar | `services/auth.service.ts:161-180` |
| P2-4 | `profiles: atualização própria`: precedência `(A AND B) OR C` sem parênteses + subquery à própria tabela dentro da policy | `20260101000001:71-79` |
| P2-5 | Policies zumbi: `DROP` por nomes que não batem (`"…atualização admin"` vs `"…atualização por admin"`) → até 3 policies órfãs em `profiles` | `supabase_schema.sql:442,453,499` vs `20260101000001:82` |
| P2-6 | Chaves de idempotência de seed sem UNIQUE (`council_members(council,name)`, `institutional_documents.file_url`) → duplicação em execução concorrente | `migrations/20260521_council_members.sql:109-112`; `…institutional_documents.sql:97-100` |
| P2-7 | `partners.name` sem UNIQUE mas usado como chave de junção em `council_members_partner_link` | `migrations/20260521_council_members_partner_link.sql:23-28` |
| P2-8 | `community_media_submissions.user_id` nullable e não forçado a `auth.uid()`; sem `updated_at` | `supabase_schema.sql:562,213-225` |
| P2-9 | Nenhuma query paginada; `events` carrega `gallery JSONB` completo em todas as listagens | `services/events.service.ts:42`; `services/members.service.ts:45`; `services/precadastros.service.ts:32` |
| P2-10 | `precadastros` INSERT `WITH CHECK(true)` sem rate limit — o rate limit é só um passo manual documentado | `20260101000001:149-151,396-399` |
| P2-11 | `EXISTS (SELECT …)` inline em vez de `is_editor()` em `supabase_schema.sql` e nas storage policies → possível reavaliação por linha | `supabase_schema.sql:269-301`; `20260425000003:64-99` |
| P2-12 | `viewer` e `membro` são o mesmo role no seed → cobertura de papéis aparente (4) maior que a real (3) | `tests/rls/seed.ts:28-29` |
| P2-13 | `admin` não é testado nas tabelas de conteúdo (só `editor`) | §8.3 |
| P2-14 | `[auth.hook.custom_access_token]` comentado em `config.toml` → hook inativo em local/CI; ativação em prod é manual e não verificável | `supabase/config.toml:277-279` |
| P2-15 | Duas definições conflitantes de `is_admin()` (`CREATE OR REPLACE`); a vencedora depende da ordem de execução manual | `supabase_schema.sql:429-435` vs `20260101000001:32-43` |

### P3

| # | Achado | Evidência |
|---|---|---|
| P3-1 | Policies UPDATE sem `WITH CHECK` (benigno neste desenho, frágil a refactor); inconsistente com `council_members`/`institutional_documents` que o têm | §4.5 |
| P3-2 | Hook JWT é código morto para RLS — nenhuma policy lê o claim | §6.2 |
| P3-3 | Vocabulário de roles inconsistente em 3 camadas (`membro`/`viewer`); `profiles_role_check` rejeita `'viewer'` que o hook emite como fallback | §6.5 |
| P3-4 | Comentário falso: `services/auth.service.ts:204` diz "role is read from JWT app_metadata" — não é | `services/auth.service.ts:204` vs `:161-168` |
| P3-5 | Policies de storage UPDATE/DELETE duplicadas (variante `EXISTS` + variante `is_editor()`), documentado como intencional para espelhar produção | `20260425000003:71-104` |
| P3-6 | Índices ausentes para `ORDER BY created_at DESC` em `events`, `partners`, `precadastros` | §7.7 |
| P3-7 | `benefits` ordena por `("order", created_at)` sem índice de cobertura | `services/benefits.service.ts:10-12` |
| P3-8 | `seed.ts` sem teardown; password literal no repositório | `tests/rls/seed.ts:28-31` |
| P3-9 | `institutional_documents.year` sem CHECK de intervalo; `activity_logs.user_name` redundante e livre | §7.8 |
| P3-10 | `estatutos_leads` sem policy UPDATE — nenhum editor corrige um lead | `migrations/20260519_estatutos_leads.sql:50-64` |

---

## 10. O QUE SERIA NECESSÁRIO PARA PROVAR RLS

Nenhum dos achados acima é uma afirmação sobre produção. Para converter esta análise estática em evidência seriam necessários:

1. `select tablename, policyname, cmd, roles, qual, with_check from pg_policies where schemaname in ('public','storage')` no projeto **de produção**;
2. `select relname, relrowsecurity, relforcerowsecurity from pg_class join pg_namespace … where nspname='public'` — confirmar que RLS está de facto ativa nas 10 tabelas, em particular nas 3 órfãs;
3. `select id, public, file_size_limit, allowed_mime_types from storage.buckets`;
4. `select proname, prosecdef, proconfig from pg_proc where pronamespace='public'::regnamespace` — confirmar `search_path` das funções `SECURITY DEFINER`;
5. Configuração de Auth Hooks (o `custom_access_token_hook` está ativo?);
6. `supabase migration list` — comparar migrations aplicadas vs versionadas, para determinar quanto da divergência do §1 é real;
7. Provisionar um projeto Supabase **dedicado a testes**, preencher `.env.test`, correr `npm run seed:rls && npm run test:rls`, e tornar o job `rls` do CI **obrigatório** (remover o `if:` condicional) para que a ausência de credenciais falhe em vez de ficar verde.
