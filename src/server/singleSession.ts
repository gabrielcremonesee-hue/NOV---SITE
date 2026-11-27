import crypto from 'crypto';

export interface ActiveSessionRecord {
  userId: string;
  sessionId: string;
  createdAt: string;
  claimedAt: string;
  lastSeenAt: string;
  deviceLabel?: string;
}

class SingleActiveSessionManager {
  private readonly sessions = new Map<string, ActiveSessionRecord>();

  public normalizeUserKey(userId: string): string {
    return String(userId || '').trim().toLowerCase();
  }

  public createSessionId(): string {
    return crypto.randomUUID();
  }

  public activateSession(
    userId: string,
    providedSessionId?: string,
    deviceLabel = ''
  ): ActiveSessionRecord {
    const key = this.normalizeUserKey(userId);
    const now = new Date().toISOString();
    const sessionId =
      providedSessionId && String(providedSessionId).trim().length >= 8
        ? String(providedSessionId).trim()
        : this.createSessionId();
    const record: ActiveSessionRecord = {
      userId: key,
      sessionId,
      createdAt: now,
      claimedAt: now,
      lastSeenAt: now,
      ...(deviceLabel ? { deviceLabel } : {}),
    };
    // Atomic replacement: previous device sessionId is invalidated immediately.
    this.sessions.set(key, record);
    return record;
  }

  public claimSession(
    userId: string,
    providedSessionId?: string,
    deviceLabel = ''
  ): ActiveSessionRecord {
    return this.activateSession(userId, providedSessionId, deviceLabel);
  }

  public verifyOrBindSession(
    userId: string,
    presentedSessionId?: string | null
  ): { ok: true; sessionId: string } | { ok: false; code: 'SESSION_REQUIRED' | 'SESSION_SUPERSEDED'; message: string } {
    const key = this.normalizeUserKey(userId);
    if (!key) {
      return {
        ok: false,
        code: 'SESSION_REQUIRED',
        message: 'Identidade de usuário ausente.',
      };
    }

    const cleanPresented = String(presentedSessionId || '').trim();
    const existing = this.sessions.get(key);

    if (!existing) {
      if (!cleanPresented) {
        return {
          ok: false,
          code: 'SESSION_REQUIRED',
          message: 'Identificador de sessão ativa obrigatório.',
        };
      }
      const bound = this.activateSession(key, cleanPresented);
      return { ok: true, sessionId: bound.sessionId };
    }

    if (!cleanPresented || existing.sessionId !== cleanPresented) {
      return {
        ok: false,
        code: 'SESSION_SUPERSEDED',
        message:
          'Sua conta entrou em outro dispositivo ou navegador. Apenas 1 sessão simultânea é permitida; faça login novamente aqui para continuar.',
      };
    }

    existing.lastSeenAt = new Date().toISOString();
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
    const existing = this.sessions.get(key);
    if (existing && existing.sessionId === String(sessionId).trim()) {
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
