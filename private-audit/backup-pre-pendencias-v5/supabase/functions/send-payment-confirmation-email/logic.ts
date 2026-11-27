export interface SendPaymentEmailInput {
  orderId: string;
  userId?: string;
  courseId?: string;
  recipientEmail?: string;
  customerName?: string;
  courseTitle?: string;
  courseSlug?: string;
  amountCents?: number;
  paymentId?: string;
  billingType?: string;
  paidAt?: string | null;
  accessUrl?: string;
}

export interface EmailRecipientContext {
  recipientEmail: string;
  customerName: string;
  courseTitle: string;
  courseSlug?: string;
  amountCents: number;
  paymentId?: string;
  billingType?: string;
  paidAt: string;
  accessUrl: string;
  orderId: string;
}

export interface ResendEmailPayload {
  from: string;
  to: string[];
  subject: string;
  html: string;
  text: string;
}

export interface EmailSendResult {
  ok: boolean;
  statusCode: number;
  id?: string;
  error?: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function constantTimeEquals(
  aRaw: string | null | undefined,
  bRaw: string | null | undefined
): boolean {
  const aStr = typeof aRaw === 'string' ? aRaw.trim() : '';
  const bStr = typeof bRaw === 'string' ? bRaw.trim() : '';
  if (!aStr || !bStr) return false;

  const encoder = new TextEncoder();
  const a = encoder.encode(aStr);
  const b = encoder.encode(bStr);
  const maxLen = Math.max(a.length, b.length);

  let diff = a.length ^ b.length;
  for (let i = 0; i < maxLen; i++) {
    diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  }
  return diff === 0;
}

export function authorizeInternalRequest(params: {
  authorizationHeader: string | null;
  internalSecretHeader?: string | null;
  serviceRoleKey?: string | null;
  expectedInternalSecret?: string | null;
}): boolean {
  const bearer = params.authorizationHeader?.replace(/^Bearer\s+/i, '').trim() || '';
  if (params.serviceRoleKey && constantTimeEquals(bearer, params.serviceRoleKey)) {
    return true;
  }
  if (
    params.expectedInternalSecret &&
    (constantTimeEquals(params.internalSecretHeader, params.expectedInternalSecret) ||
      constantTimeEquals(bearer, params.expectedInternalSecret))
  ) {
    return true;
  }
  return false;
}

export function validateSendPaymentEmailBody(
  rawBody: unknown
): { ok: true; data: SendPaymentEmailInput } | { ok: false; error: string } {
  if (!rawBody || typeof rawBody !== 'object' || Array.isArray(rawBody)) {
    return { ok: false, error: 'Corpo da requisição inválido. Envie um objeto JSON válido.' };
  }

  const raw = rawBody as Record<string, unknown>;
  const orderId = typeof raw.orderId === 'string' ? raw.orderId.trim() : '';
  if (!orderId || orderId.length > 120) {
    return { ok: false, error: 'Campo "orderId" é obrigatório.' };
  }

  const recipientEmail =
    typeof raw.recipientEmail === 'string' && raw.recipientEmail.trim()
      ? raw.recipientEmail.trim().toLowerCase()
      : undefined;

  if (recipientEmail && !EMAIL_REGEX.test(recipientEmail)) {
    return { ok: false, error: 'Campo "recipientEmail" possui formato inválido.' };
  }

  const userId =
    typeof raw.userId === 'string' && raw.userId.trim() ? raw.userId.trim().slice(0, 120) : undefined;
  const courseId =
    typeof raw.courseId === 'string' && raw.courseId.trim()
      ? raw.courseId.trim().slice(0, 120)
      : undefined;

  if (!recipientEmail && !userId) {
    return {
      ok: false,
      error: 'Informe "recipientEmail" ou "userId" para localizar o destinatário.',
    };
  }

  const amountCents =
    typeof raw.amountCents === 'number' && Number.isFinite(raw.amountCents) && raw.amountCents >= 0
      ? Math.round(raw.amountCents)
      : undefined;

  return {
    ok: true,
    data: {
      orderId,
      userId,
      courseId,
      recipientEmail,
      customerName:
        typeof raw.customerName === 'string' && raw.customerName.trim()
          ? raw.customerName.trim().slice(0, 140)
          : undefined,
      courseTitle:
        typeof raw.courseTitle === 'string' && raw.courseTitle.trim()
          ? raw.courseTitle.trim().slice(0, 180)
          : undefined,
      courseSlug:
        typeof raw.courseSlug === 'string' && raw.courseSlug.trim()
          ? raw.courseSlug.trim().slice(0, 120)
          : undefined,
      amountCents,
      paymentId:
        typeof raw.paymentId === 'string' && raw.paymentId.trim()
          ? raw.paymentId.trim().slice(0, 120)
          : undefined,
      billingType:
        typeof raw.billingType === 'string' && raw.billingType.trim()
          ? raw.billingType.trim().toUpperCase().slice(0, 40)
          : undefined,
      paidAt:
        typeof raw.paidAt === 'string' && raw.paidAt.trim() ? raw.paidAt.trim().slice(0, 64) : null,
      accessUrl:
        typeof raw.accessUrl === 'string' && raw.accessUrl.trim()
          ? raw.accessUrl.trim().slice(0, 500)
          : undefined,
    },
  };
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function formatBrlFromCents(cents: number): string {
  const value = Number.isFinite(cents) ? cents / 100 : 0;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function formatBillingTypePtBr(billingType?: string): string {
  switch ((billingType || '').toUpperCase()) {
    case 'PIX':
      return 'Pix';
    case 'BOLETO':
      return 'Boleto Bancário';
    case 'CREDIT_CARD':
      return 'Cartão de Crédito';
    default:
      return billingType ? billingType : 'Pagamento Online';
  }
}

export function formatPaidDatePtBr(paidAt: string): string {
  const parsed = new Date(paidAt);
  if (Number.isNaN(parsed.getTime())) return paidAt;
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'America/Sao_Paulo',
  }).format(parsed);
}

export function buildPaymentConfirmationEmail(
  ctx: EmailRecipientContext,
  fromEmail: string
): ResendEmailPayload {
  const firstName = ctx.customerName.trim().split(/\s+/)[0] || 'Aluno(a)';
  const safeName = escapeHtml(ctx.customerName);
  const safeFirstName = escapeHtml(firstName);
  const safeCourse = escapeHtml(ctx.courseTitle);
  const safeAmount = escapeHtml(formatBrlFromCents(ctx.amountCents));
  const safeMethod = escapeHtml(formatBillingTypePtBr(ctx.billingType));
  const safePaidAt = escapeHtml(formatPaidDatePtBr(ctx.paidAt));
  const safeOrderId = escapeHtml(ctx.orderId);
  const safePaymentId = ctx.paymentId ? escapeHtml(ctx.paymentId) : null;
  const safeUrl = escapeHtml(ctx.accessUrl);

  const subject = `Pagamento confirmado! Seu acesso ao curso ${ctx.courseTitle} está liberado`;

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f6efe4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#2b1811;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:32px 16px;background-color:#f6efe4;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background-color:#fffdf9;border:1px solid #dfd0b8;border-radius:16px;overflow:hidden;">
          <tr>
            <td style="background:linear-gradient(135deg,#8c1d18 0%,#5f100d 100%);padding:28px 32px;text-align:left;">
              <p style="margin:0 0 6px 0;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#f3d286;font-weight:700;">FERVEC GASTRONOMIA</p>
              <h1 style="margin:0;font-size:24px;line-height:1.25;color:#fff9f0;font-weight:700;">Pagamento confirmado!</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 32px;">
              <p style="margin:0 0 14px 0;font-size:16px;line-height:1.55;">Olá, <strong>${safeFirstName}</strong>!</p>
              <p style="margin:0 0 20px 0;font-size:15px;line-height:1.6;color:#4a3529;">
                Recebemos a confirmação do seu pagamento e sua matrícula no curso <strong>${safeCourse}</strong> já está ativa.
              </p>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#fbf5ea;border:1px solid #e5d5bc;border-radius:12px;padding:16px 20px;margin:0 0 24px 0;">
                <tr>
                  <td style="padding:6px 0;font-size:13px;color:#6e5648;">Aluno(a)</td>
                  <td align="right" style="padding:6px 0;font-size:13px;font-weight:700;color:#2b1811;">${safeName}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;font-size:13px;color:#6e5648;">Curso liberado</td>
                  <td align="right" style="padding:6px 0;font-size:13px;font-weight:700;color:#2b1811;">${safeCourse}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;font-size:13px;color:#6e5648;">Valor pago</td>
                  <td align="right" style="padding:6px 0;font-size:13px;font-weight:700;color:#1f6b3b;">${safeAmount}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;font-size:13px;color:#6e5648;">Forma de pagamento</td>
                  <td align="right" style="padding:6px 0;font-size:13px;font-weight:600;color:#2b1811;">${safeMethod}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;font-size:13px;color:#6e5648;">Confirmado em</td>
                  <td align="right" style="padding:6px 0;font-size:13px;font-weight:600;color:#2b1811;">${safePaidAt}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;font-size:13px;color:#6e5648;">Pedido</td>
                  <td align="right" style="padding:6px 0;font-size:12px;font-family:monospace;color:#4a3529;">${safeOrderId}</td>
                </tr>
                ${
                  safePaymentId
                    ? `<tr>
                  <td style="padding:6px 0;font-size:13px;color:#6e5648;">Transação Asaas</td>
                  <td align="right" style="padding:6px 0;font-size:12px;font-family:monospace;color:#4a3529;">${safePaymentId}</td>
                </tr>`
                    : ''
                }
              </table>

              <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 0 22px 0;">
                <tr>
                  <td align="center" style="border-radius:999px;background-color:#b42318;">
                    <a href="${safeUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:13px 26px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;">
                      Acessar Meu Curso Agora →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0;font-size:12.5px;line-height:1.5;color:#7a6254;">
                Caso tenha qualquer dúvida, responda a este e-mail ou utilize o suporte dentro da plataforma FerveC Gastronomia.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px;background-color:#f6efe4;border-top:1px solid #eadcc6;font-size:12px;color:#6e5648;text-align:center;">
              FerveC Gastronomia · Confirmação automática de matrícula
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = [
    `Olá, ${firstName}!`,
    '',
    `Seu pagamento foi confirmado e o acesso ao curso "${ctx.courseTitle}" já está liberado na FerveC Gastronomia.`,
    '',
    `Resumo do pedido:`,
    `- Curso: ${ctx.courseTitle}`,
    `- Valor: ${formatBrlFromCents(ctx.amountCents)}`,
    `- Pagamento: ${formatBillingTypePtBr(ctx.billingType)}`,
    `- Confirmado em: ${formatPaidDatePtBr(ctx.paidAt)}`,
    `- Pedido: ${ctx.orderId}`,
    ...(ctx.paymentId ? [`- Transação Asaas: ${ctx.paymentId}`] : []),
    '',
    `Acesse suas aulas em: ${ctx.accessUrl}`,
  ].join('\n');

  return {
    from: fromEmail,
    to: [ctx.recipientEmail],
    subject,
    html,
    text,
  };
}

export async function sendEmailViaResend(params: {
  apiKey: string | null | undefined;
  fromEmail: string;
  context: EmailRecipientContext;
  fetchFn?: typeof fetch;
}): Promise<EmailSendResult> {
  const apiKey = params.apiKey?.trim();
  if (!apiKey) {
    return {
      ok: false,
      statusCode: 500,
      error: 'Chave RESEND_API_KEY não configurada nos Secrets do Supabase.',
    };
  }

  const payload = buildPaymentConfirmationEmail(params.context, params.fromEmail);
  const fetchImpl = params.fetchFn ?? fetch;

  try {
    const response = await fetchImpl('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': `fervec-payment-confirmed-${params.context.orderId}`,
      },
      body: JSON.stringify(payload),
    });

    const data = (await response.json().catch(() => ({}))) as {
      id?: string;
      message?: string;
      error?: string;
    };

    if (!response.ok || !data?.id) {
      return {
        ok: false,
        statusCode: response.status >= 400 ? response.status : 502,
        error: data?.message || data?.error || 'Falha ao enviar e-mail transacional via Resend.',
      };
    }

    return {
      ok: true,
      statusCode: 200,
      id: data.id,
    };
  } catch (err: unknown) {
    return {
      ok: false,
      statusCode: 502,
      error: err instanceof Error ? err.message : 'Erro de rede ao comunicar com o provedor de e-mail.',
    };
  }
}

export const DEFAULT_SANDBOX_FROM_EMAIL = 'FerveC Gastronomia <onboarding@resend.dev>';

export function extractEmailAddress(fromHeader: string): string | null {
  const trimmed = fromHeader.trim();
  if (!trimmed) return null;
  const angleMatch = trimmed.match(/<([^<>]+)>/);
  const candidate = (angleMatch ? angleMatch[1] : trimmed).trim().toLowerCase();
  return EMAIL_REGEX.test(candidate) ? candidate : null;
}

export interface EmailEnvConfig {
  apiKey: string | null;
  fromEmail: string;
  fromEmailConfigured: boolean;
  fromEmailSource: 'FROM_EMAIL' | 'RESEND_FROM_EMAIL' | 'default_sandbox';
  fromEmailValid: boolean;
}

export function resolveEmailEnvConfig(
  getEnv: (key: string) => string | undefined
): EmailEnvConfig {
  const apiKeyCandidates = [getEnv('RESEND_API_KEY'), getEnv('EMAIL_PROVIDER_API_KEY')];
  let apiKey: string | null = null;
  for (const c of apiKeyCandidates) {
    const t = c?.trim();
    if (t) {
      apiKey = t;
      break;
    }
  }

  const fromPrimary = getEnv('FROM_EMAIL')?.trim();
  const fromResend = getEnv('RESEND_FROM_EMAIL')?.trim();

  let fromEmail = DEFAULT_SANDBOX_FROM_EMAIL;
  let fromEmailConfigured = false;
  let fromEmailSource: EmailEnvConfig['fromEmailSource'] = 'default_sandbox';

  if (fromResend) {
    fromEmail = fromResend;
    fromEmailConfigured = true;
    fromEmailSource = 'RESEND_FROM_EMAIL';
  } else if (fromPrimary) {
    fromEmail = fromPrimary;
    fromEmailConfigured = true;
    fromEmailSource = 'FROM_EMAIL';
  }

  return {
    apiKey,
    fromEmail,
    fromEmailConfigured,
    fromEmailSource,
    fromEmailValid: Boolean(extractEmailAddress(fromEmail)),
  };
}

export interface ResendConnectionValidationResult {
  ok: boolean;
  statusCode: number;
  provider: 'resend';
  connectionStatus:
    | 'connected'
    | 'connected_send_only'
    | 'missing_api_key'
    | 'invalid_from_email'
    | 'auth_failed'
    | 'network_error';
  secrets: {
    RESEND_API_KEY: boolean;
    FROM_EMAIL: boolean;
    fromEmailSource: EmailEnvConfig['fromEmailSource'];
    fromEmailValid: boolean;
  };
  senderDomain?: string | null;
  domainVerified?: boolean | null;
  verifiedDomains?: string[];
  warning?: string;
  error?: string;
}

export async function validateResendConnection(params: {
  config: EmailEnvConfig;
  fetchFn?: typeof fetch;
}): Promise<ResendConnectionValidationResult> {
  const { config } = params;
  const senderAddress = extractEmailAddress(config.fromEmail);
  const senderDomain = senderAddress ? senderAddress.split('@')[1] ?? null : null;

  const baseSecrets = {
    RESEND_API_KEY: Boolean(config.apiKey),
    FROM_EMAIL: config.fromEmailConfigured,
    fromEmailSource: config.fromEmailSource,
    fromEmailValid: config.fromEmailValid,
  };

  if (!config.apiKey) {
    return {
      ok: false,
      statusCode: 500,
      provider: 'resend',
      connectionStatus: 'missing_api_key',
      secrets: baseSecrets,
      senderDomain,
      domainVerified: null,
      error: 'Variável RESEND_API_KEY não configurada nos Secrets do Supabase.',
    };
  }

  if (!config.fromEmailValid || !senderAddress) {
    return {
      ok: false,
      statusCode: 400,
      provider: 'resend',
      connectionStatus: 'invalid_from_email',
      secrets: baseSecrets,
      senderDomain,
      domainVerified: null,
      error: 'Variável FROM_EMAIL / RESEND_FROM_EMAIL possui formato de e-mail inválido.',
    };
  }

  const fetchImpl = params.fetchFn ?? fetch;

  try {
    const res = await fetchImpl('https://api.resend.com/domains', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        Accept: 'application/json',
      },
    });

    const data = (await res.json().catch(() => ({}))) as {
      data?: Array<{ name?: string; status?: string }>;
      message?: string;
      name?: string;
    };

    if (res.ok) {
      const domains = Array.isArray(data?.data) ? data.data : [];
      const verifiedDomains = domains
        .filter((d) => d?.status === 'verified' && typeof d?.name === 'string')
        .map((d) => String(d.name).toLowerCase());

      const isSandboxResendDomain = senderDomain === 'resend.dev';
      const domainVerified = isSandboxResendDomain
        ? true
        : Boolean(senderDomain && verifiedDomains.includes(senderDomain));

      return {
        ok: true,
        statusCode: 200,
        provider: 'resend',
        connectionStatus: 'connected',
        secrets: baseSecrets,
        senderDomain,
        domainVerified,
        verifiedDomains,
        ...(!domainVerified
          ? {
              warning: `O domínio remetente "${senderDomain}" ainda não consta como verificado no Resend.`,
            }
          : {}),
      };
    }

    const msg = String(data?.message || '');
    if (
      (res.status === 401 || res.status === 403) &&
      /restricted.*send|only.*send/i.test(msg)
    ) {
      return {
        ok: true,
        statusCode: 200,
        provider: 'resend',
        connectionStatus: 'connected_send_only',
        secrets: baseSecrets,
        senderDomain,
        domainVerified: null,
        warning:
          'RESEND_API_KEY autenticada com escopo restrito apenas a envio (sending_access).',
      };
    }

    return {
      ok: false,
      statusCode: res.status === 401 || res.status === 403 ? res.status : 502,
      provider: 'resend',
      connectionStatus: 'auth_failed',
      secrets: baseSecrets,
      senderDomain,
      domainVerified: null,
      error: msg || `Falha ao validar conexão com o Resend (HTTP ${res.status}).`,
    };
  } catch (err: unknown) {
    return {
      ok: false,
      statusCode: 502,
      provider: 'resend',
      connectionStatus: 'network_error',
      secrets: baseSecrets,
      senderDomain,
      domainVerified: null,
      error: err instanceof Error ? err.message : 'Erro de rede ao validar conexão com o Resend.',
    };
  }
}

