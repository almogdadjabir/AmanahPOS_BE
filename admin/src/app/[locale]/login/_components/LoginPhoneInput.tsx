'use client';

import { useEffect, useRef, useState } from 'react';

interface Country {
  code: string;
  dial: string;
  flag: React.ReactNode;
}

function SudanFlag() {
  return (
    <svg viewBox="0 0 24 17" width="24" height="17" aria-hidden="true"
      style={{ borderRadius: 3, boxShadow: '0 0 0 1px rgba(0,0,0,.05)', flexShrink: 0 }}>
      <rect width="24" height="5.67" y="0"     fill="#D21034" />
      <rect width="24" height="5.66" y="5.67"  fill="#fff" />
      <rect width="24" height="5.67" y="11.33" fill="#000" />
      <path d="M0 0v17l9-8.5z" fill="#007A3D" />
    </svg>
  );
}

function UAEFlag() {
  return (
    <svg viewBox="0 0 24 17" width="24" height="17" aria-hidden="true"
      style={{ borderRadius: 3, boxShadow: '0 0 0 1px rgba(0,0,0,.05)', flexShrink: 0 }}>
      {/* Red vertical bar on left */}
      <rect width="7" height="17" x="0" fill="#EF3340" />
      {/* Green stripe */}
      <rect width="17" height="5.67" x="7" y="0"     fill="#00A550" />
      {/* White stripe */}
      <rect width="17" height="5.66" x="7" y="5.67"  fill="#fff" />
      {/* Black stripe */}
      <rect width="17" height="5.67" x="7" y="11.33" fill="#231F20" />
    </svg>
  );
}

const COUNTRIES: Country[] = [
  { code: '+249', dial: '+249', flag: <SudanFlag /> },
  { code: '+971', dial: '+971', flag: <UAEFlag /> },
];

interface Props {
  label: string;
  placeholder?: string;
}

export default function LoginPhoneInput({ label, placeholder = '912 345 678' }: Props) {
  const [selected,  setSelected]  = useState<Country>(COUNTRIES[0]);
  const [open,      setOpen]      = useState(false);
  const inputRef    = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return;
    function onOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, [open]);

  function formatNational(raw: string): string {
    const digits = raw.replace(/\D/g, '').slice(0, 9);
    const a = digits.slice(0, 3);
    const b = digits.slice(3, 6);
    const c = digits.slice(6, 9);
    return [a, b, c].filter(Boolean).join(' ');
  }

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const cursor = e.target.selectionStart ?? 0;
    const prev   = e.target.value;
    const next   = formatNational(prev);
    e.target.value = next;
    const delta = next.length - prev.length;
    e.target.setSelectionRange(cursor + delta, cursor + delta);
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    let raw = e.clipboardData.getData('text').replace(/\s+/g, '');
    // Strip any country prefix
    for (const c of COUNTRIES) {
      const bare = c.code.replace('+', '');
      if (raw.startsWith(c.code))      { raw = raw.slice(c.code.length); break; }
      if (raw.startsWith('00' + bare)) { raw = raw.slice(2 + bare.length); break; }
      if (raw.startsWith(bare))        { raw = raw.slice(bare.length); break; }
    }
    raw = raw.replace(/^0+/, '').replace(/\D/g, '');
    if (inputRef.current) inputRef.current.value = formatNational(raw);
  }

  function selectCountry(c: Country) {
    setSelected(c);
    setOpen(false);
    inputRef.current?.focus();
    if (inputRef.current) inputRef.current.value = '';
  }

  return (
    <div className="flex flex-col" style={{ gap: 8 }}>
      <label
        htmlFor="login-phone"
        style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#46535F' }}
      >
        {label}
      </label>

      <input type="hidden" name="country_code" value={selected.code} />

      {/* phone row — always LTR so flag+code stay on the left */}
      <div style={{ display: 'flex', gap: 9, position: 'relative' }} dir="ltr">

        {/* country selector */}
        <div ref={dropdownRef} style={{ position: 'relative', flexShrink: 0 }}>
          <button
            type="button"
            onClick={() => setOpen(o => !o)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '0 12px 0 14px', height: 52,
              border: `1px solid ${open ? '#0D7C72' : '#DBE3EB'}`,
              borderRadius: 14,
              background: '#fff', fontWeight: 700, fontSize: 15,
              whiteSpace: 'nowrap', color: '#0C1521',
              cursor: 'pointer',
              boxShadow: open ? '0 0 0 4px rgba(13,124,114,.12)' : 'none',
              transition: 'border-color .2s, box-shadow .2s',
            }}
          >
            {selected.flag}
            <span style={{ fontVariantNumeric: 'tabular-nums' }}>{selected.dial}</span>
            {/* chevron */}
            <svg
              width="13" height="13" viewBox="0 0 24 24" fill="none"
              stroke="#7A8794" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"
              style={{ transition: 'transform .18s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)', marginLeft: 2 }}
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>

          {/* dropdown */}
          {open && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 20,
              background: '#fff', border: '1px solid #E9EEF3', borderRadius: 12,
              boxShadow: '0 4px 20px -6px rgba(12,21,33,.18)',
              overflow: 'hidden', minWidth: 140,
            }}>
              {COUNTRIES.map(c => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => selectCountry(c)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    width: '100%', padding: '11px 14px',
                    background: selected.code === c.code ? '#F0FDFA' : 'transparent',
                    color: '#0C1521', fontSize: 14, fontWeight: 600,
                    textAlign: 'left', cursor: 'pointer',
                    transition: 'background .12s',
                  }}
                  onMouseEnter={e => {
                    if (selected.code !== c.code)
                      (e.currentTarget as HTMLButtonElement).style.background = '#F7F9FA';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLButtonElement).style.background =
                      selected.code === c.code ? '#F0FDFA' : 'transparent';
                  }}
                >
                  {c.flag}
                  <span style={{ fontVariantNumeric: 'tabular-nums' }}>{c.dial}</span>
                  {selected.code === c.code && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                      stroke="#0D7C72" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"
                      style={{ marginLeft: 'auto' }}>
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* national number */}
        <input
          ref={inputRef}
          id="login-phone"
          name="phone_local"
          type="tel"
          dir="ltr"
          inputMode="numeric"
          autoComplete="tel"
          autoFocus
          placeholder={placeholder}
          maxLength={11}
          onChange={handleInput}
          onPaste={handlePaste}
          style={{
            flex: 1, height: 52, width: '100%',
            padding: '0 16px',
            border: '1px solid #DBE3EB', borderRadius: 14,
            background: '#fff',
            fontSize: 15.5, fontWeight: 500, color: '#0C1521',
            outline: 'none', transition: 'border-color .2s, box-shadow .2s',
            fontVariantNumeric: 'tabular-nums',
          }}
          onFocus={e => {
            e.currentTarget.style.borderColor = '#0D7C72';
            e.currentTarget.style.boxShadow = '0 0 0 4px rgba(13,124,114,.12)';
          }}
          onBlur={e => {
            e.currentTarget.style.borderColor = '#DBE3EB';
            e.currentTarget.style.boxShadow = 'none';
          }}
        />
      </div>
    </div>
  );
}
