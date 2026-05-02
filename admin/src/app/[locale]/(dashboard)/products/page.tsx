import PageTitle from '@/components/ds/PageTitle';
import EmptyState from '@/components/ds/EmptyState';

export default function ProductsPage() {
  return (
    <div>
      <PageTitle
        title="Products"
        description="Manage your product catalogue across all shops."
      />
      <div className="bg-white rounded-xl border border-border-soft shadow-card overflow-hidden">
        <EmptyState
          icon={<BoxIcon />}
          title="Products coming soon"
          description="Browse, add, and manage products in your catalogue. Search by name, category, or barcode."
        />
      </div>
    </div>
  );
}

function BoxIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>; }
