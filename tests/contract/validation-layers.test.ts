// tests/contract/validation-layers.test.ts
// Phase 4.1 — Validation in layers: invalid inputs rejected consistently at Zod level.
// Ensures that page-level Zod schemas === service-level Zod schemas for the same domain.
//
// Unit: schema parse behavior for each bad input (pure function, no side effects)
// Integration: N/A — contract tests are by definition schema-only
// E2E: smoke.spec.ts + per-feature specs cover the UI layer

import { describe, it, expect } from 'vitest';
// Note: CreatePreCadastroSchema and EventSchema are currently private to their service files.
// Phase 4 refactor TODO: move them to validation/schemas.ts for true layer consistency.
import {
  LoginSchema,
  CadastroSchema,
  PreCadastroSchema,
  BenefitSchema,
  MediaUploadSchema,
} from '../../validation/schemas';

// Helper — returns the first Zod error message or undefined if valid
const firstError = (schema: { safeParse: (v: unknown) => { success: boolean; error?: { issues: { message: string }[] } } }, value: unknown): string | undefined => {
  const result = schema.safeParse(value);
  return result.success ? undefined : result.error?.issues[0]?.message;
};

const makeFile = (name: string, type: string, sizeBytes: number) =>
  Object.defineProperty(new File(['x'], name, { type }), 'size', { value: sizeBytes });

// ============================================================================
// LoginSchema
// ============================================================================
describe('LoginSchema — invalid inputs', () => {
  const cases: [string, unknown][] = [
    ['empty email',    { email: '',               password: 'valid123' }],
    ['invalid email',  { email: 'not-an-email',   password: 'valid123' }],
    ['empty password', { email: 'a@b.com',         password: '' }],
  ];

  for (const [label, input] of cases) {
    it(`rejects: ${label}`, () => {
      expect(firstError(LoginSchema, input)).toBeTruthy();
    });
  }

  it('accepts valid credentials', () => {
    expect(firstError(LoginSchema, { email: 'user@test.com', password: 'pass123' })).toBeUndefined();
  });
});

// ============================================================================
// CadastroSchema
// ============================================================================
describe('CadastroSchema — invalid inputs', () => {
  const BASE = { email: 'a@b.com', password: 'pass1234', name: 'Test User', type: 'individual' };

  const cases: [string, unknown][] = [
    ['password < 8 chars', { ...BASE, password: '1234567' }],
    ['name < 2 chars',     { ...BASE, name: 'A' }],
    ['invalid type enum',  { ...BASE, type: 'unknown' }],
    ['invalid email',      { ...BASE, email: 'bad' }],
  ];

  for (const [label, input] of cases) {
    it(`rejects: ${label}`, () => {
      expect(firstError(CadastroSchema, input)).toBeTruthy();
    });
  }

  it('accepts valid cadastro', () => {
    expect(firstError(CadastroSchema, BASE)).toBeUndefined();
  });
});

// ============================================================================
// PreCadastroSchema (public contact form)
// ============================================================================
describe('PreCadastroSchema — invalid inputs', () => {
  const BASE = {
    name: 'Test User', email: 'a@b.com', message: 'Hello',
    registrationType: 'membro', type: 'individual',
  };

  const cases: [string, unknown][] = [
    ['empty name',       { ...BASE, name: '' }],
    ['name too short',   { ...BASE, name: 'A' }],
    ['invalid email',    { ...BASE, email: 'bad-email' }],
    ['message too long', { ...BASE, message: 'x'.repeat(1001) }],
    ['invalid type enum',{ ...BASE, registrationType: 'unknown' }],
  ];

  for (const [label, input] of cases) {
    it(`rejects: ${label}`, () => {
      expect(firstError(PreCadastroSchema, input)).toBeTruthy();
    });
  }

  it('accepts valid pre-cadastro', () => {
    expect(firstError(PreCadastroSchema, BASE)).toBeUndefined();
  });
});

// ============================================================================
// BenefitSchema
// ============================================================================
describe('BenefitSchema — invalid inputs', () => {
  const BASE = {
    partner_id: '550e8400-e29b-41d4-a716-446655440000',
    title: 'Test',
    category: 'desconto',
    active: true,
    order: 0,
  };

  const cases: [string, unknown][] = [
    ['invalid UUID',       { ...BASE, partner_id: 'not-a-uuid' }],
    ['empty title',        { ...BASE, title: '' }],
    ['invalid category',   { ...BASE, category: 'unknown' }],
    ['negative order',     { ...BASE, order: -1 }],
    ['javascript: link',   { ...BASE, link: 'javascript:alert(1)' }],
    ['ftp: link',          { ...BASE, link: 'ftp://files.example.com' }],
  ];

  for (const [label, input] of cases) {
    it(`rejects: ${label}`, () => {
      expect(firstError(BenefitSchema, input)).toBeTruthy();
    });
  }

  it('accepts valid benefit', () => {
    expect(firstError(BenefitSchema, BASE)).toBeUndefined();
  });

  it('accepts benefit with https link', () => {
    expect(firstError(BenefitSchema, { ...BASE, link: 'https://partner.com/discount' })).toBeUndefined();
  });
});

// ============================================================================
// MediaUploadSchema
// ============================================================================
describe('MediaUploadSchema — invalid inputs', () => {
  it('rejects file > 5MB', () => {
    expect(firstError(MediaUploadSchema, makeFile('big.jpg', 'image/jpeg', 5 * 1024 * 1024 + 1))).toBeTruthy();
  });

  // BUG 5 FIX: schema now accepts gif/pdf to align with storage RLS.
  // Test the rejection of a genuinely unsupported MIME instead.
  it('rejects unsupported MIME (zip)', () => {
    expect(firstError(MediaUploadSchema, makeFile('a.zip', 'application/zip', 100))).toBeTruthy();
  });

  it('rejects unsupported MIME (executable)', () => {
    expect(firstError(MediaUploadSchema, makeFile('virus.exe', 'application/x-msdownload', 100))).toBeTruthy();
  });

  it('accepts jpeg under 5MB', () => {
    expect(firstError(MediaUploadSchema, makeFile('ok.jpg', 'image/jpeg', 1024))).toBeUndefined();
  });
});
