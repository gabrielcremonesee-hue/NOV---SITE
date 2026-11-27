import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

function normalizeEmail(email = '') {
  return String(email || '').trim().toLowerCase();
}

function isValidEmail(email = '') {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(normalizeEmail(email));
}

function hashPasswordScrypt(password, salt) {
  return crypto.scryptSync(String(password), String(salt), 64).toString('hex');
}

function verifyPasswordScrypt(password, salt, storedHash) {
  const candidate = Buffer.from(hashPasswordScrypt(password, salt), 'hex');
  const expected = Buffer.from(String(storedHash || ''), 'hex');
  if (candidate.length !== expected.length) return false;
  return crypto.timingSafeEqual(candidate, expected);
}

function sanitizeUserRecord(user) {
  if (!user) return null;
  return {
    id: String(user.id || ''),
    name: String(user.name || ''),
    email: normalizeEmail(user.email),
    role: user.role === 'admin' ? 'admin' : 'student',
    entitledCourses: Array.isArray(user.entitledCourses) ? user.entitledCourses : [],
    createdAt: user.createdAt || null,
  };
}

function sanitizeUserDataPayload(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return {};
  return { ...data };
}

export function createDatabase(filePath) {
  const resolvedPath = path.resolve(filePath);
  const dir = path.dirname(resolvedPath);

  function loadStore() {
    try {
      if (!fs.existsSync(resolvedPath)) {
        return { users: {}, sessions: {}, userData: {} };
      }
      const raw = fs.readFileSync(resolvedPath, 'utf8');
      const parsed = JSON.parse(raw || '{}');
      return {
        users: parsed.users && typeof parsed.users === 'object' ? parsed.users : {},
        sessions: parsed.sessions && typeof parsed.sessions === 'object' ? parsed.sessions : {},
        userData: parsed.userData && typeof parsed.userData === 'object' ? parsed.userData : {},
      };
    } catch {
      return { users: {}, sessions: {}, userData: {} };
    }
  }

  function saveStore(store) {
    fs.mkdirSync(dir, { recursive: true });
    const tmpPath = `${resolvedPath}.${process.pid}.${Date.now()}.tmp`;
    fs.writeFileSync(tmpPath, JSON.stringify(store, null, 2), 'utf8');
    fs.renameSync(tmpPath, resolvedPath);
  }

  function issueSession(store, email) {
    // Política de sessão única simultânea por conta: invalida sessões anteriores do mesmo e-mail
    for (const [existingToken, sess] of Object.entries(store.sessions)) {
      if (sess && normalizeEmail(sess.email) === normalizeEmail(email)) {
        delete store.sessions[existingToken];
      }
    }
    const token = crypto.randomBytes(32).toString('hex');
    store.sessions[token] = {
      email,
      createdAt: new Date().toISOString(),
    };
    return token;
  }

  function registerUser({ name = '', email = '', password = '', age = undefined, initialData = {} } = {}) {
    const cleanName = String(name || '').trim();
    const cleanEmail = normalizeEmail(email);
    const pwd = String(password || '');
    const numericAge = age !== undefined ? Number(age) : initialData?.age !== undefined ? Number(initialData.age) : null;

    if (cleanName.length < 2) {
      return { ok: false, status: 400, error: 'Informe seu nome completo (mínimo 2 caracteres).' };
    }
    if (!isValidEmail(cleanEmail)) {
      return { ok: false, status: 400, error: 'Informe um e-mail válido.' };
    }
    if (pwd.length < 6) {
      return { ok: false, status: 400, error: 'A senha deve ter pelo menos 6 caracteres.' };
    }
    if (numericAge !== null && (!Number.isFinite(numericAge) || numericAge < 18)) {
      return {
        ok: false,
        status: 403,
        error: 'Cadastro permitido exclusivamente para maiores de 18 anos.',
      };
    }

    const store = loadStore();
    if (store.users[cleanEmail]) {
      return {
        ok: false,
        status: 409,
        error: 'Este e-mail já está cadastrado. Use Entrar para acessar sua conta.',
      };
    }

    const salt = crypto.randomBytes(16).toString('hex');
    const passwordHash = hashPasswordScrypt(pwd, salt);
    const userRecord = {
      id: crypto.randomUUID(),
      name: cleanName,
      email: cleanEmail,
      role: 'student',
      entitledCourses: [],
      salt,
      passwordHash,
      createdAt: new Date().toISOString(),
    };

    store.users[cleanEmail] = userRecord;
    store.userData[cleanEmail] = sanitizeUserDataPayload(initialData);
    const token = issueSession(store, cleanEmail);
    saveStore(store);

    return {
      ok: true,
      user: sanitizeUserRecord(userRecord),
      token,
      data: store.userData[cleanEmail],
    };
  }

  function loginUser({ email = '', password = '' } = {}) {
    const cleanEmail = normalizeEmail(email);
    const pwd = String(password || '');

    if (!isValidEmail(cleanEmail)) {
      return { ok: false, status: 400, error: 'Informe um e-mail válido.' };
    }
    if (!pwd) {
      return { ok: false, status: 400, error: 'Informe sua senha.' };
    }

    const store = loadStore();
    const found = store.users[cleanEmail];
    if (!found) {
      return { ok: false, status: 401, error: 'Conta não encontrada. Crie seu cadastro primeiro.' };
    }
    if (!verifyPasswordScrypt(pwd, found.salt, found.passwordHash)) {
      return { ok: false, status: 401, error: 'Senha incorreta. Tente novamente.' };
    }

    const token = issueSession(store, cleanEmail);
    saveStore(store);

    return {
      ok: true,
      user: sanitizeUserRecord(found),
      token,
      data: sanitizeUserDataPayload(store.userData[cleanEmail]),
    };
  }

  function getSession(token = '') {
    const cleanToken = String(token || '').trim();
    if (!cleanToken) return { ok: false, status: 401, error: 'Sessão não informada.' };
    const store = loadStore();
    const session = store.sessions[cleanToken];
    if (!session) return { ok: false, status: 401, error: 'Sessão inválida ou expirada.' };
    const user = store.users[session.email];
    if (!user) return { ok: false, status: 401, error: 'Usuário não encontrado.' };

    return {
      ok: true,
      user: sanitizeUserRecord(user),
      data: sanitizeUserDataPayload(store.userData[session.email]),
    };
  }

  function logoutSession(token = '') {
    const cleanToken = String(token || '').trim();
    if (!cleanToken) return { ok: true };
    const store = loadStore();
    if (store.sessions[cleanToken]) {
      delete store.sessions[cleanToken];
      saveStore(store);
    }
    return { ok: true };
  }

  function updateUserData(token = '', nextData = {}) {
    const cleanToken = String(token || '').trim();
    if (!cleanToken) return { ok: false, status: 401, error: 'Sessão não informada.' };
    const store = loadStore();
    const session = store.sessions[cleanToken];
    if (!session || !store.users[session.email]) {
      return { ok: false, status: 401, error: 'Sessão inválida ou expirada.' };
    }
    const merged = {
      ...sanitizeUserDataPayload(store.userData[session.email]),
      ...sanitizeUserDataPayload(nextData),
      updatedAt: new Date().toISOString(),
    };
    store.userData[session.email] = merged;
    saveStore(store);
    return { ok: true, data: merged };
  }

  return {
    registerUser,
    loginUser,
    getSession,
    logoutSession,
    updateUserData,
  };
}
