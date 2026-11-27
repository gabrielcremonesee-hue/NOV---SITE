export const PHASE_1_OFFLINE_ONLY = true as const;
export const SUPABASE_CONNECTED = false as const;
export const ASAAS_CONNECTED = false as const;

export interface IntegrationPhaseDescriptor {
  id: 'supabase' | 'asaas' | 'tts';
  name: string;
  connected: boolean;
  statusLabel: string;
  phaseNote: string;
}

export const PHASE_INTEGRATIONS: IntegrationPhaseDescriptor[] = [
  {
    id: 'supabase',
    name: 'Supabase (Banco de Dados & Auth)',
    connected: false,
    statusLabel: 'Aguardando integração',
    phaseNote:
      'Fase 1 ativa sem conexão com banco de dados. Os dados atuais usam armazenamento provisório local preparado para migração na Fase 2.',
  },
  {
    id: 'asaas',
    name: 'Asaas (Pagamentos Pix, Cartão e Boleto)',
    connected: false,
    statusLabel: 'Aguardando configuração',
    phaseNote:
      'Checkout organizado para Pix, Cartão de crédito e Boleto bancário. Nenhuma cobrança real ou simulada é executada nesta fase.',
  },
  {
    id: 'tts',
    name: 'Voz Neural Externa (Síntese de Fala Avançada)',
    connected: false,
    statusLabel: 'Aguardando integração (usando Web Speech local)',
    phaseNote:
      'A narração atual utiliza a síntese de voz nativa do navegador (pt-BR) ajustada para o perfil Chef Educador; a camada já suporta provedor neural externo na Fase 2.',
  },
];

export const PROVISIONAL_NOTICE_TEXT =
  'Armazenamento provisório local (Fase 1): dados salvos apenas neste navegador para testes, sem sincronização entre dispositivos ou validação definitiva em servidor.';
