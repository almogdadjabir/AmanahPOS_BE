import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

// No ring-1 ring-inset — a border stacked on a colored bg is the "template tell".
// Soft fill + optional dot is the premium pattern.
const badgeVariants = cva(
  'inline-flex items-center gap-1.5 h-[22px] px-2.5 rounded-full text-[11.5px] font-medium select-none',
  {
    variants: {
      variant: {
        default:     'bg-muted text-muted-foreground',
        primary:     'bg-primary-50 text-primary-700',
        success:     'bg-success-light text-success',
        destructive: 'bg-danger-light text-danger',
        warning:     'bg-warning-light text-warning',
        info:        'bg-info-light text-info',
        danger:      'bg-danger-light text-danger',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

// Status dot colors — use the vivid dot, not the muted text color
const dotColor: Record<string, string> = {
  default:     'bg-muted-foreground',
  primary:     'bg-primary',
  success:     'bg-[#12B981]',
  destructive: 'bg-[#EC5B45]',
  warning:     'bg-[#E89923]',
  info:        'bg-[#4A82F0]',
  danger:      'bg-[#EC5B45]',
};

interface BadgeProps extends VariantProps<typeof badgeVariants> {
  dot?: boolean;
  children: React.ReactNode;
  className?: string;
}

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
