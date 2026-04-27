# Benefits — Validation Rules

## Overview
Benefits are perks offered by partners to foundation members.
`createBenefit` and `updateBenefit` now validate via `BenefitSchema` before reaching Supabase.

## BenefitSchema (validation/schemas.ts)

| Field | Rule |
|-------|------|
| `partner_id` | Required, valid UUID |
| `title` | Required, 1–200 chars |
| `description` | Optional, max 1000 chars |
| `category` | Required, enum: `desconto`, `acesso`, `serviço`, `outro` |
| `link` | Optional, if present must be `http(s)://` URL (via `isSafeHttpUrl`) |
| `active` | Required boolean |
| `order` | Required integer ≥ 0 |

## Where enforced

- `services/benefits.service.ts` — `createBenefit`: full schema parse before insert.
- `services/benefits.service.ts` — `updateBenefit`: partial schema parse before update.
- Error message surfaced via `showToast` using `issues[0]?.message` (Zod v4 pattern).

## Changed: 2026-04-25
- Created. `BenefitSchema` added to `validation/schemas.ts`.
- Service previously had no client-side validation (relied solely on RLS).
