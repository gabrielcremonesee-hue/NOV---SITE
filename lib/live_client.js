export function createLiveVoiceClient({
  onStatus = () => {},
  onLevel = () => {},
} = {}) {
  let destroyed = false;

  function setStatus(status, detail = '') {
    if (!destroyed) onStatus(status, detail);
  }

  async function start() {
    destroyed = false;
    onLevel(0);
    setStatus(
      'idle',
      'Atendimento por voz em tempo real desativado — use o chat por escrito e a narração masculina do Chef.'
    );
  }

  function sendText() {
    return false;
  }

  async function stop() {
    onLevel(0);
    setStatus('idle', 'Atendimento por escrito ativo.');
  }

  function destroy() {
    destroyed = true;
    onLevel(0);
  }

  return { start, stop, sendText, destroy };
}
