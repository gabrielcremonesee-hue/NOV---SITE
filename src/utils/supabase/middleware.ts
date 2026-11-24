import type { NextFunction, Request, Response } from 'express';
import { createClient } from './server.ts';

export async function supabaseSessionMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  // Only refresh auth cookies on API or document requests to avoid overhead on static assets
  const accept = req.headers.accept || '';
  const shouldRefresh =
    req.path.startsWith('/api/') || (req.method === 'GET' && accept.includes('text/html'));

  if (!shouldRefresh) {
    next();
    return;
  }

  try {
    const supabase = createClient(req, res);
    if (supabase) {
      await supabase.auth.getUser();
    }
  } catch {
    // Keep serving requests even if Supabase is temporarily unreachable
  }

  next();
}
