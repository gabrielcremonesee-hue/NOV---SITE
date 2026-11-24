import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ALL_MODULE_KEYS,
  PASSING_SCORE_PERCENT,
  computeCourseWorkloadLabel,
  formatWorkloadFromMinutes,
  getModuleQuestions,
  gradeAssessment,
  resolveCourseWorkload,
} from './assessments';

test('gradeAssessment preserves 70% passing threshold for all modules', () => {
  assert.equal(PASSING_SCORE_PERCENT, 70);

  for (const modKey of ALL_MODULE_KEYS) {
    const bank = getModuleQuestions(modKey, 'exam');
    assert.ok(bank && bank.length === 8, `Expected 8 exam questions for ${modKey}`);

    // 6 of 8 correct = 75% >= 70% -> approved
    const answersPass = bank.map((q, idx) => (idx < 6 ? q.correct : (q.correct + 1) % 4));
    const resPass = gradeAssessment(modKey, 'exam', answersPass);
    assert.equal(resPass.ok, true);
    assert.equal(resPass.score, 75);
    assert.equal(resPass.passed, true);

    // 5 of 8 correct = 63% < 70% -> not approved
    const answersFail = bank.map((q, idx) => (idx < 5 ? q.correct : (q.correct + 1) % 4));
    const resFail = gradeAssessment(modKey, 'exam', answersFail);
    assert.equal(resFail.ok, true);
    assert.equal(resFail.score, 63);
    assert.equal(resFail.passed, false);
  }
});

test('gradeAssessment rejects incomplete or out-of-range answers', () => {
  const incomplete = gradeAssessment('carbonara', 'exam', [0, 1, 2]);
  assert.equal(incomplete.ok, false);

  const invalidChoice = gradeAssessment('carbonara', 'exam', [0, 0, 0, 0, 0, 0, 0, 99]);
  assert.equal(invalidChoice.ok, false);

  const invalidModule = gradeAssessment('unknown', 'exam', [0, 0, 0, 0, 0, 0, 0, 0]);
  assert.equal(invalidModule.ok, false);
});

test('formatWorkloadFromMinutes and computeCourseWorkloadLabel convert exact minutes without undue rounding', () => {
  assert.equal(formatWorkloadFromMinutes(120), '2 horas');
  assert.equal(formatWorkloadFromMinutes(180), '3 horas');
  assert.equal(formatWorkloadFromMinutes(240), '4 horas');
  assert.equal(formatWorkloadFromMinutes(90), '1 hora e 30 minutos');
  assert.equal(formatWorkloadFromMinutes(60), '1 hora');
  assert.equal(formatWorkloadFromMinutes(45), '45 minutos');

  const dbDurations = ['25–30 min', '25–35 min', '30–40 min', '20–30 min', '90–120 min', '20–30 min'];
  assert.equal(computeCourseWorkloadLabel(dbDurations), '4 horas e 8 minutos');
  assert.equal(computeCourseWorkloadLabel(['45 min']), '45 minutos');
  assert.equal(computeCourseWorkloadLabel(['1 hora']), '1 hora');
});

test('resolveCourseWorkload prioritizes course/module explicit estimated_minutes over duration labels', () => {
  const fromCourse = resolveCourseWorkload({
    courseRecord: { estimated_minutes: 90 },
    modules: [{ duration_label: '30 min' }],
  });
  assert.equal(fromCourse.totalMinutes, 90);
  assert.equal(fromCourse.workloadLabel, '1 hora e 30 minutos');

  const fromModules = resolveCourseWorkload({
    courseRecord: {},
    modules: [{ estimated_minutes: 60 }, { estimated_minutes: 60 }],
  });
  assert.equal(fromModules.totalMinutes, 120);
  assert.equal(fromModules.workloadLabel, '2 horas');
});
