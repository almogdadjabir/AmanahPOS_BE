'use client';

import { motion, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';

type Props = {
  children: ReactNode;
  delay?: number;
  className?: string;
  from?: 'bottom' | 'left' | 'right';
};

export default function FadeIn({ children, delay = 0, className, from = 'bottom' }: Props) {
  const shouldReduce = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={shouldReduce ? false : {
        opacity: 0,
        y: from === 'bottom' ? 28 : 0,
        x: from === 'left' ? -20 : from === 'right' ? 20 : 0,
      }}
      whileInView={shouldReduce ? undefined : { opacity: 1, y: 0, x: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.55, delay, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] }}
    >
      {children}
    </motion.div>
  );
}
