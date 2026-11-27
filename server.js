import fs from 'fs';
import http from 'http';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import { getChatRole, sanitizeChatHistory } from './lib/chat.js';
import { createDatabase } from './lib/db.js';
import { resolveMaleNeuralVoice, synthesizeMaleNeuralTts } from './lib/neural_tts.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const HOST = '0.0.0.0';
const ALLOWED_CHAT_MODELS = new Set(['gemini-4-hydrogen', 'gemini-3.1-flash-lite']);
const ALLOWED_LIVE_VOICES = new Set(['Orus', 'Charon', 'Fenrir', 'Puck']);
const TTS_VOICE_STYLES = {
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

function createAiClient(apiKey) {
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function readBearerToken(req) {
  const auth = String(req.headers.authorization || '').trim();
  if (auth.toLowerCase().startsWith('bearer ')) return auth.slice(7).trim();
  return String(req.headers['x-fervec-token'] || '').trim();
}

function sleepMs(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isTransientGeminiError(err) {
  const status = Number(err?.status || err?.code || 0);
  const msg = String(err?.message || '');
  return (
    status === 503 ||
    status === 502 ||
    status === 500 ||
    status === 429 ||
    /503|UNAVAILABLE|high demand|RESOURCE_EXHAUSTED|overloaded|timed out/i.test(msg)
  );
}

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'microphone=(), camera=()');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  next();
});

app.use(express.json({ limit: '4mb' }));

// --- Protected Private Book Streaming Endpoint ---
function handleLibraryBook(req, res) {
  const requestedFile = String(req.query.file || req.query.path || '');
  if (requestedFile && (requestedFile.includes('..') || requestedFile.includes('/') || requestedFile.includes('\\'))) {
    return res.status(400).json({ error: 'Parâmetro de arquivo inválido.' });
  }
  const token = readBearerToken(req);
  const sess = db.getSession(token);
  if (!sess.ok || !sess.user) {
    return res.status(401).json({ error: 'Autenticação necessária para acessar o livro digital.' });
  }
  const entitled =
    sess.user.role === 'admin' ||
    (Array.isArray(sess.user.entitledCourses) && sess.user.entitledCourses.includes('massas-italianas'));
  if (!entitled) {
    return res.status(403).json({ error: 'Acesso restrito a alunos com matrícula paga.' });
  }
  if (!fs.existsSync(PRIVATE_BOOK_PATH)) {
    return res.status(404).json({ error: 'Livro digital não encontrado.' });
  }
  const total = fs.statSync(PRIVATE_BOOK_PATH).size;
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Accept-Ranges', 'bytes');
  res.setHeader('Cache-Control', 'private, no-store, no-cache, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Content-Disposition', 'inline; filename="fervec-massa-italiana.pdf"');
  const range = req.headers.range;
  if (range) {
    const m = /^bytes=(\d*)-(\d*)$/.exec(String(range).trim());
    if (!m) return res.status(416).setHeader('Content-Range', `bytes */${total}`).end();
    const start = m[1] ? Number(m[1]) : 0;
    const end = m[2] ? Math.min(Number(m[2]), total - 1) : total - 1;
    if (start < 0 || start >= total || end < start) {
      return res.status(416).setHeader('Content-Range', `bytes */${total}`).end();
    }
    res.status(206);
    res.setHeader('Content-Range', `bytes ${start}-${end}/${total}`);
    res.setHeader('Content-Length', String(end - start + 1));
    if (req.method === 'HEAD') return res.end();
    return fs.createReadStream(PRIVATE_BOOK_PATH, { start, end }).pipe(res);
  }
  res.setHeader('Content-Length', String(total));
  if (req.method === 'HEAD') return res.end();
  return fs.createReadStream(PRIVATE_BOOK_PATH).pipe(res);
}

app.get('/api/library/book', handleLibraryBook);
app.head('/api/library/book', handleLibraryBook);

// --- Server-Side Persistent Database Endpoints (Auth + User Data) ---
app.post('/api/auth/register', (req, res) => {
  const { name = '', email = '', password = '', age = undefined, initialData = {} } = req.body || {};
  const result = db.registerUser({ name, email, password, age, initialData });
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

app.post('/api/auth/login', (req, res) => {
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

app.get('/api/auth/session', (req, res) => {
  const token = readBearerToken(req);
  const result = db.getSession(token);
  if (!result.ok) {
    return res.status(result.status || 401).json({ error: result.error });
  }
  return res.json({ ok: true, user: result.user, data: result.data });
});

app.post('/api/auth/logout', (req, res) => {
  const token = readBearerToken(req);
  db.logoutSession(token);
  return res.json({ ok: true });
});

app.get('/api/user/data', (req, res) => {
  const token = readBearerToken(req);
  const result = db.getSession(token);
  if (!result.ok) {
    return res.status(result.status || 401).json({ error: result.error });
  }
  return res.json({ user: result.user, data: result.data });
});

app.put('/api/user/data', (req, res) => {
  const token = readBearerToken(req);
  const payload = req.body?.data && typeof req.body.data === 'object' ? req.body.data : req.body;
  const result = db.updateUserData(token, payload);
  if (!result.ok) {
    return res.status(result.status || 401).json({ error: result.error });
  }
  return res.json({ ok: true, data: result.data });
});

// --- Chef Text Chat (Economic R$ 0 Mode by default) ---
app.post('/api/chat', async (req, res) => {
  const allowPaidAi = String(process.env.FERVEC_ALLOW_PAID_AI || '').trim().toLowerCase() === 'true';
  const apiKey = process.env.GEMINI_API_KEY;
  const { systemInstruction = '', messages = [], roleId = 'chef-tutor', model = '' } = req.body || {};
  const role = getChatRole(roleId);
  const cleaned = sanitizeChatHistory(messages, 20);
  const contents = cleaned.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  if (contents.length === 0) {
    return res.status(400).json({ error: 'Mensagem vazia.' });
  }

  if (!allowPaidAi || !apiKey) {
    return res.json({
      content:
        'Chef CREMONESE (Modo Econômico R$ 0): No preparo das massas italianas clássicas, controle a temperatura fora do fogo direto ao emulsionar com a água rica em amido e siga as proporções da ficha técnica do módulo em estudo.',
      model: 'fervec-programado-r0',
      mode: 'local_programmed',
      roleId: role.id,
    });
  }

  try {
    const chosenModel = ALLOWED_CHAT_MODELS.has(model) ? model : role.model;
    const fallbackModel = chosenModel === 'gemini-4-hydrogen' ? 'gemini-3.1-flash-lite' : 'gemini-4-hydrogen';
    const ai = createAiClient(apiKey);
    const finalInstruction = String(systemInstruction || role.instruction || '').trim();
    const candidates = [chosenModel, fallbackModel];
    let response = null;
    let activeModel = chosenModel;
    let lastErr = null;

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
  } catch (err) {
    console.error('[API /api/chat error]', err);
    const status = Number(err?.status) >= 400 && Number(err?.status) < 600 ? Number(err.status) : 500;
    return res.status(status).json({
      error: err?.message || 'Falha ao consultar o Chefe.',
    });
  }
});

// --- Natural Male Neural Text-to-Speech (pt-BR) ---
app.post('/api/tts', async (req, res) => {
  try {
    const cleanText = String(req.body?.text || '')
      .replace(/[*_`#>~]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 1200);
    if (!cleanText) {
      return res.status(400).json({ error: 'Texto vazio para leitura em voz.' });
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
      console.warn('[API /api/tts neural fallback]', neuralErr?.message || neuralErr);
    }

    const allowPaidExternalTts =
      String(process.env.FERVEC_ALLOW_PAID_AI || '').trim().toLowerCase() === 'true' &&
      String(process.env.FERVEC_ALLOW_EXTERNAL_TTS || '').trim().toLowerCase() === 'true';
    const apiKey = process.env.GEMINI_API_KEY;
    if (!allowPaidExternalTts || !apiKey) {
      return res.status(503).json({
        fallback: 'browser_speech',
        error: 'Síntese neural externa desativada; utilize a voz do navegador.',
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
              },
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
      error: 'Falha ao gerar áudio do Chefe.',
    });
  }
});

app.use('/vendor/maplibre-gl', express.static(path.join(__dirname, 'node_modules/maplibre-gl/dist')));
app.use('/src/assets/images', express.static(path.join(__dirname, 'src/assets/images')));
const aistudioStatic = express.static(path.join(__dirname, 'public/assets/aistudio'));
app.use('/assets/aistudio', (req, res, next) => {
  if (!AISTUDIO_PUBLIC_ALLOW_RE.test(req.path)) {
    return res.status(404).end();
  }
  aistudioStatic(req, res, next);
});
app.use('/assets', express.static(path.join(__dirname, 'public/assets')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/lib', express.static(path.join(__dirname, 'lib')));
app.get('/styles.css', (_req, res) => {
  res.sendFile(path.join(__dirname, 'styles.css'));
});
app.get('/app.js', (_req, res) => {
  res.sendFile(path.join(__dirname, 'app.js'));
});
app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

const server = http.createServer(app);
server.listen(PORT, HOST, () => {
  console.log(`FerveC Gastronomia server listening on http://${HOST}:${PORT}`);
});
