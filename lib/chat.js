export const CHAT_ROLES = [
  {
    id: 'chef-tutor',
    label: 'Chef Tutor',
    model: 'gemini-4-hydrogen',
    modelLabel: 'Gemini 4 Hydrogen',
    shortDesc: 'Explicações completas sobre técnicas, massas e molhos.',
    instruction:
      'Você é o Chef Tutor da FerveC Gastronomia, especialista em massa italiana artesanal em português. Use como referência principal o conteúdo fornecido da página atual do e-book quando existir, sem inventar números de página ou citações. Responda com clareza, passo a passo prático e segurança alimentar.',
  },
  {
    id: 'technique-mentor',
    label: 'Mentor de Técnica',
    model: 'gemini-4-hydrogen',
    modelLabel: 'Gemini 4 Hydrogen',
    shortDesc: 'Diagnóstico de ponto de massa, glúten, hidratação e secagem.',
    instruction:
      'Você é o Mentor Técnico da FerveC Gastronomia. Ajude a diagnosticar elasticidade, hidratação, ponto da sova, abertura no rolo ou cilindro e cozimento da massa fresca. Seja direto, estruturado em tópicos curtos e fiel ao contexto da página atual quando disponível.',
  },
  {
    id: 'quick-kitchen',
    label: 'Bancada Rápida',
    model: 'gemini-3.1-flash-lite',
    modelLabel: 'Gemini 3.1 Flash-Lite',
    shortDesc: 'Respostas rápidas para dúvidas imediatas durante o preparo.',
    instruction:
      'Você é o Guia de Bancada Rápida da FerveC Gastronomia. Responda em 2 a 4 frases objetivas, ideais para leitura rápida com as mãos na massa. Priorize segurança prática e o trecho do livro da página atual quando informado.',
  },
];

export const CHAT_QUICK_PROMPTS = [
  'Por que a minha massa rasga na hora de abrir?',
  'Qual o tempo ideal de descanso antes de laminar?',
  'Como escolher o molho para o formato desta página?',
  'Quais cuidados para secar ou congelar massa fresca?',
];

export function getChatRole(roleId) {
  return CHAT_ROLES.find((r) => r.id === roleId) || CHAT_ROLES[0];
}

export function buildChatSystemInstruction({ roleId, page, pageTitle, pageText, includePageContext = true }) {
  const role = getChatRole(roleId);
  if (!includePageContext) {
    return `${role.instruction} Responda em português do Brasil.`;
  }
  const cleanText = String(pageText || '').trim().slice(0, 3500);
  const title = String(pageTitle || '').trim();
  const pageNum = Number(page) || 1;
  return `${role.instruction} Página atual do leitor: ${pageNum}${title ? ` (${title})` : ''}. Conteúdo extraído desta página: ${cleanText || '[sem texto extraído ainda]'}`;
}

export function sanitizeChatHistory(messages, limit = 20) {
  if (!Array.isArray(messages)) return [];
  return messages
    .filter((m) => m && !m.isError && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
    .slice(-Math.max(1, limit))
    .map((m) => ({
      role: m.role,
      content: m.content.trim(),
    }));
}

export function sanitizeStoredChat(messages, limit = 40) {
  if (!Array.isArray(messages)) return [];
  return messages
    .filter((m) => m && !m.isError && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
    .slice(-Math.max(1, limit))
    .map((m) => ({
      role: m.role,
      content: m.content.trim(),
      ...(m.roleId ? { roleId: String(m.roleId) } : {}),
      ...(m.roleLabel ? { roleLabel: String(m.roleLabel) } : {}),
      ...(m.modelLabel ? { modelLabel: String(m.modelLabel) } : {}),
      ...(m.timestamp ? { timestamp: String(m.timestamp) } : {}),
    }));
}

export function buildChefWelcomeGreeting({ userName = '', roleId = 'chef-tutor', page = 1 } = {}) {
  const role = getChatRole(roleId);
  const firstName = String(userName || '').trim().split(/\s+/)[0];
  const salutation = firstName ? `Ciao, ${firstName}!` : 'Ciao, chef!';
  const headline = `${salutation} Benvenuto à bancada da FerveC!`;
  const pageNum = Number(page) || 1;
  const message =
    `Que alegria receber você na cozinha${firstName ? ', ' + firstName : ''}! ` +
    `Sou o ${role.label} — escreva ou use o microfone para dúvidas sobre massa, ponto ou molhos (página ${pageNum}).`;
  const spokenText =
    `${salutation} Que alegria receber você na bancada da FerveC! ` +
    `Eu sou o ${role.label}. Pode escrever ou falar comigo sempre que precisar de ajuda com a sua massa.`;
  return { headline, message, spokenText };
}

export function formatChatResumeStatus(messages) {
  const valid = sanitizeStoredChat(messages, 100);
  if (!valid.length) return '';
  return valid.length === 1
    ? 'Conversa salva · 1 mensagem'
    : `Conversa salva · ${valid.length} mensagens`;
}

