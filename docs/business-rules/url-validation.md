# URL Validation

## Overview
All user-supplied URLs that are persisted or rendered must pass through `isSafeHttpUrl` before use.
This prevents XSS via `javascript:`, `data:`, and other non-HTTP schemes.

## Rules
- Allowed schemes: `http:`, `https:` only.
- Leading or trailing whitespace is rejected (would bypass `new URL()` parsing in some runtimes).
- Blocked schemes: `javascript:`, `data:`, `file:`, `ftp:`, and anything else.
- Malformed strings (not parseable as URL) are rejected.

## Where it is enforced

| Location | How |
|----------|-----|
| `utils/url.ts` — `isSafeHttpUrl(input)` | Single source of truth |
| `services/events.service.ts` — `addUrlMediaToEvent` | Called before adding URL to gallery |
| `services/community-media.service.ts` — `submitCommunityMedia` | Called before insert |

## What is NOT enforced here
- File upload URLs (blob/object URLs) — those are generated internally by `media.service.ts` and never come from user input.
- Internal navigation links — handled by React Router, not this helper.

## Changed: 2026-04-24
- Created. Consolidated `isValidUrl` (events) and inline try/catch (community-media) into shared `isSafeHttpUrl` in `utils/url.ts`.
