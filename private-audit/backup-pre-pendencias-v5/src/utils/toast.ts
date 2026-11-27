export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface ToastOptions {
  variant?: ToastVariant;
  title: string;
  description?: string;
  durationMs?: number;
}

export interface ToastItem {
  id: string;
  variant: ToastVariant;
  title: string;
  description?: string;
  durationMs: number;
  createdAt: number;
}

type ToastListener = (items: ToastItem[]) => void;

const MAX_TOASTS = 4;
const DEFAULT_DURATION_MS = 4500;

let toasts: ToastItem[] = [];
let sequence = 0;
const listeners = new Set<ToastListener>();

function notify(): void {
  const snapshot = [...toasts];
  listeners.forEach((listener) => listener(snapshot));
}

export function getToasts(): ToastItem[] {
  return [...toasts];
}

export function subscribeToasts(listener: ToastListener): () => void {
  listeners.add(listener);
  listener(getToasts());
  return () => {
    listeners.delete(listener);
  };
}

export function pushToast(options: ToastOptions): ToastItem {
  const variant: ToastVariant = options.variant ?? 'info';
  const durationMs =
    typeof options.durationMs === 'number' && options.durationMs >= 0
      ? options.durationMs
      : variant === 'error'
        ? 6000
        : DEFAULT_DURATION_MS;

  const item: ToastItem = {
    id: `toast-${++sequence}-${Date.now()}`,
    variant,
    title: options.title.trim(),
    description: options.description?.trim() || undefined,
    durationMs,
    createdAt: Date.now(),
  };

  toasts = [...toasts, item].slice(-MAX_TOASTS);
  notify();
  return item;
}

export function dismissToast(id: string): boolean {
  const next = toasts.filter((t) => t.id !== id);
  if (next.length === toasts.length) return false;
  toasts = next;
  notify();
  return true;
}

export function clearToasts(): void {
  if (toasts.length === 0) return;
  toasts = [];
  notify();
}

export const toast = {
  success: (title: string, description?: string, durationMs?: number) =>
    pushToast({ variant: 'success', title, description, durationMs }),
  error: (title: string, description?: string, durationMs?: number) =>
    pushToast({ variant: 'error', title, description, durationMs }),
  warning: (title: string, description?: string, durationMs?: number) =>
    pushToast({ variant: 'warning', title, description, durationMs }),
  info: (title: string, description?: string, durationMs?: number) =>
    pushToast({ variant: 'info', title, description, durationMs }),
};
