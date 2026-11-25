import {
  AsaasChargeResponsePayment,
  CardBillingMode,
  CoursePaymentSummary,
  formatBrlFromCents,
  getPaymentUiStatusLabel,
  PaymentMethodChoice,
  PaymentUiStatus,
} from '../utils/paymentCheckout';

export interface AppliedPaymentCouponView {
  code: string;
  discountPercent: number;
  discountCents: number;
  totalCents: number;
  isFree: boolean;
}

export interface PaymentsViewOptions {
  summary: CoursePaymentSummary;
  heroBannerSrc: string;
  courseThumbSrc: string;
  selectedMethod: PaymentMethodChoice;
  cardMode: CardBillingMode;
  cardHolderName: string;
  cardInstallments: number;
  uiStatus: PaymentUiStatus;
  statusMessage: string | null;
  isProcessing: boolean;
  copiedPix: boolean;
  activeOrderId: string | null;
  activePayment: AsaasChargeResponsePayment | null;
  couponCodeInput?: string;
  appliedCoupon?: AppliedPaymentCouponView | null;
  couponFeedback?: { ok: boolean; message: string } | null;
  isPhase1Offline?: boolean;
}

function esc(x: unknown): string {
  return String(x ?? '').replace(/[&<>"']/g, (c) => {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return map[c] || c;
  });
}

function formatDueDateBr(isoDate?: string | null): string {
  if (!isoDate) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoDate.trim());
  if (!m) return isoDate;
  return `${m[3]}/${m[2]}/${m[1]}`;
}

function formatChargeBrl(value: number | undefined, fallbackFormatted: string): string {
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }
  return fallbackFormatted;
}

function formatInvoiceDueSummary(isoDate?: string | null): string {
  if (!isoDate) return 'daqui a 4 dias';
  const brDate = formatDueDateBr(isoDate);
  if (!brDate || brDate === isoDate) return 'daqui a 4 dias';
  return `daqui a 4 dias (${brDate})`;
}

function getPaymentsViewStatusBadgeLabel(status: PaymentUiStatus): string {
  if (status === 'awaiting_confirmation') return 'Cobrança confirmada';
  return getPaymentUiStatusLabel(status);
}

const ICONS = {
  creditCardWhite: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2.5" y="5" width="19" height="14" rx="2.4" fill="currentColor"/><path d="M2.5 9.5h19" stroke="#6c0e13" stroke-width="2.2"/><rect x="5.5" y="13.2" width="4.6" height="2.4" rx=".6" fill="#6c0e13"/></svg>`,
  cartWhite: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 4.5h2.2l2.1 10.5a1.8 1.8 0 0 0 1.8 1.5h8.7a1.8 1.8 0 0 0 1.8-1.4L21.5 8H6.2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="10" cy="19.5" r="1.4" fill="currentColor"/><circle cx="18" cy="19.5" r="1.4" fill="currentColor"/></svg>`,
  pixDiamond: `<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M20 4.5 27.8 12.3a4 4 0 0 1 0 5.6L20 25.7l-7.8-7.8a4 4 0 0 1 0-5.6L20 4.5Z" fill="#32bcad" opacity="0.22"/><path d="M14.2 8.2a2.5 2.5 0 0 1 3.5 0l2.3 2.3 2.3-2.3a2.5 2.5 0 0 1 3.5 3.5L23.5 14l2.3 2.3a2.5 2.5 0 0 1-3.5 3.5L20 17.5l-2.3 2.3a2.5 2.5 0 0 1-3.5-3.5l2.3-2.3-2.3-2.3a2.5 2.5 0 0 1 0-3.5Z" transform="translate(0 6)" fill="#32bcad"/><path d="m20 3.2 4.7 4.7a1.6 1.6 0 0 1 0 2.3L20 14.9l-4.7-4.7a1.6 1.6 0 0 1 0-2.3L20 3.2Zm0 18.7 4.7 4.7a1.6 1.6 0 0 1 0 2.3L20 33.6l-4.7-4.7a1.6 1.6 0 0 1 0-2.3L20 21.9ZM3.2 20l4.7-4.7a1.6 1.6 0 0 1 2.3 0L14.9 20l-4.7 4.7a1.6 1.6 0 0 1-2.3 0L3.2 20Zm18.7 0 4.7-4.7a1.6 1.6 0 0 1 2.3 0L33.6 20l-4.7 4.7a1.6 1.6 0 0 1-2.3 0L21.9 20Z" fill="#32bcad"/></svg>`,
  barcode: `<svg viewBox="0 0 36 28" aria-hidden="true"><path d="M3 4v20M6.5 4v20M10 4v20M12.5 4v20M16 4v20M19.5 4v20M22 4v20M25.5 4v20M29 4v20M33 4v20" stroke="#241914" stroke-width="2" stroke-linecap="square"/><path d="M8.2 4v20M17.8 4v20M27.2 4v20" stroke="#241914" stroke-width="1.2"/></svg>`,
  cardCrimson: `<svg viewBox="0 0 36 26" aria-hidden="true"><rect x="2" y="3" width="32" height="20" rx="3.2" fill="#7c1218"/><rect x="2" y="7.2" width="32" height="3.6" fill="#3f0609"/><rect x="6" y="14.2" width="7" height="3.4" rx=".8" fill="#ebd2a0"/></svg>`,
  copyDocs: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8.5" y="7.5" width="10.5" height="12.5" rx="1.8" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M15.5 7.5V5.8A1.8 1.8 0 0 0 13.7 4H6.8A1.8 1.8 0 0 0 5 5.8v10.4A1.8 1.8 0 0 0 6.8 18h1.7" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>`,
  check: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  lockWhite: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="10" rx="2.4" fill="currentColor"/><path d="M8 10V7.6a4 4 0 0 1 8 0V10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="14.8" r="1.4" fill="#6b0d12"/></svg>`,
  shieldCheck: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.8 4.5 6v5.6c0 4.8 3.2 8.9 7.5 10.2 4.3-1.3 7.5-5.4 7.5-10.2V6L12 2.8Z" fill="#7c1218"/><path d="m8.8 12.2 2.2 2.2 4.4-4.4" fill="none" stroke="#fff7ea" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  headset: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 13v-1.2a7.5 7.5 0 0 1 15 0V13" fill="none" stroke="#6c0e13" stroke-width="2.2" stroke-linecap="round"/><rect x="3" y="11.5" width="3.5" height="5.8" rx="1.6" fill="#6c0e13"/><rect x="17.5" y="11.5" width="3.5" height="5.8" rx="1.6" fill="#6c0e13"/><path d="M19 17.2c0 2-1.8 3.1-4.8 3.3h-1.8" fill="none" stroke="#6c0e13" stroke-width="1.8" stroke-linecap="round"/><circle cx="11.5" cy="20.5" r="1.3" fill="#6c0e13"/></svg>`,
  spinner: `<svg class="payment-btn-spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>`,
  qrPlaceholder: `<svg viewBox="0 0 92 92" aria-hidden="true" class="payments-qr-placeholder-svg">
    <rect x="2" y="2" width="88" height="88" rx="6" fill="#ffffff" stroke="#e4d6be"/>
    <g fill="#2b1e16">
      <path d="M10 10h22v22H10V10Zm4 4v14h14V14H14Zm4 4h6v6h-6v-6Z"/>
      <path d="M60 10h22v22H60V10Zm4 4v14h14V14H64Zm4 4h6v6h-6v-6Z"/>
      <path d="M10 60h22v22H10V60Zm4 4v14h14V64H14Zm4 4h6v6h-6v-6Z"/>
      <rect x="38" y="10" width="5" height="5"/><rect x="48" y="10" width="6" height="5"/>
      <rect x="42" y="18" width="5" height="6"/><rect x="38" y="28" width="8" height="4"/>
      <rect x="10" y="38" width="6" height="5"/><rect x="21" y="38" width="11" height="5"/>
      <rect x="10" y="48" width="10" height="5"/><rect x="25" y="47" width="6" height="6"/>
      <rect x="38" y="38" width="14" height="5"/><rect x="42" y="48" width="10" height="6"/>
      <rect x="57" y="38" width="7" height="5"/><rect x="69" y="38" width="13" height="5"/>
      <rect x="60" y="48" width="6" height="5"/><rect x="72" y="48" width="10" height="5"/>
      <rect x="38" y="60" width="6" height="6"/><rect x="50" y="60" width="8" height="5"/>
      <rect x="42" y="71" width="12" height="5"/><rect x="60" y="60" width="12" height="6"/>
      <rect x="76" y="60" width="6" height="10"/><rect x="60" y="74" width="8" height="8"/>
      <rect x="73" y="75" width="9" height="7"/>
    </g>
  </svg>`,
};

function renderConfirmedBrandBadge(brand: string): string {
  const normalized = brand.toUpperCase();
  if (normalized === 'VISA') {
    return `<span class="payments-brand-badge is-visa" title="Visa">VISA</span>`;
  }
  if (normalized === 'MASTERCARD') {
    return `<span class="payments-brand-badge is-mastercard" title="Mastercard" aria-label="Mastercard"><i class="mc-red"></i><i class="mc-orange"></i></span>`;
  }
  if (normalized === 'ELO') {
    return `<span class="payments-brand-badge is-elo" title="Elo">elo</span>`;
  }
  if (normalized === 'AMEX') {
    return `<span class="payments-brand-badge is-amex" title="American Express">AM<br>EX</span>`;
  }
  return `<span class="payments-brand-badge">${esc(normalized)}</span>`;
}

export function renderPaymentsPage(opts: PaymentsViewOptions): string {
  const {
    summary,
    heroBannerSrc,
    courseThumbSrc,
    selectedMethod,
    cardMode,
    cardHolderName,
    cardInstallments,
    uiStatus,
    statusMessage,
    isProcessing,
    copiedPix,
    activeOrderId,
    activePayment,
    couponCodeInput = '',
    appliedCoupon = null,
    couponFeedback = null,
    isPhase1Offline = false,
  } = opts;

  const caps = summary.capabilities;
  const isSandbox = summary.environment === 'sandbox';
  const providerLabel = isSandbox ? 'Asaas Sandbox' : 'Asaas';
  const pixPayment = activePayment?.billingType === 'PIX' ? activePayment : null;
  const boletoPayment = activePayment?.billingType === 'BOLETO' ? activePayment : null;
  const boletoUrl = boletoPayment?.bankSlipUrl || boletoPayment?.invoiceUrl || null;
  const hasCreditCardCapability = caps.creditCard;

  const finalTotalCents = appliedCoupon ? appliedCoupon.totalCents : summary.priceCents;
  const finalTotalFormatted = formatBrlFromCents(finalTotalCents);
  const confirmButtonLabel = isProcessing
    ? 'Processando pagamento...'
    : appliedCoupon?.isFree
    ? 'Confirmar aquisição gratuita (cupom 100%)'
    : 'Confirmar pagamento';

  const confirmedBrandsHtml =
    caps.acceptedCardBrands.length > 0
      ? `<div class="payments-brands-row" aria-label="Bandeiras aceitas confirmadas">
          ${caps.acceptedCardBrands.map(renderConfirmedBrandBadge).join('')}
        </div>`
      : '';

  const showStatusBox =
    uiStatus !== 'awaiting_selection' || Boolean(statusMessage) || summary.isEnrolled;

  const statusToneClass =
    uiStatus === 'approved'
      ? 'is-approved'
      : uiStatus === 'awaiting_confirmation'
      ? 'is-charge-confirmed'
      : uiStatus === 'refused' || uiStatus === 'expired' || uiStatus === 'communication_error'
      ? 'is-error'
      : 'is-pending';

  const invoiceTotalFormatted = formatChargeBrl(activePayment?.value, finalTotalFormatted);
  const invoiceDueSummary = formatInvoiceDueSummary(activePayment?.dueDate);
  const resolvedStatusMessage =
    statusMessage ||
    (uiStatus === 'awaiting_confirmation'
      ? 'Cobrança criada e pronta para pagamento. O pagamento ainda não foi confirmado — após pagar, clique em "Atualizar status" para consultar a confirmação oficial do Asaas.'
      : null);

  return `<main class="payments-page">
    <section class="payments-hero">
      <img class="payments-hero-scene" src="${esc(heroBannerSrc)}" alt="Cozinheira da FerveC Gastronomia uniformizada na cozinha">
      <div class="payments-hero-shade" aria-hidden="true"></div>
      <img class="payments-hero-produce is-left" src="/assets/foliage/footer-produce.png" alt="" aria-hidden="true" draggable="false">
      <img class="payments-hero-produce is-right" src="/assets/foliage/footer-produce.png" alt="" aria-hidden="true" draggable="false">
      <div class="payments-hero-copy">
        <span class="payments-eyebrow">FerveC Gastronomia</span>
        <h1>Finalize seu<br><em>pagamento</em></h1>
        <p>Garanta agora o acesso ao seu curso de gastronomia!</p>
      </div>
      <div class="payments-hero-slogan" aria-hidden="true">
        <span>Aprenda, evolua</span>
        <span>e cozinhe melhor!</span>
        <svg class="payments-hero-swoosh" viewBox="0 0 180 18" fill="none">
          <path d="M6 12 C52 4, 126 3, 174 8" stroke="#f0ca75" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </div>
    </section>

    <section class="payments-stage">
      <img class="payments-footer-produce" src="/assets/foliage/footer-produce.png" alt="" aria-hidden="true" draggable="false">
      <div class="payments-parchment">
        <div class="payments-grid">
          <!-- Painel Esquerdo: Forma de Pagamento -->
          <section class="payments-panel" aria-labelledby="payments-methods-heading">
            <div class="payments-panel-header">
              <span class="payments-panel-header-icon">${ICONS.creditCardWhite}</span>
              <h2 id="payments-methods-heading">Forma de Pagamento</h2>
            </div>

            <div class="payments-card">
              <!-- Modalidade 1: PIX -->
              <div class="payments-method ${selectedMethod === 'PIX' ? 'is-selected' : ''}" data-payment-method="PIX">
                <button type="button" class="payments-method-trigger" data-action="select-payment-method" data-method="PIX" aria-pressed="${selectedMethod === 'PIX'}">
                  <span class="payments-radio ${selectedMethod === 'PIX' ? 'is-checked' : ''}" aria-hidden="true"></span>
                  <span class="payments-method-icon is-pix">${ICONS.pixDiamond}</span>
                  <span class="payments-method-copy">
                    <strong>Pix</strong>
                    <small>Pague em segundos pelo app do seu banco</small>
                  </span>
                </button>

                <div class="payments-pix-area ${selectedMethod === 'PIX' ? '' : 'is-dimmed'}">
                  <div class="payments-qr-frame">
                    ${
                      pixPayment?.pix?.encodedImage
                        ? `<img class="payments-qr-img" src="data:image/png;base64,${esc(pixPayment.pix.encodedImage)}" alt="QR Code Pix gerado pelo ${esc(providerLabel)}">`
                        : `${ICONS.qrPlaceholder}`
                    }
                  </div>
                  <div class="payments-pix-actions">
                    ${
                      pixPayment?.pix?.payload
                        ? `<label class="payments-pix-code-label" for="payments-pix-payload">Pix Copia e Cola</label>
                           <input id="payments-pix-payload" class="payments-pix-input" type="text" readonly value="${esc(pixPayment.pix.payload)}" aria-label="Código Pix Copia e Cola">`
                        : `<span class="payments-pix-hint">QR Code e código gerados via ${esc(providerLabel)}</span>`
                    }
                    <button type="button" class="payments-copy-btn ${copiedPix ? 'is-copied' : ''}" data-action="copy-pix-code">
                      <span class="payments-copy-btn-icon">${copiedPix ? ICONS.check : ICONS.copyDocs}</span>
                      <span>${copiedPix ? 'Código copiado!' : 'Copiar código'}</span>
                    </button>
                  </div>
                </div>
              </div>

              <hr class="payments-divider" />

              <!-- Modalidade 2: Boleto bancário -->
              <div class="payments-method ${selectedMethod === 'BOLETO' ? 'is-selected' : ''}" data-payment-method="BOLETO">
                <button type="button" class="payments-method-trigger" data-action="select-payment-method" data-method="BOLETO" aria-pressed="${selectedMethod === 'BOLETO'}">
                  <span class="payments-radio ${selectedMethod === 'BOLETO' ? 'is-checked' : ''}" aria-hidden="true"></span>
                  <span class="payments-method-icon is-barcode">${ICONS.barcode}</span>
                  <span class="payments-method-copy">
                    <strong>Boleto bancário</strong>
                    <small>Gere seu boleto e pague em qualquer banco</small>
                  </span>
                </button>

                <div class="payments-boleto-area">
                  <button type="button" class="payments-boleto-btn" data-action="generate-boleto" ${isProcessing ? 'disabled aria-disabled="true"' : ''}>
                    <span class="payments-boleto-btn-icon">${isProcessing && selectedMethod === 'BOLETO' ? ICONS.spinner : ICONS.copyDocs}</span>
                    <span>${isProcessing && selectedMethod === 'BOLETO' ? 'Gerando boleto...' : 'Gerar boleto'}</span>
                  </button>
                  ${
                    boletoUrl
                      ? `<div class="payments-boleto-result">
                          <span>Boleto disponível${boletoPayment?.dueDate ? ` · Vencimento ${esc(formatDueDateBr(boletoPayment.dueDate))}` : ''}</span>
                          <a class="payments-boleto-link" href="${esc(boletoUrl)}" target="_blank" rel="noopener noreferrer">Visualizar ou baixar boleto ↗</a>
                        </div>`
                      : ''
                  }
                </div>
              </div>

              <hr class="payments-divider" />

              <!-- Modalidade 3: Cartão de crédito -->
              <div class="payments-method ${selectedMethod === 'CARD' ? 'is-selected' : ''}" data-payment-method="CARD">
                <button type="button" class="payments-method-trigger" data-action="select-payment-method" data-method="CARD" aria-pressed="${selectedMethod === 'CARD'}">
                  <span class="payments-radio ${selectedMethod === 'CARD' ? 'is-checked' : ''}" aria-hidden="true"></span>
                  <span class="payments-method-icon is-card">${ICONS.cardCrimson}</span>
                  <span class="payments-method-copy">
                    <strong>Cartão de crédito</strong>
                    <small>Pague à vista com cartão de crédito</small>
                  </span>
                </button>

                ${confirmedBrandsHtml}

                ${
                  selectedMethod === 'CARD'
                    ? `<div class="payments-card-details">
                        ${
                          hasCreditCardCapability
                            ? `<div class="payments-card-mode-row" role="group" aria-label="Tipo de cartão">
                                <button type="button" class="payments-mode-pill is-active" data-action="select-card-mode" data-card-mode="CREDIT_CARD">Cartão de crédito</button>
                              </div>
                              <div class="payments-card-fields">
                                <label class="payments-field">
                                  <span>Nome impresso no cartão</span>
                                  <input type="text" data-payment-input="cardHolderName" value="${esc(cardHolderName)}" placeholder="Nome completo do titular" autocomplete="cc-name" />
                                </label>
                                <label class="payments-field">
                                  <span>Parcelamento no checkout seguro Asaas</span>
                                  <select data-payment-input="cardInstallments">
                                    <option value="1" selected>1x de ${esc(finalTotalFormatted)} à vista</option>
                                  </select>
                                </label>
                                <p class="payments-card-security-note">Os dados sensíveis do cartão são preenchidos diretamente no ambiente seguro tokenizado do Asaas após confirmar.</p>
                              </div>`
                            : `<div class="payments-card-unconfirmed">
                                Modalidade de cartão de crédito e bandeiras aceitas serão exibidas e liberadas após confirmação dessa configuração na conta ${esc(providerLabel)}. Para pagar agora, utilize <strong>Pix</strong> ou <strong>Boleto bancário</strong>.
                              </div>`
                        }
                      </div>`
                    : ''
                }
              </div>

              ${
                isPhase1Offline && uiStatus === 'awaiting_selection'
                  ? `<div class="payments-phase1-note" role="note">
                      <strong>Fase 1:</strong> integração Asaas aguardando configuração — Pix, Cartão de crédito e Boleto preparados para a Fase 2; cupons de 100% liberam acesso demonstrativo local.
                    </div>`
                  : ''
              }
            </div>
          </section>

          <!-- Painel Direito: Resumo do Pedido -->
          <section class="payments-panel" aria-labelledby="payments-summary-heading">
            <div class="payments-panel-header">
              <span class="payments-panel-header-icon">${ICONS.cartWhite}</span>
              <h2 id="payments-summary-heading">Resumo do Pedido</h2>
            </div>

            <div class="payments-card payments-summary-card">
              <div class="payments-course-row">
                <img class="payments-course-thumb" src="${esc(courseThumbSrc)}" alt="${esc(summary.courseTitle)}">
                <div class="payments-course-meta">
                  <h3>${esc(summary.courseTitle)}</h3>
                  <p>${esc(summary.subtitle)}</p>
                </div>
              </div>

              <hr class="payments-divider" />

              <div class="payments-price-row">
                <span>Subtotal</span>
                <strong>${esc(summary.priceFormatted)}</strong>
              </div>

              <div class="payments-coupon-row">
                <label class="payments-coupon-label" for="payments-coupon-input">Cupom de desconto</label>
                <div class="payments-coupon-controls">
                  <input
                    id="payments-coupon-input"
                    class="payments-coupon-input"
                    type="text"
                    inputmode="numeric"
                    maxlength="6"
                    placeholder="Código (6 dígitos)"
                    value="${esc(couponCodeInput)}"
                    data-payment-input="couponCode"
                  />
                  <button type="button" class="payments-coupon-apply-btn" data-action="apply-coupon">Aplicar</button>
                  ${
                    appliedCoupon
                      ? `<button type="button" class="payments-coupon-remove-btn" data-action="remove-coupon">Remover</button>`
                      : ''
                  }
                </div>
                ${
                  couponFeedback
                    ? `<p class="payments-coupon-feedback ${couponFeedback.ok ? 'is-ok' : 'is-error'}" role="status">${esc(couponFeedback.message)}</p>`
                    : ''
                }
              </div>

              ${
                appliedCoupon
                  ? `<div class="payments-price-row is-discount">
                      <span>Desconto (${appliedCoupon.discountPercent}% · #${esc(appliedCoupon.code)})</span>
                      <strong>- ${esc(formatBrlFromCents(appliedCoupon.discountCents))}</strong>
                    </div>`
                  : ''
              }

              <hr class="payments-divider" />

              <div class="payments-price-row is-total">
                <span class="payments-total-label">Total</span>
                <strong class="payments-total-value">${esc(finalTotalFormatted)}</strong>
              </div>

              <button
                type="button"
                class="payments-confirm-btn ${isProcessing ? 'is-processing' : ''} ${appliedCoupon?.isFree ? 'is-free-coupon' : ''}"
                data-action="confirm-payment"
                ${isProcessing ? 'disabled aria-disabled="true" aria-busy="true"' : ''}
              >
                <span class="payments-confirm-icon">${isProcessing ? ICONS.spinner : ICONS.lockWhite}</span>
                <span>${esc(confirmButtonLabel)}</span>
              </button>

              <div class="payments-security">
                <span class="payments-security-icon">${ICONS.shieldCheck}</span>
                <span>Seus dados são <span class="payments-underline">protegidos</span></span>
              </div>

              ${
                showStatusBox
                  ? `<div class="payments-status-box ${statusToneClass}" role="status" aria-live="polite">
                      <div class="payments-status-head">
                        <span class="payments-status-badge">${esc(getPaymentsViewStatusBadgeLabel(uiStatus))}</span>
                        ${
                          activeOrderId && uiStatus === 'awaiting_confirmation'
                            ? `<button type="button" class="payments-status-refresh" data-action="refresh-payment-status">Atualizar status</button>`
                            : ''
                        }
                      </div>
                      ${resolvedStatusMessage ? `<p class="payments-status-msg">${esc(resolvedStatusMessage)}</p>` : ''}
                      ${
                        activePayment && uiStatus === 'awaiting_confirmation'
                          ? `<dl class="payments-invoice-meta">
                              <div class="payments-invoice-meta-row">
                                <dt>Valor total:</dt>
                                <dd>${esc(invoiceTotalFormatted)}</dd>
                              </div>
                              <div class="payments-invoice-meta-row">
                                <dt>Vencimento:</dt>
                                <dd>${esc(invoiceDueSummary)}</dd>
                              </div>
                            </dl>`
                          : ''
                      }
                      ${
                        activePayment?.invoiceUrl && uiStatus === 'awaiting_confirmation'
                          ? `<div class="payments-invoice-cta">
                              <p class="payments-invoice-cta-text">Acesse o ambiente seguro do Asaas para realizar seu pagamento.</p>
                              <a class="payments-invoice-btn" href="${esc(activePayment.invoiceUrl)}" target="_blank" rel="noopener noreferrer">CLIQUE AQUI PARA ABRIR O AMBIENTE SEGURO DE COBRANÇA</a>
                            </div>`
                          : ''
                      }
                      ${
                        uiStatus === 'approved'
                          ? `<button type="button" class="payments-access-course-btn" data-action="courses">Acessar curso liberado →</button>`
                          : ''
                      }
                    </div>`
                  : ''
              }
            </div>
          </section>
        </div>

        <!-- Rodapé de Suporte dentro do Pergaminho -->
        <div class="payments-support">
          <div class="payments-support-heading">
            <span class="payments-support-rule" aria-hidden="true"></span>
            <span class="payments-support-icon">${ICONS.headset}</span>
            <button type="button" class="payments-support-link" data-action="help">Precisa de ajuda?</button>
            <span class="payments-support-rule" aria-hidden="true"></span>
          </div>
          <p>Entre em contato com nosso suporte.</p>
        </div>
      </div>
    </section>
  </main>`;
}
