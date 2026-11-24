import { useEffect, useState } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { dismissToast, subscribeToasts, ToastItem, ToastVariant } from '../utils/toast';

function ToastIcon({ variant }: { variant: ToastVariant }) {
  if (variant === 'success') {
    return <CheckCircle2 size={20} strokeWidth={2.2} aria-hidden="true" />;
  }
  if (variant === 'error') {
    return <AlertCircle size={20} strokeWidth={2.2} aria-hidden="true" />;
  }
  if (variant === 'warning') {
    return <AlertTriangle size={20} strokeWidth={2.2} aria-hidden="true" />;
  }
  return <Info size={20} strokeWidth={2.2} aria-hidden="true" />;
}

function ToastCard({ item }: { item: ToastItem }) {
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (item.durationMs <= 0 || paused) return;
    const timer = window.setTimeout(() => {
      dismissToast(item.id);
    }, item.durationMs);
    return () => window.clearTimeout(timer);
  }, [item.id, item.durationMs, paused]);

  const role = item.variant === 'error' || item.variant === 'warning' ? 'alert' : 'status';

  return (
    <div
      className={`fervec-toast-card is-${item.variant}`}
      role={role}
      aria-live={item.variant === 'error' ? 'assertive' : 'polite'}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      data-toast-id={item.id}
      data-toast-variant={item.variant}
    >
      <span className="fervec-toast-icon" aria-hidden="true">
        <ToastIcon variant={item.variant} />
      </span>
      <div className="fervec-toast-content">
        <strong className="fervec-toast-title">{item.title}</strong>
        {item.description ? <p className="fervec-toast-desc">{item.description}</p> : null}
      </div>
      <button
        type="button"
        className="fervec-toast-close"
        onClick={() => dismissToast(item.id)}
        aria-label="Fechar notificação"
      >
        <X size={16} strokeWidth={2.2} aria-hidden="true" />
      </button>
    </div>
  );
}

export default function ToastContainer() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    return subscribeToasts(setItems);
  }, []);

  if (items.length === 0) return null;

  return (
    <div className="fervec-toast-stack" aria-label="Notificações">
      {items.map((item) => (
        <ToastCard key={item.id} item={item} />
      ))}
    </div>
  );
}
