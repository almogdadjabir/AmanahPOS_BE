'use client';

import { useState } from 'react';

interface Props {
  label: string;
  placeholder?: string;
}

function EyeOnIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

export default function LoginPasswordInput({ label, placeholder = 'Enter your password' }: Props) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="flex flex-col" style={{ gap: 8 }}>
      <label
        htmlFor="login-password"
        style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#46535F' }}
      >
        {label}
      </label>

      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <input
          id="login-password"
          name="password"
          type={visible ? 'text' : 'password'}
          dir="ltr"
          placeholder={placeholder}
          autoComplete="current-password"
          style={{
            width: '100%', height: 52,
            paddingInlineStart: 16, paddingInlineEnd: 48,
            border: '1px solid #DBE3EB', borderRadius: 14,
            background: '#fff',
            fontSize: 15.5, fontWeight: 500, color: '#0C1521',
            outline: 'none', transition: 'border-color .2s, box-shadow .2s',
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
        <button
          type="button"
          onClick={() => setVisible(v => !v)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
          style={{
            position: 'absolute', right: 8,
            width: 36, height: 36, borderRadius: 9,
            display: 'grid', placeItems: 'center',
            color: '#7A8794', transition: 'background .18s, color .18s',
            background: 'transparent',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.background = '#EFF3F6';
            (e.currentTarget as HTMLButtonElement).style.color = '#0C1521';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
            (e.currentTarget as HTMLButtonElement).style.color = '#7A8794';
          }}
        >
          {visible ? <EyeOffIcon /> : <EyeOnIcon />}
        </button>
      </div>
    </div>
  );
}
