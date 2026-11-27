import { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  KeyRound,
  Lock,
  RefreshCw,
  Server,
  ShieldAlert,
  ShieldCheck,
  Webhook,
  XCircle,
} from 'lucide-react';
import { getSupabaseClient, initSupabaseRuntimeConfig } from '../utils/supabase/client';
import type {
  AsaasAuditReport,
  AsaasConnectionStatus,
  AsaasEnvironmentMode,
} from '../server/asaasAudit';

export type { AsaasAuditReport, AsaasConnectionStatus, AsaasEnvironmentMode };

export interface AsaasAuditPresentationMeta {
  statusLabel: string;
  tone: 'success' | 'warning' | 'danger';
  environmentLabel: string;
  requiredMissingCount: number;
  recommendedMissingCount: number;
  webhookReady: boolean;
}

export function getAsaasAuditPresentation(report: AsaasAuditReport): AsaasAuditPresentationMeta {
  const statusLabel =
    report.connectionStatus === 'connected'
      ? 'Conectado'
      : report.connectionStatus === 'auth_error'
        ? 'Erro de autenticação'
        : 'Não conectado';

  const tone: AsaasAuditPresentationMeta['tone'] =
    report.connectionStatus === 'connected'
      ? 'success'
      : report.connectionStatus === 'auth_error'
        ? 'warning'
        : 'danger';

  const environmentLabel =
    report.environment === 'production'
      ? 'Produção'
      : report.environment === 'sandbox'
        ? 'Sandbox (Testes)'
        : 'Não identificado';

  const requiredMissingCount = report.missingSettings.filter(
    (item) => item.severity === 'required'
  ).length;
  const recommendedMissingCount = report.missingSettings.filter(
    (item) => item.severity === 'recommended'
  ).length;

  return {
    statusLabel,
    tone,
    environmentLabel,
    requiredMissingCount,
    recommendedMissingCount,
    webhookReady: Boolean(report.webhook.urlConfigured && report.webhook.tokenConfigured),
  };
}

let cachedAuditReport: AsaasAuditReport | null = null;

export function clearAsaasAuditCache(): void {
  cachedAuditReport = null;
}

async function defaultGetAccessToken(): Promise<string | null> {
  await initSupabaseRuntimeConfig().catch(() => false);
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  try {
    const { data } = await supabase.auth.getSession();
    return data?.session?.access_token ?? null;
  } catch {
    return null;
  }
}

export async function fetchAsaasAuditReport(opts?: {
  getAccessToken?: () => Promise<string | null>;
  fetchFn?: typeof fetch;
}): Promise<{ ok: true; report: AsaasAuditReport } | { ok: false; error: string }> {
  const getToken = opts?.getAccessToken ?? defaultGetAccessToken;
  const fetchImpl = opts?.fetchFn ?? fetch;

  const accessToken = await getToken();
  if (!accessToken) {
    return {
      ok: false,
      error: 'Sessão administrativa não autenticada. Entre novamente na sua conta para auditar o Asaas.',
    };
  }

  try {
    const res = await fetchImpl('/api/admin/asaas-audit', {
      method: 'GET',
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    });
    const data = (await res.json().catch(() => ({}))) as AsaasAuditReport & { error?: string };
    if (!res.ok || !data?.ok) {
      return {
        ok: false,
        error: data?.error || `Falha ao executar auditoria do Asaas (HTTP ${res.status}).`,
      };
    }
    cachedAuditReport = data;
    return { ok: true, report: data };
  } catch (err: unknown) {
    return {
      ok: false,
      error:
        err instanceof Error && err.message
          ? err.message
          : 'Erro de comunicação ao consultar o servidor de auditoria.',
    };
  }
}

export interface AsaasConnectionAuditPanelProps {
  getAccessToken?: () => Promise<string | null>;
  initialReport?: AsaasAuditReport | null;
  fetchFn?: typeof fetch;
}

export default function AsaasConnectionAuditPanel({
  getAccessToken,
  initialReport,
  fetchFn,
}: AsaasConnectionAuditPanelProps) {
  const [report, setReport] = useState<AsaasAuditReport | null>(
    initialReport ?? cachedAuditReport
  );
  const [loading, setLoading] = useState<boolean>(!(initialReport ?? cachedAuditReport));
  const [error, setError] = useState<string | null>(null);

  const runAudit = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetchAsaasAuditReport({ getAccessToken, fetchFn });
    setLoading(false);
    if (res.ok) {
      setReport(res.report);
    } else {
      setError(res.error);
    }
  }, [getAccessToken, fetchFn]);

  useEffect(() => {
    if (!initialReport) {
      void runAudit();
    }
  }, [initialReport, runAudit]);

  const meta = report ? getAsaasAuditPresentation(report) : null;

  const statusBadgeClasses =
    meta?.tone === 'success'
      ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
      : meta?.tone === 'warning'
        ? 'border-amber-300 bg-amber-50 text-amber-900'
        : 'border-rose-300 bg-rose-50 text-rose-900';

  const envBadgeClasses =
    report?.environment === 'production'
      ? 'border-emerald-300 bg-emerald-100/80 text-emerald-900'
      : report?.environment === 'sandbox'
        ? 'border-amber-300 bg-amber-100/80 text-amber-900'
        : 'border-stone-300 bg-stone-100 text-stone-700';

  return (
    <section
      aria-label="Auditoria de conexão Asaas"
      data-testid="asaas-connection-audit-panel"
      className="mt-6 rounded-2xl border border-[#dac59e] bg-[#fffaf2] p-5 text-left text-[#2c1d11] shadow-md sm:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#eadbc7] pb-4">
        <div>
          <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#8c1d24]">
            <ShieldCheck size={14} />
            Painel Administrativo · Pagamentos
          </span>
          <h2 className="mt-1 font-serif text-xl font-bold text-[#2c1d11] sm:text-2xl">
            Auditoria de Conexão Asaas
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-[#65523e] sm:text-sm">
            Verifica credenciais do servidor, ambiente ativo, conexão real com a API do Asaas e configuração do webhook em modo somente leitura.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void runAudit()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-[#7c1218] bg-[#8c1d24] px-4 py-2.5 text-xs font-bold text-[#fffaf2] transition hover:bg-[#70151b] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>{loading ? 'Auditando...' : 'Reexecutar auditoria'}</span>
        </button>
      </div>

      {error ? (
        <div
          role="alert"
          className="mt-4 flex items-start gap-3 rounded-xl border border-rose-300 bg-rose-50 p-4 text-sm text-rose-900"
        >
          <ShieldAlert size={18} className="mt-0.5 shrink-0 text-rose-700" />
          <div>
            <strong className="block font-bold">Não foi possível concluir a auditoria</strong>
            <p className="mt-1 text-xs leading-relaxed">{error}</p>
          </div>
        </div>
      ) : null}

      {loading && !report ? (
        <div className="mt-5 rounded-xl border border-[#eadbc7] bg-[#fffdf8] p-6 text-center text-sm text-[#65523e]">
          Consultando variáveis do servidor e validando conexão de leitura com o Asaas...
        </div>
      ) : null}

      {report && meta ? (
        <div className="mt-5 space-y-5">
          {/* Bloco 1: Status da API + Ambiente */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className={`rounded-xl border p-4 ${statusBadgeClasses}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider opacity-80">
                  Status da Conexão API
                </span>
                {report.connectionStatus === 'connected' ? (
                  <CheckCircle2 size={18} className="text-emerald-700" />
                ) : report.connectionStatus === 'auth_error' ? (
                  <AlertTriangle size={18} className="text-amber-700" />
                ) : (
                  <XCircle size={18} className="text-rose-700" />
                )}
              </div>
              <div className="mt-2 text-lg font-extrabold" data-testid="asaas-audit-status-label">
                {meta.statusLabel}
              </div>
              <p className="mt-1.5 text-xs leading-relaxed opacity-90">{report.statusMessage}</p>
              {report.apiCheck.attempted ? (
                <div className="mt-3 flex flex-wrap gap-3 border-t border-black/10 pt-2.5 text-[11px] font-medium">
                  <span>HTTP: {report.apiCheck.httpStatus ?? '—'}</span>
                  {report.apiCheck.latencyMs !== null ? (
                    <span>Latência: {report.apiCheck.latencyMs} ms</span>
                  ) : null}
                  {report.apiCheck.accountName ? (
                    <span>Conta: {report.apiCheck.accountName}</span>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="rounded-xl border border-[#eadbc7] bg-[#fffdf8] p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#65523e]">
                  Ambiente Identificado
                </span>
                <Server size={17} className="text-[#8c1d24]" />
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span
                  data-testid="asaas-audit-env-label"
                  className={`inline-flex items-center rounded-lg border px-2.5 py-1 text-sm font-extrabold ${envBadgeClasses}`}
                >
                  {meta.environmentLabel}
                </span>
                {report.edgeFunction.reachable ? (
                  <span className="text-xs font-semibold text-[#5b4338]">
                    Edge Function:{' '}
                    <strong>
                      {report.edgeFunction.environment === 'production'
                        ? 'Produção'
                        : report.edgeFunction.environment === 'sandbox'
                          ? 'Sandbox'
                          : 'Ativa'}
                    </strong>
                    {report.edgeFunction.coursePriceFormatted
                      ? ` · ${report.edgeFunction.coursePriceFormatted}`
                      : ''}
                  </span>
                ) : null}
              </div>

              {report.environmentWarning ? (
                <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-2.5 text-xs text-amber-900">
                  <AlertTriangle size={15} className="mt-0.5 shrink-0 text-amber-700" />
                  <span>{report.environmentWarning}</span>
                </div>
              ) : (
                <p className="mt-2 text-xs leading-relaxed text-[#65523e]">
                  {report.environment === 'production'
                    ? 'As integrações identificadas estão alinhadas ao ambiente de Produção.'
                    : report.environment === 'sandbox'
                      ? 'As integrações identificadas apontam para o ambiente Sandbox (somente testes).'
                      : 'Defina ASAAS_ENVIRONMENT ou ASAAS_API_KEY para confirmar o ambiente.'}
                </p>
              )}
            </div>
          </div>

          {/* Bloco 2: Configurações Faltando */}
          {report.missingSettings.length > 0 ? (
            <div
              data-testid="asaas-audit-missing-box"
              className="rounded-xl border border-amber-300 bg-amber-50/70 p-4"
            >
              <div className="flex items-center gap-2 text-sm font-extrabold text-amber-950">
                <AlertTriangle size={16} className="text-amber-700" />
                <span>
                  Configurações pendentes ({meta.requiredMissingCount} obrigatória
                  {meta.requiredMissingCount === 1 ? '' : 's'}
                  {meta.recommendedMissingCount > 0
                    ? `, ${meta.recommendedMissingCount} recomendada${meta.recommendedMissingCount === 1 ? '' : 's'}`
                    : ''}
                  )
                </span>
              </div>
              <ul className="mt-3 space-y-2">
                {report.missingSettings.map((item) => (
                  <li
                    key={item.key}
                    className="rounded-lg border border-amber-200 bg-white/90 px-3 py-2 text-xs"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <strong className="font-bold text-[#2c1d11]">
                        {item.label}{' '}
                        <code className="ml-1 rounded bg-stone-100 px-1.5 py-0.5 font-mono text-[11px] text-[#7c1218]">
                          {item.key}
                        </code>
                      </strong>
                      <span
                        className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${
                          item.severity === 'required'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {item.severity === 'required' ? 'Obrigatória' : 'Recomendada'}
                      </span>
                    </div>
                    <p className="mt-1 leading-relaxed text-[#5b4338]">{item.hint}</p>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="flex items-center gap-2.5 rounded-xl border border-emerald-300 bg-emerald-50 p-3.5 text-xs font-semibold text-emerald-900">
              <CheckCircle2 size={16} className="shrink-0 text-emerald-700" />
              <span>Todas as configurações obrigatórias do Asaas e do Webhook estão presentes no servidor.</span>
            </div>
          )}

          {/* Bloco 3: Webhook (URL e Token) */}
          <div className="rounded-xl border border-[#eadbc7] bg-[#fffdf8] p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Webhook size={17} className="text-[#8c1d24]" />
                <h3 className="text-sm font-extrabold text-[#2c1d11]">
                  Configuração do Webhook Asaas
                </h3>
              </div>
              <span
                className={`inline-flex items-center gap-1 rounded-md px-2.5 py-0.5 text-[11px] font-bold ${
                  meta.webhookReady
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-900'
                }`}
              >
                {meta.webhookReady ? 'URL e Token configurados' : 'Configuração incompleta'}
              </span>
            </div>

            <p className="mt-1.5 text-xs text-[#65523e]">{report.webhook.summaryMessage}</p>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-[#eadbc7] bg-[#fffaf2] p-3">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-bold text-[#2c1d11]">URL do Webhook</span>
                  <span
                    className={`font-bold ${
                      report.webhook.urlConfigured ? 'text-emerald-700' : 'text-rose-700'
                    }`}
                  >
                    {report.webhook.urlConfigured ? 'Configurada' : 'Não configurada'}
                  </span>
                </div>
                <p className="mt-1 text-[11px] leading-relaxed text-[#65523e]">
                  {report.webhook.edgeFunctionReachable
                    ? `Edge Function asaas-webhook ativa (HTTP ${report.webhook.edgeFunctionHttpStatus ?? 405} em leitura).`
                    : 'Edge Function asaas-webhook não confirmada.'}
                  {report.webhook.asaasRegisteredActiveWebhooks !== null
                    ? ` Webhooks ativos na conta Asaas: ${report.webhook.asaasRegisteredActiveWebhooks}.`
                    : ''}
                </p>
              </div>

              <div className="rounded-lg border border-[#eadbc7] bg-[#fffaf2] p-3">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-bold text-[#2c1d11]">Token do Webhook</span>
                  <span
                    className={`font-bold ${
                      report.webhook.tokenConfigured ? 'text-emerald-700' : 'text-rose-700'
                    }`}
                  >
                    {report.webhook.tokenConfigured ? 'Configurado' : 'Não configurado'}
                  </span>
                </div>
                <p className="mt-1 text-[11px] leading-relaxed text-[#65523e]">
                  {report.webhook.tokenConfigured
                    ? `Secret presente (${report.webhook.tokenMatchedVar}); valor nunca exibido no navegador.`
                    : 'Defina ASAAS_WEBHOOK_TOKEN nos Secrets do servidor para validar asaas-access-token.'}
                  {report.webhook.asaasWebhookHasAuthToken === true
                    ? ' Token também confirmado no registro do Asaas.'
                    : ''}
                </p>
              </div>
            </div>
          </div>

          {/* Bloco 4: Checklist de Variáveis e Secrets */}
          <div className="rounded-xl border border-[#eadbc7] bg-[#fffdf8] p-4">
            <div className="flex items-center gap-2">
              <KeyRound size={16} className="text-[#8c1d24]" />
              <h3 className="text-sm font-extrabold text-[#2c1d11]">
                Variáveis de Ambiente e Secrets Verificados
              </h3>
            </div>

            <ul className="mt-3 divide-y divide-[#efe2cf] text-xs">
              {report.envChecks.map((check) => (
                <li
                  key={check.key}
                  className="flex flex-wrap items-center justify-between gap-2 py-2.5 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <strong className="font-bold text-[#2c1d11]">{check.label}</strong>
                      <code className="rounded bg-[#f3eadb] px-1.5 py-0.5 font-mono text-[10.5px] text-[#5b4338]">
                        {check.key}
                      </code>
                    </div>
                    <p className="mt-0.5 text-[11.5px] text-[#65523e]">{check.detail}</p>
                  </div>

                  <span
                    className={`inline-flex shrink-0 items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-bold ${
                      check.state === 'configured'
                        ? 'bg-emerald-100 text-emerald-800'
                        : check.state === 'missing'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-stone-100 text-stone-700'
                    }`}
                  >
                    {check.state === 'configured' ? (
                      <CheckCircle2 size={12} />
                    ) : check.state === 'missing' ? (
                      <XCircle size={12} />
                    ) : (
                      <AlertTriangle size={12} />
                    )}
                    {check.state === 'configured'
                      ? 'Configurada'
                      : check.state === 'missing'
                        ? 'Ausente'
                        : 'Opcional'}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#78614e]">
            <span className="inline-flex items-center gap-1.5">
              <Lock size={12} />
              Auditoria somente leitura: nenhuma chave secreta é enviada ao navegador e nenhuma cobrança é gerada.
            </span>
            <span>
              Última verificação: {new Date(report.checkedAt).toLocaleTimeString('pt-BR')}
            </span>
          </div>
        </div>
      ) : null}
    </section>
  );
}
