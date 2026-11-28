import test from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveAsaasCapabilities,
  resolveSandboxBaseUrl,
  validateCreateAsaasChargeBody,
} from './validation';

test('validateCreateAsaasChargeBody accepts valid PIX payload with customer data', () => {
  const fixedNow = new Date('2026-11-16T12:00:00.000Z');
  const res = validateCreateAsaasChargeBody(
    {
      courseSlug: 'massas-italianas',
      billingType: 'pix',
      value: 12,
      customer: {
        name: 'Maria Clara Silva',
        email: 'Maria@Exemplo.com',
        cpfCnpj: '529.982.247-25',
        mobilePhone: '(11) 98765-4321',
      },
    },
    fixedNow
  );

  assert.equal(res.ok, true);
  if (res.ok) {
    assert.equal(res.data.courseSlug, 'massas-italianas');
    assert.equal(res.data.billingType, 'PIX');
    assert.equal(res.data.value, 12);
    assert.equal(res.data.dueDate, '2026-11-19');
    assert.equal(res.data.customer?.email, 'maria@exemplo.com');
    assert.equal(res.data.customer?.cpfCnpj, '52998224725');
    assert.equal(res.data.customer?.mobilePhone, '11987654321');
  }
});

test('validateCreateAsaasChargeBody accepts existing customerId and explicit dueDate', () => {
  const res = validateCreateAsaasChargeBody({
    courseSlug: 'massas-italianas',
    billingType: 'BOLETO',
    value: 19.9,
    dueDate: '2026-11-25',
    customerId: 'cus_000005492817',
    externalReference: 'order-123',
  });

  assert.equal(res.ok, true);
  if (res.ok) {
    assert.equal(res.data.customerId, 'cus_000005492817');
    assert.equal(res.data.dueDate, '2026-11-25');
    assert.equal(res.data.externalReference, 'order-123');
  }
});

test('validateCreateAsaasChargeBody rejects invalid payload, bad CPF, and low amount', () => {
  const invalidShape = validateCreateAsaasChargeBody(null);
  assert.equal(invalidShape.ok, false);

  const res = validateCreateAsaasChargeBody({
    courseSlug: '',
    billingType: 'CRYPTO',
    value: 1.5,
    dueDate: '16/11/2026',
    customer: {
      name: 'A',
      email: 'invalid-email',
      cpfCnpj: '11111111111',
    },
  });

  assert.equal(res.ok, false);
  if (!res.ok) {
    const fields = res.errors.map((e) => e.field);
    assert.ok(fields.includes('courseSlug'));
    assert.ok(fields.includes('billingType'));
    assert.ok(fields.includes('value'));
    assert.ok(fields.includes('dueDate'));
    assert.ok(fields.includes('customer.name'));
    assert.ok(fields.includes('customer.email'));
    assert.ok(fields.includes('customer.cpfCnpj'));
  }
});

test('resolveSandboxBaseUrl always enforces Asaas Sandbox host and rejects production URLs', () => {
  assert.equal(resolveSandboxBaseUrl(undefined), 'https://api-sandbox.asaas.com/v3');
  assert.equal(
    resolveSandboxBaseUrl('https://api-sandbox.asaas.com/v3/'),
    'https://api-sandbox.asaas.com/v3'
  );
  assert.equal(
    resolveSandboxBaseUrl('https://api.asaas.com/v3'),
    'https://api-sandbox.asaas.com/v3'
  );
});

test('resolveAsaasCapabilities only exposes card brands when card modalities are confirmed', () => {
  const emptyCaps = resolveAsaasCapabilities(() => undefined);
  assert.equal(emptyCaps.creditCard, false);
  assert.equal(emptyCaps.debitCard, false);
  assert.deepEqual(emptyCaps.acceptedCardBrands, []);

  const enabledEnv: Record<string, string> = {
    ASAAS_ENABLE_CREDIT_CARD: 'true',
    ASAAS_ENABLE_DEBIT_CARD: 'true',
    ASAAS_CARD_BRANDS: 'visa, mastercard, elo, amex, unknown',
  };
  const enabledCaps = resolveAsaasCapabilities((k) => enabledEnv[k]);
  assert.equal(enabledCaps.creditCard, true);
  assert.equal(enabledCaps.debitCard, true);
  assert.deepEqual(enabledCaps.acceptedCardBrands, ['VISA', 'MASTERCARD', 'ELO', 'AMEX']);
});

test('validateCreateAsaasChargeBody preserves optional buyer address fields and rejects malformed postalCode', () => {
  const valid = validateCreateAsaasChargeBody({
    courseSlug: 'massas-italianas',
    billingType: 'PIX',
    customer: {
      name: 'Maria Clara Silva',
      email: 'maria@exemplo.com',
      cpfCnpj: '529.982.247-25',
      mobilePhone: '(11) 98765-4321',
      postalCode: '01310-100',
      address: 'Avenida Paulista',
      addressNumber: '1578',
      complement: 'Apto 42',
      province: 'Bela Vista',
    },
  });
  assert.equal(valid.ok, true);
  if (valid.ok) {
    assert.equal(valid.data.customer?.postalCode, '01310100');
    assert.equal(valid.data.customer?.address, 'Avenida Paulista');
    assert.equal(valid.data.customer?.addressNumber, '1578');
    assert.equal(valid.data.customer?.province, 'Bela Vista');
  }

  const badCep = validateCreateAsaasChargeBody({
    courseSlug: 'massas-italianas',
    billingType: 'PIX',
    customer: {
      name: 'Maria Clara Silva',
      email: 'maria@exemplo.com',
      cpfCnpj: '529.982.247-25',
      postalCode: '123',
    },
  });
  assert.equal(badCep.ok, false);
  if (!badCep.ok) {
    assert.ok(badCep.errors.some((e) => e.field === 'customer.postalCode'));
  }
});

