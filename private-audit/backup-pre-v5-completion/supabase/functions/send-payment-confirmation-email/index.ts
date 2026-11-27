import { createClient } from '@supabase/supabase-js';
import {
  authorizeInternalRequest,
  EmailRecipientContext,
  resolveEmailEnvConfig,
  sendEmailViaResend,
  validateResendConnection,
  validateSendPaymentEmailBody,
} from './logic.ts';

function resolveCorsHeaders(req: Request): Record<string, string> {
  const origin = (req.headers.get('Origin') || '').trim();
  const allowRaw =
    Deno.env.get('ALLOWED_ORIGINS') ||
    Deno.env.get('FERVEC_SITE_URL') ||
    Deno.env.get('APP_BASE_URL') ||
    '';
  const allowList = allowRaw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const allowedOrigin =
    !origin || allowList.length === 0 || allowList.includes(origin)
      ? origin || allowList[0] || 'https://fervecgastronomia.com.br'
      : 'null';
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    Vary: 'Origin',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-internal-secret',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  };
}

function jsonResponse(body: unknown, status = 200, corsHeaders?: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...(corsHeaders || {
        'Access-Control-Allow-Origin': 'https://fervecgastronomia.com.br',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-internal-secret',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      }),
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

const resendQuotaMemory = {
  dayKey: '',
  dayCount: 0,
  monthKey: '',
  monthCount: 0,
};

function checkAndConsumeResendFreeTierQuota(): { allowed: boolean; dailyCount: number; monthlyCount: number } {
  const now = new Date();
  const dayKey = now.toISOString().slice(0, 10);
  const monthKey = now.toISOString().slice(0, 7);
  const dailyCap = Math.max(1, Number(Deno.env.get('RESEND_DAILY_CAP') || 90));
  const monthlyCap = Math.max(1, Number(Deno.env.get('RESEND_MONTHLY_CAP') || 2800));

  if (resendQuotaMemory.dayKey !== dayKey) {
    resendQuotaMemory.dayKey = dayKey;
    resendQuotaMemory.dayCount = 0;
  }
  if (resendQuotaMemory.monthKey !== monthKey) {
    resendQuotaMemory.monthKey = monthKey;
    resendQuotaMemory.monthCount = 0;
  }

  if (resendQuotaMemory.dayCount >= dailyCap || resendQuotaMemory.monthCount >= monthlyCap) {
    return {
      allowed: false,
      dailyCount: resendQuotaMemory.dayCount,
      monthlyCount: resendQuotaMemory.monthCount,
    };
  }

  resendQuotaMemory.dayCount += 1;
  resendQuotaMemory.monthCount += 1;
  return {
    allowed: true,
    dailyCount: resendQuotaMemory.dayCount,
    monthlyCount: resendQuotaMemory.monthCount,
  };
}

Deno.serve(async (req: Request) => {
  const corsHeaders = resolveCorsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== 'POST' && req.method !== 'GET') {
    return jsonResponse({ ok: false, error: 'Método não permitido. Utilize GET ou POST.' }, 405);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')?.trim();
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')?.trim();
  const internalSecret = Deno.env.get('INTERNAL_EMAIL_SECRET')?.trim();

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse(
      { ok: false, error: 'Credenciais internas do Supabase não configuradas na Edge Function.' },
      500
    );
  }

  const authorized = authorizeInternalRequest({
    authorizationHeader: req.headers.get('Authorization'),
    internalSecretHeader: req.headers.get('x-internal-secret'),
    serviceRoleKey,
    expectedInternalSecret: internalSecret,
  });

  if (!authorized) {
    return jsonResponse(
      { ok: false, error: 'Chamada não autorizada. Utilize credencial de serviço interna.' },
      401
    );
  }

  const emailConfig = resolveEmailEnvConfig((key) => Deno.env.get(key));

  if (req.method === 'GET') {
    const validationResult = await validateResendConnection({ config: emailConfig });
    return jsonResponse(validationResult, validationResult.statusCode);
  }

  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return jsonResponse(
      { ok: false, error: 'Corpo da requisição inválido. Envie um JSON válido.' },
      400
    );
  }

  if (
    rawBody &&
    typeof rawBody === 'object' &&
    !Array.isArray(rawBody) &&
    (rawBody as Record<string, unknown>).action === 'validate-connection'
  ) {
    const validationResult = await validateResendConnection({ config: emailConfig });
    return jsonResponse(validationResult, validationResult.statusCode);
  }

  const validation = validateSendPaymentEmailBody(rawBody);
  if (!validation.ok) {
    return jsonResponse({ ok: false, error: validation.error }, 400);
  }

  if (!emailConfig.fromEmailValid) {
    return jsonResponse(
      { ok: false, error: 'Variável FROM_EMAIL / RESEND_FROM_EMAIL possui formato inválido.' },
      400
    );
  }

  const input = validation.data;
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let recipientEmail = input.recipientEmail;
  let customerName = input.customerName;
  let courseTitle = input.courseTitle;
  let courseSlug = input.courseSlug;
  let amountCents = input.amountCents;
  let paymentId = input.paymentId;
  let paidAt = input.paidAt;
  let resolvedUserId = input.userId;
  let resolvedCourseId = input.courseId;

  // Completa dados ausentes consultando orders / profiles / courses / auth.users no Supabase
  const { data: orderRow } = await supabase
    .from('orders')
    .select('id, user_id, course_id, amount_cents, asaas_payment_id, paid_at')
    .eq('id', input.orderId)
    .maybeSingle();

  if (orderRow) {
    resolvedUserId = resolvedUserId || orderRow.user_id;
    resolvedCourseId = resolvedCourseId || orderRow.course_id;
    if (amountCents === undefined && typeof orderRow.amount_cents === 'number') {
      amountCents = orderRow.amount_cents;
    }
    paymentId = paymentId || orderRow.asaas_payment_id || undefined;
    paidAt = paidAt || orderRow.paid_at || undefined;
  }

  if (resolvedUserId && (!recipientEmail || !customerName)) {
    const { data: profileRow } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', resolvedUserId)
      .maybeSingle();

    if (profileRow) {
      recipientEmail = recipientEmail || profileRow.email || undefined;
      customerName = customerName || profileRow.full_name || undefined;
    }

    if (!recipientEmail || !customerName) {
      const { data: authUserRes } = await supabase.auth.admin.getUserById(resolvedUserId);
      const authUser = authUserRes?.user;
      if (authUser) {
        recipientEmail = recipientEmail || authUser.email || undefined;
        const metaName =
          typeof authUser.user_metadata?.full_name === 'string'
            ? authUser.user_metadata.full_name
            : undefined;
        customerName = customerName || metaName || undefined;
      }
    }
  }

  if (resolvedCourseId && (!courseTitle || !courseSlug)) {
    const { data: courseRow } = await supabase
      .from('courses')
      .select('title, slug')
      .eq('id', resolvedCourseId)
      .maybeSingle();

    if (courseRow) {
      courseTitle = courseTitle || courseRow.title || undefined;
      courseSlug = courseSlug || courseRow.slug || undefined;
    }
  }

  if (!recipientEmail) {
    return jsonResponse(
      { ok: false, error: 'Não foi possível determinar o e-mail do cliente para envio.' },
      422
    );
  }

  const appBaseUrl = (
    Deno.env.get('APP_BASE_URL')?.trim() ||
    Deno.env.get('PUBLIC_APP_URL')?.trim() ||
    'https://fervecgastronomia.com.br'
  ).replace(/\/+$/, '');

  const context: EmailRecipientContext = {
    orderId: input.orderId,
    recipientEmail,
    customerName: customerName || 'Aluno(a) FerveC',
    courseTitle: courseTitle || 'Curso de Massas',
    courseSlug,
    amountCents: amountCents ?? 1290,
    paymentId,
    billingType: input.billingType,
    paidAt: paidAt || new Date().toISOString(),
    accessUrl: input.accessUrl || `${appBaseUrl}/#/cursos`,
  };

  const quota = checkAndConsumeResendFreeTierQuota();
  if (!quota.allowed) {
    return jsonResponse(
      {
        ok: true,
        deferred: true,
        reason: 'RESEND_FREE_TIER_CAP_REACHED',
        orderId: input.orderId,
      },
      202,
      corsHeaders
    );
  }

  const sendResult = await sendEmailViaResend({
    apiKey: emailConfig.apiKey,
    fromEmail: emailConfig.fromEmail,
    context,
  });

  if (!sendResult.ok) {
    return jsonResponse(
      { ok: false, error: sendResult.error, provider: 'resend', orderId: input.orderId },
      sendResult.statusCode,
      corsHeaders
    );
  }

  return jsonResponse(
    {
      ok: true,
      provider: 'resend',
      emailId: sendResult.id,
      orderId: input.orderId,
      recipientEmail,
    },
    200,
    corsHeaders
  );
});
