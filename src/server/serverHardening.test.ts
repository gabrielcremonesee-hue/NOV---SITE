import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { AddressInfo } from 'node:net';

process.env.FERVEC_NO_AUTO_LISTEN = '1';

test('serverHardening: CSP, X-Robots-Tag, TTS kill-switch, dev-auth gate, /api/library/book session gate, and static block', async () => {
  const prevDevAuth = process.env.FERVEC_ENABLE_DEV_LOCAL_AUTH;
  const prevTts = process.env.FERVEC_ALLOW_EXTERNAL_TTS;
  process.env.FERVEC_ENABLE_DEV_LOCAL_AUTH = 'false';
  process.env.FERVEC_ALLOW_EXTERNAL_TTS = 'false';

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fervec-srv-test-'));
  const dbPath = path.join(tmpDir, 'test-db.json');
  const fakePdfPath = path.join(tmpDir, 'book.pdf');
  fs.writeFileSync(fakePdfPath, '%PDF-1.4\n%fake\n', 'utf8');

  const { createFervecExpressApp } = await import('../../server');
  const app = createFervecExpressApp({
    privateBookPath: fakePdfPath,
    resolveSupabaseAuth: (async () => null) as never,
  });

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // 1. /api/legal/documents sets CSP (allowing AI Studio iframe + Biblioteca PDF.js) + X-Robots-Tag, without X-Frame-Options: SAMEORIGIN
    const legalRes = await fetch(`${baseUrl}/api/legal/documents`);
    assert.equal(legalRes.status, 200);
    const csp = legalRes.headers.get('content-security-policy') || '';
    assert.ok(csp.includes("default-src 'self'"));
    assert.ok(csp.includes('https://aistudio.google.com'));
    assert.ok(csp.includes('https://cdnjs.cloudflare.com'));
    assert.equal(legalRes.headers.get('x-frame-options'), null);
    assert.equal(legalRes.headers.get('x-robots-tag'), 'noindex, nofollow, noarchive');

    // 2. /api/auth/register blocks dev-local auth when FERVEC_ENABLE_DEV_LOCAL_AUTH !== 'true'
    const devAuthRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test', email: 'test@fervec.test', password: 'secret' }),
    });
    assert.equal(devAuthRes.status, 403);
    const devAuthJson = (await devAuthRes.json()) as Record<string, unknown>;
    assert.equal(devAuthJson.code, 'DEV_AUTH_DISABLED');

    // 3. /api/tts returns 503 + fallback: 'browser_speech' BEFORE external TTS synthesis
    const ttsRes = await fetch(`${baseUrl}/api/tts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'Olá chef', voiceName: 'Antonio' }),
    });
    assert.equal(ttsRes.status, 503);
    const ttsJson = (await ttsRes.json()) as Record<string, unknown>;
    assert.equal(ttsJson.fallback, 'browser_speech');

    // 4. /api/library/book requires valid authentication
    const bookUnauth = await fetch(`${baseUrl}/api/library/book`);
    assert.equal(bookUnauth.status, 401);

    // 5. Protected static directories blocked
    const directPdf = await fetch(`${baseUrl}/assets/fervec-massa-italiana.pdf`);
    assert.equal(directPdf.status, 403);

    const directBooksDir = await fetch(`${baseUrl}/private-books/fervec-massa-italiana.pdf`);
    assert.equal(directBooksDir.status, 403);

    const directAuditDir = await fetch(`${baseUrl}/private-audit/RELATORIO_FINAL_IMPLEMENTACAO_FERVEC.txt`);
    assert.equal(directAuditDir.status, 403);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    fs.rmSync(tmpDir, { recursive: true, force: true });
    if (prevDevAuth === undefined) delete process.env.FERVEC_ENABLE_DEV_LOCAL_AUTH;
    else process.env.FERVEC_ENABLE_DEV_LOCAL_AUTH = prevDevAuth;
    if (prevTts === undefined) delete process.env.FERVEC_ALLOW_EXTERNAL_TTS;
    else process.env.FERVEC_ALLOW_EXTERNAL_TTS = prevTts;
  }
});
