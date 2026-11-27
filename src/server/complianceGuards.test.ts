import test from 'node:test';
import assert from 'node:assert/strict';
import {
  financialGuard,
  readFinancialGuardConfig,
  getProgrammedChefReply,
} from './financialGuard';
import { singleSessionManager } from './singleSession';
import {
  getAuthoritativeCoursePriceCents,
  isCoursePriceConfirmedForProduction,
} from './coursePricing';
import {
  SUPPLIER_IDENTITY,
  maskCpfForLogs,
  buildPrintableContractText,
  getLegalDocumentVersions,
} from '../config/legalConfig';

test('financialGuard defaults to R$ 0 kill switch, local programmed replies, and enforces 429 rate limiting', () => {
  financialGuard.resetForTests();
  const defaultCfg = readFinancialGuardConfig({});
  assert.equal(defaultCfg.allowPaidAi, false);
  assert.equal(defaultCfg.allowExternalTts, false);
  assert.equal(defaultCfg.dailyBudgetUsd, 0);

  const first = financialGuard.tryConsumeChatQuota('user-1', defaultCfg, 1000);
  assert.equal(first.allowed, true);
  assert.equal(first.mode, 'local_programmed');

  const ttsDisabled = financialGuard.canUseExternalTts('user-1', defaultCfg, 1000);
  assert.equal(ttsDisabled.allowed, false);
  assert.equal(ttsDisabled.status, 503);

  const strictCfg = readFinancialGuardConfig({
    FERVEC_ALLOW_PAID_AI: 'true',
    FERVEC_AI_DAILY_BUDGET_USD: '1.00',
    FERVEC_AI_MAX_CALLS_PER_USER_DAY: '5',
    FERVEC_AI_MAX_CALLS_PER_MINUTE: '2',
  });
  const p1 = financialGuard.tryConsumeChatQuota('user-2', strictCfg, 2000);
  const p2 = financialGuard.tryConsumeChatQuota('user-2', strictCfg, 2100);
  const p3 = financialGuard.tryConsumeChatQuota('user-2', strictCfg, 2200);
  assert.equal(p1.allowed, true);
  assert.equal(p1.mode, 'paid_ai');
  assert.equal(p2.allowed, true);
  assert.equal(p3.allowed, false);
  assert.equal(p3.status, 429);

  const reply = getProgrammedChefReply({ question: 'Como evitar talhar os ovos da Carbonara?' });
  assert.match(reply, /pasteurizados/i);
  assert.match(reply, /Guia programado FerveC/);
});

test('financialGuard trips circuit breaker after 3 consecutive paid AI failures', () => {
  financialGuard.resetForTests();
  const cfg = readFinancialGuardConfig({
    FERVEC_ALLOW_PAID_AI: 'true',
    FERVEC_AI_DAILY_BUDGET_USD: '5.00',
    FERVEC_AI_MAX_CALLS_PER_USER_DAY: '10',
    FERVEC_AI_MAX_CALLS_PER_MINUTE: '10',
  });

  financialGuard.recordPaidAiFailure(5000);
  financialGuard.recordPaidAiFailure(5100);
  financialGuard.recordPaidAiFailure(5200);

  const tripped = financialGuard.tryConsumeChatQuota('user-3', cfg, 5300);
  assert.equal(tripped.allowed, true);
  assert.equal(tripped.mode, 'local_programmed');
  assert.match(tripped.reason || '', /Circuito de proteção/);
});

test('singleSessionManager issues HMAC user-bound tokens, enforces 1 simultaneous session, TTL, and safe logout', () => {
  singleSessionManager.resetForTests();
  const baseNow = 1_700_000_000_000;

  const missing = singleSessionManager.verifySession('user-a', '');
  assert.equal(missing.ok, false);
  if (!missing.ok) assert.equal(missing.code, 'SESSION_REQUIRED');

  // Client-invented arbitrary strings and blind cold-start auto-binding MUST fail
  const forged = singleSessionManager.verifySession('user-a', 'session-device-1', { nowMs: baseNow });
  assert.equal(forged.ok, false);
  if (!forged.ok) assert.equal(forged.code, 'SESSION_INVALID');

  const claim1 = singleSessionManager.claimSession('user-a', 'client-chosen-sid', 'Chrome Desktop', {
    nowMs: baseNow,
    ttlMs: 60_000,
  });
  assert.notEqual(claim1.sessionId, 'client-chosen-sid');
  assert.match(claim1.sessionId, /^fv1\.[a-f0-9]+\.\d+\.[a-f0-9]{64}$/);
  assert.equal(singleSessionManager.getActiveCount(baseNow), 1);

  assert.equal(
    singleSessionManager.verifySession('user-a', claim1.sessionId, { nowMs: baseNow + 1000 }).ok,
    true
  );

  // Same-browser tab preserving valid token does NOT kick existing tab
  const sameBrowser = singleSessionManager.claimSession('user-a', claim1.sessionId, 'Tab 2', {
    preserveExistingIfValid: true,
    nowMs: baseNow + 2000,
    ttlMs: 60_000,
  });
  assert.equal(sameBrowser.sessionId, claim1.sessionId);
  assert.equal(sameBrowser.preserved, true);

  // Cross-user token replay MUST fail with SESSION_INVALID
  const crossUser = singleSessionManager.verifySession('user-b', claim1.sessionId, { nowMs: baseNow + 2000 });
  assert.equal(crossUser.ok, false);
  if (!crossUser.ok) assert.equal(crossUser.code, 'SESSION_INVALID');

  // Tampered signature MUST fail with SESSION_INVALID
  const tamperedToken = `${claim1.sessionId.slice(0, -1)}${claim1.sessionId.endsWith('0') ? '1' : '0'}`;
  const tampered = singleSessionManager.verifySession('user-a', tamperedToken, { nowMs: baseNow + 2000 });
  assert.equal(tampered.ok, false);
  if (!tampered.ok) assert.equal(tampered.code, 'SESSION_INVALID');

  // New authenticated session supersedes session 1 atomically
  const claim2 = singleSessionManager.claimSession('user-a', undefined, 'Mobile Safari', {
    nowMs: baseNow + 3000,
    ttlMs: 60_000,
  });
  assert.notEqual(claim2.sessionId, claim1.sessionId);

  const superseded = singleSessionManager.verifySession('user-a', claim1.sessionId, { nowMs: baseNow + 3500 });
  assert.equal(superseded.ok, false);
  if (!superseded.ok) assert.equal(superseded.code, 'SESSION_SUPERSEDED');

  // Old-session logout MUST NOT revoke the newer session
  const revokedOld = singleSessionManager.revokeSession('user-a', claim1.sessionId);
  assert.equal(revokedOld, false);
  assert.equal(
    singleSessionManager.verifySession('user-a', claim2.sessionId, { nowMs: baseNow + 4000 }).ok,
    true
  );

  // Expired TTL rejects with SESSION_EXPIRED
  const expired = singleSessionManager.verifySession('user-a', claim2.sessionId, {
    nowMs: baseNow + 3000 + 61_000,
  });
  assert.equal(expired.ok, false);
  if (!expired.ok) assert.equal(expired.code, 'SESSION_EXPIRED');

  // Active session logout revokes cleanly
  const claim3 = singleSessionManager.claimSession('user-a', undefined, 'Browser 3', {
    nowMs: baseNow + 100_000,
    ttlMs: 60_000,
  });
  assert.equal(singleSessionManager.revokeSession('user-a', claim3.sessionId), true);
  assert.equal(singleSessionManager.getActiveCount(baseNow + 100_000), 0);
});

test('coursePricing enforces authoritative course prices, confirmed R$ 12,90, and commercial launch lock', async () => {
  const { evaluateProductionLaunchLock } = await import('./coursePricing');
  const unconfirmed = isCoursePriceConfirmedForProduction({});
  assert.equal(unconfirmed.confirmed, false);
  assert.match(unconfirmed.note || '', /12,90/);

  const confirmed = isCoursePriceConfirmedForProduction({ FERVEC_PRICE_CONFIRMED: 'true' });
  assert.equal(confirmed.confirmed, true);
  assert.equal(confirmed.note, null);

  const resolvedDefault = getAuthoritativeCoursePriceCents({ courseSlug: 'massas-italianas', env: {} });
  assert.equal(resolvedDefault.priceCents, 1290);
  assert.equal(resolvedDefault.priceSource, 'reference');
  assert.equal(resolvedDefault.priceConfirmedForProduction, false);

  const resolvedDb = getAuthoritativeCoursePriceCents({
    courseSlug: 'massas-italianas',
    dbPriceCents: 1200,
    env: { FERVEC_PRICE_CONFIRMED: 'true' },
  });
  assert.equal(resolvedDb.priceCents, 1200);
  assert.equal(resolvedDb.priceSource, 'database');
  assert.equal(resolvedDb.priceConfirmedForProduction, true);

  // Price confirmation alone does NOT unlock production commercial sales while address/legal/approval flags are pending
  const lockWithPriceOnly = evaluateProductionLaunchLock({
    FERVEC_PRICE_CONFIRMED: 'true',
    FERVEC_COMMERCIAL_LAUNCH_APPROVED: 'false',
    FERVEC_LEGAL_PENDING_CLEARED: 'false',
  });
  assert.equal(lockWithPriceOnly.priceConfirmed, true);
  assert.equal(lockWithPriceOnly.officialPriceCents, 1290);
  assert.equal(lockWithPriceOnly.supplierAddressPending, true);
  assert.equal(lockWithPriceOnly.productionAllowed, false);
  assert.ok(lockWithPriceOnly.blockers.length >= 3);
});

test('legalConfig exposes Gabriel Cremonese supplier details, masks CPF in logs, and builds printable Art. 49 contract', () => {
  assert.equal(SUPPLIER_IDENTITY.civilName, 'Gabriel Cremonese');
  assert.equal(SUPPLIER_IDENTITY.cpfFormatted, '102.722.209-90');
  assert.equal(SUPPLIER_IDENTITY.minimumAgeYears, 18);
  assert.equal(SUPPLIER_IDENTITY.regretDays, 7);
  assert.equal(maskCpfForLogs('102.722.209-90'), '***.722.209-**');
  assert.equal(getLegalDocumentVersions().termsVersion, '1.1');

  const contract = buildPrintableContractText({
    courseTitle: 'Curso de Massas',
    courseSlug: 'massas-italianas',
    priceFormatted: 'R$ 12,90',
    paymentMethodLabel: 'Pix',
    studentName: 'Ana Souza',
    studentEmail: 'ana@example.com',
    environmentLabel: 'Modo demonstração local',
    orderId: 'ord-123',
  });
  assert.match(contract, /Gabriel Cremonese/);
  assert.match(contract, /102\.722\.209-90/);
  assert.match(contract, /Art\. 49 do CDC/);
  assert.match(contract, /7 dias corridos/);
  assert.match(contract, /pendente de confirmação/i);
});

test('Documento Unico HTML stays aligned with V5 legal, AI, pricing, payment, and pending address/duration disclosures', async () => {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const htmlPath = path.resolve(process.cwd(), 'public', SUPPLIER_IDENTITY.documentoUnicoUrl.replace(/^\//, ''));
  const html = fs.readFileSync(htmlPath, 'utf8');

  assert.doesNotMatch(html, /IA só para imagens/i);
  assert.doesNotMatch(html, /IA usada.*?mais para criação de imagens/i);
  assert.doesNotMatch(html, /Valor referencial de catálogo/i);
  assert.doesNotMatch(html, /obrigações fiscais/i);
  assert.match(html, /Chef Cremonese por texto/i);
  assert.match(html, /respostas locais programadas a custo R\$ 0/i);
  assert.match(html, /síntese de voz local do próprio navegador/i);
  assert.match(html, /Gabriel Cremonese/);
  assert.match(html, /102\.722\.209-90/);
  assert.match(html, /fervecrgastronomia@gmail\.com/);
  assert.match(html, /18 anos completos/);
  assert.match(html, /Endereço físico(?: completo)? pendente/i);
  assert.match(html, /Duração fixa e regras de expiração aguardando definição expressa/i);
  assert.match(html, /confirmado oficialmente em R\$ 12,90/i);
});

test('SlidingFixedRateLimiter enforces sliding/fixed window quota and sets Retry-After semantics', async () => {
  const { SlidingFixedRateLimiter } = await import('./rateLimit');
  const limiter = new SlidingFixedRateLimiter({ windowMs: 10_000, maxRequests: 2, name: 'test' });
  const r1 = limiter.check('k1', 1000);
  const r2 = limiter.check('k1', 2000);
  const r3 = limiter.check('k1', 3000);
  assert.equal(r1.allowed, true);
  assert.equal(r1.remaining, 1);
  assert.equal(r2.allowed, true);
  assert.equal(r2.remaining, 0);
  assert.equal(r3.allowed, false);
  assert.ok(r3.retryAfterSeconds >= 7);

  const afterWindow = limiter.check('k1', 12_000);
  assert.equal(afterWindow.allowed, true);
  assert.equal(afterWindow.remaining, 1);
});

