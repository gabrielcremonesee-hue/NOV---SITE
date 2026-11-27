import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CreateWebhookLogInput,
  OrderRecord,
  parseAsaasWebhookPayload,
  processAsaasWebhook,
  sanitizeWebhookHeaders,
  UpdateWebhookLogInput,
  verifyWebhookToken,
  WebhookRepository,
} from './logic';

interface StoredWebhookLog extends CreateWebhookLogInput {
  id: string;
  processingStatus: string;
  httpStatus?: number;
  orderId?: string | null;
  errorMessage?: string | null;
  processedAt?: string;
}

function createInMemoryRepo(
  initialOrders: OrderRecord[],
  opts?: { throwOnOrderUpdate?: boolean }
): {
  repo: WebhookRepository;
  orders: Map<string, OrderRecord>;
  processedEvents: Set<string>;
  enrollments: Map<string, { status: string }>;
  payments: Map<string, Record<string, unknown>>;
  webhookLogs: StoredWebhookLog[];
} {
  const orders = new Map(initialOrders.map((o) => [o.id, { ...o }]));
  const processedEvents = new Set<string>();
  const enrollments = new Map<string, { status: string }>();
  const payments = new Map<string, Record<string, unknown>>();
  const webhookLogs: StoredWebhookLog[] = [];

  const repo: WebhookRepository = {
    async createWebhookLog(input) {
      const id = `log-${webhookLogs.length + 1}`;
      webhookLogs.push({
        id,
        ...input,
        processingStatus: 'received',
      });
      return id;
    },
    async updateWebhookLog(input: UpdateWebhookLogInput) {
      const row = webhookLogs.find((l) => l.id === input.logId);
      if (row) {
        row.processingStatus = input.processingStatus;
        row.httpStatus = input.httpStatus;
        row.orderId = input.orderId ?? null;
        row.errorMessage = input.errorMessage ?? null;
        row.processedAt = input.processedAt;
      }
    },
    async hasProcessedEvent(eventId) {
      return processedEvents.has(eventId);
    },
    async recordProcessedEvent({ eventId }) {
      processedEvents.add(eventId);
    },
    async findOrder({ asaasPaymentId, externalReference }) {
      if (externalReference && orders.has(externalReference)) {
        return orders.get(externalReference)!;
      }
      for (const order of orders.values()) {
        if (order.asaas_payment_id === asaasPaymentId) return order;
      }
      return null;
    },
    async updateOrderStatus({ orderId, status, asaasPaymentId, paidAt }) {
      if (opts?.throwOnOrderUpdate) {
        throw new Error('Simulated DB write failure');
      }
      const existing = orders.get(orderId);
      if (!existing) return null;
      const next: OrderRecord = {
        ...existing,
        status,
        asaas_payment_id: asaasPaymentId,
        paid_at: paidAt,
      };
      orders.set(orderId, next);
      return next;
    },
    async upsertPaymentRecord({ orderId, userId, payment }) {
      payments.set(payment.id, { orderId, userId, status: payment.status });
    },
    async syncEnrollmentAccess({ userId, courseId, grantAccess, revokeAccess }) {
      const key = `${userId}:${courseId}`;
      if (grantAccess) {
        enrollments.set(key, { status: 'in_progress' });
      } else if (revokeAccess) {
        enrollments.set(key, { status: 'canceled' });
      }
    },
  };

  return { repo, orders, processedEvents, enrollments, payments, webhookLogs };
}

test('verifyWebhookToken enforces constant-time exact token match', () => {
  assert.equal(verifyWebhookToken('whsec_sandbox_123', 'whsec_sandbox_123'), true);
  assert.equal(verifyWebhookToken('whsec_sandbox_124', 'whsec_sandbox_123'), false);
  assert.equal(verifyWebhookToken('', 'whsec_sandbox_123'), false);
  assert.equal(verifyWebhookToken(null, 'whsec_sandbox_123'), false);
  assert.equal(verifyWebhookToken('whsec_sandbox_123', ''), false);
});

test('sanitizeWebhookHeaders redacts secret headers before saving to webhook_logs', () => {
  const sanitized = sanitizeWebhookHeaders({
    'Asaas-Access-Token': 'super-secret-token',
    Authorization: 'Bearer jwt-secret',
    'Content-Type': 'application/json',
    'User-Agent': 'Asaas-Webhook/1.0',
  });

  assert.equal(sanitized['asaas-access-token'], '[REDACTED]');
  assert.equal(sanitized['authorization'], '[REDACTED]');
  assert.equal(sanitized['content-type'], 'application/json');
  assert.equal(sanitized['user-agent'], 'Asaas-Webhook/1.0');
});

test('parseAsaasWebhookPayload validates structure and maps events', () => {
  const invalid = parseAsaasWebhookPayload({ event: 'PAYMENT_CONFIRMED' });
  assert.equal(invalid.ok, false);

  const valid = parseAsaasWebhookPayload({
    id: 'evt_001',
    event: 'PAYMENT_RECEIVED',
    payment: {
      id: 'pay_999',
      status: 'RECEIVED',
      value: 12,
      billingType: 'PIX',
      externalReference: '11111111-1111-4111-8111-111111111111',
    },
  });
  assert.equal(valid.ok, true);
  if (valid.ok) {
    assert.equal(valid.data.orderStatus, 'paid');
    assert.equal(valid.data.shouldGrantAccess, true);
    assert.equal(valid.data.eventId, 'evt_001');
  }
});

test('processAsaasWebhook logs unauthorized attempts in webhook_logs with redacted headers', async () => {
  const orderId = '11111111-1111-4111-8111-111111111111';
  const mem = createInMemoryRepo([
    {
      id: orderId,
      user_id: 'user-1',
      course_id: 'course-italiana',
      status: 'pending',
      asaas_payment_id: 'pay_123',
    },
  ]);

  const res = await processAsaasWebhook({
    rawBody: {
      id: 'evt_unauth',
      event: 'PAYMENT_CONFIRMED',
      payment: { id: 'pay_123', status: 'CONFIRMED', externalReference: orderId },
    },
    providedToken: 'wrong-token',
    expectedToken: 'secret-sandbox-token',
    requestHeaders: { 'asaas-access-token': 'wrong-token', 'content-type': 'application/json' },
    repo: mem.repo,
  });

  assert.equal(res.statusCode, 401);
  assert.equal(mem.orders.get(orderId)?.status, 'pending');
  assert.equal(mem.enrollments.size, 0);
  assert.equal(mem.webhookLogs.length, 1);
  assert.equal(mem.webhookLogs[0].processingStatus, 'unauthorized');
  assert.equal(mem.webhookLogs[0].httpStatus, 401);
  assert.equal(mem.webhookLogs[0].tokenValid, false);
  assert.equal(mem.webhookLogs[0].requestHeaders['asaas-access-token'], '[REDACTED]');
});

test('processAsaasWebhook marks order paid, logs processed and duplicate events in webhook_logs', async () => {
  const orderId = '22222222-2222-4222-8222-222222222222';
  const mem = createInMemoryRepo([
    {
      id: orderId,
      user_id: 'user-2',
      course_id: 'course-italiana',
      status: 'pending',
      asaas_payment_id: 'pay_abc',
    },
  ]);

  const payload = {
    id: 'evt_confirmed_1',
    event: 'PAYMENT_CONFIRMED',
    payment: {
      id: 'pay_abc',
      status: 'CONFIRMED',
      value: 12,
      billingType: 'PIX',
      confirmedDate: '2026-11-16',
      externalReference: orderId,
    },
  };

  const first = await processAsaasWebhook({
    rawBody: payload,
    providedToken: 'secret-sandbox-token',
    expectedToken: 'secret-sandbox-token',
    repo: mem.repo,
    nowIso: '2026-11-16T20:00:00.000Z',
  });

  assert.equal(first.statusCode, 200);
  assert.equal(first.body.orderStatus, 'paid');
  assert.equal(first.body.accessGranted, true);
  assert.equal(mem.orders.get(orderId)?.status, 'paid');
  assert.equal(mem.webhookLogs[0].processingStatus, 'processed');
  assert.equal(mem.webhookLogs[0].orderId, orderId);

  const duplicate = await processAsaasWebhook({
    rawBody: payload,
    providedToken: 'secret-sandbox-token',
    expectedToken: 'secret-sandbox-token',
    repo: mem.repo,
  });

  assert.equal(duplicate.statusCode, 200);
  assert.equal(duplicate.body.duplicate, true);
  assert.equal(mem.webhookLogs[1].processingStatus, 'duplicate');
});

test('processAsaasWebhook logs failed status and errorMessage when DB update fails', async () => {
  const orderId = '44444444-4444-4444-8444-444444444444';
  const mem = createInMemoryRepo(
    [
      {
        id: orderId,
        user_id: 'user-4',
        course_id: 'course-italiana',
        status: 'pending',
        asaas_payment_id: 'pay_fail',
      },
    ],
    { throwOnOrderUpdate: true }
  );

  const res = await processAsaasWebhook({
    rawBody: {
      id: 'evt_fail_1',
      event: 'PAYMENT_CONFIRMED',
      payment: { id: 'pay_fail', status: 'CONFIRMED', externalReference: orderId },
    },
    providedToken: 'secret-sandbox-token',
    expectedToken: 'secret-sandbox-token',
    repo: mem.repo,
  });

  assert.equal(res.statusCode, 500);
  assert.equal(mem.webhookLogs.length, 1);
  assert.equal(mem.webhookLogs[0].processingStatus, 'failed');
  assert.equal(mem.webhookLogs[0].httpStatus, 500);
  assert.equal(mem.webhookLogs[0].errorMessage, 'Simulated DB write failure');
});

test('processAsaasWebhook handles refund event and revokes enrollment access', async () => {
  const orderId = '33333333-3333-4333-8333-333333333333';
  const mem = createInMemoryRepo([
    {
      id: orderId,
      user_id: 'user-3',
      course_id: 'course-italiana',
      status: 'paid',
      asaas_payment_id: 'pay_refund',
      paid_at: '2026-11-16T10:00:00.000Z',
    },
  ]);

  const res = await processAsaasWebhook({
    rawBody: {
      id: 'evt_refund_1',
      event: 'PAYMENT_REFUNDED',
      payment: {
        id: 'pay_refund',
        status: 'REFUNDED',
        externalReference: orderId,
      },
    },
    providedToken: 'secret-sandbox-token',
    expectedToken: 'secret-sandbox-token',
    repo: mem.repo,
  });

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.orderStatus, 'refunded');
  assert.equal(res.body.accessRevoked, true);
  assert.equal(mem.orders.get(orderId)?.status, 'refunded');
  assert.equal(mem.enrollments.get('user-3:course-italiana')?.status, 'canceled');
  assert.equal(mem.webhookLogs[0].processingStatus, 'processed');
});

test('processAsaasWebhook triggers notifyPaymentConfirmed once on payment confirmation and tolerates email failure', async () => {
  const orderId = '55555555-5555-4555-8555-555555555555';
  const mem = createInMemoryRepo([
    {
      id: orderId,
      user_id: 'user-5',
      course_id: 'course-italiana',
      status: 'pending',
      asaas_payment_id: 'pay_email_1',
    },
  ]);

  let emailCalls = 0;
  mem.repo.notifyPaymentConfirmed = async () => {
    emailCalls += 1;
    throw new Error('Resend temporarily unavailable');
  };

  const first = await processAsaasWebhook({
    rawBody: {
      id: 'evt_email_1',
      event: 'PAYMENT_CONFIRMED',
      payment: {
        id: 'pay_email_1',
        status: 'CONFIRMED',
        value: 12,
        billingType: 'PIX',
        externalReference: orderId,
      },
    },
    providedToken: 'secret-sandbox-token',
    expectedToken: 'secret-sandbox-token',
    repo: mem.repo,
  });

  // Webhook still succeeds and grants course access even if email provider throws
  assert.equal(first.statusCode, 200);
  assert.equal(first.body.orderStatus, 'paid');
  assert.equal(mem.enrollments.get('user-5:course-italiana')?.status, 'in_progress');
  assert.equal(emailCalls, 1);

  // Subsequent confirmation event for an already-paid order must not resend email
  const second = await processAsaasWebhook({
    rawBody: {
      id: 'evt_email_2_received',
      event: 'PAYMENT_RECEIVED',
      payment: {
        id: 'pay_email_1',
        status: 'RECEIVED',
        value: 12,
        billingType: 'PIX',
        externalReference: orderId,
      },
    },
    providedToken: 'secret-sandbox-token',
    expectedToken: 'secret-sandbox-token',
    repo: mem.repo,
  });

  assert.equal(second.statusCode, 200);
  assert.equal(emailCalls, 1);
});

test('processAsaasWebhook blocks automatic access re-grant when order is in refund_requested state', async () => {
  const orderId = '66666666-6666-4666-8666-666666666666';
  const mem = createInMemoryRepo([
    {
      id: orderId,
      user_id: 'user-refund-req',
      course_id: 'course-italiana',
      status: 'refund_requested',
      asaas_payment_id: 'pay_ref_req',
    },
  ]);

  const res = await processAsaasWebhook({
    rawBody: {
      id: 'evt_late_confirm',
      event: 'PAYMENT_CONFIRMED',
      payment: {
        id: 'pay_ref_req',
        status: 'CONFIRMED',
        value: 12.9,
        billingType: 'PIX',
        externalReference: orderId,
      },
    },
    providedToken: 'secret-sandbox-token',
    expectedToken: 'secret-sandbox-token',
    repo: mem.repo,
  });

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.accessGranted, false);
  assert.equal(mem.enrollments.size, 0);
  assert.equal(mem.orders.get(orderId)?.status, 'refund_requested');
});


