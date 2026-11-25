import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canCompleteModuleWork,
  CourseBlueprint,
  evaluateCourseProgress,
} from './courseProgressEngine';

const sampleCourse: CourseBlueprint = {
  slug: 'massas-italianas',
  title: 'Massas Italianas',
  subtitle: '6 módulos completos',
  available: true,
  modules: [
    {
      id: 'carbonara',
      index: 1,
      title: 'Tipos de Massas',
      recipeTitle: 'Spaghetti alla Carbonara',
      desc: 'Emulsão clássica',
      photo: '/a.jpg',
      duration: '30 min',
      level: 'Inicial',
      totalLessonSteps: 6,
      totalWorkQuestions: 5,
    },
    {
      id: 'alfredo',
      index: 2,
      title: 'Massas Frescas',
      recipeTitle: 'Fettuccine Alfredo',
      desc: 'Emulsão na manteiga',
      photo: '/b.jpg',
      duration: '25 min',
      level: 'Intermediário',
      totalLessonSteps: 6,
      totalWorkQuestions: 6,
      prerequisiteModuleId: 'carbonara',
    },
  ],
};

test('canCompleteModuleWork blocks completion until every mandatory question is answered', () => {
  assert.equal(canCompleteModuleWork(0, 5), false);
  assert.equal(canCompleteModuleWork(4, 5), false);
  assert.equal(canCompleteModuleWork(5, 5), true);
});

test('evaluateCourseProgress dynamically updates percentages, locks, and certificate eligibility across all stages', () => {
  const initial = evaluateCourseProgress(sampleCourse, {});
  assert.equal(initial.overallPct, 0);
  assert.equal(initial.modules[0].status, 'available');
  assert.equal(initial.modules[0].examUnlocked, false);
  assert.equal(initial.modules[1].status, 'locked');
  assert.equal(initial.modules[1].isLocked, true);
  assert.equal(initial.courseCertificateUnlocked, false);

  // Partial progress on module 1 (lesson + review, work still incomplete)
  const partial = evaluateCourseProgress(sampleCourse, {
    carbonara: {
      doneLessonSteps: [0, 1, 2, 3, 4, 5],
      lessonCompleted: true,
      workAnsweredCount: 3,
      workCompleted: true, // should NOT count as completed because only 3/5 answered!
      reviewCompleted: true,
      examPassed: false,
    },
  });
  assert.equal(partial.modules[0].workCompleted, false);
  assert.equal(partial.modules[0].examUnlocked, true);
  assert.equal(partial.modules[0].status, 'in_progress');
  assert.equal(partial.modules[1].isLocked, true);
  assert.ok(partial.overallPct > 0 && partial.overallPct < 100);

  // Full completion of module 1 unlocks module 2 and course certificate
  const mod1Done = evaluateCourseProgress(sampleCourse, {
    carbonara: {
      doneLessonSteps: [0, 1, 2, 3, 4, 5],
      lessonCompleted: true,
      workAnsweredCount: 5,
      workCompleted: true,
      reviewCompleted: true,
      examPassed: true,
      latestExamScore: 88,
    },
  });
  assert.equal(mod1Done.modules[0].status, 'completed');
  assert.equal(mod1Done.modules[0].modulePct, 100);
  assert.equal(mod1Done.modules[0].certificateUnlocked, true);
  assert.equal(mod1Done.modules[1].status, 'available');
  assert.equal(mod1Done.modules[1].isLocked, false);
  assert.equal(mod1Done.courseCertificateUnlocked, true);
  assert.equal(mod1Done.completedModulesCount, 1);
});

test('evaluateCourseProgress generalizes to future/upcoming locked courses cleanly', () => {
  const futureCourse: CourseBlueprint = {
    slug: 'cozinha-japonesa',
    title: 'Cozinha Japonesa',
    subtitle: 'Em breve',
    available: false,
    modules: [
      {
        id: 'dashi',
        index: 1,
        title: 'Caldos e Dashi',
        recipeTitle: 'Dashi Tradicional',
        desc: 'Umami',
        photo: '/c.jpg',
        duration: '20 min',
        level: 'Inicial',
        totalLessonSteps: 4,
        totalWorkQuestions: 4,
      },
    ],
  };
  const evaluated = evaluateCourseProgress(futureCourse, {});
  assert.equal(evaluated.isLocked, true);
  assert.equal(evaluated.lockedModulesCount, 1);
  assert.equal(evaluated.modules[0].status, 'locked');
});
