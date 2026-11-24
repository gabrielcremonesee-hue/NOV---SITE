import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, RefreshCw, ShieldAlert, X, XCircle } from 'lucide-react';
import {
  getSupabaseConnectionInfo,
  isSupabaseConfigured,
} from '../utils/supabase/client';
import {
  runSupabaseConnectionDiagnostics,
  type SupabaseDiagnosticReport,
} from '../utils/supabase/diagnostics';

export interface EnvVarAvailability {
  name: string;
  available: boolean;
  source: 'import.meta.env' | 'missing';
  detail: string;
}

export interface SupabaseEnvDiagnosticReport {
  checkedAt: string;
  importMetaVars: EnvVarAvailability[];
  runtimeFallbackConfigured: boolean;
  connectionOrigin: string | null;
}

function maskUrlHost(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  if (!trimmed) return 'Ausente';
  try {
    const parsed = new URL(trimmed);
    return `${parsed.protocol}//${parsed.hostname}`;
  } catch {
    return 'Formato de URL inválido';
  }
}

function summarizeKeyPresence(rawKey: string): string {
  const trimmed = rawKey.trim();
  if (!trimmed) return 'Ausente';
  return `Disponível (${trimmed.length} caracteres)`;
}

export function inspectSupabaseImportMetaEnv(
  envOverride?: Record<string, string | undefined>
): EnvVarAvailability[] {
  const env =
    envOverride ??
    ((import.meta as { env?: Record<string, string | undefined> }).env ?? {});

  const urlVal = typeof env.VITE_SUPABASE_URL === 'string' ? env.VITE_SUPABASE_URL.trim() : '';
  const anonKeyVal =
    typeof env.VITE_SUPABASE_ANON_KEY === 'string' ? env.VITE_SUPABASE_ANON_KEY.trim() : '';
  const publishableKeyVal =
    typeof env.VITE_SUPABASE_PUBLISHABLE_KEY === 'string'
      ? env.VITE_SUPABASE_PUBLISHABLE_KEY.trim()
      : '';

  return [
    {
      name: 'VITE_SUPABASE_URL',
      available: Boolean(urlVal),
      source: urlVal ? 'import.meta.env' : 'missing',
      detail: urlVal ? maskUrlHost(urlVal) : 'Ausente em import.meta.env',
    },
    {
      name: 'VITE_SUPABASE_ANON_KEY',
      available: Boolean(anonKeyVal),
      source: anonKeyVal ? 'import.meta.env' : 'missing',
      detail: anonKeyVal ? summarizeKeyPresence(anonKeyVal) : 'Ausente em import.meta.env',
    },
    {
      name: 'VITE_SUPABASE_PUBLISHABLE_KEY',
      available: Boolean(publishableKeyVal),
      source: publishableKeyVal ? 'import.meta.env' : 'missing',
      detail: publishableKeyVal
        ? summarizeKeyPresence(publishableKeyVal)
        : 'Ausente em import.meta.env',
    },
  ];
}

function hasDebugQueryFlag(): boolean {
  if (typeof window === 'undefined') return false;
  const searchParams = new URLSearchParams(window.location.search);
  if (searchParams.get('debug') === 'supabase') return true;
  const hash = window.location.hash || '';
  const qIndex = hash.indexOf('?');
  if (qIndex >= 0) {
    const hashParams = new URLSearchParams(hash.slice(qIndex + 1));
    if (hashParams.get('debug') === 'supabase') return true;
  }
  return false;
}

export default function SupabaseEnvDebugPanel() {
  const [visible, setVisible] = useState<boolean>(() => hasDebugQueryFlag());
  const [checking, setChecking] = useState(false);
  const [fullReport, setFullReport] = useState<SupabaseDiagnosticReport | null>(null);
  const [report, setReport] = useState<SupabaseEnvDiagnosticReport>(() => {
    const conn = getSupabaseConnectionInfo();
    return {
      checkedAt: new Date().toLocaleTimeString('pt-BR'),
      importMetaVars: inspectSupabaseImportMetaEnv(),
      runtimeFallbackConfigured: isSupabaseConfigured(),
      connectionOrigin: conn ? maskUrlHost(conn.url) : null,
    };
  });

  const runCheck = useCallback(async () => {
    setChecking(true);
    try {
      const diag = await runSupabaseConnectionDiagnostics();
      setFullReport(diag);
      const conn = getSupabaseConnectionInfo();
      setReport({
        checkedAt: new Date(diag.checkedAt).toLocaleTimeString('pt-BR'),
        importMetaVars: inspectSupabaseImportMetaEnv(),
        runtimeFallbackConfigured: isSupabaseConfigured(),
        connectionOrigin: conn ? maskUrlHost(conn.url) : diag.effectiveConnection.urlOrigin,
      });
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    if (visible) {
      void runCheck();
    }
  }, [visible, runCheck]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'd') {
        event.preventDefault();
        setVisible((prev) => !prev);
      }
    };

    const onToggleEvent = () => {
      setVisible((prev) => !prev);
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('fervec:toggle-env-debug', onToggleEvent);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('fervec:toggle-env-debug', onToggleEvent);
    };
  }, []);

  if (!visible) {
    return (
      <div
        hidden
        aria-hidden="true"
        data-testid="supabase-env-debug-panel-hidden"
        data-vite-supabase-url-available={String(report.importMetaVars[0]?.available ?? false)}
        data-vite-supabase-anon-key-available={String(report.importMetaVars[1]?.available ?? false)}
      />
    );
  }

  const allRequiredPresent =
    Boolean(report.importMetaVars[0]?.available) &&
    Boolean(report.importMetaVars[1]?.available || report.importMetaVars[2]?.available);

  return (
    <aside
      role="region"
      aria-label="Painel interno de diagnóstico Supabase"
      data-testid="supabase-env-debug-panel"
      className="fixed bottom-4 left-4 z-[9999] w-[min(420px,calc(100vw-2rem))] rounded-2xl border border-[#d6c5ad] bg-[#fffaf0] p-4 text-[#2c1d11] shadow-2xl"
    >
      <div className="flex items-start justify-between gap-3 border-b border-[#eadbc7] pb-3">
        <div>
          <span className="block text-[11px] font-bold uppercase tracking-wider text-[#8c1d24]">
            Diagnóstico Interno · Oculto
          </span>
          <h2 className="text-sm font-bold text-[#2c1d11]">
            Variáveis Supabase (import.meta.env)
          </h2>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => void runCheck()}
            disabled={checking}
            aria-label="Reverificar variáveis"
            title="Reverificar variáveis"
            className="rounded-lg border border-[#dccbb4] bg-white p-1.5 text-[#5b4338] hover:bg-[#f6ede0] disabled:opacity-50"
          >
            <RefreshCw size={14} className={checking ? 'animate-spin' : ''} />
          </button>
          <button
            type="button"
            onClick={() => setVisible(false)}
            aria-label="Fechar painel de diagnóstico"
            title="Fechar painel (Ctrl+Shift+D)"
            className="rounded-lg border border-[#dccbb4] bg-white p-1.5 text-[#5b4338] hover:bg-[#f6ede0]"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      <ul className="mt-3 space-y-2 text-xs">
        {report.importMetaVars.map((item) => (
          <li
            key={item.name}
            className="flex items-center justify-between gap-2 rounded-xl border border-[#eadbc7] bg-white/80 px-3 py-2"
          >
            <div className="min-w-0">
              <code className="block truncate font-mono text-[11px] font-semibold text-[#2c1d11]">
                {item.name}
              </code>
              <span className="block truncate text-[11px] text-[#6d5548]">{item.detail}</span>
            </div>
            <span
              className={`inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                item.available
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-rose-100 text-rose-800'
              }`}
            >
              {item.available ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
              {item.available ? 'Disponível' : 'Ausente'}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-3 space-y-1 rounded-xl border border-[#eadbc7] bg-[#f7efe3] px-3 py-2 text-[11px] text-[#5b4338]">
        <div className="flex items-center justify-between gap-2">
          <span className="font-semibold">Conexão efetiva (runtime/build):</span>
          <span className="font-bold text-[#2c1d11]">
            {report.runtimeFallbackConfigured ? 'Configurada' : 'Não configurada'}
          </span>
        </div>
        {fullReport ? (
          <>
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold">Cliente Supabase inicializado:</span>
              <span className="font-bold text-[#2c1d11]">
                {fullReport.client.initialized ? 'Sim' : 'Não'}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold">Servidor (/api/supabase/health):</span>
              <span className="font-bold text-[#2c1d11]">
                {fullReport.serverHealth.reachable
                  ? `URL: ${fullReport.serverHealth.hasUrl ? 'OK' : 'Ausente'} · Chave: ${
                      fullReport.serverHealth.hasKey ? 'OK' : 'Ausente'
                    }`
                  : 'Indisponível'}
              </span>
            </div>
            {fullReport.supabaseReachability.attempted ? (
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold">Auth Endpoint:</span>
                <span className="font-bold text-[#2c1d11]">
                  {fullReport.supabaseReachability.reachable
                    ? `HTTP ${fullReport.supabaseReachability.httpStatus} (${fullReport.supabaseReachability.latencyMs} ms)`
                    : fullReport.supabaseReachability.error || 'Erro'}
                </span>
              </div>
            ) : null}
            <div className="pt-1 font-medium text-[#2c1d11]" data-testid="supabase-diagnostic-summary">
              {fullReport.summaryMessage}
            </div>
            {fullReport.actionHint ? (
              <div className="text-[#8c1d24]">{fullReport.actionHint}</div>
            ) : null}
          </>
        ) : null}
        {report.connectionOrigin ? (
          <div className="truncate text-[#6d5548]">
            Destino: <code className="font-mono">{report.connectionOrigin}</code>
          </div>
        ) : null}
        {!allRequiredPresent && report.runtimeFallbackConfigured ? (
          <div className="flex items-center gap-1 text-amber-800">
            <ShieldAlert size={12} className="shrink-0" />
            <span>Ausente em import.meta.env; usando /api/supabase/config.</span>
          </div>
        ) : null}
        <div className="text-[10px] text-[#8a7062]">
          Verificado às {report.checkedAt} · Atalho: Ctrl+Shift+D ou ?debug=supabase
        </div>
      </div>
    </aside>
  );
}
