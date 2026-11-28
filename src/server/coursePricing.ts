import { SUPPLIER_IDENTITY } from '../config/legalConfig.ts';

export interface CoursePriceResolution {
  courseSlug: string;
  priceCents: number;
  source: 'database' | 'env_override' | 'reference';
  priceSource: 'database' | 'env_override' | 'reference';
  priceConfirmedForProduction: boolean;
  divergenceNote: string | null;
}

export interface CoursePriceConfirmationStatus {
  confirmed: boolean;
  envVarName: 'FERVEC_PRICE_CONFIRMED';
  note: string | null;
}

export interface ProductionLaunchLockStatus {
  environment: 'production' | 'sandbox';
  priceConfirmed: boolean;
  commercialLaunchApproved: boolean;
  legalPendingCleared: boolean;
  addressPending: boolean;
  productionCheckoutAllowed: boolean;
  blockers: string[];
}

export const OFFICIAL_CONFIRMED_PRICES_CENTS: Record<string, number> = {
  'massas-italianas': 1290,
  'cozinha-francesa': 1990,
  'cozinha-japonesa': 1990,
  'cozinha-brasileira': 1990,
};

const DEFAULT_COURSE_PRICES_CENTS: Record<string, number> = {
  ...OFFICIAL_CONFIRMED_PRICES_CENTS,
};

export function isCoursePriceConfirmedForProduction(
  env: Record<string, string | undefined> = typeof process !== 'undefined' ? process.env : {}
): CoursePriceConfirmationStatus {
  const raw = String(env.FERVEC_PRICE_CONFIRMED ?? 'false').trim().toLowerCase();
  const confirmed = raw === 'true' || raw === '1';
  return {
    confirmed,
    envVarName: 'FERVEC_PRICE_CONFIRMED',
    note: confirmed
      ? null
      : 'Divergência histórica R$ 12,00 vs R$ 12,90: aguarda FERVEC_PRICE_CONFIRMED=true após confirmação do proprietário.',
  };
}

export function evaluateProductionLaunchLock(
  env: Record<string, string | undefined> = typeof process !== 'undefined' ? process.env : {},
  opts?: { addressPending?: boolean }
): ProductionLaunchLockStatus {
  const environment =
    String(env.ASAAS_ENVIRONMENT ?? 'sandbox').trim().toLowerCase() === 'production'
      ? 'production'
      : 'sandbox';
  const priceConfirmed = isCoursePriceConfirmedForProduction(env).confirmed;
  const commercialLaunchApproved =
    String(env.FERVEC_COMMERCIAL_LAUNCH_APPROVED ?? 'false').trim().toLowerCase() === 'true';
  const legalPendingCleared =
    String(env.FERVEC_LEGAL_PENDING_CLEARED ?? 'false').trim().toLowerCase() === 'true';
  const addressPending = opts?.addressPending ?? SUPPLIER_IDENTITY.addressPending;

  const blockers: string[] = [];
  if (!priceConfirmed) {
    blockers.push('FERVEC_PRICE_CONFIRMED não confirmado (preço oficial R$ 12,90).');
  }
  if (addressPending) {
    blockers.push('Endereço físico completo e política de expiração pendentes em legalConfig.');
  }
  if (!legalPendingCleared) {
    blockers.push('FERVEC_LEGAL_PENDING_CLEARED=false (pendências jurídicas/contratuais abertas).');
  }
  if (!commercialLaunchApproved) {
    blockers.push('FERVEC_COMMERCIAL_LAUNCH_APPROVED=false (abertura comercial pública bloqueada).');
  }

  const productionCheckoutAllowed =
    environment !== 'production' ||
    (priceConfirmed && commercialLaunchApproved && legalPendingCleared && !addressPending);

  return {
    environment,
    priceConfirmed,
    commercialLaunchApproved,
    legalPendingCleared,
    addressPending,
    productionCheckoutAllowed,
    blockers,
  };
}

export interface GetAuthoritativePriceOptions {
  courseSlug?: string;
  dbPriceCents?: number | null;
  env?: Record<string, string | undefined>;
}

export function getAuthoritativeCoursePriceCents(
  courseSlugOrOpts: string | GetAuthoritativePriceOptions,
  envArg?: Record<string, string | undefined>
): CoursePriceResolution {
  const opts: GetAuthoritativePriceOptions =
    typeof courseSlugOrOpts === 'string'
      ? { courseSlug: courseSlugOrOpts, env: envArg }
      : courseSlugOrOpts || {};

  const env = opts.env ?? (typeof process !== 'undefined' ? process.env : {});
  const cleanSlug =
    String(opts.courseSlug || 'massas-italianas').trim().toLowerCase() || 'massas-italianas';
  const confirmStatus = isCoursePriceConfirmedForProduction(env);
  const confirmed = confirmStatus.confirmed;

  if (cleanSlug === 'massas-italianas') {
    const rawOverride = String(env.FERVEC_COURSE_PRICE_CENTS_MASSAS || '').trim();
    const parsedOverride = Number(rawOverride);
    if (rawOverride && Number.isInteger(parsedOverride) && parsedOverride >= 100 && parsedOverride <= 500000) {
      return {
        courseSlug: cleanSlug,
        priceCents: parsedOverride,
        source: 'env_override',
        priceSource: 'env_override',
        priceConfirmedForProduction: confirmed,
        divergenceNote: confirmStatus.note,
      };
    }
  }

  if (
    typeof opts.dbPriceCents === 'number' &&
    Number.isInteger(opts.dbPriceCents) &&
    opts.dbPriceCents >= 100 &&
    opts.dbPriceCents <= 500000
  ) {
    return {
      courseSlug: cleanSlug,
      priceCents: opts.dbPriceCents,
      source: 'database',
      priceSource: 'database',
      priceConfirmedForProduction: confirmed,
      divergenceNote: cleanSlug === 'massas-italianas' ? confirmStatus.note : null,
    };
  }

  const priceCents = DEFAULT_COURSE_PRICES_CENTS[cleanSlug] ?? 1990;
  return {
    courseSlug: cleanSlug,
    priceCents,
    source: 'reference',
    priceSource: 'reference',
    priceConfirmedForProduction: confirmed,
    divergenceNote: cleanSlug === 'massas-italianas' ? confirmStatus.note : null,
  };
}
