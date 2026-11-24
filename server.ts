import dotenv from 'dotenv';
dotenv.config();
dotenv.config({ path: '.env.local', override: false });

import http from 'http';
import express, { type Request, type Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer } from 'ws';
import { GoogleGenAI, Modality, type Content } from '@google/genai';
import { getChatRole, sanitizeChatHistory } from './lib/chat.js';
import { createDatabase } from './lib/db.js';
import { supabaseSessionMiddleware } from './src/utils/supabase/middleware.ts';
import {
  createClient as createSupabaseServerClient,
  getServerSupabaseEnv,
  getServerSupabaseEnvStatus,
} from './src/utils/supabase/server.ts';
import { registerCourseApiRoutes } from './src/server/courseApi.ts';
import { syncPrimaryAdminAccount } from './src/server/primaryAdminSync.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const HOST = '0.0.0.0';
const ALLOWED_CHAT_MODELS = new Set(['gemini-4-hydrogen', 'gemini-3.1-flash-lite']);
const ALLOWED_LIVE_VOICES = new Set(['Zephyr', 'Kore', 'Puck', 'Charon', 'Fenrir']);
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
1. O curso Massas Italianas e seus 6 módulos:
   - Módulo 1: Spaghetti alla Carbonara (200 g de spaghetti, 100 g de guanciale, 2 ovos inteiros + 1 gema, 50 g de Pecorino Romano, pimenta-do-reino preta moída na hora; sem creme de leite; emulsão feita fora do fogo direto com água do cozimento).
   - Módulo 2: Fettuccine Alfredo (manteiga, Parmigiano-Reggiano, água do cozimento e mantecatura; sem creme de leite).
   - Módulo 3: Penne all’Arrabbiata (tomate pelado, azeite, alho controlado para não queimar, pimenta calabresa e salsinha).
   - Módulo 4: Fusilli al Pesto Genovese (manjericão bem seco, pinoli, Parmigiano-Reggiano, Pecorino, alho e azeite; sem aquecer o pesto).
   - Módulo 5: Tagliatelle al Ragù alla Bolognese (soffritto, pancetta, carne, deglaçagem com vinho, passata, cozimento lento e massa fresca).
   - Módulo 6: Molhos italianos lado a lado — Pomodoro clássico e Burro e Salvia.
2. Técnicas de cozinha: mise en place, ponto al dente, controle de temperatura, redução, emulsificação e segurança na cozinha (cuidado com água fervente, fogão quente e lembrar que aparência cremosa não comprova segurança microbiológica de ovos crus).
3. A Vinícola FerveC: perfis típicos de Malbec, Chianti, Pinot Grigio, Vinho Rosé e Prosecco, com sugestões gerais de harmonização.
Responda sempre em português do Brasil, em tom acolhedor, didático e objetivo. Use listas curtas quando explicar passos práticos.`;

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

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '4mb' }));
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

  registerCourseApiRoutes(app);
  void syncPrimaryAdminAccount().catch((err) => {
    console.warn(
      '[FerveC Admin Sync] Aviso ao sincronizar administrador:',
      err instanceof Error ? err.message : err
    );
  });

  // --- Biblioteca Interativa Persistent Database Endpoints (Auth + User Data) ---
  app.post('/api/auth/register', (req: Request, res: Response) => {
    const { name = '', email = '', password = '', initialData = {} } = req.body || {};
    const result = db.registerUser({ name, email, password, initialData });
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
    const { email = '', password = '' } = req.body || {};
    const result = db.loginUser({ email, password });
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
    const token = readBearerToken(req);
    const result = db.getSession(token);
    if (!result.ok) {
      return res.status(result.status || 401).json({ error: result.error });
    }
    return res.json({ ok: true, user: result.user, data: result.data });
  });

  app.post('/api/auth/logout', (req: Request, res: Response) => {
    const token = readBearerToken(req);
    db.logoutSession(token);
    return res.json({ ok: true });
  });

  app.get('/api/user/data', (req: Request, res: Response) => {
    const token = readBearerToken(req);
    const result = db.getSession(token);
    if (!result.ok) {
      return res.status(result.status || 401).json({ error: result.error });
    }
    return res.json({ user: result.user, data: result.data });
  });

  app.put('/api/user/data', (req: Request, res: Response) => {
    const token = readBearerToken(req);
    const payload =
      req.body?.data && typeof req.body.data === 'object' ? req.body.data : req.body;
    const result = db.updateUserData(token, payload);
    if (!result.ok) {
      return res.status(result.status || 401).json({ error: result.error });
    }
    return res.json({ ok: true, data: result.data });
  });

  // --- Unified Gemini AI Text Chat (supports both Biblioteca and Site FerveC payloads) ---
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

    if (!apiKey) {
      return res.status(isSitePayload ? 500 : 503).json({
        error: isSitePayload
          ? 'Chave da API Gemini não configurada no servidor. Verifique as configurações de segredos.'
          : 'Serviço de IA indisponível: configure GEMINI_API_KEY no servidor.',
      });
    }

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
          res.status(502).json({
            error: 'O Chef não conseguiu formular uma resposta agora. Tente reformular sua pergunta.',
          });
          return;
        }
        res.json({ reply: replyText, model });
        return;
      } catch (err: unknown) {
        const status = (err as { status?: number })?.status;
        const message = (err as { message?: string })?.message || 'Erro desconhecido';
        console.error('Gemini chat error:', status, message);
        if (status === 403 || status === 400) {
          res.status(status).json({
            error:
              'Não foi possível autenticar com a API Gemini. Verifique sua chave no painel Settings > Secrets.',
          });
          return;
        }
        if (status === 429) {
          res.status(429).json({
            error: 'Muitas perguntas em sequência. Aguarde alguns instantes e tente novamente.',
          });
          return;
        }
        if (status === 404) {
          res.status(404).json({
            error: 'Modelo solicitado indisponível no momento. Tente alternar para o modo padrão.',
          });
          return;
        }
        res.status(500).json({
          error: 'Ocorreu um erro ao consultar o Chef IA. Tente novamente em instantes.',
        });
        return;
      }
    }

    // Biblioteca Interativa contract: { systemInstruction, messages: [{role, content}], roleId, model }
    try {
      const {
        systemInstruction = '',
        messages = [],
        roleId = 'chef-tutor',
        model = '',
      } = req.body || {};
      const role = getChatRole(roleId);
      const chosenModel = ALLOWED_CHAT_MODELS.has(model) ? model : role.model;
      const fallbackModel =
        chosenModel === 'gemini-4-hydrogen' ? 'gemini-3.1-flash-lite' : 'gemini-4-hydrogen';
      const ai = createAiClient(apiKey);

      const cleaned = sanitizeChatHistory(messages, 20) as Array<{ role: string; content: string }>;
      const contents = cleaned.map((m: { role: string; content: string }) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

      if (contents.length === 0) {
        return res.status(400).json({ error: 'Mensagem vazia.' });
      }

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

      return res.json({
        content: response.text || 'Não recebi uma resposta utilizável desta vez.',
        model: activeModel,
        roleId: role.id,
      });
    } catch (err: unknown) {
      const rec = err as { status?: number; message?: string } | null;
      console.error('[API /api/chat error]', err);
      const status =
        Number(rec?.status) >= 400 && Number(rec?.status) < 600 ? Number(rec?.status) : 500;
      return res.status(status).json({
        error: rec?.message || 'Falha ao consultar o Chefe.',
      });
    }
  });

  // --- Gemini Text-to-Speech (WAV audio in Brazilian Portuguese) ---
  app.post('/api/tts', async (req: Request, res: Response) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(503).json({
        error: 'Serviço de voz indisponível: configure GEMINI_API_KEY no servidor.',
      });
    }

    try {
      const cleanText = String(req.body?.text || '')
        .replace(/[*_`#>~]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 1200);
      if (!cleanText) {
        return res.status(400).json({ error: 'Texto vazio para leitura em voz.' });
      }
      const chosenVoice = ALLOWED_LIVE_VOICES.has(req.body?.voiceName) ? req.body.voiceName : 'Kore';
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
                  style: 'Chef instrutor brasileiro simpático, natural, acolhedor e claro na cozinha',
                } as unknown as undefined,
              },
            ],
          },
        ],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: chosenVoice },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!base64Audio) {
        return res.status(502).json({ error: 'O serviço de voz não retornou áudio.' });
      }

      return res.json({
        audioBase64: base64Audio,
        mimeType: 'audio/wav',
        voice: chosenVoice,
      });
    } catch (err: unknown) {
      const rec = err as { status?: number; message?: string } | null;
      console.error('[API /api/tts error]', err);
      const status =
        Number(rec?.status) >= 400 && Number(rec?.status) < 600 ? Number(rec?.status) : 500;
      return res.status(status).json({
        error: rec?.message || 'Falha ao gerar áudio do Chefe.',
      });
    }
  });

  // --- Gemini Audio Transcription Fallback ---
  app.post('/api/transcribe', async (req: Request, res: Response) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(503).json({
        error: 'Serviço de transcrição indisponível: configure GEMINI_API_KEY no servidor.',
      });
    }

    try {
      const audioBase64 = String(req.body?.audioBase64 || '').trim();
      const mimeType =
        String(req.body?.mimeType || 'audio/webm').split(';')[0].trim() || 'audio/webm';
      if (!audioBase64) {
        return res.status(400).json({ error: 'Áudio vazio.' });
      }
      const ai = createAiClient(apiKey);
      const response = await ai.models.generateContent({
        model: 'gemini-3.5-transcribe',
        contents: {
          parts: [
            {
              inlineData: {
                mimeType,
                data: audioBase64,
              },
            },
            {
              text: 'Transcreva fielmente em português do Brasil o que a pessoa falou na cozinha.',
            },
          ],
        },
      });
      return res.json({
        transcript: String(response.text || '').trim(),
      });
    } catch (err: unknown) {
      const rec = err as { status?: number; message?: string } | null;
      console.error('[API /api/transcribe error]', err);
      const status =
        Number(rec?.status) >= 400 && Number(rec?.status) < 600 ? Number(rec?.status) : 500;
      return res.status(status).json({
        error: rec?.message || 'Falha ao transcrever sua fala.',
      });
    }
  });

  // --- Preserved Static Assets & Isolated Biblioteca Runtime ---
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
  app.use('/assets/aistudio', express.static(path.join(__dirname, 'public/assets/aistudio')));
  app.use('/assets', express.static(path.join(__dirname, 'public/assets')));
  app.use('/assets', express.static(path.join(__dirname, 'assets')));
  app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
  app.use('/lib', express.static(path.join(__dirname, 'lib')));
  app.get('/portal.css', (_req: Request, res: Response) => {
    res.sendFile(path.join(__dirname, 'public/portal.css'));
  });
  app.get('/library-styles.css', (_req: Request, res: Response) => {
    res.sendFile(path.join(__dirname, 'styles.css'));
  });
  app.get('/styles.css', (_req: Request, res: Response) => {
    res.sendFile(path.join(__dirname, 'styles.css'));
  });
  app.get('/app.js', (_req: Request, res: Response) => {
    res.sendFile(path.join(__dirname, 'app.js'));
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

  // --- HTTP + WebSocket Server (Gemini Live Audio on /live) ---
  const server = http.createServer(app);
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    try {
      const parsedUrl = new URL(
        request.url || '/',
        `http://${request.headers.host || 'localhost'}`
      );
      if (parsedUrl.pathname === '/live') {
        wss.handleUpgrade(request, socket, head, (ws) => {
          wss.emit('connection', ws, request, parsedUrl);
        });
      } else {
        socket.destroy();
      }
    } catch {
      socket.destroy();
    }
  });

  wss.on('connection', async (clientWs, _request, parsedUrl: URL) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      clientWs.send(
        JSON.stringify({
          error: 'Serviço de voz indisponível: configure GEMINI_API_KEY no servidor.',
        })
      );
      clientWs.close();
      return;
    }

    let session: { sendRealtimeInput: (input: unknown) => void; close: () => void } | null = null;
    let sessionReady = false;
    const queryVoice = parsedUrl?.searchParams?.get('voice') || 'Kore';

    async function initLiveSession(voiceName: string, systemInstruction: string) {
      if (session || sessionReady) return;
      sessionReady = true;
      const chosenVoice = ALLOWED_LIVE_VOICES.has(voiceName) ? voiceName : 'Kore';
      const ai = createAiClient(apiKey as string);
      const voiceStyle =
        ' Fale sempre em português do Brasil com tom leve, simpático, natural e acolhedor, como um chef dialogando lado a lado na cozinha — evite frases robóticas, listas longas ou tom rígido.';
      const baseInstruction = systemInstruction
        ? `${systemInstruction}${voiceStyle}`
        : 'Você é o Chef Instrutor de Voz da FerveC Gastronomia, em português do Brasil. Ajude o usuário a preparar massa italiana fresca, responder dúvidas rápidas na bancada e sugerir molhos com naturalidade, calor humano e frases curtas que fluem bem em voz alta.' +
          voiceStyle;

      try {
        session = (await ai.live.connect({
          model: 'gemini-3.8-live',
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: chosenVoice },
              },
            },
            inputAudioTranscription: {},
            outputAudioTranscription: {},
            systemInstruction: baseInstruction,
          },
          callbacks: {
            onmessage: (message) => {
              if (clientWs.readyState !== clientWs.OPEN) return;
              const content = message.serverContent;
              if (content?.inputTranscription?.text) {
                clientWs.send(
                  JSON.stringify({ inputTranscript: content.inputTranscription.text })
                );
              }
              if (content?.outputTranscription?.text) {
                clientWs.send(
                  JSON.stringify({ outputTranscript: content.outputTranscription.text })
                );
              }
              for (const part of content?.modelTurn?.parts ?? []) {
                if (part.inlineData?.data) {
                  clientWs.send(JSON.stringify({ audio: part.inlineData.data }));
                }
              }
              if (content?.interrupted) {
                clientWs.send(JSON.stringify({ interrupted: true }));
              }
              if (content?.turnComplete) {
                clientWs.send(JSON.stringify({ turnComplete: true }));
              }
            },
            onerror: (err) => {
              console.error('[Live API session error]', err);
              if (clientWs.readyState === clientWs.OPEN) {
                clientWs.send(
                  JSON.stringify({ error: err?.message || 'Erro na sessão Gemini Live.' })
                );
              }
            },
            onclose: () => {
              if (clientWs.readyState === clientWs.OPEN) {
                clientWs.close();
              }
            },
          },
        })) as unknown as { sendRealtimeInput: (input: unknown) => void; close: () => void };

        if (clientWs.readyState === clientWs.OPEN) {
          clientWs.send(
            JSON.stringify({ ready: true, voice: chosenVoice, model: 'gemini-3.8-live' })
          );
        }
      } catch (err: unknown) {
        const rec = err as { message?: string } | null;
        console.error('[Live API connect error]', err);
        if (clientWs.readyState === clientWs.OPEN) {
          clientWs.send(
            JSON.stringify({
              error: rec?.message || 'Não foi possível iniciar a conversa por voz com Gemini Live.',
            })
          );
          clientWs.close();
        }
      }
    }

    const fallbackTimer = setTimeout(() => {
      if (!sessionReady && clientWs.readyState === clientWs.OPEN) {
        void initLiveSession(queryVoice, '');
      }
    }, 500);

    clientWs.on('message', async (raw: Buffer | string) => {
      let msg: {
        type?: string;
        voiceName?: string;
        systemInstruction?: string;
        audio?: string;
        text?: string;
      };
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        return;
      }

      if (msg.type === 'config') {
        clearTimeout(fallbackTimer);
        await initLiveSession(msg.voiceName || queryVoice, msg.systemInstruction || '');
        return;
      }

      if (!session) return;

      try {
        if (typeof msg.audio === 'string' && msg.audio.length > 0) {
          session.sendRealtimeInput({
            audio: { data: msg.audio, mimeType: 'audio/pcm;rate=16000' },
          });
        } else if (typeof msg.text === 'string' && msg.text.trim()) {
          session.sendRealtimeInput({ text: msg.text.trim() });
        }
      } catch (err) {
        console.error('[Live API sendRealtimeInput error]', err);
        if (clientWs.readyState === clientWs.OPEN) {
          clientWs.send(JSON.stringify({ error: 'Falha ao enviar áudio para o Gemini Live.' }));
        }
      }
    });

    clientWs.on('close', () => {
      clearTimeout(fallbackTimer);
      if (session) {
        try {
          session.close();
        } catch {
          // ignore close errors
        }
        session = null;
      }
    });
  });

  server.listen(PORT, HOST, () => {
    console.log(`FerveC Gastronomia server listening on http://${HOST}:${PORT}`);
  });
}

void startServer();
