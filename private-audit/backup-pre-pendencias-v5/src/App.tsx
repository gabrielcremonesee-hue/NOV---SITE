import { useEffect, useRef, useState } from 'react';
import { mountFervecApp } from './fervecApp';
import ChefChatWidget from './components/ChefChatWidget';
import GlobalErrorBoundary from './components/GlobalErrorBoundary';
import PaymentLoadingState from './components/PaymentLoadingState';
import SupabaseEnvDebugPanel from './components/SupabaseEnvDebugPanel';
import ToastContainer from './components/ToastContainer';
import { verifySupabaseClientConnectivity } from './utils/supabaseDiagnostic';
import {
  ActiveEnvironment,
  getActiveEnvironment,
  initEnvironmentController,
  isSiteEnvironmentMounted,
  subscribeEnvironment,
} from './portal/envController';

function SiteWorkspace() {
  const appRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void verifySupabaseClientConnectivity();
    if (!appRef.current || !modalRef.current) return;
    return mountFervecApp(appRef.current, modalRef.current);
  }, []);

  return (
    <>
      <div id="site-app" ref={appRef} aria-live="polite" />
      <div id="modal-root" ref={modalRef} />
      <GlobalErrorBoundary name="PaymentLoadingState" mode="non-blocking">
        <PaymentLoadingState />
      </GlobalErrorBoundary>
      <GlobalErrorBoundary name="ToastContainer" mode="non-blocking">
        <ToastContainer />
      </GlobalErrorBoundary>
      <GlobalErrorBoundary name="ChefChatWidget" mode="non-blocking">
        <ChefChatWidget />
      </GlobalErrorBoundary>
      <GlobalErrorBoundary name="SupabaseEnvDebugPanel" mode="non-blocking">
        <SupabaseEnvDebugPanel />
      </GlobalErrorBoundary>
    </>
  );
}

export default function App() {
  const [activeEnv, setActiveEnv] = useState<ActiveEnvironment>(() => getActiveEnvironment());
  const [siteMounted, setSiteMounted] = useState<boolean>(() => isSiteEnvironmentMounted());

  useEffect(() => {
    initEnvironmentController();
    const sync = (next: ActiveEnvironment) => {
      setActiveEnv(next);
      if (next === 'site') {
        setSiteMounted(true);
      }
    };
    sync(getActiveEnvironment());
    return subscribeEnvironment(sync);
  }, []);

  return (
    <>
      {siteMounted && (
        <div id="site-root" hidden={activeEnv !== 'site'}>
          <SiteWorkspace />
        </div>
      )}
    </>
  );
}
