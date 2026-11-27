export type InternalOrderStatus =
  | 'pending'
  | 'paid'
  | 'overdue'
  | 'canceled'
  | 'refund_requested'
  | 'refunded';

export type WebhookLogStatus =
  | 'received'
  | 'processed'
  | 'duplicate'
  | 'unauthorized'
  | 'invalid_payload'
  | 'not_found'
  | 'failed';

export interface AsaasWebhookPayment {
  id: string;
  customer?: string;
  value?: number;
  netValue?: number;
  billingType?: string;
  status?: string;
  dueDate?: string;
  paymentDate?: string | null;
  clientPaymentDate?: string | null;
  confirmedDate?: string | null;
  externalReference?: string | null;
  invoiceUrl?: string | null;
  bankSlipUrl?: string | null;
}

export interface ParsedAsaasWebhook {
  eventId: string;
  event: string;
  dateCreated?: string;
  payment: AsaasWebhookPayment;
  orderStatus: InternalOrderStatus;
  shouldGrantAccess: boolean;
  shouldRevokeAccess: boolean;
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const SENSITIVE_HEADER_NAMES = new Set([
  'asaas-access-token',
  'authorization',
  'apikey',
  'x-api-key',
  'cookie',
  'set-cookie',
]);

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_REGEX.test(value.trim());
}

/**
 * Remove valores sensíveis antes de gravar cabeçalhos na tabela `webhook_logs`.
 */
export function sanitizeWebhookHeaders(
  headers: Headers | Record<string, string> | null | undefined
): Record<string, string> {
  const sanitized: Record<string, string> = {};
  if (!headers) return sanitized;

  const entries: Array<[string, string]> =
    headers instanceof Headers ? Array.from(headers.entries()) : Object.entries(headers);

  for (const [rawKey, rawVal] of entries) {
    const key = rawKey.trim().toLowerCase();
    if (!key) continue;
    sanitized[key] = SENSITIVE_HEADER_NAMES.has(key)
      ? '[REDACTED]'
      : String(rawVal).slice(0, 500);
  }
  return sanitized;
}

/**
 * Comparação em tempo constante para validar o cabeçalho `asaas-access-token`
 * sem expor o token esperado a timing attacks.
 */
export function verifyWebhookToken(
  providedToken: string | null | undefined,
  expectedToken: string | null | undefined
): boolean {
  const provided = typeof providedToken === 'string' ? providedToken.trim() : '';
  const expected = typeof expectedToken === 'string' ? expectedToken.trim() : '';
  if (!provided || !expected) return false;

  const encoder = new TextEncoder();
  const a = encoder.encode(provided);
  const b = encoder.encode(expected);
  const maxLen = Math.max(a.length, b.length);

  let diff = a.length ^ b.length;
  for (let i = 0; i < maxLen; i++) {
    diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  }
  return diff === 0;
}

export function mapAsaasEventToOrderStatus(
  event: string,
  paymentStatus?: string
): {
  orderStatus: InternalOrderStatus;
  shouldGrantAccess: boolean;
  shouldRevokeAccess: boolean;
} {
  const evt = event.trim().toUpperCase();
  const payStatus = (paymentStatus || '').trim().toUpperCase();

  if (
    evt === 'PAYMENT_CONFIRMED' ||
    evt === 'PAYMENT_RECEIVED' ||
    evt === 'PAYMENT_DUNNING_RECEIVED'
  ) {
    return {
      orderStatus: 'paid',
      shouldGrantAccess: true,
      shouldRevokeAccess: false,
    };
  }

  if (
    evt === 'PAYMENT_REFUNDED' ||
    evt === 'PAYMENT_PARTIALLY_REFUNDED' ||
    evt === 'PAYMENT_REFUND_IN_PROGRESS' ||
    evt === 'PAYMENT_CHARGEBACK_REQUESTED' ||
    evt === 'PAYMENT_CHARGEBACK_DISPUTE'
  ) {
    return {
      orderStatus: 'refunded',
      shouldGrantAccess: false,
      shouldRevokeAccess: true,
    };
  }

  if (
    evt === 'PAYMENT_DELETED' ||
    evt === 'PAYMENT_REPROVED_BY_RISK_ANALYSIS'
  ) {
    return {
      orderStatus: 'canceled',
      shouldGrantAccess: false,
      shouldRevokeAccess: true,
    };
  }

  if (evt === 'PAYMENT_OVERDUE') {
    return {
      orderStatus: 'overdue',
      shouldGrantAccess: false,
      shouldRevokeAccess: false,
    };
  }

  if (payStatus === 'CONFIRMED' || payStatus === 'RECEIVED' || payStatus === 'RECEIVED_IN_CASH') {
    return {
      orderStatus: 'paid',
      shouldGrantAccess: true,
      shouldRevokeAccess: false,
    };
  }

  if (payStatus === 'REFUNDED' || payStatus === 'CHARGEBACK_REQUESTED') {
    return {
      orderStatus: 'refunded',
      shouldGrantAccess: false,
      shouldRevokeAccess: true,
    };
  }

  if (payStatus === 'OVERDUE') {
    return {
      orderStatus: 'overdue',
      shouldGrantAccess: false,
      shouldRevokeAccess: false,
    };
  }

  return {
    orderStatus: 'pending',
    shouldGrantAccess: false,
    shouldRevokeAccess: false,
  };
}

export function extractAuditMetadata(rawBody: unknown): {
  eventId: string | null;
  eventType: string | null;
  asaasPaymentId: string | null;
  externalReference: string | null;
} {
  if (!rawBody || typeof rawBody !== 'object' || Array.isArray(rawBody)) {
    return {
      eventId: null,
      eventType: null,
      asaasPaymentId: null,
      externalReference: null,
    };
  }

  const raw = rawBody as Record<string, unknown>;
  const eventType =
    typeof raw.event === 'string' && raw.event.trim()
      ? raw.event.trim().toUpperCase().slice(0, 80)
      : null;

  const p =
    raw.payment && typeof raw.payment === 'object' && !Array.isArray(raw.payment)
      ? (raw.payment as Record<string, unknown>)
      : null;

  const asaasPaymentId =
    p && typeof p.id === 'string' && p.id.trim()
      ? p.id.trim().slice(0, 100)
      : null;

  const externalReference =
    p && typeof p.externalReference === 'string' && p.externalReference.trim()
      ? p.externalReference.trim().slice(0, 120)
      : null;

  const eventId =
    typeof raw.id === 'string' && raw.id.trim()
      ? raw.id.trim().slice(0, 120)
      : eventType && asaasPaymentId
        ? `${eventType}:${asaasPaymentId}`
        : null;

  return {
    eventId,
    eventType,
    asaasPaymentId,
    externalReference,
  };
}

export function parseAsaasWebhookPayload(
  body: unknown
): { ok: true; data: ParsedAsaasWebhook } | { ok: false; error: string } {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, error: 'Payload do webhook deve ser um objeto JSON válido.' };
  }

  const raw = body as Record<string, unknown>;
  const event = typeof raw.event === 'string' ? raw.event.trim().toUpperCase() : '';
  if (!event || !/^[A-Z0-9_]{3,80}$/.test(event)) {
    return { ok: false, error: 'Campo "event" ausente ou inválido no webhook.' };
  }

  if (!raw.payment || typeof raw.payment !== 'object' || Array.isArray(raw.payment)) {
    return { ok: false, error: 'Objeto "payment" ausente ou inválido no webhook.' };
  }

  const p = raw.payment as Record<string, unknown>;
  const paymentId = typeof p.id === 'string' ? p.id.trim() : '';
  if (!paymentId || paymentId.length > 100) {
    return { ok: false, error: 'Campo "payment.id" ausente ou inválido no webhook.' };
  }

  const paymentStatus = typeof p.status === 'string' ? p.status.trim().toUpperCase() : undefined;
  const externalReference =
    typeof p.externalReference === 'string' && p.externalReference.trim()
      ? p.externalReference.trim().slice(0, 120)
      : null;

  const eventIdRaw = typeof raw.id === 'string' ? raw.id.trim() : '';
  const eventId = eventIdRaw || `${event}:${paymentId}`;

  const mapping = mapAsaasEventToOrderStatus(event, paymentStatus);

  return {
    ok: true,
    data: {
      eventId,
      event,
      dateCreated: typeof raw.dateCreated === 'string' ? raw.dateCreated.trim() : undefined,
      payment: {
        id: paymentId,
        customer: typeof p.customer === 'string' ? p.customer.trim() : undefined,
        value: typeof p.value === 'number' && Number.isFinite(p.value) ? p.value : undefined,
        netValue: typeof p.netValue === 'number' && Number.isFinite(p.netValue) ? p.netValue : undefined,
        billingType: typeof p.billingType === 'string' ? p.billingType.trim().toUpperCase() : undefined,
        status: paymentStatus,
        dueDate: typeof p.dueDate === 'string' ? p.dueDate.trim() : undefined,
        paymentDate: typeof p.paymentDate === 'string' ? p.paymentDate.trim() : null,
        clientPaymentDate:
          typeof p.clientPaymentDate === 'string' ? p.clientPaymentDate.trim() : null,
        confirmedDate: typeof p.confirmedDate === 'string' ? p.confirmedDate.trim() : null,
        externalReference,
        invoiceUrl: typeof p.invoiceUrl === 'string' ? p.invoiceUrl.trim() : null,
        bankSlipUrl: typeof p.bankSlipUrl === 'string' ? p.bankSlipUrl.trim() : null,
      },
      orderStatus: mapping.orderStatus,
      shouldGrantAccess: mapping.shouldGrantAccess,
      shouldRevokeAccess: mapping.shouldRevokeAccess,
    },
  };
}

export interface OrderRecord {
  id: string;
  user_id: string;
  course_id: string;
  status: string;
  amount_cents?: number | null;
  asaas_customer_id?: string | null;
  asaas_payment_id?: string | null;
  paid_at?: string | null;
}

export function validateWebhookOrderIntegrity(
  order: OrderRecord,
  payment: AsaasWebhookPayment
): { ok: true } | { ok: false; error: string } {
  if (
    typeof order.amount_cents === 'number' &&
    Number.isFinite(order.amount_cents) &&
    typeof payment.value === 'number' &&
    Number.isFinite(payment.value)
  ) {
    const paymentCents = Math.round(payment.value * 100);
    if (Math.abs(paymentCents - Math.round(order.amount_cents)) > 1) {
      return {
        ok: false,
        error: `Divergência de valor entre pedido (${order.amount_cents} centavos) e pagamento Asaas (${paymentCents} centavos).`,
      };
    }
  }

  if (
    order.asaas_customer_id &&
    payment.customer &&
    order.asaas_customer_id.trim() !== payment.customer.trim()
  ) {
    return {
      ok: false,
      error: 'Divergência de cliente (asaas_customer_id) entre pedido e notificação do webhook.',
    };
  }

  return { ok: true };
}

export interface CreateWebhookLogInput {
  environment: string;
  eventId: string | null;
  eventType: string | null;
  asaasPaymentId: string | null;
  externalReference: string | null;
  tokenValid: boolean;
  requestHeaders: Record<string, string>;
  payload: unknown;
  receivedAt: string;
}

export interface UpdateWebhookLogInput {
  logId: string;
  processingStatus: WebhookLogStatus;
  httpStatus: number;
  orderId?: string | null;
  errorMessage?: string | null;
  processedAt: string;
}

export interface WebhookRepository {
  createWebhookLog?(input: CreateWebhookLogInput): Promise<string | null>;
  updateWebhookLog?(input: UpdateWebhookLogInput): Promise<void>;
  hasProcessedEvent(eventId: string): Promise<boolean>;
  recordProcessedEvent(params: {
    eventId: string;
    eventType: string;
    asaasPaymentId: string;
    payload: unknown;
  }): Promise<void>;
  findOrder(params: {
    asaasPaymentId: string;
    externalReference: string | null;
  }): Promise<OrderRecord | null>;
  updateOrderStatus(params: {
    orderId: string;
    status: InternalOrderStatus;
    asaasPaymentId: string;
    paidAt: string | null;
    updatedAt: string;
  }): Promise<OrderRecord | null>;
  upsertPaymentRecord(params: {
    orderId: string;
    userId: string;
    payment: AsaasWebhookPayment;
    updatedAt: string;
  }): Promise<void>;
  syncEnrollmentAccess(params: {
    userId: string;
    courseId: string;
    grantAccess: boolean;
    revokeAccess: boolean;
    updatedAt: string;
  }): Promise<void>;
  notifyPaymentConfirmed?(params: {
    orderId: string;
    userId: string;
    courseId: string;
    asaasPaymentId: string;
    billingType?: string;
    value?: number;
    paidAt: string | null;
  }): Promise<void>;
}

export interface ProcessWebhookResult {
  statusCode: number;
  body: Record<string, unknown>;
}

async function safeFinalizeLog(
  repo: WebhookRepository,
  logId: string | null,
  params: Omit<UpdateWebhookLogInput, 'logId'>
): Promise<void> {
  if (!logId || !repo.updateWebhookLog) return;
  try {
    await repo.updateWebhookLog({ logId, ...params });
  } catch {
    // Auditoria não deve mascarar a resposta original do webhook
  }
}

export async function processAsaasWebhook(params: {
  rawBody: unknown;
  providedToken: string | null | undefined;
  expectedToken: string | null | undefined;
  requestHeaders?: Headers | Record<string, string> | null;
  environment?: string;
  repo: WebhookRepository;
  nowIso?: string;
}): Promise<ProcessWebhookResult> {
  const nowIso = params.nowIso ?? new Date().toISOString();
  const environment = params.environment ?? 'sandbox';
  const tokenValid = Boolean(
    params.expectedToken &&
      params.expectedToken.trim() &&
      verifyWebhookToken(params.providedToken, params.expectedToken)
  );
  const meta = extractAuditMetadata(params.rawBody);

  let logId: string | null = null;
  if (params.repo.createWebhookLog) {
    try {
      logId = await params.repo.createWebhookLog({
        environment,
        eventId: meta.eventId,
        eventType: meta.eventType,
        asaasPaymentId: meta.asaasPaymentId,
        externalReference: meta.externalReference,
        tokenValid,
        requestHeaders: sanitizeWebhookHeaders(params.requestHeaders),
        payload:
          params.rawBody && typeof params.rawBody === 'object'
            ? params.rawBody
            : { rawBody: params.rawBody ?? null },
        receivedAt: nowIso,
      });
    } catch {
      logId = null;
    }
  }

  if (!params.expectedToken || !params.expectedToken.trim()) {
    const errorMsg =
      'Token de segurança do webhook não configurado nos Secrets do Supabase.';
    await safeFinalizeLog(params.repo, logId, {
      processingStatus: 'failed',
      httpStatus: 500,
      errorMessage: errorMsg,
      processedAt: nowIso,
    });
    return {
      statusCode: 500,
      body: { ok: false, error: errorMsg },
    };
  }

  if (!tokenValid) {
    const errorMsg = 'Token de segurança do webhook inválido ou ausente.';
    await safeFinalizeLog(params.repo, logId, {
      processingStatus: 'unauthorized',
      httpStatus: 401,
      errorMessage: errorMsg,
      processedAt: nowIso,
    });
    return {
      statusCode: 401,
      body: { ok: false, error: errorMsg },
    };
  }

  const parsed = parseAsaasWebhookPayload(params.rawBody);
  if (!parsed.ok) {
    await safeFinalizeLog(params.repo, logId, {
      processingStatus: 'invalid_payload',
      httpStatus: 400,
      errorMessage: parsed.error,
      processedAt: nowIso,
    });
    return {
      statusCode: 400,
      body: { ok: false, error: parsed.error },
    };
  }

  const webhook = parsed.data;

  try {
    const alreadyProcessed = await params.repo.hasProcessedEvent(webhook.eventId);
    if (alreadyProcessed) {
      await safeFinalizeLog(params.repo, logId, {
        processingStatus: 'duplicate',
        httpStatus: 200,
        processedAt: nowIso,
      });
      return {
        statusCode: 200,
        body: {
          ok: true,
          duplicate: true,
          eventId: webhook.eventId,
          event: webhook.event,
          asaasPaymentId: webhook.payment.id,
        },
      };
    }

    const order = await params.repo.findOrder({
      asaasPaymentId: webhook.payment.id,
      externalReference: webhook.payment.externalReference ?? null,
    });

    if (!order) {
      const errorMsg = 'Pedido correspondente não encontrado no banco de dados.';
      await safeFinalizeLog(params.repo, logId, {
        processingStatus: 'not_found',
        httpStatus: 404,
        errorMessage: errorMsg,
        processedAt: nowIso,
      });
      return {
        statusCode: 404,
        body: {
          ok: false,
          error: errorMsg,
          asaasPaymentId: webhook.payment.id,
          externalReference: webhook.payment.externalReference ?? null,
        },
      };
    }

    const integrity = validateWebhookOrderIntegrity(order, webhook.payment);
    if (!integrity.ok) {
      await safeFinalizeLog(params.repo, logId, {
        processingStatus: 'failed',
        httpStatus: 422,
        orderId: order.id,
        errorMessage: integrity.error,
        processedAt: nowIso,
      });
      return {
        statusCode: 422,
        body: { ok: false, error: integrity.error, orderId: order.id },
      };
    }

    // Não reabre matrícula automaticamente caso o pedido já tenha sido reembolsado, cancelado ou esteja com arrependimento em curso
    const lockedTerminalOrder = order.status === 'refunded' || order.status === 'canceled';
    const withdrawalRequested = order.status === 'refund_requested';
    const effectiveGrantAccess = webhook.shouldGrantAccess && !lockedTerminalOrder && !withdrawalRequested;

    const paidAt = effectiveGrantAccess
      ? order.paid_at ||
        webhook.payment.confirmedDate ||
        webhook.payment.paymentDate ||
        nowIso
      : order.paid_at ?? null;

    // Não regride um pedido já pago/em arrependimento em eventos tardios não-reembolso, nem regride refunded para paid
    const nextStatus: InternalOrderStatus = lockedTerminalOrder
      ? (order.status as InternalOrderStatus)
      : withdrawalRequested && !webhook.shouldRevokeAccess
        ? 'refund_requested'
        : order.status === 'paid' && !webhook.shouldRevokeAccess
          ? 'paid'
          : webhook.orderStatus;

    const updatedOrder = await params.repo.updateOrderStatus({
      orderId: order.id,
      status: nextStatus,
      asaasPaymentId: webhook.payment.id,
      paidAt,
      updatedAt: nowIso,
    });

    await params.repo.upsertPaymentRecord({
      orderId: order.id,
      userId: order.user_id,
      payment: webhook.payment,
      updatedAt: nowIso,
    });

    if (effectiveGrantAccess || webhook.shouldRevokeAccess) {
      await params.repo.syncEnrollmentAccess({
        userId: order.user_id,
        courseId: order.course_id,
        grantAccess: effectiveGrantAccess,
        revokeAccess: webhook.shouldRevokeAccess,
        updatedAt: nowIso,
      });
    }

    await params.repo.recordProcessedEvent({
      eventId: webhook.eventId,
      eventType: webhook.event,
      asaasPaymentId: webhook.payment.id,
      payload: params.rawBody,
    });

    if (
      webhook.shouldGrantAccess &&
      order.status !== 'paid' &&
      params.repo.notifyPaymentConfirmed
    ) {
      try {
        await params.repo.notifyPaymentConfirmed({
          orderId: updatedOrder?.id ?? order.id,
          userId: order.user_id,
          courseId: order.course_id,
          asaasPaymentId: webhook.payment.id,
          billingType: webhook.payment.billingType,
          value: webhook.payment.value,
          paidAt,
        });
      } catch {
        // Falha no serviço de e-mail não deve bloquear a liberação da matrícula nem a resposta 200 ao Asaas
      }
    }

    await safeFinalizeLog(params.repo, logId, {
      processingStatus: 'processed',
      httpStatus: 200,
      orderId: updatedOrder?.id ?? order.id,
      processedAt: nowIso,
    });

    return {
      statusCode: 200,
      body: {
        ok: true,
        eventId: webhook.eventId,
        event: webhook.event,
        orderId: updatedOrder?.id ?? order.id,
        orderStatus: updatedOrder?.status ?? nextStatus,
        accessGranted: effectiveGrantAccess,
        accessRevoked: webhook.shouldRevokeAccess,
      },
    };
  } catch (err: unknown) {
    const errorMsg =
      err instanceof Error ? err.message : 'Erro interno ao processar webhook do Asaas.';
    await safeFinalizeLog(params.repo, logId, {
      processingStatus: 'failed',
      httpStatus: 500,
      errorMessage: errorMsg,
      processedAt: nowIso,
    });
    return {
      statusCode: 500,
      body: { ok: false, error: errorMsg },
    };
  }
}
