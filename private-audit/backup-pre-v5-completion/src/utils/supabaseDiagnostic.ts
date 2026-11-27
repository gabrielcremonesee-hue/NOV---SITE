import {
  getSupabaseClient,
  getSupabaseConnectionInfo,
  initSupabaseRuntimeConfig,
  isSupabaseConfigured,
} from './supabase/client';
import {
  classifySupabaseKeyFormat,
  runSupabaseConnectionDiagnostics,
  type SupabaseDiagnosticReport,
} from './supabase/diagnostics';

export interface SupabaseClientDiagnosticResult {
  ok: boolean;
  initialized: boolean;
  connected: boolean;
  envLoaded: {
    hasUrl: boolean;
    hasAnonOrPublishableKey: boolean;
    source: 'import.meta.env' | 'runtime_api' | 'none';
    urlOrigin: string | null;
    keyFormat: 'jwt_anon' | 'sb_publishable' | 'custom' | 'missing';
  };
  httpStatus: number | null;
  latencyMs: number | null;
  statusMessage: string;
  error: string | null;
  report: SupabaseDiagnosticReport;
}

export interface SupabaseDiagnosticOptions {
  importMetaEnv?: Record<string, string | undefined>;
  fetchFn?: typeof fetch;
  initRuntimeConfig?: () => Promise<boolean>;
  isConfigured?: () => boolean;
  getConnectionInfo?: () => { url: string; key: string } | null;
  getClient?: () => unknown | null;
  logger?: Pick<Console, 'info' | 'warn' | 'error'>;
  origin?: string;
}

/**
 * Attempts to initialize the Supabase client from environment variables / runtime config,
 * verifies connectivity against the Supabase project, and logs safe status details to console.
 * Never logs raw secret values.
 */
export async function verifySupabaseClientConnectivity(
  options: SupabaseDiagnosticOptions = {}
): Promise<SupabaseClientDiagnosticResult> {
  const logger = options.logger ?? console;

  const report = await runSupabaseConnectionDiagnostics({
    importMetaEnv: options.importMetaEnv,
    fetchFn: options.fetchFn,
    initRuntimeConfig: options.initRuntimeConfig ?? initSupabaseRuntimeConfig,
    isConfigured: options.isConfigured ?? isSupabaseConfigured,
    getConnectionInfo: options.getConnectionInfo ?? getSupabaseConnectionInfo,
    getClient: options.getClient ?? getSupabaseClient,
    origin: options.origin,
  });

  const envLoaded = {
    hasUrl: report.variables.some((v) => v.name === 'VITE_SUPABASE_URL' && v.loaded),
    hasAnonOrPublishableKey:
      report.effectiveConnection.keyFormat !== 'missing' ||
      report.serverHealth.hasKey === true,
    source: report.effectiveConnection.source,
    urlOrigin: report.effectiveConnection.urlOrigin,
    keyFormat:
      report.effectiveConnection.keyFormat !== 'missing'
        ? report.effectiveConnection.keyFormat
        : classifySupabaseKeyFormat(
            options.importMetaEnv?.VITE_SUPABASE_ANON_KEY ||
              options.importMetaEnv?.VITE_SUPABASE_PUBLISHABLE_KEY
          ),
  };

  const initialized = report.client.initialized;
  const connected = report.ok;
  const error = report.client.error || report.supabaseReachability.error || report.serverHealth.error;

  const urlVar = report.variables.find((v) => v.name === 'VITE_SUPABASE_URL');
  const anonVar = report.variables.find((v) => v.name === 'VITE_SUPABASE_ANON_KEY');
  const pubVar = report.variables.find((v) => v.name === 'VITE_SUPABASE_PUBLISHABLE_KEY');

  const logPayload = {
    VITE_SUPABASE_URL: urlVar?.loaded
      ? `available (${urlVar.source}${envLoaded.urlOrigin ? `: ${envLoaded.urlOrigin}` : ''})`
      : 'missing',
    VITE_SUPABASE_ANON_KEY: anonVar?.loaded
      ? `available (${anonVar.source}, ${envLoaded.keyFormat})`
      : pubVar?.loaded
      ? `available via VITE_SUPABASE_PUBLISHABLE_KEY (${pubVar.source}, ${envLoaded.keyFormat})`
      : report.serverHealth.hasKey
      ? `available on server (${report.serverHealth.matchedKeyVar || 'env'})`
      : 'missing',
    status: report.status,
    ok: report.ok,
    initialized,
    connected,
    source: envLoaded.source,
    urlOrigin: envLoaded.urlOrigin,
    keyFormat: envLoaded.keyFormat,
    serverHasUrl: report.serverHealth.hasUrl,
    serverHasKey: report.serverHealth.hasKey,
    authHttpStatus: report.supabaseReachability.httpStatus,
    latencyMs: report.supabaseReachability.latencyMs,
  };

  if (connected && initialized) {
    logger.info('[SupabaseDiagnostic] Cliente inicializado e conectado:', logPayload);
  } else if (report.status === 'client_init_error') {
    logger.error('[SupabaseDiagnostic] Erro ao inicializar cliente Supabase:', {
      ...logPayload,
      message: report.summaryMessage,
      actionHint: report.actionHint,
    });
  } else {
    logger.warn('[SupabaseDiagnostic] Status da conexão Supabase:', {
      ...logPayload,
      message: report.summaryMessage,
      actionHint: report.actionHint,
    });
  }

  return {
    ok: connected,
    initialized,
    connected,
    envLoaded,
    httpStatus: report.supabaseReachability.httpStatus,
    latencyMs: report.supabaseReachability.latencyMs,
    statusMessage: report.summaryMessage,
    error: error ?? null,
    report,
  };
}
