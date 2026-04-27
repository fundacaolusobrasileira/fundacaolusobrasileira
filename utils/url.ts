// utils/url.ts
// Returns the URL only if it's safe (http/https). Blocks javascript:, data:, etc.
export const safeUrl = (url: string | undefined | null): string | undefined => {
  if (!url) return undefined;
  try {
    const { protocol } = new URL(url);
    return protocol === 'http:' || protocol === 'https:' ? url : undefined;
  } catch {
    return undefined;
  }
};

// Returns true only for http/https URLs with no surrounding whitespace.
// Blocks javascript:, data:, file:, ftp:, and malformed strings.
export const isSafeHttpUrl = (input: string): boolean => {
  if (input !== input.trim()) return false;
  try {
    const { protocol } = new URL(input);
    return protocol === 'http:' || protocol === 'https:';
  } catch {
    return false;
  }
};

// Hosts considered "internal" — links pointing to these are rewritten to
// relative paths so they navigate within the SPA instead of leaving it.
// Add new staging/production hostnames here as deployments evolve.
const INTERNAL_HOST_PATTERNS: RegExp[] = [
  /\.vercel\.app$/i,
  /^fundacaolusobrasileira\./i,
  /^flb\./i,
];

const isInternalHost = (hostname: string): boolean => {
  if (typeof window !== 'undefined' && hostname === window.location.hostname) return true;
  return INTERNAL_HOST_PATTERNS.some(re => re.test(hostname));
};

// Resolves a benefit/profile link into either an internal SPA path or an
// external URL. Returns null when the input is invalid or unsafe (blocks
// javascript:, data:, etc.). Used by `BeneficiosPage` and `MembroPerfilPage`
// to render either a react-router <Link> or an <a target="_blank"> safely.
export const resolveLink = (
  input: string | null | undefined,
): { href: string; isExternal: boolean } | null => {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Hash-only path ("#/legaltech-space") — HashRouter shorthand → internal
  if (trimmed.startsWith('#/')) {
    return { href: trimmed.slice(1), isExternal: false };
  }

  // Path-only string ("/legaltech-space") → internal
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
    return { href: trimmed, isExternal: false };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;

  if (isInternalHost(parsed.hostname)) {
    // HashRouter URL: meaningful route is in the hash, not the pathname.
    // e.g. https://flb.vercel.app/#/legaltech-space → /legaltech-space
    if (parsed.pathname === '/' && parsed.hash.startsWith('#/')) {
      return { href: parsed.hash.slice(1), isExternal: false };
    }
    const relative = `${parsed.pathname}${parsed.search}${parsed.hash}` || '/';
    return { href: relative, isExternal: false };
  }
  return { href: trimmed, isExternal: true };
};
