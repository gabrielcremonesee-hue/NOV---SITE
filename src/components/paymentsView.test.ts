import test from 'node:test';
import assert from 'node:assert/strict';
import { renderPaymentsPage } from './paymentsView';
import {
  createDefaultCoursePaymentSummary,
  mapAsaasStatusToUiStatus,
} from '../utils/paymentCheckout';

test('renderPaymentsPage renders all required sections, Curso de Massas, R$ 12,90, and hides unconfirmed card brands', () => {
  const summary = createDefaultCoursePaymentSummary('massas-italianas');
  const html = renderPaymentsPage({
    summary,
    heroBannerSrc: '/assets/test-chef.jpg',
    courseThumbSrc: '/assets/test-pasta.png',
    selectedMethod: 'PIX',
    cardMode: 'CREDIT_CARD',
    cardHolderName: '',
    cardInstallments: 1,
    uiStatus: 'awaiting_selection',
    statusMessage: null,
    isProcessing: false,
    copiedPix: false,
    activeOrderId: null,
    activePayment: null,
  });

  // Banner superior
  assert.match(html, /Finalize seu<br><em>pagamento<\/em>/);
  assert.match(html, /Garanta agora o acesso ao seu curso de gastronomia!/);
  assert.match(html, /Cozinheira da FerveC Gastronomia uniformizada na cozinha/);
  assert.match(html, /Aprenda, evolua/);

  // Forma de Pagamento (3 modalidades, somente Cartão de crédito)
  assert.match(html, /Forma de Pagamento/);
  assert.match(html, /Pix/);
  assert.match(html, /Copiar código/);
  assert.match(html, /Boleto bancário/);
  assert.match(html, /Gerar boleto/);
  assert.match(html, /Cartão de crédito/);
  assert.doesNotMatch(html, /Cartão de crédito ou débito/);

  // Bandeiras não confirmadas NÃO devem aparecer
  assert.doesNotMatch(html, /payments-brands-row/);

  // Resumo do Pedido (R$ 12,90 + Curso de Massas)
  assert.match(html, /Resumo do Pedido/);
  assert.match(html, /Curso de Massas/);
  assert.match(html, /Acesso ao curso/);
  assert.match(html, /R\$\s*12,90/);
  assert.match(html, /Confirmar pagamento/);
  assert.match(html, /Seus dados são/);
  assert.match(html, /Precisa de ajuda\?/);
  assert.match(html, /Entre em contato com nosso suporte\./);
});

test('renderPaymentsPage renders real Asaas Pix QR code, payload, Boleto link, and confirmed card brands', () => {
  const base = createDefaultCoursePaymentSummary('massas-italianas');
  const summary = {
    ...base,
    priceSource: 'database' as const,
    capabilities: {
      pix: true,
      boleto: true,
      creditCard: true,
      debitCard: false,
      acceptedCardBrands: ['VISA', 'MASTERCARD', 'ELO', 'AMEX'],
    },
  };

  const pixHtml = renderPaymentsPage({
    summary,
    heroBannerSrc: '/assets/test-chef.jpg',
    courseThumbSrc: '/assets/test-pasta.png',
    selectedMethod: 'PIX',
    cardMode: 'CREDIT_CARD',
    cardHolderName: '',
    cardInstallments: 1,
    uiStatus: 'awaiting_confirmation',
    statusMessage: null,
    isProcessing: false,
    copiedPix: true,
    activeOrderId: 'order-123',
    activePayment: {
      id: 'pay_1',
      status: 'PENDING',
      billingType: 'PIX',
      value: 12.9,
      dueDate: '2026-11-22',
      invoiceUrl: 'https://www.asaas.com/i/test123',
      pix: {
        encodedImage: 'iVBORw0KGgoAAAANSUhEUg==',
        payload: '00020101021226830014br.gov.bcb.pix',
      },
    },
  });

  assert.match(pixHtml, /data:image\/png;base64,iVBORw0KGgoAAAANSUhEUg==/);
  assert.match(pixHtml, /00020101021226830014br\.gov\.bcb\.pix/);
  assert.match(pixHtml, /Código copiado!/);
  assert.match(pixHtml, /Cobrança confirmada/);
  assert.match(pixHtml, /is-charge-confirmed/);
  assert.match(pixHtml, /Atualizar status/);
  assert.match(pixHtml, /Valor total:/);
  assert.match(pixHtml, /Vencimento:/);
  assert.match(pixHtml, /daqui a 4 dias \(22\/11\/2026\)/);
  assert.match(pixHtml, /Acesse o ambiente seguro do Asaas para realizar seu pagamento\./);
  assert.match(pixHtml, /CLIQUE AQUI PARA ABRIR O AMBIENTE SEGURO DE COBRANÇA/);
  assert.match(pixHtml, /https:\/\/www\.asaas\.com\/i\/test123/);
  assert.match(pixHtml, /payments-brands-row/);
  assert.match(pixHtml, /VISA/);

  const cardSelectedHtml = renderPaymentsPage({
    summary,
    heroBannerSrc: '/assets/test-chef.jpg',
    courseThumbSrc: '/assets/test-pasta.png',
    selectedMethod: 'CARD',
    cardMode: 'CREDIT_CARD',
    cardHolderName: 'Maria Silva',
    cardInstallments: 1,
    uiStatus: 'processing_payment',
    statusMessage: null,
    isProcessing: true,
    copiedPix: false,
    activeOrderId: null,
    activePayment: null,
  });

  assert.match(cardSelectedHtml, /data-card-mode="CREDIT_CARD"/);
  assert.doesNotMatch(cardSelectedHtml, /data-card-mode="DEBIT_CARD"/);
  assert.match(cardSelectedHtml, /1x de R\$\s*12,90 à vista/);
  assert.doesNotMatch(cardSelectedHtml, /2x no cartão/);
  assert.doesNotMatch(cardSelectedHtml, /3x no cartão/);
  assert.match(cardSelectedHtml, /Processando pagamento\.\.\./);
  assert.match(cardSelectedHtml, /disabled aria-disabled="true"/);

  const boletoHtml = renderPaymentsPage({
    summary,
    heroBannerSrc: '/assets/test-chef.jpg',
    courseThumbSrc: '/assets/test-pasta.png',
    selectedMethod: 'BOLETO',
    cardMode: 'CREDIT_CARD',
    cardHolderName: '',
    cardInstallments: 1,
    uiStatus: 'awaiting_confirmation',
    statusMessage: null,
    isProcessing: false,
    copiedPix: false,
    activeOrderId: 'order-2',
    activePayment: {
      id: 'pay_boleto_1',
      status: 'PENDING',
      billingType: 'BOLETO',
      value: 12.9,
      dueDate: '2026-11-22',
      bankSlipUrl: 'https://sandbox.asaas.com/b/pdf/123',
    },
  });

  assert.match(boletoHtml, /https:\/\/sandbox\.asaas\.com\/b\/pdf\/123/);
  assert.match(boletoHtml, /Visualizar ou baixar boleto/);
  assert.match(boletoHtml, /22\/11\/2026/);
});

test('mapAsaasStatusToUiStatus never fakes approval on PENDING and unlocks only when PAID/RECEIVED/CONFIRMED', () => {
  assert.equal(mapAsaasStatusToUiStatus('PENDING', 'pending', false), 'awaiting_confirmation');
  assert.equal(mapAsaasStatusToUiStatus('OVERDUE', 'overdue', false), 'expired');
  assert.equal(mapAsaasStatusToUiStatus('REFUNDED', 'refunded', false), 'refused');
  assert.equal(mapAsaasStatusToUiStatus('RECEIVED', 'paid', true), 'approved');
  assert.equal(mapAsaasStatusToUiStatus('CONFIRMED', 'pending', false), 'approved');
});
