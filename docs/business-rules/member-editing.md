# Edição de Membros

## Overview

Membros (tabela `partners`) podem ser editados por dois caminhos distintos que agora cobrem os mesmos campos.

## Dois Caminhos de Edição

### 1. Dashboard — `MemberEditorModal` (`component.ui.tsx`)
- Acesso: Dashboard → aba Membros → botão Editar
- Modal overlay sobre o dashboard
- Usado para criar novos membros e editar qualquer membro

### 2. Página Pública — `MembroEditarPage` (`pages/membro/MembroPerfilPage.tsx`)
- Acesso: `/membro/:id/editar`
- Página full-screen
- Acessível via botão "Editar Perfil" na página pública do membro (visível apenas para editores)

## Campos Editáveis (ambos os formulários)

| Campo | Descrição |
|---|---|
| `name` | Nome de exibição |
| `type` | Pessoa ou Empresa |
| `category` | Tier do parceiro (Platinum, Gold, Silver, etc.) |
| `role` | Cargo ou função |
| `image` | Foto ou logo (URL ou upload) |
| `country` | País de origem |
| `website` | URL do site |
| `socialLinks` | LinkedIn, Instagram, Twitter, Facebook |
| `bio` | Texto curto para listagens |
| `summary` | Resumo curto para cards |
| `full` | Biografia completa detalhada |
| `active` | Status ativo/inativo (visibilidade pública) |
| `featured` | Aparece em destaques |
| `order` | Ordem de exibição nas listagens |

## Serviço

Ambos os formulários chamam `updateMember` (`services/members.service.ts`).
O serviço tem whitelist `PARTNER_DB_COLUMNS` que permite todos os campos acima.
Apenas campos explicitamente enviados são atualizados — campos ausentes do patch não são sobrescritos.

## Changed: 2026-04-04

- **Bug fix:** `MemberEditorModal` não tinha `summary`, `full`, `country` — adicionados
- **Bug fix:** `MembroEditarPage` não tinha `active`, `featured`, `order`, `bio` — adicionados
- Ambos os formulários agora cobrem todos os campos do tipo `Partner`
