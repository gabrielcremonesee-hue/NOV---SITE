export const ALLOWED_DISCOUNT_PERCENTS = [
  10, 20, 30, 40, 50, 60, 70, 80, 90, 100,
] as const;

export const ALLOWED_VALIDITY_DAYS = [1, 3, 7, 15, 30] as const;
export const DEFAULT_COUPON_VALIDITY_DAYS = 7;

export type CouponComputedStatus = 'active' | 'expired' | 'exhausted' | 'inactive';

export interface CouponRedemptionRecord {
  id: string;
  couponCode: string;
  orderId: string;
  courseSlug: string;
  studentEmail: string;
  studentName: string;
  discountPercent: number;
  originalCents: number;
  finalCents: number;
  redeemedAt: string;
  isDemo: true;
}

export interface CouponRecord {
  id: string;
  code: string;
  discountPercent: number;
  validityDays: number;
  maxUses: number;
  usesCount: number;
  active: boolean;
  createdAt: string;
  expiresAt: string;
  courseScope: string | 'all';
  redemptions: CouponRedemptionRecord[];
  isProvisional: true;
}

export interface CreateCouponInput {
  code?: string;
  discountPercent: number;
  validityDays?: number;
  maxUses?: number;
  courseScope?: string | 'all';
  now?: Date;
}

export interface CouponValidationResult {
  ok: boolean;
  reason?: 'empty' | 'not_found' | 'inactive' | 'expired' | 'exhausted' | 'wrong_course';
  message: string;
  coupon?: CouponRecord;
}

export interface AppliedDiscountBreakdown {
  subtotalCents: number;
  discountPercent: number;
  discountCents: number;
  totalCents: number;
  isFree: boolean;
}

export function normalizeCouponCode(raw: string): string {
  return String(raw || '')
    .trim()
    .replace(/\D/g, '')
    .slice(0, 6);
}

export function generateUniqueSixDigitCode(
  existingCodes: Iterable<string>,
  randomFn: () => number = Math.random
): string {
  const taken = new Set<string>();
  for (const c of existingCodes) {
    taken.add(normalizeCouponCode(c));
  }

  for (let attempt = 0; attempt < 500; attempt++) {
    const num = Math.floor(randomFn() * 1_000_000);
    const candidate = String(num).padStart(6, '0');
    if (!taken.has(candidate)) return candidate;
  }

  // Deterministic sweep fallback if random space gets crowded
  for (let i = 100000; i <= 999999; i++) {
    const candidate = String(i);
    if (!taken.has(candidate)) return candidate;
  }
  throw new Error('Não há códigos de 6 dígitos disponíveis.');
}

export function createCouponRecord(
  input: CreateCouponInput,
  existingCoupons: CouponRecord[],
  randomFn: () => number = Math.random
): CouponRecord {
  const now = input.now ?? new Date();
  const discountPercent = ALLOWED_DISCOUNT_PERCENTS.includes(
    input.discountPercent as (typeof ALLOWED_DISCOUNT_PERCENTS)[number]
  )
    ? input.discountPercent
    : 10;

  const validityDays = ALLOWED_VALIDITY_DAYS.includes(
    (input.validityDays ?? DEFAULT_COUPON_VALIDITY_DAYS) as (typeof ALLOWED_VALIDITY_DAYS)[number]
  )
    ? (input.validityDays ?? DEFAULT_COUPON_VALIDITY_DAYS)
    : DEFAULT_COUPON_VALIDITY_DAYS;

  const maxUsesRaw = Number(input.maxUses);
  const maxUses =
    Number.isFinite(maxUsesRaw) && maxUsesRaw >= 1 ? Math.min(9999, Math.floor(maxUsesRaw)) : 1;

  const existingCodes = existingCoupons.map((c) => c.code);
  let code = input.code ? normalizeCouponCode(input.code) : '';
  if (code.length !== 6 || existingCodes.includes(code)) {
    code = generateUniqueSixDigitCode(existingCodes, randomFn);
  }

  const expiresAt = new Date(now.getTime() + validityDays * 24 * 60 * 60 * 1000);

  return {
    id: `cup-${Date.now()}-${code}`,
    code,
    discountPercent,
    validityDays,
    maxUses,
    usesCount: 0,
    active: true,
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    courseScope: input.courseScope || 'all',
    redemptions: [],
    isProvisional: true,
  };
}

export function getCouponComputedStatus(
  coupon: CouponRecord,
  now: Date = new Date()
): CouponComputedStatus {
  if (!coupon.active) return 'inactive';
  if (coupon.usesCount >= coupon.maxUses) return 'exhausted';
  const expMs = Date.parse(coupon.expiresAt);
  if (Number.isFinite(expMs) && now.getTime() > expMs) return 'expired';
  return 'active';
}

export function getCouponStatusLabel(status: CouponComputedStatus): string {
  const map: Record<CouponComputedStatus, string> = {
    active: 'Ativo',
    expired: 'Expirado',
    exhausted: 'Limite atingido',
    inactive: 'Desativado',
  };
  return map[status];
}

export function validateCouponForCourse(
  rawCode: string,
  coupons: CouponRecord[],
  courseSlug: string,
  now: Date = new Date()
): CouponValidationResult {
  const code = normalizeCouponCode(rawCode);
  if (code.length !== 6) {
    return {
      ok: false,
      reason: 'empty',
      message: 'Informe um código de cupom válido com 6 dígitos.',
    };
  }

  const coupon = coupons.find((c) => c.code === code);
  if (!coupon) {
    return {
      ok: false,
      reason: 'not_found',
      message: 'Cupom não encontrado nesta base provisória.',
    };
  }

  const status = getCouponComputedStatus(coupon, now);
  if (status === 'inactive') {
    return {
      ok: false,
      reason: 'inactive',
      message: 'Este cupom foi desativado pela administração.',
      coupon,
    };
  }
  if (status === 'expired') {
    return {
      ok: false,
      reason: 'expired',
      message: 'Este cupom está expirado.',
      coupon,
    };
  }
  if (status === 'exhausted') {
    return {
      ok: false,
      reason: 'exhausted',
      message: 'Este cupom já atingiu o limite máximo de utilizações.',
      coupon,
    };
  }
  if (coupon.courseScope !== 'all' && coupon.courseScope !== courseSlug) {
    return {
      ok: false,
      reason: 'wrong_course',
      message: 'Este cupom não é válido para o curso selecionado.',
      coupon,
    };
  }

  return {
    ok: true,
    message: `Cupom ${coupon.code} aplicado com ${coupon.discountPercent}% de desconto (validação provisória local).`,
    coupon,
  };
}

export function applyCouponDiscount(
  subtotalCents: number,
  discountPercent: number
): AppliedDiscountBreakdown {
  const safeSub = Number.isFinite(subtotalCents) && subtotalCents > 0 ? Math.round(subtotalCents) : 0;
  const clampedPct = Math.max(0, Math.min(100, Math.round(discountPercent)));
  const discountCents = Math.min(safeSub, Math.round((safeSub * clampedPct) / 100));
  const totalCents = Math.max(0, safeSub - discountCents);

  return {
    subtotalCents: safeSub,
    discountPercent: clampedPct,
    discountCents,
    totalCents,
    isFree: totalCents === 0 && clampedPct === 100,
  };
}

export function redeemCouponProvisional(
  coupon: CouponRecord,
  params: {
    orderId: string;
    courseSlug: string;
    studentEmail: string;
    studentName: string;
    originalCents: number;
    finalCents: number;
    now?: Date;
  }
): { ok: boolean; error?: string; coupon: CouponRecord; redemption?: CouponRedemptionRecord } {
  const now = params.now ?? new Date();
  const status = getCouponComputedStatus(coupon, now);
  if (status !== 'active') {
    return {
      ok: false,
      error: `Cupom indisponível (${getCouponStatusLabel(status)}).`,
      coupon,
    };
  }

  // Protection against duplicate redemption for the same order ID
  if (coupon.redemptions.some((r) => r.orderId === params.orderId)) {
    return {
      ok: false,
      error: 'Este pedido demonstrativo já utilizou o cupom.',
      coupon,
    };
  }

  const redemption: CouponRedemptionRecord = {
    id: `red-${Date.now()}-${coupon.usesCount + 1}`,
    couponCode: coupon.code,
    orderId: params.orderId,
    courseSlug: params.courseSlug,
    studentEmail: params.studentEmail.trim().toLowerCase(),
    studentName: params.studentName.trim(),
    discountPercent: coupon.discountPercent,
    originalCents: params.originalCents,
    finalCents: params.finalCents,
    redeemedAt: now.toISOString(),
    isDemo: true,
  };

  const nextCoupon: CouponRecord = {
    ...coupon,
    usesCount: coupon.usesCount + 1,
    redemptions: [redemption, ...coupon.redemptions],
  };

  return { ok: true, coupon: nextCoupon, redemption };
}
