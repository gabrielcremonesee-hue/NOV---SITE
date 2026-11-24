export const LIVE_INPUT_SAMPLE_RATE = 16000;
export const LIVE_OUTPUT_SAMPLE_RATE = 24000;
export const LIVE_VOICES = [
  { id: 'Kore', label: 'Kore · Leve e Acolhedora' },
  { id: 'Zephyr', label: 'Zephyr · Natural e Suave' },
  { id: 'Puck', label: 'Puck · Descontraída' },
  { id: 'Charon', label: 'Charon · Serena' },
  { id: 'Fenrir', label: 'Fenrir · Firme' },
];

export function float32ToInt16Pcm(float32) {
  const len = float32 ? float32.length : 0;
  const out = new Int16Array(len);
  for (let i = 0; i < len; i++) {
    const s = Math.max(-1, Math.min(1, Number(float32[i]) || 0));
    out[i] = s < 0 ? Math.round(s * 32768) : Math.round(s * 32767);
  }
  return out;
}

export function int16PcmToFloat32(int16) {
  const len = int16 ? int16.length : 0;
  const out = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const v = int16[i] || 0;
    out[i] = v < 0 ? v / 32768 : v / 32767;
  }
  return out;
}

export function bytesToBase64(bytes) {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    const slice = bytes.subarray(i, i + chunk);
    binary += String.fromCharCode(...slice);
  }
  return btoa(binary);
}

export function base64ToBytes(base64) {
  const binary = atob(base64 || '');
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function int16PcmToBase64(int16) {
  const view = new Uint8Array(int16.buffer, int16.byteOffset, int16.byteLength);
  return bytesToBase64(view);
}

export function base64ToInt16Pcm(base64) {
  const bytes = base64ToBytes(base64);
  const evenLen = bytes.byteLength - (bytes.byteLength % 2);
  const aligned = bytes.slice(0, evenLen);
  return new Int16Array(aligned.buffer);
}

export function computeRmsLevel(samples) {
  if (!samples || samples.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < samples.length; i++) {
    const v = samples[i] || 0;
    sum += v * v;
  }
  return Math.min(1, Math.sqrt(sum / samples.length));
}

export function applyEdgeFade(samples, fadeSamples = 48) {
  if (!samples || samples.length < 4) return samples;
  const out = new Float32Array(samples);
  const n = Math.min(Math.max(1, fadeSamples), Math.floor(out.length / 4));
  for (let i = 0; i < n; i++) {
    const gain = (i + 1) / n;
    out[i] *= gain;
    out[out.length - 1 - i] *= gain;
  }
  return out;
}

export function resampleFloat32(samples, fromRate, toRate = LIVE_INPUT_SAMPLE_RATE) {
  if (!samples || samples.length === 0) return new Float32Array(0);
  const srcRate = Number(fromRate) || toRate;
  const dstRate = Number(toRate) || LIVE_INPUT_SAMPLE_RATE;
  if (srcRate <= 0 || dstRate <= 0 || Math.abs(srcRate - dstRate) < 1) {
    return samples instanceof Float32Array ? samples : new Float32Array(samples);
  }
  const ratio = srcRate / dstRate;
  const outLength = Math.max(1, Math.round(samples.length / ratio));
  const out = new Float32Array(outLength);
  for (let i = 0; i < outLength; i++) {
    const srcPos = i * ratio;
    const idx = Math.floor(srcPos);
    const frac = srcPos - idx;
    const s0 = samples[idx] ?? 0;
    const s1 = samples[Math.min(idx + 1, samples.length - 1)] ?? s0;
    out[i] = s0 + (s1 - s0) * frac;
  }
  return out;
}

export function computeNextScheduleTime({ currentTime, nextStartTime, duration }) {
  const now = Math.max(0, Number(currentTime) || 0);
  const next = Math.max(0, Number(nextStartTime) || 0);
  const dur = Math.max(0, Number(duration) || 0);
  const startAt = Math.max(now, next);
  return {
    startAt,
    nextStartTime: startAt + dur,
  };
}
