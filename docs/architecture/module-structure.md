# Module Structure

## Overview
Architecture of the Fundacao Luso-Brasileira web application (React + Vite + Supabase).

## Module Organization

### App.tsx
- React root component only
- Auth state listener (`onAuthStateChange`) with HMR cleanup
- Initial data sync (`syncFromSupabase`)

### store/app.store.ts
- Global state: `AUTH_SESSION`, `AUTH_LOADING`, `EVENTS`, `PARTNERS`, `PRECADASTROS`, etc.
- State mutators: `setAuthSession`, `setAuthLoading`, `notifyState`
- Utility: `isEditor`, `showToast`, `generateId`, `logActivity`

### services/
| Service | Responsibility |
|---------|---------------|
| `auth.service.ts` | `loginAsEditor`, `logout`, `signUp`, `resolveUserRole` |
| `events.service.ts` | CRUD events + gallery media helpers |
| `members.service.ts` | CRUD partners/members |
| `precadastros.service.ts` | CRUD pre-registrations + `subscribeToNewsletter` |
| `community-media.service.ts` | Community media submissions (persisted to Supabase) |
| `media.service.ts` | Supabase storage upload/delete + `resolveGalleryItemSrc` |

### hooks/
| Hook | Purpose |
|------|---------|
| `useAuthSession` | Reactive auth state with `authLoading` flag + HMR safety timeout |
| `useDebounce` | Generic debounce |
| `useFeedback` | Toast notification helpers |
| `usePageMeta` | Page title and meta description |

### types/index.ts
All TypeScript interfaces and types (Event, Partner, PreCadastro, etc.)

### data/
Static seed data for members, partners, events, and content blocks.

## snake_case Mapping Convention

Database uses `snake_case`, frontend uses `camelCase`. Each service has a `normalize` function that converts on SELECT, and `payload` builders that convert on INSERT/UPDATE.

| Frontend | Database |
|----------|----------|
| `coverImage` | `cover_image` |
| `socialLinks` | `social_links` |
| `descriptionShort` | `description_short` |
| `endDate` | `end_date` |
| `endTime` | `end_time` |
| `cardImage` | `card_image` |
| `createdAt` | `created_at` |
| `eventId` | `event_id` |
| `authorName` | `author_name` |

## Changed: 2026-03-30
- Refactored App.tsx monolith into modular services
- Created `auth.service.ts` for authentication
- Completed `precadastros.service.ts` with full CRUD
- Fixed snake_case mapping for events (6 fields were missing)
- Added Supabase persistence for community media submissions
- Added `AUTH_LOADING` state to prevent redirect race conditions
- Added HMR cleanup for auth listener
