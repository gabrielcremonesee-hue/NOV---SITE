import test from 'node:test';
import assert from 'node:assert/strict';
import {
  fetchAsaasAuditReport,
  getAsaasAuditPresentation,
  type AsaasAuditReport,
} from './AsaasConnectionAuditPanel';

function makeReport(overrides: Partial<AsaasAuditReport> = {}): AsaasAuditReport {
  return {
    ok: true,
    checkedAt: '2026-11-18T14:00:00.000Z',
    connectionStatus: 'connected',
    connectionLabel: 'Conectado',
    statusMessage: 'Conexão ativa e autenticada com a API do Asaas (Produção).',
    environment: 'production',
    environmentLabel: 'Produção',
    environmentSource: 'api_key_and_url',
    environmentMismatch: false,
    environmentWarning: null,
    apiCheck: {
      attempted: true,
      httpStatus: 200,
      latencyMs: 112,
      accountName: 'FerveC Gastronomia',
      personType: 'JURIDICA',
    },
    webhook: {
      urlConfigured: true,
      tokenConfigured: true,
      urlSource: 'env_and_edge',
      edgeFunctionReachable: true,
      edgeFunctionHttpStatus: 405,
      tokenMatchedVar: 'ASAAS_WEBHOOK_TOKEN',
      asaasRegisteredActiveWebhooks: 1,
      asaasWebhookHasAuthToken: true,
      summaryMessage: 'URL e token do webhook estão configurados no ambiente do servidor.',
    },
    edgeFunction: {
      configured: true,
      reachable: true,
      environment: 'production',
      coursePriceFormatted: 'R$ 12,90',
      capabilities: { pix: true, boleto: true, creditCard: false, debitCard: false },
    },
    envChecks: [],
    missingSettings: [],
    ...overrides,
  };
}

test('getAsaasAuditPresentation maps status, environment, webhook readiness, and missing counts cleanly', () => {
  const okMeta = getAsaasAuditPresentation(makeReport());
  assert.equal(okMeta.statusLabel, 'Conectado');
  assert.equal(okMeta.tone, 'success');
  assert.equal(okMeta.environmentLabel, 'Produção');
  assert.equal(okMeta.webhookReady, true);
  assert.equal(okMeta.requiredMissingCount, 0);

  const authErrMeta = getAsaasAuditPresentation(
    makeReport({
      connectionStatus: 'auth_error',
      environment: 'sandbox',
      webhook: {
        urlConfigured: true,
        tokenConfigured: false,
        urlSource: 'edge_function',
        edgeFunctionReachable: true,
        edgeFunctionHttpStatus: 405,
        tokenMatchedVar: null,
        asaasRegisteredActiveWebhooks: null,
        asaasWebhookHasAuthToken: null,
        summaryMessage: 'Token ausente.',
      },
      missingSettings: [
        { key: 'ASAAS_WEBHOOK_TOKEN', label: 'Token', severity: 'required', hint: 'Defina token' },
        { key: 'ASAAS_ENVIRONMENT', label: 'Env', severity: 'recommended', hint: 'Defina env' },
      ],
    })
  );
  assert.equal(authErrMeta.statusLabel, 'Erro de autenticação');
  assert.equal(authErrMeta.tone, 'warning');
  assert.equal(authErrMeta.environmentLabel, 'Sandbox (Testes)');
  assert.equal(authErrMeta.webhookReady, false);
  assert.equal(authErrMeta.requiredMissingCount, 1);
  assert.equal(authErrMeta.recommendedMissingCount, 1);
});

test('fetchAsaasAuditReport calls GET /api/admin/asaas-audit with Bearer token only', async () => {
  let calledUrl = '';
  let calledMethod = '';
  let authHeader = '';

  const res = await fetchAsaasAuditReport({
    getAccessToken: async () => 'admin-jwt-token',
    fetchFn: async (input, init) => {
      calledUrl = String(input);
      calledMethod = String(init?.method || 'GET');
      const headers = (init?.headers || {}) as Record<string, string>;
      authHeader = headers.Authorization || '';
      return new Response(JSON.stringify(makeReport()), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    },
  });

  assert.equal(calledUrl, '/api/admin/asaas-audit');
  assert.equal(calledMethod, 'GET');
  assert.equal(authHeader, 'Bearer admin-jwt-token');
  assert.equal(res.ok, true);
});
