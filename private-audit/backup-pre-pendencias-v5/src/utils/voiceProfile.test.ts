import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CHEF_MALE_VOICE_PRESETS,
  DEFAULT_CHEF_VOICE_CONFIG,
  VOICE_CONFIG_STORAGE_KEY,
  extractGeminiVoiceId,
  isFemalePtBrVoiceName,
  loadChefVoiceConfig,
  rankChefEducatorPtBrVoices,
  saveChefVoiceConfig,
} from './voiceProfile';

function createMemoryStorage() {
  const map = new Map<string, string>();
  return {
    getItem(key: string) {
      return map.has(key) ? map.get(key)! : null;
    },
    setItem(key: string, val: string) {
      map.set(key, String(val));
    },
    removeItem(key: string) {
      map.delete(key);
    },
    clear() {
      map.clear();
    },
  };
}

test('CHEF_MALE_VOICE_PRESETS exposes exactly 4 natural male Chef voices with no female voices', () => {
  assert.equal(CHEF_MALE_VOICE_PRESETS.length, 4);
  assert.deepEqual(
    CHEF_MALE_VOICE_PRESETS.map((v) => v.id),
    ['Antonio', 'Brian', 'Giuseppe', 'Andrew']
  );
  for (const preset of CHEF_MALE_VOICE_PRESETS) {
    assert.equal(isFemalePtBrVoiceName(preset.id), false);
    assert.equal(isFemalePtBrVoiceName(preset.name), false);
    assert.match(preset.name, /Chef /i);
  }
});

test('extractGeminiVoiceId resolves neural voices and rejects female voices', () => {
  assert.equal(extractGeminiVoiceId('neural:Antonio'), 'Antonio');
  assert.equal(extractGeminiVoiceId('Brian'), 'Brian');
  assert.equal(extractGeminiVoiceId('neural:Giuseppe'), 'Giuseppe');
  assert.equal(extractGeminiVoiceId('Andrew'), 'Andrew');
  assert.equal(extractGeminiVoiceId('gemini:Kore'), null);
  assert.equal(extractGeminiVoiceId('Zephyr'), null);
});

test('rankChefEducatorPtBrVoices removes female and robotic voices and ranks male pt-BR voices', () => {
  const voices = [
    { name: 'Microsoft Francisca Online (Natural) - Portuguese (Brazil)', lang: 'pt-BR', localService: false },
    { name: 'Google português do Brasil', lang: 'pt-BR', localService: false },
    { name: 'eSpeak Portuguese (Brazil)', lang: 'pt-BR', localService: true },
    { name: 'Microsoft Antonio Online (Natural) - Portuguese (Brazil)', lang: 'pt-BR', localService: false },
    { name: 'Microsoft Daniel - Portuguese (Brazil)', lang: 'pt-BR', localService: true },
    { name: 'English US Male', lang: 'en-US', localService: true },
  ];
  const ranked = rankChefEducatorPtBrVoices(voices);
  assert.equal(ranked.length, 2);
  assert.equal(ranked[0]?.name, 'Microsoft Antonio Online (Natural) - Portuguese (Brazil)');
  assert.equal(ranked[1]?.name, 'Microsoft Daniel - Portuguese (Brazil)');
});

test('loadChefVoiceConfig migrates legacy or female saved voice configs to default male Antonio', () => {
  const storage = createMemoryStorage();
  (globalThis as { localStorage?: unknown }).localStorage = storage;

  storage.setItem(
    VOICE_CONFIG_STORAGE_KEY,
    JSON.stringify({
      voiceUri: 'Microsoft Francisca Online',
      voiceName: 'Francisca',
      rate: 0.95,
      pitch: 0.95,
      volume: 0.85,
    })
  );

  const migrated = loadChefVoiceConfig();
  assert.equal(migrated.voiceUri, DEFAULT_CHEF_VOICE_CONFIG.voiceUri);
  assert.equal(migrated.voiceName, DEFAULT_CHEF_VOICE_CONFIG.voiceName);
  assert.equal(migrated.rate, 1.0);

  const saved = saveChefVoiceConfig({ voiceUri: 'neural:Brian' });
  assert.equal(saved.voiceUri, 'neural:Brian');
  assert.equal(saved.voiceName, 'Chef Brian — Masculina Forte e Grave');

  delete (globalThis as { localStorage?: unknown }).localStorage;
});
