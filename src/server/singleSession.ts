import crypto from 'crypto';

export const DEFAULT_SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const SIGNED_TOKEN_PREFIX = 'fv1';

export interface ActiveSessionRecord {
  userId: string;
  sessionId: string;
  signedToken: string;
  createdAt: string;
  claimedAt: string;
  lastSeenAt: string;
  expiresAt: string;
  deviceLabel?: string;
}

export class SingleActiveSessionManager {
  private readonly sessions = new Map<string, ActiveSessionRecord>();
  private readonly ephemeralSecret = crypto.randomBytes(32).toString('hex');

  private getSigningSecret(): string {
    const envSecret =
      typeof process !== 'undefined' && typeof process.env?.FERVEC_SESSION_SECRET === 'string'
        ? process.env.FERVEC_SESSION_SECRET.trim()
        : '';
    return envSecret || this.ephemeralSecret;
  }

  public normalizeUserKey(userId: string): string {
    return String(userId || '').trim().toLowerCase();
  }

  public createSessionId(): string {
    return crypto.randomUUID();
  }

  public createSignedToken(
    userId: string,
    sessionId: string,
    expiresAtMs: number = Date.now() + DEFAULT_SESSION_TTL_MS
  ): string {
    const cleanUid = this.normalizeUserKey(userId);
    const cleanSid = String(sessionId || '').trim();
    const payload = `${cleanUid}|${cleanSid}|${expiresAtMs}`;
    const sig = crypto
      .createHmac('sha256', this.getSigningSecret())
      .update(payload)
      .digest('base64url');
    return `${SIGNED_TOKEN_PREFIX}.${cleanSid}.${expiresAtMs}.${sig}`;
  }

  public verifySignedToken(
    userId: string,
    token: string,
    nowMs: number = Date.now()
  ): { ok: true; sessionId: string; expiresAtMs: number } | { ok: false; code: 'INVALID_SIGNATURE' | 'SESSION_EXPIRED' } {
    const parts = String(token || '').trim().split('.');
    if (parts.length !== 4 || parts[0] !== SIGNED_TOKEN_PREFIX) {
      return { ok: false, code: 'INVALID_SIGNATURE' };
    }
    const [, sid, expRaw, providedSig] = parts;
    const expiresAtMs = Number(expRaw);
    if (!sid || sid.length < 8 || !Number.isFinite(expiresAtMs) || !providedSig) {
      return { ok: false, code: 'INVALID_SIGNATURE' };
    }
    const cleanUid = this.normalizeUserKey(userId);
    const expectedSig = crypto
      .createHmac('sha256', this.getSigningSecret())
      .update(`${cleanUid}|${sid}|${expiresAtMs}`)
      .digest('base64url');

    const a = Buffer.from(providedSig, 'utf8');
    const b = Buffer.from(expectedSig, 'utf8');
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return { ok: false, code: 'INVALID_SIGNATURE' };
    }
    if (expiresAtMs <= nowMs) {
      return { ok: false, code: 'SESSION_EXPIRED' };
    }
    return { ok: true, sessionId: sid, expiresAtMs };
  }

  public extractRawSessionId(userId: string, presented?: string | null): {
    ok: boolean;
    sessionId: string;
    signed: boolean;
    errorCode?: 'SESSION_REQUIRED' | 'INVALID_SIGNATURE' | 'SESSION_EXPIRED';
  } {
    const clean = String(presented || '').trim();
    if (!clean) {
      return { ok: false, sessionId: '', signed: false, errorCode: 'SESSION_REQUIRED' };
    }
    if (clean.startsWith(`${SIGNED_TOKEN_PREFIX}.`)) {
      const verified = this.verifySignedToken(userId, clean);
      if (!verified.ok) {
        return { ok: false, sessionId: '', signed: true, errorCode: verified.code };
      }
      return { ok: true, sessionId: verified.sessionId, signed: true };
    }
    if (clean.length < 8) {
      return { ok: false, sessionId: '', signed: false, errorCode: 'SESSION_REQUIRED' };
    }
    return { ok: true, sessionId: clean, signed: false };
  }

  public activateSession(
    userId: string,
    providedSessionId?: string,
    deviceLabel = '',
    ttlMs: number = DEFAULT_SESSION_TTL_MS
  ): ActiveSessionRecord {
    const key = this.normalizeUserKey(userId);
    const nowMs = Date.now();
    const now = new Date(nowMs).toISOString();
    const expiresAtMs = nowMs + Math.max(1000, ttlMs);
    const rawProvided = String(providedSessionId || '').trim();
    const extracted = rawProvided.startsWith(`${SIGNED_TOKEN_PREFIX}.`)
      ? rawProvided.split('.')[1] || ''
      : rawProvided;
    const sessionId = extracted.length >= 8 ? extracted : this.createSessionId();
    const signedToken = this.createSignedToken(key, sessionId, expiresAtMs);
    const record: ActiveSessionRecord = {
      userId: key,
      sessionId,
      signedToken,
      createdAt: now,
      claimedAt: now,
      lastSeenAt: now,
      expiresAt: new Date(expiresAtMs).toISOString(),
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
    ttlMs: number = DEFAULT_SESSION_TTL_MS
  ): ActiveSessionRecord {
    return this.activateSession(userId, providedSessionId, deviceLabel, ttlMs);
  }

  public verifyOrBindSession(
    userId: string,
    presentedSessionId?: string | null,
    nowMs: number = Date.now()
  ):
    | { ok: true; sessionId: string }
    | { ok: false; code: 'SESSION_REQUIRED' | 'SESSION_SUPERSEDED' | 'SESSION_EXPIRED' | 'INVALID_SIGNATURE'; message: string } {
    const key = this.normalizeUserKey(userId);
    if (!key) {
      return {
        ok: false,
        code: 'SESSION_REQUIRED',
        message: 'Identidade de usuário ausente.',
      };
    }

    const parsed = this.extractRawSessionId(key, presentedSessionId);
    if (!parsed.ok) {
      if (parsed.errorCode === 'SESSION_EXPIRED') {
        return {
          ok: false,
          code: 'SESSION_EXPIRED',
          message: 'Sua sessão expirou por segurança. Faça login novamente para continuar.',
        };
      }
      if (parsed.errorCode === 'INVALID_SIGNATURE') {
        return {
          ok: false,
          code: 'INVALID_SIGNATURE',
          message: 'Assinatura do token de sessão inválida. Faça login novamente.',
        };
      }
      return {
        ok: false,
        code: 'SESSION_REQUIRED',
        message: 'Identificador de sessão ativa obrigatório.',
      };
    }

    const existing = this.sessions.get(key);
    if (existing && Date.parse(existing.expiresAt) <= nowMs) {
      this.sessions.delete(key);
      return {
        ok: false,
        code: 'SESSION_EXPIRED',
        message: 'Sua sessão expirou por segurança. Faça login novamente para continuar.',
      };
    }

    if (!existing) {
      const bound = this.activateSession(key, parsed.sessionId);
      return { ok: true, sessionId: bound.sessionId };
    }

    if (existing.sessionId !== parsed.sessionId) {
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

  public verifySession(userId: string, presentedSessionId?: string | null) {
    return this.verifyOrBindSession(userId, presentedSessionId);
  }

  public revokeSession(userId: string, sessionId?: string | null): void {
    const key = this.normalizeUserKey(userId);
    if (!key) return;
    if (!sessionId) {
      this.sessions.delete(key);
      return;
    }
    const parsed = this.extractRawSessionId(key, sessionId);
    const cleanTarget = parsed.ok ? parsed.sessionId : String(sessionId).trim();
    const existing = this.sessions.get(key);
    if (existing && existing.sessionId === cleanTarget) {
      this.sessions.delete(key);
    }
  }

  public clearSession(userId: string, sessionId?: string | null): void {
    this.revokeSession(userId, sessionId);
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

