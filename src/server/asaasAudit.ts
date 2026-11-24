import { getServerSupabaseEnv } from '../utils/supabase/server.ts';

export type AsaasConnectionStatus = 'connected' | 'disconnected' | 'auth_error';
export type AsaasEnvironmentMode = 'production' | 'sandbox' | 'unknown';
export type EnvCheckState = 'configured' | 'missing' | 'optional_missing';

export interface AsaasAuditEnvCheck {
  key: string;
  label: string;
  required: boolean;
  configured: boolean;
  state: EnvCheckState;
  matchedVar: string | null;
  detail: string;
}

export interface AsaasMissingSetting {
  key: string;
  label: string;
  severity: 'required' | 'recommended';
  hint: string;
}

export interface AsaasWebhookAudit {
  urlConfigured: boolean;
  tokenConfigured: boolean;
  urlSource: 'env_and_edge' | 'env' | 'edge_function' | 'missing';
  edgeFunctionReachable: boolean | null;
  edgeFunctionHttpStatus: number | null;
  tokenMatchedVar: string | null;
  asaasRegisteredActiveWebhooks: number | null;
  asaasWebhookHasAuthToken: boolean | null;
  summaryMessage: string;
}

export interface AsaasEdgeFunctionAudit {
  configured: boolean;
  reachable: boolean;
  environment: AsaasEnvironmentMode;
  coursePriceFormatted: string | null;
  capabilities: {
    pix: boolean;
    boleto: boolean;
    creditCard: boolean;
    debitCard: boolean;
  } | null;
}

export interface AsaasAuditReport {
  ok: true;
  checkedAt: string;
  connectionStatus: AsaasConnectionStatus;
  connectionLabel: string;
  statusMessage: string;
  environment: AsaasEnvironmentMode;
  environmentLabel: string;
  environmentSource: 'api_key_and_url' | 'api_key' | 'env_config' | 'edge_function' | 'unknown';
  environmentMismatch: boolean;
  environmentWarning: string | null;
  apiCheck: {
    attempted: boolean;
    httpStatus: number | null;
    latencyMs: number | null;
    accountName: string | null;
    personType: string | null;
  };
  webhook: AsaasWebhookAudit;
  edgeFunction: AsaasEdgeFunctionAudit;
  envChecks: AsaasAuditEnvCheck[];
  missingSettings: AsaasMissingSetting[];
}

export interface RunAsaasAuditDeps {
  env?: Record<string, string | undefined>;
  fetchFn?: typeof fetch;
  supabaseEnv?: { url: string; key: string } | null;
  now?: () => Date;
}

const PROD_BASE_URL = 'https://api.asaas.com/v3';
const SANDBOX_BASE_URL = 'https://api-sandbox.asaas.com/v3';

function firstPresentEnv(
  env: Record<string, string | undefined>,
  keys: readonly string[]
): { key: string; value: string } | null {
  for (const key of keys) {
    const raw = env[key];
    if (typeof raw === 'string' && raw.trim().length > 0) {
      return { key, value: raw.trim() };
    }
  }
  return null;
}

function inferEnvironmentFromKey(matchedVar: string, keyValue: string): AsaasEnvironmentMode {
  const lowerVal = keyValue.toLowerCase();
  const upperVar = matchedVar.toUpperCase();

  if (lowerVal.includes('$aact_hmlg_') || upperVar.includes('SANDBOX') || upperVar.includes('TEST')) {
    return 'sandbox';
  }
  if (lowerVal.includes('$aact_prod_') || upperVar.includes('PRODUCTION') || upperVar.includes('LIVE')) {
    return 'production';
  }
  return 'unknown';
}

function inferEnvironmentFromUrlOrMode(
  env: Record<string, string | undefined>
): { mode: AsaasEnvironmentMode; baseUrl: string | null; matchedVar: string | null } {
  const urlCandidate = firstPresentEnv(env, ['ASAAS_BASE_URL', 'ASAAS_API_URL']);
  if (urlCandidate) {
    const val = urlCandidate.value.toLowerCase();
    if (val.includes('sandbox')) {
      return { mode: 'sandbox', baseUrl: SANDBOX_BASE_URL, matchedVar: urlCandidate.key };
    }
    if (val.includes('api.asaas.com') || val.includes('www.asaas.com')) {
      return { mode: 'production', baseUrl: PROD_BASE_URL, matchedVar: urlCandidate.key };
    }
  }

  const modeCandidate = firstPresentEnv(env, ['ASAAS_ENVIRONMENT', 'ASAAS_MODE']);
  if (modeCandidate) {
    const normalized = modeCandidate.value.toLowerCase();
    if (normalized === 'sandbox' || normalized === 'homologation' || normalized === 'test') {
      return { mode: 'sandbox', baseUrl: SANDBOX_BASE_URL, matchedVar: modeCandidate.key };
    }
    if (normalized === 'production' || normalized === 'prod' || normalized === 'live') {
      return { mode: 'production', baseUrl: PROD_BASE_URL, matchedVar: modeCandidate.key };
    }
  }

  return { mode: 'unknown', baseUrl: null, matchedVar: null };
}

function isValidHttpUrl(raw: string): boolean {
  try {
    const parsed = new URL(raw);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

function isPlaceholderValue(raw: string): boolean {
  const v = raw.trim().toLowerCase();
  return (
    v.includes('sua_chave') ||
    v.includes('your_key') ||
    v.includes('changeme') ||
    v === 'undefined' ||
    v === 'null'
  );
}

export function formatEnvironmentLabel(mode: AsaasEnvironmentMode): string {
  if (mode === 'production') return 'Produção';
  if (mode === 'sandbox') return 'Sandbox (Testes)';
  return 'Não identificado';
}

export function formatConnectionLabel(status: AsaasConnectionStatus): string {
  if (status === 'connected') return 'Conectado';
  if (status === 'auth_error') return 'Erro de autenticação';
  return 'Não conectado';
}

export async function runAsaasConnectionAudit(
  deps: RunAsaasAuditDeps = {}
): Promise<AsaasAuditReport> {
  const env = deps.env ?? process.env;
  const fetchImpl = deps.fetchFn ?? fetch;
  const now = deps.now ?? (() => new Date());
  const supabaseEnv = deps.supabaseEnv !== undefined ? deps.supabaseEnv : getServerSupabaseEnv();

  // 1) Inspect env vars without exposing raw values
  const apiKeyMatch = firstPresentEnv(env, [
    'ASAAS_PRODUCTION_API_KEY',
    'ASAAS_LIVE_API_KEY',
    'ASAAS_API_KEY',
    'ASAAS_SANDBOX_API_KEY',
    'ASAAS_API_KEY_SANDBOX',
    'ASAAS_TEST_API_KEY',
  ]);
  const apiKeyValidShape = Boolean(apiKeyMatch && !isPlaceholderValue(apiKeyMatch.value));

  const envMode = inferEnvironmentFromUrlOrMode(env);
  const keyMode = apiKeyMatch ? inferEnvironmentFromKey(apiKeyMatch.key, apiKeyMatch.value) : 'unknown';

  const webhookTokenMatch = firstPresentEnv(env, [
    'ASAAS_WEBHOOK_TOKEN',
    'ASAAS_PRODUCTION_WEBHOOK_TOKEN',
    'ASAAS_SANDBOX_WEBHOOK_TOKEN',
    'ASAAS_WEBHOOK_TOKEN_SANDBOX',
  ]);
  const webhookTokenConfigured = Boolean(
    webhookTokenMatch && !isPlaceholderValue(webhookTokenMatch.value)
  );

  const webhookUrlMatch = firstPresentEnv(env, ['ASAAS_WEBHOOK_URL', 'ASAAS_PUBLIC_WEBHOOK_URL']);
  const webhookUrlEnvValid = Boolean(webhookUrlMatch && isValidHttpUrl(webhookUrlMatch.value));

  const creditCardEnabled = String(env.ASAAS_ENABLE_CREDIT_CARD || '').trim().toLowerCase() === 'true';
  const debitCardEnabled = String(env.ASAAS_ENABLE_DEBIT_CARD || '').trim().toLowerCase() === 'true';
  const cardBrandsConfigured = Boolean(
    typeof env.ASAAS_CARD_BRANDS === 'string' && env.ASAAS_CARD_BRANDS.trim().length > 0
  );

  // 2) Safe read-only probe of Supabase Edge Functions (if Supabase is configured)
  const edgeAudit: AsaasEdgeFunctionAudit = {
    configured: Boolean(supabaseEnv),
    reachable: false,
    environment: 'unknown',
    coursePriceFormatted: null,
    capabilities: null,
  };
  let edgeWebhookReachable: boolean | null = null;
  let edgeWebhookHttpStatus: number | null = null;

  if (supabaseEnv) {
    const [chargeProbe, webhookProbe] = await Promise.allSettled([
      fetchImpl(
        `${supabaseEnv.url}/functions/v1/create-asaas-charge?courseSlug=massas-italianas`,
        {
          method: 'GET',
          headers: {
            Accept: 'application/json',
            apikey: supabaseEnv.key,
            Authorization: `Bearer ${supabaseEnv.key}`,
          },
          signal: AbortSignal.timeout(5000),
        }
      ),
      fetchImpl(`${supabaseEnv.url}/functions/v1/asaas-webhook`, {
        method: 'GET',
        headers: {
          apikey: supabaseEnv.key,
        },
        signal: AbortSignal.timeout(5000),
      }),
    ]);

    if (chargeProbe.status === 'fulfilled' && chargeProbe.value.ok) {
      const chargeJson = (await chargeProbe.value.json().catch(() => null)) as {
        ok?: boolean;
        environment?: string;
        course?: { priceCents?: number };
        capabilities?: {
          pix?: boolean;
          boleto?: boolean;
          creditCard?: boolean;
          debitCard?: boolean;
        };
      } | null;

      if (chargeJson?.ok) {
        edgeAudit.reachable = true;
        edgeAudit.environment =
          chargeJson.environment === 'production'
            ? 'production'
            : chargeJson.environment === 'sandbox'
              ? 'sandbox'
              : 'unknown';
        if (typeof chargeJson.course?.priceCents === 'number') {
          edgeAudit.coursePriceFormatted = (chargeJson.course.priceCents / 100).toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL',
          });
        }
        if (chargeJson.capabilities) {
          edgeAudit.capabilities = {
            pix: Boolean(chargeJson.capabilities.pix ?? true),
            boleto: Boolean(chargeJson.capabilities.boleto ?? true),
            creditCard: Boolean(chargeJson.capabilities.creditCard),
            debitCard: Boolean(chargeJson.capabilities.debitCard),
          };
        }
      }
    }

    if (webhookProbe.status === 'fulfilled') {
      edgeWebhookHttpStatus = webhookProbe.value.status;
      // asaas-webhook rejects GET with 405 ("Método não permitido. Utilize POST.") when active
      edgeWebhookReachable = webhookProbe.value.status === 405 || webhookProbe.value.ok;
    } else {
      edgeWebhookReachable = false;
    }
  }

  // 3) Resolve effective backend environment
  let resolvedEnvironment: AsaasEnvironmentMode = 'unknown';
  let environmentSource: AsaasAuditReport['environmentSource'] = 'unknown';

  if (envMode.mode !== 'unknown' && keyMode !== 'unknown') {
    resolvedEnvironment = envMode.mode;
    environmentSource = 'api_key_and_url';
  } else if (envMode.mode !== 'unknown') {
    resolvedEnvironment = envMode.mode;
    environmentSource = 'env_config';
  } else if (keyMode !== 'unknown') {
    resolvedEnvironment = keyMode;
    environmentSource = 'api_key';
  } else if (edgeAudit.environment !== 'unknown') {
    resolvedEnvironment = edgeAudit.environment;
    environmentSource = 'edge_function';
  }

  const effectiveBaseUrl =
    envMode.baseUrl ??
    (resolvedEnvironment === 'sandbox'
      ? SANDBOX_BASE_URL
      : resolvedEnvironment === 'production'
        ? PROD_BASE_URL
        : PROD_BASE_URL);

  // 4) Real read-only API connection check from Express backend (GET /myAccount + optional GET /webhooks)
  let connectionStatus: AsaasConnectionStatus = 'disconnected';
  let statusMessage = '';
  const apiCheck: AsaasAuditReport['apiCheck'] = {
    attempted: false,
    httpStatus: null,
    latencyMs: null,
    accountName: null,
    personType: null,
  };
  let asaasRegisteredActiveWebhooks: number | null = null;
  let asaasWebhookHasAuthToken: boolean | null = null;

  if (!apiKeyValidShape || !apiKeyMatch) {
    connectionStatus = 'disconnected';
    statusMessage = edgeAudit.reachable
      ? `Chave de API do Asaas não encontrada nas variáveis deste servidor Express. A Edge Function no Supabase responde em ${formatEnvironmentLabel(edgeAudit.environment)}, mas a auditoria direta da API pelo backend requer ASAAS_API_KEY nos Secrets.`
      : 'Chave de API do Asaas (ASAAS_API_KEY) não configurada nas variáveis de ambiente/Secrets do servidor.';
  } else {
    apiCheck.attempted = true;
    const startedAt = Date.now();
    try {
      const accountRes = await fetchImpl(`${effectiveBaseUrl}/myAccount`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          access_token: apiKeyMatch.value,
          'User-Agent': 'FerveC-Gastronomia-AdminAudit/1.0',
        },
        signal: AbortSignal.timeout(6500),
      });
      apiCheck.latencyMs = Date.now() - startedAt;
      apiCheck.httpStatus = accountRes.status;

      if (accountRes.ok) {
        const accountJson = (await accountRes.json().catch(() => ({}))) as {
          name?: string;
          tradingName?: string;
          personType?: string;
        };
        connectionStatus = 'connected';
        apiCheck.accountName =
          (typeof accountJson.tradingName === 'string' && accountJson.tradingName.trim()) ||
          (typeof accountJson.name === 'string' && accountJson.name.trim()) ||
          null;
        apiCheck.personType =
          typeof accountJson.personType === 'string' ? accountJson.personType.trim() : null;
        if (resolvedEnvironment === 'unknown') {
          resolvedEnvironment = effectiveBaseUrl.includes('sandbox') ? 'sandbox' : 'production';
          environmentSource = 'api_key';
        }
        statusMessage = `Conexão ativa e autenticada com a API do Asaas (${formatEnvironmentLabel(resolvedEnvironment)}).`;

        // Safe read-only webhook check on Asaas account (never writes or mutates)
        try {
          const webhooksRes = await fetchImpl(`${effectiveBaseUrl}/webhooks?limit=10`, {
            method: 'GET',
            headers: {
              Accept: 'application/json',
              access_token: apiKeyMatch.value,
              'User-Agent': 'FerveC-Gastronomia-AdminAudit/1.0',
            },
            signal: AbortSignal.timeout(5000),
          });
          if (webhooksRes.ok) {
            const webhooksJson = (await webhooksRes.json().catch(() => null)) as {
              data?: Array<{ enabled?: boolean; interrupted?: boolean; authToken?: string | null; hasAuthToken?: boolean }>;
            } | null;
            if (Array.isArray(webhooksJson?.data)) {
              const activeList = webhooksJson.data.filter((w) => w && w.enabled !== false && !w.interrupted);
              asaasRegisteredActiveWebhooks = activeList.length;
              asaasWebhookHasAuthToken = activeList.some(
                (w) => Boolean(w.hasAuthToken) || (typeof w.authToken === 'string' && w.authToken.trim().length > 0)
              );
            }
          }
        } catch {
          // Degrade gracefully if account plan/key scopes restrict /webhooks listing
        }
      } else if (accountRes.status === 401 || accountRes.status === 403) {
        connectionStatus = 'auth_error';
        statusMessage =
          keyMode !== 'unknown' && envMode.mode !== 'unknown' && keyMode !== envMode.mode
            ? `Erro de autenticação no Asaas (HTTP ${accountRes.status}): a chave configurada parece ser de ${formatEnvironmentLabel(keyMode)}, mas o ambiente apontado é ${formatEnvironmentLabel(envMode.mode)}.`
            : `Erro de autenticação no Asaas (HTTP ${accountRes.status}): a chave configurada em ${apiKeyMatch.key} foi recusada pela API.`;
      } else {
        connectionStatus = 'disconnected';
        statusMessage = `A API do Asaas respondeu com HTTP ${accountRes.status}. Tente novamente em alguns instantes.`;
      }
    } catch (err: unknown) {
      apiCheck.latencyMs = Date.now() - startedAt;
      connectionStatus = 'disconnected';
      const detail = err instanceof Error && err.message ? err.message : 'Falha de rede';
      statusMessage = `Não foi possível alcançar a API do Asaas (${detail}).`;
    }
  }

  // 5) Check environment mismatch across Express backend vs Edge Function
  const keyVsUrlMismatch =
    keyMode !== 'unknown' && envMode.mode !== 'unknown' && keyMode !== envMode.mode;
  const backendVsEdgeMismatch =
    resolvedEnvironment !== 'unknown' &&
    edgeAudit.environment !== 'unknown' &&
    resolvedEnvironment !== edgeAudit.environment;

  const environmentMismatch = keyVsUrlMismatch || backendVsEdgeMismatch;
  let environmentWarning: string | null = null;
  if (keyVsUrlMismatch) {
    environmentWarning = `Divergência detectada: a chave (${apiKeyMatch?.key}) indica ${formatEnvironmentLabel(keyMode)}, enquanto a URL/modo aponta para ${formatEnvironmentLabel(envMode.mode)}.`;
  } else if (backendVsEdgeMismatch) {
    environmentWarning = `Divergência detectada: o servidor backend aponta para ${formatEnvironmentLabel(resolvedEnvironment)}, mas a Edge Function create-asaas-charge está respondendo em ${formatEnvironmentLabel(edgeAudit.environment)}.`;
  }

  // 6) Webhook configuration status
  const urlConfigured = webhookUrlEnvValid || edgeWebhookReachable === true;
  const urlSource: AsaasWebhookAudit['urlSource'] =
    webhookUrlEnvValid && edgeWebhookReachable === true
      ? 'env_and_edge'
      : webhookUrlEnvValid
        ? 'env'
        : edgeWebhookReachable === true
          ? 'edge_function'
          : 'missing';

  let webhookSummary = '';
  if (urlConfigured && webhookTokenConfigured) {
    webhookSummary =
      'URL e token do webhook estão configurados no ambiente do servidor.';
  } else if (urlConfigured && !webhookTokenConfigured) {
    webhookSummary =
      'URL do webhook identificada, mas o token de segurança (ASAAS_WEBHOOK_TOKEN) não está configurado nos Secrets deste servidor.';
  } else if (!urlConfigured && webhookTokenConfigured) {
    webhookSummary =
      'Token do webhook configurado, mas a URL do webhook não foi confirmada (configure ASAAS_WEBHOOK_URL ou verifique a Edge Function asaas-webhook).';
  } else {
    webhookSummary =
      'URL e token do webhook ainda não foram confirmados nas variáveis deste servidor.';
  }

  // 7) Build envChecks & missingSettings (strictly non-secret)
  const envChecks: AsaasAuditEnvCheck[] = [
    {
      key: 'ASAAS_API_KEY',
      label: 'Chave da API do Asaas',
      required: true,
      configured: apiKeyValidShape,
      state: apiKeyValidShape ? 'configured' : 'missing',
      matchedVar: apiKeyValidShape && apiKeyMatch ? apiKeyMatch.key : null,
      detail: apiKeyValidShape && apiKeyMatch
        ? `Configurada via ${apiKeyMatch.key}${keyMode !== 'unknown' ? ` (${formatEnvironmentLabel(keyMode)})` : ''}.`
        : 'Ausente nas variáveis de ambiente/Secrets do servidor Express.',
    },
    {
      key: 'ASAAS_BASE_URL / ASAAS_ENVIRONMENT',
      label: 'Ambiente / URL base do Asaas',
      required: false,
      configured: Boolean(envMode.matchedVar) || resolvedEnvironment !== 'unknown',
      state: envMode.matchedVar
        ? 'configured'
        : resolvedEnvironment !== 'unknown'
          ? 'configured'
          : 'optional_missing',
      matchedVar: envMode.matchedVar,
      detail: envMode.matchedVar
        ? `Definido via ${envMode.matchedVar} (${formatEnvironmentLabel(resolvedEnvironment)}).`
        : resolvedEnvironment !== 'unknown'
          ? `Inferido automaticamente como ${formatEnvironmentLabel(resolvedEnvironment)}.`
          : 'Não definido explicitamente (defina ASAAS_ENVIRONMENT=production ou sandbox).',
    },
    {
      key: 'ASAAS_WEBHOOK_URL',
      label: 'URL do Webhook Asaas',
      required: true,
      configured: urlConfigured,
      state: urlConfigured ? 'configured' : 'missing',
      matchedVar: webhookUrlEnvValid && webhookUrlMatch ? webhookUrlMatch.key : null,
      detail: webhookUrlEnvValid && edgeWebhookReachable
        ? `Configurada via ${webhookUrlMatch?.key} e Edge Function asaas-webhook ativa.`
        : webhookUrlEnvValid
          ? `Configurada via ${webhookUrlMatch?.key}.`
          : edgeWebhookReachable
            ? 'Edge Function /functions/v1/asaas-webhook ativa no Supabase.'
            : 'Nenhuma URL de webhook confirmada.',
    },
    {
      key: 'ASAAS_WEBHOOK_TOKEN',
      label: 'Token de segurança do Webhook',
      required: true,
      configured: webhookTokenConfigured,
      state: webhookTokenConfigured ? 'configured' : 'missing',
      matchedVar: webhookTokenConfigured && webhookTokenMatch ? webhookTokenMatch.key : null,
      detail: webhookTokenConfigured && webhookTokenMatch
        ? `Configurado via ${webhookTokenMatch.key} (valor oculto por segurança).`
        : 'Ausente nas variáveis de ambiente/Secrets do servidor Express.',
    },
    {
      key: 'VITE_SUPABASE_URL / PUBLISHABLE_KEY',
      label: 'Conexão Supabase (Checkout e Banco)',
      required: true,
      configured: Boolean(supabaseEnv),
      state: supabaseEnv ? 'configured' : 'missing',
      matchedVar: supabaseEnv ? 'VITE_SUPABASE_URL' : null,
      detail: supabaseEnv
        ? edgeAudit.reachable
          ? `Conectado e Edge Function create-asaas-charge respondendo (${formatEnvironmentLabel(edgeAudit.environment)}).`
          : 'Credenciais carregadas no servidor Express.'
        : 'Variáveis do Supabase ausentes no servidor.',
    },
    {
      key: 'ASAAS_ENABLE_CREDIT_CARD / DEBIT_CARD',
      label: 'Cartão de Crédito e Débito (Opcional)',
      required: false,
      configured: creditCardEnabled || debitCardEnabled,
      state: creditCardEnabled || debitCardEnabled ? 'configured' : 'optional_missing',
      matchedVar: creditCardEnabled
        ? 'ASAAS_ENABLE_CREDIT_CARD'
        : debitCardEnabled
          ? 'ASAAS_ENABLE_DEBIT_CARD'
          : null,
      detail:
        creditCardEnabled || debitCardEnabled
          ? `Habilitado (${[creditCardEnabled ? 'Crédito' : '', debitCardEnabled ? 'Débito' : ''].filter(Boolean).join(' e ')}${cardBrandsConfigured ? ', bandeiras definidas' : ''}).`
          : 'Opcional desativado — Pix e Boleto já operam normalmente.',
    },
  ];

  const missingSettings: AsaasMissingSetting[] = [];
  if (!apiKeyValidShape) {
    missingSettings.push({
      key: 'ASAAS_API_KEY',
      label: 'Chave da API do Asaas',
      severity: 'required',
      hint: 'Cadastre ASAAS_API_KEY nos Secrets do servidor para permitir a auditoria direta na API do Asaas.',
    });
  }
  if (!webhookUrlEnvValid && edgeWebhookReachable !== true) {
    missingSettings.push({
      key: 'ASAAS_WEBHOOK_URL',
      label: 'URL do Webhook do Asaas',
      severity: 'required',
      hint: 'Configure ASAAS_WEBHOOK_URL ou garanta que a Edge Function asaas-webhook esteja implantada no Supabase.',
    });
  } else if (!webhookUrlEnvValid) {
    missingSettings.push({
      key: 'ASAAS_WEBHOOK_URL',
      label: 'Variável ASAAS_WEBHOOK_URL (Recomendado)',
      severity: 'recommended',
      hint: 'A Edge Function asaas-webhook já está ativa, mas definir ASAAS_WEBHOOK_URL nos Secrets facilita a auditoria explícita da URL.',
    });
  }
  if (!webhookTokenConfigured) {
    missingSettings.push({
      key: 'ASAAS_WEBHOOK_TOKEN',
      label: 'Token de segurança do Webhook',
      severity: 'required',
      hint: 'Defina ASAAS_WEBHOOK_TOKEN nos Secrets com o mesmo token cadastrado no cabeçalho asaas-access-token do painel Asaas.',
    });
  }
  if (!envMode.matchedVar) {
    missingSettings.push({
      key: 'ASAAS_ENVIRONMENT',
      label: 'Indicador explícito de ambiente (ASAAS_ENVIRONMENT)',
      severity: 'recommended',
      hint: 'Defina ASAAS_ENVIRONMENT=production (ou sandbox) nos Secrets para tornar explícito o ambiente esperado.',
    });
  }
  if (!supabaseEnv) {
    missingSettings.push({
      key: 'VITE_SUPABASE_URL',
      label: 'Conexão com o Supabase',
      severity: 'required',
      hint: 'Defina VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY nos Secrets.',
    });
  }

  return {
    ok: true,
    checkedAt: now().toISOString(),
    connectionStatus,
    connectionLabel: formatConnectionLabel(connectionStatus),
    statusMessage,
    environment: resolvedEnvironment,
    environmentLabel: formatEnvironmentLabel(resolvedEnvironment),
    environmentSource,
    environmentMismatch,
    environmentWarning,
    apiCheck,
    webhook: {
      urlConfigured,
      tokenConfigured: webhookTokenConfigured,
      urlSource,
      edgeFunctionReachable: edgeWebhookReachable,
      edgeFunctionHttpStatus: edgeWebhookHttpStatus,
      tokenMatchedVar: webhookTokenConfigured && webhookTokenMatch ? webhookTokenMatch.key : null,
      asaasRegisteredActiveWebhooks,
      asaasWebhookHasAuthToken,
      summaryMessage: webhookSummary,
    },
    edgeFunction: edgeAudit,
    envChecks,
    missingSettings,
  };
}
