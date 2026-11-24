import {
  getSupabaseClient,
  getSupabaseConnectionInfo,
  initSupabaseRuntimeConfig,
  isSupabaseConfigured,
} from './client';
import { normalizeSupabaseProjectUrl } from './url';

export type DiagnosticEnvSource = 'import.meta.env' | 'runtime_api' | 'server_env' | 'missing';

export type SupabaseDiagnosticCode =
  | 'ready'
  | 'missing_anon_key'
  | 'missing_url'
  | 'unconfigured'
  | 'client_init_error'
  | 'connection_error';

export interface SupabaseVarDiagnostic {
  name: 'VITE_SUPABASE_URL' | 'VITE_SUPABASE_ANON_KEY' | 'VITE_SUPABASE_PUBLISHABLE_KEY';
  loaded: boolean;
  source: DiagnosticEnvSource;
  summary: string;
}

export interface ServerHealthProbeResult {
  reachable: boolean;
  httpStatus: number | null;
  configured: boolean;
  hasUrl: boolean | null;
  hasKey: boolean | null;
  matchedUrlVar: string | null;
  matchedKeyVar: string | null;
  authenticated: boolean | null;
  error: string | null;
}

export interface SupabaseEndpointProbeResult {
  attempted: boolean;
  reachable: boolean;
  httpStatus: number | null;
  latencyMs: number | null;
  error: string | null;
}

export interface SupabaseDiagnosticReport {
  checkedAt: string;
  status: SupabaseDiagnosticCode;
  ok: boolean;
  summaryMessage: string;
  actionHint: string | null;
  variables: SupabaseVarDiagnostic[];
  effectiveConnection: {
    configured: boolean;
    source: 'import.meta.env' | 'runtime_api' | 'none';
    urlOrigin: string | null;
    keyFormat: 'jwt_anon' | 'sb_publishable' | 'custom' | 'missing';
    keyLength: number | null;
  };
  client: {
    initialized: boolean;
    error: string | null;
  };
  serverHealth: ServerHealthProbeResult;
  supabaseReachability: SupabaseEndpointProbeResult;
}

export interface RunSupabaseDiagnosticsDeps {
  importMetaEnv?: Record<string, string | undefined>;
  fetchFn?: typeof fetch;
  initRuntimeConfig?: () => Promise<boolean>;
  isConfigured?: () => boolean;
  getConnectionInfo?: () => { url: string; key: string } | null;
  getClient?: () => unknown | null;
  now?: () => Date;
  origin?: string;
}

function maskUrlToOrigin(rawUrl: string): string | null {
  const normalized = normalizeSupabaseProjectUrl(rawUrl);
  if (!normalized) return null;
  try {
    const parsed = new URL(normalized);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null;
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return null;
  }
}

export function classifySupabaseKeyFormat(
  rawKey: string | null | undefined
): 'jwt_anon' | 'sb_publishable' | 'custom' | 'missing' {
  const trimmed = typeof rawKey === 'string' ? rawKey.trim() : '';
  if (!trimmed) return 'missing';
  if (trimmed.startsWith('sb_publishable_')) return 'sb_publishable';
  const jwtParts = trimmed.split('.');
  if (trimmed.startsWith('eyJ') && jwtParts.length === 3 && jwtParts.every((p) => p.length > 0)) {
    return 'jwt_anon';
  }
  return 'custom';
}

function describeKeySafe(rawKey: string | undefined, source: DiagnosticEnvSource): string {
  const trimmed = typeof rawKey === 'string' ? rawKey.trim() : '';
  if (!trimmed) {
    return source === 'runtime_api'
      ? 'Carregada em runtime (/api/supabase/config)'
      : 'Ausente';
  }
  const fmt = classifySupabaseKeyFormat(trimmed);
  const fmtLabel =
    fmt === 'jwt_anon' ? 'JWT anon' : fmt === 'sb_publishable' ? 'Publishable' : 'Personalizada';
  return `Disponível (${trimmed.length} caracteres · ${fmtLabel})`;
}

async function probeServerSupabaseHealth(
  fetchImpl: typeof fetch,
  baseOrigin: string
): Promise<ServerHealthProbeResult> {
  const healthUrl = baseOrigin ? `${baseOrigin.replace(/\/+$/, '')}/api/supabase/health` : '/api/supabase/health';
  try {
    const res = await fetchImpl(healthUrl, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      credentials: 'include',
    });
    const data = (await res.json().catch(() => null)) as {
      configured?: boolean;
      hasUrl?: boolean;
      hasKey?: boolean;
      matchedUrlVar?: string | null;
      matchedKeyVar?: string | null;
      authenticated?: boolean;
    } | null;

    if (!res.ok || !data) {
      return {
        reachable: false,
        httpStatus: res.status,
        configured: false,
        hasUrl: null,
        hasKey: null,
        matchedUrlVar: null,
        matchedKeyVar: null,
        authenticated: null,
        error: `HTTP ${res.status} ao consultar /api/supabase/health`,
      };
    }

    return {
      reachable: true,
      httpStatus: res.status,
      configured: Boolean(data.configured),
      hasUrl: typeof data.hasUrl === 'boolean' ? data.hasUrl : Boolean(data.configured),
      hasKey: typeof data.hasKey === 'boolean' ? data.hasKey : Boolean(data.configured),
      matchedUrlVar: data.matchedUrlVar ?? null,
      matchedKeyVar: data.matchedKeyVar ?? null,
      authenticated: typeof data.authenticated === 'boolean' ? data.authenticated : null,
      error: null,
    };
  } catch (err: unknown) {
    return {
      reachable: false,
      httpStatus: null,
      configured: false,
      hasUrl: null,
      hasKey: null,
      matchedUrlVar: null,
      matchedKeyVar: null,
      authenticated: null,
      error: err instanceof Error ? err.message : 'Falha de rede ao consultar /api/supabase/health',
    };
  }
}

async function probeSupabaseAuthEndpoint(
  fetchImpl: typeof fetch,
  conn: { url: string; key: string } | null
): Promise<SupabaseEndpointProbeResult> {
  if (!conn) {
    return {
      attempted: false,
      reachable: false,
      httpStatus: null,
      latencyMs: null,
      error: null,
    };
  }

  const startedAt = Date.now();
  try {
    const res = await fetchImpl(`${conn.url.replace(/\/+$/, '')}/auth/v1/settings`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        apikey: conn.key,
      },
    });
    const latencyMs = Math.max(0, Date.now() - startedAt);
    return {
      attempted: true,
      reachable: res.ok,
      httpStatus: res.status,
      latencyMs,
      error: res.ok ? null : `Supabase Auth respondeu HTTP ${res.status}`,
    };
  } catch (err: unknown) {
    return {
      attempted: true,
      reachable: false,
      httpStatus: null,
      latencyMs: Math.max(0, Date.now() - startedAt),
      error: err instanceof Error ? err.message : 'Erro de rede ao conectar no Supabase',
    };
  }
}

export async function runSupabaseConnectionDiagnostics(
  deps: RunSupabaseDiagnosticsDeps = {}
): Promise<SupabaseDiagnosticReport> {
  const env =
    deps.importMetaEnv ??
    ((import.meta as { env?: Record<string, string | undefined> }).env ?? {});
  const fetchImpl = deps.fetchFn ?? fetch;
  const initRuntime = deps.initRuntimeConfig ?? initSupabaseRuntimeConfig;
  const checkConfigured = deps.isConfigured ?? isSupabaseConfigured;
  const readConnection = deps.getConnectionInfo ?? getSupabaseConnectionInfo;
  const resolveClient = deps.getClient ?? getSupabaseClient;
  const now = deps.now ?? (() => new Date());
  const baseOrigin =
    deps.origin ?? (typeof window !== 'undefined' ? window.location.origin : '');

  await initRuntime().catch(() => false);

  const serverHealth = await probeServerSupabaseHealth(fetchImpl, baseOrigin);
  const conn = readConnection();
  const configured = checkConfigured() && Boolean(conn);

  const rawViteUrl = typeof env.VITE_SUPABASE_URL === 'string' ? env.VITE_SUPABASE_URL.trim() : '';
  const rawAnonKey =
    typeof env.VITE_SUPABASE_ANON_KEY === 'string' ? env.VITE_SUPABASE_ANON_KEY.trim() : '';
  const rawPubKey =
    typeof env.VITE_SUPABASE_PUBLISHABLE_KEY === 'string'
      ? env.VITE_SUPABASE_PUBLISHABLE_KEY.trim()
      : '';

  const viteUrlOrigin = rawViteUrl ? maskUrlToOrigin(rawViteUrl) : null;
  const hasImportMetaUrl = Boolean(viteUrlOrigin);
  const hasImportMetaKey = Boolean(rawAnonKey || rawPubKey);

  let clientInitialized = false;
  let clientInitError: string | null = null;
  if (configured) {
    try {
      const clientInstance = resolveClient();
      clientInitialized = Boolean(clientInstance);
      if (!clientInitialized) {
        clientInitError = 'getSupabaseClient() retornou null mesmo com configuração ativa.';
      }
    } catch (err: unknown) {
      clientInitialized = false;
      clientInitError =
        err instanceof Error ? err.message : 'Erro inesperado ao inicializar o cliente Supabase.';
    }
  }

  const supabaseReachability = await probeSupabaseAuthEndpoint(fetchImpl, conn);

  const urlLoaded = hasImportMetaUrl || Boolean(conn?.url) || serverHealth.hasUrl === true;
  const urlSource: DiagnosticEnvSource = hasImportMetaUrl
    ? 'import.meta.env'
    : conn?.url
    ? 'runtime_api'
    : serverHealth.hasUrl
    ? 'server_env'
    : 'missing';

  const anonLoaded = Boolean(rawAnonKey);
  const pubLoaded = Boolean(rawPubKey);
  const effectiveKeyLoaded = Boolean(conn?.key) || serverHealth.hasKey === true;

  const variables: SupabaseVarDiagnostic[] = [
    {
      name: 'VITE_SUPABASE_URL',
      loaded: urlLoaded,
      source: urlSource,
      summary: viteUrlOrigin
        ? viteUrlOrigin
        : conn?.url
        ? `${maskUrlToOrigin(conn.url) || 'URL válida'} (via /api/supabase/config)`
        : serverHealth.hasUrl
        ? `Carregada no servidor (${serverHealth.matchedUrlVar || 'env'})`
        : 'Ausente',
    },
    {
      name: 'VITE_SUPABASE_ANON_KEY',
      loaded: anonLoaded || (Boolean(conn?.key) && !pubLoaded),
      source: anonLoaded
        ? 'import.meta.env'
        : conn?.key && !pubLoaded
        ? 'runtime_api'
        : 'missing',
      summary: anonLoaded
        ? describeKeySafe(rawAnonKey, 'import.meta.env')
        : conn?.key && !pubLoaded
        ? `Carregada via runtime (${conn.key.length} caracteres)`
        : 'Ausente em import.meta.env',
    },
    {
      name: 'VITE_SUPABASE_PUBLISHABLE_KEY',
      loaded: pubLoaded,
      source: pubLoaded ? 'import.meta.env' : 'missing',
      summary: pubLoaded
        ? describeKeySafe(rawPubKey, 'import.meta.env')
        : 'Ausente em import.meta.env',
    },
  ];

  const effectiveSource: 'import.meta.env' | 'runtime_api' | 'none' =
    hasImportMetaUrl && hasImportMetaKey
      ? 'import.meta.env'
      : conn
      ? 'runtime_api'
      : 'none';

  let status: SupabaseDiagnosticCode;
  let ok = false;
  let summaryMessage: string;
  let actionHint: string | null = null;

  if (!urlLoaded && !effectiveKeyLoaded) {
    status = 'unconfigured';
    summaryMessage =
      'VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY não estão configuradas neste ambiente.';
    actionHint =
      'Adicione VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY (ou VITE_SUPABASE_PUBLISHABLE_KEY) nos Secrets do projeto e reinicie o servidor.';
  } else if (!urlLoaded) {
    status = 'missing_url';
    summaryMessage = 'Chave detectada, mas VITE_SUPABASE_URL está ausente ou inválida.';
    actionHint = 'Configure VITE_SUPABASE_URL com a URL do projeto Supabase (https://<ref>.supabase.co).';
  } else if (!effectiveKeyLoaded || !conn) {
    status = 'missing_anon_key';
    summaryMessage =
      'VITE_SUPABASE_URL carregada, mas VITE_SUPABASE_ANON_KEY / VITE_SUPABASE_PUBLISHABLE_KEY está ausente no servidor e no navegador.';
    actionHint =
      'Salve VITE_SUPABASE_ANON_KEY (ou VITE_SUPABASE_PUBLISHABLE_KEY) nos Secrets deste projeto no AI Studio e reinicie o servidor.';
  } else if (!clientInitialized || clientInitError) {
    status = 'client_init_error';
    summaryMessage = clientInitError || 'Falha ao inicializar o cliente Supabase.';
    actionHint = 'Verifique se a URL e a chave pública pertencem ao mesmo projeto Supabase.';
  } else if (supabaseReachability.attempted && !supabaseReachability.reachable) {
    status = 'connection_error';
    summaryMessage =
      supabaseReachability.error || 'Cliente inicializado, mas o endpoint Auth do Supabase não respondeu OK.';
    actionHint = 'Verifique se VITE_SUPABASE_ANON_KEY corresponde ao projeto em VITE_SUPABASE_URL.';
  } else {
    status = 'ready';
    ok = true;
    summaryMessage = `Cliente Supabase inicializado e conectado (${supabaseReachability.latencyMs ?? 0} ms).`;
  }

  return {
    checkedAt: now().toISOString(),
    status,
    ok,
    summaryMessage,
    actionHint,
    variables,
    effectiveConnection: {
      configured,
      source: effectiveSource,
      urlOrigin: conn ? maskUrlToOrigin(conn.url) : viteUrlOrigin,
      keyFormat: classifySupabaseKeyFormat(conn?.key),
      keyLength: conn?.key ? conn.key.length : null,
    },
    client: {
      initialized: clientInitialized,
      error: clientInitError,
    },
    serverHealth,
    supabaseReachability,
  };
}
