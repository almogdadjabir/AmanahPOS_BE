import { type InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/cn';

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
};

const Input = forwardRef<HTMLInputElement, Props>(({ label, error, icon, className, id, ...props }, ref) => {
  const inputId = id || label;
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label htmlFor={inputId} className="text-sm font-semibold text-text-primary">{label}</label>}
      <div className="relative">
        {icon && (
          <div className="absolute inset-y-0 start-3 flex items-center pointer-events-none text-text-hint">
            {icon}
          </div>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'w-full h-10 rounded-xl border border-border-soft bg-white text-sm text-text-primary',
            'placeholder:text-text-hint px-3.5',
            'focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary',
            'transition-colors',
            !!icon && 'ps-10',
            error && 'border-danger focus:ring-danger/25 focus:border-danger',
            className,
          )}
          {...props}
        />
      </div>
      {error && <p className="text-xs text-danger font-semibold">{error}</p>}
    </div>
  );
});

Input.displayName = 'Input';
export default Input;
