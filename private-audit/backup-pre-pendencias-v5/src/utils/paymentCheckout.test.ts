import test from 'node:test';
import assert from 'node:assert/strict';
import {
  fetchCoursePaymentSummary,
  getPaymentCheckoutState,
  PaymentCheckoutState,
  requestAsaasChargeCheckout,
  resetPaymentCheckoutState,
  subscribePaymentCheckout,
} from './paymentCheckout';

test('requestAsaasChargeCheckout toggles isProcessing while awaiting Asaas API and resets on completion', async () => {
  resetPaymentCheckoutState();

  const observed: PaymentCheckoutState[] = [];
  const unsubscribe = subscribePaymentCheckout((s) => observed.push(s));

  let resolveFetch!: (res: Response) => void;
  let fetchCalls = 0;

  const pendingPromise = requestAsaasChargeCheckout(
    {
      courseId: 'italiana',
      courseSlug: 'massas-italianas',
      courseTitle: 'Cozinha Italiana: Massas Artesanais.',
      value: 12,
    },
    {
      initConfig: async () => true,
      getConnectionInfo: () => ({ url: 'https://example.supabase.co', key: 'anon-key' }),
      getAccessToken: async () => 'jwt-token',
      fetchFn: () => {
        fetchCalls += 1;
        return new Promise<Response>((resolve) => {
          resolveFetch = resolve;
        });
      },
    }
  );

  // Immediately after invocation, loading state must be active
  assert.equal(getPaymentCheckoutState().isProcessing, true);
  assert.equal(getPaymentCheckoutState().activeCourseId, 'italiana');

  // Double-click / concurrent submission must be rejected without calling fetch again
  const duplicateOutcome = await requestAsaasChargeCheckout(
    {
      courseId: 'italiana',
      courseSlug: 'massas-italianas',
      courseTitle: 'Cozinha Italiana: Massas Artesanais.',
      value: 12,
    },
    {
      initConfig: async () => true,
      getConnectionInfo: () => ({ url: 'https://example.supabase.co', key: 'anon-key' }),
      getAccessToken: async () => 'jwt-token',
      fetchFn: async () => {
        fetchCalls += 1;
        throw new Error('Should not be called concurrently');
      },
    }
  );
  assert.equal(duplicateOutcome.ok, false);
  assert.equal(duplicateOutcome.reason, 'already_processing');

  // Wait microtasks so delayed fetchFn is registered
  await new Promise((r) => setTimeout(r, 10));
  assert.equal(fetchCalls, 1);
  assert.equal(getPaymentCheckoutState().isProcessing, true);

  resolveFetch(
    new Response(
      JSON.stringify({
        ok: true,
        payment: {
          id: 'pay_sandbox_123',
          status: 'PENDING',
          billingType: 'PIX',
          value: 12,
          dueDate: '2026-11-20',
          invoiceUrl: 'https://sandbox.asaas.com/i/pay_sandbox_123',
          pix: {
            payload: '000201010212',
          },
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  );

  const outcome = await pendingPromise;
  unsubscribe();

  assert.equal(outcome.ok, true);
  assert.equal(outcome.payment?.id, 'pay_sandbox_123');
  assert.equal(getPaymentCheckoutState().isProcessing, false);
  assert.equal(getPaymentCheckoutState().activeCourseId, null);
  assert.equal(observed.some((s) => s.isProcessing === true), true);
  assert.equal(observed[observed.length - 1]?.isProcessing, false);
});

test('requestAsaasChargeCheckout resets isProcessing and records error when Asaas API rejects', async () => {
  resetPaymentCheckoutState();

  const outcome = await requestAsaasChargeCheckout(
    {
      courseId: 'italiana',
      courseSlug: 'massas-italianas',
      courseTitle: 'Cozinha Italiana: Massas Artesanais.',
      value: 12,
    },
    {
      initConfig: async () => true,
      getConnectionInfo: () => ({ url: 'https://example.supabase.co', key: 'anon-key' }),
      getAccessToken: async () => 'jwt-token',
      fetchFn: async () =>
        new Response(
          JSON.stringify({
            ok: false,
            code: 'CUSTOMER_CPF_REQUIRED',
            error: 'CPF inválido no Asaas Sandbox',
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          }
        ),
    }
  );

  assert.equal(outcome.ok, false);
  assert.equal(outcome.reason, 'api_error');
  assert.equal(outcome.errorCode, 'CUSTOMER_CPF_REQUIRED');
  assert.equal(outcome.error, 'CPF inválido no Asaas Sandbox');
  assert.equal(getPaymentCheckoutState().isProcessing, false);
  assert.equal(getPaymentCheckoutState().lastError, 'CPF inválido no Asaas Sandbox');
});

test('requestAsaasChargeCheckout forwards customer CPF payload and handles network exceptions cleanly', async () => {
  resetPaymentCheckoutState();

  let capturedBody: Record<string, unknown> = {};
  const okOutcome = await requestAsaasChargeCheckout(
    {
      courseId: 'italiana',
      courseSlug: 'massas-italianas',
      courseTitle: 'Curso de Massas',
      billingType: 'PIX',
      customer: {
        name: 'Ana Carolina Souza',
        email: 'ana@fervec.test',
        cpfCnpj: '12345678909',
        mobilePhone: '11988887777',
      },
    },
    {
      initConfig: async () => true,
      getConnectionInfo: () => ({ url: 'https://example.supabase.co', key: 'anon-key' }),
      getAccessToken: async () => 'jwt-token',
      fetchFn: async (_url, init) => {
        capturedBody = JSON.parse(String(init?.body || '{}')) as Record<string, unknown>;
        return new Response(
          JSON.stringify({
            ok: true,
            orderId: 'ord-1',
            payment: { id: 'pay_1', status: 'PENDING', billingType: 'PIX', value: 12.9, dueDate: '2026-11-20' },
          }),
          { status: 201, headers: { 'Content-Type': 'application/json' } }
        );
      },
    }
  );

  assert.equal(okOutcome.ok, true);
  assert.deepEqual(capturedBody.customer, {
    name: 'Ana Carolina Souza',
    email: 'ana@fervec.test',
    cpfCnpj: '12345678909',
    mobilePhone: '11988887777',
  });

  const outcome = await requestAsaasChargeCheckout(
    {
      courseId: 'italiana',
      courseSlug: 'massas-italianas',
      courseTitle: 'Cozinha Italiana: Massas Artesanais.',
      value: 12,
    },
    {
      initConfig: async () => true,
      getConnectionInfo: () => ({ url: 'https://example.supabase.co', key: 'anon-key' }),
      getAccessToken: async () => 'jwt-token',
      fetchFn: async () => {
        throw new Error('Network offline');
      },
    }
  );

  assert.equal(outcome.ok, false);
  assert.equal(outcome.reason, 'network_error');
  assert.equal(outcome.error, 'Network offline');
  assert.equal(getPaymentCheckoutState().isProcessing, false);
});

test('fetchCoursePaymentSummary parses customerProfile and price from server response', async () => {
  const summary = await fetchCoursePaymentSummary('massas-italianas', {
    initConfig: async () => true,
    getAccessToken: async () => 'jwt-token',
    fetchFn: async () =>
      new Response(
        JSON.stringify({
          ok: true,
          courseSlug: 'massas-italianas',
          courseId: 'c-1',
          courseTitle: 'Curso de Massas',
          subtitle: 'Acesso ao curso',
          priceCents: 1290,
          priceFormatted: 'R$ 12,90',
          priceSource: 'database',
          capabilities: { pix: true, boleto: true, creditCard: false, debitCard: false, acceptedCardBrands: [] },
          isEnrolled: false,
          customerProfile: {
            hasAsaasCustomerId: false,
            fullName: 'Ana Carolina',
            email: 'ana@fervec.test',
            ddd: '11',
            phone: '98888-7777',
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      ),
  });

  assert.equal(summary.priceCents, 1290);
  assert.equal(summary.customerProfile?.hasAsaasCustomerId, false);
  assert.equal(summary.customerProfile?.fullName, 'Ana Carolina');
});

test('fetchCoursePaymentSummary and requestAsaasChargeCheckout propagate production environment and database price from create-asaas-charge', async () => {
  const calledUrls: string[] = [];
  const summary = await fetchCoursePaymentSummary('massas-italianas', {
    initConfig: async () => true,
    getConnectionInfo: () => ({ url: 'https://example.supabase.co', key: 'anon-key' }),
    getAccessToken: async () => null,
    fetchFn: async (input) => {
      const url = String(input);
      calledUrls.push(url);
      if (url.includes('/functions/v1/create-asaas-charge')) {
        return new Response(
          JSON.stringify({
            ok: true,
            environment: 'production',
            course: {
              courseId: 'course-uuid-1',
              slug: 'massas-italianas',
              title: 'Curso de Massas',
              priceCents: 1290,
              priceSource: 'database',
            },
            capabilities: {
              pix: true,
              boleto: true,
              creditCard: true,
              debitCard: false,
              acceptedCardBrands: ['VISA', 'MASTERCARD'],
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return new Response(
        JSON.stringify({
          ok: true,
          courseSlug: 'massas-italianas',
          priceCents: 1290,
          priceFormatted: 'R$ 12,90',
          priceSource: 'reference',
          capabilities: { pix: true, boleto: true, creditCard: false, debitCard: false, acceptedCardBrands: [] },
          isEnrolled: false,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    },
  });

  assert.equal(
    calledUrls.some((u) => u === 'https://example.supabase.co/functions/v1/create-asaas-charge?courseSlug=massas-italianas'),
    true
  );
  assert.equal(summary.environment, 'production');
  assert.equal(summary.priceCents, 1290);
  assert.match(summary.priceFormatted, /12,90/);
  assert.equal(summary.priceSource, 'database');
  assert.equal(summary.capabilities.creditCard, true);

  resetPaymentCheckoutState();
  const chargeOutcome = await requestAsaasChargeCheckout(
    {
      courseId: 'italiana',
      courseSlug: 'massas-italianas',
      courseTitle: 'Cozinha Italiana: Massas Artesanais.',
      value: 12.9,
    },
    {
      initConfig: async () => true,
      getConnectionInfo: () => ({ url: 'https://example.supabase.co', key: 'anon-key' }),
      getAccessToken: async () => 'jwt-token',
      fetchFn: async () =>
        new Response(
          JSON.stringify({
            ok: true,
            environment: 'production',
            orderId: 'ord-prod-1',
            payment: {
              id: 'pay_prod_1',
              status: 'PENDING',
              billingType: 'PIX',
              value: 12.9,
              dueDate: '2026-11-20',
            },
          }),
          { status: 201, headers: { 'Content-Type': 'application/json' } }
        ),
    }
  );
  assert.equal(chargeOutcome.ok, true);
  assert.equal(chargeOutcome.environment, 'production');
});

