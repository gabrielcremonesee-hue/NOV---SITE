import {
  ChefVoiceProfileConfig,
  loadChefVoiceConfig,
  normalizeCulinarySpeechText,
  rankChefEducatorPtBrVoices,
} from './voiceProfile';

export type AudioStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'ended' | 'unavailable';

interface WebsimGlobal {
  textToSpeech?: (opts: { text: string; voice: string; generateFile: boolean }) => Promise<{ url?: string }>;
}

let player: HTMLAudioElement | null = null;
let currentText = '';
let fileUrl = '';
let volume = 0.82;

export function setChefVolume(value: number): void {
  volume = Math.max(0, Math.min(1, Number(value)));
  if (player) player.volume = volume;
}

export function listAvailablePtBrVoices(): SpeechSynthesisVoice[] {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return [];
  try {
    const all = window.speechSynthesis.getVoices() || [];
    return rankChefEducatorPtBrVoices(all);
  } catch {
    return [];
  }
}

export function resolveChefVoiceForSpeech(
  voices: SpeechSynthesisVoice[],
  config: ChefVoiceProfileConfig
): SpeechSynthesisVoice | null {
  if (!Array.isArray(voices) || voices.length === 0) return null;
  if (config.voiceUri) {
    const exact = voices.find((v) => v.voiceURI === config.voiceUri);
    if (exact) return exact;
  }
  const ranked = rankChefEducatorPtBrVoices(voices);
  return ranked[0] || voices[0] || null;
}

export function stopChef(): void {
  if (player) {
    player.pause();
    player.currentTime = 0;
  }
  player = null;
  currentText = '';
  fileUrl = '';
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
      const utter = new SpeechSynthesisUtterance(cleanText);
      utter.lang = 'pt-BR';
      utter.rate = cfg.rate;
      utter.pitch = cfg.pitch;
      const effectiveVol = respectMuteVolume && volume <= 0.01 ? 0 : Math.min(1, volume * cfg.volume + (respectMuteVolume ? 0 : 0));
      utter.volume = respectMuteVolume ? Math.max(0, Math.min(1, volume <= 0.01 ? 0 : cfg.volume * (volume / 0.82))) : cfg.volume;
      void effectiveVol;

      const available = synth.getVoices() || [];
      const chosen = resolveChefVoiceForSpeech(available, cfg);
      if (chosen) {
        utter.voice = chosen;
        utter.lang = chosen.lang || 'pt-BR';
      }

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

export async function playChef(text: string, onStatus: (status: AudioStatus) => void): Promise<void> {
  if (currentText === text && fileUrl && player) {
    player.currentTime = 0;
    player.volume = volume;
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

  const websim = (window as Window & { websim?: WebsimGlobal }).websim;
  if (websim && typeof websim.textToSpeech === 'function') {
    onStatus('loading');
    try {
      const normalized = normalizeCulinarySpeechText(text);
      const result = await websim.textToSpeech({ text: normalized, voice: 'pt-male', generateFile: true });
      if (!result || !result.url) throw new Error('Arquivo de voz não retornado.');
      fileUrl = result.url;
      player = new Audio(fileUrl);
      player.volume = volume;
      player.onended = () => onStatus('ended');
      player.onerror = () => onStatus('unavailable');
      await player.play();
      onStatus('playing');
      return;
    } catch {
      player = null;
      fileUrl = '';
    }
  }

  if (speakWithBrowserSynthesis(text, onStatus, undefined, true)) {
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
  return speakWithBrowserSynthesis(phrase, onStatus, overrideConfig, false);
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
