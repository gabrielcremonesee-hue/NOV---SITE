import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeSupabaseProjectUrl } from './url.ts';
import { getServerSupabaseEnv, getServerSupabaseEnvStatus } from './server.ts';

test('normalizeSupabaseProjectUrl strips /rest/v1/ and other service paths from Supabase URLs', () => {
  assert.equal(
    normalizeSupabaseProjectUrl('https://demo-project.supabase.co/rest/v1/'),
    'https://demo-project.supabase.co'
  );
  assert.equal(
    normalizeSupabaseProjectUrl('https://demo-project.supabase.co/functions/v1/create-asaas-charge'),
    'https://demo-project.supabase.co'
  );
  assert.equal(
    normalizeSupabaseProjectUrl('https://demo-project.supabase.co/auth/v1'),
    'https://demo-project.supabase.co'
  );
  assert.equal(
    normalizeSupabaseProjectUrl('https://demo-project.supabase.co/'),
    'https://demo-project.supabase.co'
  );
  assert.equal(
    normalizeSupabaseProjectUrl('https://auth.fervec.example.com/rest/v1/'),
    'https://auth.fervec.example.com'
  );
});

test('getServerSupabaseEnv normalizes VITE_SUPABASE_URL containing /rest/v1/', () => {
  const prevUrl = process.env.VITE_SUPABASE_URL;
  const prevKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const prevNextUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const prevNextKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  process.env.VITE_SUPABASE_URL = 'https://demo-project.supabase.co/rest/v1/';
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_demo_key';

  try {
    const resolved = getServerSupabaseEnv();
    assert.deepEqual(resolved, {
      url: 'https://demo-project.supabase.co',
      key: 'sb_publishable_demo_key',
    });
  } finally {
    if (prevUrl === undefined) delete process.env.VITE_SUPABASE_URL;
    else process.env.VITE_SUPABASE_URL = prevUrl;
    if (prevKey === undefined) delete process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    else process.env.VITE_SUPABASE_PUBLISHABLE_KEY = prevKey;
    if (prevNextUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = prevNextUrl;
    if (prevNextKey === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    else process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = prevNextKey;
  }
});

test('getServerSupabaseEnvStatus accepts VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY fallback without exposing values', () => {
  const saved: Record<string, string | undefined> = {};
  const keys = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'VITE_SUPABASE_URL',
    'SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
    'VITE_SUPABASE_PUBLISHABLE_KEY',
    'SUPABASE_PUBLISHABLE_KEY',
    'VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY',
    'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY',
    'SUPABASE_PUBLISHABLE_DEFAULT_KEY',
    'VITE_SUPABASE_ANON_KEY',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_ANON_KEY',
    'VITE_SUPABASE_PUBLIC_KEY',
    'SUPABASE_PUBLIC_KEY',
    'VITE_SUPABASE_KEY',
    'SUPABASE_KEY',
  ];
  for (const k of keys) {
    saved[k] = process.env[k];
    delete process.env[k];
  }
  process.env.VITE_SUPABASE_URL = 'https://demo-project.supabase.co';
  process.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY = 'sb_publishable_default_demo';

  try {
    const status = getServerSupabaseEnvStatus();
    assert.deepEqual(status, {
      configured: true,
      hasUrl: true,
      hasKey: true,
      matchedUrlVar: 'VITE_SUPABASE_URL',
      matchedKeyVar: 'VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY',
    });
    assert.deepEqual(getServerSupabaseEnv(), {
      url: 'https://demo-project.supabase.co',
      key: 'sb_publishable_default_demo',
    });
  } finally {
    for (const k of keys) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  }
});
