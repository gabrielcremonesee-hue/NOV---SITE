import test from 'node:test';
import assert from 'node:assert/strict';
import {
  classifySupabaseKeyFormat,
  runSupabaseConnectionDiagnostics,
} from './diagnostics.ts';

test('classifySupabaseKeyFormat identifies JWT anon, sb_publishable, custom, and missing safely', () => {
  assert.equal(classifySupabaseKeyFormat(''), 'missing');
  assert.equal(classifySupabaseKeyFormat(null), 'missing');
  assert.equal(classifySupabaseKeyFormat('sb_publishable_abc123'), 'sb_publishable');
  assert.equal(classifySupabaseKeyFormat('eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoiYW5vbiJ9.sig123'), 'jwt_anon');
  assert.equal(classifySupabaseKeyFormat('other-token'), 'custom');
});

test('runSupabaseConnectionDiagnostics reports missing_anon_key when VITE_SUPABASE_URL is loaded but anon key is absent', async () => {
  const report = await runSupabaseConnectionDiagnostics({
    importMetaEnv: {
      VITE_SUPABASE_URL: 'https://mgesfutvcvwbhyvpnnil.supabase.co',
    },
    initRuntimeConfig: async () => false,
    isConfigured: () => false,
    getConnectionInfo: () => null,
    getClient: () => null,
    origin: 'http://localhost:3000',
    fetchFn: (async () =>
      new Response(
        JSON.stringify({
          configured: false,
          hasUrl: true,
          hasKey: false,
          matchedUrlVar: 'VITE_SUPABASE_URL',
          matchedKeyVar: null,
          user: null,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )) as typeof fetch,
  });

  assert.equal(report.ok, false);
  assert.equal(report.status, 'missing_anon_key');
  assert.equal(report.variables[0].name, 'VITE_SUPABASE_URL');
  assert.equal(report.variables[0].loaded, true);
  assert.equal(report.variables[0].summary, 'https://mgesfutvcvwbhyvpnnil.supabase.co');
  assert.equal(report.variables[1].name, 'VITE_SUPABASE_ANON_KEY');
  assert.equal(report.variables[1].loaded, false);
  assert.equal(report.client.initialized, false);
  assert.equal(report.serverHealth.hasUrl, true);
  assert.equal(report.serverHealth.hasKey, false);
});

test('runSupabaseConnectionDiagnostics reports ready when URL, anon key, client, and auth endpoint succeed without leaking raw key', async () => {
  const fakeKey = 'eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoiYW5vbiJ9.super_secret_sig_value';
  const report = await runSupabaseConnectionDiagnostics({
    importMetaEnv: {
      VITE_SUPABASE_URL: 'https://demo-project.supabase.co/rest/v1/',
      VITE_SUPABASE_ANON_KEY: fakeKey,
    },
    initRuntimeConfig: async () => true,
    isConfigured: () => true,
    getConnectionInfo: () => ({
      url: 'https://demo-project.supabase.co',
      key: fakeKey,
    }),
    getClient: () => ({ auth: {} }),
    origin: 'http://localhost:3000',
    fetchFn: (async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/api/supabase/health')) {
        return new Response(
          JSON.stringify({
            configured: true,
            authenticated: false,
            userId: null,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      if (url.includes('/auth/v1/settings')) {
        return new Response(JSON.stringify({ external: { email: true } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response('{}', { status: 404 });
    }) as typeof fetch,
  });

  const serialized = JSON.stringify(report);
  assert.doesNotMatch(serialized, /super_secret_sig_value/);
  assert.equal(report.ok, true);
  assert.equal(report.status, 'ready');
  assert.equal(report.effectiveConnection.configured, true);
  assert.equal(report.effectiveConnection.source, 'import.meta.env');
  assert.equal(report.effectiveConnection.keyFormat, 'jwt_anon');
  assert.equal(report.client.initialized, true);
  assert.equal(report.supabaseReachability.attempted, true);
  assert.equal(report.supabaseReachability.reachable, true);
  assert.equal(report.supabaseReachability.httpStatus, 200);
});

test('runSupabaseConnectionDiagnostics reports connection_error if Supabase Auth rejects the key', async () => {
  const report = await runSupabaseConnectionDiagnostics({
    importMetaEnv: {},
    initRuntimeConfig: async () => true,
    isConfigured: () => true,
    getConnectionInfo: () => ({
      url: 'https://demo-project.supabase.co',
      key: 'sb_publishable_invalid',
    }),
    getClient: () => ({ auth: {} }),
    origin: 'http://localhost:3000',
    fetchFn: (async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/api/supabase/health')) {
        return new Response(JSON.stringify({ configured: true, authenticated: false }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ message: 'Invalid API key' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }) as typeof fetch,
  });

  assert.equal(report.ok, false);
  assert.equal(report.status, 'connection_error');
  assert.equal(report.effectiveConnection.source, 'runtime_api');
  assert.equal(report.client.initialized, true);
  assert.equal(report.supabaseReachability.httpStatus, 401);
});
