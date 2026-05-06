import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold ring-1 ring-inset select-none',
  {
    variants: {
      variant: {
        default:     'bg-muted text-muted-foreground ring-border',
        primary:     'bg-primary/10 text-primary ring-primary/20',
        success:     'bg-success-light text-success ring-success/20',
        destructive: 'bg-danger-light text-danger ring-danger/20',
        warning:     'bg-warning-light text-warning ring-warning/20',
        info:        'bg-info-light text-info ring-info/20',
        /* Backward-compat aliases */
        danger:      'bg-danger-light text-danger ring-danger/20',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

interface BadgeProps extends VariantProps<typeof badgeVariants> {
  dot?: boolean;
  children: React.ReactNode;
  className?: string;
}

const dotColor: Record<string, string> = {
  default:     'bg-muted-foreground',
  primary:     'bg-primary',
  success:     'bg-success',
  destructive: 'bg-danger',
  warning:     'bg-warning',
  info:        'bg-info',
  danger:      'bg-danger',
};

function Badge({ variant = 'default', dot = false, children, className }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)}>
      {dot && (
        <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', dotColor[variant ?? 'default'])} />
      )}
      {children}
    </span>
  );
}

export { Badge, badgeVariants };
export default Badge;
