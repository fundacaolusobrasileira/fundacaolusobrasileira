// utils/url.test.ts
// Unit tests for isSafeHttpUrl helper.
// Integration: SKIPPED — pure function, covered via service tests that call it.
// E2E: SKIPPED — covered indirectly by community-media E2E (Phase 3).
import { describe, it, expect } from 'vitest';
import { isSafeHttpUrl } from './url';

describe('isSafeHttpUrl', () => {
  it('accepts a valid http URL', () => {
    expect(isSafeHttpUrl('http://example.com')).toBe(true);
  });

  it('accepts a valid https URL', () => {
    expect(isSafeHttpUrl('https://example.com/path?q=1')).toBe(true);
  });

  it('accepts https URL with query string', () => {
    expect(isSafeHttpUrl('https://cdn.example.com/img.jpg?v=2&size=large')).toBe(true);
  });

  it('accepts localhost http URL', () => {
    expect(isSafeHttpUrl('http://localhost:3000/api')).toBe(true);
  });

  it('accepts IP address URL', () => {
    expect(isSafeHttpUrl('http://192.168.1.1/resource')).toBe(true);
  });

  it('accepts IDN (internationalized domain)', () => {
    expect(isSafeHttpUrl('https://münchen.de/page')).toBe(true);
  });

  it('rejects empty string', () => {
    expect(isSafeHttpUrl('')).toBe(false);
  });

  it('rejects javascript: scheme', () => {
    expect(isSafeHttpUrl('javascript:alert(1)')).toBe(false);
  });

  it('rejects data: scheme', () => {
    expect(isSafeHttpUrl('data:text/html,<h1>xss</h1>')).toBe(false);
  });

  it('rejects file: scheme', () => {
    expect(isSafeHttpUrl('file:///etc/passwd')).toBe(false);
  });

  it('rejects ftp: scheme', () => {
    expect(isSafeHttpUrl('ftp://files.example.com/archive.zip')).toBe(false);
  });

  it('rejects malformed string (no scheme)', () => {
    expect(isSafeHttpUrl('not a url at all')).toBe(false);
  });

  it('rejects URL with leading/trailing spaces', () => {
    expect(isSafeHttpUrl('  https://example.com  ')).toBe(false);
  });
});

// resolveLink — used in benefit cards & member profiles to detect URLs that
// point to the app itself (saved with a previous domain like Vercel preview)
// and convert them to internal paths. Prevents breaking links when content
// is migrated across domains or when admin saves "https://my-app/foo" instead
// of just "/foo".
import { resolveLink } from './url';

describe('resolveLink', () => {
  it('returns null for empty/invalid input', () => {
    expect(resolveLink('')).toBeNull();
    expect(resolveLink(null)).toBeNull();
    expect(resolveLink(undefined)).toBeNull();
    expect(resolveLink('javascript:alert(1)')).toBeNull();
  });

  it('treats a path-only string as internal', () => {
    expect(resolveLink('/legaltech-space')).toEqual({ href: '/legaltech-space', isExternal: false });
  });

  it('treats absolute URL on a different host as external', () => {
    expect(resolveLink('https://stripe.com/discount')).toEqual({
      href: 'https://stripe.com/discount',
      isExternal: true,
    });
  });

  it('rewrites an absolute URL on a *.vercel.app host to a relative path', () => {
    const result = resolveLink('https://flb-preview.vercel.app/legaltech-space');
    expect(result).toEqual({ href: '/legaltech-space', isExternal: false });
  });

  it('rewrites a URL on the current location.hostname to a relative path', () => {
    const result = resolveLink(`${window.location.origin}/parceiros/legaltech`);
    expect(result).toEqual({ href: '/parceiros/legaltech', isExternal: false });
  });

  it('preserves query string and hash for internal rewrites', () => {
    const result = resolveLink('https://flb.vercel.app/eventos/abc?tab=galeria#fotos');
    expect(result).toEqual({ href: '/eventos/abc?tab=galeria#fotos', isExternal: false });
  });

  // HashRouter URL: app uses /#/route format. When the meaningful route is in
  // the hash (pathname is just "/"), extract it instead of producing /#/route
  // which would render as #/#/route (double hash) once Link prefixes it.
  it('extracts route from hash when pathname is "/" (HashRouter format)', () => {
    const result = resolveLink('https://flb.vercel.app/#/legaltech-space');
    expect(result).toEqual({ href: '/legaltech-space', isExternal: false });
  });

  it('handles HashRouter URL with query string in hash', () => {
    const result = resolveLink('https://flb.vercel.app/#/eventos/abc?tab=galeria');
    expect(result).toEqual({ href: '/eventos/abc?tab=galeria', isExternal: false });
  });

  it('treats hash-only path string ("#/foo") as internal route', () => {
    const result = resolveLink('#/legaltech-space');
    expect(result).toEqual({ href: '/legaltech-space', isExternal: false });
  });
});
