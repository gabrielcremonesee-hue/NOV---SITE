const USERS_KEY = 'fervec-users-v1';
const SESSION_KEY = 'fervec-session-v1';
const USER_DATA_PREFIX = 'fervec-user-data-v1:';

const DEMO_ALLOWED_ACTIONS = new Set([
  'go',
  'open-book-module',
  'book-coming-soon',
  'open-account-modal',
  'close-modal',
  'toggle-menu',
  'close-menu',
  'logout',
  'demo-info',
  'switch-assistant-tab',
  'go-register',
  'go-login',
  'switch-login-tab',
  'return-portal',
  'go-site-register',
  'go-site-payments',
  'open-site-course-sales',
  'set-promo-slide',
  'password',
  'demo',
]);

export function normalizeEmail(email = '') {
  return String(email || '').trim().toLowerCase();
}

export function isValidEmail(email = '') {
  const norm = normalizeEmail(email);
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(norm);
}

export function validateRegistration({ name = '', email = '', password = '', confirmPassword = '' } = {}) {
  const cleanName = String(name || '').trim();
  const cleanEmail = normalizeEmail(email);
  const pwd = String(password || '');
  const confirm = String(confirmPassword || '');

  if (cleanName.length < 2) {
    return { ok: false, error: 'Informe seu nome completo (mínimo 2 caracteres).' };
  }
  if (!isValidEmail(cleanEmail)) {
    return { ok: false, error: 'Informe um e-mail válido.' };
  }
  if (pwd.length < 6) {
    return { ok: false, error: 'A senha deve ter pelo menos 6 caracteres.' };
  }
  if (pwd !== confirm) {
    return { ok: false, error: 'A confirmação de senha não confere.' };
  }
  return { ok: true, name: cleanName, email: cleanEmail, password: pwd };
}

export function validateLogin({ email = '', password = '' } = {}) {
  const cleanEmail = normalizeEmail(email);
  const pwd = String(password || '');
  if (!isValidEmail(cleanEmail)) {
    return { ok: false, error: 'Informe um e-mail válido.' };
  }
  if (!pwd) {
    return { ok: false, error: 'Informe sua senha.' };
  }
  return { ok: true, email: cleanEmail, password: pwd };
}

export function isActionAllowedInDemo(action = '') {
  return DEMO_ALLOWED_ACTIONS.has(String(action || '').trim());
}

export function getUserStorageKey(email = '') {
  const clean = normalizeEmail(email);
  return clean ? `${USER_DATA_PREFIX}${clean}` : 'fervec-demo-v1';
}

export async function hashPassword(password = '', salt = '') {
  const raw = `${salt}:${String(password || '')}`;
  if (globalThis.crypto?.subtle) {
    const bytes = new TextEncoder().encode(raw);
    const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  let h = 2166136261;
  for (let i = 0; i < raw.length; i++) {
    h ^= raw.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

function createSalt() {
  if (globalThis.crypto?.getRandomValues) {
    const arr = new Uint8Array(12);
    globalThis.crypto.getRandomValues(arr);
    return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
  }
  return Math.random().toString(36).slice(2, 14);
}

export function readUsers(storage) {
  try {
    const parsed = JSON.parse(storage.getItem(USERS_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function registerAccount(storage, input) {
  const check = validateRegistration(input);
  if (!check.ok) return check;

  const users = readUsers(storage);
  if (users.some((u) => normalizeEmail(u.email) === check.email)) {
    return { ok: false, error: 'Este e-mail já está cadastrado. Use Entrar para acessar sua conta.' };
  }

  const salt = createSalt();
  const passwordHash = await hashPassword(check.password, salt);
  const newUser = {
    id: globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `usr-${Date.now()}`,
    name: check.name,
    email: check.email,
    salt,
    passwordHash,
    createdAt: new Date().toISOString(),
  };

  users.push(newUser);
  storage.setItem(USERS_KEY, JSON.stringify(users));
  const publicUser = { id: newUser.id, name: newUser.name, email: newUser.email };
  storage.setItem(SESSION_KEY, JSON.stringify(publicUser));
  return { ok: true, user: publicUser };
}

export async function authenticateAccount(storage, input) {
  const check = validateLogin(input);
  if (!check.ok) return check;

  const users = readUsers(storage);
  const found = users.find((u) => normalizeEmail(u.email) === check.email);
  if (!found) {
    return { ok: false, error: 'Conta não encontrada. Crie seu cadastro primeiro.' };
  }

  const candidateHash = await hashPassword(check.password, found.salt || '');
  if (candidateHash !== found.passwordHash) {
    return { ok: false, error: 'Senha incorreta. Tente novamente.' };
  }

  const publicUser = { id: found.id, name: found.name, email: found.email };
  storage.setItem(SESSION_KEY, JSON.stringify(publicUser));
  return { ok: true, user: publicUser };
}

export function saveSession(storage, user, token = '') {
  if (!storage || !user?.email) return null;
  const sessionObj = {
    id: String(user.id || ''),
    name: String(user.name || user.email),
    email: normalizeEmail(user.email),
    token: String(token || ''),
  };
  storage.setItem(SESSION_KEY, JSON.stringify(sessionObj));
  return sessionObj;
}

export function readSavedSession(storage) {
  try {
    const raw = JSON.parse(storage.getItem(SESSION_KEY) || 'null');
    if (raw && typeof raw.email === 'string' && raw.email.trim()) {
      return {
        id: raw.id || '',
        name: raw.name || raw.email,
        email: normalizeEmail(raw.email),
        token: typeof raw.token === 'string' ? raw.token : '',
      };
    }
    return null;
  } catch {
    return null;
  }
}

export function clearSavedSession(storage) {
  try {
    storage.removeItem(SESSION_KEY);
  } catch {}
}
