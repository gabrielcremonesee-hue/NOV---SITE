import { useEffect, useState } from 'react';
import {
  BookOpen,
  ChefHat,
  LogIn,
  ShieldCheck,
  X,
} from 'lucide-react';
import {
  LibraryAuthSummary,
  readStoredLibraryAuthSummary,
  switchEnvironment,
} from './envController';

export default function PortalView() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [authSummary, setAuthSummary] = useState<LibraryAuthSummary>(() =>
    readStoredLibraryAuthSummary()
  );

  useEffect(() => {
    const refreshAuth = () => {
      setAuthSummary(readStoredLibraryAuthSummary());
    };
    window.addEventListener('fervec:library-auth-change', refreshAuth);
    window.addEventListener('storage', refreshAuth);
    return () => {
      window.removeEventListener('fervec:library-auth-change', refreshAuth);
      window.removeEventListener('storage', refreshAuth);
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && menuOpen) {
        setMenuOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [menuOpen]);

  const isAuthenticated = authSummary.authMode === 'user' && Boolean(authSummary.user?.name);
  const userName = authSummary.user?.name || '';

  const openLibrary = () => {
    setMenuOpen(false);
    switchEnvironment('library', { libraryAction: isAuthenticated ? 'default' : 'demo' });
  };

  const openSite = () => {
    setMenuOpen(false);
    switchEnvironment('site');
  };

  const openLibraryAuth = (tab: 'login' | 'register') => {
    setMenuOpen(false);
    switchEnvironment('library', {
      libraryAction: tab === 'register' ? 'auth-register' : 'auth-login',
    });
  };

  return (
    <div className="fp-shell" data-testid="portal-choice-screen">
      <main className="fp-master-stage">
        <div className="fp-master-canvas">
          <img
            src="/assets/aistudio/WhatsApp_Image_2026-11-23_at_14.11.37__1__87b56edd.jpeg"
            alt="FerveC Gastronomia — Escolha como deseja continuar"
            className="fp-master-img"
          />

          {isAuthenticated && (
            <div className="fp-auth-user-pill" aria-hidden="true">
              <span>{userName.split(' ')[0]}</span>
            </div>
          )}

          <div className="fp-overlay-layer">
            <button
              type="button"
              className="fp-hit fp-hit-menu"
              onClick={() => setMenuOpen(true)}
              aria-label="Abrir menu do portal"
              aria-expanded={menuOpen}
            />
            <button
              type="button"
              className="fp-hit fp-hit-home"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              aria-label="Início do Portal FerveC"
            />
            <button
              type="button"
              className="fp-hit fp-hit-auth"
              onClick={() => (isAuthenticated ? openLibrary() : openLibraryAuth('login'))}
              aria-label={isAuthenticated ? `Conta ${userName}` : 'Entrar ou cadastrar'}
            />

            <button
              type="button"
              className="fp-hit fp-hit-card-bib"
              data-testid="portal-card-biblioteca"
              onClick={openLibrary}
              aria-label="Entrar na Biblioteca Interativa"
            />
            <button
              type="button"
              className="fp-hit fp-hit-card-coz"
              data-testid="portal-card-cozinha"
              onClick={openSite}
              aria-label="Entrar na Cozinha — FerveC"
            />
          </div>
        </div>
      </main>

      <div
        className={`fp-drawer-backdrop ${menuOpen ? 'open' : ''}`}
        onClick={() => setMenuOpen(false)}
        aria-hidden={!menuOpen}
      />
      <nav
        className={`fp-drawer ${menuOpen ? 'open' : ''}`}
        aria-label="Menu do Portal FerveC"
        aria-hidden={!menuOpen}
      >
        <div className="fp-drawer-head">
          <div className="fp-drawer-brand">
            <strong>FerveC Gastronomia</strong>
            <span>Portal Unificado</span>
          </div>
          <button
            type="button"
            className="fp-drawer-close"
            onClick={() => setMenuOpen(false)}
            aria-label="Fechar menu"
          >
            <X size={18} />
          </button>
        </div>

        <div className="fp-drawer-links">
          <button
            type="button"
            className="fp-drawer-btn is-primary"
            onClick={openLibrary}
          >
            <BookOpen size={18} />
            <span>Biblioteca Interativa</span>
          </button>
          <button
            type="button"
            className="fp-drawer-btn is-primary"
            onClick={openSite}
          >
            <ChefHat size={18} />
            <span>FerveC Cozinha (Portal de Cursos)</span>
          </button>
          {!isAuthenticated && (
            <>
              <button
                type="button"
                className="fp-drawer-btn"
                onClick={() => openLibraryAuth('login')}
              >
                <LogIn size={18} />
                <span>Entrar na minha conta</span>
              </button>
              <button
                type="button"
                className="fp-drawer-btn"
                onClick={() => openLibraryAuth('register')}
              >
                <ShieldCheck size={18} />
                <span>Criar conta gratuita</span>
              </button>
            </>
          )}
        </div>

        <div className="fp-drawer-foot">
          FerveC Gastronomia · Biblioteca &amp; Cursos Integrados
        </div>
      </nav>
    </div>
  );
}
