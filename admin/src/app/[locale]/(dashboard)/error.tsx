'use client';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      <div className="w-14 h-14 rounded-2xl bg-danger-light text-danger flex items-center justify-center mb-4">
        <AlertIcon />
      </div>
      <p className="text-[15px] font-bold text-text-primary mb-1">Something went wrong</p>
      <p className="text-sm text-text-hint max-w-sm leading-relaxed">
        {error.message || 'An unexpected error occurred. Try refreshing the page.'}
      </p>
      <button
        onClick={reset}
        className="mt-6 px-5 py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-[#0D6B63] transition-colors"
      >
        Try again
      </button>
    </div>
  );
}

function AlertIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/>
      <line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  );
}
