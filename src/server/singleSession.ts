import crypto from 'crypto';

const DEFAULT_SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 horas
const PROCESS_EPHEMERAL_SECRET = crypto.randomBytes(32).toString('hex');

export interface ActiveSessionRecord {
  userId: string;
  sessionId: string;
  sessionToken: string;
  createdAt: string;
  claimedAt: string;
  lastSeenAt: string;
  expiresAt: string;
  expiresAtMs: number;
  deviceLabel?: string;
}

export type SessionVerificationResult =
  | { ok: true; sessionId: string; sessionToken: string; expiresAtMs: number }
  | {
      ok: false;
      code: 'SESSION_REQUIRED' | 'SESSION_INVALID' | 'SESSION_EXPIRED' | 'SESSION_SUPERSEDED';
      message: string;
    };

function resolveSessionSigningSecret(): string {
  const env = typeof process !== 'undefined' ? process.env : {};
  return (
    String(
      env.FERVEC_SESSION_SECRET ||
        env.SUPABASE_SERVICE_ROLE_KEY ||
        env.ASAAS_WEBHOOK_TOKEN ||
        ''
    ).trim() || PROCESS_EPHEMERAL_SECRET
  );
}

export function extractRawSessionId(presentedValue?: string | null): string {
  const clean = String(presentedValue || '').trim();
  if (!clean) return '';
  if (clean.startsWith('v1.')) {
    const parts = clean.split('.');
    if (parts.length === 4 && parts[1]) return parts[1].trim();
  }
  return clean;
}

class SingleActiveSessionManager {
  private readonly sessions = new Map<string, ActiveSessionRecord>();

  public normalizeUserKey(userId: string): string {
    return String(userId || '').trim().toLowerCase();
  }

  public createSessionId(): string {
    return crypto.randomUUID();
  }

  public signSessionToken(userId: string, sessionId: string, expiresAtMs: number): string {
    const key = this.normalizeUserKey(userId);
    const payload = `${key}:${sessionId}:${expiresAtMs}`;
    const sig = crypto
      .createHmac('sha256', resolveSessionSigningSecret())
      .update(payload)
      .digest('hex');
    return `v1.${sessionId}.${expiresAtMs}.${sig}`;
  }

  public verifySignedToken(
    userId: string,
    presentedToken?: string | null,
    nowMs = Date.now()
  ): { ok: true; sessionId: string; expiresAtMs: number } | { ok: false; code: 'SESSION_REQUIRED' | 'SESSION_INVALID' | 'SESSION_EXPIRED'; message: string } {
    const key = this.normalizeUserKey(userId);
    const raw = String(presentedToken || '').trim();
    if (!key || !raw) {
      return {
        ok: false,
        code: 'SESSION_REQUIRED',
        message: 'Identificador de sessão ativa obrigatório.',
      };
    }

    const parts = raw.split('.');
    if (parts.length !== 4 || parts[0] !== 'v1') {
      return {
        ok: false,
        code: 'SESSION_INVALID',
        message: 'Token de sessão inválido ou não emitido pelo servidor.',
      };
    }

    const [, sessionId, expStr, providedHex] = parts;
    const expiresAtMs = Number(expStr);
    if (!sessionId || sessionId.length < 8 || !Number.isFinite(expiresAtMs) || !/^[a-f0-9]{64}$/i.test(providedHex)) {
      return {
        ok: false,
        code: 'SESSION_INVALID',
        message: 'Token de sessão malformado.',
      };
    }

    const expectedHex = crypto
      .createHmac('sha256', resolveSessionSigningSecret())
      .update(`${key}:${sessionId}:${expiresAtMs}`)
      .digest('hex');

    const a = Buffer.from(providedHex.toLowerCase(), 'utf8');
    const b = Buffer.from(expectedHex.toLowerCase(), 'utf8');
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return {
        ok: false,
        code: 'SESSION_INVALID',
        message: 'Assinatura de sessão inválida ou pertencente a outro usuário.',
      };
    }

    if (nowMs > expiresAtMs) {
      return {
        ok: false,
        code: 'SESSION_EXPIRED',
        message: 'Sua sessão expirou. Faça login novamente para continuar.',
      };
    }

    return { ok: true, sessionId, expiresAtMs };
  }

  public issueServerSession(
    userId: string,
    deviceLabel = '',
    ttlMs = DEFAULT_SESSION_TTL_MS,
    nowMs = Date.now()
  ): ActiveSessionRecord {
    const key = this.normalizeUserKey(userId);
    const nowIso = new Date(nowMs).toISOString();
    const effectiveTtl = Math.max(1_000, Number(ttlMs) || DEFAULT_SESSION_TTL_MS);
    const expiresAtMs = nowMs + effectiveTtl;
    const expiresAt = new Date(expiresAtMs).toISOString();
    const sessionId = this.createSessionId();
    const sessionToken = this.signSessionToken(key, sessionId, expiresAtMs);
    const record: ActiveSessionRecord = {
      userId: key,
      sessionId,
      sessionToken,
      createdAt: nowIso,
      claimedAt: nowIso,
      lastSeenAt: nowIso,
      expiresAt,
      expiresAtMs,
      ...(deviceLabel ? { deviceLabel } : {}),
    };
    this.sessions.set(key, record);
    return record;
  }

  public activateSession(
    userId: string,
    providedSessionId?: string,
    deviceLabel = '',
    ttlMs = DEFAULT_SESSION_TTL_MS,
    nowMs = Date.now()
  ): ActiveSessionRecord {
    const key = this.normalizeUserKey(userId);
    const nowIso = new Date(nowMs).toISOString();
    const effectiveTtl = Math.max(1_000, Number(ttlMs) || DEFAULT_SESSION_TTL_MS);
    const expiresAtMs = nowMs + effectiveTtl;
    const expiresAt = new Date(expiresAtMs).toISOString();
    const cleanProvided = extractRawSessionId(providedSessionId);
    const sessionId = cleanProvided.length >= 8 ? cleanProvided : this.createSessionId();
    const sessionToken = this.signSessionToken(key, sessionId, expiresAtMs);
    const record: ActiveSessionRecord = {
      userId: key,
      sessionId,
      sessionToken,
      createdAt: nowIso,
      claimedAt: nowIso,
      lastSeenAt: nowIso,
      expiresAt,
      expiresAtMs,
      ...(deviceLabel ? { deviceLabel } : {}),
    };
    // Atomic replacement: previous device sessionId is invalidated immediately.
    this.sessions.set(key, record);
    return record;
  }

  public claimSession(
    userId: string,
    providedSessionId?: string,
    deviceLabel = '',
    ttlMs = DEFAULT_SESSION_TTL_MS,
    nowMs = Date.now()
  ): ActiveSessionRecord {
    return this.activateSession(userId, providedSessionId, deviceLabel, ttlMs, nowMs);
  }

  /**
   * Strict check for server-issued signed tokens + active session table + TTL.
   * Never auto-binds an unclaimed or client-invented session ID.
   */
  public verifyClaimedSession(
    userId: string,
    presentedToken?: string | null,
    nowMs = Date.now()
  ): SessionVerificationResult {
    const key = this.normalizeUserKey(userId);
    if (!key) {
      return {
        ok: false,
        code: 'SESSION_REQUIRED',
        message: 'Identidade de usuário ausente.',
      };
    }

    const tokenCheck = this.verifySignedToken(key, presentedToken, nowMs);
    if (!tokenCheck.ok) {
      return tokenCheck;
    }

    const existing = this.sessions.get(key);
    if (!existing) {
      return {
        ok: false,
        code: 'SESSION_REQUIRED',
        message: 'Sessão não registrada ou encerrada no servidor. Faça login novamente.',
      };
    }

    if (nowMs > existing.expiresAtMs) {
      this.sessions.delete(key);
      return {
        ok: false,
        code: 'SESSION_EXPIRED',
        message: 'Sua sessão expirou. Faça login novamente para continuar.',
      };
    }

    if (existing.sessionId !== tokenCheck.sessionId) {
      return {
        ok: false,
        code: 'SESSION_SUPERSEDED',
        message:
          'Sua conta entrou em outro dispositivo ou navegador. Apenas 1 sessão simultânea é permitida; faça login novamente aqui para continuar.',
      };
    }

    existing.lastSeenAt = new Date(nowMs).toISOString();
    return {
      ok: true,
      sessionId: existing.sessionId,
      sessionToken: existing.sessionToken,
      expiresAtMs: existing.expiresAtMs,
    };
  }

  public verifyOrBindSession(
    userId: string,
    presentedSessionId?: string | null,
    nowMs = Date.now()
  ): { ok: true; sessionId: string } | { ok: false; code: 'SESSION_REQUIRED' | 'SESSION_EXPIRED' | 'SESSION_SUPERSEDED'; message: string } {
    const key = this.normalizeUserKey(userId);
    if (!key) {
      return {
        ok: false,
        code: 'SESSION_REQUIRED',
        message: 'Identidade de usuário ausente.',
      };
    }

    const cleanPresented = extractRawSessionId(presentedSessionId);
    const existing = this.sessions.get(key);

    if (!existing) {
      return {
        ok: false,
        code: 'SESSION_REQUIRED',
        message: 'Nenhuma sessão ativa reivindicada para esta conta.',
      };
    }

    if (nowMs > existing.expiresAtMs) {
      this.sessions.delete(key);
      return {
        ok: false,
        code: 'SESSION_EXPIRED',
        message: 'Sua sessão expirou. Faça login novamente para continuar.',
      };
    }

    if (!cleanPresented || existing.sessionId !== cleanPresented) {
      return {
        ok: false,
        code: 'SESSION_SUPERSEDED',
        message:
          'Sua conta entrou em outro dispositivo ou navegador. Apenas 1 sessão simultânea é permitida; faça login novamente aqui para continuar.',
      };
    }

    existing.lastSeenAt = new Date(nowMs).toISOString();
    return { ok: true, sessionId: existing.sessionId };
  }

  public verifySession(userId: string, presentedSessionId?: string | null, nowMs = Date.now()) {
    return this.verifyOrBindSession(userId, presentedSessionId, nowMs);
  }

  public revokeSession(userId: string, sessionIdOrToken?: string | null): boolean {
    const key = this.normalizeUserKey(userId);
    if (!key) return false;
    const targetSessionId = extractRawSessionId(sessionIdOrToken);
    if (!targetSessionId || targetSessionId.length < 8) {
      // Logout without exact matching session token MUST NEVER terminate another active device's session.
      return false;
    }
    const existing = this.sessions.get(key);
    if (existing && existing.sessionId === targetSessionId) {
      this.sessions.delete(key);
      return true;
    }
    return false;
  }

  public clearSession(userId: string, sessionIdOrToken?: string | null): boolean {
    return this.revokeSession(userId, sessionIdOrToken);
  }

  public getActiveSession(userId: string): ActiveSessionRecord | null {
    return this.sessions.get(this.normalizeUserKey(userId)) || null;
  }

  public getActiveCount(): number {
    return this.sessions.size;
  }

  public resetForTests(): void {
    this.sessions.clear();
  }
}

export const singleSessionManager = new SingleActiveSessionManager();
