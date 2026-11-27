import {
  course,
  introText,
  ingredients,
  stages,
  questions,
  exam,
  reviewItems,
  carbonaraTechSheet,
  TechnicalSheet,
} from './data/courseData';
import { extraRecipes, ExtraRecipe } from './data/recipesData';
import {
  getIngredientsForModuleStage,
  INGREDIENTS_CATALOG,
  IngredientItem,
} from './data/ingredientsCatalog';
import {
  loadProgress,
  saveProgress,
  clearProgress,
  isMicroDone,
  setMicroDone,
  setActiveProgressScope,
  CourseState,
  RecipeProgressEntry,
} from './utils/progress';
import {
  ASSESSMENT_BANK_VERSION,
  computeCourseWorkloadLabel,
  formatBrDate,
  gradeAssessment,
  PASSING_SCORE_PERCENT,
  recipeQuestionSet,
  type QuestionAttemptSnapshot,
} from './data/assessments';
import {
  playChef,
  pauseChef,
  resumeChef,
  stopChef,
  setChefVolume,
  AudioStatus,
} from './utils/audio';
import { MEDIA } from './data/mediaAssets';
import { getStageIcon } from './data/stepIcons';
import { renderCreateProfilePage } from './components/createProfileView';
import {
  calculateAge,
  clearProfile,
  digitsOnly,
  formatBirthDate,
  formatCpf,
  formatDdd,
  formatPhone,
  loadProfile,
  ProfileFormValues,
  ProfileValidationErrors,
  saveProfile,
  StoredUserProfile,
  validateCpf,
  validateEmail,
  validateProfileForm,
} from './utils/profile';
import {
  initSupabaseRuntimeConfig,
  isSupabaseConfigured,
} from './utils/supabase/client';
import {
  fetchCurrentSupabaseProfile,
  registerOrUpdateSupabaseProfile,
  resendSupabaseSignupConfirmation,
  signInSupabaseAccount,
  signOutSupabaseAccount,
  subscribeSupabaseAuthChanges,
  verifySupabaseSignupCode,
} from './utils/supabase/profileSync';
import {
  downloadCertificatePdfBlob,
  fetchWorkspaceState,
  hydrateCourseStateFromWorkspace,
  issueOrFetchCertificate,
  ServerCertificateRecord,
  submitAssessmentToServer,
  syncModuleProgressToServer,
  WorkspaceHydrationResponse,
} from './utils/supabase/courseSync';
import { pushToast, toast, ToastVariant } from './utils/toast';
import {
  AsaasChargeResponsePayment,
  CardBillingMode,
  CheckoutBillingType,
  CheckoutCustomerPayload,
  CoursePaymentSummary,
  createDefaultCoursePaymentSummary,
  fetchCoursePaymentSummary,
  fetchOrderPaymentStatus,
  getPaymentCheckoutState,
  mapAsaasStatusToUiStatus,
  PaymentCheckoutState,
  PaymentMethodChoice,
  PaymentUiStatus,
  requestAsaasChargeCheckout,
  subscribePaymentCheckout,
} from './utils/paymentCheckout';
import { renderPaymentsPage } from './components/paymentsView';
import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import AsaasConnectionAuditPanel, { clearAsaasAuditCache } from './components/AsaasConnectionAuditPanel';
import GlobalErrorBoundary from './components/GlobalErrorBoundary';
import { installGlobalErrorHandlers, reportAppError } from './utils/errorReporter';
import { switchEnvironment } from './portal/envController';
import {
  computeStepProgressPct,
  renderLessonProgressStrip,
  renderModuleStageNotificationBanner,
  renderOlhoDoChefCard,
  renderStandardCompletionAction,
  renderUnifiedReviewSection,
  renderUnifiedTrabalhoSection,
  ReviewErrorCardInput,
  ReviewTechniqueCardInput,
} from './components/moduleViews';
import {
  PHASE_1_OFFLINE_ONLY,
  SUPABASE_CONNECTED,
} from './config/integrationPhase';
import {
  applyCouponDiscount,
  CouponRecord,
  DEFAULT_COUPON_VALIDITY_DAYS,
  generateUniqueSixDigitCode,
  normalizeCouponCode,
  validateCouponForCourse,
} from './utils/coupons';
import {
  canCompleteModuleWork,
  CourseBlueprint,
  EvaluatedCourseProgress,
  evaluateCourseProgress,
  ModuleRuntimeProgress,
} from './utils/courseProgressEngine';
import {
  authenticateUnifiedProvisional,
  createProvisionalCoupon,
  grantProvisionalCourseEntitlement,
  hasProvisionalCourseEntitlement,
  isPhase1AdminPreviewEnabled,
  listProvisionalActivities,
  listProvisionalCoupons,
  listProvisionalDemoOrders,
  listUnifiedAccounts,
  recordProvisionalCouponRedemption,
  saveProvisionalDemoOrder,
  setPhase1AdminPreviewEnabled,
  toggleProvisionalCouponActive,
  upsertUnifiedAccountFromProfile,
} from './services/provisionalStore';
import {
  CHEF_VOICE_TEST_PHRASE,
  DEFAULT_CHEF_VOICE_CONFIG,
  getChefMaleVoicePreset,
  loadChefVoiceConfig,
  saveChefVoiceConfig,
} from './utils/voiceProfile';
import {
  AdminAssessmentAttemptView,
  AdminCouponDraftView,
  AdminTabId,
  renderAdminDashboard,
} from './components/adminView';
import { AppliedPaymentCouponView } from './components/paymentsView';
import { listAvailablePtBrVoices, previewChefVoice } from './utils/audio';
import { createStoredProfile } from './utils/profile';

interface WineProfile {
  id: string;
  name: string;
  cardTitle?: string;
  origin: string;
  country: string;
  shelfCountry?: string;
  cardOrigin?: string;
  cardGrapes?: string;
  cardNotes?: string;
  kind: string;
  category: 'tintos' | 'brancos' | 'roses' | 'espumantes';
  bottleImage: string;
  glassImage: string;
  grapes: string;
  body: string;
  temperature: string;
  aromas: string;
  taste: string;
  pairing: string;
  note: string;
}

const wineProfiles: WineProfile[] = [
  {
    id: 'malbec',
    name: 'Malbec',
    origin: 'Argentina · perfil típico',
    country: 'Argentina',
    shelfCountry: 'Chile',
    kind: 'Tinto',
    category: 'tintos',
    bottleImage: '/assets/wine-bottles/malbec.png',
    glassImage: '/assets/wine-glasses/red.jpg',
    grapes: 'Uva Malbec',
    body: 'Médio a encorpado',
    temperature: '16 a 18 °C',
    aromas:
      'Frutas escuras maduras, ameixa e notas florais; podem surgir especiarias e madeira conforme vinificação e envelhecimento.',
    taste:
      'Frutado, taninos de intensidade variável, acidez moderada a equilibrada. O perfil muda por região, produtor e safra.',
    pairing:
      'Carnes grelhadas, legumes assados, cogumelos e queijos de média intensidade.',
    note: 'Sugestão geral de estilo, não de um rótulo específico. Sirva conforme as informações do produtor.',
  },
  {
    id: 'chianti',
    name: 'Chianti',
    origin: 'Toscana · Itália',
    country: 'Itália',
    shelfCountry: 'Itália',
    kind: 'Tinto',
    category: 'tintos',
    bottleImage: '/assets/wine-bottles/chianti.png',
    glassImage: '/assets/wine-glasses/red.jpg',
    grapes: 'Predominantemente Sangiovese',
    body: 'Médio',
    temperature: '15 a 17 °C',
    aromas:
      'Cereja, frutas vermelhas e ervas; versões com amadurecimento podem mostrar especiarias.',
    taste:
      'Acidez viva e taninos perceptíveis são comuns, mas variam entre denominações e produtores.',
    pairing: 'Tomate, massas com molho, embutidos e queijos curados.',
    note: 'Harmonização é uma possibilidade: considere intensidade, acidez e ingredientes do prato.',
  },
  {
    id: 'pinot-grigio',
    name: 'Pinot Grigio',
    cardTitle: 'Vinho Branco',
    origin: 'Norte da Itália · estilo frequente',
    country: 'Itália',
    shelfCountry: 'Itália',
    cardOrigin: 'Diversas regiões',
    cardGrapes: 'Brancas',
    cardNotes: 'Frutadas e cítricas',
    kind: 'Branco',
    category: 'brancos',
    bottleImage: '/assets/wine-bottles/pinot-grigio.png',
    glassImage: '/assets/wine-glasses/white.jpg',
    grapes: 'Uva Pinot Grigio',
    body: 'Leve a médio',
    temperature: '8 a 12 °C',
    aromas:
      'Leve, refrescante e versátil, o vinho branco é perfeito para momentos especiais, harmonizando com frutos do mar, saladas e pratos leves.',
    taste:
      'Geralmente seco, fresco e leve; a textura e intensidade dependem do local e do produtor.',
    pairing: 'Peixes delicados, saladas, vegetais e pratos leves.',
    note: 'Sirva fresco conforme indicação do produtor; evite generalizar um único perfil a todos os rótulos.',
  },
  {
    id: 'rose',
    name: 'Vinho Rosé',
    origin: 'França · estilo típico',
    country: 'França',
    shelfCountry: 'França',
    kind: 'Rosé',
    category: 'roses',
    bottleImage: '/assets/wine-bottles/rose.png',
    glassImage: '/assets/wine-glasses/rose.jpg',
    grapes: 'Uvas variadas',
    body: 'Leve',
    temperature: '8 a 11 °C',
    aromas:
      'Frutas vermelhas frescas, cítricos e notas florais; o perfil depende das uvas e da região.',
    taste:
      'Em geral, fresco e frutado, com estrutura e intensidade que variam conforme o produtor.',
    pairing: 'Saladas, peixes, legumes grelhados e pratos leves.',
    note: 'Rosé é uma família de estilos: consulte sempre o rótulo e as informações do produtor.',
  },
  {
    id: 'prosecco',
    name: 'Prosecco',
    origin: 'Vêneto · Itália',
    country: 'Itália',
    shelfCountry: 'Brasil',
    kind: 'Espumante',
    category: 'espumantes',
    bottleImage: '/assets/wine-bottles/prosecco.png',
    glassImage: '/assets/wine-glasses/sparkling.jpg',
    grapes: 'Principalmente Glera',
    body: 'Leve',
    temperature: '6 a 8 °C',
    aromas: 'Maçã, pera, cítricos e flores; intensidade aromática variável.',
    taste:
      'Espumante geralmente fresco, com estilos de doçura identificados no rótulo.',
    pairing:
      'Aperitivos, frutos do mar, queijos frescos e entradas leves.',
    note: 'Confira a categoria de doçura e a denominação na garrafa.',
  },
];

type ModuleStatusType = 'done' | 'progress' | 'available' | 'locked' | 'idle';

interface ModuleDescriptor {
  id: string;
  index: number;
  title: string;
  recipeTitle: string;
  subtitle: string;
  desc: string;
  photo: string;
  totalSteps: number;
  doneSteps: number;
  duration: string;
  level: string;
  status: ModuleStatusType;
  statusLabel: string;
  reviewDone: boolean;
  examPassed: boolean;
}

export function mountFervecApp(app: HTMLElement, modal: HTMLElement): () => void {
  const $ = <T extends Element = Element>(s: string): T | null =>
    app.querySelector<T>(s) || document.querySelector<T>(s);

  let userProfile: StoredUserProfile | null = loadProfile();
  setActiveProgressScope(userProfile?.supabaseUserId || userProfile?.id || 'guest');
  let state: CourseState = loadProgress();
  let route = 'home';
  let selectedRecipeId = 'alfredo';
  let selectedCategory = 'brasileira';
  let selectedWineId = 'pinot-grigio';
  let selectedWineFilter: 'all' | 'tintos' | 'brancos' | 'roses' | 'espumantes' = 'all';
  let memorialCourseSlug = 'massas-italianas';
  let recipeStage = 0;
  let recipeTab = 'lesson';
  let lessonTab = 'learn';
  let lessonStage = Math.min(Math.max(state.stage || 0, 0), stages.length - 1);
  let selectedIngredientId = 'ovos';
  let prepMode = !state.mise;
  let qIndex = Number.isInteger(state.questionCurrent) ? state.questionCurrent : 0;
  let examStatus = state.examStatus || 'intro';
  let audioStatus: AudioStatus = 'idle';
  let audioElapsed = 0;
  let audioTotal = 0;
  let audioTickInterval: number | null = null;
  let captionOpen = false;
  let recipeMicroDone: Record<string, boolean> = {};
  let timerValue = 0;
  let timerInterval: number | null = null;
  let timerRunning = false;
  let expandedProgressId: string = 'carbonara';
  let cuisinesMenuOpen = false;
  let accountMenuOpen = false;
  let portalMenuOpen = false;
  let profileErrors: ProfileValidationErrors = {};
  let profileShowPassword = false;
  let profileShowConfirm = false;
  let profileJustCreated = false;
  let profileSubmitting = false;
  let workspaceData: WorkspaceHydrationResponse | null = null;
  let issuedCertificate: ServerCertificateRecord | null = null;
  let selectedDevCertCourseSlug = 'massas-italianas';
  let certPdfBusy = false;
  let pendingCertificateIssueAfterLogin = false;
  let rowPdfBusyCode: string | null = null;
  let activePdfPreviewUrl: string | null = null;
  let examSubmitting = false;
  let paymentCheckoutState: PaymentCheckoutState = getPaymentCheckoutState();
  let paymentSummary: CoursePaymentSummary = createDefaultCoursePaymentSummary('massas-italianas');
  let paymentSummaryLoaded = false;
  let selectedPaymentMethod: PaymentMethodChoice = 'PIX';
  let selectedCardMode: CardBillingMode = 'CREDIT_CARD';
  let cardHolderNameInput = '';
  let cardInstallmentsInput = 1;
  let paymentsUiStatus: PaymentUiStatus = 'awaiting_selection';
  let paymentsStatusMessage: string | null = null;
  let copiedPixCode = false;
  let copyPixResetTimer: number | null = null;
  let activeOrderId: string | null = null;
  let activePaymentCharge: AsaasChargeResponsePayment | null = paymentCheckoutState.lastPayment;
  let paymentPollTimer: number | null = null;
  let sessionBillingCustomer: CheckoutCustomerPayload | null = null;
  let adminAuditRoot: Root | null = null;

  // Phase 1 Admin Control Center & Coupon Checkout state
  let paymentCouponInput = '';
  let appliedPaymentCoupon: AppliedPaymentCouponView | null = null;
  let paymentCouponFeedback: { ok: boolean; message: string } | null = null;
  let adminActiveTab: AdminTabId = 'overview';
  let adminMobileMenuOpen = false;
  let adminCouponDraft: AdminCouponDraftView = {
    code: generateUniqueSixDigitCode(listProvisionalCoupons().map((c) => c.code)),
    discountPercent: 100,
    validityDays: DEFAULT_COUPON_VALIDITY_DAYS,
    maxUses: 10,
    courseScope: 'massas-italianas',
  };
  let adminVoiceConfig = loadChefVoiceConfig();
  let adminVoiceTestPhrase = CHEF_VOICE_TEST_PHRASE;
  let adminVoiceStatusLabel = 'Configuração local salva';

  function createInitialProfileDraft(profile: StoredUserProfile | null): ProfileFormValues {
    return {
      fullName: profile?.fullName || '',
      cpf: '',
      birthDate: profile?.birthDate || '',
      email: profile?.email || '',
      age: profile?.age ? String(profile.age) : '',
      ddd: profile?.ddd || '',
      phone: profile?.phone || '',
      password: '',
      confirmPassword: '',
      acceptTerms: Boolean(profile),
      promoWhatsapp: profile?.promoWhatsapp ?? false,
      promoEmail: profile?.promoEmail ?? false,
    };
  }

  let profileDraft: ProfileFormValues = createInitialProfileDraft(userProfile);
  let pendingScrollTarget: string | null = null;

  function parseRouteFromHash(): void {
    const rawHash = window.location.hash || '';
    if (rawHash === '#/vendas' || rawHash === '#/cozinhas') {
      route = 'sales';
      return;
    }
    if (rawHash === '#/criar-perfil' || rawHash === '#/cadastro') {
      route = 'create-profile';
      return;
    }
    if (rawHash === '#/certificados' || rawHash === '#/certificado') {
      route = 'certificate';
      return;
    }
    if (rawHash === '#/pagamentos' || rawHash === '#/pagamento') {
      route = 'payments';
      return;
    }
    if (rawHash === '#/admin' || rawHash === '#/painel-admin') {
      route = 'admin';
      return;
    }
    if (rawHash.startsWith('#/memorial/')) {
      memorialCourseSlug = rawHash.replace('#/memorial/', '').trim() || 'massas-italianas';
      route = 'memorial';
      return;
    }
    if (rawHash === '#/memorial') {
      memorialCourseSlug = 'massas-italianas';
      route = 'memorial';
      return;
    }
    const params = new URLSearchParams(window.location.search);
    const memParam = params.get('memorial');
    if (memParam) {
      memorialCourseSlug = memParam;
      route = 'memorial';
    }
  }

  parseRouteFromHash();

  function syncHashForRoute(nextRoute: string) {
    if (nextRoute === 'create-profile') {
      if (window.location.hash !== '#/criar-perfil') {
        window.history.replaceState(null, '', '#/criar-perfil');
      }
    } else if (nextRoute === 'certificate') {
      if (window.location.hash !== '#/certificados') {
        window.history.replaceState(null, '', '#/certificados');
      }
    } else if (nextRoute === 'payments') {
      if (window.location.hash !== '#/pagamentos') {
        window.history.replaceState(null, '', '#/pagamentos');
      }
    } else if (nextRoute === 'admin') {
      if (window.location.hash !== '#/admin') {
        window.history.replaceState(null, '', '#/admin');
      }
    } else if (nextRoute === 'memorial') {
      const target = `#/memorial/${memorialCourseSlug || 'massas-italianas'}`;
      if (window.location.hash !== target) {
        window.history.replaceState(null, '', target);
      }
    } else if (nextRoute === 'sales') {
      if (window.location.hash !== '#/vendas') {
        window.history.replaceState(null, '', '#/vendas');
      }
    } else if (
      window.location.hash.startsWith('#/memorial') ||
      window.location.hash === '#/criar-perfil' ||
      window.location.hash === '#/cadastro' ||
      window.location.hash === '#/certificados' ||
      window.location.hash === '#/certificado' ||
      window.location.hash === '#/pagamentos' ||
      window.location.hash === '#/pagamento' ||
      window.location.hash === '#/admin' ||
      window.location.hash === '#/painel-admin' ||
      window.location.hash === '#/vendas' ||
      window.location.hash === '#/cozinhas'
    ) {
      window.history.replaceState(null, '', '#/');
    }
  }

  function showToast(msg: string, variant: ToastVariant = 'info', description?: string) {
    pushToast({
      variant,
      title: msg,
      description,
    });
  }

  function persist() {
    state.questionCurrent = qIndex;
    state.examStatus = examStatus;
    const ok = saveProgress(state);
    const el = $('[data-save-status]');
    if (el) {
      el.textContent = ok
        ? 'Progresso local atualizado neste dispositivo.'
        : 'Não foi possível salvar neste navegador. Tente novamente.';
    }
  }

  function esc(x: unknown): string {
    return String(x).replace(/[&<>"']/g, (c) => {
      const map: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      };
      return map[c] || c;
    });
  }

  function pct(): number {
    return Math.round((state.done.length / stages.length) * 100);
  }

  function btn(text: string, action: string, cls = 'btn btn-red', extra = ''): string {
    return `<button class="${cls}" data-action="${action}" ${extra}>${text}</button>`;
  }

  function recipeVisual(id: string): string {
    const map: Record<string, string> = {
      carbonara: MEDIA.pastaCarbonaraHero,
      alfredo: MEDIA.pastaAlfredo,
      arrabbiata: MEDIA.pastaArrabbiata,
      pesto: MEDIA.pastaPesto,
      'ragù': MEDIA.pastaRagu,
      sauces: MEDIA.italianSaucesDuo,
    };
    return map[id] || MEDIA.pastaCarbonaraHero;
  }

  function getStageVisual(moduleId: string, stageIndex: number): string {
    if (moduleId === 'carbonara') {
      if (stageIndex === 3) return MEDIA.carbonaraEggCheese;
      if (stageIndex === 0 || stageIndex === 2) return MEDIA.fervecKitchen;
      return MEDIA.pastaCarbonaraHero;
    }
    if (moduleId === 'sauces') {
      return stageIndex === 2 ? MEDIA.pastaArrabbiata : MEDIA.italianSaucesDuo;
    }
    return recipeVisual(moduleId);
  }

  function countryFlagSvg(id: string): string {
    if (id === 'italiana') {
      return `<svg class="cuisine-flag-svg" viewBox="0 0 24 24" aria-hidden="true"><clipPath id="fl-it"><circle cx="12" cy="12" r="11"/></clipPath><g clip-path="url(#fl-it)"><rect x="0" y="0" width="8" height="24" fill="#1b8343"/><rect x="8" y="0" width="8" height="24" fill="#fffdf8"/><rect x="16" y="0" width="8" height="24" fill="#c72027"/></g><circle cx="12" cy="12" r="11" fill="none" stroke="#c9b496" stroke-width="1"/></svg>`;
    }
    if (id === 'francesa') {
      return `<svg class="cuisine-flag-svg" viewBox="0 0 24 24" aria-hidden="true"><clipPath id="fl-fr"><circle cx="12" cy="12" r="11"/></clipPath><g clip-path="url(#fl-fr)"><rect x="0" y="0" width="8" height="24" fill="#1b4398"/><rect x="8" y="0" width="8" height="24" fill="#fffdf8"/><rect x="16" y="0" width="8" height="24" fill="#cb252d"/></g><circle cx="12" cy="12" r="11" fill="none" stroke="#c9b496" stroke-width="1"/></svg>`;
    }
    if (id === 'japonesa') {
      return `<svg class="cuisine-flag-svg" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="11" fill="#fffdf9" stroke="#c9b496" stroke-width="1"/><circle cx="12" cy="12" r="5" fill="#bd1527"/></svg>`;
    }
    if (id === 'internacional') {
      return `<svg class="cuisine-flag-svg" viewBox="0 0 24 24" aria-hidden="true"><clipPath id="fl-in"><circle cx="12" cy="12" r="11"/></clipPath><g clip-path="url(#fl-in)"><rect x="0" y="0" width="24" height="8" fill="#197b3f"/><rect x="0" y="8" width="24" height="8" fill="#fffdf8"/><rect x="0" y="16" width="24" height="8" fill="#e17c22"/><circle cx="12" cy="12" r="3.4" fill="none" stroke="#223e88" stroke-width="1.3"/><circle cx="12" cy="12" r="1.2" fill="#223e88"/></g><circle cx="12" cy="12" r="11" fill="none" stroke="#c9b496" stroke-width="1"/></svg>`;
    }
    return `<svg class="cuisine-flag-svg" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="11" fill="#178b43" stroke="#c9b496" stroke-width="1"/><polygon points="12,4.5 20,12 12,19.5 4,12" fill="#f3c92d"/><circle cx="12" cy="12" r="3.4" fill="#1d3d85"/></svg>`;
  }

  function recipeShortDescription(r: ExtraRecipe): string {
    const map: Record<string, string> = {
      alfredo:
        'Padronizado com 400 g de fettuccine fresco, 100 g de manteiga e 240 g de Parmigiano-Reggiano (24 meses), sem creme de leite, com fabricação artesanal da massa.',
      arrabbiata:
        'Massa tubular penne rigate seca (320 g didáticos) com infusão controlada de alho e peperoncino/pimenta calabresa e redução integral de tomate pelado.',
      pesto:
        'Molho cru da Ligúria em 10 etapas (60 g manjericão, 30 g pinoli, 50 g Parmigiano, 25 g Pecorino Sardo, 70 ml azeite) sobre fusilli didático, com conservação segura.',
      'ragù':
        'Baseado na Accademia Italiana della Cucina (2023): fichas separadas (massa 4 porções; ragù 6 porções), carne moída grossa, pancetta fresca, soffritto e cozimento lento.',
      sauces:
        'Pomodoro (redução de 20–30 min para 320–400 g de massa seca, sem açúcar obrigatório) ao lado de Burro e Salvia (100 g manteiga para ravioli e tortelli).',
    };
    return map[r.id] || r.subtitle || '';
  }

  function buildVersionedAttemptPayload(
    moduleKey: string,
    attemptType: 'work' | 'exam',
    answers: number[]
  ) {
    const graded = gradeAssessment(moduleKey, attemptType, answers);
    return {
      graded,
      bankVersion: graded.bankVersion || ASSESSMENT_BANK_VERSION,
      questionIds: graded.questionIds,
      selectedOptionIds: graded.selectedOptionIds,
      questionSnapshots: graded.questionSnapshots,
    };
  }

  function renderAttemptAnswerReview(
    bank: typeof questions,
    answers: (number | null)[] | undefined,
    snapshots?: QuestionAttemptSnapshot[],
    showWhyOnWork = false
  ): string {
    if (Array.isArray(snapshots) && snapshots.length > 0) {
      return snapshots
        .map(
          (snap) => `<article class="review-answer">
            <span class="review-mark">${snap.isCorrect ? '✓' : '↺'}</span>
            <div>
              <strong>${esc(snap.prompt)}</strong>
              <p>Sua resposta: ${esc(snap.selectedText)}</p>
              <small>Correta: ${esc(snap.correctText)}${showWhyOnWork && snap.explanation ? ` · ${esc(snap.explanation)}` : ''}</small>
              ${!showWhyOnWork && snap.explanation ? `<p class="exam-explain">${esc(snap.explanation)}</p>` : ''}
            </div>
          </article>`
        )
        .join('');
    }
    return bank
      .map(
        (q, i) => `<article class="review-answer">
          <span class="review-mark">${(answers || [])[i] === q.correct ? '✓' : '↺'}</span>
          <div>
            <strong>${esc(q.q)}</strong>
            <p>Sua resposta: ${esc(q.a[(answers || [])[i] ?? 0])}</p>
            <small>Correta: ${esc(q.a[q.correct])}${showWhyOnWork ? ` · ${esc(q.why)}` : ''}</small>
            ${!showWhyOnWork ? `<p class="exam-explain">${esc(q.why)}</p>` : ''}
          </div>
        </article>`
      )
      .join('');
  }

  function renderTechnicalSheetDetails(
    sheet: TechnicalSheet,
    opts?: { stepWarning?: string; editorialAlert?: string }
  ): string {
    return `<div class="cockpit-module-ingredients-list">
      <strong>Ficha Técnica Completa · ${esc(sheet.originalName)}</strong>
      <p style="margin:6px 0 8px;">${esc(sheet.portugueseExplanation)}</p>
      <ul>
        <li><strong>Região gastronômica:</strong> ${esc(sheet.region)}</li>
        <li><strong>Rendimento de referência:</strong> ${esc(sheet.yield)}</li>
        <li><strong>Quantidade por porção:</strong> ${esc(sheet.portionQuantity)}</li>
        <li><strong>Tempo de preparação culinária:</strong> ${esc(sheet.prepTime)}</li>
        <li><strong>Tempo de cozimento:</strong> ${esc(sheet.cookTime)}</li>
        <li><strong>Tempo total culinário estimado:</strong> ${esc(sheet.totalEstimatedTime)}</li>
        <li><strong>Carga horária do curso vs preparo:</strong> ${esc(sheet.workloadDistinction)}</li>
        <li><strong>Nível de dificuldade:</strong> ${esc(sheet.difficulty)}</li>
      </ul>
    </div>
    <div class="cockpit-module-ingredients-list" style="margin-top:10px;">
      <strong>Ingredientes e unidades de medida</strong>
      <ul>${sheet.ingredients.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
    </div>
    <div class="cockpit-module-ingredients-list" style="margin-top:10px;">
      <strong>Utensílios necessários</strong>
      <ul>${sheet.utensils.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
    </div>
    <div class="cockpit-module-ingredients-list" style="margin-top:10px;">
      <strong>Mise en place</strong>
      <ul>${sheet.miseEnPlace.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
    </div>
    <div class="cockpit-module-ingredients-list" style="margin-top:10px;">
      <strong>Etapas detalhadas e pontos de controle</strong>
      <ul>${sheet.detailedSteps.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
      <strong style="display:block;margin-top:8px;">Técnicas gastronômicas</strong>
      <ul>${sheet.techniques.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
      <strong style="display:block;margin-top:8px;">Pontos de controle</strong>
      <ul>${sheet.controlPoints.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
    </div>
    <div class="cockpit-module-ingredients-list" style="margin-top:10px;">
      <strong>Resultado esperado e correção de falhas</strong>
      <p style="margin:6px 0;">${esc(sheet.expectedResult)}</p>
      <ul>${sheet.errorsAndFixes.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
      <strong style="display:block;margin-top:8px;">Dicas do Chef Cremonese</strong>
      <ul>${sheet.chefTips.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
    </div>
    ${
      opts?.stepWarning
        ? `<div class="safety-note cockpit-safety-note" style="margin-top:10px;">
            <strong>Atenção nesta etapa:</strong> ${esc(opts.stepWarning)}
          </div>`
        : ''
    }
    <div class="safety-note cockpit-safety-note" style="margin-top:10px;">
      <strong>Alergênicos:</strong> ${esc(sheet.allergens)}
    </div>
    <div class="safety-note cockpit-safety-note" style="margin-top:10px;">
      <strong>Conservação e Segurança Alimentar (Anvisa RDC 216/2004):</strong> ${esc(sheet.conservation)}
      <ul style="margin:6px 0 0 18px;">${sheet.foodSafetyNotes.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
    </div>
    ${
      opts?.editorialAlert
        ? `<div class="recipe-disclaimer" style="margin:10px 0;">
            <strong>Nota editorial do módulo</strong>
            <p style="margin:4px 0 0;">${esc(opts.editorialAlert)}</p>
          </div>`
        : ''
    }
    <div class="cockpit-module-ingredients-list" style="margin-top:10px;">
      <strong>Adaptações didáticas, validação e referências</strong>
      <ul>
        <li><strong>Adaptações didáticas:</strong> ${esc(sheet.didacticAdaptations)}</li>
        <li><strong>Status de validação prática:</strong> ${esc(sheet.practicalValidationStatus)}</li>
        ${sheet.references
          .map(
            (ref) =>
              `<li><strong>Referência:</strong> ${esc(ref.label)} — <span style="word-break:break-all;">${esc(ref.url)}</span></li>`
          )
          .join('')}
      </ul>
    </div>`;
  }

  function evaluateMainCourseProgress(): EvaluatedCourseProgress {
    const curriculumTitles: Record<string, string> = {
      carbonara: 'Fundamentos das Massas Italianas: Carbonara',
      alfredo: 'Massas Frescas e Emulsificação: Fettuccine Alfredo',
      arrabbiata: 'Massas Tubulares e Molhos Picantes: Penne all’Arrabbiata',
      pesto: 'Molhos Clássicos da Ligúria: Pesto Genovese',
      'ragù': 'Massa Artesanal e Cozimento Lento: Tagliatelle al Ragù',
      sauces: 'Molhos Essenciais Italianos: Pomodoro e Burro e Salvia',
    };

    const blueprint: CourseBlueprint = {
      slug: 'massas-italianas',
      title: 'Massas Italianas',
      subtitle: course.subtitle,
      available: true,
      requiresEnrollment: false,
      isEnrolled: true,
      modules: [
        {
          id: 'carbonara',
          index: 1,
          title: curriculumTitles.carbonara,
          recipeTitle: 'Spaghetti alla Carbonara',
          desc: 'Controle de sal, guanciale sem pele, ovos pasteurizados como padrão didático, emulsão fora do fogo direto e segurança alimentar.',
          photo: MEDIA.pastaCarbonaraHero,
          duration: course.duration,
          level: course.level,
          totalLessonSteps: stages.length,
          totalWorkQuestions: questions.length,
          passingScorePercent: PASSING_SCORE_PERCENT,
        },
        ...extraRecipes.map((r, idx) => ({
          id: r.id,
          index: idx + 2,
          title: curriculumTitles[r.id] || r.title,
          recipeTitle: r.title,
          desc: recipeShortDescription(r),
          photo: recipeVisual(r.id),
          duration: r.duration,
          level: r.level,
          totalLessonSteps: r.steps.length,
          totalWorkQuestions: 6,
          passingScorePercent: PASSING_SCORE_PERCENT,
        })),
      ],
    };

    const carbAnswered = state.questionsAnswers.filter(
      (v) => v !== null && v !== undefined
    ).length;
    const carbExamLatest = state.examAttempts[state.examAttempts.length - 1];
    const progressByModuleId: Record<string, ModuleRuntimeProgress> = {
      carbonara: {
        doneLessonSteps: state.done,
        lessonCompleted: Boolean(state.lessonFinished || state.done.length >= stages.length),
        workAnsweredCount: state.questionsFinished ? questions.length : carbAnswered,
        workCompleted: Boolean(state.questionsFinished),
        workScore: state.questionAttempts[state.questionAttempts.length - 1]?.score,
        reviewCompleted: Boolean(state.reviewDone),
        examPassed: state.examAttempts.some((x) => x.passed),
        latestExamScore: carbExamLatest?.score,
      },
    };

    for (const r of extraRecipes) {
      const p = state.recipeProgress?.[r.id];
      const workAns = (p?.workAnswers || []).filter((v) => v !== null && v !== undefined).length;
      const examLatest = p?.examAttempts?.[p.examAttempts.length - 1];
      progressByModuleId[r.id] = {
        doneLessonSteps: p?.done || [],
        lessonCompleted: Boolean(p?.lessonCompleted || (p?.done?.length || 0) >= r.steps.length),
        workAnsweredCount: p?.workFinished ? 6 : workAns,
        workCompleted: Boolean(p?.workCompleted || p?.workFinished),
        workScore: p?.workAttempts?.[p.workAttempts.length - 1]?.score,
        reviewCompleted: Boolean(p?.reviewDone),
        examPassed: Boolean(p?.examAttempts?.some((x) => x.passed)),
        latestExamScore: examLatest?.score,
      };
    }

    return evaluateCourseProgress(blueprint, progressByModuleId, state.lastModuleId || 'carbonara');
  }

  function getAllModulesSummary(): {
    modules: ModuleDescriptor[];
    totalSteps: number;
    completedSteps: number;
    overallPct: number;
    activeModule: ModuleDescriptor;
  } {
    const evaluated = evaluateMainCourseProgress();
    const modules: ModuleDescriptor[] = evaluated.modules.map((m) => ({
      id: m.id,
      index: m.index,
      title: m.title,
      recipeTitle: m.recipeTitle,
      subtitle: `Preparo prático: ${m.recipeTitle}`,
      desc: m.desc,
      photo: m.photo,
      totalSteps: m.totalLessonSteps,
      doneSteps: m.doneStepsCount,
      duration: m.duration,
      level: m.level,
      status:
        m.status === 'completed'
          ? 'done'
          : m.status === 'in_progress'
            ? 'progress'
            : m.status === 'locked'
              ? 'locked'
              : 'available',
      statusLabel: m.statusLabel,
      reviewDone: m.reviewCompleted,
      examPassed: m.examPassed,
    }));

    const activeModule =
      modules.find((m) => m.id === evaluated.activeModule.id) || modules[0];

    return {
      modules,
      totalSteps: evaluated.totalUnits,
      completedSteps: evaluated.completedUnits,
      overallPct: evaluated.overallPct,
      activeModule,
    };
  }

  function qrSvgForMemorial(slug: string): string {
    const url = `${window.location.origin}/#/memorial/${slug}`;
    // Deterministic 21x21 visual QR matrix with 3 authentic finder patterns
    const size = 21;
    let seed = 0;
    for (let i = 0; i < url.length; i++) seed = (seed * 31 + url.charCodeAt(i)) >>> 0;

    const cells: string[] = [];
    const inFinder = (r: number, c: number) =>
      (r < 7 && c < 7) || (r < 7 && c >= size - 7) || (r >= size - 7 && c < 7);

    const drawFinder = (r0: number, c0: number) => {
      cells.push(`<rect x="${c0}" y="${r0}" width="7" height="7" fill="#231912"/>`);
      cells.push(`<rect x="${c0 + 1}" y="${r0 + 1}" width="5" height="5" fill="#fffaf0"/>`);
      cells.push(`<rect x="${c0 + 2}" y="${r0 + 2}" width="3" height="3" fill="#231912"/>`);
    };

    drawFinder(0, 0);
    drawFinder(0, size - 7);
    drawFinder(size - 7, 0);

    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (inFinder(r, c)) continue;
        if (r === 6 || c === 6) {
          if ((r + c) % 2 === 0) {
            cells.push(`<rect x="${c}" y="${r}" width="1" height="1" fill="#231912"/>`);
          }
          continue;
        }
        seed = (seed * 1664525 + 1013904223) >>> 0;
        if ((seed & 3) === 0 || (seed & 7) === 3) {
          cells.push(`<rect x="${c}" y="${r}" width="1" height="1" fill="#231912"/>`);
        }
      }
    }

    return `<svg viewBox="0 0 ${size} ${size}" width="76" height="76" shape-rendering="crispEdges" role="img" aria-label="QR Code para o Memorial Descritivo do curso">
      <rect width="${size}" height="${size}" fill="#fffaf0"/>
      ${cells.join('')}
    </svg>`;
  }

  function canShowAdminPanelLink(): boolean {
    if (PHASE_1_OFFLINE_ONLY || !SUPABASE_CONNECTED) {
      return Boolean(
        isPhase1AdminPreviewEnabled() ||
          userProfile?.email?.toLowerCase() === 'fervecrgastronomia@gmail.com'
      );
    }
    return Boolean(
      userProfile?.authSource === 'supabase' && workspaceData?.permissions?.canAccessAdminPanel
    );
  }

  function accountDropdownHtml(): string {
    if (!accountMenuOpen) return '';
    const firstName = userProfile?.fullName.split(' ')[0] || '';
    const showAdminEntry = canShowAdminPanelLink();
    return `<div class="nav-dropdown account-dropdown" role="menu" aria-label="Menu do perfil">
      <button type="button" data-action="create-profile" role="menuitem">
        <span class="account-dropdown-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="9.5" cy="8.2" r="3.4"/><path d="M3 19.5a6.5 6.5 0 0 1 13 0"/><path d="M18.5 7.5v5M16 10h5"/></svg></span>
        <span>${userProfile ? 'Criar / Editar Perfil' : 'Cadastro'}</span>
      </button>
      <button type="button" data-action="account" role="menuitem">
        <span class="account-dropdown-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="12" cy="8.5" r="3.5"/><path d="M5 20a7 7 0 0 1 14 0"/></svg></span>
        <span>${firstName ? `Minha conta (${esc(firstName)})` : 'Minha conta'}</span>
      </button>
      <button type="button" data-action="admin" role="menuitem">
        <span class="account-dropdown-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 3 4.5 6.5v5.4c0 4.6 3.1 8.6 7.5 9.8 4.4-1.2 7.5-5.2 7.5-9.8V6.5L12 3Z"/><path d="m9 12 2 2 4-4"/></svg></span>
        <span>${showAdminEntry ? 'Painel Administrativo' : 'Painel Administrativo (Prévia Fase 1)'}</span>
      </button>
      ${
        userProfile
          ? `<button type="button" data-action="clear-profile" role="menuitem">
              <span class="account-dropdown-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg></span>
              <span>Sair da conta local</span>
            </button>`
          : `<button type="button" data-action="open-login-modal" role="menuitem">
              <span class="account-dropdown-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3"/></svg></span>
              <span>Entrar na conta</span>
            </button>`
      }
    </div>`;
  }

  function portalDropdownHtml(): string {
    if (!portalMenuOpen) return '';
    return `<div class="nav-dropdown account-dropdown portal-dropdown" role="menu" aria-label="Menu do portal">
      <button type="button" data-action="home" role="menuitem">
        <span class="account-dropdown-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></svg></span>
        <span>Início</span>
      </button>
      <button type="button" data-action="sales" role="menuitem">
        <span class="account-dropdown-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18"/></svg></span>
        <span>Cozinhas</span>
      </button>
      <button type="button" data-action="courses" role="menuitem">
        <span class="account-dropdown-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="m10 8 6 4-6 4z"/></svg></span>
        <span>Meus Cursos</span>
      </button>
      <button type="button" data-action="open-library" role="menuitem">
        <span class="account-dropdown-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H12v17H6.5A2.5 2.5 0 0 0 4 22zM20 5.5A2.5 2.5 0 0 0 17.5 3H12v17h5.5A2.5 2.5 0 0 1 20 22z"/></svg></span>
        <span>Biblioteca Interativa</span>
      </button>
      <button type="button" data-action="progress" role="menuitem">
        <span class="account-dropdown-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 20V11h4v9M10 20V5h4v15M16 20v-8h4v8"/></svg></span>
        <span>Meu Progresso</span>
      </button>
      <button type="button" data-action="certificate" role="menuitem">
        <span class="account-dropdown-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="5"/><path d="m8.5 12-1 9 4.5-2 4.5 2-1-9"/></svg></span>
        <span>Certificados</span>
      </button>
      <button type="button" data-action="payments" role="menuitem">
        <span class="account-dropdown-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="2.5" y="5" width="19" height="14" rx="2.2"/><path d="M2.5 9.8h19M6.2 14.5h4.2"/></svg></span>
        <span>Pagamentos</span>
      </button>
      <button type="button" data-action="help" role="menuitem">
        <span class="account-dropdown-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M9.7 9a2.4 2.4 0 1 1 4.1 1.7c-1 .9-1.8 1.2-1.8 2.8M12 17h.01"/></svg></span>
        <span>Ajuda</span>
      </button>
    </div>`;
  }

  function wineHeader(): string {
    return `<header class="topbar wine-topbar">
      <a class="brand" href="#/" data-action="home" aria-label="FerveC Gastronomia, início">
        <img src="/assets/fervec-logo-black.png" alt="FerveC Gastronomia" draggable="false">
      </a>
      <button type="button" class="wine-top-back-pill" data-action="back-to-cuisines">← Voltar para a Cozinha</button>
      <div class="wine-header-actions">
        <button data-action="home" aria-label="Voltar ao início da FerveC" title="Início FerveC">
          <svg viewBox="0 0 24 24"><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></svg>
        </button>
        <button data-action="wine-scroll" aria-label="Ir para a seleção">
          <svg viewBox="0 0 24 24"><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 5 5"/></svg>
        </button>
        <button data-action="toggle-account-menu" aria-label="Minha conta" aria-expanded="${accountMenuOpen}" aria-haspopup="menu">
          <svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="3.5"/><path d="M4.5 21a7.5 7.5 0 0 1 15 0"/></svg>
        </button>
        <button data-action="sales" aria-label="Ver cozinhas">
          <svg viewBox="0 0 24 24"><path d="M3 4h2l2.2 11.2a2 2 0 0 0 2 1.6h8.5a2 2 0 0 0 1.9-1.4L22 8H6"/><circle cx="10" cy="20" r="1"/><circle cx="18" cy="20" r="1"/></svg>
        </button>
      </div>
      ${accountDropdownHtml()}
    </header>`;
  }

  function header(): string {
    const isCoursesActive = ['courses', 'course', 'lesson', 'recipe', 'recipeReview', 'questions', 'review', 'exam'].includes(route);
    const isCertActive = route === 'certificate' || route === 'memorial';
    const isCuisinesActive = route === 'sales' || route.startsWith('category-');

    const links: [string, string, string, boolean][] = [
      ['home', 'Início', 'home', route === 'home'],
      ['globe', 'Cozinhas', 'sales', isCuisinesActive],
      ['book', 'Meus cursos', 'courses', isCoursesActive],
      ['chart', 'Meu progresso', 'progress', route === 'progress'],
      ['award', 'Certificados', 'certificate', isCertActive],
      ['card', 'Pagamentos', 'payments', route === 'payments'],
      ['help', 'Ajuda', 'help', route === 'help'],
    ];
    const icons: Record<string, string> = {
      home: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
      globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18"/>',
      book: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v17H6.5A2.5 2.5 0 0 0 4 22z"/><path d="M4 5v17M8 7h8M8 11h8"/>',
      chart: '<path d="M4 20V11h4v9M10 20V5h4v15M16 20v-8h4v8"/>',
      award: '<circle cx="12" cy="8" r="5"/><path d="m8.5 12-1 9 4.5-2 4.5 2-1-9"/>',
      card: '<rect x="2.5" y="5" width="19" height="14" rx="2.2"/><path d="M2.5 9.8h19M6.2 14.5h4.2"/>',
      help: '<circle cx="12" cy="12" r="9"/><path d="M9.7 9a2.4 2.4 0 1 1 4.1 1.7c-1 .9-1.8 1.2-1.8 2.8M12 17h.01"/>',
    };
    const accountSublabel = userProfile
      ? esc(userProfile.fullName.split(' ')[0])
      : state.demo
      ? 'Demonstração'
      : 'Entrar ou cadastrar';
    return `<header class="topbar">
      <a class="brand" href="#/" data-action="home" aria-label="FerveC Gastronomia, início">
        <img src="/assets/fervec-logo-black.png" alt="FerveC Gastronomia" draggable="false">
      </a>
      <nav class="site-nav" aria-label="Menu principal">
        <button type="button" class="nav-link" data-action="open-library" aria-label="Biblioteca Interativa" title="Biblioteca Interativa">
          <span class="nav-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H12v17H6.5A2.5 2.5 0 0 0 4 22zM20 5.5A2.5 2.5 0 0 0 17.5 3H12v17h5.5A2.5 2.5 0 0 1 20 22z"/></svg></span>
          <span>Biblioteca Interativa</span>
        </button>
        ${links
          .map((x) => {
            if (x[0] === 'globe') {
              return `<div class="nav-dropdown-wrap">
                <button class="nav-link ${x[3] ? 'is-active' : ''}" data-action="sales" aria-expanded="${cuisinesMenuOpen}">
                  <span class="nav-icon" aria-hidden="true"><svg viewBox="0 0 24 24">${icons[x[0]]}</svg></span>
                  <span>${x[1]} <small class="nav-caret" data-action="toggle-cuisines-menu" aria-label="Abrir opções de cozinhas">▾</small></span>
                </button>
                ${
                  cuisinesMenuOpen
                    ? `<div class="nav-dropdown" role="menu">
                        <button type="button" data-action="sales" role="menuitem">Ver todas as cozinhas</button>
                        <button type="button" data-action="courses" role="menuitem">Cozinha Italiana (Disponível)</button>
                        <button type="button" data-action="category-open" data-category="vinicola" role="menuitem">Vinícola FerveC</button>
                        <button type="button" data-action="open-memorial" data-course="massas-italianas" role="menuitem">Memorial Descritivo</button>
                      </div>`
                    : ''
                }
              </div>`;
            }
            return `<button class="nav-link ${x[3] ? 'is-active' : ''}" data-action="${x[2]}">
              <span class="nav-icon" aria-hidden="true"><svg viewBox="0 0 24 24">${icons[x[0]]}</svg></span>
              <span>${x[1]}</span>
            </button>`;
          })
          .join('')}
      </nav>
      ${
        canShowAdminPanelLink()
          ? `<button type="button" class="nav-link admin-top-tab ${route === 'admin' ? 'is-active' : ''}" data-action="admin">
              <span class="nav-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 3 4.5 6.5v5.4c0 4.6 3.1 8.6 7.5 9.8 4.4-1.2 7.5-5.2 7.5-9.8V6.5L12 3Z"/><path d="m9 12 2 2 4-4"/></svg></span>
              <span>Painel Administrativo</span>
            </button>`
          : ''
      }
      <button type="button" class="account-chip ${accountMenuOpen ? 'is-open' : ''} ${route === 'create-profile' || route === 'account' ? 'is-route-active' : ''}" data-action="toggle-account-menu" aria-expanded="${accountMenuOpen}" aria-haspopup="menu">
        <span class="avatar-mark"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8.5" r="3.5"/><path d="M5 20a7 7 0 0 1 14 0"/></svg></span>
        <span class="account-chip-text">
          <strong>Minha conta <span class="account-caret" aria-hidden="true">▾</span></strong>
          <small>${accountSublabel}</small>
        </span>
      </button>
      ${accountDropdownHtml()}
      ${route === 'create-profile' ? '<span class="cadastro-topbar-ribbon" aria-hidden="true"></span>' : ''}
    </header>`;
  }

  function footerNote(): string {
    return `<div class="footer-meta-bar">
      <p class="local-note" data-save-status>${
        state.demo
          ? 'Modo demonstração local: seu progresso permanece salvo apenas neste navegador, sem sincronização entre dispositivos.'
          : 'Plataforma FerveC Gastronomia · prévia demonstrativa local.'
      }</p>
      <div class="footer-meta-links">
        <button type="button" class="text-action" data-action="open-memorial" data-course="massas-italianas">Memorial Descritivo (acesso público)</button>
      </div>
    </div>`;
  }

  function statusText(): string {
    const map: Record<AudioStatus, string> = {
      idle: 'Pronto para ouvir',
      loading: 'Preparando áudio…',
      playing: 'Reproduzindo narração',
      paused: 'Pausado',
      ended: 'Áudio finalizado',
      unavailable: 'Áudio indisponível; legenda disponível',
    };
    return map[audioStatus] || 'Pronto para ouvir';
  }

  function estimateAudioSeconds(text: string): number {
    const words = String(text || '')
      .trim()
      .split(/\s+/)
      .filter(Boolean).length;
    return Math.max(24, Math.min(180, Math.round(words * 0.55) + 12));
  }

  function audioPlayer(label: string, text: string, compact = false): string {
    if (compact) {
      const totalSec = audioTotal > 0 && audioStatus !== 'idle' ? audioTotal : estimateAudioSeconds(text);
      const elapsedSec = Math.min(audioElapsed, totalSec);
      const isPlaying = audioStatus === 'playing';
      const isMuted = (state.voiceVolume ?? 0.82) <= 0.01;
      return `<section class="vinyl-audio-bar">
        <div class="vinyl-disc ${isPlaying ? 'spinning' : ''}" aria-hidden="true">
          <svg class="vinyl-chef-mark" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 15v3h10v-3M6.2 15a3.6 3.6 0 0 1-.4-7.1A4.4 4.4 0 0 1 14 5.5a4 4 0 0 1 4.8 2.3A3.5 3.5 0 0 1 17.8 15Z" fill="#fffaf0"/></svg>
        </div>
        <div class="vinyl-audio-body">
          <div class="vinyl-audio-head">
            <strong>${esc(label)}</strong>
            <span class="audio-status" data-audio-state>${statusText()}</span>
          </div>
          <div class="vinyl-audio-controls">
            <button type="button" class="audio-control audio-play vinyl-play-btn" data-action="audio-toggle" data-text="${esc(text)}" aria-label="${isPlaying ? 'Pausar áudio' : 'Reproduzir áudio'}" title="${isPlaying ? 'Pausar' : 'Reproduzir'}" data-audio-play-btn>${isPlaying ? '❚❚' : '▶'}</button>
            <div class="vinyl-wave ${isPlaying ? 'is-playing' : ''}" aria-hidden="true" data-audio-wave>
              <span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span>
            </div>
            <button type="button" class="vinyl-icon-btn" data-action="audio-toggle-mute" aria-label="${isMuted ? 'Ativar som' : 'Silenciar'}" title="${isMuted ? 'Ativar som' : 'Silenciar'}" data-audio-mute-btn>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12"/></svg>
            </button>
            <button type="button" class="vinyl-cc-btn ${captionOpen ? 'is-active' : ''}" data-action="audio-toggle-cc" aria-pressed="${captionOpen}" title="Mostrar ou ocultar legenda" data-audio-cc-btn>CC</button>
            <button type="button" class="vinyl-icon-btn vinyl-chevron-btn" data-action="audio-toggle-cc" aria-label="Expandir legenda" title="Legenda">⌄</button>
          </div>
          <div class="vinyl-time-row">
            <span class="vinyl-time-readout" data-audio-time>${formatTime(elapsedSec)} / ${formatTime(totalSec)}</span>
            <label class="audio-volume vinyl-vol-compact">
              <span class="sr-only">Volume</span>
              <input type="range" min="0" max="1" step=".05" value="${state.voiceVolume ?? 0.82}" data-audio-volume aria-label="Controle de volume">
            </label>
          </div>
          <details class="caption-details" data-audio-details ${captionOpen ? 'open' : ''}>
            <summary>Legenda da narração</summary>
            <p>${esc(text)}</p>
          </details>
        </div>
      </section>`;
    }

    return `<section class="audio-card">
      <div class="audio-mark" aria-hidden="true">♫</div>
      <div class="audio-main">
        <div class="audio-heading">
          <strong>${label}</strong>
          <span class="audio-status" data-audio-state>${statusText()}</span>
        </div>
        <div class="audio-buttons">
          <button class="audio-control audio-play" data-action="audio-play" data-text="${esc(text)}" aria-label="Reproduzir áudio">▶</button>
          <button class="audio-control" data-action="audio-pause" aria-label="Pausar áudio">Ⅱ</button>
          <button class="audio-control" data-action="audio-resume" aria-label="Continuar áudio">▶</button>
          <button class="audio-control" data-action="audio-replay" data-text="${esc(text)}" aria-label="Ouvir novamente">↻</button>
          <label class="audio-volume">
            <span>Volume</span>
            <input type="range" min="0" max="1" step=".05" value="${state.voiceVolume || 0.82}" data-audio-volume aria-label="Controle de volume">
            <span data-volume-value>${Math.round((state.voiceVolume || 0.82) * 100)}%</span>
          </label>
        </div>
        <details class="caption-details">
          <summary>Legenda</summary>
          <p>${esc(text)}</p>
        </details>
      </div>
    </section>`;
  }

  function home(): string {
    const cats = [
      {
        id: 'italiana',
        label: 'Cozinha Italiana',
        countryTitle: 'Italiana',
        action: 'courses',
        photo: '/assets/ref-home/card-italiana.jpg',
        cropClass: '',
        statusText: 'Disponível',
        available: true,
        ctaText: 'Acessar curso →',
      },
      {
        id: 'francesa',
        label: 'Cozinha Francesa',
        countryTitle: 'Francesa',
        action: 'category-open',
        photo: '/assets/ref-home/card-francesa.jpg',
        cropClass: '',
        statusText: 'Em breve',
        available: false,
        ctaText: 'Acessar curso →',
      },
      {
        id: 'brasileira',
        label: 'Cozinha Brasileira',
        countryTitle: 'Brasileira',
        action: 'category-open',
        photo: '/assets/ref-home/card-brasileira.jpg',
        cropClass: '',
        statusText: 'Em breve',
        available: false,
        ctaText: 'Acessar curso →',
      },
      {
        id: 'japonesa',
        label: 'Cozinha Japonesa',
        countryTitle: 'Japonesa',
        action: 'category-open',
        photo: '/assets/ref-home/card-japonesa.jpg',
        cropClass: '',
        statusText: 'Em breve',
        available: false,
        ctaText: 'Acessar curso →',
      },
    ];

    const quickNavItems: { icon: string; label: string; action: string; active?: boolean; hasCaret?: boolean }[] = [
      {
        icon: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
        label: 'Início',
        action: 'home',
        active: true,
      },
      {
        icon: '<circle cx="12" cy="12" r="9"/><path d="m10 8 6 4-6 4z"/>',
        label: 'Meus Cursos',
        action: 'courses',
      },
      {
        icon: '<path d="M6 15v4h12v-4M5 15a4 4 0 0 1-.5-7.9A5 5 0 0 1 14 4.5a4.5 4.5 0 0 1 5.5 2.6A4 4 0 0 1 19 15Z"/>',
        label: 'Cozinhas',
        action: 'sales',
        hasCaret: true,
      },
      {
        icon: '<path d="M4 20V11h4v9M10 20V5h4v15M16 20v-8h4v8"/>',
        label: 'Meu Progresso',
        action: 'progress',
      },
      {
        icon: '<path d="M8 5h8v5a4 4 0 0 1-8 0zM8 7H5c0 3 1.5 5 3 5M16 7h3c0 3-1.5 5-3 5M12 14v5M9 21h6"/>',
        label: 'Certificados',
        action: 'certificate',
      },
      {
        icon: '<rect x="2.5" y="5" width="19" height="14" rx="2.2"/><path d="M2.5 9.8h19M6.2 14.5h4.2"/>',
        label: 'Pagamentos',
        action: 'payments',
      },
      {
        icon: '<path d="M5 14v-2a7 7 0 0 1 14 0v2"/><rect x="3" y="13" width="3.5" height="6" rx="1.5"/><rect x="17.5" y="13" width="3.5" height="6" rx="1.5"/><path d="M17.5 19c-1.5 2-3.5 2.3-5.5 2.3"/>',
        label: 'Ajuda',
        action: 'help',
      },
    ];

    return `<main class="home-page home-reference-page">
      <img class="home-side-foliage home-foliage-ml" src="/assets/foliage/foliage-1.png" alt="" aria-hidden="true" referrerpolicy="no-referrer" draggable="false">
      <img class="home-side-foliage home-foliage-mr" src="/assets/foliage/foliage-6.png" alt="" aria-hidden="true" referrerpolicy="no-referrer" draggable="false">
      <img class="home-side-foliage home-foliage-bl" src="/assets/foliage/foliage-5.png" alt="" aria-hidden="true" referrerpolicy="no-referrer" draggable="false">
      <img class="home-side-foliage home-foliage-br" src="/assets/foliage/foliage-8.png" alt="" aria-hidden="true" referrerpolicy="no-referrer" draggable="false">

      <section class="home-hero home-hero-ref">
        <header class="home-hero-topbar">
          <a class="home-hero-brand" href="#/" data-action="home" aria-label="FerveC Gastronomia, início">
            <img class="fervec-logo-on-dark home-hero-brand-logo" src="/assets/fervec-logo-white.png" alt="FerveC Gastronomia" draggable="false">
          </a>
          <div class="home-hero-top-actions">
            <button type="button" class="home-hero-account-pill" data-action="toggle-account-menu" aria-expanded="${accountMenuOpen}" aria-haspopup="menu">
              <span class="home-hero-avatar"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8.5" r="3.5"/><path d="M5 20a7 7 0 0 1 14 0"/></svg></span>
              <span>Minha conta ▾</span>
            </button>
            <button type="button" class="home-hero-menu-btn" data-action="toggle-portal-menu" aria-label="Abrir menu" aria-expanded="${portalMenuOpen}" aria-haspopup="menu" title="Menu">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M5 12h14M5 17h14"/></svg>
            </button>
          </div>
          ${accountDropdownHtml()}
          ${portalDropdownHtml()}
        </header>
        <img class="hero-scene crop-hero-chef" src="${MEDIA.heroOfficialChef}" alt="Chef Cremonese na cozinha FerveC Gastronomia.">
        <div class="hero-shade"></div>
        <img class="hero-produce-corner" src="/assets/foliage/hero-basil.png" alt="" aria-hidden="true" referrerpolicy="no-referrer" draggable="false">
        <button class="hero-seal-button" type="button" data-action="certificate" aria-label="Ver área de certificados">
          <img src="/assets/hero-seal-popout-crop.svg" alt="Certificado de Conclusão">
        </button>
        <div class="hero-copy">
          <h1>Seu próximo prato<br><em>começa aqui.</em></h1>
          <svg class="hero-headline-swoosh" viewBox="0 0 320 18" aria-hidden="true">
            <path d="M8 14 C105 3, 224 2, 312 10" fill="none" stroke="#efc84f" stroke-width="3.2" stroke-linecap="round"/>
          </svg>
          <p>Explore cozinhas do mundo e aprenda técnicas culinárias com orientação clara, passo a passo.</p>
          <div class="hero-buttons">
            ${btn('▶ &nbsp; Explorar cursos →', 'courses', 'btn btn-red')}
            <button class="btn btn-glass" data-action="chef">
              <svg class="btn-icon-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 15v4h12v-4M5 15a4 4 0 0 1-.5-7.9A5 5 0 0 1 14 4.5a4.5 4.5 0 0 1 5.5 2.6A4 4 0 0 1 19 15Z"/></svg>
              <span>Conheça o Chef</span>
            </button>
          </div>
        </div>
      </section>

      <nav class="home-quick-pill-bar" aria-label="Atalhos rápidos">
        ${quickNavItems
          .map(
            (item) => `<button type="button" class="home-quick-item ${item.active ? 'is-active' : ''}" data-action="${item.action}">
              <span class="home-quick-icon" aria-hidden="true"><svg viewBox="0 0 24 24">${item.icon}</svg></span>
              <span class="home-quick-label">${esc(item.label)}${item.hasCaret ? '&nbsp;<small>▾</small>' : ''}</span>
            </button>`
          )
          .join('')}
      </nav>

      <section id="cuisines-section" class="storefront-section">
        <div class="home-section-heading">
          <div>
            <span class="eyebrow">NOSSOS CURSOS</span>
            <h2>Explore as cozinhas do mundo</h2>
          </div>
          <button class="btn btn-outline-dark home-all-courses-pill" data-action="sales">Ver todos os cursos →</button>
        </div>
        <div class="storefront-grid storefront-grid-6">
          ${cats
            .map(
              (c) => `<article class="storefront-card cuisine-${c.id} ${!c.available ? 'is-soon' : ''}">
                <img class="${c.cropClass}" src="${c.photo}" alt="Prato representativo da ${esc(c.label)}">
                <div class="storefront-card-overlay"></div>
                <div class="storefront-card-copy">
                  <div class="cuisine-card-head">
                    ${countryFlagSvg(c.id)}
                    <strong><span>Cozinha</span><em>${esc(c.countryTitle)}</em></strong>
                  </div>
                  <div class="cuisine-status-pill ${c.available ? 'is-available' : 'is-upcoming'}">
                    <span class="cuisine-status-dot" aria-hidden="true">${c.available ? '✓' : '!'}</span>
                    <span>${esc(c.statusText)}</span>
                  </div>
                  <button type="button" class="cuisine-red-cta" data-action="${c.action}" ${
                    c.action === 'category-open' ? `data-category="${c.id}"` : ''
                  }>${esc(c.ctaText)}</button>
                </div>
              </article>`
            )
            .join('')}

          <article class="storefront-card cuisine-biblioteca">
            <img src="/assets/ref-home/card-biblioteca.jpg" alt="Livros da Biblioteca Gastronômica Inteligente">
            <div class="storefront-card-overlay"></div>
            <div class="storefront-card-copy is-centered">
              <span class="storefront-portal-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H12v17H6.5A2.5 2.5 0 0 0 4 22zM20 5.5A2.5 2.5 0 0 0 17.5 3H12v17h5.5A2.5 2.5 0 0 1 20 22z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>
              </span>
              <strong class="portal-card-title">Biblioteca Gastronômica Inteligente</strong>
              <button type="button" class="cuisine-red-cta" data-action="open-library">Acessar →</button>
            </div>
          </article>

          <article class="storefront-card cuisine-vinicola-dark">
            <img src="/assets/ref-home/card-vinicola.jpg" alt="Taça de vinho tinto e uvas da Vinícola FerveC">
            <div class="storefront-card-overlay"></div>
            <div class="storefront-card-copy is-centered">
              <span class="storefront-portal-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24"><path d="M8 3h8l1 6a5 5 0 0 1-10 0zM12 14v7M8 21h8M7.5 8.5h9" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>
              </span>
              <strong class="portal-card-title">Vinícola</strong>
              <button type="button" class="cuisine-red-cta" data-action="category-open" data-category="vinicola">Acessar →</button>
            </div>
          </article>
        </div>
      </section>

      <section class="home-game-banner" aria-label="Novo Jogo Restaurante FerveC">
        <img class="home-game-bg" src="/assets/ref-home/game-banner.jpg" alt="Mãos ralando queijo e tablet com jogo culinário Restaurante FerveC">
        <div class="home-game-shade" aria-hidden="true"></div>
        <div class="home-game-left">
          <div class="home-game-eyebrow">
            <span class="home-game-pad-icon" aria-hidden="true">
              <svg viewBox="0 0 36 24"><path d="M10.5 3.5h15a7.5 7.5 0 0 1 7.2 5.6l1.3 6.1a3.6 3.6 0 0 1-6.1 3.3l-3.1-2.8a2.5 2.5 0 0 0-1.7-.7H12.9a2.5 2.5 0 0 0-1.7.7l-3.1 2.8A3.6 3.6 0 0 1 2 15.2l1.3-6.1a7.5 7.5 0 0 1 7.2-5.6Z" fill="#ffd022"/><path d="M8.5 10.6h4.6M10.8 8.3v4.6" stroke="#110602" stroke-width="2.1" stroke-linecap="round"/><circle cx="24.5" cy="8.7" r="1.25" fill="#110602"/><circle cx="24.5" cy="12.7" r="1.25" fill="#110602"/><circle cx="22.5" cy="10.7" r="1.25" fill="#110602"/><circle cx="26.5" cy="10.7" r="1.25" fill="#110602"/></svg>
            </span>
            <span>Novo Jogo</span>
          </div>
          <h2>Jogo Restaurante<br><em>FerveC</em></h2>
          <p>Explore, cozinhe e conquiste receitas incríveis no nosso jogo!</p>
        </div>
        <button type="button" class="home-game-soon-pill" data-action="upcoming-notice" data-title="Jogo Restaurante FerveC">
          <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="4.8" width="17" height="15.5" rx="2.4" fill="none" stroke="currentColor" stroke-width="2.1"/><path d="M3.5 9.8h17M8 2.6v3.4M16 2.6v3.4" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"/><rect x="7" y="12.3" width="2" height="2" rx=".4" fill="currentColor"/><rect x="11" y="12.3" width="2" height="2" rx=".4" fill="currentColor"/><rect x="15" y="12.3" width="2" height="2" rx=".4" fill="currentColor"/><rect x="7" y="15.8" width="2" height="2" rx=".4" fill="currentColor"/><rect x="11" y="15.8" width="2" height="2" rx=".4" fill="currentColor"/></svg>
          <span>Em breve</span>
        </button>
      </section>

      <section class="home-course">
        <article class="featured-course reference-course-ad">
          <span class="featured-highlight-pill">Curso em Destaque</span>
          <img class="featured-corner-foliage-tl" src="/assets/foliage/hero-basil.png" alt="" aria-hidden="true" draggable="false">
          <img class="featured-corner-foliage-br" src="/assets/foliage/footer-produce.png" alt="" aria-hidden="true" draggable="false">
          <div class="featured-photo">
            <img class="featured-chef-photo" src="/assets/aistudio/WhatsApp_Image_2026-11-14_at_03.20.34_e9928f28.jpeg" alt="Chef Cremonese segurando prato de massa fresca italiana">
          </div>
          <div class="featured-copy">
            <h3><span>Curso de</span><em class="featured-massas-white">Massas</em> <em class="featured-italian-gold">Italianas</em></h3>
            <span class="featured-do-prato">Do preparo ao prato!</span>
            <div class="course-facts-icons">
              <span class="is-solid-gold"><b><svg viewBox="0 0 24 24"><path d="m8 5 11 7-11 7z" fill="currentColor" stroke="none"/></svg></b>6<br>Módulos</span>
              <span class="is-outline-gold"><b><svg viewBox="0 0 24 24"><path d="M4 5h7a3 3 0 0 1 3 3v11a2 2 0 0 0-2-2H4zM20 5h-7a3 3 0 0 0-3 3v11a2 2 0 0 1 2-2h8z"/></svg></b>Provas<br>e Avaliações</span>
              <span class="is-outline-gold"><b><svg viewBox="0 0 24 24"><path d="M6 15v4h12v-4M5 15a4 4 0 0 1-.5-7.9A5 5 0 0 1 14 4.5a4.5 4.5 0 0 1 5.5 2.6A4 4 0 0 1 19 15Z"/></svg></b>Trabalhos<br>Práticos</span>
              <span class="is-outline-gold"><b><svg viewBox="0 0 24 24"><path d="M12 3l2.5 5 5.5.8-4 3.9.9 5.5-4.9-2.6-4.9 2.6.9-5.5-4-3.9 5.5-.8z"/></svg></b>Projeto<br>do Módulo</span>
            </div>
          </div>
          <div class="home-offer-panel">
            <span>Agora por apenas:</span>
            <strong class="offer-price-swash">${esc(paymentSummary.courseSlug === 'massas-italianas' ? paymentSummary.priceFormatted : 'R$ 12,00')}</strong>
            <svg class="offer-swash-svg" viewBox="0 0 140 12" aria-hidden="true"><path d="M6 9C42 2 98 1 134 6" fill="none" stroke="#b9161e" stroke-width="3.2" stroke-linecap="round"/></svg>
            <button class="btn btn-red" data-action="sales">Saber Mais →</button>
            <small><span aria-hidden="true">🔒</span> Acesso imediato ao curso</small>
          </div>
        </article>
      </section>

      <footer class="site-footer">
        <img class="footer-produce" src="/assets/foliage/footer-produce.png" alt="" aria-hidden="true" referrerpolicy="no-referrer" draggable="false">
        <img class="footer-produce is-right" src="/assets/foliage/footer-produce.png" alt="" aria-hidden="true" referrerpolicy="no-referrer" draggable="false">
        <div class="footer-stack">
          <div class="footer-content">
            <a class="home-hero-brand footer-brand-emblem" href="#/" data-action="home" aria-label="FerveC Gastronomia, início">
              <img class="fervec-logo-on-dark footer-brand-logo" src="/assets/fervec-logo-white.png" alt="FerveC Gastronomia" draggable="false">
            </a>
            <span class="footer-brand-divider" aria-hidden="true"></span>
            <p class="footer-message">Mais que um curso,<br><em>uma experiência culinária completa!</em></p>
            <div class="footer-socials" aria-label="Redes sociais">
              <a href="#/" data-action="help" aria-label="YouTube"><svg viewBox="0 0 24 24"><rect x="2.5" y="5.5" width="19" height="13" rx="4"/><path d="M10 9.5l5.5 2.5-5.5 2.5z" fill="currentColor" stroke="none"/></svg></a>
              <a href="#/" data-action="help" aria-label="Instagram"><svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/></svg></a>
              <a href="#/" data-action="help" aria-label="Facebook"><svg viewBox="0 0 24 24"><path d="M14.5 8H17V4.5h-2.5A4 4 0 0 0 10.5 8.5V11H8v3.5h2.5V20h3.5v-5.5H16.5L17 11h-3v-2a1 1 0 0 1 .5-1z"/></svg></a>
              <a href="#/" data-action="help" aria-label="TikTok"><svg viewBox="0 0 24 24"><path d="M14 4v10.5a3.5 3.5 0 1 1-3-3.45M14 7c1.4 1.6 3.1 2.4 5 2.5"/></svg></a>
            </div>
            <button class="footer-help" data-action="help">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 14v-2a7 7 0 0 1 14 0v2"/><rect x="3" y="13" width="3.5" height="6" rx="1.5"/><rect x="17.5" y="13" width="3.5" height="6" rx="1.5"/></svg>
              <span>Precisa de ajuda?</span>
            </button>
          </div>
        </div>
      </footer>
    </main>`;
  }

  function courseTabs(active: string, moduleId = 'carbonara'): string {
    const isCarb = moduleId === 'carbonara';
    const isGlobalCert = active === 'certificate' && isCarb;
    const tabs: [string, string][] = [
      ['AULA', isCarb ? 'lesson' : 'recipe-tab-lesson'],
      ['TRABALHO', isCarb ? 'questions' : 'recipe-tab-work'],
      ['REVISÃO', isCarb ? 'review' : 'recipe-tab-review'],
      ['PROVA', isCarb ? 'exam' : 'recipe-tab-exam'],
      ['CERTIFICADO', isCarb ? (isGlobalCert ? 'certificate' : 'carbonara-cert') : 'recipe-tab-certificate'],
    ];
    return `<nav class="course-tabs" aria-label="Conteúdo do curso">
      ${tabs
        .map(([label, act]) => {
          const isActive =
            (isCarb && (active === act || (act === 'carbonara-cert' && active === 'carbonara-cert'))) ||
            (!isCarb && act === `recipe-tab-${active}`);
          const tabKey = act.replace('recipe-tab-', '');
          return `<button class="course-tab ${isActive ? 'active' : ''}" data-action="${
            isCarb ? act : 'recipe-tab'
          }" ${!isCarb ? `data-tab="${tabKey}"` : ''} ${isActive ? 'aria-current="page"' : ''}>${label}</button>`;
        })
        .join('')}
    </nav>`;
  }

  function courseBanner(active: string, subtitle?: string, duration?: string, level?: string): string {
    if (active === 'certificate') {
      return `<div class="course-banner cert-course-banner">
        <div class="cert-banner-top-strip">
          <img class="cert-banner-right-glow" src="${MEDIA.fervecKitchen}" alt="" aria-hidden="true">
          <div class="course-banner-main">
            <div class="cockpit-banner-thumb cert-banner-thumb">
              <img src="${MEDIA.fervecKitchen}" alt="Cozinha profissional da FerveC Gastronomia">
              <span class="cockpit-banner-logo-plaque">
                <img src="/assets/fervec-logo-black.png" alt="FerveC Gastronomia" draggable="false">
              </span>
            </div>
            <div>
              <span class="eyebrow">CURSO • ${course.chef}</span>
              <h1>Massas italianas</h1>
              <p>${esc(subtitle || course.subtitle)}</p>
              <div class="course-facts">
                <span><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m10 8 6 4-6 4z"/></svg> Aulas: 6</span>
                <span><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg> ${esc(duration || course.duration)}</span>
                <span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 18h3v-5H4zM10.5 18h3V9h-3zM17 18h3V5h-3z"/></svg> Dificuldade: ${esc((level || course.level).toLowerCase())}</span>
              </div>
            </div>
          </div>
        </div>
        ${courseTabs(active)}
      </div>`;
    }
    return `<div class="course-banner">
      <button class="back-crumb" data-action="courses">← Meus cursos</button>
      <div class="course-banner-main">
        <img src="${MEDIA.fervecKitchen}" alt="Cozinha profissional da FerveC Gastronomia">
        <div>
          <span class="eyebrow">CURSO · ${course.chef}</span>
          <h1>${course.title}</h1>
          <p>${esc(subtitle || course.subtitle)}</p>
          <div class="course-facts">
            <span><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg> Aulas: 6 módulos</span>
            <span><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m10 8 6 4-6 4z"/></svg> ${esc(duration || course.duration)}</span>
            <span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 18h3v-5H4zM10.5 18h3V9h-3zM17 18h3V5h-3z"/></svg> ${esc(level || course.level)}</span>
          </div>
        </div>
      </div>
      ${courseTabs(active)}
    </div>`;
  }

  function coursePage(): string {
    const { modules, totalSteps, completedSteps, overallPct, activeModule } = getAllModulesSummary();
    const radius = 34;
    const circ = 2 * Math.PI * radius;
    const offset = circ - (overallPct / 100) * circ;

    return `<div class="modules-parchment-backdrop">
    <main class="page-wrap modules-page">
      <button class="back-crumb" data-action="home">← Início</button>
      <section class="modules-hero-dark">
        <img class="modules-hero-bg crop-pasta-right" src="${MEDIA.pastaCarbonaraHero}" alt="" aria-hidden="true">
        <div class="modules-hero-shade"></div>
        <div class="modules-hero-copy">
          <span class="eyebrow">CURSO · CHEF CREMONESE</span>
          <h1>Chef Cremonese<br><em>Massas Italianas</em></h1>
          <p>Aprenda as técnicas tradicionais para preparar massas italianas autênticas ao longo de 6 módulos completos.</p>
        </div>
        <div class="modules-summary-card">
          <div class="modules-summary-top">
            <div class="radial-meter" aria-label="${overallPct}% concluído">
              <svg viewBox="0 0 84 84" width="84" height="84">
                <circle cx="42" cy="42" r="${radius}" fill="none" stroke="#e4d2b4" stroke-width="7"/>
                <circle cx="42" cy="42" r="${radius}" fill="none" stroke="#227942" stroke-width="7"
                  stroke-dasharray="${circ.toFixed(1)}" stroke-dashoffset="${offset.toFixed(1)}"
                  stroke-linecap="round" transform="rotate(-90 42 42)"/>
              </svg>
              <strong>${overallPct}%</strong>
            </div>
            <div>
              <span>Seu progresso</span>
              <strong>${completedSteps} de ${totalSteps} etapas</strong>
              <small>Atual: ${esc(activeModule.title)}</small>
            </div>
          </div>
          <div class="summary-divider" aria-hidden="true"></div>
          <button class="btn btn-red" data-action="continue-active-course">▶ Continuar Curso</button>
        </div>
      </section>

      <div class="recipe-grid improved-module-grid">
        ${modules
          .map(
            (r) =>
              `<article class="recipe-card improved-recipe-card">
                <div class="module-card-image">
                  <img class="${r.id === 'carbonara' ? 'crop-pasta-right' : ''}" src="${r.photo}" alt="${esc(r.title)} · imagem do módulo">
                </div>
                <div class="recipe-card-copy">
                  <div class="module-pill-row">
                    <span class="module-index">Módulo ${r.index}</span>
                    <span class="module-status status-${r.status}">${esc(r.statusLabel)}</span>
                  </div>
                  <h2>${esc(r.title)}</h2>
                  <span class="module-recipe-tag">${esc(r.recipeTitle)}</span>
                  <p class="module-description">${esc(r.desc)}</p>
                  <div class="progress-row">
                    <div class="progress-track"><span style="width:${Math.round((r.doneSteps / r.totalSteps) * 100)}%"></span></div>
                    <small>${r.doneSteps} de ${r.totalSteps} etapas</small>
                    <button class="module-open-btn" aria-label="Abrir módulo ${r.index}: ${esc(r.title)} (${esc(r.recipeTitle)})" data-action="${
                      r.id === 'carbonara' ? 'start-course' : 'open-recipe'
                    }" ${r.id !== 'carbonara' ? `data-recipe="${esc(r.id)}"` : ''}>
                      <span aria-hidden="true">›</span>
                    </button>
                  </div>
                </div>
              </article>`
          )
          .join('')}
      </div>

      <div class="module-bottom-cta">
        <span class="cta-trophy-icon" aria-hidden="true">
          <svg viewBox="0 0 36 36"><path d="M10 6h16v8a8 8 0 0 1-16 0z" fill="#e9b236" stroke="#8a5a10" stroke-width="1.6"/><path d="M10 9H6c0 4 2 7 4 7M26 9h4c0 4-2 7-4 7" fill="none" stroke="#b67d1b" stroke-width="2"/><path d="M18 22v6M12 31h12l-2-3h-8z" fill="#b67d1b"/></svg>
        </span>
        <strong>Você está a um passo de se tornar um verdadeiro chef italiano!</strong>
        <div class="module-bottom-actions">
          <button class="btn btn-outline-dark" data-action="open-memorial" data-course="massas-italianas">Memorial Descritivo</button>
          <button class="btn btn-red" data-action="sales">▣ Acessar Cozinhas</button>
        </div>
      </div>
      ${footerNote()}
    </main>
    </div>`;
  }

  function misePage(): string {
    return `<main class="page-wrap">
      ${courseBanner('lesson')}
      <section class="mise-panel">
        <img src="${MEDIA.carbonaraEggCheese}" alt="Ingredientes organizados para a Carbonara">
        <div class="mise-copy">
          <span class="eyebrow">ANTES DA PRIMEIRA ETAPA</span>
          <h2>Vamos preparar a bancada.</h2>
          <p>Na cozinha, organizar tudo primeiro deixa cada passo mais gostoso. Vamos separar o que precisamos.</p>
          <div class="ingredient-grid">
            ${ingredients
              .map(
                (x, i) =>
                  `<label><input type="checkbox" data-mise="${i}" ${
                    state.miseChecks.indexOf(i) >= 0 ? 'checked' : ''
                  }><span>${esc(x)}</span></label>`
              )
              .join('')}
          </div>
          <div class="utensil-box">
            <strong>Utensílios e equipamentos</strong>
            <div>
              <span>Panela ampla</span>
              <span>Frigideira larga</span>
              <span>Tigela</span>
              <span>Ralador fino</span>
              <span>Escorredor e concha</span>
              <span>Pegador</span>
              <span>Tábua higienizada (separada)</span>
              <span>Termômetro culinário (recomendado)</span>
            </div>
          </div>
          <div class="safety-note">Higiene e segurança (Anvisa RDC 216/2004): lave as mãos e higienize tábuas/utensílios prevenindo contaminação cruzada; mantenha ovos pasteurizados refrigerados até o uso e verifique se a pele dura do guanciale foi removida. Alergênicos: trigo (glúten), ovos e leite.</div>
          <button class="btn btn-red" data-action="mise-ready">Minha bancada está pronta <span>→</span></button>
        </div>
      </section>
      ${footerNote()}
    </main>`;
  }

  function renderInteractiveIngredientsPanel(
    moduleId: string,
    stageIndex: number,
    stagePhoto?: string
  ): string {
    const items = getIngredientsForModuleStage(moduleId, stageIndex);
    const activeItem: IngredientItem =
      items.find((x) => x.id === selectedIngredientId) || items[0] || INGREDIENTS_CATALOG.spaghetti;
    const showcasePhoto = stagePhoto || getStageVisual(moduleId, stageIndex);

    return `<section class="cockpit-ingredients-box">
      <div class="cockpit-box-title">
        <i class="wood-stud" aria-hidden="true"></i>
        <span>INGREDIENTES DESTA ETAPA</span>
        <i class="wood-stud" aria-hidden="true"></i>
      </div>
      <div class="cockpit-ing-grid">
        ${items
          .map((item) => {
            const selected = item.id === activeItem.id;
            return `<button type="button" class="cockpit-ing-card ${
              selected ? 'is-selected' : ''
            }" data-action="select-ingredient" data-ingredient="${esc(item.id)}" aria-pressed="${selected}">
              <div class="cockpit-ing-thumb">
                <img src="${esc(item.image)}" alt="${esc(item.alt)}">
              </div>
              <strong>${esc(item.amount)}</strong>
              <span>${esc(item.name)}</span>
              ${selected ? '<b class="ing-active-arrow" aria-hidden="true">⌄</b>' : ''}
            </button>`;
          })
          .join('')}
      </div>
      <div class="cockpit-ing-showcase" aria-live="polite">
        <img class="cockpit-ing-showcase-bg" src="${esc(showcasePhoto)}" alt="" aria-hidden="true">
        <div class="cockpit-ing-showcase-shade"></div>
        <div class="cockpit-ing-caption-strip">
          <div class="cockpit-ing-caption-copy">
            <strong>${esc(activeItem.name)} · ${esc(activeItem.amount)}</strong>
            <span>${esc(activeItem.role)}</span>
          </div>
          <span class="cockpit-ing-pill">${esc(activeItem.name)} no preparo</span>
        </div>
      </div>
    </section>`;
  }

  function renderStageMediaPlayer(opts: {
    moduleId: string;
    stagePhoto: string;
    alt: string;
    voiceText: string;
    captionText: string;
    playerTitle: string;
  }): string {
    const { moduleId, stagePhoto, alt, voiceText, captionText, playerTitle } = opts;
    const totalSec = audioTotal > 0 && audioStatus !== 'idle' ? audioTotal : estimateAudioSeconds(voiceText);
    const elapsedSec = Math.min(audioElapsed, totalSec);
    const pctAudio = totalSec > 0 ? Math.min(100, Math.round((elapsedSec / totalSec) * 100)) : 0;
    const isPlaying = audioStatus === 'playing';
    const isMuted = (state.voiceVolume ?? 0.82) <= 0.01;

    return `<div class="cockpit-left-media">
      <div class="cockpit-stage-frame">
        <img class="${stagePhoto === MEDIA.pastaCarbonaraHero ? 'crop-pasta-right' : ''}" src="${esc(stagePhoto)}" alt="${esc(alt)}">
        <button type="button" class="cockpit-center-play ${isPlaying ? 'is-playing' : ''}" data-action="audio-toggle" data-text="${esc(voiceText)}" aria-label="${isPlaying ? 'Pausar narração da etapa' : 'Reproduzir narração da etapa'}" data-audio-center-btn>
          ${
            isPlaying
              ? '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6.5" y="5" width="4" height="14" rx="1"/><rect x="13.5" y="5" width="4" height="14" rx="1"/></svg>'
              : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l11-6.5z"/></svg>'
          }
        </button>
        <div class="cockpit-cc-overlay ${captionOpen ? 'is-open' : ''}" data-audio-cc-overlay>
          <p>${esc(voiceText)}</p>
        </div>
        <div class="cockpit-video-bar" title="${esc(playerTitle)}">
          <button type="button" class="video-bar-btn" data-action="audio-toggle" data-text="${esc(voiceText)}" aria-label="${isPlaying ? 'Pausar' : 'Reproduzir'}" data-audio-bar-btn>
            ${isPlaying ? '❚❚' : '▶'}
          </button>
          <span class="video-bar-time" data-audio-time>${formatTime(elapsedSec)} / ${formatTime(totalSec)}</span>
          <div class="video-bar-track" aria-hidden="true">
            <span class="video-bar-fill" style="width:${pctAudio}%" data-audio-progress-fill></span>
          </div>
          <button type="button" class="video-bar-btn" data-action="audio-toggle-mute" aria-label="${isMuted ? 'Ativar som' : 'Silenciar'}" data-audio-mute-btn>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12"/></svg>
          </button>
          <button type="button" class="video-bar-cc ${captionOpen ? 'is-active' : ''}" data-action="audio-toggle-cc" aria-label="Legenda da narração" data-audio-cc-btn>CC</button>
          <button type="button" class="video-bar-btn" data-action="eye" data-module="${esc(moduleId)}" aria-label="Ampliar detalhes no Olho do Chef" title="Olho do Chef">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>
          </button>
        </div>
      </div>
      <span class="sr-only" data-audio-state>${statusText()}</span>
      <p class="cockpit-media-caption sr-only">${esc(captionText)}</p>
    </div>`;
  }

  function renderUnifiedLessonCockpit(opts: {
    moduleId: string;
    moduleNumber: number;
    moduleTitle: string;
    moduleSubtitle: string;
    duration: string;
    level: string;
    activeTab: string;
    steps: {
      title: string;
      tag: string;
      body: string;
      tip: string;
      intro?: string;
      warning?: string;
      micro?: string[];
      photo: string;
      icon?: string;
      alt: string;
      caption: string;
      audioScript: string;
      hasTimer?: boolean;
    }[];
    currentIndex: number;
    doneIndices: number[];
    tabBodyHtml: string;
    lessonBannerHtml?: string;
    onPrevAction: string;
    onNextAction: string;
    onStepAction: string;
    backToCourseLabel: string;
    nextButtonLabel: string;
  }): string {
    const {
      moduleId,
      moduleNumber,
      moduleTitle,
      moduleSubtitle,
      duration,
      level,
      activeTab,
      steps,
      currentIndex,
      doneIndices,
      tabBodyHtml,
      lessonBannerHtml = '',
      onPrevAction,
      onNextAction,
      onStepAction,
      nextButtonLabel,
    } = opts;
    const total = steps.length;
    const doneCount = doneIndices.length;
    const pctDone = computeStepProgressPct(doneCount, total);
    const nextStep = steps[currentIndex + 1];
    const currentStep = steps[currentIndex];
    const moduleDishPhoto = recipeVisual(moduleId);

    return `<div class="cockpit-kitchen-backdrop" data-active-tab="${esc(activeTab)}">
    <main class="page-wrap lesson-cockpit-shell">
      <div class="cockpit-azulejo-side is-left" aria-hidden="true"></div>
      <div class="cockpit-azulejo-side is-right" aria-hidden="true"></div>
      <div class="cockpit-folio-sheet" data-active-tab="${esc(activeTab)}">
        <img class="cockpit-foliage cockpit-foliage-tl" src="/assets/foliage/foliage-1.png" alt="" aria-hidden="true" referrerpolicy="no-referrer" draggable="false">
        <img class="cockpit-foliage cockpit-foliage-ml" src="/assets/foliage/foliage-5.png" alt="" aria-hidden="true" referrerpolicy="no-referrer" draggable="false">
        <img class="cockpit-foliage cockpit-foliage-bl" src="/assets/foliage/foliage-3.png" alt="" aria-hidden="true" referrerpolicy="no-referrer" draggable="false">
        <img class="cockpit-foliage cockpit-foliage-tr" src="/assets/foliage/foliage-6.png" alt="" aria-hidden="true" referrerpolicy="no-referrer" draggable="false">
        <img class="cockpit-foliage cockpit-foliage-mr" src="/assets/foliage/foliage-7.png" alt="" aria-hidden="true" referrerpolicy="no-referrer" draggable="false">
        <img class="cockpit-foliage cockpit-foliage-br" src="/assets/foliage/foliage-8.png" alt="" aria-hidden="true" referrerpolicy="no-referrer" draggable="false">

        <div class="course-banner cockpit-banner">
          <div class="cockpit-banner-hero">
            <img class="cockpit-banner-bg" src="${MEDIA.fervecKitchen}" alt="" aria-hidden="true">
            <img class="cockpit-banner-dish ${moduleId === 'carbonara' ? 'crop-pasta-right' : ''}" src="${esc(moduleDishPhoto)}" alt="" aria-hidden="true">
            <div class="cockpit-banner-shade"></div>
            <div class="cockpit-crumb-row">
              <button type="button" class="cockpit-back-pill" data-action="courses">← Meus cursos</button>
              <span class="cockpit-module-pill">Módulo ${moduleNumber} de 6 · ${esc(moduleTitle)}</span>
            </div>
            <div class="course-banner-main">
              <div class="cockpit-banner-thumb">
                <img src="${MEDIA.fervecKitchen}" alt="Cozinha FerveC Gastronomia">
                <span class="cockpit-banner-logo-plaque">
                  <img src="/assets/fervec-logo-black.png" alt="FerveC Gastronomia" draggable="false">
                </span>
              </div>
              <div class="cockpit-banner-copy">
                <span class="eyebrow">CURSO · CHEF CREMONESE</span>
                <h1>Massas italianas</h1>
                <p>${esc(moduleSubtitle)}</p>
                <div class="course-facts">
                  <span><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg> Aulas: 6</span>
                  <span><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m10 8 6 4-6 4z"/></svg> ${esc(duration)}</span>
                  <span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 18h3v-5H4zM10.5 18h3V9h-3zM17 18h3V5h-3z"/></svg> ${esc(level)}</span>
                </div>
              </div>
            </div>
          </div>
          ${courseTabs(activeTab, moduleId)}
        </div>

        ${
          activeTab === 'lesson'
            ? renderLessonProgressStrip({
                pctDone,
                doneCount,
                total,
                nextStep,
                currentIndex,
                doneIndices,
                steps,
                onStepAction,
                lessonBannerHtml,
              })
            : ''
        }

        <div class="cockpit-main-body ${activeTab !== 'lesson' ? 'is-tab-panel' : ''}">
          ${tabBodyHtml}
        </div>

        ${
          activeTab === 'lesson'
            ? `<div class="lesson-dock cockpit-dock">
                <button type="button" class="btn cockpit-btn-back" data-action="${onPrevAction}" ${
                  currentIndex === 0 ? 'data-back-courses="1"' : ''
                }>‹ VOLTAR</button>
                <div class="cockpit-dock-links">
                  <button type="button" class="help-pill" data-action="sos" data-module="${esc(moduleId)}">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M9.6 9.2a2.5 2.5 0 1 1 4.1 1.9c-1 .8-1.7 1.1-1.7 2.5M12 17h.01"/></svg>
                    <span>Socorro, Chef!</span>
                  </button>
                  <button type="button" class="help-pill" data-action="eye" data-module="${esc(moduleId)}">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 15v4h12v-4M5 15a4 4 0 0 1-.5-7.9A5 5 0 0 1 14 4.5a4.5 4.5 0 0 1 5.5 2.6A4 4 0 0 1 19 15Z"/></svg>
                    <span>Olho do Chef</span>
                  </button>
                  <button type="button" class="help-pill" data-action="${
                    moduleId === 'carbonara' ? 'review' : 'recipe-tab'
                  }" ${moduleId !== 'carbonara' ? 'data-tab="review"' : ''}>
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h11l3 3v13H5z"/><path d="M8 9h8M8 13h8M8 17h5"/></svg>
                    <span>Revisar o que aprendi</span>
                  </button>
                </div>
                <button type="button" class="btn btn-red cockpit-btn-next" data-action="${onNextAction}">${esc(nextButtonLabel)} ›</button>
              </div>`
            : `<div class="lesson-dock cockpit-dock cockpit-dock-tab">
                <button type="button" class="btn cockpit-btn-back" data-action="courses">‹ VOLTAR AOS MÓDULOS</button>
                <span class="dock-sep" aria-hidden="true"></span>
                <div class="cockpit-dock-links">
                  <button type="button" class="help-pill" data-action="${
                    moduleId === 'carbonara' ? 'lesson' : 'recipe-tab'
                  }" ${moduleId !== 'carbonara' ? 'data-tab="lesson"' : ''}>
                    <svg viewBox="0 0 24 24" aria-hidden="true"><polygon points="6,4 19,12 6,20"/></svg>
                    <span>Voltar para a aula</span>
                  </button>
                  <span class="dock-sep" aria-hidden="true"></span>
                  <button type="button" class="help-pill" data-action="open-chef-chat">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12a8 8 0 1 1 3 6.2L3 20l1-4.2A8 8 0 0 1 4 12Z"/></svg>
                    <span>Perguntar ao Chef IA</span>
                  </button>
                </div>
                <span class="dock-sep" aria-hidden="true"></span>
                <span class="cockpit-step-badge">${esc(currentStep.tag)}</span>
              </div>`
        }
      </div>
      <div class="cockpit-azulejo-footer" aria-hidden="true">
        <div class="cockpit-azulejo-strip"></div>
        <div class="cockpit-wood-edge">
          <img class="cockpit-edge-produce" src="/assets/foliage/footer-produce.png" alt="" draggable="false">
        </div>
      </div>
    </main>
    <div class="cockpit-outside-meta">${footerNote()}</div>
    </div>`;
  }

  function lesson(): string {
    if (prepMode && !state.mise) return misePage();
    state.lastModuleId = 'carbonara';
    const s = stages[lessonStage];
    const nextLabel =
      lessonStage === stages.length - 1 ? 'CONCLUIR AULA' : 'CONCLUIR ETAPA E SEGUIR';
    const voiceText = s.audioScript || `${s.title}. ${s.intro} ${s.tip}`;

    const timerWidget = s.timer
      ? `<section class="cockpit-timer-box">
          <div class="cockpit-timer-head">
            <strong>Cronômetro do Cozimento</strong>
            <strong class="timer-display" data-timer>${formatTime(timerValue)}</strong>
          </div>
          <div class="cockpit-timer-controls">
            <label class="timer-input-label">Minutos
              <input type="number" min="1" max="180" placeholder="ex.: 9" data-timer-input>
            </label>
            <button class="btn btn-red" data-action="timer-start">${
              timerRunning ? 'Rodando…' : timerValue > 0 ? 'Retomar' : 'Iniciar'
            }</button>
            <button class="btn btn-outline-dark" data-action="timer-pause">Pausar</button>
            <button class="text-action" data-action="timer-reset">Zerar</button>
          </div>
        </section>`
      : '';

    const stagePhoto = getStageVisual('carbonara', lessonStage);
    const lessonIsDone = Boolean(state.lessonFinished || state.done.length >= stages.length);
    const lessonBannerHtml = renderModuleStageNotificationBanner({
      iconType: 'lesson',
      title: 'Aula prática • Spaghetti alla Carbonara',
      description: `Etapa ${lessonStage + 1} de ${stages.length}: ${s.title}`,
      isDone: lessonIsDone,
      isReady: state.done.length >= stages.length,
      doneLabel: 'Concluído',
      progressLabel: 'Em andamento',
    });
    const tabBody = `<div class="cockpit-two-col">
      <div class="cockpit-left-col">
        ${renderStageMediaPlayer({
          moduleId: 'carbonara',
          stagePhoto,
          alt: s.alt,
          voiceText,
          captionText: `${s.caption} — Use o play para ouvir a narração guiada do Chef.`,
          playerTitle: s.title,
        })}
        ${renderOlhoDoChefCard(s.quote || s.tip, 'Chef Cremonese.')}
      </div>

      <div class="cockpit-right-guide">
        <div class="cockpit-step-header">
          <div>
            <h2>${esc(s.title)}</h2>
            <p>${esc(s.intro)}</p>
          </div>
          <img class="cockpit-chef-portrait crop-chef-face" src="${MEDIA.chefOfficialPortrait}" alt="Chef Cremonese">
        </div>

        <div class="cockpit-what-box">
          <span class="cockpit-box-svg" aria-hidden="true">
            <svg viewBox="0 0 24 24"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.7.5 1 1.2 1 2.1h5c0-.9.3-1.6 1-2.1A6 6 0 0 0 12 3Z"/></svg>
          </span>
          <div>
            <strong>O QUE VAMOS FAZER?</strong>
            <p>${esc(s.tip)}</p>
          </div>
        </div>

        <div class="cockpit-prep-box">
          <div class="cockpit-prep-head">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 15v4h12v-4M5 15a4 4 0 0 1-.5-7.9A5 5 0 0 1 14 4.5a4.5 4.5 0 0 1 5.5 2.6A4 4 0 0 1 19 15Z"/></svg>
            <strong>PREPARAÇÃO – O QUE FAZER AGORA</strong>
          </div>
          <ol class="cockpit-step-checklist">
            ${s.micro
              .map(
                (m, i) => `<li>
                  <label class="micro-item">
                    <input type="checkbox" data-micro="${i}" ${isMicroDone(lessonStage, i) ? 'checked' : ''}>
                    <span class="micro-num-circle">${i + 1}</span>
                    <span>${esc(m)}</span>
                  </label>
                </li>`
              )
              .join('')}
          </ol>
          <p class="cockpit-prep-body-note">${esc(s.body)}</p>
        </div>

        ${renderInteractiveIngredientsPanel('carbonara', lessonStage, stagePhoto)}
      </div>
    </div>
    ${timerWidget}
    ${renderStandardCompletionAction({
      isDone: lessonIsDone,
      buttonLabel: 'Marcar aula como concluída',
      actionName: 'lesson-mark-complete',
      doneText: 'Aula concluída! Você já pode seguir para Trabalho ou Revisão.',
      nextCtaLabel: 'Ir para Trabalho →',
      nextCtaAction: 'questions',
    })}
    <details class="cockpit-auxiliary-drawer">
      <summary>Ficha técnica completa (${esc(carbonaraTechSheet.yield)}), segurança alimentar e alergênicos</summary>
      ${renderTechnicalSheetDetails(carbonaraTechSheet, {
        stepWarning: s.warning,
        editorialAlert: carbonaraTechSheet.didacticAdaptations,
      })}
    </details>`;

    return renderUnifiedLessonCockpit({
      moduleId: 'carbonara',
      moduleNumber: 1,
      moduleTitle: 'Spaghetti alla Carbonara',
      moduleSubtitle: course.subtitle,
      duration: course.duration,
      level: course.level,
      activeTab: 'lesson',
      steps: stages.map((st, sIdx) => ({
        title: st.title,
        tag: st.tag,
        body: st.body,
        tip: st.tip,
        intro: st.intro,
        warning: st.warning,
        micro: st.micro,
        photo: getStageVisual('carbonara', sIdx),
        icon: getStageIcon('carbonara', sIdx),
        alt: st.alt,
        caption: st.caption,
        audioScript: st.audioScript || `${st.title}. ${st.intro} ${st.tip}`,
        hasTimer: st.timer,
      })),
      currentIndex: lessonStage,
      doneIndices: state.done,
      tabBodyHtml: tabBody,
      lessonBannerHtml,
      onPrevAction: 'lesson-prev',
      onNextAction: 'lesson-next',
      onStepAction: 'jump-step',
      backToCourseLabel: 'Voltar',
      nextButtonLabel: nextLabel,
    });
  }

  function renderCarbonaraTabCockpit(activeTab: string, innerHtml: string): string {
    return renderUnifiedLessonCockpit({
      moduleId: 'carbonara',
      moduleNumber: 1,
      moduleTitle: 'Spaghetti alla Carbonara',
      moduleSubtitle: course.subtitle,
      duration: course.duration,
      level: course.level,
      activeTab,
      steps: stages.map((st, sIdx) => ({
        title: st.title,
        tag: st.tag,
        body: st.body,
        tip: st.tip,
        intro: st.intro,
        warning: st.warning,
        micro: st.micro,
        photo: getStageVisual('carbonara', sIdx),
        icon: getStageIcon('carbonara', sIdx),
        alt: st.alt,
        caption: st.caption,
        audioScript: st.audioScript || `${st.title}. ${st.intro} ${st.tip}`,
        hasTimer: st.timer,
      })),
      currentIndex: lessonStage,
      doneIndices: state.done,
      tabBodyHtml: `<div class="cockpit-tab-parchment">${innerHtml}</div>`,
      onPrevAction: 'lesson-prev',
      onNextAction: 'lesson-next',
      onStepAction: 'jump-step',
      backToCourseLabel: 'Voltar',
      nextButtonLabel: 'CONCLUIR ETAPA E SEGUIR',
    });
  }

  function carbonaraCertPage(): string {
    const isSupabaseUser = userProfile?.authSource === 'supabase';
    const isDevAdmin = Boolean(
      isSupabaseUser && workspaceData?.permissions?.canBypassExamForCertificates
    );
    const eligible = isSupabaseUser
      ? Boolean(isDevAdmin || workspaceData?.eligibleForCertificate || issuedCertificate)
      : false;
    const localPassed = state.lessonFinished && state.examAttempts.some((x) => x.passed);
    return renderCarbonaraTabCockpit(
      'carbonara-cert',
      `<section class="certificate-page" style="margin-top:8px">
        <span class="eyebrow">SEU CERTIFICADO · MÓDULO 1</span>
        <h2>Todo aprendizado merece ser celebrado!</h2>
        <p>${
          eligible
            ? isDevAdmin && !workspaceData?.attempts?.some((a) => a.attempt_type === 'exam' && a.passed)
              ? 'Conta administrativa autenticada com emissão liberada pelo servidor para qualquer curso.'
              : 'Etapas de Spaghetti alla Carbonara concluídas e aprovação oficial registrada no banco de dados. Seu certificado já está liberado.'
            : localPassed && !isSupabaseUser
              ? 'Você atingiu a nota mínima na prévia local. Entre com sua conta cadastrada para validar sua prova no sistema e emitir o certificado oficial.'
              : 'Conclua as 6 etapas, a revisão e seja aprovado na prova (mínimo 70%) para liberar automaticamente o certificado oficial.'
        }</p>
        <div class="certificate-note" style="margin-top:18px">
          <strong>${
            eligible && issuedCertificate
              ? `Certificado liberado · Código ${esc(issuedCertificate.certificate_code)}`
              : eligible
                ? 'Aprovação confirmada — certificado pronto para emissão em PDF.'
                : 'Emissão automática vinculada à aprovação na avaliação.'
          }</strong>
          <p>${
            eligible
              ? 'Acesse a aba Certificados para visualizar o documento com seus dados reais e baixar o arquivo oficial em PDF.'
              : 'Somente alunos autenticados e aprovados na prova podem emitir ou baixar o certificado em PDF.'
          }</p>
        </div>
        <div class="lesson-actions" style="justify-content:flex-start;flex-wrap:wrap;">
          <button type="button" class="btn btn-red" data-action="certificate">Abrir aba Certificados</button>
          <button type="button" class="btn btn-outline-dark" data-action="open-memorial" data-course="massas-italianas">Memorial Descritivo</button>
        </div>
      </section>`
    );
  }

  function questionResults(): string {
    const a = state.questionAttempts[state.questionAttempts.length - 1] || {
      score: 0,
      answers: state.questionsAnswers,
    };
    const isDone = Boolean(state.questionsFinished);
    return renderCarbonaraTabCockpit(
      'questions',
      `${renderModuleStageNotificationBanner({
        iconType: 'work',
        title: 'Trabalho prático • Spaghetti alla Carbonara',
        description: 'Responda todas as perguntas obrigatórias para consolidar a técnica.',
        isDone,
        isReady: true,
        doneLabel: 'Concluído',
        progressLabel: 'Em andamento',
      })}
      <section class="result-card">
        <span class="eyebrow">PERGUNTAS CONCLUÍDAS</span>
        <div class="result-medal">${a.score || 0}/${a.questionSnapshots?.length || questions.length}</div>
        <h2>Você está indo muito bem!</h2>
        <p>As respostas ajudam a revisar os conceitos. A avaliação final é uma etapa separada.${
          a.bankVersion ? ` · Banco ${esc(a.bankVersion)}` : ''
        }</p>
        <div class="answer-review-list">
          ${renderAttemptAnswerReview(questions, a.answers, a.questionSnapshots, true)}
        </div>
        ${renderStandardCompletionAction({
          isDone,
          buttonLabel: 'Marcar trabalho como concluído',
          actionName: 'questions-mark-complete',
          doneText: 'Trabalho concluído com sucesso! Seu progresso foi atualizado.',
          nextCtaLabel: 'Ir para revisão →',
          nextCtaAction: 'review',
        })}
        <div class="lesson-actions" style="justify-content:flex-start;flex-wrap:wrap;margin-top:12px;">
          ${btn('Responder novamente', 'questions-retry', 'btn btn-outline-dark')}
        </div>
      </section>`
    );
  }

  function questionView(): string {
    const finished = state.questionsFinished && state.questionAttempts.length > 0;
    const answeredCount = state.questionsAnswers.filter((v) => v !== null && v !== undefined).length;
    if (finished || answeredCount >= questions.length) return questionResults();
    const q = questions[qIndex];
    const answer = state.questionsAnswers[qIndex];
    return renderCarbonaraTabCockpit(
      'questions',
      renderUnifiedTrabalhoSection({
        currentIndex: qIndex,
        totalQuestions: questions.length,
        questionText: q.q,
        options: q.a,
        selectedAnswer: answer,
        correctIndex: q.correct,
        explanation: q.why,
        chefTip: q.tip,
        answerAction: 'question-answer',
        nextAction: 'question-next',
        backAction: 'question-back',
        showNavButtons: false,
        bannerTitle: 'Trabalho prático • Spaghetti alla Carbonara',
        workCompleted: Boolean(state.questionsFinished),
        answeredCount,
        completeAction: 'questions-mark-complete',
        canCompleteWork: canCompleteModuleWork(answeredCount, questions.length),
      })
    );
  }

  function review(): string {
    const ready = Boolean(state.lessonFinished && state.reviewDone);
    const carbThumbPool = [
      MEDIA.carbonaraEggCheese,
      MEDIA.techGuancialePan,
      MEDIA.techPastaBoiling,
      MEDIA.carbonaraEggCheese,
      MEDIA.pastaCarbonaraHero,
      MEDIA.techGuancialePan,
      MEDIA.techPastaBoiling,
      MEDIA.pastaCarbonaraHero,
    ];
    const techniques: ReviewTechniqueCardInput[] = reviewItems.map((x, i) => ({
      title: x[0],
      description: x[1],
      image: carbThumbPool[i] || MEDIA.pastaCarbonaraHero,
      detailAction: 'review-detail',
      detailAttrName: 'review',
      detailAttrValue: String(i),
    }));
    const carbonaraErrors: ReviewErrorCardInput[] = [
      {
        text: 'Ovo coagulado pelo calor direto: afaste a frigideira do fogo e use ovos pasteurizados.',
        image: MEDIA.carbonaraEggCheese,
        detailAction: 'review-detail',
        modalTitle: 'Ovo coagulado e segurança microbiológica',
        modalCopy:
          'Afaste sempre a frigideira do fogo direto antes de juntar a mistura de ovos pasteurizados e Pecorino. Lembre: o calor residual da massa não garante eliminação de patógenos e textura cremosa não comprova segurança.',
      },
      {
        text: 'Excesso de sal ou gordura: modere o sal da água e controle a gordura do guanciale.',
        image: MEDIA.techGuancialePan,
        detailAction: 'review-detail',
        modalTitle: 'Controle de gordura do guanciale e sal',
        modalCopy:
          'Retire a pele dura do guanciale, corte uniforme e doure na própria gordura em fogo brando. Retire excesso de gordura se houver sobra, reserve parte crocante para a montagem e modere o sal da água.',
      },
      {
        text: 'Molho seco ou massa mole: reserve água amilácea e prove o ponto al dente.',
        image: MEDIA.techPastaBoiling,
        detailAction: 'review-detail',
        modalTitle: 'Ponto al dente e ajuste com água do cozimento',
        modalCopy:
          'Reserve a água rica em amido antes de escorrer o spaghetti al dente e adicione colher a colher na emulsão fora do fogo direto, sem jamais usar creme de leite.',
      },
      {
        text: 'Serviço demorado ou contaminação cruzada: sirva imediatamente e aplique a RDC 216/2004.',
        image: MEDIA.pastaCarbonaraHero,
        detailAction: 'review-detail',
        modalTitle: 'Serviço imediato, alergênicos e boas práticas',
        modalCopy:
          'Sirva na hora com o guanciale crocante e Pecorino reservados; não mantenha à temperatura ambiente. Higienize mãos e utensílios separando crus de prontos. Alergênicos: trigo (glúten), ovos e leite.',
      },
    ];

    return renderCarbonaraTabCockpit(
      'review',
      renderUnifiedReviewSection({
        moduleId: 'carbonara',
        moduleTitle: 'Spaghetti alla Carbonara',
        chefTip: 'Um resumo simples para lembrar o que faz a Carbonara dar certo.',
        isCompleteSteps: state.lessonFinished,
        reviewDone: Boolean(state.reviewDone),
        heroPhoto: MEDIA.pastaCarbonaraHero,
        heroAlt: 'Spaghetti alla Carbonara finalizada, imagem ilustrativa',
        techniques,
        errors: carbonaraErrors,
        completeAction: 'review-complete',
        examCtaAction: 'start-exam',
        canStartExam: ready,
        blockedExamText: 'Conclua as seis etapas da aula para liberar a prova final.',
      })
    );
  }

  function examIntro(): string {
    const latest = state.examAttempts[state.examAttempts.length - 1];
    return renderCarbonaraTabCockpit(
      'exam',
      `<section class="exam-intro">
        <span class="eyebrow">AVALIAÇÃO FINAL</span>
        <div class="exam-icon">✳</div>
        <h2>Hora de juntar tudo.</h2>
        <p>São oito perguntas sobre o que vimos na aula. Para aprovação, é preciso acertar pelo menos 70%. Se não der na primeira vez, revisamos juntos e tentamos de novo.</p>
        <ul>
          <li>8 perguntas, uma por tela</li>
          <li>4 alternativas por pergunta</li>
          <li>Você revisa antes de enviar</li>
          <li>Novas tentativas permitidas</li>
        </ul>
        <div class="exam-last">${
          latest
            ? `Última tentativa: ${latest.score}% · ${latest.passed ? 'aprovada' : 'vamos tentar de novo'}`
            : 'Nenhuma tentativa registrada ainda.'
        }</div>
        ${
          state.examAttempts.length
            ? `<div class="attempt-history"><strong>Histórico de tentativas</strong>${state.examAttempts
                .map(
                  (x, i) =>
                    `<span>Tentativa ${i + 1}: ${x.score}% · ${x.passed ? 'aprovada' : 'refazer'}</span>`
                )
                .join('')}</div>`
            : ''
        }
        ${btn('Começar avaliação', 'begin-exam', 'btn btn-red')}
      </section>`
    );
  }

  function examQuestion(): string {
    const q = exam[state.examCurrent];
    const value = state.examAnswers[state.examCurrent];
    return renderCarbonaraTabCockpit(
      'exam',
      `<section class="quiz-wrap">
        <div class="quiz-heading">
          <span class="eyebrow">AVALIAÇÃO FINAL · UMA ETAPA DE CADA VEZ</span>
          <h2>Confie no que você aprendeu.</h2>
        </div>
        <div class="quiz-progress">
          <div class="progress-track"><span style="width:${Math.round((state.examCurrent / exam.length) * 100)}%"></span></div>
          <span>Pergunta ${state.examCurrent + 1} de ${exam.length}</span>
        </div>
        <article class="quiz-card">
          <p class="question-number">PERGUNTA ${state.examCurrent + 1} · AVALIAÇÃO</p>
          <h3>${esc(q.q)}</h3>
          <div class="answer-list">
            ${q.a
              .map(
                (x, i) =>
                  `<button class="answer-option ${value === i ? 'picked' : ''}" data-action="exam-answer" data-answer="${i}">
                    <span class="option-letter">${String.fromCharCode(65 + i)}</span>
                    <span>${esc(x)}</span>
                  </button>`
              )
              .join('')}
          </div>
          <div class="exam-nav-buttons">
            <button class="btn btn-outline-dark" data-action="exam-back" ${state.examCurrent === 0 ? 'disabled' : ''}>← Voltar</button>
            <button class="btn btn-red" data-action="exam-next" ${value == null ? 'disabled' : ''}>${
              state.examCurrent === exam.length - 1 ? 'Revisar respostas' : 'Próxima →'
            }</button>
          </div>
        </article>
      </section>`
    );
  }

  function examReview(): string {
    return renderCarbonaraTabCockpit(
      'exam',
      `<section class="quiz-wrap">
        <div class="quiz-heading">
          <span class="eyebrow">REVISÃO ANTES DO ENVIO</span>
          <h2>Confira suas respostas.</h2>
          <p>Toque em uma pergunta para alterá-la. Depois, confirme o envio.</p>
        </div>
        <div class="exam-review-list">
          ${exam
            .map(
              (q, i) =>
                `<button class="exam-review-row" data-action="exam-edit" data-question="${i}">
                  <span class="review-num">0${i + 1}</span>
                  <span><strong>${esc(q.q)}</strong><small>${
                    state.examAnswers[i] == null
                      ? 'Ainda sem resposta'
                      : esc(q.a[state.examAnswers[i] as number])
                  }</small></span>
                  <span>Editar →</span>
                </button>`
            )
            .join('')}
        </div>
        <div class="exam-nav-buttons">
          <button class="btn btn-outline-dark" data-action="exam-edit" data-question="${exam.length - 1}">← Voltar às perguntas</button>
          <button class="btn btn-red" data-action="submit-exam">Enviar avaliação</button>
        </div>
      </section>`
    );
  }

  function examResult(): string {
    const result = state.examAttempts[state.examAttempts.length - 1] || {
      score: 0,
      passed: false,
      answers: [],
    };
    return renderCarbonaraTabCockpit(
      'exam',
      `<section class="result-card">
        <span class="eyebrow">RESULTADO DA AVALIAÇÃO</span>
        <div class="result-medal">${result.score}%</div>
        <h2>${result.passed ? 'PARABÉNS! VOCÊ CONSEGUIU!' : 'Não desanime! Vamos revisar juntos e tentar novamente.'}</h2>
        <p>${
          result.passed
            ? 'Você concluiu sua avaliação! Seu aprendizado merece ser comemorado.'
            : 'A nota mínima é 70%. Reveja as etapas e tente outra vez; novas tentativas estão liberadas.'
        }${result.bankVersion ? ` · Banco ${esc(result.bankVersion)}` : ''}</p>
        <div class="answer-review-list">
          ${renderAttemptAnswerReview(exam, result.answers, result.questionSnapshots, false)}
        </div>
        ${btn(
          result.passed ? 'Ver certificado' : 'Revisar conteúdo',
          result.passed ? 'certificate' : 'review',
          result.passed ? 'btn btn-saffron' : 'btn btn-outline-dark'
        )}
        ${btn('Tentar novamente', 'retry-exam', 'text-action')}
      </section>`
    );
  }

  function examPage(): string {
    if (examStatus === 'result') return examResult();
    if (examStatus === 'review') return examReview();
    if (examStatus === 'question') return examQuestion();
    return examIntro();
  }

  function certificate(): string {
    const { modules } = getAllModulesSummary();
    const isSupabaseUser = userProfile?.authSource === 'supabase';
    const isDevAdmin = Boolean(
      isSupabaseUser && workspaceData?.permissions?.canBypassExamForCertificates
    );
    const allServerCourses = Array.isArray(workspaceData?.courses) ? workspaceData!.courses : [];
    const devCourses = isDevAdmin ? allServerCourses : [];
    const activeSlug = isDevAdmin
      ? selectedDevCertCourseSlug || workspaceData?.course?.slug || 'massas-italianas'
      : 'massas-italianas';
    const activeCourseObj = allServerCourses.find((c) => c.slug === activeSlug) || null;
    const activeCourseTitle =
      activeCourseObj?.title ||
      (activeSlug === workspaceData?.course?.slug ? workspaceData?.course?.title : '') ||
      'Massas Italianas';

    const issuedList: ServerCertificateRecord[] = isSupabaseUser
      ? Array.isArray(workspaceData?.certificates) && workspaceData!.certificates.length > 0
        ? workspaceData!.certificates
        : issuedCertificate
          ? [issuedCertificate]
          : []
      : [];

    const activeCertRecord =
      issuedList.find(
        (c) =>
          c.courseSlug === activeSlug ||
          (activeCourseObj ? c.course_id === activeCourseObj.id : false)
      ) || (activeSlug === 'massas-italianas' ? issuedCertificate : null);

    const hasServerEligibility = Boolean(
      isSupabaseUser && (isDevAdmin || workspaceData?.eligibleForCertificate || activeCertRecord)
    );
    const localPassed =
      (state.lessonFinished && state.examAttempts.some((x) => x.passed)) ||
      modules.some((m) => m.examPassed);

    const workloadLabel =
      activeCertRecord?.workloadLabel ||
      activeCourseObj?.workloadLabel ||
      (activeSlug === 'massas-italianas' ? workspaceData?.workloadLabel : '') ||
      computeCourseWorkloadLabel(modules.map((m) => m.duration));

    const certStudentName =
      activeCertRecord?.studentName ||
      activeCertRecord?.student_name_snapshot ||
      workspaceData?.profile?.full_name ||
      userProfile?.fullName ||
      '';
    const certCpfMasked =
      activeCertRecord?.cpfMasked ||
      workspaceData?.profile?.cpf_masked ||
      userProfile?.cpfMasked ||
      '';
    const certCompletionDate =
      activeCertRecord?.completionDate ||
      (activeSlug === 'massas-italianas' ? workspaceData?.completionDate : '') ||
      (isDevAdmin ? formatBrDate(new Date().toISOString()) : '') ||
      '';
    const certIssuedDate = activeCertRecord?.issuedDate || '';
    const certCode = activeCertRecord?.certificate_code || '';

    const showLiveFields = hasServerEligibility && Boolean(certStudentName);
    const showCustomCoursePill =
      showLiveFields && activeCourseTitle.toLowerCase() !== 'massas italianas';

    const laurelPath = `
      <path d="M52 78 C24 64 14 40 28 8" fill="none" stroke="url(#laurelGold)" stroke-width="2.6" stroke-linecap="round"/>
      <path d="M27 12 c-8 2-12 7-8 12 c5-1 9-5 8-12Z" fill="url(#laurelGold)"/>
      <path d="M23 22 c-9 2-13 8-8 13 c5-1 9-6 8-13Z" fill="url(#laurelGold)"/>
      <path d="M21 33 c-9 2-12 9-7 13 c5-2 9-6 7-13Z" fill="url(#laurelGold)"/>
      <path d="M22 44 c-8 3-11 10-5 14 c5-2 8-7 5-14Z" fill="url(#laurelGold)"/>
      <path d="M27 55 c-7 4-9 11-2 14 c5-3 6-8 2-14Z" fill="url(#laurelGold)"/>
      <path d="M35 65 c-5 5-5 11 2 13 c4-4 3-9-2-13Z" fill="url(#laurelGold)"/>
      <path d="M31 16 c6 4 7 9 2 13 c-4-3-5-8-2-13Z" fill="url(#laurelGold)"/>
      <path d="M28 27 c7 4 7 10 2 14 c-4-3-5-8-2-14Z" fill="url(#laurelGold)"/>
      <path d="M27 38 c7 4 7 10 2 14 c-4-3-5-9-2-14Z" fill="url(#laurelGold)"/>
      <path d="M29 49 c7 3 8 9 3 13 c-5-2-6-7-3-13Z" fill="url(#laurelGold)"/>
      <path d="M35 59 c6 2 8 7 4 12 c-4-2-6-6-4-12Z" fill="url(#laurelGold)"/>
    `;

    return `<main class="page-wrap cert-wrap-dark">
      <img class="cert-backdrop-photo" src="${MEDIA.fervecKitchen}" alt="" aria-hidden="true">
      <div class="cert-backdrop-shade" aria-hidden="true"></div>
      <div class="cert-wood-tabletop" aria-hidden="true"></div>
      ${courseBanner('certificate')}
      <section class="certificate-page cert-showcase">
        <div class="cert-hero-heading">
          <span class="eyebrow">CELEBRAR TAMBÉM FAZ PARTE</span>
          <div class="cert-laurel-row">
            <svg class="cert-laurel-svg" viewBox="0 0 64 86" aria-hidden="true">
              <defs><linearGradient id="laurelGold" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#fff0a8"/><stop offset="50%" stop-color="#e4b74f"/><stop offset="100%" stop-color="#b87d1c"/></linearGradient></defs>
              ${laurelPath}
            </svg>
            <h2>Seu certificado</h2>
            <svg class="cert-laurel-svg is-flipped" viewBox="0 0 64 86" aria-hidden="true">
              ${laurelPath}
            </svg>
          </div>
          <p class="certificate-sub">Todo aprendizado merece ser celebrado!</p>
        </div>

        <div class="cert-parchment-frame ${hasServerEligibility ? 'ready' : 'pending'}">
          <img
            class="cert-official-art"
            src="/assets/aistudio/WhatsApp_Image_2026-11-13_at_03.23.24__1__ca35213d.jpeg"
            alt="Certificado de Conclusão do curso ${esc(activeCourseTitle)} — FerveC Gastronomia"
            referrerpolicy="no-referrer"
            draggable="false"
          >
          ${
            showLiveFields
              ? `<div class="cert-live-overlay" aria-label="Dados reais do certificado emitido">
                  <div class="cert-field-name" data-cert-field="student-name">${esc(certStudentName)}</div>
                  ${
                    showCustomCoursePill
                      ? `<div class="cert-field-course" data-cert-field="course-title">${esc(activeCourseTitle)}.</div>`
                      : ''
                  }
                  <div class="cert-field-workload" data-cert-field="workload">${esc(workloadLabel)}</div>
                  <div class="cert-field-cpf" data-cert-field="cpf">${esc(certCpfMasked || '***.***.***-**')}</div>
                  <div class="cert-field-date" data-cert-field="completion-date">${esc(certCompletionDate || certIssuedDate)}</div>
                  ${
                    certCode
                      ? `<div class="cert-field-meta" data-cert-field="code">Código: ${esc(certCode)}${certIssuedDate ? ` · Emitido em ${esc(certIssuedDate)}` : ''}</div>`
                      : ''
                  }
                </div>`
              : ''
          }
          <button
            type="button"
            class="cert-qr-hotspot"
            data-action="open-memorial"
            data-course="massas-italianas"
            aria-label="Abrir Memorial Descritivo do Curso pelo QR Code"
            title="Abrir Memorial Descritivo do Curso"
          ></button>
        </div>

        <div class="cert-action-bar">
          <button type="button" class="btn btn-red cert-primary-pill" data-action="generate-cert-pdf" ${certPdfBusy ? 'disabled' : ''}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12m0 0-4-4m4 4 4-4"/><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/></svg>
            <span>${certPdfBusy ? 'Gerando PDF...' : 'Baixar Certificado (PDF)'}</span>
          </button>
          <button type="button" class="btn cert-cream-pill" data-action="cert-print-unavailable">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
            <span>Imprimir</span>
          </button>
          <button type="button" class="btn cert-cream-pill" data-action="share-memorial">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4m0-11-6.8 4"/></svg>
            <span>Compartilhar</span>
          </button>
        </div>

        <div class="certificate-note cert-honesty-card">
          <span class="cert-official-ribbon" aria-hidden="true">
            <svg viewBox="0 0 36 36"><path d="M13 21 L9 33 L16 29 L18 33 L18 21 Z" fill="#b81c24"/><path d="M23 21 L27 33 L20 29 L18 33 L18 21 Z" fill="#8f1117"/><circle cx="18" cy="14" r="10" fill="#efc246" stroke="#8a5a10" stroke-width="1.4"/><path d="M14 14 l3 3 5-6" fill="none" stroke="#2c1d0f" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </span>
          <div>
            <strong>${
              hasServerEligibility
                ? certCode
                  ? `Certificado oficial (${esc(certCode)})`
                  : isDevAdmin
                    ? 'Permissão administrativa de emissão liberada.'
                    : 'Certificado oficial'
                : !isSupabaseUser && localPassed
                  ? 'Certificado oficial · Prévia local aprovada'
                  : 'Certificado oficial'
            }</strong>
            <p>${
              hasServerEligibility
                ? `Titular: ${esc(certStudentName)} · CPF ${esc(certCpfMasked)} · Curso: ${esc(
                    activeCertRecord?.course_title_snapshot || activeCourseTitle
                  )} (${esc(workloadLabel)}). Válido para comprovação de conclusão do curso com registro digital.`
                : isSupabaseUser
                  ? `Para liberar a emissão do certificado em PDF, conclua um módulo do curso e alcance pelo menos ${PASSING_SCORE_PERCENT}% de aproveitamento na prova correspondente.`
                  : 'Válido para comprovação de conclusão do curso na FerveC Gastronomia após autenticação e aprovação na avaliação.'
            }</p>
            ${
              isDevAdmin
                ? `<div class="cert-dev-course-row">
                    <label for="dev-cert-course-select">Conta administrativa vinculada (${esc(workspaceData?.profile?.email || userProfile?.email || '')}) — Curso:</label>
                    <select id="dev-cert-course-select" class="cert-dev-course-select" data-action="select-dev-cert-course">
                      ${(devCourses.length > 0
                        ? devCourses
                        : [{ slug: 'massas-italianas', title: 'Massas Italianas', workloadLabel }]
                      )
                        .map(
                          (c) =>
                            `<option value="${esc(c.slug)}" ${c.slug === activeSlug ? 'selected' : ''}>${esc(c.title)}${c.workloadLabel ? ` (${esc(c.workloadLabel)})` : ''}</option>`
                        )
                        .join('')}
                    </select>
                    <button type="button" class="btn btn-red cert-row-btn" data-action="generate-cert-pdf" ${certPdfBusy ? 'disabled' : ''}>
                      ${certPdfBusy ? 'Gerando...' : '⚡ Emitir e baixar PDF agora (Admin)'}
                    </button>
                  </div>`
                : ''
            }
          </div>
          <span class="status-chip ${hasServerEligibility ? 'is-confirmed' : ''}">
            <i aria-hidden="true">${hasServerEligibility ? '✓' : '•'}</i>
            <span>${
              hasServerEligibility
                ? 'Conclusão confirmada'
                : isSupabaseUser
                  ? 'Aprovação pendente'
                  : isSupabaseConfigured()
                    ? 'Entre na conta'
                    : 'Supabase pendente'
            }</span>
          </span>
        </div>

        <details class="cert-registry-drawer" ${isDevAdmin || issuedList.length > 0 ? 'open' : ''}>
          <summary>
            <span>Registro oficial no banco de dados</span>
            <span class="cert-registry-count">${issuedList.length} ${issuedList.length === 1 ? 'certificado' : 'certificados'}</span>
          </summary>
        <section class="cert-registry-card" aria-label="Certificados emitidos no banco de dados">
          <div class="cert-registry-head">
            <div>
              <span class="eyebrow">REGISTRO OFICIAL NO BANCO DE DADOS</span>
              <h3>Certificados emitidos</h3>
              <p>Os registros abaixo refletem diretamente os dados do seu cadastro, curso concluído, carga horária calculada em minutos e emissões salvas no Supabase.</p>
            </div>
            <span class="cert-registry-count">${issuedList.length} ${issuedList.length === 1 ? 'certificado' : 'certificados'}</span>
          </div>
          ${
            !isSupabaseUser
              ? `<div class="cert-registry-empty">
                  <p>${
                    isSupabaseConfigured()
                      ? 'Entre na sua conta autenticada para carregar os certificados emitidos diretamente do banco de dados.'
                      : 'Conexão com o banco Supabase ainda não configurada neste ambiente (defina VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY nas variáveis/Secrets do servidor para conectar sua conta administrativa ou de aluno).'
                  }</p>
                  <div class="cert-registry-empty-actions">
                    <button type="button" class="btn btn-red" data-action="${isSupabaseConfigured() ? 'open-login-modal' : 'account'}">${isSupabaseConfigured() ? 'Entrar na minha conta' : 'Ir para Minha conta'}</button>
                    <button type="button" class="btn btn-outline-dark" data-action="create-profile">Criar cadastro</button>
                  </div>
                </div>`
              : issuedList.length === 0
                ? `<div class="cert-registry-empty">
                    <p>${
                      hasServerEligibility
                        ? isDevAdmin
                          ? 'Conta administrativa pronta! Clique em "Gerar certificado em PDF" acima (ou "Emitir e baixar PDF agora") para emitir imediatamente, atualizar esta tabela e baixar o PDF com seu nome.'
                          : 'Sua aprovação está confirmada. Clique em "Gerar certificado em PDF" acima para registrar seu certificado no banco de dados e vê-lo listado aqui imediatamente.'
                        : 'Nenhum certificado emitido ainda. Ao cumprir os requisitos de conclusão e clicar em "Gerar certificado em PDF", seu certificado aparecerá automaticamente nesta tabela.'
                    }</p>
                  </div>`
                : `<div class="cert-table-scroll">
                    <table class="cert-registry-table">
                      <thead>
                        <tr>
                          <th>Nome completo do aluno</th>
                          <th>CPF</th>
                          <th>Curso</th>
                          <th>Data de conclusão</th>
                          <th>Carga horária</th>
                          <th>Certificado</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${issuedList
                          .map((cert) => {
                            const rowBusy = rowPdfBusyCode === cert.certificate_code;
                            return `<tr data-cert-code="${esc(cert.certificate_code)}">
                              <td data-label="Nome completo">${esc(cert.studentName || cert.student_name_snapshot)}</td>
                              <td data-label="CPF">${esc(cert.cpfMasked)}</td>
                              <td data-label="Curso"><strong>${esc(cert.course_title_snapshot)}</strong></td>
                              <td data-label="Data de conclusão">${esc(cert.completionDate)}</td>
                              <td data-label="Carga horária">${esc(cert.workloadLabel)}</td>
                              <td data-label="Certificado">
                                <div class="cert-cell-actions">
                                  <span class="cert-code-pill">${esc(cert.certificate_code)}</span>
                                  <div class="cert-row-actions">
                                    <button type="button" class="btn btn-outline-dark cert-row-btn" data-action="view-cert-pdf" data-code="${esc(cert.certificate_code)}" ${rowBusy ? 'disabled' : ''}>
                                      ${rowBusy ? 'Abrindo...' : 'Visualizar PDF'}
                                    </button>
                                    <button type="button" class="btn btn-red cert-row-btn" data-action="download-cert-pdf" data-code="${esc(cert.certificate_code)}" ${rowBusy ? 'disabled' : ''}>
                                      ${rowBusy ? 'Baixando...' : 'Baixar PDF'}
                                    </button>
                                  </div>
                                </div>
                              </td>
                            </tr>`;
                          })
                          .join('')}
                      </tbody>
                    </table>
                  </div>`
          }
        </section>
        </details>
      </section>
      <div class="cert-outside-meta">
        ${footerNote()}
      </div>
      <img class="cert-corner-produce is-left" src="/assets/foliage/foliage-5.png" alt="" aria-hidden="true" draggable="false">
      <img class="cert-corner-produce is-right" src="/assets/foliage/footer-produce.png" alt="" aria-hidden="true" draggable="false">
    </main>`;
  }

  function progressPage(): string {
    const evaluated = evaluateMainCourseProgress();
    const { modules, totalSteps, completedSteps, overallPct, activeModule } = getAllModulesSummary();
    const carbPassed = state.examAttempts.some((x) => x.passed);
    const latestCarbExam = state.examAttempts[state.examAttempts.length - 1];
    const radius = 38;
    const circ = 2 * Math.PI * radius;
    const offset = circ - (overallPct / 100) * circ;
    const currentModuleIdx = activeModule ? activeModule.index : 1;

    return `<div class="progress-showcase-backdrop is-light-parchment">
      <div class="progress-top-azulejo-tl" aria-hidden="true"></div>
      <div class="progress-top-azulejo-tr" aria-hidden="true"></div>
      <main class="page-wrap progress-wrap-page">
      <section class="progress-hero-banner is-light">
        <img class="progress-hero-bg" src="${MEDIA.pastaRagu}" alt="" aria-hidden="true">
        <div class="progress-hero-shade is-light"></div>
        <div class="progress-hero-copy">
          <h1><span class="progress-title-meu">Meu</span> <span class="progress-title-progresso">Progresso</span></h1>
          <p>Acompanhe sua jornada gastronômica e veja<br>o quanto você já evoluiu!</p>
          <div class="progress-hero-metrics">
            <div class="radial-meter radial-lg is-green-donut">
              <svg viewBox="0 0 92 92" width="92" height="92">
                <circle cx="46" cy="46" r="${radius}" fill="#1a743122" stroke="#d5e3d0" stroke-width="8"/>
                <circle cx="46" cy="46" r="${radius}" fill="none" stroke="#1e7b35" stroke-width="8"
                  stroke-dasharray="${circ.toFixed(1)}" stroke-dashoffset="${offset.toFixed(1)}"
                  stroke-linecap="round" transform="rotate(-90 46 46)"/>
              </svg>
              <strong>${overallPct}%</strong>
            </div>
            <div class="progress-pct-summary">
              <strong>${overallPct}%</strong>
              <span>do curso concluído (${completedSteps}/${totalSteps} entregas)</span>
            </div>
            <div class="progress-metrics-divider" aria-hidden="true"></div>
            <div class="progress-stage-pill">
              <svg viewBox="0 0 32 32" width="32" height="32" aria-hidden="true"><path d="M9 6h14v7a7 7 0 0 1-14 0z" fill="#efc84f" stroke="#7d4f0a" stroke-width="1.5"/><path d="M9 8H6c0 4 2 6 3 6M23 8h3c0 4-2 6-3 6" fill="none" stroke="#efc84f" stroke-width="1.8"/><path d="M16 20v5M11 27h10" stroke="#7d4f0a" stroke-width="2" stroke-linecap="round"/></svg>
              <div>
                <small>Módulo em foco (${evaluated.completedModulesCount}/6 concluídos)</small>
                <strong>${currentModuleIdx} de 6</strong>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="progress-multicourse-grid" aria-label="Visão geral dos cursos FerveC">
        <article class="progress-course-card is-active-course">
          <div>
            <span class="eyebrow">COZINHA ITALIANA · ATIVO</span>
            <h3>Massas Italianas (6 Módulos)</h3>
            <p>${evaluated.completedModulesCount} concluído(s) · ${evaluated.inProgressModulesCount} em andamento · ${evaluated.availableModulesCount} disponível(is)</p>
          </div>
          <div class="progress-course-meter">
            <strong>${evaluated.overallPct}%</strong>
            <button type="button" class="btn btn-red" data-action="certificate">Certificados</button>
          </div>
        </article>
        <article class="progress-course-card is-planned-course">
          <div>
            <span class="eyebrow">EXPANSÃO MULTI-CURSOS · FASE 2</span>
            <h3>Cozinha Francesa, Japonesa &amp; Brasileira</h3>
            <p>Arquitetura modular pronta para novos cursos mantendo as regras de Aula, Trabalho, Revisão, Prova e Certificado.</p>
          </div>
          <span class="progress-state-badge is-locked">🔒 Em breve</span>
        </article>
      </section>

      <section class="progress-accordion-list" aria-label="Lista de progresso por módulo">
        ${modules
          .map((m) => {
            const evalMod = evaluated.modules.find((x) => x.id === m.id);
            const isExpanded = expandedProgressId === m.id;
            const isCarb = m.id === 'carbonara';
            const rec = !isCarb ? extraRecipes.find((r) => r.id === m.id) : null;
            const recProg = rec ? recipeProgressFor(rec) : null;

            const lessonDone = Boolean(evalMod?.lessonCompleted);
            const workDone = Boolean(evalMod?.workCompleted);
            const revDone = Boolean(evalMod?.reviewCompleted);
            const examUnlocked = Boolean(evalMod?.examUnlocked);
            const certUnlocked = Boolean(evalMod?.certificateUnlocked);
            const isLocked = Boolean(evalMod?.isLocked);

            let subPanel = '';
            if (isExpanded) {
              if (isCarb) {
                subPanel = `<div class="progress-expanded-card">
                  <img class="crop-pasta-right" src="${esc(m.photo)}" alt="${esc(m.title)}">
                  <div class="progress-expanded-body">
                    <h3>${esc(m.recipeTitle)} · ${evalMod?.modulePct ?? 0}% (${m.doneSteps} de ${m.totalSteps} etapas)</h3>
                    <p>${esc(m.desc)}</p>
                    <div class="progress-module-pillars">
                      <span class="pillar-chip ${lessonDone ? 'is-done' : ''}">Aula: ${lessonDone ? 'Concluída' : `${m.doneSteps}/${m.totalSteps}`}</span>
                      <span class="pillar-chip ${workDone ? 'is-done' : ''}">Trabalho: ${workDone ? 'Concluído' : `${evalMod?.workAnsweredCount || 0}/${questions.length}`}</span>
                      <span class="pillar-chip ${revDone ? 'is-done' : ''}">Revisão: ${revDone ? 'Concluída' : 'Pendente'}</span>
                      <span class="pillar-chip ${carbPassed ? 'is-done' : !examUnlocked ? 'is-locked' : ''}">Prova: ${carbPassed ? 'Aprovada' : examUnlocked ? 'Liberada' : '🔒 Bloqueada'}</span>
                    </div>
                    <div class="progress-sub-actions">
                      <button type="button" class="progress-sub-chip" data-action="questions">
                        <span>?</span>
                        <div><strong>Trabalho (Perguntas)</strong><small>${
                          workDone
                            ? `Concluído (${state.questionAttempts[state.questionAttempts.length - 1]?.score || questions.length}/${questions.length})`
                            : `${evalMod?.workAnsweredCount || 0}/${questions.length} respondidas`
                        }</small></div>
                      </button>
                      <button type="button" class="progress-sub-chip" data-action="review">
                        <span>▶</span>
                        <div><strong>Revisão da Carbonara</strong><small>${
                          state.reviewDone ? 'Concluída' : lessonDone ? 'Disponível' : 'Em andamento'
                        }</small></div>
                      </button>
                      <button type="button" class="progress-sub-chip ${!examUnlocked ? 'is-locked' : ''}" data-action="exam">
                        <span>${examUnlocked ? '✓' : '🔒'}</span>
                        <div><strong>Prova da Carbonara</strong><small>${
                          latestCarbExam
                            ? `${latestCarbExam.score}% (${latestCarbExam.passed ? 'Aprovada' : 'Refazer'})`
                            : examUnlocked
                              ? 'Disponível'
                              : 'Bloqueado (aula + revisão)'
                        }</small></div>
                      </button>
                      <button type="button" class="progress-sub-chip ${!certUnlocked ? 'is-locked' : ''}" data-action="certificate">
                        <span>${certUnlocked ? '🎓' : '🔒'}</span>
                        <div><strong>Certificado</strong><small>${
                          certUnlocked ? 'Desbloqueado' : 'Bloqueado até aprovação'
                        }</small></div>
                      </button>
                    </div>
                  </div>
                </div>`;
              } else if (rec && recProg) {
                const latestRecExam = recProg.examAttempts[recProg.examAttempts.length - 1];
                subPanel = `<div class="progress-expanded-card">
                  <img src="${esc(m.photo)}" alt="${esc(m.title)}">
                  <div class="progress-expanded-body">
                    <h3>${esc(m.recipeTitle)} · ${evalMod?.modulePct ?? 0}% (${m.doneSteps} de ${m.totalSteps} etapas)</h3>
                    <p>${esc(m.desc)}</p>
                    <div class="progress-module-pillars">
                      <span class="pillar-chip ${lessonDone ? 'is-done' : ''}">Aula: ${lessonDone ? 'Concluída' : `${m.doneSteps}/${m.totalSteps}`}</span>
                      <span class="pillar-chip ${workDone ? 'is-done' : ''}">Trabalho: ${workDone ? 'Concluído' : `${evalMod?.workAnsweredCount || 0}/6`}</span>
                      <span class="pillar-chip ${revDone ? 'is-done' : ''}">Revisão: ${revDone ? 'Concluída' : 'Pendente'}</span>
                      <span class="pillar-chip ${m.examPassed ? 'is-done' : !examUnlocked ? 'is-locked' : ''}">Prova: ${m.examPassed ? 'Aprovada' : examUnlocked ? 'Liberada' : '🔒 Bloqueada'}</span>
                    </div>
                    ${
                      rec.id === 'sauces'
                        ? `<p class="sauces-pair-note"><strong>Receitas integradas neste módulo:</strong> Molho 1 · Pomodoro clássico e Molho 2 · Burro e Salvia.</p>`
                        : ''
                    }
                    <div class="progress-sub-actions">
                      <button type="button" class="progress-sub-chip" data-action="open-recipe-tab" data-recipe="${esc(rec.id)}" data-tab="lesson">
                        <span>▶</span>
                        <div><strong>Abrir Aula</strong><small>${m.doneSteps}/${m.totalSteps} etapas</small></div>
                      </button>
                      <button type="button" class="progress-sub-chip" data-action="open-recipe-tab" data-recipe="${esc(rec.id)}" data-tab="work">
                        <span>?</span>
                        <div><strong>Trabalho Prático</strong><small>${
                          workDone
                            ? `Concluído (${recProg.workAttempts[recProg.workAttempts.length - 1]?.score || 6}/6)`
                            : `${evalMod?.workAnsweredCount || 0}/6 respondidas`
                        }</small></div>
                      </button>
                      <button type="button" class="progress-sub-chip" data-action="open-recipe-tab" data-recipe="${esc(rec.id)}" data-tab="review">
                        <span>▤</span>
                        <div><strong>Revisão</strong><small>${recProg.reviewDone ? 'Concluída' : 'Disponível'}</small></div>
                      </button>
                      <button type="button" class="progress-sub-chip ${!examUnlocked ? 'is-locked' : ''}" data-action="open-recipe-tab" data-recipe="${esc(rec.id)}" data-tab="exam">
                        <span>${examUnlocked ? '✓' : '🔒'}</span>
                        <div><strong>Prova do Módulo</strong><small>${
                          latestRecExam
                            ? `${latestRecExam.score}% (${latestRecExam.passed ? 'Aprovada' : 'Refazer'})`
                            : examUnlocked
                              ? 'Disponível'
                              : 'Bloqueado (etapas + revisão)'
                        }</small></div>
                      </button>
                    </div>
                  </div>
                </div>`;
              }
            }

            return `<article class="progress-item-card ${isExpanded ? 'is-expanded' : ''}">
              <div class="progress-item-row">
                <img class="progress-thumb" src="${esc(m.photo)}" alt="${esc(m.title)}">
                <span class="progress-num-circle">${m.index}</span>
                <div class="progress-item-info">
                  <strong>${esc(m.recipeTitle)}</strong>
                  <small>${esc(m.title)} · ${m.doneSteps}/${m.totalSteps} etapas · ${evalMod?.modulePct ?? 0}% total</small>
                </div>
                <span class="progress-state-badge is-${isLocked ? 'locked' : m.status}">
                  ${
                    isLocked
                      ? '🔒 Bloqueado'
                      : m.status === 'done'
                        ? '✓ Concluído'
                        : m.status === 'progress'
                          ? '▶ Em andamento'
                          : '• Disponível'
                  }
                </span>
                <button type="button" class="progress-expand-btn ${isExpanded ? 'is-open' : ''}" data-action="toggle-progress-item" data-module="${esc(m.id)}" aria-expanded="${isExpanded}" aria-label="Expandir ou recolher detalhes de ${esc(m.title)}">
                  ${isExpanded ? '⌃' : '⌄'}
                </button>
              </div>
              ${subPanel}
            </article>`;
          })
          .join('')}
      </section>

      <div class="progress-bottom-bar">
        <button type="button" class="btn btn-red progress-continue-pill" data-action="continue-active-course">Continuar Curso ▶</button>
        <button type="button" class="btn progress-restart-pill" data-action="reset-demo">📊 Recomeçar Demonstração</button>
        <span class="progress-bar-divider" aria-hidden="true"></span>
        <div class="progress-awards-icons" aria-hidden="true">
          <svg viewBox="0 0 36 36" width="32" height="32"><path d="M10 6h16v8a8 8 0 0 1-16 0z" fill="#e9b236" stroke="#7c4e08" stroke-width="1.4"/><path d="M10 9H6c0 4 2 7 4 7M26 9h4c0 4-2 7-4 7" fill="none" stroke="#d99a26" stroke-width="2"/><path d="M18 22v6M12 31h12l-2-3h-8z" fill="#d99a26"/></svg>
          <svg viewBox="0 0 36 36" width="32" height="32"><path d="M13 21 L9 33 L16 29 L18 33 L18 21 Z" fill="#b81c24"/><path d="M23 21 L27 33 L20 29 L18 33 L18 21 Z" fill="#8f1117"/><circle cx="18" cy="14" r="10" fill="#efc246" stroke="#8a5a10" stroke-width="1.4"/><path d="M14 14 l3 3 5-6" fill="none" stroke="#2c1d0f" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </div>
        <span class="progress-cheer"><strong>Você está indo muito bem!</strong> Continue aprendendo e evoluindo na sua jornada.</span>
      </div>
    </main>
    <div class="progress-rolling-footer" aria-hidden="true">
      <div class="cockpit-azulejo-strip"></div>
      <div class="progress-wood-scene">
        <img src="${MEDIA.rollingPinFooter}" alt="">
        <img class="progress-footer-produce-left" src="/assets/foliage/footer-produce.png" alt="" draggable="false">
      </div>
    </div>
    <div class="progress-outside-meta">
      ${footerNote()}
    </div>
    </div>`;
  }

  function collectLocalAssessments(): AdminAssessmentAttemptView[] {
    const rows: AdminAssessmentAttemptView[] = [];
    for (const w of state.questionAttempts) {
      rows.push({
        moduleTitle: 'Spaghetti alla Carbonara',
        kind: 'Trabalho',
        scoreLabel: `${w.score}/${questions.length}`,
        passedLabel: 'Concluído',
        dateIso: w.date || '',
      });
    }
    for (const e of state.examAttempts) {
      rows.push({
        moduleTitle: 'Spaghetti alla Carbonara',
        kind: 'Prova',
        scoreLabel: `${e.score}%`,
        passedLabel: e.passed ? 'Aprovado' : 'Refazer',
        dateIso: e.date || '',
      });
    }
    for (const r of extraRecipes) {
      const p = state.recipeProgress?.[r.id];
      if (!p) continue;
      for (const w of p.workAttempts || []) {
        rows.push({
          moduleTitle: r.title,
          kind: 'Trabalho',
          scoreLabel: `${w.score}/6`,
          passedLabel: 'Concluído',
          dateIso: w.date || '',
        });
      }
      for (const e of p.examAttempts || []) {
        rows.push({
          moduleTitle: r.title,
          kind: 'Prova',
          scoreLabel: `${e.score}%`,
          passedLabel: e.passed ? 'Aprovado' : 'Refazer',
          dateIso: e.date || '',
        });
      }
    }
    return rows.sort((a, b) => Date.parse(b.dateIso || '') - Date.parse(a.dateIso || ''));
  }

  function adminPage(): string {
    const canEnterPhase1 =
      PHASE_1_OFFLINE_ONLY || !SUPABASE_CONNECTED
        ? Boolean(
            isPhase1AdminPreviewEnabled() ||
              userProfile?.email?.toLowerCase() === 'fervecrgastronomia@gmail.com'
          )
        : Boolean(
            userProfile?.authSource === 'supabase' && workspaceData?.permissions?.canAccessAdminPanel
          );

    if (!canEnterPhase1) {
      return `<main class="page-wrap">
        <section class="account-page">
          <div class="account-avatar">⚙</div>
          <span class="eyebrow">PAINEL ADMINISTRATIVO · FASE 1</span>
          <h1>Prévia Administrativa</h1>
          <p>Na Fase 1 (sem conexão ao Supabase), o acesso administrativo é controlado localmente para testes de cupons, relatórios, cursos e voz do Chef.</p>
          <div class="lesson-actions" style="justify-content:center;flex-wrap:wrap;">
            ${btn('Ativar Prévia Administrativa (Fase 1)', 'enable-admin-preview', 'btn btn-red')}
            ${btn('Voltar para Minha conta', 'account', 'btn btn-outline-dark')}
          </div>
        </section>
        ${footerNote()}
      </main>`;
    }

    const accounts = listUnifiedAccounts();
    const coupons = listProvisionalCoupons();
    const demoOrders = listProvisionalDemoOrders();
    const activities = listProvisionalActivities();
    const courseProgress = evaluateMainCourseProgress();
    const assessments = collectLocalAssessments();
    const availableVoices = listAvailablePtBrVoices();

    return (
      renderAdminDashboard({
        activeTab: adminActiveTab,
        mobileMenuOpen: adminMobileMenuOpen,
        adminDisplayName: userProfile?.fullName || 'Operador Admin (Prévia)',
        adminEmail: userProfile?.email || 'fervecrgastronomia@gmail.com',
        accounts,
        coupons,
        demoOrders,
        activities,
        courseProgress,
        assessments,
        couponDraft: adminCouponDraft,
        voiceConfig: adminVoiceConfig,
        voiceTestPhrase: adminVoiceTestPhrase,
        voiceStatusLabel: adminVoiceStatusLabel,
        availableVoices,
      }) + footerNote()
    );
  }

  function accountPage(): string {
    if (userProfile) {
      const initial = esc(userProfile.fullName.trim().charAt(0).toUpperCase() || 'F');
      const isSupabase =
        !PHASE_1_OFFLINE_ONLY && SUPABASE_CONNECTED && userProfile.authSource === 'supabase';
      const hasCourse = hasProvisionalCourseEntitlement(userProfile.email, 'massas-italianas');
      const isAdmin = canShowAdminPanelLink();
      return `<main class="page-wrap">
        <section class="account-page">
          <div class="account-avatar">${initial}</div>
          <span class="eyebrow">${isSupabase ? 'MINHA CONTA' : 'MINHA CONTA · ARMAZENAMENTO LOCAL (FASE 1)'}</span>
          <h1>${esc(userProfile.fullName)}</h1>
          <p>Seu cadastro unificado está salvo localmente neste navegador (${esc(userProfile.email)} · (${esc(userProfile.ddd)}) ${esc(userProfile.phone)}).</p>
          <div class="account-state">
            <span class="state-dot"></span>
            <div>
              <strong>Conta local ativa (${userProfile.age} anos)</strong>
              <small>${
                hasCourse
                  ? 'Curso de Massas Italianas liberado na Biblioteca Interativa (matrícula demonstrativa local).'
                  : 'Acesso à Biblioteca Interativa requer aquisição do curso em Pagamentos (ou cupom de 100% na Fase 1).'
              }</small>
            </div>
          </div>
          <div class="lesson-actions" style="justify-content:center;flex-wrap:wrap;">
            ${btn('Painel Administrativo', 'admin', 'btn btn-saffron')}
            ${btn('Pagamentos', 'payments', 'btn btn-outline-dark')}
            ${btn('Ver meus cursos', 'courses', 'btn btn-red')}
            ${btn('Editar Perfil', 'edit-profile', 'btn btn-outline-dark')}
            ${btn('Memorial Descritivo', 'open-memorial', 'btn btn-outline-dark')}
          </div>
          ${
            !isAdmin
              ? `<button class="text-action" data-action="enable-admin-preview" style="margin-top:8px;">Ativar prévia do Painel Administrativo</button>`
              : ''
          }
          <button class="text-action account-reset" data-action="clear-profile">Sair e desconectar conta local deste navegador</button>
        </section>
        ${footerNote()}
      </main>`;
    }

    return `<main class="page-wrap">
      <section class="account-page">
        <div class="account-avatar">${state.demo ? 'C' : '♡'}</div>
        <span class="eyebrow">MINHA CONTA · FASE 1 LOCAL</span>
        <h1>${state.demo ? 'Área de demonstração' : 'A sua conta FerveC'}</h1>
        <p>${
          state.demo
            ? 'Você está no modo demonstração local. Crie seu cadastro único para personalizar sua experiência e acessar a Biblioteca Interativa após adquirir um curso.'
            : 'Crie seu cadastro no portal ou entre com uma conta local existente para acessar sua jornada.'
        }</p>
        <div class="account-state">
          <span class="state-dot"></span>
          <div>
            <strong>${
              state.demo
                ? 'Modo demonstração local ativo'
                : 'Armazenamento provisório local (Fase 1)'
            }</strong>
            <small>Sincronização em nuvem aguardando integração na Fase 2.</small>
          </div>
        </div>
        <div class="lesson-actions" style="justify-content:center;flex-wrap:wrap;">
          ${btn('Criar Cadastro', 'create-profile', 'btn btn-red')}
          ${btn('Já tenho conta (Entrar)', 'open-login-modal', 'btn btn-outline-dark')}
          ${btn('Painel Administrativo', 'admin', 'btn btn-outline-dark')}
          ${btn(
            state.demo ? 'Ver meus cursos' : 'Explorar modo demonstração',
            state.demo ? 'courses' : 'demo-entry',
            'btn btn-outline-dark'
          )}
        </div>
        ${
          state.demo
            ? '<button class="text-action account-reset" data-action="reset-demo">Apagar dados locais da demonstração</button>'
            : ''
        }
      </section>
      ${footerNote()}
    </main>`;
  }

  function helpPage(): string {
    return `<main class="page-wrap">
      <section class="help-page">
        <span class="eyebrow">ATENDIMENTO FERVEC GASTRONOMIA</span>
        <h1>Ajuda e Contato Oficial</h1>
        <p>Fale diretamente com a equipe FerveC Gastronomia pelos nossos canais oficiais de atendimento.</p>
        <div class="help-contact-grid">
          <article class="help-contact-card">
            <span class="help-contact-icon" aria-hidden="true">✉</span>
            <strong>E-mail Oficial</strong>
            <p>Dúvidas sobre cursos, pagamentos ou acesso à plataforma.</p>
            <a class="btn btn-red" href="mailto:fervecrgastronomia@gmail.com">fervecrgastronomia@gmail.com</a>
          </article>
          <article class="help-contact-card">
            <span class="help-contact-icon" aria-hidden="true">◎</span>
            <strong>Instagram Oficial</strong>
            <p>Novidades, receitas, bastidores e atendimento por mensagem.</p>
            <a class="btn btn-outline-dark" href="https://www.instagram.com/fervecgastronomia/" target="_blank" rel="noopener noreferrer">@fervecgastronomia</a>
          </article>
        </div>
        <div class="lesson-actions" style="justify-content:flex-start;flex-wrap:wrap;">
          ${btn('Voltar aos cursos', 'courses', 'btn btn-red')}
          ${btn('Memorial Descritivo', 'open-memorial', 'btn btn-outline-dark')}
        </div>
      </section>
      ${footerNote()}
    </main>`;
  }

  function salesPage(): string {
    const coursesCatalog = [
      {
        id: 'italiana',
        slug: 'massas-italianas',
        numericValue: paymentSummary.courseSlug === 'massas-italianas' ? paymentSummary.priceCents / 100 : 12.9,
        cuisineLabel: 'COZINHA ITALIANA',
        title: 'Cozinha Italiana: Massas Artesanais.',
        desc: 'Aprenda técnicas tradicionais, explore 6 módulos clássicos com receitas, revisões, trabalhos práticos e provas formativas.',
        price: paymentSummary.courseSlug === 'massas-italianas' ? paymentSummary.priceFormatted : 'R$ 12,90',
        available: true,
        statusLabel: 'Disponível',
        photo: MEDIA.pastaCarbonaraHero,
        cropClass: 'crop-pasta-right',
      },
      {
        id: 'francesa',
        slug: 'cozinha-francesa',
        numericValue: 19.9,
        cuisineLabel: 'COZINHA FRANCESA',
        title: 'Cozinha Francesa: Gâteaux e Techniques.',
        desc: 'Estrutura planejada para futuras aulas de bases clássicas francesas, confeitaria e controle técnico de preparo.',
        price: 'R$ 19,90',
        available: false,
        statusLabel: 'Lançamento em breve',
        photo: MEDIA.cuisineFrench,
        cropClass: '',
      },
      {
        id: 'japonesa',
        slug: 'cozinha-japonesa',
        numericValue: 19.9,
        cuisineLabel: 'COZINHA JAPONESA',
        title: 'Cozinha Japonesa: Sushi e Washoku.',
        desc: 'Estrutura planejada para futuros módulos sobre cortes, cocção de arroz e equilíbrio tradicional.',
        price: 'R$ 19,90',
        available: false,
        statusLabel: 'Lançamento em breve',
        photo: MEDIA.cuisineJapanese,
        cropClass: '',
      },
      {
        id: 'brasileira',
        slug: 'cozinha-brasileira',
        numericValue: 19.9,
        cuisineLabel: 'COZINHA BRASILEIRA',
        title: 'Cozinha Brasileira: Sabor e Cultura.',
        desc: 'Estrutura planejada para preparações regionais brasileiras, caldos e técnicas de cozinha do dia a dia.',
        price: 'R$ 19,90',
        available: false,
        statusLabel: 'Lançamento em breve',
        photo: MEDIA.cuisineBrazilian,
        cropClass: '',
      },
    ];

    return `<main class="cuisines-showcase-page cuisines-azulejo-page">
      <section class="cuisines-hero-dark">
        <div class="cuisines-azulejo-corner is-tl" aria-hidden="true"></div>
        <div class="cuisines-azulejo-corner is-tr" aria-hidden="true"></div>
        <img class="cuisines-hero-produce is-left" src="/assets/foliage/hero-basil.png" alt="" aria-hidden="true">
        <img class="cuisines-hero-produce is-right" src="/assets/foliage/hero-basil.png" alt="" aria-hidden="true">
        <img class="cuisines-hero-bg crop-pasta-right" src="${MEDIA.fervecKitchen}" alt="" aria-hidden="true">
        <div class="cuisines-hero-shade"></div>
        <div class="cuisines-hero-inner">
          <div class="cuisines-hero-brand">
            <img class="fervec-logo-on-dark cuisines-hero-brand-logo" src="/assets/fervec-logo-white.png" alt="FerveC Gastronomia" draggable="false">
          </div>
          <h1>Cursos em<br><em>Destaque<svg class="hero-destaque-swoosh" viewBox="0 0 245 14" aria-hidden="true"><path d="M4 11 C78 2, 168 1, 241 8" fill="none" stroke="#efc84f" stroke-width="3.4" stroke-linecap="round"/></svg></em></h1>
          <p>Aprenda com quem entende de gastronomia e leve suas habilidades para o próximo nível.</p>
        </div>
      </section>

      <section class="cuisines-cards-stack">
        ${coursesCatalog
          .map((c) => {
            const isThisLoading =
              paymentCheckoutState.isProcessing && paymentCheckoutState.activeCourseId === c.id;
            const isAnyProcessing = paymentCheckoutState.isProcessing;
            const buyButtonHtml = isThisLoading
              ? `<button type="button" class="btn btn-red cuisines-buy-pill is-processing-payment" data-action="checkout-notice" data-course-id="${esc(c.id)}" data-course-slug="${esc(c.slug)}" data-course-title="${esc(c.title)}" data-course-value="${c.numericValue}" disabled aria-busy="true" aria-disabled="true"><svg class="payment-btn-spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg><span>Processing Payment...</span></button>`
              : `<button type="button" class="btn btn-red cuisines-buy-pill" data-action="checkout-notice" data-course-id="${esc(c.id)}" data-course-slug="${esc(c.slug)}" data-course-title="${esc(c.title)}" data-course-value="${c.numericValue}" ${isAnyProcessing ? 'disabled aria-disabled="true"' : ''}>🛒 COMPRAR AGORA</button>`;

            return `<article class="cuisine-offer-card ${c.available ? 'is-available' : 'is-upcoming'}">
              <div class="cuisine-offer-copy">
                <div class="cuisine-offer-brand">
                  <img class="fervec-logo-on-light cuisine-offer-brand-logo" src="/assets/fervec-logo-black.png" alt="FerveC Gastronomia" draggable="false">
                  <span><b>|</b> ${esc(c.cuisineLabel)}</span>
                </div>
                <h2>${esc(c.title)}</h2>
                <p>${esc(c.desc)}</p>
                <ul class="cuisine-offer-checks">
                  <li><i aria-hidden="true">✓</i> 6 módulos completos</li>
                  <li><i aria-hidden="true">✓</i> Prova de conhecimento</li>
                  <li><i aria-hidden="true">✓</i> Avaliação de progresso</li>
                  <li><i aria-hidden="true">✓</i> Certificado de conclusão de curso</li>
                </ul>
              </div>

              <div class="cuisine-offer-action">
                ${
                  c.available
                    ? `<span class="cuisine-status-tag is-available">DISPONÍVEL</span>`
                    : ''
                }
                <strong class="cuisine-offer-price">${esc(c.price)}</strong>
                ${
                  c.available
                    ? `${buyButtonHtml}
                       <button type="button" class="cuisines-explore-link" data-action="courses">Acessar aulas disponíveis ›</button>`
                    : `<button type="button" class="btn cuisines-soon-pill" data-action="upcoming-notice" data-title="${esc(c.title)}">📅 <span>LANÇAMENTO<br>EM BREVE</span></button>`
                }
              </div>

              <div class="cuisine-offer-media">
                <img class="${c.cropClass}" src="${esc(c.photo)}" alt="${esc(c.title)}">
              </div>
            </article>`;
          })
          .join('')}
      </section>

      <section class="cuisines-bottom-bar">
        <img class="cuisines-bottom-produce is-left" src="/assets/foliage/footer-produce.png" alt="" aria-hidden="true">
        <img class="cuisines-bottom-produce is-right" src="/assets/foliage/hero-basil.png" alt="" aria-hidden="true">
        <div class="cuisines-bottom-copy">
          <h2>Comece pela primeira preparação.</h2>
          <p>Conheça nosso curso de Cozinha Italiana e descubra o prazer de cozinhar com técnica, sabor e muito mais confiança.</p>
        </div>
        <span class="cuisines-bottom-divider" aria-hidden="true"></span>
        <div class="cuisines-bottom-cta">
          <strong>${esc(paymentSummary.courseSlug === 'massas-italianas' ? paymentSummary.priceFormatted : 'R$ 12,90')}</strong>
          <button type="button" class="btn btn-red cuisines-buy-pill" data-action="checkout-notice" data-course-id="italiana" data-course-slug="massas-italianas" data-course-title="Cozinha Italiana: Massas Artesanais." data-course-value="${paymentSummary.courseSlug === 'massas-italianas' ? paymentSummary.priceCents / 100 : 12.9}">🛒 COMPRAR AGORA</button>
          <button type="button" class="cuisines-memorial-link" data-action="open-memorial" data-course="massas-italianas">Memorial Descritivo · Acessar aulas ›</button>
        </div>
      </section>
      <div class="cuisines-bottom-azulejo" aria-hidden="true"></div>
      <div class="cuisines-outside-meta">
        ${footerNote()}
      </div>
    </main>`;
  }

  function chefPage(): string {
    return `<main class="page-wrap chef-page">
      <button class="back-crumb" data-action="home">← Início</button>
      <section>
        <img class="chef-portrait-photo" src="${MEDIA.chefOfficialPortrait}" alt="Chef CREMONESE da FerveC Gastronomia">
        <div>
          <span class="eyebrow">FERVEC GASTRONOMIA APRESENTA</span>
          <h1>Chef na Cozinha — Chef CREMONESE</h1>
          <p>${esc(introText)}</p>
          ${audioPlayer('Apresentação do Chef', introText)}
          <p class="demo-disclaimer">O áudio só é preparado depois de tocar em reproduzir; a legenda completa está disponível acima.</p>
          <div class="lesson-actions" style="justify-content:flex-start;flex-wrap:wrap;">
            ${btn('Explorar os 6 módulos', 'courses', 'btn btn-red')}
            ${btn('Perguntar ao Chef IA', 'open-chef-chat', 'btn btn-outline-dark')}
          </div>
        </div>
      </section>
    </main>`;
  }

  // recipeQuestionSet is imported from ./data/assessments to share exact questions with server-side grading

  function recipeProgressFor(r: ExtraRecipe): RecipeProgressEntry {
    state.recipeProgress = state.recipeProgress || {};
    const base: RecipeProgressEntry = {
      stage: 0,
      done: [],
      workAnswers: [],
      workCurrent: 0,
      workFinished: false,
      workAttempts: [],
      examAnswers: [],
      examCurrent: 0,
      examStatus: 'intro',
      examAttempts: [],
      reviewDone: false,
    };
    state.recipeProgress[r.id] = Object.assign(base, state.recipeProgress[r.id] || {});
    return state.recipeProgress[r.id];
  }

  function recipeQuiz(r: ExtraRecipe, prog: RecipeProgressEntry, type: 'work' | 'exam'): string {
    const examMode = type === 'exam';
    const bank = recipeQuestionSet(r, examMode ? 8 : 6);
    const answers = examMode ? prog.examAnswers : prog.workAnswers;
    const current = examMode ? prog.examCurrent : prog.workCurrent;
    const status = examMode ? prog.examStatus : 'active';
    const attempts = examMode ? prog.examAttempts : prog.workAttempts;

    if (examMode && status === 'intro') {
      return `<section class="exam-intro">
        <span class="eyebrow">PROVA · AVALIAÇÃO INDEPENDENTE</span>
        <h2>Vamos conferir o que aprendemos em ${esc(r.title)}.</h2>
        <p>Oito questões baseadas nas etapas e técnicas deste módulo. Há revisão antes do envio; novas tentativas são permitidas. Critério mantido em 70%, conforme a configuração existente do curso.</p>
        ${
          attempts.length
            ? `<div class="attempt-history"><strong>Histórico de tentativas</strong>${(
                attempts as { score: number; passed?: boolean }[]
              )
                .map(
                  (x, i) =>
                    `<span>Tentativa ${i + 1}: ${x.score}% · ${x.passed ? 'aprovada' : 'tente novamente'}</span>`
                )
                .join('')}</div>`
            : ''
        }
        <button class="btn btn-red" data-action="recipe-exam-start">Começar prova</button>
      </section>`;
    }

    if (examMode && status === 'result') {
      const result = attempts[attempts.length - 1] || {
        score: 0,
        passed: false,
        answers: [],
      };
      const examPassed = 'passed' in result ? Boolean(result.passed) : false;
      return `<section class="result-card">
        <span class="eyebrow">RESULTADO DA PROVA</span>
        <div class="result-medal">${result.score}%</div>
        <h2>${examPassed ? 'PARABÉNS! VOCÊ CONSEGUIU!' : 'Não desanime! Vamos revisar juntos e tentar novamente.'}</h2>
        <p>${
          examPassed
            ? 'Seu aprendizado merece ser comemorado. A prévia do certificado permanece local e não oficial.'
            : 'Revise as etapas e tente novamente.'
        }${result.bankVersion ? ` · Banco ${esc(result.bankVersion)}` : ''}</p>
        <div class="answer-review-list">
          ${renderAttemptAnswerReview(bank, result.answers, result.questionSnapshots, false)}
        </div>
        <div class="lesson-actions" style="justify-content:flex-start;flex-wrap:wrap;">
          <button class="btn btn-outline-dark" data-action="recipe-tab" data-tab="review">Revisar conteúdo</button>
          <button class="btn btn-red" data-action="recipe-exam-start">Tentar novamente</button>
        </div>
      </section>`;
    }

    if (!examMode && prog.workFinished) {
      const result = attempts[attempts.length - 1] || { score: 0, answers: [] };
      const isWorkDone = Boolean(prog.workCompleted || prog.workFinished);
      return `${renderModuleStageNotificationBanner({
        iconType: 'work',
        title: `Trabalho prático • ${r.title}`,
        description: 'Responda todas as perguntas obrigatórias para consolidar a técnica.',
        isDone: isWorkDone,
        isReady: true,
        doneLabel: 'Concluído',
        progressLabel: 'Em andamento',
      })}
      <section class="result-card">
        <span class="eyebrow">TRABALHO CONCLUÍDO</span>
        <div class="result-medal">${result.score}/${result.questionSnapshots?.length || bank.length}</div>
        <h2>Vamos aprender com cada resposta.</h2>
        <p>O trabalho é formativo e consolida os fundamentos do módulo.${
          result.bankVersion ? ` · Banco ${esc(result.bankVersion)}` : ''
        }</p>
        <div class="answer-review-list">
          ${renderAttemptAnswerReview(bank, result.answers, result.questionSnapshots, true)}
        </div>
        ${renderStandardCompletionAction({
          isDone: isWorkDone,
          buttonLabel: 'Marcar trabalho como concluído',
          actionName: 'recipe-work-mark-complete',
          doneText: 'Trabalho concluído com sucesso! Seu progresso foi atualizado.',
          nextCtaLabel: 'Ir para revisão →',
          nextCtaAction: 'recipe-tab',
          nextCtaAttrs: 'data-tab="review"',
        })}
        <button class="btn btn-outline-dark" data-action="recipe-work-retry" style="margin-top:12px;">Refazer o trabalho</button>
      </section>`;
    }

    if (examMode && status === 'review') {
      return `<section class="quiz-wrap">
        <div class="quiz-heading">
          <span class="eyebrow">PROVA · REVISÃO ANTES DO ENVIO</span>
          <h2>Confira suas respostas.</h2>
          <p>Edite qualquer resposta antes de enviar.</p>
        </div>
        <div class="exam-review-list">
          ${bank
            .map(
              (q, i) =>
                `<button class="exam-review-row" data-action="recipe-exam-edit" data-question="${i}">
                  <span class="review-num">0${i + 1}</span>
                  <span><strong>${esc(q.q)}</strong><small>${esc(q.a[(answers[i] ?? 0) as number])}</small></span>
                  <span>Editar →</span>
                </button>`
            )
            .join('')}
        </div>
        <div class="exam-nav-buttons">
          <button class="btn btn-outline-dark" data-action="recipe-exam-back">← Voltar às perguntas</button>
          <button class="btn btn-red" data-action="recipe-exam-submit">Enviar prova</button>
        </div>
      </section>`;
    }

    const q = bank[current];
    const value = answers[current];
    const answeredCount = answers.filter((v) => v !== null && v !== undefined).length;
    return renderUnifiedTrabalhoSection({
      currentIndex: current,
      totalQuestions: bank.length,
      questionText: q.q,
      options: q.a,
      selectedAnswer: value,
      correctIndex: q.correct,
      explanation: q.why,
      chefTip: q.tip,
      answerAction: 'recipe-answer',
      answerModeAttr: type,
      nextAction: 'recipe-question-next',
      backAction: 'recipe-question-back',
      showNavButtons: true,
      bannerTitle: examMode ? `Prova • ${r.title}` : `Trabalho prático • ${r.title}`,
      workCompleted: Boolean(prog.workCompleted || prog.workFinished),
      answeredCount,
      completeAction: !examMode ? 'recipe-work-mark-complete' : undefined,
      canCompleteWork: !examMode && canCompleteModuleWork(answeredCount, bank.length),
    });
  }

  function recipePage(): string {
    const rIdx = extraRecipes.findIndex((x) => x.id === selectedRecipeId);
    const r = extraRecipes[rIdx];
    if (!r) return coursePage();

    state.lastModuleId = r.id;
    const prog = recipeProgressFor(r);
    const index = Math.max(0, Math.min(recipeStage, r.steps.length - 1));
    const step = r.steps[index];
    const moduleNumber = rIdx + 2;

    const moduleTechGalleryMap: Record<string, string[]> = {
      alfredo: [
        MEDIA.techAlfredoButter,
        MEDIA.techAlfredoButter,
        MEDIA.techPastaBoiling,
        MEDIA.pastaAlfredo,
        MEDIA.techPastaBoiling,
        MEDIA.pastaAlfredo,
      ],
      arrabbiata: [
        MEDIA.techGarlicChili,
        MEDIA.techGarlicChili,
        MEDIA.techRaguSimmer,
        MEDIA.techGarlicChili,
        MEDIA.techPastaBoiling,
        MEDIA.pastaArrabbiata,
        MEDIA.pastaArrabbiata,
      ],
      pesto: [
        MEDIA.pastaPesto,
        MEDIA.pastaPesto,
        MEDIA.techPastaBoiling,
        MEDIA.pastaPesto,
        MEDIA.techPastaBoiling,
        MEDIA.pastaPesto,
      ],
      'ragù': [
        MEDIA.techSoffritto,
        MEDIA.techGuancialePan,
        MEDIA.techRaguSimmer,
        MEDIA.techRaguSimmer,
        MEDIA.techPastaRoller,
        MEDIA.techTagliatelleNests,
        MEDIA.techPastaRoller,
        MEDIA.techTagliatelleNests,
        MEDIA.techPastaBoiling,
        MEDIA.pastaRagu,
      ],
      sauces: [
        MEDIA.italianSaucesDuo,
        MEDIA.techGarlicChili,
        MEDIA.techRaguSimmer,
        MEDIA.techAlfredoButter,
        MEDIA.pastaPesto,
        MEDIA.italianSaucesDuo,
      ],
    };
    const moduleErrorGalleryMap: Record<string, string[]> = {
      alfredo: [
        MEDIA.pastaAlfredo,
        MEDIA.techAlfredoButter,
        MEDIA.techPastaBoiling,
        MEDIA.pastaAlfredo,
      ],
      arrabbiata: [
        MEDIA.techGarlicChili,
        MEDIA.techRaguSimmer,
        MEDIA.techPastaBoiling,
        MEDIA.pastaArrabbiata,
        MEDIA.techGarlicChili,
        MEDIA.pastaArrabbiata,
      ],
      pesto: [
        MEDIA.pastaPesto,
        MEDIA.techPastaBoiling,
        MEDIA.pastaPesto,
        MEDIA.techGarlicChili,
      ],
      'ragù': [
        MEDIA.techSoffritto,
        MEDIA.techRaguSimmer,
        MEDIA.techAlfredoButter,
        MEDIA.pastaRagu,
      ],
      sauces: [
        MEDIA.techRaguSimmer,
        MEDIA.techAlfredoButter,
        MEDIA.italianSaucesDuo,
        MEDIA.pastaArrabbiata,
      ],
    };
    const techGallery = moduleTechGalleryMap[r.id] || [recipeVisual(r.id)];
    const errGallery = moduleErrorGalleryMap[r.id] || [recipeVisual(r.id)];

    let tabBody = '';
    let lessonBannerHtml = '';
    if (recipeTab === 'work') {
      tabBody = recipeQuiz(r, prog, 'work');
    } else if (recipeTab === 'review') {
      const canStartExam = prog.done.length === r.steps.length && Boolean(prog.reviewDone);
      const techniques: ReviewTechniqueCardInput[] = r.techniques.map((t, i) => ({
        title: t,
        description: 'Toque para abrir o resumo da técnica.',
        image: techGallery[i % techGallery.length],
        detailAction: 'recipe-review-detail',
        modalTitle: t,
        modalCopy: `Técnica essencial de ${r.title}: releia as etapas correspondentes para dominar este ponto na cozinha.`,
      }));
      const errorCards: ReviewErrorCardInput[] = r.errors.map((errText, i) => ({
        text: errText,
        image: errGallery[i % errGallery.length],
        detailAction: 'recipe-review-detail',
        modalTitle: `Erro comum · ${r.title}`,
        modalCopy: errText,
      }));
      tabBody = renderUnifiedReviewSection({
        moduleId: r.id,
        moduleTitle: r.title,
        chefTip: r.chefTip,
        isCompleteSteps: prog.done.length === r.steps.length,
        reviewDone: Boolean(prog.reviewDone),
        techniques,
        errors: errorCards,
        completeAction: 'recipe-review-complete',
        examCtaAction: 'recipe-tab',
        canStartExam,
        blockedExamText: `Conclua as ${r.steps.length} etapas da aula para liberar a prova final.`,
      });
    } else if (recipeTab === 'exam') {
      tabBody = recipeQuiz(r, prog, 'exam');
    } else if (recipeTab === 'certificate') {
      const isSupabaseUser = userProfile?.authSource === 'supabase';
      const isDevAdmin = Boolean(
        isSupabaseUser && workspaceData?.permissions?.canBypassExamForCertificates
      );
      const passed = prog.examAttempts.some((x) => x.passed);
      const complete = prog.done.length === r.steps.length;
      const certReady =
        isSupabaseUser &&
        (isDevAdmin || Boolean(workspaceData?.eligibleForCertificate || issuedCertificate) || (complete && passed));
      tabBody = `<section class="certificate-page" style="margin-top:24px">
        <span class="eyebrow">SEU CERTIFICADO</span>
        <h2>Todo aprendizado merece ser celebrado!</h2>
        <p>${
          certReady
            ? `Etapas de ${esc(r.title)} concluídas e aprovação registrada no sistema. Seu certificado oficial do curso já está liberado para emissão em PDF.`
            : complete && passed && !isSupabaseUser
              ? `Você completou ${esc(r.title)} localmente. Entre na sua conta para registrar a aprovação e emitir o certificado em PDF.`
              : `Conclua as ${r.steps.length} etapas, a revisão e seja aprovado na prova de ${esc(r.title)} (mínimo 70%) para liberar seu certificado.`
        }</p>
        <div class="certificate-note" style="margin-top:18px">
          <strong>${
            certReady && issuedCertificate
              ? `Certificado emitido · Código ${esc(issuedCertificate.certificate_code)}`
              : certReady
                ? 'Certificado liberado para emissão em PDF.'
                : 'Emissão oficial automática após aprovação.'
          }</strong>
          <p>Na aba Certificados você visualiza o modelo oficial com seus dados do cadastro e pode baixar o arquivo em PDF.</p>
        </div>
        <div class="lesson-actions" style="justify-content:flex-start;flex-wrap:wrap;">
          <button type="button" class="btn btn-red" data-action="certificate">Abrir aba Certificados</button>
          <button type="button" class="btn btn-outline-dark" data-action="open-memorial" data-course="massas-italianas">Memorial Descritivo</button>
        </div>
      </section>`;
    } else {
      const voiceText = `${r.title}, etapa ${index + 1}: ${step[0]}. ${step[1]} ${step[2]}`;
      const stepVisual = getStageVisual(r.id, index);

      const saucesCompareSection =
        r.id === 'sauces' && r.sauceCards
          ? `<section class="sauce-cards-inline">
              <div class="sauce-compare-compact">
                <span class="eyebrow">COMPARATIVO DO MÓDULO · DOIS MOLHOS LADO A LADO</span>
                <div class="sauce-cards">
                  ${r.sauceCards
                    .map(
                      (s, i) => `<article class="sauce-card">
                        <span class="eyebrow">MOLHO ${i + 1}</span>
                        <h3>${esc(s.name.replace(/^Molho \d+ · /, ''))}</h3>
                        <p>${esc(s.intro)}</p>
                        <div class="sauce-section-label"><span>01</span><strong>Ingredientes</strong></div>
                        <ul>${s.ingredients.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
                        <div class="sauce-section-label"><span>02</span><strong>Modo de preparo</strong></div>
                        <ol>${s.steps.map((x) => `<li>${esc(x)}</li>`).join('')}</ol>
                        <div class="chef-tip">
                          <span class="tip-icon">✳</span>
                          <div><strong>Dica do Chef</strong><p>${esc(s.tip)}</p></div>
                        </div>
                      </article>`
                    )
                    .join('')}
                </div>
              </div>
            </section>`
          : '';

      const stepItems = step[1]
        .split(/(?<=[.!?])\s+/)
        .map((s) => s.trim())
        .filter(Boolean);
      const microList = stepItems.length ? stepItems : [step[1]];
      const recipeLessonDone = Boolean(prog.lessonCompleted || prog.done.length >= r.steps.length);

      lessonBannerHtml = renderModuleStageNotificationBanner({
        iconType: 'lesson',
        title: `Aula prática • ${r.title}`,
        description: `Etapa ${index + 1} de ${r.steps.length}: ${step[0]}`,
        isDone: recipeLessonDone,
        isReady: prog.done.length >= r.steps.length,
        doneLabel: 'Concluído',
        progressLabel: 'Em andamento',
      });

      tabBody = `<div class="cockpit-two-col">
        <div class="cockpit-left-col">
          ${renderStageMediaPlayer({
            moduleId: r.id,
            stagePhoto: stepVisual,
            alt: `${r.title} · ${step[0]}`,
            voiceText,
            captionText: `${r.imageStatus} Use o play para ouvir a narração guiada da etapa.`,
            playerTitle: `${r.title} · ${step[0]}`,
          })}
          ${renderOlhoDoChefCard(step[2] || r.chefTip, 'Chef Cremonese.')}
        </div>

        <div class="cockpit-right-guide">
          <div class="cockpit-step-header">
            <div>
              <h2>${esc(step[0])}</h2>
              <p>${esc(r.adaptation)}</p>
            </div>
            <img class="cockpit-chef-portrait crop-chef-face" src="${MEDIA.chefOfficialPortrait}" alt="Chef Cremonese">
          </div>

          <div class="cockpit-what-box">
            <span class="cockpit-box-svg" aria-hidden="true">
              <svg viewBox="0 0 24 24"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.7.5 1 1.2 1 2.1h5c0-.9.3-1.6 1-2.1A6 6 0 0 0 12 3Z"/></svg>
            </span>
            <div>
              <strong>O QUE VAMOS FAZER?</strong>
              <p>${esc(step[2])}</p>
            </div>
          </div>

          <div class="cockpit-prep-box">
            <div class="cockpit-prep-head">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 15v4h12v-4M5 15a4 4 0 0 1-.5-7.9A5 5 0 0 1 14 4.5a4.5 4.5 0 0 1 5.5 2.6A4 4 0 0 1 19 15Z"/></svg>
              <strong>PREPARAÇÃO – O QUE FAZER AGORA</strong>
            </div>
            <ol class="cockpit-step-checklist">
              ${microList
                .map((m, i) => {
                  const key = `${r.id}:${index}:${i}`;
                  return `<li>
                    <label class="micro-item">
                      <input type="checkbox" data-recipe-micro="${esc(key)}" ${recipeMicroDone[key] ? 'checked' : ''}>
                      <span class="micro-num-circle">${i + 1}</span>
                      <span>${esc(m)}</span>
                    </label>
                  </li>`;
                })
                .join('')}
            </ol>
            <p class="cockpit-chef-tip-line"><strong>Dica do Chef:</strong> ${esc(r.chefTip)}</p>
          </div>

          ${renderInteractiveIngredientsPanel(r.id, index, stepVisual)}
        </div>
      </div>
      ${renderStandardCompletionAction({
        isDone: recipeLessonDone,
        buttonLabel: 'Marcar aula como concluída',
        actionName: 'recipe-lesson-mark-complete',
        doneText: 'Aula concluída! Você já pode seguir para Trabalho ou Revisão.',
        nextCtaLabel: 'Ir para Trabalho →',
        nextCtaAction: 'recipe-tab',
        nextCtaAttrs: 'data-tab="work"',
      })}
      ${
        r.technicalSheets && r.technicalSheets.length > 0
          ? `${r.technicalSheets
              .map(
                (entry) => `<details class="cockpit-auxiliary-drawer">
                  <summary>${esc(entry.title)} — ingredientes, técnicas, segurança alimentar e alergênicos</summary>
                  ${renderTechnicalSheetDetails(entry.sheet, {
                    editorialAlert: entry.code === 'A' ? r.editorialAlert : undefined,
                  })}
                </details>`
              )
              .join('')}
              ${
                r.assemblyGuide
                  ? `<details class="cockpit-auxiliary-drawer" open>
                      <summary>${esc(r.assemblyGuide.title)} (${esc(r.assemblyGuide.reference)})</summary>
                      <div class="cockpit-module-ingredients-list">
                        <strong>${esc(r.assemblyGuide.title)}</strong>
                        <p style="margin:6px 0 8px;">Referência: ${esc(r.assemblyGuide.reference)}</p>
                        <ul>${r.assemblyGuide.points.map((pt) => `<li>${esc(pt)}</li>`).join('')}</ul>
                      </div>
                    </details>`
                  : ''
              }`
          : `<details class="cockpit-auxiliary-drawer">
              <summary>Ficha técnica completa (${esc(r.yield)}), segurança alimentar e alergênicos</summary>
              ${renderTechnicalSheetDetails(r.techSheet, {
                editorialAlert: r.editorialAlert,
              })}
            </details>`
      }
      ${saucesCompareSection}`;
    }

    return renderUnifiedLessonCockpit({
      moduleId: r.id,
      moduleNumber,
      moduleTitle: r.title,
      moduleSubtitle: r.subtitle,
      duration: r.duration,
      level: r.level,
      activeTab: recipeTab,
      steps: r.steps.map((st, sIdx) => ({
        title: st[0],
        tag: st[0],
        body: st[1],
        tip: st[2],
        photo: getStageVisual(r.id, sIdx),
        icon: getStageIcon(r.id, sIdx),
        alt: `${r.title} — ${st[0]}`,
        caption: r.title,
        audioScript: `${st[0]}. ${st[1]} ${st[2]}`,
      })),
      currentIndex: index,
      doneIndices: prog.done,
      tabBodyHtml: tabBody,
      lessonBannerHtml,
      onPrevAction: 'recipe-prev',
      onNextAction: 'recipe-next',
      onStepAction: 'recipe-step',
      backToCourseLabel: 'Voltar',
      nextButtonLabel: index === r.steps.length - 1 ? 'CONCLUIR MÓDULO' : 'CONCLUIR ETAPA E SEGUIR',
    });
  }

  function recipeReviewPage(): string {
    const r = extraRecipes.find((x) => x.id === selectedRecipeId);
    if (!r) return coursePage();
    selectedRecipeId = r.id;
    recipeTab = 'review';
    return recipePage();
  }

  function wineListPage(): string {
    const visibleWines =
      selectedWineFilter === 'all'
        ? wineProfiles
        : wineProfiles.filter((w) => w.category === selectedWineFilter);
    const featured =
      visibleWines.find((x) => x.id === selectedWineId) || visibleWines[0] || wineProfiles[2];
    if (featured.id !== selectedWineId) selectedWineId = featured.id;

    const filterIcons: Record<string, string> = {
      tintos:
        '<svg viewBox="0 0 24 24"><path d="M12 3v3" stroke="currentColor" stroke-width="1.8" fill="none"/><circle cx="9.5" cy="9" r="2.1" fill="currentColor"/><circle cx="14.5" cy="9" r="2.1" fill="currentColor"/><circle cx="7.5" cy="13" r="2.1" fill="currentColor"/><circle cx="12" cy="13" r="2.1" fill="currentColor"/><circle cx="16.5" cy="13" r="2.1" fill="currentColor"/><circle cx="10" cy="17" r="2.1" fill="currentColor"/><circle cx="14" cy="17" r="2.1" fill="currentColor"/><circle cx="12" cy="20.2" r="1.8" fill="currentColor"/></svg>',
      brancos:
        '<svg viewBox="0 0 24 24"><path d="M8 3h8l.8 5.5a4.8 4.8 0 0 1-9.6 0z" fill="none" stroke="currentColor" stroke-width="1.9"/><path d="M7.6 8.5h8.8a4.2 4.2 0 0 1-8.8 0z" fill="currentColor" opacity="0.28"/><path d="M12 13.5V21M8.2 21h7.6" fill="none" stroke="currentColor" stroke-width="1.9"/></svg>',
      roses:
        '<svg viewBox="0 0 24 24"><path d="M12 3v3" stroke="currentColor" stroke-width="1.8" fill="none"/><circle cx="9.5" cy="9" r="2.1" fill="currentColor"/><circle cx="14.5" cy="9" r="2.1" fill="currentColor"/><circle cx="7.5" cy="13" r="2.1" fill="currentColor"/><circle cx="12" cy="13" r="2.1" fill="currentColor"/><circle cx="16.5" cy="13" r="2.1" fill="currentColor"/><circle cx="10" cy="17" r="2.1" fill="currentColor"/><circle cx="14" cy="17" r="2.1" fill="currentColor"/><circle cx="12" cy="20.2" r="1.8" fill="currentColor"/></svg>',
      espumantes:
        '<svg viewBox="0 0 24 24"><path d="M6 4h3.8l-.4 6.2a2 2 0 0 1-3 0zM7.9 12.2V20M5.8 20h4.2M14.2 4.5H18l-.4 6.2a2 2 0 0 1-3 0zM16.1 12.7V20M14 20h4.2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M10.8 2.6l.6-1.2M13.2 2.6l-.6-1.2" stroke="currentColor" stroke-width="1.5"/></svg>',
      all:
        '<svg viewBox="0 0 24 24"><path d="M7 4.5h10c1.8 2.3 2.5 5 2.5 7.5s-.7 5.2-2.5 7.5H7C5.2 17.2 4.5 14.5 4.5 12S5.2 6.8 7 4.5z" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M5.2 8.5h13.6M5.2 15.5h13.6M9 4.8v14.4M15 4.8v14.4" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>',
    };

    const filterButtons: { key: typeof selectedWineFilter; label: string }[] = [
      { key: 'tintos', label: 'Tintos' },
      { key: 'brancos', label: 'Brancos' },
      { key: 'roses', label: 'Rosés' },
      { key: 'espumantes', label: 'Espumantes' },
      { key: 'all', label: 'Estilos' },
    ];

    const captionKind = (w: WineProfile) =>
      w.category === 'espumantes' ? 'Espumante' : `Vinho ${w.kind}`;

    const captionGlyphSvg = (category: WineProfile['category']) => {
      if (category === 'espumantes') {
        return '<svg viewBox="0 0 16 16"><path d="M6 2h4l-.4 5a2 2 0 0 1-3.2 0zM8 9v5M5.5 14h5" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>';
      }
      return '<svg viewBox="0 0 16 16"><circle cx="6.2" cy="5.5" r="1.5" fill="currentColor"/><circle cx="9.8" cy="5.5" r="1.5" fill="currentColor"/><circle cx="5" cy="8.2" r="1.5" fill="currentColor"/><circle cx="8" cy="8.2" r="1.5" fill="currentColor"/><circle cx="11" cy="8.2" r="1.5" fill="currentColor"/><circle cx="6.5" cy="10.8" r="1.5" fill="currentColor"/><circle cx="9.5" cy="10.8" r="1.5" fill="currentColor"/><circle cx="8" cy="13.1" r="1.3" fill="currentColor"/></svg>';
    };

    const pinGlyphSvg =
      '<svg viewBox="0 0 16 16"><path d="M8 1.5a4.2 4.2 0 0 0-4.2 4.2c0 3.1 4.2 8.8 4.2 8.8s4.2-5.7 4.2-8.8A4.2 4.2 0 0 0 8 1.5zm0 5.7a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z" fill="currentColor"/></svg>';

    return `<main class="wine-showcase">
      <section class="wine-hero" style="background-image:url('${MEDIA.vinicolaHeroCellar}')">
        <div class="wine-hero-shade"></div>
        <img class="wine-hero-vine" src="/assets/wine-foliage/vine-4.png" alt="" aria-hidden="true">
        <div class="wine-hero-copy">
          <span class="eyebrow">EXPERIÊNCIA GASTRONÔMICA</span>
          <h1>Vinícola</h1>
          <p>Descubra vinhos que inspiram, combinam e completam grandes momentos.</p>
          <button class="wine-hero-button" data-action="wine-scroll">Conheça nossa seleção →</button>
        </div>
      </section>

      <section id="wine-selection" class="wine-selection">
        <img class="wine-edge-vine wine-edge-vine-left-top" src="/assets/wine-foliage/vine-4.png" alt="" aria-hidden="true">
        <img class="wine-edge-vine wine-edge-vine-left-bot" src="/assets/wine-foliage/vine-3.png" alt="" aria-hidden="true">
        <img class="wine-edge-vine wine-edge-vine-right-top" src="/assets/wine-foliage/vine-1.png" alt="" aria-hidden="true">
        <img class="wine-edge-vine wine-edge-vine-right-bot" src="/assets/wine-foliage/vine-2.png" alt="" aria-hidden="true">

        <div class="wine-filter-bar" role="group" aria-label="Filtrar vinhos por categoria">
          ${filterButtons
            .map(
              (f) => `<button type="button" class="wine-filter-pill ${
                selectedWineFilter === f.key ? 'active' : ''
              }" data-action="wine-filter" data-filter="${f.key}"><span class="wine-filter-icon" aria-hidden="true">${filterIcons[f.key]}</span><span>${f.label}</span></button>`
            )
            .join('')}
        </div>

        <div class="wine-wood-shelf">
          <div class="wine-shelf-cornice" aria-hidden="true"></div>
          <div class="wine-continuous-ledge" aria-hidden="true"></div>
          <button type="button" class="wine-shelf-arrow wine-shelf-arrow-left" data-action="wine-scroll-back" aria-label="Vinho anterior">‹</button>
          <div class="wine-product-row">
            ${visibleWines
              .map(
                (w) =>
                  `<button type="button" class="wine-product ${selectedWineId === w.id ? 'selected' : ''}" data-action="wine-select" data-wine="${w.id}" aria-pressed="${selectedWineId === w.id}" title="${esc(w.name)}">
                    <span class="wine-spot-bulb" aria-hidden="true"></span>
                    <span class="wine-spot-cone" aria-hidden="true"></span>
                    <div class="wine-bottle-stage">
                      <img class="wine-bottle-img" src="${esc(w.bottleImage)}" alt="Garrafa de ${esc(w.name)}">
                    </div>
                    <div class="wine-ledge-slot" aria-hidden="true">
                      ${
                        selectedWineId === w.id
                          ? '<span class="wine-selected-chevron"><svg viewBox="0 0 24 14"><path d="M3 2l9 9 9-9"/></svg></span>'
                          : ''
                      }
                    </div>
                    <div class="wine-bottle-caption">
                      <span class="wine-cap-type"><span class="wine-cap-glyph" aria-hidden="true">${captionGlyphSvg(w.category)}</span> ${esc(captionKind(w))}</span>
                      <span class="wine-cap-country"><span class="wine-cap-pin" aria-hidden="true">${pinGlyphSvg}</span> ${esc(w.shelfCountry || w.country)}</span>
                    </div>
                  </button>`
              )
              .join('')}
          </div>
          <button type="button" class="wine-shelf-arrow wine-shelf-arrow-right" data-action="wine-scroll-forward" aria-label="Próximo vinho">›</button>
        </div>
      </section>

      <section class="wine-featured-profile" aria-live="polite">
        <img class="wine-featured-vine-left" src="/assets/wine-foliage/vine-3.png" alt="" aria-hidden="true">
        <img class="wine-featured-vine" src="/assets/wine-foliage/vine-2.png" alt="" aria-hidden="true">
        <div class="wine-featured-image">
          <img src="${esc(featured.glassImage)}" alt="Taça de ${esc(featured.cardTitle || featured.name)} em adega iluminada">
        </div>
        <div class="wine-featured-facts">
          <h2>${esc(featured.cardTitle || featured.name)}</h2>
          <p>${esc(featured.aromas)}</p>
          <div class="wine-4cols">
            <div>
              <span class="wine-fact-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24"><path d="M12 2.5v3" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="9.2" cy="8.5" r="2.1" fill="currentColor"/><circle cx="14.8" cy="8.5" r="2.1" fill="currentColor"/><circle cx="7.2" cy="12.5" r="2.1" fill="currentColor"/><circle cx="12" cy="12.5" r="2.1" fill="currentColor"/><circle cx="16.8" cy="12.5" r="2.1" fill="currentColor"/><circle cx="9.6" cy="16.5" r="2.1" fill="currentColor"/><circle cx="14.4" cy="16.5" r="2.1" fill="currentColor"/><circle cx="12" cy="19.8" r="1.9" fill="currentColor"/></svg>
              </span>
              <small>Uvas</small>
              <strong>${esc(featured.cardGrapes || featured.grapes)}</strong>
            </div>
            <div>
              <span class="wine-fact-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24"><path d="M12 2.5a6.5 6.5 0 0 0-6.5 6.5c0 4.8 6.5 12.5 6.5 12.5S18.5 13.8 18.5 9A6.5 6.5 0 0 0 12 2.5zm0 8.8a2.3 2.3 0 1 1 0-4.6 2.3 2.3 0 0 1 0 4.6z" fill="currentColor"/></svg>
              </span>
              <small>Origem</small>
              <strong>${esc(featured.cardOrigin || featured.country)}</strong>
            </div>
            <div>
              <span class="wine-fact-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24"><path d="M14 14.76V4.5a2 2 0 0 0-4 0v10.26a4 4 0 1 0 4 0z" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="17.5" r="1.8" fill="currentColor"/><path d="M12 15.8V8.5" stroke="currentColor" stroke-width="1.6"/></svg>
              </span>
              <small>Temperatura</small>
              <strong>${esc(featured.temperature)}</strong>
            </div>
            <div>
              <span class="wine-fact-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24"><path d="M7 3v7a2.5 2.5 0 0 0 2.5 2.5h.5V21M5 3v5.5M9 3v5.5M16.5 3v18M16.5 3c2 0 3.2 2.2 3.2 5.2 0 2.2-.9 3.8-3.2 4.3" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
              </span>
              <small>Notas</small>
              <strong>${esc(featured.cardNotes || featured.body)}</strong>
            </div>
          </div>
          <button class="wine-hero-button wine-featured-cta" data-action="wine-open" data-wine="${featured.id}">Conheça nossa seleção →</button>
        </div>
      </section>

      <section class="wine-harmonizacao-showcase">
        <div class="wine-harm-media">
          <img src="${MEDIA.harmonizacaoSteak}" alt="Harmonização de corte grelhado com batatas e vinhos">
        </div>
        <div class="wine-harm-copy">
          <div class="wine-harm-title">
            <svg viewBox="0 0 28 28" width="30" height="30" aria-hidden="true"><path d="M7 17v4h14v-4M5.5 17a4.5 4.5 0 0 1-.5-8.9A5.5 5.5 0 0 1 15 5a5 5 0 0 1 6 3 4.5 4.5 0 0 1-.5 9Z" fill="none" stroke="#f0d295" stroke-width="1.8"/></svg>
            <h3>Harmonização</h3>
          </div>
          <p>A combinação perfeita entre vinho e gastronomia.<br>Descubra como harmonizar vinhos com os mais variados pratos, eleve sua experiência à mesa.</p>
          <div class="wine-harm-actions">
            <button class="wine-hero-button wine-harm-cta" data-action="wine-open" data-wine="${featured.id}">Explorar harmonizações →</button>
            <div class="wine-quick-select">
              <select id="wine-picker" aria-label="Escolha uma opção de vinho">
                ${wineProfiles
                  .map(
                    (x) =>
                      `<option value="${x.id}" ${x.id === selectedWineId ? 'selected' : ''}>${esc(x.name)}</option>`
                  )
                  .join('')}
              </select>
              <button class="wine-gold-button" data-action="wine-discover">Abrir</button>
            </div>
          </div>
        </div>
        <div class="wine-harm-right-glass" aria-hidden="true">
          <img src="/assets/wine-glasses/red.jpg" alt="">
        </div>
      </section>

      <section class="wine-course-cta">
        <div class="wine-vineyard-photo" aria-hidden="true">
          <img src="${MEDIA.vineyardSunsetHills}" alt="">
        </div>
        <div class="wine-course-cta-copy">
          <h2>Uma experiência completa,<br>dentro do universo FerveC Gastronomia.</h2>
          <span class="wine-course-star" aria-hidden="true">✦</span>
        </div>
        <button class="wine-hero-button wine-course-cta-btn" data-action="courses">Explore nossos cursos →</button>
      </section>

      <footer class="wine-cellar-footer">
        <img class="wine-footer-vine" src="/assets/wine-foliage/vine-4.png" alt="" aria-hidden="true">
        <div class="wine-footer-left">
          <a class="home-hero-brand wine-footer-emblem" href="#/" data-action="home" aria-label="FerveC Gastronomia, início">
            <img class="fervec-logo-on-dark wine-footer-logo" src="/assets/fervec-logo-white.png" alt="FerveC Gastronomia" draggable="false">
          </a>
          <span class="wine-footer-seal" aria-hidden="true"><span>FerveC</span></span>
        </div>
        <span class="wine-footer-sep" aria-hidden="true"></span>
        <div class="wine-footer-socials" aria-label="Redes sociais">
          <a href="#/categoria/vinicola" aria-label="Instagram" title="Instagram"><svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/></svg></a>
          <a href="#/categoria/vinicola" aria-label="YouTube" title="YouTube"><svg viewBox="0 0 24 24"><rect x="2.5" y="5.5" width="19" height="13" rx="4"/><path d="M10 9.5l5.5 2.5-5.5 2.5z" fill="currentColor" stroke="none"/></svg></a>
          <a href="#/categoria/vinicola" aria-label="Facebook" title="Facebook"><svg viewBox="0 0 24 24"><path d="M14.5 8H17V4.5h-2.5A4 4 0 0 0 10.5 8.5V11H8v3.5h2.5V20h3.5v-5.5H16.5L17 11h-3v-2a1 1 0 0 1 .5-1z"/></svg></a>
          <a href="#/categoria/vinicola" aria-label="Pinterest" title="Pinterest"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M10.5 19l1.4-5.5m-1.8-1.1a3.2 3.2 0 1 1 5.1 1.4c-.6.8-1.7.8-2.2.2"/></svg></a>
        </div>
        <span class="wine-footer-sep" aria-hidden="true"></span>
        <p class="wine-footer-tagline">Aprender. Cozinhar. Compartilhar.</p>
      </footer>

      <p class="wine-disclaimer">Estes são perfis típicos informativos para fins didáticos; características variam por região, produtor e safra.</p>
    </main>`;
  }

  function winePage(): string {
    const w = wineProfiles.find((x) => x.id === selectedWineId) || wineProfiles[0];
    return `<main class="wine-showcase wine-profile-page">
      <section class="wine-hero wine-profile-hero" style="background-image:url('${MEDIA.vinicolaHero}')">
        <div class="wine-hero-shade"></div>
        <div class="wine-hero-copy">
          <button class="wine-back-link" data-action="category-open" data-category="vinicola">← Voltar à Vinícola</button>
          <span class="eyebrow">${esc(w.origin.toUpperCase())}</span>
          <h1>${esc(w.name)}</h1>
          <p>${esc(w.kind)} · ${esc(w.grapes)} · Serviço sugerido: ${esc(w.temperature)}<br>Corpo: ${esc(w.body)}</p>
        </div>
      </section>
      <section class="wine-profile-content">
        <div class="wine-info-grid">
          <article><span>01 · INFORMAÇÕES PRINCIPAIS</span><h2>${esc(w.kind)} · ${esc(w.grapes)}</h2><p>${esc(w.origin)}<br>Corpo: ${esc(w.body)} · Temperatura: ${esc(w.temperature)}</p></article>
          <article><span>02 · AROMAS</span><h2>O que pode aparecer</h2><p>${esc(w.aromas)}</p></article>
          <article><span>03 · SABORES</span><h2>Na boca</h2><p>${esc(w.taste)}</p></article>
          <article><span>04 · HARMONIZAÇÃO</span><h2>Ideias para combinar</h2><p>${esc(w.pairing)}</p></article>
        </div>
        <aside class="wine-note">
          <strong>Observação</strong>
          <p>${esc(w.note)}</p>
          <small>Estes são perfis típicos, não uma garantia para todos os rótulos.</small>
        </aside>
        <div class="wine-switch">
          ${wineProfiles
            .filter((x) => x.id !== w.id)
            .map(
              (x) =>
                `<button data-action="wine-open" data-wine="${x.id}">Próximo perfil · ${esc(x.name)} →</button>`
            )
            .join('')}
        </div>
      </section>
    </main>`;
  }

  function memorialPage(): string {
    const slug = memorialCourseSlug || 'massas-italianas';
    const isItalian = slug === 'massas-italianas';
    const { modules, totalSteps } = getAllModulesSummary();

    if (!isItalian) {
      return `<main class="page-wrap memorial-wrap">
        <div class="memorial-sheet">
          <div class="memorial-hero">
            <span class="eyebrow">MEMORIAL DESCRITIVO · ACESSO PÚBLICO</span>
            <h1>Curso em preparação (${esc(slug)})</h1>
            <p>A estrutura pública para novos memoriais descritivos já está preparada. Assim que os módulos deste curso forem publicados, seu programa detalhado aparecerá neste endereço.</p>
          </div>
          <div class="lesson-actions" style="padding:24px;">
            <button type="button" class="btn btn-red" data-action="open-memorial" data-course="massas-italianas">Ver Memorial de Massas Italianas</button>
            <button type="button" class="btn btn-outline-dark" data-action="home">Voltar ao início</button>
          </div>
        </div>
      </main>`;
    }

    const moduleTopics: Record<string, string[]> = {
      carbonara: [
        'Higiene (RDC 216/2004), sal moderado e guanciale sem pele em corte uniforme',
        'Ovos pasteurizados como padrão didático e controle térmico fora do fogo direto',
        'Reserva de guanciale e Pecorino para montagem imediata; alergênicos trigo, ovos e leite',
      ],
      alfredo: [
        'Padronização Alfredo alla Scrofa: 400 g fettuccine, 100 g manteiga e 240 g Parmigiano (24m)',
        'Mantecatura sem creme de leite e ajuste do tempo à espessura da massa artesanal',
        'Fabricação do fettuccine (farinha vs peso final da massa fresca) e alergênicos',
      ],
      arrabbiata: [
        'Penne rigate (massa tubular seca, não recheada) em versão didática de 320 g',
        'Infusão sem queimar o alho, peperoncino ou pimenta calabresa e redução com líquido do tomate',
        'Finalização da massa no molho e opção contemporânea de Pecorino Romano',
      ],
      pesto: [
        'Sequência oficial de 10 etapas (60 g manjericão, 30 g pinoli, 50 g Parmigiano, 25 g Pecorino Sardo, 70 ml azeite)',
        'Almofariz vs processador em pulsos curtos; 320 g fusilli didático (VisitGenoa cita ~4 porções com trofie/trenette)',
        'Conservação segura: nunca armazenar alho em azeite à temperatura ambiente (NCHFP)',
      ],
      'ragù': [
        'Duas fichas independentes: Ficha Técnica A (Tagliatelle, 4 porções) e Ficha Técnica B (Ragù Accademia 2023, 6 porções)',
        'Carne moída grossa com colágeno, pancetta fresca não defumada, soffritto e cozimento lento (2–3 h)',
        'Montagem final (~400 g de ragù pronto para 4 porções), gestão de sobra e validação prática em bancada pendente',
      ],
      sauces: [
        'Pomodoro: redução 20–30 min para 320–400 g massa seca, concentração vs acidez, sem açúcar obrigatório',
        'Burro e Salvia (100 g manteiga): manteiga derretida, dourada e queimada para ravioli e tortelli',
        'Alergênicos separados de molho e massa e boas práticas contra contaminação cruzada',
      ],
    };

    return `<main class="page-wrap memorial-wrap">
      <div class="memorial-top-nav">
        <button class="back-crumb" data-action="home">← Voltar ao site FerveC</button>
        <span class="memorial-public-tag">Acesso público direto · sem necessidade de login</span>
      </div>

      <article class="memorial-sheet">
        <header class="memorial-header-banner">
          <img class="memorial-banner-pasta crop-pasta-right" src="${MEDIA.pastaCarbonaraHero}" alt="" aria-hidden="true">
          <img class="memorial-banner-coliseu" src="/assets/memorial-coliseu.svg" alt="" aria-hidden="true">
          <div class="memorial-header-copy">
            <span class="eyebrow">CURSO</span>
            <h1>Massas Italianas</h1>
            <p>MEMORIAL DESCRITIVO DO CURSO</p>
            <div class="memorial-tricolor" aria-hidden="true"><span></span><span></span><span></span></div>
          </div>
          <svg class="memorial-header-wave" viewBox="0 0 1200 54" preserveAspectRatio="none" aria-hidden="true">
            <path d="M0 10 Q320 52, 650 28 T1200 6 L1200 54 L0 54 Z" fill="#1b7d3c"/>
            <path d="M0 20 Q320 54, 650 36 T1200 18 L1200 54 L0 54 Z" fill="#fffaf0"/>
            <path d="M0 32 Q320 56, 650 42 T1200 28 L1200 54 L0 54 Z" fill="#b41a21"/>
          </svg>
        </header>

        <div class="memorial-body">
          <section class="memorial-intro-grid">
            <div>
              <div class="memorial-pill-heading"><span>▤</span> Apresentação</div>
              <p>Este memorial descritivo apresenta, de forma objetiva e fiel ao conteúdo disponível na plataforma, os módulos e objetivos do curso <strong>Massas Italianas</strong>, conduzido pelo <strong>Chef CREMONESE</strong> na FerveC Gastronomia.</p>
              <p>O percurso reúne <strong>6 módulos didáticos</strong> (${totalSteps} etapas ao todo), combinando orientações passo a passo, cuidados de segurança na cozinha, trabalhos formativos, revisão e avaliação por módulo.</p>
            </div>
            <aside class="memorial-brand-box">
              <img src="/assets/fervec-logo-black.png" alt="FerveC Gastronomia" draggable="false">
              <em>Conhecimento que transforma sua cozinha.</em>
              <small>Modalidade digital · prévia demonstrativa</small>
            </aside>
          </section>

          <section class="memorial-section">
            <div class="memorial-pill-heading"><span>◎</span> Objetivos do Curso</div>
            <ul class="memorial-objectives">
              <li>Compreender fundamentos da culinária italiana aplicados ao preparo de massas e molhos.</li>
              <li>Praticar organização de bancada (<em>mise en place</em>), controle de calor, redução e emulsificação com água do cozimento.</li>
              <li>Executar seis módulos clássicos com atenção à segurança alimentar, alergênicos e prevenção de erros comuns.</li>
              <li>Consolidar o aprendizado por meio de atividades formativas, revisão e avaliação com aproveitamento mínimo de 70%.</li>
            </ul>
          </section>

          <section class="memorial-section">
            <div class="memorial-pill-heading"><span>📖</span> Conteúdo Programático (6 Módulos Reais)</div>
            <div class="memorial-modules-grid">
              ${modules
                .map(
                  (m) => `<article class="memorial-mod-card">
                    <div class="memorial-mod-head">Módulo ${m.index} – ${esc(m.title)}</div>
                    <div class="memorial-mod-content">
                      <img src="${esc(m.photo)}" alt="${esc(m.title)}">
                      <div>
                        <div class="memorial-mod-recipe">${esc(m.recipeTitle)}</div>
                        <ul>
                          ${(moduleTopics[m.id] || []).map((t) => `<li>${esc(t)}</li>`).join('')}
                        </ul>
                        <small>${m.totalSteps} etapas · estimativa didática: ${esc(m.duration)}</small>
                      </div>
                    </div>
                  </article>`
                )
                .join('')}
            </div>
          </section>

          <section class="memorial-result-box">
            <span class="memorial-result-medal" aria-hidden="true">
              <svg viewBox="0 0 44 54" width="42" height="52"><path d="M14 28 L8 50 L18 44 L22 50 L22 28 Z" fill="#b81c24"/><path d="M30 28 L36 50 L26 44 L22 50 L22 28 Z" fill="#8f1117"/><circle cx="22" cy="18" r="14" fill="#e9b236" stroke="#8a5a10" stroke-width="1.6"/><path d="M22 9 l2.6 5.2 5.7.8-4.1 4 1 5.7-5.2-2.7-5.2 2.7 1-5.7-4.1-4 5.7-.8z" fill="#fff5d0"/></svg>
            </span>
            <div>
              <strong>Resultado do Curso &amp; Informações Institucionais</strong>
              <p>Ao percorrer os módulos, o aluno desenvolve autonomia prática nas receitas apresentadas nesta plataforma. Nota de transparência: esta prévia demonstrativa não possui credenciamento oficial emitido, carga horária institucional certificada ou emissão documental autenticada.</p>
            </div>
          </section>

          <div class="memorial-footer-actions">
            <button type="button" class="btn btn-red" data-action="courses">Explorar os 6 módulos →</button>
            <button type="button" class="btn btn-outline-dark" data-action="certificate">Ir para Certificados</button>
            <button type="button" class="btn btn-outline-dark" data-action="share-memorial">Copiar link deste Memorial</button>
          </div>
        </div>

        <footer class="memorial-bottom-strip">
          FERVEC GASTRONOMIA • MAIS QUE UM CURSO, UMA EXPERIÊNCIA CULINÁRIA COMPLETA!
        </footer>
      </article>
      ${footerNote()}
    </main>`;
  }

  function futureCategoryPage(): string {
    if (selectedCategory === 'vinicola') return wineListPage();
    const labels: Record<string, string> = {
      brasileira: 'Gastronomia Brasileira',
      japonesa: 'Gastronomia Japonesa',
      espanhola: 'Gastronomia Espanhola',
      francesa: 'Gastronomia Francesa',
      internacional: 'Cozinha Internacional',
    };
    const looks: Record<string, string> = {
      brasileira: '🥘',
      japonesa: '🍣',
      espanhola: '🥘',
      francesa: '🥐',
    };
    return `<main class="page-wrap future-category">
      <button class="back-crumb" data-action="home">← Explorar cozinhas</button>
      <span class="eyebrow">CATEGORIA GASTRONÔMICA</span>
      <div class="category-welcome">
        <span>${looks[selectedCategory] || '🍽️'}</span>
        <div>
          <h1>${esc(labels[selectedCategory] || 'Nova cozinha')}</h1>
          <p>Esta cozinha está em preparação para futuras turmas. Os cursos serão liberados quando suas receitas, etapas e materiais estiverem completos.</p>
        </div>
      </div>
      <div class="lesson-actions" style="justify-content:flex-start;flex-wrap:wrap;">
        ${btn('Explorar Cozinha Italiana (Disponível)', 'courses', 'btn btn-red')}
        ${btn('Voltar às cozinhas', 'home', 'btn btn-outline-dark')}
      </div>
    </main>`;
  }

  function stopAudioTicker() {
    if (audioTickInterval !== null) {
      window.clearInterval(audioTickInterval);
      audioTickInterval = null;
    }
  }

  function resetAudioClock() {
    stopAudioTicker();
    audioElapsed = 0;
    audioTotal = 0;
  }

  function startAudioTicker(totalSec: number) {
    stopAudioTicker();
    audioTotal = totalSec;
    audioTickInterval = window.setInterval(() => {
      if (audioStatus !== 'playing') return;
      audioElapsed = Math.min(audioTotal, audioElapsed + 1);
      syncAudioUiClock();
      if (audioElapsed >= audioTotal) {
        stopAudioTicker();
      }
    }, 1000);
  }

  function syncAudioUiClock() {
    const totalSec = audioTotal > 0 ? audioTotal : 24;
    const elapsedSec = Math.min(audioElapsed, totalSec);
    const pct = totalSec > 0 ? Math.min(100, Math.round((elapsedSec / totalSec) * 100)) : 0;
    app.querySelectorAll('[data-audio-time]').forEach((el) => {
      el.textContent = `${formatTime(elapsedSec)} / ${formatTime(totalSec)}`;
    });
    app.querySelectorAll<HTMLElement>('[data-audio-progress-fill]').forEach((el) => {
      el.style.width = `${pct}%`;
    });
  }

  function stopTimerOnRouteChange() {
    if (route !== 'lesson' && timerInterval !== null) {
      window.clearInterval(timerInterval);
      timerInterval = null;
      timerRunning = false;
    }
  }

  function formatTime(n: number): string {
    return `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`;
  }

  function updateAudioStatus() {
    const isPlaying = audioStatus === 'playing';
    app.querySelectorAll('[data-audio-state]').forEach((x) => {
      x.textContent = statusText();
    });
    app.querySelectorAll('.vinyl-disc').forEach((x) => {
      x.classList.toggle('spinning', isPlaying);
    });
    app.querySelectorAll('[data-audio-wave]').forEach((x) => {
      x.classList.toggle('is-playing', isPlaying);
    });
    app.querySelectorAll('[data-audio-play-btn], [data-audio-bar-btn]').forEach((x) => {
      x.textContent = isPlaying ? '❚❚' : '▶';
    });
    app.querySelectorAll('[data-audio-center-btn]').forEach((x) => {
      x.classList.toggle('is-playing', isPlaying);
      x.innerHTML = isPlaying
        ? '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6.5" y="5" width="4" height="14" rx="1"/><rect x="13.5" y="5" width="4" height="14" rx="1"/></svg>'
        : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l11-6.5z"/></svg>';
    });
    if (audioStatus === 'ended' || audioStatus === 'idle') {
      stopAudioTicker();
      if (audioStatus === 'ended') {
        audioElapsed = audioTotal;
        syncAudioUiClock();
      }
    }
  }

  function playText(text: string) {
    audioElapsed = 0;
    const est = estimateAudioSeconds(text);
    audioTotal = est;
    audioStatus = 'loading';
    syncAudioUiClock();
    updateAudioStatus();
    void playChef(text, (s) => {
      audioStatus = s;
      if (s === 'playing') {
        startAudioTicker(est);
      } else if (s === 'paused') {
        stopAudioTicker();
      }
      updateAudioStatus();
    });
  }

  function renderTimerButtons() {
    const b = $('[data-action="timer-start"]');
    if (b) b.textContent = timerRunning ? 'Rodando…' : 'Retomar';
  }

  function timerStart() {
    if (timerInterval !== null) return;
    const field = $<HTMLInputElement>('[data-timer-input]');
    if (!timerValue) {
      const m = field ? parseInt(field.value, 10) : 0;
      if (!Number.isFinite(m) || m < 1 || m > 180) {
        if (field) field.focus();
        showToast('Informe um tempo entre 1 e 180 minutos.');
        return;
      }
      timerValue = m * 60;
    }
    timerRunning = true;
    timerInterval = window.setInterval(() => {
      timerValue = Math.max(0, timerValue - 1);
      const el = $('[data-timer]');
      if (el) el.textContent = formatTime(timerValue);
      if (timerValue <= 0 && timerInterval !== null) {
        window.clearInterval(timerInterval);
        timerInterval = null;
        timerRunning = false;
        showToast('Tempo concluído! Confira o ponto da massa.');
      }
    }, 1000);
    renderTimerButtons();
  }

  function timerPause() {
    if (timerInterval !== null) {
      window.clearInterval(timerInterval);
      timerInterval = null;
    }
    timerRunning = false;
    renderTimerButtons();
  }

  function timerReset() {
    timerPause();
    timerValue = 0;
    const d = $('[data-timer]');
    if (d) d.textContent = formatTime(0);
    const i = $<HTMLInputElement>('[data-timer-input]');
    if (i) i.value = '';
  }

  function openModal(html: string) {
    modal.innerHTML = html;
    modal.querySelectorAll('.modal-backdrop').forEach((el) =>
      el.addEventListener('click', (e) => {
        if (e.target === el) closeModal();
      })
    );
  }

  function closeModal() {
    if (activePdfPreviewUrl) {
      URL.revokeObjectURL(activePdfPreviewUrl);
      activePdfPreviewUrl = null;
    }
    modal.innerHTML = '';
  }

  const LEGAL_DOCUMENT_ASSET_PATH =
    '/assets/aistudio/fervec_x5f_gastronomia_x5f_documento_x5f_unico__1___1__f38fd1c7.html';
  const LEGAL_DOCUMENT_EXTERNAL_URL =
    'https://www.meta.ai/share/a/2629c883-def1-401e-8c7f-b86630d8789c';

  function openLegalDocumentModal(section: 'termos' | 'privacidade' | 'topo' = 'termos') {
    const isPrivacy = section === 'privacidade';
    const docUrl = `${LEGAL_DOCUMENT_ASSET_PATH}#${section}`;
    const title =
      section === 'privacidade'
        ? 'Política de Privacidade (LGPD)'
        : section === 'termos'
          ? 'Termos de Condições de Uso'
          : 'Documento Único — Termos e Política de Privacidade';

    openModal(`<div class="modal-backdrop">
      <section class="modal legal-doc-modal" role="dialog" aria-modal="true" aria-labelledby="legal-doc-modal-title">
        <button type="button" class="modal-close" data-action="close-modal" aria-label="Fechar">×</button>
        <span class="eyebrow">FERVEC GASTRONOMIA · DOCUMENTO ÚNICO V1.0</span>
        <h2 id="legal-doc-modal-title">${esc(title)}</h2>
        <div class="legal-doc-tabs" role="tablist" aria-label="Seções do documento legal">
          <button
            type="button"
            class="legal-doc-tab ${section === 'termos' ? 'is-active' : ''}"
            data-action="legal-doc-jump"
            data-section="termos"
          >Termos de Condições</button>
          <button
            type="button"
            class="legal-doc-tab ${isPrivacy ? 'is-active' : ''}"
            data-action="legal-doc-jump"
            data-section="privacidade"
          >Política de Privacidade</button>
          <button
            type="button"
            class="legal-doc-tab ${section === 'topo' ? 'is-active' : ''}"
            data-action="legal-doc-jump"
            data-section="topo"
          >Documento Completo</button>
        </div>
        <div class="legal-doc-frame-wrap">
          <iframe
            class="legal-doc-frame"
            id="legal-doc-frame"
            src="${esc(docUrl)}"
            title="${esc(title)}"
          ></iframe>
        </div>
        <div class="modal-buttons legal-doc-actions">
          <button type="button" class="btn btn-red" data-action="accept-terms-from-modal">✓ Concordo com os Termos</button>
          <a
            class="btn btn-outline-dark"
            id="legal-doc-external-asset-link"
            href="${esc(docUrl)}"
            target="_blank"
            rel="noopener noreferrer"
          >Abrir documento completo ↗</a>
          <a
            class="btn btn-outline-dark"
            href="${esc(LEGAL_DOCUMENT_EXTERNAL_URL)}"
            target="_blank"
            rel="noopener noreferrer"
          >Link original ↗</a>
          <button type="button" class="btn btn-outline-dark" data-action="close-modal">Fechar</button>
        </div>
      </section>
    </div>`);
  }

  function showModal(title: string, copy: string) {
    openModal(`<div class="modal-backdrop">
      <section class="modal" role="dialog" aria-modal="true">
        <button class="modal-close" data-action="close-modal" aria-label="Fechar">×</button>
        <span class="eyebrow">FERVEC GASTRONOMIA</span>
        <h2>${esc(title)}</h2>
        <p>${esc(copy)}</p>
        <button class="btn btn-red" data-action="close-modal">Entendi</button>
      </section>
    </div>`);
  }

  function openDemoModal(copy: string) {
    openModal(`<div class="modal-backdrop">
      <section class="modal" role="dialog" aria-modal="true">
        <button class="modal-close" data-action="close-modal" aria-label="Fechar">×</button>
        <span class="eyebrow">MODO DEMONSTRAÇÃO</span>
        <h2>Vamos para a cozinha?</h2>
        <p>${esc(copy)}</p>
        <div class="modal-callout">Esta versão guarda o progresso só neste navegador. Não cria conta, compra, matrícula ou certificado oficial.</div>
        <div class="modal-buttons">
          <button class="btn btn-red" data-action="demo-entry">Explorar a demonstração</button>
          <button class="btn btn-outline-dark" data-action="close-modal">Voltar</button>
        </div>
      </section>
    </div>`);
  }

  function openCompletion() {
    openModal(`<div class="modal-backdrop">
      <section class="modal" role="dialog" aria-modal="true">
        <button class="modal-close" data-action="close-modal" aria-label="Fechar">×</button>
        <span class="eyebrow">MAIS UMA ETAPA CONCLUÍDA!</span>
        <h2>Parabéns pela sua Carbonara!</h2>
        <p>Você percorreu as seis etapas. Seu avanço está salvo nesta demonstração.</p>
        <div class="modal-buttons">
          <button class="btn btn-outline-dark" data-action="close-modal">Voltar para a aula</button>
          <button class="btn btn-red" data-action="questions">Ir às perguntas</button>
        </div>
      </section>
    </div>`);
  }

  function showSos(moduleId = 'carbonara') {
    const choices = [
      'Não entendi esta etapa.',
      'Minha preparação ficou diferente.',
      'Não sei identificar o ponto correto.',
      'Quero uma explicação mais simples.',
      'Quero entender um erro comum.',
      'Preciso revisar uma técnica.',
    ];
    const isCarb = moduleId === 'carbonara';
    const rec = !isCarb ? extraRecipes.find((x) => x.id === moduleId) : null;
    const stepNum = isCarb ? lessonStage + 1 : recipeStage + 1;
    const stepTitle = isCarb ? stages[lessonStage].title : rec?.steps[recipeStage]?.[0] || 'Etapa atual';

    openModal(`<div class="modal-backdrop">
      <section class="modal" role="dialog" aria-modal="true">
        <button class="modal-close" data-action="close-modal" aria-label="Fechar">×</button>
        <span class="eyebrow">SOCORRO, CHEF! · ETAPA ${stepNum}</span>
        <h2>Vamos resolver juntos: ${esc(stepTitle)}</h2>
        <p>Escolha o que está acontecendo. Esta ajuda é preparada para o passo atual.</p>
        ${choices
          .map(
            (x, i) =>
              `<button class="assist-choice" data-action="sos-choice" data-module="${esc(moduleId)}" data-choice="${i}">${x}</button>`
          )
          .join('')}
        <div class="answer hide" data-sos-answer></div>
        <div class="modal-buttons" style="margin-top:14px;">
          <button class="btn btn-outline-dark" data-action="open-chef-chat">Perguntar livremente ao Chef IA</button>
        </div>
      </section>
    </div>`);
  }

  function showSosAnswer(i: number, moduleId = 'carbonara') {
    let tag = '';
    let texts: string[] = [];

    if (moduleId === 'carbonara') {
      const s = stages[lessonStage];
      tag = s.tag;
      texts = [
        `Vamos por partes. ${s.intro} ${s.body}`,
        `Tudo bem, cada cozinha tem seu ritmo. ${s.tip}`,
        `Observe o sinal importante desta etapa: ${s.tip}`,
        `Em poucas palavras: ${s.intro} ${s.tip}`,
        `Um erro comum nesta etapa é ignorar o calor e o ponto. ${s.warning}`,
        `Vamos revisar o fundamento: ${s.body}`,
      ];
    } else {
      const r = extraRecipes.find((x) => x.id === moduleId);
      const st = r?.steps[recipeStage] || ['Etapa', r?.chefTip || '', ''];
      tag = st[0];
      texts = [
        `Vamos por partes: ${st[1]}`,
        `Mantenha a calma e ajuste aos poucos: ${st[2]}`,
        `Sinal principal desta etapa: ${st[2]}`,
        `Resumo prático: ${st[1]}`,
        `Fique atenta aos erros comuns: ${(r?.errors || [])[0] || r?.chefTip || ''}`,
        `Dica técnica do Chef para ${r?.title || ''}: ${r?.chefTip || ''}`,
      ];
    }

    const el = modal.querySelector('[data-sos-answer]');
    if (el) {
      el.classList.remove('hide');
      el.innerHTML = `<strong>Dica do Chef para ${esc(tag)}:</strong><br>${esc(
        texts[i] || texts[0]
      )}<br><br>Seu progresso continua guardado.`;
    }
  }

  function showEye(moduleId = 'carbonara') {
    if (moduleId === 'carbonara') {
      const s = stages[lessonStage];
      const stageImg = getStageVisual('carbonara', lessonStage);
      openModal(`<div class="modal-backdrop">
        <section class="modal eye-modal" role="dialog" aria-modal="true">
          <button class="modal-close" data-action="close-modal" aria-label="Fechar">×</button>
          <span class="eyebrow">OLHO DO CHEF · ${esc(s.tag)}</span>
          <h2>Repare nos detalhes.</h2>
          <img src="${esc(stageImg)}" alt="${esc(s.alt)}" class="eye-photo">
          <span class="photo-caption-inline">${esc(s.caption)}</span>
          <div class="eye-observation">
            <strong>O que observar</strong>
            <p>${esc(s.tip)}</p>
          </div>
          <div class="safety-note"><strong>Fique atenta:</strong> ${esc(s.warning)}</div>
        </section>
      </div>`);
      return;
    }

    const r = extraRecipes.find((x) => x.id === moduleId);
    if (!r) return;
    const st = r.steps[recipeStage] || r.steps[0];
    openModal(`<div class="modal-backdrop">
      <section class="modal eye-modal" role="dialog" aria-modal="true">
        <button class="modal-close" data-action="close-modal" aria-label="Fechar">×</button>
        <span class="eyebrow">OLHO DO CHEF · ${esc(st[0])}</span>
        <h2>Repare nos detalhes.</h2>
        <img src="${esc(getStageVisual(r.id, recipeStage))}" alt="${esc(r.title)}" class="eye-photo">
        <span class="photo-caption-inline">${esc(r.title)} · ${esc(st[0])}</span>
        <div class="eye-observation">
          <strong>O que observar</strong>
          <p>${esc(st[2])}</p>
        </div>
        <div class="safety-note"><strong>Alergênicos e atenção:</strong> ${esc(r.allergens)}</div>
      </section>
    </div>`);
  }

  function resetDemo() {
    openModal(`<div class="modal-backdrop">
      <section class="modal" role="dialog" aria-modal="true">
        <button class="modal-close" data-action="close-modal">×</button>
        <span class="eyebrow">DADOS DESTE NAVEGADOR</span>
        <h2>Recomeçar demonstração?</h2>
        <p>Isso limpa apenas os avanços locais da demonstração salvos neste dispositivo. Não altera contas externas nem bancos de dados.</p>
        <div class="modal-buttons">
          <button class="btn btn-outline-dark" data-action="close-modal">Manter progresso</button>
          <button class="btn btn-red" data-action="confirm-reset">Limpar demonstração</button>
        </div>
      </section>
    </div>`);
    modal.addEventListener(
      'click',
      (e) => {
        const b = (e.target as Element).closest('[data-action="confirm-reset"]');
        if (b) {
          clearProgress();
          state = loadProgress();
          lessonStage = 0;
          recipeStage = 0;
          closeModal();
          showToast('Demonstração reiniciada neste navegador.');
          render();
        }
      },
      { once: true }
    );
  }

  function go(next: string) {
    stopChef();
    resetAudioClock();
    audioStatus = 'idle';
    cuisinesMenuOpen = false;
    accountMenuOpen = false;
    portalMenuOpen = false;
    if (next === 'account' && !state.demo) {
      route = 'account';
      syncHashForRoute(route);
      render();
      return;
    }
    if (next === 'progress' && !state.demo) {
      route = 'progress';
      syncHashForRoute(route);
      render();
      return;
    }
    if (next === 'certificate' && !state.demo) {
      route = 'certificate';
      syncHashForRoute(route);
      render();
      return;
    }
    if (next === 'questions' && !state.demo) {
      openDemoModal('Para experimentar as perguntas, abra o curso em modo demonstração.');
      return;
    }
    if (next === 'review' && !state.demo) {
      openDemoModal('A revisão fica disponível no modo demonstração.');
      return;
    }
    route = next;
    syncHashForRoute(route);
    render();
    if (pendingScrollTarget) {
      const targetId = pendingScrollTarget;
      pendingScrollTarget = null;
      window.setTimeout(() => {
        document.querySelector(targetId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 40);
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  function startCourse() {
    stopChef();
    lessonTab = 'learn';
    state.demo = true;
    state.lastModuleId = 'carbonara';
    route = 'lesson';
    lessonStage = Math.min(state.stage || 0, stages.length - 1);
    prepMode = false;
    const ing = getIngredientsForModuleStage('carbonara', lessonStage);
    selectedIngredientId = ing[0]?.id || 'spaghetti';
    persist();
    syncHashForRoute(route);
    render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function continueActiveCourse() {
    const { activeModule } = getAllModulesSummary();
    if (activeModule.id === 'carbonara') {
      startCourse();
      return;
    }
    selectedRecipeId = activeModule.id;
    recipeStage = state.recipeProgress?.[selectedRecipeId]?.stage || 0;
    recipeTab = 'lesson';
    const ing = getIngredientsForModuleStage(selectedRecipeId, recipeStage);
    selectedIngredientId = ing[0]?.id || 'spaghetti';
    state.demo = true;
    persist();
    go('recipe');
  }

  function syncProgressScope(profile: StoredUserProfile | null) {
    const prevState = state;
    setActiveProgressScope(profile?.supabaseUserId || profile?.id || 'guest');
    const scopedState = loadProgress();
    if (profile?.authSource === 'supabase' && prevState) {
      const mergedDone = Array.from(new Set([...(scopedState.done || []), ...(prevState.done || [])]));
      const mergedCarbExams =
        scopedState.examAttempts.some((x) => x.passed)
          ? scopedState.examAttempts
          : prevState.examAttempts.some((x) => x.passed)
            ? [...scopedState.examAttempts, ...prevState.examAttempts]
            : scopedState.examAttempts;

      const nextRecipeProgress = { ...(scopedState.recipeProgress || {}) };
      if (prevState.recipeProgress) {
        for (const [modId, prevEntry] of Object.entries(prevState.recipeProgress)) {
          const curEntry = nextRecipeProgress[modId];
          if (
            prevEntry?.examAttempts?.some((x) => x.passed) &&
            !curEntry?.examAttempts?.some((x) => x.passed)
          ) {
            nextRecipeProgress[modId] = {
              ...(curEntry || prevEntry),
              stage: Math.max(curEntry?.stage || 0, prevEntry.stage || 0),
              done: Array.from(new Set([...(curEntry?.done || []), ...(prevEntry.done || [])])),
              reviewDone: Boolean(curEntry?.reviewDone || prevEntry.reviewDone),
              workFinished: Boolean(curEntry?.workFinished || prevEntry.workFinished),
              examAttempts: [...(curEntry?.examAttempts || []), ...prevEntry.examAttempts],
            };
          }
        }
      }

      state = {
        ...scopedState,
        done: mergedDone,
        miseChecks: Array.from(
          new Set([...(scopedState.miseChecks || []), ...(prevState.miseChecks || [])])
        ),
        reviewDone: Boolean(scopedState.reviewDone || prevState.reviewDone),
        lessonFinished: Boolean(scopedState.lessonFinished || prevState.lessonFinished),
        questionsFinished: Boolean(scopedState.questionsFinished || prevState.questionsFinished),
        examAttempts: mergedCarbExams,
        recipeProgress: nextRecipeProgress,
      };
      persist();
    } else {
      state = scopedState;
    }
    lessonStage = Math.min(Math.max(state.stage || 0, 0), stages.length - 1);
    prepMode = !state.mise;
    qIndex = Number.isInteger(state.questionCurrent) ? state.questionCurrent : 0;
    examStatus = state.examStatus || 'intro';
  }

  let syncingPendingExam = false;

  async function syncPendingPassedActivitiesIfNeeded(ws: WorkspaceHydrationResponse): Promise<boolean> {
    if (syncingPendingExam) return false;
    if (userProfile?.authSource !== 'supabase') return false;
    if (ws.eligibleForCertificate || ws.permissions?.canBypassExamForCertificates) return false;
    if (ws.attempts.some((a) => a.attempt_type === 'exam' && a.passed)) return false;

    syncingPendingExam = true;
    try {
      const localCarbPassed = state.examAttempts.find(
        (x) => x.passed && Array.isArray(x.answers) && x.answers.length === exam.length
      );
      const carbStepsDone = state.lessonFinished || state.done.length >= stages.length;
      if (localCarbPassed && carbStepsDone && state.reviewDone) {
        const syncOk = await syncModuleProgressToServer({
          moduleKey: 'carbonara',
          currentStage: lessonStage,
          doneSteps: state.done,
          miseChecks: state.miseChecks,
          reviewDone: true,
          lessonFinished: true,
          workFinished: Boolean(state.questionsFinished),
          lastModuleKey: 'carbonara',
        });
        if (syncOk) {
          const submitRes = await submitAssessmentToServer({
            moduleKey: 'carbonara',
            attemptType: 'exam',
            answers: localCarbPassed.answers.map((v) => (typeof v === 'number' ? v : 0)),
          });
          if (submitRes.ok && submitRes.passed) {
            if (submitRes.certificate) {
              upsertWorkspaceCertificate(submitRes.certificate, submitRes.certificates);
            }
            return true;
          }
        }
      }

      for (const r of extraRecipes) {
        const p = state.recipeProgress?.[r.id];
        if (!p) continue;
        const localRecPassed = p.examAttempts.find(
          (x) => x.passed && Array.isArray(x.answers) && x.answers.length === 8
        );
        if (localRecPassed && p.done.length >= r.steps.length && p.reviewDone) {
          const syncOk = await syncModuleProgressToServer({
            moduleKey: r.id,
            currentStage: p.stage,
            doneSteps: p.done,
            reviewDone: true,
            lessonFinished: true,
            workFinished: Boolean(p.workFinished),
            lastModuleKey: r.id,
          });
          if (syncOk) {
            const submitRes = await submitAssessmentToServer({
              moduleKey: r.id,
              attemptType: 'exam',
              answers: localRecPassed.answers.map((v) => (typeof v === 'number' ? v : 0)),
            });
            if (submitRes.ok && submitRes.passed) {
              if (submitRes.certificate) {
                upsertWorkspaceCertificate(submitRes.certificate, submitRes.certificates);
              }
              return true;
            }
          }
        }
      }
      return false;
    } finally {
      syncingPendingExam = false;
    }
  }

  async function hydrateAuthenticatedWorkspace(): Promise<WorkspaceHydrationResponse | null> {
    if (!isSupabaseConfigured()) return null;
    const ws = await fetchWorkspaceState();
    if (!ws) return null;
    workspaceData = ws;
    issuedCertificate = ws.certificate;
    if (userProfile && ws.profile) {
      userProfile = {
        ...userProfile,
        authSource: 'supabase',
        fullName: ws.profile.full_name || userProfile.fullName,
        cpfMasked: ws.profile.cpf_masked || userProfile.cpfMasked,
        email: ws.profile.email || userProfile.email,
      };
      saveProfile(userProfile);
      profileDraft = createInitialProfileDraft(userProfile);
    }
    state = hydrateCourseStateFromWorkspace(state, ws);
    lessonStage = Math.min(Math.max(state.stage || 0, 0), stages.length - 1);
    persist();
    render();

    const syncedPending = await syncPendingPassedActivitiesIfNeeded(ws);
    if (syncedPending) {
      const refreshed = await fetchWorkspaceState();
      if (refreshed) {
        workspaceData = refreshed;
        issuedCertificate = refreshed.certificate;
        state = hydrateCourseStateFromWorkspace(state, refreshed);
        persist();
        render();
        return refreshed;
      }
    }
    return ws;
  }

  function syncCarbonaraProgressAsync() {
    if (userProfile?.authSource !== 'supabase') return;
    void syncModuleProgressToServer({
      moduleKey: 'carbonara',
      currentStage: lessonStage,
      doneSteps: state.done,
      miseChecks: state.miseChecks,
      reviewDone: Boolean(state.reviewDone),
      lessonFinished: Boolean(state.lessonFinished),
      workFinished: Boolean(state.questionsFinished),
      lastModuleKey: state.lastModuleId || 'carbonara',
    });
  }

  function syncRecipeProgressAsync(r: ExtraRecipe, prog: RecipeProgressEntry) {
    if (userProfile?.authSource !== 'supabase') return;
    void syncModuleProgressToServer({
      moduleKey: r.id,
      currentStage: prog.stage,
      doneSteps: prog.done,
      reviewDone: Boolean(prog.reviewDone),
      lessonFinished: prog.done.length >= r.steps.length,
      workFinished: Boolean(prog.workFinished),
      lastModuleKey: state.lastModuleId || r.id,
    });
  }

  function openBillingCustomerModal(
    subtitle: string,
    onComplete: (customer: CheckoutCustomerPayload) => void
  ): void {
    const prefillName =
      sessionBillingCustomer?.name ||
      paymentSummary.customerProfile?.fullName ||
      userProfile?.fullName ||
      '';
    const prefillEmail =
      sessionBillingCustomer?.email ||
      paymentSummary.customerProfile?.email ||
      userProfile?.email ||
      '';
    const prefillPhoneRaw =
      sessionBillingCustomer?.mobilePhone ||
      digitsOnly(
        `${paymentSummary.customerProfile?.ddd || userProfile?.ddd || ''}${
          paymentSummary.customerProfile?.phone || userProfile?.phone || ''
        }`
      );
    const prefillCpf = sessionBillingCustomer?.cpfCnpj
      ? formatCpf(sessionBillingCustomer.cpfCnpj)
      : '';

    openModal(`<div class="modal-backdrop">
      <section class="modal" role="dialog" aria-modal="true" aria-labelledby="billing-customer-title">
        <button type="button" class="modal-close" data-action="close-modal" aria-label="Fechar">×</button>
        <span class="eyebrow">ASAAS SANDBOX · IDENTIFICAÇÃO DO COMPRADOR</span>
        <h2 id="billing-customer-title">Confirme seu CPF para emissão</h2>
        <p>${esc(subtitle)}</p>
        <form id="billing-customer-form" style="display:grid;gap:12px;margin-top:14px;">
          <div>
            <label for="billing-customer-name" style="display:block;font-size:13px;font-weight:600;margin-bottom:4px;">Nome completo</label>
            <input id="billing-customer-name" name="name" type="text" required value="${esc(prefillName)}" placeholder="Seu nome completo" style="width:100%;padding:10px 14px;border-radius:999px;border:1px solid #d4c4ac;background:#fff;" />
          </div>
          <div>
            <label for="billing-customer-email" style="display:block;font-size:13px;font-weight:600;margin-bottom:4px;">E-mail</label>
            <input id="billing-customer-email" name="email" type="email" required value="${esc(prefillEmail)}" placeholder="seu@email.com" style="width:100%;padding:10px 14px;border-radius:999px;border:1px solid #d4c4ac;background:#fff;" />
          </div>
          <div class="billing-customer-grid">
            <div>
              <label for="billing-customer-cpf" style="display:block;font-size:13px;font-weight:600;margin-bottom:4px;">CPF (obrigatório no Asaas)</label>
              <input id="billing-customer-cpf" name="cpf" type="text" inputmode="numeric" maxlength="14" required value="${esc(prefillCpf)}" placeholder="000.000.000-00" style="width:100%;padding:10px 14px;border-radius:999px;border:1px solid #d4c4ac;background:#fff;" />
            </div>
            <div>
              <label for="billing-customer-phone" style="display:block;font-size:13px;font-weight:600;margin-bottom:4px;">Celular com DDD</label>
              <input id="billing-customer-phone" name="mobilePhone" type="tel" inputmode="numeric" maxlength="15" value="${esc(prefillPhoneRaw)}" placeholder="11999990000" style="width:100%;padding:10px 14px;border-radius:999px;border:1px solid #d4c4ac;background:#fff;" />
            </div>
          </div>
          <p data-billing-error role="alert" style="display:none;margin:0;padding:10px 14px;border-radius:12px;background:#fff1f0;border:1px solid #e7b5b2;color:#8c1118;font-size:13px;font-weight:600;line-height:1.45;"></p>
          <div class="modal-buttons" style="margin-top:4px;">
            <button type="button" class="btn btn-outline-dark" data-action="close-modal">Cancelar</button>
            <button type="submit" class="btn btn-red" id="billing-customer-submit">Continuar para pagamento</button>
          </div>
        </form>
      </section>
    </div>`);

    const form = modal.querySelector<HTMLFormElement>('#billing-customer-form');
    const cpfInput = modal.querySelector<HTMLInputElement>('#billing-customer-cpf');
    const errorEl = modal.querySelector<HTMLElement>('[data-billing-error]');

    cpfInput?.addEventListener('input', () => {
      cpfInput.value = formatCpf(cpfInput.value);
    });

    form?.addEventListener('submit', (ev) => {
      ev.preventDefault();
      const nameVal = (form.querySelector<HTMLInputElement>('#billing-customer-name')?.value || '')
        .trim()
        .replace(/\s+/g, ' ');
      const emailVal = (form.querySelector<HTMLInputElement>('#billing-customer-email')?.value || '')
        .trim()
        .toLowerCase();
      const cpfDigits = digitsOnly(cpfInput?.value || '');
      const phoneDigits = digitsOnly(
        form.querySelector<HTMLInputElement>('#billing-customer-phone')?.value || ''
      );

      let errMsg = '';
      if (nameVal.length < 3) {
        errMsg = 'Informe seu nome completo (mínimo 3 caracteres).';
      } else if (!validateEmail(emailVal)) {
        errMsg = 'Informe um e-mail válido.';
      } else if (!validateCpf(cpfDigits)) {
        errMsg = 'Informe um CPF válido com 11 dígitos.';
      } else if (phoneDigits && (phoneDigits.length < 10 || phoneDigits.length > 11)) {
        errMsg = 'Celular deve conter DDD + número (10 ou 11 dígitos).';
      }

      if (errMsg) {
        if (errorEl) {
          errorEl.textContent = errMsg;
          errorEl.style.display = 'block';
        }
        return;
      }

      const payload: CheckoutCustomerPayload = {
        name: nameVal,
        email: emailVal,
        cpfCnpj: cpfDigits,
        ...(phoneDigits ? { mobilePhone: phoneDigits } : {}),
      };
      sessionBillingCustomer = payload;
      closeModal();
      onComplete(payload);
    });
  }

  async function handleBuyCourseClick(params: {
    courseId: string;
    courseSlug: string;
    courseTitle: string;
    value: number;
  }) {
    if (PHASE_1_OFFLINE_ONLY || !SUPABASE_CONNECTED) {
      paymentSummary = {
        ...createDefaultCoursePaymentSummary(params.courseSlug || 'massas-italianas'),
        courseId: params.courseId,
        courseSlug: params.courseSlug,
        courseTitle: params.courseTitle,
        priceCents: Math.round(params.value * 100),
      };
      paymentsUiStatus = 'awaiting_selection';
      paymentsStatusMessage = null;
      go('payments');
      return;
    }
    if (paymentCheckoutState.isProcessing) return;
    const outcome = await requestAsaasChargeCheckout({
      courseId: params.courseId,
      courseSlug: params.courseSlug,
      courseTitle: params.courseTitle,
      value: params.value,
      billingType: 'PIX',
      ...(sessionBillingCustomer ? { customer: sessionBillingCustomer } : {}),
    });

    if (outcome.reason === 'already_processing') return;

    if (outcome.ok && outcome.payment) {
      const isSandbox = (outcome.environment || paymentSummary.environment) === 'sandbox';
      if (outcome.payment.customerId && paymentSummary.customerProfile) {
        paymentSummary.customerProfile.hasAsaasCustomerId = true;
      }
      const p = outcome.payment;
      const formattedVal = Number(p.value || params.value).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      });
      const pixQrHtml = p.pix?.encodedImage
        ? `<img class="payment-pix-qr" src="data:image/png;base64,${esc(p.pix.encodedImage)}" alt="${isSandbox ? 'QR Code Pix Asaas Sandbox' : 'QR Code Pix Asaas'}" />`
        : '';
      const pixPayloadHtml = p.pix?.payload
        ? `<label for="pix-copy-paste" style="font-size:12px;font-weight:700;color:#5b4338;">Pix Copia e Cola</label>
           <textarea id="pix-copy-paste" class="payment-pix-code" rows="3" readonly>${esc(p.pix.payload)}</textarea>`
        : '';

      openModal(`<div class="modal-backdrop">
        <section class="modal" role="dialog" aria-modal="true" aria-labelledby="asaas-charge-title">
          <button type="button" class="modal-close" data-action="close-modal" aria-label="Fechar">×</button>
          <span class="eyebrow">${isSandbox ? 'ASAAS SANDBOX · PAGAMENTO GERADO' : 'ASAAS · PAGAMENTO GERADO'}</span>
          <h2 id="asaas-charge-title">Cobrança criada com sucesso</h2>
          <p><strong>${esc(params.courseTitle)}</strong> · Valor: <strong>${esc(formattedVal)}</strong> · Status: <strong>${esc(p.status)}</strong></p>
          ${pixQrHtml || pixPayloadHtml ? `<div class="payment-pix-box">${pixQrHtml}${pixPayloadHtml}</div>` : ''}
          <div class="modal-buttons" style="margin-top:16px;">
            ${
              p.invoiceUrl
                ? `<a class="btn btn-red" href="${esc(p.invoiceUrl)}" target="_blank" rel="noopener noreferrer">${isSandbox ? 'Abrir fatura Sandbox ↗' : 'Abrir fatura ↗'}</a>`
                : ''
            }
            <button type="button" class="btn btn-outline-dark" data-action="close-modal">Fechar</button>
          </div>
        </section>
      </div>`);
      return;
    }

    if (outcome.reason === 'unauthenticated') {
      openLoginModal(
        outcome.error || 'Entre na sua conta para iniciar o pagamento.'
      );
      return;
    }

    if (outcome.errorCode === 'CUSTOMER_CPF_REQUIRED') {
      openBillingCustomerModal(
        outcome.error ||
          'Por segurança (LGPD), seu CPF completo não fica exposto no perfil. Informe-o uma vez para registrar o comprador e gerar a cobrança.',
        () => {
          void handleBuyCourseClick(params);
        }
      );
      return;
    }

    if (outcome.reason === 'unconfigured') {
      showModal(
        'Checkout aguardando configuração do Supabase',
        outcome.error ||
          'Configure VITE_SUPABASE_URL (ou SUPABASE_URL) e VITE_SUPABASE_PUBLISHABLE_KEY (ou SUPABASE_ANON_KEY) neste servidor para conectar à Edge Function create-asaas-charge.'
      );
      return;
    }

    toast.error(
      'Não foi possível iniciar o pagamento',
      outcome.error || 'Tente novamente em instantes.'
    );
  }

  function stopPaymentPollTimer(): void {
    if (paymentPollTimer !== null) {
      window.clearInterval(paymentPollTimer);
      paymentPollTimer = null;
    }
  }

  async function refreshActiveOrderStatus(silent = false): Promise<void> {
    if (!activeOrderId) return;
    const result = await fetchOrderPaymentStatus(activeOrderId);
    if (!result.ok) {
      if (!silent && result.error) {
        toast.error('Erro ao consultar pagamento', result.error);
      }
      return;
    }

    if (result.payment) {
      activePaymentCharge = {
        ...(activePaymentCharge || {}),
        ...result.payment,
      };
    }

    const nextStatus = result.uiStatus || 'awaiting_confirmation';
    paymentsUiStatus = nextStatus;

    if (nextStatus === 'approved') {
      stopPaymentPollTimer();
      paymentSummary = {
        ...paymentSummary,
        isEnrolled: true,
        latestOrderStatus: 'paid',
      };
      paymentsStatusMessage =
        'Pagamento confirmado pelo webhook do Asaas. Seu acesso ao Curso de Massas foi liberado!';
      toast.success('Pagamento aprovado!', 'Seu curso já está liberado.');
      void hydrateAuthenticatedWorkspace();
    } else if (nextStatus === 'expired') {
      stopPaymentPollTimer();
      paymentsStatusMessage = 'Esta cobrança expirou. Selecione a forma de pagamento e gere uma nova cobrança.';
    } else if (nextStatus === 'refused') {
      stopPaymentPollTimer();
      paymentsStatusMessage =
        paymentSummary.environment === 'sandbox'
          ? 'Pagamento recusado ou cancelado no Asaas Sandbox.'
          : 'Pagamento recusado ou cancelado no Asaas.';
    } else {
      paymentsStatusMessage =
        paymentSummary.environment === 'sandbox'
          ? 'Cobrança criada no Asaas Sandbox e pronta para pagamento. O pagamento ainda não foi confirmado — após pagar, utilize "Atualizar status".'
          : 'Cobrança criada no Asaas e pronta para pagamento. O pagamento ainda não foi confirmado — após pagar, utilize "Atualizar status".';
      if (!silent) {
        showToast('Pagamento ainda pendente de confirmação.');
      }
    }

    if (route === 'payments') render();
  }

  function startPaymentPollTimer(orderId: string): void {
    stopPaymentPollTimer();
    paymentPollTimer = window.setInterval(() => {
      if (route !== 'payments' || activeOrderId !== orderId || paymentsUiStatus !== 'awaiting_confirmation') {
        stopPaymentPollTimer();
        return;
      }
      void refreshActiveOrderStatus(true);
    }, 6000);
  }

  async function hydratePaymentsSummary(force = false): Promise<void> {
    if (PHASE_1_OFFLINE_ONLY || !SUPABASE_CONNECTED) {
      paymentSummaryLoaded = true;
      const entitled = userProfile
        ? hasProvisionalCourseEntitlement(userProfile.email, paymentSummary.courseSlug)
        : false;
      paymentSummary = {
        ...paymentSummary,
        isEnrolled: entitled,
      };
      if (entitled && paymentsUiStatus === 'approved') {
        paymentsStatusMessage =
          'Aquisição demonstrativa gratuita confirmada neste dispositivo. Biblioteca Interativa liberada!';
      }
      return;
    }
    if (paymentSummaryLoaded && !force) return;
    paymentSummaryLoaded = true;
    const fetched = await fetchCoursePaymentSummary('massas-italianas');
    paymentSummary = fetched;

    if (!fetched.capabilities.creditCard && fetched.capabilities.debitCard) {
      selectedCardMode = 'DEBIT_CARD';
    }

    if (fetched.latestOrderId) {
      activeOrderId = fetched.latestOrderId;
    }
    if (fetched.latestPayment && !activePaymentCharge) {
      activePaymentCharge = fetched.latestPayment;
    }

    if (fetched.isEnrolled || fetched.latestOrderStatus === 'paid') {
      paymentsUiStatus = 'approved';
      paymentsStatusMessage =
        'Pagamento confirmado no Supabase. Seu acesso ao Curso de Massas está ativo!';
      stopPaymentPollTimer();
    } else if (fetched.latestPayment || fetched.latestOrderStatus === 'pending') {
      const mapped = mapAsaasStatusToUiStatus(
        fetched.latestPayment?.status,
        fetched.latestOrderStatus,
        fetched.isEnrolled
      );
      if (paymentsUiStatus === 'awaiting_selection') {
        paymentsUiStatus = mapped;
        if (mapped === 'awaiting_confirmation') {
          paymentsStatusMessage =
            fetched.environment === 'sandbox'
              ? 'Cobrança criada no Asaas Sandbox e pronta para pagamento. O pagamento ainda não foi confirmado — utilize "Atualizar status" após concluir o pagamento.'
              : 'Cobrança criada no Asaas e pronta para pagamento. O pagamento ainda não foi confirmado — utilize "Atualizar status" após concluir o pagamento.';
          if (fetched.latestOrderId) startPaymentPollTimer(fetched.latestOrderId);
        }
      }
    }

    if (route === 'payments' || route === 'sales' || route === 'home') render();
  }

  async function executePaymentsPageCheckout(overrideMethod?: PaymentMethodChoice): Promise<void> {
    if (PHASE_1_OFFLINE_ONLY || !SUPABASE_CONNECTED) {
      const method = overrideMethod || selectedPaymentMethod;
      selectedPaymentMethod = method;

      const breakdown = appliedPaymentCoupon
        ? applyCouponDiscount(paymentSummary.priceCents, appliedPaymentCoupon.discountPercent)
        : applyCouponDiscount(paymentSummary.priceCents, 0);

      if (appliedPaymentCoupon && breakdown.isFree) {
        if (!userProfile?.email) {
          paymentsUiStatus = 'refused';
          paymentsStatusMessage =
            'Para vincular a matrícula demonstrativa gratuita ao seu acesso da Biblioteca Interativa, faça primeiro seu Cadastro Principal no site.';
          toast.warning('Cadastro necessário', 'Crie ou entre com sua conta antes de concluir.');
          render();
          return;
        }

        const orderId = `DEM-${Date.now().toString(36).toUpperCase()}`;
        const redemption = recordProvisionalCouponRedemption({
          couponCode: appliedPaymentCoupon.code,
          orderId,
          courseSlug: paymentSummary.courseSlug,
          studentEmail: userProfile.email,
          studentName: userProfile.fullName,
          originalCents: breakdown.subtotalCents,
          finalCents: 0,
        });
        if (!redemption.ok) {
          paymentsUiStatus = 'refused';
          paymentsStatusMessage = redemption.error || 'Cupom indisponível para resgate.';
          appliedPaymentCoupon = null;
          render();
          return;
        }

        saveProvisionalDemoOrder({
          id: orderId,
          courseSlug: paymentSummary.courseSlug,
          courseTitle: paymentSummary.courseTitle,
          studentEmail: userProfile.email,
          studentName: userProfile.fullName,
          subtotalCents: breakdown.subtotalCents,
          discountPercent: 100,
          discountCents: breakdown.discountCents,
          totalCents: 0,
          couponCode: appliedPaymentCoupon.code,
          status: 'demo_free_enrolled',
          paymentMethod: 'COUPON_100',
          createdAt: new Date().toISOString(),
          isDemo: true,
        });

        grantProvisionalCourseEntitlement(userProfile.email, paymentSummary.courseSlug);
        paymentSummary = {
          ...paymentSummary,
          isEnrolled: true,
          latestOrderStatus: 'paid',
        };
        activeOrderId = orderId;
        paymentsUiStatus = 'approved';
        paymentsStatusMessage = `Aquisição demonstrativa gratuita concluída (Cupom ${appliedPaymentCoupon.code} · 100%). Acesso ao curso e à Biblioteca Interativa liberado localmente para ${userProfile.email}.`;
        toast.success(
          'Aquisição demonstrativa confirmada!',
          `Pedido ${orderId} registrado e Biblioteca Interativa liberada.`
        );
        render();
        return;
      }

      paymentsUiStatus = 'communication_error';
      paymentsStatusMessage =
        'Gateway Asaas aguardando configuração da Fase 2. Nesta Fase 1 não realizamos transações financeiras reais; utilize um cupom promocional de 100% gerado no Painel Administrativo para testar a aquisição demonstrativa gratuita.';
      toast.info(
        'Asaas aguardando Fase 2',
        'Nenhum pagamento pago foi simulado. Use um cupom de 100% para testar liberação.'
      );
      render();
      return;
    }

    if (paymentCheckoutState.isProcessing) return;

    const method = overrideMethod || selectedPaymentMethod;
    selectedPaymentMethod = method;

    const caps = paymentSummary.capabilities;
    const isSandbox = paymentSummary.environment === 'sandbox';
    const providerLabel = isSandbox ? 'Asaas Sandbox' : 'Asaas';
    let billingType: CheckoutBillingType = 'PIX';

    if (method === 'PIX') {
      billingType = 'PIX';
    } else if (method === 'BOLETO') {
      billingType = 'BOLETO';
    } else {
      if (!caps.creditCard && !caps.debitCard) {
        paymentsUiStatus = 'communication_error';
        paymentsStatusMessage =
          `Cartão de crédito ainda não está habilitado na configuração ${providerLabel}. Selecione Pix ou Boleto bancário.`;
        render();
        return;
      }
      billingType = selectedCardMode === 'DEBIT_CARD' && caps.debitCard ? 'DEBIT_CARD' : 'CREDIT_CARD';
      if (cardHolderNameInput.trim().length < 3) {
        paymentsUiStatus = 'refused';
        paymentsStatusMessage = 'Informe o nome impresso no cartão antes de confirmar o pagamento.';
        render();
        return;
      }
    }

    if (
      userProfile?.authSource === 'supabase' &&
      !sessionBillingCustomer &&
      paymentSummary.customerProfile &&
      !paymentSummary.customerProfile.hasAsaasCustomerId
    ) {
      openBillingCustomerModal(
        `Por segurança (LGPD), seu CPF completo não é mantido visível no perfil. Confirme-o uma vez para registrar o comprador no ${providerLabel}.`,
        () => {
          void executePaymentsPageCheckout(method);
        }
      );
      return;
    }

    paymentsUiStatus = 'generating_charge';
    paymentsStatusMessage = `Gerando cobrança segura no ${providerLabel}...`;
    copiedPixCode = false;
    render();

    const outcome = await requestAsaasChargeCheckout({
      courseId: paymentSummary.courseId || 'italiana',
      courseSlug: paymentSummary.courseSlug || 'massas-italianas',
      courseTitle: paymentSummary.courseTitle || 'Curso de Massas',
      billingType,
      ...(sessionBillingCustomer ? { customer: sessionBillingCustomer } : {}),
    });

    if (outcome.reason === 'already_processing') return;

    if (outcome.ok && outcome.payment) {
      const chargeIsSandbox = (outcome.environment || paymentSummary.environment) === 'sandbox';
      const chargeProviderLabel = chargeIsSandbox ? 'Asaas Sandbox' : 'Asaas';
      if (outcome.environment) {
        paymentSummary = { ...paymentSummary, environment: outcome.environment };
      }
      if (outcome.payment.customerId && paymentSummary.customerProfile) {
        paymentSummary.customerProfile.hasAsaasCustomerId = true;
      }
      activePaymentCharge = outcome.payment;
      activeOrderId = outcome.orderId ?? outcome.payment.orderId ?? activeOrderId;
      if (outcome.capabilities) {
        paymentSummary = { ...paymentSummary, capabilities: outcome.capabilities };
      }

      const nextStatus = mapAsaasStatusToUiStatus(outcome.payment.status, null, false);
      paymentsUiStatus = nextStatus === 'awaiting_selection' ? 'awaiting_confirmation' : nextStatus;

      if (billingType === 'PIX') {
        paymentsStatusMessage =
          `Cobrança criada e pronta para pagamento via Pix no ${chargeProviderLabel}. O pagamento ainda não foi confirmado — após pagar, aguarde ou clique em "Atualizar status".`;
      } else if (billingType === 'BOLETO') {
        paymentsStatusMessage =
          `Boleto criado e pronto para pagamento no ${chargeProviderLabel}. O pagamento ainda não foi confirmado — após pagar, clique em "Atualizar status" para consultar a compensação.`;
      } else {
        paymentsStatusMessage =
          `Cobrança criada e pronta para pagamento no ${chargeProviderLabel}. O pagamento ainda não foi confirmado — finalize no ambiente seguro do Asaas e clique em "Atualizar status".`;
      }

      if (activeOrderId && paymentsUiStatus === 'awaiting_confirmation') {
        startPaymentPollTimer(activeOrderId);
      }

      render();
      return;
    }

    if (outcome.reason === 'unauthenticated') {
      paymentsUiStatus = 'awaiting_selection';
      paymentsStatusMessage =
        `Entre na sua conta FerveC para vincular o pedido e gerar a cobrança no ${providerLabel}.`;
      render();
      openLoginModal(
        outcome.error || 'Entre na sua conta para iniciar o pagamento.'
      );
      return;
    }

    if (outcome.errorCode === 'CUSTOMER_CPF_REQUIRED') {
      paymentsUiStatus = 'awaiting_selection';
      paymentsStatusMessage =
        `Informe seu CPF válido na janela de identificação para gerar a cobrança no ${providerLabel}.`;
      render();
      openBillingCustomerModal(
        outcome.error ||
          `Por segurança (LGPD), informe seu CPF válido uma vez para cadastrar o comprador no ${providerLabel}.`,
        () => {
          void executePaymentsPageCheckout(method);
        }
      );
      return;
    }

    if (outcome.reason === 'unconfigured') {
      paymentsUiStatus = 'communication_error';
      paymentsStatusMessage =
        outcome.error ||
        'Integração Supabase / Asaas aguardando configuração de credenciais no servidor.';
      render();
      return;
    }

    paymentsUiStatus = outcome.reason === 'network_error' ? 'communication_error' : 'refused';
    paymentsStatusMessage =
      outcome.error || `Não foi possível concluir a solicitação de pagamento no ${providerLabel}.`;
    render();
  }

  async function copyPixPayload(): Promise<void> {
    const code = activePaymentCharge?.billingType === 'PIX' ? activePaymentCharge.pix?.payload : '';
    if (!code) {
      showToast('Clique em "Confirmar pagamento" para gerar seu código Pix Copia e Cola.');
      return;
    }

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(code);
      } else {
        const tmp = document.createElement('textarea');
        tmp.value = code;
        tmp.setAttribute('readonly', '');
        tmp.style.position = 'fixed';
        tmp.style.opacity = '0';
        document.body.appendChild(tmp);
        tmp.select();
        document.execCommand('copy');
        document.body.removeChild(tmp);
      }
      copiedPixCode = true;
      showToast('Código Pix copiado para a área de transferência!', 'success');
      if (copyPixResetTimer !== null) window.clearTimeout(copyPixResetTimer);
      copyPixResetTimer = window.setTimeout(() => {
        copiedPixCode = false;
        if (route === 'payments') render();
      }, 2500);
      render();
    } catch {
      showToast('Não foi possível copiar automaticamente. Selecione o código no campo acima.');
    }
  }

  function openLoginModal(subtitle?: string) {
    accountMenuOpen = false;
    const defaultEmail = userProfile?.email || '';
    if (PHASE_1_OFFLINE_ONLY || !SUPABASE_CONNECTED) {
      openModal(`<div class="modal-backdrop">
        <section class="modal" role="dialog" aria-modal="true" aria-labelledby="login-modal-title">
          <button class="modal-close" data-action="close-modal" aria-label="Fechar">×</button>
          <span class="eyebrow">MINHA CONTA · ARMAZENAMENTO LOCAL (FASE 1)</span>
          <h2 id="login-modal-title">Entrar na sua conta</h2>
          <p>${esc(subtitle || 'Informe o e-mail e a senha do seu cadastro único FerveC.')}</p>
          <form id="supabase-login-form" style="display:grid;gap:12px;margin-top:14px;">
            <div>
              <label for="login-email" style="display:block;font-size:13px;font-weight:600;margin-bottom:4px;">E-mail</label>
              <input id="login-email" name="email" type="email" required value="${esc(defaultEmail)}" placeholder="seu@email.com" style="width:100%;padding:10px 14px;border-radius:999px;border:1px solid #d4c4ac;background:#fff;" />
            </div>
            <div>
              <label for="login-password" style="display:block;font-size:13px;font-weight:600;margin-bottom:4px;">Senha</label>
              <input id="login-password" name="password" type="password" required placeholder="Sua senha" style="width:100%;padding:10px 14px;border-radius:999px;border:1px solid #d4c4ac;background:#fff;" />
            </div>
            <p data-login-error role="alert" style="display:none;margin:0;padding:10px 14px;border-radius:12px;background:#fff1f0;border:1px solid #e7b5b2;color:#8c1118;font-size:13px;font-weight:600;line-height:1.45;"></p>
            <div class="modal-buttons" style="margin-top:4px;justify-content:space-between;flex-wrap:wrap;gap:8px;">
              <button type="button" class="btn btn-outline-dark" data-action="create-profile">Criar cadastro</button>
              <div style="display:flex;gap:8px;">
                <button type="button" class="btn btn-outline-dark" data-action="close-modal">Cancelar</button>
                <button type="submit" class="btn btn-red" id="login-submit-btn">Entrar</button>
              </div>
            </div>
          </form>
        </section>
      </div>`);

      const loginForm = modal.querySelector<HTMLFormElement>('#supabase-login-form');
      const loginError = modal.querySelector<HTMLElement>('[data-login-error]');
      loginForm?.addEventListener('submit', async (ev) => {
        ev.preventDefault();
        const emailVal = loginForm.querySelector<HTMLInputElement>('#login-email')?.value.trim() || '';
        const passVal = loginForm.querySelector<HTMLInputElement>('#login-password')?.value || '';
        const authRes = await authenticateUnifiedProvisional(emailVal, passVal);
        if (!authRes.ok || !authRes.account) {
          if (loginError) {
            loginError.textContent = authRes.error || 'Não foi possível entrar.';
            loginError.style.display = 'block';
          }
          return;
        }
        const acc = authRes.account;
        const restoredProfile: StoredUserProfile = {
          id: acc.id,
          fullName: acc.fullName,
          cpfMasked: acc.cpfMasked,
          cpfHash: acc.cpfHash,
          birthDate: acc.birthDate,
          age: acc.age,
          email: acc.email,
          ddd: acc.ddd,
          phone: acc.phone,
          promoWhatsapp: acc.promoWhatsapp,
          promoEmail: acc.promoEmail,
          createdAt: acc.createdAt,
          authSource: 'local',
        };
        saveProfile(restoredProfile);
        userProfile = restoredProfile;
        profileDraft = createInitialProfileDraft(restoredProfile);
        syncProgressScope(restoredProfile);
        setPhase1AdminPreviewEnabled(acc.role === 'admin');
        closeModal();
        toast.success(
          `Bem-vindo(a) de volta, ${restoredProfile.fullName.split(' ')[0]}!`,
          'Conta local carregada neste navegador.'
        );
        void hydratePaymentsSummary(true);
        render();
      });
      return;
    }

    openModal(`<div class="modal-backdrop">
      <section class="modal" role="dialog" aria-modal="true" aria-labelledby="login-modal-title">
        <button class="modal-close" data-action="close-modal" aria-label="Fechar">×</button>
        <span class="eyebrow">MINHA CONTA · SUPABASE</span>
        <h2 id="login-modal-title">Entrar na sua conta</h2>
        <p>${esc(subtitle || 'Informe o e-mail e a senha cadastrados para sincronizar seu perfil.')}</p>
        <form id="supabase-login-form" style="display:grid;gap:12px;margin-top:14px;">
          <div>
            <label for="login-email" style="display:block;font-size:13px;font-weight:600;margin-bottom:4px;">E-mail</label>
            <input id="login-email" name="email" type="email" required value="${esc(defaultEmail)}" placeholder="seu@email.com" style="width:100%;padding:10px 14px;border-radius:999px;border:1px solid #d4c4ac;background:#fff;" />
          </div>
          <div>
            <label for="login-password" style="display:block;font-size:13px;font-weight:600;margin-bottom:4px;">Senha</label>
            <input id="login-password" name="password" type="password" required placeholder="Sua senha" style="width:100%;padding:10px 14px;border-radius:999px;border:1px solid #d4c4ac;background:#fff;" />
          </div>
          <p data-login-error role="alert" style="display:none;margin:0;padding:10px 14px;border-radius:12px;background:#fff1f0;border:1px solid #e7b5b2;color:#8c1118;font-size:13px;font-weight:600;line-height:1.45;"></p>
          <div data-email-confirm-box style="display:none;padding:12px 14px;border-radius:12px;background:#fff8eb;border:1px solid #e3c993;color:#3d2914;font-size:12.5px;line-height:1.45;">
            <p style="margin:0 0 8px 0;"><strong>Conta aguardando confirmação no Supabase:</strong> reenvie o e-mail de verificação ou confirme o usuário no painel do Supabase (<em>Authentication → Users</em>) e clique em <strong>Entrar</strong> novamente.</p>
            <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:8px;">
              <button type="button" class="btn btn-outline-dark" id="login-resend-confirm-btn" style="padding:7px 12px;font-size:12px;">Reenviar e-mail de confirmação</button>
            </div>
            <div style="display:flex;gap:8px;align-items:center;">
              <input id="login-otp-code" type="text" inputmode="numeric" maxlength="10" placeholder="Código do e-mail (opcional)" style="flex:1;padding:8px 12px;border-radius:999px;border:1px solid #d4c4ac;background:#fff;font-size:12.5px;" />
              <button type="button" class="btn btn-saffron" id="login-verify-otp-btn" style="padding:8px 12px;font-size:12px;">Confirmar código</button>
            </div>
            <p data-confirm-feedback style="display:none;margin:8px 0 0 0;font-weight:600;"></p>
          </div>
          <div class="modal-buttons" style="margin-top:4px;justify-content:space-between;flex-wrap:wrap;gap:8px;">
            <button type="button" class="btn btn-outline-dark" data-action="create-profile">Criar cadastro</button>
            <div style="display:flex;gap:8px;">
              <button type="button" class="btn btn-outline-dark" data-action="close-modal">Cancelar</button>
              <button type="submit" class="btn btn-red" id="login-submit-btn">Entrar</button>
            </div>
          </div>
        </form>
      </section>
    </div>`);
    const loginForm = modal.querySelector<HTMLFormElement>('#supabase-login-form');
    const loginError = modal.querySelector<HTMLElement>('[data-login-error]');
    const loginBtn = modal.querySelector<HTMLButtonElement>('#login-submit-btn');
    const confirmBox = modal.querySelector<HTMLElement>('[data-email-confirm-box]');
    const resendBtn = modal.querySelector<HTMLButtonElement>('#login-resend-confirm-btn');
    const verifyOtpBtn = modal.querySelector<HTMLButtonElement>('#login-verify-otp-btn');
    const otpInput = modal.querySelector<HTMLInputElement>('#login-otp-code');
    const confirmFeedback = modal.querySelector<HTMLElement>('[data-confirm-feedback]');

    function showLoginErr(msg: string, needsConfirm = false) {
      if (loginError) {
        loginError.textContent = msg;
        loginError.style.display = 'block';
      }
      if (confirmBox) {
        confirmBox.style.display = needsConfirm ? 'block' : 'none';
      }
    }

    function applyAuthenticatedLogin(profile: StoredUserProfile) {
      userProfile = profile;
      workspaceData = null;
      issuedCertificate = null;
      sessionBillingCustomer = null;
      paymentSummaryLoaded = false;
      syncProgressScope(profile);
      state.demo = true;
      persist();
      profileDraft = createInitialProfileDraft(profile);
      closeModal();
      toast.success(
        `Bem-vindo(a) de volta, ${profile.fullName.split(' ')[0]}!`,
        'Sua conta Supabase foi sincronizada neste navegador.'
      );
      render();
      void hydratePaymentsSummary(true);
      void hydrateAuthenticatedWorkspace().then(() => {
        if (pendingCertificateIssueAfterLogin) {
          pendingCertificateIssueAfterLogin = false;
          void handleGenerateCertificatePdf();
        }
      });
    }

    resendBtn?.addEventListener('click', async () => {
      const emailVal = loginForm?.querySelector<HTMLInputElement>('#login-email')?.value.trim() || '';
      if (!emailVal) return;
      resendBtn.disabled = true;
      resendBtn.textContent = 'Reenviando...';
      const resendRes = await resendSupabaseSignupConfirmation(emailVal);
      resendBtn.disabled = false;
      resendBtn.textContent = 'Reenviar e-mail de confirmação';
      if (confirmFeedback) {
        confirmFeedback.textContent = resendRes.message;
        confirmFeedback.style.color = resendRes.ok ? '#1f6b3b' : '#8c1118';
        confirmFeedback.style.display = 'block';
      }
    });

    verifyOtpBtn?.addEventListener('click', async () => {
      const emailVal = loginForm?.querySelector<HTMLInputElement>('#login-email')?.value.trim() || '';
      const codeVal = otpInput?.value.trim() || '';
      if (!emailVal || !codeVal) {
        if (confirmFeedback) {
          confirmFeedback.textContent = 'Digite o código enviado para o seu e-mail.';
          confirmFeedback.style.color = '#8c1118';
          confirmFeedback.style.display = 'block';
        }
        return;
      }
      verifyOtpBtn.disabled = true;
      verifyOtpBtn.textContent = 'Validando...';
      const verifyRes = await verifySupabaseSignupCode(emailVal, codeVal, userProfile);
      if (!verifyRes.ok || !verifyRes.profile) {
        verifyOtpBtn.disabled = false;
        verifyOtpBtn.textContent = 'Confirmar código';
        if (confirmFeedback) {
          confirmFeedback.textContent = verifyRes.message || 'Código inválido ou expirado.';
          confirmFeedback.style.color = '#8c1118';
          confirmFeedback.style.display = 'block';
        }
        return;
      }
      applyAuthenticatedLogin(verifyRes.profile);
    });

    loginForm?.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const emailInput = loginForm.querySelector<HTMLInputElement>('#login-email');
      const passwordInput = loginForm.querySelector<HTMLInputElement>('#login-password');
      const emailVal = emailInput?.value.trim() || '';
      const passVal = passwordInput?.value || '';
      if (!emailVal || !passVal) return;
      if (loginBtn) {
        loginBtn.disabled = true;
        loginBtn.textContent = 'Entrando...';
      }
      if (loginError) {
        loginError.textContent = '';
        loginError.style.display = 'none';
      }
      const res = await signInSupabaseAccount(emailVal, passVal, userProfile);
      if (!res.ok || !res.profile) {
        if (loginBtn) {
          loginBtn.disabled = false;
          loginBtn.textContent = 'Entrar';
        }
        showLoginErr(res.message || 'Não foi possível entrar.', Boolean(res.needsEmailConfirmation));
        return;
      }
      applyAuthenticatedLogin(res.profile);
    });
  }

  function upsertWorkspaceCertificate(
    cert: ServerCertificateRecord,
    serverList?: ServerCertificateRecord[]
  ) {
    if (!cert.courseSlug || cert.courseSlug === 'massas-italianas') {
      issuedCertificate = cert;
    }
    if (!workspaceData) return;
    if (!cert.courseSlug || cert.courseSlug === 'massas-italianas') {
      workspaceData.certificate = cert;
      if (!workspaceData.completionDate && cert.completionDate) {
        workspaceData.completionDate = cert.completionDate;
      }
    }
    workspaceData.eligibleForCertificate = true;
    if (Array.isArray(serverList) && serverList.length > 0) {
      workspaceData.certificates = serverList;
      return;
    }
    const prevList = Array.isArray(workspaceData.certificates)
      ? workspaceData.certificates.slice()
      : [];
    const existingIdx = prevList.findIndex(
      (c) => c.certificate_code === cert.certificate_code || c.course_id === cert.course_id
    );
    if (existingIdx >= 0) {
      prevList[existingIdx] = cert;
    } else {
      prevList.unshift(cert);
    }
    workspaceData.certificates = prevList;
  }

  function triggerBlobDownload(blob: Blob, filename: string) {
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(blobUrl), 1500);
  }

  async function handleViewCertificatePdf(certificateCode: string) {
    if (!certificateCode || rowPdfBusyCode) return;
    rowPdfBusyCode = certificateCode;
    render();
    const pdfRes = await downloadCertificatePdfBlob(certificateCode);
    rowPdfBusyCode = null;
    render();

    if (!pdfRes.ok || !pdfRes.blob) {
      toast.error(
        'Não foi possível abrir o PDF',
        pdfRes.error || 'Verifique sua sessão e tente novamente.'
      );
      return;
    }

    if (activePdfPreviewUrl) {
      URL.revokeObjectURL(activePdfPreviewUrl);
    }
    const blobUrl = URL.createObjectURL(pdfRes.blob);
    activePdfPreviewUrl = blobUrl;
    const filename = pdfRes.filename || `certificado-fervec-${certificateCode}.pdf`;
    openModal(`<div class="modal-backdrop">
      <section class="modal cert-pdf-modal" role="dialog" aria-modal="true" aria-labelledby="cert-pdf-modal-title">
        <button class="modal-close" data-action="close-modal" aria-label="Fechar">×</button>
        <span class="eyebrow">CERTIFICADO OFICIAL · ${esc(certificateCode)}</span>
        <h2 id="cert-pdf-modal-title">Visualização do Certificado em PDF</h2>
        <div class="cert-pdf-frame-wrap">
          <iframe class="cert-pdf-frame" src="${esc(blobUrl)}" title="Certificado ${esc(certificateCode)}"></iframe>
        </div>
        <div class="modal-buttons">
          <a class="btn btn-red" href="${esc(blobUrl)}" download="${esc(filename)}">↓ Baixar PDF</a>
          <button type="button" class="btn btn-outline-dark" data-action="close-modal">Fechar</button>
        </div>
      </section>
    </div>`);
  }

  async function handleDownloadCertificatePdf(certificateCode: string) {
    if (!certificateCode || rowPdfBusyCode) return;
    rowPdfBusyCode = certificateCode;
    render();
    const pdfRes = await downloadCertificatePdfBlob(certificateCode);
    rowPdfBusyCode = null;
    render();

    if (!pdfRes.ok || !pdfRes.blob) {
      toast.error(
        'Não foi possível baixar o PDF',
        pdfRes.error || 'Tente novamente em instantes.'
      );
      return;
    }

    triggerBlobDownload(
      pdfRes.blob,
      pdfRes.filename || `certificado-fervec-${certificateCode}.pdf`
    );
    toast.success('Download do certificado iniciado!', `Código ${certificateCode}`);
  }

  async function handleGenerateCertificatePdf() {
    if (certPdfBusy) return;
    closeModal();

    if (PHASE_1_OFFLINE_ONLY || !SUPABASE_CONNECTED) {
      pendingCertificateIssueAfterLogin = false;
      showModal(
        'Emissão oficial disponível na Fase 2 (Supabase)',
        'Nesta Fase 1 (sem conexão ao Supabase), o progresso e a elegibilidade do certificado funcionam localmente para avaliação. A geração oficial com assinatura em banco de dados e PDF no servidor será ativada na Fase 2.'
      );
      return;
    }

    await initSupabaseRuntimeConfig();

    if (!isSupabaseConfigured()) {
      pendingCertificateIssueAfterLogin = false;
      showModal(
        'Banco de dados Supabase não configurado neste servidor',
        'Para autenticar sua conta (inclusive a conta administrativa) e emitir o certificado oficial em PDF direto do banco de dados, configure VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY nas variáveis de ambiente / Secrets do projeto.'
      );
      return;
    }

    if (userProfile?.authSource !== 'supabase') {
      const activeProfile = await fetchCurrentSupabaseProfile(userProfile);
      if (activeProfile) {
        userProfile = activeProfile;
        syncProgressScope(activeProfile);
        profileDraft = createInitialProfileDraft(activeProfile);
        render();
      } else {
        pendingCertificateIssueAfterLogin = true;
        openLoginModal(
          'Entre com o e-mail e a senha da sua conta cadastrada para validar suas permissões, carregar seu nome/CPF do banco de dados e gerar o certificado em PDF.'
        );
        return;
      }
    }

    pendingCertificateIssueAfterLogin = false;
    certPdfBusy = true;
    render();

    try {
      if (!workspaceData) {
        await hydrateAuthenticatedWorkspace();
      } else if (!workspaceData.eligibleForCertificate && !workspaceData.permissions?.canBypassExamForCertificates) {
        const synced = await syncPendingPassedActivitiesIfNeeded(workspaceData);
        if (synced) {
          await hydrateAuthenticatedWorkspace();
        }
      }

      const isDevAdmin = Boolean(workspaceData?.permissions?.canBypassExamForCertificates);
      const targetCourseSlug = isDevAdmin
        ? selectedDevCertCourseSlug || workspaceData?.course?.slug || 'massas-italianas'
        : 'massas-italianas';

      const issueRes = await issueOrFetchCertificate(targetCourseSlug);
      if (!issueRes.ok || !issueRes.certificate) {
        if (issueRes.status === 401) {
          if (userProfile) {
            userProfile = { ...userProfile, authSource: 'local' };
            saveProfile(userProfile);
          }
          pendingCertificateIssueAfterLogin = true;
          openLoginModal(
            'Sua sessão precisa ser autenticada neste navegador. Entre com seu e-mail e senha para emitir o certificado.'
          );
          return;
        }
        const errTitle =
          issueRes.status >= 500
            ? 'Erro ao registrar certificado no Supabase'
            : 'Certificado ainda não liberado';
        const errBody =
          issueRes.error ||
          'Conclua o módulo e atinja pelo menos 70% na avaliação para liberar o PDF.';
        toast.warning(errTitle, errBody);
        showModal(errTitle, errBody);
        return;
      }

      upsertWorkspaceCertificate(issueRes.certificate, issueRes.certificates);
      render();

      const pdfRes = await downloadCertificatePdfBlob(issueRes.certificate.certificate_code);

      if (!workspaceData) {
        void hydrateAuthenticatedWorkspace();
      }

      if (!pdfRes.ok || !pdfRes.blob) {
        const pdfErr = pdfRes.error || 'Tente novamente em instantes.';
        toast.error('Não foi possível baixar o PDF', pdfErr);
        showModal('Não foi possível baixar o PDF', pdfErr);
        return;
      }

      triggerBlobDownload(
        pdfRes.blob,
        pdfRes.filename || `certificado-fervec-${issueRes.certificate.certificate_code}.pdf`
      );

      toast.success(
        issueRes.alreadyIssued ? '2ª via do certificado gerada!' : 'Certificado em PDF gerado!',
        `Código ${issueRes.certificate.certificate_code} · Página e registro atualizados.`
      );
    } finally {
      certPdfBusy = false;
      render();
    }
  }

  function nextLesson() {
    if (
      lessonStage > 0 &&
      state.done.indexOf(lessonStage - 1) < 0 &&
      state.done.indexOf(lessonStage) < 0
    ) {
      showModal(
        'Vamos uma etapa de cada vez.',
        'Conclua a etapa anterior antes de marcar esta como pronta. Você pode consultar qualquer explicação, mas o progresso da aula segue em ordem.'
      );
      return;
    }
    const alreadyDone = state.done.indexOf(lessonStage) >= 0;
    if (!alreadyDone) state.done.push(lessonStage);
    state.stage = lessonStage;
    persist();
    if (lessonStage === stages.length - 1) {
      state.lessonFinished = true;
      persist();
      syncCarbonaraProgressAsync();
      render();
      openCompletion();
    } else {
      lessonStage++;
      state.stage = lessonStage;
      const ing = getIngredientsForModuleStage('carbonara', lessonStage);
      selectedIngredientId = ing[0]?.id || 'spaghetti';
      persist();
      syncCarbonaraProgressAsync();
      showToast(alreadyDone ? `Avançando para a etapa ${lessonStage + 1}.` : `Etapa ${lessonStage} concluída!`);
      render();
    }
  }

  function answerLearning(choice: number) {
    if (state.questionsAnswers[qIndex] !== undefined) return;
    state.questionsAnswers[qIndex] = choice;
    state.demo = true;
    persist();
    render();
  }

  function nextLearning() {
    if (qIndex < questions.length - 1) {
      qIndex++;
      persist();
      render();
      return;
    }
    const cleanAnswers = state.questionsAnswers.slice();
    const versioned = buildVersionedAttemptPayload('carbonara', 'work', cleanAnswers);
    state.questionAttempts.push({
      score: versioned.graded.score,
      answers: versioned.graded.answers,
      date: new Date().toISOString(),
      bankVersion: versioned.bankVersion,
      questionIds: versioned.questionIds,
      selectedOptionIds: versioned.selectedOptionIds,
      questionSnapshots: versioned.questionSnapshots,
    });
    state.questionsFinished = true;
    state.demo = true;
    persist();
    if (userProfile?.authSource === 'supabase') {
      void submitAssessmentToServer({
        moduleKey: 'carbonara',
        attemptType: 'work',
        answers: versioned.graded.answers,
        bankVersion: versioned.bankVersion,
        questionIds: versioned.questionIds,
        selectedOptionIds: versioned.selectedOptionIds,
      });
    }
    render();
  }

  function beginExam() {
    state.demo = true;
    state.examAnswers = Array(exam.length).fill(null);
    state.examCurrent = 0;
    state.examReview = false;
    examStatus = 'question';
    persist();
    route = 'exam';
    render();
  }

  function confirmExam() {
    if (state.examAnswers.some((x) => x == null)) {
      showModal(
        'Faltou uma resposta',
        'Volte e escolha uma alternativa para cada pergunta antes de enviar.'
      );
      return;
    }
    openModal(`<div class="modal-backdrop">
      <section class="modal" role="dialog" aria-modal="true">
        <button class="modal-close" data-action="close-modal" aria-label="Fechar">×</button>
        <span class="eyebrow">CONFIRMAÇÃO</span>
        <h2>Enviar sua avaliação?</h2>
        <p>Depois do envio, mostramos seu resultado e as explicações.</p>
        <div class="modal-buttons">
          <button class="btn btn-outline-dark" data-action="close-modal">Ainda não</button>
          <button class="btn btn-red" data-action="confirm-submit">Confirmar envio</button>
        </div>
      </section>
    </div>`);
  }

  async function submitExam() {
    if (examSubmitting) return;
    const answers = state.examAnswers.map((v) => (typeof v === 'number' ? v : 0));

    if (userProfile?.authSource === 'supabase') {
      examSubmitting = true;
      await syncModuleProgressToServer({
        moduleKey: 'carbonara',
        currentStage: lessonStage,
        doneSteps: state.done,
        miseChecks: state.miseChecks,
        reviewDone: Boolean(state.reviewDone),
        lessonFinished: Boolean(state.lessonFinished),
        workFinished: Boolean(state.questionsFinished),
        lastModuleKey: 'carbonara',
      });

      const localVersioned = buildVersionedAttemptPayload('carbonara', 'exam', answers);
      const res = await submitAssessmentToServer({
        moduleKey: 'carbonara',
        attemptType: 'exam',
        answers,
        bankVersion: localVersioned.bankVersion,
        questionIds: localVersioned.questionIds,
        selectedOptionIds: localVersioned.selectedOptionIds,
      });
      examSubmitting = false;

      if (!res.ok) {
        toast.error(
          'Não foi possível enviar a avaliação',
          res.error || 'Verifique sua conexão ou sua sessão e tente novamente.'
        );
        render();
        return;
      }

      const score = res.score ?? localVersioned.graded.score;
      const passed = Boolean(res.passed);
      state.examAttempts.push({
        score,
        passed,
        answers,
        date: res.attempt?.attempted_at || new Date().toISOString(),
        bankVersion: res.bankVersion || localVersioned.bankVersion,
        questionIds: res.questionIds || localVersioned.questionIds,
        selectedOptionIds: res.selectedOptionIds || localVersioned.selectedOptionIds,
        questionSnapshots: res.questionSnapshots || localVersioned.questionSnapshots,
      });
      if (res.certificate) {
        upsertWorkspaceCertificate(res.certificate, res.certificates);
      }
      if (passed) {
        toast.success(
          'Prova aprovada e certificado liberado!',
          `Você alcançou ${score}%. Seu certificado oficial já está disponível na aba Certificados.`
        );
      } else {
        toast.warning(
          `Resultado: ${score}% — tente novamente`,
          `É necessário atingir pelo menos ${PASSING_SCORE_PERCENT}% para liberar o certificado.`
        );
      }
    } else {
      const versioned = buildVersionedAttemptPayload('carbonara', 'exam', answers);
      const score = versioned.graded.score;
      state.examAttempts.push({
        score,
        passed: versioned.graded.passed,
        answers: versioned.graded.answers,
        date: new Date().toISOString(),
        bankVersion: versioned.bankVersion,
        questionIds: versioned.questionIds,
        selectedOptionIds: versioned.selectedOptionIds,
        questionSnapshots: versioned.questionSnapshots,
      });
      toast.info(
        versioned.graded.passed
          ? `Prévia aprovada (${score}%)`
          : `Prévia: ${score}% (mínimo ${PASSING_SCORE_PERCENT}%)`,
        'Entre na sua conta para registrar a prova oficialmente e emitir o certificado em PDF.'
      );
    }

    state.examAnswers = [];
    state.examCurrent = 0;
    state.examReview = false;
    examStatus = 'result';
    persist();
    render();
  }

  function bind() {
    app.querySelectorAll<HTMLInputElement>('[data-micro]').forEach((el) =>
      el.addEventListener('change', () => {
        setMicroDone(lessonStage, +(el.dataset.micro || 0), el.checked);
      })
    );
    app.querySelectorAll<HTMLInputElement>('[data-recipe-micro]').forEach((el) =>
      el.addEventListener('change', () => {
        const key = el.dataset.recipeMicro;
        if (key) recipeMicroDone[key] = el.checked;
      })
    );
    app.querySelectorAll<HTMLInputElement>('[data-mise]').forEach((el) =>
      el.addEventListener('change', () => {
        const n = +(el.dataset.mise || 0);
        state.miseChecks = el.checked
          ? Array.from(new Set(state.miseChecks.concat([n])))
          : state.miseChecks.filter((x) => x !== n);
        persist();
      })
    );
    app.querySelectorAll<HTMLInputElement>('[data-timer-input]').forEach((el) =>
      el.addEventListener('input', () => {
        timerValue = 0;
        const d = $('[data-timer]');
        if (d) d.textContent = formatTime(0);
      })
    );
    app.querySelectorAll<HTMLInputElement>('[data-audio-volume]').forEach((el) =>
      el.addEventListener('input', () => {
        state.voiceVolume = Number(el.value);
        setChefVolume(state.voiceVolume);
        const label = el.parentElement?.querySelector('[data-volume-value]');
        if (label) label.textContent = `${Math.round(state.voiceVolume * 100)}%`;
        persist();
      })
    );

    const profileForm = $<HTMLFormElement>('#cadastro-profile-form');
    if (profileForm) {
      const clearInlineError = (field: keyof ProfileFormValues) => {
        if (profileErrors[field]) {
          delete profileErrors[field];
          const errEl = profileForm.querySelector<HTMLElement>(`[data-error-for="${field}"]`);
          if (errEl) {
            errEl.textContent = '';
            errEl.classList.remove('is-visible');
          }
          if (field === 'age' || field === 'ddd' || field === 'phone') {
            const splitErr = profileForm.querySelector<HTMLElement>('[data-error-split]');
            const nextSplit = profileErrors.age || profileErrors.ddd || profileErrors.phone || '';
            if (splitErr) {
              splitErr.textContent = nextSplit;
              splitErr.classList.toggle('is-visible', Boolean(nextSplit));
            }
          }
          const inputEl = profileForm.querySelector<HTMLElement>(`[name="${field}"]`);
          inputEl?.closest('.cadastro-pill')?.classList.remove('has-error');
          if (field === 'acceptTerms') {
            inputEl?.setAttribute('aria-invalid', 'false');
            inputEl?.closest('.cadastro-consent-col')?.classList.remove('has-error');
          }
        }
      };

      profileForm.addEventListener('input', (ev) => {
        const target = ev.target as HTMLInputElement | HTMLSelectElement | null;
        if (!target || !target.name) return;
        const name = target.name as keyof ProfileFormValues;

        if (name === 'cpf') {
          const formatted = formatCpf(target.value);
          target.value = formatted;
          profileDraft.cpf = formatted;
          clearInlineError('cpf');
        } else if (name === 'birthDate') {
          const formatted = formatBirthDate(target.value);
          target.value = formatted;
          profileDraft.birthDate = formatted;
          clearInlineError('birthDate');
          const computed = calculateAge(formatted);
          if (computed !== null && computed >= 13 && computed <= 100) {
            profileDraft.age = String(computed);
            const ageSelect = $<HTMLSelectElement>('#cadastro-age');
            if (ageSelect) {
              ageSelect.value = String(computed);
              ageSelect.closest('.cadastro-pill')?.classList.remove('has-error');
            }
            delete profileErrors.age;
          }
        } else if (name === 'ddd') {
          const formatted = formatDdd(target.value);
          target.value = formatted;
          profileDraft.ddd = formatted;
          clearInlineError('ddd');
          clearInlineError('phone');
        } else if (name === 'phone') {
          const formatted = formatPhone(target.value);
          target.value = formatted;
          profileDraft.phone = formatted;
          clearInlineError('phone');
        } else if (name === 'fullName') {
          profileDraft.fullName = target.value;
          clearInlineError('fullName');
        } else if (name === 'email') {
          profileDraft.email = target.value;
          clearInlineError('email');
        } else if (name === 'password') {
          profileDraft.password = target.value;
          clearInlineError('password');
        } else if (name === 'confirmPassword') {
          profileDraft.confirmPassword = target.value;
          clearInlineError('confirmPassword');
        }
      });

      profileForm.addEventListener('change', (ev) => {
        const target = ev.target as HTMLInputElement | HTMLSelectElement | null;
        if (!target) return;
        if (target.id === 'cadastro-native-date' && target.value) {
          const parts = target.value.split('-');
          if (parts.length === 3) {
            const brDate = `${parts[2]}/${parts[1]}/${parts[0]}`;
            profileDraft.birthDate = brDate;
            const birthInput = $<HTMLInputElement>('#cadastro-birthdate');
            if (birthInput) {
              birthInput.value = brDate;
              birthInput.closest('.cadastro-pill')?.classList.remove('has-error');
            }
            delete profileErrors.birthDate;
            const computed = calculateAge(brDate);
            if (computed !== null && computed >= 13 && computed <= 100) {
              profileDraft.age = String(computed);
              const ageSelect = $<HTMLSelectElement>('#cadastro-age');
              if (ageSelect) ageSelect.value = String(computed);
              delete profileErrors.age;
            }
          }
          return;
        }
        const name = target.name as keyof ProfileFormValues;
        if (name === 'age') {
          profileDraft.age = target.value;
          clearInlineError('age');
        } else if (name === 'acceptTerms' && target instanceof HTMLInputElement) {
          profileDraft.acceptTerms = target.checked;
          clearInlineError('acceptTerms');
        } else if (name === 'promoWhatsapp' && target instanceof HTMLInputElement) {
          profileDraft.promoWhatsapp = target.checked;
        } else if (name === 'promoEmail' && target instanceof HTMLInputElement) {
          profileDraft.promoEmail = target.checked;
        }
      });

      profileForm.addEventListener('submit', async (ev) => {
        ev.preventDefault();
        if (profileSubmitting) return;
        const termsCheckbox = profileForm.querySelector<HTMLInputElement>('#cadastro-terms');
        if (termsCheckbox) {
          profileDraft.acceptTerms = termsCheckbox.checked;
        }
        const hadExistingProfile = Boolean(userProfile);
        const nextErrors = validateProfileForm(profileDraft);
        profileErrors = nextErrors;
        if (Object.keys(nextErrors).length > 0) {
          render();
          if (nextErrors.acceptTerms && Object.keys(nextErrors).length === 1) {
            toast.warning(
              'Aceite obrigatório dos Termos',
              'Marque "Concordo com os Termos de Condições e Política de Privacidade" para concluir o cadastro.'
            );
          } else {
            toast.warning(
              'Revise os campos obrigatórios',
              'Preencha e corrija os campos destacados antes de concluir o cadastro.'
            );
          }
          const firstInvalid = app.querySelector<HTMLElement>(
            '.cadastro-pill.has-error input, .cadastro-pill.has-error select, .cadastro-consent-col.has-error #cadastro-terms, #cadastro-terms'
          );
          firstInvalid?.focus();
          return;
        }

        profileSubmitting = true;
        render();

        if (PHASE_1_OFFLINE_ONLY || !SUPABASE_CONNECTED) {
          const localProfile: StoredUserProfile = {
            ...createStoredProfile(profileDraft),
            ...(userProfile?.id ? { id: userProfile.id } : {}),
            authSource: 'local',
          };
          saveProfile(localProfile);
          const unified = await upsertUnifiedAccountFromProfile(localProfile, profileDraft.password);
          profileSubmitting = false;

          userProfile = localProfile;
          syncProgressScope(localProfile);
          setPhase1AdminPreviewEnabled(unified.role === 'admin');
          state.demo = true;
          persist();
          profileJustCreated = true;
          profileErrors = {};
          profileDraft = createInitialProfileDraft(localProfile);
          const firstName = localProfile.fullName.split(' ')[0] || 'Chef';
          toast.success(
            hadExistingProfile ? 'Perfil atualizado com sucesso!' : 'Cadastro realizado com sucesso!',
            `Bem-vindo(a), ${firstName}! Seu cadastro único foi salvo localmente para a Fase 1. A Biblioteca Interativa será liberada após aquisição do curso em Pagamentos.`
          );
          render();
          window.scrollTo({ top: 0, behavior: 'smooth' });
          return;
        }

        const syncResult = await registerOrUpdateSupabaseProfile(profileDraft, userProfile);
        profileSubmitting = false;

        if (!syncResult.ok || !syncResult.profile) {
          if (syncResult.fieldError) {
            profileErrors = {
              ...profileErrors,
              [syncResult.fieldError.field]: syncResult.fieldError.message,
            };
          }
          render();
          toast.error(
            'Não foi possível concluir o cadastro',
            syncResult.message || 'Verifique os dados informados e tente novamente.'
          );
          return;
        }

        userProfile = syncResult.profile;
        syncProgressScope(syncResult.profile);
        state.demo = true;
        persist();
        profileJustCreated = true;
        profileErrors = {};
        profileDraft = createInitialProfileDraft(syncResult.profile);
        const firstName = syncResult.profile.fullName.split(' ')[0] || 'Chef';
        if (syncResult.syncedToSupabase) {
          toast.success(
            hadExistingProfile ? 'Perfil atualizado com sucesso!' : 'Cadastro realizado com sucesso!',
            `Bem-vindo(a), ${firstName}! Seus dados foram salvos no Supabase${
              syncResult.emailConfirmed === false
                ? ' — verifique seu e-mail caso a confirmação esteja ativa.'
                : ' e vinculados à sua conta.'
            }`
          );
          void hydrateAuthenticatedWorkspace();
        } else {
          toast.success(
            hadExistingProfile ? 'Perfil atualizado!' : 'Perfil criado com sucesso!',
            syncResult.message ||
              `Bem-vindo(a), ${firstName}! Seu perfil foi salvo localmente neste navegador.`
          );
        }
        render();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }

    const couponForm = $<HTMLFormElement>('#admin-coupon-form');
    if (couponForm) {
      couponForm.addEventListener('submit', (ev) => {
        ev.preventDefault();
        const codeEl = couponForm.querySelector<HTMLInputElement>('[name="code"]');
        const discountEl = couponForm.querySelector<HTMLSelectElement>('[name="discountPercent"]');
        const validityEl = couponForm.querySelector<HTMLSelectElement>('[name="validityDays"]');
        const maxUsesEl = couponForm.querySelector<HTMLInputElement>('[name="maxUses"]');
        const scopeEl = couponForm.querySelector<HTMLSelectElement>('[name="courseScope"]');

        const created = createProvisionalCoupon({
          code: codeEl?.value || adminCouponDraft.code,
          discountPercent: Number(discountEl?.value || adminCouponDraft.discountPercent),
          validityDays: Number(validityEl?.value || adminCouponDraft.validityDays),
          maxUses: Number(maxUsesEl?.value || adminCouponDraft.maxUses),
          courseScope: scopeEl?.value || adminCouponDraft.courseScope,
        });
        adminCouponDraft = {
          ...adminCouponDraft,
          code: generateUniqueSixDigitCode(listProvisionalCoupons().map((c) => c.code)),
        };
        toast.success(
          `Cupom ${created.code} gerado!`,
          `${created.discountPercent}% de desconto · válido por ${created.validityDays} dia(s) · até ${created.maxUses} uso(s).`
        );
        render();
      });
    }

    const voiceForm = $<HTMLFormElement>('#admin-voice-form');
    if (voiceForm) {
      voiceForm.addEventListener('input', (ev) => {
        const rateEl = voiceForm.querySelector<HTMLInputElement>('#admin-voice-rate');
        const pitchEl = voiceForm.querySelector<HTMLInputElement>('#admin-voice-pitch');
        const volEl = voiceForm.querySelector<HTMLInputElement>('#admin-voice-volume');
        const selectEl = voiceForm.querySelector<HTMLSelectElement>('#admin-voice-select');
        const phraseEl = voiceForm.querySelector<HTMLTextAreaElement>('#admin-voice-test-phrase');

        if (selectEl && ev.target === selectEl) {
          adminVoiceConfig.voiceUri = selectEl.value;
          const preset = getChefMaleVoicePreset(selectEl.value);
          adminVoiceConfig.voiceName = preset.name;
          adminVoiceConfig.profileLabel = preset.profileLabel;
          adminVoiceConfig.rate = preset.defaultRate;
          adminVoiceConfig.pitch = preset.defaultPitch;
          if (rateEl) {
            rateEl.value = preset.defaultRate.toFixed(2);
            const lbl = voiceForm.querySelector<HTMLElement>('[data-voice-rate-val]');
            if (lbl) lbl.textContent = `${preset.defaultRate.toFixed(2)}x`;
          }
          if (pitchEl) {
            pitchEl.value = preset.defaultPitch.toFixed(2);
            const lbl = voiceForm.querySelector<HTMLElement>('[data-voice-pitch-val]');
            if (lbl) lbl.textContent = preset.defaultPitch.toFixed(2);
          }
        } else {
          if (rateEl) {
            adminVoiceConfig.rate = Number(rateEl.value);
            const lbl = voiceForm.querySelector<HTMLElement>('[data-voice-rate-val]');
            if (lbl) lbl.textContent = `${adminVoiceConfig.rate.toFixed(2)}x`;
          }
          if (pitchEl) {
            adminVoiceConfig.pitch = Number(pitchEl.value);
            const lbl = voiceForm.querySelector<HTMLElement>('[data-voice-pitch-val]');
            if (lbl) lbl.textContent = adminVoiceConfig.pitch.toFixed(2);
          }
          if (selectEl) {
            adminVoiceConfig.voiceUri = selectEl.value;
            const preset = getChefMaleVoicePreset(selectEl.value);
            adminVoiceConfig.voiceName = preset.name;
            adminVoiceConfig.profileLabel = preset.profileLabel;
          }
        }
        if (volEl) {
          adminVoiceConfig.volume = Number(volEl.value);
          const lbl = voiceForm.querySelector<HTMLElement>('[data-voice-vol-val]');
          if (lbl) lbl.textContent = `${Math.round(adminVoiceConfig.volume * 100)}%`;
        }
        if (phraseEl) {
          adminVoiceTestPhrase = phraseEl.value;
        }
      });

      voiceForm.addEventListener('submit', (ev) => {
        ev.preventDefault();
        adminVoiceConfig = saveChefVoiceConfig(adminVoiceConfig);
        state.voiceVolume = adminVoiceConfig.volume;
        persist();
        adminVoiceStatusLabel = 'Padrão Chef Educador salvo (Site + Biblioteca)';
        toast.success(
          'Configuração de voz salva!',
          'Aplicada imediatamente nas aulas do site e na Biblioteca Interativa.'
        );
        render();
      });
    }
  }

  function render() {
    stopTimerOnRouteChange();
    if (route !== 'payments') {
      stopPaymentPollTimer();
    }
    if ((route === 'payments' || route === 'sales' || route === 'home') && !paymentSummaryLoaded) {
      void hydratePaymentsSummary();
    }
    document.body.classList.toggle('has-demo-nav', !!state.demo);
    document.body.classList.toggle('is-wine-route', route === 'wine' || route === 'category-vinicola');
    const pages: Record<string, () => string> = {
      home,
      sales: salesPage,
      chef: chefPage,
      categories: futureCategoryPage,
      wine: winePage,
      'category-brasileira': futureCategoryPage,
      'category-japonesa': futureCategoryPage,
      'category-espanhola': futureCategoryPage,
      'category-francesa': futureCategoryPage,
      'category-internacional': futureCategoryPage,
      'category-vinicola': futureCategoryPage,
      courses: coursePage,
      course: coursePage,
      lesson,
      'carbonara-cert': carbonaraCertPage,
      recipe: recipePage,
      recipeReview: recipeReviewPage,
      questions: questionView,
      review,
      exam: examPage,
      certificate,
      payments: () =>
        renderPaymentsPage({
          summary: paymentSummary,
          heroBannerSrc: MEDIA.paymentsChefBanner,
          courseThumbSrc: MEDIA.pastaCarbonaraHero,
          selectedMethod: selectedPaymentMethod,
          cardMode: selectedCardMode,
          cardHolderName: cardHolderNameInput,
          cardInstallments: cardInstallmentsInput,
          uiStatus: paymentCheckoutState.isProcessing
            ? paymentsUiStatus === 'generating_charge'
              ? 'generating_charge'
              : 'processing_payment'
            : paymentsUiStatus,
          statusMessage: paymentsStatusMessage,
          isProcessing: paymentCheckoutState.isProcessing,
          copiedPix: copiedPixCode,
          activeOrderId,
          activePayment: activePaymentCharge,
          couponCodeInput: paymentCouponInput,
          appliedCoupon: appliedPaymentCoupon,
          couponFeedback: paymentCouponFeedback,
          isPhase1Offline: PHASE_1_OFFLINE_ONLY || !SUPABASE_CONNECTED,
        }),
      memorial: memorialPage,
      progress: progressPage,
      account: accountPage,
      admin: adminPage,
      'create-profile': () =>
        renderCreateProfilePage({
          draft: profileDraft,
          errors: profileErrors,
          showPassword: profileShowPassword,
          showConfirmPassword: profileShowConfirm,
          savedProfile: userProfile,
          justCreated: profileJustCreated,
          isSubmitting: profileSubmitting,
          supabaseConfigured: !PHASE_1_OFFLINE_ONLY && SUPABASE_CONNECTED && isSupabaseConfigured(),
        }),
      help: helpPage,
    };
    const topbar =
      route === 'home'
        ? ''
        : route === 'wine' || route === 'category-vinicola'
          ? wineHeader()
          : header();
    const viewFn = pages[route] || home;
    if (adminAuditRoot) {
      adminAuditRoot.unmount();
      adminAuditRoot = null;
    }

    try {
      const renderedView = viewFn();
      app.innerHTML = topbar + renderedView;
    } catch (renderErr) {
      reportAppError(renderErr, {
        source: 'checkout-render',
        route,
        boundaryName: route === 'payments' ? 'PaymentsCheckoutRender' : 'AppRouteRender',
        metadata: {
          hasActivePayment: Boolean(activePaymentCharge),
          activeOrderId,
          paymentsUiStatus,
        },
      });
      const fallbackInvoiceCta =
        route === 'payments' && activePaymentCharge?.invoiceUrl
          ? `<p class="mt-3"><a class="payments-invoice-btn" href="${esc(activePaymentCharge.invoiceUrl)}" target="_blank" rel="noopener noreferrer">CLIQUE AQUI PARA ABRIR O AMBIENTE SEGURO DE COBRANÇA</a></p>`
          : '';
      app.innerHTML =
        topbar +
        `<main class="mx-auto my-8 max-w-xl rounded-2xl border border-amber-300 bg-amber-50 p-6 text-stone-900 shadow-md" role="alert">
          <h2 class="mb-2 text-lg font-bold text-red-900">Não foi possível exibir esta tela completamente</h2>
          <p class="mb-4 text-sm text-stone-700">A falha foi registrada automaticamente para diagnóstico. Você pode continuar ou tentar atualizar abaixo.</p>
          ${fallbackInvoiceCta}
          <button type="button" class="btn btn-red" data-action="${route === 'payments' ? 'payments' : 'home'}">Tentar novamente</button>
        </main>`;
    }

    try {
      bind();
    } catch (bindErr) {
      reportAppError(bindErr, {
        source: 'checkout-render',
        route,
        boundaryName: 'AppRouteBind',
        metadata: { phase: 'bind' },
      });
    }

    const auditMountEl = app.querySelector<HTMLElement>('#admin-asaas-audit-mount');
    if (auditMountEl) {
      try {
        adminAuditRoot = createRoot(auditMountEl);
        adminAuditRoot.render(
          createElement(
            GlobalErrorBoundary,
            {
              name: 'AsaasConnectionAuditPanel',
              mode: 'non-blocking',
              route,
            },
            createElement(AsaasConnectionAuditPanel)
          )
        );
      } catch (auditMountErr) {
        reportAppError(auditMountErr, {
          source: 'ui-widget',
          route,
          boundaryName: 'AsaasConnectionAuditPanel',
        });
      }
    }

    let currentContext = 'Página inicial da FerveC Gastronomia';
    if (route === 'lesson') {
      const s = stages[lessonStage];
      currentContext = `Aula Spaghetti alla Carbonara — Etapa ${lessonStage + 1}/${stages.length}: ${s.title}`;
    } else if (route === 'recipe' || route === 'recipeReview') {
      const r = extraRecipes.find((x) => x.id === selectedRecipeId);
      const step = r?.steps[recipeStage];
      currentContext = r
        ? `Módulo ${r.title}${step ? ` — Etapa ${recipeStage + 1}: ${step[0]}` : ''}`
        : 'Módulo de Massas Italianas';
    } else if (route === 'wine' || route === 'category-vinicola') {
      const w = wineProfiles.find((x) => x.id === selectedWineId);
      currentContext = w ? `Vinícola FerveC — Perfil ${w.name} (${w.origin})` : 'Vinícola FerveC';
    } else if (route === 'courses' || route === 'course') {
      currentContext = 'Visão geral do curso Massas Italianas (6 módulos)';
    } else if (route === 'memorial') {
      currentContext = 'Memorial Descritivo do curso Massas Italianas';
    } else if (route === 'progress') {
      currentContext = 'Meu Progresso — acompanhamento dos 6 módulos';
    } else if (route === 'certificate') {
      currentContext = 'Área de Certificados FerveC Gastronomia';
    } else if (route === 'payments') {
      currentContext = 'Pagamentos — Finalize seu pagamento FerveC Gastronomia';
    } else if (route === 'sales') {
      currentContext = 'Cozinhas e Cursos em Destaque';
    } else if (route === 'questions') {
      currentContext = 'Exercícios de fixação — Spaghetti alla Carbonara';
    } else if (route === 'review') {
      currentContext = 'Revisão do módulo Carbonara';
    } else if (route === 'exam') {
      currentContext = 'Avaliação final do módulo Carbonara';
    } else if (route === 'create-profile') {
      currentContext = 'Cadastro / Criação de Perfil — FerveC Gastronomia';
    } else if (route === 'help') {
      currentContext = 'Página de ajuda ao aluno';
    } else if (route === 'admin') {
      currentContext = 'Painel Administrativo e Auditoria Asaas';
    }
    window.dispatchEvent(new CustomEvent('fervec:context', { detail: { context: currentContext } }));
  }

  function clickHandler(e: Event) {
    const target = e.target as Element | null;
    const b = target?.closest<HTMLElement>('[data-action]');
    if (b && b.tagName === 'A') e.preventDefault();
    if (!b) {
      if (
        (cuisinesMenuOpen && !target?.closest('.nav-dropdown-wrap')) ||
        (accountMenuOpen && !target?.closest('.account-chip') && !target?.closest('.home-hero-account-pill') && !target?.closest('.account-dropdown')) ||
        (portalMenuOpen && !target?.closest('.home-hero-menu-btn') && !target?.closest('.portal-dropdown'))
      ) {
        cuisinesMenuOpen = false;
        accountMenuOpen = false;
        portalMenuOpen = false;
        render();
      }
      return;
    }
    const a = b.dataset.action;

    if (a === 'toggle-cuisines-menu') {
      e.stopPropagation();
      cuisinesMenuOpen = !cuisinesMenuOpen;
      accountMenuOpen = false;
      portalMenuOpen = false;
      render();
      return;
    }

    if (a === 'toggle-account-menu') {
      e.stopPropagation();
      accountMenuOpen = !accountMenuOpen;
      cuisinesMenuOpen = false;
      portalMenuOpen = false;
      render();
      return;
    }

    if (a === 'toggle-portal-menu') {
      e.stopPropagation();
      portalMenuOpen = !portalMenuOpen;
      accountMenuOpen = false;
      cuisinesMenuOpen = false;
      render();
      return;
    }

    if (a === 'return-portal') {
      accountMenuOpen = false;
      cuisinesMenuOpen = false;
      portalMenuOpen = false;
      go('home');
    } else if (a === 'open-library') {
      accountMenuOpen = false;
      cuisinesMenuOpen = false;
      portalMenuOpen = false;
      switchEnvironment('library');
    } else if (a === 'home') go('home');
    else if (a === 'payments') {
      go('payments');
      void hydratePaymentsSummary(true);
    } else if (a === 'apply-coupon') {
      const code = normalizeCouponCode(paymentCouponInput);
      const coupons = listProvisionalCoupons();
      const validation = validateCouponForCourse(code, coupons, paymentSummary.courseSlug);
      if (!validation.ok || !validation.coupon) {
        appliedPaymentCoupon = null;
        paymentCouponFeedback = { ok: false, message: validation.message };
        toast.warning('Cupom inválido', validation.message);
      } else {
        const disc = applyCouponDiscount(paymentSummary.priceCents, validation.coupon.discountPercent);
        appliedPaymentCoupon = {
          code: validation.coupon.code,
          discountPercent: validation.coupon.discountPercent,
          discountCents: disc.discountCents,
          totalCents: disc.totalCents,
          isFree: disc.isFree,
        };
        paymentCouponFeedback = { ok: true, message: validation.message };
        toast.success('Cupom aplicado!', validation.message);
      }
      render();
    } else if (a === 'remove-coupon') {
      appliedPaymentCoupon = null;
      paymentCouponInput = '';
      paymentCouponFeedback = null;
      render();
    } else if (a === 'enable-admin-preview') {
      setPhase1AdminPreviewEnabled(true);
      toast.success('Prévia Administrativa ativada!', 'Acesso local ao Painel Administrativo liberado para a Fase 1.');
      go('admin');
    } else if (a === 'admin-tab') {
      adminActiveTab = (b.dataset.tab || 'overview') as AdminTabId;
      adminMobileMenuOpen = false;
      render();
    } else if (a === 'admin-toggle-mobile-nav') {
      adminMobileMenuOpen = !adminMobileMenuOpen;
      render();
    } else if (a === 'admin-regenerate-coupon-code') {
      adminCouponDraft = {
        ...adminCouponDraft,
        code: generateUniqueSixDigitCode(listProvisionalCoupons().map((c) => c.code)),
      };
      render();
    } else if (a === 'admin-copy-coupon') {
      const code = b.dataset.code || '';
      if (code && navigator.clipboard?.writeText) {
        void navigator.clipboard.writeText(code);
      }
      showToast(`Código ${code} copiado!`);
    } else if (a === 'admin-toggle-coupon') {
      const code = b.dataset.code || '';
      const nextActive = b.dataset.nextActive === '1';
      toggleProvisionalCouponActive(code, nextActive);
      showToast(nextActive ? `Cupom ${code} reativado.` : `Cupom ${code} desativado.`);
      render();
    } else if (a === 'admin-voice-test') {
      adminVoiceStatusLabel = 'Gerando voz masculina natural...';
      render();
      previewChefVoice(adminVoiceTestPhrase || CHEF_VOICE_TEST_PHRASE, adminVoiceConfig, (status) => {
        if (status === 'loading') {
          adminVoiceStatusLabel = 'Gerando voz masculina natural...';
        } else if (status === 'playing') {
          adminVoiceStatusLabel = 'Reproduzindo amostra masculina...';
        } else if (status === 'unavailable') {
          adminVoiceStatusLabel = 'Áudio indisponível neste dispositivo';
        } else if (status === 'ended') {
          adminVoiceStatusLabel = 'Amostra concluída';
        }
        if (route === 'admin') render();
      });
    } else if (a === 'admin-voice-stop') {
      stopChef();
      adminVoiceStatusLabel = 'Áudio interrompido';
      render();
    } else if (a === 'admin-voice-reset') {
      adminVoiceConfig = saveChefVoiceConfig(DEFAULT_CHEF_VOICE_CONFIG);
      adminVoiceTestPhrase = CHEF_VOICE_TEST_PHRASE;
      adminVoiceStatusLabel = 'Padrão Chef Educador restaurado';
      showToast('Padrão Chef Educador restaurado.');
      render();
    } else if (a === 'admin-export-report') {
      const payload = {
        exportedAt: new Date().toISOString(),
        phase: 'Fase 1 (Provisório Local)',
        accounts: listUnifiedAccounts(),
        coupons: listProvisionalCoupons(),
        demoOrders: listProvisionalDemoOrders(),
        courseProgress: evaluateMainCourseProgress(),
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      triggerBlobDownload(blob, `fervec-relatorio-fase1-${Date.now()}.json`);
      toast.success('Relatório JSON local exportado!');
    } else if (a === 'select-payment-method') {
      const nextMethod = (b.dataset.method || 'PIX') as PaymentMethodChoice;
      selectedPaymentMethod = nextMethod;
      copiedPixCode = false;
      if (
        paymentsUiStatus === 'communication_error' ||
        paymentsUiStatus === 'refused'
      ) {
        paymentsUiStatus = 'awaiting_selection';
        paymentsStatusMessage = null;
      }
      render();
    } else if (a === 'select-card-mode') {
      const mode = b.dataset.cardMode === 'DEBIT_CARD' ? 'DEBIT_CARD' : 'CREDIT_CARD';
      selectedCardMode = mode;
      render();
    } else if (a === 'copy-pix-code') {
      void copyPixPayload();
    } else if (a === 'generate-boleto') {
      void executePaymentsPageCheckout('BOLETO');
    } else if (a === 'confirm-payment') {
      void executePaymentsPageCheckout();
    } else if (a === 'refresh-payment-status') {
      void refreshActiveOrderStatus(false);
    } else if (a === 'back-to-cuisines') {
      pendingScrollTarget = '#cuisines-section';
      go('home');
    } else if (a === 'lesson-tab') {
      lessonTab = b.dataset.tab || 'learn';
      render();
    } else if (a === 'select-ingredient') {
      selectedIngredientId = b.dataset.ingredient || 'spaghetti';
      render();
    } else if (a === 'wine-scroll') {
      document.querySelector('#wine-selection')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (a === 'wine-filter') {
      const f = (b.dataset.filter || 'all') as typeof selectedWineFilter;
      selectedWineFilter = f;
      const list = f === 'all' ? wineProfiles : wineProfiles.filter((x) => x.category === f);
      if (list.length > 0 && !list.some((x) => x.id === selectedWineId)) {
        selectedWineId = list[0].id;
      }
      render();
    } else if (a === 'wine-select') {
      selectedWineId = b.dataset.wine || 'pinot-grigio';
      render();
    } else if (a === 'wine-scroll-back' || a === 'wine-scroll-forward') {
      const list =
        selectedWineFilter === 'all'
          ? wineProfiles
          : wineProfiles.filter((x) => x.category === selectedWineFilter);
      const i = list.findIndex((x) => x.id === selectedWineId);
      const step = a === 'wine-scroll-back' ? -1 : 1;
      const next = list[(i + step + list.length) % list.length];
      if (next) selectedWineId = next.id;
      render();
    } else if (a === 'wine-discover') {
      const picker = $<HTMLSelectElement>('#wine-picker');
      if (picker) {
        selectedWineId = picker.value;
        go('wine');
      }
    } else if (a === 'course' || a === 'sales') go('sales');
    else if (a === 'chef') go('chef');
    else if (a === 'category-future') go('categories');
    else if (a === 'category-open') {
      selectedCategory = b.dataset.category || 'vinicola';
      route = 'category-' + selectedCategory;
      cuisinesMenuOpen = false;
      syncHashForRoute(route);
      render();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (a === 'wine-open') {
      selectedWineId = b.dataset.wine || 'pinot-grigio';
      go('wine');
    } else if (a === 'courses') go('courses');
    else if (a === 'continue-active-course') continueActiveCourse();
    else if (a === 'open-memorial') {
      memorialCourseSlug = b.dataset.course || 'massas-italianas';
      go('memorial');
    } else if (a === 'share-memorial') {
      const shareUrl = `${window.location.origin}/#/memorial/${memorialCourseSlug || 'massas-italianas'}`;
      if (navigator.share) {
        void navigator
          .share({
            title: 'Memorial Descritivo · Massas Italianas — FerveC Gastronomia',
            url: shareUrl,
          })
          .catch(() => {
            showToast(`Link do Memorial: ${shareUrl}`);
          });
      } else if (navigator.clipboard?.writeText) {
        void navigator.clipboard
          .writeText(shareUrl)
          .then(() => showToast('Link do Memorial Descritivo copiado!'))
          .catch(() => showToast(`Memorial disponível em: ${shareUrl}`));
      } else {
        showToast(`Memorial disponível em: ${shareUrl}`);
      }
    } else if (a === 'generate-cert-pdf' || a === 'cert-pdf-unavailable') {
      void handleGenerateCertificatePdf();
    } else if (a === 'view-cert-pdf') {
      void handleViewCertificatePdf(b.dataset.code || '');
    } else if (a === 'download-cert-pdf') {
      void handleDownloadCertificatePdf(b.dataset.code || '');
    } else if (a === 'cert-print-unavailable') {
      openModal(`<div class="modal-backdrop">
        <section class="modal" role="dialog" aria-modal="true" aria-labelledby="print-modal-title">
          <button class="modal-close" data-action="close-modal" aria-label="Fechar">×</button>
          <span class="eyebrow">FERVEC GASTRONOMIA</span>
          <h2 id="print-modal-title">Impressão oficial indisponível</h2>
          <p>A impressão direta pela plataforma permanece indisponível nesta etapa. Utilize o botão Gerar certificado em PDF para baixar o documento.</p>
          <div class="modal-buttons">
            <button type="button" class="btn btn-outline-dark" data-action="close-modal">Entendi</button>
            <button type="button" class="btn btn-red" data-action="generate-cert-pdf">↓ Gerar certificado em PDF</button>
          </div>
        </section>
      </div>`);
    } else if (a === 'checkout-notice') {
      const courseId = b.dataset.courseId || 'italiana';
      const courseSlug = b.dataset.courseSlug || 'massas-italianas';
      const courseTitle = b.dataset.courseTitle || 'Cozinha Italiana: Massas Artesanais.';
      const rawVal = Number(b.dataset.courseValue || 12.9);
      const value = Number.isFinite(rawVal) && rawVal > 0 ? rawVal : 12.9;
      void handleBuyCourseClick({ courseId, courseSlug, courseTitle, value });
    } else if (a === 'upcoming-notice') {
      const title = b.dataset.title || 'Este curso';
      showModal(
        'Lançamento em breve',
        `${title} está estruturado para uma etapa futura da FerveC Gastronomia e ainda não possui aulas liberadas.`
      );
    } else if (a === 'toggle-progress-item') {
      const id = b.dataset.module || 'carbonara';
      expandedProgressId = expandedProgressId === id ? '' : id;
      render();
    } else if (a === 'open-recipe') {
      selectedRecipeId = b.dataset.recipe || 'alfredo';
      state.lastModuleId = selectedRecipeId;
      state.demo = true;
      recipeStage = state.recipeProgress?.[selectedRecipeId]?.stage || 0;
      recipeTab = 'lesson';
      const ing = getIngredientsForModuleStage(selectedRecipeId, recipeStage);
      selectedIngredientId = ing[0]?.id || 'spaghetti';
      persist();
      go('recipe');
    } else if (a === 'open-recipe-tab') {
      selectedRecipeId = b.dataset.recipe || 'alfredo';
      state.lastModuleId = selectedRecipeId;
      state.demo = true;
      const r = extraRecipes.find((x) => x.id === selectedRecipeId);
      const tab = b.dataset.tab || 'lesson';
      if (r) {
        const p = recipeProgressFor(r);
        if (tab === 'exam' && (p.done.length < r.steps.length || !p.reviewDone)) {
          showModal(
            'Prova bloqueada até concluir o módulo',
            `Conclua as ${r.steps.length} etapas e marque a revisão de ${r.title} antes de iniciar a prova.`
          );
          return;
        }
        recipeStage = p.stage || 0;
        recipeTab = tab;
      }
      persist();
      go('recipe');
    } else if (a === 'recipe-tab') {
      const r = extraRecipes.find((x) => x.id === selectedRecipeId);
      if (r) {
        const p = recipeProgressFor(r);
        if (b.dataset.tab === 'exam' && (p.done.length < r.steps.length || !p.reviewDone)) {
          showModal(
            'Conclua e revise o módulo primeiro.',
            'A prova fica disponível depois de percorrer todas as etapas e abrir a revisão.'
          );
          return;
        }
        recipeTab = b.dataset.tab || 'lesson';
        if (recipeTab === 'exam' && p.examStatus === 'result') p.examStatus = 'intro';
      }
      render();
    } else if (a === 'recipe-review-detail') {
      showModal(b.dataset.title || 'Revisão', b.dataset.copy || '');
    } else if (a === 'recipe-review-complete') {
      const r = extraRecipes.find((x) => x.id === selectedRecipeId);
      if (r) {
        const p = recipeProgressFor(r);
        p.reviewDone = true;
        persist();
        syncRecipeProgressAsync(r, p);
        showToast('Revisão concluída! Prova do módulo liberada.');
        render();
      }
    } else if (a === 'recipe-exam-start') {
      const r = extraRecipes.find((x) => x.id === selectedRecipeId);
      if (r) {
        const p = recipeProgressFor(r);
        p.examAnswers = [];
        p.examCurrent = 0;
        p.examStatus = 'active';
        persist();
        render();
      }
    } else if (a === 'recipe-answer') {
      const r = extraRecipes.find((x) => x.id === selectedRecipeId);
      if (r) {
        const p = recipeProgressFor(r);
        if (b.dataset.mode === 'exam') {
          p.examAnswers[p.examCurrent] = +(b.dataset.answer || 0);
        } else {
          p.workAnswers[p.workCurrent] = +(b.dataset.answer || 0);
        }
        persist();
        render();
      }
    } else if (a === 'recipe-question-next') {
      const r = extraRecipes.find((x) => x.id === selectedRecipeId);
      if (r) {
        const p = recipeProgressFor(r);
        const examMode = b.dataset.mode === 'exam';
        const bank = recipeQuestionSet(r, examMode ? 8 : 6);
        const idx = examMode ? p.examCurrent : p.workCurrent;
        const answers = examMode ? p.examAnswers : p.workAnswers;
        if (answers[idx] == null) return;
        if (idx < bank.length - 1) {
          if (examMode) p.examCurrent++;
          else p.workCurrent++;
        } else if (examMode) {
          p.examStatus = 'review';
        } else {
          const cleanWorkAnswers = (answers as number[]).slice();
          const versioned = buildVersionedAttemptPayload(r.id, 'work', cleanWorkAnswers);
          p.workAttempts.push({
            score: versioned.graded.score,
            answers: versioned.graded.answers,
            date: new Date().toISOString(),
            bankVersion: versioned.bankVersion,
            questionIds: versioned.questionIds,
            selectedOptionIds: versioned.selectedOptionIds,
            questionSnapshots: versioned.questionSnapshots,
          });
          p.workFinished = true;
          if (userProfile?.authSource === 'supabase') {
            void submitAssessmentToServer({
              moduleKey: r.id,
              attemptType: 'work',
              answers: versioned.graded.answers,
              bankVersion: versioned.bankVersion,
              questionIds: versioned.questionIds,
              selectedOptionIds: versioned.selectedOptionIds,
            });
          }
        }
        persist();
        render();
      }
    } else if (a === 'recipe-question-back') {
      const r = extraRecipes.find((x) => x.id === selectedRecipeId);
      if (r) {
        const p = recipeProgressFor(r);
        if (b.dataset.mode === 'exam') p.examCurrent = Math.max(0, p.examCurrent - 1);
        else p.workCurrent = Math.max(0, p.workCurrent - 1);
        render();
      }
    } else if (a === 'recipe-work-retry') {
      const r = extraRecipes.find((x) => x.id === selectedRecipeId);
      if (r) {
        const p = recipeProgressFor(r);
        p.workAnswers = [];
        p.workCurrent = 0;
        p.workFinished = false;
        persist();
        render();
      }
    } else if (a === 'recipe-exam-edit') {
      const r = extraRecipes.find((x) => x.id === selectedRecipeId);
      if (r) {
        const p = recipeProgressFor(r);
        p.examCurrent = +(b.dataset.question || 0);
        p.examStatus = 'active';
        render();
      }
    } else if (a === 'recipe-exam-back') {
      const r = extraRecipes.find((x) => x.id === selectedRecipeId);
      if (r) {
        const p = recipeProgressFor(r);
        p.examStatus = 'active';
        render();
      }
    } else if (a === 'recipe-exam-submit') {
      openModal(`<div class="modal-backdrop">
        <section class="modal" role="dialog" aria-modal="true">
          <button class="modal-close" data-action="close-modal" aria-label="Fechar">×</button>
          <span class="eyebrow">CONFIRMAÇÃO</span>
          <h2>Enviar sua prova?</h2>
          <p>Depois do envio, exibiremos seu resultado e as explicações.</p>
          <div class="modal-buttons">
            <button class="btn btn-outline-dark" data-action="close-modal">Ainda não</button>
            <button class="btn btn-red" data-action="recipe-exam-confirm">Confirmar envio</button>
          </div>
        </section>
      </div>`);
    } else if (a === 'recipe-exam-confirm') {
      closeModal();
      const r = extraRecipes.find((x) => x.id === selectedRecipeId);
      if (r) {
        const p = recipeProgressFor(r);
        const submittedAnswers = p.examAnswers.map((v) => (typeof v === 'number' ? v : 0));

        if (userProfile?.authSource === 'supabase') {
          void (async () => {
            await syncModuleProgressToServer({
              moduleKey: r.id,
              currentStage: p.stage,
              doneSteps: p.done,
              reviewDone: Boolean(p.reviewDone),
              lessonFinished: p.done.length >= r.steps.length,
              workFinished: Boolean(p.workFinished),
              lastModuleKey: r.id,
            });
            const localVersioned = buildVersionedAttemptPayload(r.id, 'exam', submittedAnswers);
            const res = await submitAssessmentToServer({
              moduleKey: r.id,
              attemptType: 'exam',
              answers: submittedAnswers,
              bankVersion: localVersioned.bankVersion,
              questionIds: localVersioned.questionIds,
              selectedOptionIds: localVersioned.selectedOptionIds,
            });
            if (!res.ok) {
              toast.error('Não foi possível registrar a prova', res.error || 'Tente novamente.');
              render();
              return;
            }
            const score = res.score ?? localVersioned.graded.score;
            const passed = Boolean(res.passed);
            p.examAttempts.push({
              score,
              passed,
              answers: submittedAnswers,
              date: res.attempt?.attempted_at || new Date().toISOString(),
              bankVersion: res.bankVersion || localVersioned.bankVersion,
              questionIds: res.questionIds || localVersioned.questionIds,
              selectedOptionIds: res.selectedOptionIds || localVersioned.selectedOptionIds,
              questionSnapshots: res.questionSnapshots || localVersioned.questionSnapshots,
            });
            if (res.certificate) {
              upsertWorkspaceCertificate(res.certificate, res.certificates);
            }
            p.examStatus = 'result';
            p.examAnswers = [];
            p.examCurrent = 0;
            persist();
            if (passed) {
              toast.success(
                'Prova aprovada e certificado liberado!',
                `Você atingiu ${score}% em ${r.title}.`
              );
            } else {
              toast.warning(
                `Nota ${score}% — tente novamente`,
                `Mínimo de ${PASSING_SCORE_PERCENT}% para liberar o certificado.`
              );
            }
            render();
          })();
        } else {
          const versioned = buildVersionedAttemptPayload(r.id, 'exam', submittedAnswers);
          p.examAttempts.push({
            score: versioned.graded.score,
            passed: versioned.graded.passed,
            answers: versioned.graded.answers,
            date: new Date().toISOString(),
            bankVersion: versioned.bankVersion,
            questionIds: versioned.questionIds,
            selectedOptionIds: versioned.selectedOptionIds,
            questionSnapshots: versioned.questionSnapshots,
          });
          p.examStatus = 'result';
          p.examAnswers = [];
          p.examCurrent = 0;
          persist();
          render();
        }
      }
    } else if (a === 'recipe-step') {
      stopChef();
      resetAudioClock();
      audioStatus = 'idle';
      recipeStage = +(b.dataset.step || 0);
      const r = extraRecipes.find((x) => x.id === selectedRecipeId);
      if (r) {
        const p = recipeProgressFor(r);
        p.stage = recipeStage;
        const ing = getIngredientsForModuleStage(r.id, recipeStage);
        selectedIngredientId = ing[0]?.id || 'spaghetti';
        persist();
        syncRecipeProgressAsync(r, p);
      }
      render();
    } else if (a === 'recipe-prev') {
      stopChef();
      resetAudioClock();
      audioStatus = 'idle';
      if (recipeStage === 0) {
        go('courses');
        return;
      }
      recipeStage = Math.max(0, recipeStage - 1);
      const ing = getIngredientsForModuleStage(selectedRecipeId, recipeStage);
      selectedIngredientId = ing[0]?.id || 'spaghetti';
      render();
    } else if (a === 'recipe-next') {
      stopChef();
      resetAudioClock();
      audioStatus = 'idle';
      const r = extraRecipes.find((x) => x.id === selectedRecipeId);
      if (r) {
        const p = recipeProgressFor(r);
        if (recipeStage > 0 && !p.done.includes(recipeStage - 1) && !p.done.includes(recipeStage)) {
          showModal(
            'Vamos uma etapa de cada vez.',
            'Conclua a etapa anterior antes de marcar esta como pronta.'
          );
          return;
        }
        const wasDone = p.done.includes(recipeStage);
        if (!wasDone) p.done.push(recipeStage);
        if (recipeStage < r.steps.length - 1) {
          recipeStage++;
          const ing = getIngredientsForModuleStage(r.id, recipeStage);
          selectedIngredientId = ing[0]?.id || 'spaghetti';
          showToast(wasDone ? `Etapa ${recipeStage + 1} aberta.` : `Etapa ${recipeStage} concluída!`);
        } else {
          showToast(`Parabéns! Todas as ${r.steps.length} etapas de ${r.title} foram concluídas.`);
        }
        p.stage = recipeStage;
        persist();
        syncRecipeProgressAsync(r, p);
        render();
      }
    } else if (a === 'recipe-review') go('recipeReview');
    else if (a === 'recipe-back') go('recipe');
    else if (a === 'lesson' || a === 'start-course') startCourse();
    else if (a === 'carbonara-cert') go('carbonara-cert');
    else if (a === 'account') go('account');
    else if (a === 'admin') go('admin');
    else if (a === 'create-profile' || a === 'edit-profile') {
      closeModal();
      profileJustCreated = false;
      profileErrors = {};
      profileDraft = createInitialProfileDraft(userProfile);
      go('create-profile');
    } else if (a === 'clear-profile') {
      void signOutSupabaseAccount();
      clearProfile();
      clearAsaasAuditCache();
      userProfile = null;
      workspaceData = null;
      issuedCertificate = null;
      sessionBillingCustomer = null;
      paymentSummaryLoaded = false;
      activePaymentCharge = null;
      activeOrderId = null;
      paymentsUiStatus = 'awaiting_selection';
      paymentsStatusMessage = null;
      stopPaymentPollTimer();
      syncProgressScope(null);
      accountMenuOpen = false;
      profileJustCreated = false;
      profileErrors = {};
      profileDraft = createInitialProfileDraft(null);
      showToast('Conta desconectada deste navegador.');
      if (route === 'payments') {
        void hydratePaymentsSummary(true);
      }
      render();
    } else if (a === 'open-login-modal') {
      openLoginModal();
    } else if (a === 'open-birthdate-picker') {
      const nativeDate = $<HTMLInputElement>('#cadastro-native-date');
      if (nativeDate) {
        if (typeof nativeDate.showPicker === 'function') {
          try {
            nativeDate.showPicker();
          } catch {
            nativeDate.click();
          }
        } else {
          nativeDate.click();
        }
      }
    } else if (a === 'toggle-password-visibility') {
      profileShowPassword = !profileShowPassword;
      render();
      $<HTMLInputElement>('#cadastro-password')?.focus();
    } else if (a === 'toggle-confirm-visibility') {
      profileShowConfirm = !profileShowConfirm;
      render();
      $<HTMLInputElement>('#cadastro-confirm-password')?.focus();
    } else if (a === 'open-terms-modal') {
      e.preventDefault();
      e.stopPropagation();
      openLegalDocumentModal('termos');
    } else if (a === 'open-privacy-modal') {
      e.preventDefault();
      e.stopPropagation();
      openLegalDocumentModal('privacidade');
    } else if (a === 'legal-doc-jump') {
      const nextSection = (b.dataset.section || 'termos') as 'termos' | 'privacidade' | 'topo';
      openLegalDocumentModal(nextSection);
    } else if (a === 'accept-terms-from-modal') {
      profileDraft.acceptTerms = true;
      delete profileErrors.acceptTerms;
      const termsCheckbox = $<HTMLInputElement>('#cadastro-terms');
      if (termsCheckbox) {
        termsCheckbox.checked = true;
        termsCheckbox.setAttribute('aria-invalid', 'false');
        termsCheckbox.closest('.cadastro-consent-col')?.classList.remove('has-error');
        const errEl = document.querySelector<HTMLElement>('[data-error-for="acceptTerms"]');
        if (errEl) {
          errEl.textContent = '';
          errEl.classList.remove('is-visible');
        }
      }
      closeModal();
      toast.success(
        'Termos aceitos',
        'A opção "Concordo com os Termos de Condições e Política de Privacidade" foi marcada.'
      );
    }
    else if (a === 'progress') go('progress');
    else if (a === 'certificate') {
      if (state.examAttempts.some((x) => x.passed)) examStatus = 'certificate';
      go('certificate');
    } else if (a === 'exam') {
      if (!state.lessonFinished || !state.reviewDone) {
        showModal(
          'A prova será liberada depois da revisão.',
          'Conclua as seis etapas e marque a revisão como concluída antes de iniciar a avaliação.'
        );
        return;
      }
      examStatus = 'intro';
      go('exam');
    } else if (a === 'help') go('help');
    else if (a === 'questions') go('questions');
    else if (a === 'review') go('review');
    else if (a === 'review-complete') {
      state.reviewDone = true;
      persist();
      syncCarbonaraProgressAsync();
      showToast('Revisão concluída! Avaliação liberada.');
      render();
    } else if (a === 'review-detail') {
      const idxAttr = b.dataset.review;
      const x = idxAttr !== undefined ? reviewItems[+idxAttr] : undefined;
      if (x) {
        showModal(x[0], x[1]);
      } else if (b.dataset.title || b.dataset.copy) {
        showModal(b.dataset.title || 'Revisão', b.dataset.copy || '');
      }
    } else if (a === 'lesson-play') {
      const x = stages[lessonStage];
      playText(x.audioScript || `${x.title}. ${x.intro} ${x.tip}`);
    } else if (a === 'sos') showSos(b.dataset.module || 'carbonara');
    else if (a === 'sos-choice') showSosAnswer(+(b.dataset.choice || 0), b.dataset.module || 'carbonara');
    else if (a === 'eye') showEye(b.dataset.module || 'carbonara');
    else if (a === 'intro-play') playText(introText);
    else if (a === 'audio-toggle') {
      if (audioStatus === 'playing') {
        pauseChef();
        audioStatus = 'paused';
        stopAudioTicker();
        updateAudioStatus();
      } else if (audioStatus === 'paused') {
        void resumeChef();
        audioStatus = 'playing';
        startAudioTicker(audioTotal || estimateAudioSeconds(b.dataset.text || ''));
        updateAudioStatus();
      } else {
        playText(b.dataset.text || '');
      }
    } else if (a === 'audio-toggle-mute') {
      const muted = (state.voiceVolume ?? 0.82) <= 0.01;
      state.voiceVolume = muted ? 0.82 : 0;
      setChefVolume(state.voiceVolume);
      app.querySelectorAll<HTMLInputElement>('[data-audio-volume]').forEach((inp) => {
        inp.value = String(state.voiceVolume);
      });
      persist();
      showToast(muted ? 'Som da narração ativado.' : 'Som da narração silenciado.');
    } else if (a === 'audio-toggle-cc') {
      captionOpen = !captionOpen;
      app.querySelectorAll('[data-audio-cc-overlay]').forEach((el) => {
        el.classList.toggle('is-open', captionOpen);
      });
      app.querySelectorAll('[data-audio-cc-btn]').forEach((el) => {
        el.classList.toggle('is-active', captionOpen);
        el.setAttribute('aria-pressed', String(captionOpen));
      });
      app.querySelectorAll<HTMLDetailsElement>('[data-audio-details]').forEach((el) => {
        el.open = captionOpen;
      });
    } else if (a === 'audio-play' || a === 'audio-replay') playText(b.dataset.text || '');
    else if (a === 'audio-pause') {
      pauseChef();
      audioStatus = 'paused';
      stopAudioTicker();
      updateAudioStatus();
    } else if (a === 'audio-resume') {
      void resumeChef();
      audioStatus = 'playing';
      startAudioTicker(audioTotal || 30);
      updateAudioStatus();
    } else if (a === 'jump-step') {
      if (timerInterval !== null) timerPause();
      stopChef();
      resetAudioClock();
      audioStatus = 'idle';
      lessonStage = +(b.dataset.step || 0);
      state.stage = lessonStage;
      const ing = getIngredientsForModuleStage('carbonara', lessonStage);
      selectedIngredientId = ing[0]?.id || 'spaghetti';
      persist();
      render();
    } else if (a === 'lesson-next') {
      stopChef();
      resetAudioClock();
      audioStatus = 'idle';
      nextLesson();
    } else if (a === 'lesson-prev') {
      stopChef();
      resetAudioClock();
      audioStatus = 'idle';
      if (lessonStage === 0) {
        go('courses');
        return;
      }
      lessonStage--;
      state.stage = lessonStage;
      const ing = getIngredientsForModuleStage('carbonara', lessonStage);
      selectedIngredientId = ing[0]?.id || 'spaghetti';
      persist();
      render();
    } else if (a === 'mise-ready') {
      state.mise = true;
      state.demo = true;
      prepMode = false;
      persist();
      render();
    } else if (a === 'lesson-mark-complete') {
      state.lessonFinished = true;
      for (let idx = 0; idx < stages.length; idx++) {
        if (!state.done.includes(idx)) state.done.push(idx);
      }
      persist();
      syncCarbonaraProgressAsync();
      toast.success('Aula concluída!', 'Seu progresso no módulo Spaghetti alla Carbonara foi atualizado.');
      render();
    } else if (a === 'recipe-lesson-mark-complete') {
      const r = extraRecipes.find((x) => x.id === selectedRecipeId);
      if (r) {
        const p = recipeProgressFor(r);
        p.lessonCompleted = true;
        for (let idx = 0; idx < r.steps.length; idx++) {
          if (!p.done.includes(idx)) p.done.push(idx);
        }
        persist();
        syncRecipeProgressAsync(r, p);
        toast.success(`Aula de ${r.title} concluída!`, 'Você já pode avançar para Trabalho ou Revisão.');
        render();
      }
    } else if (a === 'questions-mark-complete') {
      const answeredCount = state.questionsAnswers.filter((v) => v !== null && v !== undefined).length;
      if (!canCompleteModuleWork(answeredCount, questions.length)) {
        showModal(
          'Responda todas as perguntas obrigatórias',
          `Responda todas as ${questions.length} perguntas do Trabalho (${answeredCount}/${questions.length} respondidas) antes de concluir.`
        );
        return;
      }
      if (!state.questionsFinished) {
        const versioned = buildVersionedAttemptPayload(
          'carbonara',
          'work',
          state.questionsAnswers.slice()
        );
        state.questionAttempts.push({
          score: versioned.graded.score,
          answers: versioned.graded.answers,
          date: new Date().toISOString(),
          bankVersion: versioned.bankVersion,
          questionIds: versioned.questionIds,
          selectedOptionIds: versioned.selectedOptionIds,
          questionSnapshots: versioned.questionSnapshots,
        });
      }
      state.questionsFinished = true;
      state.demo = true;
      persist();
      toast.success('Trabalho concluído!', 'Seu progresso em Meu Progresso foi atualizado.');
      render();
    } else if (a === 'recipe-work-mark-complete') {
      const r = extraRecipes.find((x) => x.id === selectedRecipeId);
      if (r) {
        const p = recipeProgressFor(r);
        const bank = recipeQuestionSet(r, 6);
        const answeredCount = p.workAnswers.filter((v) => v !== null && v !== undefined).length;
        if (!canCompleteModuleWork(answeredCount, bank.length)) {
          showModal(
            'Responda todas as perguntas obrigatórias',
            `Responda todas as ${bank.length} perguntas do Trabalho de ${r.title} antes de concluir.`
          );
          return;
        }
        if (!p.workFinished) {
          const cleanAnswers = p.workAnswers.map((v) => (typeof v === 'number' ? v : 0));
          const versioned = buildVersionedAttemptPayload(r.id, 'work', cleanAnswers);
          p.workAttempts.push({
            score: versioned.graded.score,
            answers: versioned.graded.answers,
            date: new Date().toISOString(),
            bankVersion: versioned.bankVersion,
            questionIds: versioned.questionIds,
            selectedOptionIds: versioned.selectedOptionIds,
            questionSnapshots: versioned.questionSnapshots,
          });
        }
        p.workFinished = true;
        p.workCompleted = true;
        persist();
        syncRecipeProgressAsync(r, p);
        toast.success(`Trabalho de ${r.title} concluído!`, 'Seu progresso foi atualizado.');
        render();
      }
    } else if (a === 'question-answer') answerLearning(+(b.dataset.answer || 0));
    else if (a === 'question-next') nextLearning();
    else if (a === 'question-back') {
      if (qIndex > 0) {
        qIndex--;
        persist();
        render();
      }
    } else if (a === 'questions-retry') {
      state.questionsAnswers = [];
      state.questionsFinished = false;
      qIndex = 0;
      persist();
      render();
    } else if (a === 'start-exam') {
      if (!state.lessonFinished || !state.reviewDone) {
        showModal(
          'Quase lá!',
          'Conclua as seis etapas e marque a revisão como concluída para liberar a avaliação final.'
        );
        return;
      }
      examStatus = 'intro';
      persist();
      go('exam');
    } else if (a === 'begin-exam') beginExam();
    else if (a === 'exam-answer') {
      state.examAnswers[state.examCurrent] = +(b.dataset.answer || 0);
      persist();
      render();
    } else if (a === 'exam-next') {
      if (state.examAnswers[state.examCurrent] == null) return;
      if (state.examCurrent < exam.length - 1) {
        state.examCurrent++;
        persist();
        render();
      } else {
        examStatus = 'review';
        persist();
        render();
      }
    } else if (a === 'exam-back') {
      if (state.examCurrent > 0) {
        state.examCurrent--;
        render();
      }
    } else if (a === 'exam-edit') {
      state.examCurrent = +(b.dataset.question || 0);
      examStatus = 'question';
      persist();
      render();
    } else if (a === 'submit-exam') confirmExam();
    else if (a === 'confirm-submit') {
      closeModal();
      void submitExam();
    } else if (a === 'retry-exam') {
      examStatus = 'intro';
      persist();
      go('exam');
    } else if (a === 'timer-start') timerStart();
    else if (a === 'timer-pause') timerPause();
    else if (a === 'timer-reset') timerReset();
    else if (a === 'reset-demo') resetDemo();
    else if (a === 'demo-entry') {
      closeModal();
      state.demo = true;
      persist();
      go('courses');
    } else if (a === 'open-chef-chat') {
      closeModal();
      window.dispatchEvent(new CustomEvent('fervec:open-chat', { detail: {} }));
    } else if (a === 'close-modal') closeModal();
  }

  function onHashChange() {
    const prev = route;
    parseRouteFromHash();
    if (route !== prev) {
      render();
      if (route === 'payments') {
        void hydratePaymentsSummary(false);
      }
    }
  }

  function changeHandler(e: Event) {
    const target = e.target as (HTMLSelectElement | HTMLInputElement) | null;
    if (!target) return;
    if (target.dataset.paymentInput === 'cardInstallments') {
      const parsed = Number(target.value || 1);
      cardInstallmentsInput = Number.isFinite(parsed) && parsed >= 1 ? parsed : 1;
      return;
    }
    if (target.dataset.action !== 'select-dev-cert-course') return;
    selectedDevCertCourseSlug = target.value || 'massas-italianas';
    render();
  }

  function inputHandler(e: Event) {
    const target = e.target as HTMLInputElement | null;
    if (!target) return;
    if (target.dataset.paymentInput === 'cardHolderName') {
      cardHolderNameInput = target.value;
    } else if (target.dataset.paymentInput === 'couponCode') {
      paymentCouponInput = normalizeCouponCode(target.value);
      target.value = paymentCouponInput;
    }
  }

  const onNavigateHome = () => {
    accountMenuOpen = false;
    cuisinesMenuOpen = false;
    portalMenuOpen = false;
    go('home');
  };

  const onNavigateRoute = (ev: Event) => {
    const custom = ev as CustomEvent<{ route?: string }>;
    const next = custom.detail?.route;
    if (!next) return;
    accountMenuOpen = false;
    cuisinesMenuOpen = false;
    portalMenuOpen = false;
    go(next);
  };

  const uninstallGlobalErrors = installGlobalErrorHandlers({ getRoute: () => route });
  app.addEventListener('click', clickHandler);
  app.addEventListener('change', changeHandler);
  app.addEventListener('input', inputHandler);
  modal.addEventListener('click', clickHandler);
  window.addEventListener('hashchange', onHashChange);
  window.addEventListener('fervec:navigate-home', onNavigateHome);
  window.addEventListener('fervec:navigate-route', onNavigateRoute as EventListener);
  render();
  if (route === 'payments') {
    void hydratePaymentsSummary(false);
  }

  const unsubscribePayment = subscribePaymentCheckout((nextState) => {
    const changed =
      paymentCheckoutState.isProcessing !== nextState.isProcessing ||
      paymentCheckoutState.activeCourseId !== nextState.activeCourseId ||
      paymentCheckoutState.lastPayment !== nextState.lastPayment;
    paymentCheckoutState = nextState;
    if (nextState.lastPayment) {
      activePaymentCharge = nextState.lastPayment;
    }
    if (changed && (route === 'sales' || route === 'payments')) {
      render();
    }
  });

  let unsubscribeAuth: () => void = () => {};
  let authBootstrapped = false;
  function bootstrapSupabaseAuth() {
    if (authBootstrapped || !isSupabaseConfigured()) return;
    authBootstrapped = true;
    const refreshFromSupabaseSession = () => {
      void fetchCurrentSupabaseProfile(userProfile).then((synced) => {
        if (synced) {
          userProfile = synced;
          syncProgressScope(synced);
          profileDraft = createInitialProfileDraft(synced);
          render();
          void hydrateAuthenticatedWorkspace();
          if (route === 'payments') {
            void hydratePaymentsSummary(true);
          }
        } else if (userProfile?.authSource === 'supabase') {
          userProfile = { ...userProfile, authSource: 'local' };
          saveProfile(userProfile);
          render();
        }
      });
    };
    refreshFromSupabaseSession();
    unsubscribeAuth = subscribeSupabaseAuthChanges(() => {
      if (userProfile?.authSource !== 'supabase' || !workspaceData) {
        refreshFromSupabaseSession();
      }
    });
  }

  if (!PHASE_1_OFFLINE_ONLY && SUPABASE_CONNECTED) {
    bootstrapSupabaseAuth();
    if (!isSupabaseConfigured()) {
      void initSupabaseRuntimeConfig().then((configured) => {
        if (configured) {
          bootstrapSupabaseAuth();
          if (route === 'payments') {
            void hydratePaymentsSummary(true);
          }
          render();
        }
      });
    }
  }

  return () => {
    uninstallGlobalErrors();
    if (adminAuditRoot) {
      adminAuditRoot.unmount();
      adminAuditRoot = null;
    }
    unsubscribePayment();
    unsubscribeAuth();
    stopPaymentPollTimer();
    if (copyPixResetTimer !== null) {
      window.clearTimeout(copyPixResetTimer);
      copyPixResetTimer = null;
    }
    app.removeEventListener('click', clickHandler);
    app.removeEventListener('change', changeHandler);
    app.removeEventListener('input', inputHandler);
    modal.removeEventListener('click', clickHandler);
    window.removeEventListener('hashchange', onHashChange);
    window.removeEventListener('fervec:navigate-home', onNavigateHome);
    window.removeEventListener('fervec:navigate-route', onNavigateRoute as EventListener);
    if (timerInterval !== null) {
      window.clearInterval(timerInterval);
      timerInterval = null;
    }
    if (audioTickInterval !== null) {
      window.clearInterval(audioTickInterval);
      audioTickInterval = null;
    }
    stopChef();
  };
}
