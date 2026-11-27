import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getSpeechRecognitionCtor,
  extractSpeechTranscript,
  shouldAutoSendHandsFree,
  stripForSpeechSynthesis,
  formatSpeechErrorMessage,
  pickPreferredPtBrVoice,
  createSpeechController,
} from './speech.js';

test('getSpeechRecognitionCtor detects standard and webkit SpeechRecognition', () => {
  const MockA = function () {};
  const MockB = function () {};
  assert.equal(getSpeechRecognitionCtor({ SpeechRecognition: MockA }), MockA);
  assert.equal(getSpeechRecognitionCtor({ webkitSpeechRecognition: MockB }), MockB);
  assert.equal(getSpeechRecognitionCtor({}), null);
});

test('extractSpeechTranscript separates final and interim speech segments', () => {
  const event = {
    resultIndex: 1,
    results: [
      Object.assign([{ transcript: 'texto anterior' }], { isFinal: true }),
      Object.assign([{ transcript: 'como deixar a massa' }], { isFinal: true }),
      Object.assign([{ transcript: 'mais elástica' }], { isFinal: false }),
    ],
  };
  const out = extractSpeechTranscript(event, event.resultIndex);
  assert.equal(out.finalText, 'como deixar a massa');
  assert.equal(out.interimText, 'mais elástica');
});

test('shouldAutoSendHandsFree requires meaningful speech text', () => {
  assert.equal(shouldAutoSendHandsFree(''), false);
  assert.equal(shouldAutoSendHandsFree('a'), false);
  assert.equal(shouldAutoSendHandsFree('Qual o ponto da massa?'), true);
});

test('stripForSpeechSynthesis removes markdown formatting cleanly', () => {
  const clean = stripForSpeechSynthesis('**Dica do Chefe:** deixe descansar *30 minutos* [veja página](http://x).');
  assert.equal(clean, 'Dica do Chefe: deixe descansar 30 minutos veja página.');
});

test('formatSpeechErrorMessage translates browser errors to Portuguese', () => {
  assert.match(formatSpeechErrorMessage('not-allowed'), /Permissão de microfone/i);
  assert.match(formatSpeechErrorMessage('no-speech'), /Não captei nenhuma fala/i);
  assert.equal(formatSpeechErrorMessage('aborted'), '');
});

test('pickPreferredPtBrVoice prioritizes natural male pt-BR voices and excludes female and robotic ones', () => {
  const voices = [
    { name: 'English US', lang: 'en-US', default: true },
    { name: 'eSpeak Portuguese', lang: 'pt-BR', localService: true },
    { name: 'Microsoft Francisca Online (Natural) - Portuguese (Brazil)', lang: 'pt-BR', localService: false },
    { name: 'Microsoft Antonio Online (Natural) - Portuguese (Brazil)', lang: 'pt-BR', localService: false },
  ];
  const picked = pickPreferredPtBrVoice(voices);
  assert.equal(picked?.name, 'Microsoft Antonio Online (Natural) - Portuguese (Brazil)');
  assert.equal(
    pickPreferredPtBrVoice([
      { name: 'Microsoft Francisca Online (Natural) - Portuguese (Brazil)', lang: 'pt-BR', localService: false },
    ]),
    null
  );
  assert.equal(pickPreferredPtBrVoice([]), null);
});

test('createSpeechController permanently disables student microphone input', () => {
  let lastError = '';
  const controller = createSpeechController({
    onError: (msg) => {
      lastError = msg;
    },
  });
  assert.equal(controller.isSupported(), false);
  assert.equal(controller.isListening(), false);
  assert.equal(controller.start(), false);
  assert.match(lastError, /microfone desativada/i);
});
