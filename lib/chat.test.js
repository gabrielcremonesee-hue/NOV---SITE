import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CHAT_ROLES,
  getChatRole,
  buildChatSystemInstruction,
  sanitizeChatHistory,
  sanitizeStoredChat,
  buildChefWelcomeGreeting,
  formatChatResumeStatus,
} from './chat.js';

test('getChatRole returns matching role and falls back to default gemini-4-hydrogen role', () => {
  assert.equal(getChatRole('quick-kitchen').model, 'gemini-3.1-flash-lite');
  assert.equal(getChatRole('chef-tutor').model, 'gemini-4-hydrogen');
  assert.equal(getChatRole('unknown-role').id, CHAT_ROLES[0].id);
});

test('buildChatSystemInstruction injects role persona and optional page context', () => {
  const withCtx = buildChatSystemInstruction({
    roleId: 'technique-mentor',
    page: 16,
    pageTitle: 'Glúten: elasticidade e extensibilidade',
    pageText: 'Descanso reduz resistência elástica.',
    includePageContext: true,
  });
  assert.match(withCtx, /Página atual do leitor: 16/);
  assert.match(withCtx, /Descanso reduz resistência/);

  const noCtx = buildChatSystemInstruction({
    roleId: 'quick-kitchen',
    page: 16,
    pageText: 'Ignorar',
    includePageContext: false,
  });
  assert.doesNotMatch(noCtx, /Ignorar/);
});

test('sanitizeChatHistory trims, filters empty or error items, and enforces history limit', () => {
  const cleaned = sanitizeChatHistory([
    { role: 'user', content: '  Olá chef  ' },
    { role: 'assistant', content: '' },
    { role: 'assistant', content: 'Erro temporário', isError: true },
    { role: 'system', content: 'skip' },
    { role: 'assistant', content: 'Tudo bem!' },
  ], 2);
  assert.deepEqual(cleaned, [
    { role: 'user', content: 'Olá chef' },
    { role: 'assistant', content: 'Tudo bem!' },
  ]);
});

test('sanitizeStoredChat preserves metadata for resuming conversations and filters errors', () => {
  const stored = sanitizeStoredChat([
    { role: 'user', content: '  Como hidratar semolina? ', timestamp: '2026-11-20T12:00:00Z' },
    { role: 'assistant', content: 'Falha 503', isError: true },
    { role: 'assistant', content: 'Use cerca de 45% a 50% de água.', roleId: 'technique-mentor', roleLabel: 'Mentor de Técnica' },
  ], 10);
  assert.equal(stored.length, 2);
  assert.deepEqual(stored[0], {
    role: 'user',
    content: 'Como hidratar semolina?',
    timestamp: '2026-11-20T12:00:00Z',
  });
  assert.deepEqual(stored[1], {
    role: 'assistant',
    content: 'Use cerca de 45% a 50% de água.',
    roleId: 'technique-mentor',
    roleLabel: 'Mentor de Técnica',
  });
});

test('buildChefWelcomeGreeting creates personalized Chef persona welcome copy', () => {
  const named = buildChefWelcomeGreeting({ userName: 'Lucas Silva', roleId: 'chef-tutor', page: 9 });
  assert.match(named.headline, /Ciao, Lucas!/);
  assert.match(named.message, /Lucas/);
  assert.match(named.message, /página 9/);
  assert.match(named.spokenText, /FerveC/);

  const anon = buildChefWelcomeGreeting({ userName: '', roleId: 'quick-kitchen', page: 1 });
  assert.match(anon.headline, /Ciao, chef!/);
  assert.match(anon.message, /Bancada Rápida/);
});

test('formatChatResumeStatus formats empty, single, and multi-message saved counts', () => {
  assert.equal(formatChatResumeStatus([]), '');
  assert.equal(formatChatResumeStatus([{ role: 'user', content: 'Oi' }]), 'Conversa salva · 1 mensagem');
  assert.equal(
    formatChatResumeStatus([
      { role: 'user', content: 'Oi' },
      { role: 'assistant', content: 'Ciao!' },
      { role: 'assistant', content: 'erro', isError: true },
    ]),
    'Conversa salva · 2 mensagens'
  );
});

