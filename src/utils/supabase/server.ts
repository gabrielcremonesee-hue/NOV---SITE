import { createServerClient, parseCookieHeader, serializeCookieHeader } from '@supabase/ssr';
import { createClient as createJsClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import type { Request, Response } from 'express';
import { normalizeSupabaseProjectUrl } from './url.ts';

const SERVER_SUPABASE_URL_KEYS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'VITE_SUPABASE_URL',
  'SUPABASE_URL',
] as const;

const SERVER_SUPABASE_PUBLIC_KEY_VARS = [
  'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  'VITE_SUPABASE_PUBLISHABLE_KEY',
  'SUPABASE_PUBLISHABLE_KEY',
  'VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY',
  'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY',
  'SUPABASE_PUBLISHABLE_DEFAULT_KEY',
  'VITE_SUPABASE_ANON_KEY',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_ANON_KEY',
  'VITE_SUPABASE_PUBLIC_KEY',
  'SUPABASE_PUBLIC_KEY',
  'VITE_SUPABASE_KEY',
  'SUPABASE_KEY',
] as const;

function firstNonEmptyEnv(keys: readonly string[]): { name: string; value: string } | null {
  for (const name of keys) {
    const val = process.env[name];
    if (typeof val === 'string' && val.trim().length > 0) {
      return { name, value: val.trim() };
    }
  }
  return null;
}

export function getServerSupabaseEnvStatus(): {
  configured: boolean;
  hasUrl: boolean;
  hasKey: boolean;
  matchedUrlVar: string | null;
  matchedKeyVar: string | null;
} {
  const urlMatch = firstNonEmptyEnv(SERVER_SUPABASE_URL_KEYS);
  const url = normalizeSupabaseProjectUrl(urlMatch?.value || '');
  const keyMatch = firstNonEmptyEnv(SERVER_SUPABASE_PUBLIC_KEY_VARS);
  const hasUrl = Boolean(url);
  const hasKey = Boolean(keyMatch?.value);
  return {
    configured: hasUrl && hasKey,
    hasUrl,
    hasKey,
    matchedUrlVar: hasUrl ? urlMatch?.name ?? null : null,
    matchedKeyVar: hasKey ? keyMatch?.name ?? null : null,
  };
}

export function getServerSupabaseEnv(): { url: string; key: string } | null {
  const urlMatch = firstNonEmptyEnv(SERVER_SUPABASE_URL_KEYS);
  const url = normalizeSupabaseProjectUrl(urlMatch?.value || '');
  const keyMatch = firstNonEmptyEnv(SERVER_SUPABASE_PUBLIC_KEY_VARS);
  const key = keyMatch?.value || '';
  if (!url || !key) return null;
  return { url, key };
}

export function createClient(req: Request, res: Response): SupabaseClient | null {
  const env = getServerSupabaseEnv();
  if (!env) return null;

  return createServerClient(env.url, env.key, {
    cookies: {
      getAll() {
        return parseCookieHeader(req.headers.cookie ?? '').map((c) => ({
          name: c.name,
          value: c.value ?? '',
        }));
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          res.append('Set-Cookie', serializeCookieHeader(name, value, options));
        });
      },
    },
  });
}

export function extractBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header || typeof header !== 'string') return null;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match ? match[1].trim() : null;
}

export function createAuthenticatedClient(req: Request, res: Response): {
  supabase: SupabaseClient | null;
  bearerToken: string | null;
} {
  const env = getServerSupabaseEnv();
  if (!env) return { supabase: null, bearerToken: null };

  const bearerToken = extractBearerToken(req);
  if (bearerToken) {
    const supabase = createJsClient(env.url, env.key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        headers: {
          Authorization: `Bearer ${bearerToken}`,
        },
      },
    });
    return { supabase, bearerToken };
  }

  return { supabase: createClient(req, res), bearerToken: null };
}

export async function resolveAuthenticatedSupabaseUser(
  req: Request,
  res: Response
): Promise<{ supabase: SupabaseClient; user: User } | null> {
  const { supabase, bearerToken } = createAuthenticatedClient(req, res);
  if (!supabase) return null;

  try {
    const { data, error } = bearerToken
      ? await supabase.auth.getUser(bearerToken)
      : await supabase.auth.getUser();
    if (error || !data?.user) return null;
    return { supabase, user: data.user };
  } catch {
    return null;
  }
}

let cachedServiceRoleClient: { url: string; key: string; client: SupabaseClient } | null = null;

/**
 * Cliente Supabase com service_role estritamente server-side.
 * Nunca utiliza variáveis VITE_* para a chave privilegiada e retorna null se não configurada.
 */
export function getServiceRoleSupabaseClient(): SupabaseClient | null {
  const urlMatch = firstNonEmptyEnv(SERVER_SUPABASE_URL_KEYS);
  const url = normalizeSupabaseProjectUrl(urlMatch?.value || '');
  const serviceKey =
    (typeof process.env.SUPABASE_SERVICE_ROLE_KEY === 'string' &&
      process.env.SUPABASE_SERVICE_ROLE_KEY.trim()) ||
    (typeof process.env.SUPABASE_SECRET_KEY === 'string' &&
      process.env.SUPABASE_SECRET_KEY.trim()) ||
    '';
  if (!url || !serviceKey) return null;

  if (
    cachedServiceRoleClient &&
    cachedServiceRoleClient.url === url &&
    cachedServiceRoleClient.key === serviceKey
  ) {
    return cachedServiceRoleClient.client;
  }

  const client = createJsClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
  cachedServiceRoleClient = { url, key: serviceKey, client };
  return client;
}

