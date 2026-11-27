export const SUPPLIER_IDENTITY = {
  commercialName: 'FerveC Gastronomia',
  legalNature: 'Pessoa Física (sem CNPJ)',
  civilName: 'Gabriel Cremonese',
  controllerName: 'Gabriel Cremonese',
  /** Exibir integralmente apenas na identificação legal obrigatória do fornecedor (Art. 2º, Decreto 7.962/2013) e resumo contratual. Nunca expor em logs, banco de auditoria ou relatórios técnicos. */
  cpfFormatted: '102.722.209-90',
  cpf: '102.722.209-90',
  cpfMasked: '***.722.209-**',
  officialEmail: 'fervecrgastronomia@gmail.com',
  email: 'fervecrgastronomia@gmail.com',
  instagramHandle: '@fervecgastronomia',
  instagram: '@fervecgastronomia',
  physicalAddress: null as string | null,
  addressPending: true,
  physicalAddressPendingLabel:
    'Endereço físico completo pendente de confirmação oficial do titular antes da abertura comercial pública',
  addressDisplay:
    'Endereço físico completo pendente de confirmação oficial do titular antes da abertura comercial pública',
  accessDurationPending: true,
  accessDurationPendingLabel:
    'Prazo de acesso e política de expiração pendentes de confirmação oficial do titular',
  accessDurationSummary:
    'Prazo de acesso e política de expiração pendentes de confirmação oficial do titular',
  minimumAgeYears: 18,
  regretDays: 7,
  termsVersion: '1.1',
  privacyVersion: '1.1',
  documentVersionLabel: 'v1.1 — 26/11/2026',
  documentoUnicoUrl:
    '/assets/aistudio/fervec_x5f_gastronomia_x5f_documento_x5f_unico__1___1__f38fd1c7.html',
} as const;

export function getLegalDocumentVersions() {
  return {
    termsVersion: SUPPLIER_IDENTITY.termsVersion,
    privacyVersion: SUPPLIER_IDENTITY.privacyVersion,
    documentVersionLabel: SUPPLIER_IDENTITY.documentVersionLabel,
    documentoUnicoUrl: SUPPLIER_IDENTITY.documentoUnicoUrl,
  };
}

export function maskCpfForLogs(value: string): string {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.length !== 11) return '***.***.***-**';
  return `***.${digits.slice(3, 6)}.${digits.slice(6, 9)}-**`;
}

export interface ContractCopyInput {
  courseTitle: string;
  courseSlug: string;
  priceFormatted: string;
  paymentMethodLabel: string;
  studentName: string;
  studentEmail: string;
  environmentLabel: string;
  orderId?: string | null;
}

export function buildPrintableContractText(input: ContractCopyInput): string {
  const nowBr = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  return [
    '============================================================',
    'FERVEC GASTRONOMIA — RESUMO PRÉ-CONTRATUAL E CONTRATO DIGITAL',
    'Decreto nº 7.962/2013 · Código de Defesa do Consumidor · LGPD',
    '============================================================',
    `Data/Hora de emissão (Brasília): ${nowBr}`,
    `Versão Termos: ${SUPPLIER_IDENTITY.termsVersion} | Versão Privacidade: ${SUPPLIER_IDENTITY.privacyVersion}`,
    '',
    '1. IDENTIFICAÇÃO DO FORNECEDOR (Art. 2º, Decreto nº 7.962/2013)',
    `   Nome comercial: ${SUPPLIER_IDENTITY.commercialName}`,
    `   Fornecedor / Controlador: ${SUPPLIER_IDENTITY.civilName} (${SUPPLIER_IDENTITY.legalNature})`,
    `   CPF: ${SUPPLIER_IDENTITY.cpfFormatted}`,
    `   E-mail oficial de atendimento / privacidade / arrependimento: ${SUPPLIER_IDENTITY.officialEmail}`,
    `   Instagram oficial: ${SUPPLIER_IDENTITY.instagramHandle}`,
    `   Endereço físico: ${SUPPLIER_IDENTITY.physicalAddress || SUPPLIER_IDENTITY.physicalAddressPendingLabel}`,
    '',
    '2. DADOS DO CONTRATANTE (TITULAR MAIOR DE 18 ANOS)',
    `   Nome: ${input.studentName}`,
    `   E-mail: ${input.studentEmail}`,
    ...(input.orderId ? [`   Referência do pedido: ${input.orderId}`] : []),
    '',
    '3. CARACTERÍSTICAS ESSENCIAIS DA OFERTA',
    `   Curso livre: ${input.courseTitle} (${input.courseSlug})`,
    `   Modalidade / Ambiente: ${input.environmentLabel}`,
    `   Valor total informado: ${input.paymentMethodLabel.includes('100%') ? 'R$ 0,00 (cupom 100%)' : input.priceFormatted}`,
    `   Forma de pagamento selecionada: ${input.paymentMethodLabel}`,
    `   Vigência do acesso: ${SUPPLIER_IDENTITY.accessDurationPendingLabel}`,
    '   Uso: licença pessoal, intransferível e restrita a uma sessão ativa por vez.',
    '',
    '4. DIREITO DE ARREPENDIMENTO (Art. 49 do CDC / Art. 5º Decreto 7.962/2013)',
    `   Prazo: até ${SUPPLIER_IDENTITY.regretDays} dias corridos a contar da contratação ou recebimento do acesso.`,
    `   Canal direto: Painel "Minha conta" > Solicitar Arrependimento ou e-mail ${SUPPLIER_IDENTITY.officialEmail}.`,
    '   Restituição integral e cancelamento automático de acessos após validação/reembolso.',
    '============================================================',
  ].join('\n');
}
