import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StatCardProps {
  label:        string;
  value:        string | number;
  sub?:         string;
  icon?:        React.ReactNode;
  accent?:      string;
  // Delta / trend — show a ▲/▼ pill below the value
  delta?:       number;           // e.g. 12.4 → "+12.4%"
  deltaLabel?:  string;           // e.g. "vs last month"
  trend?:       'up' | 'down' | 'flat';
  className?:   string;
}

export default function StatCard({
  label,
  value,
  sub,
  icon,
  accent = 'bg-primary-tint [&_svg]:text-primary',
  delta,
  deltaLabel,
  trend,
  className,
}: StatCardProps) {
  const hasDelta = delta !== undefined || trend !== undefined;
  const dir = trend ?? (delta !== undefined ? (delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat') : 'flat');

  return (
    // Card lifts subtly on hover — the number is the hero
    <Card className={cn(
      'p-4 flex flex-col gap-3 relative overflow-hidden',
      'hover:shadow-card hover:-translate-y-px cursor-default',
      className,
    )}>
      {/* Top row: label + icon chip */}
      <div className="flex items-start justify-between">
        <p className="text-[11.5px] font-[550] text-muted-foreground tracking-[-.005em]">{label}</p>
        {icon && (
          <span className={cn(
            'w-[30px] h-[30px] rounded-lg flex items-center justify-center shrink-0 [&_svg]:size-[15px]',
            accent,
          )}>
            {icon}
          </span>
        )}
      </div>

      {/* Value — 27px / 600 / tabular — number is the hero */}
      <div>
        <p className="text-[27px] font-semibold text-foreground leading-none tabular-nums tracking-[-.03em] num">
          {value}
        </p>

        {/* Delta pill */}
        {hasDelta && (
          <div className="flex items-center gap-2 mt-2.5">
            <span className={cn(
              'inline-flex items-center gap-1 text-[11.5px] font-semibold px-1.5 py-0.5 rounded-md tabular-nums num',
              dir === 'up'   && 'text-success bg-success-light',
              dir === 'down' && 'text-danger bg-danger-light',
              dir === 'flat' && 'text-muted-foreground bg-muted',
            )}>
              {dir === 'up'   && <TrendingUp  size={11} />}
              {dir === 'down' && <TrendingDown size={11} />}
              {dir === 'flat' && <Minus        size={11} />}
              {delta !== undefined && `${delta > 0 ? '+' : ''}${delta.toFixed(1)}%`}
            </span>
            {deltaLabel && (
              <span className="text-[11.5px] text-muted-foreground">{deltaLabel}</span>
            )}
          </div>
        )}

        {/* Sub — shown when no delta */}
        {sub && !hasDelta && (
          <p className="text-[11.5px] text-muted-foreground mt-2 leading-snug">{sub}</p>
        )}
      </div>
    </Card>
  );
}
