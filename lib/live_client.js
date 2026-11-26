import {
  LIVE_INPUT_SAMPLE_RATE,
  LIVE_OUTPUT_SAMPLE_RATE,
  float32ToInt16Pcm,
  int16PcmToBase64,
  base64ToInt16Pcm,
  int16PcmToFloat32,
  computeRmsLevel,
  applyEdgeFade,
  resampleFloat32,
  computeNextScheduleTime,
} from './live_audio.js';

export function createLiveVoiceClient({
  onStatus = () => {},
  onTranscript = () => {},
  onLevel = () => {},
  onError = () => {},
} = {}) {
  let ws = null;
  let inputCtx = null;
  let outputCtx = null;
  let mediaStream = null;
  let sourceNode = null;
  let processorNode = null;
  let nextStartTime = 0;
  let activeSources = [];
  let destroyed = false;

  function setStatus(status, detail = '') {
    if (!destroyed) onStatus(status, detail);
  }

  function clearPlaybackQueue() {
    for (const src of activeSources) {
      try {
        src.stop();
        src.disconnect();
      } catch {}
    }
    activeSources = [];
    if (outputCtx) {
      nextStartTime = outputCtx.currentTime;
    } else {
      nextStartTime = 0;
    }
  }

  function schedulePcmOutput(base64Pcm) {
    if (!outputCtx || destroyed) return;
    if (outputCtx.state === 'suspended') {
      outputCtx.resume().catch(() => {});
    }
    const int16 = base64ToInt16Pcm(base64Pcm);
    if (!int16.length) return;
    const rawFloat = int16PcmToFloat32(int16);
    const float32 = applyEdgeFade(rawFloat, 36);
    const buffer = outputCtx.createBuffer(1, float32.length, LIVE_OUTPUT_SAMPLE_RATE);
    buffer.getChannelData(0).set(float32);

    const src = outputCtx.createBufferSource();
    src.buffer = buffer;
    const gain = outputCtx.createGain ? outputCtx.createGain() : null;
    if (gain) {
      gain.gain.value = 0.94;
      src.connect(gain);
      gain.connect(outputCtx.destination);
    } else {
      src.connect(outputCtx.destination);
    }

    const leadBase = nextStartTime <= outputCtx.currentTime ? outputCtx.currentTime + 0.03 : nextStartTime;
    const sched = computeNextScheduleTime({
      currentTime: outputCtx.currentTime,
      nextStartTime: leadBase,
      duration: buffer.duration,
    });
    nextStartTime = sched.nextStartTime;
    activeSources.push(src);
    src.onended = () => {
      activeSources = activeSources.filter((s) => s !== src);
    };
    src.start(sched.startAt);
  }

  async function start({ voiceName = 'Antonio', systemInstruction = '', withMic = true } = {}) {
    await stop();
    destroyed = false;
    setStatus('connecting', 'Conectando ao Gemini Live…');

    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx) {
      outputCtx = new AudioCtx({ sampleRate: LIVE_OUTPUT_SAMPLE_RATE });
    }

    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = new URL(`${proto}//${location.host}/live`);
    url.searchParams.set('voice', voiceName);

    ws = new WebSocket(url.toString());

    await new Promise((resolve, reject) => {
      let settled = false;
      ws.onopen = () => {
        ws.send(JSON.stringify({ type: 'config', voiceName, systemInstruction }));
      };
      ws.onmessage = (event) => {
        let msg;
        try {
          msg = JSON.parse(event.data);
        } catch {
          return;
        }
        if (msg.ready) {
          if (!settled) {
            settled = true;
            resolve();
          }
          setStatus('connected', withMic ? 'Microfone ativo — pode falar com o Chef.' : 'Sessão de voz pronta.');
          return;
        }
        if (msg.error) {
          onError(msg.error);
          if (!settled) {
            settled = true;
            reject(new Error(msg.error));
          }
          return;
        }
        if (msg.audio) {
          schedulePcmOutput(msg.audio);
        }
        if (msg.interrupted) {
          clearPlaybackQueue();
          setStatus('connected', 'Interrompido — ouvindo você.');
        }
        if (msg.inputTranscript) {
          onTranscript('user', msg.inputTranscript);
        }
        if (msg.outputTranscript) {
          onTranscript('assistant', msg.outputTranscript);
        }
        if (msg.turnComplete) {
          setStatus('connected', withMic ? 'Sua vez — pode falar.' : 'Sessão ativa.');
        }
      };
      ws.onerror = () => {
        const err = new Error('Falha na conexão WebSocket com o serviço de voz.');
        if (!settled) {
          settled = true;
          reject(err);
        } else {
          onError(err.message);
        }
      };
      ws.onclose = () => {
        if (!settled) {
          settled = true;
          reject(new Error('Conexão encerrada antes de iniciar a sessão Live.'));
        } else if (!destroyed) {
          setStatus('idle', 'Sessão encerrada.');
        }
      };
    });

    if (withMic && navigator.mediaDevices?.getUserMedia && AudioCtx) {
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            channelCount: 1,
            sampleRate: LIVE_INPUT_SAMPLE_RATE,
            echoCancellation: true,
            noiseSuppression: true,
          },
        });
        inputCtx = new AudioCtx({ sampleRate: LIVE_INPUT_SAMPLE_RATE });
        if (inputCtx.state === 'suspended') {
          await inputCtx.resume().catch(() => {});
        }
        const actualRate = inputCtx.sampleRate || LIVE_INPUT_SAMPLE_RATE;
        sourceNode = inputCtx.createMediaStreamSource(mediaStream);
        processorNode = inputCtx.createScriptProcessor(4096, 1, 1);
        processorNode.onaudioprocess = (e) => {
          if (!ws || ws.readyState !== WebSocket.OPEN) return;
          const rawSamples = e.inputBuffer.getChannelData(0);
          onLevel(computeRmsLevel(rawSamples));
          const samples16k = resampleFloat32(rawSamples, actualRate, LIVE_INPUT_SAMPLE_RATE);
          const pcm = float32ToInt16Pcm(samples16k);
          const base64 = int16PcmToBase64(pcm);
          ws.send(JSON.stringify({ audio: base64 }));
        };
        sourceNode.connect(processorNode);
        processorNode.connect(inputCtx.destination);
      } catch {
        setStatus('connected', 'Microfone indisponível neste dispositivo — use o envio rápido por texto.');
      }
    }
  }

  function sendText(text) {
    const clean = String(text || '').trim();
    if (!clean || !ws || ws.readyState !== WebSocket.OPEN) return false;
    ws.send(JSON.stringify({ text: clean }));
    onTranscript('user', clean);
    return true;
  }

  async function stop() {
    clearPlaybackQueue();
    if (processorNode) {
      try {
        processorNode.disconnect();
        processorNode.onaudioprocess = null;
      } catch {}
      processorNode = null;
    }
    if (sourceNode) {
      try {
        sourceNode.disconnect();
      } catch {}
      sourceNode = null;
    }
    if (mediaStream) {
      mediaStream.getTracks().forEach((t) => t.stop());
      mediaStream = null;
    }
    if (inputCtx) {
      try {
        await inputCtx.close();
      } catch {}
      inputCtx = null;
    }
    if (outputCtx) {
      try {
        await outputCtx.close();
      } catch {}
      outputCtx = null;
    }
    if (ws) {
      try {
        ws.close();
      } catch {}
      ws = null;
    }
    onLevel(0);
    setStatus('idle', 'Sessão encerrada.');
  }

  function destroy() {
    destroyed = true;
    stop().catch(() => {});
  }

  return { start, stop, sendText, destroy };
}
