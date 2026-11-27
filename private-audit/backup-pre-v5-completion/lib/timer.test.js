import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseDurationSeconds,
  parseRecipeTimeMinutes,
  formatCountdown,
  createTimer,
  getRemainingSeconds,
  pauseTimer,
  resumeTimer,
  resetTimer,
  tickTimers,
} from './timer.js';

test('parseDurationSeconds combines minutes and seconds safely', () => {
  assert.equal(parseDurationSeconds(5, 30), 330);
  assert.equal(parseDurationSeconds(0, 45), 45);
  assert.equal(parseDurationSeconds(-2, 10), 10);
  assert.equal(parseDurationSeconds('abc', '15'), 15);
});

test('parseRecipeTimeMinutes extracts minutes from recipe time strings', () => {
  assert.equal(parseRecipeTimeMinutes('30 min'), 30);
  assert.equal(parseRecipeTimeMinutes('1h 20min'), 80);
  assert.equal(parseRecipeTimeMinutes('2h'), 120);
  assert.equal(parseRecipeTimeMinutes('15'), 15);
  assert.equal(parseRecipeTimeMinutes('a gosto'), null);
});

test('formatCountdown formats MM:SS and HH:MM:SS', () => {
  assert.equal(formatCountdown(0), '00:00');
  assert.equal(formatCountdown(5), '00:05');
  assert.equal(formatCountdown(125), '02:05');
  assert.equal(formatCountdown(3665), '01:01:05');
});

test('create, pause, resume, reset, and complete timer lifecycle', () => {
  const t0 = 1000000;
  const timer = createTimer({
    id: 't1',
    recipeId: 'r1',
    label: 'Cozinhar tagliatelle',
    durationSec: 120,
    now: t0,
  });

  assert.equal(timer.status, 'running');
  assert.equal(getRemainingSeconds(timer, t0 + 30000), 90);

  const paused = pauseTimer(timer, t0 + 30000);
  assert.equal(paused.status, 'paused');
  assert.equal(paused.remainingSec, 90);
  assert.equal(getRemainingSeconds(paused, t0 + 60000), 90);

  const resumed = resumeTimer(paused, t0 + 60000);
  assert.equal(resumed.status, 'running');
  assert.equal(getRemainingSeconds(resumed, t0 + 75000), 75);

  const reset = resetTimer(resumed);
  assert.equal(reset.status, 'paused');
  assert.equal(reset.remainingSec, 120);

  const { timers, newlyCompleted } = tickTimers([resumed], t0 + 150000);
  assert.equal(timers[0].status, 'done');
  assert.equal(timers[0].remainingSec, 0);
  assert.equal(newlyCompleted.length, 1);
  assert.equal(newlyCompleted[0].id, 't1');
});
