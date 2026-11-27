import test from 'node:test';
import assert from 'node:assert/strict';
import {
  LIVE_VOICES,
  float32ToInt16Pcm,
  int16PcmToFloat32,
  int16PcmToBase64,
  base64ToInt16Pcm,
  computeRmsLevel,
  applyEdgeFade,
  resampleFloat32,
  computeNextScheduleTime,
} from './live_audio.js';

test('float32ToInt16Pcm clamps extremes and round-trips through base64', () => {
  const input = new Float32Array([-1.5, -0.5, 0, 0.5, 1.4]);
  const pcm = float32ToInt16Pcm(input);
  assert.equal(pcm[0], -32768);
  assert.equal(pcm[2], 0);
  assert.equal(pcm[4], 32767);

  const b64 = int16PcmToBase64(pcm);
  const decoded = base64ToInt16Pcm(b64);
  assert.deepEqual(Array.from(decoded), Array.from(pcm));

  const restored = int16PcmToFloat32(decoded);
  assert.ok(Math.abs(restored[1] - -0.5) < 0.001);
  assert.ok(Math.abs(restored[3] - 0.5) < 0.001);
});

test('computeRmsLevel measures normalized signal strength cleanly', () => {
  assert.equal(computeRmsLevel(new Float32Array(0)), 0);
  assert.equal(computeRmsLevel(new Float32Array([0, 0, 0])), 0);
  assert.ok(Math.abs(computeRmsLevel(new Float32Array([0.5, -0.5, 0.5, -0.5])) - 0.5) < 1e-6);
});

test('applyEdgeFade softens chunk boundaries without altering interior samples', () => {
  const input = new Float32Array(20).fill(1);
  const faded = applyEdgeFade(input, 4);
  assert.ok(faded[0] < 0.5);
  assert.ok(faded[19] < 0.5);
  assert.equal(faded[10], 1);
});

test('resampleFloat32 downsamples 48kHz to 16kHz accurately', () => {
  const input = new Float32Array(4800).fill(0.4);
  const resampled = resampleFloat32(input, 48000, 16000);
  assert.equal(resampled.length, 1600);
  assert.ok(Math.abs(resampled[100] - 0.4) < 0.001);

  const passthrough = resampleFloat32(new Float32Array([0.1, 0.2]), 16000, 16000);
  assert.equal(passthrough.length, 2);
});

test('computeNextScheduleTime maintains gapless playback without falling behind currentTime', () => {
  const first = computeNextScheduleTime({ currentTime: 1.2, nextStartTime: 0, duration: 0.25 });
  assert.equal(first.startAt, 1.2);
  assert.equal(first.nextStartTime, 1.45);

  const second = computeNextScheduleTime({ currentTime: 1.3, nextStartTime: first.nextStartTime, duration: 0.25 });
  assert.equal(second.startAt, 1.45);
  assert.equal(second.nextStartTime, 1.7);
});

test('LIVE_VOICES lists 4 natural male voice names and excludes female voices', () => {
  assert.equal(LIVE_VOICES.length, 4);
  assert.deepEqual(
    LIVE_VOICES.map((v) => v.id),
    ['Antonio', 'Brian', 'Giuseppe', 'Andrew']
  );
  assert.equal(LIVE_VOICES.some((v) => v.id === 'Zephyr' || v.id === 'Kore'), false);
});
