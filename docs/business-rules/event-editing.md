# Edição de Eventos

## Overview

Eventos (tabela `events`) são editados exclusivamente pelo `EventEditorModal` (`component.ui.tsx`).
Não existe página separada de edição — o modal é o único editor.

## Acesso

- Dashboard → aba Eventos → botão Editar (editar evento existente)
- Dashboard → botão "+ Novo Evento" (criar novo)

## Campos Editáveis

### Informações Básicas
| Campo | Descrição |
|---|---|
| `title` | Título do evento (obrigatório) |
| `subtitle` | Subtítulo ou tema |
| `date` | Data de início |
| `time` | Hora de início |
| `endDate` | Data de fim (opcional) |
| `endTime` | Hora de fim (opcional) |
| `category` | Categoria (Outros, 33 Anos, Fundação, Embaixada) |
| `location` | Nome do local/venue |
| `address` | Morada completa |
| `city` | Cidade |
| `country` | País |
| `descriptionShort` | Descrição curta para cards e listagens |
| `description` | Descrição detalhada |

### Configurações
| Campo | Descrição |
|---|---|
| `status` | `draft` (rascunho) ou `published` (publicado) — toggle |
| `featured` | Aparece em destaques — toggle |

### Imagens
| Campo | Descrição |
|---|---|
| `image` | Imagem de capa (URL ou upload direto) |
| `cardImage` | Imagem card formato 9:16 story (URL ou upload direto) |
| `gallery` | Galeria de imagens (upload múltiplo ou URL) |

### Detalhes Extras
| Campo | Descrição |
|---|---|
| `objective` | Objetivo do evento |
| `experience` | Experiência proporcionada |
| `sponsors` | Patrocinadores |
| `notes` | Notas internas (não exibidas publicamente) |

### Link Externo
| Campo | Descrição |
|---|---|
| `links.registration` | URL do link externo |
| `links.linkLabel` | Label do botão (ex: "Comprar Ingressos") |

### Redes Sociais
`socialLinks.instagram`, `socialLinks.facebook`, `socialLinks.linkedin`, `socialLinks.youtube`

## Status de Publicação

- Eventos criados via draft automático (para upload de imagem antes de salvar) recebem `status: 'draft'` e `title: 'Rascunho'`
- O toggle de Status no modal permite publicar/despublicar sem sair do editor
- Drafts com `title === 'Rascunho'` são auto-deletados se o modal for fechado sem salvar

## Serviço

- `createEvent` — cria novo evento (`services/events.service.ts`)
- `updateEvent` — atualiza evento existente, com whitelist `EVENT_DB_COLUMNS`
- Apenas campos explicitamente enviados são atualizados

## Changed: 2026-04-04

- **Bug fix:** adicionados campos `subtitle`, `time`, `endDate`, `endTime` ao modal
- **Bug fix:** adicionados campos `address`, `city`, `country` ao modal
- **Bug fix:** adicionado campo `descriptionShort` ao modal
- **Bug fix:** adicionado toggle de `status` (draft/published) — eventos agora podem ser publicados pela UI
- **Bug fix:** adicionado toggle de `featured` ao modal
- **Bug fix:** adicionados campos `objective`, `experience`, `sponsors`, `notes` ao modal
- **Feature:** upload direto de imagem de capa e imagem card (além de URL)
