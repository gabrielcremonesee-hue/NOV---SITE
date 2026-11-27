import { createClient as createSupabaseJsClient, type SupabaseClient, type SupportedStorage } from '@supabase/supabase-js';
import { normalizeSupabaseProjectUrl } from './url';

let cachedClient: SupabaseClient | null = null;
let runtimeEnvOverride: { url: string; key: string } | null = null;
let runtimeInitPromise: Promise<boolean> | null = null;
const memoryFallbackStorage = new Map<string, string>();

function createResilientStorage(): SupportedStorage {
  const canUse = (store: Storage | undefined): store is Storage => {
    if (!store) return false;
    try {
      const probe = '__fervec_storage_probe__';
      store.setItem(probe, '1');
      store.removeItem(probe);
      return true;
    } catch {
      return false;
    }
  };

  return {
    getItem(key: string): string | null {
      if (typeof window !== 'undefined') {
        if (canUse(window.localStorage)) return window.localStorage.getItem(key);
        if (canUse(window.sessionStorage)) return window.sessionStorage.getItem(key);
      }
      return memoryFallbackStorage.get(key) ?? null;
    },
    setItem(key: string, value: string): void {
      if (typeof window !== 'undefined') {
        if (canUse(window.localStorage)) {
          window.localStorage.setItem(key, value);
          return;
        }
        if (canUse(window.sessionStorage)) {
          window.sessionStorage.setItem(key, value);
          return;
        }
      }
      memoryFallbackStorage.set(key, value);
    },
    removeItem(key: string): void {
      if (typeof window !== 'undefined') {
        if (canUse(window.localStorage)) {
          window.localStorage.removeItem(key);
          return;
        }
        if (canUse(window.sessionStorage)) {
          window.sessionStorage.removeItem(key);
          return;
        }
      }
      memoryFallbackStorage.delete(key);
    },
  };
}

function readClientEnv(): { url: string; key: string } {
  const env = (import.meta as { env?: Record<string, string | undefined> }).env ?? {};
  const rawUrl = (
    env.VITE_SUPABASE_URL ||
    env.NEXT_PUBLIC_SUPABASE_URL ||
    runtimeEnvOverride?.url ||
    ''
  ).trim();
  const url = normalizeSupabaseProjectUrl(rawUrl);
  const key = (
    env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY ||
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ||
    env.VITE_SUPABASE_ANON_KEY ||
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    env.VITE_SUPABASE_PUBLIC_KEY ||
    env.VITE_SUPABASE_KEY ||
    runtimeEnvOverride?.key ||
    ''
  ).trim();
  return { url, key };
}

export async function initSupabaseRuntimeConfig(): Promise<boolean> {
  if (isSupabaseConfigured()) return true;
  if (typeof window === 'undefined' || typeof fetch !== 'function') return false;
  if (runtimeInitPromise) return runtimeInitPromise;

  runtimeInitPromise = (async () => {
    try {
      const res = await fetch('/api/supabase/config', { credentials: 'include' });
      if (!res.ok) return false;
      const data = (await res.json()) as {
        configured?: boolean;
        url?: string;
        publishableKey?: string;
      };
      if (data?.configured && data.url && data.publishableKey) {
        runtimeEnvOverride = {
          url: normalizeSupabaseProjectUrl(String(data.url)),
          key: String(data.publishableKey).trim(),
        };
        cachedClient = null;
        return true;
      }
      runtimeInitPromise = null;
      return false;
    } catch {
      runtimeInitPromise = null;
      return false;
    }
  })();

  return runtimeInitPromise;
}

export function isSupabaseConfigured(): boolean {
  const { url, key } = readClientEnv();
  return Boolean(url && key);
}

export function getSupabaseConnectionInfo(): { url: string; key: string } | null {
  const { url, key } = readClientEnv();
  if (!url || !key) return null;
  return { url: url.replace(/\/+$/, ''), key };
}

export function createClient(): SupabaseClient {
  const { url, key } = readClientEnv();
  if (!url || !key) {
    throw new Error(
      'Supabase não configurado: defina VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY.'
    );
  }
  return createSupabaseJsClient(url, key, {
    auth: {
      storageKey: 'fervec-supabase-auth',
      storage: createResilientStorage(),
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
}

export function getSupabaseClient(): SupabaseClient | null {
  if (typeof window === 'undefined' || !isSupabaseConfigured()) {
    return null;
  }
  if (!cachedClient) {
    cachedClient = createClient();
  }
  return cachedClient;
}
