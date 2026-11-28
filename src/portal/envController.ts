import {
  ActiveEnvironment,
  isSiteStylesheetDescriptor,
  resolveInitialEnvironment,
} from './routing';

export type { ActiveEnvironment };

export interface LibraryAuthSummary {
  authMode: 'none' | 'demo' | 'user';
  user: { id?: string; name?: string; email?: string } | null;
}

interface EnvOptions {
  libraryAction?: 'default' | 'demo' | 'auth-login' | 'auth-register';
  targetRoute?: string;
}

declare global {
  interface Window {
    __fervecActiveEnv?: ActiveEnvironment;
    __fervecPortalEmbedded?: boolean;
    __fervecLibraryInitialAction?: 'default' | 'demo' | 'auth-login' | 'auth-register';
    __fervecSetEnv?: (env: ActiveEnvironment, opts?: EnvOptions) => void;
    __fervecOpenLibraryAuth?: (tab?: 'login' | 'register') => void;
    __fervecLibraryControl?: {
      openAuth: (tab?: 'login' | 'register') => void;
      openDemo: () => void;
      openHome: () => void;
      logout: () => void;
      getAuthSummary: () => LibraryAuthSummary;
    };
  }
}

const initialResolution = resolveInitialEnvironment(
  typeof window !== 'undefined' ? window.location.search : '',
  typeof window !== 'undefined' ? window.location.hash : ''
);

let currentEnv: ActiveEnvironment = initialResolution.env;
let libraryLoaded = false;
let libraryLoadingPromise: Promise<void> | null = null;
let siteMounted = currentEnv === 'site';
let savedLibraryBodyClasses: string[] = [];
let savedSiteBodyClasses: string[] = [];

const listeners = new Set<(env: ActiveEnvironment) => void>();

function isStylesheetLoaded(link: HTMLLinkElement): boolean {
  try {
    return Boolean(link.sheet);
  } catch {
    return true;
  }
}

export function getOrEnsureLibraryStylesheetLink(): HTMLLinkElement | null {
  if (typeof document === 'undefined') return null;
  let libraryCss = document.getElementById('fervec-library-css') as HTMLLinkElement | null;
  if (!libraryCss) {
    libraryCss = document.createElement('link');
    libraryCss.id = 'fervec-library-css';
    libraryCss.rel = 'stylesheet';
    libraryCss.href = '/library-styles.css';
    document.head.appendChild(libraryCss);
  }
  return libraryCss;
}

function waitForLibraryStylesheet(timeoutMs = 2500): Promise<void> {
  if (typeof document === 'undefined') return Promise.resolve();
  const libraryCss = getOrEnsureLibraryStylesheetLink();
  if (!libraryCss) return Promise.resolve();

  libraryCss.disabled = false;
  if (isStylesheetLoaded(libraryCss)) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      libraryCss.removeEventListener('load', onLoad);
      libraryCss.removeEventListener('error', onError);
      window.clearTimeout(timer);
      resolve();
    };
    const onLoad = () => finish();
    const onError = () => finish();
    libraryCss.addEventListener('load', onLoad, { once: true });
    libraryCss.addEventListener('error', onError, { once: true });
    const timer = window.setTimeout(() => {
      if (!isStylesheetLoaded(libraryCss)) {
        // Trigger clean re-validation if browser delayed stylesheet attachment
        libraryCss.disabled = false;
      }
      finish();
    }, timeoutMs);
  });
}

function syncStylesheets(nextEnv: ActiveEnvironment): void {
  if (typeof document === 'undefined') return;

  const portalCss = document.getElementById('fervec-portal-css') as HTMLLinkElement | null;
  if (portalCss) {
    portalCss.disabled = nextEnv !== 'portal';
  }

  const libraryCss = getOrEnsureLibraryStylesheetLink();
  if (libraryCss) {
    libraryCss.disabled = nextEnv !== 'library';
  }

  const mapCss = document.getElementById('fervec-maplibre-css') as HTMLLinkElement | null;
  if (mapCss) {
    mapCss.disabled = nextEnv !== 'library';
  }

  document.querySelectorAll('head style, head link[rel="stylesheet"]').forEach((node) => {
    const isSiteCss = isSiteStylesheetDescriptor({
      tagName: node.tagName,
      id: node.id,
      rel: (node as HTMLLinkElement).rel,
      href: (node as HTMLLinkElement).getAttribute('href') || '',
      viteDevId: node.getAttribute('data-vite-dev-id'),
      textContent: node.textContent || '',
    });
    if (isSiteCss) {
      (node as HTMLStyleElement | HTMLLinkElement).disabled = nextEnv !== 'site';
    }
  });
}

function syncBodyClasses(prevEnv: ActiveEnvironment, nextEnv: ActiveEnvironment): void {
  if (typeof document === 'undefined') return;

  if (prevEnv === 'library') {
    savedLibraryBodyClasses = Array.from(document.body.classList).filter(
      (c) => c !== 'fervec-env-portal'
    );
  } else if (prevEnv === 'site') {
    savedSiteBodyClasses = Array.from(document.body.classList).filter(
      (c) => c !== 'fervec-env-portal'
    );
  }

  document.body.className = '';
  if (nextEnv === 'portal') {
    document.body.classList.add('fervec-env-portal');
  } else if (nextEnv === 'library') {
    savedLibraryBodyClasses.forEach((cls) => document.body.classList.add(cls));
  } else if (nextEnv === 'site') {
    savedSiteBodyClasses.forEach((cls) => document.body.classList.add(cls));
  }
  document.body.dataset.fervecEnv = nextEnv;
}

function syncContainers(nextEnv: ActiveEnvironment): void {
  if (typeof document === 'undefined') return;
  const libraryRoot = document.getElementById('library-app-root');
  if (!libraryRoot) return;

  if (nextEnv !== 'library') {
    libraryRoot.hidden = true;
    libraryRoot.style.visibility = '';
    return;
  }

  const libraryCss = getOrEnsureLibraryStylesheetLink();
  if (libraryCss && !libraryCss.disabled && isStylesheetLoaded(libraryCss)) {
    libraryRoot.hidden = false;
    libraryRoot.style.visibility = '';
  } else {
    libraryRoot.hidden = false;
    libraryRoot.style.visibility = 'hidden';
  }
}

async function ensureLibraryBooted(action: EnvOptions['libraryAction'] = 'default'): Promise<void> {
  if (typeof window === 'undefined') return;
  window.__fervecPortalEmbedded = true;

  await waitForLibraryStylesheet();
  if (currentEnv !== 'library') return;

  const libraryRoot = document.getElementById('library-app-root');
  if (libraryRoot) {
    libraryRoot.hidden = false;
    libraryRoot.style.visibility = '';
  }

  if (!libraryLoaded) {
    window.__fervecLibraryInitialAction = action;
    if (!libraryLoadingPromise) {
      const libraryEntryUrl: string = '/app.js';
      libraryLoadingPromise = import(/* @vite-ignore */ libraryEntryUrl)
        .then(() => {
          libraryLoaded = true;
        })
        .catch((err) => {
          libraryLoadingPromise = null;
          console.error('[FerveC Portal] Falha ao carregar Biblioteca Interativa:', err);
          const appContainer = document.querySelector('#library-app-root #app');
          if (appContainer) {
            appContainer.innerHTML =
              '<div style="min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:24px;text-align:center;font-family:Plus Jakarta Sans,sans-serif;color:#2f2014;">' +
              '<h2 style="margin:0;font-size:22px;">Não foi possível carregar a Biblioteca Interativa</h2>' +
              '<p style="margin:0;max-width:440px;color:#5e4835;">Verifique sua conexão e tente novamente ou volte ao portal principal.</p>' +
              '<button type="button" id="fervec-library-back-btn" style="padding:10px 18px;border-radius:999px;border:0;background:#98151b;color:#fff;font-weight:700;cursor:pointer;">Voltar ao portal</button>' +
              '</div>';
            document
              .getElementById('fervec-library-back-btn')
              ?.addEventListener('click', () => switchEnvironment('site'));
          }
        });
    }
    await libraryLoadingPromise;
    if (currentEnv !== 'library') return;
    return;
  }

  const ctrl = window.__fervecLibraryControl;
  if (!ctrl) return;
  if (action === 'auth-login') ctrl.openAuth('login');
  else if (action === 'auth-register') ctrl.openAuth('register');
  else if (action === 'demo') ctrl.openDemo();
  else if (ctrl.getAuthSummary().authMode === 'none') ctrl.openDemo();
  else ctrl.openHome();
}

export function getActiveEnvironment(): ActiveEnvironment {
  return currentEnv;
}

export function isSiteEnvironmentMounted(): boolean {
  return siteMounted;
}

export function readStoredLibraryAuthSummary(): LibraryAuthSummary {
  if (typeof window === 'undefined') {
    return { authMode: 'none', user: null };
  }
  if (window.__fervecLibraryControl) {
    return window.__fervecLibraryControl.getAuthSummary();
  }
  try {
    const raw = JSON.parse(window.localStorage.getItem('fervec-session-v1') || 'null');
    if (raw && typeof raw.email === 'string' && raw.email.trim()) {
      return {
        authMode: 'user',
        user: {
          id: raw.id || '',
          name: raw.name || raw.email,
          email: raw.email,
        },
      };
    }
  } catch {
    // ignore storage errors
  }
  return { authMode: 'demo', user: null };
}

export function switchEnvironment(nextEnv: ActiveEnvironment, opts: EnvOptions = {}): void {
  const prevEnv = currentEnv;
  const resolvedEnv: ActiveEnvironment = nextEnv === 'portal' ? 'site' : nextEnv;
  if (resolvedEnv === 'site') {
    siteMounted = true;
  }

  currentEnv = resolvedEnv;
  if (typeof window !== 'undefined') {
    window.__fervecActiveEnv = resolvedEnv;
  }

  syncStylesheets(resolvedEnv);
  syncBodyClasses(prevEnv, resolvedEnv);
  syncContainers(resolvedEnv);

  if (resolvedEnv === 'library') {
    void ensureLibraryBooted(opts.libraryAction || 'default');
  } else if (prevEnv === 'library' && resolvedEnv === 'site' && typeof window !== 'undefined') {
    if (opts.targetRoute) {
      window.dispatchEvent(
        new CustomEvent('fervec:navigate-route', { detail: { route: opts.targetRoute } })
      );
    } else {
      window.dispatchEvent(new CustomEvent('fervec:navigate-home'));
    }
  } else if (resolvedEnv === 'site' && opts.targetRoute && typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('fervec:navigate-route', { detail: { route: opts.targetRoute } })
    );
  }

  if (typeof window !== 'undefined' && prevEnv !== resolvedEnv) {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  listeners.forEach((cb) => cb(resolvedEnv));
}

export function initEnvironmentController(): void {
  if (typeof window === 'undefined') return;
  window.__fervecPortalEmbedded = true;
  window.__fervecActiveEnv = currentEnv;
  window.__fervecSetEnv = (env, opts) => switchEnvironment(env, opts);
  window.__fervecOpenLibraryAuth = (tab = 'login') => {
    switchEnvironment('library', {
      libraryAction: tab === 'register' ? 'auth-register' : 'auth-login',
    });
  };

  syncStylesheets(currentEnv);
  syncBodyClasses(currentEnv, currentEnv);
  syncContainers(currentEnv);

  if (currentEnv === 'library') {
    const entryAction =
      initialResolution.libraryEntry === 'auth' ? 'auth-login' : 'demo';
    void ensureLibraryBooted(entryAction);
  }

  window.addEventListener('hashchange', () => {
    if (currentEnv === 'library') {
      const next = resolveInitialEnvironment(window.location.search, window.location.hash);
      if (next.env === 'site' && window.location.hash.startsWith('#/')) {
        switchEnvironment('site');
      }
    }
  });
}

export function subscribeEnvironment(cb: (env: ActiveEnvironment) => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}
