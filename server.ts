import dotenv from 'dotenv';
dotenv.config();
dotenv.config({ path: '.env.local', override: false });

import fs from 'fs';
import http from 'http';
import express, { type NextFunction, type Request, type Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, type Content } from '@google/genai';
import { getChatRole, sanitizeChatHistory } from './lib/chat.js';
import { createDatabase } from './lib/db.js';
import { resolveMaleNeuralVoice, synthesizeMaleNeuralTts } from './lib/neural_tts.js';
import { supabaseSessionMiddleware } from './src/utils/supabase/middleware.ts';
import {
  createClient as createSupabaseServerClient,
  getServerSupabaseEnv,
  getServerSupabaseEnvStatus,
  resolveAuthenticatedSupabaseUser,
} from './src/utils/supabase/server.ts';
import { registerCourseApiRoutes } from './src/server/courseApi.ts';
import { resolveDeveloperCertificateAdmin } from './src/server/developerAuth.ts';
import { syncPrimaryAdminAccount } from './src/server/primaryAdminSync.ts';
import { financialGuard, getProgrammedChefReply } from './src/server/financialGuard.ts';
import { singleSessionManager } from './src/server/singleSession.ts';
import { createRateLimitMiddleware } from './src/server/rateLimit.ts';

function isDevLocalAuthEnabled(): boolean {
  return (
    process.env.NODE_ENV !== 'production' &&
    String(process.env.FERVEC_ENABLE_DEV_LOCAL_AUTH || '').trim().toLowerCase() === 'true'
  );
}

const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com https://cdn.jsdelivr.net",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob: https://*.openstreetmap.org https://tiles.openfreemap.org",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://tiles.openfreemap.org https://*.openfreemap.org https://overpass-api.de https://overpass.kumi.systems https://nominatim.openstreetmap.org https://tile.openstreetmap.org https://fonts.googleapis.com https://fonts.gstatic.com https://cdnjs.cloudflare.com https://cdn.jsdelivr.net",
  "worker-src 'self' blob: https://cdnjs.cloudflare.com",
  "frame-src 'self' blob:",
  "media-src 'self' data: blob:",
  "object-src 'none'",
  "frame-ancestors 'self' https://aistudio.google.com https://*.google.com https://*.googleusercontent.com https://*.run.app",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const HOST = '0.0.0.0';
const ALLOWED_CHAT_MODELS = new Set(['gemini-4-hydrogen', 'gemini-3.1-flash-lite']);
const ALLOWED_LIVE_VOICES = new Set(['Orus', 'Charon', 'Fenrir', 'Puck']);
const TTS_VOICE_STYLES: Record<string, string> = {
  Orus: 'Homem brasileiro adulto, chef de cozinha experiente. Fale com voz masculina firme, leve, natural e fluida, conversando ao explicar a receita sem soar robótico ou artificial.',
  Charon:
    'Homem brasileiro adulto, chef instrutor sereno e próximo. Fale com voz masculina natural, leve, calma e bem articulada, explicando cada etapa com firmeza humana e fluidez.',
  Fenrir:
    'Homem brasileiro adulto, chef apaixonado pela gastronomia. Fale com voz masculina firme, leve, envolvente e espontânea, explicando o preparo com confiança real de conversa na bancada.',
  Puck: 'Homem brasileiro adulto, chef comunicativo e acessível. Fale com voz masculina natural, leve, solta e firme na medida certa, fluindo como uma conversa tranquila na cozinha.',
};

const PRIVATE_BOOK_PATH = path.join(__dirname, 'private-books', 'fervec-massa-italiana.pdf');
const AISTUDIO_PUBLIC_ALLOW_RE =
  /^\/(fervec_x5f_gastronomia_x5f_documento_x5f_unico__1___1__f38fd1c7\.html|[^/]+\.(png|jpg|jpeg|webp|svg|gif))$/i;

const db = createDatabase(path.join(__dirname, 'data', 'fervec-db.json'));

interface SiteChatMessageInput {
  role: 'user' | 'model';
  text: string;
}

interface SiteChatRequestBody {
  messages?: SiteChatMessageInput[];
  mode?: 'standard' | 'fast';
  context?: string;
}

const SITE_BASE_SYSTEM_INSTRUCTION = `Você é o Chef CREMONESE, professor e instrutor gastronômico da FerveC Gastronomia.
Seu papel é orientar alunos com clareza, simpatia e rigor técnico sobre:
1. O curso Massas Italianas e seus 6 módulos (preservando chaves internas):
   - Módulo 1 — Fundamentos das Massas Italianas (Spaghetti alla Carbonara): 200 g spaghetti, 100 g guanciale, 2 ovos inteiros pasteurizados + 1 gema pasteurizada, 50 g Pecorino Romano, pimenta-do-reino preta moída na hora, sal moderado e água do cozimento q.b. Sem creme de leite; emulsão fora do fogo direto. Alergênicos: trigo (glúten), ovos e leite.
   - Módulo 2 — Massas Frescas e Emulsificação (Fettuccine Alfredo): 400 g fettuccine fresco com ovos, 100 g manteiga sem sal, 240 g Parmigiano-Reggiano ralado fino, água do cozimento e sal; sem creme de leite. Alergênicos: trigo (glúten), ovos e leite.
   - Módulo 3 — Massas Tubulares e Molhos Picantes (Penne all’Arrabbiata): 320 g penne rigate seco, 400 g tomate pelado, 40 ml azeite EV, 2 dentes de alho, peperoncino ou pimenta calabresa, sal, 10 g salsinha opcional, Pecorino opcional. Alergênicos: trigo (glúten) e leite se usar Pecorino.
   - Módulo 4 — Molhos Clássicos da Ligúria (Fusilli al Pesto Genovese): 320 g fusilli seco, 60 g folhas de manjericão higienizadas e secas, 30 g pinoli, 50 g Parmigiano-Reggiano, 25 g Pecorino Sardo, 70 ml azeite EV, 1 dente pequeno de alho, sal e água do cozimento. NUNCA armazenar pesto com alho e azeite em temperatura ambiente (risco botulínico — NCHFP). Alergênicos: trigo (glúten), leite e pinoli.
   - Módulo 5 — Massa Artesanal e Cozimento Lento (Tagliatelle al Ragù alla Bolognese): Ficha Técnica A (400 g farinha 00, 4 ovos médios, pitada de sal; sova 15–20 min, descanso ~30 min) e Ficha Técnica B (400 g carne bovina moída grossa, 150 g pancetta fresca não defumada, 60 g cebola, 60 g cenoura, 60 g salsão, vinho ~120 ml, 200 g passata, 1 c.s. extrato duplo, leite opcional ~120 ml, 3 c.s. azeite ~45 ml, caldo leve q.b.). Alergênicos: trigo (glúten), ovos, leite (se usado), salsão.
   - Módulo 6 — Molhos Essenciais Italianos (Pomodoro & Burro e Salvia).
2. Técnicas e Segurança Alimentar: aplicar Anvisa RDC 216/2004.
3. A Vinícola FerveC: perfis típicos de Malbec, Chianti, Pinot Grigio, Vinho Rosé e Prosecco.
Responda sempre em português do Brasil, em tom acolhedor, didático e objetivo.`;

function createAiClient(apiKey: string) {
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function readBearerToken(req: Request): string {
  const auth = String(req.headers.authorization || '').trim();
  if (auth.toLowerCase().startsWith('bearer ')) return auth.slice(7).trim();
  return String(req.headers['x-fervec-token'] || '').trim();
}

function resolveUserRateKey(req: Request): string {
  const token = readBearerToken(req);
  if (token) return `tok:${token.slice(0, 16)}`;
  const ip = String(req.headers['x-forwarded-for'] || req.ip || 'local').split(',')[0].trim();
  return `ip:${ip}`;
}

function sleepMs(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isTransientGeminiError(err: unknown): boolean {
  const rec = err as { status?: number; code?: number; message?: string } | null;
  const status = Number(rec?.status || rec?.code || 0);
  const msg = String(rec?.message || '');
  return (
    status === 503 ||
    status === 502 ||
    status === 500 ||
    status === 429 ||
    /503|UNAVAILABLE|high demand|RESOURCE_EXHAUSTED|overloaded|timed out/i.test(msg)
  );
}

async function withRetry<T>(fn: () => Promise<T>, maxRetries = 2): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      lastError = err;
      const status = (err as { status?: number })?.status;
      if (attempt < maxRetries && (status === 429 || (status !== undefined && status >= 500))) {
        await sleepMs(500 * Math.pow(2, attempt));
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}

function resolveAllowedOrigins(): string[] {
  const raw = String(process.env.FERVEC_ALLOWED_ORIGINS || process.env.FERVEC_SITE_URL || '').trim();
  if (!raw) return [];
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export interface ServerAppDeps {
  dbPath?: string;
  privateBookPath?: string;
  resolveSupabaseAuth?: typeof resolveAuthenticatedSupabaseUser;
}

export function createFervecExpressApp(deps?: ServerAppDeps): express.Express {
  const app = express();
  const activeDb = deps?.dbPath ? createDatabase(deps.dbPath) : db;
  const bookPath = deps?.privateBookPath || PRIVATE_BOOK_PATH;
  const resolveSupa = deps?.resolveSupabaseAuth || resolveAuthenticatedSupabaseUser;

  const apiWriteRateLimiter = createRateLimitMiddleware({
    windowMs: 60_000,
    maxRequests: 45,
    name: 'api-write',
  }).middleware;
  const authRateLimiter = createRateLimitMiddleware({
    windowMs: 60_000,
    maxRequests: 25,
    name: 'auth',
  }).middleware;
  const ttsChatRateLimiter = createRateLimitMiddleware({
    windowMs: 60_000,
    maxRequests: 35,
    name: 'tts-chat',
  }).middleware;

  app.use((req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'microphone=(), camera=()');
    res.setHeader('Content-Security-Policy', CONTENT_SECURITY_POLICY);

    if (req.path.startsWith('/api/')) {
      res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
    }

    const origin = String(req.headers.origin || '').trim();
    if (origin && req.path.startsWith('/api/')) {
      const allowed = resolveAllowedOrigins();
      const requestHost = String(req.headers.host || '').trim();
      const sameOriginHost = origin.includes(requestHost);
      if (sameOriginHost || allowed.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Vary', 'Origin');
        res.setHeader(
          'Access-Control-Allow-Headers',
          'authorization, x-fervec-token, x-fervec-session-id, content-type, range'
        );
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS, HEAD');
      } else if (allowed.length > 0 && req.method === 'OPTIONS') {
        res.status(403).end();
        return;
      }
    }
    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }
    next();
  });

  app.use(express.json({ limit: '4mb' }));
  app.use('/api/auth', authRateLimiter);
  app.use('/api/coupons', apiWriteRateLimiter);
  app.use('/api/legal', apiWriteRateLimiter);
  app.use('/api/orders', apiWriteRateLimiter);
  app.use('/api/assessments', apiWriteRateLimiter);
  app.use('/api/chat', ttsChatRateLimiter);
  app.use('/api/tts', ttsChatRateLimiter);
  app.use(supabaseSessionMiddleware);

  // --- Site FerveC (Supabase Config, Health, Courses, Payments & Certificates) ---
  app.get('/api/supabase/config', (_req: Request, res: Response) => {
    const env = getServerSupabaseEnv();
    if (!env) {
      res.json({ configured: false });
      return;
    }
    res.setHeader('Cache-Control', 'no-store');
    res.json({
      configured: true,
      url: env.url,
      publishableKey: env.key,
    });
  });

  app.get('/api/supabase/health', async (req: Request, res: Response) => {
    const supabase = createSupabaseServerClient(req, res);
    if (!supabase) {
      const status = getServerSupabaseEnvStatus();
      res.json({
        configured: false,
        hasUrl: status.hasUrl,
        hasKey: status.hasKey,
        matchedUrlVar: status.matchedUrlVar,
        matchedKeyVar: status.matchedKeyVar,
        user: null,
      });
      return;
    }
    try {
      const { data, error } = await supabase.auth.getUser();
      res.json({
        configured: true,
        authenticated: Boolean(data?.user && !error),
        userId: data?.user?.id ?? null,
      });
    } catch {
      res.json({ configured: true, authenticated: false, userId: null });
    }
  });

  registerCourseApiRoutes(app, deps?.resolveSupabaseAuth ? { resolveAuth: deps.resolveSupabaseAuth } : undefined);

  // --- Protected Private Book Streaming Endpoint (with HTTP Range & Entitlement Gating) ---
  async function handleLibraryBookRequest(req: Request, res: Response) {
    const requestedFile = String(req.query.file || req.query.path || '');
    if (requestedFile && (requestedFile.includes('..') || requestedFile.includes('/') || requestedFile.includes('\\'))) {
      res.status(400).json({ error: 'Parâmetro de arquivo inválido.' });
      return;
    }

    let entitled = false;
    let authenticated = false;

    const supaAuth = await resolveSupa(req, res).catch(() => null);
    if (supaAuth) {
      authenticated = true;
      const { supabase, user } = supaAuth;
      const rawSid = String(req.headers['x-fervec-session-id'] || '').trim();
      const dummySid = rawSid === 'server-session' || rawSid === 'browser-session' || rawSid === 'guest';
      if (!rawSid || rawSid.length < 8 || dummySid) {
        res.status(401).json({
          code: 'SESSION_REQUIRED',
          error: 'Identificador de sessão ativa obrigatório.',
        });
        return;
      }
      try {
        const { data: activeSess } = await supabase
          .from('user_active_sessions')
          .select('session_id')
          .eq('user_id', user.id)
          .maybeSingle();
        if (activeSess && typeof activeSess.session_id === 'string' && activeSess.session_id !== rawSid) {
          singleSessionManager.claimSession(user.id, activeSess.session_id);
          res.status(409).json({
            code: 'SESSION_REPLACED_OTHER_DEVICE',
            error: 'Sessão encerrada em outro dispositivo.',
          });
          return;
        }
      } catch {
        // Optional when user_active_sessions isn't present in test mocks
      }
      const memCheck = singleSessionManager.verifyOrBindSession(user.id, rawSid);
      if (!memCheck.ok) {
        res.status(memCheck.code === 'SESSION_REQUIRED' ? 401 : 409).json({
          code: memCheck.code === 'SESSION_REQUIRED' ? 'SESSION_REQUIRED' : 'SESSION_REPLACED_OTHER_DEVICE',
          error: memCheck.message,
        });
        return;
      }

      const { data: profileRow } = await supabase
        .from('profiles')
        .select('id, cpf_hash, email, birth_date, age, full_name, cpf_masked')
        .eq('id', user.id)
        .maybeSingle();

      const devPerm = resolveDeveloperCertificateAdmin({
        user,
        profile: (profileRow as Record<string, unknown> | null) as never,
        profileExistedInDb: Boolean(profileRow),
      });

      if (devPerm.isDeveloperAdmin) {
        entitled = true;
      } else {
        const { data: courseRow } = await supabase
          .from('courses')
          .select('id')
          .eq('slug', 'massas-italianas')
          .maybeSingle();

        if (courseRow?.id) {
          const [{ data: paidOrder }, { data: activeEnr }] = await Promise.all([
            supabase
              .from('orders')
              .select('id, status')
              .eq('user_id', user.id)
              .eq('course_id', courseRow.id)
              .eq('status', 'paid')
              .limit(1)
              .maybeSingle(),
            supabase
              .from('student_enrollments')
              .select('id, status')
              .eq('user_id', user.id)
              .eq('course_id', courseRow.id)
              .limit(1)
              .maybeSingle(),
          ]);

          const enrStatus = String(activeEnr?.status || '').toLowerCase();
          entitled =
            Boolean(paidOrder) ||
            enrStatus === 'active' ||
            enrStatus === 'completed';
        }
      }
    } else if (deps?.dbPath || isDevLocalAuthEnabled()) {
      const token = readBearerToken(req);
      if (token) {
        const sess = activeDb.getSession(token);
        if (sess.ok && sess.user) {
          authenticated = true;
          const entitledList = Array.isArray((sess.user as { entitledCourses?: string[] }).entitledCourses)
            ? (sess.user as { entitledCourses: string[] }).entitledCourses
            : [];
          entitled =
            (sess.user as { role?: string }).role === 'admin' ||
            entitledList.includes('massas-italianas');
        }
      }
    }

    if (!authenticated) {
      res.status(401).json({
        code: 'AUTH_REQUIRED',
        error: 'Autenticação necessária para acessar o livro digital.',
      });
      return;
    }

    if (!entitled) {
      res.status(403).json({
        code: 'COURSE_NOT_PURCHASED',
        error: 'Acesso ao livro completo restrito a alunos com matrícula paga no curso Massas Italianas.',
      });
      return;
    }

    if (!fs.existsSync(bookPath)) {
      res.status(404).json({ error: 'Arquivo do livro não localizado no servidor protegido.' });
      return;
    }

    const stat = fs.statSync(bookPath);
    const total = stat.size;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'private, no-store, no-cache, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Content-Disposition', 'inline; filename="fervec-massa-italiana.pdf"');

    const range = req.headers.range;
    if (range) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(String(range).trim());
      if (!match) {
        res.status(416).setHeader('Content-Range', `bytes */${total}`).end();
        return;
      }
      const start = match[1] ? Number(match[1]) : 0;
      const end = match[2] ? Math.min(Number(match[2]), total - 1) : total - 1;
      if (start < 0 || start >= total || end < start) {
        res.status(416).setHeader('Content-Range', `bytes */${total}`).end();
        return;
      }
      res.status(206);
      res.setHeader('Content-Range', `bytes ${start}-${end}/${total}`);
      res.setHeader('Content-Length', String(end - start + 1));
      if (req.method === 'HEAD') {
        res.end();
        return;
      }
      fs.createReadStream(bookPath, { start, end }).pipe(res);
      return;
    }

    res.setHeader('Content-Length', String(total));
    if (req.method === 'HEAD') {
      res.end();
      return;
    }
    fs.createReadStream(bookPath).pipe(res);
  }

  app.get('/api/library/book', handleLibraryBookRequest);
  app.head('/api/library/book', handleLibraryBookRequest);

  // --- Biblioteca Interativa Dev-Only Local Database Endpoints (Gated behind FERVEC_ENABLE_DEV_LOCAL_AUTH=true) ---
  const ensureDevLocalAuth = (res: Response): boolean => {
    if (deps?.dbPath || isDevLocalAuthEnabled()) return true;
    res.status(403).json({
      ok: false,
      code: 'DEV_AUTH_DISABLED',
      error: 'Autenticação local de desenvolvimento desativada. Utilize o fluxo oficial do Supabase.',
    });
    return false;
  };

  app.post('/api/auth/register', (req: Request, res: Response) => {
    if (!ensureDevLocalAuth(res)) return;
    const { name = '', email = '', password = '', age = undefined, initialData = {} } = req.body || {};
    const result = activeDb.registerUser({ name, email, password, age, initialData });
    if (!result.ok) {
      return res.status(result.status || 400).json({ error: result.error });
    }
    return res.status(201).json({
      ok: true,
      user: result.user,
      token: result.token,
      data: result.data,
    });
  });

  app.post('/api/auth/login', (req: Request, res: Response) => {
    if (!ensureDevLocalAuth(res)) return;
    const { email = '', password = '' } = req.body || {};
    const result = activeDb.loginUser({ email, password });
    if (!result.ok) {
      return res.status(result.status || 401).json({ error: result.error });
    }
    return res.json({
      ok: true,
      user: result.user,
      token: result.token,
      data: result.data,
    });
  });

  app.get('/api/auth/session', (req: Request, res: Response) => {
    if (!ensureDevLocalAuth(res)) return;
    const token = readBearerToken(req);
    const result = activeDb.getSession(token);
    if (!result.ok) {
      return res.status(result.status || 401).json({ error: result.error });
    }
    return res.json({ ok: true, user: result.user, data: result.data });
  });

  app.post('/api/auth/logout', (req: Request, res: Response) => {
    if (!ensureDevLocalAuth(res)) return;
    const token = readBearerToken(req);
    activeDb.logoutSession(token);
    return res.json({ ok: true });
  });

  app.get('/api/user/data', (req: Request, res: Response) => {
    if (!ensureDevLocalAuth(res)) return;
    const token = readBearerToken(req);
    const result = activeDb.getSession(token);
    if (!result.ok) {
      return res.status(result.status || 401).json({ error: result.error });
    }
    return res.json({ user: result.user, data: result.data });
  });

  app.put('/api/user/data', (req: Request, res: Response) => {
    if (!ensureDevLocalAuth(res)) return;
    const token = readBearerToken(req);
    const payload =
      req.body?.data && typeof req.body.data === 'object' ? req.body.data : req.body;
    const result = activeDb.updateUserData(token, payload);
    if (!result.ok) {
      return res.status(result.status || 401).json({ error: result.error });
    }
    return res.json({ ok: true, data: result.data });
  });

  // --- Unified Chef Chat (Financial Guard + Local Programmed Fallback R$ 0) ---
  app.post('/api/chat', async (req: Request, res: Response) => {
    const apiKey = process.env.GEMINI_API_KEY;
    const rawMessages = Array.isArray(req.body?.messages) ? req.body.messages : [];
    const isSitePayload =
      typeof req.body?.mode === 'string' ||
      typeof req.body?.context === 'string' ||
      rawMessages.some(
        (m: unknown) =>
          Boolean(m) &&
          typeof (m as { text?: unknown }).text === 'string' &&
          typeof (m as { content?: unknown }).content !== 'string'
      );

    const guardKey = resolveUserRateKey(req);
    const quotaDecision = financialGuard.tryConsumeChatQuota(guardKey);

    if (isSitePayload) {
      const body = (req.body || {}) as SiteChatRequestBody;
      const cleanMessages = rawMessages
        .filter(
          (m: unknown): m is SiteChatMessageInput =>
            Boolean(m) &&
            ((m as SiteChatMessageInput).role === 'user' ||
              (m as SiteChatMessageInput).role === 'model') &&
            typeof (m as SiteChatMessageInput).text === 'string' &&
            (m as SiteChatMessageInput).text.trim().length > 0
        )
        .slice(-24);

      if (cleanMessages.length === 0) {
        res.status(400).json({ error: 'Envie uma mensagem para conversar com o Chef.' });
        return;
      }

      const lastMessage = cleanMessages[cleanMessages.length - 1];
      if (lastMessage.role !== 'user') {
        res.status(400).json({ error: 'A última mensagem deve ser do aluno.' });
        return;
      }

      if (!quotaDecision.allowed) {
        res.status(quotaDecision.status || 429).json({
          error: quotaDecision.reason || 'Limite de consultas atingido. Aguarde alguns segundos.',
        });
        return;
      }

      if (quotaDecision.mode === 'local_programmed' || !apiKey) {
        const programmed = getProgrammedChefReply({
          question: lastMessage.text,
          context: body.context,
        });
        res.json({
          reply: programmed,
          mode: 'local_programmed',
          reason: quotaDecision.reason || 'no_api_key',
          model: 'fervec-programado-r0',
        });
        return;
      }

      const model = body.mode === 'fast' ? 'gemini-3.1-flash-lite' : 'gemini-4-hydrogen';
      const contextSuffix =
        typeof body.context === 'string' && body.context.trim()
          ? `\n\nContexto atual da tela do aluno: ${body.context.trim()}`
          : '';
      const history: Content[] = cleanMessages.slice(0, -1).map((m: SiteChatMessageInput) => ({
        role: m.role,
        parts: [{ text: m.text }],
      }));

      try {
        const ai = createAiClient(apiKey);
        const response = await withRetry(async () => {
          const chat = ai.chats.create({
            model,
            history,
            config: {
              systemInstruction: SITE_BASE_SYSTEM_INSTRUCTION + contextSuffix,
            },
          });
          return chat.sendMessage({ message: lastMessage.text });
        });

        const replyText = (response.text ?? '').trim();
        if (!replyText) {
          res.json({
            reply: getProgrammedChefReply({ question: lastMessage.text, context: body.context }),
            mode: 'local_programmed',
            model: 'fervec-programado-r0',
          });
          return;
        }
        financialGuard.recordPaidAiSuccess();
        res.json({ reply: replyText, model });
        return;
      } catch (err: unknown) {
        financialGuard.recordPaidAiFailure();
        console.error('Gemini chat error:', (err as { message?: string })?.message || err);
        res.json({
          reply: getProgrammedChefReply({ question: lastMessage.text, context: body.context }),
          mode: 'local_programmed',
          model: 'fervec-programado-r0',
        });
        return;
      }
    }

    // Biblioteca Interativa contract: { systemInstruction, messages: [{role, content}], roleId, model }
    const {
      systemInstruction = '',
      messages = [],
      roleId = 'chef-tutor',
      model = '',
    } = req.body || {};
    const role = getChatRole(roleId);
    const cleaned = sanitizeChatHistory(messages, 20) as Array<{ role: string; content: string }>;
    const contents = cleaned.map((m: { role: string; content: string }) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    if (contents.length === 0) {
      return res.status(400).json({ error: 'Mensagem vazia.' });
    }

    const lastUserText = cleaned[cleaned.length - 1]?.content || '';

    if (!quotaDecision.allowed) {
      return res.status(quotaDecision.status || 429).json({
        error: quotaDecision.reason || 'Limite de consultas atingido. Aguarde alguns segundos.',
      });
    }

    if (quotaDecision.mode === 'local_programmed' || !apiKey) {
      return res.json({
        content: getProgrammedChefReply({
          question: lastUserText,
          context: String(systemInstruction || '').slice(0, 160),
        }),
        model: 'fervec-programado-r0',
        mode: 'local_programmed',
        reason: quotaDecision.reason || 'no_api_key',
        roleId: role.id,
      });
    }

    try {
      const chosenModel = ALLOWED_CHAT_MODELS.has(model) ? model : role.model;
      const fallbackModel =
        chosenModel === 'gemini-4-hydrogen' ? 'gemini-3.1-flash-lite' : 'gemini-4-hydrogen';
      const ai = createAiClient(apiKey);
      const finalInstruction = String(systemInstruction || role.instruction || '').trim();
      const candidates = [chosenModel, fallbackModel];
      let response: { text?: string } | null = null;
      let activeModel = chosenModel;
      let lastErr: unknown = null;

      for (const candidateModel of candidates) {
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            activeModel = candidateModel;
            response = await ai.models.generateContent({
              model: candidateModel,
              contents,
              config: finalInstruction ? { systemInstruction: finalInstruction } : undefined,
            });
            lastErr = null;
            break;
          } catch (err) {
            lastErr = err;
            if (!isTransientGeminiError(err)) break;
            await sleepMs(450 * (attempt + 1));
          }
        }
        if (response) break;
        if (lastErr && !isTransientGeminiError(lastErr)) break;
      }

      if (!response) {
        throw lastErr || new Error('Falha ao consultar o Chefe.');
      }

      financialGuard.recordPaidAiSuccess();
      return res.json({
        content: response.text || 'Não recebi uma resposta utilizável desta vez.',
        model: activeModel,
        roleId: role.id,
      });
    } catch {
      financialGuard.recordPaidAiFailure();
      return res.json({
        content: getProgrammedChefReply({
          question: lastUserText,
          context: String(systemInstruction || '').slice(0, 160),
        }),
        model: 'fervec-programado-r0',
        mode: 'local_programmed',
        roleId: role.id,
      });
    }
  });

  // --- Natural Male Neural Text-to-Speech (4 male Chef voices: Antonio, Brian, Giuseppe, Andrew) ---
  app.post('/api/tts', async (req: Request, res: Response) => {
    try {
      const cleanText = String(req.body?.text || '')
        .replace(/[*_`#>~]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 1200);
      if (!cleanText) {
        return res.status(400).json({ error: 'Texto vazio para leitura em voz.' });
      }

      const guardKey = resolveUserRateKey(req);
      const ttsGuard = financialGuard.canUseExternalTts(guardKey);
      if (!ttsGuard.allowed) {
        return res.status(ttsGuard.status || 503).json({
          fallback: 'browser_speech',
          reason: ttsGuard.reason,
          error: 'Síntese neural externa desativada; utilize o leitor de voz nativo do navegador.',
        });
      }

      const voiceProfile = resolveMaleNeuralVoice(String(req.body?.voiceName || ''));
      const rate = Number(req.body?.rate);
      const pitch = Number(req.body?.pitch);

      try {
        const neuralOut = await synthesizeMaleNeuralTts({
          text: cleanText,
          voiceId: voiceProfile.id,
          rate: Number.isFinite(rate) ? rate : 1.0,
          pitch: Number.isFinite(pitch) ? pitch : 1.0,
        });
        return res.json(neuralOut);
      } catch (neuralErr) {
        console.warn('[API /api/tts neural fallback]', neuralErr instanceof Error ? neuralErr.message : neuralErr);
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(503).json({
          fallback: 'browser_speech',
          reason: 'no_api_key',
          error: 'Síntese neural externa desativada; utilize o leitor de voz nativo do navegador.',
        });
      }

      const chosenGeminiVoice = ALLOWED_LIVE_VOICES.has(voiceProfile.liveVoice)
        ? voiceProfile.liveVoice
        : 'Charon';
      const ai = createAiClient(apiKey);

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash-lite-tts',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: cleanText,
                speechMetadata: {
                  style: TTS_VOICE_STYLES[chosenGeminiVoice] || TTS_VOICE_STYLES.Charon,
                } as unknown as undefined,
              },
            ],
          },
        ],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: chosenGeminiVoice },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!base64Audio) {
        return res.status(503).json({ fallback: 'browser_speech', error: 'O serviço de voz não retornou áudio.' });
      }

      return res.json({
        audioBase64: base64Audio,
        mimeType: 'audio/wav',
        voice: voiceProfile.id,
      });
    } catch {
      return res.status(503).json({
        fallback: 'browser_speech',
        error: 'Falha ao gerar áudio neural; utilizando leitor de voz do navegador.',
      });
    }
  });

  // --- Restricted Static Assets & Isolated Biblioteca Runtime ---
  // Note: /assets/fervec-massa-italiana.pdf is NEVER served statically — only via /api/library/book.
  const blockProtectedPath = (_req: Request, res: Response) => {
    res.status(403).json({
      code: 'PROTECTED_RESOURCE',
      error: 'Acesso direto bloqueado. Utilize a rota autenticada da plataforma.',
    });
  };
  app.all('/assets/fervec-massa-italiana.pdf', blockProtectedPath);
  app.use('/private-books', blockProtectedPath);
  app.use('/private-audit', blockProtectedPath);
  app.use('/data', blockProtectedPath);

  app.use(
    '/vendor/maplibre-gl',
    express.static(path.join(__dirname, 'node_modules/maplibre-gl/dist'))
  );
  const srcImagesStatic = express.static(path.join(__dirname, 'src/assets/images'));
  app.use('/src/assets/images', (req, res, next) => {
    if ('import' in req.query || 'url' in req.query || 'raw' in req.query) {
      next();
      return;
    }
    srcImagesStatic(req, res, next);
  });

  const aistudioStatic = express.static(path.join(__dirname, 'public/assets/aistudio'));
  app.use('/assets/aistudio', (req: Request, res: Response, next: NextFunction) => {
    if (!AISTUDIO_PUBLIC_ALLOW_RE.test(req.path)) {
      res.status(404).end();
      return;
    }
    aistudioStatic(req, res, next);
  });

  app.use('/assets', express.static(path.join(__dirname, 'public/assets')));
  app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
  app.use('/lib', express.static(path.join(__dirname, 'lib')));
  app.get('/portal.css', (_req: Request, res: Response) => {
    res.sendFile(path.join(__dirname, 'public/portal.css'));
  });
  const sendLibraryCss = (_req: Request, res: Response) => {
    const cssPath = path.join(__dirname, 'styles.css');
    if (fs.existsSync(cssPath)) {
      res.sendFile(cssPath);
      return;
    }
    res.type('text/css').send('/* library styles fallback */\n');
  };
  app.get('/library-styles.css', sendLibraryCss);
  app.get('/styles.css', sendLibraryCss);
  app.get('/app.js', (_req: Request, res: Response) => {
    res.sendFile(path.join(__dirname, 'app.js'));
  });

  return app;
}

async function startServer() {
  const app = createFervecExpressApp();

  void syncPrimaryAdminAccount().catch((err) => {
    console.warn(
      '[FerveC Admin Sync] Aviso ao sincronizar administrador:',
      err instanceof Error ? err.message : err
    );
  });

  // --- Vite Dev Middleware / Production SPA ---
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('/{*splat}', (_req: Request, res: Response) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  const server = http.createServer(app);
  server.listen(PORT, HOST, () => {
    console.log(`FerveC Gastronomia server listening on http://${HOST}:${PORT}`);
  });
}

if (process.env.FERVEC_NO_AUTO_LISTEN !== '1') {
  void startServer();
}
