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

export const OFFICIAL_CONFIRMED_PRICE_CENTS = 1290;

export interface CommercialLaunchReadiness {
  priceConfirmed: boolean;
  commercialLaunchApproved: boolean;
  legalBlockersCleared: boolean;
  asaasProductionConfigured: boolean;
  productionSalesAllowed: boolean;
  blockers: string[];
}

export interface EvaluateCommercialLaunchInput {
  env?: Record<string, string | undefined>;
  hasAsaasProductionCredentials?: boolean;
  addressPending?: boolean;
  accessDurationPending?: boolean;
}

const DEFAULT_COURSE_PRICES_CENTS: Record<string, number> = {
  'massas-italianas': OFFICIAL_CONFIRMED_PRICE_CENTS,
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
      : 'Divergência histórica R$ 12,00 vs R$ 12,90: aguarda FERVEC_PRICE_CONFIRMED=true após confirmação do proprietário.',
  };
}

export function evaluateCommercialLaunchReadiness(
  input: EvaluateCommercialLaunchInput = {}
): CommercialLaunchReadiness {
  const env = input.env ?? (typeof process !== 'undefined' ? process.env : {});
  const priceStatus = isCoursePriceConfirmedForProduction(env);
  const priceConfirmed = priceStatus.confirmed;

  const rawApproved = String(env.FERVEC_COMMERCIAL_LAUNCH_APPROVED ?? 'false').trim().toLowerCase();
  const commercialLaunchApproved = rawApproved === 'true' || rawApproved === '1';

  const rawLegalCleared = String(env.FERVEC_LEGAL_PENDING_CLEARED ?? 'false').trim().toLowerCase();
  const addressPending = input.addressPending ?? true;
  const accessDurationPending = input.accessDurationPending ?? true;
  const legalBlockersCleared =
    !addressPending && !accessDurationPending && (rawLegalCleared === 'true' || rawLegalCleared === '1');

  const asaasEnv = String(env.ASAAS_ENVIRONMENT || '').trim().toLowerCase();
  const asaasBase = String(env.ASAAS_BASE_URL || '').trim().toLowerCase();
  const asaasKey = String(env.ASAAS_API_KEY || '').trim();
  const asaasWebhookToken = String(env.ASAAS_WEBHOOK_TOKEN || '').trim();
  const asaasProductionConfigured =
    input.hasAsaasProductionCredentials ??
    Boolean(
      asaasKey &&
        asaasWebhookToken &&
        asaasEnv === 'production' &&
        asaasBase.includes('api.asaas.com') &&
        !asaasBase.includes('sandbox')
    );

  const blockers: string[] = [];
  if (!priceConfirmed) {
    blockers.push('Confirmação formal do preço oficial (FERVEC_PRICE_CONFIRMED=true) pendente.');
  }
  if (addressPending) {
    blockers.push('Endereço físico completo do fornecedor pendente nos Termos/Contrato.');
  }
  if (accessDurationPending) {
    blockers.push('Definição oficial do prazo de acesso e política de expiração pendente.');
  }
  if (!addressPending && !accessDurationPending && !legalBlockersCleared) {
    blockers.push('Sinalização formal de pendências jurídicas sanadas (FERVEC_LEGAL_PENDING_CLEARED=true) ausente.');
  }
  if (!asaasProductionConfigured) {
    blockers.push('Credenciais e webhook Asaas de produção não configurados no servidor.');
  }
  if (!commercialLaunchApproved) {
    blockers.push('Abertura comercial pública bloqueada (FERVEC_COMMERCIAL_LAUNCH_APPROVED=false).');
  }

  return {
    priceConfirmed,
    commercialLaunchApproved,
    legalBlockersCleared,
    asaasProductionConfigured,
    productionSalesAllowed:
      priceConfirmed && commercialLaunchApproved && legalBlockersCleared && asaasProductionConfigured,
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
