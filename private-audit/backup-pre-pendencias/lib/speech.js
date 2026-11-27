export function getSpeechRecognitionCtor(win = globalThis.window) {
  if (!win) return null;
  return win.SpeechRecognition || win.webkitSpeechRecognition || null;
}

export function extractSpeechTranscript(event, resultIndex = 0) {
  const results = event?.results;
  if (!results || typeof results.length !== 'number') {
    return { finalText: '', interimText: '' };
  }
  const start = Math.max(0, Number(resultIndex ?? event?.resultIndex) || 0);
  const finals = [];
  const interims = [];

  for (let i = start; i < results.length; i++) {
    const res = results[i];
    const transcript = String(res?.[0]?.transcript || '').trim();
    if (!transcript) continue;
    if (res.isFinal) {
      finals.push(transcript);
    } else {
      interims.push(transcript);
    }
  }

  return {
    finalText: finals.join(' ').replace(/\s+/g, ' ').trim(),
    interimText: interims.join(' ').replace(/\s+/g, ' ').trim(),
  };
}

export function shouldAutoSendHandsFree(text = '') {
  return String(text || '').trim().length >= 2;
}

export function stripForSpeechSynthesis(text = '') {
  return String(text || '')
    .replace(/[*_`#>~]+/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

export function formatSpeechErrorMessage(code = '') {
  switch (String(code || '').trim()) {
    case 'not-allowed':
    case 'service-not-allowed':
      return 'Permissão de microfone negada. Libere o microfone no navegador para falar com o Chefe.';
    case 'audio-capture':
      return 'Nenhum microfone encontrado neste dispositivo.';
    case 'no-speech':
      return 'Não captei nenhuma fala. Toque no microfone e tente novamente.';
    case 'network':
      return 'Falha de rede no reconhecimento de voz do navegador.';
    case 'aborted':
      return '';
    default:
      return 'Não foi possível iniciar o reconhecimento de voz neste navegador.';
  }
}

const FEMALE_PTBR_VOICE_REGEX =
  /\b(kore|zephyr|francisca|thalita|vitoria|vitória|camila|luciana|raquel|joana|maria|ana|fernanda|leticia|letícia|juliana|patricia|patrícia|helga|eliane|sandra|marcia|márcia|beatriz|carla|claudia|cláudia|helena|amanda|laura|gabriela|lara|sofia|ines|inês|female|feminina|mulher)\b|google português do brasil|google portugues do brasil/i;

const ROBOTIC_VOICE_REGEX = /\b(espeak|compact|robot|robô|android tts|festival|flite)\b/i;

export function pickPreferredPtBrVoice(voices = []) {
  if (!Array.isArray(voices) || voices.length === 0) return null;
  const ptVoices = voices.filter((v) => {
    const lang = String(v?.lang || '').toLowerCase();
    const name = String(v?.name || '');
    const uri = String(v?.voiceURI || '');
    if (!lang.startsWith('pt')) return false;
    if (FEMALE_PTBR_VOICE_REGEX.test(name) || FEMALE_PTBR_VOICE_REGEX.test(uri)) return false;
    if (ROBOTIC_VOICE_REGEX.test(name) || ROBOTIC_VOICE_REGEX.test(uri)) return false;
    return true;
  });
  if (!ptVoices.length) return null;

  const scoreVoice = (v) => {
    const name = String(v?.name || '').toLowerCase();
    const lang = String(v?.lang || '').toLowerCase();
    let score = 0;
    if (lang === 'pt-br' || lang === 'pt_br') score += 40;
    if (/natural|neural|wavenet|online|studio/.test(name)) score += 35;
    if (/\b(antonio|daniel|ricardo|fabio|fábio|julio|júlio|henrique|thiago|marcos|bruno|rafael|lucas|mateus|felipe|gabriel|gustavo|leonardo|rodrigo|eduardo|male|masculin[oa])\b/.test(name)) score += 36;
    if (/google/.test(name)) score += 16;
    if (/microsoft/.test(name)) score += 14;
    if (v?.localService === false) score += 8;
    if (v?.default) score += 4;
    return score;
  };

  return ptVoices.slice().sort((a, b) => scoreVoice(b) - scoreVoice(a))[0] || null;
}

export function createSpeechController({
  lang = 'pt-BR',
  onListeningChange = () => {},
  onInterim = () => {},
  onFinal = () => {},
  onError = () => {},
} = {}) {
  let recognition = null;
  let listening = false;
  let continuousMode = false;
  let speaking = false;
  let manualStop = false;

  function isSupported() {
    return false;
  }

  function setListening(next) {
    listening = !!next;
    onListeningChange(listening);
  }

  function stopRecognitionInstance() {
    if (recognition) {
      try {
        recognition.onresult = null;
        recognition.onerror = null;
        recognition.onend = null;
        recognition.stop();
      } catch {}
      recognition = null;
    }
    setListening(false);
  }

  function start() {
    manualStop = true;
    continuousMode = false;
    stopRecognitionInstance();
    onInterim('');
    onError('Entrada por microfone desativada. Digite sua dúvida para conversar com o Chefe.');
    return false;
  }

  function stop() {
    manualStop = true;
    continuousMode = false;
    speaking = false;
    stopRecognitionInstance();
    onInterim('');
    if (globalThis.speechSynthesis) {
      try {
        globalThis.speechSynthesis.cancel();
      } catch {}
    }
  }

  function loadSharedVoiceConfig() {
    try {
      const storage = globalThis.localStorage;
      if (!storage || typeof storage.getItem !== 'function') return null;
      const raw = storage.getItem('fervec-voice-config-v1');
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch {
      return null;
    }
  }

  function normalizeCulinaryTtsText(rawText) {
    return stripForSpeechSynthesis(rawText)
      .replace(/(\d+)\s*°\s*C\b/gi, '$1 graus Celsius')
      .replace(/(\d+)\s*min\b/gi, '$1 minutos')
      .replace(/(\d+)\s*ml\b/gi, '$1 mililitros')
      .replace(/(\d+)\s*kg\b/gi, '$1 quilos')
      .replace(/(\d+)\s*cm\b/gi, '$1 centímetros')
      .replace(/(\d+)\s*g\b/gi, '$1 gramas')
      .replace(/(\d+)\s*l\b/gi, '$1 litros')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function speakResponse(text) {
    const clean = normalizeCulinaryTtsText(text);
    const synth = globalThis.window?.speechSynthesis;
    if (!clean || !synth || typeof globalThis.SpeechSynthesisUtterance !== 'function') {
      return false;
    }
    try {
      synth.cancel();
      const cfg = loadSharedVoiceConfig();
      const rateNum = Number(cfg?.rate);
      const pitchNum = Number(cfg?.pitch);
      const volumeNum = Number(cfg?.volume);

      const utter = new globalThis.SpeechSynthesisUtterance(clean);
      utter.lang = lang;
      utter.rate = Number.isFinite(rateNum) ? Math.min(1.4, Math.max(0.7, rateNum)) : 0.94;
      utter.pitch = Number.isFinite(pitchNum) ? Math.min(1.4, Math.max(0.7, pitchNum)) : 0.96;
      utter.volume = Number.isFinite(volumeNum) ? Math.min(1, Math.max(0.2, volumeNum)) : 1;

      const voices = typeof synth.getVoices === 'function' ? synth.getVoices() : [];
      const preferredMale = pickPreferredPtBrVoice(voices);
      const configuredVoice =
        cfg?.voiceUri && !String(cfg.voiceUri).startsWith('neural:') && !String(cfg.voiceUri).startsWith('gemini:')
          ? voices.find((v) => v?.voiceURI === cfg.voiceUri)
          : null;
      const chosenVoice =
        configuredVoice && !FEMALE_PTBR_VOICE_REGEX.test(configuredVoice.name || '') && !ROBOTIC_VOICE_REGEX.test(configuredVoice.name || '')
          ? configuredVoice
          : preferredMale;
      if (!chosenVoice) {
        return false;
      }
      utter.voice = chosenVoice;

      speaking = true;
      if (listening) {
        stopRecognitionInstance();
      }
      utter.onend = () => {
        speaking = false;
      };
      utter.onerror = () => {
        speaking = false;
      };
      synth.speak(utter);
      return true;
    } catch {
      speaking = false;
      return false;
    }
  }

  return {
    isSupported,
    isListening: () => false,
    start,
    stop,
    speakResponse,
  };
}
