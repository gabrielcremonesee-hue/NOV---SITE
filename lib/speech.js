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

export function pickPreferredPtBrVoice(voices = []) {
  if (!Array.isArray(voices) || voices.length === 0) return null;
  const ptVoices = voices.filter((v) => String(v?.lang || '').toLowerCase().startsWith('pt'));
  if (!ptVoices.length) return null;

  const scoreVoice = (v) => {
    const name = String(v?.name || '').toLowerCase();
    const lang = String(v?.lang || '').toLowerCase();
    let score = 0;
    if (lang === 'pt-br' || lang === 'pt_br') score += 40;
    if (/natural|neural|wavenet|online/.test(name)) score += 35;
    if (/google português do brasil|google portugues do brasil/.test(name)) score += 32;
    if (/francisca|thalita|antonio|raquel|luciana|joana|vitoria|camila/.test(name)) score += 26;
    if (/google/.test(name)) score += 16;
    if (/microsoft/.test(name)) score += 14;
    if (/espeak|compact|robot/.test(name)) score -= 25;
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
    return !!getSpeechRecognitionCtor();
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

  function start({ handsFree = false } = {}) {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      onError('Seu navegador não suporta ditado por voz (SpeechRecognition). Use Chrome ou Edge, ou digite sua pergunta.');
      return false;
    }
    if (speaking && globalThis.speechSynthesis) {
      try {
        globalThis.speechSynthesis.cancel();
      } catch {}
      speaking = false;
    }

    stopRecognitionInstance();
    continuousMode = !!handsFree;
    manualStop = false;

    const rec = new Ctor();
    rec.lang = lang;
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    rec.continuous = continuousMode;

    rec.onresult = (event) => {
      const { finalText, interimText } = extractSpeechTranscript(event, event.resultIndex || 0);
      if (interimText) {
        onInterim(interimText);
      }
      if (finalText) {
        onInterim('');
        onFinal(finalText, { handsFree: continuousMode });
      }
    };

    rec.onerror = (event) => {
      const msg = formatSpeechErrorMessage(event?.error);
      if (msg) {
        if (event?.error === 'not-allowed' || event?.error === 'service-not-allowed' || event?.error === 'audio-capture') {
          manualStop = true;
          continuousMode = false;
        }
        onError(msg);
      }
    };

    rec.onend = () => {
      recognition = null;
      if (continuousMode && !manualStop && !speaking) {
        try {
          start({ handsFree: true });
          return;
        } catch {}
      }
      setListening(false);
      onInterim('');
    };

    try {
      recognition = rec;
      rec.start();
      setListening(true);
      return true;
    } catch {
      recognition = null;
      setListening(false);
      onError('Não foi possível ativar o microfone agora.');
      return false;
    }
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

  function speakResponse(text, { resumeHandsFree = false } = {}) {
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
      const configuredVoice = cfg?.voiceUri ? voices.find((v) => v?.voiceURI === cfg.voiceUri) : null;
      const chosenVoice = configuredVoice || pickPreferredPtBrVoice(voices);
      if (chosenVoice) {
        utter.voice = chosenVoice;
      }

      speaking = true;
      if (listening) {
        stopRecognitionInstance();
      }
      utter.onend = () => {
        speaking = false;
        if (resumeHandsFree && !manualStop) {
          start({ handsFree: true });
        }
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
    isListening: () => listening,
    start,
    stop,
    speakResponse,
  };
}
