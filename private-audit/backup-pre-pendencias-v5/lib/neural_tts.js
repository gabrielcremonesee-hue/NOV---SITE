import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';

export const MALE_NEURAL_VOICES = [
  {
    id: 'Antonio',
    voiceURI: 'neural:Antonio',
    edgeVoice: 'pt-BR-AntonioNeural',
    liveVoice: 'Charon',
    name: 'Chef Antonio — Brasileira Firme e Natural',
    label: 'Chef Antonio · Brasileira Firme e Natural',
    lang: 'pt-BR',
    profileLabel: 'Chef Homem · Brasileira, firme e natural',
    basePitchHz: -4,
    baseRatePct: -2,
    multilingual: false,
  },
  {
    id: 'Brian',
    voiceURI: 'neural:Brian',
    edgeVoice: 'en-US-BrianMultilingualNeural',
    liveVoice: 'Fenrir',
    name: 'Chef Brian — Masculina Forte e Grave',
    label: 'Chef Brian · Masculina Forte e Grave',
    lang: 'pt-BR',
    profileLabel: 'Chef Homem · Forte, grave e segura',
    basePitchHz: -6,
    baseRatePct: -2,
    multilingual: true,
  },
  {
    id: 'Giuseppe',
    voiceURI: 'neural:Giuseppe',
    edgeVoice: 'it-IT-GiuseppeMultilingualNeural',
    liveVoice: 'Orus',
    name: 'Chef Giuseppe — Masculina Expressiva e Firme',
    label: 'Chef Giuseppe · Masculina Expressiva e Firme',
    lang: 'pt-BR',
    profileLabel: 'Chef Homem · Expressiva, firme e calorosa',
    basePitchHz: -4,
    baseRatePct: -2,
    multilingual: true,
  },
  {
    id: 'Andrew',
    voiceURI: 'neural:Andrew',
    edgeVoice: 'en-US-AndrewMultilingualNeural',
    liveVoice: 'Puck',
    name: 'Chef Andrew — Masculina Serena e Natural',
    label: 'Chef Andrew · Masculina Serena e Natural',
    lang: 'pt-BR',
    profileLabel: 'Chef Homem · Serena, fluida e natural',
    basePitchHz: -4,
    baseRatePct: -2,
    multilingual: true,
  },
];

export const DEFAULT_MALE_VOICE_ID = 'Antonio';

export function resolveMaleNeuralVoice(voiceIdOrUri = '') {
  const raw = String(voiceIdOrUri || '').trim();
  const clean = raw.replace(/^(neural:|gemini:)/i, '');
  const byId = MALE_NEURAL_VOICES.find(
    (v) => v.id.toLowerCase() === clean.toLowerCase() || v.liveVoice.toLowerCase() === clean.toLowerCase()
  );
  return byId || MALE_NEURAL_VOICES[0];
}

export function escapeSsmlXml(text = '') {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function buildMaleChefProsody({ voiceId = DEFAULT_MALE_VOICE_ID, rate = 1.0, pitch = 1.0 } = {}) {
  const profile = resolveMaleNeuralVoice(voiceId);
  const safeRateNum = Number.isFinite(Number(rate)) ? Math.min(1.3, Math.max(0.7, Number(rate))) : 1.0;
  const safePitchNum = Number.isFinite(Number(pitch)) ? Math.min(1.2, Math.max(0.75, Number(pitch))) : 1.0;

  const ratePct = Math.round((safeRateNum - 1) * 100) + profile.baseRatePct;
  const pitchHz = Math.round((safePitchNum - 1) * 35) + profile.basePitchHz;
  return {
    rate: `${ratePct >= 0 ? '+' : ''}${ratePct}%`,
    pitch: `${pitchHz >= 0 ? '+' : ''}${pitchHz}Hz`,
  };
}

export async function synthesizeMaleNeuralTts({ text, voiceId = DEFAULT_MALE_VOICE_ID, rate = 1.0, pitch = 1.0 }) {
  const profile = resolveMaleNeuralVoice(voiceId);
  const prosody = buildMaleChefProsody({ voiceId: profile.id, rate, pitch });
  const safeText = escapeSsmlXml(text);
  const tts = new MsEdgeTTS({ connectionTimeoutMs: 10000, synthesisTimeoutMs: 25000 });
  try {
    await tts.setMetadata(profile.edgeVoice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3, {
      voiceLocale: 'pt-BR',
    });
    const { audioStream } = tts.toStream(safeText, prosody);
    const chunks = [];
    for await (const chunk of audioStream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    const audioBuffer = Buffer.concat(chunks);
    if (!audioBuffer.length) {
      throw new Error('Áudio neural vazio.');
    }
    return {
      audioBase64: audioBuffer.toString('base64'),
      mimeType: 'audio/mpeg',
      voice: profile.id,
      voiceLabel: profile.name,
    };
  } finally {
    try {
      tts.close();
    } catch {
      // ignore
    }
  }
}
