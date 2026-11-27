export const ALLOWED_BILLING_TYPES = ['PIX', 'BOLETO', 'CREDIT_CARD', 'DEBIT_CARD', 'UNDEFINED'] as const;
export type AsaasBillingType = (typeof ALLOWED_BILLING_TYPES)[number];

export const KNOWN_CARD_BRANDS = ['VISA', 'MASTERCARD', 'ELO', 'AMEX', 'HIPERCARD'] as const;
export type AsaasCardBrand = (typeof KNOWN_CARD_BRANDS)[number];

export interface AsaasCapabilities {
  pix: boolean;
  boleto: boolean;
  creditCard: boolean;
  debitCard: boolean;
  acceptedCardBrands: AsaasCardBrand[];
}

export interface AsaasCustomerInput {
  name: string;
  email: string;
  cpfCnpj: string;
  mobilePhone?: string;
}

export interface CreateAsaasChargeInput {
  courseSlug: string;
  billingType: AsaasBillingType;
  value?: number;
  dueDate?: string;
  description?: string;
  externalReference?: string;
  customerId?: string;
  customer?: AsaasCustomerInput;
  couponCode?: string;
  idempotencyKey?: string;
}

export interface ValidationFieldError {
  field: string;
  message: string;
}

export type ChargeValidationResult =
  | {
      ok: true;
      data: {
        courseSlug: string;
        billingType: AsaasBillingType;
        value?: number;
        dueDate: string;
        description: string;
        externalReference?: string;
        customerId?: string;
        customer?: AsaasCustomerInput;
        couponCode?: string;
        idempotencyKey?: string;
      };
    }
  | {
      ok: false;
      errors: ValidationFieldError[];
    };

export function digitsOnly(value: unknown): string {
  return typeof value === 'string' ? value.replace(/\D/g, '') : '';
}

export function isValidCpf(cpfRaw: string): boolean {
  const d = digitsOnly(cpfRaw);
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) sum += Number(d[i]) * (10 - i);
  let rem = (sum * 10) % 11;
  if (rem === 10) rem = 0;
  if (rem !== Number(d[9])) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) sum += Number(d[i]) * (11 - i);
  rem = (sum * 10) % 11;
  if (rem === 10) rem = 0;
  return rem === Number(d[10]);
}

export function isValidCnpj(cnpjRaw: string): boolean {
  const d = digitsOnly(cnpjRaw);
  if (d.length !== 14 || /^(\d)\1{13}$/.test(d)) return false;

  const calc = (slice: string, weights: number[]): number => {
    let sum = 0;
    for (let i = 0; i < weights.length; i++) {
      sum += Number(slice[i]) * weights[i];
    }
    const rem = sum % 11;
    return rem < 2 ? 0 : 11 - rem;
  };

  const d1 = calc(d.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const d2 = calc(d.slice(0, 13), [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return d1 === Number(d[12]) && d2 === Number(d[13]);
}

export function isValidCpfOrCnpj(value: string): boolean {
  const d = digitsOnly(value);
  if (d.length === 11) return isValidCpf(d);
  if (d.length === 14) return isValidCnpj(d);
  return false;
}

export function isValidIsoDate(dateStr: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const [y, m, day] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, day));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m - 1 &&
    dt.getUTCDate() === day
  );
}

export function defaultSandboxDueDate(now: Date = new Date()): string {
  const target = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  const year = target.getUTCFullYear();
  const month = String(target.getUTCMonth() + 1).padStart(2, '0');
  const day = String(target.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function resolveSandboxBaseUrl(envUrl?: string | null): string {
  const fallback = 'https://api-sandbox.asaas.com/v3';
  if (!envUrl || !envUrl.trim()) return fallback;
  const trimmed = envUrl.trim().replace(/\/+$/, '');
  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname.toLowerCase();
    // Bloqueia uso acidental da URL de produção em ambiente de teste
    if (host === 'api-sandbox.asaas.com' || host === 'sandbox.asaas.com') {
      return trimmed;
    }
    return fallback;
  } catch {
    return fallback;
  }
}

export function resolveAsaasBaseUrl(
  environment: 'sandbox' | 'production',
  envUrl?: string | null
): string {
  if (environment !== 'production') {
    return resolveSandboxBaseUrl(envUrl);
  }
  const prodFallback = 'https://api.asaas.com/v3';
  if (!envUrl || !envUrl.trim()) return prodFallback;
  const trimmed = envUrl.trim().replace(/\/+$/, '');
  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname.toLowerCase();
    if (host === 'api.asaas.com' || host === 'www.asaas.com') {
      return trimmed;
    }
    return prodFallback;
  } catch {
    return prodFallback;
  }
}

export function resolveAsaasCapabilities(
  envGet: (name: string) => string | undefined
): AsaasCapabilities {
  const isTrue = (v?: string): boolean => v?.trim().toLowerCase() === 'true';
  const creditCard = isTrue(envGet('ASAAS_ENABLE_CREDIT_CARD'));
  const debitCard = isTrue(envGet('ASAAS_ENABLE_DEBIT_CARD'));

  const rawBrands = (envGet('ASAAS_CARD_BRANDS') || '')
    .split(',')
    .map((s) => s.trim().toUpperCase())
    .filter((s): s is AsaasCardBrand =>
      (KNOWN_CARD_BRANDS as readonly string[]).includes(s)
    );

  // Bandeiras só são exibidas se explicitamente confirmadas na configuração e houver modalidade de cartão ativa
  const acceptedCardBrands =
    creditCard || debitCard ? Array.from(new Set(rawBrands)) : [];

  return {
    pix: true,
    boleto: true,
    creditCard,
    debitCard,
    acceptedCardBrands,
  };
}

export function validateCreateAsaasChargeBody(
  body: unknown,
  now: Date = new Date()
): ChargeValidationResult {
  const errors: ValidationFieldError[] = [];

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return {
      ok: false,
      errors: [{ field: 'body', message: 'O corpo da requisição deve ser um objeto JSON válido.' }],
    };
  }

  const raw = body as Record<string, unknown>;

  const courseSlug = typeof raw.courseSlug === 'string' ? raw.courseSlug.trim() : '';
  if (!courseSlug || !/^[a-z0-9-]{2,80}$/i.test(courseSlug)) {
    errors.push({
      field: 'courseSlug',
      message: 'Informe um identificador de curso válido (courseSlug).',
    });
  }

  const billingTypeRaw =
    typeof raw.billingType === 'string' ? raw.billingType.trim().toUpperCase() : '';
  const billingType = (ALLOWED_BILLING_TYPES as readonly string[]).includes(billingTypeRaw)
    ? (billingTypeRaw as AsaasBillingType)
    : null;
  if (!billingType) {
    errors.push({
      field: 'billingType',
      message: `Forma de pagamento inválida. Use: ${ALLOWED_BILLING_TYPES.join(', ')}.`,
    });
  }

  let roundedValue: number | undefined;
  if (raw.value !== undefined && raw.value !== null && raw.value !== '') {
    const numericValue =
      typeof raw.value === 'number' ? raw.value : typeof raw.value === 'string' ? Number(raw.value) : NaN;
    const candidate = Number.isFinite(numericValue) ? Math.round(numericValue * 100) / 100 : NaN;
    if (!Number.isFinite(candidate) || candidate < 5 || candidate > 100000) {
      errors.push({
        field: 'value',
        message: 'Informe um valor numérico válido entre R$ 5,00 e R$ 100.000,00.',
      });
    } else {
      roundedValue = candidate;
    }
  }

  let dueDate = defaultSandboxDueDate(now);
  if (raw.dueDate !== undefined && raw.dueDate !== null && raw.dueDate !== '') {
    if (typeof raw.dueDate !== 'string' || !isValidIsoDate(raw.dueDate.trim())) {
      errors.push({
        field: 'dueDate',
        message: 'A data de vencimento deve estar no formato YYYY-MM-DD.',
      });
    } else {
      dueDate = raw.dueDate.trim();
    }
  }

  const customerId = typeof raw.customerId === 'string' ? raw.customerId.trim() : undefined;
  if (customerId !== undefined && customerId !== '' && !/^cus_[a-zA-Z0-9_]{4,80}$/.test(customerId)) {
    errors.push({
      field: 'customerId',
      message: 'customerId inválido. Deve seguir o formato cus_...',
    });
  }

  let normalizedCustomer: AsaasCustomerInput | undefined;
  if (!customerId && raw.customer !== undefined && raw.customer !== null) {
    if (typeof raw.customer !== 'object' || Array.isArray(raw.customer)) {
      errors.push({
        field: 'customer',
        message: 'Informe os dados do cliente em um objeto válido (customer: name, email, cpfCnpj).',
      });
    } else {
      const cust = raw.customer as Record<string, unknown>;
      const name = typeof cust.name === 'string' ? cust.name.trim().replace(/\s+/g, ' ') : '';
      const email = typeof cust.email === 'string' ? cust.email.trim().toLowerCase() : '';
      const cpfCnpj = digitsOnly(cust.cpfCnpj);
      const mobilePhone = digitsOnly(cust.mobilePhone);

      if (name.length < 3 || name.length > 120) {
        errors.push({
          field: 'customer.name',
          message: 'Informe o nome completo do cliente (entre 3 e 120 caracteres).',
        });
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 160) {
        errors.push({
          field: 'customer.email',
          message: 'Informe um e-mail válido para o cliente.',
        });
      }
      if (!isValidCpfOrCnpj(cpfCnpj)) {
        errors.push({
          field: 'customer.cpfCnpj',
          message: 'Informe um CPF (11 dígitos) ou CNPJ (14 dígitos) válido.',
        });
      }
      if (mobilePhone && (mobilePhone.length < 10 || mobilePhone.length > 11)) {
        errors.push({
          field: 'customer.mobilePhone',
          message: 'Telefone celular deve conter DDD + número (10 ou 11 dígitos).',
        });
      }

      if (errors.length === 0) {
        normalizedCustomer = {
          name,
          email,
          cpfCnpj,
          ...(mobilePhone ? { mobilePhone } : {}),
        };
      }
    }
  }

  let description = `FerveC Gastronomia — Curso ${courseSlug}`;
  if (typeof raw.description === 'string' && raw.description.trim()) {
    const trimmedDesc = raw.description.trim();
    if (trimmedDesc.length > 500) {
      errors.push({
        field: 'description',
        message: 'A descrição deve ter no máximo 500 caracteres.',
      });
    } else {
      description = trimmedDesc;
    }
  }

  let externalReference: string | undefined;
  if (raw.externalReference !== undefined && raw.externalReference !== null && raw.externalReference !== '') {
    if (typeof raw.externalReference !== 'string' || raw.externalReference.trim().length > 100) {
      errors.push({
        field: 'externalReference',
        message: 'externalReference deve ser uma string com até 100 caracteres.',
      });
    } else {
      externalReference = raw.externalReference.trim();
    }
  }

  let couponCode: string | undefined;
  if (raw.couponCode !== undefined && raw.couponCode !== null && raw.couponCode !== '') {
    const digits = digitsOnly(raw.couponCode);
    if (digits.length !== 6) {
      errors.push({
        field: 'couponCode',
        message: 'O cupom promocional deve conter 6 dígitos numéricos.',
      });
    } else {
      couponCode = digits;
    }
  }

  let idempotencyKey: string | undefined;
  if (raw.idempotencyKey !== undefined && raw.idempotencyKey !== null && raw.idempotencyKey !== '') {
    if (typeof raw.idempotencyKey !== 'string' || raw.idempotencyKey.trim().length > 100) {
      errors.push({
        field: 'idempotencyKey',
        message: 'idempotencyKey deve ter até 100 caracteres.',
      });
    } else {
      idempotencyKey = raw.idempotencyKey.trim();
    }
  }

  if (errors.length > 0 || !billingType) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    data: {
      courseSlug,
      billingType,
      ...(roundedValue !== undefined ? { value: roundedValue } : {}),
      dueDate,
      description,
      ...(externalReference ? { externalReference } : {}),
      ...(customerId ? { customerId } : {}),
      ...(normalizedCustomer ? { customer: normalizedCustomer } : {}),
      ...(couponCode ? { couponCode } : {}),
      ...(idempotencyKey ? { idempotencyKey } : {}),
    },
  };
}
