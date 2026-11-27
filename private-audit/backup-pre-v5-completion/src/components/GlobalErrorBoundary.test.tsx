import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import GlobalErrorBoundary from './GlobalErrorBoundary';
import {
  clearRecordedAppErrors,
  getRecordedAppErrors,
  registerExternalErrorReporter,
  type AppErrorReport,
} from '../utils/errorReporter';

test('GlobalErrorBoundary captures componentDidCatch logs cleanly and isolates non-blocking widgets', () => {
  clearRecordedAppErrors();
  const origConsoleError = console.error;
  console.error = () => {};

  const externalReports: AppErrorReport[] = [];
  const unregister = registerExternalErrorReporter((r) => {
    externalReports.push(r);
  });

  try {
    const widgetError = new Error('Falha silenciosa no widget lateral');
    const derived = GlobalErrorBoundary.getDerivedStateFromError(widgetError);
    assert.equal(derived.hasError, true);
    assert.equal(derived.error, widgetError);

    const nonBlockingBoundary = new GlobalErrorBoundary({
      name: 'ChefChatWidget',
      mode: 'non-blocking',
      route: 'payments',
      children: <span>ok</span>,
    });
    nonBlockingBoundary.state = derived;
    nonBlockingBoundary.componentDidCatch(widgetError, {
      componentStack: '\n    at ChefChatWidget\n    at App',
    });

    // Non-blocking boundary renders null so sibling checkout UI continues uninterrupted
    assert.equal(nonBlockingBoundary.render(), null);
    assert.equal(externalReports.length, 1);
    assert.equal(externalReports[0].source, 'ui-widget');
    assert.equal(externalReports[0].boundaryName, 'ChefChatWidget');
    assert.equal(externalReports[0].route, 'payments');
    assert.match(externalReports[0].componentStack || '', /ChefChatWidget/);

    // Fallback mode renders accessible recovery UI without throwing
    const fallbackBoundary = new GlobalErrorBoundary({
      name: 'AppRoot',
      mode: 'fallback',
      children: <span>ok</span>,
    });
    fallbackBoundary.state = GlobalErrorBoundary.getDerivedStateFromError(
      new Error('Falha de renderização')
    );
    fallbackBoundary.componentDidCatch(new Error('Falha de renderização'), {
      componentStack: '\n    at App',
    });

    const markup = renderToStaticMarkup(fallbackBoundary.render() as never);
    assert.match(markup, /role="alert"/);
    assert.match(markup, /Tentar novamente/);
    assert.match(markup, /Ir para Pagamentos/);
    assert.equal(getRecordedAppErrors().length, 2);
  } finally {
    unregister();
    console.error = origConsoleError;
  }
});

test('GlobalErrorBoundary renders children normally when there is no error', () => {
  const html = renderToStaticMarkup(
    <GlobalErrorBoundary name="TestBoundary" mode="fallback">
      <div data-testid="healthy-child">Checkout ativo</div>
    </GlobalErrorBoundary>
  );
  assert.match(html, /Checkout ativo/);
  assert.doesNotMatch(html, /role="alert"/);
});
