import { cn } from '@/lib/utils';

interface PageTitleProps {
  title:        string;
  description?: string;
  action?:      React.ReactNode;
  className?:   string;
}

export default function PageTitle({ title, description, action, className }: PageTitleProps) {
  return (
    <div className={cn('flex items-start justify-between gap-4 mb-5', className)}>
      <div>
        <h1 className="text-xl font-bold text-foreground leading-tight tracking-tight">{title}</h1>
        {description && (
          <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
