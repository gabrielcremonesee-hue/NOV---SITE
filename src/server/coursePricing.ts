import { SUPPLIER_IDENTITY } from '../config/legalConfig';

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
  productionAllowed: boolean;
  priceConfirmed: boolean;
  commercialLaunchApproved: boolean;
  legalPendingCleared: boolean;
  supplierAddressPending: boolean;
  officialPriceCents: number;
  blockers: string[];
  summaryNote: string;
}

export const OFFICIAL_CONFIRMED_PRICES_CENTS: Record<string, number> = {
  'massas-italianas': 1290,
  'cozinha-francesa': 1990,
  'cozinha-japonesa': 1990,
  'cozinha-brasileira': 1990,
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
      : 'Defina FERVEC_PRICE_CONFIRMED=true para refletir o preço oficial de R$ 12,90 confirmado pelo proprietário.',
  };
}

export function evaluateProductionLaunchLock(
  env: Record<string, string | undefined> = typeof process !== 'undefined' ? process.env : {}
): ProductionLaunchLockStatus {
  const priceConfirmed = isCoursePriceConfirmedForProduction(env).confirmed;
  const commercialLaunchApproved =
    String(env.FERVEC_COMMERCIAL_LAUNCH_APPROVED ?? 'false').trim().toLowerCase() === 'true';
  const legalPendingCleared =
    String(env.FERVEC_LEGAL_PENDING_CLEARED ?? 'false').trim().toLowerCase() === 'true';
  const supplierAddressPending = Boolean(SUPPLIER_IDENTITY.addressPending);

  const blockers: string[] = [];
  if (!priceConfirmed) {
    blockers.push('Confirmação formal de preço em ambiente (FERVEC_PRICE_CONFIRMED=true).');
  }
  if (!commercialLaunchApproved) {
    blockers.push('Aprovação comercial de abertura em produção (FERVEC_COMMERCIAL_LAUNCH_APPROVED=false).');
  }
  if (!legalPendingCleared) {
    blockers.push('Pendências jurídicas externas ainda não liberadas (FERVEC_LEGAL_PENDING_CLEARED=false).');
  }
  if (supplierAddressPending) {
    blockers.push('Endereço físico completo e prazo oficial de acesso pendentes de definição pelo titular.');
  }

  const productionAllowed =
    priceConfirmed &&
    commercialLaunchApproved &&
    legalPendingCleared &&
    !supplierAddressPending;

  return {
    productionAllowed,
    priceConfirmed,
    commercialLaunchApproved,
    legalPendingCleared,
    supplierAddressPending,
    officialPriceCents: OFFICIAL_CONFIRMED_PRICES_CENTS['massas-italianas'],
    blockers,
    summaryNote: productionAllowed
      ? 'Abertura comercial em produção liberada após validação completa.'
      : 'Preço oficial confirmado em R$ 12,90 (1.290 centavos); venda comercial em produção mantida bloqueada até fechamento das pendências jurídicas e aprovação comercial.',
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

  const priceCents = OFFICIAL_CONFIRMED_PRICES_CENTS[cleanSlug] ?? 1990;
  return {
    courseSlug: cleanSlug,
    priceCents,
    source: 'reference',
    priceSource: 'reference',
    priceConfirmedForProduction: confirmed,
    divergenceNote: cleanSlug === 'massas-italianas' ? confirmStatus.note : null,
  };
}
