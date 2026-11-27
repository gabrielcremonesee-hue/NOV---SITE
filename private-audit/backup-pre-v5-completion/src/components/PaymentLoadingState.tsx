import { type ButtonHTMLAttributes, type ReactNode, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import {
  getPaymentCheckoutState,
  PaymentCheckoutState,
  subscribePaymentCheckout,
} from '../utils/paymentCheckout';

export interface PaymentLoadingButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  isLoading: boolean;
  loadingText?: string;
  children: ReactNode;
}

export function PaymentLoadingButton({
  isLoading,
  loadingText = 'Processing Payment...',
  children,
  disabled,
  className = 'btn btn-red',
  type = 'button',
  ...rest
}: PaymentLoadingButtonProps) {
  return (
    <button
      type={type}
      className={`${className}${isLoading ? ' is-processing-payment' : ''}`}
      disabled={Boolean(disabled || isLoading)}
      aria-busy={isLoading}
      aria-disabled={Boolean(disabled || isLoading)}
      {...rest}
    >
      {isLoading ? (
        <>
          <Loader2
            className="payment-btn-spinner"
            size={16}
            strokeWidth={2.3}
            aria-hidden="true"
          />
          <span>{loadingText}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}

export default function PaymentLoadingState() {
  const [state, setState] = useState<PaymentCheckoutState>(() => getPaymentCheckoutState());

  useEffect(() => {
    return subscribePaymentCheckout(setState);
  }, []);

  if (!state.isProcessing) return null;

  return (
    <div
      className="payment-loading-banner"
      role="status"
      aria-live="polite"
      aria-label="Processing Payment..."
      data-testid="payment-loading-state"
    >
      <Loader2
        className="payment-btn-spinner"
        size={18}
        strokeWidth={2.4}
        aria-hidden="true"
      />
      <div className="payment-loading-copy">
        <strong>Processing Payment...</strong>
        {state.activeCourseTitle ? <span>{state.activeCourseTitle}</span> : null}
      </div>
    </div>
  );
}
