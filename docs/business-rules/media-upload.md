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

- `upsert: true` — evita erro 409 ao fazer upload de arquivo com mesmo nome
- Erros de storage são propagados com a mensagem real (ex: "The resource already exists", erros de permissão RLS)
- Cada arquivo exibe um toast individual "Imagem enviada." — não há toast de resumo ao final

### Input de arquivo

- O `<input type="file">` usa `ref` (não `id` fixo) para evitar conflitos de DOM quando múltiplas instâncias do modal existem
- Reset do input feito via `fileInputRef.current.value = ''` no `finally`

## Changed: 2026-04-04

- **Bug fix:** `upsert: false` → `upsert: true` em `media.service.ts` para evitar 409 em uploads repetidos
- **Bug fix:** mensagem de erro no `catch` de `addMediaToEvent` agora expõe o erro real do Supabase em vez de "Erro no upload." genérico
- **Bug fix:** removido toast duplicado "N arquivos processados" de `addEventImagesFromFiles`
- **Bug fix:** `id="modal-upload"` fixo substituído por `useRef` no `EventEditorModal`
- **Bug fix:** draft órfão corrigido com `autoDraftIdRef` para rastrear ID criado automaticamente, evitando race condition com `setFormData`
