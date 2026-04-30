import { cn } from '@/lib/cn';

type Props = { children: React.ReactNode; dark?: boolean; className?: string };

export default function Eyebrow({ children, dark = false, className }: Props) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-extrabold uppercase tracking-widest',
        dark
          ? 'bg-white/10 text-white/80'
          : 'bg-primary-light text-primary',
        className,
      )}
    >
      {children}
    </div>
  );
}
