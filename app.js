import * as pdfjsLib from 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.min.mjs';
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
} from './lib/timer.js';
import {
  getTodayKey,
  normalizeDailyState,
  incrementDailyGoal,
  toggleDailyGoal,
  addDailyGoal,
  removeDailyGoal,
  getDailyGoalsSummary,
  getCircularProgressMetrics,
  recipesToCsv,
} from './lib/goals.js';
import {
  sanitizeCheckedMap,
  toggleIngredientCheck,
  resetIngredientChecks,
  getIngredientChecklistProgress,
  sanitizeCategoryMap,
  toggleIngredientCategory,
  sortIngredientsForChecklist,
} from './lib/ingredients.js';
import { nextReaderZoom, isSpreadLayout, getReaderSpreadLabel, computePdfRenderParams } from './lib/reader.js';
import {
  RECIPE_QUICK_CATEGORIES,
  getPrimaryRecipeCategoryLabel,
  filterRecipesByQuickJump,
  getQuickJumpCounts,
} from './lib/recipes.js';
import {
  CHAT_ROLES,
  CHAT_QUICK_PROMPTS,
  getChatRole,
  buildChatSystemInstruction,
  sanitizeChatHistory,
  sanitizeStoredChat,
  buildChefWelcomeGreeting,
  formatChatResumeStatus,
} from './lib/chat.js';
import { LIVE_VOICES } from './lib/live_audio.js';
import { createLiveVoiceClient } from './lib/live_client.js';
import {
  validateRegistration,
  validateLogin,
  registerAccount,
  authenticateAccount,
  saveSession,
  readSavedSession,
  clearSavedSession,
  isActionAllowedInDemo,
  getUserStorageKey,
} from './lib/auth.js';
import { createSpeechController, shouldAutoSendHandsFree } from './lib/speech.js';
import { filterNotes, paginateNotesIntoSheets, NOTES_PER_SHEET } from './lib/notes.js';
import { computeEvolutionSummary } from './lib/progress.js';
import {
  CUISINE_FILTERS,
  DEFAULT_MAP_CENTER,
  rankRestaurantsByOsm,
} from './lib/restaurants.js';
import {
  createInteractiveRestaurantMap,
  searchRestaurantsOsm,
  renderRestaurantMarkers,
  openPlacePopup,
} from './lib/maps_client.js';

pdfjsLib.GlobalWorkerOptions.workerSrc =
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs';

const BOOK_URL = '/api/library/book';
const CHEF_AVATAR_URL = '/assets/aistudio/WhatsApp_Image_2026-11-13_at_20.05.56__1__d8e41516.jpeg';
const LAB_KITCHEN_IMG_URL = '/src/assets/images/fervec_lab_kitchen_1795252127456.jpg';
const DEFAULT_BOOKMARK_RIBBON_URL = 'uploads/WhatsApp_Image_2026-11-19_at_06.24.24.jpeg';
const RECIPES_CONTINUOUS_ART_URL = 'uploads/WhatsApp_Image_2026-11-19_at_06.24.24__1_.jpeg';
const HOME_HERO_ART_URL = 'uploads/WhatsApp_Image_2026-11-19_at_07.28.33.jpeg';
const CLEAN_FOOTER_ART_URL = 'uploads/WhatsApp_Image_2026-11-19_at_07.28.33.jpeg';
const PASTA_ROLLER_ART_URL = 'uploads/WhatsApp_Image_2026-11-19_at_06.24.24.jpeg';
const PASTA_TOMATO_ART_URL = 'uploads/WhatsApp_Image_2026-11-19_at_06.24.25__1_.jpeg';
const BOOKSHELF_IMG_URL = '/assets/aistudio/image_ca300c8c.png';
const LIBRARY_MODULES_ART_URL = '/assets/aistudio/WhatsApp_Image_2026-11-14_at_00.43.15_14d8a7c9.jpeg';

const PROVISIONAL_ACCOUNTS_KEY = 'fervec-accounts-v1';

function findProvisionalAccountByEmail(email = '') {
  const clean = String(email || '').trim().toLowerCase();
  if (!clean) return null;
  try {
    const raw = JSON.parse(localStorage.getItem(PROVISIONAL_ACCOUNTS_KEY) || '[]');
    if (!Array.isArray(raw)) return null;
    return raw.find((a) => String(a?.email || '').trim().toLowerCase() === clean) || null;
  } catch {
    return null;
  }
}

async function digestPasswordProvisionalLocal(email = '', password = '') {
  const normalized = `fervec-p1:${String(email || '').trim().toLowerCase()}:${String(password || '')}`;
  if (typeof globalThis.crypto !== 'undefined' && globalThis.crypto.subtle) {
    const encoded = new TextEncoder().encode(normalized);
    const digest = await globalThis.crypto.subtle.digest('SHA-256', encoded);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  let hash = 2166136261;
  for (let i = 0; i < normalized.length; i += 1) {
    hash ^= normalized.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `fnv-${(hash >>> 0).toString(16)}`;
}

function hasLibraryEntitlement(account) {
  if (!account || typeof account !== 'object') return false;
  const cleanEmail = String(account.email || '').trim().toLowerCase();
  if (account.role === 'admin' || cleanEmail === 'fervecrgastronomia@gmail.com') return true;
  return Array.isArray(account.entitledCourses) && account.entitledCourses.length > 0;
}

const _autostartParam = new URLSearchParams(location.search).get('autostart');
const _portalEmbedded = Boolean(window.__fervecPortalEmbedded);
const _portalInitAction = window.__fervecLibraryInitialAction || 'default';
const _savedSession = _autostartParam === 'demo' || _autostartParam === '1' ? null : readSavedSession(localStorage);
const _bootAuthUser = _savedSession;
const _wantsExplicitAuth = _portalEmbedded && (_portalInitAction === 'auth-login' || _portalInitAction === 'auth-register');
const _initialAuthMode = _bootAuthUser ? 'user' : _autostartParam === 'demo' || (_portalEmbedded && !_wantsExplicitAuth) ? 'demo' : 'none';
const _initialView = _initialAuthMode === 'none' ? 'login' : 'app';

const state = {
  view: _initialView,
  authMode: _initialAuthMode,
  currentUser: _bootAuthUser,
  loginTab: 'login',
  loginGateCta: '',
  demoLockNotice: '',
  page: 1,
  total: 74,
  pdf: null,
  pageText: {},
  titles: {},
  data: loadData(_initialAuthMode === 'demo', _bootAuthUser?.email || ''),
  active: _portalEmbedded && !_wantsExplicitAuth ? 'home' : 'library',
  flipping: false,
  modal: null,
  chat: [],
  chatRole: 'chef-tutor',
  chatIncludeContext: true,
  chatBusy: false,
  assistantTab: 'chat',
  voiceName: (() => {
    try {
      const saved = JSON.parse(localStorage.getItem('fervec-voice-config-v1') || 'null');
      const uri = String(saved?.voiceUri || '').replace(/^(neural:|gemini:)/i, '');
      if (['Antonio', 'Brian', 'Giuseppe', 'Andrew'].includes(uri)) return uri;
    } catch {}
    return 'Antonio';
  })(),
  voiceStatus: 'idle',
  voiceDetail: 'Toque no botão abaixo para dialogar por voz com o Chefe.',
  voiceTranscripts: [],
  voiceLevel: 0,
  speechListening: false,
  speechInterim: '',
  handsFreeMode: false,
  chefWelcomeActive: false,
  chefWelcomeTimer: null,
  demoChefWelcomed: false,
  learnerPage: 7,
  learnerText: '',
  learnFilter: 'all',
  noteSearch: '',
  notesSheet: 1,
  recipeSearch: '',
  recipeCategory: 'all',
  toastTimer: null,
  openTimerCards: {},
  openChecklistCards: {},
  timerInterval: null,
  promoSlide: 0,
  promoTimer: null,
  menuOpen: false,
  goalFormOpen: false,
  bookFullscreen: false,
  bookPageMode: 'single',
  bookZoom: 1,
  vinicolaCategory: 'brancos',
  vinicolaBottleIdx: 2,
  // Restaurants / OpenFreeMap + OpenStreetMap state
  geoConsent: false,
  geoStatus: 'prompt', // 'prompt' | 'locating' | 'granted' | 'denied' | 'error'
  geoError: '',
  userLocation: null,
  mapCenter: { ...DEFAULT_MAP_CENTER },
  restaurantQuery: '',
  restaurantCuisine: 'all',
  restaurantSort: 'featured',
  restaurants: [],
  restaurantsLoading: false,
  restaurantsError: '',
  restaurantsCacheNotice: '',
  restaurantsGeocodedLabel: '',
  selectedPlaceId: '',
  mapsConfigured: null,
};

if (state.authMode === 'user') {
  state.chat = sanitizeStoredChat(state.data.chat, 40);
  state.chatRole = state.data.chatRole || 'chef-tutor';
  state.chatIncludeContext = state.data.chatIncludeContext ?? true;
  state.voiceTranscripts = Array.isArray(state.data.voiceTranscripts) ? [...state.data.voiceTranscripts] : [];
  state.page = state.data.lastPage || 1;
}

const knownTitles = {
  1: 'Capa',
  2: 'Expediente editorial · Um guia autoral de aprendizagem',
  3: 'A massa como conhecimento',
  4: 'Seu percurso de aprendizagem',
  5: 'Roteiro do e-book',
  6: 'Antes de começar',
  7: 'A fórmula de partida',
  8: 'Mistura sem desperdício',
  9: 'Sovar e reconhecer o ponto',
  10: 'Descanso: menos resistência',
  11: 'Abrir, cortar e cozinhar',
  12: 'Farinha: o ingrediente estrutural',
  13: 'Semolina e trigo duro',
  14: 'Ovos: água, proteína e riqueza',
  15: 'Água e hidratação',
  16: 'Glúten: elasticidade e extensibilidade',
  17: 'Sova e desenvolvimento',
  18: 'Descanso, temperatura e ambiente',
  19: 'Uma cozinha, muitas tradições',
  20: 'Emilia-Romagna e a massa de ovos',
  21: 'Apúlia e as orecchiette',
  22: 'Toscana e massas enroladas',
  23: 'Tradição como repertório vivo',
  24: 'Como escolher o formato',
  25: 'Tagliatelle e fettuccine',
  26: 'Pappardelle e tagliolini',
  27: 'Pici: fios enrolados à mão',
  28: 'Orecchiette: formar a pequena concha',
  29: 'Cavatelli: cavidade com dois dedos',
  30: 'Strozzapreti: torcer e alongar',
  31: 'Lasagne: folhas para camadas',
  32: 'Gnocchi: outra família de textura',
  33: 'Espessura, secagem e organização',
  34: 'Recheio: textura antes de sabor',
  35: 'Distribuição e retirada do ar',
  36: 'Ravioli, tortelloni e cappelletti',
  37: 'Conservar e cozinhar recheadas',
  38: 'Como diagnosticar vazamentos',
  39: 'A água e a panela',
  40: 'Massa fresca: cozinhar por textura',
  41: 'Água do cozimento: ingrediente de ligação',
  42: 'Emulsão sem mistério',
  43: 'Molhos de tomate',
  44: 'Molhos de manteiga, ervas e queijo',
  45: 'Combinar formato e molho',
  46: 'Finalizar e servir',
  47: 'Como utilizar as 14 receitas',
  48: 'Formulações e padrão de leitura',
  49: 'Tagliatelle com tomate e manjericão',
  50: 'Pici com tomate e alho',
  51: 'Orecchiette com brócolis e grão-de-bico',
  52: 'Cavatelli com tomate e azeitonas',
  53: 'Fettuccine verde com manteiga e sálvia',
  54: 'Lasagne verdi com ragù e béchamel',
  55: 'Ravioli de ricota, espinafre e limão',
  56: 'Tortelloni de abóbora e parmesão',
  57: 'Pappardelle com cogumelos',
  58: 'Gnocchi de batata com tomate',
  59: 'Strozzapreti com abobrinha e tomate',
  60: 'Maltagliati em caldo de grão-de-bico',
  61: 'Tagliolini de limão e parmesão',
  62: 'Cappelletti em caldo suave',
  63: 'Uma semana de prática',
  64: 'Ficha de acompanhamento',
  65: 'Consolidar autonomia',
  66: 'Diagnóstico de erros',
  67: 'Higiene e armazenamento',
  68: 'Congelar e organizar a produção',
  69: 'Tabela de consulta da bancada',
  70: 'Palavras para reconhecer na cozinha',
  71: 'Obras centrais indicadas',
  72: 'Pesquisa, rastreabilidade e limites',
  73: 'Dossiê de produção editorial e integridade',
  74: 'Preservação, limitações e validação',
};

const navItems = [
  ['library', 'Minha Biblioteca'],
  ['home', 'Massas Italianas (Início)'],
  ['book', 'Meu Livro'],
  ['progress', 'Minha Evolução'],
  ['assistant', 'Converse com o Chef'],
  ['recipes', 'Minhas Receitas'],
  ['restaurants', 'Explorar Restaurantes Próximos'],
  ['notes', 'Caderno do Chef'],
  ['bookmarks', 'Marcadores'],
  ['learn', 'Modo Aprendiz'],
  ['ingredients', 'Laboratório de Ingredientes'],
  ['vinicola', 'Vinícola'],
];

const HOME_ACCESS_CARDS = [
  ['book', 'Meu Livro', 'Conteúdo do livro'],
  ['progress', 'Minha Evolução', 'Acompanhe seu progresso'],
  ['assistant', 'Converse com o Chef', 'Tire suas dúvidas'],
  ['recipes', 'Minhas Receitas', 'Suas preparações'],
  ['restaurants', 'Explorar Restaurantes Próximos', 'Boas opções na região'],
  ['notes', 'Caderno do Chef', 'Anotações e ideias'],
  ['bookmarks', 'Marcadores', 'Suas páginas salvas'],
  ['learn', 'Modo Aprendiz', 'Estude no seu ritmo'],
  ['ingredients', 'Laboratório de Ingredientes', 'Técnicas, funções e usos'],
];

function appIcon(name) {
  const icons = {
    menu: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
    cap: '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 3 2 8l10 5 8-4v6h2V8L12 3Zm-6 8.8V16c0 2.2 2.7 4 6 4s6-1.8 6-4v-4.2l-6 3-6-3Z"/></svg>',
    info: '<svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm1 15h-2v-6h2v6Zm0-8h-2V7h2v2Z"/></svg>',
    mail: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="m4 7 8 6 8-6"/></svg>',
    user: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M5 20a7 7 0 0 1 14 0"/></svg>',
    lock: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="10" width="16" height="10" rx="2.2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/><circle cx="12" cy="15" r="1.2" fill="currentColor"/></svg>',
    lockSolid:
      '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M17 9h-1V7a4 4 0 0 0-8 0v2H7a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2Zm-7-2a2 2 0 1 1 4 0v2h-4V7Zm3 8.7V18h-2v-2.3a1.8 1.8 0 1 1 2 0Z"/></svg>',
    eye: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.8-6.5 10-6.5S22 12 22 12s-3.8 6.5-10 6.5S2 12 2 12Z"/><circle cx="12" cy="12" r="2.8"/></svg>',
    eyeOff:
      '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3l18 18"/><path d="M10.6 5.7A9.8 9.8 0 0 1 12 5.5c6.2 0 10 6.5 10 6.5a17 17 0 0 1-4.1 4.8"/><path d="M6.6 6.6A17 17 0 0 0 2 12s3.8 6.5 10 6.5a9.7 9.7 0 0 0 4.4-1"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>',
    loginArrow:
      '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4"/><path d="M3 12h12"/><path d="m11 8 4 4-4 4"/></svg>',
    home: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-9.5Z"/></svg>',
    book: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M2 5.5A2.5 2.5 0 0 1 4.5 3H11v17H4.5A2.5 2.5 0 0 0 2 22V5.5Zm20 0A2.5 2.5 0 0 0 19.5 3H13v17h6.5a2.5 2.5 0 0 1 2.5 2V5.5Z"/></svg>',
    bookmarks:
      '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4.5L5 21V4a1 1 0 0 1 1-1Z"/></svg>',
    recipes:
      '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M4 13h16a7 7 0 0 1-14 0Zm4-5c0-1.5 1-2 1-3.5M12 8c0-1.5 1-2 1-3.5M16 8c0-1.5 1-2 1-3.5M3 13h18"/></svg>',
    notes:
      '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5Z"/><path d="M8 9h4M8 13h2"/></svg>',
    learn:
      '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"><path d="M7 18v-3.2A4.5 4.5 0 0 1 5.5 6.5a4.8 4.8 0 0 1 3.3-1.3 4.2 4.2 0 0 1 6.4 0 4.8 4.8 0 0 1 3.3 1.3A4.5 4.5 0 0 1 17 14.8V18H7Zm0 3h10"/></svg>',
    assistant:
      '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7 11V8.6A3.4 3.4 0 0 1 9.2 5.4a3.2 3.2 0 0 1 5.6 0A3.4 3.4 0 0 1 17 8.6V11Z" fill="currentColor" fill-opacity=".14"/><path d="M7.5 11h9v2.6a4.5 4.5 0 0 1-9 0V11Z"/><path d="M9.6 14.4c.7.5 1.5.5 2.4-.1.9.6 1.7.6 2.4.1"/><path d="M6.5 21a5.5 5.5 0 0 1 11 0"/></svg>',
    mic: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3M8 21h8"/></svg>',
    progress:
      '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 19h16M6 16v-3m4 3v-6m4 6v-4m4 4V7"/><path d="m5 10 5-4 4 3 5-5"/></svg>',
    restaurants:
      '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-6.5-5.7-6.5-11a6.5 6.5 0 1 1 13 0c0 5.3-6.5 11-6.5 11Z"/><circle cx="12" cy="10" r="2.4"/></svg>',
    collection:
      '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M3 6a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6Z"/></svg>',
    ingredients:
      '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3h6M10 3v5.5L5.2 17.6A2 2 0 0 0 7 20.5h10a2 2 0 0 0 1.8-2.9L14 8.5V3"/><path d="M7.5 15h9"/></svg>',
    edit: '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M3 17.25V21h3.75L17.8 9.94l-3.75-3.75L3 17.25Zm17.7-10.2a1 1 0 0 0 0-1.4l-2.34-2.35a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83Z"/></svg>',
    trash:
      '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3"/></svg>',
    clock: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    star: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20.2l1.1-6.2L3 9.6l6.2-.9L12 3Z"/></svg>',
    starFill:
      '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20.2l1.1-6.2L3 9.6l6.2-.9L12 3Z"/></svg>',
    target:
      '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/></svg>',
    fullscreen:
      '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>',
    exitFullscreen:
      '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/></svg>',
    singlePage:
      '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="3" width="12" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h4"/></svg>',
    upload:
      '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 16V4m0 0-4 4m4-4 4 4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/></svg>',
    directions:
      '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 2 10 10-10 10L2 12 12 2Z"/><path d="M9 15v-3a1 1 0 0 1 1-1h5m-2-2 2 2-2 2"/></svg>',
    gear:
      '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"/></svg>',
    library:
      '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19V5a2 2 0 0 1 2-2h2v16H6a2 2 0 0 1-2-2Zm5 0V3h4v16H9Zm6-14 4-1v15l-4 1V5Z"/></svg>',
  };
  return icons[name] || icons.book;
}

function starterRecipes() {
  const now = new Date().toISOString();
  return [
    {
      id: 'rec-carbonara',
      name: 'Carbonara Clássica',
      category: 'massas',
      description: 'Espaguete com ovos, queijo e pancetta.',
      servings: '4',
      time: '20 min',
      favorite: true,
      thumbVariant: 'carbonara',
      ingredients: [
        '400g de espaguete',
        '150g de pancetta em cubos',
        '4 gemas e 1 ovo inteiro',
        '100g de queijo pecorino ou parmesão',
        'Pimenta-do-reino moída na hora',
      ],
      date: now,
    },
    {
      id: 'rec-ravioli',
      name: 'Ravioli de Ricota',
      category: 'recheios',
      description: 'Massa recheada com ricota e ervas.',
      servings: '4',
      time: '30 min',
      favorite: true,
      thumbVariant: 'ravioli',
      ingredients: [
        '300g de massa fresca laminada',
        '250g de ricota fresca',
        'Manjericão e ervas frescas',
        'Molho de tomate rústico',
      ],
      date: now,
    },
    {
      id: 'rec-fettuccine',
      name: 'Fettuccine Alfredo',
      category: 'molhos',
      description: 'Massa ao molho cremoso de queijo.',
      servings: '2',
      time: '15 min',
      favorite: true,
      thumbVariant: 'fettuccine',
      ingredients: [
        '250g de fettuccine fresco',
        '60g de manteiga sem sal',
        '90g de parmesão ralado fino',
        'Água do cozimento da massa',
      ],
      date: now,
    },
  ];
}

function freshData() {
  return {
    lastPage: 1,
    visited: [],
    bookmarks: [],
    customBookmarkImage: '',
    recipes: starterRecipes(),
    seededDefaults: true,
    notes: [],
    completed: [],
    practiced: [],
    review: [],
    favorites: [],
    chat: [],
    chatRole: 'chef-tutor',
    chatIncludeContext: true,
    chefWelcomed: false,
    voiceTranscripts: [],
    timers: [],
    ingredientChecks: {},
    checklistSort: {},
    ingredientCategories: {},
    dailyGoals: normalizeDailyState(null),
  };
}

function isDemoMode() {
  return state.authMode !== 'user';
}

function redirectToRegister(featureMsg = '') {
  exitBookFullscreen(false);
  speechCtrl?.stop();
  liveVoiceClient?.stop();
  state.speechListening = false;
  state.handsFreeMode = false;
  state.speechInterim = '';
  state.chefWelcomeActive = false;
  state.view = 'login';
  state.loginTab = 'login';
  state.loginGateCta = 'register';
  state.menuOpen = false;
  state.demoLockNotice =
    featureMsg ||
    'O modo demonstração permite apenas visualizar as telas. Faça seu cadastro no site FerveC e entre com o e-mail que possui o curso adquirido.';
  render();
  toast('Entre com sua conta após adquirir o curso no site FerveC.', true);
}

function loadData(isDemo = false, email = '') {
  if (isDemo) return freshData();
  try {
    const key = getUserStorageKey(email);
    const raw = JSON.parse(localStorage.getItem(key) || '{}');
    const parsed = { ...freshData(), ...raw };
    if (!Array.isArray(parsed.timers)) parsed.timers = [];
    if (typeof parsed.customBookmarkImage !== 'string') parsed.customBookmarkImage = '';
    parsed.chat = sanitizeStoredChat(parsed.chat, 40);
    parsed.chatRole = getChatRole(parsed.chatRole).id;
    parsed.chatIncludeContext = typeof parsed.chatIncludeContext === 'boolean' ? parsed.chatIncludeContext : true;
    parsed.chefWelcomed = !!parsed.chefWelcomed;
    parsed.voiceTranscripts = Array.isArray(parsed.voiceTranscripts) ? parsed.voiceTranscripts.slice(-30) : [];
    if (!parsed.ingredientChecks || typeof parsed.ingredientChecks !== 'object' || Array.isArray(parsed.ingredientChecks)) {
      parsed.ingredientChecks = {};
    }
    if (!parsed.checklistSort || typeof parsed.checklistSort !== 'object' || Array.isArray(parsed.checklistSort)) {
      parsed.checklistSort = {};
    }
    if (
      !parsed.ingredientCategories ||
      typeof parsed.ingredientCategories !== 'object' ||
      Array.isArray(parsed.ingredientCategories)
    ) {
      parsed.ingredientCategories = {};
    }
    if (!raw.seededDefaults && (!Array.isArray(raw.recipes) || raw.recipes.length === 0)) {
      parsed.recipes = starterRecipes();
      parsed.seededDefaults = true;
    }
    parsed.dailyGoals = normalizeDailyState(parsed.dailyGoals);
    return parsed;
  } catch {
    return freshData();
  }
}

let _dbSyncTimer = null;

function getSessionToken() {
  return String(state.currentUser?.token || readSavedSession(localStorage)?.token || '').trim();
}

function mergeServerUserData(serverData) {
  if (!serverData || typeof serverData !== 'object') return;
  const merged = { ...freshData(), ...serverData };
  if (!Array.isArray(merged.recipes) || merged.recipes.length === 0) {
    merged.recipes = state.data.recipes?.length ? state.data.recipes : starterRecipes();
  }
  merged.chat = sanitizeStoredChat(merged.chat, 40);
  merged.chatRole = getChatRole(merged.chatRole).id;
  merged.chatIncludeContext = typeof merged.chatIncludeContext === 'boolean' ? merged.chatIncludeContext : true;
  merged.chefWelcomed = !!merged.chefWelcomed;
  merged.voiceTranscripts = Array.isArray(merged.voiceTranscripts) ? merged.voiceTranscripts.slice(-30) : [];
  merged.dailyGoals = normalizeDailyState(merged.dailyGoals);
  state.data = merged;
  state.chat = sanitizeStoredChat(merged.chat, 40);
  state.chatRole = merged.chatRole;
  state.chatIncludeContext = merged.chatIncludeContext;
  state.voiceTranscripts = [...merged.voiceTranscripts];
  state.page = merged.lastPage || 1;
  try {
    localStorage.setItem(getUserStorageKey(state.currentUser?.email || ''), JSON.stringify(state.data));
  } catch {}
}

function syncDataToServer(immediate = false) {
  if (isDemoMode()) return;
  const token = getSessionToken();
  if (!token || String(state.currentUser?.id || '').startsWith('perfil-') || state.currentUser?.isProvisional) return;
  clearTimeout(_dbSyncTimer);
  const run = async () => {
    try {
      await fetch('/api/user/data', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + token,
        },
        body: JSON.stringify({ data: state.data }),
      });
    } catch {}
  };
  if (immediate) run();
  else _dbSyncTimer = setTimeout(run, 600);
}

async function hydrateServerSession() {
  if (isDemoMode()) return;
  const token = getSessionToken();
  if (!token || String(state.currentUser?.id || '').startsWith('perfil-') || state.currentUser?.isProvisional) return;
  try {
    const res = await fetch('/api/auth/session', {
      headers: { Authorization: 'Bearer ' + token },
    });
    if (!res.ok) return;
    const payload = await res.json().catch(() => null);
    if (payload?.data) {
      mergeServerUserData(payload.data);
      if (state.view === 'app') renderView();
    }
  } catch {}
}

function persist() {
  if (isDemoMode()) return;
  try {
    const key = getUserStorageKey(state.currentUser?.email || '');
    localStorage.setItem(key, JSON.stringify(state.data));
  } catch {
    toast('Não foi possível salvar neste navegador.', true);
  }
  syncDataToServer(false);
}

function escapeHtml(v = '') {
  return String(v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function toast(message, error = false) {
  const t = document.querySelector('#toast');
  if (!t) return;
  t.textContent = message;
  t.className = error ? 'show error' : 'show';
  clearTimeout(state.toastTimer);
  state.toastTimer = setTimeout(() => (t.className = ''), 3000);
}

function iconButton(label, act, icon, cls = '') {
  return (
    '<button class="icon-button ' +
    cls +
    '" data-action="' +
    act +
    '" aria-label="' +
    escapeHtml(label) +
    '" title="' +
    escapeHtml(label) +
    '">' +
    icon +
    '</button>'
  );
}

function fervecBrandLogoSvg() {
  return (
    '<div class="fervec-brand-lockup" aria-label="FerveC Gastronomia">' +
    '<img class="fervec-logo-img" src="/assets/fervec-logo-black.png" alt="FerveC Gastronomia" draggable="false">' +
    '</div>'
  );
}

function fervecInlineLogoMarkup() {
  return (
    '<div class="fervec-inline-logo" aria-label="FerveC Gastronomia">' +
    '<img class="fervec-inline-img" src="/assets/fervec-logo-black.png" alt="FerveC Gastronomia" draggable="false">' +
    '</div>'
  );
}

function fervecHeaderMarkup(title, subtitle) {
  return (
    '<section class="fervec-sub-hero is-unified">' +
    '<div class="fervec-sub-top-band" aria-hidden="true">' +
    '<img src="' +
    RECIPES_CONTINUOUS_ART_URL +
    '" alt="" class="fervec-sub-top-img">' +
    '</div>' +
    '<div class="fervec-sub-title-block">' +
    '<h1 class="fervec-page-heading">' +
    escapeHtml(title) +
    '</h1>' +
    '<p class="fervec-page-subtitle">' +
    escapeHtml(subtitle) +
    '</p>' +
    '<div class="italian-rule compact-rule"><span></span><span></span><span></span></div>' +
    '</div>' +
    '</section>'
  );
}

function fervecFooterMarkup(quote = '“Cada página, uma descoberta. Cada preparação, uma conquista.”') {
  return (
    '<footer class="fervec-sub-footer">' +
    '<div class="italian-rule compact-rule"><span></span><span></span><span></span></div>' +
    '<p class="fervec-footer-quote">' +
    escapeHtml(quote) +
    '</p>' +
    '<div class="fervec-social-links" aria-label="Redes sociais FerveC Gastronomia">' +
    '<a class="fervec-social-pill" href="https://www.instagram.com/fervecgastronomia?jplx=MXVkbGljZW81ZWZv" target="_blank" rel="noopener noreferrer" aria-label="Instagram FerveC Gastronomia">' +
    '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>' +
    '<span>Instagram</span></a>' +
    '<a class="fervec-social-pill" href="https://www.tiktok.com/@fervec.gastronomi" target="_blank" rel="noopener noreferrer" aria-label="TikTok FerveC Gastronomia">' +
    '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M16.6 5.82A4.28 4.28 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 0 1-2.59 2.5 2.59 2.59 0 0 1-2.6-2.59 2.6 2.6 0 0 1 3.4-2.47V9.66a5.69 5.69 0 0 0-6.5 5.65A5.7 5.7 0 0 0 9.86 21a5.7 5.7 0 0 0 5.68-5.69V9.01a7.35 7.35 0 0 0 4.3 1.38V7.3s-1.88.09-3.24-1.48Z"/></svg>' +
    '<span>TikTok</span></a>' +
    '</div>' +
    '<div class="recipes-footer-art">' +
    '<img src="' +
    CLEAN_FOOTER_ART_URL +
    '" alt="Ingredientes da culinária italiana FerveC">' +
    '</div>' +
    '</footer>'
  );
}

function realisticButtonIcon(id) {
  const icons = {
    book:
      '<svg viewBox="0 0 44 44" aria-hidden="true">' +
      '<rect x="5" y="9" width="34" height="27" rx="3" fill="#7c1d1a" stroke="#47100e" stroke-width="1.5"/>' +
      '<path d="M7 10.5h14.5c.8 0 1.5.7 1.5 1.5v22c-2-.9-4.5-1.2-7-1.2H7V10.5Z" fill="#fffaf0" stroke="#7d5c33" stroke-width="1.2"/>' +
      '<path d="M37 10.5H22.5c-.8 0-1.5.7-1.5 1.5v22c2-.9 4.5-1.2 7-1.2H37V10.5Z" fill="#f6ead0" stroke="#7d5c33" stroke-width="1.2"/>' +
      '<path d="M10 15h8M10 19h8M10 23h7M10 27h6M26 15h8M26 19h8M26 23h7M26 27h6" stroke="#b9975b" stroke-width="1.4" stroke-linecap="round"/>' +
      '<path d="M29 10.5v13l-2-1.8-2 1.8v-13Z" fill="#9c221e" stroke="#611210" stroke-width=".9"/>' +
      '</svg>',
    progress:
      '<svg viewBox="0 0 44 44" aria-hidden="true">' +
      '<rect x="5" y="7" width="34" height="30" rx="5" fill="#fdf6e3" stroke="#9b7841" stroke-width="1.6"/>' +
      '<path d="M9 32h26" stroke="#5a381d" stroke-width="1.6" stroke-linecap="round"/>' +
      '<rect x="11" y="23" width="4.5" height="9" rx="1.2" fill="#c99c4e" stroke="#6d4b1f" stroke-width="1"/>' +
      '<rect x="18" y="18" width="4.5" height="14" rx="1.2" fill="#49633c" stroke="#2c4123" stroke-width="1"/>' +
      '<rect x="25" y="13" width="4.5" height="19" rx="1.2" fill="#7c1d1a" stroke="#4f110f" stroke-width="1"/>' +
      '<path d="m11 19 8-6 6 2 8-7" fill="none" stroke="#b57a21" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<path d="M29 8h4v4" fill="none" stroke="#b57a21" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
      '</svg>',
    assistant:
      '<svg viewBox="0 0 44 44" aria-hidden="true">' +
      '<circle cx="22" cy="24" r="14" fill="#f7e4be" stroke="#a68149" stroke-width="1.3"/>' +
      '<path d="M12.5 18.5V15c0-3.2 2.4-5.2 5.2-5.4 1.2-2.2 3-3.1 4.3-3.1s3.1.9 4.3 3.1c2.8.2 5.2 2.2 5.2 5.4v3.5Z" fill="#fffdf8" stroke="#5c361a" stroke-width="1.5"/>' +
      '<path d="M14 18.5h16v3.2H14z" fill="#7c1d1a" stroke="#521210" stroke-width="1.1"/>' +
      '<circle cx="22" cy="26.2" r="5.5" fill="#f3c59b" stroke="#694225" stroke-width="1.3"/>' +
      '<path d="M17.5 27.6c1.5 1.1 3 .9 4.5-.2 1.5 1.1 3 1.3 4.5.2" fill="none" stroke="#3c2212" stroke-width="1.7" stroke-linecap="round"/>' +
      '<path d="M13 37.5c1.6-4.2 5-6 9-6s7.4 1.8 9 6Z" fill="#3a2c25" stroke="#221712" stroke-width="1.2"/>' +
      '</svg>',
    recipes:
      '<svg viewBox="0 0 44 44" aria-hidden="true">' +
      '<ellipse cx="22" cy="26" rx="16" ry="5.5" fill="#efe2c4" stroke="#6c4924" stroke-width="1.5"/>' +
      '<path d="M7 26c1.8 6.8 7.6 10.5 15 10.5S35.2 32.8 37 26H7Z" fill="#fffaf0" stroke="#6c4924" stroke-width="1.5"/>' +
      '<path d="M11 25.5c3-5.5 19-5.5 22 0" fill="#e5b34c" stroke="#996b1f" stroke-width="1.3"/>' +
      '<path d="M13 24c4-3.8 14-3.8 18 0" fill="none" stroke="#c98f28" stroke-width="1.7" stroke-linecap="round"/>' +
      '<ellipse cx="22" cy="21.5" rx="5.6" ry="2.8" fill="#b73228" stroke="#6e1612" stroke-width="1.1"/>' +
      '<path d="M22 18.6c-2-2.4-4.6-1.8-5.2-.1 1.9.6 3.5.7 5.2 1.1 1.7-.4 3.3-.5 5.2-1.1-.6-1.7-3.2-2.3-5.2.1Z" fill="#3d6b2b"/>' +
      '<path d="M16 13c0-1.6 1.2-2.2 1.2-3.8M22 12c0-1.6 1.2-2.2 1.2-3.8M28 13c0-1.6 1.2-2.2 1.2-3.8" stroke="#a68149" stroke-width="1.5" stroke-linecap="round" fill="none"/>' +
      '</svg>',
    restaurants:
      '<svg viewBox="0 0 44 44" aria-hidden="true">' +
      '<path d="M7 13.5 16 10l12 3.5L37 10v22.5L28 36l-12-3.5L7 36V13.5Z" fill="#f7e9c7" stroke="#8a6635" stroke-width="1.4"/>' +
      '<path d="M16 10v22.5M28 13.5V36" stroke="#c9ab6f" stroke-width="1.2" stroke-dasharray="2.5 2"/>' +
      '<path d="M22 33.5s-8.5-7.4-8.5-14a8.5 8.5 0 1 1 17 0c0 6.6-8.5 14-8.5 14Z" fill="#8b1d1a" stroke="#4f100e" stroke-width="1.5"/>' +
      '<circle cx="22" cy="19.2" r="5" fill="#fffaf0"/>' +
      '<path d="M20.2 16.5v5.4M19.3 16.5v2M21.1 16.5v2M24 16.5v5.4M24 16.5c1 .4 1 2 0 2.5" stroke="#791d1b" stroke-width="1.15" stroke-linecap="round"/>' +
      '</svg>',
    notes:
      '<svg viewBox="0 0 44 44" aria-hidden="true">' +
      '<rect x="9" y="7" width="23" height="30" rx="2.5" fill="#fdf6e2" stroke="#6c4824" stroke-width="1.6"/>' +
      '<path d="M14 7v30" stroke="#c96b64" stroke-width="1.3"/>' +
      '<path d="M16.5 14h12M16.5 19h12M16.5 24h10M16.5 29h8" stroke="#bfa26c" stroke-width="1.4" stroke-linecap="round"/>' +
      '<circle cx="9" cy="12" r="1.7" fill="#7c5b34"/><circle cx="9" cy="18" r="1.7" fill="#7c5b34"/><circle cx="9" cy="24" r="1.7" fill="#7c5b34"/><circle cx="9" cy="30" r="1.7" fill="#7c5b34"/>' +
      '<path d="m26 30 9.5-13.5 3 2.1L29 32.1l-4 1.3 1-3.4Z" fill="#d99f38" stroke="#5c3818" stroke-width="1.3" stroke-linejoin="round"/>' +
      '<path d="m34 18.6 3 2.1" stroke="#7c1d1a" stroke-width="2"/>' +
      '</svg>',
    bookmarks:
      '<svg viewBox="0 0 44 44" aria-hidden="true">' +
      '<rect x="9" y="8" width="26" height="29" rx="2.5" fill="#efe0bc" stroke="#8c6835" stroke-width="1.4"/>' +
      '<path d="M15.5 6h13v30.5L22 31.2l-6.5 5.3V6Z" fill="#8b1d1a" stroke="#4f100e" stroke-width="1.5" stroke-linejoin="round"/>' +
      '<path d="M18 9h8v22.5L22 28l-4 3.5V9Z" fill="none" stroke="#e2c37d" stroke-width="1.2"/>' +
      '<circle cx="22" cy="16" r="3.2" fill="#f4d58a" stroke="#661411" stroke-width="1"/>' +
      '</svg>',
    learn:
      '<svg viewBox="0 0 44 44" aria-hidden="true">' +
      '<path d="M6 17.5 22 10l16 7.5-16 7.5L6 17.5Z" fill="#591815" stroke="#360d0b" stroke-width="1.4" stroke-linejoin="round"/>' +
      '<path d="M12.5 20.8v7c0 2.8 4.2 5 9.5 5s9.5-2.2 9.5-5v-7L22 25l-9.5-4.2Z" fill="#7c1d1a" stroke="#47100e" stroke-width="1.4"/>' +
      '<path d="M35 19v9.5" stroke="#d9a841" stroke-width="1.8" stroke-linecap="round"/>' +
      '<circle cx="35" cy="29.5" r="2.2" fill="#e5b84f" stroke="#785016" stroke-width="1"/>' +
      '<rect x="11" y="33" width="22" height="5.5" rx="2.7" fill="#fff7e2" stroke="#8a6534" stroke-width="1.2"/>' +
      '<path d="M21 32.5h2.4v6.5H21z" fill="#b3302b"/>' +
      '</svg>',
    ingredients:
      '<svg viewBox="0 0 44 44" aria-hidden="true">' +
      '<path d="M18 7h8M19.5 7v7.5l-7.2 15.8A3 3 0 0 0 15 34.5h14a3 3 0 0 0 2.7-4.2L24.5 14.5V7" fill="#eef6f7" stroke="#476670" stroke-width="1.5" stroke-linejoin="round"/>' +
      '<path d="M14.2 26.5c3-1.4 5.8 1.2 8.2.2 2.4-1 4.8-1.4 7.4-.2l1.6 3.5a2.3 2.3 0 0 1-2.1 3.2H14.7a2.3 2.3 0 0 1-2.1-3.2l1.6-3.5Z" fill="#dfa53c" stroke="#996818" stroke-width="1.1"/>' +
      '<circle cx="19.5" cy="29.2" r="1.2" fill="#fff6d4"/><circle cx="24" cy="28" r="1.4" fill="#fff6d4"/>' +
      '<path d="M33 34c2-4.5 3.5-9.5 3.5-15" stroke="#6c8b4e" stroke-width="1.6" stroke-linecap="round" fill="none"/>' +
      '<ellipse cx="36.2" cy="18.5" rx="2" ry="3.5" transform="rotate(-15 36.2 18.5)" fill="#88a85c" stroke="#3c5a26" stroke-width="1"/>' +
      '<ellipse cx="34.5" cy="24" rx="1.8" ry="3" transform="rotate(20 34.5 24)" fill="#88a85c" stroke="#3c5a26" stroke-width="1"/>' +
      '</svg>',
  };
  return icons[id] || icons.book;
}

function cardThumbMediaMarkup(kind = 'flour', alt = '') {
  const media = {
    flour: { src: LAB_KITCHEN_IMG_URL, cls: 'crop-flour' },
    semolina: { src: LAB_KITCHEN_IMG_URL, cls: 'crop-semolina' },
    eggs: { src: LAB_KITCHEN_IMG_URL, cls: 'crop-eggs' },
    water: { src: LAB_KITCHEN_IMG_URL, cls: 'crop-water' },
    knead: { src: LAB_KITCHEN_IMG_URL, cls: 'crop-knead' },
    rest: { src: LAB_KITCHEN_IMG_URL, cls: 'crop-rest' },
    gluten: { src: PASTA_ROLLER_ART_URL, cls: 'crop-roller' },
    shapes: { src: PASTA_ROLLER_ART_URL, cls: 'crop-roller' },
    sauces: { src: PASTA_TOMATO_ART_URL, cls: 'crop-tomatoes' },
    notebook: { src: RECIPES_CONTINUOUS_ART_URL, cls: 'crop-dish' },
  };
  const cfg = media[kind] || media.flour;
  return (
    '<div class="culinary-thumb-frame">' +
    '<img src="' +
    cfg.src +
    '" alt="' +
    escapeHtml(alt) +
    '" class="culinary-thumb-img ' +
    cfg.cls +
    '">' +
    '</div>'
  );
}

function cardWatermarkBgMarkup(kind = 'flour') {
  return '<div class="card-watermark-bg" aria-hidden="true">' + vintageIllustrationSvg(kind) + '</div>';
}

function vintageIllustrationSvg(kind = 'flour') {
  const svgs = {
    flour:
      '<svg viewBox="0 0 96 68" class="vintage-illus-svg" aria-hidden="true">' +
      '<path d="M25 56c-3-16 2-32 10-36l-3-6c6-2 16-2 22 0l-3 6c8 4 13 20 10 36H25Z" fill="#efe2c4" stroke="#5a381d" stroke-width="1.8"/>' +
      '<path d="M36 20c5 2 9 2 14 0M31 48c7 3 18 3 25 0" stroke="#8a6536" stroke-width="1.4" fill="none"/>' +
      '<path d="M38 35c3-5 8-5 11 0-3 4-8 4-11 0Z" fill="#c7a055" opacity=".7"/>' +
      '<path d="M58 56c3-7 13-11 24-7 6 2 8 7 8 7H58Z" fill="#fffaf0" stroke="#78522d" stroke-width="1.6"/>' +
      '<path d="M10 56h76" stroke="#5a381d" stroke-width="1.5" stroke-linecap="round"/>' +
      '</svg>',
    semolina:
      '<svg viewBox="0 0 96 68" class="vintage-illus-svg" aria-hidden="true">' +
      '<path d="M22 54c12-12 28-26 48-38" stroke="#8c6229" stroke-width="1.8" fill="none"/>' +
      '<path d="M32 56c12-10 28-22 44-30" stroke="#a67a38" stroke-width="1.6" fill="none"/>' +
      '<g fill="#dfb458" stroke="#69461a" stroke-width="1.2">' +
      '<ellipse cx="44" cy="34" rx="5" ry="2.6" transform="rotate(-35 44 34)"/>' +
      '<ellipse cx="52" cy="28" rx="5" ry="2.6" transform="rotate(-35 52 28)"/>' +
      '<ellipse cx="60" cy="22" rx="5" ry="2.6" transform="rotate(-35 60 22)"/>' +
      '<ellipse cx="50" cy="39" rx="5" ry="2.6" transform="rotate(15 50 39)"/>' +
      '<ellipse cx="59" cy="33" rx="5" ry="2.6" transform="rotate(15 59 33)"/>' +
      '</g>' +
      '<path d="M12 56h72" stroke="#5a381d" stroke-width="1.5" stroke-linecap="round"/>' +
      '</svg>',
    eggs:
      '<svg viewBox="0 0 96 68" class="vintage-illus-svg" aria-hidden="true">' +
      '<ellipse cx="35" cy="38" rx="13" ry="17" transform="rotate(-12 35 38)" fill="#f7e4be" stroke="#5a381d" stroke-width="1.8"/>' +
      '<path d="M52 46c0 7 9 11 20 11s20-4 20-11H52Z" fill="#ede0c4" stroke="#5a381d" stroke-width="1.8"/>' +
      '<ellipse cx="72" cy="45" rx="14" ry="4" fill="#fffaf0" stroke="#a88a55" stroke-width="1.2"/>' +
      '<circle cx="72" cy="45" r="5" fill="#d9871c" stroke="#791d1b" stroke-width="1.1"/>' +
      '<path d="M10 57h78" stroke="#5a381d" stroke-width="1.5" stroke-linecap="round"/>' +
      '</svg>',
    water:
      '<svg viewBox="0 0 96 68" class="vintage-illus-svg" aria-hidden="true">' +
      '<path d="M38 16h16l-2 9c7 5 9 15 5 25-2 4-6 6-11 6s-9-2-11-6c-4-10-2-20 5-25l-2-9Z" fill="#e5c8a2" stroke="#5a381d" stroke-width="1.8"/>' +
      '<path d="M32 28c-7 0-9 10-3 14" fill="none" stroke="#5a381d" stroke-width="1.8"/>' +
      '<path d="M62 24c8 6 12 16 12 24" stroke="#4f839c" stroke-width="2" stroke-dasharray="4 3" fill="none" stroke-linecap="round"/>' +
      '<path d="M74 52c0 3-3 5-5 5s-5-2-5-5c0-3 5-8 5-8s5 5 5 8Z" fill="#77adc4" stroke="#366275" stroke-width="1.3"/>' +
      '<path d="M12 58h74" stroke="#5a381d" stroke-width="1.5" stroke-linecap="round"/>' +
      '</svg>',
    gluten:
      '<svg viewBox="0 0 96 68" class="vintage-illus-svg" aria-hidden="true">' +
      '<circle cx="48" cy="34" r="20" fill="#f6e7c6" stroke="#791d1b" stroke-width="1.7"/>' +
      '<path d="M32 28c10 4 22 4 32 0M30 36c12-4 24-4 36 0M35 44c9 3 17 3 26 0" stroke="#9e6d36" stroke-width="1.5" fill="none"/>' +
      '<path d="M40 16c-3 12-3 24 0 36M48 14v40M56 16c3 12 3 24 0 36" stroke="#b89858" stroke-width="1.3" fill="none"/>' +
      '</svg>',
    knead:
      '<svg viewBox="0 0 96 68" class="vintage-illus-svg" aria-hidden="true">' +
      '<ellipse cx="48" cy="44" rx="22" ry="11" fill="#f3dfb2" stroke="#5a381d" stroke-width="1.8"/>' +
      '<rect x="14" y="21" width="68" height="9" rx="4.5" transform="rotate(-9 48 25)" fill="#c99b5d" stroke="#5a381d" stroke-width="1.7"/>' +
      '<rect x="7" y="25" width="10" height="5" rx="2.5" transform="rotate(-9 12 27)" fill="#791d1b"/>' +
      '<rect x="79" y="14" width="10" height="5" rx="2.5" transform="rotate(-9 84 16)" fill="#791d1b"/>' +
      '<path d="M12 56h72" stroke="#5a381d" stroke-width="1.5" stroke-linecap="round"/>' +
      '</svg>',
    rest:
      '<svg viewBox="0 0 96 68" class="vintage-illus-svg" aria-hidden="true">' +
      '<path d="M22 42c0 9 10 15 24 15s24-6 24-15H22Z" fill="#e9d3aa" stroke="#5a381d" stroke-width="1.8"/>' +
      '<path d="M20 42c4-11 48-11 52 0" fill="#fffaf0" stroke="#791d1b" stroke-width="1.6" stroke-dasharray="3 2"/>' +
      '<path d="M72 16h14M72 48h14M74 16l10 16-10 16M84 16l-10 16 10 16" stroke="#5a381d" stroke-width="1.5" fill="#f5e3b8"/>' +
      '</svg>',
    sauces:
      '<svg viewBox="0 0 96 68" class="vintage-illus-svg" aria-hidden="true">' +
      '<circle cx="34" cy="40" r="13" fill="#b33830" stroke="#5a1815" stroke-width="1.7"/>' +
      '<path d="M34 27c-3-4-7-3-9-1 3 1 6 2 9 4 3-2 6-3 9-4-2-2-6-3-9 1Z" fill="#49633c"/>' +
      '<rect x="54" y="24" width="22" height="22" rx="3" fill="#f7e3b6" stroke="#78522d" stroke-width="1.6" stroke-dasharray="2 2"/>' +
      '<circle cx="65" cy="35" r="5" fill="#e6c47a"/>' +
      '<path d="M12 56h74" stroke="#5a381d" stroke-width="1.5" stroke-linecap="round"/>' +
      '</svg>',
    shapes:
      '<svg viewBox="0 0 96 68" class="vintage-illus-svg" aria-hidden="true">' +
      '<ellipse cx="48" cy="43" rx="28" ry="11" fill="#fffaf0" stroke="#5a381d" stroke-width="1.7"/>' +
      '<path d="M29 42c6-12 32-12 38 0M33 39c6-9 24-9 30 0M38 36c5-6 15-6 20 0" stroke="#d9a841" stroke-width="2.6" fill="none" stroke-linecap="round"/>' +
      '<path d="M48 27c-4-4-8-3-9 0 3 1 6 1 9 2 3-1 6-1 9-2-1-3-5-4-9 0Z" fill="#49633c"/>' +
      '</svg>',
    notebook:
      '<svg viewBox="0 0 96 68" class="vintage-illus-svg" aria-hidden="true">' +
      '<path d="M20 16h26c2 0 4 2 4 4v32c0-2-2-4-4-4H20V16Zm56 0H50c-2 0-4 2-4 4v32c0-2 2-4 4-4h26V16Z" fill="#fffaf0" stroke="#5a381d" stroke-width="1.7"/>' +
      '<path d="M26 24h16M26 31h16M26 38h12M54 24h16M54 31h16M54 38h12" stroke="#b89858" stroke-width="1.4" stroke-linecap="round"/>' +
      '</svg>',
  };
  return svgs[kind] || svgs.flour;
}

function getStudyIllustrationKind(pageNum) {
  if (pageNum <= 11) return 'knead';
  if (pageNum === 12) return 'flour';
  if (pageNum === 13) return 'semolina';
  if (pageNum === 14) return 'eggs';
  if (pageNum === 15) return 'water';
  if (pageNum === 16) return 'gluten';
  if (pageNum <= 18) return 'rest';
  if (pageNum <= 33) return 'shapes';
  if (pageNum <= 46) return 'sauces';
  if (pageNum <= 62) return 'shapes';
  return 'notebook';
}

function globalTimerMarkup() {
  if (isDemoMode()) return '';
  const timers = state.data.timers || [];
  const done = timers.find((t) => t.status === 'done');
  if (done) {
    return (
      '<button id="global-timer-pill" class="global-timer-btn is-done" data-action="go" data-view="recipes" title="Timer de cozinha concluído: ' +
      escapeHtml(done.label) +
      '">⏱ Pronto!</button>'
    );
  }
  const running = timers
    .filter((t) => t.status === 'running')
    .sort((a, b) => getRemainingSeconds(a) - getRemainingSeconds(b))[0];
  if (running) {
    return (
      '<button id="global-timer-pill" class="global-timer-btn" data-action="go" data-view="recipes" title="Ver timers em Minhas Receitas">⏱ ' +
      formatCountdown(getRemainingSeconds(running)) +
      '</button>'
    );
  }
  return '';
}

function drawerMarkup() {
  const demo = isDemoMode();
  const footBtn = demo
    ? '<button type="button" class="btn btn-primary btn-small" data-action="go-site-register" style="width:100%;margin-bottom:6px">Cadastre-se no site FerveC</button><button type="button" class="btn btn-soft btn-small" data-action="logout" style="width:100%">Entrar com login</button>'
    : '<button type="button" class="btn btn-soft btn-small" data-action="logout" style="width:100%">Sair da conta</button>';
  return (
    '<div class="drawer-backdrop ' +
    (state.menuOpen ? 'open' : '') +
    '" data-action="close-menu"></div>' +
    '<nav class="app-drawer ' +
    (state.menuOpen ? 'open' : '') +
    '" id="app-drawer" aria-label="Menu principal" aria-hidden="' +
    (state.menuOpen ? 'false' : 'true') +
    '">' +
    '<div class="drawer-head">' +
    '<div class="top-brand"><img class="top-brand-logo" src="/assets/fervec-logo-black.png" alt="FerveC Gastronomia" draggable="false"><span><small>' +
    (demo ? 'Modo Demonstração' : escapeHtml(state.currentUser?.name || 'Gastronomia')) +
    '</small></span></div>' +
    '<button type="button" class="drawer-close" data-action="close-menu" aria-label="Fechar menu">×</button>' +
    '</div>' +
    '<div class="drawer-links">' +
    '<button type="button" class="drawer-btn" data-action="return-portal"><span class="drawer-ico">⇄</span><span>Voltar ao Portal FerveC</span></button>' +
    navItems
      .map(
        ([id, name]) =>
          '<button type="button" class="drawer-btn ' +
          (state.active === id ? 'active' : '') +
          '" data-action="go" data-view="' +
          id +
          '"><span class="drawer-ico">' +
          appIcon(id) +
          '</span><span>' +
          name +
          '</span></button>'
      )
      .join('') +
    '</div>' +
    '<div class="drawer-foot">' +
    footBtn +
    '</div></nav>'
  );
}

const MASTER_SUBPAGES = new Set([
  'library',
  'book',
  'vinicola',
  'assistant',
  'learn',
  'ingredients',
  'progress',
  'bookmarks',
  'notes',
  'restaurants',
  'recipes',
]);

function masterSubpageChromeMarkup(cfg) {
  const demo = isDemoMode();
  const userName = escapeHtml(state.currentUser?.name || 'Minha Conta');
  const hits = [
    '<button type="button" class="interactive-hit" style="top:' +
      cfg.menu[0] +
      '%;left:' +
      cfg.menu[1] +
      '%;width:' +
      cfg.menu[2] +
      '%;height:' +
      cfg.menu[3] +
      '%;border-radius:50%" data-action="toggle-menu" aria-label="Abrir menu"></button>',
  ];
  if (cfg.back) {
    hits.push(
      '<button type="button" class="interactive-hit" style="top:' +
        cfg.back[0] +
        '%;left:' +
        cfg.back[1] +
        '%;width:' +
        cfg.back[2] +
        '%;height:' +
        cfg.back[3] +
        '%;border-radius:99px" data-action="go" data-view="home" aria-label="Voltar ao Início"></button>'
    );
    if (cfg.portalHit) {
      hits.push(
        '<button type="button" class="interactive-hit" style="top:' +
          cfg.portalHit[0] +
          '%;left:' +
          cfg.portalHit[1] +
          '%;width:' +
          cfg.portalHit[2] +
          '%;height:' +
          cfg.portalHit[3] +
          '%;border-radius:99px" data-action="return-portal" aria-label="Voltar ao Portal FerveC"></button>'
      );
    } else if (!cfg.hidePortalPill) {
      hits.push(
        '<button type="button" class="library-portal-pill is-subpage-pill" data-action="return-portal" aria-label="Voltar ao Portal FerveC">⇄ Portal</button>'
      );
    }
  }
  if (cfg.register) {
    if (demo) {
      hits.push(
        '<button type="button" class="interactive-hit" style="top:' +
          cfg.register[0] +
          '%;left:' +
          cfg.register[1] +
          '%;width:' +
          cfg.register[2] +
          '%;height:' +
          cfg.register[3] +
          '%;border-radius:99px" data-action="go-register" aria-label="Cadastrar"></button>'
      );
    } else {
      hits.push(
        '<button type="button" class="master-auth-action-pill" style="top:' +
          cfg.register[0] +
          '%;left:' +
          cfg.register[1] +
          '%;width:' +
          cfg.register[2] +
          '%;height:' +
          cfg.register[3] +
          '%" data-action="logout" aria-label="Sair da conta">Sair</button>'
      );
    }
  } else if (!demo && !cfg.hideDefaultLogout) {
    hits.push(
      '<button type="button" class="master-auth-action-pill" style="top:0.45%;left:75%;width:21%;height:2.8%" data-action="logout" aria-label="Sair da conta">Sair</button>'
    );
  }
  if (cfg.banner) {
    if (demo) {
      hits.push(
        '<button type="button" class="interactive-hit" style="top:' +
          cfg.banner[0] +
          '%;left:' +
          cfg.banner[1] +
          '%;width:' +
          cfg.banner[2] +
          '%;height:' +
          cfg.banner[3] +
          '%;border-radius:99px" data-action="' +
          (cfg.bannerAction || 'go-register') +
          '" aria-label="' +
          escapeHtml(cfg.bannerLabel || 'Fazer cadastro') +
          '"></button>'
      );
    } else if (cfg.bannerStrip) {
      hits.push(
        '<div class="master-auth-banner-strip" style="top:' +
          cfg.bannerStrip[0] +
          '%;left:' +
          cfg.bannerStrip[1] +
          '%;width:' +
          cfg.bannerStrip[2] +
          '%;height:' +
          cfg.bannerStrip[3] +
          '%"><span><strong>' +
          userName +
          '</strong> · FerveC Gastronomia</span><span id="global-timer-slot">' +
          globalTimerMarkup() +
          '</span></div>'
      );
    }
  }
  return hits.join('');
}

function appShell() {
  const isHome = state.active === 'home';
  const isFs = state.active === 'book' && state.bookFullscreen;
  const isMasterSub = MASTER_SUBPAGES.has(state.active) && !isFs;
  const isLibrary = state.active === 'library';
  const demo = isDemoMode();
  document.body.classList.toggle('book-fullscreen-active', isFs);
  const demoBanner =
    demo && !isHome && !isMasterSub && !isFs
      ? '<aside class="demo-lock-banner" role="note"><span>🔒 <strong>Modo Demonstração (Visualização)</strong> — entre com uma conta que adquiriu o curso para liberar.</span><button type="button" class="btn btn-primary btn-small" data-action="go-site-register">Cadastre-se no site</button></aside>'
      : '';
  const header =
    isHome || isMasterSub || isFs
      ? ''
      : '<header class="sub-topbar"><div class="sub-top-left"><button type="button" class="menu-circle-btn sm" data-action="toggle-menu" aria-label="Abrir menu" aria-expanded="' +
        (state.menuOpen ? 'true' : 'false') +
        '">' +
        appIcon('menu') +
        '</button>' +
        (isLibrary
          ? '<span class="sub-top-label">FerveC Biblioteca</span>'
          : '<button type="button" class="btn btn-outline btn-small" data-action="go" data-view="home">← Início</button>') +
        '<button type="button" class="btn btn-outline btn-small" data-action="return-portal" title="Voltar ao Portal FerveC">⇄ Portal</button>' +
        '</div><div class="top-right"><span id="global-timer-slot">' +
        globalTimerMarkup() +
        '</span>' +
        (demo
          ? '<button type="button" class="btn btn-primary btn-small" data-action="go-login">Entrar</button>'
          : '<button type="button" class="btn btn-soft btn-small" data-action="logout">Sair</button>') +
        '</div></header>';
  return (
    '<div class="workspace app-portrait ' +
    (isHome ? 'is-home' : isMasterSub ? 'is-subpage is-master-subpage' : 'is-subpage') +
    (isFs ? ' is-book-fullscreen' : '') +
    (demo ? ' is-demo-locked' : '') +
    '">' +
    header +
    demoBanner +
    '<main class="main" id="main"></main>' +
    drawerMarkup() +
    '</div>'
  );
}

function loginMarkup() {
  const noticeHtml = state.demoLockNotice
    ? '<div class="login-lock-notice" role="status">' + escapeHtml(state.demoLockNotice) + '</div>'
    : '';
  const gateCtaHtml =
    state.loginGateCta === 'payments'
      ? '<button type="button" class="login-gate-cta" data-action="go-site-payments">Ir para Pagamentos e Adquirir Curso →</button>'
      : state.loginGateCta === 'register'
        ? '<button type="button" class="login-gate-cta" data-action="go-site-register">Fazer cadastro no site principal →</button>'
        : '';

  const formHtml =
    '<form id="login-form">' +
    '<div class="login-pill-field"><span class="pill-field-ico" aria-hidden="true">' +
    appIcon('mail') +
    '</span><input id="email" type="email" autocomplete="username" placeholder="E-mail" aria-label="E-mail" required></div>' +
    '<div class="login-pill-field"><span class="pill-field-ico" aria-hidden="true">' +
    appIcon('lock') +
    '</span><input id="password" type="password" autocomplete="current-password" placeholder="Senha" aria-label="Senha" required><button type="button" class="pill-eye-btn" data-action="password" aria-label="Mostrar senha" aria-pressed="false">' +
    appIcon('eyeOff') +
    '</button></div>' +
    '<div class="login-actions">' +
    '<button class="login-enter-btn" type="submit"><span aria-hidden="true">' +
    appIcon('loginArrow') +
    '</span><span>Entrar na Biblioteca</span></button>' +
    gateCtaHtml +
    '<button class="login-demo-btn" type="button" data-action="demo">Acessar demonstração (visualização)</button>' +
    '<button class="login-site-link" type="button" data-action="go-site-register">Ainda não tem cadastro? Cadastre-se no site FerveC →</button>' +
    '</div>' +
    '</form>';

  return (
    '<div class="login-shell login-portrait"><div class="login-art"><img src="/assets/aistudio/Tela_de_Login_Gastron_mica_Toscana__1__13f08628.png" alt="FerveC Gastronomia — Descubra, aprenda e crie na cozinha."></div>' +
    '<section class="login-box" aria-label="Entrar na Biblioteca FerveC">' +
    '<div class="login-pill-badge"><span class="login-pill-ico" aria-hidden="true">' +
    appIcon('lockSolid') +
    '</span><span>Biblioteca FerveC · Entrar</span></div>' +
    noticeHtml +
    formHtml +
    '<p class="login-note">O acesso completo à Biblioteca Interativa é exclusivo para alunos cadastrados no site cujo e-mail possua o curso adquirido.</p>' +
    '</section>' +
    '<footer class="login-footer-art"><img src="/assets/aistudio/Tela_de_Login_Gastron_mica_Toscana__1__13f08628.png" alt="Sua jornada na gastronomia começa aqui."></footer></div>'
  );
}

function hasChefBeenWelcomed() {
  return isDemoMode() ? !!state.demoChefWelcomed : !!state.data.chefWelcomed;
}

function playChefWelcomeChime() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return false;
    const ctx = new Ctx();
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    const now = ctx.currentTime;
    [
      [523.25, 0],
      [659.25, 0.11],
      [783.99, 0.22],
      [1046.5, 0.34],
    ].forEach(([freq, offset]) => {
      const osc = ctx.createOscillator(),
        gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.001, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.075, now + offset + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.38);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + offset);
      osc.stop(now + offset + 0.42);
    });
    return true;
  } catch {
    return false;
  }
}

let activeTtsAudio = null;
let activeTtsUrl = '';

function stopActiveTtsAudio() {
  if (activeTtsAudio) {
    try {
      activeTtsAudio.pause();
      activeTtsAudio.currentTime = 0;
    } catch {}
    activeTtsAudio = null;
  }
  if (activeTtsUrl) {
    try {
      URL.revokeObjectURL(activeTtsUrl);
    } catch {}
    activeTtsUrl = '';
  }
  try {
    window.speechSynthesis?.cancel();
  } catch {}
}

async function speakWithGeminiTts(text, voiceName = state.voiceName || 'Antonio', { resumeHandsFree = false } = {}) {
  const clean = String(text || '')
    .replace(/[*_`#>]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!clean) return false;
  stopActiveTtsAudio();

  const normalizedVoice = String(voiceName || '').replace(/^(neural:|gemini:)/i, '');
  const chosenVoice = ['Antonio', 'Brian', 'Giuseppe', 'Andrew'].includes(normalizedVoice)
    ? normalizedVoice
    : 'Antonio';

  let rateNum = 1.0;
  let pitchNum = 0.98;
  let volNum = 0.9;
  try {
    const cfg = JSON.parse(localStorage.getItem('fervec-voice-config-v1') || 'null');
    if (Number.isFinite(Number(cfg?.rate))) rateNum = Number(cfg.rate);
    if (Number.isFinite(Number(cfg?.pitch))) pitchNum = Number(cfg.pitch);
    if (Number.isFinite(Number(cfg?.volume))) volNum = Number(cfg.volume);
  } catch {}

  try {
    const res = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: clean, voiceName: chosenVoice, rate: rateNum, pitch: pitchNum }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data?.audioBase64) {
      const binary = atob(data.audioBase64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const mimeType = data.mimeType || 'audio/mpeg';
      const blob = new Blob([bytes], { type: mimeType });
      const url = URL.createObjectURL(blob);
      activeTtsUrl = url;
      const audio = new Audio(url);
      audio.volume = Math.min(1, Math.max(0.2, volNum));
      audio.playbackRate = mimeType.includes('mpeg') ? 1 : Math.min(1.25, Math.max(0.75, rateNum));
      if ('preservesPitch' in audio) audio.preservesPitch = true;
      activeTtsAudio = audio;
      audio.onended = () => {};
      await audio.play();
      return true;
    }
  } catch {}

  return speechCtrl.speakResponse(clean);
}

function playChefWelcomeAudio(speakGreeting = true) {
  playChefWelcomeChime();
  if (speakGreeting) {
    const greeting = buildChefWelcomeGreeting({
      userName: state.currentUser?.name || '',
      roleId: state.chatRole,
      page: state.page,
    });
    speakWithGeminiTts(greeting.spokenText, state.voiceName, { resumeHandsFree: false });
  }
}

function triggerChefFirstWelcome() {
  if (state.active !== 'assistant' || hasChefBeenWelcomed()) return;
  if (isDemoMode()) state.demoChefWelcomed = true;
  else {
    state.data.chefWelcomed = true;
    persist();
  }
  clearTimeout(state.chefWelcomeTimer);
  state.chefWelcomeActive = true;
  state.chefWelcomeTimer = setTimeout(() => {
    state.chefWelcomeActive = false;
    document.querySelectorAll('.is-welcoming').forEach((el) => el.classList.remove('is-welcoming'));
  }, 3800);
  playChefWelcomeAudio(false);
}

function normalizeViewId(id) {
  if (id === 'collection') return 'restaurants';
  return id;
}

function applyPromoSlideDom(idx) {
  const carousel = document.querySelector('#home-promo-carousel');
  if (!carousel) return;
  carousel.querySelectorAll('.promo-slide').forEach((slide, i) => {
    slide.classList.toggle('is-active', i === idx);
  });
  carousel.querySelectorAll('.promo-dot').forEach((dot, i) => {
    dot.classList.toggle('is-active', i === idx);
    dot.setAttribute('aria-pressed', i === idx ? 'true' : 'false');
  });
}

function stopHomePromoCarousel() {
  if (state.promoTimer) {
    clearInterval(state.promoTimer);
    state.promoTimer = null;
  }
}

function startHomePromoCarousel() {
  stopHomePromoCarousel();
  if (state.view !== 'app' || state.active !== 'home') return;
  state.promoTimer = setInterval(() => {
    if (state.view !== 'app' || state.active !== 'home') {
      stopHomePromoCarousel();
      return;
    }
    state.promoSlide = (state.promoSlide + 1) % 2;
    applyPromoSlideDom(state.promoSlide);
  }, 5000);
}

function setView(id) {
  const nextId = normalizeViewId(id);
  if (nextId !== 'book' && state.bookFullscreen) {
    exitBookFullscreen(false);
  }
  if (nextId !== 'assistant') {
    stopActiveTtsAudio();
    if (state.speechListening) {
      speechCtrl?.stop();
      state.speechListening = false;
      state.handsFreeMode = false;
      state.speechInterim = '';
    } else {
      try {
        window.speechSynthesis?.cancel();
      } catch {}
    }
    clearTimeout(state.chefWelcomeTimer);
    state.chefWelcomeActive = false;
  }
  if (nextId !== 'home') {
    stopHomePromoCarousel();
  }
  if (nextId !== 'restaurants') {
    resetRestaurantsMapRefs();
  }
  state.active = nextId;
  state.menuOpen = false;
  if (nextId === 'assistant') triggerChefFirstWelcome();
  render();
}

function render() {
  const root = document.querySelector('#app');
  if (state.view === 'login') {
    stopHomePromoCarousel();
    document.body.classList.remove('book-fullscreen-active');
    root.innerHTML = loginMarkup();
    return;
  }
  root.innerHTML = appShell();
  renderView();
}

function renderView() {
  const main = document.querySelector('#main');
  if (!main) return;
  const activeId = normalizeViewId(state.active);
  state.active = activeId;
  const isFs = activeId === 'book' && state.bookFullscreen;
  const isVisualPage = activeId === 'home' || (!isFs && activeId !== 'none');
  document.querySelector('.workspace')?.classList.toggle('is-book-fullscreen', isFs);
  document.body.classList.toggle('book-fullscreen-active', isFs);

  const views = {
    library: libraryView,
    home: homeView,
    book: readerView,
    bookmarks: bookmarksView,
    recipes: recipesView,
    notes: notesView,
    learn: learnView,
    ingredients: ingredientsView,
    assistant: assistantView,
    progress: progressView,
    restaurants: restaurantsView,
    vinicola: vinicolaView,
  };

  main.innerHTML =
    '<div class="content ' +
    (isVisualPage ? 'content-home' : '') +
    (isFs ? ' content-fullscreen' : '') +
    '">' +
    (views[activeId] || libraryView)() +
    '</div>';

  if (activeId === 'home') startHomePromoCarousel();
  else stopHomePromoCarousel();

  if (activeId === 'book') drawReader();
  if (activeId === 'assistant') {
    if (state.assistantTab === 'chat') renderChat();
    else renderVoiceTranscripts();
  }
  if (activeId === 'restaurants' && !isDemoMode()) {
    initRestaurantsExperience();
  }
}

function isMobile() {
  if (state.active === 'book' && state.bookFullscreen) {
    return !isSpreadLayout({
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      fullscreen: true,
      pageMode: state.bookPageMode || 'single',
    });
  }
  return matchMedia('(max-width:650px)').matches || (document.querySelector('#main')?.clientWidth || 460) < 680;
}

function pageTitle(n) {
  return knownTitles[n] || state.titles[n] || 'Página ' + n;
}

function dailyGoalsRingMarkup(summary, size = 'md') {
  const m = getCircularProgressMetrics(summary.pct, 26);
  return (
    '<div class="goals-ring-wrap size-' +
    size +
    ' ' +
    (m.isComplete ? 'is-complete' : '') +
    '" role="progressbar" aria-valuenow="' +
    m.pct +
    '" aria-valuemin="0" aria-valuemax="100" aria-label="Progresso das metas diárias: ' +
    m.pct +
    '%"><svg class="goals-ring-svg" viewBox="0 0 68 68" aria-hidden="true"><circle cx="34" cy="34" r="' +
    m.radius +
    '" class="goals-ring-track"/><circle cx="34" cy="34" r="' +
    m.radius +
    '" class="goals-ring-fill" stroke-dasharray="' +
    m.circumference +
    '" stroke-dashoffset="' +
    m.dashOffset +
    '"/></svg><span class="goals-ring-pct">' +
    m.pct +
    '%</span></div>'
  );
}

function libraryView() {
  const demo = isDemoMode();
  const userName = escapeHtml(state.currentUser?.name || 'Chef FerveC');
  const authGreetingOverlay = demo
    ? ''
    : '<div class="master-parchment-cover" style="top:23.0%;left:15.2%;width:80.5%;height:2.6%;background:#f8ecd0;font-weight:700;font-size:.82rem;color:#5c1916;font-family:var(--serif);display:flex;align-items:center">Olá, ' +
      userName +
      '</div>';

  return (
    '<div class="app-home-master-wrap">' +
    '<div class="master-image-canvas">' +
    '<img src="/assets/aistudio/WhatsApp_Image_2026-11-23_at_14.11.41__1__9a6e68e0.jpeg" alt="FerveC Gastronomia - Minha Biblioteca" class="master-ref-img">' +
    authGreetingOverlay +
    '<div class="interactive-overlay-layer">' +
    '<button type="button" class="library-portal-pill is-library-top ' +
    (demo ? '' : 'is-with-logout') +
    '" data-action="return-portal" aria-label="Voltar ao Portal FerveC">⇄ Portal</button>' +
    masterSubpageChromeMarkup({
      menu: [0.4, 5.5, 7.6, 3.0],
      back: null,
      register: null,
      banner: [4.1, 70.2, 24.6, 2.8],
      bannerAction: 'demo-info',
      bannerLabel: 'Como funciona',
      bannerStrip: [3.5, 2.0, 96.0, 3.7],
    }) +
    '<button type="button" class="interactive-hit" style="top:29.5%;left:4.5%;width:27.5%;height:15.5%;border-radius:8px" data-action="open-book-module" data-book="italian-pasta" aria-label="Abrir Massas Italianas em Casa"></button>' +
    '<button type="button" class="interactive-hit" style="top:42.2%;left:35.4%;width:58.8%;height:3.2%;border-radius:99px" data-action="open-book-module" data-book="italian-pasta" aria-label="Abrir Livro — Massas Italianas em Casa"></button>' +
    '<button type="button" class="interactive-hit" style="top:46.2%;left:4.5%;width:27.5%;height:15.4%;border-radius:8px" data-action="book-coming-soon" data-title="Cozinha Francesa: Técnicas Clássicas e Sabores Icônicos" aria-label="Cozinha Francesa — Em breve"></button>' +
    '<button type="button" class="interactive-hit" style="top:58.5%;left:35.4%;width:58.8%;height:3.1%;border-radius:99px" data-action="book-coming-soon" data-title="Cozinha Francesa: Técnicas Clássicas e Sabores Icônicos" aria-label="Cozinha Francesa — Em breve"></button>' +
    '<button type="button" class="interactive-hit" style="top:61.6%;left:4.5%;width:27.5%;height:15.0%;border-radius:8px" data-action="book-coming-soon" data-title="Culinária Japonesa: Sushi e Washoku" aria-label="Culinária Japonesa — Em breve"></button>' +
    '<button type="button" class="interactive-hit" style="top:73.5%;left:35.4%;width:58.8%;height:3.1%;border-radius:99px" data-action="book-coming-soon" data-title="Culinária Japonesa: Sushi e Washoku" aria-label="Culinária Japonesa — Em breve"></button>' +
    '<button type="button" class="interactive-hit" style="top:76.6%;left:4.5%;width:27.5%;height:14.8%;border-radius:8px" data-action="book-coming-soon" data-title="Cozinha Brasileira: Sabores e Cultura" aria-label="Cozinha Brasileira — Em breve"></button>' +
    '<button type="button" class="interactive-hit" style="top:87.4%;left:35.4%;width:58.8%;height:3.1%;border-radius:99px" data-action="book-coming-soon" data-title="Cozinha Brasileira: Sabores e Cultura" aria-label="Cozinha Brasileira — Em breve"></button>' +
    '</div>' +
    '</div>' +
    '</div>'
  );
}

const VINICOLA_DATA = {
  tintos: {
    title: 'Vinhos Tintos',
    desc: 'Encorpados e estruturados, perfeitos para massas com ragù lento, pancetta e queijos curados.',
    uvas: 'Sangiovese e Nebbiolo',
    origem: 'Toscana e Piemonte',
    temp: '16 a 18 °C',
    notas: 'Frutas vermelhas e especiarias',
    pairings: 'Tagliatelle ao Ragù Bolonhesa, Pappardelle com cogumelos, Carbonara clássica.',
  },
  brancos: {
    title: 'Vinho Branco',
    desc: 'Leve, refrescante e versátil, o vinho branco é perfeito para momentos especiais, harmonizando com frutos do mar, saladas e pratos leves.',
    uvas: 'Brancas',
    origem: 'Diversas regiões',
    temp: '8 a 12 °C',
    notas: 'Frutadas e cítricas',
    pairings: 'Ravioli de Ricota com Limão Siciliano, Linguine alle Vongole, Fettuccine Alfredo.',
  },
  roses: {
    title: 'Vinhos Rosés',
    desc: 'Equilíbrio elegante entre frescor aromático e leve estrutura para entradas e massas com tomate fresco.',
    uvas: 'Grenache e Sangiovese',
    origem: 'Provença e Itália',
    temp: '9 a 11 °C',
    notas: 'Morango fresco e flores',
    pairings: 'Massas ao pomodoro e manjericão, burrata fresca, focaccia artesanal.',
  },
  espumantes: {
    title: 'Espumantes',
    desc: 'Perlage fina e acidez vibrante que limpam o paladar em preparos cremosos e frituras leves.',
    uvas: 'Chardonnay e Glera',
    origem: 'Valdobbiadene e Serra Gaúcha',
    temp: '6 a 8 °C',
    notas: 'Maçã verde e brioche',
    pairings: 'Massas frescas recheadas na manteiga e sálvia, risotos e antepastos.',
  },
  estilos: {
    title: 'Estilos & Adega',
    desc: 'Guia prático de temperatura, taças ideais e decantação para valorizar cada garrafa na cozinha.',
    uvas: 'Cortes clássicos',
    origem: 'Velho e Novo Mundo',
    temp: 'Conforme o estilo',
    notas: 'Equilíbrio e terroir',
    pairings: 'Compare acidez, taninos e corpo com a untuosidade dos molhos artesanais.',
  },
};

function vinicolaView() {
  const activeCat = state.vinicolaCategory || 'brancos';
  const catInfo = VINICOLA_DATA[activeCat] || VINICOLA_DATA.brancos;
  const catOverlay =
    activeCat !== 'brancos'
      ? '<div class="vinicola-cat-spotlight-cover" aria-live="polite">' +
        '<h3>' +
        escapeHtml(catInfo.title) +
        '</h3>' +
        '<p>' +
        escapeHtml(catInfo.desc) +
        '</p>' +
        '<div class="vinicola-specs-mini">' +
        '<div><strong>Uvas</strong>' +
        escapeHtml(catInfo.uvas) +
        '</div>' +
        '<div><strong>Origem</strong>' +
        escapeHtml(catInfo.origem) +
        '</div>' +
        '<div><strong>Temp.</strong>' +
        escapeHtml(catInfo.temp) +
        '</div>' +
        '<div><strong>Notas</strong>' +
        escapeHtml(catInfo.notas) +
        '</div></div></div>'
      : '';

  const bottles = [
    { name: 'Vinho Tinto · Chile', cat: 'tintos', left: 10.6, width: 13.6 },
    { name: 'Vinho Tinto · Itália', cat: 'tintos', left: 26.8, width: 13.6 },
    { name: 'Vinho Branco · Itália', cat: 'brancos', left: 43.0, width: 13.6 },
    { name: 'Vinho Rosé · França', cat: 'roses', left: 59.2, width: 13.6 },
    { name: 'Espumante · Brasil', cat: 'espumantes', left: 75.4, width: 14.0 },
  ];

  const categories = [
    ['tintos', 4.0, 17.5, 'Tintos'],
    ['brancos', 22.5, 17.5, 'Brancos'],
    ['roses', 41.0, 17.0, 'Rosés'],
    ['espumantes', 59.0, 19.5, 'Espumantes'],
    ['estilos', 79.5, 17.0, 'Estilos'],
  ];

  return (
    '<div class="app-home-master-wrap">' +
    '<div class="master-image-canvas">' +
    '<img src="/assets/aistudio/WhatsApp_Image_2026-11-23_at_14.11.33__2__734c72d1.jpeg" alt="FerveC Gastronomia - Vinícola" class="master-ref-img">' +
    catOverlay +
    '<div class="interactive-overlay-layer">' +
    '<button type="button" class="interactive-hit" style="top:1.3%;left:37.2%;width:20.0%;height:3.2%;border-radius:99px" data-action="go" data-view="home" aria-label="Voltar para a Cozinha"></button>' +
    '<button type="button" class="interactive-hit" style="top:18.0%;left:5.5%;width:23.4%;height:3.2%;border-radius:99px" data-action="vinicola-selection" aria-label="Conheça nossa seleção"></button>' +
    categories
      .map(
        ([id, l, w, label]) =>
          '<button type="button" class="interactive-hit ' +
          (activeCat === id ? 'is-master-pill-active' : '') +
          '" style="top:23.1%;left:' +
          l +
          '%;width:' +
          w +
          '%;height:3.9%;border-radius:99px" data-action="vinicola-category" data-category="' +
          id +
          '" aria-pressed="' +
          (activeCat === id ? 'true' : 'false') +
          '" aria-label="Categoria ' +
          label +
          '"></button>'
      )
      .join('') +
    '<button type="button" class="interactive-hit" style="top:37.2%;left:5.2%;width:4.5%;height:3.4%;border-radius:50%" data-action="vinicola-shelf-nav" data-dir="-1" aria-label="Rótulo anterior"></button>' +
    '<button type="button" class="interactive-hit" style="top:37.2%;left:90.2%;width:4.5%;height:3.4%;border-radius:50%" data-action="vinicola-shelf-nav" data-dir="1" aria-label="Próximo rótulo"></button>' +
    bottles
      .map(
        (b, idx) =>
          '<button type="button" class="interactive-hit" style="top:29.5%;left:' +
          b.left +
          '%;width:' +
          b.width +
          '%;height:19.6%;border-radius:10px" data-action="vinicola-bottle" data-index="' +
          idx +
          '" data-category="' +
          b.cat +
          '" data-label="' +
          escapeHtml(b.name) +
          '" aria-label="' +
          escapeHtml(b.name) +
          '"></button>'
      )
      .join('') +
    '<button type="button" class="interactive-hit" style="top:64.5%;left:54.4%;width:22.4%;height:3.0%;border-radius:99px" data-action="vinicola-selection" aria-label="Conheça nossa seleção de vinhos"></button>' +
    '<button type="button" class="interactive-hit" style="top:76.6%;left:46.0%;width:22.8%;height:3.0%;border-radius:99px" data-action="vinicola-harmonizacao" aria-label="Explorar harmonizações"></button>' +
    '<button type="button" class="interactive-hit" style="top:82.6%;left:75.2%;width:21.0%;height:3.2%;border-radius:99px" data-action="go" data-view="library" aria-label="Explore nossos cursos"></button>' +
    '</div>' +
    '</div>' +
    '</div>'
  );
}

function openAccountModal() {
  const demo = isDemoMode();
  const userTxt = demo
    ? 'Você está navegando no Modo Demonstração.'
    : 'Conectado como ' + (state.currentUser?.name || 'Usuário') + ' (' + (state.currentUser?.email || '') + ').';
  openModal(
    'Opções & Biblioteca',
    '<div class="notice">' +
      escapeHtml(userTxt) +
      '</div><div class="account-modal-actions">' +
      '<button type="button" class="btn btn-primary" data-action="go" data-view="library" style="width:100%">📚 Ir para Minha Biblioteca (Trocar livro)</button>' +
      '<button type="button" class="btn btn-outline" data-action="return-portal" style="width:100%">⇄ Voltar ao Portal FerveC</button>' +
      (demo
        ? '<button type="button" class="btn btn-outline" data-action="go-site-register" style="width:100%">Cadastre-se no site FerveC →</button>'
        : '<button type="button" class="btn btn-soft" data-action="logout" style="width:100%">Sair da conta</button>') +
      '</div>'
  );
}

function homeView() {
  const demo = isDemoMode();
  const last = demo ? 1 : state.data.lastPage || 1;
  const total = state.total || 74;
  const readPct = Math.round((last / total) * 100);
  const completedCount = state.data.completed?.length || 0;
  const practicedCount = state.data.practiced?.length || 0;
  const reviewCount = state.data.review?.length || 0;
  const visitedPct = Math.round(((state.data.visited?.length || 0) / total) * 100);

  const authDynamicOverlays = demo
    ? ''
    : '<div class="auth-pill-badge" aria-hidden="true"><span>' +
      escapeHtml(state.currentUser?.name || 'Minha Conta') +
      '</span></div>' +
      '<div class="auth-continue-meta" aria-hidden="true"><strong>Página ' +
      last +
      ' de ' +
      total +
      '</strong><div class="auth-continue-bar"><div class="progress-track"><i style="width:' +
      readPct +
      '%"></i></div><span>' +
      readPct +
      '%</span></div></div>' +
      '<div class="auth-continue-btn-label" aria-hidden="true">Continuar Leitura →</div>' +
      '<div class="auth-progress-overlay" aria-hidden="true"><div class="auth-progress-ring">' +
      visitedPct +
      '%</div><ul class="auth-progress-stats"><li><span class="auth-dot ok">✓</span><span>Técnicas estudadas: ' +
      completedCount +
      '</span></li><li><span class="auth-dot ok">▶</span><span>Receitas praticadas: ' +
      practicedCount +
      '</span></li><li><span class="auth-dot warn">★</span><span>Para revisar: ' +
      reviewCount +
      '</span></li><li><span class="auth-dot cup">●</span><span>Concluídas: ' +
      completedCount +
      '</span></li></ul></div>';

  return (
    '<div class="app-home-master-wrap">' +
    '<div class="master-image-canvas">' +
    '<img src="/assets/aistudio/WhatsApp_Image_2026-11-23_at_14.11.41_c824d577.jpeg" alt="FerveC Gastronomia - Início" class="master-ref-img">' +
    authDynamicOverlays +
    '<div class="interactive-overlay-layer">' +
    /* Top Bar */
    '<button type="button" class="interactive-hit menu-hit" data-action="toggle-menu" aria-label="Menu"></button>' +
    '<button type="button" class="library-portal-pill" data-action="return-portal" aria-label="Voltar ao Portal FerveC">⇄ Portal</button>' +
    (demo
      ? '<button type="button" class="interactive-hit demo-pill-hit" data-action="go-register" aria-label="Modo Demonstração — Cadastrar"></button>'
      : '<button type="button" class="interactive-hit account-pill-hit" data-action="open-account-modal" aria-label="Minha Conta"></button>') +

    /* Continue / Cadastrar / Seu Progresso */
    '<button type="button" class="interactive-hit continue-cover-hit" data-action="' +
    (demo ? 'go" data-view="book' : 'open-page" data-page="' + last) +
    '" aria-label="Abrir livro"></button>' +
    '<button type="button" class="interactive-hit continue-hit" data-action="' +
    (demo ? 'go-register' : 'open-page" data-page="' + last) +
    '" aria-label="' +
    (demo ? 'Cadastrar' : 'Continuar leitura') +
    '"></button>' +
    '<button type="button" class="interactive-hit progress-card-hit" data-action="go" data-view="progress" aria-label="Seu Progresso"></button>' +

    /* 9 Access Cards */
    '<button type="button" class="interactive-hit access-hit-1" data-action="go" data-view="book" aria-label="Meu Livro"></button>' +
    '<button type="button" class="interactive-hit access-hit-2" data-action="go" data-view="progress" aria-label="Minha Evolução"></button>' +
    '<button type="button" class="interactive-hit access-hit-3" data-action="go" data-view="assistant" aria-label="Converse com o Chef"></button>' +
    '<button type="button" class="interactive-hit access-hit-4" data-action="go" data-view="recipes" aria-label="Minhas Receitas"></button>' +
    '<button type="button" class="interactive-hit access-hit-5" data-action="go" data-view="restaurants" aria-label="Restaurantes Próximos"></button>' +
    '<button type="button" class="interactive-hit access-hit-6" data-action="go" data-view="notes" aria-label="Caderno do Chef"></button>' +
    '<button type="button" class="interactive-hit access-hit-7" data-action="go" data-view="bookmarks" aria-label="Marcadores"></button>' +
    '<button type="button" class="interactive-hit access-hit-8" data-action="go" data-view="learn" aria-label="Modo Aprendiz"></button>' +
    '<button type="button" class="interactive-hit access-hit-9" data-action="go" data-view="ingredients" aria-label="Laboratório de Ingredientes"></button>' +

    /* Minha Biblioteca / Ver todos */
    '<button type="button" class="interactive-hit library-see-all-hit" data-action="go" data-view="library" aria-label="Ver todos os livros"></button>' +

    /* Bookshelf & Carrossel Vinícola / Massas Italianas */
    '<button type="button" class="interactive-hit shelf-book-1" data-action="go" data-view="book" aria-label="Massas Italianas em Casa"></button>' +
    '<button type="button" class="interactive-hit shelf-book-2" data-action="book-coming-soon" data-title="Cozinha Francesa" aria-label="Cozinha Francesa"></button>' +
    '<button type="button" class="interactive-hit shelf-book-3" data-action="book-coming-soon" data-title="Cozinha Brasileira" aria-label="Cozinha Brasileira"></button>' +
    '<div id="home-promo-carousel" class="home-promo-carousel" aria-label="Destaques Vinícola e Curso Massas Italianas">' +
    '<div class="promo-slide ' +
    (state.promoSlide !== 1 ? 'is-active' : '') +
    '" data-slide-idx="0">' +
    '<button type="button" class="promo-slide-hit promo-vinicola-slide" data-action="go" data-view="vinicola" aria-label="Ir para Vinícola">' +
    '<span class="promo-vinicola-chip">🍷 Vinícola · Abrir</span>' +
    '</button>' +
    '</div>' +
    '<div class="promo-slide ' +
    (state.promoSlide === 1 ? 'is-active' : '') +
    '" data-slide-idx="1">' +
    '<div class="promo-course-card">' +
    '<img src="/assets/aistudio/WhatsApp_Image_2026-11-14_at_03.20.34_e9928f28.jpeg" alt="Curso Massas Italianas FerveC" class="promo-course-img">' +
    '<div class="promo-course-overlay">' +
    '<span class="promo-course-eyebrow">CURSO COMPLETO</span>' +
    '<strong>Massas Italianas</strong>' +
    '<small>Do preparo ao prato!</small>' +
    '<button type="button" class="promo-course-cta" data-action="open-site-course-sales">Saber Mais →</button>' +
    '</div>' +
    '</div>' +
    '</div>' +
    '<div class="promo-dots" role="tablist" aria-label="Alternar destaque">' +
    '<button type="button" class="promo-dot ' +
    (state.promoSlide !== 1 ? 'is-active' : '') +
    '" data-action="set-promo-slide" data-slide="0" aria-pressed="' +
    (state.promoSlide !== 1 ? 'true' : 'false') +
    '" aria-label="Ver Vinícola"></button>' +
    '<button type="button" class="promo-dot ' +
    (state.promoSlide === 1 ? 'is-active' : '') +
    '" data-action="set-promo-slide" data-slide="1" aria-pressed="' +
    (state.promoSlide === 1 ? 'true' : 'false') +
    '" aria-label="Ver Curso Massas Italianas"></button>' +
    '</div>' +
    '</div>' +

    '</div>' +
    '</div>' +
    '</div>'
  );
}

function getActiveBookmarkRibbonSrc() {
  return state.data.customBookmarkImage || DEFAULT_BOOKMARK_RIBBON_URL;
}

function getBookSpreadPages() {
  const isTwoPage = !isMobile() && state.page + 1 <= state.total;
  return isTwoPage ? [state.page, state.page + 1] : [state.page];
}

function pageRibbonMarkup(pageNum, side = 'right') {
  if (!pageNum || !hasBookmark(pageNum)) return '';
  const isCustom = Boolean(state.data.customBookmarkImage);
  const src = getActiveBookmarkRibbonSrc();
  if (isCustom) {
    return (
      '<button type="button" class="page-bookmark-ribbon side-' +
      side +
      ' is-custom" data-action="toggle-bookmark-page" data-page="' +
      pageNum +
      '" title="Remover marcador da página ' +
      pageNum +
      '" aria-label="Marcador na página ' +
      pageNum +
      ' — clique para remover"><img src="' +
      src +
      '" alt="Marcador FerveC" class="bm-custom-img"></button>'
    );
  }
  return (
    '<button type="button" class="page-bookmark-ribbon side-' +
    side +
    '" data-action="toggle-bookmark-page" data-page="' +
    pageNum +
    '" title="Remover marcador da página ' +
    pageNum +
    '" aria-label="Marcador na página ' +
    pageNum +
    ' — clique para remover">' +
    '<span class="ribbon-crest" aria-hidden="true">' +
    '<svg viewBox="0 0 28 24" width="22" height="18"><path d="M6 15c-2.2 0-4-1.7-4-3.8 0-1.9 1.4-3.4 3.2-3.7C6 5 9.2 3.2 14 3.2S22 5 22.8 7.5c1.8.3 3.2 1.8 3.2 3.7 0 2.1-1.8 3.8-4 3.8H6Z" fill="#fffaf0" stroke="#e4c678" stroke-width="1.5"/><path d="M8 15v4c0 .8.6 1.4 1.4 1.4h9.2c.8 0 1.4-.6 1.4-1.4v-4" fill="#e9c87a"/></svg>' +
    '</span>' +
    '<span class="ribbon-brand">FerveC</span>' +
    '<span class="ribbon-pg">P.' +
    pageNum +
    '</span>' +
    '</button>'
  );
}

function bookBookmarkOverlaysMarkup() {
  const pages = getBookSpreadPages();
  const hasAny = pages.some((p) => hasBookmark(p));
  if (!hasAny) return '';
  const markedLabel = pages.filter((p) => hasBookmark(p)).join(' e ');
  return (
    '<div class="bookmark-seal-overlay" role="status"><span class="seal-check" aria-hidden="true">✓</span><span>Marcador na pág. ' +
    markedLabel +
    '</span></div>'
  );
}

function readerView() {
  const mobile = isMobile();
  const title = pageTitle(state.page);
  const spreadPages = getBookSpreadPages();
  const marked = spreadPages.some((p) => hasBookmark(p));
  const isFs = state.bookFullscreen;
  const pageMode = state.bookPageMode || 'single';
  const zoom = state.bookZoom || 1;
  const spreadLabel = getReaderSpreadLabel({ page: state.page, total: state.total, isSpread: isFs && !mobile });
  const leftRibbon = spreadPages[0] ? pageRibbonMarkup(spreadPages[0], spreadPages.length === 2 ? 'left' : 'right') : '';
  const rightRibbon = spreadPages[1] ? pageRibbonMarkup(spreadPages[1], 'right') : '';

  const topHtml = isFs
    ? '<div class="fs-reader-bar" id="fs-reader-bar"><div class="fs-page-meta"><strong>' +
      spreadLabel +
      '</strong><span>' +
      escapeHtml(title) +
      '</span></div><div class="fs-reader-actions"><button type="button" class="fs-tool-btn ' +
      (pageMode === 'single' ? 'is-active' : '') +
      '" data-action="fullscreen-single" aria-label="Exibir uma página em tela cheia" title="1 Página">1 Pág.</button><button type="button" class="fs-tool-btn ' +
      (pageMode === 'double' ? 'is-active' : '') +
      '" data-action="fullscreen-double" aria-label="Exibir duas páginas em tela cheia" title="2 Páginas">2 Págs.</button><button type="button" class="fs-tool-btn bookmark-toggle-btn ' +
      (marked ? 'is-marked' : '') +
      '" data-action="bookmark" aria-label="' +
      (marked ? 'Gerenciar ou remover marcador' : 'Adicionar marcador') +
      '" title="' +
      (marked ? 'Gerenciar marcador' : 'Adicionar marcador') +
      '">' +
      (marked ? 'Marcador ✓' : 'Marcador') +
      '</button><button type="button" class="fs-tool-btn fs-zoom-btn ' +
      (zoom > 1 ? 'is-active' : '') +
      '" data-action="cycle-book-zoom" aria-label="Alternar zoom da página (' +
      zoom +
      'x)" title="Ampliar página para melhor leitura">🔍 ' +
      zoom +
      '×</button><button type="button" class="fs-exit-btn" data-action="toggle-book-fullscreen" aria-label="Sair da tela cheia" title="Sair da tela cheia">' +
      appIcon('exitFullscreen') +
      '<span>Sair</span></button></div></div>'
    : '<div class="reader-top-bar"><div class="reader-page-caption"><span class="eyebrow">Massa Italiana · Página ' +
      state.page +
      ' de ' +
      state.total +
      '</span><p>' +
      escapeHtml(title) +
      '</p></div><div class="reader-tools"><button type="button" class="icon-button book-zoom-btn ' +
      (zoom > 1 ? 'is-active' : '') +
      '" data-action="cycle-book-zoom" aria-label="Ampliar página (' +
      zoom +
      'x)" title="Ampliar leitura (1×, 1.5×, 2×)">🔍 ' +
      zoom +
      '×</button><button type="button" class="icon-button bookmark-toggle-btn ' +
      (marked ? 'is-marked' : '') +
      '" data-action="bookmark" aria-label="' +
      (marked ? 'Remover marcador desta página' : 'Adicionar marcador') +
      '" title="' +
      (marked ? 'Remover marcador desta página' : 'Adicionar marcador') +
      '">' +
      (marked ? 'Marcador ✓' : 'Marcador') +
      '</button>' +
      iconButton('Anotar nesta página', 'note-page', '✎') +
      iconButton('Marcar para revisar', 'review-page', '⚑') +
      '</div></div><div class="fs-choice-box" role="region" aria-label="Modo Tela Cheia"><strong class="fs-choice-title">Modo Tela Cheia</strong><div class="fs-choice-actions"><button type="button" class="btn btn-primary btn-small fs-mode-btn" data-action="fullscreen-single" aria-label="Modo tela cheia com uma página">' +
      appIcon('singlePage') +
      '<span>1 Página</span></button><button type="button" class="btn btn-outline btn-small fs-mode-btn" data-action="fullscreen-double" aria-label="Modo tela cheia com duas páginas">' +
      appIcon('book') +
      '<span>2 Páginas</span></button></div></div>';

  const stageHtml =
    '<div class="book-reader-shell ' +
    (isFs ? 'is-fullscreen is-mode-' + pageMode : '') +
    '">' +
    topHtml +
    '<div class="book-wrap ' +
    (isFs ? 'is-fullscreen' : '') +
    '"><div id="book-bookmark-layer">' +
    bookBookmarkOverlaysMarkup() +
    '</div><div class="book-stage ' +
    (zoom > 1 ? 'is-zoomed' : '') +
    '" id="book-stage"><div class="book-page left ' +
    (mobile ? 'mobile-page' : '') +
    '" id="page-left"><canvas></canvas><div class="page-ribbon-slot" data-page-slot="left">' +
    leftRibbon +
    '</div></div><div class="book-gutter"></div><div class="book-page right" id="page-right"><canvas></canvas><div class="page-ribbon-slot" data-page-slot="right">' +
    rightRibbon +
    '</div></div><div class="book-shade"></div><div class="turn-sheet ' +
    (mobile ? 'mobile' : '') +
    '" id="turn-sheet"><div class="sheet-face sheet-front"><canvas id="turn-front"></canvas></div><div class="sheet-face sheet-back"><canvas id="turn-back"></canvas></div></div><button class="page-hit prev" data-action="prev" aria-label="Página anterior"></button><button class="page-hit next" data-action="next" aria-label="Próxima página"></button><div class="loading" id="book-loading">Abrindo as páginas originais do e-book…</div></div></div><div class="reader-bottom ' +
    (isFs ? 'is-fullscreen' : '') +
    '"><button class="btn btn-outline" data-action="prev">← Anterior</button><div class="reader-pager"><label class="reader-status" for="page-jump">Página</label><input id="page-jump" class="page-input" type="number" min="1" max="74" value="' +
    state.page +
    '" aria-label="Ir para página"><span class="reader-status">de 74</span></div><button class="btn btn-primary" data-action="next">Próxima →</button>' +
    (isFs ? '' : '<span class="reader-status">Arraste a folha ou use as setas ← →</span>') +
    '</div></div>';

  if (isFs) return stageHtml;

  return (
    '<div class="app-home-master-wrap">' +
    '<div class="master-image-canvas">' +
    '<img src="/assets/aistudio/WhatsApp_Image_2026-11-23_at_14.11.38_b6246790.jpeg" alt="FerveC Gastronomia - Meu Livro" class="master-ref-img">' +
    '<div class="reader-master-caption"><span class="eyebrow">MASSA ITALIANA · PÁGINA ' +
    state.page +
    ' DE ' +
    state.total +
    '</span><p>' +
    escapeHtml(title) +
    '</p></div>' +
    '<div class="reader-master-stage-wrap">' +
    '<div id="book-bookmark-layer">' +
    bookBookmarkOverlaysMarkup() +
    '</div>' +
    '<div class="book-stage ' +
    (zoom > 1 ? 'is-zoomed' : '') +
    '" id="book-stage"><div class="book-page left mobile-page" id="page-left"><canvas></canvas><div class="page-ribbon-slot" data-page-slot="left">' +
    leftRibbon +
    '</div></div><div class="book-gutter"></div><div class="book-page right" id="page-right" style="display:none"><canvas></canvas><div class="page-ribbon-slot" data-page-slot="right">' +
    rightRibbon +
    '</div></div><div class="book-shade"></div><div class="turn-sheet mobile" id="turn-sheet"><div class="sheet-face sheet-front"><canvas id="turn-front"></canvas></div><div class="sheet-face sheet-back"><canvas id="turn-back"></canvas></div></div><button class="page-hit prev" data-action="prev" aria-label="Página anterior"></button><button class="page-hit next" data-action="next" aria-label="Próxima página"></button><div class="loading" id="book-loading">Abrindo página original…</div></div>' +
    '</div>' +
    '<div class="interactive-overlay-layer">' +
    masterSubpageChromeMarkup({
      menu: [0.6, 3.8, 7.2, 3.7],
      back: [0.6, 12.0, 18.2, 3.7],
      portalHit: [0.6, 31.4, 15.6, 3.7],
      register: [0.6, 73.2, 23.6, 3.7],
      banner: [5.2, 75.2, 21.0, 2.9],
      bannerStrip: [4.6, 2.0, 96.0, 3.6],
    }) +
    '<button type="button" class="reader-master-zoom-pill ' +
    (zoom > 1 ? 'is-active' : '') +
    '" data-action="cycle-book-zoom" aria-label="Ampliar página (' +
    zoom +
    'x)">' +
    (zoom > 1 ? '🔍 ' + zoom + '×' : '') +
    '</button>' +
    '<button type="button" class="reader-master-marcador-btn ' +
    (marked ? 'is-marked' : '') +
    '" data-action="bookmark" aria-label="' +
    (marked ? 'Remover marcador desta página' : 'Adicionar marcador') +
    '">' +
    (marked ? 'Marcador ✓' : '') +
    '</button>' +
    '<button type="button" class="interactive-hit" style="top:24.7%;left:76.6%;width:8.6%;height:3.6%;border-radius:8px" data-action="note-page" aria-label="Anotar nesta página"></button>' +
    '<button type="button" class="interactive-hit" style="top:24.7%;left:86.6%;width:8.8%;height:3.6%;border-radius:8px" data-action="review-page" aria-label="Marcar para revisar"></button>' +
    '<button type="button" class="interactive-hit" style="top:33.8%;left:5.4%;width:22.0%;height:3.2%;border-radius:99px" data-action="fullscreen-single" aria-label="Modo tela cheia com uma página"></button>' +
    '<button type="button" class="interactive-hit" style="top:33.8%;left:29.0%;width:22.2%;height:3.2%;border-radius:99px" data-action="fullscreen-double" aria-label="Modo tela cheia com duas páginas"></button>' +
    '<button type="button" class="interactive-hit" style="top:89.8%;left:4.5%;width:18.2%;height:3.4%;border-radius:99px" data-action="prev" aria-label="Página anterior"></button>' +
    '<input id="page-jump" class="reader-master-pager-input" type="number" min="1" max="74" value="' +
    state.page +
    '" aria-label="Ir para página">' +
    '<button type="button" class="interactive-hit" style="top:89.8%;left:77.2%;width:18.6%;height:3.4%;border-radius:99px" data-action="next" aria-label="Próxima página"></button>' +
    '</div>' +
    '</div>' +
    '</div>'
  );
}

let pdfLoading = null;
const activeRenderTasks = new WeakMap();

async function ensurePDF() {
  if (state.pdf) return state.pdf;
  if (pdfLoading) return pdfLoading;
  const headers = {};
  const token = getSessionToken();
  if (token) headers.Authorization = 'Bearer ' + token;
  if (state.currentUser?.email) headers['x-fervec-user-email'] = state.currentUser.email;
  try {
    const sid = sessionStorage.getItem('fervec-client-session-id');
    if (sid) headers['x-fervec-session-id'] = sid;
  } catch {}
  pdfLoading = pdfjsLib
    .getDocument({
      url: BOOK_URL,
      httpHeaders: headers,
      withCredentials: true,
    })
    .promise.then((pdf) => {
      state.pdf = pdf;
      state.total = pdf.numPages;
      return pdf;
    })
    .catch((e) => {
      console.error(e);
      pdfLoading = null;
      state.pdf = null;
      toast('Entre na sua conta com acesso liberado para visualizar o e-book.', true);
      throw e;
    });
  return pdfLoading;
}

async function drawCanvas(canvas, n) {
  if (!canvas || n < 1 || n > state.total) return;
  try {
    const prevTask = activeRenderTasks.get(canvas);
    if (prevTask) {
      try {
        prevTask.cancel();
      } catch {}
    }
    const pdf = await ensurePDF(),
      pg = await pdf.getPage(n);
    const isFs = state.active === 'book' && state.bookFullscreen;
    const zoom = state.bookZoom || 1;
    const mobile = isMobile();
    const stage = canvas.closest('.book-stage');
    let rect;
    if (zoom > 1 && stage) {
      const sr = stage.getBoundingClientRect();
      const baseW = sr.width || 380;
      const baseH = sr.height || 520;
      rect = mobile
        ? { width: Math.max(baseW, 340), height: Math.max(baseH, 460) }
        : { width: Math.max((baseW - 12) / 2, 340), height: Math.max(baseH, 460) };
    } else {
      rect = canvas.parentElement.getBoundingClientRect();
    }
    const params = computePdfRenderParams({
      containerWidth: rect.width || 400,
      containerHeight: rect.height || 600,
      pageWidth: pg.view[2],
      pageHeight: pg.view[3],
      devicePixelRatio: window.devicePixelRatio || 1,
      fullscreen: isFs,
      zoom,
    });
    const vp = pg.getViewport({ scale: params.renderScale });
    canvas.width = Math.floor(vp.width);
    canvas.height = Math.floor(vp.height);
    if (zoom > 1) {
      canvas.style.width = params.cssWidth + 'px';
      canvas.style.height = params.cssHeight + 'px';
    } else {
      canvas.style.width = '100%';
      canvas.style.height = '100%';
    }
    const task = pg.render({ canvasContext: canvas.getContext('2d'), viewport: vp });
    activeRenderTasks.set(canvas, task);
    await task.promise;
    if (activeRenderTasks.get(canvas) === task) activeRenderTasks.delete(canvas);
    if (!state.pageText[n]) {
      const tc = await pg.getTextContent();
      const txt = tc.items
        .map((x) => x.str)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
      state.pageText[n] = txt;
      state.titles[n] = findTitle(txt, n);
    }
  } catch (e) {
    if (e?.name !== 'RenderingCancelledException') console.warn('PDF page', n, e);
  }
}

function findTitle(t, n) {
  if (n === 1) return 'Capa';
  let s = t
    .replace(/FERVEC GASTRONOMIA/gi, '')
    .replace(/Ilustração vintage[^.]*\./gi, '')
    .replace(/MASSA ITALIANA EM CASA[^.]*[•·]*/gi, '')
    .replace(/CAPÍTULO\s*\d+[^A-ZÀ-Ú]*/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  const m = s.match(/(?:^|\s)([A-ZÁÉÍÓÚÂÊÔÃÕÇ][A-ZÁÉÍÓÚÂÊÔÃÕÇ\s:–—-]{5,70})/);
  if (m) s = m[1].trim();
  return s ? Array.from(s)[0] + s.slice(1).toLowerCase() : 'Página ' + n;
}

async function drawReader() {
  const loading = document.querySelector('#book-loading');
  const mobile = isMobile(),
    p = state.page;
  const left = document.querySelector('#page-left'),
    right = document.querySelector('#page-right'),
    sheet = document.querySelector('#turn-sheet');
  if (!left) return;
  left.classList.toggle('mobile-page', mobile);
  const showRight = !mobile && p + 1 <= state.total;
  right.style.display = showRight ? '' : 'none';
  sheet.classList.toggle('mobile', mobile);
  if (loading) loading.style.display = 'block';
  const c1 = left.querySelector('canvas'),
    c2 = right.querySelector('canvas');
  if (mobile) {
    await drawCanvas(c1, p);
  } else if (showRight) {
    await Promise.all([drawCanvas(c1, p), drawCanvas(c2, p + 1)]);
  } else {
    c2.width = 0;
    c2.height = 0;
    await drawCanvas(c1, p);
  }
  if (loading) loading.style.display = 'none';
  syncBookBookmarkLayer();
  markVisited(p);
  if (showRight) markVisited(p + 1);
  if ((state.bookZoom || 1) <= 1) setTimeout(() => fitCanvases(), 20);
}

function fitCanvases() {
  if (state.active !== 'book' || (state.bookZoom || 1) > 1) return;
  const mobile = isMobile();
  const p = state.page;
  const sheets = [
    ['#turn-front', mobile ? p : p + 1],
    ['#turn-back', mobile ? p + 1 : p + 2],
  ];
  sheets.forEach(([sel, n]) => {
    const c = document.querySelector(sel);
    if (c && n >= 1 && n <= state.total) drawCanvas(c, n);
  });
}

function markVisited(n) {
  if (isDemoMode()) return;
  const isNew = !state.data.visited.includes(n);
  if (isNew) {
    state.data.visited.push(n);
    state.data.visited.sort((a, b) => a - b);
    state.data.dailyGoals = incrementDailyGoal(state.data.dailyGoals, 'goal-read', 1, getTodayKey());
  }
  state.data.lastPage = n;
  persist();
}

function turn(direction) {
  if (state.flipping) return;
  const step = isMobile() ? 1 : 2;
  const next = Math.min(state.total, Math.max(1, state.page + direction * step));
  if (next === state.page) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const sheet = document.querySelector('#turn-sheet');
  if (!sheet || reduced || (state.bookZoom || 1) > 1) {
    state.page = next;
    persist();
    renderView();
    return;
  }
  state.flipping = true;
  drawReader();
  requestAnimationFrame(() => {
    sheet.classList.toggle('flipping', direction > 0);
    if (direction < 0) {
      sheet.style.transform = 'rotateY(180deg)';
    } else sheet.style.transform = '';
    setTimeout(() => {
      state.page = next;
      persist();
      state.flipping = false;
      renderView();
    }, 780);
  });
}

function goToPage(n) {
  const p = Math.min(state.total, Math.max(1, parseInt(n) || 1));
  if (p === state.page) return;
  state.page = p;
  persist();
  renderView();
}

function hasBookmark(n) {
  return state.data.bookmarks.some((x) => x.page === n);
}

function syncBookBookmarkLayer() {
  const spreadPages = getBookSpreadPages();
  const leftSlot = document.querySelector('.page-ribbon-slot[data-page-slot="left"]');
  const rightSlot = document.querySelector('.page-ribbon-slot[data-page-slot="right"]');
  if (leftSlot) {
    leftSlot.innerHTML = spreadPages[0]
      ? pageRibbonMarkup(spreadPages[0], spreadPages.length === 2 ? 'left' : 'right')
      : '';
  }
  if (rightSlot) {
    rightSlot.innerHTML = spreadPages[1] ? pageRibbonMarkup(spreadPages[1], 'right') : '';
  }
  const layer = document.querySelector('#book-bookmark-layer');
  if (layer) layer.innerHTML = bookBookmarkOverlaysMarkup();
  const marked = spreadPages.some((p) => hasBookmark(p));
  const btn = document.querySelector('.bookmark-toggle-btn');
  if (btn) {
    btn.classList.toggle('is-marked', marked);
    btn.textContent = marked ? 'Marcador ✓' : 'Marcador';
    btn.setAttribute('aria-label', marked ? 'Gerenciar marcador desta página' : 'Adicionar marcador');
    btn.setAttribute('title', marked ? 'Gerenciar marcador' : 'Adicionar marcador');
  }
  const masterBtn = document.querySelector('.reader-master-marcador-btn');
  if (masterBtn) {
    masterBtn.classList.toggle('is-marked', marked);
    masterBtn.textContent = marked ? 'Marcador ✓' : '';
    masterBtn.setAttribute('aria-label', marked ? 'Remover marcador desta página' : 'Adicionar marcador');
  }
}

function enterBookFullscreen(mode = 'single') {
  state.bookFullscreen = true;
  state.bookPageMode = mode === 'double' ? 'double' : 'single';
  state.bookZoom = 1;
  try {
    if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  } catch {}
  render();
}

function exitBookFullscreen(shouldRender = true) {
  state.bookFullscreen = false;
  state.bookZoom = 1;
  document.body.classList.remove('book-fullscreen-active');
  try {
    if (document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }
  } catch {}
  if (shouldRender) render();
}

function toggleBookFullscreen() {
  if (state.bookFullscreen) exitBookFullscreen(true);
  else enterBookFullscreen('single');
}

function bookmarkSpreadChoiceModal(leftPage, rightPage) {
  const leftMarked = hasBookmark(leftPage);
  const rightMarked = hasBookmark(rightPage);
  openModal(
    'Em qual página colocar o marcador?',
    '<p class="muted" style="margin:0 0 12px;font-size:.9rem">Escolha qual página deste livro aberto receberá ou removerá o marcador:</p>' +
      '<div class="bm-spread-choice-list">' +
      '<button type="button" class="bm-spread-choice-btn ' +
      (leftMarked ? 'is-marked' : '') +
      '" data-action="toggle-bookmark-page" data-page="' +
      leftPage +
      '">' +
      '<div><strong>Página esquerda · Pág. ' +
      leftPage +
      '</strong><small>' +
      escapeHtml(pageTitle(leftPage)) +
      '</small></div>' +
      '<span class="bm-choice-pill">' +
      (leftMarked ? 'Remover marcador' : 'Colocar aqui') +
      '</span></button>' +
      '<button type="button" class="bm-spread-choice-btn ' +
      (rightMarked ? 'is-marked' : '') +
      '" data-action="toggle-bookmark-page" data-page="' +
      rightPage +
      '">' +
      '<div><strong>Página direita · Pág. ' +
      rightPage +
      '</strong><small>' +
      escapeHtml(pageTitle(rightPage)) +
      '</small></div>' +
      '<span class="bm-choice-pill">' +
      (rightMarked ? 'Remover marcador' : 'Colocar aqui') +
      '</span></button>' +
      '</div><div class="modal-actions"><button type="button" class="btn btn-outline" data-action="close-modal">Fechar</button></div>'
  );
}

function toggleBookmark(targetPage = null) {
  const spreadPages = getBookSpreadPages();
  if (targetPage === null && state.active === 'book' && spreadPages.length === 2) {
    bookmarkSpreadChoiceModal(spreadPages[0], spreadPages[1]);
    return;
  }
  const pageNum = Math.min(state.total, Math.max(1, Number.parseInt(targetPage ?? state.page, 10) || state.page));
  const found = state.data.bookmarks.find((x) => x.page === pageNum);
  if (found) {
    state.data.bookmarks = state.data.bookmarks.filter((x) => x.page !== pageNum);
    persist();
    toast('Marcador removido da página ' + pageNum + '.');
  } else {
    state.data.bookmarks.push({
      id: crypto.randomUUID(),
      page: pageNum,
      title: pageTitle(pageNum),
      date: new Date().toISOString(),
    });
    persist();
    toast('Marcador adicionado à página ' + pageNum + '!');
  }
  if (state.modal) closeModal();
  if (state.active === 'book') {
    syncBookBookmarkLayer();
  } else {
    renderView();
  }
}

function processBookmarkImageFile(file) {
  if (!file || !file.type.startsWith('image/')) {
    toast('Escolha um arquivo de imagem válido (JPG, PNG ou WebP).', true);
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      // Fit cleanly into vertical ribbon aspect ratio (approx 9:22) using cover-crop on canvas
      const targetW = 190;
      const targetH = 460;
      const canvas = document.createElement('canvas');
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#5a1412';
      ctx.fillRect(0, 0, targetW, targetH);

      const srcRatio = img.width / img.height;
      const dstRatio = targetW / targetH;
      let sx = 0,
        sy = 0,
        sw = img.width,
        sh = img.height;
      if (srcRatio > dstRatio) {
        sw = img.height * dstRatio;
        sx = (img.width - sw) / 2;
      } else {
        sh = img.width / dstRatio;
        sy = (img.height - sh) / 2;
      }
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, targetW, targetH);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      state.data.customBookmarkImage = dataUrl;
      persist();
      renderView();
      toast('Imagem do marcador ajustada ao formato FerveC!');
    };
    img.onerror = () => toast('Não foi possível ler esta imagem.', true);
    img.src = String(reader.result || '');
  };
  reader.readAsDataURL(file);
}

function bookmarksView() {
  const demo = isDemoMode();
  const sorted = state.data.bookmarks.slice().sort((a, b) => a.page - b.page);
  const hasCustom = Boolean(state.data.customBookmarkImage);
  const ribbonSrc = getActiveBookmarkRibbonSrc();

  const customPreviewOverlay =
    !demo && hasCustom
      ? '<div class="bm-master-preview"><img src="' +
        ribbonSrc +
        '" alt="Marcador personalizado ativo"></div>' +
        '<div class="bm-master-seal-cover"><span>✓ Marcador personalizado ativo</span><button type="button" class="bm-master-reset-btn" data-action="reset-bookmark-image">Usar padrão</button></div>'
      : '';

  const rowsOverlay =
    !demo && sorted.length > 0
      ? '<div class="master-parchment-panel" style="top:61.6%;left:4.2%;width:91.6%;height:26.5%;padding:10px;overflow-y:auto">' +
        '<div class="bookmark-parchment-list">' +
        sorted
          .map(
            (b) =>
              '<article class="bookmark-parchment-row"><div class="bm-row-mini-ribbon ' +
              (hasCustom ? 'is-custom' : '') +
              '" aria-hidden="true"><img src="' +
              ribbonSrc +
              '" alt="" class="' +
              (hasCustom ? 'bm-custom-img' : '') +
              '"></div><div class="bookmark-parchment-main"><strong>Marcador · Página ' +
              b.page +
              '</strong><small>' +
              escapeHtml(b.title || pageTitle(b.page)) +
              '</small><span class="bm-date">Marcada em ' +
              new Date(b.date).toLocaleDateString('pt-BR') +
              '</span></div><div class="bookmark-parchment-actions"><button type="button" class="circle-wine-btn" data-action="open-page" data-page="' +
              b.page +
              '" aria-label="Abrir página ' +
              b.page +
              '">' +
              appIcon('book') +
              '</button><button type="button" class="circle-wine-btn outline" data-action="remove-bookmark" data-id="' +
              b.id +
              '" aria-label="Remover marcador da página ' +
              b.page +
              '">' +
              appIcon('trash') +
              '</button></div></article>'
          )
          .join('') +
        '</div></div>'
      : '';

  return (
    '<div class="app-home-master-wrap">' +
    '<div class="master-image-canvas">' +
    '<img src="/assets/aistudio/WhatsApp_Image_2026-11-22_at_00.04.06_6c799168.jpeg" alt="FerveC Gastronomia - Meus Marcadores" class="master-ref-img">' +
    customPreviewOverlay +
    rowsOverlay +
    '<div class="interactive-overlay-layer">' +
    masterSubpageChromeMarkup({
      menu: [0.9, 3.0, 6.8, 4.3],
      back: [0.9, 11.4, 14.5, 4.2],
      register: [0.9, 79.2, 17.8, 4.1],
      banner: [6.2, 75.8, 21.4, 3.3],
      bannerStrip: [5.4, 2.2, 95.6, 4.0],
    }) +
    '<button type="button" class="interactive-hit" style="top:30.0%;left:67.6%;width:24.0%;height:4.5%;border-radius:99px" data-action="go" data-view="book" aria-label="Abrir livro"></button>' +
    '<input type="file" id="bookmark-image-input" accept="image/*" hidden>' +
    '<button type="button" class="interactive-hit" style="top:50.2%;left:23.5%;width:31.0%;height:4.3%;border-radius:99px" data-action="pick-bookmark-image" aria-label="Escolher imagem para o marcador"></button>' +
    (sorted.length === 0 || demo
      ? '<button type="button" class="interactive-hit" style="top:79.6%;left:33.2%;width:33.8%;height:5.0%;border-radius:99px" data-action="go" data-view="book" aria-label="Ir para Meu Livro"></button>'
      : '') +
    '</div>' +
    '</div>' +
    '</div>'
  );
}

function timerRowMarkup(t) {
  const rem = getRemainingSeconds(t);
  const pct =
    t.durationSec > 0 ? Math.min(100, Math.max(0, Math.round(((t.durationSec - rem) / t.durationSec) * 100))) : 100;
  const statusCls = t.status === 'done' ? 'is-done' : t.status === 'running' ? 'is-running' : '';
  const statusLabel = t.status === 'done' ? 'Tempo esgotado!' : t.status === 'running' ? 'Contagem ativa' : 'Pausado';
  const toggleBtn =
    t.status === 'running'
      ? '<button type="button" class="btn btn-outline btn-small" data-action="pause-timer" data-id="' +
        t.id +
        '" aria-label="Pausar timer ' +
        escapeHtml(t.label) +
        '">Pausar</button>'
      : t.status === 'paused'
        ? '<button type="button" class="btn btn-primary btn-small" data-action="resume-timer" data-id="' +
          t.id +
          '" aria-label="Retomar timer ' +
          escapeHtml(t.label) +
          '">Retomar</button>'
        : '';
  return (
    '<div class="timer-row ' +
    statusCls +
    '" data-timer-id="' +
    t.id +
    '"><div class="timer-row-top"><span class="timer-step-name">' +
    escapeHtml(t.label) +
    '</span><span class="timer-clock" aria-live="off">' +
    formatCountdown(rem) +
    '</span></div><div class="timer-status-text">' +
    statusLabel +
    '</div><div class="progress-track"><i style="width:' +
    pct +
    '%"></i></div><div class="timer-row-actions">' +
    toggleBtn +
    '<button type="button" class="btn btn-soft btn-small" data-action="reset-timer" data-id="' +
    t.id +
    '" aria-label="Reiniciar timer ' +
    escapeHtml(t.label) +
    '">Reiniciar</button><button type="button" class="btn btn-danger btn-small" data-action="remove-timer" data-id="' +
    t.id +
    '" aria-label="Remover timer ' +
    escapeHtml(t.label) +
    '">Remover</button></div></div>'
  );
}

function recipeTimerMarkup(r) {
  const timers = (state.data.timers || []).filter((t) => t.recipeId === r.id);
  const isOpen = !!state.openTimerCards[r.id];
  const recipeMins = parseRecipeTimeMinutes(r.time);
  const presets = [
    ['3 min · Massa fresca', 3],
    ['10 min · Molho', 10],
    ['30 min · Descanso', 30],
  ];
  if (recipeMins && ![3, 10, 30].includes(recipeMins)) presets.unshift([recipeMins + ' min · Receita', recipeMins]);
  const composer = isOpen
    ? '<div class="timer-composer"><div class="timer-presets">' +
      presets
        .map(
          ([lbl, m]) =>
            '<button type="button" class="timer-preset-btn" data-action="preset-timer" data-recipe-id="' +
            r.id +
            '" data-label="' +
            escapeHtml(lbl.split(' · ')[1] || 'Preparo') +
            '" data-minutes="' +
            m +
            '">' +
            escapeHtml(lbl) +
            '</button>'
        )
        .join('') +
      '</div><form class="timer-form" data-recipe-id="' +
      r.id +
      '"><input name="label" maxlength="60" placeholder="Etapa (ex.: Cozinhar massa)" aria-label="Nome da etapa para ' +
      escapeHtml(r.name) +
      '"><div class="timer-inputs-row"><label class="timer-num-field"><input name="minutes" type="number" min="0" max="599" value="5" aria-label="Minutos para ' +
      escapeHtml(r.name) +
      '">min</label><label class="timer-num-field"><input name="seconds" type="number" min="0" max="59" value="0" aria-label="Segundos para ' +
      escapeHtml(r.name) +
      '">seg</label><button type="submit" class="btn btn-primary btn-small">Iniciar timer</button></div></form></div>'
    : '';
  const list = timers.length ? '<div class="timer-list">' + timers.map(timerRowMarkup).join('') + '</div>' : '';
  return (
    '<section class="recipe-timer" aria-label="Timer de cozinha para ' +
    escapeHtml(r.name) +
    '"><div class="timer-header"><span class="timer-title">⏱ Timer de cozinha</span><button type="button" class="btn btn-outline btn-small" data-action="toggle-timer-card" data-id="' +
    r.id +
    '" aria-expanded="' +
    (isOpen ? 'true' : 'false') +
    '" aria-label="Configurar timer para ' +
    escapeHtml(r.name) +
    '">' +
    (isOpen ? 'Fechar' : '＋ Definir etapa') +
    '</button></div>' +
    composer +
    list +
    '</section>'
  );
}

function recipeChecklistMarkup(r) {
  const ingredients = Array.isArray(r.ingredients) ? r.ingredients : [];
  const checkedMap = sanitizeCheckedMap(state.data.ingredientChecks?.[r.id], ingredients.length);
  const catOverrides = sanitizeCategoryMap(state.data.ingredientCategories?.[r.id], ingredients.length);
  const sortMode = state.data.checklistSort?.[r.id] || 'default';
  const sortedItems = sortIngredientsForChecklist(ingredients, sortMode, catOverrides);
  const pantryCount = sortedItems.filter((x) => x.category === 'pantry').length;
  const freshCount = sortedItems.filter((x) => x.category === 'fresh').length;
  const prog = getIngredientChecklistProgress(ingredients, checkedMap);
  const isOpen = !!state.openChecklistCards[r.id];
  const badgeText =
    prog.total === 0
      ? 'Sem itens'
      : prog.allReady
        ? 'Tudo pronto ✓ (' + prog.checked + '/' + prog.total + ')'
        : prog.checked + '/' + prog.total + ' prontos';
  const badgeCls = prog.allReady ? 'is-ready' : '';
  let body = '';
  if (isOpen) {
    const progressRow = prog.total
      ? '<div class="checklist-progress-row"><div class="progress-track"><i style="width:' +
        prog.pct +
        '%"></i></div>' +
        (prog.checked > 0
          ? '<button type="button" class="btn btn-soft btn-small" data-action="reset-ingredient-checks" data-id="' +
            r.id +
            '" aria-label="Reiniciar checklist de ' +
            escapeHtml(r.name) +
            '">Reiniciar</button>'
          : '') +
        '</div>'
      : '';
    const sortBar = ingredients.length
      ? '<div class="checklist-sort-bar" role="group" aria-label="Organizar ingredientes de ' +
        escapeHtml(r.name) +
        '"><span class="sort-bar-label">Organizar:</span><button type="button" class="sort-chip-btn ' +
        (sortMode === 'default' ? 'is-active' : '') +
        '" data-action="set-checklist-sort" data-recipe-id="' +
        r.id +
        '" data-sort="default" aria-pressed="' +
        (sortMode === 'default' ? 'true' : 'false') +
        '">Padrão</button><button type="button" class="sort-chip-btn ' +
        (sortMode === 'pantry-first' ? 'is-active' : '') +
        '" data-action="set-checklist-sort" data-recipe-id="' +
        r.id +
        '" data-sort="pantry-first" aria-pressed="' +
        (sortMode === 'pantry-first' ? 'true' : 'false') +
        '">Despensa (' +
        pantryCount +
        ')</button><button type="button" class="sort-chip-btn ' +
        (sortMode === 'fresh-first' ? 'is-active' : '') +
        '" data-action="set-checklist-sort" data-recipe-id="' +
        r.id +
        '" data-sort="fresh-first" aria-pressed="' +
        (sortMode === 'fresh-first' ? 'true' : 'false') +
        '">Frescos (' +
        freshCount +
        ')</button></div>'
      : '';
    let lastCat = null;
    const itemsHtml = sortedItems.length
      ? '<ul class="ing-checklist">' +
        sortedItems
          .map((entry) => {
            const done = !!checkedMap[entry.originalIndex];
            const catLabel = entry.category === 'fresh' ? 'Fresco' : 'Despensa';
            let groupHeader = '';
            if (sortMode !== 'default' && entry.category !== lastCat) {
              lastCat = entry.category;
              groupHeader =
                '<li class="ing-group-heading" aria-hidden="true">' +
                (entry.category === 'fresh' ? '🌿 Frescos (' + freshCount + ')' : '🏺 Despensa (' + pantryCount + ')') +
                '</li>';
            }
            return (
              groupHeader +
              '<li class="ing-check-row"><button type="button" class="ing-check-item ' +
              (done ? 'is-checked' : '') +
              '" data-action="toggle-ingredient-check" data-recipe-id="' +
              r.id +
              '" data-index="' +
              entry.originalIndex +
              '" aria-pressed="' +
              (done ? 'true' : 'false') +
              '"><span class="ing-check-box" aria-hidden="true">' +
              (done ? '✓' : '') +
              '</span><span class="ing-check-text">' +
              escapeHtml(entry.text) +
              '</span></button><button type="button" class="ing-cat-tag is-' +
              entry.category +
              '" data-action="toggle-ingredient-category" data-recipe-id="' +
              r.id +
              '" data-index="' +
              entry.originalIndex +
              '" data-category="' +
              entry.category +
              '" title="Alternar categoria entre Despensa e Fresco" aria-label="Categoria de ' +
              escapeHtml(entry.text) +
              ': ' +
              catLabel +
              '. Clique para alternar">' +
              catLabel +
              '</button></li>'
            );
          })
          .join('') +
        '</ul>'
      : '<p class="empty-inline">Nenhum ingrediente cadastrado ainda.</p>';
    const quickForm =
      '<form class="ing-quick-form" data-recipe-id="' +
      r.id +
      '"><input name="ingredient" maxlength="100" placeholder="Adicionar ingrediente rápido…" aria-label="Novo ingrediente para ' +
      escapeHtml(r.name) +
      '" required><button type="submit" class="btn btn-primary btn-small">＋ Add</button></form>';
    body = '<div class="checklist-body">' + progressRow + sortBar + itemsHtml + quickForm + '</div>';
  }
  return (
    '<section class="recipe-checklist" aria-label="Checklist de ingredientes para ' +
    escapeHtml(r.name) +
    '"><div class="checklist-header"><div class="checklist-title-wrap"><span class="checklist-title">🧺 Mise en place</span><span class="checklist-badge ' +
    badgeCls +
    '">' +
    badgeText +
    '</span></div><button type="button" class="btn btn-outline btn-small" data-action="toggle-checklist-card" data-id="' +
    r.id +
    '" aria-expanded="' +
    (isOpen ? 'true' : 'false') +
    '" aria-label="' +
    (isOpen ? 'Fechar' : 'Abrir') +
    ' checklist de ingredientes para ' +
    escapeHtml(r.name) +
    '">' +
    (isOpen ? 'Fechar' : 'Ver lista') +
    '</button></div>' +
    body +
    '</section>'
  );
}

function dishThumbMarkup(r) {
  const v =
    r.thumbVariant ||
    (r.name?.toLowerCase().includes('carbonara')
      ? 'carbonara'
      : r.name?.toLowerCase().includes('ravioli')
        ? 'ravioli'
        : r.name?.toLowerCase().includes('fettuccine') || r.name?.toLowerCase().includes('alfredo')
          ? 'fettuccine'
          : 'default');
  if (v === 'default') {
    return '<div class="dish-thumb-wrap"><img src="uploads/WhatsApp_Image_2026-11-19_at_06.24.24__2_.jpeg" alt="" class="dish-thumb-img dish-default"></div>';
  }
  return '<div class="dish-thumb-wrap"><img src="uploads/WhatsApp_Image_2026-11-19_at_06.24.24__1_.jpeg" alt="" class="dish-thumb-img dish-' + v + '"></div>';
}

function dailyGoalsMarkup() {
  state.data.dailyGoals = normalizeDailyState(state.data.dailyGoals, getTodayKey());
  const dg = state.data.dailyGoals;
  const summary = getDailyGoalsSummary(dg, getTodayKey());
  const itemsHtml = dg.goals
    .map((g) => {
      const done = g.current >= g.target;
      return (
        '<li class="goal-row ' +
        (done ? 'is-done' : '') +
        '" data-goal-id="' +
        g.id +
        '"><button type="button" class="goal-check-btn ' +
        (done ? 'checked' : '') +
        '" data-action="toggle-goal" data-id="' +
        g.id +
        '" aria-label="' +
        (done ? 'Desmarcar' : 'Concluir') +
        ' meta ' +
        escapeHtml(g.title) +
        '">' +
        (done ? '✓' : '') +
        '</button><div class="goal-main"><span class="goal-title">' +
        escapeHtml(g.title) +
        '</span><small class="goal-meta">' +
        g.current +
        ' / ' +
        g.target +
        ' ' +
        escapeHtml(g.unit) +
        '</small></div><div class="goal-step-actions">' +
        (g.target > 1
          ? '<button type="button" class="goal-mini-btn" data-action="dec-goal" data-id="' +
            g.id +
            '" aria-label="Diminuir ' +
            escapeHtml(g.title) +
            '">−</button><button type="button" class="goal-mini-btn" data-action="inc-goal" data-id="' +
            g.id +
            '" aria-label="Avançar ' +
            escapeHtml(g.title) +
            '">+</button>'
          : '') +
        (g.custom
          ? '<button type="button" class="goal-mini-btn del" data-action="remove-goal" data-id="' +
            g.id +
            '" aria-label="Excluir meta ' +
            escapeHtml(g.title) +
            '">×</button>'
          : '') +
        '</div></li>'
      );
    })
    .join('');
  return (
    '<section class="daily-goals-card" id="daily-goals-section" aria-label="Rastreador de Metas Diárias"><div class="daily-goals-head"><div class="daily-goals-title-row">' +
    dailyGoalsRingMarkup(summary, 'sm') +
    '<div><h2>Rastreador de Metas Diárias</h2><p>' +
    summary.completed +
    ' de ' +
    summary.total +
    ' concluídas hoje · ' +
    summary.pct +
    '%</p></div></div><div class="daily-goals-right"><span class="streak-badge" title="Sequência de dias com todas as metas concluídas">🔥 ' +
    summary.streak +
    'd</span><button type="button" class="btn btn-outline btn-small" data-action="new-goal-modal">＋ Nova Meta</button></div></div><div class="progress-track goals-progress-bar"><i style="width:' +
    summary.pct +
    '%"></i></div><ul class="daily-goals-list">' +
    itemsHtml +
    '</ul></section>'
  );
}

function newGoalModal() {
  openModal(
    'Nova Meta Diária',
    '<form id="daily-goal-modal-form"><div class="field"><label for="g-title">Nome da meta *</label><input id="g-title" name="title" required maxlength="80" placeholder="Ex.: Testar hidratação 55%"></div><div class="field"><label for="g-target">Quantidade alvo *</label><input id="g-target" name="target" type="number" min="1" max="99" value="1" required></div><div class="field"><label for="g-unit">Unidade (opcional)</label><input id="g-unit" name="unit" maxlength="20" value="vez" placeholder="Ex.: páginas, receitas, vezes"></div><div class="modal-actions"><button type="button" class="btn btn-outline" data-action="close-modal">Cancelar</button><button type="submit" class="btn btn-primary">Salvar Meta</button></div></form>'
  );
}

function recipesQuickJumpMarkup(counts) {
  const activeCat = state.recipeCategory || 'all';
  return (
    '<nav class="recipe-quick-jump" aria-label="Navegação rápida por categoria de receita"><div class="quick-jump-track">' +
    RECIPE_QUICK_CATEGORIES.map((c) => {
      const isActive = activeCat === c.id;
      const cnt = counts[c.id] ?? 0;
      return (
        '<button type="button" class="quick-jump-pill ' +
        (isActive ? 'is-active' : '') +
        '" data-action="jump-recipe-category" data-category="' +
        c.id +
        '" aria-pressed="' +
        (isActive ? 'true' : 'false') +
        '"><span>' +
        c.icon +
        '</span><span>' +
        escapeHtml(c.label) +
        '</span><small>(' +
        cnt +
        ')</small></button>'
      );
    }).join('') +
    '</div></nav>'
  );
}

function recipesView() {
  const demo = isDemoMode();
  const activeCat = state.recipeCategory || 'all';
  const counts = getQuickJumpCounts(state.data.recipes, {
    search: state.recipeSearch,
    practicedIds: state.data.practiced,
  });
  const items = filterRecipesByQuickJump(state.data.recipes, {
    search: state.recipeSearch,
    category: activeCat,
    practicedIds: state.data.practiced,
  });

  const starter1 = state.data.recipes[0]?.id || 'rec-carbonara';
  const starter2 = state.data.recipes[1]?.id || 'rec-ravioli';

  const cards = items
    .map((r) => {
      const practiced = state.data.practiced.includes(r.id);
      const fav = !!r.favorite;
      const catLabel = getPrimaryRecipeCategoryLabel(r, state.data.practiced);
      return (
        '<article class="recipe-parchment-card" data-recipe-card="' +
        r.id +
        '"><div class="recipe-parchment-top">' +
        dishThumbMarkup(r) +
        '<div class="recipe-parchment-info"><h3>' +
        escapeHtml(r.name) +
        '</h3><p>' +
        escapeHtml(r.description || 'Receita pessoal FerveC') +
        '</p><div class="recipe-parchment-meta"><span class="recipe-cat-chip">' +
        escapeHtml(catLabel) +
        '</span><span class="meta-sep">|</span><span>' +
        appIcon('learn') +
        ' ' +
        escapeHtml(r.servings || '2') +
        ' porções</span><span class="meta-sep">|</span><span>' +
        appIcon('clock') +
        ' ' +
        escapeHtml(r.time || '20 min') +
        '</span><span class="meta-sep">|</span><button type="button" class="fav-inline-btn ' +
        (fav ? 'is-fav' : '') +
        '" data-action="toggle-favorite" data-id="' +
        r.id +
        '">' +
        (fav ? appIcon('starFill') : appIcon('star')) +
        ' Favorita</button></div></div><div class="recipe-parchment-actions"><button type="button" class="circle-wine-btn" data-action="edit-recipe" data-id="' +
        r.id +
        '" aria-label="Editar ' +
        escapeHtml(r.name) +
        '">' +
        appIcon('edit') +
        '</button><button type="button" class="circle-wine-btn" data-action="delete-recipe" data-id="' +
        r.id +
        '" aria-label="Excluir ' +
        escapeHtml(r.name) +
        '">' +
        appIcon('trash') +
        '</button></div></div><div class="recipe-parchment-foot"><button type="button" class="btn btn-soft btn-small" data-action="practice" data-id="' +
        r.id +
        '">' +
        (practiced ? 'Praticada ✓' : 'Marcar praticada') +
        '</button></div>' +
        recipeChecklistMarkup(r) +
        recipeTimerMarkup(r) +
        '</article>'
      );
    })
    .join('');

  const dynamicPillsOverlay = demo
    ? ''
    : '<div class="master-parchment-strip" style="top:42.2%;left:2.2%;width:95.6%;height:3.6%">' +
      recipesQuickJumpMarkup(counts) +
      '</div>';

  const dynamicListOverlay = demo
    ? ''
    : '<div class="master-parchment-panel recipes-master-panel" style="top:46.8%;left:2.4%;width:95.2%;height:44.5%;padding:8px;overflow-y:auto">' +
      '<div id="recipes-quick-anchor"></div>' +
      (cards
        ? '<div class="recipes-parchment-list">' + cards + '</div>'
        : '<section class="surface empty-state compact"><div class="empty-icon">♨</div><h3>Nenhuma receita encontrada</h3><p>Crie uma nova receita ou limpe o filtro.</p><button type="button" class="btn-pill-wine sm" data-action="new-recipe">＋ Nova Receita</button></section>') +
      dailyGoalsMarkup() +
      '</div>';

  const starterHits = demo
    ? '<button type="button" class="interactive-hit" style="top:42.3%;left:2.5%;width:22.8%;height:3.4%;border-radius:99px" data-action="jump-recipe-category" data-category="all" aria-label="Todas as receitas"></button>' +
      '<button type="button" class="interactive-hit" style="top:42.3%;left:26.2%;width:22.6%;height:3.4%;border-radius:99px" data-action="jump-recipe-category" data-category="massas" aria-label="Massas"></button>' +
      '<button type="button" class="interactive-hit" style="top:42.3%;left:49.6%;width:22.8%;height:3.4%;border-radius:99px" data-action="jump-recipe-category" data-category="molhos" aria-label="Molhos"></button>' +
      '<button type="button" class="interactive-hit" style="top:42.3%;left:73.4%;width:24.4%;height:3.4%;border-radius:99px" data-action="jump-recipe-category" data-category="recheios" aria-label="Recheios"></button>' +
      '<button type="button" class="interactive-hit" style="top:49.8%;left:79.4%;width:7.4%;height:3.8%;border-radius:50%" data-action="edit-recipe" data-id="' +
      starter1 +
      '" aria-label="Editar Carbonara Clássica"></button>' +
      '<button type="button" class="interactive-hit" style="top:49.8%;left:88.4%;width:7.4%;height:3.8%;border-radius:50%" data-action="delete-recipe" data-id="' +
      starter1 +
      '" aria-label="Excluir Carbonara Clássica"></button>' +
      '<button type="button" class="interactive-hit" style="top:58.2%;left:4.4%;width:28.0%;height:2.6%;border-radius:8px" data-action="practice" data-id="' +
      starter1 +
      '" aria-label="Marcar Carbonara praticada"></button>' +
      '<button type="button" class="interactive-hit" style="top:58.4%;left:77.8%;width:17.8%;height:2.5%;border-radius:8px" data-action="toggle-checklist-card" data-id="' +
      starter1 +
      '" aria-label="Ver lista Carbonara"></button>' +
      '<button type="button" class="interactive-hit" style="top:61.9%;left:72.0%;width:23.8%;height:2.5%;border-radius:8px" data-action="toggle-timer-card" data-id="' +
      starter1 +
      '" aria-label="Definir timer Carbonara"></button>' +
      '<button type="button" class="interactive-hit" style="top:69.6%;left:79.4%;width:7.4%;height:3.8%;border-radius:50%" data-action="edit-recipe" data-id="' +
      starter2 +
      '" aria-label="Editar Ravioli de Ricota"></button>' +
      '<button type="button" class="interactive-hit" style="top:69.6%;left:88.4%;width:7.4%;height:3.8%;border-radius:50%" data-action="delete-recipe" data-id="' +
      starter2 +
      '" aria-label="Excluir Ravioli de Ricota"></button>' +
      '<button type="button" class="interactive-hit" style="top:77.8%;left:4.4%;width:28.0%;height:2.6%;border-radius:8px" data-action="practice" data-id="' +
      starter2 +
      '" aria-label="Marcar Ravioli praticada"></button>' +
      '<button type="button" class="interactive-hit" style="top:78.1%;left:77.8%;width:17.8%;height:2.5%;border-radius:8px" data-action="toggle-checklist-card" data-id="' +
      starter2 +
      '" aria-label="Ver lista Ravioli"></button>' +
      '<button type="button" class="interactive-hit" style="top:81.5%;left:72.0%;width:23.8%;height:2.5%;border-radius:8px" data-action="toggle-timer-card" data-id="' +
      starter2 +
      '" aria-label="Definir timer Ravioli"></button>'
    : '';

  return (
    '<div class="app-home-master-wrap">' +
    '<div class="master-image-canvas">' +
    '<img src="/assets/aistudio/WhatsApp_Image_2026-11-23_at_14.11.39__2__bc94ac24.jpeg" alt="FerveC Gastronomia - Minhas Receitas" class="master-ref-img">' +
    dynamicPillsOverlay +
    dynamicListOverlay +
    '<div class="interactive-overlay-layer">' +
    masterSubpageChromeMarkup({
      menu: [0.8, 3.0, 6.8, 4.0],
      back: [0.8, 11.4, 15.2, 4.0],
      register: [0.8, 72.5, 24.8, 3.8],
      banner: [6.0, 72.5, 24.8, 3.2],
      bannerStrip: [5.0, 2.0, 96.0, 4.6],
    }) +
    '<button type="button" class="interactive-hit" style="top:30.8%;left:66.2%;width:29.8%;height:4.4%;border-radius:99px" data-action="new-recipe" aria-label="Nova Receita"></button>' +
    '<input id="recipe-search" class="master-input" style="top:37.8%;left:8.8%;width:61.0%;height:3.2%" placeholder="Buscar nas minhas receitas…" value="' +
    escapeHtml(state.recipeSearch) +
    '" aria-label="Buscar receitas">' +
    '<button type="button" class="interactive-hit" style="top:37.8%;left:71.2%;width:26.2%;height:3.2%;border-radius:8px" data-action="export-recipes-csv" aria-label="Exportar Excel CSV"></button>' +
    starterHits +
    '</div>' +
    '</div>' +
    '</div>'
  );
}

function recipeModal(r = null) {
  const ingredients = r?.ingredients?.length ? r.ingredients : [''];
  const cat = r?.category || '';
  openModal(
    (r ? 'Editar' : 'Nova') + ' receita',
    '<form id="recipe-form"><div class="field"><label for="r-name">Nome da receita *</label><input id="r-name" name="name" value="' +
      escapeHtml(r?.name || '') +
      '" required maxlength="100" placeholder="Ex.: Tagliatelle da casa"></div><div class="field"><label for="r-category">Categoria</label><select id="r-category" name="category"><option value="" ' +
      (cat === '' ? 'selected' : '') +
      '>Automática (pelo preparo)</option><option value="massas" ' +
      (cat === 'massas' ? 'selected' : '') +
      '>Massas</option><option value="molhos" ' +
      (cat === 'molhos' ? 'selected' : '') +
      '>Molhos</option><option value="recheios" ' +
      (cat === 'recheios' ? 'selected' : '') +
      '>Recheios</option><option value="frescas" ' +
      (cat === 'frescas' ? 'selected' : '') +
      '>Massas Frescas</option></select></div><div class="field"><label>Ingredientes</label><div id="ingredients">' +
      ingredients
        .map(
          (x, i) =>
            '<div class="ingredient-line"><input name="ingredient" value="' +
            escapeHtml(x) +
            '" placeholder="' +
            (i + 1) +
            'º ingrediente"><button type="button" data-action="remove-ingredient" aria-label="Remover ingrediente">×</button></div>'
        )
        .join('') +
      '</div><button type="button" class="btn btn-outline btn-small" data-action="add-ingredient">＋ Adicionar ingrediente</button></div><div class="field"><label for="r-description">Descrição e modo de preparo</label><textarea id="r-description" name="description" placeholder="Anote o preparo, técnicas e suas descobertas…">' +
      escapeHtml(r?.description || '') +
      '</textarea></div><div class="field"><label for="r-servings">Porções (opcional)</label><input id="r-servings" name="servings" inputmode="numeric" value="' +
      escapeHtml(r?.servings || '') +
      '" placeholder="Ex.: 2"></div><div class="field"><label for="r-time">Tempo de preparo (opcional)</label><input id="r-time" name="time" value="' +
      escapeHtml(r?.time || '') +
      '" placeholder="Ex.: 30 min"></div><label class="toggle-line"><input id="r-favorite" type="checkbox" ' +
      (r?.favorite !== false ? 'checked' : '') +
      '> Marcar como receita favorita</label><div class="modal-actions"><button type="button" class="btn btn-outline" data-action="close-modal">Cancelar</button><button type="button" class="btn btn-soft" data-action="recipe-pdf">Gerar PDF</button><button class="btn btn-primary" type="submit">Salvar Receita</button></div></form>',
    { recipeId: r?.id || '' }
  );
}

function notesView() {
  const demo = isDemoMode();
  const filtered = filterNotes(state.data.notes, state.noteSearch);
  const sheetData = paginateNotesIntoSheets(filtered, state.notesSheet, NOTES_PER_SHEET);
  state.notesSheet = sheetData.currentSheet;

  const showDynamicNotes = !demo && (filtered.length > 0 || state.noteSearch.trim().length > 0 || sheetData.totalSheets > 1);

  const sheetTabsOverlay = showDynamicNotes
    ? '<div class="master-parchment-strip" style="top:44.1%;left:3.0%;width:94.0%;height:4.5%;display:flex;gap:6px;align-items:center;overflow-x:auto">' +
      sheetData.sheets
        .map(
          (s) =>
            '<button type="button" class="notebook-sheet-tab ' +
            (s.active ? 'is-active' : '') +
            '" data-action="notes-sheet" data-sheet="' +
            s.number +
            '">' +
            escapeHtml(s.label) +
            '</button>'
        )
        .join('') +
      '</div>'
    : '';

  const notesMetaOverlay = showDynamicNotes
    ? '<div class="master-parchment-cover" style="top:34.1%;left:23.5%;width:39.5%;height:2.9%;background:#f7ebd0;font-size:.76rem;font-style:italic;color:#4f3a27;display:flex;align-items:center">' +
      filtered.length +
      (filtered.length === 1 ? ' anotação · ' : ' anotações · ') +
      sheetData.totalSheets +
      (sheetData.totalSheets === 1 ? ' folha' : ' folhas') +
      '</div>'
    : '';

  const notesBodyOverlay = showDynamicNotes
    ? '<div class="master-parchment-cover" style="top:52.1%;left:6.5%;width:87.2%;height:3.6%;display:flex;justify-content:space-between;align-items:center;font-family:var(--serif);font-weight:700;color:#6d1b18;font-size:.86rem"><span>' +
      escapeHtml(sheetData.sheetLabel) +
      '</span><span style="font-size:.75rem">' +
      sheetData.currentSheet +
      ' de ' +
      sheetData.totalSheets +
      '</span></div>' +
      '<div class="master-parchment-panel notes-master-panel" style="top:56.0%;left:8.8%;width:82.4%;height:25.6%;padding:6px;overflow-y:auto">' +
      (sheetData.items.length
        ? '<div class="notebook-entries-list">' +
          sheetData.items
            .map(
              (n) =>
                '<article class="notebook-entry"><div class="notebook-entry-top"><div class="notebook-entry-tags"><span class="notebook-cat-pill">' +
                escapeHtml(n.category || 'Anotação') +
                '</span>' +
                (n.page
                  ? '<button type="button" class="notebook-page-link" data-action="open-page" data-page="' +
                    n.page +
                    '">Pág. ' +
                    n.page +
                    '</button>'
                  : '') +
                '</div><span class="notebook-date">' +
                new Date(n.date).toLocaleDateString('pt-BR') +
                '</span></div><h3>' +
                escapeHtml(n.title) +
                '</h3><p>' +
                escapeHtml(n.body) +
                '</p><div class="notebook-entry-actions"><button type="button" class="btn btn-outline btn-small" data-action="edit-note" data-id="' +
                n.id +
                '">Editar</button><button type="button" class="btn btn-danger btn-small" data-action="delete-note" data-id="' +
                n.id +
                '">Excluir</button></div></article>'
            )
            .join('') +
          '</div>'
        : '<div class="empty-state compact" style="padding:14px"><p style="margin:0 0 8px">Nenhuma anotação nesta folha.</p><button type="button" class="btn-pill-wine sm" data-action="new-note">＋ Escrever nota</button></div>') +
      '</div>'
    : '';

  return (
    '<div class="app-home-master-wrap">' +
    '<div class="master-image-canvas">' +
    '<img src="/assets/aistudio/WhatsApp_Image_2026-11-23_at_14.11.37_244d133e.jpeg" alt="FerveC Gastronomia - Caderno do Chef" class="master-ref-img">' +
    notesMetaOverlay +
    sheetTabsOverlay +
    notesBodyOverlay +
    '<div class="interactive-overlay-layer">' +
    masterSubpageChromeMarkup({
      menu: [0.8, 3.0, 6.8, 4.0],
      back: [0.8, 11.4, 15.2, 4.0],
      register: [0.8, 77.5, 19.5, 4.0],
      banner: [5.6, 77.0, 20.5, 3.4],
      bannerStrip: [4.8, 2.0, 96.0, 4.6],
    }) +
    '<button type="button" class="interactive-hit" style="top:32.1%;left:67.6%;width:26.8%;height:4.2%;border-radius:99px" data-action="new-note" aria-label="Nova Nota"></button>' +
    '<input id="note-search" class="master-input" style="top:40.0%;left:9.2%;width:86.5%;height:3.0%" placeholder="Pesquisar no caderno…" value="' +
    escapeHtml(state.noteSearch) +
    '" aria-label="Pesquisar anotações">' +
    (!showDynamicNotes
      ? '<button type="button" class="interactive-hit" style="top:44.5%;left:3.2%;width:23.2%;height:3.6%;border-radius:99px" data-action="notes-sheet" data-sheet="1" aria-label="Folha 1"></button>' +
        '<button type="button" class="interactive-hit" style="top:73.4%;left:31.4%;width:37.2%;height:4.4%;border-radius:99px" data-action="new-note" aria-label="Escrever na Folha 1"></button>'
      : '') +
    '<button type="button" class="interactive-hit" style="top:83.6%;left:4.5%;width:26.0%;height:3.8%;border-radius:99px" data-action="notes-sheet" data-sheet="' +
    Math.max(1, sheetData.currentSheet - 1) +
    '" aria-label="Folha anterior"></button>' +
    '<button type="button" class="interactive-hit" style="top:83.6%;left:69.0%;width:26.0%;height:3.8%;border-radius:99px" data-action="notes-sheet" data-sheet="' +
    Math.min(sheetData.totalSheets, sheetData.currentSheet + 1) +
    '" aria-label="Próxima folha"></button>' +
    '</div>' +
    '</div>' +
    '</div>'
  );
}

function noteModal(n = null) {
  openModal(
    n ? 'Editar anotação' : 'Nova anotação',
    '<form id="note-form"><div class="field"><label for="n-title">Título *</label><input id="n-title" required maxlength="100" value="' +
      escapeHtml(n?.title || '') +
      '" placeholder="Ex.: Como ficou a textura"></div><div class="field"><label for="n-category">Categoria</label><select id="n-category"><option ' +
      (n?.category === 'Técnica' ? 'selected' : '') +
      '>Técnica</option><option ' +
      (n?.category === 'Teste' ? 'selected' : '') +
      '>Teste</option><option ' +
      (n?.category === 'Dúvida' ? 'selected' : '') +
      '>Dúvida</option><option ' +
      (n?.category === 'Observação' ? 'selected' : '') +
      '>Observação</option><option ' +
      (n?.category === 'Livre' ? 'selected' : '') +
      '>Livre</option></select></div><div class="field"><label for="n-body">Anotação *</label><textarea id="n-body" required placeholder="Escreva suas observações…">' +
      escapeHtml(n?.body || '') +
      '</textarea></div><div class="field"><label for="n-page">Página relacionada (opcional)</label><input id="n-page" type="number" min="1" max="74" value="' +
      escapeHtml(n?.page || '') +
      '" placeholder="' +
      state.page +
      '"></div><div class="modal-actions"><button type="button" class="btn btn-outline" data-action="close-modal">Cancelar</button><button class="btn btn-primary">Salvar anotação</button></div></form>',
    { noteId: n?.id || '' }
  );
}

const studyPages = [
  7, 8, 9, 10, 12, 13, 14, 15, 16, 17, 18, 24, 25, 27, 28, 33, 34, 35, 36, 38, 40, 41, 42, 47, 48, 63, 64, 65, 66,
  67, 68, 69, 70,
];

function learnView() {
  const demo = isDemoMode();
  const completed = state.data.completed;
  const completedCount = completed.length;
  const pendingCount = Math.max(0, studyPages.length - completedCount);
  const pct = Math.round((completedCount / studyPages.length) * 100);
  const filter = state.learnFilter || 'all';
  const filteredPages = studyPages.filter((n) => {
    const done = completed.includes(n);
    if (filter === 'pending') return !done;
    if (filter === 'done') return done;
    return true;
  });

  const showDynamicLearn = !demo && (filter !== 'all' || completedCount > 0);

  const progressOverlay =
    !demo && completedCount > 0
      ? '<div class="master-parchment-cover" style="top:42.5%;left:4.0%;width:92.0%;height:11.5%;display:flex;align-items:center;gap:12px;padding:4px 8px">' +
        '<div class="learn-master-pct">' +
        pct +
        '%</div>' +
        '<div style="flex:1"><div style="font-size:.66rem;font-weight:700;color:#2d6321;letter-spacing:.08em">SEU RITMO DE PRÁTICA</div>' +
        '<strong style="font-family:var(--serif);color:#5c1916;font-size:.92rem">' +
        completedCount +
        ' de ' +
        studyPages.length +
        ' atividades concluídas</strong>' +
        '<div class="progress-track" style="margin:4px 0"><i style="width:' +
        pct +
        '%"></i></div>' +
        '<small style="font-size:.72rem;color:#5c4938">Faltam ' +
        pendingCount +
        ' atividades guiadas do e-book.</small></div></div>'
      : '';

  const dynamicFilterBar = !demo
    ? '<div class="master-parchment-strip" style="top:56.0%;left:2.4%;width:95.2%;height:3.6%;display:flex;gap:6px;align-items:center">' +
      '<button type="button" class="quick-jump-pill ' +
      (filter === 'all' ? 'is-active' : '') +
      '" data-action="set-learn-filter" data-filter="all">Todas (' +
      studyPages.length +
      ')</button>' +
      '<button type="button" class="quick-jump-pill ' +
      (filter === 'pending' ? 'is-active' : '') +
      '" data-action="set-learn-filter" data-filter="pending">Pendentes (' +
      pendingCount +
      ')</button>' +
      '<button type="button" class="quick-jump-pill ' +
      (filter === 'done' ? 'is-active' : '') +
      '" data-action="set-learn-filter" data-filter="done">Concluídas (' +
      completedCount +
      ')</button></div>'
    : '';

  const dynamicListOverlay = showDynamicLearn
    ? '<div class="master-parchment-panel" style="top:61.0%;left:2.4%;width:95.2%;height:36.5%;padding:8px;overflow-y:auto">' +
      (filteredPages.length
        ? '<div class="learn-cards-list">' +
          filteredPages
            .map((n) => {
              const done = completed.includes(n);
              const illusKind = getStudyIllustrationKind(n);
              return (
                '<article class="learn-study-card ' +
                (done ? 'is-done' : '') +
                '"><div class="learn-card-grid">' +
                cardThumbMediaMarkup(illusKind, pageTitle(n)) +
                '<div class="learn-card-body"><div class="learn-card-top"><span class="learn-page-badge">Página ' +
                n +
                '</span><span class="learn-status-chip ' +
                (done ? 'is-done' : '') +
                '">' +
                (done ? '✓ Concluída' : 'Pendente') +
                '</span></div><h3>' +
                escapeHtml(pageTitle(n)) +
                '</h3><p>Leia a página no livro e anote o que observou na prática.</p></div></div>' +
                '<div class="learn-card-actions"><button type="button" class="btn btn-outline btn-small" data-action="open-page" data-page="' +
                n +
                '">📖 Ler no livro</button><button type="button" class="btn ' +
                (done ? 'btn-soft' : 'btn-primary') +
                ' btn-small" data-action="study" data-page="' +
                n +
                '">' +
                (done ? 'Revisar registro' : 'Iniciar atividade') +
                '</button></div></article>'
              );
            })
            .join('') +
          '</div>'
        : '<section class="surface empty-state compact"><div class="empty-icon">🎓</div><h3>Nenhuma atividade nesta seleção</h3></section>') +
      '</div>'
    : '';

  return (
    '<div class="app-home-master-wrap">' +
    '<div class="master-image-canvas">' +
    '<img src="/assets/aistudio/WhatsApp_Image_2026-11-23_at_14.11.36__2__cd459a5a.jpeg" alt="FerveC Gastronomia - Modo Aprendiz" class="master-ref-img">' +
    progressOverlay +
    dynamicFilterBar +
    dynamicListOverlay +
    '<div class="interactive-overlay-layer">' +
    masterSubpageChromeMarkup({
      menu: [0.8, 4.8, 7.2, 3.4],
      back: [0.8, 14.0, 15.0, 3.4],
      register: [0.8, 74.5, 21.5, 3.4],
      banner: [5.3, 72.2, 24.0, 3.1],
      bannerStrip: [4.4, 2.0, 96.0, 5.1],
    }) +
    (demo
      ? '<button type="button" class="interactive-hit" style="top:56.0%;left:2.4%;width:22.8%;height:3.3%;border-radius:99px" data-action="set-learn-filter" data-filter="all" aria-label="Todas"></button>' +
        '<button type="button" class="interactive-hit" style="top:56.0%;left:26.2%;width:26.2%;height:3.3%;border-radius:99px" data-action="set-learn-filter" data-filter="pending" aria-label="Pendentes"></button>' +
        '<button type="button" class="interactive-hit" style="top:56.0%;left:53.8%;width:25.2%;height:3.3%;border-radius:99px" data-action="set-learn-filter" data-filter="done" aria-label="Concluídas"></button>'
      : '') +
    (!showDynamicLearn
      ? '<button type="button" class="interactive-hit" style="top:73.2%;left:3.6%;width:27.6%;height:3.4%;border-radius:8px" data-action="open-page" data-page="7" aria-label="Ler página 7 no livro"></button>' +
        '<button type="button" class="interactive-hit" style="top:73.2%;left:33.6%;width:28.0%;height:3.6%;border-radius:99px" data-action="study" data-page="7" aria-label="Iniciar atividade página 7"></button>' +
        '<button type="button" class="interactive-hit" style="top:91.0%;left:3.6%;width:27.6%;height:3.4%;border-radius:8px" data-action="open-page" data-page="8" aria-label="Ler página 8 no livro"></button>' +
        '<button type="button" class="interactive-hit" style="top:91.0%;left:33.6%;width:28.0%;height:3.6%;border-radius:99px" data-action="study" data-page="8" aria-label="Iniciar atividade página 8"></button>'
      : '') +
    '</div>' +
    '</div>' +
    '</div>'
  );
}

function ingredientsView() {
  const entries = [
    ['Farinha', 12, 'Estrutura, extração e proteínas base da massa.', 'flour'],
    ['Semolina e trigo duro', 13, 'Textura rústica, cor dourada e firmeza na cocção.', 'semolina'],
    ['Ovos', 14, 'Água, proteína, cor e riqueza lipídica na massa fresca.', 'eggs'],
    ['Água e hidratação', 15, 'Equilíbrio de absorção e umidade conforme o clima.', 'water'],
    ['Glúten', 16, 'Rede proteica: elasticidade versus extensibilidade.', 'gluten'],
    ['Sova', 17, 'Desenvolvimento mecânico e reconhecimento tátil do ponto.', 'knead'],
    ['Descanso e temperatura', 18, 'Relaxamento da rede de glúten antes da laminação.', 'rest'],
  ];
  const cards = entries
    .map(
      ([t, p, desc, illus]) =>
        '<article class="ingredient-card surface lab-card">' +
        cardWatermarkBgMarkup(illus) +
        '<div class="lab-card-grid">' +
        cardThumbMediaMarkup(illus, t) +
        '<div class="lab-card-content"><div class="eyebrow">LABORATÓRIO · PÁGINA ' +
        p +
        '</div><h3>' +
        escapeHtml(t) +
        '</h3><p>' +
        escapeHtml(desc) +
        '</p></div></div><div class="lab-card-foot"><button type="button" class="btn btn-outline btn-small" data-action="open-page" data-page="' +
        p +
        '">Abrir página ' +
        p +
        ' →</button></div></article>'
    )
    .join('');

  return (
    '<div class="app-home-master-wrap">' +
    '<div class="master-image-canvas">' +
    '<img src="/assets/aistudio/WhatsApp_Image_2026-11-21_at_23.59.55_727a71a9.jpeg" alt="FerveC Gastronomia - Laboratório de Ingredientes" class="master-ref-img">' +
    '<div class="lab-cards-grid master-ing-filter-grid" id="ingredient-grid" style="top:50.8%;left:4.4%;width:91.2%;height:42.8%">' +
    cards +
    '</div>' +
    '<div class="interactive-overlay-layer">' +
    masterSubpageChromeMarkup({
      menu: [0.7, 3.0, 6.8, 3.2],
      back: [0.7, 10.6, 15.0, 3.2],
      register: [0.7, 72.5, 24.5, 3.2],
      banner: [5.0, 70.4, 26.8, 2.9],
      bannerStrip: [4.3, 2.2, 95.6, 3.6],
    }) +
    '<input id="ingredient-search" class="master-input" style="top:46.8%;left:11.0%;width:83.5%;height:3.1%" placeholder="Pesquisar ingredientes (ex.: farinha, glúten, ovos)…" aria-label="Pesquisar ingredientes">' +
    '<button type="button" class="interactive-hit" style="top:57.1%;left:27.6%;width:23.0%;height:2.4%;border-radius:8px" data-action="open-page" data-page="12" aria-label="Abrir página 12 — Farinha"></button>' +
    '<button type="button" class="interactive-hit" style="top:68.1%;left:27.6%;width:23.0%;height:2.4%;border-radius:8px" data-action="open-page" data-page="13" aria-label="Abrir página 13 — Semolina"></button>' +
    '<button type="button" class="interactive-hit" style="top:79.1%;left:27.6%;width:23.0%;height:2.4%;border-radius:8px" data-action="open-page" data-page="14" aria-label="Abrir página 14 — Ovos"></button>' +
    '<button type="button" class="interactive-hit" style="top:90.1%;left:27.6%;width:23.0%;height:2.4%;border-radius:8px" data-action="open-page" data-page="15" aria-label="Abrir página 15 — Água e hidratação"></button>' +
    '</div>' +
    '</div>' +
    '</div>'
  );
}

let liveVoiceClient = null;
const speechCtrl = createSpeechController({
  lang: 'pt-BR',
  onListeningChange: (active) => {
    state.speechListening = active;
    updateSpeechUI();
  },
  onInterim: (text) => {
    state.speechInterim = text;
    updateSpeechUI();
  },
  onFinal: (text) => {
    if (isDemoMode()) {
      redirectToRegister();
      return;
    }
    if (!shouldAutoSendHandsFree(text)) return;
    if (state.assistantTab === 'voice') {
      const inp = document.querySelector('#voice-text-input');
      if (inp) inp.value = text;
      if (liveVoiceClient && state.voiceStatus === 'connected') {
        liveVoiceClient.sendText(text);
        if (inp) inp.value = '';
      }
      return;
    }
    sendChatPrompt(text, { speakReply: state.handsFreeMode });
  },
  onError: (msg) => {
    if (msg) toast(msg, true);
    state.speechListening = false;
    state.handsFreeMode = false;
    updateSpeechUI();
  },
});

function updateSpeechUI() {
  state.speechListening = false;
  state.handsFreeMode = false;
  state.speechInterim = '';
}

function assistantView() {
  state.assistantTab = 'chat';
  const hasDynamicChat = state.chat.length > 0 || state.chatBusy;

  const voiceOpts = LIVE_VOICES.map(
    (v) =>
      '<option value="' +
      v.id +
      '" ' +
      (state.voiceName === v.id ? 'selected' : '') +
      '>' +
      escapeHtml(v.label) +
      '</option>'
  ).join('');

  const chatMessagesOverlay =
    '<div class="chat-messages master-chat-messages ' +
    (hasDynamicChat ? 'is-populated' : '') +
    '" id="chat-messages" style="top:61.0%;left:3.8%;width:92.4%;height:12.6%"></div>';

  return (
    '<div class="app-home-master-wrap">' +
    '<div class="master-image-canvas">' +
    '<img src="/assets/aistudio/WhatsApp_Image_2026-11-23_at_14.11.40_92455218.jpeg" alt="FerveC Gastronomia - Converse com o Chef" class="master-ref-img">' +
    chatMessagesOverlay +
    '<div class="interactive-overlay-layer">' +
    masterSubpageChromeMarkup({
      menu: [0.8, 3.0, 6.8, 3.4],
      back: [0.8, 12.2, 14.8, 3.4],
      register: [0.8, 75.5, 22.0, 3.4],
      banner: [5.4, 75.0, 22.2, 3.1],
      bannerStrip: [4.4, 2.0, 96.0, 5.1],
    }) +
    '<button type="button" class="interactive-hit" style="top:45.8%;left:3.2%;width:48.2%;height:3.4%;border-radius:99px" data-action="switch-assistant-tab" data-tab="chat" aria-label="Chat por Escrito"></button>' +
    '<div class="voice-select-wrap" style="position:absolute;top:45.8%;left:53.0%;width:44.0%;height:3.4%;display:flex;align-items:center;gap:4px;background:#f7ebd0;border-radius:99px;padding:0 10px;border:1px solid rgba(112,35,28,.25)">' +
    '<label for="voice-select" style="font-size:.72rem;font-weight:700;color:#6d1b18;white-space:nowrap">Voz do Chef:</label>' +
    '<select id="voice-select" style="flex:1;min-width:0;font-size:.74rem;background:transparent;border:0;color:#4a1c17;font-weight:600">' +
    voiceOpts +
    '</select></div>' +
    '<button type="button" class="interactive-hit" style="top:51.4%;left:3.2%;width:60.0%;height:4.2%;border-radius:99px" data-action="play-chef-welcome" aria-label="Ouvir boas-vindas do Chefe"></button>' +
    '<button type="button" class="interactive-hit" style="top:51.6%;left:64.5%;width:32.5%;height:3.8%;border-radius:99px" data-action="clear-chat" aria-label="Limpar conversa"></button>' +
    '<button type="button" class="interactive-hit" style="top:56.8%;left:3.2%;width:62.0%;height:3.3%;border-radius:99px" data-action="use-quick-prompt" data-prompt="Por que a minha massa rasga na hora de abrir?" aria-label="Pergunta rápida: Por que a minha massa rasga na hora de abrir?"></button>' +
    '<button type="button" class="interactive-hit" style="top:56.8%;left:66.8%;width:30.2%;height:3.3%;border-radius:99px" data-action="use-quick-prompt" data-prompt="Qual o tempo ideal de descanso da massa?" aria-label="Pergunta rápida: Qual o tempo ideal de descanso da massa?"></button>' +
    '<form id="chat-form" style="display:contents">' +
    '<input id="chat-prompt" class="master-input" style="top:74.6%;left:4.2%;width:71.8%;height:3.7%" placeholder="Escreva sua pergunta ao Chef…" autocomplete="off" required aria-label="Escreva sua pergunta ao Chef">' +
    '<button type="submit" class="interactive-hit" style="top:74.6%;left:77.2%;width:19.2%;height:3.7%;border-radius:8px" aria-label="Enviar pergunta"></button>' +
    '</form>' +
    '</div>' +
    '</div>' +
    '</div>'
  );
}

function renderChat() {
  const box = document.querySelector('#chat-messages');
  if (!box) return;
  box.classList.toggle('is-populated', state.chat.length > 0 || state.chatBusy);
  if (!state.chat.length) {
    if (box.classList.contains('master-chat-messages')) {
      if (!state.chatBusy) box.innerHTML = '';
      return;
    }
    const greeting = buildChefWelcomeGreeting({
      userName: state.currentUser?.name || '',
      roleId: state.chatRole,
      page: state.page,
    });
    const role = getChatRole(state.chatRole);
    const welcomeCls = state.chefWelcomeActive ? ' is-welcoming' : '';
    box.innerHTML =
      '<div class="chat-message assistant chef-welcome-bubble' +
      welcomeCls +
      '"><div class="chat-msg-meta"><img src="' +
      CHEF_AVATAR_URL +
      '" alt="" class="msg-chef-ico">' +
      escapeHtml(role.label) +
      '</div><div class="chef-welcome-headline">' +
      escapeHtml(greeting.headline) +
      '</div><div>' +
      escapeHtml(greeting.message) +
      '</div><div class="chef-welcome-actions"><button type="button" class="chef-audio-cue-btn" data-action="play-chef-welcome" aria-label="Ouvir saudação de boas-vindas do Chefe">🔊 Ouvir boas-vindas</button></div></div>';
    return;
  }
  box.innerHTML = state.chat
    .map((m, idx) => {
      const cls = m.role === 'user' ? 'user' : 'assistant';
      const meta =
        m.role === 'assistant'
          ? '<div class="chat-msg-meta"><img src="' +
            CHEF_AVATAR_URL +
            '" alt="" class="msg-chef-ico">' +
            escapeHtml(m.roleLabel || 'Chef FerveC') +
            '</div>'
          : '';
      const listenBtn =
        m.role === 'assistant' && !m.isError
          ? '<div class="chat-msg-actions"><button type="button" class="chef-audio-cue-btn" data-action="speak-chat-msg" data-idx="' +
            idx +
            '" aria-label="Ouvir resposta do Chefe">🔊 Ouvir</button></div>'
          : '';
      return '<div class="chat-message ' + cls + (m.isError ? ' is-error' : '') + '">' + meta + '<div>' + escapeHtml(m.content) + '</div>' + listenBtn + '</div>';
    })
    .join('');
  box.scrollTop = box.scrollHeight;
}

function renderVoiceTranscripts() {
  const box = document.querySelector('#voice-transcripts');
  if (!box) return;
  if (!state.voiceTranscripts.length) {
    box.innerHTML = '<div class="voice-empty">As transcrições da sua fala e da resposta do Chefe aparecerão aqui em tempo real.</div>';
    return;
  }
  box.innerHTML = state.voiceTranscripts
    .map((t) => '<div class="chat-message ' + (t.role === 'user' ? 'user' : 'assistant') + '">' + escapeHtml(t.text) + '</div>')
    .join('');
  box.scrollTop = box.scrollHeight;
}

function refreshVoiceStatusUI() {
  const badge = document.querySelector('#voice-status-badge');
  const label = document.querySelector('#voice-status-label');
  const detail = document.querySelector('#voice-detail-text');
  const btn = document.querySelector('#voice-toggle-btn');
  const sel = document.querySelector('#voice-select');
  const stage = document.querySelector('.chef-kitchen-stage');
  if (!badge) return;
  const isLive = state.voiceStatus === 'connected' || state.voiceStatus === 'connecting';
  badge.className = 'voice-status-badge is-' + state.voiceStatus;
  stage?.classList.toggle('is-live', isLive);
  if (label) {
    label.textContent =
      state.voiceStatus === 'connected'
        ? 'Chefe ouvindo ao vivo'
        : state.voiceStatus === 'connecting'
          ? 'Chamando o Chefe…'
          : state.voiceStatus === 'error'
            ? 'Indisponível'
            : 'Pronto para dialogar';
  }
  if (detail) detail.textContent = state.voiceDetail;
  if (btn) {
    btn.className = 'btn ' + (isLive ? 'btn-danger' : 'btn-primary');
    const span = btn.querySelector('span');
    if (span) {
      span.textContent =
        state.voiceStatus === 'connecting'
          ? 'Cancelar chamada'
          : isLive
            ? 'Encerrar conversa com o Chefe'
            : 'Converse com o Chefe';
    }
  }
  if (sel) sel.disabled = isLive;
}

function appendVoiceTranscript(role, chunk) {
  const clean = String(chunk || '').trim();
  if (!clean) return;
  const last = state.voiceTranscripts[state.voiceTranscripts.length - 1];
  if (last && last.role === role) {
    last.text = (last.text + ' ' + clean).replace(/\s+/g, ' ').trim();
  } else {
    state.voiceTranscripts.push({ role, text: clean });
  }
  if (!isDemoMode()) {
    state.data.voiceTranscripts = state.voiceTranscripts.slice(-30);
    persist();
  }
  renderVoiceTranscripts();
}

function ensureLiveClient() {
  if (liveVoiceClient) return liveVoiceClient;
  liveVoiceClient = createLiveVoiceClient({
    onStatus: (status, detail) => {
      state.voiceStatus = status;
      if (detail) state.voiceDetail = detail;
      if (state.active === 'assistant' && state.assistantTab === 'voice') refreshVoiceStatusUI();
    },
    onTranscript: (role, text) => appendVoiceTranscript(role, text),
    onLevel: (lvl) => {
      state.voiceLevel = lvl;
      const fill = document.querySelector('#voice-meter-fill');
      if (fill) fill.style.width = Math.round(lvl * 100) + '%';
    },
    onError: (msg) => {
      state.voiceStatus = 'error';
      state.voiceDetail = msg || 'Não foi possível conectar com o Chefe por voz.';
      if (state.active === 'assistant' && state.assistantTab === 'voice') refreshVoiceStatusUI();
      toast(state.voiceDetail, true);
    },
  });
  return liveVoiceClient;
}

async function toggleVoiceSession() {
  state.assistantTab = 'chat';
  toast('Entrada por microfone desativada. Envie sua dúvida por escrito e ouça o Chef!');
}

function progressView() {
  const demo = isDemoMode();
  const last = demo ? 1 : state.data.lastPage || 1;
  const total = state.total || 74;
  const readPct = Math.round((last / total) * 100);
  const evo = computeEvolutionSummary({
    visited: demo ? [] : state.data.visited,
    totalPages: total,
    completed: demo ? [] : state.data.completed,
    practiced: demo ? [] : state.data.practiced,
    recipesCount: state.data.recipes.length,
    bookmarksCount: demo ? 0 : state.data.bookmarks.length,
    notesCount: demo ? 0 : state.data.notes.length,
    reviewCount: 0,
    totalStudyTargets: studyPages.length,
  });

  const authDynamicOverlays = demo
    ? ''
    : '<div class="master-parchment-cover" style="top:30.0%;left:25.8%;width:41.8%;height:8.6%;background:#f7ebd0;padding:2px 4px;display:flex;flex-direction:column;justify-content:center">' +
      '<strong style="font-family:var(--serif);color:#6d1b18;font-size:.78rem;line-height:1.1">Página ' +
      last +
      ' de ' +
      total +
      '</strong>' +
      '<span style="font-size:.66rem;color:#4f3a27;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' +
      escapeHtml(pageTitle(last)) +
      '</span>' +
      '<div class="progress-track" style="height:5px;margin:3px 0 2px"><i style="width:' +
      readPct +
      '%"></i></div>' +
      '<span style="font-size:.62rem;color:#6d1b18">' +
      readPct +
      '% concluído</span>' +
      '</div>' +
      '<div class="master-parchment-cover" style="top:44.4%;left:10.3%;width:15.8%;height:7.6%;background:#f7ebd0;display:grid;place-items:center;text-align:center">' +
      '<strong style="font-family:var(--serif);color:#6d1b18;font-size:1.12rem;line-height:1">' +
      evo.bookPct +
      '%</strong><span style="font-size:.58rem;color:#4f3a27">Concluído</span></div>' +
      '<div class="master-parchment-cover" style="top:44.6%;left:30.8%;width:54.5%;height:3.5%;background:#f7ebd0;font-family:var(--serif);font-weight:700;color:#6d1b18;font-size:.80rem;line-height:1.15;display:flex;align-items:center">Você já leu ' +
      evo.visitedUnique +
      ' de ' +
      evo.totalPages +
      ' páginas.</div>' +
      '<div class="master-parchment-cover" style="top:57.4%;left:9.4%;width:13.6%;height:4.2%;background:#f7ebd0;display:grid;place-items:center;font-weight:700;color:#6d1b18;font-size:.92rem;line-height:1">' +
      evo.visitedUnique +
      '</div>' +
      '<div class="master-parchment-cover" style="top:57.4%;left:33.0%;width:13.6%;height:4.2%;background:#f7ebd0;display:grid;place-items:center;font-weight:700;color:#6d1b18;font-size:.92rem;line-height:1">' +
      evo.completedCount +
      '</div>' +
      '<div class="master-parchment-cover" style="top:57.4%;left:56.2%;width:13.6%;height:4.2%;background:#f7ebd0;display:grid;place-items:center;font-weight:700;color:#6d1b18;font-size:.92rem;line-height:1">' +
      evo.practicedCount +
      '</div>' +
      '<div class="master-parchment-cover" style="top:57.4%;left:79.4%;width:13.6%;height:4.2%;background:#f7ebd0;display:grid;place-items:center;font-weight:700;color:#6d1b18;font-size:.92rem;line-height:1">' +
      evo.notesCount +
      '</div>' +
      '<div class="master-parchment-cover" style="top:70.0%;left:38.8%;width:56.8%;height:18.6%;background:#f5e6c5;display:grid;grid-template-rows:repeat(6,1fr);gap:2px;padding:1px 0">' +
      evo.chapters
        .map(
          (ch) =>
            '<div style="display:grid;grid-template-columns:1fr 78px 34px;align-items:center;gap:6px">' +
            '<div class="progress-track" style="height:6px;margin:0"><i style="width:' +
            ch.pct +
            '%"></i></div>' +
            '<span style="font-size:.62rem;color:#3d2b1c;text-align:right">' +
            ch.read +
            ' de ' +
            ch.total +
            ' páginas</span>' +
            '<strong style="font-size:.66rem;color:#6d1b18;text-align:center">' +
            ch.pct +
            '%</strong></div>'
        )
        .join('') +
      '</div>';

  return (
    '<div class="app-home-master-wrap">' +
    '<div class="master-image-canvas">' +
    '<img src="/assets/aistudio/WhatsApp_Image_2026-11-23_at_14.11.39__3__c92d6095.jpeg" alt="FerveC Gastronomia - Minha Evolução" class="master-ref-img">' +
    authDynamicOverlays +
    '<div class="interactive-overlay-layer">' +
    masterSubpageChromeMarkup({
      menu: [0.8, 2.8, 6.2, 3.4],
      back: [0.8, 10.6, 14.0, 3.4],
      register: [0.8, 79.2, 18.2, 3.4],
      banner: null,
    }) +
    '<button type="button" class="interactive-hit" style="top:29.8%;left:9.0%;width:15.5%;height:8.6%;border-radius:8px" data-action="' +
    (demo ? 'go" data-view="book' : 'open-page" data-page="' + last) +
    '" aria-label="Abrir livro"></button>' +
    '<button type="button" class="interactive-hit" style="top:30.8%;left:69.5%;width:25.8%;height:4.5%;border-radius:99px" data-action="' +
    (demo ? 'go-register' : 'open-page" data-page="' + last) +
    '" aria-label="' +
    (demo ? 'Cadastrar para continuar' : 'Continuar leitura') +
    '"></button>' +
    '</div>' +
    '</div>' +
    '</div>'
  );
}

// --- Explorar Restaurantes Próximos (OpenFreeMap + MapLibre GL JS + OpenStreetMap Overpass/Nominatim) ---
let mapInstance = null;
let mapMarkers = [];
let markerByPlaceId = new Map();

function resetRestaurantsMapRefs() {
  for (const m of mapMarkers) {
    try {
      m.remove();
    } catch {}
  }
  mapMarkers = [];
  markerByPlaceId = new Map();
  if (mapInstance) {
    try {
      mapInstance.remove();
    } catch {}
  }
  mapInstance = null;
}

function restaurantCardHtml(p, idx, isHighlight, isSelected) {
  const hasRealHours = Boolean(p.openingHours);
  const phoneHtml = p.phone
    ? '<p class="rest-extra-info">📞 ' + escapeHtml(p.phone) + '</p>'
    : '';
  const websiteHtml = p.website
    ? '<a class="btn btn-soft" href="' +
      escapeHtml(p.website) +
      '" target="_blank" rel="noopener noreferrer">Site</a>'
    : '';

  return (
    '<article class="rest-card surface ' +
    (isHighlight ? 'is-featured' : '') +
    (isSelected ? ' is-selected' : '') +
    '" data-place-card="' +
    escapeHtml(p.id) +
    '">' +
    '<div class="rest-card-body">' +
    '<div class="rest-card-badges">' +
    (isHighlight ? '<span class="rest-featured-badge">⭐ Próximo & Completo</span>' : '<span class="rest-num-badge">#' + (idx + 1) + '</span>') +
    '<span class="rest-type-badge">' +
    escapeHtml(p.primaryTypeLabel || p.amenityLabel || 'Restaurante') +
    '</span>' +
    '</div>' +
    '<h3>' +
    escapeHtml(p.name) +
    '</h3>' +
    '<div class="rest-meta-line">' +
    '<span class="rest-dist">📍 ' +
    escapeHtml(p.distanceLabel) +
    '</span>' +
    '</div>' +
    '<p class="rest-address"><strong>Endereço:</strong> ' +
    escapeHtml(p.address) +
    '</p>' +
    '<p class="rest-hours ' +
    (hasRealHours ? 'has-hours' : 'no-hours') +
    '">🕒 <strong>Horário:</strong> ' +
    escapeHtml(hasRealHours ? p.openingHours : 'Não informado no OpenStreetMap') +
    '</p>' +
    phoneHtml +
    '<div class="rest-card-actions">' +
    '<a class="btn btn-primary rest-dir-btn" href="' +
    escapeHtml(p.directionsUrl) +
    '" target="_blank" rel="noopener noreferrer">' +
    appIcon('directions') +
    '<span>Como Chegar</span></a>' +
    '<button type="button" class="btn btn-outline" data-action="focus-restaurant" data-place-id="' +
    escapeHtml(p.id) +
    '">Ver no mapa</button>' +
    websiteHtml +
    '<a class="btn btn-soft" href="' +
    escapeHtml(p.osmUrl) +
    '" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>' +
    '</div>' +
    '</div></article>'
  );
}

function restaurantsView() {
  const demo = isDemoMode();
  const ranked = rankRestaurantsByOsm(state.restaurants, state.restaurantSort);
  const featuredIds = new Set(ranked.slice(0, 2).map((f) => f.id));

  const cuisineCoords = [
    ['all', 2.5, 13.8, 'Todas'],
    ['italian', 16.8, 12.8, 'Italiana'],
    ['japanese', 30.0, 13.6, 'Japonesa'],
    ['brazilian', 44.0, 13.4, 'Brasileira'],
    ['french', 57.8, 12.6, 'Francesa'],
    ['pizza', 70.8, 12.2, 'Pizzas'],
    ['cafe', 83.4, 14.0, 'Cafeterias'],
  ];

  const cuisineHits = cuisineCoords
    .map(
      ([id, l, w, label]) =>
        '<button type="button" class="interactive-hit ' +
        (!demo && state.restaurantCuisine === id ? 'is-master-pill-active' : '') +
        '" style="top:51.6%;left:' +
        l +
        '%;width:' +
        w +
        '%;height:2.9%;border-radius:99px" data-action="filter-cuisine" data-cuisine="' +
        id +
        '" aria-pressed="' +
        (state.restaurantCuisine === id ? 'true' : 'false') +
        '" aria-label="Filtrar cozinha: ' +
        label +
        '"></button>'
    )
    .join('');

  const sortCoords = [
    ['featured', 21.4, 24.4, 'Mais completos'],
    ['distance', 46.2, 25.0, 'Mais próximos'],
    ['name', 71.8, 25.4, 'Ordem A–Z'],
  ];

  const sortHits = sortCoords
    .map(
      ([id, l, w, label]) =>
        '<button type="button" class="interactive-hit ' +
        (!demo && state.restaurantSort === id ? 'is-master-pill-active' : '') +
        '" style="top:56.0%;left:' +
        l +
        '%;width:' +
        w +
        '%;height:3.2%;border-radius:99px" data-action="sort-restaurants" data-sort="' +
        id +
        '" aria-label="Ordenar por: ' +
        label +
        '"></button>'
    )
    .join('');

  const liveMapOverlay = demo
    ? '<button type="button" class="interactive-hit" style="top:60.8%;left:3.2%;width:93.6%;height:28.6%;border-radius:12px" data-action="go-register" aria-label="Cadastrar para usar o mapa interativo"></button>'
    : '<section class="rest-map-frame master-live-map-frame" style="top:60.8%;left:3.2%;width:93.6%;height:28.6%" aria-label="Mapa interativo de restaurantes (OpenFreeMap)"><div id="restaurants-map-canvas" class="restaurants-map-canvas" style="width:100%;height:100%"></div></section>';

  const cardsHtml = ranked
    .map((p, idx) => restaurantCardHtml(p, idx, featuredIds.has(p.id), state.selectedPlaceId === p.id))
    .join('');

  const authResultsSection = demo
    ? ''
    : '<div class="fervec-page-body rest-master-results">' +
      '<div class="rest-status-slot">' +
      (state.restaurantsLoading
        ? '<div class="loading">Buscando restaurantes reais no OpenStreetMap…</div>'
        : state.restaurantsError
          ? '<div class="notice rest-retry-notice"><p>' +
            escapeHtml(state.restaurantsError) +
            '</p><button type="button" class="btn btn-outline btn-small" data-action="retry-restaurants">Tentar novamente</button></div>'
          : state.restaurantsCacheNotice
            ? '<div class="rest-cache-note">' + escapeHtml(state.restaurantsCacheNotice) + '</div>'
            : '') +
      '</div>' +
      '<section class="rest-results-head"><h2>' +
      (ranked.length ? ranked.length + ' restaurantes encontrados' : 'Restaurantes próximos') +
      '</h2>' +
      (state.restaurantsGeocodedLabel
        ? '<small>Área pesquisada: ' + escapeHtml(state.restaurantsGeocodedLabel) + '</small>'
        : '<small>Dados abertos reais do OpenStreetMap ao redor do ponto selecionado</small>') +
      '</section>' +
      (cardsHtml
        ? '<div class="rest-cards-list">' + cardsHtml + '</div>'
        : '<section class="surface empty-state compact"><div class="empty-icon">📍</div><h3>Carregando restaurantes no mapa</h3><p>Autorize sua localização ou busque por cidade ou bairro acima.</p></section>') +
      '</div>';

  return (
    '<div class="app-home-master-wrap">' +
    '<div class="master-image-canvas">' +
    '<img src="/assets/aistudio/WhatsApp_Image_2026-11-23_at_14.11.38__1__98b2899d.jpeg" alt="FerveC Gastronomia - Explorar Restaurantes Próximos" class="master-ref-img">' +
    liveMapOverlay +
    '<div class="interactive-overlay-layer">' +
    masterSubpageChromeMarkup({
      menu: [0.8, 2.8, 6.8, 3.4],
      back: [0.8, 11.4, 15.2, 3.4],
      register: [0.8, 69.8, 27.0, 3.4],
      banner: [5.2, 71.0, 26.0, 3.0],
      bannerStrip: [4.2, 2.0, 96.0, 4.7],
    }) +
    '<button type="button" class="interactive-hit" style="top:37.3%;left:5.5%;width:49.0%;height:3.4%;border-radius:99px" data-action="' +
    (state.geoConsent && state.userLocation ? 'request-geo-location' : 'grant-geo-consent') +
    '" aria-label="Usar minha localização"></button>' +
    '<form id="restaurant-search-form" style="display:contents">' +
    '<input id="restaurant-search-input" class="master-input" style="top:44.6%;left:9.6%;width:66.8%;height:3.3%" placeholder="Ex.: Moema, Curitiba, Cantina, Trattoria…" value="' +
    escapeHtml(state.restaurantQuery) +
    '" aria-label="Buscar por cidade, bairro ou nome">' +
    '<button type="submit" class="interactive-hit" style="top:44.6%;left:78.0%;width:17.5%;height:3.3%;border-radius:99px" aria-label="Buscar restaurantes"></button>' +
    '</form>' +
    cuisineHits +
    sortHits +
    '</div>' +
    '</div>' +
    authResultsSection +
    '</div>'
  );
}

async function initRestaurantsExperience() {
  const mapEl = document.querySelector('#restaurants-map-canvas');
  if (!mapEl) return;
  try {
    const { map } = await createInteractiveRestaurantMap(mapEl, state.userLocation || state.mapCenter);
    mapInstance = map;
    state.mapsConfigured = true;
    await runRestaurantSearch({ skipLoadingRender: false });
  } catch (err) {
    state.mapsConfigured = false;
    state.restaurantsError =
      err?.message || 'Não foi possível carregar o mapa interativo agora. Verifique sua conexão e tente novamente.';
    const slot = document.querySelector('#restaurants-map-canvas');
    if (slot) {
      slot.innerHTML =
        '<div class="map-unavailable-box"><strong>Mapa indisponível no momento</strong><p>' +
        escapeHtml(state.restaurantsError) +
        '</p></div>';
    }
  }
}

let restaurantSearchDebounceTimer = null;

function scheduleRestaurantSearch({ skipLoadingRender = false, delayMs = 450 } = {}) {
  if (restaurantSearchDebounceTimer) {
    clearTimeout(restaurantSearchDebounceTimer);
  }
  restaurantSearchDebounceTimer = setTimeout(() => {
    restaurantSearchDebounceTimer = null;
    void runRestaurantSearch({ skipLoadingRender });
  }, Math.max(400, delayMs));
}

async function runRestaurantSearch({ skipLoadingRender = false } = {}) {
  state.restaurantsLoading = true;
  state.restaurantsError = '';
  state.restaurantsCacheNotice = '';
  if (!skipLoadingRender) {
    const statusSlot = document.querySelector('.rest-status-slot');
    if (statusSlot) statusSlot.innerHTML = '<div class="loading">Buscando restaurantes reais no OpenStreetMap…</div>';
  }
  try {
    const center = state.userLocation || state.mapCenter || DEFAULT_MAP_CENTER;
    const res = await searchRestaurantsOsm({
      center,
      query: state.restaurantQuery,
      cuisineId: state.restaurantCuisine,
      radiusMeters: 3500,
      maxResultCount: 24,
    });
    state.restaurants = res.items;
    state.restaurantsGeocodedLabel = res.geocodedLabel || '';
    state.restaurantsCacheNotice = res.fromCache ? 'Exibindo consulta recente em cache local (5 min).' : '';
    if (res.searchCenter) {
      state.mapCenter = res.searchCenter;
      if (mapInstance && state.restaurants.length === 0) {
        mapInstance.flyTo({ center: [res.searchCenter.lng, res.searchCenter.lat], zoom: 14 });
      }
    }
    state.restaurantsLoading = false;
    await syncMapMarkersAndCards();
  } catch (err) {
    if (err?.name === 'AbortError') return;
    state.restaurantsLoading = false;
    state.restaurantsError =
      err?.message || 'O servidor público do OpenStreetMap está temporariamente ocupado. Tente novamente em instantes.';
    renderRestaurantsListOnly();
  }
}

async function syncMapMarkersAndCards() {
  const ranked = rankRestaurantsByOsm(state.restaurants, state.restaurantSort);
  if (mapInstance) {
    const res = await renderRestaurantMarkers({
      map: mapInstance,
      restaurants: ranked,
      existingMarkers: mapMarkers,
      userLocation: state.geoConsent ? state.userLocation : null,
      onSelect: (placeId) => {
        state.selectedPlaceId = placeId;
        document.querySelectorAll('[data-place-card]').forEach((el) => {
          el.classList.toggle('is-selected', el.dataset.placeCard === placeId);
        });
        document
          .querySelector('[data-place-card="' + CSS.escape(placeId) + '"]')
          ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      },
    });
    mapMarkers = res.markers;
    markerByPlaceId = res.markerById;
  }
  renderRestaurantsListOnly();
}

function renderRestaurantsListOnly() {
  if (state.active !== 'restaurants') return;
  const body = document.querySelector('.fervec-page-body');
  if (!body) return;
  const ranked = rankRestaurantsByOsm(state.restaurants, state.restaurantSort);
  const featuredIds = new Set(ranked.slice(0, 2).map((f) => f.id));

  const head = body.querySelector('.rest-results-head');
  if (head) {
    head.innerHTML =
      '<h2>' +
      (ranked.length ? ranked.length + ' restaurantes encontrados' : 'Restaurantes próximos') +
      '</h2>' +
      (state.restaurantsGeocodedLabel
        ? '<small>Área pesquisada: ' + escapeHtml(state.restaurantsGeocodedLabel) + '</small>'
        : '<small>Dados abertos reais do OpenStreetMap ao redor do ponto selecionado</small>');
  }

  let statusEl = body.querySelector('.rest-status-slot');
  if (!statusEl) {
    statusEl = document.createElement('div');
    statusEl.className = 'rest-status-slot';
    head?.before(statusEl);
  }
  statusEl.innerHTML = state.restaurantsLoading
    ? '<div class="loading">Buscando restaurantes reais no OpenStreetMap…</div>'
    : state.restaurantsError
      ? '<div class="notice rest-retry-notice"><p>' +
        escapeHtml(state.restaurantsError) +
        '</p><button type="button" class="btn btn-outline btn-small" data-action="retry-restaurants">Tentar novamente</button></div>'
      : state.restaurantsCacheNotice
        ? '<div class="rest-cache-note">' + escapeHtml(state.restaurantsCacheNotice) + '</div>'
        : '';

  const listWrap = body.querySelector('.rest-cards-list') || body.querySelector('.empty-state');
  const cardsHtml = ranked
    .map((p, idx) => restaurantCardHtml(p, idx, featuredIds.has(p.id), state.selectedPlaceId === p.id))
    .join('');

  if (listWrap) {
    listWrap.outerHTML = cardsHtml
      ? '<div class="rest-cards-list">' + cardsHtml + '</div>'
      : '<section class="surface empty-state compact"><div class="empty-icon">📍</div><h3>Nenhum restaurante encontrado</h3><p>Tente outro bairro, cidade ou tipo de gastronomia acima.</p></section>';
  }
}

function requestBrowserGeolocation() {
  if (!navigator.geolocation) {
    state.geoStatus = 'error';
    state.geoError = 'Seu navegador não oferece suporte a geolocalização. Use a busca por cidade ou bairro.';
    renderView();
    return;
  }
  state.geoStatus = 'locating';
  state.geoError = '';
  const btn = document.querySelector('[data-action="grant-geo-consent"]');
  if (btn) btn.textContent = 'Buscando sua posição…';

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      state.geoConsent = true;
      state.geoStatus = 'granted';
      state.geoError = '';
      state.userLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      state.mapCenter = { ...state.userLocation };
      if (mapInstance) {
        mapInstance.flyTo({ center: [state.userLocation.lng, state.userLocation.lat], zoom: 14 });
        const lgpdCard = document.querySelector('.lgpd-consent-card');
        if (lgpdCard) {
          lgpdCard.querySelector('.lgpd-consent-copy p').textContent =
            'Localização autorizada apenas durante esta visita para mostrar restaurantes perto de você. Você pode desligar quando quiser.';
          lgpdCard.querySelector('.lgpd-consent-actions').innerHTML =
            '<button type="button" class="btn btn-outline" data-action="request-geo-location">Atualizar localização</button><button type="button" class="btn btn-soft" data-action="revoke-geo-consent">Desligar localização</button>';
        }
        runRestaurantSearch({ skipLoadingRender: false });
      } else {
        renderView();
      }
      toast('Localização obtida! Buscando restaurantes próximos.');
    },
    (err) => {
      state.geoConsent = false;
      state.geoStatus = err.code === 1 ? 'denied' : 'error';
      state.geoError =
        err.code === 1
          ? 'Permissão de localização recusada no navegador. Pesquise por cidade ou bairro manualmente.'
          : 'Não foi possível obter sua posição agora. Pesquise por cidade ou bairro.';
      toast(state.geoError, true);
      const errP = document.querySelector('.lgpd-error');
      if (errP) errP.textContent = state.geoError;
      else renderView();
    },
    { enableHighAccuracy: true, timeout: 9000, maximumAge: 60000 }
  );
}

function openModal(title, body, meta = {}) {
  state.modal = meta;
  const el = document.createElement('div');
  el.className = 'modal-backdrop';
  el.id = 'modal-backdrop';
  el.innerHTML =
    '<section class="modal" role="dialog" aria-modal="true" aria-label="' +
    escapeHtml(title) +
    '"><button class="modal-close" data-action="close-modal" aria-label="Fechar">×</button><h2>' +
    title +
    '</h2>' +
    body +
    '</section>';
  document.body.appendChild(el);
  setTimeout(() => el.querySelector('input,textarea')?.focus(), 20);
}

function closeModal() {
  document.querySelector('#modal-backdrop')?.remove();
  state.modal = null;
}

function studyModal(n) {
  openModal(
    'Atividade · página ' + n,
    '<div class="notice"><strong>' +
      escapeHtml(pageTitle(n)) +
      '</strong><br>Leia a página ' +
      n +
      ' no e-book. Registre abaixo uma observação ou descreva o que praticou. Não há resposta pronta: esta é sua reflexão de aprendizagem.</div><div class="field"><label for="study-response">Minha observação prática</label><textarea id="study-response" placeholder="O que observou ao ler ou praticar?" required></textarea></div><button class="btn btn-outline btn-small" data-action="open-page" data-page="' +
      n +
      '">Ler página no livro</button><div class="modal-actions"><button class="btn btn-outline" data-action="close-modal">Cancelar</button><button class="btn btn-primary" data-action="complete-study" data-page="' +
      n +
      '">Registrar como concluída</button></div>',
    { studyPage: n }
  );
}

async function makePdf() {
  const form = document.querySelector('#recipe-form');
  if (!form) return;
  const recipe = collectRecipe(form);
  if (!recipe.name) {
    toast('Informe o nome da receita.', true);
    return;
  }
  try {
    const { jsPDF } = await import('https://cdn.jsdelivr.net/npm/jspdf@2.5.2/+esm');
    const doc = new jsPDF();
    doc.setFillColor(121, 29, 27);
    doc.rect(0, 0, 210, 35, 'F');
    doc.setTextColor(255, 249, 233);
    doc.setFont('times', 'bold');
    doc.setFontSize(18);
    doc.text('FerveC Gastronomia', 16, 16);
    doc.setFontSize(11);
    doc.text('Caderno de receitas · Massa Italiana', 16, 25);
    doc.setTextColor(65, 48, 36);
    doc.setFontSize(21);
    doc.text(recipe.name, 16, 52);
    let y = 66;
    doc.setFont('times', 'bold');
    doc.setFontSize(14);
    doc.text('Ingredientes', 16, y);
    y += 8;
    doc.setFont('times', 'normal');
    doc.setFontSize(11);
    for (const ing of recipe.ingredients) {
      const lines = doc.splitTextToSize('• ' + ing, 175);
      doc.text(lines, 18, y);
      y += lines.length * 6;
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
    }
    y += 8;
    doc.setFont('times', 'bold');
    doc.setFontSize(14);
    doc.text('Descrição e modo de preparo', 16, y);
    y += 8;
    doc.setFont('times', 'normal');
    doc.setFontSize(11);
    doc.text(doc.splitTextToSize(recipe.description || '—', 175), 16, y);
    if (recipe.servings) doc.text('Porções: ' + recipe.servings, 16, 276);
    if (recipe.time) doc.text('Preparo: ' + recipe.time, 110, 276);
    doc.save((recipe.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'receita') + '.pdf');
    toast('PDF gerado com sucesso!');
  } catch (e) {
    console.error(e);
    toast('Não foi possível gerar o PDF agora.', true);
  }
}

function collectRecipe(form) {
  const cat = form.querySelector('#r-category')?.value || '';
  const res = {
    name: form.querySelector('#r-name').value.trim(),
    ingredients: [...form.querySelectorAll('[name="ingredient"]')].map((x) => x.value.trim()).filter(Boolean),
    description: form.querySelector('#r-description').value.trim(),
    servings: form.querySelector('#r-servings').value.trim(),
    time: form.querySelector('#r-time').value.trim(),
    favorite: form.querySelector('#r-favorite')?.checked ?? true,
  };
  if (cat) res.category = cat;
  else res.category = '';
  return res;
}

async function sendChatPrompt(rawPrompt, { speakReply = false } = {}) {
  if (isDemoMode()) {
    redirectToRegister();
    return;
  }
  const prompt = String(rawPrompt || '').trim();
  if (!prompt || state.chatBusy) return;
  state.chatBusy = true;
  const submitBtn = document.querySelector('#chat-form button[type="submit"]');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.setAttribute('aria-busy', 'true');
    if (!submitBtn.classList.contains('interactive-hit')) submitBtn.textContent = 'Enviando…';
  }
  const role = getChatRole(state.chatRole);
  state.chat.push({ role: 'user', content: prompt, timestamp: new Date().toISOString() });
  state.data.chat = sanitizeStoredChat(state.chat, 40);
  persist();
  renderChat();
  const box = document.querySelector('#chat-messages');
  let wait = null;
  if (box) {
    box.classList.add('is-populated');
    wait = document.createElement('div');
    wait.className = 'loading';
    wait.textContent = 'Consultando ' + role.label + '…';
    box.appendChild(wait);
    box.scrollTop = box.scrollHeight;
  }
  try {
    let txt = state.pageText[state.page] || '';
    if (state.chatIncludeContext && !txt) {
      try {
        const pdf = await Promise.race([
          ensurePDF(),
          new Promise((_, rej) => setTimeout(() => rej(new Error('pdf-timeout')), 2500)),
        ]);
        const pg = await pdf.getPage(state.page);
        const tc = await pg.getTextContent();
        txt = tc.items
          .map((x) => x.str)
          .join(' ')
          .slice(0, 3500);
        state.pageText[state.page] = txt;
      } catch {}
    }
    const history = sanitizeChatHistory(state.chat, 20);
    const systemInstruction = buildChatSystemInstruction({
      roleId: role.id,
      page: state.page,
      pageTitle: pageTitle(state.page),
      pageText: txt,
      includePageContext: state.chatIncludeContext,
    });
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ systemInstruction, messages: history, roleId: role.id, model: role.model }),
    });
    const completion = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(completion.error || 'Erro na resposta do servidor');
    const answer = completion.content || 'Não recebi uma resposta utilizável desta vez.';
    state.chat.push({
      role: 'assistant',
      content: answer,
      roleId: role.id,
      roleLabel: role.label,
      modelLabel: role.modelLabel,
      timestamp: new Date().toISOString(),
    });
    state.data.chat = sanitizeStoredChat(state.chat, 40);
    persist();
    if (speakReply && state.handsFreeMode) {
      speakWithGeminiTts(answer, state.voiceName, { resumeHandsFree: true });
    }
  } catch (err) {
    console.error(err);
    const rawErr = err?.message || 'Não consegui conectar ao Chefe nesta tentativa.';
    const msg = /503|UNAVAILABLE|high demand|429|RESOURCE_EXHAUSTED/i.test(rawErr)
      ? 'O Chefe está com muitas consultas no momento. Tente novamente em alguns segundos.'
      : rawErr;
    state.chat.push({
      role: 'assistant',
      content: msg,
      roleId: role.id,
      roleLabel: role.label,
      modelLabel: role.modelLabel,
      isError: true,
    });
    state.data.chat = sanitizeStoredChat(state.chat, 40);
    persist();
    toast(msg, true);
  } finally {
    wait?.remove();
    state.chatBusy = false;
    const latestBtn = document.querySelector('#chat-form button[type="submit"]');
    if (latestBtn) {
      latestBtn.disabled = false;
      latestBtn.removeAttribute('aria-busy');
      if (!latestBtn.classList.contains('interactive-hit')) latestBtn.textContent = 'Enviar';
    }
  }
  renderChat();
}

async function sendChat(e) {
  e.preventDefault();
  if (isDemoMode()) {
    redirectToRegister();
    return;
  }
  const input = document.querySelector('#chat-prompt');
  const prompt = input?.value.trim() || '';
  if (!prompt) return;
  input.value = '';
  await sendChatPrompt(prompt, { speakReply: state.handsFreeMode });
}

function openPageFromHere(n) {
  closeModal();
  state.page = parseInt(n);
  state.data.lastPage = state.page;
  persist();
  setView('book');
}

function toggleReview(n) {
  n = parseInt(n);
  if (state.data.review.includes(n)) state.data.review = state.data.review.filter((x) => x !== n);
  else state.data.review.push(n);
  persist();
  if (state.active === 'progress') renderView();
  else toast('Página marcada para revisar.');
}

function setSavedRecipePdf(r) {
  closeModal();
  openModal(
    'Gerar PDF',
    '<div class="notice">Para exportar uma receita salva, abra-a em edição e use Gerar PDF. Isso mantém o arquivo atualizado com suas alterações.</div><div class="modal-actions"><button class="btn btn-primary" data-action="edit-recipe" data-id="' +
      r.id +
      '">Abrir edição</button></div>'
  );
}

function playTimerChime() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const now = ctx.currentTime;
    [587.33, 880].forEach((freq, i) => {
      const osc = ctx.createOscillator(),
        gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.001, now + i * 0.18);
      gain.gain.exponentialRampToValueAtTime(0.12, now + i * 0.18 + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.18 + 0.42);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.18);
      osc.stop(now + i * 0.18 + 0.45);
    });
  } catch {}
}

function refreshRecipeTimerList(recipeId, includeHeader = false) {
  const card = document.querySelector('[data-recipe-card="' + recipeId + '"]');
  const r = state.data.recipes.find((x) => x.id === recipeId);
  if (!card || !r) return;
  const section = card.querySelector('.recipe-timer');
  if (!section) return;
  if (includeHeader) {
    section.outerHTML = recipeTimerMarkup(r);
    return;
  }
  const timers = (state.data.timers || []).filter((t) => t.recipeId === recipeId);
  const listEl = section.querySelector('.timer-list');
  const nextHtml = timers.length ? '<div class="timer-list">' + timers.map(timerRowMarkup).join('') + '</div>' : '';
  if (listEl) {
    listEl.outerHTML = nextHtml;
  } else if (nextHtml) {
    section.insertAdjacentHTML('beforeend', nextHtml);
  }
}

function startRecipeTimer(recipeId, label, durationSec) {
  if (durationSec <= 0) {
    toast('Informe um tempo maior que zero.', true);
    return;
  }
  const timer = createTimer({ id: crypto.randomUUID(), recipeId, label, durationSec, now: Date.now() });
  state.data.timers.push(timer);
  persist();
  ensureTimerLoop();
  if (state.active === 'recipes') refreshRecipeTimerList(recipeId);
  updateGlobalTimerSlot();
  toast('Timer iniciado: ' + timer.label);
}

function updateGlobalTimerSlot() {
  const slot = document.querySelector('#global-timer-slot');
  if (slot) slot.innerHTML = globalTimerMarkup();
}

function syncTimers() {
  if (isDemoMode()) return;
  const { timers, newlyCompleted } = tickTimers(state.data.timers, Date.now());
  state.data.timers = timers;
  if (newlyCompleted.length) {
    persist();
    playTimerChime();
    newlyCompleted.forEach((t) => toast('Timer concluído: ' + t.label));
    if (state.active === 'recipes') {
      newlyCompleted.forEach((t) => refreshRecipeTimerList(t.recipeId));
    }
  }
  updateGlobalTimerSlot();
  if (state.active === 'recipes') {
    state.data.timers.forEach((t) => {
      const row = document.querySelector('[data-timer-id="' + t.id + '"]');
      if (!row) return;
      const rem = getRemainingSeconds(t);
      const clock = row.querySelector('.timer-clock');
      if (clock) clock.textContent = formatCountdown(rem);
      const bar = row.querySelector('.progress-track i');
      if (bar && t.durationSec > 0) {
        const pct = Math.min(100, Math.max(0, Math.round(((t.durationSec - rem) / t.durationSec) * 100)));
        bar.style.width = pct + '%';
      }
    });
  }
  if (!state.data.timers.some((t) => t.status === 'running')) {
    clearInterval(state.timerInterval);
    state.timerInterval = null;
  }
}

function ensureTimerLoop() {
  if (isDemoMode()) return;
  if (state.timerInterval) return;
  if ((state.data.timers || []).some((t) => t.status === 'running')) {
    state.timerInterval = setInterval(syncTimers, 1000);
  }
}

function downloadRecipesCsv() {
  const csv = recipesToCsv(state.data.recipes, state.data.practiced);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'minhas-receitas-fervec.csv';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('Planilha Excel (.csv) exportada!');
}

function refreshRecipeChecklist(recipeId) {
  const card = document.querySelector('[data-recipe-card="' + recipeId + '"]');
  const r = state.data.recipes.find((x) => x.id === recipeId);
  if (!card || !r) return;
  const section = card.querySelector('.recipe-checklist');
  if (section) section.outerHTML = recipeChecklistMarkup(r);
}

function refreshDailyGoalsUI() {
  const el = document.querySelector('#daily-goals-section');
  if (el) el.outerHTML = dailyGoalsMarkup();
  if (state.active === 'progress') renderView();
}

function renderDelegatedAction(action, el) {
  if (state.view === 'app' && isDemoMode() && !isActionAllowedInDemo(action)) {
    redirectToRegister();
    return;
  }
  switch (action) {
    case 'return-portal':
      closeModal();
      state.menuOpen = false;
      document.querySelector('#app-drawer')?.classList.remove('open');
      document.querySelector('.drawer-backdrop')?.classList.remove('open');
      window.__fervecSetEnv?.('site');
      break;
    case 'go':
      closeModal();
      setView(el.dataset.view);
      break;
    case 'open-book-module':
      setView('home');
      break;
    case 'book-coming-soon':
      toast((el.dataset.title || 'Este livro') + ' está em produção e chega em breve!');
      break;
    case 'vinicola-category':
      state.vinicolaCategory = el.dataset.category || 'brancos';
      renderView();
      break;
    case 'vinicola-shelf-nav': {
      const cats = ['tintos', 'tintos', 'brancos', 'roses', 'espumantes'];
      const dir = Number(el.dataset.dir || 1);
      state.vinicolaBottleIdx = ((state.vinicolaBottleIdx || 2) + dir + 5) % 5;
      state.vinicolaCategory = cats[state.vinicolaBottleIdx] || 'brancos';
      renderView();
      break;
    }
    case 'vinicola-bottle': {
      const cat = el.dataset.category || 'brancos';
      const label = el.dataset.label || 'Rótulo FerveC';
      const info = VINICOLA_DATA[cat] || VINICOLA_DATA.brancos;
      state.vinicolaCategory = cat;
      renderView();
      openModal(
        label,
        '<div class="notice">' +
          escapeHtml(info.desc) +
          '</div><p style="margin:12px 0 4px"><strong>Uvas:</strong> ' +
          escapeHtml(info.uvas) +
          '<br><strong>Temperatura ideal:</strong> ' +
          escapeHtml(info.temp) +
          '<br><strong>Notas:</strong> ' +
          escapeHtml(info.notas) +
          '</p><p><strong>Harmonização com massas:</strong> ' +
          escapeHtml(info.pairings) +
          '</p>'
      );
      break;
    }
    case 'vinicola-selection': {
      const info = VINICOLA_DATA[state.vinicolaCategory || 'brancos'] || VINICOLA_DATA.brancos;
      openModal(
        'Seleção · ' + info.title,
        '<div class="notice">' +
          escapeHtml(info.desc) +
          '</div><p style="margin:12px 0"><strong>Sugestões de harmonização na cozinha:</strong> ' +
          escapeHtml(info.pairings) +
          '</p>'
      );
      break;
    }
    case 'vinicola-harmonizacao':
      openModal(
        'Guia de Harmonização FerveC',
        '<div class="notice">Combine a acidez e estrutura do vinho com a textura do molho da sua massa artesanal.</div>' +
          '<ul style="margin:12px 0;padding-left:18px;display:grid;gap:8px;font-size:.9rem">' +
          '<li><strong>Vinho Tinto (Itália / Chile):</strong> Massas ao Ragù, Carbonara, molhos encorpados.</li>' +
          '<li><strong>Vinho Branco:</strong> Ravioli de ricota e ervas, manteiga e sálvia, frutos do mar.</li>' +
          '<li><strong>Vinho Rosé:</strong> Molho pomodoro fresco, burrata e focaccia.</li>' +
          '<li><strong>Espumante:</strong> Massas leves, queijos macios e ocasiões especiais.</li></ul>'
      );
      break;
    case 'open-account-modal':
      openAccountModal();
      break;
    case 'toggle-menu': {
      state.menuOpen = !state.menuOpen;
      const drawer = document.querySelector('#app-drawer');
      drawer?.classList.toggle('open', state.menuOpen);
      drawer?.setAttribute('aria-hidden', state.menuOpen ? 'false' : 'true');
      document.querySelector('.drawer-backdrop')?.classList.toggle('open', state.menuOpen);
      el.setAttribute('aria-expanded', state.menuOpen ? 'true' : 'false');
      break;
    }
    case 'close-menu': {
      state.menuOpen = false;
      const drawer = document.querySelector('#app-drawer');
      drawer?.classList.remove('open');
      drawer?.setAttribute('aria-hidden', 'true');
      document.querySelector('.drawer-backdrop')?.classList.remove('open');
      break;
    }
    case 'go-register':
      redirectToRegister(
        'O cadastro de novos alunos agora é realizado no site principal do FerveC. Cadastre-se lá e volte para entrar após adquirir o curso.'
      );
      break;
    case 'go-login':
      state.view = 'login';
      state.loginTab = 'login';
      state.loginGateCta = '';
      state.demoLockNotice = '';
      state.menuOpen = false;
      render();
      break;
    case 'go-site-register':
      closeModal();
      state.menuOpen = false;
      document.querySelector('#app-drawer')?.classList.remove('open');
      document.querySelector('.drawer-backdrop')?.classList.remove('open');
      window.__fervecSetEnv?.('site', { targetRoute: 'create-profile' });
      break;
    case 'go-site-payments':
      closeModal();
      state.menuOpen = false;
      document.querySelector('#app-drawer')?.classList.remove('open');
      document.querySelector('.drawer-backdrop')?.classList.remove('open');
      window.__fervecSetEnv?.('site', { targetRoute: 'payments' });
      break;
    case 'open-site-course-sales':
      closeModal();
      state.menuOpen = false;
      document.querySelector('#app-drawer')?.classList.remove('open');
      document.querySelector('.drawer-backdrop')?.classList.remove('open');
      window.__fervecSetEnv?.('site', { targetRoute: 'sales' });
      break;
    case 'switch-login-tab':
      state.loginTab = 'login';
      state.demoLockNotice = '';
      render();
      break;
    case 'demo-info':
      redirectToRegister();
      break;
    case 'demo':
      state.authMode = 'demo';
      state.currentUser = null;
      state.demoLockNotice = '';
      state.demoChefWelcomed = false;
      state.chefWelcomeActive = false;
      state.data = loadData(true);
      state.chat = [];
      state.voiceTranscripts = [];
      state.view = 'app';
      state.active = 'home';
      state.menuOpen = false;
      state.page = 1;
      render();
      window.dispatchEvent(new CustomEvent('fervec:library-auth-change'));
      toast('Modo Demonstração · visualização da Biblioteca e do app.');
      break;
    case 'logout': {
      const token = getSessionToken();
      if (token) {
        fetch('/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: 'Bearer ' + token },
        }).catch(() => {});
      }
      clearTimeout(_dbSyncTimer);
      stopActiveTtsAudio();
      exitBookFullscreen(false);
      speechCtrl?.stop();
      liveVoiceClient?.stop();
      try {
        state.pdf?.destroy?.();
      } catch {}
      state.pdf = null;
      pdfLoading = null;
      state.pageText = {};
      try {
        if (typeof caches !== 'undefined' && typeof caches.delete === 'function') {
          caches.delete('fervec-pdf-cache').catch(() => {});
        }
      } catch {}
      clearSavedSession(localStorage);
      state.speechListening = false;
      state.handsFreeMode = false;
      state.speechInterim = '';
      state.chefWelcomeActive = false;
      state.demoChefWelcomed = false;
      state.authMode = 'none';
      state.currentUser = null;
      state.demoLockNotice = '';
      state.chat = [];
      state.voiceTranscripts = [];
      state.view = 'login';
      state.loginTab = 'login';
      state.menuOpen = false;
      render();
      window.dispatchEvent(new CustomEvent('fervec:library-auth-change'));
      break;
    }
    case 'set-promo-slide': {
      const next = Number.parseInt(el.dataset.slide, 10) === 1 ? 1 : 0;
      state.promoSlide = next;
      applyPromoSlideDom(next);
      startHomePromoCarousel();
      break;
    }
    case 'speak-chat-msg': {
      const msg = state.chat[Number.parseInt(el.dataset.idx, 10)];
      if (msg?.content) speakWithGeminiTts(msg.content, state.voiceName);
      break;
    }
    case 'switch-assistant-tab':
      state.assistantTab = 'chat';
      renderView();
      break;
    case 'set-chat-role':
      state.chatRole = el.dataset.roleId || 'chef-tutor';
      state.data.chatRole = state.chatRole;
      persist();
      renderView();
      break;
    case 'use-quick-prompt': {
      const p = el.dataset.prompt || '';
      if (p) sendChatPrompt(p, { speakReply: false });
      break;
    }
    case 'play-chef-welcome':
      playChefWelcomeAudio(true);
      break;
    case 'clear-chat':
      stopActiveTtsAudio();
      state.chat = [];
      state.data.chat = [];
      state.voiceTranscripts = [];
      state.data.voiceTranscripts = [];
      persist();
      renderChat();
      toast('Conversa limpa.');
      break;
    case 'toggle-speech-input':
    case 'toggle-handsfree':
    case 'toggle-voice-session':
      toast('Entrada por microfone desativada. Digite sua pergunta ao Chefe.');
      break;
    case 'password': {
      const input = document.querySelector('#password');
      if (!input) break;
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      el.innerHTML = appIcon(show ? 'eye' : 'eyeOff');
      el.setAttribute('aria-label', show ? 'Ocultar senha' : 'Mostrar senha');
      el.setAttribute('aria-pressed', show ? 'true' : 'false');
      break;
    }
    case 'bookmark':
      toggleBookmark();
      break;
    case 'toggle-bookmark-page':
      toggleBookmark(el.dataset.page);
      break;
    case 'pick-bookmark-image':
      document.querySelector('#bookmark-image-input')?.click();
      break;
    case 'reset-bookmark-image':
      state.data.customBookmarkImage = '';
      persist();
      renderView();
      toast('Marcador oficial FerveC restaurado.');
      break;
    case 'fullscreen-single':
      enterBookFullscreen('single');
      break;
    case 'fullscreen-double':
      enterBookFullscreen('double');
      break;
    case 'toggle-book-fullscreen':
      toggleBookFullscreen();
      break;
    case 'cycle-book-zoom':
      state.bookZoom = nextReaderZoom(state.bookZoom || 1);
      renderView();
      break;
    case 'prev':
      turn(-1);
      break;
    case 'next':
      turn(1);
      break;
    case 'open-page':
      openPageFromHere(el.dataset.page);
      break;
    case 'remove-bookmark':
      state.data.bookmarks = state.data.bookmarks.filter((x) => x.id !== el.dataset.id);
      persist();
      renderView();
      toast('Marcador removido.');
      break;
    case 'notes-sheet':
      state.notesSheet = Math.max(1, Number.parseInt(el.dataset.sheet, 10) || 1);
      renderView();
      break;
    case 'set-learn-filter':
      state.learnFilter = el.dataset.filter || 'all';
      renderView();
      break;
    case 'grant-geo-consent':
    case 'request-geo-location':
      requestBrowserGeolocation();
      break;
    case 'revoke-geo-consent':
      state.geoConsent = false;
      state.geoStatus = 'prompt';
      state.geoError = '';
      state.userLocation = null;
      state.mapCenter = { ...DEFAULT_MAP_CENTER };
      if (mapInstance) {
        mapInstance.flyTo({ center: [DEFAULT_MAP_CENTER.lng, DEFAULT_MAP_CENTER.lat], zoom: 13 });
        const lgpdCard = document.querySelector('.lgpd-consent-card');
        if (lgpdCard) {
          lgpdCard.querySelector('.lgpd-consent-copy p').textContent =
            'Toque no botão abaixo se quiser usar sua localização automática para achar restaurantes próximos. Se preferir, basta digitar sua cidade ou bairro abaixo.';
          lgpdCard.querySelector('.lgpd-consent-actions').innerHTML =
            '<button type="button" class="btn btn-primary" data-action="grant-geo-consent">📍 Usar minha localização</button>';
        }
        scheduleRestaurantSearch({ skipLoadingRender: false });
      } else {
        renderView();
      }
      toast('Localização automática desligada.');
      break;
    case 'retry-restaurants':
      scheduleRestaurantSearch({ skipLoadingRender: false });
      break;
    case 'filter-cuisine': {
      const nextCuisine = el.dataset.cuisine || 'all';
      state.restaurantCuisine = nextCuisine;
      document.querySelectorAll('[data-action="filter-cuisine"]').forEach((btn) => {
        const active = btn.dataset.cuisine === nextCuisine;
        btn.classList.toggle('is-active', active);
        btn.setAttribute('aria-pressed', active ? 'true' : 'false');
      });
      scheduleRestaurantSearch({ skipLoadingRender: false });
      break;
    }
    case 'sort-restaurants': {
      const nextSort = el.dataset.sort || 'featured';
      state.restaurantSort = nextSort;
      document.querySelectorAll('[data-action="sort-restaurants"]').forEach((btn) => {
        btn.classList.toggle('is-active', btn.dataset.sort === nextSort);
      });
      syncMapMarkersAndCards();
      break;
    }
    case 'focus-restaurant': {
      const pid = el.dataset.placeId || '';
      const entry = markerByPlaceId.get(pid);
      state.selectedPlaceId = pid;
      document.querySelectorAll('[data-place-card]').forEach((card) => {
        card.classList.toggle('is-selected', card.dataset.placeCard === pid);
      });
      if (entry && mapInstance) {
        if (entry.place.location) {
          mapInstance.flyTo({ center: [entry.place.location.lng, entry.place.location.lat], zoom: 16 });
        }
        openPlacePopup({ map: mapInstance, place: entry.place });
        document.querySelector('.rest-map-frame')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      break;
    }
    case 'new-recipe':
      recipeModal();
      break;
    case 'edit-recipe': {
      const r = state.data.recipes.find((x) => x.id === el.dataset.id);
      if (r) recipeModal(r);
      break;
    }
    case 'delete-recipe':
      if (confirm('Excluir esta receita?')) {
        state.data.recipes = state.data.recipes.filter((r) => r.id !== el.dataset.id);
        state.data.practiced = state.data.practiced.filter((i) => i !== el.dataset.id);
        state.data.timers = state.data.timers.filter((t) => t.recipeId !== el.dataset.id);
        if (state.data.ingredientChecks) delete state.data.ingredientChecks[el.dataset.id];
        if (state.data.checklistSort) delete state.data.checklistSort[el.dataset.id];
        if (state.data.ingredientCategories) delete state.data.ingredientCategories[el.dataset.id];
        persist();
        updateGlobalTimerSlot();
        renderView();
        toast('Receita excluída.');
      }
      break;
    case 'toggle-favorite': {
      const r = state.data.recipes.find((x) => x.id === el.dataset.id);
      if (r) {
        r.favorite = !r.favorite;
        persist();
        renderView();
        toast(r.favorite ? 'Marcada como favorita!' : 'Removida das favoritas.');
      }
      break;
    }
    case 'export-recipes-csv':
      downloadRecipesCsv();
      break;
    case 'jump-recipe-category': {
      const cat = el.dataset.category || 'all';
      state.recipeCategory = cat;
      renderView();
      const activePill = document.querySelector('.quick-jump-pill[data-category="' + cat + '"]');
      activePill?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      if (cat !== 'all') document.querySelector('#recipes-quick-anchor')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      break;
    }
    case 'practice': {
      const id = el.dataset.id;
      const adding = !state.data.practiced.includes(id);
      state.data.practiced = adding ? [...state.data.practiced, id] : state.data.practiced.filter((x) => x !== id);
      if (adding) state.data.dailyGoals = incrementDailyGoal(state.data.dailyGoals, 'goal-practice', 1, getTodayKey());
      persist();
      renderView();
      toast('Prática atualizada.');
      break;
    }
    case 'toggle-checklist-card': {
      const id = el.dataset.id;
      state.openChecklistCards[id] = !state.openChecklistCards[id];
      refreshRecipeChecklist(id);
      break;
    }
    case 'set-checklist-sort': {
      const rid = el.dataset.recipeId,
        sort = el.dataset.sort || 'default';
      if (!state.data.checklistSort) state.data.checklistSort = {};
      state.data.checklistSort[rid] = sort;
      persist();
      refreshRecipeChecklist(rid);
      break;
    }
    case 'toggle-ingredient-category': {
      const rid = el.dataset.recipeId,
        idx = el.dataset.index,
        cur = el.dataset.category;
      const r = state.data.recipes.find((x) => x.id === rid);
      if (!r) break;
      const total = (r.ingredients || []).length;
      if (!state.data.ingredientCategories) state.data.ingredientCategories = {};
      state.data.ingredientCategories[rid] = toggleIngredientCategory(state.data.ingredientCategories[rid], idx, cur, total);
      persist();
      refreshRecipeChecklist(rid);
      break;
    }
    case 'toggle-ingredient-check': {
      const rid = el.dataset.recipeId,
        idx = el.dataset.index;
      const r = state.data.recipes.find((x) => x.id === rid);
      if (!r) break;
      const total = (r.ingredients || []).length;
      if (!state.data.ingredientChecks) state.data.ingredientChecks = {};
      const next = toggleIngredientCheck(state.data.ingredientChecks[rid], idx, total);
      state.data.ingredientChecks[rid] = next;
      persist();
      refreshRecipeChecklist(rid);
      const prog = getIngredientChecklistProgress(r.ingredients, next);
      if (prog.allReady) toast('Mise en place pronta: ' + r.name + '!');
      break;
    }
    case 'reset-ingredient-checks': {
      const rid = el.dataset.id;
      if (!state.data.ingredientChecks) state.data.ingredientChecks = {};
      state.data.ingredientChecks[rid] = resetIngredientChecks();
      persist();
      refreshRecipeChecklist(rid);
      toast('Checklist reiniciado.');
      break;
    }
    case 'new-goal-modal':
      newGoalModal();
      break;
    case 'toggle-goal':
      state.data.dailyGoals = toggleDailyGoal(state.data.dailyGoals, el.dataset.id, getTodayKey());
      persist();
      refreshDailyGoalsUI();
      break;
    case 'inc-goal':
      state.data.dailyGoals = incrementDailyGoal(state.data.dailyGoals, el.dataset.id, 1, getTodayKey());
      persist();
      refreshDailyGoalsUI();
      break;
    case 'dec-goal':
      state.data.dailyGoals = incrementDailyGoal(state.data.dailyGoals, el.dataset.id, -1, getTodayKey());
      persist();
      refreshDailyGoalsUI();
      break;
    case 'remove-goal':
      state.data.dailyGoals = removeDailyGoal(state.data.dailyGoals, el.dataset.id, getTodayKey());
      persist();
      refreshDailyGoalsUI();
      toast('Meta removida.');
      break;
    case 'toggle-timer-card': {
      const id = el.dataset.id;
      state.openTimerCards[id] = !state.openTimerCards[id];
      refreshRecipeTimerList(id, true);
      break;
    }
    case 'preset-timer':
      startRecipeTimer(el.dataset.recipeId, el.dataset.label || 'Etapa', parseDurationSeconds(el.dataset.minutes, 0));
      break;
    case 'pause-timer': {
      const t = state.data.timers.find((x) => x.id === el.dataset.id);
      if (t) {
        Object.assign(t, pauseTimer(t, Date.now()));
        persist();
        refreshRecipeTimerList(t.recipeId);
        updateGlobalTimerSlot();
      }
      break;
    }
    case 'resume-timer': {
      const t = state.data.timers.find((x) => x.id === el.dataset.id);
      if (t) {
        Object.assign(t, resumeTimer(t, Date.now()));
        persist();
        ensureTimerLoop();
        refreshRecipeTimerList(t.recipeId);
        updateGlobalTimerSlot();
      }
      break;
    }
    case 'reset-timer': {
      const t = state.data.timers.find((x) => x.id === el.dataset.id);
      if (t) {
        Object.assign(t, resetTimer(t));
        persist();
        refreshRecipeTimerList(t.recipeId);
        updateGlobalTimerSlot();
      }
      break;
    }
    case 'remove-timer': {
      const t = state.data.timers.find((x) => x.id === el.dataset.id);
      state.data.timers = state.data.timers.filter((x) => x.id !== el.dataset.id);
      persist();
      if (t) refreshRecipeTimerList(t.recipeId);
      updateGlobalTimerSlot();
      break;
    }
    case 'close-modal':
      closeModal();
      break;
    case 'add-ingredient': {
      const box = document.querySelector('#ingredients');
      const num = box.children.length + 1;
      box.insertAdjacentHTML(
        'beforeend',
        '<div class="ingredient-line"><input name="ingredient" placeholder="' +
          num +
          'º ingrediente"><button type="button" data-action="remove-ingredient" aria-label="Remover ingrediente">×</button></div>'
      );
      box.lastElementChild.querySelector('input').focus();
      break;
    }
    case 'remove-ingredient':
      if (document.querySelectorAll('.ingredient-line').length > 1) el.closest('.ingredient-line').remove();
      else el.previousElementSibling.value = '';
      break;
    case 'recipe-pdf':
      makePdf();
      break;
    case 'new-note':
      noteModal();
      break;
    case 'edit-note': {
      const n = state.data.notes.find((x) => x.id === el.dataset.id);
      if (n) noteModal(n);
      break;
    }
    case 'delete-note':
      if (confirm('Excluir esta anotação?')) {
        state.data.notes = state.data.notes.filter((x) => x.id !== el.dataset.id);
        persist();
        renderView();
        toast('Anotação excluída.');
      }
      break;
    case 'note-page':
      noteModal({ page: state.page });
      break;
    case 'review-page':
      toggleReview(state.page);
      break;
    case 'review-toggle':
      toggleReview(el.dataset.page);
      break;
    case 'study':
      studyModal(+el.dataset.page);
      break;
    case 'complete-study': {
      const n = +el.dataset.page;
      if (!document.querySelector('#study-response').value.trim()) {
        toast('Registre uma observação antes de concluir.', true);
        break;
      }
      if (!state.data.completed.includes(n)) state.data.completed.push(n);
      persist();
      closeModal();
      renderView();
      toast('Atividade concluída. Progresso registrado.');
      break;
    }
    case 'saved-recipe-pdf': {
      const r = state.data.recipes.find((x) => x.id === el.dataset.id);
      if (r) setSavedRecipePdf(r);
      break;
    }
  }
}

function isLibraryEnvActive() {
  return !window.__fervecActiveEnv || window.__fervecActiveEnv === 'library';
}

document.addEventListener('click', (e) => {
  if (!isLibraryEnvActive()) return;
  const el = e.target.closest('[data-action]');
  if (!el) return;
  renderDelegatedAction(el.dataset.action, el);
});

document.addEventListener('focusin', (e) => {
  if (!isLibraryEnvActive()) return;
  if (state.view === 'app' && isDemoMode() && e.target.closest('#main') && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) {
    e.target.blur();
    redirectToRegister();
  }
});

document.addEventListener('submit', async (e) => {
  if (!isLibraryEnvActive()) return;
  if (e.target.id === 'login-form') {
    e.preventDefault();
    const email = document.querySelector('#email')?.value || '';
    const password = document.querySelector('#password')?.value || '';
    const check = validateLogin({ email, password });
    if (!check.ok) {
      toast(check.error, true);
      return;
    }

    const unifiedAccount = findProvisionalAccountByEmail(check.email);
    if (!unifiedAccount) {
      state.loginGateCta = 'register';
      state.demoLockNotice =
        'Conta não encontrada neste navegador. Faça seu cadastro no site principal do FerveC primeiro.';
      render();
      toast('Faça seu cadastro no site principal do FerveC.', true);
      return;
    }

    if (unifiedAccount.passwordDigest) {
      const incomingDigest = await digestPasswordProvisionalLocal(check.email, check.password);
      if (incomingDigest !== unifiedAccount.passwordDigest) {
        state.loginGateCta = '';
        state.demoLockNotice = 'Senha incorreta. Confira seus dados e tente novamente.';
        render();
        toast('Senha incorreta.', true);
        return;
      }
    }

    if (!hasLibraryEntitlement(unifiedAccount)) {
      state.loginGateCta = 'payments';
      state.demoLockNotice =
        'Este e-mail ainda não possui curso adquirido. Conclua a aquisição em Pagamentos (ou utilize um cupom de 100% na Fase 1) para liberar a Biblioteca.';
      render();
      toast('Acesso exclusivo para e-mails com curso adquirido.', true);
      return;
    }

    const userObj = {
      id: unifiedAccount.id,
      name: unifiedAccount.fullName || 'Chef FerveC',
      email: unifiedAccount.email,
      role: unifiedAccount.role,
      isProvisional: true,
    };
    saveSession(localStorage, userObj, '');
    state.authMode = 'user';
    state.currentUser = { ...userObj, token: '' };
    state.demoLockNotice = '';
    state.loginGateCta = '';
    state.data = loadData(false, userObj.email);
    state.chat = sanitizeStoredChat(state.data.chat, 40);
    state.chatRole = state.data.chatRole || 'chef-tutor';
    state.chatIncludeContext = state.data.chatIncludeContext ?? true;
    state.voiceTranscripts = Array.isArray(state.data.voiceTranscripts) ? [...state.data.voiceTranscripts] : [];
    state.page = state.data.lastPage || 1;
    state.view = 'app';
    state.active = 'home';
    render();
    syncTimers();
    ensureTimerLoop();
    window.dispatchEvent(new CustomEvent('fervec:library-auth-change'));
    toast('Bem-vindo(a), ' + userObj.name + '!');
    return;
  }
  if (state.view === 'app' && isDemoMode()) {
    e.preventDefault();
    redirectToRegister();
    return;
  }
  if (e.target.id === 'restaurant-search-form') {
    e.preventDefault();
    state.restaurantQuery = document.querySelector('#restaurant-search-input')?.value?.trim() || '';
    scheduleRestaurantSearch({ skipLoadingRender: false });
    return;
  }
  if (e.target.classList?.contains('timer-form')) {
    e.preventDefault();
    const f = e.target,
      recipeId = f.dataset.recipeId,
      labelInput = f.querySelector('[name="label"]'),
      mins = f.querySelector('[name="minutes"]').value,
      secs = f.querySelector('[name="seconds"]').value;
    startRecipeTimer(recipeId, labelInput.value, parseDurationSeconds(mins, secs));
    labelInput.value = '';
  }
  if (e.target.classList?.contains('ing-quick-form')) {
    e.preventDefault();
    const f = e.target,
      rid = f.dataset.recipeId,
      input = f.querySelector('[name="ingredient"]'),
      val = input.value.trim();
    if (!val) {
      toast('Informe o ingrediente.', true);
      return;
    }
    const r = state.data.recipes.find((x) => x.id === rid);
    if (r) {
      r.ingredients = Array.isArray(r.ingredients) ? [...r.ingredients, val] : [val];
      persist();
      refreshRecipeChecklist(rid);
      toast('Ingrediente adicionado!');
    }
  }
  if (e.target.id === 'daily-goal-modal-form' || e.target.id === 'daily-goal-form') {
    e.preventDefault();
    const f = e.target,
      title = f.querySelector('[name="title"]').value.trim(),
      target = f.querySelector('[name="target"]').value,
      unit = f.querySelector('[name="unit"]').value.trim();
    if (!title) {
      toast('Informe o nome da meta diária.', true);
      return;
    }
    state.data.dailyGoals = addDailyGoal(state.data.dailyGoals, { title, target, unit }, getTodayKey());
    state.goalFormOpen = false;
    persist();
    closeModal();
    refreshDailyGoalsUI();
    toast('Meta diária adicionada!');
  }
  if (e.target.id === 'recipe-form') {
    e.preventDefault();
    const f = e.target,
      r = collectRecipe(f);
    if (!r.name) {
      toast('Informe o nome da receita.', true);
      return;
    }
    const id = state.modal?.recipeId;
    if (id) {
      const i = state.data.recipes.findIndex((x) => x.id === id);
      if (i >= 0) {
        state.data.recipes[i] = { ...state.data.recipes[i], ...r, date: new Date().toISOString() };
        if (state.data.ingredientChecks) {
          state.data.ingredientChecks[id] = sanitizeCheckedMap(state.data.ingredientChecks[id], r.ingredients.length);
        }
        if (state.data.ingredientCategories) {
          state.data.ingredientCategories[id] = sanitizeCategoryMap(
            state.data.ingredientCategories[id],
            r.ingredients.length
          );
        }
      }
    } else state.data.recipes.unshift({ id: crypto.randomUUID(), ...r, date: new Date().toISOString() });
    persist();
    closeModal();
    renderView();
    toast('Receita salva com sucesso!');
  }
  if (e.target.id === 'note-form') {
    e.preventDefault();
    const f = e.target,
      id = state.modal?.noteId,
      n = {
        title: f.querySelector('#n-title').value.trim(),
        category: f.querySelector('#n-category').value,
        body: f.querySelector('#n-body').value.trim(),
        page: parseInt(f.querySelector('#n-page').value) || null,
        date: new Date().toISOString(),
      };
    if (id) {
      const i = state.data.notes.findIndex((x) => x.id === id);
      if (i >= 0) state.data.notes[i] = { ...state.data.notes[i], ...n };
    } else {
      state.data.notes.unshift({ id: crypto.randomUUID(), ...n });
      state.notesSheet = 1;
      state.data.dailyGoals = incrementDailyGoal(state.data.dailyGoals, 'goal-note', 1, getTodayKey());
    }
    persist();
    closeModal();
    renderView();
    toast(id ? 'Anotação atualizada.' : 'Anotação salva.');
  }
  if (e.target.id === 'chat-form') sendChat(e);
  if (e.target.id === 'voice-text-form') {
    e.preventDefault();
    const inp = document.querySelector('#voice-text-input');
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const val = inp?.value.trim() || '';
    if (!val) return;
    if (liveVoiceClient && state.voiceStatus === 'connected' && liveVoiceClient.sendText(val)) {
      inp.value = '';
      return;
    }
    inp.value = '';
    appendVoiceTranscript('user', val);
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Enviando…';
    }
    try {
      const systemInstruction = buildChatSystemInstruction({
        roleId: state.chatRole || 'chef-tutor',
        page: state.page,
        pageTitle: pageTitle(state.page),
        pageText: state.pageText[state.page] || '',
        includePageContext: state.chatIncludeContext,
      });
      const history = state.voiceTranscripts.slice(-16).map((t) => ({
        role: t.role === 'user' ? 'user' : 'assistant',
        content: t.text,
      }));
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ systemInstruction, messages: history, roleId: state.chatRole || 'chef-tutor' }),
      });
      const completion = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(completion.error || 'Erro ao conversar com o Chefe.');
      const answer = completion.content || 'Não recebi uma resposta desta vez.';
      appendVoiceTranscript('assistant', answer);
      await speakWithGeminiTts(answer, state.voiceName);
    } catch (err) {
      const errMsg = err?.message || 'Não consegui obter resposta do Chefe agora.';
      appendVoiceTranscript('assistant', errMsg);
      toast(errMsg, true);
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Enviar';
      }
    }
  }
});

document.addEventListener('input', (e) => {
  if (!isLibraryEnvActive()) return;
  if (state.view === 'app' && isDemoMode() && e.target.closest('#main')) {
    redirectToRegister();
    return;
  }
  if (e.target.id === 'recipe-search') {
    state.recipeSearch = e.target.value;
    const pos = e.target.selectionStart;
    renderView();
    const x = document.querySelector('#recipe-search');
    x?.focus();
    x?.setSelectionRange(pos, pos);
  }
  if (e.target.id === 'note-search') {
    state.noteSearch = e.target.value;
    state.notesSheet = 1;
    const pos = e.target.selectionStart;
    renderView();
    const x = document.querySelector('#note-search');
    x?.focus();
    x?.setSelectionRange(pos, pos);
  }
  if (e.target.id === 'ingredient-search') {
    const q = e.target.value.trim().toLowerCase();
    const grid = document.querySelector('#ingredient-grid');
    if (grid) grid.classList.toggle('is-filtering', q.length > 0);
    document.querySelectorAll('#ingredient-grid .ingredient-card').forEach((c) => {
      c.hidden = q ? !c.textContent.toLowerCase().includes(q) : false;
    });
  }
});

document.addEventListener('change', (e) => {
  if (!isLibraryEnvActive()) return;
  if (state.view === 'app' && isDemoMode() && e.target.closest('#main')) {
    redirectToRegister();
    return;
  }
  if (e.target.id === 'page-jump') goToPage(e.target.value);
  if (e.target.id === 'chat-context-toggle') {
    state.chatIncludeContext = !!e.target.checked;
    state.data.chatIncludeContext = state.chatIncludeContext;
    persist();
  }
  if (e.target.id === 'chef-role-select') {
    state.chatRole = e.target.value || 'chef-tutor';
    state.data.chatRole = state.chatRole;
    persist();
    renderView();
  }
  if (e.target.id === 'voice-select') {
    state.voiceName = e.target.value || 'Antonio';
    try {
      const cfg = JSON.parse(localStorage.getItem('fervec-voice-config-v1') || '{}') || {};
      cfg.voiceUri = 'neural:' + state.voiceName;
      localStorage.setItem('fervec-voice-config-v1', JSON.stringify(cfg));
    } catch {}
  }
  if (e.target.id === 'bookmark-image-input') {
    const file = e.target.files?.[0];
    if (file) processBookmarkImageFile(file);
  }
});

document.addEventListener('keydown', (e) => {
  if (!isLibraryEnvActive()) return;
  if (e.key === 'Escape') {
    if (state.modal) {
      closeModal();
      return;
    }
    if (state.menuOpen) {
      state.menuOpen = false;
      document.querySelector('#app-drawer')?.classList.remove('open');
      document.querySelector('.drawer-backdrop')?.classList.remove('open');
      return;
    }
    if (state.active === 'book' && state.bookFullscreen) {
      exitBookFullscreen(true);
      return;
    }
  }
  if (state.view === 'app' && state.active === 'book' && !state.modal && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
    if (isDemoMode()) {
      redirectToRegister();
      return;
    }
    turn(e.key === 'ArrowRight' ? 1 : -1);
  }
  if (e.key === 'Enter' && e.target.id === 'page-jump') {
    e.preventDefault();
    if (isDemoMode()) {
      redirectToRegister();
      return;
    }
    goToPage(e.target.value);
  }
});

let touchX = 0;
let panDragState = null;
document.addEventListener('pointerdown', (e) => {
  if (!isLibraryEnvActive()) return;
  const stage = e.target.closest('#book-stage');
  if (!stage) return;
  touchX = e.clientX;
  if ((state.bookZoom || 1) > 1) {
    panDragState = {
      stage,
      x: e.clientX,
      y: e.clientY,
      sl: stage.scrollLeft,
      st: stage.scrollTop,
    };
  } else {
    panDragState = null;
  }
});
document.addEventListener('pointermove', (e) => {
  if (!isLibraryEnvActive()) return;
  if (!panDragState || (state.bookZoom || 1) <= 1) return;
  panDragState.stage.scrollLeft = panDragState.sl - (e.clientX - panDragState.x);
  panDragState.stage.scrollTop = panDragState.st - (e.clientY - panDragState.y);
});
document.addEventListener('pointerup', (e) => {
  if (!isLibraryEnvActive()) return;
  if (panDragState) {
    panDragState = null;
    if ((state.bookZoom || 1) > 1) return;
  }
  if ((state.bookZoom || 1) > 1) return;
  if (e.target.closest('#book-stage') && Math.abs(e.clientX - touchX) > 45) {
    if (isDemoMode()) {
      redirectToRegister();
      return;
    }
    turn(e.clientX < touchX ? 1 : -1);
  }
});

let resizeTimer;
window.addEventListener('resize', () => {
  if (!isLibraryEnvActive()) return;
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    if (state.view === 'app' && state.active === 'book') drawReader();
  }, 180);
});

document.addEventListener('fullscreenchange', () => {
  if (!isLibraryEnvActive()) return;
  if (!document.fullscreenElement && state.bookFullscreen) {
    state.bookFullscreen = false;
    state.bookZoom = 1;
    document.body.classList.remove('book-fullscreen-active');
    if (state.active === 'book') {
      render();
      requestAnimationFrame(() => drawReader());
    }
  } else if (state.active === 'book' && state.bookFullscreen) {
    requestAnimationFrame(() => drawReader());
  }
});

window.__fervecLibraryControl = {
  openAuth() {
    state.view = 'login';
    state.loginTab = 'login';
    state.loginGateCta = '';
    state.demoLockNotice = '';
    render();
  },
  openDemo() {
    if (state.authMode !== 'user') {
      state.authMode = 'demo';
      state.view = 'app';
      state.active = state.active || 'home';
      render();
    }
  },
  openHome() {
    state.view = 'app';
    state.active = 'home';
    render();
  },
  logout() {
    renderDelegatedAction('logout', document.body);
  },
  getAuthSummary() {
    return {
      authMode: state.authMode,
      user: state.currentUser ? { id: state.currentUser.id, name: state.currentUser.name, email: state.currentUser.email } : null,
    };
  },
};

render();
syncTimers();
ensureTimerLoop();
hydrateServerSession();
