import { cn } from '@/lib/cn';

type Variant = 'success' | 'danger' | 'warning' | 'info' | 'default';

const styles: Record<Variant, string> = {
  success: 'bg-success-light  text-success  ring-success/20',
  danger:  'bg-danger-light   text-danger   ring-danger/20',
  warning: 'bg-warning-light  text-warning  ring-warning/20',
  info:    'bg-info-light     text-info      ring-info/20',
  default: 'bg-surface-muted text-text-secondary ring-border-soft',
};

const dots: Record<Variant, string> = {
  success: 'bg-success',
  danger:  'bg-danger',
  warning: 'bg-warning',
  info:    'bg-info',
  default: 'bg-text-hint',
};

export default function Badge({
  variant = 'default',
  dot = false,
  children,
  className,
}: {
  variant?: Variant;
  dot?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold ring-1 ring-inset',
      styles[variant],
      className,
    )}>
      {dot && (
        <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', dots[variant])} />
      )}
      {children}
    </span>
  );
}
