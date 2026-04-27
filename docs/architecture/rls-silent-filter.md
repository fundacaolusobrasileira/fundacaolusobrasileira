# RLS Silent-Filter Pattern

## Overview

PostgREST devolve `{ error: null, data: [] }` quando uma cláusula `USING` de RLS rejeita uma operação `UPDATE` ou `DELETE`. Não há erro — apenas zero linhas afetadas. Verificar só `if (!error)` produz **falso positivo**: o service mostra "Atualizado." enquanto a base de dados não muda.

Este doc define o padrão obrigatório para todos os services que escrevem em tabelas com RLS.

## Tabelas afetadas

Todas as tabelas com policies `USING (public.is_editor())` ou similar:

- `events`, `partners`, `precadastros`, `benefits`, `community_media_submissions`
- Qualquer tabela com policy permissiva baseada em `auth.uid()` ou role

## Pattern obrigatório

### ❌ INCORRETO (silent-filter false positive)

```ts
const { error } = await supabase.from('events').update(payload).eq('id', id);
if (!error) {
  // Mutar store, mostrar toast "salvo" — pode ser falso!
}
```

### ✅ CORRETO

```ts
const { data, error } = await supabase
  .from('events')
  .update(payload)
  .eq('id', id)
  .select('id'); // ← força retorno das linhas afetadas

if (error) {
  showToast('Erro ao salvar.', 'error');
  return false;
}
if (!data || data.length === 0) {
  // RLS denied — silent filter — 0 rows affected
  showToast('Sem permissão para editar.', 'error');
  return false;
}
// Aqui sim, sucesso confirmado
```

## Aplicação atual

| Service | Função | Status |
|---|---|---|
| `events.service.ts` | `updateEvent` | ✓ Pattern aplicado |
| `events.service.ts` | `deleteEvent` | ✓ Pattern aplicado |
| `events.service.ts` | `approveCommunityMedia` (DELETE submissão) | ✓ Pattern aplicado |
| `events.service.ts` | `rejectCommunityMedia` (DELETE submissão) | ✓ Pattern aplicado |
| `precadastros.service.ts` | `updatePreCadastro` | ✓ Pattern aplicado |
| `precadastros.service.ts` | `deletePreCadastro` | ✓ Pattern aplicado |
| `members.service.ts` | `updateMember` | ✓ Pattern aplicado |
| `members.service.ts` | `deleteMember` | ✓ Pattern aplicado |

## Cobertura de testes

- **Unit**: cada service tem teste RED→GREEN que mocka `mockUpdateEqSelect.mockResolvedValueOnce({ data: [], error: null })` e verifica que o service retorna `false` + não muta store + não mostra toast de sucesso
- **Integration (RLS)**: `tests/rls/*.spec.ts` validam o comportamento real do PostgREST usando viewer/anon contra Postgres com RLS ativo
- **E2E**: pendente Sprint 3 — exige seed de viewer + login para reproduzir UI-side

## Detalhes para revisores

A coluna `id` em `.select('id')` é a forma mais leve (1 byte por linha). Não usar `.select('*')` para esta verificação.

Em casos de mass-update (não usados atualmente), considerar `.select('id', { count: 'exact' })` para auditoria.

## Changed: 2026-04-26
- Pattern documentado após audit que identificou silent-filter false positive em `updateEvent`, `updatePreCadastro`, `updateMember` e respetivos `delete*`
- 8 unit tests RED→GREEN demonstram o problema
- Aplicado também em `approveCommunityMedia` e `rejectCommunityMedia` (community_media_submissions tem RLS USING `public.is_editor()`)
