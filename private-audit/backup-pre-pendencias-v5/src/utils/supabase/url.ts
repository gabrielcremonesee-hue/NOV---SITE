const SUPABASE_SERVICE_PATH_PREFIXES = [
  '/rest/v1',
  '/auth/v1',
  '/functions/v1',
  '/storage/v1',
  '/realtime/v1',
  '/graphql/v1',
];

export function normalizeSupabaseProjectUrl(rawUrl: string): string {
  const trimmed = String(rawUrl || '').trim();
  if (!trimmed) return '';

  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname.toLowerCase();
    if (host.endsWith('.supabase.co') || host.endsWith('.supabase.in')) {
      return parsed.origin;
    }

    const pathname = parsed.pathname.replace(/\/+$/, '');
    const matchedPrefix = SUPABASE_SERVICE_PATH_PREFIXES.find(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
    );
    if (matchedPrefix) {
      return parsed.origin;
    }

    return trimmed.replace(/\/+$/, '');
  } catch {
    return trimmed
      .replace(/\/+(rest|auth|functions|storage|realtime|graphql)\/v1(\/.*)?$/i, '')
      .replace(/\/+$/, '');
  }
}
