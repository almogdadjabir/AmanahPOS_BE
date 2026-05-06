import PageTitle from '@/components/ds/PageTitle';

export default function SystemErrorState() {
  return (
    <div>
      <PageTitle
        title="System"
        description="Platform health, infrastructure status, and diagnostics."
      />

      <div className="relative overflow-hidden rounded-2xl border border-danger/20 bg-white shadow-[0_1px_4px_0_rgb(0_0_0/.05)]">
        <div className="h-[3px] bg-danger" />
        <div className="px-8 py-12 text-center">
          <div className="w-12 h-12 rounded-2xl bg-danger/8 border border-danger/15 flex items-center justify-center mx-auto mb-4">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                 stroke="#E53E3E" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8"    x2="12"    y2="12"    />
              <line x1="12" y1="16"   x2="12.01" y2="16"    />
            </svg>
          </div>
          <p className="text-[15px] font-black text-text-primary mb-1">
            Failed to load system status
          </p>
          <p className="text-[13px] text-text-hint">
            Check the API connection and try refreshing the page.
          </p>
        </div>
      </div>
    </div>
  );
}
