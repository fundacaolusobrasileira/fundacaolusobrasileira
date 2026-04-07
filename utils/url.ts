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
