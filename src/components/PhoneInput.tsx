import { useCallback } from 'react';

/**
 * Phone input with a fixed +964 prefix chip (non-editable).
 * The local part must be exactly 10 digits starting with 77.
 * Returns the full normalized number (e.g. +96477XXXXXXXX) via onChange.
 */

interface PhoneInputProps {
  value: string;
  onChange: (fullNormalized: string) => void;
  placeholder?: string;
  error?: string;
  id?: string;
}

/** Extract the local 10-digit part from a stored full number. */
export function extractLocalPhone(full: string): string {
  if (!full) return '';
  const digits = full.replace(/[^0-9]/g, '');
  // Format from normalizePhone: +964 followed by local digits (964XXXXXXXXXX)
  if (digits.startsWith('964')) {
    return digits.slice(3, 13).slice(0, 10);
  }
  // Legacy format: 077XXXXXXXX (12 digits)
  if (digits.startsWith('077') && digits.length === 12) {
    return digits.slice(1, 11);
  }
  // Already a bare local part: 77XXXXXXXX (10 digits starting with 77)
  if (digits.length === 10 && digits.startsWith('77')) {
    return digits;
  }
  // Fallback: last 10 digits
  if (digits.length >= 10) return digits.slice(-10);
  return '';
}

/** Build the full normalized number from a local part. */
export function normalizePhone(local: string): string {
  const digits = local.replace(/[^0-9]/g, '');
  if (!digits) return '';
  return `+964${digits}`;
}

/** Validate local part: exactly 10 digits starting with 77. */
export function validateLocalPhone(local: string): string | null {
  const digits = local.replace(/[^0-9]/g, '');
  if (!digits) return 'الرجاء إدخال رقم الهاتف';
  if (digits.length !== 10) return 'يجب أن يكون الرقم ١٠ أرقام بالضبط';
  if (!digits.startsWith('77')) return 'يجب أن يبدأ الرقم بـ ٧٧';
  return null;
}

/** Display a full normalized number as prefix + local for read-only contexts. */
export function formatPhoneDisplay(full: string): string {
  const local = extractLocalPhone(full);
  if (!local) return full || '';
  return `+964 ${local}`;
}

export function PhoneInput({ value, onChange, placeholder, error, id }: PhoneInputProps) {
  const local = extractLocalPhone(value);

  const handleInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value.replace(/[^0-9]/g, '').slice(0, 10);
      onChange(normalizePhone(raw));
    },
    [onChange]
  );

  return (
    <div>
      <div
        className={`flex items-stretch rounded-xl border bg-white overflow-hidden transition focus-within:ring-2 focus-within:ring-rose-100 ${
          error ? 'border-rose-400' : 'border-charcoal-200 focus-within:border-rose-400'
        }`}
        dir="ltr"
      >
        <span className="flex items-center gap-1 px-3 bg-cream-100 text-charcoal-700 font-bold text-sm border-l border-charcoal-200 select-none shrink-0">
          <span className="text-rose-600">+</span>964
        </span>
        <input
          id={id}
          type="tel"
          inputMode="numeric"
          value={local}
          onChange={handleInput}
          placeholder={placeholder || '77XX XXX XXX'}
          className="flex-1 px-4 py-2.5 text-sm text-charcoal-800 outline-none placeholder:text-charcoal-300 min-w-0"
          maxLength={10}
          autoComplete="tel-national"
        />
      </div>
      {error && <p className="text-xs text-rose-600 mt-1">{error}</p>}
    </div>
  );
}
