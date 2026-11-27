export type AppErrorSource =
  | 'react-error-boundary'
  | 'checkout-render'
  | 'global-error'
  | 'unhandled-rejection'
  | 'ui-widget';

export interface AppErrorReport {
  id: string;
  source: AppErrorSource;
  message: string;
  name: string;
  stack?: string;
  componentStack?: string;
  route?: string;
  boundaryName?: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface ReportAppErrorContext {
  source?: AppErrorSource;
  route?: string;
  boundaryName?: string;
  componentStack?: string;
  metadata?: Record<string, unknown>;
}

export type ExternalErrorReporter = (report: AppErrorReport) => void | Promise<void>;

const MAX_RECORDED_ERRORS = 50;
const recordedErrors: AppErrorReport[] = [];
let externalReporter: ExternalErrorReporter | null = null;

function createReportId(): string {
  return `err_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeUnknownError(error: unknown): {
  name: string;
  message: string;
  stack?: string;
} {
  if (error instanceof Error) {
    return {
      name: error.name || 'Error',
      message: error.message || 'Erro desconhecido',
      stack: error.stack,
    };
  }
  if (typeof error === 'string') {
    return {
      name: 'Error',
      message: error || 'Erro desconhecido',
    };
  }
  if (error && typeof error === 'object') {
    const rec = error as Record<string, unknown>;
    return {
      name: typeof rec.name === 'string' && rec.name ? rec.name : 'UnknownError',
      message:
        typeof rec.message === 'string' && rec.message
          ? rec.message
          : JSON.stringify(rec),
      stack: typeof rec.stack === 'string' ? rec.stack : undefined,
    };
  }
  return {
    name: 'UnknownError',
    message: String(error ?? 'Erro desconhecido'),
  };
}

function resolveCurrentRoute(explicitRoute?: string): string | undefined {
  if (explicitRoute) return explicitRoute;
  if (typeof window !== 'undefined' && window.location) {
    return window.location.hash || window.location.pathname || undefined;
  }
  return undefined;
}

function readConfiguredErrorEndpoint(): string | null {
  try {
    const metaEnv = (import.meta as unknown as { env?: Record<string, unknown> })?.env;
    const fromVite = metaEnv?.VITE_ERROR_REPORTING_ENDPOINT;
    if (typeof fromVite === 'string' && fromVite.trim()) {
      return fromVite.trim();
    }
  } catch {
    // ignore in non-Vite runtimes
  }
  const fromGlobal = (globalThis as Record<string, unknown>).__FERVEC_ERROR_ENDPOINT__;
  if (typeof fromGlobal === 'string' && fromGlobal.trim()) {
    return fromGlobal.trim();
  }
  return null;
}

function dispatchToEndpointFireAndForget(endpoint: string, report: AppErrorReport): void {
  try {
    const body = JSON.stringify(report);
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([body], { type: 'application/json' });
      const sent = navigator.sendBeacon(endpoint, blob);
      if (sent) return;
    }
    if (typeof fetch === 'function') {
      void fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
      }).catch(() => {
        // Never disrupt application flow on telemetry failure
      });
    }
  } catch {
    // Never throw from error reporter transport
  }
}

export function registerExternalErrorReporter(
  reporter: ExternalErrorReporter | null
): () => void {
  externalReporter = reporter;
  return () => {
    if (externalReporter === reporter) {
      externalReporter = null;
    }
  };
}

export function getRecordedAppErrors(): AppErrorReport[] {
  return [...recordedErrors];
}

export function clearRecordedAppErrors(): void {
  recordedErrors.length = 0;
}

export function reportAppError(
  error: unknown,
  context: ReportAppErrorContext = {}
): AppErrorReport {
  const normalized = normalizeUnknownError(error);
  const report: AppErrorReport = {
    id: createReportId(),
    source: context.source ?? 'react-error-boundary',
    name: normalized.name,
    message: normalized.message,
    ...(normalized.stack ? { stack: normalized.stack } : {}),
    ...(context.componentStack ? { componentStack: context.componentStack } : {}),
    ...(resolveCurrentRoute(context.route)
      ? { route: resolveCurrentRoute(context.route) }
      : {}),
    ...(context.boundaryName ? { boundaryName: context.boundaryName } : {}),
    timestamp: new Date().toISOString(),
    ...(context.metadata ? { metadata: context.metadata } : {}),
  };

  recordedErrors.push(report);
  if (recordedErrors.length > MAX_RECORDED_ERRORS) {
    recordedErrors.splice(0, recordedErrors.length - MAX_RECORDED_ERRORS);
  }

  try {
    console.error(`[AppErrorHandler][${report.source}]`, {
      id: report.id,
      boundaryName: report.boundaryName,
      route: report.route,
      name: report.name,
      message: report.message,
      componentStack: report.componentStack,
      stack: report.stack,
      metadata: report.metadata,
      timestamp: report.timestamp,
    });
  } catch {
    // ignore console errors
  }

  if (externalReporter) {
    try {
      const maybePromise = externalReporter(report);
      if (maybePromise && typeof (maybePromise as Promise<void>).catch === 'function') {
        void (maybePromise as Promise<void>).catch(() => {
          // ignore async reporter errors
        });
      }
    } catch {
      // ignore sync reporter errors
    }
  }

  const endpoint = readConfiguredErrorEndpoint();
  if (endpoint) {
    dispatchToEndpointFireAndForget(endpoint, report);
  }

  return report;
}

export interface ErrorEventTargetLike {
  addEventListener: (type: string, listener: (event: unknown) => void) => void;
  removeEventListener: (type: string, listener: (event: unknown) => void) => void;
}

export function installGlobalErrorHandlers(options?: {
  getRoute?: () => string;
  target?: ErrorEventTargetLike;
}): () => void {
  const target: ErrorEventTargetLike | null =
    options?.target ?? (typeof window !== 'undefined' ? (window as unknown as ErrorEventTargetLike) : null);

  if (!target) {
    return () => {};
  }

  const onWindowError = (event: unknown) => {
    const ev = (event && typeof event === 'object' ? event : {}) as {
      error?: unknown;
      message?: string;
      filename?: string;
      lineno?: number;
      colno?: number;
    };
    const err = ev.error ?? new Error(ev.message || 'Erro global de execução');
    reportAppError(err, {
      source: 'global-error',
      route: options?.getRoute?.(),
      metadata: {
        ...(ev.filename ? { filename: ev.filename } : {}),
        ...(typeof ev.lineno === 'number' ? { lineno: ev.lineno } : {}),
        ...(typeof ev.colno === 'number' ? { colno: ev.colno } : {}),
      },
    });
  };

  const onUnhandledRejection = (event: unknown) => {
    const ev = (event && typeof event === 'object' ? event : {}) as {
      reason?: unknown;
    };
    reportAppError(ev.reason ?? 'Promise rejeitada sem tratamento', {
      source: 'unhandled-rejection',
      route: options?.getRoute?.(),
    });
  };

  target.addEventListener('error', onWindowError);
  target.addEventListener('unhandledrejection', onUnhandledRejection);

  let cleanedUp = false;
  return () => {
    if (cleanedUp) return;
    cleanedUp = true;
    target.removeEventListener('error', onWindowError);
    target.removeEventListener('unhandledrejection', onUnhandledRejection);
  };
}
