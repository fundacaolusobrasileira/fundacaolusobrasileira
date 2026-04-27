# Database Schema — Supabase

## Overview
PostgreSQL database hosted on Supabase. All tables use UUID primary keys with `uuid_generate_v4()`.

## Tables

### profiles
User accounts linked to Supabase Auth.

| Column | Type | Nullable | Default | Constraint |
|--------|------|----------|---------|------------|
| id | uuid | NO | uuid_generate_v4() | PK |
| user_id | uuid | NO | — | UNIQUE, FK → auth.users |
| name | text | NO | — | |
| email | text | NO | — | |
| type | text | NO | 'individual' | |
| role | text | NO | 'membro' | CHECK: 'admin', 'editor', 'membro' |
| created_at | timestamptz | NO | now() | |
| updated_at | timestamptz | NO | now() | auto-trigger |

**RLS:** Users can only read/update their own profile. Auto-created on signup via trigger.

---

### partners
Members, partners, board members, and organizations.

| Column | Type | Nullable | Default | Constraint |
|--------|------|----------|---------|------------|
| id | uuid | NO | uuid_generate_v4() | PK |
| name | text | NO | 'Novo Membro' | CHECK: length |
| type | text | NO | 'pessoa' | CHECK: 'pessoa', 'empresa' |
| category | text | NO | 'Parceiro Silver' | CHECK: 'Parceiro Platinum', 'Parceiro Gold', 'Parceiro Silver', 'Apoio Público', 'Outro Apoio', 'Exposição', 'Governança' |
| role | text | YES | — | Position/title |
| bio | text | YES | — | |
| summary | text | YES | — | |
| full | text | YES | — | Reserved word, use quotes |
| image | text | YES | — | URL |
| avatar | text | YES | — | URL |
| country | text | YES | — | |
| website | text | YES | — | URL |
| social_links | jsonb | YES | '{}' | `{ youtube?, linkedin?, twitter?, facebook?, instagram? }` |
| tags | text[] | YES | — | |
| tier | text | YES | — | 'presidente', 'direcao', 'secretario-geral', 'vogal' |
| since | text | YES | — | Year or date string |
| active | boolean | NO | true | |
| featured | boolean | NO | false | |
| order | integer | YES | — | Reserved word, use quotes |
| created_at | timestamptz | NO | now() | |
| updated_at | timestamptz | NO | now() | auto-trigger |

**RLS:** Public read. Authenticated users can insert/update/delete.

**camelCase mapping:** `social_links` → `socialLinks`

---

### events
Events and agenda.

| Column | Type | Nullable | Default | Constraint |
|--------|------|----------|---------|------------|
| id | uuid | NO | uuid_generate_v4() | PK |
| title | text | NO | 'Novo Evento' | CHECK: length |
| subtitle | text | YES | — | |
| description | text | YES | — | |
| description_short | text | YES | — | |
| objective | text | YES | — | |
| experience | text | YES | — | |
| sponsors | text | YES | — | |
| date | text | YES | — | e.g. '2024-11-15' |
| time | text | YES | — | e.g. '19:00' |
| end_date | text | YES | — | |
| end_time | text | YES | — | |
| location | text | YES | — | |
| address | text | YES | — | |
| city | text | YES | — | |
| country | text | YES | — | |
| category | text | NO | 'Outros' | CHECK: '33 Anos', 'Fundação', 'Embaixada', 'Outros' |
| tags | text[] | YES | — | |
| image | text | YES | — | Main display image |
| cover_image | text | YES | — | Hero image |
| card_image | text | YES | — | Card thumbnail |
| gallery | jsonb | YES | '[]' | Array of GalleryItem |
| links | jsonb | YES | '{}' | `{ registration?, website?, linkLabel? }` |
| social_links | jsonb | YES | '{}' | `{ youtube?, linkedin?, ... }` |
| status | text | NO | 'draft' | CHECK: 'draft', 'published' |
| featured | boolean | NO | false | |
| notes | text | YES | — | Internal editor notes |
| created_at | timestamptz | NO | now() | |
| updated_at | timestamptz | NO | now() | auto-trigger |

**RLS:** Public read for published. Authenticated users can CRUD all.

**camelCase mapping:** `cover_image` → `coverImage`, `social_links` → `socialLinks`, `description_short` → `descriptionShort`, `end_date` → `endDate`, `end_time` → `endTime`, `card_image` → `cardImage`

---

### precadastros
Public pre-registration / interest form.

| Column | Type | Nullable | Default | Constraint |
|--------|------|----------|---------|------------|
| id | uuid | NO | uuid_generate_v4() | PK |
| name | text | NO | — | CHECK: length |
| email | text | NO | — | CHECK: email format |
| type | text | NO | 'individual' | 'individual', 'empresarial', 'academico', 'newsletter' |
| registrationType | text | YES | — | CHECK: 'membro', 'parceiro', 'colaborador', 'embaixador'. **Note: camelCase column name with quotes** |
| message | text | YES | — | |
| status | text | NO | 'novo' | CHECK: 'novo', 'contatado', 'aprovado', 'rejeitado', 'convertido' |
| notes | text | YES | — | |
| created_at | timestamptz | NO | now() | |
| updated_at | timestamptz | NO | now() | auto-trigger |

**RLS:** Public insert. Authenticated read/update/delete.

**camelCase mapping:** `created_at` → `createdAt`. Note: `registrationType` is already camelCase in DB.

---

### community_media_submissions
Community-submitted media for events (pending approval).

| Column | Type | Nullable | Default | Constraint |
|--------|------|----------|---------|------------|
| id | uuid | NO | uuid_generate_v4() | PK |
| event_id | uuid | NO | — | FK → events.id ON DELETE CASCADE |
| type | text | NO | 'image' | CHECK: 'image', 'video' |
| url | text | NO | — | CHECK: not empty |
| author_name | text | NO | — | CHECK: length |
| email | text | NO | — | CHECK: email format |
| message | text | YES | — | |
| status | text | NO | 'pending' | CHECK: 'pending', 'approved', 'rejected' |
| user_id | uuid | YES | — | Submitting user (nullable for anonymous) |
| created_at | timestamptz | NO | now() | |

**RLS:** Public insert. Authenticated read/update/delete.

**camelCase mapping:** `event_id` → `eventId`, `author_name` → `authorName`, `created_at` → `createdAt`

---

## GalleryItem (JSONB in events.gallery)

```json
{
  "id": "media-uuid",
  "kind": "image | video",
  "srcType": "url",
  "url": "https://...",
  "caption": "...",
  "authorName": "...",
  "email": "...",
  "source": "oficial | comunidade",
  "status": "published | pending | rejected",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "order": 0
}
```

### activity_logs
Audit trail for admin actions. Persisted to survive page reloads.

| Column | Type | Nullable | Default | Constraint |
|--------|------|----------|---------|------------|
| id | uuid | NO | uuid_generate_v4() | PK |
| action | text | NO | — | e.g. 'Criou evento', 'Login' |
| target | text | NO | — | e.g. event title, email |
| user_name | text | YES | — | Display name at time of action |
| user_id | uuid | YES | — | Auth user ID |
| created_at | timestamptz | NO | now() | |

**RLS:** Authenticated read + insert.

**camelCase mapping:** `user_name` → `user`, `created_at` → `timestamp`

---

## activity_logs
Append-only audit trail of editor/admin actions. Created in migration `20260425_activity_logs.sql`.

| Column | Type | Nullable | Default | Constraint |
|--------|------|----------|---------|------------|
| id | uuid | NO | uuid_generate_v4() | PK |
| action | text | NO | — | |
| target | text | NO | — | |
| user_name | text | YES | — | |
| user_id | uuid | YES | — | FK → auth.users ON DELETE SET NULL |
| created_at | timestamptz | NO | now() | INDEX DESC |

**RLS:**
- SELECT: `is_editor()` only
- INSERT: authenticated users, `user_id = auth.uid()`
- UPDATE/DELETE: none (append-only)

---

## Changed: 2026-03-30
- Initial schema documentation from live database inspection
- Fixed partners.category DEFAULT from 'Parceiro' to 'Parceiro Silver'
- Added user_id to community_media_submissions payload

## Changed: 2026-04-25
- `activity_logs` table added (migration `20260425_activity_logs.sql`)
- `persistLogEntry` now returns `{ ok: boolean; error?: string }` instead of void
