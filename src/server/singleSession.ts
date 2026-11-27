import crypto from 'crypto';

export const DEFAULT_SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const MIN_SESSION_TTL_MS = 1000;
const MAX_SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const EPHEMERAL_FALLBACK_SECRET = crypto.randomBytes(32).toString('hex');

export interface ActiveSessionRecord {
  userId: string;
  sessionId: string;
  createdAt: string;
  claimedAt: string;
  lastSeenAt: string;
  expiresAt: string;
  expiresAtMs: number;
  deviceLabel?: string;
}

export type SessionVerificationErrorCode =
  | 'SESSION_REQUIRED'
  | 'SESSION_INVALID'
  | 'SESSION_EXPIRED'
  | 'SESSION_SUPERSEDED';

export type SessionVerificationResult =
  | {
      ok: true;
      sessionId: string;
      expiresAt: string;
      expiresAtMs: number;
    }
  | {
      ok: false;
      code: SessionVerificationErrorCode;
      message: string;
    };

export interface ClaimSessionOptions {
  ttlMs?: number;
  nowMs?: number;
  preserveExistingIfValid?: boolean;
  existingDbSession?: {
    sessionId: string;
    expiresAt?: string | null;
    deviceLabel?: string | null;
  } | null;
}

export interface VerifySessionOptions {
  nowMs?: number;
  activeRecordFromDb?: {
    sessionId: string;
    expiresAt?: string | null;
    deviceLabel?: string | null;
  } | null;
}

function resolveSessionSecret(): string {
  const candidates = [
    typeof process !== 'undefined' ? process.env.FERVEC_SESSION_SECRET : undefined,
    typeof process !== 'undefined' ? process.env.SUPABASE_SERVICE_ROLE_KEY : undefined,
    typeof process !== 'undefined' ? process.env.ASAAS_WEBHOOK_TOKEN : undefined,
  ];
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim().length >= 16) {
      return candidate.trim();
    }
  }
  return EPHEMERAL_FALLBACK_SECRET;
}

function resolveDefaultTtlMs(): number {
  const raw =
    typeof process !== 'undefined' ? Number(process.env.FERVEC_SESSION_TTL_SECONDS || '') : NaN;
  if (Number.isFinite(raw) && raw >= 1) {
    return Math.min(MAX_SESSION_TTL_MS, Math.max(MIN_SESSION_TTL_MS, Math.round(raw * 1000)));
  }
  return DEFAULT_SESSION_TTL_MS;
}

function computeTokenHmac(
  normalizedUserId: string,
  rawSid: string,
  expiresAtMs: number
): string {
  return crypto
    .createHmac('sha256', resolveSessionSecret())
    .update(`fv1|${normalizedUserId}|${rawSid}|${expiresAtMs}`)
    .digest('hex');
}

function constantTimeHexEqual(aHex: string, bHex: string): boolean {
  if (aHex.length !== bHex.length) return false;
  const aBuf = Buffer.from(aHex, 'utf8');
  const bBuf = Buffer.from(bHex, 'utf8');
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

class SingleActiveSessionManager {
  private readonly sessions = new Map<string, ActiveSessionRecord>();

  public normalizeUserKey(userId: string): string {
    return String(userId || '').trim().toLowerCase();
  }

  public createSignedSessionToken(
    userId: string,
    options?: { ttlMs?: number; nowMs?: number }
  ): { token: string; expiresAtMs: number; expiresAt: string } {
    const key = this.normalizeUserKey(userId);
    if (!key) {
      throw new Error('Identidade de usuário obrigatória para emitir sessão.');
    }
    const nowMs =
      typeof options?.nowMs === 'number' && Number.isFinite(options.nowMs)
        ? options.nowMs
        : Date.now();
    const rawTtl = options?.ttlMs ?? resolveDefaultTtlMs();
    const ttlMs = Math.min(MAX_SESSION_TTL_MS, Math.max(MIN_SESSION_TTL_MS, Math.round(rawTtl)));
    const expiresAtMs = nowMs + ttlMs;
    const rawSid = crypto.randomUUID().replace(/-/g, '');
    const sig = computeTokenHmac(key, rawSid, expiresAtMs);
    return {
      token: `fv1.${rawSid}.${expiresAtMs}.${sig}`,
      expiresAtMs,
      expiresAt: new Date(expiresAtMs).toISOString(),
    };
  }

  public verifySignedTokenForUser(
    userId: string,
    token: string | null | undefined,
    nowMs = Date.now()
  ):
    | { valid: true; expiresAtMs: number; expiresAt: string }
    | { valid: false; reason: 'SESSION_REQUIRED' | 'SESSION_INVALID' | 'SESSION_EXPIRED' } {
    const key = this.normalizeUserKey(userId);
    if (!key) return { valid: false, reason: 'SESSION_REQUIRED' };
    const clean = String(token || '').trim();
    if (!clean) return { valid: false, reason: 'SESSION_REQUIRED' };

    const parts = clean.split('.');
    if (parts.length !== 4 || parts[0] !== 'fv1') {
      return { valid: false, reason: 'SESSION_INVALID' };
    }
    const [, rawSid, expStr, providedSig] = parts;
    if (!/^[a-f0-9-]{16,64}$/i.test(rawSid) || !/^[a-f0-9]{64}$/i.test(providedSig)) {
      return { valid: false, reason: 'SESSION_INVALID' };
    }
    const expiresAtMs = Number(expStr);
    if (!Number.isSafeInteger(expiresAtMs) || expiresAtMs <= 0) {
      return { valid: false, reason: 'SESSION_INVALID' };
    }

    const expectedSig = computeTokenHmac(key, rawSid, expiresAtMs);
    if (!constantTimeHexEqual(providedSig.toLowerCase(), expectedSig.toLowerCase())) {
      return { valid: false, reason: 'SESSION_INVALID' };
    }

    if (nowMs >= expiresAtMs) {
      return { valid: false, reason: 'SESSION_EXPIRED' };
    }

    return {
      valid: true,
      expiresAtMs,
      expiresAt: new Date(expiresAtMs).toISOString(),
    };
  }

  public hydrateSessionFromPersistence(
    userId: string,
    sessionToken: string,
    deviceLabel = '',
    nowMs = Date.now()
  ): ActiveSessionRecord | null {
    const key = this.normalizeUserKey(userId);
    if (!key) return null;
    const check = this.verifySignedTokenForUser(key, sessionToken, nowMs);
    if (!check.valid) {
      return null;
    }
    const nowIso = new Date(nowMs).toISOString();
    const record: ActiveSessionRecord = {
      userId: key,
      sessionId: sessionToken.trim(),
      createdAt: nowIso,
      claimedAt: nowIso,
      lastSeenAt: nowIso,
      expiresAt: check.expiresAt,
      expiresAtMs: check.expiresAtMs,
      ...(deviceLabel ? { deviceLabel } : {}),
    };
    this.sessions.set(key, record);
    return record;
  }

  public activateSession(
    userId: string,
    preferredToken?: string,
    deviceLabel = '',
    options?: ClaimSessionOptions
  ): ActiveSessionRecord & { preserved?: boolean } {
    const key = this.normalizeUserKey(userId);
    if (!key) {
      throw new Error('Identidade de usuário ausente ao reivindicar sessão.');
    }
    const nowMs =
      typeof options?.nowMs === 'number' && Number.isFinite(options.nowMs)
        ? options.nowMs
        : Date.now();
    const nowIso = new Date(nowMs).toISOString();

    const cleanPreferred = String(preferredToken || '').trim();
    if (options?.preserveExistingIfValid && cleanPreferred) {
      let current = this.sessions.get(key) || null;
      if (!current && options.existingDbSession?.sessionId) {
        current = this.hydrateSessionFromPersistence(
          key,
          options.existingDbSession.sessionId,
          options.existingDbSession.deviceLabel || deviceLabel,
          nowMs
        );
      }
      const tokenCheck = this.verifySignedTokenForUser(key, cleanPreferred, nowMs);
      if (
        tokenCheck.valid &&
        current &&
        current.sessionId === cleanPreferred &&
        current.expiresAtMs > nowMs
      ) {
        current.lastSeenAt = nowIso;
        if (deviceLabel && !current.deviceLabel) {
          current.deviceLabel = deviceLabel;
        }
        return { ...current, preserved: true };
      }
    }

    // Sempre emite token criptograficamente assinado e vinculado ao usuário no servidor;
    // nunca aceita identificadores inventados pelo cliente como novo token de sessão.
    const issued = this.createSignedSessionToken(key, { ttlMs: options?.ttlMs, nowMs });
    const record: ActiveSessionRecord = {
      userId: key,
      sessionId: issued.token,
      createdAt: nowIso,
      claimedAt: nowIso,
      lastSeenAt: nowIso,
      expiresAt: issued.expiresAt,
      expiresAtMs: issued.expiresAtMs,
      ...(deviceLabel ? { deviceLabel } : {}),
    };
    // Substituição atômica: qualquer sessão anterior deste usuário perde validade imediatamente.
    this.sessions.set(key, record);
    return { ...record, preserved: false };
  }

  public claimSession(
    userId: string,
    preferredToken?: string,
    deviceLabel = '',
    options?: ClaimSessionOptions
  ): ActiveSessionRecord & { preserved?: boolean } {
    return this.activateSession(userId, preferredToken, deviceLabel, options);
  }

  public verifySession(
    userId: string,
    presentedSessionId?: string | null,
    options?: VerifySessionOptions
  ): SessionVerificationResult {
    const key = this.normalizeUserKey(userId);
    if (!key) {
      return {
        ok: false,
        code: 'SESSION_REQUIRED',
        message: 'Identidade de usuário ausente.',
      };
    }

    const nowMs =
      typeof options?.nowMs === 'number' && Number.isFinite(options.nowMs)
        ? options.nowMs
        : Date.now();
    const cleanPresented = String(presentedSessionId || '').trim();
    if (!cleanPresented) {
      return {
        ok: false,
        code: 'SESSION_REQUIRED',
        message: 'Identificador de sessão ativa obrigatório.',
      };
    }

    const tokenCheck = this.verifySignedTokenForUser(key, cleanPresented, nowMs);
    if (!tokenCheck.valid) {
      if (tokenCheck.reason === 'SESSION_EXPIRED') {
        const memExisting = this.sessions.get(key);
        if (memExisting && memExisting.sessionId === cleanPresented) {
          this.sessions.delete(key);
        }
        return {
          ok: false,
          code: 'SESSION_EXPIRED',
          message: 'Sua sessão expirou. Faça login novamente para continuar.',
        };
      }
      return {
        ok: false,
        code: 'SESSION_INVALID',
        message: 'Identificador de sessão inválido ou não pertence a este usuário.',
      };
    }

    const hasDbSnapshot = options && 'activeRecordFromDb' in options;
    if (hasDbSnapshot) {
      const dbRow = options?.activeRecordFromDb;
      if (!dbRow || !dbRow.sessionId) {
        const mem = this.sessions.get(key);
        if (!mem) {
          return {
            ok: false,
            code: 'SESSION_REQUIRED',
            message: 'Nenhuma sessão ativa encontrada para esta conta. Faça login novamente.',
          };
        }
        if (mem.expiresAtMs <= nowMs) {
          this.sessions.delete(key);
          return {
            ok: false,
            code: 'SESSION_EXPIRED',
            message: 'Sua sessão expirou. Faça login novamente para continuar.',
          };
        }
        if (mem.sessionId !== cleanPresented) {
          return {
            ok: false,
            code: 'SESSION_SUPERSEDED',
            message:
              'Sua conta entrou em outro dispositivo ou navegador. Apenas 1 sessão simultânea é permitida; faça login novamente aqui para continuar.',
          };
        }
        mem.lastSeenAt = new Date(nowMs).toISOString();
        return {
          ok: true,
          sessionId: mem.sessionId,
          expiresAt: mem.expiresAt,
          expiresAtMs: mem.expiresAtMs,
        };
      }

      if (dbRow.expiresAt) {
        const dbExpMs = Date.parse(dbRow.expiresAt);
        if (Number.isFinite(dbExpMs) && nowMs >= dbExpMs) {
          this.sessions.delete(key);
          return {
            ok: false,
            code: 'SESSION_EXPIRED',
            message: 'Sua sessão expirou. Faça login novamente para continuar.',
          };
        }
      }

      if (dbRow.sessionId !== cleanPresented) {
        this.hydrateSessionFromPersistence(
          key,
          dbRow.sessionId,
          dbRow.deviceLabel || '',
          nowMs
        );
        return {
          ok: false,
          code: 'SESSION_SUPERSEDED',
          message:
            'Sua conta entrou em outro dispositivo ou navegador. Apenas 1 sessão simultânea é permitida; faça login novamente aqui para continuar.',
        };
      }

      const hydrated = this.hydrateSessionFromPersistence(
        key,
        dbRow.sessionId,
        dbRow.deviceLabel || '',
        nowMs
      );
      if (!hydrated) {
        return {
          ok: false,
          code: 'SESSION_INVALID',
          message: 'Sessão persistida inválida ou expirada. Faça login novamente.',
        };
      }
      return {
        ok: true,
        sessionId: hydrated.sessionId,
        expiresAt: hydrated.expiresAt,
        expiresAtMs: hydrated.expiresAtMs,
      };
    }

    const existing = this.sessions.get(key);
    if (!existing) {
      return {
        ok: false,
        code: 'SESSION_REQUIRED',
        message: 'Nenhuma sessão ativa registrada para esta conta. Faça login novamente.',
      };
    }

    if (existing.expiresAtMs <= nowMs) {
      this.sessions.delete(key);
      return {
        ok: false,
        code: 'SESSION_EXPIRED',
        message: 'Sua sessão expirou. Faça login novamente para continuar.',
      };
    }

    if (existing.sessionId !== cleanPresented) {
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
      expiresAt: existing.expiresAt,
      expiresAtMs: existing.expiresAtMs,
    };
  }

  public verifyOrBindSession(
    userId: string,
    presentedSessionId?: string | null,
    options?: VerifySessionOptions
  ): SessionVerificationResult {
    return this.verifySession(userId, presentedSessionId, options);
  }

  public revokeSession(userId: string, sessionId?: string | null): boolean {
    const key = this.normalizeUserKey(userId);
    const cleanSid = String(sessionId || '').trim();
    if (!key || !cleanSid) return false;
    const existing = this.sessions.get(key);
    if (existing && existing.sessionId === cleanSid) {
      this.sessions.delete(key);
      return true;
    }
    return false;
  }

  public clearSession(userId: string, sessionId?: string | null): boolean {
    return this.revokeSession(userId, sessionId);
  }

  public getActiveSession(userId: string, nowMs = Date.now()): ActiveSessionRecord | null {
    const key = this.normalizeUserKey(userId);
    const rec = this.sessions.get(key) || null;
    if (!rec) return null;
    if (rec.expiresAtMs <= nowMs) {
      this.sessions.delete(key);
      return null;
    }
    return rec;
  }

  public getActiveCount(nowMs = Date.now()): number {
    let count = 0;
    for (const [key, rec] of this.sessions.entries()) {
      if (rec.expiresAtMs <= nowMs) {
        this.sessions.delete(key);
      } else {
        count += 1;
      }
    }
    return count;
  }

  public resetForTests(): void {
    this.sessions.clear();
  }
}

export const singleSessionManager = new SingleActiveSessionManager();
