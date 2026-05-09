'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

export default function NavProgress() {
  const pathname          = usePathname();
  const [width, setWidth]   = useState(0);
  const [visible, setVisible] = useState(false);
  const intervalRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevPathname = useRef(pathname);
  const origPush     = useRef<typeof window.history.pushState | null>(null);

  useEffect(() => {
    origPush.current = window.history.pushState.bind(window.history);

    window.history.pushState = function (...args) {
      origPush.current!(...args);
      handleStart();
    };

    const onPop = () => handleStart();
    window.addEventListener('popstate', onPop);

    return () => {
      if (origPush.current) window.history.pushState = origPush.current;
      window.removeEventListener('popstate', onPop);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (pathname !== prevPathname.current) {
      prevPathname.current = pathname;
      handleComplete();
    }
  }, [pathname]);

  function handleStart() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setVisible(true);
    setWidth(12);
    let w = 12;
    intervalRef.current = setInterval(() => {
      w = Math.min(w + Math.random() * 10 + 4, 84);
      setWidth(w);
      if (w >= 84) {
        clearInterval(intervalRef.current!);
        intervalRef.current = null;
      }
    }, 180);
  }

  function handleComplete() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    setWidth(100);
    setTimeout(() => {
      setVisible(false);
      setTimeout(() => setWidth(0), 50);
    }, 320);
  }

  return (
    <div
      aria-hidden
      className="fixed top-0 inset-x-0 z-[100] h-[2px] pointer-events-none"
      style={{ opacity: visible ? 1 : 0, transition: 'opacity 300ms ease' }}
    >
      <div
        className="h-full bg-primary"
        style={{
          width:      `${width}%`,
          transition: width === 100 ? 'width 200ms ease-out' : 'width 180ms linear',
        }}
      />
    </div>
  );
}
