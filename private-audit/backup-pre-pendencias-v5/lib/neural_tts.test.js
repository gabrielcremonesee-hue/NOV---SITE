import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MALE_NEURAL_VOICES,
  DEFAULT_MALE_VOICE_ID,
  resolveMaleNeuralVoice,
  buildMaleChefProsody,
  escapeSsmlXml,
} from './neural_tts.js';

test('MALE_NEURAL_VOICES provides 4 distinct natural male voices and zero female voices', () => {
  assert.equal(MALE_NEURAL_VOICES.length, 4);
  assert.deepEqual(
    MALE_NEURAL_VOICES.map((v) => v.id),
    ['Antonio', 'Brian', 'Giuseppe', 'Andrew']
  );
  assert.equal(DEFAULT_MALE_VOICE_ID, 'Antonio');
  for (const v of MALE_NEURAL_VOICES) {
    assert.match(v.edgeVoice, /Neural$/);
    assert.equal(/Francisca|Thalita|Kore|Zephyr|Feminina/i.test(v.name + v.edgeVoice), false);
  }
});

test('resolveMaleNeuralVoice resolves neural:*, gemini:*, and legacy voice IDs cleanly', () => {
  assert.equal(resolveMaleNeuralVoice('neural:Brian').id, 'Brian');
  assert.equal(resolveMaleNeuralVoice('Giuseppe').id, 'Giuseppe');
  assert.equal(resolveMaleNeuralVoice('gemini:Fenrir').id, 'Brian');
  assert.equal(resolveMaleNeuralVoice('Kore').id, 'Antonio');
});

test('buildMaleChefProsody computes firm male pitch/rate offsets and escapeSsmlXml sanitizes text', () => {
  const brian = buildMaleChefProsody({ voiceId: 'Brian', rate: 1.05, pitch: 0.95 });
  assert.equal(brian.rate, '+3%');
  assert.equal(brian.pitch, '-8Hz');

  const ant = buildMaleChefProsody({ voiceId: 'Antonio', rate: 1.0, pitch: 1.0 });
  assert.equal(ant.rate, '-2%');
  assert.equal(ant.pitch, '-4Hz');

  assert.equal(escapeSsmlXml('Azeite & alho < 140°C'), 'Azeite &amp; alho &lt; 140°C');
});
