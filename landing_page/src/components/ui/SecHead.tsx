import type { ReactNode } from 'react';
import ScrollReveal from './ScrollReveal';

type Props = {
  eyebrow: string;
  title: ReactNode;
  lede?: string;
};

/** Centered premium section header — pill eyebrow + heading + lede. */
export default function SecHead({ eyebrow, title, lede }: Props) {
  return (
    <ScrollReveal className="sec-head">
      <span className="eyebrow">
        <span className="dot" aria-hidden="true" />
        {eyebrow}
      </span>
      <h2 className="h2">{title}</h2>
      {lede && <p className="lede">{lede}</p>}
    </ScrollReveal>
  );
}
