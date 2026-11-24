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
      const result = await websim.textToSpeech({ text, voice: 'pt-male', generateFile: true });
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

  // Browser speechSynthesis fallback when WebSim TTS is not available
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = 'pt-BR';
      utter.volume = volume;
      utter.onstart = () => onStatus('playing');
      utter.onend = () => onStatus('ended');
      utter.onerror = () => onStatus('unavailable');
      window.speechSynthesis.speak(utter);
      onStatus('playing');
      return;
    } catch {
      // ignore
    }
  }

  onStatus('unavailable');
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
