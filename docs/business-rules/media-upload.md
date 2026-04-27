# Media Upload — Events

## Overview

Upload de imagens para a galeria de eventos, via `EventEditorModal` e `MediaManagerModal`.
O fluxo usa Supabase Storage (bucket `media`) e persiste URLs públicas na coluna `gallery` da tabela `events`.

## Details

### Fluxo principal

1. Usuário seleciona arquivo(s) no `<input type="file">` do modal
2. `handleFileUpload` cria um draft do evento automaticamente se ainda não existir um `id`
3. `addEventImagesFromFiles` itera os arquivos e chama `addMediaToEvent` para cada um
4. `addMediaToEvent` chama `saveMediaBlob` → faz upload para Supabase Storage → obtém URL pública → adiciona à `gallery` via `addGalleryItem` → salva `updateEvent`
5. Ao finalizar, o formulário é atualizado com o estado mais recente do store

### Draft automático

- Se o evento ainda não tem `id` (criação nova), um draft é criado antes do upload para ter um `eventId` válido
- O `id` do draft é rastreado em `autoDraftIdRef` (não em state) para evitar race condition com `setFormData` assíncrono
- Se o usuário cancelar o modal após upload sem salvar, o draft é deletado automaticamente em `handleClose`
- Somente drafts com `title === 'Rascunho'` são elegíveis para auto-deleção

### Regras de upload

- **Tamanho máximo**: 5MB por arquivo (validado client-side via `MediaUploadSchema` antes do storage call)
- **MIME types aceitos** (alinhados com a policy RLS storage `media: upload autenticados e tipos válidos`):
  - Imagens: `image/jpeg`, `image/png`, `image/gif`, `image/webp`, `image/svg+xml`
  - Vídeo: `video/mp4`, `video/quicktime` (.mov), `video/webm`
  - Documentos: `application/pdf`
- Tipos não aceites (ex: `application/zip`, `application/x-msdownload`) são rejeitados client-side antes da chamada ao storage
- `upsert: true` — evita erro 409 ao fazer upload de arquivo com mesmo nome
- Erros de storage são propagados com a mensagem real (ex: "The resource already exists", erros de permissão RLS)
- Cada arquivo exibe um toast individual "Imagem enviada." — não há toast de resumo ao final
- `uploadSingleImage` (cover/card image) valida via `MediaUploadSchema` antes de chamar storage; retorna `null` + toast em caso de violação

### Input de arquivo

- O `<input type="file">` usa `ref` (não `id` fixo) para evitar conflitos de DOM quando múltiplas instâncias do modal existem
- Reset do input feito via `fileInputRef.current.value = ''` no `finally`

## Gallery — order collision protection (BUG 1)

### Problema
`addGalleryItem` lia `event.gallery.length` para atribuir `order` ao novo item. Em uploads paralelos (`addEventImagesFromFiles` com múltiplos ficheiros + Promise.all em components), duas chamadas snapshotavam `gallery.length === 0` antes de qualquer write completar → ambos os items recebiam `order: 0` → colisão silenciosa, last-write-wins no JSONB.

### Solução
Cache em módulo `galleryWriteChain: Map<eventId, Promise>` serializa todas as escritas por evento. A 2ª chamada para `addGalleryItem(sameEventId, ...)` aguarda a 1ª antes de ler `event.gallery.length` — garantindo que vê o item da 1ª escrita.

```ts
const previous = galleryWriteChain.get(eventId) ?? Promise.resolve();
const next = previous.then(async () => {
  const event = EVENTS.find(e => e.id === eventId); // re-read after previous write
  // ... compute order from up-to-date gallery.length
});
galleryWriteChain.set(eventId, next.catch(() => {}));
return next;
```

Cobertura:
- Unit RED→GREEN em `events.service.test.ts > addGalleryItem parallel race (BUG 1)` — fire 2 calls before await, assert distinct order values
- E2E pendente Sprint 3 — exige editor login + multiple file selection

## Changed: 2026-04-26 (filename collision fix)
- `Date.now()` no nome do ficheiro substituído por `crypto.randomUUID()` em `saveMediaBlob` e `saveCommunityMediaBlob`
- Antes: 2 uploads no mesmo milissegundo com mesmo `file.name` → colisão. Em `saveCommunityMediaBlob` (`upsert: false`) a 2ª upload falhava com 409
- Helper centralizado `safeFileName(originalName)` aplica sanitização + UUID
- Unit test RED→GREEN: 5 uploads paralelos do mesmo `File` → 5 nomes distintos

## Changed: 2026-04-26 (BUG 5)
- `MediaUploadSchema` realinhado com a policy RLS de storage — antes rejeitava `gif/svg/mov/webm/pdf` que o storage permitia, criando UX mismatch (ficheiros bloqueados client-side mesmo aceites pelo backend)
- Lista atualizada para 9 MIME types (correspondem exatamente às extensões da policy RLS)
- E2E `tests/e2e/community-media.spec.ts` atualizado: zip rejeitado em vez de pdf
- Doc auxiliar para revisores: a fonte da verdade da matriz de tipos é a policy SQL `media: upload autenticados e tipos válidos` em `supabase/migrations/20260425000003_storage_sync_prod.sql`

## Changed: 2026-04-25
- `MediaUploadSchema` adicionado em `validation/schemas.ts` — valida size ≤ 5MB e MIME permitido
- `uploadSingleImage` agora rejeita arquivo inválido sem chamar Supabase Storage

## Changed: 2026-04-04

- **Bug fix:** `upsert: false` → `upsert: true` em `media.service.ts` para evitar 409 em uploads repetidos
- **Bug fix:** mensagem de erro no `catch` de `addMediaToEvent` agora expõe o erro real do Supabase em vez de "Erro no upload." genérico
- **Bug fix:** removido toast duplicado "N arquivos processados" de `addEventImagesFromFiles`
- **Bug fix:** `id="modal-upload"` fixo substituído por `useRef` no `EventEditorModal`
- **Bug fix:** draft órfão corrigido com `autoDraftIdRef` para rastrear ID criado automaticamente, evitando race condition com `setFormData`
