# PreCadastros — Status Lifecycle

## Overview
PreCadastros (pre-registrations) have a linear status lifecycle managed by editors in the dashboard.
Public submissions always start as `novo`. Status transitions happen via `updatePreCadastro`.

## Valid Status Values

| Status | Meaning |
|--------|---------|
| `novo` | Just submitted, not yet reviewed |
| `contatado` | Editor has reached out |
| `aprovado` | Approved for membership |
| `pausado` | Outreach paused (not rejected — will resume) |
| `rejeitado` | Definitively rejected |
| `convertido` | Converted to a full Member account |

## Rules

- `createPreCadastro` always sets `status: 'novo'` server-side; status field in the create payload is ignored by `CreatePreCadastroSchema`.
- `pausado` was added (migration `20260425_precadastros_status_pausado.sql`) to allow editors to pause outreach without permanently rejecting a lead.
- `convertido` is set automatically by `convertPreCadastroToMember` after account creation.
- DB CHECK constraint: `status IN ('novo','contatado','aprovado','pausado','rejeitado','convertido')`.
- TypeScript union: `PreCadastro['status']` in `types/index.ts`.

## Conversion to Member (idempotency)

`convertPreCadastroToMember` é uma orquestração de 3 escritas:

1. `createMember()` → INSERT em `partners`
2. `updateMember(memberId, { name, category, bio })` → UPDATE em `partners`
3. `updatePreCadastro(id, { status: 'convertido' })` → UPDATE em `precadastros`

Se o passo 3 falhar (rede, RLS), a função usa um cache em memória `pendingConversions: Map<preId, memberId>` para que **um retry NÃO crie um segundo `partners` row**. O retry skipa os passos 1 e 2 e tenta de novo só o passo 3.

Edge cases cobertos:
- Falha entre passo 2 e 3 → retry usa o memberId cached, completa só o passo 3
- Falha no passo 2 (updateMember) → memberId é cached e o retry continua a partir do passo 2
- Sucesso completo → cache é limpo (`pendingConversions.delete(id)`)

**Limitação conhecida**: o cache é em memória, perde-se em refresh da página. Se admin faz refresh entre uma falha e o retry, o partner fica "órfão" (criado mas não associado). Para mitigar isto a longo prazo, considerar adicionar coluna `precadastro_id` em `partners` como FK — fora do scope desta sprint.

## Changed: 2026-04-26 (BUG 3)
- Adicionado pattern de idempotência em `convertPreCadastroToMember` via `pendingConversions: Map<preId, memberId>`
- Unit test RED→GREEN demonstra: 1ª chamada falha no updatePreCadastro → 2ª chamada NÃO chama `createMember` novamente
- E2E pendente Sprint 3 (exige editor login + manipulação de network)

## Changed: 2026-04-25
- Created. Added `pausado` to the enum (previously only 5 statuses; `DashboardPage.tsx` had `as any` cast).
