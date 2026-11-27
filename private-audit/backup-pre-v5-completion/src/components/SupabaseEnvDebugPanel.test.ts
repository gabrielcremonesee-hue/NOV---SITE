import test from 'node:test';
import assert from 'node:assert/strict';
import { inspectSupabaseImportMetaEnv } from './SupabaseEnvDebugPanel';

test('inspectSupabaseImportMetaEnv reports missing and available VITE_SUPABASE_* flags without exposing raw keys', () => {
  const missingReport = inspectSupabaseImportMetaEnv({});
  assert.equal(missingReport.length, 3);
  assert.equal(missingReport[0].name, 'VITE_SUPABASE_URL');
  assert.equal(missingReport[0].available, false);
  assert.equal(missingReport[0].source, 'missing');
  assert.equal(missingReport[1].name, 'VITE_SUPABASE_ANON_KEY');
  assert.equal(missingReport[1].available, false);

  const presentReport = inspectSupabaseImportMetaEnv({
    VITE_SUPABASE_URL: 'https://demo-project.supabase.co/rest/v1',
    VITE_SUPABASE_ANON_KEY: 'super-secret-anon-token-value-12345',
  });
  assert.equal(presentReport[0].available, true);
  assert.equal(presentReport[0].source, 'import.meta.env');
  assert.equal(presentReport[0].detail, 'https://demo-project.supabase.co');
  assert.equal(presentReport[1].available, true);
  assert.equal(presentReport[1].source, 'import.meta.env');
  assert.doesNotMatch(presentReport[1].detail, /super-secret-anon-token-value-12345/);
  assert.match(presentReport[1].detail, /Disponível \(35 caracteres\)/);
  assert.equal(presentReport[2].available, false);
});
