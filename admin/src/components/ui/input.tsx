import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, icon, iconRight, className, id, ...props }, ref) => {
    const inputId = id ?? label;
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-sm font-semibold text-foreground">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute inset-y-0 start-3 flex items-center pointer-events-none text-muted-foreground">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              'flex h-9 w-full rounded-md border border-input bg-background px-3.5 py-2 text-sm text-foreground',
              'placeholder:text-muted-foreground',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
              'disabled:cursor-not-allowed disabled:opacity-50',
              'transition-colors',
              icon       && 'ps-10',
              iconRight  && 'pe-10',
              error      && 'border-destructive focus-visible:ring-destructive/30',
              className,
            )}
            {...props}
          />
          {iconRight && (
            <div className="absolute inset-y-0 end-3 flex items-center pointer-events-none text-muted-foreground">
              {iconRight}
            </div>
          )}
        </div>
        {hint  && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
        {error && <p className="text-xs font-semibold text-destructive">{error}</p>}
      </div>
    );
  },
);
Input.displayName = 'Input';
export { Input };
