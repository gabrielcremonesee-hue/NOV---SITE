import { Component, type ErrorInfo, type ReactNode } from 'react';
import { reportAppError } from '../utils/errorReporter';

export interface GlobalErrorBoundaryFallbackInfo {
  error: Error;
  reset: () => void;
}

export interface GlobalErrorBoundaryProps {
  children?: ReactNode;
  name?: string;
  route?: string;
  mode?: 'non-blocking' | 'fallback';
  fallback?: ReactNode | ((info: GlobalErrorBoundaryFallbackInfo) => ReactNode);
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface GlobalErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export default class GlobalErrorBoundary extends Component<
  GlobalErrorBoundaryProps,
  GlobalErrorBoundaryState
> {
  state: GlobalErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  static getDerivedStateFromError(error: Error): GlobalErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const mode = this.props.mode ?? 'fallback';
    reportAppError(error, {
      source: mode === 'non-blocking' ? 'ui-widget' : 'react-error-boundary',
      boundaryName: this.props.name || 'GlobalErrorBoundary',
      route: this.props.route,
      componentStack: errorInfo.componentStack ?? undefined,
    });

    if (this.props.onError) {
      try {
        this.props.onError(error, errorInfo);
      } catch {
        // Never allow secondary error hooks to break error containment
      }
    }
  }

  resetErrorBoundary = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const mode = this.props.mode ?? 'fallback';
    const { fallback } = this.props;
    const error = this.state.error ?? new Error('Erro de renderização');

    if (typeof fallback === 'function') {
      return fallback({ error, reset: this.resetErrorBoundary });
    }

    if (fallback !== undefined) {
      return fallback;
    }

    if (mode === 'non-blocking') {
      return null;
    }

    return (
      <div
        role="alert"
        aria-live="assertive"
        className="mx-auto my-6 max-w-lg rounded-2xl border border-amber-300/80 bg-amber-50/95 px-6 py-5 text-stone-900 shadow-lg"
      >
        <h2 className="mb-2 text-lg font-bold text-red-900">
          Algo inesperado aconteceu ao exibir esta seção
        </h2>
        <p className="mb-4 text-sm leading-relaxed text-stone-700">
          O erro foi registrado para análise. Você pode tentar recarregar a interface sem perder sua navegação.
        </p>
        <div className="flex flex-wrap gap-2.5">
          <button
            type="button"
            onClick={this.resetErrorBoundary}
            className="cursor-pointer rounded-full border border-red-900 bg-red-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-800"
          >
            Tentar novamente
          </button>
          <a
            href="#/pagamentos"
            onClick={this.resetErrorBoundary}
            className="rounded-full border border-amber-400 bg-white px-4 py-2 text-sm font-semibold text-stone-900 no-underline transition hover:bg-amber-100"
          >
            Ir para Pagamentos
          </a>
        </div>
      </div>
    );
  }
}
