import {
  getSupabaseClient,
  getSupabaseConnectionInfo,
  initSupabaseRuntimeConfig,
} from './supabase/client';

export type CheckoutBillingType = 'PIX' | 'BOLETO' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'UNDEFINED';
export type PaymentMethodChoice = 'PIX' | 'BOLETO' | 'CARD';
export type CardBillingMode = 'CREDIT_CARD' | 'DEBIT_CARD';

export type PaymentUiStatus =
  | 'awaiting_selection'
  | 'generating_charge'
  | 'processing_payment'
  | 'awaiting_confirmation'
  | 'approved'
  | 'refused'
  | 'expired'
  | 'communication_error';

export interface AsaasCapabilities {
  pix: boolean;
  boleto: boolean;
  creditCard: boolean;
  debitCard: boolean;
  acceptedCardBrands: string[];
}

export interface AsaasChargeResponsePayment {
  id: string;
  orderId?: string | null;
  customerId?: string;
  status: string;
  billingType: string;
  value: number;
  dueDate: string;
  invoiceUrl?: string | null;
  bankSlipUrl?: string | null;
  pix?: {
    encodedImage?: string;
    payload?: string;
    expirationDate?: string;
  } | null;
}

export interface CustomerProfileHint {
  hasAsaasCustomerId: boolean;
  fullName?: string;
  email?: string;
  ddd?: string;
  phone?: string;
}

export interface CoursePaymentSummary {
  environment?: string;
  courseSlug: string;
  courseId: string;
  courseTitle: string;
  subtitle: string;
  priceCents: number;
  priceFormatted: string;
  priceSource: 'database' | 'reference';
  capabilities: AsaasCapabilities;
  isEnrolled: boolean;
  latestOrderId: string | null;
  latestOrderStatus: string | null;
  latestPayment: AsaasChargeResponsePayment | null;
  customerProfile?: CustomerProfileHint | null;
}

export interface PaymentCheckoutState {
  isProcessing: boolean;
  activeCourseId: string | null;
  activeCourseSlug: string | null;
  activeCourseTitle: string | null;
  lastError: string | null;
  lastPayment: AsaasChargeResponsePayment | null;
}

export interface CheckoutCustomerPayload {
  name: string;
  email: string;
  cpfCnpj: string;
  mobilePhone?: string;
}

export interface RequestAsaasChargeInput {
  courseId: string;
  courseSlug: string;
  courseTitle: string;
  value?: number;
  billingType?: CheckoutBillingType;
  customer?: CheckoutCustomerPayload;
  externalReference?: string;
}

export interface RequestAsaasChargeOutcome {
  ok: boolean;
  environment?: string;
  reason?: 'already_processing' | 'unconfigured' | 'unauthenticated' | 'api_error' | 'network_error';
  errorCode?: string;
  error?: string;
  payment?: AsaasChargeResponsePayment;
  orderId?: string | null;
  capabilities?: AsaasCapabilities;
}

export interface CheckoutDeps {
  initConfig?: () => Promise<boolean>;
  getConnectionInfo?: () => { url: string; key: string } | null;
  getAccessToken?: () => Promise<string | null>;
  fetchFn?: typeof fetch;
}

type PaymentListener = (state: PaymentCheckoutState) => void;

const INITIAL_STATE: PaymentCheckoutState = {
  isProcessing: false,
  activeCourseId: null,
  activeCourseSlug: null,
  activeCourseTitle: null,
  lastError: null,
  lastPayment: null,
};

let checkoutState: PaymentCheckoutState = { ...INITIAL_STATE };
const listeners = new Set<PaymentListener>();

export function formatBrlFromCents(cents: number): string {
  const safeCents = Number.isFinite(cents) && cents >= 0 ? Math.round(cents) : 1290;
  return (safeCents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

export function createDefaultCoursePaymentSummary(
  courseSlug = 'massas-italianas'
): CoursePaymentSummary {
  const priceCents = courseSlug === 'massas-italianas' ? 1290 : 1990;
  return {
    environment: 'production',
    courseSlug,
    courseId: '',
    courseTitle: courseSlug === 'massas-italianas' ? 'Curso de Massas' : 'Curso FerveC Gastronomia',
    subtitle: 'Acesso ao curso',
    priceCents,
    priceFormatted: formatBrlFromCents(priceCents),
    priceSource: 'reference',
    capabilities: {
      pix: true,
      boleto: true,
      creditCard: false,
      debitCard: false,
      acceptedCardBrands: [],
    },
    isEnrolled: false,
    latestOrderId: null,
    latestOrderStatus: null,
    latestPayment: null,
    customerProfile: null,
  };
}

export function mapAsaasStatusToUiStatus(
  paymentStatus?: string | null,
  orderStatus?: string | null,
  isEnrolled?: boolean
): PaymentUiStatus {
  const ord = String(orderStatus || '').trim().toLowerCase();
  const pay = String(paymentStatus || '').trim().toUpperCase();

  if (isEnrolled || ord === 'paid' || pay === 'RECEIVED' || pay === 'CONFIRMED' || pay === 'RECEIVED_IN_CASH') {
    return 'approved';
  }
  if (ord === 'overdue' || pay === 'OVERDUE') {
    return 'expired';
  }
  if (
    ord === 'canceled' ||
    ord === 'refunded' ||
    pay === 'REFUNDED' ||
    pay === 'REFUND_REQUESTED' ||
    pay === 'CHARGEBACK_REQUESTED' ||
    pay === 'CHARGEBACK_DISPUTE' ||
    pay === 'DELETED' ||
    pay === 'FAILED'
  ) {
    return 'refused';
  }
  if (pay === 'PENDING' || pay === 'AWAITING_RISK_ANALYSIS' || ord === 'pending') {
    return 'awaiting_confirmation';
  }
  return 'awaiting_selection';
}

export function getPaymentUiStatusLabel(status: PaymentUiStatus): string {
  const labels: Record<PaymentUiStatus, string> = {
    awaiting_selection: 'Aguardando seleção',
    generating_charge: 'Gerando cobrança',
    processing_payment: 'Processando pagamento',
    awaiting_confirmation: 'Aguardando confirmação',
    approved: 'Pagamento aprovado',
    refused: 'Pagamento recusado',
    expired: 'Pagamento expirado',
    communication_error: 'Erro de comunicação',
  };
  return labels[status];
}

function emit(): void {
  const snapshot = { ...checkoutState };
  listeners.forEach((listener) => {
    try {
      listener(snapshot);
    } catch {
      // ignore listener failures
    }
  });
}

export function getPaymentCheckoutState(): PaymentCheckoutState {
  return { ...checkoutState };
}

export function subscribePaymentCheckout(listener: PaymentListener): () => void {
  listeners.add(listener);
  listener({ ...checkoutState });
  return () => {
    listeners.delete(listener);
  };
}

export function resetPaymentCheckoutState(): void {
  checkoutState = { ...INITIAL_STATE };
  emit();
}

async function defaultGetAccessToken(): Promise<string | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  try {
    const { data } = await supabase.auth.getSession();
    return data?.session?.access_token ?? null;
  } catch {
    return null;
  }
}

export async function fetchCoursePaymentSummary(
  courseSlug = 'massas-italianas',
  deps?: CheckoutDeps
): Promise<CoursePaymentSummary> {
  const fallback = createDefaultCoursePaymentSummary(courseSlug);
  try {
    const initConfig = deps?.initConfig ?? initSupabaseRuntimeConfig;
    await initConfig().catch(() => false);

    const getConn = deps?.getConnectionInfo ?? getSupabaseConnectionInfo;
    const conn = getConn();
    const getToken = deps?.getAccessToken ?? defaultGetAccessToken;
    const accessToken = await getToken().catch(() => null);
    const fetchImpl = deps?.fetchFn ?? fetch;

    const headers: Record<string, string> = { Accept: 'application/json' };
    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }

    const summaryPromise = fetchImpl(
      `/api/payments/course-summary?courseSlug=${encodeURIComponent(courseSlug)}`,
      { method: 'GET', headers }
    );

    const edgeGetPromise = conn
      ? fetchImpl(
          `${conn.url}/functions/v1/create-asaas-charge?courseSlug=${encodeURIComponent(courseSlug)}`,
          {
            method: 'GET',
            headers: {
              Accept: 'application/json',
              apikey: conn.key,
              ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
            },
          }
        ).catch(() => null)
      : Promise.resolve(null);

    const [res, edgeRes] = await Promise.all([summaryPromise, edgeGetPromise]);

    const edgeData =
      edgeRes && edgeRes.ok
        ? ((await edgeRes.json().catch(() => null)) as {
            ok?: boolean;
            environment?: string;
            course?: {
              courseId?: string | null;
              slug?: string;
              title?: string;
              priceCents?: number;
              priceSource?: 'database' | 'reference';
            };
            capabilities?: AsaasCapabilities;
          } | null)
        : null;

    const data = res.ok
      ? ((await res.json().catch(() => null)) as Partial<CoursePaymentSummary> | null)
      : null;

    if (!data && !edgeData?.ok) return fallback;

    const edgePriceCents =
      typeof edgeData?.course?.priceCents === 'number' && Number.isFinite(edgeData.course.priceCents)
        ? edgeData.course.priceCents
        : null;
    const priceCents =
      edgePriceCents !== null && edgeData?.course?.priceSource === 'database'
        ? edgePriceCents
        : typeof data?.priceCents === 'number'
        ? data.priceCents
        : edgePriceCents ?? fallback.priceCents;

    const caps = edgeData?.capabilities ?? data?.capabilities;

    return {
      environment: edgeData?.environment || data?.environment || fallback.environment,
      courseSlug: edgeData?.course?.slug || data?.courseSlug || fallback.courseSlug,
      courseId: edgeData?.course?.courseId || data?.courseId || '',
      courseTitle:
        data?.courseTitle || edgeData?.course?.title || fallback.courseTitle,
      subtitle: data?.subtitle || 'Acesso ao curso',
      priceCents,
      priceFormatted:
        priceCents === data?.priceCents && data?.priceFormatted
          ? data.priceFormatted
          : formatBrlFromCents(priceCents),
      priceSource:
        edgeData?.course?.priceSource === 'database' || data?.priceSource === 'database'
          ? 'database'
          : 'reference',
      capabilities: {
        pix: caps?.pix ?? true,
        boleto: caps?.boleto ?? true,
        creditCard: Boolean(caps?.creditCard),
        debitCard: Boolean(caps?.debitCard),
        acceptedCardBrands: Array.isArray(caps?.acceptedCardBrands) ? caps.acceptedCardBrands : [],
      },
      isEnrolled: Boolean(data?.isEnrolled),
      latestOrderId: data?.latestOrderId ?? null,
      latestOrderStatus: data?.latestOrderStatus ?? null,
      latestPayment: data?.latestPayment ?? null,
      customerProfile: data?.customerProfile ?? null,
    };
  } catch {
    return fallback;
  }
}

export async function fetchOrderPaymentStatus(
  orderId: string,
  deps?: CheckoutDeps
): Promise<{
  ok: boolean;
  uiStatus?: PaymentUiStatus;
  orderStatus?: string;
  isEnrolled?: boolean;
  payment?: AsaasChargeResponsePayment | null;
  error?: string;
}> {
  if (!orderId) {
    return { ok: false, error: 'Pedido ainda não foi criado.' };
  }
  try {
    const getToken = deps?.getAccessToken ?? defaultGetAccessToken;
    const accessToken = await getToken().catch(() => null);
    if (!accessToken) {
      return { ok: false, error: 'Sessão não autenticada.' };
    }

    const fetchImpl = deps?.fetchFn ?? fetch;
    const res = await fetchImpl(`/api/payments/status/${encodeURIComponent(orderId)}`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    });
    const data = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      orderStatus?: string;
      isEnrolled?: boolean;
      payment?: AsaasChargeResponsePayment | null;
      error?: string;
    };
    if (!res.ok || !data?.ok) {
      return { ok: false, error: data?.error || 'Não foi possível consultar o status do pagamento.' };
    }
    return {
      ok: true,
      orderStatus: data.orderStatus,
      isEnrolled: Boolean(data.isEnrolled),
      payment: data.payment ?? null,
      uiStatus: mapAsaasStatusToUiStatus(data.payment?.status, data.orderStatus, data.isEnrolled),
    };
  } catch (err: unknown) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Erro de comunicação ao verificar status.',
    };
  }
}

export async function requestAsaasChargeCheckout(
  input: RequestAsaasChargeInput,
  deps?: CheckoutDeps
): Promise<RequestAsaasChargeOutcome> {
  if (checkoutState.isProcessing) {
    return {
      ok: false,
      reason: 'already_processing',
      error: 'Já existe um pagamento em processamento.',
    };
  }

  checkoutState = {
    isProcessing: true,
    activeCourseId: input.courseId,
    activeCourseSlug: input.courseSlug,
    activeCourseTitle: input.courseTitle,
    lastError: null,
    lastPayment: null,
  };
  emit();

  try {
    const initConfig = deps?.initConfig ?? initSupabaseRuntimeConfig;
    await initConfig();

    const getConn = deps?.getConnectionInfo ?? getSupabaseConnectionInfo;
    const conn = getConn();
    if (!conn) {
      const msg =
        'Supabase não configurado neste servidor. Configure VITE_SUPABASE_URL (ou SUPABASE_URL) e VITE_SUPABASE_PUBLISHABLE_KEY (ou SUPABASE_ANON_KEY) para processar cobranças pela Edge Function create-asaas-charge.';
      checkoutState = { ...checkoutState, lastError: msg };
      return { ok: false, reason: 'unconfigured', error: msg };
    }

    const getToken = deps?.getAccessToken ?? defaultGetAccessToken;
    const accessToken = await getToken();
    if (!accessToken) {
      const msg = 'Entre na sua conta para iniciar o pagamento.';
      checkoutState = { ...checkoutState, lastError: msg };
      return { ok: false, reason: 'unauthenticated', error: msg };
    }

    const fetchImpl = deps?.fetchFn ?? fetch;
    const endpoint = `${conn.url}/functions/v1/create-asaas-charge`;

    const response = await fetchImpl(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
        apikey: conn.key,
      },
      body: JSON.stringify({
        courseSlug: input.courseSlug,
        billingType: input.billingType ?? 'PIX',
        ...(typeof input.value === 'number' && Number.isFinite(input.value) ? { value: input.value } : {}),
        description: `FerveC Gastronomia — ${input.courseTitle}`,
        ...(input.externalReference ? { externalReference: input.externalReference } : {}),
        ...(input.customer ? { customer: input.customer } : {}),
      }),
    });

    const data = (await response.json().catch(() => ({}))) as {
      ok?: boolean;
      environment?: string;
      code?: string;
      error?: string;
      errors?: Array<{ field?: string; message?: string }>;
      orderId?: string | null;
      capabilities?: AsaasCapabilities;
      payment?: AsaasChargeResponsePayment;
    };

    if (!response.ok || !data?.ok || !data?.payment) {
      const detail =
        data?.errors?.[0]?.message ||
        data?.error ||
        'Não foi possível criar a cobrança no Asaas.';
      checkoutState = { ...checkoutState, lastError: detail };
      return {
        ok: false,
        environment: data?.environment,
        reason: 'api_error',
        errorCode: data?.code,
        error: detail,
      };
    }

    checkoutState = {
      ...checkoutState,
      lastError: null,
      lastPayment: data.payment,
    };

    return {
      ok: true,
      environment: data.environment,
      payment: data.payment,
      orderId: data.orderId ?? data.payment.orderId ?? null,
      capabilities: data.capabilities,
    };
  } catch (err: unknown) {
    const msg =
      err instanceof Error && err.message
        ? err.message
        : 'Erro de conexão ao comunicar com a API do Asaas.';
    checkoutState = { ...checkoutState, lastError: msg };
    return {
      ok: false,
      reason: 'network_error',
      error: msg,
    };
  } finally {
    checkoutState = {
      ...checkoutState,
      isProcessing: false,
      activeCourseId: null,
    };
    emit();
  }
}
