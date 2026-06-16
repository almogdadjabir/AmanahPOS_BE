'use client';
import { useEffect, useState } from 'react';

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('theme');
    const dark = saved === 'dark';
    setIsDark(dark);
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  }, []);

  function toggle() {
    const next = isDark ? 'light' : 'dark';
    setIsDark(!isDark);
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
  }

  return (
    <button
      className="theme-toggle"
      onClick={toggle}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <circle cx="8" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.5"/>
          <line x1="8" y1="0.5" x2="8" y2="2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          <line x1="8" y1="13.5" x2="8" y2="15.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          <line x1="0.5" y1="8" x2="2.5" y2="8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          <line x1="13.5" y1="8" x2="15.5" y2="8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          <line x1="2.58" y1="2.58" x2="4" y2="4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          <line x1="12" y1="12" x2="13.42" y2="13.42" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          <line x1="2.58" y1="13.42" x2="4" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          <line x1="12" y1="4" x2="13.42" y2="2.58" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M13.5 10A6 6 0 1 1 6 2.5a4.5 4.5 0 0 0 7.5 7.5z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )}
    </button>
  );
}
