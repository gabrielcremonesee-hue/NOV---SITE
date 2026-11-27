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

test('singleSessionManager enforces 1 simultaneous session and revokes on logout', () => {
  singleSessionManager.resetForTests();

  const missing = singleSessionManager.verifyOrBindSession('user-a', '');
  assert.equal(missing.ok, false);
  if (!missing.ok) assert.equal(missing.code, 'SESSION_REQUIRED');

  const claim1 = singleSessionManager.claimSession('user-a', 'session-device-1', 'Chrome Desktop');
  assert.equal(claim1.sessionId, 'session-device-1');
  assert.equal(singleSessionManager.getActiveCount(), 1);

  assert.equal(singleSessionManager.verifyOrBindSession('user-a', 'session-device-1').ok, true);

  const claim2 = singleSessionManager.claimSession('user-a', 'session-device-2', 'Mobile Safari');
  assert.equal(claim2.sessionId, 'session-device-2');

  const superseded = singleSessionManager.verifyOrBindSession('user-a', 'session-device-1');
  assert.equal(superseded.ok, false);
  if (!superseded.ok) assert.equal(superseded.code, 'SESSION_SUPERSEDED');

  assert.equal(singleSessionManager.verifyOrBindSession('user-a', 'session-device-2').ok, true);

  singleSessionManager.revokeSession('user-a', 'session-device-2');
  assert.equal(singleSessionManager.getActiveCount(), 0);
});

test('coursePricing enforces authoritative course prices and production confirmation flag', () => {
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

