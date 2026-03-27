# Design: Refatoração Institucional — Fundação Luso-Brasileira

**Data:** 2026-03-18
**Status:** Aprovado

---

## Objetivo

Transformar o projeto em uma plataforma institucional robusta onde todo conteúdo está presente, a leitura é progressiva e elegante, a arquitetura é escalável e o sistema está pronto para expansão futura (CMS, vídeos, depoimentos).

---

## Decisão de Arquitetura de Dados

**Hybrid seed + Supabase:**

| Dado | Fonte | Editável no admin? |
|---|---|---|
| Nomes, cargos, hierarquia dos membros | `members.data.ts` (seed) | Não |
| Bios completas dos membros | Supabase | ✅ Sim |
| Eventos (descrição, data, local) | Supabase | ✅ Sim |
| Seed da Gala 2025 | `events.data.ts` | — |
| Textos institucionais (missão, quem somos) | `content.data.ts` | Não |
| Parceiros fundadores | `partners.data.ts` | Não |

**Estratégia de merge:**
```
membro_final = staticSeed[id] + supabaseData[id]
```
Supabase tem precedência. Se membro não existe no Supabase, seed serve como fallback.

---

## Estrutura de Pastas

```
src/
├── types/
│   └── index.ts
├── data/
│   ├── content.data.ts
│   ├── members.data.ts
│   ├── partners.data.ts
│   └── events.data.ts
├── services/
│   ├── members.service.ts
│   ├── events.service.ts
│   └── media.service.ts
├── store/
│   └── app.store.ts
├── hooks/
│   ├── useDebounce.ts
│   ├── usePageMeta.ts
│   └── useFeedback.ts
├── components/
│   ├── ui/
│   │   ├── Button.tsx
│   │   ├── Badge.tsx
│   │   ├── Card.tsx
│   │   ├── ExpandableText.tsx
│   │   ├── Reveal.tsx
│   │   ├── Skeleton.tsx
│   │   └── index.ts
│   └── domain/
│       ├── Header.tsx
│       ├── Footer.tsx
│       ├── MemberCard.tsx
│       ├── EventCard.tsx
│       ├── PartnerCard.tsx
│       └── index.ts
├── pages/
│   ├── home/HomePage.tsx
│   ├── quem-somos/QuemSomosPage.tsx
│   ├── administracao/AdminPage.tsx
│   ├── membro/MembroPerfilPage.tsx
│   ├── eventos/EventosPage.tsx
│   ├── eventos/EventoDetalhePage.tsx
│   ├── parceiros/ParceirosPage.tsx
│   ├── auth/LoginPage.tsx
│   ├── auth/CadastroPage.tsx
│   ├── auth/PreCadastroPage.tsx
│   ├── dashboard/DashboardPage.tsx
│   ├── dashboard/DashboardMediaPage.tsx
│   └── legal/LegalPage.tsx
├── router.tsx
├── App.tsx
└── index.tsx
```

---

## Hierarquia de Membros (obrigatória)

```
PRESIDENTE
└── Paulo Campos Costa (order: 1, tier: 'presidente')

DIREÇÃO
├── Álvaro Covões (order: 2, tier: 'direcao')
└── Pedro Ribeiro (order: 3, tier: 'direcao')

SECRETÁRIO GERAL
└── João Pedro Carvalho (order: 4, tier: 'secretario-geral')

VOGAIS
├── Fernando Guntovitch (order: 5, tier: 'vogal')
├── Tomás Froes (order: 6, tier: 'vogal')
├── Nuno Fernandes Thomaz (order: 7, tier: 'vogal')
└── Francisco Teixeira (order: 8, tier: 'vogal')
```

---

## Tipos TypeScript (types/index.ts)

```ts
export type MemberTier = 'presidente' | 'direcao' | 'secretario-geral' | 'vogal'

export interface MemberSeed {
  id: string
  order: number
  tier: MemberTier
  name: string
  role: string
  summary: string
  full: string
  image?: string
}

export interface ContentBlock {
  id: string
  title: string
  summary: string
  full: string
}
```

---

## Componente ExpandableText

```tsx
<ExpandableText
  summary="Texto preview..."
  full="Texto completo..."
  detailHref="/quem-somos"         // opcional
  detailLabel="Ver página completa"
  previewLines={4}                 // default: 4
/>
```

**Comportamento:**
- Preview: `line-clamp-4` com fade no final
- Expand: `max-height` animado com `transition-all duration-500 ease-in-out`
- Se `full` não existir: esconde botão silenciosamente
- `detailHref`: exibe link de navegação para página dedicada

---

## Rotas

| Rota | Página | Status |
|---|---|---|
| `/` | HomePage | Refatorada |
| `/quem-somos` | QuemSomosPage | **Nova** |
| `/administracao` | AdminPage | **Nova** (era /membros) |
| `/membros` | redirect → `/administracao` | — |
| `/parceiros` | ParceirosPage | **Nova** |
| `/membro/:id` | MembroPerfilPage | Mantida |
| `/eventos` | EventosPage | Mantida |
| `/eventos/:id` | EventoDetalhePage | Expandida |
| `/eventos/:id/colaborar` | EventoColaborarPage | Mantida |
| `/precadastro` | PreCadastroPage | Mantida |
| `/login` | LoginPage | Mantida |
| `/cadastro` | CadastroPage | Mantida |
| `/dashboard` | DashboardPage | Mantida |
| `/privacidade` | PrivacyPage | Mantida |
| `/termos` | TermsPage | Mantida |

---

## Páginas — Estrutura de Conteúdo

### HomePage
- Hero com "Cultura e Cooperação" + parallax + search
- Missão resumida (ExpandableText → /quem-somos)
- Mensagem do Presidente (preview + "Ler mais")
- Conselho de Administração (hierarquia visual)
- Parceiros Fundadores (preview → /parceiros)
- CTA final

### QuemSomosPage (nova)
- Hero
- Missão completa (ExpandableText)
- Os 4 Pilares
- Mensagem completa do Presidente
- CTA → /precadastro

### AdminPage (era MembrosPage)
- Hierarquia visual obrigatória: Presidente → Direção → Secretário Geral → Vogais
- Cada membro: foto + resumo + ExpandableText + "Ver perfil →"
- Seções claramente separadas com títulos de tier

### ParceirosPage (nova)
- Hero "Nossa Rede"
- Fundadores (cards com logo + ExpandableText)
- Apoiadores e Parceiros Institucionais

### EventoDetalhePage (expandida)
- Hero full-width
- Descrição completa
- Objetivo + Experiência
- Patrocinadores
- Galeria (estrutura pronta)
- CTA colaborar

---

## UX e Performance

**Lazy loading:** todas as páginas via `React.lazy` + `Suspense`

**Loading states:**
- Página: `<PremiumLoader />`
- Seção: `<Skeleton />`
- Membro sem foto: avatar com iniciais
- Evento sem imagem: placeholder

**Tipografia para textos longos:**
- `font-size: 1rem`, `line-height: 1.75`, `max-width: 65ch`

**Fallback de erro:**
- Supabase falha → seed estático
- Seed vazio → estado vazio elegante (nunca crash)

---

## Proibido

- Remover conteúdo existente
- Simplificar textos institucionais
- Misturar lógica com UI
- Duplicar dados
- Rotas quebradas
