import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { WarningCircle } from '@phosphor-icons/react';

export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  /** Style the confirm button as destructive (red). */
  danger?: boolean;
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmCtx = createContext<ConfirmFn>(() => Promise.resolve(false));

/** Returns an async confirm() that resolves true (confirmed) or false (cancelled). */
export function useConfirm() {
  return useContext(ConfirmCtx);
}

interface Pending extends ConfirmOptions {
  resolve: (value: boolean) => void;
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = useState<Pending | null>(null);

  const confirm = useCallback<ConfirmFn>(
    (options) => new Promise<boolean>((resolve) => setPending({ ...options, resolve })),
    []
  );

  const close = useCallback((result: boolean) => {
    setPending((p) => {
      p?.resolve(result);
      return null;
    });
  }, []);

  // Esc cancels. (Enter is intentionally not bound — accidental confirm of a
  // destructive action should require an explicit click or tab-to-confirm.)
  useEffect(() => {
    if (!pending) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        close(false);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pending, close]);

  return (
    <ConfirmCtx.Provider value={confirm}>
      {children}
      {pending && (
        <div
          className="modal-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) close(false);
          }}
        >
          <div
            className="modal modal-confirm"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
          >
            <div className="confirm-body">
              {pending.danger && (
                <span className="confirm-icon danger">
                  <WarningCircle weight="fill" size={22} />
                </span>
              )}
              <div className="confirm-text">
                <h2 id="confirm-title">{pending.title}</h2>
                {pending.message && <p>{pending.message}</p>}
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn ghost" onClick={() => close(false)} autoFocus>
                {pending.cancelText ?? 'Cancel'}
              </button>
              <button
                className={`btn ${pending.danger ? 'danger-solid' : 'primary'}`}
                onClick={() => close(true)}
              >
                {pending.confirmText ?? 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmCtx.Provider>
  );
}
