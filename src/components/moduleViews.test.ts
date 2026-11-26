import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeStepProgressPct,
  renderLessonProgressStrip,
  renderModuleStageNotificationBanner,
  renderOlhoDoChefCard,
  renderStandardCompletionAction,
  renderUnifiedReviewSection,
  renderUnifiedTrabalhoSection,
  shouldUseWineHeader,
} from './moduleViews';

test('computeStepProgressPct calculates clamped integer percentage cleanly', () => {
  assert.equal(computeStepProgressPct(0, 6), 0);
  assert.equal(computeStepProgressPct(4, 6), 67);
  assert.equal(computeStepProgressPct(6, 6), 100);
  assert.equal(computeStepProgressPct(8, 6), 100);
  assert.equal(computeStepProgressPct(-2, 6), 0);
  assert.equal(computeStepProgressPct(2, 0), 0);
});

test('shouldUseWineHeader returns true only on wine routes', () => {
  assert.equal(shouldUseWineHeader('wine'), true);
  assert.equal(shouldUseWineHeader('category-vinicola'), true);
  assert.equal(shouldUseWineHeader('home'), false);
  assert.equal(shouldUseWineHeader('sales'), false);
  assert.equal(shouldUseWineHeader('lesson'), false);
});

test('renderOlhoDoChefCard renders riveted card with escaped copy', () => {
  const html = renderOlhoDoChefCard('Observe <a textura> & cor.', 'Chef Cremonese.');
  assert.ok(html.includes('OLHO DO CHEF'));
  assert.ok(html.includes('&lt;a textura&gt; &amp; cor.'));
  assert.ok(html.includes('Chef Cremonese.'));
});

test('renderUnifiedReviewSection produces uniform numbered cards & errors across modules', () => {
  const html = renderUnifiedReviewSection({
    moduleId: 'alfredo',
    moduleTitle: 'Fettuccine Alfredo',
    chefTip: 'Controle o calor com cuidado.',
    isCompleteSteps: false,
    reviewDone: false,
    techniques: [
      {
        title: 'Emulsificação',
        description: 'Toque para abrir o resumo da técnica.',
        image: '/assets/pasta.jpg',
        detailAction: 'recipe-review-detail',
      },
    ],
    errors: [
      {
        text: 'Molho oleoso: ajustar com água.',
        image: '/assets/pasta.jpg',
        detailAction: 'recipe-review-detail',
      },
    ],
    completeAction: 'recipe-review-complete',
    canStartExam: false,
  });

  assert.ok(html.includes('Revisão do módulo • Fettuccine Alfredo'));
  assert.ok(html.includes('Em andamento'));
  assert.ok(html.includes('01'));
  assert.ok(html.includes('Erros comuns e correções'));
  assert.ok(html.includes('Molho oleoso: ajustar com água.'));
  assert.ok(html.includes('Marcar revisão como concluída'));
  assert.ok(html.includes('data-action="recipe-review-complete"'));
});

test('renderUnifiedTrabalhoSection renders PERGUNTA card and disabled work completion when incomplete', () => {
  const html = renderUnifiedTrabalhoSection({
    currentIndex: 1,
    totalQuestions: 6,
    questionText: 'Qual o ponto correto da massa?',
    options: ['Al dente', 'Mole', 'Crua', 'Frita'],
    selectedAnswer: 0,
    correctIndex: 0,
    explanation: 'Al dente mantém firmeza leve ao morder.',
    chefTip: 'Prove antes de escorrer.',
    answerAction: 'recipe-answer',
    answerModeAttr: 'work',
    nextAction: 'recipe-question-next',
    backAction: 'recipe-question-back',
    showNavButtons: true,
    answeredCount: 2,
    completeAction: 'recipe-work-mark-complete',
    canCompleteWork: false,
  });

  assert.ok(html.includes('TRABALHO · APRENDA BRINCANDO'));
  assert.ok(html.includes('Vamos ver o que ficou?'));
  assert.ok(html.includes('Pergunta 2 de 6'));
  assert.ok(html.includes('PERGUNTA 2'));
  assert.ok(html.includes('Al dente'));
  assert.ok(html.includes('Isso mesmo!'));
  assert.ok(html.includes('Marcar trabalho como concluído'));
  assert.ok(html.includes('disabled aria-disabled="true"'));
});

test('renderModuleStageNotificationBanner and renderStandardCompletionAction reflect Concluído state', () => {
  const banner = renderModuleStageNotificationBanner({
    iconType: 'lesson',
    title: 'Aula · Carbonara',
    description: 'Etapas concluídas.',
    isDone: true,
  });
  const action = renderStandardCompletionAction({
    isDone: true,
    buttonLabel: 'Marcar aula como concluída',
    actionName: 'lesson-mark-complete',
    doneText: 'Aula concluída com sucesso!',
  });

  assert.ok(banner.includes('Concluído'));
  assert.ok(banner.includes('is-done'));
  assert.ok(action.includes('Aula concluída com sucesso!'));
});

test('renderLessonProgressStrip places Aula prática banner below progress meta and above ingredients wood rack', () => {
  const banner = renderModuleStageNotificationBanner({
    iconType: 'lesson',
    title: 'Aula prática • Fettuccine Alfredo',
    description: 'Etapa 1 de 6: Mise en place',
    isDone: false,
    progressLabel: 'Em andamento',
  });
  const html = renderLessonProgressStrip({
    pctDone: 17,
    doneCount: 1,
    total: 6,
    nextStep: { tag: 'Manteiga' },
    currentIndex: 0,
    doneIndices: [0],
    steps: [
      { tag: 'Mise', photo: '/assets/step1.jpg' },
      { tag: 'Manteiga', photo: '/assets/step2.jpg' },
    ],
    onStepAction: 'recipe-step',
    lessonBannerHtml: banner,
  });

  const progressIdx = html.indexOf('SEU PROGRESSO NESTA AULA');
  const bannerIdx = html.indexOf('Aula prática • Fettuccine Alfredo');
  const statusIdx = html.indexOf('Em andamento');
  const rackIdx = html.indexOf('class="cockpit-wood-rack"');

  assert.ok(progressIdx !== -1);
  assert.ok(bannerIdx > progressIdx);
  assert.ok(statusIdx > bannerIdx);
  assert.ok(rackIdx > statusIdx);
});
