export function escHtml(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return map[ch] || ch;
  });
}

export function computeStepProgressPct(doneCount: number, totalSteps: number): number {
  if (!Number.isFinite(totalSteps) || totalSteps <= 0) return 0;
  const safeDone = Number.isFinite(doneCount) ? Math.max(0, doneCount) : 0;
  return Math.max(0, Math.min(100, Math.round((safeDone / totalSteps) * 100)));
}

export function shouldUseWineHeader(route: string): boolean {
  return route === 'wine' || route === 'category-vinicola';
}

export function renderOlhoDoChefCard(quote: string, speaker = 'Chef Cremonese.'): string {
  return `<section class="cockpit-chef-eye-box" aria-label="Olho do Chef">
    <div class="cockpit-chef-eye-rivets" aria-hidden="true">
      <i class="wood-stud"></i>
      <i class="wood-stud"></i>
    </div>
    <div class="cockpit-chef-eye-inner">
      <div class="cockpit-chef-eye-icon" aria-hidden="true">
        <svg viewBox="0 0 40 40">
          <path d="M9.5 23.5h21v6a2 2 0 0 1-2 2h-17a2 2 0 0 1-2-2v-6Z" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linejoin="round"/>
          <path d="M9.5 23.5a6 6 0 0 1-2-11.5 7 7 0 0 1 13.8-2.2 6.6 6.6 0 0 1 8.8 6.1 5.6 5.6 0 0 1-3.3 7.6" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M14.5 23.5v4.5M20 23.5v4.5M25.5 23.5v4.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
        </svg>
      </div>
      <div class="cockpit-chef-eye-copy">
        <strong>OLHO DO CHEF</strong>
        <p>${escHtml(quote)}</p>
        <small>${escHtml(speaker)}</small>
      </div>
      <span class="cockpit-chef-eye-check" aria-hidden="true">
        <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="11" fill="#3a6b29"/><path d="m7.2 12.4 3.2 3.2 6.6-6.8" fill="none" stroke="#fffaf0" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </span>
    </div>
  </section>`;
}

export interface ReviewTechniqueCardInput {
  title: string;
  description: string;
  image: string;
  detailAction: string;
  detailAttrName?: string;
  detailAttrValue?: string;
  modalTitle?: string;
  modalCopy?: string;
}

export interface ReviewErrorCardInput {
  text: string;
  image: string;
  detailAction: string;
  detailAttrName?: string;
  detailAttrValue?: string;
  modalTitle?: string;
  modalCopy?: string;
}

export interface UnifiedReviewRenderOptions {
  moduleId: string;
  moduleTitle: string;
  chefTip: string;
  isCompleteSteps: boolean;
  reviewDone: boolean;
  heroPhoto?: string;
  heroAlt?: string;
  techniques: ReviewTechniqueCardInput[];
  errors: ReviewErrorCardInput[];
  completeAction: string;
  examCtaAction?: string;
  canStartExam: boolean;
  blockedExamText?: string;
}

export function renderUnifiedReviewSection(opts: UnifiedReviewRenderOptions): string {
  const {
    moduleId,
    moduleTitle,
    chefTip,
    isCompleteSteps,
    reviewDone,
    heroPhoto,
    heroAlt,
    techniques,
    errors,
    completeAction,
    examCtaAction,
    canStartExam,
    blockedExamText,
  } = opts;

  const ribbonIcon =
    moduleId === 'carbonara' || moduleId === 'alfredo'
      ? `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 14.5h11v4a1 1 0 0 1-1 1h-9a1 1 0 0 1-1-1v-4Z" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M6.5 14.5a3.8 3.8 0 0 1-1.3-7.3 4.5 4.5 0 0 1 8.8-1.4 4.2 4.2 0 0 1 5.6 3.9 3.6 3.6 0 0 1-2.1 4.8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`
      : moduleId === 'ragù'
        ? `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 4h11a1 1 0 0 1 1 1v15.5l-6.5-4.2-6.5 4.2V5a1 1 0 0 1 1-1Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>`
        : `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H12v17H6.5A2.5 2.5 0 0 0 4 22zM20 5.5A2.5 2.5 0 0 0 17.5 3H12v17h5.5A2.5 2.5 0 0 1 20 22z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>`;

  const headingTitle =
    moduleId === 'carbonara'
      ? 'Revisão do módulo • Uma olhadinha antes da prova.'
      : `Revisão do módulo • ${moduleTitle}`;

  return `<section class="review-page review-unified-page" data-testid="module-review-section">
    <div class="review-banner-card">
      <span class="review-ribbon-bookmark" aria-hidden="true">${ribbonIcon}</span>
      <div class="review-banner-copy">
        <h2>${escHtml(headingTitle)}</h2>
        <p>${escHtml(chefTip)}</p>
      </div>
      <span class="review-status-pill ${reviewDone ? 'is-done' : isCompleteSteps ? 'is-ready' : 'is-progress'}">
        <i aria-hidden="true">✓</i>
        <span>${reviewDone ? 'Revisão concluída' : isCompleteSteps ? 'Etapas concluídas' : 'Em andamento'}</span>
      </span>
    </div>

    ${
      heroPhoto
        ? `<div class="review-wide-hero">
            <img src="${escHtml(heroPhoto)}" alt="${escHtml(heroAlt || moduleTitle)}">
          </div>`
        : ''
    }

    <div class="review-photo-grid">
      ${techniques
        .map((t, i) => {
          const num = String(i + 1).padStart(2, '0');
          const dataAttrs = t.detailAttrName
            ? `data-${escHtml(t.detailAttrName)}="${escHtml(t.detailAttrValue || '')}"`
            : `data-title="${escHtml(t.modalTitle || t.title)}" data-copy="${escHtml(t.modalCopy || t.description)}"`;
          return `<button type="button" class="review-photo-card" data-action="${escHtml(t.detailAction)}" ${dataAttrs}>
            <img class="review-photo-bg" src="${escHtml(t.image)}" alt="" aria-hidden="true">
            <span class="review-photo-shade" aria-hidden="true"></span>
            <div class="review-photo-content">
              <span class="review-gold-num">${num}</span>
              <h3>${escHtml(t.title)}</h3>
              <p>${escHtml(t.description)}</p>
            </div>
            <span class="review-arrow-circle" aria-hidden="true">→</span>
          </button>`;
        })
        .join('')}
    </div>

    <div class="review-errors-block">
      <div class="review-errors-heading">
        <span class="review-heading-bar" aria-hidden="true"></span>
        <h3>Erros comuns e correções</h3>
      </div>
      <div class="review-errors-grid">
        ${errors
          .map((err) => {
            const dataAttrs = err.detailAttrName
              ? `data-${escHtml(err.detailAttrName)}="${escHtml(err.detailAttrValue || '')}"`
              : `data-title="${escHtml(err.modalTitle || 'Erro comum e correção')}" data-copy="${escHtml(err.modalCopy || err.text)}"`;
            return `<button type="button" class="review-error-card" data-action="${escHtml(err.detailAction)}" ${dataAttrs}>
              <div class="review-error-thumb">
                <img src="${escHtml(err.image)}" alt="" aria-hidden="true">
              </div>
              <div class="review-error-copy">
                <p><span class="review-warn-icon" aria-hidden="true"><svg viewBox="0 0 20 18"><path d="M10 1.4 18.8 16.5H1.2Z" fill="#b81820"/><path d="M10 6.8v4.8" stroke="#fffaf0" stroke-width="1.9" stroke-linecap="round"/><circle cx="10" cy="13.8" r="1.1" fill="#fffaf0"/></svg></span>${escHtml(err.text)}</p>
                <span class="review-error-cta">Toque para revisar →</span>
              </div>
            </button>`;
          })
          .join('')}
      </div>
    </div>

    <div class="review-bottom-actions">
      ${
        reviewDone
          ? canStartExam && examCtaAction
            ? `<button type="button" class="btn btn-red review-gold-done-btn" data-action="${escHtml(examCtaAction)}">Ir para a prova →</button>`
            : `<div class="review-done-confirm-pill"><span>✓</span> Revisão concluída! ${escHtml(blockedExamText || 'Conclua todas as etapas da aula para liberar a prova.')}</div>`
          : `<button type="button" class="review-gold-pill-btn" data-action="${escHtml(completeAction)}">
              <span class="review-pill-check" aria-hidden="true">✓</span>
              <span>Marcar revisão concluída</span>
            </button>`
      }
    </div>
  </section>`;
}

export interface UnifiedTrabalhoRenderOptions {
  currentIndex: number;
  totalQuestions: number;
  questionText: string;
  options: string[];
  selectedAnswer: number | null | undefined;
  correctIndex: number;
  explanation: string;
  chefTip: string;
  answerAction: string;
  answerModeAttr?: string;
  nextAction: string;
  backAction?: string;
  showNavButtons?: boolean;
}

export function renderUnifiedTrabalhoSection(opts: UnifiedTrabalhoRenderOptions): string {
  const {
    currentIndex,
    totalQuestions,
    questionText,
    options,
    selectedAnswer,
    correctIndex,
    explanation,
    chefTip,
    answerAction,
    answerModeAttr,
    nextAction,
    backAction,
    showNavButtons = false,
  } = opts;

  const pct = totalQuestions > 0 ? Math.round((currentIndex / totalQuestions) * 100) : 0;
  const hasAnswer = selectedAnswer !== null && selectedAnswer !== undefined;
  const modeAttr = answerModeAttr ? `data-mode="${escHtml(answerModeAttr)}"` : '';

  return `<section class="quiz-wrap trabalho-unified-wrap" data-testid="module-work-section">
    <div class="quiz-heading trabalho-heading">
      <span class="eyebrow">TRABALHO · APRENDA BRINCANDO</span>
      <h2>Vamos ver o que ficou?</h2>
      <p>Uma pergunta de cada vez. E o Chef explica junto com você.</p>
    </div>

    <div class="quiz-progress trabalho-progress">
      <div class="progress-track"><span style="width:${pct}%"></span></div>
      <span>Pergunta ${currentIndex + 1} de ${totalQuestions}</span>
    </div>

    <article class="quiz-card trabalho-quiz-card">
      <span class="trabalho-gold-rule" aria-hidden="true"></span>
      <p class="question-number">PERGUNTA ${currentIndex + 1}</p>
      <h3>${escHtml(questionText)}</h3>

      <div class="answer-list">
        ${options
          .map((optText, i) => {
            const isPicked = selectedAnswer === i;
            const statusClass = hasAnswer
              ? i === correctIndex
                ? 'answer-good'
                : isPicked
                  ? 'answer-bad'
                  : 'muted'
              : '';
            return `<button type="button" class="answer-option ${isPicked ? 'picked ' : ''}${statusClass}" data-action="${escHtml(answerAction)}" ${modeAttr} data-answer="${i}" ${hasAnswer && !answerModeAttr ? 'disabled' : ''}>
              <span class="option-letter">${String.fromCharCode(65 + i)}</span>
              <span>${escHtml(optText)}</span>
              ${hasAnswer && i === correctIndex ? '<b>Correta</b>' : ''}
              ${isPicked && i !== correctIndex ? '<b>Sua resposta</b>' : ''}
            </button>`;
          })
          .join('')}
      </div>

      ${
        hasAnswer
          ? `<div class="feedback ${selectedAnswer === correctIndex ? 'feedback-good' : 'feedback-warm'}">
              <strong>${selectedAnswer === correctIndex ? 'Isso mesmo!' : 'Vamos aprender com essa resposta.'}</strong>
              <p>${escHtml(explanation)}</p>
              <span>✳ Dica do Chef: ${escHtml(chefTip)}</span>
            </div>`
          : ''
      }

      ${
        showNavButtons
          ? `<div class="exam-nav-buttons">
              ${
                backAction
                  ? `<button type="button" class="btn btn-outline-dark" data-action="${escHtml(backAction)}" ${modeAttr} ${currentIndex === 0 ? 'disabled' : ''}>← Voltar</button>`
                  : ''
              }
              <button type="button" class="btn btn-red" data-action="${escHtml(nextAction)}" ${modeAttr} ${!hasAnswer ? 'disabled' : ''}>
                ${currentIndex === totalQuestions - 1 ? 'Ver meu resultado' : 'Continuar →'}
              </button>
            </div>`
          : hasAnswer
            ? `<div class="trabalho-continue-wrap">
                <button type="button" class="btn btn-red" data-action="${escHtml(nextAction)}" ${modeAttr}>
                  ${currentIndex === totalQuestions - 1 ? 'Ver meu resultado' : 'Continuar'}
                </button>
              </div>`
            : ''
      }
    </article>
  </section>`;
}
