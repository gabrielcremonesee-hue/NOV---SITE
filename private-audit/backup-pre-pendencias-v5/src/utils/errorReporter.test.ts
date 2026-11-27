import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clearRecordedAppErrors,
  getRecordedAppErrors,
  installGlobalErrorHandlers,
  registerExternalErrorReporter,
  reportAppError,
  type AppErrorReport,
} from './errorReporter';

test('reportAppError logs structured diagnostics to console and external reporter without throwing', () => {
  clearRecordedAppErrors();

  const consoleCalls: unknown[][] = [];
  const origConsoleError = console.error;
  console.error = (...args: unknown[]) => {
    consoleCalls.push(args);
  };

  const sentToExternal: AppErrorReport[] = [];
  const unregister = registerExternalErrorReporter((report) => {
    sentToExternal.push(report);
  });

  try {
    const err = new Error('Falha ao renderizar resumo do checkout');
    const report = reportAppError(err, {
      source: 'checkout-render',
      route: 'payments',
      boundaryName: 'PaymentsCheckoutRender',
      componentStack: 'at PaymentsPanel\n  at App',
      metadata: { step: 'confirm' },
    });

    assert.equal(report.source, 'checkout-render');
    assert.equal(report.route, 'payments');
    assert.equal(report.boundaryName, 'PaymentsCheckoutRender');
    assert.equal(report.message, 'Falha ao renderizar resumo do checkout');
    assert.match(report.componentStack || '', /PaymentsPanel/);

    assert.equal(consoleCalls.length, 1);
    assert.match(String(consoleCalls[0][0]), /\[AppErrorHandler\]\[checkout-render\]/);
    assert.equal(sentToExternal.length, 1);
    assert.equal(sentToExternal[0].id, report.id);
    assert.equal(getRecordedAppErrors().length, 1);
  } finally {
    unregister();
    console.error = origConsoleError;
  }
});

test('reportAppError isolates synchronous and asynchronous failures in external reporter', async () => {
  clearRecordedAppErrors();
  const origConsoleError = console.error;
  console.error = () => {};

  const unregisterSyncThrow = registerExternalErrorReporter(() => {
    throw new Error('Telemetry endpoint offline');
  });

  try {
    const r1 = reportAppError('string error failure', { source: 'ui-widget' });
    assert.equal(r1.message, 'string error failure');

    unregisterSyncThrow();
    const unregisterAsyncReject = registerExternalErrorReporter(async () => {
      throw new Error('Async telemetry rejection');
    });

    const r2 = reportAppError({ code: 503 }, { source: 'global-error' });
    assert.equal(r2.message, '{"code":503}');
    await new Promise((r) => setTimeout(r, 10));
    unregisterAsyncReject();
  } finally {
    console.error = origConsoleError;
  }
});

test('installGlobalErrorHandlers captures window error and unhandledrejection events and cleans up', () => {
  clearRecordedAppErrors();
  const origConsoleError = console.error;
  console.error = () => {};

  const listeners = new Map<string, Set<(ev: unknown) => void>>();
  const mockTarget = {
    addEventListener(type: string, fn: (ev: unknown) => void) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type)!.add(fn);
    },
    removeEventListener(type: string, fn: (ev: unknown) => void) {
      listeners.get(type)?.delete(fn);
    },
  };

  let activeRoute = 'payments';
  const uninstall = installGlobalErrorHandlers({
    getRoute: () => activeRoute,
    target: mockTarget,
  });

  try {
    listeners.get('error')?.forEach((fn) =>
      fn({
        error: new Error('Erro não tratado no DOM'),
        filename: 'paymentsView.ts',
        lineno: 42,
      })
    );
    activeRoute = 'sales';
    listeners.get('unhandledrejection')?.forEach((fn) =>
      fn({ reason: new Error('Promise sem catch') })
    );

    const reports = getRecordedAppErrors();
    assert.equal(reports.length, 2);
    assert.equal(reports[0].source, 'global-error');
    assert.equal(reports[0].route, 'payments');
    assert.equal(reports[0].metadata?.filename, 'paymentsView.ts');
    assert.equal(reports[1].source, 'unhandled-rejection');
    assert.equal(reports[1].route, 'sales');

    uninstall();
    assert.equal(listeners.get('error')?.size ?? 0, 0);
    assert.equal(listeners.get('unhandledrejection')?.size ?? 0, 0);
  } finally {
    uninstall();
    console.error = origConsoleError;
  }
});
