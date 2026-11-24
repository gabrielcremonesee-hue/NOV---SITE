import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeStepProgressPct,
  renderOlhoDoChefCard,
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
  assert.ok(html.includes('data-action="recipe-review-complete"'));
});

test('renderUnifiedTrabalhoSection renders PERGUNTA card and options across modules', () => {
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
  });

  assert.ok(html.includes('TRABALHO · APRENDA BRINCANDO'));
  assert.ok(html.includes('Vamos ver o que ficou?'));
  assert.ok(html.includes('Pergunta 2 de 6'));
  assert.ok(html.includes('PERGUNTA 2'));
  assert.ok(html.includes('Al dente'));
  assert.ok(html.includes('Isso mesmo!'));
});
