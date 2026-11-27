import test from 'node:test';
import assert from 'node:assert/strict';
import {
  authorizeInternalRequest,
  buildPaymentConfirmationEmail,
  resolveEmailEnvConfig,
  sendEmailViaResend,
  validateResendConnection,
  validateSendPaymentEmailBody,
} from './logic';

test('authorizeInternalRequest accepts valid service_role bearer or internal secret and rejects others', () => {
  assert.equal(
    authorizeInternalRequest({
      authorizationHeader: 'Bearer svc-secret-123',
      serviceRoleKey: 'svc-secret-123',
    }),
    true
  );

  assert.equal(
    authorizeInternalRequest({
      authorizationHeader: null,
      internalSecretHeader: 'internal-key-abc',
      serviceRoleKey: 'svc-secret-123',
      expectedInternalSecret: 'internal-key-abc',
    }),
    true
  );

  assert.equal(
    authorizeInternalRequest({
      authorizationHeader: 'Bearer wrong-token',
      serviceRoleKey: 'svc-secret-123',
      expectedInternalSecret: 'internal-key-abc',
    }),
    false
  );
});

test('validateSendPaymentEmailBody validates orderId, recipientEmail/userId, and optional metadata', () => {
  const missingOrder = validateSendPaymentEmailBody({ recipientEmail: 'aluno@fervec.test' });
  assert.equal(missingOrder.ok, false);

  const badEmail = validateSendPaymentEmailBody({
    orderId: 'ord-1',
    recipientEmail: 'email-invalido',
  });
  assert.equal(badEmail.ok, false);

  const valid = validateSendPaymentEmailBody({
    orderId: '11111111-1111-4111-8111-111111111111',
    recipientEmail: 'ALUNO@FERVEC.TEST',
    customerName: 'Maria <Chef>',
    courseTitle: 'Cozinha Italiana: Massas Artesanais',
    amountCents: 1200,
    billingType: 'pix',
  });
  assert.equal(valid.ok, true);
  if (valid.ok) {
    assert.equal(valid.data.recipientEmail, 'aluno@fervec.test');
    assert.equal(valid.data.billingType, 'PIX');
    assert.equal(valid.data.amountCents, 1200);
  }
});

test('buildPaymentConfirmationEmail escapes HTML and formats BRL and Pix metadata cleanly', () => {
  const email = buildPaymentConfirmationEmail(
    {
      orderId: 'ord-123',
      recipientEmail: 'aluno@fervec.test',
      customerName: 'João <script>alert(1)</script>',
      courseTitle: 'Cozinha Italiana: Massas Artesanais',
      amountCents: 1200,
      paymentId: 'pay_sandbox_999',
      billingType: 'PIX',
      paidAt: '2026-11-16T20:00:00.000Z',
      accessUrl: 'https://fervec.app/#/cursos',
    },
    'FerveC <noreply@fervec.app>'
  );

  assert.equal(email.to[0], 'aluno@fervec.test');
  assert.match(email.subject, /Pagamento confirmado/);
  assert.equal(email.html.includes('<script>'), false);
  assert.equal(email.html.includes('&lt;script&gt;'), true);
  assert.match(email.html, /R\$\s*12,00/);
  assert.match(email.html, /Pix/);
  assert.match(email.text, /pay_sandbox_999/);
});

test('sendEmailViaResend sends POST to Resend with Idempotency-Key and handles provider failures', async () => {
  let capturedUrl = '';
  let capturedHeaders: Record<string, string> = {};
  let capturedBody = '';

  const okRes = await sendEmailViaResend({
    apiKey: 're_test_123',
    fromEmail: 'FerveC <onboarding@resend.dev>',
    context: {
      orderId: 'ord-456',
      recipientEmail: 'aluno@fervec.test',
      customerName: 'Ana Clara',
      courseTitle: 'Massas Artesanais',
      amountCents: 1200,
      billingType: 'PIX',
      paidAt: '2026-11-16T20:00:00.000Z',
      accessUrl: 'https://fervec.app/#/cursos',
    },
    fetchFn: async (input, init) => {
      capturedUrl = String(input);
      capturedHeaders = (init?.headers as Record<string, string>) || {};
      capturedBody = String(init?.body || '');
      return new Response(JSON.stringify({ id: 'email_resend_001' }), { status: 200 });
    },
  });

  assert.equal(okRes.ok, true);
  assert.equal(okRes.id, 'email_resend_001');
  assert.equal(capturedUrl, 'https://api.resend.com/emails');
  assert.equal(capturedHeaders.Authorization, 'Bearer re_test_123');
  assert.equal(capturedHeaders['Idempotency-Key'], 'fervec-payment-confirmed-ord-456');
  assert.match(capturedBody, /aluno@fervec\.test/);

  const missingKey = await sendEmailViaResend({
    apiKey: '',
    fromEmail: 'FerveC <onboarding@resend.dev>',
    context: {
      orderId: 'ord-456',
      recipientEmail: 'aluno@fervec.test',
      customerName: 'Ana Clara',
      courseTitle: 'Massas Artesanais',
      amountCents: 1200,
      paidAt: '2026-11-16T20:00:00.000Z',
      accessUrl: 'https://fervec.app/#/cursos',
    },
  });
  assert.equal(missingKey.ok, false);
  assert.equal(missingKey.statusCode, 500);
});

test('resolveEmailEnvConfig supports FROM_EMAIL, RESEND_FROM_EMAIL, and sandbox default', () => {
  const fromPrimaryCfg = resolveEmailEnvConfig((k) =>
    k === 'RESEND_API_KEY'
      ? 're_live_or_test'
      : k === 'FROM_EMAIL'
        ? 'FerveC Gastronomia <contato@fervec.com.br>'
        : undefined
  );
  assert.equal(fromPrimaryCfg.apiKey, 're_live_or_test');
  assert.equal(fromPrimaryCfg.fromEmailSource, 'FROM_EMAIL');
  assert.equal(fromPrimaryCfg.fromEmailConfigured, true);
  assert.equal(fromPrimaryCfg.fromEmailValid, true);

  const fallbackCfg = resolveEmailEnvConfig((k) =>
    k === 'RESEND_API_KEY' ? 're_test_only' : undefined
  );
  assert.equal(fallbackCfg.fromEmailSource, 'default_sandbox');
  assert.equal(fallbackCfg.fromEmailConfigured, false);
  assert.equal(fallbackCfg.fromEmailValid, true);
});

test('validateResendConnection verifies domain access, restricted sending_access keys, and invalid credentials', async () => {
  const validConfig = resolveEmailEnvConfig((k) =>
    k === 'RESEND_API_KEY'
      ? 're_valid_123'
      : k === 'FROM_EMAIL'
        ? 'FerveC <naoresponda@fervecgastronomia.com.br>'
        : undefined
  );

  const okRes = await validateResendConnection({
    config: validConfig,
    fetchFn: async () =>
      new Response(
        JSON.stringify({
          data: [{ name: 'fervecgastronomia.com.br', status: 'verified' }],
        }),
        { status: 200 }
      ),
  });
  assert.equal(okRes.ok, true);
  assert.equal(okRes.connectionStatus, 'connected');
  assert.equal(okRes.domainVerified, true);
  assert.equal(okRes.secrets.RESEND_API_KEY, true);
  assert.equal(okRes.secrets.FROM_EMAIL, true);

  const sendOnlyRes = await validateResendConnection({
    config: validConfig,
    fetchFn: async () =>
      new Response(
        JSON.stringify({ message: 'This API key is restricted to only send emails' }),
        { status: 401 }
      ),
  });
  assert.equal(sendOnlyRes.ok, true);
  assert.equal(sendOnlyRes.connectionStatus, 'connected_send_only');

  const invalidKeyRes = await validateResendConnection({
    config: validConfig,
    fetchFn: async () =>
      new Response(JSON.stringify({ message: 'API key is invalid' }), { status: 401 }),
  });
  assert.equal(invalidKeyRes.ok, false);
  assert.equal(invalidKeyRes.connectionStatus, 'auth_failed');

  const missingKeyRes = await validateResendConnection({
    config: resolveEmailEnvConfig(() => undefined),
  });
  assert.equal(missingKeyRes.ok, false);
  assert.equal(missingKeyRes.connectionStatus, 'missing_api_key');
});

