'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';

const ADMIN_SHORTCUTS: Record<string, string> = {
  d: '/',
  o: '/owners',
  b: '/businesses',
  n: '/subscriptions',
  l: '/plans',
  a: '/activity-logs',
  y: '/system',
};

const OWNER_SHORTCUTS: Record<string, string> = {
  d: '/',
  s: '/sales',
  p: '/products',
  i: '/inventory',
  c: '/customers',
  u: '/users',
  m: '/subscription',
};

export default function KeyboardShortcuts({ isAdmin }: { isAdmin: boolean }) {
  const router = useRouter();
  const locale = useLocale() as string;

  useEffect(() => {
    const shortcuts = isAdmin ? ADMIN_SHORTCUTS : OWNER_SHORTCUTS;
    let gPressed = false;
    let gTimer: ReturnType<typeof setTimeout> | undefined;

    function onKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName ?? '';
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const key = e.key.toLowerCase();

      if (key === 'g') {
        gPressed = true;
        clearTimeout(gTimer);
        gTimer = setTimeout(() => { gPressed = false; }, 1500);
        return;
      }

      if (gPressed) {
        gPressed = false;
        clearTimeout(gTimer);
        const path = shortcuts[key];
        if (path) {
          e.preventDefault();
          router.push(`/${locale}${path}`);
        }
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      clearTimeout(gTimer);
    };
  }, [isAdmin, locale, router]);

  return null;
}
