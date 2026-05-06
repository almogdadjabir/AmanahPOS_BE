import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';

interface StatCardProps {
  label:      string;
  value:      string | number;
  sub?:       string;
  icon?:      React.ReactNode;
  accent?:    string;
  className?: string;
}

export default function StatCard({
  label,
  value,
  sub,
  icon,
  accent = 'text-muted-foreground bg-muted',
  className,
}: StatCardProps) {
  return (
    <Card className={cn('p-4 flex flex-col gap-3', className)}>
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium text-muted-foreground leading-none">{label}</p>
        {icon && (
          <span className={cn('w-7 h-7 rounded-lg flex items-center justify-center shrink-0 [&_svg]:size-3.5', accent)}>
            {icon}
          </span>
        )}
      </div>
      <div>
        <p className="text-[26px] font-bold text-foreground leading-none tabular-nums">{value}</p>
        {sub && <p className="text-[11px] text-muted-foreground mt-1.5 leading-snug">{sub}</p>}
      </div>
    </Card>
  );
}
