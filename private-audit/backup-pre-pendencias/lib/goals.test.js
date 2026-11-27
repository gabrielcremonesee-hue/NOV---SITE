import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeDailyState,
  incrementDailyGoal,
  toggleDailyGoal,
  addDailyGoal,
  removeDailyGoal,
  getDailyGoalsSummary,
  getCircularProgressMetrics,
  recipesToCsv,
} from './goals.js';

test('normalizeDailyState seeds defaults and resets progress on a new day while preserving streak from yesterday', () => {
  const day1 = normalizeDailyState(null, '2026-11-18');
  assert.equal(day1.goals.length, 3);
  assert.equal(day1.streak, 0);

  let s = day1;
  for (const g of s.goals) {
    s = toggleDailyGoal(s, g.id, '2026-11-18');
  }
  assert.equal(s.streak, 1);
  assert.equal(s.lastCompletedDate, '2026-11-18');

  const day2 = normalizeDailyState(s, '2026-11-19');
  assert.equal(day2.date, '2026-11-19');
  assert.equal(day2.streak, 1);
  assert.ok(day2.goals.every((g) => g.current === 0));

  const skippedDay = normalizeDailyState(s, '2026-11-21');
  assert.equal(skippedDay.streak, 0);
});

test('incrementDailyGoal and toggleDailyGoal update summary and consecutive day streak', () => {
  let s = normalizeDailyState(null, '2026-11-19');
  s = incrementDailyGoal(s, 'goal-read', 2, '2026-11-19');
  assert.equal(s.goals[0].current, 2);
  s = incrementDailyGoal(s, 'goal-read', 5, '2026-11-19');
  assert.equal(s.goals[0].current, 3);

  let summary = getDailyGoalsSummary(s, '2026-11-19');
  assert.equal(summary.completed, 1);
  assert.equal(summary.pct, 33);
  assert.equal(summary.allDone, false);

  s = toggleDailyGoal(s, 'goal-practice', '2026-11-19');
  s = toggleDailyGoal(s, 'goal-note', '2026-11-19');
  summary = getDailyGoalsSummary(s, '2026-11-19');
  assert.equal(summary.completed, 3);
  assert.equal(summary.pct, 100);
  assert.equal(summary.streak, 1);
  assert.equal(summary.allDone, true);

  // Toggling off and back on same day should not double-increment streak
  s = toggleDailyGoal(s, 'goal-note', '2026-11-19');
  s = toggleDailyGoal(s, 'goal-note', '2026-11-19');
  assert.equal(s.streak, 1);
});

test('addDailyGoal and removeDailyGoal manage custom goals safely', () => {
  let s = normalizeDailyState(null, '2026-11-19');
  s = addDailyGoal(s, { id: 'custom-1', title: 'Sovar massa por 10 minutos', target: 2, unit: 'blocos' }, '2026-11-19');
  assert.equal(s.goals.length, 4);
  assert.equal(s.goals[3].title, 'Sovar massa por 10 minutos');
  assert.equal(s.goals[3].target, 2);

  s = removeDailyGoal(s, 'custom-1', '2026-11-19');
  assert.equal(s.goals.length, 3);
});

test('getCircularProgressMetrics calculates SVG circumference, dashOffset, and clamping accurately', () => {
  const zero = getCircularProgressMetrics(0, 26);
  assert.equal(zero.pct, 0);
  assert.equal(zero.isComplete, false);
  assert.equal(zero.dashOffset, zero.circumference);

  const third = getCircularProgressMetrics(33, 26);
  assert.equal(third.pct, 33);
  assert.equal(third.isComplete, false);
  assert.ok(third.dashOffset > 0 && third.dashOffset < third.circumference);

  const full = getCircularProgressMetrics(100, 26);
  assert.equal(full.pct, 100);
  assert.equal(full.isComplete, true);
  assert.equal(full.dashOffset, 0);

  const clampedOver = getCircularProgressMetrics(145, 26);
  assert.equal(clampedOver.pct, 100);
  assert.equal(clampedOver.dashOffset, 0);

  const clampedUnder = getCircularProgressMetrics(-12, 26);
  assert.equal(clampedUnder.pct, 0);
  assert.equal(clampedUnder.dashOffset, clampedUnder.circumference);
});

test('recipesToCsv exports semicolon-delimited UTF-8 BOM rows for Excel', () => {
  const csv = recipesToCsv(
    [
      {
        id: 'rec-1',
        name: 'Carbonara Clássica',
        description: 'Espaguete com ovos, queijo e pancetta.',
        servings: '4',
        time: '20 min',
        favorite: true,
        ingredients: ['Espaguete', 'Ovos'],
      },
    ],
    ['rec-1']
  );
  assert.ok(csv.startsWith('\uFEFFNome;Descrição;Porções;'));
  assert.ok(csv.includes('Carbonara Clássica;"Espaguete com ovos, queijo e pancetta.";4;20 min;Sim;Sim;Espaguete | Ovos'));
});
