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

export type ChefMaleGeminiVoiceId = 'Antonio' | 'Brian' | 'Giuseppe' | 'Andrew';

export interface ChefMaleVoicePreset {
  id: ChefMaleGeminiVoiceId;
  voiceURI: string;
  name: string;
  lang: string;
  profileLabel: string;
  ttsStyle: string;
  defaultRate: number;
  defaultPitch: number;
}

export const CHEF_MALE_VOICE_PRESETS: readonly ChefMaleVoicePreset[] = [
  {
    id: 'Antonio',
    voiceURI: 'neural:Antonio',
    name: 'Chef Antonio — Brasileira Firme e Natural',
    lang: 'pt-BR',
    profileLabel: 'Chef Homem · Brasileira, firme e natural',
    ttsStyle: 'Voz masculina brasileira neural natural, firme, clara e fluida.',
    defaultRate: 1.0,
    defaultPitch: 0.98,
  },
  {
    id: 'Brian',
    voiceURI: 'neural:Brian',
    name: 'Chef Brian — Masculina Forte e Grave',
    lang: 'pt-BR',
    profileLabel: 'Chef Homem · Forte, grave e segura',
    ttsStyle: 'Voz masculina neural forte, grave, firme e natural em português.',
    defaultRate: 1.0,
    defaultPitch: 0.94,
  },
  {
    id: 'Giuseppe',
    voiceURI: 'neural:Giuseppe',
    name: 'Chef Giuseppe — Masculina Expressiva e Firme',
    lang: 'pt-BR',
    profileLabel: 'Chef Homem · Expressiva, firme e calorosa',
    ttsStyle: 'Voz masculina neural firme, expressiva e calorosa explicando receitas.',
    defaultRate: 1.0,
    defaultPitch: 0.97,
  },
  {
    id: 'Andrew',
    voiceURI: 'neural:Andrew',
    name: 'Chef Andrew — Masculina Serena e Natural',
    lang: 'pt-BR',
    profileLabel: 'Chef Homem · Serena, fluida e natural',
    ttsStyle: 'Voz masculina neural serena, natural, leve e firme na cozinha.',
    defaultRate: 1.0,
    defaultPitch: 0.98,
  },
] as const;

const FEMALE_VOICE_NAME_REGEX =
  /\b(kore|zephyr|aoede|leda|autonoe|callirrhoe|despina|erinome|laomedeia|pulcherrima|vindemiatrix|sulafat|francisca|thalita|vitoria|vitória|camila|luciana|raquel|joana|maria|ana|fernanda|leticia|letícia|juliana|patricia|patrícia|helga|eliane|sandra|marcia|márcia|beatriz|carla|claudia|cláudia|helena|amanda|laura|gabriela|lara|sofia|ines|inês|female|feminina|mulher)\b|google português do brasil|google portugues do brasil/i;

const ROBOTIC_VOICE_NAME_REGEX = /\b(espeak|compact|robot|robô|android tts|festival|flite)\b/i;

export function isFemalePtBrVoiceName(nameOrUri: string): boolean {
  return FEMALE_VOICE_NAME_REGEX.test(String(nameOrUri || '').toLowerCase());
}

export function extractGeminiVoiceId(voiceUriOrId: string): ChefMaleGeminiVoiceId | null {
  const raw = String(voiceUriOrId || '').trim();
  const normalized = raw.replace(/^(neural:|gemini:)/i, '');
  const found = CHEF_MALE_VOICE_PRESETS.find((v) => v.id === normalized);
  return found ? found.id : null;
}

export function getChefMaleVoicePreset(voiceUriOrId: string): ChefMaleVoicePreset {
  const id = extractGeminiVoiceId(voiceUriOrId);
  return CHEF_MALE_VOICE_PRESETS.find((v) => v.id === id) || CHEF_MALE_VOICE_PRESETS[0];
}

export const DEFAULT_CHEF_VOICE_CONFIG: ChefVoiceProfileConfig = {
  voiceUri: CHEF_MALE_VOICE_PRESETS[0].voiceURI,
  voiceName: CHEF_MALE_VOICE_PRESETS[0].name,
  rate: CHEF_MALE_VOICE_PRESETS[0].defaultRate,
  pitch: CHEF_MALE_VOICE_PRESETS[0].defaultPitch,
  volume: 0.9,
  profileLabel: CHEF_MALE_VOICE_PRESETS[0].profileLabel,
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
    const rawUri = typeof raw.voiceUri === 'string' ? raw.voiceUri.trim() : '';
    const rawName = typeof raw.voiceName === 'string' ? raw.voiceName.trim() : '';
    const presetMatch = extractGeminiVoiceId(rawUri);
    const isFemaleOrLegacy =
      !rawUri || !presetMatch || isFemalePtBrVoiceName(rawUri) || isFemalePtBrVoiceName(rawName);
    const safePreset = isFemaleOrLegacy ? CHEF_MALE_VOICE_PRESETS[0] : getChefMaleVoicePreset(presetMatch);

    return {
      voiceUri: safePreset.voiceURI,
      voiceName: safePreset.name,
      rate: Number.isFinite(rate)
        ? Math.max(0.7, Math.min(1.3, isFemaleOrLegacy ? safePreset.defaultRate : rate))
        : safePreset.defaultRate,
      pitch: Number.isFinite(pitch)
        ? Math.max(0.75, Math.min(1.2, isFemaleOrLegacy ? safePreset.defaultPitch : pitch))
        : safePreset.defaultPitch,
      volume: Number.isFinite(volume) ? Math.max(0, Math.min(1, volume)) : DEFAULT_CHEF_VOICE_CONFIG.volume,
      profileLabel: safePreset.profileLabel,
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
  const mergedUri =
    typeof patch.voiceUri === 'string' ? patch.voiceUri.trim() : current.voiceUri;
  const mergedName =
    typeof patch.voiceName === 'string' ? patch.voiceName.trim() : current.voiceName;
  const presetMatch = extractGeminiVoiceId(mergedUri);
  const safePreset =
    !mergedUri || !presetMatch || isFemalePtBrVoiceName(mergedUri) || isFemalePtBrVoiceName(mergedName)
      ? CHEF_MALE_VOICE_PRESETS[0]
      : getChefMaleVoicePreset(presetMatch);

  const next: ChefVoiceProfileConfig = {
    ...current,
    ...patch,
    voiceUri: safePreset.voiceURI,
    voiceName: safePreset.name,
    profileLabel: safePreset.profileLabel,
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
  const malePtVoices = voices.filter((v) => {
    const lang = String(v?.lang || '').toLowerCase();
    const name = String(v?.name || '');
    const uri = String(v?.voiceURI || '');
    if (!lang.startsWith('pt')) return false;
    if (isFemalePtBrVoiceName(name) || isFemalePtBrVoiceName(uri)) return false;
    if (ROBOTIC_VOICE_NAME_REGEX.test(name) || ROBOTIC_VOICE_NAME_REGEX.test(uri)) return false;
    return true;
  });
  const score = (v: T): number => {
    const name = String(v?.name || '').toLowerCase();
    const lang = String(v?.lang || '').toLowerCase();
    let s = 0;
    if (lang === 'pt-br' || lang === 'pt_br') s += 45;
    if (/natural|neural|online|wavenet|studio/.test(name)) s += 38;
    if (
      /\b(antonio|daniel|ricardo|fabio|fábio|julio|júlio|henrique|thiago|marcos|bruno|rafael|lucas|mateus|felipe|gabriel|gustavo|leonardo|rodrigo|eduardo|andre|andré|carlos|paulo|pedro|fernando|joao|joão|marcelo|male|masculin[oa])\b/.test(
        name
      )
    ) {
      s += 36;
    }
    if (/microsoft/.test(name)) s += 16;
    if (/google/.test(name)) s += 14;
    if (v?.localService === false) s += 8;
    if (v?.default) s += 3;
    return s;
  };
  return malePtVoices.slice().sort((a, b) => score(b) - score(a));
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
