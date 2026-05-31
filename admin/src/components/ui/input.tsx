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
          <label htmlFor={inputId} className="text-[12.5px] font-semibold text-foreground tracking-[-.01em]">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute inset-y-0 start-3 flex items-center pointer-events-none text-icon-rest">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              // Base: white card bg, stronger hairline border, rounded-md (8px)
              'flex h-9 w-full rounded-md border border-input bg-card px-3 text-[13px] text-foreground',
              'placeholder:text-muted-foreground',
              // Focus: border → teal, 3px ring bloom (no ring-offset to avoid double edge)
              'transition-[border-color,box-shadow] duration-150',
              'focus:outline-none focus:border-primary focus:ring-[3px] focus:ring-ring/20',
              'disabled:cursor-not-allowed disabled:opacity-50',
              icon       && 'ps-9',
              iconRight  && 'pe-9',
              error      && 'border-destructive focus:border-destructive focus:ring-destructive/15',
              className,
            )}
            {...props}
          />
          {iconRight && (
            <div className="absolute inset-y-0 end-3 flex items-center pointer-events-none text-icon-rest">
              {iconRight}
            </div>
          )}
        </div>
        {hint  && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
        {error && <p className="text-xs font-medium text-destructive">{error}</p>}
      </div>
    );
  },
);
Input.displayName = 'Input';
export { Input };
