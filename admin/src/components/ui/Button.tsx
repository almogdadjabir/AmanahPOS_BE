import { type AnchorHTMLAttributes, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

type Variant = 'primary' | 'default' | 'danger' | 'ghost';
type Size    = 'xs' | 'sm' | 'md';

type Base     = { variant?: Variant; size?: Size; className?: string; children: React.ReactNode };
type AsButton = Base & ButtonHTMLAttributes<HTMLButtonElement> & { as?: 'button' };
type AsAnchor = Base & AnchorHTMLAttributes<HTMLAnchorElement> & { as: 'a' };
type Props    = AsButton | AsAnchor;

const base = [
  'inline-flex items-center gap-1.5 font-semibold rounded-md transition-all duration-150',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1',
  'select-none disabled:opacity-40 disabled:pointer-events-none',
].join(' ');

const variants: Record<Variant, string> = {
  primary: 'bg-primary text-white hover:bg-[#0D6B63] active:bg-[#0A5C55]',
  default: 'bg-white text-text-secondary border border-border-soft hover:bg-surface-muted hover:border-border-muted hover:text-text-primary',
  danger:  'bg-danger-light text-danger border border-danger/20 hover:bg-danger hover:text-white hover:border-danger',
  ghost:   'text-text-hint hover:text-text-primary hover:bg-surface-muted',
};

const sizes: Record<Size, string> = {
  xs: 'px-2.5 py-1   text-[11px]',
  sm: 'px-3   py-1.5 text-xs',
  md: 'px-4   py-2   text-sm',
};

export default function Button({ variant = 'default', size = 'md', className, children, as, ...rest }: Props) {
  const cls = cn(base, variants[variant], sizes[size], className);
  if (as === 'a') return <a className={cls} {...(rest as AnchorHTMLAttributes<HTMLAnchorElement>)}>{children}</a>;
  return <button className={cls} {...(rest as ButtonHTMLAttributes<HTMLButtonElement>)}>{children}</button>;
}
