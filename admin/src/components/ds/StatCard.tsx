import { cn } from '@/lib/cn';

interface Props {
  label:      string;
  value:      string | number;
  sub?:       string;
  icon?:      React.ReactNode;
  accent?:    string;
  className?: string;
}

export default function StatCard({ label, value, sub, icon, accent = 'text-text-secondary bg-surface-muted', className }: Props) {
  return (
    <div className={cn('bg-white rounded-xl border border-border-soft shadow-card p-4 flex flex-col gap-3', className)}>
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium text-text-hint">{label}</p>
        {icon && (
          <span className={cn('w-7 h-7 rounded-lg flex items-center justify-center shrink-0', accent)}>
            {icon}
          </span>
        )}
      </div>
      <div>
        <p className="text-[26px] font-bold text-text-primary leading-none">{value}</p>
        {sub && <p className="text-[11px] text-text-hint mt-1.5">{sub}</p>}
      </div>
    </div>
  );
}
