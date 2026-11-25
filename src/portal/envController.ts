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

function syncStylesheets(nextEnv: ActiveEnvironment): void {
  if (typeof document === 'undefined') return;

  const portalCss = document.getElementById('fervec-portal-css') as HTMLLinkElement | null;
  if (portalCss) {
    portalCss.disabled = false;
  }

  const libraryCss = document.getElementById('fervec-library-css') as HTMLLinkElement | null;
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
  if (libraryRoot) {
    libraryRoot.hidden = nextEnv !== 'library';
  }
}

async function ensureLibraryBooted(action: EnvOptions['libraryAction'] = 'default'): Promise<void> {
  if (typeof window === 'undefined') return;
  window.__fervecPortalEmbedded = true;
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
        });
    }
    await libraryLoadingPromise;
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
}

export function subscribeEnvironment(cb: (env: ActiveEnvironment) => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}
