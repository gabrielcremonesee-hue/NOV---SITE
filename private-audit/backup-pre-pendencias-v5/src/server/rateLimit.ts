import type { NextFunction, Request, Response } from 'express';

export interface RateLimiterOptions {
  windowMs: number;
  maxRequests: number;
  name?: string;
}

interface BucketEntry {
  count: number;
  resetAt: number;
}

export class SlidingFixedRateLimiter {
  private readonly buckets = new Map<string, BucketEntry>();
  private readonly windowMs: number;
  private readonly maxRequests: number;

  constructor(options: RateLimiterOptions) {
    this.windowMs = Math.max(1000, Math.floor(options.windowMs));
    this.maxRequests = Math.max(1, Math.floor(options.maxRequests));
  }

  public check(key: string, nowMs: number = Date.now()): {
    allowed: boolean;
    limit: number;
    remaining: number;
    retryAfterSeconds: number;
  } {
    const cleanKey = String(key || 'anon').slice(0, 140);
    let entry = this.buckets.get(cleanKey);

    if (!entry || nowMs >= entry.resetAt) {
      entry = { count: 0, resetAt: nowMs + this.windowMs };
      this.buckets.set(cleanKey, entry);
      if (this.buckets.size > 4000) {
        this.prune(nowMs);
      }
    }

    if (entry.count >= this.maxRequests) {
      const retryAfterSeconds = Math.max(1, Math.ceil((entry.resetAt - nowMs) / 1000));
      return {
        allowed: false,
        limit: this.maxRequests,
        remaining: 0,
        retryAfterSeconds,
      };
    }

    entry.count += 1;
    return {
      allowed: true,
      limit: this.maxRequests,
      remaining: Math.max(0, this.maxRequests - entry.count),
      retryAfterSeconds: 0,
    };
  }

  private prune(nowMs: number): void {
    for (const [k, v] of this.buckets.entries()) {
      if (nowMs >= v.resetAt) {
        this.buckets.delete(k);
      }
    }
  }

  public reset(): void {
    this.buckets.clear();
  }
}

export function resolveRequestRateKey(req: Request, prefix = 'api'): string {
  const auth = String(req.headers.authorization || '').trim();
  const sid = String(req.headers['x-fervec-session-id'] || '').trim();
  if (auth.toLowerCase().startsWith('bearer ') && auth.length > 16) {
    return `${prefix}:tok:${auth.slice(7, 23)}`;
  }
  if (sid && sid.length >= 8) {
    return `${prefix}:sid:${sid.slice(0, 20)}`;
  }
  const ip = String(req.headers['x-forwarded-for'] || req.ip || 'local').split(',')[0].trim();
  return `${prefix}:ip:${ip || 'local'}`;
}

export function createRateLimitMiddleware(options: RateLimiterOptions) {
  const limiter = new SlidingFixedRateLimiter(options);
  const name = options.name || 'api';

  const middleware = (req: Request, res: Response, next: NextFunction): void => {
    const key = resolveRequestRateKey(req, name);
    const verdict = limiter.check(key);
    res.setHeader('X-RateLimit-Limit', String(verdict.limit));
    res.setHeader('X-RateLimit-Remaining', String(verdict.remaining));

    if (!verdict.allowed) {
      res.setHeader('Retry-After', String(verdict.retryAfterSeconds));
      res.status(429).json({
        ok: false,
        code: 'RATE_LIMITED',
        retryAfterSeconds: verdict.retryAfterSeconds,
        error: 'Muitas requisições em sequência. Aguarde alguns segundos antes de tentar novamente.',
      });
      return;
    }

    next();
  };

  return { middleware, limiter };
}
