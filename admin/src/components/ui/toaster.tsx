'use client';

import { Toaster as SonnerToaster } from 'sonner';
import { useParams } from 'next/navigation';

/**
 * AmanaPOS Toaster — RTL-aware, branded with DS color tokens.
 *
 * Usage (fire from any client component):
 *   import { toast } from 'sonner';
 *   toast.success('Owner created');
 *   toast.error('Failed to save');
 *   toast.warning('Subscription expiring');
 */
export function Toaster() {
  const params  = useParams();
  const locale  = (params?.locale as string) ?? 'ar';
  const isRTL   = locale === 'ar';

  return (
    <SonnerToaster
      position={isRTL ? 'top-left' : 'top-right'}
      dir={isRTL ? 'rtl' : 'ltr'}
      gap={8}
      toastOptions={{
        classNames: {
          toast: [
            'font-sans text-[13.5px] font-medium',
            'flex items-start gap-3 px-4 py-3.5',
            'rounded-xl border shadow-card-md',
            'bg-card text-foreground border-border',
            'data-[type=success]:border-emerald-200 data-[type=success]:bg-emerald-50 data-[type=success]:text-emerald-800',
            'data-[type=error]:border-red-200 data-[type=error]:bg-red-50 data-[type=error]:text-red-800',
            'data-[type=warning]:border-amber-200 data-[type=warning]:bg-amber-50 data-[type=warning]:text-amber-800',
            'data-[type=info]:border-sky-200 data-[type=info]:bg-sky-50 data-[type=info]:text-sky-800',
          ].join(' '),
          title:       'text-[13.5px] font-semibold leading-tight',
          description: 'text-[12px] text-current/70 mt-0.5 leading-snug',
          actionButton: [
            'text-[12px] font-semibold px-3 py-1 rounded-md',
            'bg-foreground text-background hover:bg-foreground/80 transition-colors',
          ].join(' '),
          cancelButton: [
            'text-[12px] font-semibold px-3 py-1 rounded-md',
            'bg-muted text-muted-foreground hover:bg-muted/80 transition-colors',
          ].join(' '),
          closeButton: [
            'text-muted-foreground hover:text-foreground transition-colors',
            'rounded-md hover:bg-muted',
          ].join(' '),
          icon: 'mt-0.5 shrink-0',
        },
      }}
    />
  );
}
