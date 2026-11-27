import {
  CHEF_MALE_VOICE_PRESETS,
  ChefVoiceProfileConfig,
  extractGeminiVoiceId,
  getChefMaleVoicePreset,
  loadChefVoiceConfig,
  normalizeCulinarySpeechText,
  rankChefEducatorPtBrVoices,
} from './voiceProfile';

export type AudioStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'ended' | 'unavailable';

export interface SelectableChefVoiceOption {
  voiceURI: string;
  name: string;
  lang: string;
}

let player: HTMLAudioElement | null = null;
let currentText = '';
let currentVoiceKey = '';
let fileUrl = '';
let volume = 0.82;
let playbackSeq = 0;

export function setChefVolume(value: number): void {
  volume = Math.max(0, Math.min(1, Number(value)));
  if (player) player.volume = volume;
}

export function listAvailablePtBrVoices(): SelectableChefVoiceOption[] {
  return CHEF_MALE_VOICE_PRESETS.map((preset) => ({
    voiceURI: preset.voiceURI,
    name: preset.name,
    lang: preset.lang,
  }));
}

export function resolveChefVoiceForSpeech(
  voices: SpeechSynthesisVoice[],
  config: ChefVoiceProfileConfig
): SpeechSynthesisVoice | null {
  if (!Array.isArray(voices) || voices.length === 0) return null;
  const rankedMale = rankChefEducatorPtBrVoices(voices);
  if (config.voiceUri && !config.voiceUri.startsWith('gemini:') && !config.voiceUri.startsWith('neural:')) {
    const exact = rankedMale.find((v) => v.voiceURI === config.voiceUri);
    if (exact) return exact;
  }
  return rankedMale[0] || null;
}

function cleanupPlayerObjectUrl(): void {
  if (fileUrl && fileUrl.startsWith('blob:')) {
    try {
      URL.revokeObjectURL(fileUrl);
    } catch {
      // ignore
    }
  }
  fileUrl = '';
}

export function stopChef(): void {
  playbackSeq += 1;
  if (player) {
    try {
      player.pause();
      player.currentTime = 0;
    } catch {
      // ignore
    }
  }
  player = null;
  currentText = '';
  currentVoiceKey = '';
  cleanupPlayerObjectUrl();
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      // ignore
    }
  }
}

function speakWithBrowserSynthesis(
  rawText: string,
  onStatus: (status: AudioStatus) => void,
  overrideConfig?: Partial<ChefVoiceProfileConfig>,
  respectMuteVolume = true
): boolean {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return false;
  const synth = window.speechSynthesis;
  const cleanText = normalizeCulinarySpeechText(rawText);
  if (!cleanText) return false;

  const baseConfig = loadChefVoiceConfig();
  const cfg: ChefVoiceProfileConfig = { ...baseConfig, ...(overrideConfig || {}) };

  const startUtterance = () => {
    try {
      const available = synth.getVoices() || [];
      const chosen = resolveChefVoiceForSpeech(available, cfg);
      // Nunca usar voz padrão feminina ou robotizada do navegador quando não há voz masculina pt-BR válida
      if (!chosen) {
        onStatus('unavailable');
        return;
      }

      const utter = new SpeechSynthesisUtterance(cleanText);
      utter.voice = chosen;
      utter.lang = chosen.lang || 'pt-BR';
      utter.rate = cfg.rate;
      utter.pitch = cfg.pitch;
      utter.volume = respectMuteVolume
        ? Math.max(0, Math.min(1, volume <= 0.01 ? 0 : cfg.volume * (volume / 0.82)))
        : cfg.volume;

      utter.onstart = () => onStatus('playing');
      utter.onend = () => onStatus('ended');
      utter.onerror = () => onStatus('unavailable');
      synth.speak(utter);
      onStatus('playing');
    } catch {
      onStatus('unavailable');
    }
  };

  try {
    synth.cancel();
    const initialVoices = synth.getVoices();
    if (!initialVoices || initialVoices.length === 0) {
      let spoken = false;
      const onVoices = () => {
        if (spoken) return;
        spoken = true;
        synth.removeEventListener?.('voiceschanged', onVoices);
        startUtterance();
      };
      synth.addEventListener?.('voiceschanged', onVoices);
      setTimeout(() => {
        if (!spoken) {
          spoken = true;
          synth.removeEventListener?.('voiceschanged', onVoices);
          startUtterance();
        }
      }, 180);
    } else {
      startUtterance();
    }
    return true;
  } catch {
    return false;
  }
}

function computeEffectiveAudioVolume(
  cfg: ChefVoiceProfileConfig,
  respectMuteVolume: boolean
): number {
  if (!respectMuteVolume) {
    return Math.max(0, Math.min(1, cfg.volume));
  }
  if (volume <= 0.01) return 0;
  return Math.max(0, Math.min(1, cfg.volume * (volume / 0.82)));
}

function decodeBase64ToWavUrl(audioBase64: string, mimeType = 'audio/mpeg'): string {
  const binary = atob(audioBase64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const blob = new Blob([bytes], { type: mimeType });
  return URL.createObjectURL(blob);
}

async function synthesizeAndPlayGeminiMaleVoice(
  rawText: string,
  onStatus: (status: AudioStatus) => void,
  overrideConfig?: Partial<ChefVoiceProfileConfig>,
  respectMuteVolume = true
): Promise<boolean> {
  if (typeof fetch !== 'function' || typeof Audio === 'undefined') return false;
  const cleanText = normalizeCulinarySpeechText(rawText);
  if (!cleanText) return false;

  const baseConfig = loadChefVoiceConfig();
  const cfg: ChefVoiceProfileConfig = { ...baseConfig, ...(overrideConfig || {}) };
  const maleVoiceId =
    extractGeminiVoiceId(cfg.voiceUri) || getChefMaleVoicePreset(cfg.voiceUri).id;
  const voiceCacheKey = `${maleVoiceId}:${cfg.rate}:${cfg.pitch}`;
  const seq = playbackSeq;

  onStatus('loading');
  try {
    const res = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: cleanText,
        voiceName: maleVoiceId,
        rate: cfg.rate,
        pitch: cfg.pitch,
      }),
    });
    if (seq !== playbackSeq) return true;
    const data = (await res.json().catch(() => ({}))) as {
      audioBase64?: string;
      mimeType?: string;
    };
    if (!res.ok || !data?.audioBase64) {
      return false;
    }

    const mimeType = data.mimeType || 'audio/mpeg';
    const audioUrl = decodeBase64ToWavUrl(data.audioBase64, mimeType);
    if (seq !== playbackSeq) {
      try {
        URL.revokeObjectURL(audioUrl);
      } catch {
        // ignore
      }
      return true;
    }

    cleanupPlayerObjectUrl();
    fileUrl = audioUrl;
    currentText = rawText;
    currentVoiceKey = voiceCacheKey;

    const audio = new Audio(audioUrl);
    audio.volume = computeEffectiveAudioVolume(cfg, respectMuteVolume);
    // O áudio neural (audio/mpeg) já vem sintetizado com velocidade e tom naturais via SSML
    audio.playbackRate = mimeType.includes('mpeg') ? 1 : Math.max(0.75, Math.min(1.25, cfg.rate || 1));
    if ('preservesPitch' in audio) {
      (audio as HTMLAudioElement & { preservesPitch: boolean }).preservesPitch = true;
    }
    audio.onended = () => {
      if (seq === playbackSeq) onStatus('ended');
    };
    audio.onerror = () => {
      if (seq === playbackSeq) onStatus('unavailable');
    };
    player = audio;
    await audio.play();
    if (seq === playbackSeq) onStatus('playing');
    return true;
  } catch {
    return false;
  }
}

export async function playChef(text: string, onStatus: (status: AudioStatus) => void): Promise<void> {
  const cfg = loadChefVoiceConfig();
  const voiceId = extractGeminiVoiceId(cfg.voiceUri) || getChefMaleVoicePreset(cfg.voiceUri).id;
  const voiceCacheKey = `${voiceId}:${cfg.rate}:${cfg.pitch}`;

  if (currentText === text && currentVoiceKey === voiceCacheKey && fileUrl && player) {
    player.currentTime = 0;
    player.volume = computeEffectiveAudioVolume(cfg, true);
    player.playbackRate = Math.max(0.75, Math.min(1.25, cfg.rate || 1));
    try {
      await player.play();
      onStatus('playing');
      return;
    } catch {
      // fall through
    }
  }
  stopChef();
  currentText = text;
  currentVoiceKey = voiceId;

  if (await synthesizeAndPlayGeminiMaleVoice(text, onStatus, cfg, true)) {
    return;
  }

  if (speakWithBrowserSynthesis(text, onStatus, cfg, true)) {
    return;
  }

  onStatus('unavailable');
}

export function previewChefVoice(
  phrase: string,
  overrideConfig: Partial<ChefVoiceProfileConfig>,
  onStatus: (status: AudioStatus) => void
): boolean {
  stopChef();
  void (async () => {
    const playedGemini = await synthesizeAndPlayGeminiMaleVoice(
      phrase,
      onStatus,
      overrideConfig,
      false
    );
    if (!playedGemini) {
      if (!speakWithBrowserSynthesis(phrase, onStatus, overrideConfig, false)) {
        onStatus('unavailable');
      }
    }
  })();
  return true;
}

export function pauseChef(): void {
  if (player && !player.paused) player.pause();
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.pause();
    } catch {
      // ignore
    }
  }
}

export async function resumeChef(): Promise<void> {
  if (player && player.paused) {
    try {
      await player.play();
    } catch {
      // ignore
    }
  }
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.resume();
    } catch {
      // ignore
    }
  }
}

export function chefAudioState(): { paused: boolean; ended: boolean } | null {
  return player ? { paused: player.paused, ended: player.ended } : null;
}
