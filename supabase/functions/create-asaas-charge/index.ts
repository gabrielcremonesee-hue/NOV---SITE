import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
  AsaasCustomerInput,
  digitsOnly,
  isValidCpfOrCnpj,
  resolveAsaasBaseUrl,
  resolveAsaasCapabilities,
  validateCreateAsaasChargeBody,
} from './validation.ts';

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
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  };
}

const REFERENCE_COURSE_PRICES_CENTS: Record<string, { title: string; priceCents: number }> = {
  'massas-italianas': {
    title: 'Curso de Massas',
    priceCents: 1290,
  },
};

function jsonResponse(body: unknown, status = 200, corsHeaders?: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...(corsHeaders || {
        'Access-Control-Allow-Origin': 'https://fervecgastronomia.com.br',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      }),
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

function readAsaasApiKey(environment: 'sandbox' | 'production'): string | null {
  if (environment === 'production') {
    const prod = Deno.env.get('ASAAS_API_KEY')?.trim();
    return prod || null;
  }
  const candidates = [
    Deno.env.get('ASAAS_SANDBOX_API_KEY'),
    Deno.env.get('ASAAS_API_KEY_SANDBOX'),
    Deno.env.get('ASAAS_TEST_API_KEY'),
    Deno.env.get('ASAAS_API_KEY'),
  ];
  for (const candidate of candidates) {
    const trimmed = candidate?.trim();
    if (trimmed) return trimmed;
  }
  return null;
}

function getServiceSupabaseClient(): SupabaseClient | null {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')?.trim();
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')?.trim();
  if (!supabaseUrl || !serviceKey) return null;

  return createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function resolveAuthenticatedUser(req: Request): Promise<{ id: string; email?: string } | null> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')?.trim();
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')?.trim();
  const authHeader = req.headers.get('Authorization');

  if (!supabaseUrl || !supabaseAnonKey || !authHeader) {
    return null;
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    return null;
  }
  return { id: data.user.id, email: data.user.email ?? undefined };
}

interface ResolvedCourseCatalog {
  courseId: string | null;
  slug: string;
  title: string;
  priceCents: number;
  priceSource: 'database' | 'reference';
}

async function resolveCourseAuthoritativePrice(
  serviceSupabase: SupabaseClient | null,
  courseSlug: string
): Promise<ResolvedCourseCatalog | null> {
  if (serviceSupabase) {
    const { data: row } = await serviceSupabase
      .from('courses')
      .select('id, slug, title, price_cents')
      .eq('slug', courseSlug)
      .maybeSingle();

    if (row) {
      const dbPrice =
        typeof row.price_cents === 'number' && Number.isFinite(row.price_cents) && row.price_cents >= 100
          ? Math.round(row.price_cents)
          : null;
      const fallbackRef = REFERENCE_COURSE_PRICES_CENTS[courseSlug];
      if (dbPrice !== null) {
        return {
          courseId: String(row.id),
          slug: String(row.slug),
          title: String(row.title || fallbackRef?.title || courseSlug),
          priceCents: dbPrice,
          priceSource: 'database',
        };
      }
      if (fallbackRef) {
        return {
          courseId: String(row.id),
          slug: String(row.slug),
          title: String(row.title || fallbackRef.title),
          priceCents: fallbackRef.priceCents,
          priceSource: 'reference',
        };
      }
    }
  }

  const fallbackRef = REFERENCE_COURSE_PRICES_CENTS[courseSlug];
  if (!fallbackRef) return null;
  return {
    courseId: null,
    slug: courseSlug,
    title: fallbackRef.title,
    priceCents: fallbackRef.priceCents,
    priceSource: 'reference',
  };
}

async function resolveCustomerFromProfile(
  serviceSupabase: SupabaseClient | null,
  user: { id: string; email?: string }
): Promise<{ customerId?: string; customer?: AsaasCustomerInput }> {
  if (!serviceSupabase) return {};
  const { data: profile } = await serviceSupabase
    .from('profiles')
    .select('full_name, email, cpf_masked, ddd, phone, asaas_customer_id')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile) return {};

  const customerId =
    typeof profile.asaas_customer_id === 'string' && /^cus_[a-zA-Z0-9_]+$/.test(profile.asaas_customer_id.trim())
      ? profile.asaas_customer_id.trim()
      : undefined;

  const name = typeof profile.full_name === 'string' ? profile.full_name.trim() : '';
  const email = (typeof profile.email === 'string' ? profile.email.trim().toLowerCase() : '') || user.email || '';
  const cpfRaw = digitsOnly(profile.cpf_masked);
  const mobilePhone = digitsOnly(`${profile.ddd ?? ''}${profile.phone ?? ''}`);

  if (name.length >= 3 && email && isValidCpfOrCnpj(cpfRaw)) {
    return {
      customerId,
      customer: {
        name,
        email,
        cpfCnpj: cpfRaw,
        ...(mobilePhone.length >= 10 && mobilePhone.length <= 11 ? { mobilePhone } : {}),
      },
    };
  }

  return { customerId };
}

async function ensureAsaasSandboxCustomer(params: {
  baseUrl: string;
  apiKey: string;
  customer: AsaasCustomerInput;
  externalReference: string;
}): Promise<string> {
  const searchUrl = `${params.baseUrl}/customers?cpfCnpj=${encodeURIComponent(params.customer.cpfCnpj)}`;
  const searchRes = await fetch(searchUrl, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      access_token: params.apiKey,
    },
  });

  if (searchRes.ok) {
    const searchData = (await searchRes.json()) as { data?: Array<{ id?: string }> };
    const existingId = searchData?.data?.[0]?.id;
    if (existingId) return existingId;
  }

  const createRes = await fetch(`${params.baseUrl}/customers`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      access_token: params.apiKey,
    },
    body: JSON.stringify({
      name: params.customer.name,
      email: params.customer.email,
      cpfCnpj: params.customer.cpfCnpj,
      mobilePhone: params.customer.mobilePhone,
      externalReference: params.externalReference,
      notificationDisabled: true,
    }),
  });

  const createdData = (await createRes.json().catch(() => ({}))) as {
    id?: string;
    errors?: Array<{ description?: string }>;
  };

  if (!createRes.ok || !createdData.id) {
    const detail = createdData?.errors?.[0]?.description || 'Falha ao registrar cliente no Asaas.';
    throw new Error(detail);
  }

  return createdData.id;
}

Deno.serve(async (req: Request) => {
  const corsHeaders = resolveCorsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const environment = resolveEnvironment();
  const capabilities = resolveAsaasCapabilities((name) => Deno.env.get(name));
  const serviceSupabase = getServiceSupabaseClient();

  if (req.method === 'GET') {
    const url = new URL(req.url);
    const courseSlug = (url.searchParams.get('courseSlug') || 'massas-italianas').trim();
    const orderId = url.searchParams.get('orderId')?.trim();

    const course = await resolveCourseAuthoritativePrice(serviceSupabase, courseSlug);
    if (!course) {
      return jsonResponse({ ok: false, error: 'Curso não encontrado no catálogo.' }, 404);
    }

    let orderSummary: Record<string, unknown> | null = null;
    if (orderId && serviceSupabase) {
      const user = await resolveAuthenticatedUser(req);
      if (!user) {
        return jsonResponse({ ok: false, error: 'Autenticação necessária para consultar o pedido.' }, 401);
      }

      const { data: orderRow } = await serviceSupabase
        .from('orders')
        .select('id, status, amount_cents, asaas_payment_id, paid_at, updated_at')
        .eq('id', orderId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (orderRow) {
        const { data: paymentRow } = await serviceSupabase
          .from('payments')
          .select('asaas_payment_id, status, billing_type, value_cents, due_date, invoice_url, bank_slip_url')
          .eq('order_id', orderRow.id)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        orderSummary = {
          id: orderRow.id,
          status: orderRow.status,
          amountCents: orderRow.amount_cents,
          asaasPaymentId: orderRow.asaas_payment_id,
          paidAt: orderRow.paid_at,
          payment: paymentRow ?? null,
        };
      }
    }

    return jsonResponse(
      {
        ok: true,
        environment,
        course,
        capabilities,
        order: orderSummary,
      },
      200,
      corsHeaders
    );
  }

  if (req.method !== 'POST') {
    return jsonResponse({ ok: false, error: 'Método não permitido. Utilize GET ou POST.' }, 405, corsHeaders);
  }

  if (environment === 'production') {
    const priceConfirmed =
      Deno.env.get('FERVEC_PRICE_CONFIRMED')?.trim().toLowerCase() === 'true';
    const launchApproved =
      Deno.env.get('FERVEC_COMMERCIAL_LAUNCH_APPROVED')?.trim().toLowerCase() === 'true';
    const legalCleared =
      Deno.env.get('FERVEC_LEGAL_PENDING_CLEARED')?.trim().toLowerCase() === 'true';

    if (!priceConfirmed || !launchApproved || !legalCleared) {
      return jsonResponse(
        {
          ok: false,
          code: 'COMMERCIAL_LAUNCH_LOCKED',
          error:
            'Cobranças em produção seguem bloqueadas até a liberação formal das pendências jurídicas (endereço físico, prazo de acesso) e aprovação comercial (FERVEC_PRICE_CONFIRMED=true, FERVEC_COMMERCIAL_LAUNCH_APPROVED=true e FERVEC_LEGAL_PENDING_CLEARED=true).',
        },
        403,
        corsHeaders
      );
    }
  }

  const apiKey = readAsaasApiKey(environment);
  if (!apiKey) {
    return jsonResponse(
      {
        ok: false,
        error:
          'Chave do Asaas não encontrada nos Secrets do Supabase.',
      },
      500,
      corsHeaders
    );
  }

  const user = await resolveAuthenticatedUser(req);
  if (!user) {
    return jsonResponse(
      { ok: false, error: 'Usuário não autenticado. Envie um token de sessão Supabase válido.' },
      401,
      corsHeaders
    );
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

  const validation = validateCreateAsaasChargeBody(rawBody);
  if (!validation.ok) {
    return jsonResponse(
      {
        ok: false,
        error: 'Dados inválidos para criação da cobrança.',
        errors: validation.errors,
      },
      400
    );
  }

  const payload = validation.data;

  // Respeita exclusivamente as modalidades habilitadas e confirmadas na conta Asaas Sandbox
  if (payload.billingType === 'CREDIT_CARD' && !capabilities.creditCard) {
    return jsonResponse(
      {
        ok: false,
        error:
          'Pagamento no cartão de crédito não está habilitado nesta conta Asaas Sandbox. Escolha Pix ou Boleto bancário.',
      },
      400
    );
  }
  if (payload.billingType === 'DEBIT_CARD' && !capabilities.debitCard) {
    return jsonResponse(
      {
        ok: false,
        error:
          'Pagamento no cartão de débito não está habilitado nesta conta Asaas Sandbox. Escolha Pix ou Boleto bancário.',
      },
      400
    );
  }

  if (serviceSupabase) {
    const { data: ageRow } = await serviceSupabase
      .from('profiles')
      .select('age, birth_date')
      .eq('id', user.id)
      .maybeSingle();
    const ageVal = typeof ageRow?.age === 'number' && Number.isInteger(ageRow.age) ? ageRow.age : null;
    if (!ageRow || ageVal === null || ageVal < 18) {
      return jsonResponse(
        {
          ok: false,
          code: 'AGE_18_REQUIRED',
          error: 'Contratação e pagamento disponíveis exclusivamente para maiores de 18 anos com cadastro completo.',
        },
        403,
        corsHeaders
      );
    }
  }

  // Resolve valor autoritativo no servidor/banco de dados, nunca confiando em preço enviado pelo navegador
  const authoritativeCourse = await resolveCourseAuthoritativePrice(serviceSupabase, payload.courseSlug);
  if (!authoritativeCourse) {
    return jsonResponse(
      { ok: false, error: `Curso '${payload.courseSlug}' não encontrado para cobrança.` },
      404,
      corsHeaders
    );
  }

  // Bloqueia nova cobrança se o aluno já tiver matrícula ativa ou pedido pago neste curso
  if (serviceSupabase && authoritativeCourse.courseId) {
    const [{ data: existingEnr }, { data: existingPaid }] = await Promise.all([
      serviceSupabase
        .from('student_enrollments')
        .select('id, status')
        .eq('user_id', user.id)
        .eq('course_id', authoritativeCourse.courseId)
        .maybeSingle(),
      serviceSupabase
        .from('orders')
        .select('id, status')
        .eq('user_id', user.id)
        .eq('course_id', authoritativeCourse.courseId)
        .eq('status', 'paid')
        .limit(1)
        .maybeSingle(),
    ]);

    const enrSt = String(existingEnr?.status || '').toLowerCase();
    if (existingPaid || enrSt === 'active' || enrSt === 'completed' || enrSt === 'in_progress') {
      return jsonResponse(
        {
          ok: false,
          code: 'ALREADY_ENROLLED',
          error: 'Você já possui matrícula ativa ou pagamento confirmado neste curso.',
        },
        409,
        corsHeaders
      );
    }

    // Reutiliza cobrança pendente idempotente quando idempotencyKey coincide
    if (payload.idempotencyKey) {
      const { data: idemOrder } = await serviceSupabase
        .from('orders')
        .select('id, status, amount_cents, asaas_payment_id, asaas_customer_id')
        .eq('user_id', user.id)
        .eq('course_id', authoritativeCourse.courseId)
        .eq('idempotency_key', payload.idempotencyKey)
        .eq('status', 'pending')
        .maybeSingle();

      if (idemOrder?.id && idemOrder.asaas_payment_id) {
        const { data: idemPayment } = await serviceSupabase
          .from('payments')
          .select('asaas_payment_id, status, billing_type, value_cents, due_date, invoice_url, bank_slip_url')
          .eq('order_id', idemOrder.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (idemPayment) {
          return jsonResponse(
            {
              ok: true,
              idempotentReuse: true,
              environment,
              orderId: idemOrder.id,
              course: authoritativeCourse,
              capabilities,
              payment: {
                id: idemPayment.asaas_payment_id,
                orderId: idemOrder.id,
                customerId: idemOrder.asaas_customer_id,
                status: idemPayment.status,
                billingType: idemPayment.billing_type,
                value:
                  typeof idemPayment.value_cents === 'number'
                    ? idemPayment.value_cents / 100
                    : authoritativeCourse.priceCents / 100,
                dueDate: idemPayment.due_date,
                invoiceUrl: idemPayment.invoice_url,
                bankSlipUrl: idemPayment.bank_slip_url,
                pix: null,
              },
            },
            200,
            corsHeaders
          );
        }
      }
    }
  }

  let authoritativeValueCents = authoritativeCourse.priceCents;
  const baseUrl = resolveAsaasBaseUrl(
    environment,
    environment === 'production' ? Deno.env.get('ASAAS_API_URL') : Deno.env.get('ASAAS_SANDBOX_URL')
  );

  try {
    const profileCustomer = await resolveCustomerFromProfile(serviceSupabase, user);
    const resolvedCustomerId = payload.customerId || profileCustomer.customerId;
    const resolvedCustomerInput = payload.customer || profileCustomer.customer;

    if (!resolvedCustomerId && !resolvedCustomerInput) {
      return jsonResponse(
        {
          ok: false,
          code: 'CUSTOMER_CPF_REQUIRED',
          error:
            'Informe seu CPF válido para registrar o comprador no Asaas Sandbox e gerar a cobrança.',
        },
        400,
        corsHeaders
      );
    }

    const customerId =
      resolvedCustomerId ||
      (await ensureAsaasSandboxCustomer({
        baseUrl,
        apiKey,
        customer: resolvedCustomerInput!,
        externalReference: user.id,
      }));

    if (serviceSupabase && customerId) {
      await serviceSupabase
        .from('profiles')
        .update({ asaas_customer_id: customerId })
        .eq('id', user.id);
    }

    // Cria pedido local pendente antes de resgatar cupom / criar cobrança no Asaas
    let createdOrderId: string | null = null;
    if (serviceSupabase && authoritativeCourse.courseId) {
      const insertPayload: Record<string, unknown> = {
        user_id: user.id,
        course_id: authoritativeCourse.courseId,
        status: 'pending',
        subtotal_cents: authoritativeCourse.priceCents,
        discount_cents: 0,
        amount_cents: authoritativeValueCents,
        asaas_customer_id: customerId,
        environment,
        ...(payload.idempotencyKey ? { idempotency_key: payload.idempotencyKey } : {}),
      };
      const { data: orderData } = await serviceSupabase
        .from('orders')
        .insert(insertPayload)
        .select('id')
        .single();

      if (orderData?.id) {
        createdOrderId = String(orderData.id);
        await serviceSupabase
          .from('orders')
          .update({ external_reference: createdOrderId })
          .eq('id', createdOrderId);
      }
    }

    // Resgate atômico do cupom via RPC (incrementa uses_count com lock e previne corrida)
    if (payload.couponCode && serviceSupabase) {
      const { data: redeemRows, error: redeemErr } = await serviceSupabase.rpc('redeem_coupon_atomic', {
        p_code: payload.couponCode,
        p_user_id: user.id,
        p_course_slug: authoritativeCourse.slug,
        p_order_id: createdOrderId,
        p_original_cents: authoritativeCourse.priceCents,
      });

      const redeemRow = Array.isArray(redeemRows) ? redeemRows[0] : redeemRows;
      if (redeemErr || !redeemRow?.ok) {
        if (createdOrderId) {
          await serviceSupabase
            .from('orders')
            .update({ status: 'canceled', updated_at: new Date().toISOString() })
            .eq('id', createdOrderId);
        }
        return jsonResponse(
          {
            ok: false,
            code: redeemRow?.error_code || 'COUPON_UNAVAILABLE',
            error: 'Cupom promocional inválido, já utilizado ou esgotado.',
          },
          400,
          corsHeaders
        );
      }

      const discountCents = Math.max(0, Number(redeemRow.discount_cents || 0));
      authoritativeValueCents = Math.max(0, Number(redeemRow.final_cents ?? authoritativeCourse.priceCents - discountCents));

      if (createdOrderId) {
        await serviceSupabase
          .from('orders')
          .update({
            subtotal_cents: authoritativeCourse.priceCents,
            discount_cents: discountCents,
            amount_cents: authoritativeValueCents,
            coupon_code: payload.couponCode,
            updated_at: new Date().toISOString(),
          })
          .eq('id', createdOrderId);
      }

      // Guard para cupom 100% gratuito: ativa matrícula sem enviar cobrança R$ 0 ao Asaas
      if (authoritativeValueCents === 0) {
        const nowIso = new Date().toISOString();
        if (createdOrderId) {
          await serviceSupabase
            .from('orders')
            .update({ status: 'paid', paid_at: nowIso, updated_at: nowIso })
            .eq('id', createdOrderId);
        }
        if (authoritativeCourse.courseId) {
          await serviceSupabase.from('student_enrollments').upsert(
            {
              user_id: user.id,
              course_id: authoritativeCourse.courseId,
              status: 'in_progress',
              last_module_key: 'carbonara',
              updated_at: nowIso,
            },
            { onConflict: 'user_id,course_id' }
          );
        }
        return jsonResponse(
          {
            ok: true,
            freeEnrollmentByCoupon: true,
            environment,
            orderId: createdOrderId,
            course: authoritativeCourse,
            capabilities,
            payment: null,
          },
          201,
          corsHeaders
        );
      }
    }

    const authoritativeValue = Math.round(authoritativeValueCents) / 100;
    if (authoritativeValue < 5) {
      return jsonResponse(
        {
          ok: false,
          code: 'MINIMUM_CHARGE_AMOUNT',
          error: 'O valor mínimo permitido para cobrança no Asaas é R$ 5,00 (ou 100% gratuito com cupom integral).',
        },
        400,
        corsHeaders
      );
    }

    const externalReference =
      createdOrderId ?? payload.externalReference ?? `${user.id}:${authoritativeCourse.slug}`;

    const paymentRes = await fetch(`${baseUrl}/payments`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        access_token: apiKey,
      },
      body: JSON.stringify({
        customer: customerId,
        billingType: payload.billingType,
        value: authoritativeValue,
        dueDate: payload.dueDate,
        description: `FerveC Gastronomia — ${authoritativeCourse.title}`,
        externalReference,
      }),
    });

    const paymentData = (await paymentRes.json().catch(() => ({}))) as {
      id?: string;
      status?: string;
      billingType?: string;
      value?: number;
      dueDate?: string;
      invoiceUrl?: string;
      bankSlipUrl?: string;
      errors?: Array<{ description?: string }>;
    };

    if (!paymentRes.ok || !paymentData.id) {
      const detail =
        paymentData?.errors?.[0]?.description || 'Não foi possível criar a cobrança no Asaas Sandbox.';
      return jsonResponse({ ok: false, error: detail }, 502, corsHeaders);
    }

    const paymentStatus = String(paymentData.status ?? 'PENDING');
    const resolvedBillingType = String(paymentData.billingType ?? payload.billingType);

    if (serviceSupabase && createdOrderId) {
      await serviceSupabase
        .from('orders')
        .update({
          asaas_payment_id: paymentData.id,
          asaas_customer_id: customerId,
          external_reference: externalReference,
          updated_at: new Date().toISOString(),
        })
        .eq('id', createdOrderId);

      await serviceSupabase
        .from('payments')
        .upsert(
          {
            order_id: createdOrderId,
            user_id: user.id,
            asaas_payment_id: paymentData.id,
            status: paymentStatus,
            billing_type: resolvedBillingType,
            value_cents: authoritativeValueCents,
            due_date: paymentData.dueDate ?? payload.dueDate,
            invoice_url: paymentData.invoiceUrl ?? null,
            bank_slip_url: paymentData.bankSlipUrl ?? null,
            raw_payload: paymentData,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'asaas_payment_id' }
        );
    }

    let pix: { encodedImage?: string; payload?: string; expirationDate?: string } | null = null;
    if (payload.billingType === 'PIX') {
      const pixRes = await fetch(`${baseUrl}/payments/${encodeURIComponent(paymentData.id)}/pixQrCode`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          access_token: apiKey,
        },
      });
      if (pixRes.ok) {
        pix = (await pixRes.json().catch(() => null)) as {
          encodedImage?: string;
          payload?: string;
          expirationDate?: string;
        } | null;
      }
    }

    return jsonResponse(
      {
        ok: true,
        environment,
        orderId: createdOrderId,
        course: authoritativeCourse,
        capabilities,
        payment: {
          id: paymentData.id,
          orderId: createdOrderId,
          customerId,
          status: paymentStatus,
          billingType: resolvedBillingType,
          value: authoritativeValue,
          dueDate: paymentData.dueDate ?? payload.dueDate,
          invoiceUrl: paymentData.invoiceUrl ?? null,
          bankSlipUrl: paymentData.bankSlipUrl ?? null,
          pix,
        },
      },
      201,
      corsHeaders
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro interno ao comunicar com o Asaas Sandbox.';
    return jsonResponse({ ok: false, error: message }, 502, corsHeaders);
  }
});
