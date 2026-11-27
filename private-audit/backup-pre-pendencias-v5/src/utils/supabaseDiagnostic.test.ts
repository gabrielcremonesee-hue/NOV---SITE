import test from 'node:test';
import assert from 'node:assert/strict';
import { verifySupabaseClientConnectivity } from './supabaseDiagnostic.ts';

test('verifySupabaseClientConnectivity logs error safely when VITE_SUPABASE_ANON_KEY is missing', async () => {
  const logs: Array<{ level: string; args: unknown[] }> = [];
  const fakeLogger = {
    info: (...args: unknown[]) => logs.push({ level: 'info', args }),
    warn: (...args: unknown[]) => logs.push({ level: 'warn', args }),
    error: (...args: unknown[]) => logs.push({ level: 'error', args }),
  };

  const result = await verifySupabaseClientConnectivity({
    importMetaEnv: {
      VITE_SUPABASE_URL: 'https://mgesfutvcvwbhyvpnnil.supabase.co',
    },
    initRuntimeConfig: async () => false,
    isConfigured: () => false,
    getConnectionInfo: () => null,
    getClient: () => null,
    origin: 'http://localhost:3000',
    logger: fakeLogger,
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

  assert.equal(result.ok, false);
  assert.equal(result.initialized, false);
  assert.equal(result.connected, false);
  assert.equal(result.envLoaded.hasUrl, true);
  assert.equal(result.envLoaded.hasAnonOrPublishableKey, false);
  assert.equal(logs.length, 1);
  assert.equal(logs[0].level, 'warn');
  const loggedPayload = logs[0].args[1] as Record<string, unknown>;
  assert.match(String(loggedPayload.VITE_SUPABASE_URL), /available/);
  assert.equal(loggedPayload.VITE_SUPABASE_ANON_KEY, 'missing');
});

test('verifySupabaseClientConnectivity initializes client, confirms connectivity, and logs info without leaking raw keys', async () => {
  const logs: Array<{ level: string; args: unknown[] }> = [];
  const fakeLogger = {
    info: (...args: unknown[]) => logs.push({ level: 'info', args }),
    warn: (...args: unknown[]) => logs.push({ level: 'warn', args }),
    error: (...args: unknown[]) => logs.push({ level: 'error', args }),
  };

  const secretAnonKey = 'eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoiYW5vbiJ9.do_not_leak_this_sig';
  const result = await verifySupabaseClientConnectivity({
    importMetaEnv: {
      VITE_SUPABASE_URL: 'https://demo-project.supabase.co',
      VITE_SUPABASE_ANON_KEY: secretAnonKey,
    },
    initRuntimeConfig: async () => true,
    isConfigured: () => true,
    getConnectionInfo: () => ({
      url: 'https://demo-project.supabase.co',
      key: secretAnonKey,
    }),
    getClient: () => ({ auth: {} }),
    origin: 'http://localhost:3000',
    logger: fakeLogger,
    fetchFn: (async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/api/supabase/health')) {
        return new Response(JSON.stringify({ configured: true, authenticated: false }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ external: { email: true } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }) as typeof fetch,
  });

  assert.equal(result.ok, true);
  assert.equal(result.initialized, true);
  assert.equal(result.connected, true);
  assert.equal(result.httpStatus, 200);
  assert.equal(logs.length, 1);
  assert.equal(logs[0].level, 'info');
  assert.doesNotMatch(JSON.stringify(logs), /do_not_leak_this_sig/);
  assert.doesNotMatch(JSON.stringify(result), /do_not_leak_this_sig/);
});
