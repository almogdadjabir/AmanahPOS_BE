import * as React from 'react';
import { cn } from '@/lib/utils';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, className, id, ...props }, ref) => {
    const textareaId = id ?? label;
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={textareaId} className="text-[12.5px] font-semibold text-foreground tracking-[-.01em]">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          className={cn(
            'flex w-full rounded-md border border-input bg-card px-3 py-2 text-[13px] text-foreground resize-none',
            'placeholder:text-muted-foreground',
            'transition-[border-color,box-shadow] duration-150',
            'focus:outline-none focus:border-primary focus:ring-[3px] focus:ring-ring/20',
            'disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-destructive focus:border-destructive focus:ring-destructive/15',
            className,
          )}
          {...props}
        />
        {hint  && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
        {error && <p className="text-xs font-medium text-destructive">{error}</p>}
      </div>
    );
  },
);
Textarea.displayName = 'Textarea';
export { Textarea };
