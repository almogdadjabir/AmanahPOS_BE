import { type AnchorHTMLAttributes, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

type BaseProps = {
  variant?: 'default' | 'primary' | 'dark';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  children: React.ReactNode;
};

type AsButton = BaseProps &
  ButtonHTMLAttributes<HTMLButtonElement> & { as?: 'button' };

type AsAnchor = BaseProps &
  AnchorHTMLAttributes<HTMLAnchorElement> & { as: 'a' };

type Props = AsButton | AsAnchor;

const base =
  'inline-flex items-center gap-2 font-bold rounded-xl transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 select-none';

const variants = {
  default:
    'bg-white text-text-primary border border-[#E2E8F0] hover:border-[#CBD5E1] hover:bg-[#F8FAFC]',
  primary:
    'bg-primary text-white shadow-[0_8px_24px_-6px_rgba(15,118,110,0.45)] hover:bg-[#0D6B63] hover:-translate-y-0.5',
  dark: 'bg-white/10 text-white border border-white/20 hover:bg-white/20',
};

const sizes = {
  sm: 'px-4 py-2 text-sm',
  md: 'px-5 py-2.5 text-sm',
  lg: 'px-6 py-3 text-[15px]',
};

export default function Button({
  variant = 'default',
  size = 'md',
  className,
  children,
  as,
  ...rest
}: Props) {
  const cls = cn(base, variants[variant], sizes[size], className);

  if (as === 'a') {
    return (
      <a className={cls} {...(rest as AnchorHTMLAttributes<HTMLAnchorElement>)}>
        {children}
      </a>
    );
  }
  return (
    <button
      className={cls}
      {...(rest as ButtonHTMLAttributes<HTMLButtonElement>)}
    >
      {children}
    </button>
  );
}
