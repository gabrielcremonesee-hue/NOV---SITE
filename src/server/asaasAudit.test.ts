import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import type { User } from '@supabase/supabase-js';
import { runAsaasConnectionAudit } from './asaasAudit.ts';
import { registerCourseApiRoutes } from './courseApi.ts';
import { resetDeveloperLatchForTests } from './developerAuth.ts';

test('runAsaasConnectionAudit reports disconnected and missing settings when Asaas credentials are absent', async () => {
  const report = await runAsaasConnectionAudit({
    env: {},
    supabaseEnv: { url: 'https://demo.supabase.co', key: 'sb_publishable_demo' },
    fetchFn: async (input) => {
      const url = String(input);
      if (url.includes('/functions/v1/create-asaas-charge')) {
        return new Response(
          JSON.stringify({
            ok: true,
            environment: 'production',
            course: { priceCents: 1290 },
            capabilities: { pix: true, boleto: true, creditCard: false, debitCard: false },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      if (url.includes('/functions/v1/asaas-webhook')) {
        return new Response(JSON.stringify({ ok: false, error: 'Use POST' }), { status: 405 });
      }
      return new Response('Not found', { status: 404 });
    },
  });

  assert.equal(report.connectionStatus, 'disconnected');
  assert.equal(report.connectionLabel, 'Não conectado');
  assert.equal(report.environment, 'production');
  assert.equal(report.environmentLabel, 'Produção');
  assert.equal(report.apiCheck.attempted, false);
  assert.equal(report.webhook.urlConfigured, true);
  assert.equal(report.webhook.edgeFunctionReachable, true);
  assert.equal(report.webhook.tokenConfigured, false);
  assert.equal(report.missingSettings.some((m) => m.key === 'ASAAS_API_KEY' && m.severity === 'required'), true);
  assert.equal(report.missingSettings.some((m) => m.key === 'ASAAS_WEBHOOK_TOKEN' && m.severity === 'required'), true);
  assert.doesNotMatch(JSON.stringify(report), /sb_publishable_demo/);
});

test('runAsaasConnectionAudit verifies real production API connection and webhook configuration without exposing secrets', async () => {
  const fakeProdKey = '$aact_prod_SECRET_TOKEN_VALUE_DO_NOT_LEAK_999';
  const fakeWebhookToken = 'whsec_SECRET_WEBHOOK_TOKEN_VALUE_777';
  const requestedUrls: Array<{ url: string; method: string }> = [];

  const report = await runAsaasConnectionAudit({
    env: {
      ASAAS_API_KEY: fakeProdKey,
      ASAAS_ENVIRONMENT: 'production',
      ASAAS_WEBHOOK_URL: 'https://demo.supabase.co/functions/v1/asaas-webhook',
      ASAAS_WEBHOOK_TOKEN: fakeWebhookToken,
    },
    supabaseEnv: { url: 'https://demo.supabase.co', key: 'sb_publishable_demo' },
    fetchFn: async (input, init) => {
      const url = String(input);
      const method = String(init?.method || 'GET');
      requestedUrls.push({ url, method });

      if (url === 'https://api.asaas.com/v3/myAccount') {
        assert.equal(method, 'GET');
        return new Response(
          JSON.stringify({ name: 'FerveC Gastronomia Ltda', personType: 'JURIDICA' }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      if (url.startsWith('https://api.asaas.com/v3/webhooks')) {
        assert.equal(method, 'GET');
        return new Response(
          JSON.stringify({
            data: [{ id: 'wh_1', enabled: true, interrupted: false, hasAuthToken: true }],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      if (url.includes('/functions/v1/create-asaas-charge')) {
        return new Response(
          JSON.stringify({ ok: true, environment: 'production', course: { priceCents: 1290 } }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      if (url.includes('/functions/v1/asaas-webhook')) {
        return new Response(JSON.stringify({ ok: false }), { status: 405 });
      }
      return new Response('Not found', { status: 404 });
    },
  });

  assert.equal(report.connectionStatus, 'connected');
  assert.equal(report.connectionLabel, 'Conectado');
  assert.equal(report.environment, 'production');
  assert.equal(report.environmentMismatch, false);
  assert.equal(report.apiCheck.attempted, true);
  assert.equal(report.apiCheck.httpStatus, 200);
  assert.equal(report.apiCheck.accountName, 'FerveC Gastronomia Ltda');
  assert.equal(report.webhook.urlConfigured, true);
  assert.equal(report.webhook.tokenConfigured, true);
  assert.equal(report.webhook.asaasRegisteredActiveWebhooks, 1);
  assert.equal(report.webhook.asaasWebhookHasAuthToken, true);
  assert.equal(report.missingSettings.filter((m) => m.severity === 'required').length, 0);

  // Strictly GET calls only (zero POST charges/orders)
  assert.equal(requestedUrls.every((r) => r.method === 'GET'), true);

  // Never expose raw secrets in the serialized report
  const serialized = JSON.stringify(report);
  assert.doesNotMatch(serialized, /SECRET_TOKEN_VALUE_DO_NOT_LEAK_999/);
  assert.doesNotMatch(serialized, /SECRET_WEBHOOK_TOKEN_VALUE_777/);
  assert.doesNotMatch(serialized, /sb_publishable_demo/);
});

test('runAsaasConnectionAudit detects auth_error on 401 and sandbox mode from sandbox key', async () => {
  const report = await runAsaasConnectionAudit({
    env: {
      ASAAS_SANDBOX_API_KEY: '$aact_hmlg_sandbox_invalid_123',
      ASAAS_WEBHOOK_TOKEN: 'wh_tok',
    },
    supabaseEnv: null,
    fetchFn: async (input) => {
      assert.equal(String(input), 'https://api-sandbox.asaas.com/v3/myAccount');
      return new Response(JSON.stringify({ errors: [{ code: 'invalid_access_token' }] }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    },
  });

  assert.equal(report.connectionStatus, 'auth_error');
  assert.equal(report.connectionLabel, 'Erro de autenticação');
  assert.equal(report.environment, 'sandbox');
  assert.equal(report.apiCheck.httpStatus, 401);
});

test('GET /api/admin/asaas-audit enforces authentication (401), allows fervecrgastronomia@gmail.com (200), and blocks students & revoked gabrielcremonesee@gmail.com (403)', async () => {
  resetDeveloperLatchForTests();
  const app = express();
  app.use(express.json());

  const makeMockSupabase = (role: 'student' | 'admin' | 'revoked_admin') => {
    const profile =
      role === 'admin'
        ? { id: 'admin-1', full_name: 'FerveC Gastronomia', cpf_masked: '***.722.209-**', email: 'fervecrgastronomia@gmail.com' }
        : role === 'revoked_admin'
          ? { id: 'old-admin-1', full_name: 'Gabriel Cremonese', cpf_masked: '***.000.000-**', email: 'gabrielcremonesee@gmail.com' }
          : { id: 'student-1', full_name: 'Aluno Comum', cpf_masked: '***.111.222-**', email: 'aluno@fervec.test' };
    return {
      from: (table: string) => {
        if (table === 'profiles') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: profile, error: null }),
              }),
            }),
            update: () => ({
              eq: async () => ({ data: [profile], error: null }),
            }),
          };
        }
        return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) };
      },
    } as unknown as import('@supabase/supabase-js').SupabaseClient;
  };

  registerCourseApiRoutes(app, {
    resolveAuth: async (req) => {
      const header = req.headers['x-test-role'];
      if (header === 'admin') {
        return {
          supabase: makeMockSupabase('admin'),
          user: {
            id: 'admin-1',
            email: 'fervecrgastronomia@gmail.com',
            email_confirmed_at: '2026-11-18T12:00:00.000Z',
            created_at: '2026-11-18T12:00:00.000Z',
          } as User,
        };
      }
      if (header === 'revoked_admin') {
        return {
          supabase: makeMockSupabase('revoked_admin'),
          user: {
            id: 'old-admin-1',
            email: 'gabrielcremonesee@gmail.com',
            app_metadata: { role: 'developer_admin', fervec_developer: true },
            user_metadata: {},
            aud: 'authenticated',
            email_confirmed_at: '2026-11-15T12:00:00.000Z',
            created_at: '2026-11-15T12:00:00.000Z',
          } as User,
        };
      }
      if (header === 'student') {
        return {
          supabase: makeMockSupabase('student'),
          user: {
            id: 'student-1',
            email: 'aluno@fervec.test',
            email_confirmed_at: '2026-11-15T12:00:00.000Z',
            created_at: '2026-11-15T12:00:00.000Z',
          } as User,
        };
      }
      return null;
    },
    runAsaasAudit: async () =>
      runAsaasConnectionAudit({
        env: {},
        supabaseEnv: null,
      }),
  });

  const server = app.listen(0);
  const addr = server.address();
  const baseUrl = `http://127.0.0.1:${typeof addr === 'object' && addr ? addr.port : 0}`;

  try {
    const unauthRes = await fetch(`${baseUrl}/api/admin/asaas-audit`);
    assert.equal(unauthRes.status, 401);

    const studentRes = await fetch(`${baseUrl}/api/admin/asaas-audit`, {
      headers: { 'x-test-role': 'student' },
    });
    assert.equal(studentRes.status, 403);

    const revokedRes = await fetch(`${baseUrl}/api/admin/asaas-audit`, {
      headers: { 'x-test-role': 'revoked_admin' },
    });
    assert.equal(revokedRes.status, 403);

    const adminRes = await fetch(`${baseUrl}/api/admin/asaas-audit`, {
      headers: { 'x-test-role': 'admin' },
    });
    assert.equal(adminRes.status, 200);
    const body = (await adminRes.json()) as { ok: boolean; connectionStatus: string };
    assert.equal(body.ok, true);
    assert.equal(body.connectionStatus, 'disconnected');
  } finally {
    server.close();
  }
});
