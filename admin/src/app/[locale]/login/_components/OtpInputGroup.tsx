'use client';

import { useEffect, useRef, useState } from 'react';

interface Props {
  onChange?: (value: string) => void;
  onComplete: (value: string) => void;
  onErrorReset?: () => void;
  error?: boolean;
  errorMessage?: string;
  disabled?: boolean;
}

export default function OtpInputGroup({
  onChange,
  onComplete,
  onErrorReset,
  error,
  errorMessage,
  disabled,
}: Props) {
  const [values, setValues] = useState<string[]>(Array(6).fill(''));
  const [shaking, setShaking] = useState(false);
  const boxRefs = useRef<Array<HTMLInputElement | null>>(Array(6).fill(null));

  // Shake + clear on error
  useEffect(() => {
    if (!error) return;
    setShaking(true);
    setValues(Array(6).fill(''));
    onChange?.('');
    const t1 = setTimeout(() => boxRefs.current[0]?.focus(), 50);
    const t2 = setTimeout(() => setShaking(false), 420);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [error]);  // eslint-disable-line react-hooks/exhaustive-deps

  function handleChange(i: number, e: React.ChangeEvent<HTMLInputElement>) {
    const char = e.target.value.replace(/\D/g, '').slice(-1);
    const next = [...values];
    next[i] = char;
    setValues(next);
    onChange?.(next.join(''));
    onErrorReset?.();

    if (char && i < 5) boxRefs.current[i + 1]?.focus();

    if (next.every(v => v !== '')) {
      onComplete(next.join(''));
    }
  }

  function handleKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace') {
      if (values[i]) {
        const next = [...values];
        next[i] = '';
        setValues(next);
        onChange?.(next.join(''));
      } else if (i > 0) {
        const next = [...values];
        next[i - 1] = '';
        setValues(next);
        onChange?.(next.join(''));
        boxRefs.current[i - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft'  && i > 0) boxRefs.current[i - 1]?.focus();
    else if  (e.key === 'ArrowRight' && i < 5) boxRefs.current[i + 1]?.focus();
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const next = Array(6).fill('');
    pasted.split('').forEach((c, j) => { next[j] = c; });
    setValues(next);
    onChange?.(next.join(''));
    onErrorReset?.();
    const focusIdx = Math.min(pasted.length, 5);
    boxRefs.current[focusIdx]?.focus();
    if (pasted.length === 6) onComplete(pasted);
  }

  return (
    <div>
      <div
        role="group"
        aria-label="Verification code"
        className={`flex gap-[10px] justify-between mb-2 ${shaking ? 'login-otp-shake' : ''}`}
      >
        {values.map((v, i) => (
          <input
            key={i}
            ref={el => { boxRefs.current[i] = el; }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={v}
            autoComplete={i === 0 ? 'one-time-code' : 'off'}
            autoFocus={i === 0}
            disabled={disabled}
            onChange={e => handleChange(i, e)}
            onKeyDown={e => handleKeyDown(i, e)}
            onPaste={handlePaste}
            aria-label={`Digit ${i + 1}`}
            className={[
              'w-full aspect-[1/1.1] max-h-[60px] text-center font-semibold text-[25px]',
              'rounded-[14px] border outline-none transition-all duration-150',
              'focus:-translate-y-[2px] focus:shadow-[0_0_0_4px_rgba(13,124,114,.12)]',
              'disabled:opacity-55',
              error || shaking
                ? 'border-[#DC4747] bg-[#FEF2F2]'
                : v
                  ? 'border-[#0D7C72] bg-[#F0FDFA] focus:border-[#0D7C72]'
                  : 'border-[#DBE3EB] bg-white focus:border-[#0D7C72]',
            ].join(' ')}
            style={{ fontFamily: 'var(--font-space-grotesk), system-ui, sans-serif', fontVariantNumeric: 'tabular-nums' }}
          />
        ))}
      </div>
      <p className={`text-[13px] font-semibold text-[#DC4747] min-h-[18px] transition-opacity ${error && errorMessage ? 'opacity-100' : 'opacity-0'}`}>
        {errorMessage ?? ' '}
      </p>
    </div>
  );
}
