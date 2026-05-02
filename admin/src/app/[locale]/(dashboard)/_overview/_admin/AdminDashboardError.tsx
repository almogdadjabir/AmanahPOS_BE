export default function AdminDashboardError() {
  return (
    <div className="bg-danger-light border border-danger/20 rounded-xl p-6 text-center">
      <p className="text-[14px] font-semibold text-danger mb-1">
        Failed to load dashboard
      </p>
      <p className="text-xs text-danger/70">
        Check the API connection and try refreshing.
      </p>
    </div>
  );
}
