import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyCouponDiscount,
  createCouponRecord,
  DEFAULT_COUPON_VALIDITY_DAYS,
  generateUniqueSixDigitCode,
  getCouponComputedStatus,
  redeemCouponProvisional,
  validateCouponForCourse,
} from './coupons';

test('generateUniqueSixDigitCode produces zero-padded unique 6-digit code avoiding collisions', () => {
  const existing = ['091100', '123456'];
  let calls = 0;
  const code = generateUniqueSixDigitCode(existing, () => {
    calls++;
    return calls === 1 ? 0.0911 : 0.00042;
  });
  assert.equal(code.length, 6);
  assert.match(code, /^\d{6}$/);
  assert.notEqual(code, '091100');
  assert.equal(code, '000420');
});

test('createCouponRecord defaults validity to 7 days and clamps invalid values', () => {
  const now = new Date('2026-11-25T12:00:00.000Z');
  const c = createCouponRecord({ discountPercent: 90, maxUses: 5, now }, [], () => 0.5);
  assert.equal(c.discountPercent, 90);
  assert.equal(c.validityDays, DEFAULT_COUPON_VALIDITY_DAYS);
  assert.equal(c.maxUses, 5);
  assert.equal(c.usesCount, 0);
  assert.equal(c.active, true);
  assert.equal(c.isProvisional, true);
  assert.equal(
    new Date(c.expiresAt).getTime() - now.getTime(),
    7 * 24 * 60 * 60 * 1000
  );
});

test('applyCouponDiscount computes exact BRL cents for 90% and 100% coupons', () => {
  const d90 = applyCouponDiscount(1290, 90);
  assert.equal(d90.subtotalCents, 1290);
  assert.equal(d90.discountCents, 1161);
  assert.equal(d90.totalCents, 129);
  assert.equal(d90.isFree, false);

  const d100 = applyCouponDiscount(1290, 100);
  assert.equal(d100.discountCents, 1290);
  assert.equal(d100.totalCents, 0);
  assert.equal(d100.isFree, true);
});

test('validateCouponForCourse enforces active, expiration, and max uses limits', () => {
  const baseDate = new Date('2026-11-01T10:00:00.000Z');
  const coupon = createCouponRecord(
    { code: '091100', discountPercent: 50, validityDays: 3, maxUses: 1, now: baseDate },
    []
  );

  // Valid inside 3 days
  const valid = validateCouponForCourse('091100', [coupon], 'massas-italianas', new Date('2026-11-02T10:00:00.000Z'));
  assert.equal(valid.ok, true);

  // Expired after 3 days
  const expired = validateCouponForCourse('091100', [coupon], 'massas-italianas', new Date('2026-11-05T10:00:00.000Z'));
  assert.equal(expired.ok, false);
  assert.equal(expired.reason, 'expired');

  // Inactive
  const disabled = { ...coupon, active: false };
  const inactiveRes = validateCouponForCourse('091100', [disabled], 'massas-italianas', baseDate);
  assert.equal(inactiveRes.ok, false);
  assert.equal(inactiveRes.reason, 'inactive');

  // Redeem once -> second redemption blocked & validation exhausted
  const redeemed = redeemCouponProvisional(coupon, {
    orderId: 'DEMO-001',
    courseSlug: 'massas-italianas',
    studentEmail: 'aluno@fervec.test',
    studentName: 'Maria Teste',
    originalCents: 1290,
    finalCents: 645,
    now: baseDate,
  });
  assert.equal(redeemed.ok, true);
  assert.equal(redeemed.coupon.usesCount, 1);
  assert.equal(getCouponComputedStatus(redeemed.coupon, baseDate), 'exhausted');

  const exhaustedCheck = validateCouponForCourse('091100', [redeemed.coupon], 'massas-italianas', baseDate);
  assert.equal(exhaustedCheck.ok, false);
  assert.equal(exhaustedCheck.reason, 'exhausted');
});

test('redeemCouponProvisional prevents duplicate redemption on the same orderId', () => {
  const now = new Date('2026-11-25T10:00:00.000Z');
  const coupon = createCouponRecord(
    { code: '887766', discountPercent: 100, validityDays: 7, maxUses: 10, now },
    []
  );
  const first = redeemCouponProvisional(coupon, {
    orderId: 'DEMO-XYZ',
    courseSlug: 'massas-italianas',
    studentEmail: 'maria@test.com',
    studentName: 'Maria',
    originalCents: 1290,
    finalCents: 0,
    now,
  });
  assert.equal(first.ok, true);
  const dup = redeemCouponProvisional(first.coupon, {
    orderId: 'DEMO-XYZ',
    courseSlug: 'massas-italianas',
    studentEmail: 'maria@test.com',
    studentName: 'Maria',
    originalCents: 1290,
    finalCents: 0,
    now,
  });
  assert.equal(dup.ok, false);
});
