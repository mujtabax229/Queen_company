import { useEffect, useState } from 'react';

interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
}

let confirmResolver: ((v: boolean) => void) | null = null;
let pushConfirm: ((o: ConfirmOptions) => Promise<boolean>) | null = null;

export function confirm(o: ConfirmOptions): Promise<boolean> {
  if (!pushConfirm) return Promise.resolve(false);
  return pushConfirm(o);
}

export function ConfirmHost() {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    pushConfirm = (o: ConfirmOptions) => {
      setOpts(o);
      setOpen(true);
      return new Promise<boolean>((resolve) => {
        confirmResolver = resolve;
      });
    };
    return () => {
      pushConfirm = null;
    };
  }, []);

  const close = (val: boolean) => {
    setOpen(false);
    confirmResolver?.(val);
    confirmResolver = null;
  };

  if (!open || !opts) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 animate-fadeIn">
      <div className="absolute inset-0 bg-charcoal-900/50 backdrop-blur-sm" onClick={() => close(false)} />
      <div className="relative card w-full max-w-sm p-6 animate-scaleIn">
        <h3 className="text-lg font-bold mb-2">{opts.title}</h3>
        <p className="text-sm text-charcoal-600 mb-6">{opts.message}</p>
        <div className="flex gap-2 justify-start">
          <button
            className={opts.danger ? 'btn bg-rose-600 text-white hover:bg-rose-700' : 'btn-primary'}
            onClick={() => close(true)}
          >
            {opts.confirmText || 'تأكيد'}
          </button>
          <button className="btn-outline" onClick={() => close(false)}>
            {opts.cancelText || 'إلغاء'}
          </button>
        </div>
      </div>
    </div>
  );
}
