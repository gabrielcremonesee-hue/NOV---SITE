import http from 'http';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer } from 'ws';
import { GoogleGenAI, Modality } from '@google/genai';
import { getChatRole, sanitizeChatHistory } from './lib/chat.js';
import { createDatabase } from './lib/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;
const HOST = '0.0.0.0';
const ALLOWED_CHAT_MODELS = new Set(['gemini-4-hydrogen', 'gemini-3.1-flash-lite']);
const ALLOWED_LIVE_VOICES = new Set(['Zephyr', 'Kore', 'Puck', 'Charon', 'Fenrir']);
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

app.use(express.json({ limit: '4mb' }));

// --- Server-Side Persistent Database Endpoints (Auth + User Data) ---
app.post('/api/auth/register', (req, res) => {
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

// --- Gemini AI Text Chat with Transient Retry & Model Fallback ---
app.post('/api/chat', async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(503).json({
      error: 'Serviço de IA indisponível: configure GEMINI_API_KEY no servidor.',
    });
  }

  try {
    const { systemInstruction = '', messages = [], roleId = 'chef-tutor', model = '' } = req.body || {};
    const role = getChatRole(roleId);
    const chosenModel = ALLOWED_CHAT_MODELS.has(model) ? model : role.model;
    const fallbackModel = chosenModel === 'gemini-4-hydrogen' ? 'gemini-3.1-flash-lite' : 'gemini-4-hydrogen';
    const ai = createAiClient(apiKey);

    const cleaned = sanitizeChatHistory(messages, 20);
    const contents = cleaned.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    if (contents.length === 0) {
      return res.status(400).json({ error: 'Mensagem vazia.' });
    }

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

// --- Gemini Text-to-Speech (WAV audio in Brazilian Portuguese) ---
app.post('/api/tts', async (req, res) => {
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
              },
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
  } catch (err) {
    console.error('[API /api/tts error]', err);
    const status = Number(err?.status) >= 400 && Number(err?.status) < 600 ? Number(err.status) : 500;
    return res.status(status).json({
      error: err?.message || 'Falha ao gerar áudio do Chefe.',
    });
  }
});

// --- Gemini Audio Transcription Fallback (pre-recorded browser mic audio) ---
app.post('/api/transcribe', async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(503).json({
      error: 'Serviço de transcrição indisponível: configure GEMINI_API_KEY no servidor.',
    });
  }

  try {
    const audioBase64 = String(req.body?.audioBase64 || '').trim();
    const mimeType = String(req.body?.mimeType || 'audio/webm').split(';')[0].trim() || 'audio/webm';
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
  } catch (err) {
    console.error('[API /api/transcribe error]', err);
    const status = Number(err?.status) >= 400 && Number(err?.status) < 600 ? Number(err.status) : 500;
    return res.status(status).json({
      error: err?.message || 'Falha ao transcrever sua fala.',
    });
  }
});

app.use('/vendor/maplibre-gl', express.static(path.join(__dirname, 'node_modules/maplibre-gl/dist')));
app.use('/src/assets/images', express.static(path.join(__dirname, 'src/assets/images')));
app.use('/assets/aistudio', express.static(path.join(__dirname, 'public/assets/aistudio')));
app.use('/assets', express.static(path.join(__dirname, 'assets')));
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
const wss = new WebSocketServer({ noServer: true });

server.on('upgrade', (request, socket, head) => {
  try {
    const parsedUrl = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);
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

wss.on('connection', async (clientWs, _request, parsedUrl) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    clientWs.send(JSON.stringify({ error: 'Serviço de voz indisponível: configure GEMINI_API_KEY no servidor.' }));
    clientWs.close();
    return;
  }

  let session = null;
  let sessionReady = false;
  const queryVoice = parsedUrl?.searchParams?.get('voice') || 'Kore';

  async function initLiveSession(voiceName, systemInstruction) {
    if (session || sessionReady) return;
    sessionReady = true;
    const chosenVoice = ALLOWED_LIVE_VOICES.has(voiceName) ? voiceName : 'Kore';
    const ai = createAiClient(apiKey);
    const voiceStyle =
      ' Fale sempre em português do Brasil com tom leve, simpático, natural e acolhedor, como um chef dialogando lado a lado na cozinha — evite frases robóticas, listas longas ou tom rígido.';
    const baseInstruction = systemInstruction
      ? `${systemInstruction}${voiceStyle}`
      : 'Você é o Chef Instrutor de Voz da FerveC Gastronomia, em português do Brasil. Ajude o usuário a preparar massa italiana fresca, responder dúvidas rápidas na bancada e sugerir molhos com naturalidade, calor humano e frases curtas que fluem bem em voz alta.' +
        voiceStyle;

    try {
      session = await ai.live.connect({
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
              clientWs.send(JSON.stringify({ inputTranscript: content.inputTranscription.text }));
            }
            if (content?.outputTranscription?.text) {
              clientWs.send(JSON.stringify({ outputTranscript: content.outputTranscription.text }));
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
              clientWs.send(JSON.stringify({ error: err?.message || 'Erro na sessão Gemini Live.' }));
            }
          },
          onclose: () => {
            if (clientWs.readyState === clientWs.OPEN) {
              clientWs.close();
            }
          },
        },
      });
      if (clientWs.readyState === clientWs.OPEN) {
        clientWs.send(JSON.stringify({ ready: true, voice: chosenVoice, model: 'gemini-3.8-live' }));
      }
    } catch (err) {
      console.error('[Live API connect error]', err);
      if (clientWs.readyState === clientWs.OPEN) {
        clientWs.send(JSON.stringify({ error: err?.message || 'Não foi possível iniciar a conversa por voz com Gemini Live.' }));
        clientWs.close();
      }
    }
  }

  const fallbackTimer = setTimeout(() => {
    if (!sessionReady && clientWs.readyState === clientWs.OPEN) {
      initLiveSession(queryVoice, '');
    }
  }, 500);

  clientWs.on('message', async (raw) => {
    let msg;
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
      } catch {}
      session = null;
    }
  });
});

server.listen(PORT, HOST, () => {
  console.log(`FerveC Gastronomia server listening on http://${HOST}:${PORT}`);
});
