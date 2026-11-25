export const VOICE_CONFIG_STORAGE_KEY = 'fervec-voice-config-v1';

export interface ChefVoiceProfileConfig {
  voiceUri: string;
  voiceName: string;
  rate: number;
  pitch: number;
  volume: number;
  profileLabel: string;
  updatedAt: string;
}

export interface ExternalTtsProviderAdapter {
  id: string;
  label: string;
  configured: boolean;
  synthesize?: (text: string, config: ChefVoiceProfileConfig) => Promise<string | null>;
}

export const DEFAULT_CHEF_VOICE_CONFIG: ChefVoiceProfileConfig = {
  voiceUri: '',
  voiceName: 'Chef Educador (pt-BR natural)',
  rate: 0.95,
  pitch: 0.95,
  volume: 0.9,
  profileLabel: 'Chef Professor · Firme e acolhedor',
  updatedAt: new Date(0).toISOString(),
};

export function loadChefVoiceConfig(): ChefVoiceProfileConfig {
  if (typeof localStorage === 'undefined') return { ...DEFAULT_CHEF_VOICE_CONFIG };
  try {
    const raw = JSON.parse(localStorage.getItem(VOICE_CONFIG_STORAGE_KEY) || 'null');
    if (!raw || typeof raw !== 'object') return { ...DEFAULT_CHEF_VOICE_CONFIG };
    const rate = Number(raw.rate);
    const pitch = Number(raw.pitch);
    const volume = Number(raw.volume);
    return {
      voiceUri: typeof raw.voiceUri === 'string' ? raw.voiceUri : '',
      voiceName:
        typeof raw.voiceName === 'string' && raw.voiceName.trim()
          ? raw.voiceName
          : DEFAULT_CHEF_VOICE_CONFIG.voiceName,
      rate: Number.isFinite(rate) ? Math.max(0.7, Math.min(1.3, rate)) : DEFAULT_CHEF_VOICE_CONFIG.rate,
      pitch: Number.isFinite(pitch) ? Math.max(0.75, Math.min(1.2, pitch)) : DEFAULT_CHEF_VOICE_CONFIG.pitch,
      volume: Number.isFinite(volume) ? Math.max(0, Math.min(1, volume)) : DEFAULT_CHEF_VOICE_CONFIG.volume,
      profileLabel:
        typeof raw.profileLabel === 'string' && raw.profileLabel.trim()
          ? raw.profileLabel
          : DEFAULT_CHEF_VOICE_CONFIG.profileLabel,
      updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : new Date().toISOString(),
    };
  } catch {
    return { ...DEFAULT_CHEF_VOICE_CONFIG };
  }
}

export function saveChefVoiceConfig(
  patch: Partial<ChefVoiceProfileConfig>
): ChefVoiceProfileConfig {
  const current = loadChefVoiceConfig();
  const next: ChefVoiceProfileConfig = {
    ...current,
    ...patch,
    rate: Number.isFinite(Number(patch.rate ?? current.rate))
      ? Math.max(0.7, Math.min(1.3, Number(patch.rate ?? current.rate)))
      : current.rate,
    pitch: Number.isFinite(Number(patch.pitch ?? current.pitch))
      ? Math.max(0.75, Math.min(1.2, Number(patch.pitch ?? current.pitch)))
      : current.pitch,
    volume: Number.isFinite(Number(patch.volume ?? current.volume))
      ? Math.max(0, Math.min(1, Number(patch.volume ?? current.volume)))
      : current.volume,
    updatedAt: new Date().toISOString(),
  };
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(VOICE_CONFIG_STORAGE_KEY, JSON.stringify(next));
    }
  } catch {
    // ignore storage limits
  }
  return next;
}

export function rankChefEducatorPtBrVoices<
  T extends { voiceURI?: string; name?: string; lang?: string; localService?: boolean; default?: boolean }
>(voices: T[]): T[] {
  const ptVoices = voices.filter((v) => String(v?.lang || '').toLowerCase().startsWith('pt'));
  const score = (v: T): number => {
    const name = String(v?.name || '').toLowerCase();
    const lang = String(v?.lang || '').toLowerCase();
    let s = 0;
    if (lang === 'pt-br' || lang === 'pt_br') s += 45;
    if (/natural|neural|online|wavenet|studio/.test(name)) s += 38;
    // Male / authoritative warm professor preference first, then natural pt-BR voices
    if (/antonio|daniel|ricardo|fabio|julio|henrique/.test(name)) s += 30;
    if (/google português do brasil|google portugues do brasil/.test(name)) s += 26;
    if (/francisca|thalita|vitoria|camila|luciana/.test(name)) s += 20;
    if (/microsoft/.test(name)) s += 16;
    if (/google/.test(name)) s += 14;
    if (/espeak|compact|robot|android tts/.test(name)) s -= 30;
    if (v?.localService === false) s += 8;
    if (v?.default) s += 3;
    return s;
  };
  return ptVoices.slice().sort((a, b) => score(b) - score(a));
}

export function normalizeCulinarySpeechText(raw: string): string {
  return String(raw || '')
    .replace(/[*_`#>~]+/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\b(\d+)\s*°\s*C\b/gi, '$1 graus Celsius')
    .replace(/\b(\d+)\s*g\b/g, '$1 gramas')
    .replace(/\b(\d+)\s*ml\b/gi, '$1 mililitros')
    .replace(/\b(\d+)\s*min\b/gi, '$1 minutos')
    .replace(/\s*[·—–]\s*/g, ', ')
    .replace(/\s+/g, ' ')
    .trim();
}

export const CHEF_VOICE_TEST_PHRASE =
  'Olá! Eu sou o Chef Cremonese. Observe o ponto do guanciale: 100 gramas dourando em fogo brando, 200 gramas de spaghetti al dente e a água do cozimento para ligar a emulsão com calma.';

export const PHASE_2_EXTERNAL_TTS_ADAPTER: ExternalTtsProviderAdapter = {
  id: 'phase2-neural-tts',
  label: 'Síntese Neural Externa (Fase 2 — aguardando integração)',
  configured: false,
};
