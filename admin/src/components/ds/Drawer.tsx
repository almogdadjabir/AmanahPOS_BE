'use client';

import { useEffect, useRef, useState } from 'react';

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  width?: number;
  footer?: React.ReactNode;
}

export default function Drawer({
  open,
  onClose,
  title,
  subtitle,
  children,
  width = 520,
  footer,
}: DrawerProps) {
  const [visible, setVisible] = useState(false);
  const prevOpen = useRef(false);

  useEffect(() => {
    if (open && !prevOpen.current) {
      const id = requestAnimationFrame(() => setVisible(true));
      prevOpen.current = true;
      return () => cancelAnimationFrame(id);
    }
    if (!open && prevOpen.current) {
      setVisible(false);
      prevOpen.current = false;
    }
  }, [open]);

  // Lock body scroll
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  // ESC key
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/25 backdrop-blur-[2px] transition-opacity duration-300"
        style={{ opacity: visible ? 1 : 0 }}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="relative flex flex-col bg-white shadow-2xl transition-transform duration-300 ease-out"
        style={{
          width:     `min(${width}px, 100vw)`,
          height:    '100dvh',
          transform: visible ? 'translateX(0)' : 'translateX(100%)',
        }}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-border-soft shrink-0">
          <div>
            <p className="text-[15px] font-bold text-text-primary leading-tight">{title}</p>
            {subtitle && <p className="text-[12px] text-text-hint mt-0.5">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-7 h-7 rounded-lg text-text-hint hover:text-text-primary hover:bg-surface-soft transition-colors shrink-0 mt-0.5"
          >
            <XIcon />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>

        {/* Optional footer */}
        {footer && (
          <div className="shrink-0 border-t border-border-soft px-5 py-4 bg-surface-soft/50">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

function XIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}
