'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface Props {
  children: ReactNode;
  className?: string;
  delay?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  threshold?: number;
}

const delayClass: Record<number, string> = {
  0: '',
  1: 'reveal-d1',
  2: 'reveal-d2',
  3: 'reveal-d3',
  4: 'reveal-d4',
  5: 'reveal-d5',
  6: 'reveal-d6',
};

export default function ScrollReveal({ children, className, delay = 0, threshold = 0.12 }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('is-revealed');
          observer.disconnect();
        }
      },
      { threshold, rootMargin: '0px 0px -40px 0px' },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return (
    <div ref={ref} className={cn('reveal', delayClass[delay], className)}>
      {children}
    </div>
  );
}
