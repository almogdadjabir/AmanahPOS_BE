import PageTitle from '@/components/ds/PageTitle';
import EmptyState from '@/components/ds/EmptyState';

export default function CustomersPage() {
  return (
    <div>
      <PageTitle
        title="Customers"
        description="View and manage your customer base."
      />
      <div className="bg-white rounded-xl border border-border-soft shadow-card overflow-hidden">
        <EmptyState
          icon={<UserIcon />}
          title="Customers coming soon"
          description="Customer profiles, purchase history, and loyalty points will appear here."
        />
      </div>
    </div>
  );
}

function UserIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>; }
