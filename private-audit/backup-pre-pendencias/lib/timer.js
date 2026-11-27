export function clampNonNegativeInt(value, max = 35999) {
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(max, n);
}

export function parseDurationSeconds(minutes, seconds = 0) {
  const mins = clampNonNegativeInt(minutes, 599);
  const secs = clampNonNegativeInt(seconds, 5999);
  return Math.min(35999, mins * 60 + secs);
}

export function parseRecipeTimeMinutes(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return null;
  const s = timeStr.trim().toLowerCase();
  if (!s) return null;
  const hm = s.match(/(\d+)\s*h(?:\s*(\d+)\s*m(?:in)?)?/);
  if (hm) {
    const hours = Number.parseInt(hm[1], 10);
    const mins = hm[2] ? Number.parseInt(hm[2], 10) : 0;
    const total = hours * 60 + mins;
    return total > 0 && total <= 599 ? total : null;
  }
  const mm = s.match(/(\d+)\s*(?:min|m\b|minutos?)/);
  if (mm) {
    const total = Number.parseInt(mm[1], 10);
    return total > 0 && total <= 599 ? total : null;
  }
  const bare = s.match(/^(\d+)$/);
  if (bare) {
    const total = Number.parseInt(bare[1], 10);
    return total > 0 && total <= 599 ? total : null;
  }
  return null;
}

export function formatCountdown(totalSeconds) {
  const safe = Math.max(0, Math.ceil(Number(totalSeconds) || 0));
  const hrs = Math.floor(safe / 3600);
  const mins = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  const pad = (v) => String(v).padStart(2, '0');
  if (hrs > 0) return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
  return `${pad(mins)}:${pad(secs)}`;
}

export function createTimer({ id, recipeId, label, durationSec, now = Date.now() }) {
  const cleanDuration = Math.max(1, clampNonNegativeInt(durationSec, 35999));
  return {
    id,
    recipeId,
    label: (label || '').trim() || 'Etapa de preparo',
    durationSec: cleanDuration,
    remainingSec: cleanDuration,
    status: 'running',
    endTime: now + cleanDuration * 1000,
  };
}

export function getRemainingSeconds(timer, now = Date.now()) {
  if (!timer) return 0;
  if (timer.status === 'done') return 0;
  if (timer.status === 'running' && typeof timer.endTime === 'number') {
    return Math.max(0, Math.ceil((timer.endTime - now) / 1000));
  }
  return Math.max(0, Math.ceil(timer.remainingSec ?? timer.durationSec ?? 0));
}

export function pauseTimer(timer, now = Date.now()) {
  if (!timer || timer.status !== 'running') return timer;
  const remaining = getRemainingSeconds(timer, now);
  if (remaining <= 0) {
    return { ...timer, remainingSec: 0, status: 'done', endTime: null };
  }
  return { ...timer, remainingSec: remaining, status: 'paused', endTime: null };
}

export function resumeTimer(timer, now = Date.now()) {
  if (!timer || timer.status !== 'paused') return timer;
  const remaining = Math.max(1, Math.ceil(timer.remainingSec || timer.durationSec || 1));
  return {
    ...timer,
    remainingSec: remaining,
    status: 'running',
    endTime: now + remaining * 1000,
  };
}

export function resetTimer(timer) {
  if (!timer) return timer;
  return {
    ...timer,
    remainingSec: timer.durationSec,
    status: 'paused',
    endTime: null,
  };
}

export function tickTimers(timers, now = Date.now()) {
  const newlyCompleted = [];
  const next = (Array.isArray(timers) ? timers : []).map((t) => {
    if (t.status !== 'running') return t;
    const remaining = getRemainingSeconds(t, now);
    if (remaining <= 0) {
      const doneTimer = { ...t, remainingSec: 0, status: 'done', endTime: null };
      newlyCompleted.push(doneTimer);
      return doneTimer;
    }
    return { ...t, remainingSec: remaining };
  });
  return { timers: next, newlyCompleted };
}
