import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
  isUuid,
  OrderRecord,
  processAsaasWebhook,
  sanitizeWebhookHeaders,
  WebhookRepository,
} from './logic.ts';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

function resolveEnvironment(): 'sandbox' | 'production' {
  return Deno.env.get('ASAAS_ENVIRONMENT')?.trim().toLowerCase() === 'production'
    ? 'production'
    : 'sandbox';
}

function readWebhookSecurityToken(environment: 'sandbox' | 'production'): string | null {
  if (environment === 'production') {
    return Deno.env.get('ASAAS_WEBHOOK_TOKEN')?.trim() || null;
  }
  const candidates = [
    Deno.env.get('ASAAS_SANDBOX_WEBHOOK_TOKEN'),
    Deno.env.get('ASAAS_WEBHOOK_TOKEN_SANDBOX'),
    Deno.env.get('ASAAS_WEBHOOK_TOKEN'),
  ];
  for (const candidate of candidates) {
    const trimmed = candidate?.trim();
    if (trimmed) return trimmed;
  }
  return null;
}

function createSupabaseAdminClient(): SupabaseClient {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')?.trim();
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')?.trim();

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Variáveis SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configuradas no ambiente da Edge Function.'
    );
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function createSupabaseWebhookRepo(
  supabase: SupabaseClient,
  config: { supabaseUrl: string; serviceRoleKey: string }
): WebhookRepository {
  return {
    async createWebhookLog(input) {
      const { data, error } = await supabase
        .from('webhook_logs')
        .insert({
          provider: 'asaas',
          environment: input.environment,
          event_id: input.eventId,
          event_type: input.eventType,
          asaas_payment_id: input.asaasPaymentId,
          external_reference: input.externalReference,
          processing_status: 'received',
          token_valid: input.tokenValid,
          request_headers: input.requestHeaders,
          payload: input.payload,
          received_at: input.receivedAt,
        })
        .select('id')
        .single();

      if (error || !data?.id) {
        console.warn('Aviso ao inserir em webhook_logs:', error?.message);
        return null;
      }
      return String(data.id);
    },

    async updateWebhookLog(input) {
      const { error } = await supabase
        .from('webhook_logs')
        .update({
          processing_status: input.processingStatus,
          http_status: input.httpStatus,
          ...(input.orderId ? { order_id: input.orderId } : {}),
          ...(input.errorMessage !== undefined ? { error_message: input.errorMessage } : {}),
          processed_at: input.processedAt,
        })
        .eq('id', input.logId);

      if (error) {
        console.warn('Aviso ao atualizar webhook_logs:', error.message);
      }
    },

    async hasProcessedEvent(eventId) {
      const { data, error } = await supabase
        .from('asaas_webhook_events')
        .select('event_id')
        .eq('event_id', eventId)
        .maybeSingle();

      if (error) return false;
      return Boolean(data?.event_id);
    },

    async recordProcessedEvent({ eventId, eventType, asaasPaymentId, payload }) {
      const { error } = await supabase.from('asaas_webhook_events').upsert(
        {
          event_id: eventId,
          event_type: eventType,
          asaas_payment_id: asaasPaymentId,
          payload,
          processed_at: new Date().toISOString(),
        },
        { onConflict: 'event_id' }
      );
      if (error) {
        console.warn('Aviso ao registrar asaas_webhook_events:', error.message);
      }
    },

    async findOrder({ asaasPaymentId, externalReference }) {
      if (isUuid(externalReference)) {
        const { data: byId } = await supabase
          .from('orders')
          .select('id, user_id, course_id, status, amount_cents, asaas_customer_id, asaas_payment_id, paid_at')
          .eq('id', externalReference.trim())
          .maybeSingle();
        if (byId) return byId as OrderRecord;
      }

      const { data: byPaymentOnOrder } = await supabase
        .from('orders')
        .select('id, user_id, course_id, status, amount_cents, asaas_customer_id, asaas_payment_id, paid_at')
        .eq('asaas_payment_id', asaasPaymentId)
        .maybeSingle();
      if (byPaymentOnOrder) return byPaymentOnOrder as OrderRecord;

      const { data: paymentRow } = await supabase
        .from('payments')
        .select('order_id')
        .eq('asaas_payment_id', asaasPaymentId)
        .maybeSingle();

      if (paymentRow?.order_id) {
        const { data: byPaymentTable } = await supabase
          .from('orders')
          .select('id, user_id, course_id, status, amount_cents, asaas_customer_id, asaas_payment_id, paid_at')
          .eq('id', paymentRow.order_id)
          .maybeSingle();
        if (byPaymentTable) return byPaymentTable as OrderRecord;
      }

      return null;
    },

    async updateOrderStatus({ orderId, status, asaasPaymentId, paidAt, updatedAt }) {
      const { data, error } = await supabase
        .from('orders')
        .update({
          status,
          asaas_payment_id: asaasPaymentId,
          paid_at: paidAt,
          updated_at: updatedAt,
        })
        .eq('id', orderId)
        .select('id, user_id, course_id, status, asaas_payment_id, paid_at')
        .single();

      if (error || !data) {
        throw new Error(error?.message || 'Falha ao atualizar status do pedido em orders.');
      }
      return data as OrderRecord;
    },

    async upsertPaymentRecord({ orderId, userId, payment, updatedAt }) {
      const valueCents =
        typeof payment.value === 'number' && Number.isFinite(payment.value)
          ? Math.round(payment.value * 100)
          : undefined;

      const { error } = await supabase.from('payments').upsert(
        {
          order_id: orderId,
          user_id: userId,
          asaas_payment_id: payment.id,
          status: payment.status ?? 'PENDING',
          billing_type: payment.billingType ?? null,
          ...(valueCents !== undefined ? { value_cents: valueCents } : {}),
          due_date: payment.dueDate ?? null,
          invoice_url: payment.invoiceUrl ?? null,
          bank_slip_url: payment.bankSlipUrl ?? null,
          raw_payload: payment,
          updated_at: updatedAt,
        },
        { onConflict: 'asaas_payment_id' }
      );
      if (error) {
        console.warn('Aviso ao sincronizar tabela payments:', error.message);
      }
    },

    async syncEnrollmentAccess({ userId, courseId, grantAccess, revokeAccess, updatedAt }) {
      const { data: existing } = await supabase
        .from('student_enrollments')
        .select('id, status')
        .eq('user_id', userId)
        .eq('course_id', courseId)
        .maybeSingle();

      if (grantAccess) {
        if (existing?.id) {
          const { error } = await supabase
            .from('student_enrollments')
            .update({
              status: existing.status === 'completed' ? 'completed' : 'in_progress',
              updated_at: updatedAt,
            })
            .eq('id', existing.id);
          if (error) {
            throw new Error(`Falha ao liberar matrícula do aluno: ${error.message}`);
          }
          return;
        }

        const { error } = await supabase.from('student_enrollments').insert({
          user_id: userId,
          course_id: courseId,
          status: 'in_progress',
          last_module_key: 'carbonara',
          updated_at: updatedAt,
        });
        if (error) {
          throw new Error(`Falha ao criar matrícula paga do aluno: ${error.message}`);
        }
        return;
      }

      // Reembolso/estorno/chargeback revoga a matrícula apenas se não existir outro pedido pago ativo no mesmo curso
      if (revokeAccess && existing?.id) {
        const { data: remainingPaid } = await supabase
          .from('orders')
          .select('id')
          .eq('user_id', userId)
          .eq('course_id', courseId)
          .eq('status', 'paid')
          .limit(1)
          .maybeSingle();

        if (!remainingPaid?.id) {
          await supabase
            .from('student_enrollments')
            .update({
              status: 'canceled',
              updated_at: updatedAt,
            })
            .eq('id', existing.id);
        }
      }
    },

    async syncWithdrawalStatus({ orderId, refundState, refundProviderId, providerStatus, updatedAt }) {
      const targetStatus =
        refundState === 'confirmed'
          ? 'refunded'
          : refundState === 'failed'
            ? 'refund_failed'
            : 'approved_refund_pending';

      await supabase
        .from('withdrawal_requests')
        .update({
          status: targetStatus,
          refund_provider_id: refundProviderId,
          ...(providerStatus ? { refund_provider_status: providerStatus } : {}),
          ...(refundState === 'confirmed' ? { processed_at: updatedAt } : {}),
        })
        .eq('order_id', orderId);
    },

    async notifyPaymentConfirmed({
      orderId,
      userId,
      courseId,
      asaasPaymentId,
      billingType,
      value,
      paidAt,
    }) {
      const endpoint = `${config.supabaseUrl.replace(/\/+$/, '')}/functions/v1/send-payment-confirmation-email`;
      const amountCents =
        typeof value === 'number' && Number.isFinite(value) ? Math.round(value * 100) : undefined;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.serviceRoleKey}`,
          apikey: config.serviceRoleKey,
        },
        body: JSON.stringify({
          orderId,
          userId,
          courseId,
          paymentId: asaasPaymentId,
          billingType,
          ...(amountCents !== undefined ? { amountCents } : {}),
          paidAt,
        }),
      });

      if (!res.ok) {
        const msg = await res.text().catch(() => '');
        console.warn('Aviso ao disparar e-mail transacional de confirmação:', res.status, msg);
      }
    },
  };
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return jsonResponse({ ok: false, error: 'Método não permitido. Utilize POST.' }, 405);
  }

  let rawText = '';
  let rawBody: unknown = null;
  let jsonParseFailed = false;
  try {
    rawText = await req.text();
    rawBody = rawText ? JSON.parse(rawText) : null;
  } catch {
    jsonParseFailed = true;
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')?.trim() || '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')?.trim() || '';
    const environment = resolveEnvironment();
    const supabase = createSupabaseAdminClient();
    const repo = createSupabaseWebhookRepo(supabase, { supabaseUrl, serviceRoleKey });
    const expectedToken = readWebhookSecurityToken(environment);
    const providedToken = req.headers.get('asaas-access-token');

    if (jsonParseFailed) {
      const nowIso = new Date().toISOString();
      const logId = await repo.createWebhookLog?.({
        environment,
        eventId: null,
        eventType: null,
        asaasPaymentId: null,
        externalReference: null,
        tokenValid: Boolean(expectedToken && providedToken && expectedToken.trim() === providedToken.trim()),
        requestHeaders: sanitizeWebhookHeaders(req.headers),
        payload: { invalidJsonBody: rawText.slice(0, 4000) },
        receivedAt: nowIso,
      });
      if (logId) {
        await repo.updateWebhookLog?.({
          logId,
          processingStatus: 'invalid_payload',
          httpStatus: 400,
          errorMessage: 'Corpo da requisição inválido. Envie um JSON válido.',
          processedAt: nowIso,
        });
      }
      return jsonResponse(
        { ok: false, error: 'Corpo da requisição inválido. Envie um JSON válido.' },
        400
      );
    }

    const result = await processAsaasWebhook({
      rawBody,
      providedToken,
      expectedToken,
      requestHeaders: req.headers,
      environment,
      repo,
    });

    return jsonResponse(result.body, result.statusCode);
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : 'Erro interno ao processar webhook do Asaas.';
    return jsonResponse({ ok: false, error: message }, 500);
  }
});
