import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateRegistration,
  validateLogin,
  registerAccount,
  authenticateAccount,
  saveSession,
  readSavedSession,
  clearSavedSession,
  isActionAllowedInDemo,
  getUserStorageKey,
} from './auth.js';

function createMemoryStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
  };
}

test('validateRegistration validates name, email, password length, and confirmation', () => {
  assert.equal(validateRegistration({ name: 'A', email: 'a@b.com', password: '123456', confirmPassword: '123456' }).ok, false);
  assert.equal(validateRegistration({ name: 'Maria', email: 'invalid', password: '123456', confirmPassword: '123456' }).ok, false);
  assert.equal(validateRegistration({ name: 'Maria', email: 'm@fervec.com', password: '123', confirmPassword: '123' }).ok, false);
  assert.equal(validateRegistration({ name: 'Maria', email: 'm@fervec.com', password: '123456', confirmPassword: 'abcdef' }).ok, false);

  const valid = validateRegistration({
    name: '  Maria Silva ',
    email: 'Maria@FerveC.com ',
    password: 'pasta123',
    confirmPassword: 'pasta123',
  });
  assert.equal(valid.ok, true);
  assert.equal(valid.name, 'Maria Silva');
  assert.equal(valid.email, 'maria@fervec.com');
});

test('registerAccount and authenticateAccount persist hashed credentials and session', async () => {
  const storage = createMemoryStorage();
  const reg = await registerAccount(storage, {
    name: 'Lucas Chef',
    email: 'lucas@fervec.com',
    password: 'segredo123',
    confirmPassword: 'segredo123',
  });
  assert.equal(reg.ok, true);
  assert.equal(reg.user.email, 'lucas@fervec.com');

  // Duplicate email fails cleanly
  const dup = await registerAccount(storage, {
    name: 'Lucas 2',
    email: 'LUCAS@fervec.com',
    password: 'segredo123',
    confirmPassword: 'segredo123',
  });
  assert.equal(dup.ok, false);

  // Wrong password fails cleanly
  const badPwd = await authenticateAccount(storage, {
    email: 'lucas@fervec.com',
    password: 'wrong',
  });
  assert.equal(badPwd.ok, false);

  // Correct password restores session
  clearSavedSession(storage);
  assert.equal(readSavedSession(storage), null);

  const login = await authenticateAccount(storage, {
    email: 'lucas@fervec.com',
    password: 'segredo123',
  });
  assert.equal(login.ok, true);
  assert.equal(login.user.name, 'Lucas Chef');
  assert.equal(readSavedSession(storage)?.email, 'lucas@fervec.com');
  assert.equal(validateLogin({ email: 'lucas@fervec.com', password: 'segredo123' }).ok, true);
});

test('isActionAllowedInDemo allows viewing tabs but locks all interactive features', () => {
  assert.equal(isActionAllowedInDemo('go'), true);
  assert.equal(isActionAllowedInDemo('toggle-menu'), true);
  assert.equal(isActionAllowedInDemo('switch-assistant-tab'), true);
  assert.equal(isActionAllowedInDemo('go-register'), true);

  assert.equal(isActionAllowedInDemo('next'), false);
  assert.equal(isActionAllowedInDemo('prev'), false);
  assert.equal(isActionAllowedInDemo('open-page'), false);
  assert.equal(isActionAllowedInDemo('bookmark'), false);
  assert.equal(isActionAllowedInDemo('new-recipe'), false);
  assert.equal(isActionAllowedInDemo('new-note'), false);
  assert.equal(isActionAllowedInDemo('study'), false);
  assert.equal(isActionAllowedInDemo('use-quick-prompt'), false);
  assert.equal(isActionAllowedInDemo('toggle-voice-session'), false);
  assert.equal(isActionAllowedInDemo('toggle-speech-input'), false);
});

test('getUserStorageKey isolates user storage from demo storage', () => {
  assert.equal(getUserStorageKey('Chef@FerveC.com'), 'fervec-user-data-v1:chef@fervec.com');
  assert.equal(getUserStorageKey(''), 'fervec-demo-v1');
});

test('saveSession persists normalized user and bearer token', () => {
  const storage = createMemoryStorage();
  const saved = saveSession(storage, { id: 'u1', name: 'Ana Chef', email: 'Ana@FerveC.com ' }, 'tok-123');
  assert.equal(saved.email, 'ana@fervec.com');
  assert.equal(saved.token, 'tok-123');
  const restored = readSavedSession(storage);
  assert.equal(restored?.email, 'ana@fervec.com');
  assert.equal(restored?.token, 'tok-123');
});
